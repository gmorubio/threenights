// Fetches the TMDB data of every movie in /movies and writes it to
// src/data/tmdb.json, which the app reads instead of calling TMDB itself.
// The token is only ever used here, on the machine that builds the site, so
// it never reaches the browser.
// Run with `npm run sync`. With `--soft` a failure only warns, so that
// `npm run dev` still starts offline with the data from the last sync.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LANGS } from '../src/lib/types.ts';
import type { Lang } from '../src/lib/types.ts';
import type { MovieDetails, TmdbSnapshot } from '../src/lib/tmdb.ts';

const API = 'https://api.themoviedb.org/3';
const LOCALE: Record<Lang, string> = { es: 'es-ES', en: 'en-US' };
const CAST_LIMIT = 6;

const root = join(import.meta.dirname, '..');
const moviesFolder = join(root, 'movies');
const output = join(root, 'src', 'data', 'tmdb.json');
const soft = process.argv.includes('--soft');

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

/** Every distinct tmdbId in /movies. Broken files are the validator's job. */
function readTmdbIds(): string[] {
  const ids = new Set<string>();
  for (const name of readdirSync(moviesFolder)) {
    if (!name.endsWith('.json')) continue;
    try {
      const content = JSON.parse(readFileSync(join(moviesFolder, name), 'utf8')) as {
        tmdbId?: unknown;
      };
      if (typeof content.tmdbId === 'string' || typeof content.tmdbId === 'number') {
        ids.add(String(content.tmdbId).trim());
      }
    } catch {
      // Skipped here, reported by `npm run validate`.
    }
  }
  ids.delete('');
  return [...ids].sort();
}

/** Resolves to null when TMDB has no such movie. */
async function fetchDetails(id: string, lang: Lang, token: string): Promise<MovieDetails | null> {
  // One call per movie and language: credits and translations ride along.
  const url =
    `${API}/movie/${encodeURIComponent(id)}` +
    `?language=${LOCALE[lang]}&append_to_response=credits,translations`;

  // The token travels in a header, never in the URL.
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  }).catch(() => {
    throw new Error('Could not reach TMDB. Check your internet connection.');
  });

  if (response.status === 404) return null;
  if (response.status === 401) {
    throw new Error(
      'TMDB rejected the token. TMDB_READ_TOKEN must hold the full API Read Access Token, not the short API key.',
    );
  }
  if (!response.ok) throw new Error(`TMDB answered with status ${response.status} for movie ${id}.`);

  return toDetails((await response.json()) as RawMovie, lang);
}

async function sync(): Promise<void> {
  // A variable that is already set wins, so CI does not need a .env file.
  const envFile = join(root, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const token = (process.env.TMDB_READ_TOKEN ?? '').trim();
  if (token === '') {
    throw new Error(
      'TMDB_READ_TOKEN is not set. Copy .env.example to .env and paste your API Read Access Token.',
    );
  }

  const snapshot: TmdbSnapshot = {};
  await Promise.all(
    readTmdbIds().map(async (id) => {
      const [es, en] = await Promise.all(LANGS.map((lang) => fetchDetails(id, lang, token)));
      snapshot[id] = es && en ? { es, en } : null;
    }),
  );

  // Sorted keys keep the file stable between runs.
  const sorted = Object.fromEntries(Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b)));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(sorted, null, 2)}\n`);

  for (const [id, entry] of Object.entries(sorted)) {
    console.log(entry ? `  ok    ${id}  ${entry.en.title}` : `  FAIL  ${id}  TMDB has no such movie`);
  }
  console.log(`\nTMDB data for ${Object.keys(sorted).length} movie(s) written to src/data/tmdb.json.`);
}

sync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (soft) {
    console.warn(`TMDB sync skipped: ${message}`);
    return;
  }
  console.error(`TMDB sync failed: ${message}`);
  process.exit(1);
});
