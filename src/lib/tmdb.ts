import type { Lang } from './types.ts';

const IMAGES = 'https://image.tmdb.org/t/p';

export type TmdbErrorKind = 'missing-data' | 'not-found';

export class TmdbError extends Error {
  kind: TmdbErrorKind;

  constructor(kind: TmdbErrorKind, message: string) {
    super(message);
    this.name = 'TmdbError';
    this.kind = kind;
  }
}

export interface CastMember {
  name: string;
  character: string;
}

export interface MovieDetails {
  title: string;
  originalTitle: string;
  year: string | null;
  runtimeMinutes: number | null;
  genres: string[];
  rating: number | null;
  overview: string;
  /** Set when the overview had to fall back to the other language. */
  overviewLang: Lang;
  directors: string[];
  cast: CastMember[];
  posterPath: string | null;
  backdropPath: string | null;
}

/** What `npm run sync` writes: details per tmdbId, or null when TMDB has no such movie. */
export type TmdbSnapshot = Record<string, Record<Lang, MovieDetails> | null>;

// TMDB is never called from the browser, because that would publish the token
// inside the JavaScript. `npm run sync` fetches the data at build time and the
// app only reads the result. The file is gitignored, so it is loaded through a
// glob: when it does not exist yet the glob is empty instead of a build error.
const files = import.meta.glob<TmdbSnapshot>('/src/data/tmdb.json', {
  eager: true,
  import: 'default',
});
const snapshot: TmdbSnapshot = Object.values(files)[0] ?? {};

// Still a promise, so the pages do not care where the data comes from.
export async function getMovieDetails(tmdbId: string | number, lang: Lang): Promise<MovieDetails> {
  const entry = snapshot[String(tmdbId).trim()];
  if (entry === undefined) throw new TmdbError('missing-data', `No synced data for movie ${tmdbId}.`);
  if (entry === null) throw new TmdbError('not-found', `TMDB has no movie ${tmdbId}.`);
  return entry[lang];
}

export function posterUrl(path: string, size: 'w342' | 'w500' = 'w342'): string {
  return `${IMAGES}/${size}${path}`;
}

export function backdropUrl(path: string): string {
  return `${IMAGES}/w1280${path}`;
}
