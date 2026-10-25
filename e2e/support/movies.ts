// Shared helpers for the watched-parts UI tests. Movies are read straight from
// movies/*.json and checked with validateAll, like scripts/validate.ts. Never
// import src/lib/movies.ts or src/lib/tmdb.ts here: they use import.meta.glob.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { validateAll } from '../../src/lib/validate.ts';
import type { MovieFile } from '../../src/lib/types.ts';

export const WATCHED_KEY = 'threenights.watched';

export interface ValidMovie {
  slug: string;
  data: MovieFile;
}

const folder = join(import.meta.dirname, '..', '..', 'movies');

/** Every movie file that passes validation, sorted by slug. */
export function validMovies(): ValidMovie[] {
  const names = readdirSync(folder)
    .filter((name) => name.endsWith('.json'))
    .sort();
  const files = names.map((name) => {
    const slug = name.replace(/\.json$/, '');
    try {
      return { slug, content: JSON.parse(readFileSync(join(folder, name), 'utf8')) as unknown };
    } catch {
      return { slug, content: undefined };
    }
  });
  return validateAll(files).flatMap((result) =>
    result.data ? [{ slug: result.slug, data: result.data }] : [],
  );
}

/** First valid movie matching the condition, or undefined. */
export function findMovie(condition: (movie: ValidMovie) => boolean): ValidMovie | undefined {
  return validMovies().find(condition);
}

/** First valid movie with at least `count` parts. */
export function movieWithParts(count: number): ValidMovie | undefined {
  return findMovie((movie) => movie.data.episodes.length >= count);
}

/** First valid movie with at least `minParts` parts and at least one part with a cue. */
export function movieWithCue(minParts = 1): ValidMovie | undefined {
  return findMovie(
    (movie) =>
      movie.data.episodes.length >= minParts &&
      movie.data.episodes.some((episode) => episode.cue !== undefined),
  );
}

export function moviePath(slug: string): string {
  return `/movie/${slug}`;
}

/**
 * Writes the raw stored progress and reloads. The page must already be on
 * the app's origin. addInitScript is not used on purpose: it would run again
 * on every reload.
 */
export async function seedWatched(page: Page, raw: string): Promise<void> {
  await page.evaluate(([key, value]) => window.localStorage.setItem(key!, value!), [
    WATCHED_KEY,
    raw,
  ]);
  await page.reload();
}

/** Raw stored progress, or null when nothing is stored. */
export async function readWatched(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), WATCHED_KEY);
}

/**
 * Effective opacity of the first element matching `selector` inside `scope`:
 * the product of the computed opacity of the element and all its ancestors.
 */
export async function effectiveOpacity(
  scope: Locator,
  selector: string,
): Promise<number> {
  return scope.locator(selector).first().evaluate((element) => {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) {
      opacity *= Number.parseFloat(getComputedStyle(node).opacity);
    }
    return opacity;
  });
}

/**
 * Computed value of `--accent` as a colour, resolved through a probe element
 * with `color: var(--accent)`, so it compares directly with computed colours.
 */
export async function accentColor(page: Page): Promise<string> {
  return page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--accent)';
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
}
