import { expect, test, type Page } from '@playwright/test';
import { findMovie, moviePath, movieWithParts, seedWatched } from './support/movies.ts';

test.use({ locale: 'es-ES' });

function card(page: Page, slug: string) {
  return page.locator(`a[href="${moviePath(slug)}"]`);
}

test.describe('watched progress on the catalogue', () => {
  const multiPart = movieWithParts(2);

  test('shows no bar without progress, a partial bar and a full bar (AC-24)', async ({ page }) => {
    test.skip(!multiPart, 'No valid movie with at least 2 parts');
    const { slug, data } = multiPart!;
    const parts = data.episodes.length;
    const watchedIndex = 1;

    await page.goto('/');
    const movieCard = card(page, slug);
    await expect(movieCard, 'the movie card is in the catalogue').toBeVisible();
    await expect(movieCard.locator('.watched-bar'), 'no bar without progress').toHaveCount(0);

    // Only index i watched.
    await seedWatched(page, JSON.stringify({ [slug]: [watchedIndex] }));
    const bar = card(page, slug).locator('.watched-bar');
    await expect(bar, 'one bar with one part watched').toHaveCount(1);
    await expect(bar, 'the bar is hidden from assistive technology').toHaveAttribute(
      'aria-hidden',
      'true',
    );
    const segments = bar.locator('.watched-segment');
    await expect(segments, 'one segment per part').toHaveCount(parts);
    await expect(
      bar.locator('.watched-segment[data-filled="true"]'),
      'only one segment is filled',
    ).toHaveCount(1);
    await expect(
      segments.nth(watchedIndex),
      'the segment of the watched part is filled',
    ).toHaveAttribute('data-filled', 'true');
    for (let i = 0; i < parts; i++) {
      if (i === watchedIndex) continue;
      await expect(segments.nth(i), `segment ${i} is not filled`).toHaveAttribute(
        'data-filled',
        'false',
      );
    }

    // Every part watched.
    await seedWatched(page, JSON.stringify({ [slug]: data.episodes.map((_, i) => i) }));
    const fullBar = card(page, slug).locator('.watched-bar');
    await expect(fullBar.locator('.watched-segment'), 'one segment per part when all watched').toHaveCount(parts);
    await expect(
      fullBar.locator('.watched-segment[data-filled="true"]'),
      'every segment is filled when all parts are watched',
    ).toHaveCount(parts);
  });

  const anyMovie = findMovie(() => true);

  test('adds accessible watched text to the card link in Spanish and English (AC-25)', async ({
    page,
  }) => {
    test.skip(!anyMovie, 'No valid movie');
    const { slug, data } = anyMovie!;
    const parts = data.episodes.length;

    await page.goto('/');
    await seedWatched(page, JSON.stringify({ [slug]: [0] }));

    const spanish = parts === 1 ? '1 de 1 parte vista' : `1 de ${parts} partes vistas`;
    await expect(
      page.getByRole('link', { name: new RegExp(spanish) }),
      'the card link name includes the Spanish watched text',
    ).toBeVisible();
    await expect(
      card(page, slug).locator('.visually-hidden'),
      'the Spanish text lives in a visually hidden element inside the link',
    ).toHaveText(spanish);

    await page.getByRole('button', { name: 'EN', exact: true }).click();

    const english = parts === 1 ? '1 of 1 night watched' : `1 of ${parts} nights watched`;
    await expect(
      page.getByRole('link', { name: new RegExp(english) }),
      'the card link name includes the English watched text',
    ).toBeVisible();
    await expect(
      card(page, slug).locator('.visually-hidden'),
      'the English text lives in a visually hidden element inside the link',
    ).toHaveText(english);
  });
});
