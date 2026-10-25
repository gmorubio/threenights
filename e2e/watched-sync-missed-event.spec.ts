import { expect, test } from '@playwright/test';
import { WATCHED_KEY, moviePath, movieWithParts, readWatched } from './support/movies.ts';

test.use({ locale: 'es-ES' });

const movie = movieWithParts(2);

// A write that only lands in storage, with no storage event in this tab, stands
// for another tab's write whose event this tab missed or has not received yet.
test.describe('watched progress written by another tab without an event reaching this one', () => {
  test.skip(!movie, 'No valid movie with at least 2 parts');

  test('a write between the first read and the listener is picked up and kept', async ({
    page,
  }) => {
    const { slug } = movie!;
    // On the provider's first read, another "tab" marks part 1 right after it.
    await page.addInitScript(
      ([key, value]) => {
        const original = Storage.prototype.getItem;
        let done = false;
        Storage.prototype.getItem = function (this: Storage, name: string) {
          const result = original.call(this, name);
          if (!done && name === key) {
            done = true;
            Storage.prototype.setItem.call(this, key, value!);
          }
          return result;
        };
      },
      [WATCHED_KEY, JSON.stringify({ [slug]: [0] })],
    );
    await page.goto(moviePath(slug));

    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'part 1 written during start-up shows as pressed',
    ).toBeVisible();

    await page.getByRole('button', { name: 'Vista, Parte 2', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 2', exact: true, pressed: true }),
      'part 2 is pressed after marking it',
    ).toBeVisible();

    const stored = JSON.parse((await readWatched(page)) ?? 'null') as Record<string, unknown>;
    expect(stored?.[slug], 'stored progress keeps parts 1 and 2').toEqual([0, 1]);
  });

  test('a toggle builds on storage, not only on memory, so it never erases a pending write', async ({
    page,
  }) => {
    const { slug } = movie!;
    await page.goto(moviePath(slug));
    await expect(
      page.locator('.watched-toggle[aria-pressed="true"]'),
      'no part starts pressed',
    ).toHaveCount(0);

    // Same-tab write: storage changes but this tab gets no storage event.
    await page.evaluate(
      ([key, value]) => window.localStorage.setItem(key!, value!),
      [WATCHED_KEY, JSON.stringify({ [slug]: [0] })],
    );

    await page.getByRole('button', { name: 'Vista, Parte 2', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 2', exact: true, pressed: true }),
      'part 2 is pressed after marking it',
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'part 1 from the other write shows as pressed too',
    ).toBeVisible();

    const stored = JSON.parse((await readWatched(page)) ?? 'null') as Record<string, unknown>;
    expect(stored?.[slug], 'stored progress keeps parts 1 and 2').toEqual([0, 1]);
  });
});

test.describe('a click does what the button shows, even when storage is ahead of this tab', () => {
  test.skip(!movie, 'No valid movie with at least 2 parts');

  test('marking a part that storage already holds keeps it marked', async ({ page }) => {
    const { slug } = movie!;
    await page.goto(moviePath(slug));
    await expect(
      page.locator('.watched-toggle[aria-pressed="true"]'),
      'no part starts pressed',
    ).toHaveCount(0);

    // Another "tab" marks part 1; this tab gets no event and still shows it unpressed.
    await page.evaluate(
      ([key, value]) => window.localStorage.setItem(key!, value!),
      [WATCHED_KEY, JSON.stringify({ [slug]: [0] })],
    );
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: false }),
      'part 1 still shows unpressed in this tab',
    ).toBeVisible();

    await page.getByRole('button', { name: 'Vista, Parte 1', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'part 1 is pressed after clicking to mark it',
    ).toBeVisible();

    const stored = JSON.parse((await readWatched(page)) ?? 'null') as Record<string, unknown>;
    expect(stored?.[slug], 'stored progress keeps part 1 marked').toEqual([0]);
  });
});
