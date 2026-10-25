import { expect, test } from '@playwright/test';
import { moviePath, movieWithCue, seedWatched } from './support/movies.ts';

test.use({ locale: 'es-ES' });

const movie = movieWithCue(2);
/** First part (0-based) with a cut cue. */
const cueIndex = movie ? movie.data.episodes.findIndex((episode) => episode.cue !== undefined) : -1;

test.describe('cut cues with watched progress', () => {
  test.skip(!movie, 'No valid movie with at least 2 parts and a cue');

  test('does not scroll nor open the cue of the next part on load (AC-21)', async ({ page }) => {
    const { slug, data } = movie!;
    const parts = data.episodes.length;
    const watched = data.episodes.map((_, index) => index).filter((index) => index !== cueIndex);

    // Seed from the catalogue, then open the movie page fresh.
    await page.goto('/');
    await seedWatched(page, JSON.stringify({ [slug]: watched }));
    await page.goto(moviePath(slug));

    const items = page.locator('.episodes > li');
    await expect(items, 'one list item per part').toHaveCount(parts);
    const next = items.nth(cueIndex);
    await expect(
      next.locator('.episode-next-label'),
      `part ${cueIndex + 1} (with a cue) is the next part`,
    ).toHaveText('Siguiente');
    await expect(
      page.locator('.watched-toggle[aria-pressed="true"]'),
      'every other part is pressed',
    ).toHaveCount(watched.length);
    await page.waitForLoadState('load');

    expect(await page.evaluate(() => window.scrollY), 'the page is not scrolled').toBe(0);
    await expect(
      next.getByRole('button', { name: /Mostrar pista de corte/ }),
      'the cue of the next part stays closed',
    ).toHaveAttribute('aria-expanded', 'false');
    await expect(next.locator('.cue-text'), 'the cue text of the next part is hidden').toBeHidden();
  });

  test('opens the cue of a watched part normally (AC-22)', async ({ page }) => {
    const { slug } = movie!;
    await page.goto(moviePath(slug));
    await seedWatched(page, JSON.stringify({ [slug]: [cueIndex] }));

    const item = page.locator('.episodes > li').nth(cueIndex);
    await expect(
      item.getByRole('button', { name: `Vista, Parte ${cueIndex + 1}`, exact: true, pressed: true }),
      'the part with a cue is watched',
    ).toBeVisible();

    const cueToggle = item.locator('.cue-toggle');
    await expect(cueToggle, 'the cue starts closed').toHaveAttribute('aria-expanded', 'false');
    await item.getByRole('button', { name: /Mostrar pista de corte/ }).click();
    await expect(cueToggle, 'the cue button becomes expanded').toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(item.locator('.cue-text'), 'the cue text is visible').toBeVisible();
  });
});
