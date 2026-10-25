import { expect, test } from '@playwright/test';
import { moviePath, movieWithParts, readWatched, validMovies } from './support/movies.ts';

test.use({ locale: 'es-ES' });

const movie = movieWithParts(2);
const other = validMovies().find((candidate) => candidate.slug !== movie?.slug);

test.describe('marks this tab could not save survive writes from other tabs', () => {
  test.skip(!movie || !other, 'Needs a movie with at least 2 parts and a second valid movie');

  test('a storage event from another tab keeps the unsaved mark', async ({ context }) => {
    const { slug } = movie!;
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    // Tab A can read storage but every write throws (for example, quota exceeded).
    // It also counts the storage events it receives.
    await pageA.addInitScript(() => {
      Storage.prototype.setItem = function () {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      };
      const counter = window as unknown as { storageEvents: number };
      counter.storageEvents = 0;
      window.addEventListener('storage', () => counter.storageEvents++);
    });
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
      .poll(async () => JSON.parse((await readWatched(pageA)) ?? 'null'), {
        message: 'tab B wrote its progress to storage',
      })
      .toEqual({ [other!.slug]: [0] });

    await expect
      .poll(() => pageA.evaluate(() => (window as unknown as { storageEvents: number }).storageEvents), {
        message: 'tab A received the storage event',
      })
      .toBeGreaterThan(0);
    // Let React render whatever the event changed before asserting.
    await pageA.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await expect(
      pageA.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'tab A still shows its unsaved part 1 pressed after the other tab wrote',
    ).toBeVisible();
  });
});
