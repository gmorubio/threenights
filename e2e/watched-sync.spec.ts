import { expect, test } from '@playwright/test';
import { WATCHED_KEY, moviePath, movieWithParts, readWatched } from './support/movies.ts';

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

test.describe('a late storage event never replaces newer stored progress', () => {
  test.skip(!movie, 'No valid movie with at least 2 parts');

  test('an event carrying an older value leaves the tab matching what is stored', async ({
    page,
  }) => {
    const { slug } = movie!;
    await page.goto(moviePath(slug));
    await page.getByRole('button', { name: 'Vista, Parte 1', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'part 1 is pressed after marking it',
    ).toBeVisible();

    // Another tab's earlier write (part 2 only) reaches this tab after its own
    // write already landed in storage (part 1 only).
    await page.evaluate(
      ([key, value]) =>
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: value,
            storageArea: window.localStorage,
          }),
        ),
      [WATCHED_KEY, JSON.stringify({ [slug]: [1] })],
    );
    // Let React render whatever the event changed before checking what shows.
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))),
    );

    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'part 1 from storage stays pressed',
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 2', exact: true, pressed: false }),
      'part 2 from the stale event does not show as pressed',
    ).toBeVisible();
    const stored = JSON.parse((await readWatched(page)) ?? 'null') as Record<string, unknown>;
    expect(stored?.[slug], 'storage still holds part 1 only').toEqual([0]);
  });
});
