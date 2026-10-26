// Fetches the TMDB data of every movie in /movies and writes it to
// src/data/tmdb.json, which the app reads instead of calling TMDB itself.
// The token is only ever used here, on the machine that builds the site, so
// it never reaches the browser.
// Run with `npm run sync`. With `--soft` a failure only warns, so that
// `npm run dev` still starts offline with the data from the last sync.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LANGS, type Lang } from '../src/lib/types.ts';
import type { MovieDetails, TmdbSnapshot } from '../src/lib/tmdb.ts';
import { fetchDetails, runPool } from '../src/lib/tmdbSync.ts';

const root = join(import.meta.dirname, '..');
const moviesFolder = join(root, 'movies');
const output = join(root, 'src', 'data', 'tmdb.json');
const soft = process.argv.includes('--soft');

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

  // A pool keeps us well under TMDB's limit of about 20 connections per IP.
  const ids = readTmdbIds();
  const answers = await runPool(
    ids.flatMap((id) =>
      LANGS.map((lang) => async () => ({ id, lang, details: await fetchDetails(id, lang, token) })),
    ),
  );

  const byId = new Map<string, Partial<Record<Lang, MovieDetails | null>>>();
  for (const { id, lang, details } of answers) {
    byId.set(id, { ...byId.get(id), [lang]: details });
  }
  const snapshot: TmdbSnapshot = {};
  for (const [id, { es, en }] of byId) {
    snapshot[id] = es && en ? { es, en } : null;
  }

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
