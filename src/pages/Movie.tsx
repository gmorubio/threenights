import { Link, useParams } from 'react-router';
import { EpisodeList } from '../components/EpisodeList.tsx';
import { Notice, TmdbNotice } from '../components/Notice.tsx';
import { Poster } from '../components/Poster.tsx';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { findMovie } from '../lib/movies.ts';
import { durationParts, formatTimestamp, parseTimestamp } from '../lib/time.ts';
import { backdropUrl } from '../lib/tmdb.ts';
import { useDocumentTitle } from '../lib/useDocumentTitle.ts';
import { useMovieDetails } from '../lib/useMovieDetails.ts';
import { NotFound } from './NotFound.tsx';
import './Movie.css';

export function Movie() {
  const { slug = '' } = useParams();
  const { lang, t } = useLanguage();
  const movie = findMovie(slug);
  const details = useMovieDetails(movie?.data?.tmdbId, lang);

  const data = details.status === 'ready' ? details.data : undefined;
  const title = data?.title || slug;
  useDocumentTitle(movie ? title : null);

  if (!movie) return <NotFound />;

  const backLink = (
    <Link to="/" className="back-link">
      {t.backToCatalogue}
    </Link>
  );

  if (!movie.data) {
    return (
      <section className="page-narrow">
        {backLink}
        <h1 className="mono movie-slug">{movie.slug}.json</h1>
        <Notice title={t.invalidFile}>
          <ul>
            {movie.errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
          <p>{t.invalidFileHelp}</p>
        </Notice>
      </section>
    );
  }

  const file = movie.data;
  const fileRuntime = file.runtime ? parseTimestamp(file.runtime) : null;
  const tmdbRuntime = data?.runtimeMinutes ? data.runtimeMinutes * 60 : null;
  const runtimeSeconds = fileRuntime ?? tmdbRuntime;
  const approximate = fileRuntime === null && tmdbRuntime !== null;
  const loading = details.status === 'loading';

  const runtimeLabel = (() => {
    if (runtimeSeconds === null) return null;
    const { hours, minutes } = durationParts(runtimeSeconds);
    return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
  })();

  return (
    <article className="movie">
      <div className="movie-hero">
        {data?.backdropPath && (
          <div
            className="movie-backdrop"
            style={{ backgroundImage: `url(${backdropUrl(data.backdropPath)})` }}
            aria-hidden="true"
          />
        )}

        <div className="movie-hero-inner">
          {backLink}

          <div className="movie-summary">
            <div className="movie-poster">
              <Poster path={data?.posterPath} title={title} loading={loading} size="w500" />
            </div>

            <div className="movie-info">
              {loading ? (
                <div className="movie-title-skeleton" aria-label={t.loading} />
              ) : (
                <h1 className={data ? 'movie-title' : 'movie-title mono movie-slug'}>{title}</h1>
              )}

              {data && data.originalTitle && data.originalTitle !== data.title && (
                <p className="movie-original">{data.originalTitle}</p>
              )}

              <p className="movie-meta">
                {data?.year && <span>{data.year}</span>}
                {runtimeLabel && <span>{runtimeLabel}</span>}
                {data && data.genres.length > 0 && <span>{data.genres.join(', ')}</span>}
                {data?.rating != null && (
                  <span className="movie-rating">★ {data.rating.toFixed(1)}</span>
                )}
                {file.edition && (
                  <span className="movie-edition">
                    {t.edition}: {file.edition}
                  </span>
                )}
              </p>

              {data && data.directors.length > 0 && (
                <p className="movie-director">
                  <span className="muted">{t.directedBy}</span> {data.directors.join(', ')}
                </p>
              )}

              {data && (
                <div className="movie-overview">
                  {data.overview ? (
                    <>
                      <p lang={data.overviewLang}>{data.overview}</p>
                      {data.overviewLang !== lang && (
                        <p className="movie-footnote">{t.overviewFallback}</p>
                      )}
                    </>
                  ) : (
                    <p className="muted">{t.noOverview}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="movie-body">
        {details.status === 'error' && <TmdbNotice error={details.error} />}

        <section className="movie-section" aria-labelledby="parts-heading">
          <div className="movie-section-head">
            <h2 id="parts-heading">{t.partsHeading}</h2>
            <span className="muted">{t.partCount(file.episodes.length)}</span>
          </div>

          {fileRuntime !== null && (
            <p className="movie-footnote">{t.copyNote(formatTimestamp(fileRuntime))}</p>
          )}

          <EpisodeList
            episodes={file.episodes}
            runtimeSeconds={runtimeSeconds}
            approximate={approximate}
          />

          {approximate && <p className="movie-footnote">{t.approxNote}</p>}
        </section>

        {data && data.cast.length > 0 && (
          <section className="movie-section" aria-labelledby="cast-heading">
            <div className="movie-section-head">
              <h2 id="cast-heading">{t.cast}</h2>
            </div>
            <ul className="cast">
              {data.cast.map((member) => (
                <li key={`${member.name}-${member.character}`}>
                  <span className="cast-name">{member.name}</span>
                  {member.character && (
                    <span className="cast-role">
                      {t.as} {member.character}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
