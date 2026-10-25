import './WatchedBar.css';

interface WatchedBarProps {
  total: number;
  watched: readonly number[];
}

/** Decorative progress bar, one segment per part. The card link carries the text. */
export function WatchedBar({ total, watched }: WatchedBarProps) {
  const filled = new Set(watched);
  return (
    <div className="watched-bar" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="watched-segment" data-filled={String(filled.has(i))} />
      ))}
    </div>
  );
}
