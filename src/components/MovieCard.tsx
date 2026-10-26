import { Link } from 'react-router';
import { Poster } from './Poster.tsx';
import { WatchedBar } from './WatchedBar.tsx';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import type { Loadable } from '../lib/useMovieDetails.ts';
import type { MovieDetails } from '../lib/tmdb.ts';
import type { LoadedMovie } from '../lib/types.ts';
import { useWatched } from '../lib/WatchedContext.tsx';
import { watchedParts } from '../lib/watched.ts';
import './MovieCard.css';

interface MovieCardProps {
  movie: LoadedMovie;
  details: Loadable<MovieDetails> | undefined;
  /** When one error explains every card, it is shown once above the grid. */
  quietErrors: boolean;
}

export function MovieCard({ movie, details, quietErrors }: MovieCardProps) {
  const { t } = useLanguage();
  const { watched } = useWatched();
  const data = details?.status === 'ready' ? details.data : undefined;
  const loading = movie.data !== undefined && (details === undefined || details.status === 'loading');
  const title = data?.title || movie.slug;
  const partTotal = movie.data?.episodes.length ?? 0;
  const watchedIndices = watchedParts(watched, movie.slug, partTotal);
  const hasProgress = watchedIndices.length > 0;

  return (
    <Link to={`/movie/${encodeURIComponent(movie.slug)}`} className="card">
      <Poster
        path={data?.posterPath}
        title={title}
        loading={loading}
        overlay={hasProgress && <WatchedBar total={partTotal} watched={watchedIndices} />}
      />

      <div className="card-text">
        {loading ? (
          <span className="card-title card-title-skeleton" aria-label={t.loading} />
        ) : (
          <span className={data ? 'card-title' : 'card-title card-title-slug'}>{title}</span>
        )}

        {movie.data && (
          <span className="card-meta">
            {data?.year && <span>{data.year}</span>}
            <span>{t.partCount(movie.data.episodes.length)}</span>
            {movie.data.edition && <span className="card-edition">{movie.data.edition}</span>}
          </span>
        )}

        {hasProgress && (
          <span className="visually-hidden">{t.watchedOf(watchedIndices.length, partTotal)}</span>
        )}

        {!movie.data && <span className="card-flag">{t.invalidFile}</span>}
        {details?.status === 'error' && !quietErrors && (
          <span className="card-flag">{t.errorTitle[details.error.kind]}</span>
        )}
      </div>
    </Link>
  );
}
