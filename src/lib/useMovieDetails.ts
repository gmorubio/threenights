import { useEffect, useState } from 'react';
import { getMovieDetails, TmdbError } from './tmdb.ts';
import type { MovieDetails } from './tmdb.ts';
import type { Lang } from './types.ts';

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: TmdbError };

export function toTmdbError(error: unknown): TmdbError {
  return error instanceof TmdbError ? error : new TmdbError('http', String(error));
}

export function useMovieDetails(
  tmdbId: string | number | undefined,
  lang: Lang,
): Loadable<MovieDetails> {
  const [state, setState] = useState<Loadable<MovieDetails>>({ status: 'loading' });

  useEffect(() => {
    if (tmdbId === undefined) return;
    let cancelled = false;
    setState({ status: 'loading' });
    getMovieDetails(tmdbId, lang).then(
      (data) => !cancelled && setState({ status: 'ready', data }),
      (error: unknown) => !cancelled && setState({ status: 'error', error: toTmdbError(error) }),
    );
    return () => {
      cancelled = true;
    };
  }, [tmdbId, lang]);

  return state;
}
