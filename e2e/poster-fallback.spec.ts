// KI-008: when a poster image fails to load, the poster falls back to the
// same .poster-empty box with the title that is shown when there is no poster.
// tmdb.json is read with node:fs only to decide what to expect; never import
// src/lib/tmdb.ts or src/lib/movies.ts here (they use import.meta.glob).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { moviePath, seedWatched, validMovies, type ValidMovie } from './support/movies.ts';

test.use({ locale: 'es-ES' });

const IMAGES = 'https://image.tmdb.org/t/p/**';

type Snapshot = Record<string, Record<'es' | 'en', { posterPath: string | null }> | null>;

const snapshotFile = join(import.meta.dirname, '..', 'src', 'data', 'tmdb.json');

function readSnapshot(): Snapshot | undefined {
  if (!existsSync(snapshotFile)) return undefined;
  try {
    return JSON.parse(readFileSync(snapshotFile, 'utf8')) as Snapshot;
  } catch {
    return undefined;
  }
}

const snapshot = readSnapshot();

function posterPathOf(movie: ValidMovie, lang: 'es' | 'en'): string | null {
  const entry = snapshot?.[String(movie.data.tmdbId).trim()];
  return entry?.[lang]?.posterPath ?? null;
}

/** Valid movies whose Spanish TMDB data has a poster path. */
const withPoster = validMovies().filter((movie) => posterPathOf(movie, 'es') !== null);

// 1x1 transparent PNG, served for posters that are meant to load.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

function card(page: Page, slug: string) {
  return page.locator(`a[href="${moviePath(slug)}"]`);
}

async function failAllPosters(page: Page) {
  await page.route(IMAGES, (route) => route.fulfill({ status: 404 }));
}

test.describe('poster fallback when the image fails to load (KI-008)', () => {
  test('catalogue cards show the title box instead of a broken image', async ({ page }) => {
    test.skip(!snapshot, 'src/data/tmdb.json is missing (run npm run sync)');
    test.skip(withPoster.length === 0, 'No valid movie with a posterPath in the snapshot');

    await failAllPosters(page);
    await page.goto('/');

    for (const movie of withPoster) {
      const movieCard = card(page, movie.slug);
      await expect(movieCard, `the card of ${movie.slug} is in the catalogue`).toBeVisible();
      // Lazy images only load once they are near the viewport.
      await movieCard.scrollIntoViewIfNeeded();

      const empty = movieCard.locator('.poster-empty');
      await expect(empty, `${movie.slug} shows the title box`).toBeVisible();
      await expect(empty, `${movie.slug} title box has text`).not.toHaveText('');
      await expect(movieCard.locator('.poster img'), `${movie.slug} has no broken img`).toHaveCount(0);
    }
  });

  test('the watched bar still shows over a card whose poster failed', async ({ page }) => {
    test.skip(!snapshot, 'src/data/tmdb.json is missing (run npm run sync)');
    const movie = withPoster.find((candidate) => candidate.data.episodes.length >= 1);
    test.skip(!movie, 'No valid movie with a posterPath in the snapshot');
    const { slug } = movie!;

    await failAllPosters(page);
    await page.goto('/');
    await seedWatched(page, JSON.stringify({ [slug]: [0] }));

    const movieCard = card(page, slug);
    await movieCard.scrollIntoViewIfNeeded();
    await expect(movieCard.locator('.poster-empty'), 'the title box is shown').toBeVisible();
    await expect(movieCard.locator('.poster img'), 'no broken img').toHaveCount(0);
    await expect(movieCard.locator('.watched-bar'), 'the watched bar is still painted').toHaveCount(1);
  });

  test('the movie page header shows the title box instead of a broken image', async ({ page }) => {
    test.skip(!snapshot, 'src/data/tmdb.json is missing (run npm run sync)');
    test.skip(withPoster.length === 0, 'No valid movie with a posterPath in the snapshot');
    const { slug } = withPoster[0]!;

    await failAllPosters(page);
    await page.goto(moviePath(slug));

    const empty = page.locator('.movie-poster .poster-empty');
    await expect(empty, 'the header shows the title box').toBeVisible();
    await expect(empty, 'the title box has text').not.toHaveText('');
    await expect(page.locator('.movie-poster img'), 'no broken img in the header').toHaveCount(0);
  });

  test('the failure is forgotten when the poster path changes with the language', async ({ page }) => {
    test.skip(!snapshot, 'src/data/tmdb.json is missing (run npm run sync)');
    const movie = withPoster.find((candidate) => {
      const en = posterPathOf(candidate, 'en');
      return en !== null && en !== posterPathOf(candidate, 'es');
    });
    test.skip(!movie, 'No movie whose posterPath differs between es and en');
    const { slug } = movie!;
    const esPath = posterPathOf(movie!, 'es')!;

    // Only the Spanish poster fails; any other poster loads.
    await page.route(IMAGES, (route) =>
      route.request().url().endsWith(esPath)
        ? route.fulfill({ status: 404 })
        : route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
    );
    await page.goto(moviePath(slug));

    await expect(
      page.locator('.movie-poster .poster-empty'),
      'the Spanish poster failed, so the title box is shown',
    ).toBeVisible();

    await page.getByRole('button', { name: 'EN', exact: true }).click();

    await expect(
      page.locator('.movie-poster img'),
      'the English poster path is tried again',
    ).toHaveCount(1);
    await expect(page.locator('.movie-poster .poster-empty'), 'no title box any more').toHaveCount(0);
  });
});
