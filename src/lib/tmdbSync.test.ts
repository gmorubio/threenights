import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDetails } from './tmdbSync.ts';
import type { MovieDetails } from './tmdb.ts';

const TIMEOUT_MESSAGE = /TMDB did not answer within 10 s/;
const NO_CONNECTION_MESSAGE = /Could not reach TMDB/;

type FakeFetch = (url: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** A fetch that never answers on its own and only rejects when its signal aborts. */
function hangingFetch() {
  return vi.fn<FakeFetch>(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener('abort', () => {
          reject(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError'));
        });
      }),
  );
}

function answering(status: number, body: unknown = {}) {
  return vi.fn<FakeFetch>(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const raw = {
  title: 'Uno',
  original_title: 'One',
  release_date: '1999-03-31',
  runtime: 136,
  genres: [{ name: 'Acción' }, { name: 'Ciencia ficción' }],
  vote_average: 8.2,
  vote_count: 25000,
  overview: '',
  poster_path: '/poster.jpg',
  backdrop_path: null,
  credits: {
    cast: [
      { name: 'Second', character: 'B', order: 1 },
      { name: 'First', character: 'A', order: 0 },
    ],
    crew: [
      { name: 'Director One', job: 'Director' },
      { name: 'Someone', job: 'Producer' },
    ],
  },
  translations: {
    translations: [{ iso_639_1: 'en', data: { overview: 'English overview' } }],
  },
};

const mapped: MovieDetails = {
  title: 'Uno',
  originalTitle: 'One',
  year: '1999',
  runtimeMinutes: 136,
  genres: ['Acción', 'Ciencia ficción'],
  rating: 8.2,
  overview: 'English overview',
  overviewLang: 'en',
  directors: ['Director One'],
  cast: [
    { name: 'First', character: 'A' },
    { name: 'Second', character: 'B' },
  ],
  posterPath: '/poster.jpg',
  backdropPath: null,
};

describe('fetchDetails', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aborts a request that does not answer and fails with the timeout message after 10 s', async () => {
    const fetch = hangingFetch();
    let settled = false;
    const failure = fetchDetails('603', 'es', 'token', { fetch }).then(
      () => {
        settled = true;
        return undefined;
      },
      (error: unknown) => {
        settled = true;
        return error;
      },
    );

    await vi.advanceTimersByTimeAsync(9_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    const error = await failure;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(TIMEOUT_MESSAGE);
    expect((error as Error).message).not.toMatch(NO_CONNECTION_MESSAGE);
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('fails with the no-connection message when fetch rejects straight away', async () => {
    const fetch = vi.fn<FakeFetch>(async () => {
      throw new TypeError('fetch failed');
    });
    const result = fetchDetails('603', 'es', 'token', { fetch });
    await expect(result).rejects.toThrow(NO_CONNECTION_MESSAGE);
    await expect(result).rejects.not.toThrow(TIMEOUT_MESSAGE);
  });

  it('resolves to null when TMDB answers 404', async () => {
    await expect(fetchDetails('999999', 'en', 'token', { fetch: answering(404) })).resolves.toBeNull();
  });

  it('keeps reporting a rejected token on 401', async () => {
    await expect(fetchDetails('603', 'en', 'token', { fetch: answering(401) })).rejects.toThrow(
      /TMDB rejected the token/,
    );
  });

  it('maps a 200 answer to the movie details and clears the timeout', async () => {
    const fetch = answering(200, raw);
    await expect(fetchDetails('603', 'es', 'secret', { fetch })).resolves.toEqual(mapped);

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(String(url)).toContain('/movie/603');
    expect(String(url)).toContain('language=es-ES');
    expect(String(url)).not.toContain('secret');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer secret');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(vi.getTimerCount()).toBe(0);
  });
});
