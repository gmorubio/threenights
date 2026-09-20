import { posterUrl } from '../lib/tmdb.ts';
import './Poster.css';

interface PosterProps {
  path: string | null | undefined;
  title: string;
  loading?: boolean;
  size?: 'w342' | 'w500';
}

export function Poster({ path, title, loading = false, size = 'w342' }: PosterProps) {
  if (loading) return <div className="poster poster-skeleton" aria-hidden="true" />;

  if (!path) {
    return (
      <div className="poster poster-empty" aria-hidden="true">
        <span>{title}</span>
      </div>
    );
  }

  return (
    <div className="poster">
      <img src={posterUrl(path, size)} alt="" loading="lazy" decoding="async" />
    </div>
  );
}
