import { readdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const movieFiles = readdirSync('movies').filter((file) => file.endsWith('.json'));

test('the catalogue lists every movie', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.catalogue-grid > li')).toHaveCount(movieFiles.length);
});
