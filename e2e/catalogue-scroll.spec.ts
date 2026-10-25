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

test.describe('catalogue scroll position on a wide screen (R-1)', () => {
  // Wide and short: the movie page can only scroll a little.
  test.use({ viewport: { width: 1600, height: 700 } });

  test('Back restores an offset deeper than the movie page can scroll', async ({ page }) => {
    await restoreScrollBeforePopstate(page);
    const cards = await openCatalogue(page);
    // Pads the catalogue so its offset is far beyond the movie page's height.
    await page.addStyleTag({ content: '.catalogue-grid { margin-top: 6000px; }' });
    const lastCard = cards.last();

    await lastCard.scrollIntoViewIfNeeded();
    await expect.poll(() => scrollY(page), 'the catalogue is scrolled deep').toBeGreaterThan(5000);
    const catalogueY = await scrollY(page);

    await lastCard.click();
    await expect(page, 'the movie page is open').toHaveURL(/\/movie\//);
    await expect(page.locator('article.movie'), 'the movie page has rendered').toBeVisible();
    await expect(page.locator('.catalogue'), 'the catalogue is gone').toHaveCount(0);
    const movieMaxScroll = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    expect(movieMaxScroll, 'the movie page is shorter than the catalogue offset').toBeLessThan(
      catalogueY,
    );

    await page.goBack();
    await expect(page, 'back on the catalogue').not.toHaveURL(/\/movie\//);
    await expect
      .poll(() => scrollY(page), 'Back restores the full catalogue offset')
      .toBeCloseTo(catalogueY, 0);
    await expect(cards.last(), 'the opened card is still in view').toBeInViewport();
  });
});

test.describe('catalogue scroll position on reload and same-page links', () => {
  test('reload keeps the catalogue scroll position', async ({ page }) => {
    const cards = await openCatalogue(page);
    await cards.last().scrollIntoViewIfNeeded();
    await expect.poll(() => scrollY(page), 'the catalogue is scrolled down').toBeGreaterThan(0);
    const catalogueY = await scrollY(page);

    await page.reload();
    await expect(cards, 'the grid is shown again').toHaveCount(movieCount);
    await expect
      .poll(() => scrollY(page), 'reload keeps the catalogue scroll position')
      .toBeCloseTo(catalogueY, 0);
  });

  test('reload keeps the offset when the catalogue changes layout after its first render', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const style = document.createElement('style');
      // While titles load, the content above the grid is shorter (like the
      // shorter skeleton titles) and the page is padded so the saved offset
      // already fits on the first render. Style changes stay off the grid's
      // ancestors so the browser's scroll anchoring stays active.
      style.textContent = `
        .catalogue-tagline { margin-bottom: 2000px; }
        .catalogue:has(.card-title-skeleton) .catalogue-tagline { margin-bottom: 1800px; }
        .layout:has(.card-title-skeleton) .site-footer { margin-top: 3000px; }
      `;
      const insert = () => document.documentElement.appendChild(style);
      if (document.documentElement) insert();
      else document.addEventListener('readystatechange', insert, { once: true });
    });
    const cards = await openCatalogue(page);
    await cards.last().scrollIntoViewIfNeeded();
    await expect.poll(() => scrollY(page), 'the catalogue is scrolled deep').toBeGreaterThan(1500);
    const catalogueY = await scrollY(page);

    await page.reload();
    await expect(cards, 'the grid is shown again').toHaveCount(movieCount);
    await expect(page.locator('.card-title-skeleton'), 'every title has loaded').toHaveCount(0);
    await page.waitForTimeout(300);
    expect(await scrollY(page), 'reload keeps the offset of the final layout').toBeCloseTo(
      catalogueY,
      0,
    );
  });

  test('the wordmark scrolls the catalogue to the top every time', async ({ page }) => {
    const cards = await openCatalogue(page);
    const wordmark = page.locator('a.wordmark');

    for (const attempt of ['first', 'second', 'third']) {
      await cards.last().scrollIntoViewIfNeeded();
      await expect
        .poll(() => scrollY(page), `scrolled down before the ${attempt} click`)
        .toBeGreaterThan(0);
      await wordmark.click();
      await expect.poll(() => scrollY(page), `the ${attempt} click scrolls to the top`).toBe(0);
    }
  });
});

test.describe('catalogue scroll position across page loads', () => {
  test('a fresh load of the site starts at the top, not at an earlier load’s offset', async ({
    page,
  }) => {
    const cards = await openCatalogue(page);
    await cards.last().scrollIntoViewIfNeeded();
    await expect.poll(() => scrollY(page), 'the catalogue is scrolled down').toBeGreaterThan(0);

    // A new visit in the same tab, like typing the URL in the address bar.
    await page.goto('/');
    await expect(cards, 'the grid is shown again').toHaveCount(movieCount);
    await expect(page.locator('.card-title-skeleton'), 'every title has loaded').toHaveCount(0);
    await page.waitForTimeout(300);
    expect(await scrollY(page), 'a new visit starts at the top').toBe(0);
  });

  test('the offset is saved when the tab is hidden', async ({ page }) => {
    const cards = await openCatalogue(page);
    await cards.last().scrollIntoViewIfNeeded();
    await expect.poll(() => scrollY(page), 'the catalogue is scrolled down').toBeGreaterThan(0);
    const catalogueY = await scrollY(page);

    // Mobile browsers can discard a hidden tab without firing `pagehide`.
    const stored = await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      return sessionStorage.getItem('threenights:scroll');
    });
    expect(Object.values(JSON.parse(stored ?? '{}')), 'the offset is in storage').toContain(
      catalogueY,
    );
  });

  test('scrolling during a restore stops it, even without pointer events', async ({ page }) => {
    await page.addInitScript(() => {
      const style = document.createElement('style');
      // Pads the catalogue so its offset is deep.
      style.textContent = '.catalogue-grid { margin-top: 3000px; }';
      const reload = performance.getEntriesByType('navigation')[0] as
        PerformanceNavigationTiming | undefined;
      if (reload?.type === 'reload') {
        // Holds the grid back after a reload, like content still loading.
        style.textContent +=
          '.catalogue-grid { display: none; } .site-main { min-height: 1500px; }';
        (window as unknown as { releaseGrid: () => void }).releaseGrid = () => {
          style.textContent = '.catalogue-grid { margin-top: 3000px; }';
        };
      }
      const insert = () => document.documentElement.appendChild(style);
      if (document.documentElement) insert();
      else document.addEventListener('readystatechange', insert, { once: true });
    });
    const cards = await openCatalogue(page);
    await cards.last().scrollIntoViewIfNeeded();
    await expect.poll(() => scrollY(page), 'the catalogue is scrolled deep').toBeGreaterThan(2500);
    const catalogueY = await scrollY(page);

    await page.reload();
    await expect
      .poll(() => scrollY(page), 'the restore has gone as far as the short page allows')
      .toBeGreaterThan(0);
    expect(await scrollY(page), 'the restore is still waiting for the page').toBeLessThan(
      catalogueY - 1,
    );

    // The user drags the scrollbar up: a scroll with no pointer event.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    await page.evaluate(() => (window as unknown as { releaseGrid: () => void }).releaseGrid());
    await expect(cards, 'the grid is shown').toHaveCount(movieCount);
    await page.waitForTimeout(300);
    expect(await scrollY(page), 'the restore no longer pulls the page down').toBe(0);
  });
});

test.describe('catalogue scroll position across documents', () => {
  test('Back to the catalogue from a page opened by URL keeps the catalogue offset', async ({
    page,
  }) => {
    const cards = await openCatalogue(page);
    await page.addStyleTag({
      content: '.catalogue-grid { margin-top: 3000px; }',
    });
    await cards.last().scrollIntoViewIfNeeded();
    await expect.poll(() => scrollY(page), 'the catalogue is scrolled deep').toBeGreaterThan(2500);
    const catalogueY = await scrollY(page);
    const href = await cards.last().getAttribute('href');

    // A new document for another page, like typing its URL.
    await page.goto(href!);
    await expect(page.locator('article.movie'), 'the movie page has rendered').toBeVisible();

    await page.goBack();
    await expect(cards, 'the grid is shown again').toHaveCount(movieCount);
    await page.addStyleTag({
      content: '.catalogue-grid { margin-top: 3000px; }',
    });
    await expect
      .poll(() => scrollY(page), 'Back keeps the catalogue offset, not the movie page’s')
      .toBeCloseTo(catalogueY, 0);
  });
});
