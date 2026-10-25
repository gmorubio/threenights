import { expect, test } from '@playwright/test';
import { moviePath, movieWithParts, readWatched, seedWatched } from './support/movies.ts';

test.use({ locale: 'es-ES' });

const movie = movieWithParts(2);

test.describe('watched toggle on the movie page', () => {
  test.skip(!movie, 'No valid movie with at least 2 parts');

  test('marks, unmarks and keeps parts watched across reloads with a heading summary (AC-18)', async ({
    page,
  }) => {
    const { slug, data } = movie!;
    const parts = data.episodes.length;
    await page.goto(moviePath(slug));

    const toggles = page.locator('.watched-toggle');
    const summary = page.locator('.movie-section-head .parts-watched');
    const part1 = page.getByRole('button', { name: 'Vista, Parte 1', exact: true });
    const part2 = page.getByRole('button', { name: 'Vista, Parte 2', exact: true });

    // Initial state.
    await expect(toggles, 'one watched toggle per part').toHaveCount(parts);
    await expect(
      page.locator('.watched-toggle[aria-pressed="true"]'),
      'no toggle is pressed at first',
    ).toHaveCount(0);
    await expect(
      page.locator('.watched-toggle[aria-pressed="false"]'),
      'every toggle starts unpressed',
    ).toHaveCount(parts);
    await expect(summary, 'no watched summary at first').toHaveCount(0);

    // Mark part 1.
    await part1.click();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'part 1 is pressed after marking it',
    ).toBeVisible();
    await expect(part1, 'part 1 shows the checked text').toHaveText('✓ Vista');
    await expect(
      page.locator('.watched-toggle[aria-pressed="true"]'),
      'only part 1 is pressed',
    ).toHaveCount(1);
    await expect(summary, 'singular summary after one part').toHaveText('1 vista');

    // Mark part 2.
    await part2.click();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 2', exact: true, pressed: true }),
      'part 2 is pressed after marking it',
    ).toBeVisible();
    await expect(summary, 'plural summary after two parts').toHaveText('2 vistas');

    // Unmark part 2.
    await part2.click();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 2', exact: true, pressed: false }),
      'part 2 is unpressed after unmarking it',
    ).toBeVisible();
    await expect(part2, 'part 2 shows the unchecked text').toHaveText('○ Vista');
    await expect(summary, 'summary back to one after unmarking').toHaveText('1 vista');

    // Reload.
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'part 1 is still pressed after reload',
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 2', exact: true, pressed: false }),
      'part 2 is still unpressed after reload',
    ).toBeVisible();

    // Unmark part 1.
    await part1.click();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: false }),
      'part 1 is unpressed after unmarking it',
    ).toBeVisible();
    await expect(summary, 'no summary once nothing is watched').toHaveCount(0);
  });

  test('switching to English keeps the state and translates name, text and summary (AC-23)', async ({
    page,
  }) => {
    await page.goto(moviePath(movie!.slug));
    const part1 = page.getByRole('button', { name: 'Vista, Parte 1', exact: true });
    await expect(part1, 'part 1 has a watched toggle').toBeVisible();
    await part1.click();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'part 1 is pressed in Spanish',
    ).toBeVisible();

    await page.getByRole('button', { name: 'EN', exact: true }).click();

    const watched = page.getByRole('button', { name: 'Watched, Night 1', exact: true, pressed: true });
    await expect(watched, 'part 1 is still pressed in English').toBeVisible();
    await expect(watched, 'part 1 shows the English checked text').toHaveText('✓ Watched');
    await expect(
      page.locator('.movie-section-head .parts-watched'),
      'English summary',
    ).toHaveText('1 watched');
  });

  test('ignores a corrupt stored value and overwrites it with valid JSON (AC-27)', async ({
    page,
  }) => {
    const { slug, data } = movie!;
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));

    await page.goto(moviePath(slug));
    await seedWatched(page, '{nope');

    await expect(
      page.locator('.watched-toggle'),
      'the movie page renders its toggles',
    ).toHaveCount(data.episodes.length);
    await expect(
      page.locator('.watched-toggle[aria-pressed="true"]'),
      'no part is pressed with a corrupt value',
    ).toHaveCount(0);

    await page.getByRole('button', { name: 'Vista, Parte 1', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Vista, Parte 1', exact: true, pressed: true }),
      'part 1 is pressed after marking it',
    ).toBeVisible();

    const raw = await readWatched(page);
    let stored: unknown;
    expect(() => {
      stored = JSON.parse(raw ?? '');
    }, 'stored value is valid JSON').not.toThrow();
    expect(
      (stored as Record<string, unknown>)[slug],
      'stored entry for the slug contains index 0',
    ).toContain(0);
    expect(errors, 'no page errors').toEqual([]);
  });
});
