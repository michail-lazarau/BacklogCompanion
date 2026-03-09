import { getPlayerSummaries, getOwnedGamesWithKey, getRecentlyPlayedGamesWithKey } from './steam';
import type { SteamError } from '../../shared/types/errors.types';

const VALID_API_KEY = 'ABCDEF1234567890ABCDEF1234567890';
const STEAM_ID = '76561198002516729';

const mockFetch = jest.fn();
beforeAll(() => { globalThis.fetch = mockFetch; });
afterAll(() => { (globalThis as { fetch?: unknown }).fetch = undefined; });

const makeFetchResponse = (status: number, body: unknown) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  });

describe('getPlayerSummaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs correct URL with encoded key and steamId', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(200, { response: { players: [{ steamid: STEAM_ID, personaname: 'Test', avatarfull: '' }] } }));

    await getPlayerSummaries(VALID_API_KEY, STEAM_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `key=${encodeURIComponent(VALID_API_KEY)}&steamids=${encodeURIComponent(STEAM_ID)}`,
      ),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('ISteamUser/GetPlayerSummaries/v0002/'),
    );
  });

  it('returns parsed JSON on successful response', async () => {
    const payload = { response: { players: [{ steamid: STEAM_ID, personaname: 'Test', avatarfull: '' }] } };
    mockFetch.mockResolvedValue(makeFetchResponse(200, payload));

    const result = await getPlayerSummaries(VALID_API_KEY, STEAM_ID);

    expect(result).toEqual(payload);
  });

  it('throws SteamError with code UNAUTHORIZED on 401', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(401, {}));

    await expect(getPlayerSummaries(VALID_API_KEY, STEAM_ID)).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    } satisfies Partial<SteamError>);
  });

  it('throws SteamError with code UNAUTHORIZED on 403', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(403, {}));

    await expect(getPlayerSummaries(VALID_API_KEY, STEAM_ID)).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    } satisfies Partial<SteamError>);
  });

  it('throws generic Error on non-ok non-401/403 status', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(400, {}));

    await expect(getPlayerSummaries(VALID_API_KEY, STEAM_ID)).rejects.toThrow('Steam API error: 400');
  });
});

describe('getOwnedGamesWithKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs correct URL with key, steamid, and include_appinfo params', async () => {
    const payload = { response: { game_count: 1, games: [] } };
    mockFetch.mockResolvedValue(makeFetchResponse(200, payload));

    await getOwnedGamesWithKey(VALID_API_KEY, STEAM_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `key=${encodeURIComponent(VALID_API_KEY)}&steamid=${encodeURIComponent(STEAM_ID)}`,
      ),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('IPlayerService/GetOwnedGames/v0001/'),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('include_appinfo=1'),
    );
  });

  it('returns parsed JSON on successful response', async () => {
    const payload = { response: { game_count: 1, games: [{ appid: 570, name: 'Dota 2', playtime_forever: 100, img_icon_url: '' }] } };
    mockFetch.mockResolvedValue(makeFetchResponse(200, payload));

    const result = await getOwnedGamesWithKey(VALID_API_KEY, STEAM_ID);

    expect(result).toEqual(payload);
  });

  it('throws SteamError UNAUTHORIZED on 401', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(401, {}));

    await expect(getOwnedGamesWithKey(VALID_API_KEY, STEAM_ID)).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    } satisfies Partial<SteamError>);
  });

  it('throws SteamError UNAUTHORIZED on 403', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(403, {}));

    await expect(getOwnedGamesWithKey(VALID_API_KEY, STEAM_ID)).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    } satisfies Partial<SteamError>);
  });

  it('throws generic Error on non-ok non-401/403 status', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(500, {}));

    await expect(getOwnedGamesWithKey(VALID_API_KEY, STEAM_ID)).rejects.toThrow('Steam API error: 500');
  });
});

describe('getRecentlyPlayedGamesWithKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs correct URL with key, steamid, and default count=10', async () => {
    const payload = { response: { total_count: 0, games: [] } };
    mockFetch.mockResolvedValue(makeFetchResponse(200, payload));

    await getRecentlyPlayedGamesWithKey(VALID_API_KEY, STEAM_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(
        `key=${encodeURIComponent(VALID_API_KEY)}&steamid=${encodeURIComponent(STEAM_ID)}`,
      ),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('IPlayerService/GetRecentlyPlayedGames/v0001/'),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('count=10'),
    );
  });

  it('uses custom count when provided', async () => {
    const payload = { response: { total_count: 0, games: [] } };
    mockFetch.mockResolvedValue(makeFetchResponse(200, payload));

    await getRecentlyPlayedGamesWithKey(VALID_API_KEY, STEAM_ID, 5);

    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('count=5'));
  });

  it('returns parsed JSON on successful response', async () => {
    const payload = { response: { total_count: 1, games: [{ appid: 570, name: 'Dota 2', playtime_forever: 100, img_icon_url: '' }] } };
    mockFetch.mockResolvedValue(makeFetchResponse(200, payload));

    const result = await getRecentlyPlayedGamesWithKey(VALID_API_KEY, STEAM_ID);

    expect(result).toEqual(payload);
  });

  it('throws SteamError UNAUTHORIZED on 401', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(401, {}));

    await expect(getRecentlyPlayedGamesWithKey(VALID_API_KEY, STEAM_ID)).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    } satisfies Partial<SteamError>);
  });

  it('throws SteamError UNAUTHORIZED on 403', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(403, {}));

    await expect(getRecentlyPlayedGamesWithKey(VALID_API_KEY, STEAM_ID)).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    } satisfies Partial<SteamError>);
  });

  it('throws generic Error on non-ok non-401/403 status', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(429, {}));

    await expect(getRecentlyPlayedGamesWithKey(VALID_API_KEY, STEAM_ID)).rejects.toThrow('Steam API error: 429');
  });
});
