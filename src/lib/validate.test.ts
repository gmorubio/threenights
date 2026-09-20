import { describe, expect, it } from 'vitest';
import { validateAll, validateMovie } from './validate.ts';

const title = { es: 'Uno', en: 'One' };
const valid = () => ({
  tmdbId: 2059,
  edition: 'Theatrical',
  runtime: '02:01:40',
  episodes: [
    { title, timestamp: '00:51:40', cue: { es: 'Pista', en: 'Cue' } },
    { title, timestamp: '01:26:00' },
    { title, timestamp: 'END' },
  ],
});

describe('validateMovie', () => {
  it('accepts a complete file', () => {
    expect(validateMovie(valid())).toEqual([]);
  });

  it('accepts a single-episode movie and a tmdbId of any type', () => {
    expect(validateMovie({ tmdbId: 'tt0368891', episodes: [{ title, timestamp: 'END' }] })).toEqual([]);
  });

  it('requires tmdbId to be present', () => {
    const movie = { ...valid(), tmdbId: undefined };
    expect(validateMovie(movie)).toContain('"tmdbId" is missing.');
  });

  it('requires both languages in title, and in cue when present', () => {
    const movie = valid();
    movie.episodes[0]!.title = { es: 'Uno', en: ' ' };
    movie.episodes[0]!.cue = { es: '', en: 'Cue' };
    expect(validateMovie(movie)).toEqual([
      'Episode 1: title.en is missing or empty.',
      'Episode 1: cue.es is missing or empty.',
    ]);
  });

  it('rejects badly formatted timestamps', () => {
    const movie = valid();
    movie.episodes[0]!.timestamp = '51:40';
    expect(validateMovie(movie)).toContain('Episode 1: timestamp must be "HH:MM:SS" or "END".');
  });

  it('requires strictly increasing timestamps', () => {
    const movie = valid();
    movie.episodes[1]!.timestamp = '00:51:40';
    expect(validateMovie(movie)).toContain(
      "Episode 2: timestamp must be later than the previous episode's.",
    );
  });

  it('requires END on the last episode and only there', () => {
    const noEnd = valid();
    noEnd.episodes[2]!.timestamp = '01:50:00';
    expect(validateMovie(noEnd)).toContain(
      'Episode 3: the last episode must use "END" as its timestamp.',
    );

    const earlyEnd = valid();
    earlyEnd.episodes[0]!.timestamp = 'END';
    expect(validateMovie(earlyEnd)).toContain('Episode 1: only the last episode can use "END".');
  });

  it('requires runtime to be later than the last cut', () => {
    const movie = { ...valid(), runtime: '01:26:00' };
    expect(validateMovie(movie)).toContain('"runtime" must be later than the last cut.');
  });

  it('rejects files that are not objects or have no episodes', () => {
    expect(validateMovie([])).toHaveLength(1);
    expect(validateMovie({ tmdbId: 1, episodes: [] })).toContain(
      '"episodes" must be a list with at least one episode.',
    );
  });
});

describe('validateAll', () => {
  it('allows the same tmdbId when editions differ', () => {
    const results = validateAll([
      { slug: 'a-theatrical', content: valid() },
      { slug: 'a-extended', content: { ...valid(), edition: 'Extended' } },
    ]);
    expect(results.every((r) => r.errors.length === 0)).toBe(true);
  });

  it('flags both files when tmdbId and edition collide', () => {
    const results = validateAll([
      { slug: 'one', content: valid() },
      { slug: 'two', content: valid() },
    ]);
    expect(results.map((r) => r.errors.length)).toEqual([1, 1]);
    expect(results[0]?.data).toBeUndefined();
  });
});
