import { END, LANGS } from './types.ts';
import type { MovieFile } from './types.ts';
import { isTimestamp, parseTimestamp } from './time.ts';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPresent(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function checkLocalized(value: unknown, where: string, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${where} must be an object with "es" and "en".`);
    return;
  }
  for (const lang of LANGS) {
    const text = value[lang];
    if (typeof text !== 'string' || text.trim() === '') {
      errors.push(`${where}.${lang} is missing or empty.`);
    }
  }
}

/** Returns every problem found in one movie file. Empty means valid. */
export function validateMovie(input: unknown): string[] {
  const errors: string[] = [];

  if (!isObject(input)) return ['The file must contain a JSON object.'];

  if (!isPresent(input.tmdbId)) errors.push('"tmdbId" is missing.');

  if (input.edition !== undefined) {
    if (typeof input.edition !== 'string' || input.edition.trim() === '') {
      errors.push('"edition" must be a non-empty string when present.');
    }
  }

  let runtimeSeconds: number | null = null;
  if (input.runtime !== undefined) {
    if (isTimestamp(input.runtime)) {
      runtimeSeconds = parseTimestamp(input.runtime);
    } else {
      errors.push('"runtime" must use the "HH:MM:SS" format.');
    }
  }

  const episodes = input.episodes;
  if (!Array.isArray(episodes) || episodes.length === 0) {
    errors.push('"episodes" must be a list with at least one episode.');
    return errors;
  }

  let previous = 0;
  let lastCut = 0;

  episodes.forEach((episode: unknown, index: number) => {
    const where = `Episode ${index + 1}`;
    const isLast = index === episodes.length - 1;

    if (!isObject(episode)) {
      errors.push(`${where} must be an object.`);
      return;
    }

    checkLocalized(episode.title, `${where}: title`, errors);
    if (episode.cue !== undefined) checkLocalized(episode.cue, `${where}: cue`, errors);

    const timestamp = episode.timestamp;
    if (timestamp === END) {
      if (!isLast) errors.push(`${where}: only the last episode can use "END".`);
      return;
    }
    if (isLast) {
      errors.push(`${where}: the last episode must use "END" as its timestamp.`);
    }
    if (!isTimestamp(timestamp)) {
      errors.push(`${where}: timestamp must be "HH:MM:SS" or "END".`);
      return;
    }
    const seconds = parseTimestamp(timestamp) ?? 0;
    if (seconds <= previous) {
      errors.push(
        index === 0
          ? `${where}: timestamp must be later than 00:00:00.`
          : `${where}: timestamp must be later than the previous episode's.`,
      );
    }
    previous = seconds;
    if (!isLast) lastCut = seconds;
  });

  if (runtimeSeconds !== null && runtimeSeconds <= lastCut) {
    errors.push('"runtime" must be later than the last cut.');
  }

  return errors;
}

/**
 * Cross-file rule: two files may share a tmdbId only when their editions
 * differ. Returns the extra errors keyed by slug.
 */
export function findEditionClashes(
  movies: ReadonlyArray<{ slug: string; data: MovieFile }>,
): Map<string, string[]> {
  const seen = new Map<string, string>();
  const clashes = new Map<string, string[]>();

  for (const { slug, data } of movies) {
    const key = `${String(data.tmdbId)}::${(data.edition ?? '').trim().toLowerCase()}`;
    const other = seen.get(key);
    if (other === undefined) {
      seen.set(key, slug);
      continue;
    }
    const message = (rival: string) =>
      `Same "tmdbId" and "edition" as "${rival}.json". Give each file a different "edition".`;
    clashes.set(slug, [...(clashes.get(slug) ?? []), message(other)]);
    clashes.set(other, [...(clashes.get(other) ?? []), message(slug)]);
  }
  return clashes;
}

/** Validates a whole folder: per-file rules plus the cross-file rule. */
export function validateAll(
  files: ReadonlyArray<{ slug: string; content: unknown }>,
): Array<{ slug: string; data?: MovieFile; errors: string[] }> {
  const results = files.map(({ slug, content }) => {
    const errors = validateMovie(content);
    return errors.length === 0
      ? { slug, data: content as MovieFile, errors }
      : { slug, errors };
  });

  const valid = results.flatMap((r) => (r.data ? [{ slug: r.slug, data: r.data }] : []));
  const clashes = findEditionClashes(valid);

  return results
    .map((result) => {
      const extra = clashes.get(result.slug);
      return extra ? { slug: result.slug, errors: [...result.errors, ...extra] } : result;
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}
