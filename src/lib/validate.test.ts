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

  it.each([
    ['spaces', '   '],
    ['a tab', '\t'],
  ])('treats a tmdbId made only of %s as missing', (_label, tmdbId) => {
    const movie = { ...valid(), tmdbId };
    expect(validateMovie(movie)).toContain('"tmdbId" is missing.');
  });

  it.each([2059, '2059'])('keeps accepting the non-blank tmdbId %j', (tmdbId) => {
    const movie = { ...valid(), tmdbId };
    expect(validateMovie(movie)).toEqual([]);
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

  const slugError = 'File name must be lowercase letters, digits and hyphens.';

  it.each(['a?b', '50% off-2020', 'Amelie-2001', 'with space'])(
    'marks the file named "%s" as invalid with the slug error and no data',
    (slug) => {
      const results = validateAll([
        { slug, content: valid() },
        { slug: 'hercules-1997', content: { ...valid(), edition: 'Extended' } },
      ]);
      const bad = results.find((r) => r.slug === slug);
      expect(bad?.errors).toContain(slugError);
      expect(bad?.data).toBeUndefined();
    },
  );

  it('keeps files with well-formed slugs valid', () => {
    const results = validateAll([
      { slug: 'hercules-1997', content: valid() },
      { slug: 'a-theatrical', content: { ...valid(), edition: 'Other' } },
    ]);
    for (const result of results) {
      expect(result.errors).toEqual([]);
      expect(result.data).toBeDefined();
    }
  });
});
