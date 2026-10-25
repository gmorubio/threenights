import { describe, expect, it } from 'vitest';
import { parseWatched, serializeWatched, type WatchedState } from './watched.ts';

describe('parseWatched', () => {
  it('returns empty progress when nothing is stored', () => {
    expect(parseWatched(null)).toEqual({});
  });

  it('returns empty progress without throwing when the stored text is not valid JSON', () => {
    expect(() => parseWatched('{nope')).not.toThrow();
    expect(parseWatched('{nope')).toEqual({});
  });

  it.each(['3', '"x"', 'null', '[0,1]'])(
    'returns empty progress when the stored JSON %s is not an object',
    (raw) => {
      expect(parseWatched(raw)).toEqual({});
    },
  );

  it('drops slugs whose value is not an array and keeps the valid ones', () => {
    expect(parseWatched('{"a":[0],"b":"x","c":{"0":1}}')).toEqual({ a: [0] });
  });

  it('keeps only safe non-negative integer indices', () => {
    expect(parseWatched('{"a":[1.5,"1",-1,9007199254740992,null,0,3]}')).toEqual({ a: [0, 3] });
  });

  it('removes duplicate indices and sorts them in ascending order', () => {
    expect(parseWatched('{"a":[2,0,2]}')).toEqual({ a: [0, 2] });
  });

  it('sorts indices numerically rather than lexicographically', () => {
    expect(parseWatched('{"a":[10,2,1]}')).toEqual({ a: [1, 2, 10] });
  });

  it('drops slugs whose array is empty from the start or after discarding invalid entries', () => {
    expect(parseWatched('{"a":[],"b":["x",-1],"c":[1]}')).toEqual({ c: [1] });
  });

  it('does not let a "__proto__" key alter any prototype', () => {
    const before = Object.getOwnPropertyNames(Object.prototype);

    const result = parseWatched('{"__proto__":[0],"a":[1]}');

    const proto = Object.getPrototypeOf(result);
    expect(proto === Object.prototype || proto === null).toBe(true);
    expect(Object.getOwnPropertyNames(Object.prototype)).toEqual(before);
    expect(({} as Record<number, unknown>)[0]).toBeUndefined();
    expect(result.a).toEqual([1]);
  });
});

describe('serializeWatched', () => {
  it('writes the agreed storage format with ascending indices', () => {
    expect(serializeWatched({ 'hercules-1997': [0, 2] })).toBe('{"hercules-1997":[0,2]}');
  });

  it('round-trips progress for several movies through parseWatched', () => {
    const state: WatchedState = {
      'hercules-1997': [0, 2],
      'the-fabelmans-2022': [1],
      'national-treasure-2004': [0, 1, 2, 7],
    };

    expect(parseWatched(serializeWatched(state))).toEqual(state);
  });
});
