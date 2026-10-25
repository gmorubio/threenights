import { expect, test } from '@playwright/test';
import {
  accentColor,
  effectiveOpacity,
  moviePath,
  movieWithParts,
  seedWatched,
} from './support/movies.ts';

test.use({ locale: 'es-ES' });

const movie = movieWithParts(2);

test.describe('next part and watched parts on the movie page', () => {
  test.skip(!movie, 'No valid movie with at least 2 parts');

  test('highlights the first unwatched part as next only while there is progress (AC-19)', async ({
    page,
  }) => {
    const { slug, data } = movie!;
    const parts = data.episodes.length;
    await page.goto(moviePath(slug));

    const items = page.locator('.episodes > li');
    const nextLabels = page.locator('.episode-next-label');
    await expect(items, 'one list item per part').toHaveCount(parts);

    // No progress.
    await expect(nextLabels, 'no "Siguiente" without progress').toHaveCount(0);

    // Only the last part watched.
    await page.getByRole('button', { name: `Vista, Parte ${parts}`, exact: true }).click();
    await expect(
      page.getByRole('button', { name: `Vista, Parte ${parts}`, exact: true, pressed: true }),
      'last part is pressed',
    ).toBeVisible();

    const first = items.nth(0);
    await expect(nextLabels, 'exactly one part shows "Siguiente"').toHaveCount(1);
    await expect(
      first.locator('.episode-next-label'),
      'part 1 shows "Siguiente"',
    ).toHaveText('Siguiente');
    await expect(
      first.locator('.episode-label'),
      '"Siguiente" sits next to the "Parte 1" label',
    ).toHaveText('Parte 1');
    expect(
      await first
        .locator('.episode-next-label')
        .evaluate((label) => label.parentElement?.querySelector(':scope > .episode-label') != null),
      '"Siguiente" shares its container with the "Parte 1" label',
    ).toBe(true);

    const accent = await accentColor(page);
    const border = (index: number) =>
      items.nth(index).evaluate((element) => {
        const style = getComputedStyle(element);
        return { width: style.borderLeftWidth, color: style.borderLeftColor };
      });

    const firstBorder = await border(0);
    expect(firstBorder.width, 'part 1 has a 3px left border').toBe('3px');
    expect(firstBorder.color, 'part 1 left border uses the accent colour').toBe(accent);
    for (let index = 1; index < parts; index++) {
      expect(
        (await border(index)).color,
        `part ${index + 1} left border is not the accent colour`,
      ).not.toBe(accent);
    }

    // All parts watched.
    for (let number = 1; number < parts; number++) {
      await page.getByRole('button', { name: `Vista, Parte ${number}`, exact: true }).click();
    }
    await expect(
      page.locator('.watched-toggle[aria-pressed="true"]'),
      'every part is pressed',
    ).toHaveCount(parts);
    await expect(nextLabels, 'no "Siguiente" once every part is watched').toHaveCount(0);
  });

  test('dims only the label, title and cut time of watched parts (AC-20)', async ({ page }) => {
    const { slug } = movie!;
    await page.goto(moviePath(slug));
    await seedWatched(page, JSON.stringify({ [slug]: [0] }));

    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'part 1 is pressed from the seeded progress',
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 2', exact: true, pressed: false }),
      'part 2 is not pressed',
    ).toBeVisible();

    const items = page.locator('.episodes > li');
    const watched = items.nth(0);
    const unwatched = items.nth(1);

    for (const selector of ['.episode-label', '.episode-title', '.episode-cut-time']) {
      expect(
        await effectiveOpacity(watched, selector),
        `${selector} of watched part 1 is dimmed`,
      ).toBeLessThan(1);
      expect(
        await effectiveOpacity(unwatched, selector),
        `${selector} of unwatched part 2 is fully opaque`,
      ).toBe(1);
    }

    for (const selector of ['.watched-toggle', '.episode-meta', '.episode-cut-label']) {
      expect(
        await effectiveOpacity(watched, selector),
        `${selector} of watched part 1 stays fully opaque`,
      ).toBe(1);
    }
  });
});
