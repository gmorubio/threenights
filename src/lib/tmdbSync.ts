// Fetches movies from TMDB for scripts/sync-tmdb.ts: one request per movie and
// language, retried on 429 and 5xx, run through a small pool. Kept apart from
// the script so it can be tested with a fake fetch, fake timers and a fake
// sleep. Only type imports from tmdb.ts: that module uses import.meta.glob,
// which plain node cannot run.
import type { Lang } from './types.ts';
import type { MovieDetails } from './tmdb.ts';

const API = 'https://api.themoviedb.org/3';
const LOCALE: Record<Lang, string> = { es: 'es-ES', en: 'en-US' };
const CAST_LIMIT = 6;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const FIRST_BACKOFF_MS = 1_000;
const MAX_RETRY_AFTER_MS = 30_000;

export interface FetchDetailsOptions {
  /** Defaults to the global fetch. */
  fetch?: typeof fetch;
  /** Defaults to 10 000 ms. */
  timeoutMs?: number;
  /** Waits between retries. Defaults to a setTimeout-based sleep. */
  sleep?: (ms: number) => Promise<void>;
}

/** Most TMDB requests allowed in flight at once. */
export const MAX_CONCURRENT = 6;

/** Runs the tasks with at most `limit` in flight; results keep the task order. */
export async function runPool<T>(
  tasks: ReadonlyArray<() => Promise<T>>,
  limit: number = MAX_CONCURRENT,
): Promise<T[]> {
  const results = new Array<T>(tasks.length);
  let next = 0;
  let failed = false;

  // Each worker picks the next task when its current one settles; after a
  // failure no new task starts, since the run is lost anyway.
  const worker = async (): Promise<void> => {
    while (!failed && next < tasks.length) {
      const index = next;
      next += 1;
      try {
        results[index] = await tasks[index]!();
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
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

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 429 and 5xx are worth another try; TMDB throttles and hiccups. */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Retry-After as delta-seconds or an HTTP date, capped at 30 s; without a
 * usable header, exponential backoff: 1 s, 2 s, 4 s.
 */
function retryDelay(retryAfter: string | null, retry: number): number {
  const backoff = FIRST_BACKOFF_MS * 2 ** (retry - 1);
  if (retryAfter === null || retryAfter.trim() === '') return backoff;

  const seconds = Number(retryAfter);
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - Date.now();
  if (Number.isNaN(ms)) return backoff;
  return Math.min(Math.max(ms, 0), MAX_RETRY_AFTER_MS);
}

function statusError(status: number, id: string): Error {
  return new Error(`TMDB answered with status ${status} for movie ${id}.`);
}

type Attempt =
  | { done: true; details: MovieDetails | null }
  | { done: false; status: number; retryAfter: string | null };

/** One request with its own timeout; a 429 or 5xx is handed back for a retry. */
async function attempt(
  url: string,
  id: string,
  lang: Lang,
  token: string,
  request: typeof fetch,
  timeoutMs: number,
): Promise<Attempt> {
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

    if (response.status === 404) return { done: true, details: null };
    if (response.status === 401) {
      throw new Error(
        'TMDB rejected the token. TMDB_READ_TOKEN must hold the full API Read Access Token, not the short API key.',
      );
    }
    if (isRetryable(response.status)) {
      return { done: false, status: response.status, retryAfter: response.headers.get('Retry-After') };
    }
    if (!response.ok) throw statusError(response.status, id);

    const raw = (await response.json().catch((error: unknown) => {
      throw controller.signal.aborted ? failure() : error;
    })) as RawMovie;
    return { done: true, details: toDetails(raw, lang) };
  } finally {
    clearTimeout(timer);
  }
}

/** Resolves to null when TMDB has no such movie. */
export async function fetchDetails(
  id: string,
  lang: Lang,
  token: string,
  { fetch: request = fetch, timeoutMs = DEFAULT_TIMEOUT_MS, sleep = defaultSleep }: FetchDetailsOptions = {},
): Promise<MovieDetails | null> {
  // One call per movie and language: credits and translations ride along.
  const url =
    `${API}/movie/${encodeURIComponent(id)}` +
    `?language=${LOCALE[lang]}&append_to_response=credits,translations`;

  for (let retry = 1; ; retry += 1) {
    const result = await attempt(url, id, lang, token, request, timeoutMs);
    if (result.done) return result.details;
    if (retry > MAX_RETRIES) throw statusError(result.status, id);
    await sleep(retryDelay(result.retryAfter, retry));
  }
}
