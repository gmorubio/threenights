import { describe, expect, it } from 'vitest';
import { durationParts, episodeSpans, formatTimestamp, parseTimestamp } from './time.ts';
import type { Episode } from './types.ts';

const ep = (timestamp: string): Episode => ({ title: { es: 'x', en: 'x' }, timestamp });

describe('parseTimestamp', () => {
  it('converts HH:MM:SS to seconds', () => {
    expect(parseTimestamp('00:00:00')).toBe(0);
    expect(parseTimestamp('00:51:40')).toBe(3100);
    expect(parseTimestamp('01:26:00')).toBe(5160);
  });

  it('rejects anything that is not strictly HH:MM:SS', () => {
    for (const bad of ['52:40', '1:26:00', '00:60:00', '00:00:60', 'END', '', '00:51:40 ']) {
      expect(parseTimestamp(bad)).toBeNull();
    }
  });
});

describe('formatTimestamp', () => {
  it('formats seconds like a player clock', () => {
    expect(formatTimestamp(0)).toBe('0:00:00');
    expect(formatTimestamp(3100)).toBe('0:51:40');
    expect(formatTimestamp(5160)).toBe('1:26:00');
  });

  it('round-trips with parseTimestamp', () => {
    expect(formatTimestamp(parseTimestamp('02:01:40') ?? -1)).toBe('2:01:40');
  });
});

describe('durationParts', () => {
  it('rounds to the nearest minute', () => {
    expect(durationParts(3100)).toEqual({ hours: 0, minutes: 52 });
    expect(durationParts(2060)).toEqual({ hours: 0, minutes: 34 });
    expect(durationParts(3655)).toEqual({ hours: 1, minutes: 1 });
    expect(durationParts(3599)).toEqual({ hours: 1, minutes: 0 });
  });
});

describe('episodeSpans', () => {
  it('chains episodes so each starts where the previous ended', () => {
    const spans = episodeSpans([ep('00:51:40'), ep('01:26:00'), ep('END')], 7300);
    expect(spans.map((s) => [s.start, s.end, s.duration])).toEqual([
      [0, 3100, 3100],
      [3100, 5160, 2060],
      [5160, 7300, 2140],
    ]);
    expect(spans.map((s) => s.isLast)).toEqual([false, false, true]);
  });

  it('leaves the last episode open when the runtime is unknown', () => {
    const spans = episodeSpans([ep('00:49:08'), ep('END')], null);
    expect(spans[1]).toEqual({ start: 2948, end: null, duration: null, isLast: true });
  });

  it('handles a single-episode movie and a four-part one', () => {
    expect(episodeSpans([ep('END')], 600)[0]?.duration).toBe(600);
    const four = episodeSpans([ep('00:10:00'), ep('00:20:00'), ep('00:30:00'), ep('END')], 2400);
    expect(four.map((s) => s.duration)).toEqual([600, 600, 600, 600]);
  });

  it('never reports a negative duration when the runtime is too short', () => {
    const spans = episodeSpans([ep('01:00:00'), ep('END')], 1800);
    expect(spans[1]?.duration).toBeNull();
  });
});
