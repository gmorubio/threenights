import { useEffect, useMemo, useState } from 'react';
import { MovieCard } from '../components/MovieCard.tsx';
import { TmdbNotice } from '../components/Notice.tsx';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { movies } from '../lib/movies.ts';
import { compareTitles } from '../lib/sort.ts';
import { getMovieDetails } from '../lib/tmdb.ts';
import type { MovieDetails } from '../lib/tmdb.ts';
import { toTmdbError } from '../lib/useMovieDetails.ts';
import type { Loadable } from '../lib/useMovieDetails.ts';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import './Catalogue.css';

type DetailsBySlug = Record<string, Loadable<MovieDetails>>;

/** Errors with one shared cause; shown once instead of on every card. */
const GLOBAL_ERRORS = new Set(['missing-data']);

export function Catalogue() {
  const { lang, t } = useLanguage();
  const [details, setDetails] = useState<DetailsBySlug | null>(null);
  useDocumentTitle(null);

  useEffect(() => {
    let cancelled = false;
    setDetails(null);

    const valid = movies.filter((movie) => movie.data);
    // Wait for every title before sorting so the grid never reshuffles.
    Promise.allSettled(valid.map((movie) => getMovieDetails(movie.data!.tmdbId, lang))).then(
      (results) => {
        if (cancelled) return;
        const next: DetailsBySlug = {};
        results.forEach((result, index) => {
          next[valid[index]!.slug] =
            result.status === 'fulfilled'
              ? { status: 'ready', data: result.value }
              : { status: 'error', error: toTmdbError(result.reason) };
        });
        setDetails(next);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [lang]);

  const sorted = useMemo(() => {
    if (!details) return movies;
    const titleOf = (slug: string) => {
      const entry = details[slug];
      return entry?.status === 'ready' && entry.data.title ? entry.data.title : slug;
    };
    return [...movies].sort((a, b) => compareTitles(titleOf(a.slug), titleOf(b.slug), lang));
  }, [details, lang]);

  const globalError = useMemo(() => {
    if (!details) return null;
    const errors = Object.values(details).flatMap((d) => (d.status === 'error' ? [d.error] : []));
    const first = errors[0];
    const shared =
      first !== undefined &&
      errors.length === Object.keys(details).length &&
      GLOBAL_ERRORS.has(first.kind) &&
      errors.every((error) => error.kind === first.kind);
    return shared ? first : null;
  }, [details]);

  return (
    <section className="catalogue">
      <p className="catalogue-tagline">{t.tagline}</p>

      {globalError && <TmdbNotice error={globalError} />}

      {movies.length === 0 ? (
        <p className="muted">{t.emptyCatalogue}</p>
      ) : (
        <ul className="catalogue-grid">
          {sorted.map((movie) => (
            <li key={movie.slug}>
              <MovieCard
                movie={movie}
                details={details?.[movie.slug]}
                quietErrors={globalError !== null}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
