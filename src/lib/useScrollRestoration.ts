import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

const STORAGE_KEY = 'threenights:scroll';

/** Marks the current page as laid out; returns a cleanup that unmarks it. */
export type MarkPageReady = () => () => void;

function loadPositions(): Map<string, number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed === null || typeof parsed !== 'object') return new Map();
    return new Map(
      Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
    );
  } catch {
    return new Map();
  }
}

function savePositions(positions: Map<string, number>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(positions)));
  } catch {
    // Storage full or disabled: positions are only kept for this document.
  }
}

/** True when this document was loaded by a reload or Back/Forward, not a new visit. */
function documentWasRestored(): boolean {
  const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  return entry?.type === 'reload' || entry?.type === 'back_forward';
}

/**
 * Restores the scroll offset of each history entry on Back/Forward and reload,
 * and starts forward navigations at the top.
 *
 * The browser's own restoration runs before the page has its final height and
 * clamps the offset, so it is turned off. When `waitForPage` is true the offset
 * is applied only once the page calls the returned `markPageReady`.
 */
export function useScrollRestoration(waitForPage: boolean): MarkPageReady {
  const { key } = useLocation();
  const navType = useNavigationType();
  const positions = useRef<Map<string, number> | null>(null);
  const currentKey = useRef(key);
  const pending = useRef<number | null>(null);
  const pageReady = useRef(false);
  const isFirstEntry = useRef(true);

  positions.current ??= loadPositions();

  useEffect(() => {
    history.scrollRestoration = 'manual';
    const saved = positions.current!;

    const record = () => {
      // A pending restore must not be overwritten by the clamped offset.
      if (pending.current === null) saved.set(currentKey.current, window.scrollY);
    };
    const persist = () => {
      record();
      savePositions(saved);
    };
    const persistWhenHidden = () => {
      if (document.visibilityState === 'hidden') persist();
    };

    window.addEventListener('scroll', record, { passive: true });
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', persistWhenHidden);
    return () => {
      window.removeEventListener('scroll', record);
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', persistWhenHidden);
    };
  }, []);

  const applyPending = useCallback(() => {
    if (pending.current === null) return;
    const y = pending.current;
    pending.current = null;
    window.scrollTo(0, y);
  }, []);

  useLayoutEffect(() => {
    const saved = positions.current!;
    currentKey.current = key;

    // The first entry of a new visit shares the key of earlier visits in the
    // same tab ('default'); its old offset must not be reused.
    if (isFirstEntry.current) {
      isFirstEntry.current = false;
      if (!documentWasRestored()) saved.delete(key);
    }

    if (navType !== 'POP') {
      pending.current = null;
      window.scrollTo(0, 0);
      return;
    }

    pending.current = saved.get(key) ?? 0;
    if (!waitForPage || pageReady.current) applyPending();
  }, [key, navType, waitForPage, applyPending]);

  return useCallback(() => {
    pageReady.current = true;
    applyPending();
    return () => {
      pageReady.current = false;
    };
  }, [applyPending]);
}
