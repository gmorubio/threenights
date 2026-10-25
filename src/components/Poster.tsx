import type { ReactNode } from 'react';
import { posterUrl } from '../lib/tmdb.ts';
import './Poster.css';

interface PosterProps {
  path: string | null | undefined;
  title: string;
  loading?: boolean;
  size?: 'w342' | 'w500';
  /** Painted over the poster, as a sibling so the loading shimmer never fades it. */
  overlay?: ReactNode;
}

export function Poster({ path, title, loading = false, size = 'w342', overlay }: PosterProps) {
  return (
    <div className="poster-frame">
      <PosterImage path={path} title={title} loading={loading} size={size} />
      {overlay}
    </div>
  );
}

function PosterImage({ path, title, loading, size }: Required<Omit<PosterProps, 'overlay'>>) {
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
