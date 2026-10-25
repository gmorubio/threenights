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

/**
 * Returns a new state with `index` flipped for `slug`, keeping the invariant:
 * ascending, no duplicates, never empty (an emptied slug is removed).
 * Out-of-range indices are kept. The input state is never mutated.
 */
export function toggleWatched(state: WatchedState, slug: string, index: number): WatchedState {
  const current = (Object.hasOwn(state, slug) ? state[slug] : undefined) ?? [];
  const indices = current.includes(index)
    ? current.filter((i) => i !== index)
    : [...current, index].sort((a, b) => a - b);

  const others = Object.entries(state).filter(([key]) => key !== slug);
  return Object.fromEntries(indices.length > 0 ? [...others, [slug, indices]] : others);
}
