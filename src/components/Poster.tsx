import { useState, type ReactNode } from 'react';
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
  // Remembering the failed src (not a flag) forgets the failure when path or size change.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (loading) return <div className="poster poster-skeleton" aria-hidden="true" />;

  const src = path ? posterUrl(path, size) : null;
  if (!src || src === failedSrc) {
    return (
      <div className="poster poster-empty" aria-hidden="true">
        <span>{title}</span>
      </div>
    );
  }

  return (
    <div className="poster">
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
      />
    </div>
  );
}
