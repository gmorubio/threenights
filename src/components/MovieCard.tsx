import { Link } from 'react-router';
import { Poster } from './Poster.tsx';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import type { Loadable } from '../lib/useMovieDetails.ts';
import type { MovieDetails } from '../lib/tmdb.ts';
import type { LoadedMovie } from '../lib/types.ts';
import './MovieCard.css';

interface MovieCardProps {
  movie: LoadedMovie;
  details: Loadable<MovieDetails> | undefined;
  /** When one error explains every card, it is shown once above the grid. */
  quietErrors: boolean;
}

export function MovieCard({ movie, details, quietErrors }: MovieCardProps) {
  const { t } = useLanguage();
  const data = details?.status === 'ready' ? details.data : undefined;
  const loading = movie.data !== undefined && (details === undefined || details.status === 'loading');
  const title = data?.title || movie.slug;

  return (
    <Link to={`/movie/${movie.slug}`} className="card">
      <Poster path={data?.posterPath} title={title} loading={loading} />

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

        {!movie.data && <span className="card-flag">{t.invalidFile}</span>}
        {details?.status === 'error' && !quietErrors && (
          <span className="card-flag">{t.errorTitle[details.error.kind]}</span>
        )}
      </div>
    </Link>
  );
}
