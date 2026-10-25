import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { WATCHED_KEY, parseWatched, serializeWatched, toggleWatched } from './watched.ts';
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

export function WatchedProvider({ children }: { children: ReactNode }) {
  const [watched, setWatched] = useState<WatchedState>(readStored);
  // Latest state, so toggle never computes inside a setState updater
  // (StrictMode calls updaters twice).
  const latest = useRef(watched);
  // False once a write fails: storage then lags behind memory, so memory wins.
  const persisted = useRef(true);

  const apply = useCallback((next: WatchedState) => {
    latest.current = next;
    setWatched(next);
  }, []);

  // Another tab wrote the progress: adopt it so the next toggle builds on it.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === WATCHED_KEY) apply(parseWatched(event.newValue));
      else if (event.key === null) apply({}); // storage.clear()
    };
    window.addEventListener('storage', onStorage);
    // A write from another tab between the first read and this listener raised
    // no event we could catch: read once more now that later writes will.
    const stored = tryReadStored();
    if (stored && serializeWatched(stored) !== serializeWatched(latest.current)) apply(stored);
    return () => window.removeEventListener('storage', onStorage);
  }, [apply]);

  const toggle = useCallback((slug: string, index: number) => {
    // Build on what is stored, not only on memory: another tab may have written
    // something whose storage event has not reached this tab yet.
    const stored = persisted.current ? tryReadStored() : null;
    const next = toggleWatched(stored ?? latest.current, slug, index);
    apply(next);
    try {
      window.localStorage.setItem(WATCHED_KEY, serializeWatched(next));
      persisted.current = true;
    } catch {
      // Not remembered this time; build on memory until a write succeeds.
      persisted.current = false;
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
