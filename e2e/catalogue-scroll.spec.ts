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

test.describe('catalogue scroll position on a wide screen (KI-001)', () => {
  // Wide and short: the movie page can only scroll a little.
  test.use({ viewport: { width: 1600, height: 700 } });

  test('Back restores a catalogue offset deeper than the movie page can scroll', async ({
    page,
  }) => {
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
    await expect(cards, 'the grid is shown again').toHaveCount(movieCount);
    await expect
      .poll(() => scrollY(page), 'Back restores the full catalogue offset')
      .toBeCloseTo(catalogueY, 0);
    await expect(cards.last(), 'the opened card is still in view').toBeInViewport();
  });
});

test.describe('catalogue scroll position on same-page links and fresh visits (KI-001)', () => {
  test('the wordmark scrolls the catalogue to the top every time', async ({ page }) => {
    const cards = await openCatalogue(page);
    const wordmark = page.locator('a.wordmark');

    for (const attempt of ['first', 'second']) {
      await cards.last().scrollIntoViewIfNeeded();
      await expect
        .poll(() => scrollY(page), `scrolled down before the ${attempt} click`)
        .toBeGreaterThan(0);
      await wordmark.click();
      await expect.poll(() => scrollY(page), `the ${attempt} click scrolls to the top`).toBe(0);
    }
  });

  test('a fresh visit to the catalogue starts at the top, not at an earlier offset', async ({
    page,
  }) => {
    const cards = await openCatalogue(page);
    await cards.last().scrollIntoViewIfNeeded();
    await expect.poll(() => scrollY(page), 'the catalogue is scrolled down').toBeGreaterThan(0);

    // A new visit in the same tab, like typing the URL in the address bar.
    await page.goto('/');
    await expect(cards, 'the grid is shown again').toHaveCount(movieCount);
    await expect(page.locator('.card-title-skeleton'), 'every title has loaded').toHaveCount(0);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    expect(await scrollY(page), 'a new visit starts at the top').toBe(0);
  });
});

test.describe('movie page scroll position on reload (KI-001)', () => {
  test('reload keeps a movie page offset that is deeper than its loading layout', async ({
    page,
  }) => {
    const cards = await openCatalogue(page);
    await cards.first().click();
    await expect(page, 'the movie page is open').toHaveURL(/\/movie\//);
    const cast = page.locator('.cast');
    await expect(cast, 'the cast list has loaded').toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => scrollY(page), 'the movie page is scrolled down').toBeGreaterThan(0);
    const movieY = await scrollY(page);

    await page.reload();
    await expect(cast, 'the cast list is shown again').toBeVisible();
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    expect(await scrollY(page), 'reload keeps the movie page offset').toBeCloseTo(movieY, 0);
  });
});

test.describe('scroll position on a not-found movie URL (S-1)', () => {
  test('Back to /movie/a/b after a reload restores its offset', async ({ page }) => {
    await page.goto('/movie/a/b');
    // The reload makes the app restore this entry; NotFound sends no ready signal.
    await page.reload();
    const backLink = page.locator('a.back-link');
    await expect(backLink, 'the not-found page is shown').toBeVisible();

    // Pads the page so it can scroll; the style survives same-document navigations.
    await page.addStyleTag({ content: '.site-main { padding-bottom: 4000px; }' });
    // Waits for the scroll event, which is when the app records the offset.
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          window.addEventListener('scroll', resolve, { once: true });
          window.scrollTo(0, 1500);
        }),
    );
    expect(await scrollY(page), 'the not-found page is scrolled down').toBe(1500);

    // A real click would first scroll the link into view and record that offset.
    await backLink.dispatchEvent('click');
    await expect(page.locator('a.card').first(), 'the catalogue is open').toBeVisible();

    await page.goBack();
    await expect(page, 'back on the not-found URL').toHaveURL(/\/movie\/a\/b$/);
    await expect(backLink, 'the not-found page is shown again').toBeVisible();
    await expect
      .poll(() => scrollY(page), 'Back restores the not-found page offset')
      .toBe(1500);
  });
});
