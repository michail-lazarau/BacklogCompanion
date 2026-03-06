import * as Sentry from '@sentry/react-native';
import { steamFetch, storeFetch, geminiFetch } from './httpClient';

const mockFetch = jest.fn();
beforeAll(() => { globalThis.fetch = mockFetch; });
afterAll(() => { (globalThis as { fetch?: unknown }).fetch = undefined; });
afterEach(() => { jest.clearAllMocks(); });

const mockResponse = (status: number, body: unknown) => ({
  status,
  ok: status >= 200 && status < 300,
  json: () => Promise.resolve(body),
});

// Subtask 3.2: 200 → returns parsed JSON; Sentry NOT called
describe('successful response', () => {
  it('returns parsed JSON on 200', async () => {
    const payload = { games: [{ appid: 1, name: 'Test' }] };
    mockFetch.mockResolvedValue(mockResponse(200, payload));

    const result = await steamFetch('some/endpoint', new URLSearchParams());

    expect(result).toEqual(payload);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

// Subtask 3.3: 401 → SteamError UNAUTHORIZED
describe('401 response', () => {
  it('throws SteamError UNAUTHORIZED on 401', async () => {
    mockFetch.mockResolvedValue(mockResponse(401, {}));

    await expect(steamFetch('some/endpoint', new URLSearchParams())).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

// Subtask 3.4: 403 → SteamError UNAUTHORIZED
describe('403 response', () => {
  it('throws SteamError UNAUTHORIZED on 403', async () => {
    mockFetch.mockResolvedValue(mockResponse(403, {}));

    await expect(steamFetch('some/endpoint', new URLSearchParams())).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

// Subtask 3.5: 429 → SteamError RATE_LIMITED
describe('429 response', () => {
  it('throws SteamError RATE_LIMITED on 429', async () => {
    mockFetch.mockResolvedValue(mockResponse(429, {}));

    await expect(steamFetch('some/endpoint', new URLSearchParams())).rejects.toMatchObject({
      type: 'SteamError',
      code: 'RATE_LIMITED',
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

// Subtask 3.6: 500 → NetworkError UNKNOWN; Sentry called once with context
describe('500 response', () => {
  it('throws NetworkError UNKNOWN on 500 and calls Sentry with context', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, {}));

    await expect(steamFetch('some/endpoint', new URLSearchParams())).rejects.toMatchObject({
      type: 'NetworkError',
      code: 'UNKNOWN',
    });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NetworkError', code: 'UNKNOWN' }),
      { data: expect.objectContaining({ url: expect.any(String), method: 'GET', status: 500 }) },
    );
  });
});

// Subtask 3.7: network error → NetworkError UNKNOWN; Sentry called once with context
describe('network failure', () => {
  it('throws NetworkError UNKNOWN when fetch rejects and calls Sentry with context', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));

    await expect(steamFetch('some/endpoint', new URLSearchParams())).rejects.toMatchObject({
      type: 'NetworkError',
      code: 'UNKNOWN',
    });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'NetworkError', code: 'UNKNOWN', message: 'Network failure' }),
      { data: expect.objectContaining({ url: expect.any(String), method: 'GET' }) },
    );
  });
});

// Subtask 3.8: timeout → NetworkError TIMEOUT
describe('timeout', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('throws NetworkError TIMEOUT when request hangs past 10s', async () => {
    mockFetch.mockImplementation((_url: string, options: RequestInit) =>
      new Promise((_, reject) => {
        options.signal?.addEventListener('abort', () => reject({ name: 'AbortError' }), { once: true });
      }),
    );

    const promise = steamFetch('some/endpoint', new URLSearchParams());
    jest.advanceTimersByTime(10_001);
    await Promise.resolve();

    await expect(promise).rejects.toMatchObject({
      type: 'NetworkError',
      code: 'TIMEOUT',
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

// M2: body is NOT sent when method is GET (body && method !== 'GET' guard)
describe('body guard on GET', () => {
  it('does not include body in fetch options when geminiFetch is called with GET + body', async () => {
    const payload = { result: true };
    mockFetch.mockResolvedValue(mockResponse(200, payload));

    await geminiFetch('some/endpoint', new URLSearchParams(), 'GET', { key: 'value' });

    const fetchOptions = mockFetch.mock.calls[0][1] as RequestInit;
    expect(fetchOptions.body).toBeUndefined();
  });
});

// M3: response.json() parse failure → NetworkError UNKNOWN + Sentry called
describe('json parse failure', () => {
  it('throws NetworkError UNKNOWN when response.json() rejects and calls Sentry', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    });

    await expect(steamFetch('some/endpoint', new URLSearchParams())).rejects.toMatchObject({
      type: 'NetworkError',
      code: 'UNKNOWN',
    });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});

// Subtask 3.9: verify wrappers route through apiFetch
describe('wrapper routing', () => {
  it('storeFetch routes through apiFetch — throws SteamError UNAUTHORIZED on 401', async () => {
    mockFetch.mockResolvedValue(mockResponse(401, {}));

    await expect(storeFetch('some/endpoint', new URLSearchParams())).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    });
  });

  it('storeFetch routes through apiFetch — throws NetworkError UNKNOWN on 500 and calls Sentry', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, {}));

    await expect(storeFetch('some/endpoint', new URLSearchParams())).rejects.toMatchObject({
      type: 'NetworkError',
      code: 'UNKNOWN',
    });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('geminiFetch routes through apiFetch — throws NetworkError UNKNOWN on 500', async () => {
    mockFetch.mockResolvedValue(mockResponse(500, {}));

    await expect(
      geminiFetch('some/endpoint', new URLSearchParams(), 'GET'),
    ).rejects.toMatchObject({
      type: 'NetworkError',
      code: 'UNKNOWN',
    });
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('geminiFetch routes through apiFetch — returns JSON on 200', async () => {
    const payload = { candidates: [] };
    mockFetch.mockResolvedValue(mockResponse(200, payload));

    const result = await geminiFetch('some/endpoint', new URLSearchParams(), 'POST', { contents: [] });

    expect(result).toEqual(payload);
  });
});
