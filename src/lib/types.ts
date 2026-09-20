export type Lang = 'es' | 'en';

export const LANGS: readonly Lang[] = ['es', 'en'];

/** A piece of text written by hand in both languages. */
export type Localized = Record<Lang, string>;

export const END = 'END';

export interface Episode {
  title: Localized;
  /** End of the episode as "HH:MM:SS", or "END" for the last one. */
  timestamp: string;
  /** Optional hint describing the last shot or line before the cut. */
  cue?: Localized;
}

export interface MovieFile {
  tmdbId: string | number;
  /** Optional edition name, e.g. "Extended". */
  edition?: string;
  /** Optional total duration of the copy used to mark the cuts, "HH:MM:SS". */
  runtime?: string;
  episodes: Episode[];
}

/** A movie file once loaded: `slug` is the file name without extension. */
export interface LoadedMovie {
  slug: string;
  /** Present only when the file passed validation. */
  data?: MovieFile;
  errors: string[];
}
