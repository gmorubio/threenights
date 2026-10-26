// Fetches one movie from TMDB for scripts/sync-tmdb.ts. Kept apart from the
// script so it can be tested with a fake fetch and fake timers. Only type
// imports from tmdb.ts: that module uses import.meta.glob, which plain node
// cannot run.
import type { Lang } from './types.ts';
import type { MovieDetails } from './tmdb.ts';

const API = 'https://api.themoviedb.org/3';
const LOCALE: Record<Lang, string> = { es: 'es-ES', en: 'en-US' };
const CAST_LIMIT = 6;
const DEFAULT_TIMEOUT_MS = 10_000;

export interface FetchDetailsOptions {
  /** Defaults to the global fetch. */
  fetch?: typeof fetch;
  /** Defaults to 10 000 ms. */
  timeoutMs?: number;
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

function formatSeconds(ms: number): string {
  return `${ms / 1000} s`;
}

/** Resolves to null when TMDB has no such movie. */
export async function fetchDetails(
  id: string,
  lang: Lang,
  token: string,
  { fetch: request = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: FetchDetailsOptions = {},
): Promise<MovieDetails | null> {
  // One call per movie and language: credits and translations ride along.
  const url =
    `${API}/movie/${encodeURIComponent(id)}` +
    `?language=${LOCALE[lang]}&append_to_response=credits,translations`;

  // A stalled connection would otherwise hold predev and CI for minutes.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const failure = (): Error =>
    controller.signal.aborted
      ? new Error(`TMDB did not answer within ${formatSeconds(timeoutMs)}.`)
      : new Error('Could not reach TMDB. Check your internet connection.');

  try {
    // The token travels in a header, never in the URL.
    const response = await request(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
    }).catch(() => {
      throw failure();
    });

    if (response.status === 404) return null;
    if (response.status === 401) {
      throw new Error(
        'TMDB rejected the token. TMDB_READ_TOKEN must hold the full API Read Access Token, not the short API key.',
      );
    }
    if (!response.ok) throw new Error(`TMDB answered with status ${response.status} for movie ${id}.`);

    const raw = (await response.json().catch((error: unknown) => {
      throw controller.signal.aborted ? failure() : error;
    })) as RawMovie;
    return toDetails(raw, lang);
  } finally {
    clearTimeout(timer);
  }
}
