import type { Lang } from './types.ts';

const API = 'https://api.themoviedb.org/3';
const IMAGES = 'https://image.tmdb.org/t/p';
const LOCALE: Record<Lang, string> = { es: 'es-ES', en: 'en-US' };

const token: string = (import.meta.env.VITE_TMDB_READ_TOKEN ?? '').trim();

export const hasToken = token !== '';

export type TmdbErrorKind = 'missing-token' | 'unauthorized' | 'not-found' | 'network' | 'http';

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

interface RawMovie {
  title?: string;
  original_title?: string;
  release_date?: string;
  runtime?: number | null;
  genres?: Array<{ name: string }>;
  vote_average?: number;
  vote_count?: number;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  credits?: {
    cast?: Array<{ name: string; character?: string; order?: number }>;
    crew?: Array<{ name: string; job?: string }>;
  };
  translations?: {
    translations?: Array<{ iso_639_1: string; data?: { overview?: string } }>;
  };
}

const CAST_LIMIT = 6;

function toDetails(raw: RawMovie, lang: Lang): MovieDetails {
  const other: Lang = lang === 'es' ? 'en' : 'es';
  let overview = (raw.overview ?? '').trim();
  let overviewLang = lang;

  if (overview === '') {
    const fallback = raw.translations?.translations
      ?.find((t) => t.iso_639_1 === other && (t.data?.overview ?? '').trim() !== '')
      ?.data?.overview?.trim();
    if (fallback) {
      overview = fallback;
      overviewLang = other;
    }
  }

  const cast = [...(raw.credits?.cast ?? [])]
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, CAST_LIMIT)
    .map((member) => ({ name: member.name, character: member.character ?? '' }));

  return {
    title: raw.title ?? raw.original_title ?? '',
    originalTitle: raw.original_title ?? '',
    year: raw.release_date ? raw.release_date.slice(0, 4) : null,
    runtimeMinutes: raw.runtime && raw.runtime > 0 ? raw.runtime : null,
    genres: (raw.genres ?? []).map((genre) => genre.name),
    rating: raw.vote_count && raw.vote_average ? raw.vote_average : null,
    overview,
    overviewLang,
    directors: (raw.credits?.crew ?? [])
      .filter((member) => member.job === 'Director')
      .map((member) => member.name),
    cast,
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
  };
}

async function request(tmdbId: string | number, lang: Lang): Promise<MovieDetails> {
  if (!hasToken) throw new TmdbError('missing-token', 'VITE_TMDB_READ_TOKEN is not set.');

  // One call per movie: credits and translations ride along with the details.
  const url =
    `${API}/movie/${encodeURIComponent(String(tmdbId))}` +
    `?language=${LOCALE[lang]}&append_to_response=credits,translations`;

  let response: Response;
  try {
    // The token travels in a header, never in the URL.
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
  } catch {
    throw new TmdbError('network', 'Could not reach TMDB.');
  }

  if (response.status === 401) throw new TmdbError('unauthorized', 'TMDB rejected the token.');
  if (response.status === 404) throw new TmdbError('not-found', `TMDB has no movie ${tmdbId}.`);
  if (!response.ok) throw new TmdbError('http', `TMDB answered with status ${response.status}.`);

  return toDetails((await response.json()) as RawMovie, lang);
}

// Responses are kept in memory for the session so that moving between the
// catalogue and a movie, or switching language back, never refetches.
const cache = new Map<string, Promise<MovieDetails>>();

export function getMovieDetails(tmdbId: string | number, lang: Lang): Promise<MovieDetails> {
  const key = `${String(tmdbId)}:${lang}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = request(tmdbId, lang);
    cache.set(key, pending);
    // Failures are not cached, so a retry is possible after fixing the cause.
    pending.catch(() => cache.delete(key));
  }
  return pending;
}

export function posterUrl(path: string, size: 'w342' | 'w500' = 'w342'): string {
  return `${IMAGES}/${size}${path}`;
}

export function backdropUrl(path: string): string {
  return `${IMAGES}/w1280${path}`;
}
