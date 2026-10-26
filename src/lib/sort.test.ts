import { afterEach, describe, expect, it, vi } from 'vitest';
import { compareTitles, sortKey } from './sort.ts';

describe('sortKey', () => {
  it('drops the leading article of the active language only', () => {
    expect(sortKey('The Fabelmans', 'en')).toBe('Fabelmans');
    expect(sortKey('La búsqueda', 'es')).toBe('búsqueda');
    expect(sortKey('Los Fabelman', 'es')).toBe('Fabelman');
    expect(sortKey('La La Land', 'en')).toBe('La La Land');
  });

  it('keeps titles that consist of just an article', () => {
    expect(sortKey('The', 'en')).toBe('The');
  });
});

describe('compareTitles', () => {
  it('orders the starting catalogue per language', () => {
    const es = ['La búsqueda', 'Hércules', 'Los Fabelman'].sort((a, b) => compareTitles(a, b, 'es'));
    expect(es).toEqual(['La búsqueda', 'Los Fabelman', 'Hércules']);

    const en = ['National Treasure', 'Hercules', 'The Fabelmans'].sort((a, b) =>
      compareTitles(a, b, 'en'),
    );
    expect(en).toEqual(['The Fabelmans', 'Hercules', 'National Treasure']);
  });
});

describe('compareTitles collator reuse', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds at most one Intl.Collator per language when sorting many titles', async () => {
    vi.resetModules();
    const collatorSpy = vi.spyOn(Intl, 'Collator');
    const { compareTitles: freshCompare } = await import('./sort.ts');

    const es = [
      'La búsqueda',
      'Hércules',
      'Los Fabelman',
      'Zodiac',
      'El padrino',
      'Amélie',
      'Una historia verdadera',
      'Origen',
      'Babe 2',
      'Babe 10',
    ];
    const en = [
      'National Treasure',
      'Hercules',
      'The Fabelmans',
      'Zodiac',
      'The Godfather',
      'Amelie',
      'A Straight Story',
      'Inception',
      'Babe 2',
      'Babe 10',
    ];

    const sortedEs = [...es].sort((a, b) => freshCompare(a, b, 'es'));
    const sortedEn = [...en].sort((a, b) => freshCompare(a, b, 'en'));

    const constructionsFor = (lang: string) =>
      collatorSpy.mock.calls.filter((args) => args[0] === lang).length;
    expect(constructionsFor('es')).toBeLessThanOrEqual(1);
    expect(constructionsFor('en')).toBeLessThanOrEqual(1);

    // Sorting again reuses the cached collators.
    [...es].sort((a, b) => freshCompare(a, b, 'es'));
    [...en].sort((a, b) => freshCompare(a, b, 'en'));
    expect(constructionsFor('es')).toBeLessThanOrEqual(1);
    expect(constructionsFor('en')).toBeLessThanOrEqual(1);

    // Ordering is unchanged: articles ignored, accents base-insensitive, numeric runs.
    expect(sortedEs).toEqual([
      'Amélie',
      'Babe 2',
      'Babe 10',
      'La búsqueda',
      'Los Fabelman',
      'Hércules',
      'Una historia verdadera',
      'Origen',
      'El padrino',
      'Zodiac',
    ]);
    expect(sortedEn).toEqual([
      'Amelie',
      'Babe 2',
      'Babe 10',
      'The Fabelmans',
      'The Godfather',
      'Hercules',
      'Inception',
      'National Treasure',
      'A Straight Story',
      'Zodiac',
    ]);
  });
});
