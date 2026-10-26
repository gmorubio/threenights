import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { moviePath, movieWithParts, readWatched, validMovies } from './support/movies.ts';

test.use({ locale: 'es-ES' });

const movie = movieWithParts(2);
const other = validMovies().find((candidate) => candidate.slug !== movie?.slug);

interface FailingTab {
  failWrites: boolean;
  storageEvents: number;
}

/**
 * Tab can read storage but every write throws (for example, quota exceeded)
 * while window.failWrites is true, which is the starting value. It also counts
 * the storage events it receives.
 */
async function makeWritesFail(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const tab = window as unknown as FailingTab;
    tab.failWrites = true;
    tab.storageEvents = 0;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
      if (tab.failWrites) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      setItem.call(this, key, value);
    };
    window.addEventListener('storage', () => tab.storageEvents++);
  });
}

async function setWritesFail(page: Page, fail: boolean): Promise<void> {
  await page.evaluate((value) => {
    (window as unknown as FailingTab).failWrites = value;
  }, fail);
}

/** Waits until the tab has received at least `count` storage events and React rendered them. */
async function waitForStorageEvents(page: Page, count: number, message: string): Promise<void> {
  await expect
    .poll(() => page.evaluate(() => (window as unknown as FailingTab).storageEvents), { message })
    .toBeGreaterThanOrEqual(count);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

async function storedState(page: Page): Promise<Record<string, number[]> | null> {
  return JSON.parse((await readWatched(page)) ?? 'null') as Record<string, number[]> | null;
}

test.describe('marks this tab could not save survive writes from other tabs', () => {
  test.skip(!movie || !other, 'Needs a movie with at least 2 parts and a second valid movie');

  test('a storage event from another tab keeps the unsaved mark', async ({ context }) => {
    const { slug } = movie!;
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await makeWritesFail(pageA);
    await pageA.goto(moviePath(slug));
    await pageB.goto(moviePath(other!.slug));

    await pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true }).click();
    await expect(
      pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'tab A shows part 1 pressed although it could not save it',
    ).toBeVisible();

    // Tab B, where writes work, marks a part of another movie.
    await pageB.getByRole('button', { name: 'Vista, Parte 1', exact: true }).click();
    await expect
      .poll(() => storedState(pageA), { message: 'tab B wrote its progress to storage' })
      .toEqual({ [other!.slug]: [0] });

    await waitForStorageEvents(pageA, 1, 'tab A received the storage event');
    await expect(
      pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'tab A still shows its unsaved part 1 pressed after the other tab wrote',
    ).toBeVisible();
  });

  test('another tab changing the same part wins over the unsaved mark and it is never written back', async ({
    context,
  }) => {
    const { slug } = movie!;
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await makeWritesFail(pageA);
    await pageA.goto(moviePath(slug));
    await pageB.goto(moviePath(slug));

    // Tab A marks part 1 but cannot save it.
    await pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true }).click();
    await expect(
      pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'tab A shows part 1 pressed although it could not save it',
    ).toBeVisible();

    // Tab B marks part 1 of the same movie: storage now holds tab A's mark.
    await pageB.getByRole('button', { name: 'Vista, Parte 1', exact: true }).click();
    await expect
      .poll(() => storedState(pageB), { message: 'tab B saved part 1' })
      .toEqual({ [slug]: [0] });
    await waitForStorageEvents(pageA, 1, 'tab A received the event for tab B marking part 1');

    // Tab B then unmarks part 1: that later change must win in tab A.
    await pageB.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }).click();
    await expect
      .poll(() => storedState(pageB), { message: 'tab B saved part 1 unmarked' })
      .toEqual({});
    await waitForStorageEvents(pageA, 2, 'tab A received the event for tab B unmarking part 1');

    await expect(
      pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: false }),
      'tab A shows part 1 not pressed after tab B unmarked it',
    ).toBeVisible();

    // Writes work again in tab A; marking part 2 must not bring part 1 back.
    await setWritesFail(pageA, false);
    await pageA.getByRole('button', { name: 'Vista, Parte 2', exact: true }).click();
    await expect
      .poll(async () => (await storedState(pageA))?.[slug], {
        message: 'storage holds only part 2 for the movie, not the stale part 1',
      })
      .toEqual([1]);
  });

  test('a storage event after writes work again saves the pending mark together with the other tab', async ({
    context,
  }) => {
    const { slug } = movie!;
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await makeWritesFail(pageA);
    await pageA.goto(moviePath(slug));
    await pageB.goto(moviePath(other!.slug));

    // Tab A marks part 1 but cannot save it.
    await pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true }).click();
    await expect(
      pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'tab A shows part 1 pressed although it could not save it',
    ).toBeVisible();

    // Writes work again in tab A, then tab B marks a part of another movie.
    await setWritesFail(pageA, false);
    await pageB.getByRole('button', { name: 'Vista, Parte 1', exact: true }).click();
    await waitForStorageEvents(pageA, 1, 'tab A received the storage event');

    await expect
      .poll(() => storedState(pageB), {
        message: "tab A retried its write, so storage holds both tab A's and tab B's marks",
      })
      .toEqual({ [slug]: [0], [other!.slug]: [0] });
    await expect(
      pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'tab A still shows part 1 pressed',
    ).toBeVisible();
  });
});
