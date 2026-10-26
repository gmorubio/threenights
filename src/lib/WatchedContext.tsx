import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { WATCHED_KEY, isWatched, markWatched, parseWatched, serializeWatched } from './watched.ts';
import type { WatchedState } from './watched.ts';

/** Stored progress, or null when storage cannot be read. */
function tryReadStored(): WatchedState | null {
  try {
    return parseWatched(window.localStorage.getItem(WATCHED_KEY));
  } catch {
    return null;
  }
}

function readStored(): WatchedState {
  // Storage can be blocked; progress then lives in memory only.
  return tryReadStored() ?? {};
}

interface WatchedValue {
  watched: WatchedState;
  toggle: (slug: string, index: number) => void;
}

const WatchedContext = createContext<WatchedValue | null>(null);

interface UnsavedMark {
  slug: string;
  index: number;
  watched: boolean;
  /** What storage held for this part when the mark was made. */
  baseline: boolean;
}

/**
 * Drops the marks storage no longer needs re-applied: those it already holds,
 * and those whose part another tab changed since (the other tab wins).
 */
function prune(stored: WatchedState, unsaved: Map<string, UnsavedMark>): void {
  for (const [key, mark] of unsaved) {
    const now = isWatched(stored, mark.slug, mark.index);
    if (now === mark.watched || now !== mark.baseline) unsaved.delete(key);
  }
}

/** Re-applies this tab's marks that storage does not hold yet. */
function withUnsaved(state: WatchedState, unsaved: ReadonlyMap<string, UnsavedMark>): WatchedState {
  let next = state;
  for (const mark of unsaved.values()) {
    next = markWatched(next, mark.slug, mark.index, mark.watched);
  }
  return next;
}

export function WatchedProvider({ children }: { children: ReactNode }) {
  const [watched, setWatched] = useState<WatchedState>(readStored);
  // Latest state, so toggle never computes inside a setState updater
  // (StrictMode calls updaters twice).
  const latest = useRef(watched);
  // Marks set since the last successful write, keyed by slug and index. Storage
  // lacks them, so they are re-applied on top of anything read from it until
  // storage shows them saved or changed by another tab; a successful write
  // saves them all and empties this.
  const unsaved = useRef(new Map<string, UnsavedMark>());

  const apply = useCallback((next: WatchedState) => {
    latest.current = next;
    setWatched(next);
  }, []);

  /** Writes the progress; on success every unsaved mark is saved. */
  const save = useCallback((next: WatchedState) => {
    try {
      window.localStorage.setItem(WATCHED_KEY, serializeWatched(next));
      unsaved.current.clear();
    } catch {
      // Not remembered this time: the marks stay unsaved until a write succeeds.
    }
  }, []);

  // Adopts progress written elsewhere, keeping this tab's pending marks. When
  // `stored` was really read from storage, pending marks are written once more.
  const adopt = useCallback(
    (stored: WatchedState, read: boolean) => {
      prune(stored, unsaved.current);
      const next = withUnsaved(stored, unsaved.current);
      if (serializeWatched(next) !== serializeWatched(latest.current)) apply(next);
      if (read && unsaved.current.size > 0) save(next);
    },
    [apply, save],
  );

  // Another tab wrote the progress: adopt it so the next toggle builds on it.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      // Events can arrive after this tab's own later write, so event.newValue
      // may be older than what is stored: adopt what storage holds now.
      if (event.key !== WATCHED_KEY && event.key !== null) return;
      const stored = tryReadStored();
      if (stored) adopt(stored, true);
      else if (event.key === WATCHED_KEY) adopt(parseWatched(event.newValue), false);
      else adopt({}, false); // storage.clear()
    };
    // A page restored from the back/forward cache got no storage events.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const stored = tryReadStored();
      if (stored) adopt(stored, true);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    // A write from another tab between the first read and this listener raised
    // no event we could catch: read once more now that later writes will.
    const stored = tryReadStored();
    if (stored) adopt(stored, true);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [adopt]);

  const toggle = useCallback((slug: string, index: number) => {
    // The click means what the button shows, so the wanted value comes from
    // the rendered state, never from flipping what storage holds.
    const want = !isWatched(latest.current, slug, index);
    // Build on what is stored, not only on memory: another tab may have written
    // something whose storage event has not reached this tab yet.
    const stored = tryReadStored();
    if (stored) prune(stored, unsaved.current);
    const key = `${index}:${slug}`;
    const baseline = stored ? isWatched(stored, slug, index) : !want;
    unsaved.current.delete(key);
    unsaved.current.set(key, { slug, index, watched: want, baseline });
    const next = stored
      ? withUnsaved(stored, unsaved.current)
      : markWatched(latest.current, slug, index, want);
    apply(next);
    save(next);
  }, [apply, save]);

  const value = useMemo(() => ({ watched, toggle }), [watched, toggle]);

  return <WatchedContext.Provider value={value}>{children}</WatchedContext.Provider>;
}

export function useWatched(): WatchedValue {
  const value = useContext(WatchedContext);
  if (!value) throw new Error('useWatched must be used inside WatchedProvider.');
  return value;
}
