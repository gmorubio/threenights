import { describe, expect, it } from 'vitest';
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
