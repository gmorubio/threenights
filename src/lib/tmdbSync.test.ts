import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDetails, runPool } from './tmdbSync.ts';
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

/** A fetch that answers each call with the next status in the list (the last one repeats). */
function answeringInTurn(answers: Array<{ status: number; headers?: Record<string, string> }>) {
  let call = 0;
  return vi.fn<FakeFetch>(async () => {
    const { status, headers = {} } = answers[Math.min(call, answers.length - 1)]!;
    call += 1;
    return new Response(JSON.stringify(status === 200 ? raw : {}), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  });
}

function recordingSleep() {
  return vi.fn<(ms: number) => Promise<void>>(async () => {});
}

describe('runPool', () => {
  it('never runs more than 6 tasks at once over 20 tasks and keeps the result order', async () => {
    let inFlight = 0;
    let peak = 0;
    const tasks = Array.from({ length: 20 }, (_, index) => async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5 + (index % 3)));
      inFlight -= 1;
      return index;
    });

    const results = await runPool(tasks);

    expect(peak).toBe(6);
    expect(results).toEqual(Array.from({ length: 20 }, (_, index) => index));
  });

  it('rejects when a task fails', async () => {
    const tasks = [async () => 1, async () => Promise.reject(new Error('boom')), async () => 3];
    await expect(runPool(tasks)).rejects.toThrow('boom');
  });
});

describe('fetchDetails retries', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits the Retry-After seconds after a 429 and then succeeds', async () => {
    const fetch = answeringInTurn([{ status: 429, headers: { 'Retry-After': '2' } }, { status: 200 }]);
    const sleep = recordingSleep();

    await expect(fetchDetails('603', 'es', 'token', { fetch, sleep })).resolves.toEqual(mapped);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([2_000]);
  });

  it('honours a Retry-After HTTP date', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-26T12:00:00Z') });
    const fetch = answeringInTurn([
      { status: 429, headers: { 'Retry-After': 'Mon, 26 Oct 2026 12:00:05 GMT' } },
      { status: 200 },
    ]);
    const sleep = recordingSleep();

    await expect(fetchDetails('603', 'es', 'token', { fetch, sleep })).resolves.toEqual(mapped);

    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([5_000]);
  });

  it('caps a long Retry-After at 30 s', async () => {
    const fetch = answeringInTurn([{ status: 429, headers: { 'Retry-After': '120' } }, { status: 200 }]);
    const sleep = recordingSleep();

    await expect(fetchDetails('603', 'es', 'token', { fetch, sleep })).resolves.toEqual(mapped);

    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([30_000]);
  });

  it('succeeds after three 503 answers, backing off 1 s, 2 s and 4 s', async () => {
    const fetch = answeringInTurn([{ status: 503 }, { status: 503 }, { status: 503 }, { status: 200 }]);
    const sleep = recordingSleep();

    await expect(fetchDetails('603', 'es', 'token', { fetch, sleep })).resolves.toEqual(mapped);

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1_000, 2_000, 4_000]);
  });

  it('fails after four 503 answers without a fifth attempt', async () => {
    const fetch = answeringInTurn([{ status: 503 }]);
    const sleep = recordingSleep();

    await expect(fetchDetails('603', 'es', 'token', { fetch, sleep })).rejects.toThrow(/status 503/);

    expect(fetch).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(3);
  });

  it('reports the status when a 500 keeps coming back after the retries', async () => {
    const fetch = answeringInTurn([{ status: 500 }]);
    const sleep = recordingSleep();

    await expect(fetchDetails('603', 'es', 'token', { fetch, sleep })).rejects.toThrow(
      /TMDB answered with status 500 for movie 603/,
    );
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('does not retry other errors such as 400', async () => {
    const fetch = answeringInTurn([{ status: 400 }, { status: 200 }]);
    const sleep = recordingSleep();

    await expect(fetchDetails('603', 'es', 'token', { fetch, sleep })).rejects.toThrow(/status 400/);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
