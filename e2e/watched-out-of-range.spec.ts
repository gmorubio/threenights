import { expect, test } from '@playwright/test';
import { moviePath, movieWithParts, seedWatched } from './support/movies.ts';

test.use({ locale: 'es-ES' });

const movie = movieWithParts(1);

test.describe('out-of-range watched indices', () => {
  test.skip(!movie, 'No valid movie');

  test('ignores out-of-range indices on the movie page and the catalogue (AC-28)', async ({
    page,
  }) => {
    const { slug, data } = movie!;
    const parts = data.episodes.length;

    await page.goto(moviePath(slug));
    await seedWatched(page, JSON.stringify({ [slug]: [parts, parts + 5] }));

    await expect(
      page.locator('.watched-toggle'),
      'one watched button per part is shown',
    ).toHaveCount(parts);
    await expect(
      page.locator('.watched-toggle[aria-pressed="true"]'),
      'no part is pressed',
    ).toHaveCount(0);
    await expect(page.locator('.episode-next-label'), 'no part shows "Siguiente"').toHaveCount(0);
    await expect(page.locator('.parts-watched'), 'no watched summary in the heading').toHaveCount(0);

    await page.goto('/');
    const card = page.locator(`a[href="${moviePath(slug)}"]`);
    await expect(card, 'the movie card is in the catalogue').toBeVisible();
    await expect(card.locator('.watched-bar'), 'the card has no watched bar').toHaveCount(0);
  });
});
