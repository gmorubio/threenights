import type { LoadedMovie } from './types.ts';
import { validateAll } from './validate.ts';

// Vite collects every file in /movies at build time, so there is no index to
// maintain. Files are read as raw text so that a JSON syntax error marks one
// card as invalid instead of breaking the whole app.
const sources = import.meta.glob<string>('/movies/*.json', {
  eager: true,
  query: '?raw',
  import: 'default',
});

function loadMovies(): LoadedMovie[] {
  const parseErrors = new Map<string, string>();

  const files = Object.entries(sources).map(([path, text]) => {
    const slug = path.split('/').pop()?.replace(/\.json$/, '') ?? path;
    try {
      return { slug, content: JSON.parse(text) as unknown };
    } catch (error) {
      parseErrors.set(slug, error instanceof Error ? error.message : String(error));
      return { slug, content: undefined };
    }
  });

  return validateAll(files).map((result) => {
    const parseError = parseErrors.get(result.slug);
    return parseError
      ? { slug: result.slug, errors: [`Invalid JSON: ${parseError}`] }
      : result;
  });
}

export const movies: readonly LoadedMovie[] = loadMovies();

export function findMovie(slug: string): LoadedMovie | undefined {
  return movies.find((movie) => movie.slug === slug);
}
