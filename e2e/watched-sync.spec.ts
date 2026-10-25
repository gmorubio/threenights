import { expect, test } from '@playwright/test';
import { moviePath, movieWithParts, readWatched } from './support/movies.ts';

test.use({ locale: 'es-ES' });

const movie = movieWithParts(2);

test.describe('watched progress synced across tabs', () => {
  test.skip(!movie, 'No valid movie with at least 2 parts');

  test('marks in one tab show up in the other without reloading and none is lost (AC-26)', async ({
    context,
  }) => {
    const { slug, data } = movie!;
    const parts = data.episodes.length;

    const pageA = await context.newPage();
    const pageB = await context.newPage();
    await pageA.goto(moviePath(slug));
    await pageB.goto(moviePath(slug));

    for (const [name, page] of [
      ['A', pageA],
      ['B', pageB],
    ] as const) {
      await expect(
        page.locator('.watched-toggle'),
        `tab ${name} renders one toggle per part`,
      ).toHaveCount(parts);
      await expect(
        page.locator('.watched-toggle[aria-pressed="true"]'),
        `tab ${name} starts with no part pressed`,
      ).toHaveCount(0);
    }

    // Mark part 1 in tab A.
    await pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true }).click();
    await expect(
      pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'tab A shows part 1 pressed after marking it',
    ).toBeVisible();
    await expect(
      pageB.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'tab B shows part 1 pressed without reloading',
    ).toBeVisible();

    // Mark part 2 in tab B.
    await pageB.getByRole('button', { name: 'Vista, Parte 2', exact: true }).click();
    await expect(
      pageB.getByRole('button', { name: 'Vista, Parte 2', exact: true, pressed: true }),
      'tab B shows part 2 pressed after marking it',
    ).toBeVisible();
    await expect(
      pageA.getByRole('button', { name: 'Vista, Parte 2', exact: true, pressed: true }),
      'tab A shows part 2 pressed without reloading',
    ).toBeVisible();
    await expect(
      pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'tab A still shows part 1 pressed',
    ).toBeVisible();

    const stored = JSON.parse((await readWatched(pageA)) ?? 'null') as Record<string, unknown>;
    expect(stored?.[slug], 'stored progress keeps indices 0 and 1 for the movie').toEqual(
      expect.arrayContaining([0, 1]),
    );
  });
});
