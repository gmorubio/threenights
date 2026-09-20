import { END } from './types.ts';
import type { Episode } from './types.ts';

const TIME_PATTERN = /^(\d{2}):([0-5]\d):([0-5]\d)$/;

export function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

/** "01:26:00" -> 5160. Returns null when the format is wrong. */
export function parseTimestamp(value: string): number | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

/** 5160 -> "1:26:00". Hours are never padded, so times read like a player. */
export function formatTimestamp(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export interface DurationParts {
  hours: number;
  minutes: number;
}

/** Rounds to the nearest minute, which is the precision a viewer plans with. */
export function durationParts(totalSeconds: number): DurationParts {
  const totalMinutes = Math.max(0, Math.round(totalSeconds / 60));
  return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 };
}

export interface EpisodeSpan {
  /** Seconds from the start of the film. */
  start: number;
  /** Null when the episode runs to the end and the total runtime is unknown. */
  end: number | null;
  duration: number | null;
  isLast: boolean;
}

/**
 * Derives start, end and duration for every episode. Only end times are
 * stored, so each episode starts exactly where the previous one ended.
 * `runtimeSeconds` closes the last episode; pass null when it is unknown.
 */
export function episodeSpans(
  episodes: readonly Episode[],
  runtimeSeconds: number | null,
): EpisodeSpan[] {
  let start = 0;
  return episodes.map((episode, index) => {
    const isLast = index === episodes.length - 1;
    const end =
      episode.timestamp === END ? runtimeSeconds : parseTimestamp(episode.timestamp);
    const valid = end !== null && end > start;
    const span: EpisodeSpan = {
      start,
      end: valid ? end : null,
      duration: valid ? end - start : null,
      isLast,
    };
    if (valid) start = end;
    return span;
  });
}
