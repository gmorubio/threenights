import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { moviePath, validMovies, type ValidMovie } from './support/movies.ts';

// KI-010: moving from one movie page to another without unmounting must start
// the new movie fresh: no cue carried over by part index, no stale header.
test.use({ locale: 'es-ES' });

const withCueOnFirstPart = validMovies().filter(
  (movie) => movie.data.episodes[0]?.cue !== undefined,
);
const movieA = withCueOnFirstPart[0];
const movieB = withCueOnFirstPart[1];

const tmdbFile = join(import.meta.dirname, '..', 'src', 'data', 'tmdb.json');
const tmdb: Record<string, { es?: { title?: string } } | null> = existsSync(tmdbFile)
  ? (JSON.parse(readFileSync(tmdbFile, 'utf8')) as Record<string, { es?: { title?: string } } | null>)
  : {};

/** The h1 the movie page shows in Spanish: the synced TMDB title, or the slug without data. */
function headerTitle(movie: ValidMovie): string {
  return tmdb[String(movie.data.tmdbId).trim()]?.es?.title || movie.slug;
}

test.describe('movie page remounts when the slug changes (KI-010)', () => {
  test.skip(!movieA || !movieB, 'Needs two valid movies with a cue on part 1');

  /** Opens movie A, opens its part 1 cue and installs an h1 recorder. */
  async function openAWithCue(page: Page): Promise<void> {
    const a = movieA!;
    await page.goto(moviePath(a.slug));
    await expect(page.locator('h1'), 'movie A header is shown').toHaveText(headerTitle(a));

    const firstA = page.locator('.episodes > li').first();
    await firstA.getByRole('button', { name: /Mostrar pista de corte/ }).click();
    await expect(firstA.locator('.cue-toggle'), 'cue of A part 1 is open').toHaveAttribute(
      'aria-expanded',
      'true',
    );

    // Record every h1 text present after any DOM change from now on.
    await page.evaluate(() => {
      const seen: string[] = [];
      (window as unknown as { __h1Seen: string[] }).__h1Seen = seen;
      const record = () => {
        for (const h1 of document.querySelectorAll('h1')) seen.push(h1.textContent ?? '');
      };
      new MutationObserver(record).observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });
    });
  }

  /** Same-document navigation to movie B, keeping the app's base path. */
  async function navigateToB(page: Page): Promise<void> {
    await page.evaluate(
      ([fromPath, toPath]) => {
        const { pathname } = window.location;
        const base = pathname.endsWith(fromPath!)
          ? pathname.slice(0, pathname.length - fromPath!.length)
          : '';
        history.pushState(null, '', `${base}${toPath}`);
        dispatchEvent(new PopStateEvent('popstate'));
      },
      [moviePath(movieA!.slug), moviePath(movieB!.slug)],
    );
  }

  test('a cue opened on movie A does not stay open on movie B part 1', async ({ page }) => {
    const b = movieB!;
    await openAWithCue(page);
    await navigateToB(page);

    await expect(
      page.locator('.episode-title').first(),
      'the first part title is B own Spanish title',
    ).toHaveText(b.data.episodes[0]!.title.es);
    const firstB = page.locator('.episodes > li').first();
    await expect(firstB.locator('.cue-toggle'), 'cue of B part 1 starts closed').toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(firstB.locator('.cue-text'), 'cue text of B part 1 is hidden').toBeHidden();
  });

  test('the header never shows movie A title after navigating to movie B', async ({ page }) => {
    const a = movieA!;
    const b = movieB!;
    const titleA = headerTitle(a);
    await openAWithCue(page);
    await navigateToB(page);

    await expect(
      page.locator('.episode-title').first(),
      'the first part title is B own Spanish title',
    ).toHaveText(b.data.episodes[0]!.title.es);
    await expect(page.locator('h1'), 'movie B header is shown').toHaveText(headerTitle(b));

    const seen = await page.evaluate(() => (window as unknown as { __h1Seen: string[] }).__h1Seen);
    const stale = seen.filter((text) => text === titleA || text === a.slug);
    expect(stale, `no h1 showed A title (${titleA}) or slug after the navigation`).toEqual([]);
  });
});
