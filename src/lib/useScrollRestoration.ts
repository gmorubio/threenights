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

  useLayoutEffect(() => {
    positions.current ??= readPositions();
    const saved = positions.current;
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';

    const onScroll = () => {
      saved[currentKey.current] = window.scrollY;
    };
    const onPageHide = () => {
      saved[currentKey.current] = window.scrollY;
      writePositions(saved);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onPageHide);
      history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    currentKey.current = location.key;
    const target = navType === 'POP' ? (positions.current?.[location.key] ?? 0) : 0;
    window.scrollTo(0, target);
    if (Math.abs(window.scrollY - target) < 1) return;

    // The page is not tall enough yet (content still loading): keep applying
    // the offset as it grows, until it fits, the user scrolls or time runs out.
    const observer = new ResizeObserver(() => {
      window.scrollTo(0, target);
      if (Math.abs(window.scrollY - target) < 1) stop();
    });
    const timer = window.setTimeout(stop, RESTORE_TIMEOUT_MS);
    const userEvents = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    function stop() {
      observer.disconnect();
      window.clearTimeout(timer);
      userEvents.forEach((type) => window.removeEventListener(type, stop));
    }
    observer.observe(document.documentElement);
    userEvents.forEach((type) => window.addEventListener(type, stop, { passive: true }));
    return stop;
    // Keyed on the history entry, so a link to the current URL (a REPLACE
    // with the same path) also starts at the top.
  }, [location.key]);
}
