import { expect, test } from '@playwright/test';
import { moviePath, movieWithParts } from './support/movies.ts';

test.use({ locale: 'es-ES' });

const movie = movieWithParts(2);

test.describe('watched progress with blocked storage', () => {
  test.skip(!movie, 'No valid movie with at least 2 parts');

  test('works in memory without errors or notices and forgets on reload (AC-29)', async ({
    page,
  }) => {
    const { slug, data } = movie!;
    const parts = data.episodes.length;
    const part1 = page.getByRole('button', { name: 'Vista, Parte 1', exact: true });
    const toggles = page.locator('.watched-toggle');

    // Baseline with normal storage.
    await page.goto(moviePath(slug));
    await expect(toggles, 'one watched button per part with normal storage').toHaveCount(parts);
    const baselineNotices = await page.locator('.notice').count();

    // Every access to window.localStorage throws from now on, reloads included.
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new DOMException('Storage is blocked', 'SecurityError');
        },
      });
    });
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    await page.reload();

    expect(
      await page.evaluate(() => {
        try {
          void window.localStorage;
          return false;
        } catch {
          return true;
        }
      }),
      'window.localStorage throws in the page',
    ).toBe(true);

    await expect(toggles, 'one watched button per part with blocked storage').toHaveCount(parts);
    await part1.click();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'part 1 is pressed',
    ).toBeVisible();
    const items = page.locator('.episodes > li');
    await expect(
      items.nth(1).locator('.episode-next-label'),
      'part 2 shows "Siguiente"',
    ).toHaveText('Siguiente');
    await expect(
      page.locator('.notice'),
      'no more notices than with normal storage',
    ).toHaveCount(baselineNotices);

    await page.reload();
    await expect(toggles, 'one watched button per part after reload').toHaveCount(parts);
    await expect(
      page.locator('.watched-toggle[aria-pressed="true"]'),
      'no part is pressed after reload',
    ).toHaveCount(0);

    expect(pageErrors.map((error) => error.message), 'no page errors').toEqual([]);
  });
});
