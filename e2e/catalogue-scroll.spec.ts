import { readdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Small viewport so the catalogue grid has several rows and can be scrolled.
test.use({ viewport: { width: 360, height: 420 }, locale: 'es-ES' });

const movieCount = readdirSync('movies').filter((file) => file.endsWith('.json')).length;

async function scrollY(page: Page): Promise<number> {
  return page.evaluate(() => window.scrollY);
}

/**
 * Makes Chromium restore the scroll on Back/Forward the way the HTML spec,
 * Safari and Firefox do: before `popstate` reaches the app. Chromium restores
 * same-document traversals only after `popstate`, which hides an app that
 * resets the scroll on POP navigations.
 */
async function restoreScrollBeforePopstate(page: Page): Promise<void> {
  await page.addInitScript(() => {
    history.scrollRestoration = 'manual';
    const saved = new Map<string, number>();
    const keyOf = (state: unknown): string =>
      state !== null && typeof state === 'object' && 'key' in state
        ? String((state as { key: unknown }).key)
        : 'initial';
    const pushState = history.pushState.bind(history);
    history.pushState = (...args: Parameters<History['pushState']>) => {
      saved.set(keyOf(history.state), window.scrollY);
      pushState(...args);
    };
    // Registered before the app's router, so it runs first.
    window.addEventListener('popstate', (event) => {
      const y = saved.get(keyOf(event.state));
      if (y !== undefined) window.scrollTo(0, y);
    });
  });
}

/** Opens the catalogue and waits until every card has its final title. */
async function openCatalogue(page: Page) {
  await page.goto('/');
  const cards = page.locator('a.card');
  await expect(cards, 'one card per movie file').toHaveCount(movieCount);
  await expect(page.locator('.card-title-skeleton'), 'every title has loaded').toHaveCount(0);
  return cards;
}

test.describe('catalogue scroll position (R-1)', () => {
  test('Back from a movie page keeps the catalogue scroll position', async ({ page }) => {
    await restoreScrollBeforePopstate(page);
    const cards = await openCatalogue(page);
    const lastCard = cards.last();

    await lastCard.scrollIntoViewIfNeeded();
    await expect.poll(() => scrollY(page), 'the catalogue is scrolled down').toBeGreaterThan(0);

    await lastCard.click();
    await expect(page, 'the movie page is open').toHaveURL(/\/movie\//);
    await expect.poll(() => scrollY(page), 'a forward navigation starts at the top').toBe(0);

    await page.goBack();
    await expect(page, 'back on the catalogue').not.toHaveURL(/\/movie\//);
    await expect(cards, 'the grid is shown again').toHaveCount(movieCount);

    await expect
      .poll(() => scrollY(page), 'Back keeps the catalogue scroll position')
      .toBeGreaterThan(0);
    await expect(cards.last(), 'the opened card is still in view').toBeInViewport();
  });
});
