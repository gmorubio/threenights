import type { Lang } from './types.ts';

const ARTICLES: Record<Lang, readonly string[]> = {
  es: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'],
  en: ['the', 'a', 'an'],
};

/** "The Fabelmans" -> "Fabelmans", so titles sort like a video shelf. */
export function sortKey(title: string, lang: Lang): string {
  const trimmed = title.trim();
  const [first, ...rest] = trimmed.split(/\s+/);
  if (first && rest.length > 0 && ARTICLES[lang].includes(first.toLowerCase())) {
    return rest.join(' ');
  }
  return trimmed;
}

export function compareTitles(a: string, b: string, lang: Lang): number {
  return new Intl.Collator(lang, { sensitivity: 'base', numeric: true }).compare(
    sortKey(a, lang),
    sortKey(b, lang),
  );
}
