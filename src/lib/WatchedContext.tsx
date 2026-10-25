import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { WATCHED_KEY, parseWatched, serializeWatched, toggleWatched } from './watched.ts';
import type { WatchedState } from './watched.ts';

function readStored(): WatchedState {
  try {
    return parseWatched(window.localStorage.getItem(WATCHED_KEY));
  } catch {
    return {}; // Storage can be blocked; progress then lives in memory only.
  }
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
    return () => window.removeEventListener('storage', onStorage);
  }, [apply]);

  const toggle = useCallback((slug: string, index: number) => {
    const next = toggleWatched(latest.current, slug, index);
    apply(next);
    try {
      window.localStorage.setItem(WATCHED_KEY, serializeWatched(next));
    } catch {
      // Not remembered this time; nothing else to do.
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
