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
  // lacks them, so they are re-applied on top of anything read from it; a
  // successful write saves them all and empties this.
  const unsaved = useRef(new Map<string, UnsavedMark>());

  const apply = useCallback((next: WatchedState) => {
    latest.current = next;
    setWatched(next);
  }, []);

  // Adopts progress written elsewhere, keeping this tab's unsaved marks.
  const adopt = useCallback(
    (stored: WatchedState) => {
      const next = withUnsaved(stored, unsaved.current);
      if (serializeWatched(next) !== serializeWatched(latest.current)) apply(next);
    },
    [apply],
  );

  // Another tab wrote the progress: adopt it so the next toggle builds on it.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === WATCHED_KEY) adopt(parseWatched(event.newValue));
      else if (event.key === null) adopt({}); // storage.clear()
    };
    // A page restored from the back/forward cache got no storage events.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const stored = tryReadStored();
      if (stored) adopt(stored);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    // A write from another tab between the first read and this listener raised
    // no event we could catch: read once more now that later writes will.
    const stored = tryReadStored();
    if (stored) adopt(stored);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [adopt]);

  const toggle = useCallback((slug: string, index: number) => {
    // The click means what the button shows, so the wanted value comes from
    // the rendered state, never from flipping what storage holds.
    const want = !isWatched(latest.current, slug, index);
    const mark = { slug, index, watched: want };
    const key = `${index}:${slug}`;
    unsaved.current.delete(key);
    unsaved.current.set(key, mark);
    // Build on what is stored, not only on memory: another tab may have written
    // something whose storage event has not reached this tab yet.
    const stored = tryReadStored();
    const next = stored
      ? withUnsaved(stored, unsaved.current)
      : markWatched(latest.current, slug, index, want);
    apply(next);
    try {
      window.localStorage.setItem(WATCHED_KEY, serializeWatched(next));
      unsaved.current.clear();
    } catch {
      // Not remembered this time: the mark stays unsaved until a write succeeds.
    }
  }, [apply]);

  const value = useMemo(() => ({ watched, toggle }), [watched, toggle]);

  return <WatchedContext.Provider value={value}>{children}</WatchedContext.Provider>;
}

export function useWatched(): WatchedValue {
  const value = useContext(WatchedContext);
  if (!value) throw new Error('useWatched must be used inside WatchedProvider.');
  return value;
}
