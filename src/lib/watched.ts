export const WATCHED_KEY = 'threenights.watched';

/** slug -> índices de parte vistos (base 0): enteros seguros no negativos, sin duplicados, ascendentes, nunca vacío. */
export type WatchedState = Readonly<Record<string, readonly number[]>>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPartIndex(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function normalizeIndices(value: unknown[]): number[] {
  return [...new Set(value.filter(isPartIndex))].sort((a, b) => a - b);
}

/** Own entry only, so slugs such as "toString" never reach Object.prototype. */
function indicesFor(state: WatchedState, slug: string): readonly number[] {
  return (Object.hasOwn(state, slug) ? state[slug] : undefined) ?? [];
}

/**
 * Reads the stored progress without ever throwing: anything that does not
 * match the expected shape is dropped. The result is built with
 * Object.fromEntries so a "__proto__" key cannot touch any prototype.
 */
export function parseWatched(raw: string | null): WatchedState {
  if (raw === null) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isObject(parsed)) return {};

  const entries = Object.entries(parsed).flatMap(([slug, value]) => {
    if (!Array.isArray(value)) return [];
    const indices = normalizeIndices(value);
    return indices.length > 0 ? [[slug, indices] as const] : [];
  });
  return Object.fromEntries(entries);
}

/** Indices are already ascending thanks to the WatchedState invariant. */
export function serializeWatched(state: WatchedState): string {
  return JSON.stringify(state);
}

/** Whether `index` is marked for `slug`, out-of-range indices included. */
export function isWatched(state: WatchedState, slug: string, index: number): boolean {
  return indicesFor(state, slug).includes(index);
}

/**
 * Returns a new state with `index` marked (`watched` true) or unmarked for
 * `slug`, keeping the invariant: ascending, no duplicates, never empty (an
 * emptied slug is removed). Setting a value that is already there changes
 * nothing. Out-of-range indices are kept. The input state is never mutated.
 */
export function markWatched(
  state: WatchedState,
  slug: string,
  index: number,
  watched: boolean,
): WatchedState {
  const current = indicesFor(state, slug).filter((i) => i !== index);
  const indices = watched ? [...current, index].sort((a, b) => a - b) : current;

  const others = Object.entries(state).filter(([key]) => key !== slug);
  return Object.fromEntries(indices.length > 0 ? [...others, [slug, indices]] : others);
}

/** Returns a new state with `index` flipped for `slug`; see markWatched. */
export function toggleWatched(state: WatchedState, slug: string, index: number): WatchedState {
  return markWatched(state, slug, index, !isWatched(state, slug, index));
}

/** Watched indices inside 0..partCount-1; ascending thanks to the WatchedState invariant. */
export function watchedParts(state: WatchedState, slug: string, partCount: number): readonly number[] {
  return indicesFor(state, slug).filter((index) => index < partCount);
}

/**
 * The first unwatched part, or null when nothing in range is watched yet
 * or every part already is.
 */
export function nextPart(state: WatchedState, slug: string, partCount: number): number | null {
  const watched = watchedParts(state, slug, partCount);
  if (watched.length === 0 || watched.length === partCount) return null;
  const seen = new Set(watched);
  for (let index = 0; index < partCount; index++) {
    if (!seen.has(index)) return index;
  }
  return null;
}
