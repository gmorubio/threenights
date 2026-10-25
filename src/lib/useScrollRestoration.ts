import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

const STORAGE_KEY = 'threenights:scroll';
/** How long a restore keeps waiting for the page to grow tall enough. */
const RESTORE_TIMEOUT_MS = 1500;

type Positions = Record<string, number>;

function readPositions(): Positions {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
    return parsed !== null && typeof parsed === 'object' ? (parsed as Positions) : {};
  } catch {
    return {};
  }
}

function writePositions(positions: Positions): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Storage blocked or full: positions still work for this page load.
  }
}

/** The key React Router gives an entry whose `history.state` has no key. */
const ROUTER_DEFAULT_KEY = 'default';

/**
 * Returns a key unique to the current history entry.
 *
 * React Router keys every entry made by a full document load (typed URL,
 * bookmark, external link) as "default", so offsets saved under it would leak
 * into the next unrelated load in the tab. Such an entry gets its own key,
 * written into `history.state` (keeping the router's fields) so that reload
 * and Back/Forward to it find it again.
 */
function entryKey(routerKey: string): string {
  if (routerKey !== ROUTER_DEFAULT_KEY) return routerKey;
  const state: unknown = history.state;
  const fields =
    state !== null && typeof state === 'object' ? (state as Record<string, unknown>) : {};
  if (typeof fields.key === 'string' && fields.key !== ROUTER_DEFAULT_KEY) return fields.key;
  const key = `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  try {
    history.replaceState({ ...fields, key }, '');
  } catch {
    // Without the key a reload starts at the top, which is still correct.
  }
  return key;
}

/**
 * Whether this document was opened by a new visit (typed URL, bookmark,
 * external link) rather than a reload or Back/Forward. Chromium keeps the
 * entry's `history.state` when the same URL is opened again, so the entry key
 * alone cannot tell.
 */
function isNewVisit(): boolean {
  const entry = performance.getEntriesByType?.('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  return entry?.type === 'navigate';
}

/**
 * Saves the scroll offset of every history entry and restores it on
 * Back/Forward and reload (POP). Every other navigation, including a link to
 * the current URL, starts at the top.
 *
 * The browser's own restoration is turned off: some browsers apply it to the
 * outgoing page before `popstate`, which caps the offset at that page's height.
 */
export function useScrollRestoration(): void {
  const location = useLocation();
  const navType = useNavigationType();
  const positions = useRef<Positions | null>(null);
  const currentKey = useRef(location.key);
  const firstEntry = useRef(true);

  useLayoutEffect(() => {
    positions.current ??= readPositions();
    const saved = positions.current;
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';

    const onScroll = () => {
      saved[currentKey.current] = window.scrollY;
    };
    const persist = () => {
      saved[currentKey.current] = window.scrollY;
      writePositions(saved);
    };
    // Mobile browsers can discard a hidden tab without firing `pagehide`.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persist();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    const key = entryKey(location.key);
    currentKey.current = key;
    const saved = (positions.current ??= readPositions());
    if (firstEntry.current) {
      firstEntry.current = false;
      // A new visit starts at the top; drop what an earlier load left.
      if (isNewVisit()) delete saved[key];
    }
    const target = navType === 'POP' ? (saved[key] ?? 0) : 0;
    // Where our own last scroll left the page, and how tall the page was then,
    // to tell the user's scrolls from ours.
    let applied = 0;
    let appliedHeight = 0;
    applyTarget();
    // Nothing above the top can move it: no need to watch the layout.
    if (target === 0) return;

    // The first render is not always the final layout (content still loading
    // can make the page shorter, taller or reorder it, and scroll anchoring or
    // clamping then moves the page): keep applying the offset on every layout
    // change, even once reached, until the user scrolls or time runs out.
    const observer = new ResizeObserver(applyTarget);
    const timer = window.setTimeout(stop, RESTORE_TIMEOUT_MS);
    // Dragging the scrollbar sends no pointer event to the page: a scroll away
    // from where we put it is the user's. If the page changed height meanwhile,
    // the browser may have moved it (clamping, scroll anchoring); the observer
    // handles that.
    const onScroll = () => {
      const moved = Math.abs(window.scrollY - applied) >= 1;
      if (moved && document.documentElement.scrollHeight === appliedHeight) stop();
    };
    const userEvents = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    function applyTarget(): void {
      window.scrollTo(0, target);
      applied = window.scrollY;
      appliedHeight = document.documentElement.scrollHeight;
    }
    function stop() {
      observer.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      userEvents.forEach((type) => window.removeEventListener(type, stop));
    }
    observer.observe(document.documentElement);
    window.addEventListener('scroll', onScroll, { passive: true });
    userEvents.forEach((type) => window.addEventListener(type, stop, { passive: true }));
    return stop;
    // Keyed on the history entry, so a link to the current URL (a REPLACE
    // with the same path) also starts at the top.
  }, [location.key]);
}
