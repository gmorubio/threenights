import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the site under /<repo-name>/; the deploy workflow sets it.
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
