import { useId, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext.tsx';
import { durationParts, episodeSpans, formatTimestamp } from '../lib/time.ts';
import type { EpisodeSpan } from '../lib/time.ts';
import type { Episode } from '../lib/types.ts';
import './EpisodeList.css';

interface EpisodeListProps {
  episodes: readonly Episode[];
  runtimeSeconds: number | null;
  /** True when the runtime comes from TMDB minutes rather than the file. */
  approximate: boolean;
}

function formatDuration(seconds: number): string {
  const { hours, minutes } = durationParts(seconds);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

export function EpisodeList({ episodes, runtimeSeconds, approximate }: EpisodeListProps) {
  const spans = episodeSpans(episodes, runtimeSeconds);

  return (
    <ol className="episodes">
      {episodes.map((episode, index) => (
        <EpisodeItem
          key={index}
          number={index + 1}
          episode={episode}
          span={spans[index]!}
          approximate={approximate}
        />
      ))}
    </ol>
  );
}

interface EpisodeItemProps {
  number: number;
  episode: Episode;
  span: EpisodeSpan;
  approximate: boolean;
}

function EpisodeItem({ number, episode, span, approximate }: EpisodeItemProps) {
  const { lang, t } = useLanguage();
  // Cues describe how the part ends, so they start hidden. Nothing is stored:
  // a reload hides them again.
  const [cueOpen, setCueOpen] = useState(false);
  const cueId = useId();
  const approx = span.isLast && approximate;

  return (
    <li className="episode">
      <div className="episode-head">
        <div className="episode-name">
          <span className="episode-label">{t.partLabel(number)}</span>
          <h3 className="episode-title">{episode.title[lang]}</h3>
          <p className="episode-meta">
            {span.duration !== null && (
              <span>
                {approx ? '~' : ''}
                {formatDuration(span.duration)}
              </span>
            )}
            <span>
              {t.startsAt} <time className="mono">{formatTimestamp(span.start)}</time>
            </span>
          </p>
        </div>

        <div className="episode-cut">
          {span.isLast ? (
            <>
              <span className="episode-cut-label">{t.untilEnd}</span>
              <span className="episode-cut-time episode-cut-end mono">
                {span.end !== null ? `${approx ? '~' : ''}${formatTimestamp(span.end)}` : '—'}
              </span>
            </>
          ) : (
            <>
              <span className="episode-cut-label">{t.cutAt}</span>
              <time className="episode-cut-time mono">
                {span.end !== null ? formatTimestamp(span.end) : '—'}
              </time>
            </>
          )}
        </div>
      </div>

      {episode.cue && (
        <div className="episode-cue">
          <button
            type="button"
            className="cue-toggle"
            aria-expanded={cueOpen}
            aria-controls={cueId}
            onClick={() => setCueOpen((open) => !open)}
          >
            <span className="cue-chevron" aria-hidden="true" />
            {cueOpen ? t.hideCue : t.showCue}
            {!cueOpen && <span className="cue-hint">{t.spoilerNote}</span>}
          </button>
          <p id={cueId} className="cue-text" hidden={!cueOpen}>
            {episode.cue[lang]}
          </p>
        </div>
      )}
    </li>
  );
}
