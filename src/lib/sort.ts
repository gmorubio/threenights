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

const collators = new Map<Lang, Intl.Collator>();

/** One collator per language: building one per comparison is expensive. */
function collatorFor(lang: Lang): Intl.Collator {
  let collator = collators.get(lang);
  if (!collator) {
    collator = new Intl.Collator(lang, { sensitivity: 'base', numeric: true });
    collators.set(lang, collator);
  }
  return collator;
}

export function compareTitles(a: string, b: string, lang: Lang): number {
  return collatorFor(lang).compare(sortKey(a, lang), sortKey(b, lang));
}
