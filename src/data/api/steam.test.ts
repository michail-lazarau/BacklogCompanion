import { getPlayerSummaries, getOwnedGamesWithKey, getRecentlyPlayedGamesWithKey, getGameSchema, getPlayerAchievements } from './steam';
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

describe('getGameSchema', () => {
  const APP_ID = 570;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns typed response on success', async () => {
    const payload = {
      game: {
        gameName: 'Dota 2',
        gameVersion: '1',
        availableGameStats: {
          stats: [],
          achievements: [
            { name: 'ACH_1', defaultvalue: 0, displayName: 'First Blood', icon: 'https://icon.url/1.jpg', icongray: 'https://icon.url/1g.jpg' },
          ],
        },
      },
    };
    mockFetch.mockResolvedValue(makeFetchResponse(200, payload));

    const result = await getGameSchema(VALID_API_KEY, APP_ID);

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('ISteamUserStats/GetSchemaForGame/v0002/'));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`appid=${APP_ID}`));
  });

  it('returns empty achievements when availableGameStats is absent', async () => {
    const payload = { game: { gameName: 'No Achievements Game', gameVersion: '1' } };
    mockFetch.mockResolvedValue(makeFetchResponse(200, payload));

    const result = await getGameSchema(VALID_API_KEY, APP_ID);

    expect(result.game.availableGameStats.achievements).toEqual([]);
    expect(result.game.availableGameStats.stats).toEqual([]);
  });

  it('throws SteamError UNAUTHORIZED on 401', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(401, {}));

    await expect(getGameSchema(VALID_API_KEY, APP_ID)).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    } satisfies Partial<SteamError>);
  });

  it('throws SteamError UNAUTHORIZED on 403', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(403, {}));

    await expect(getGameSchema(VALID_API_KEY, APP_ID)).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    } satisfies Partial<SteamError>);
  });

  it('throws generic Error on non-ok non-401/403 status', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(500, {}));

    await expect(getGameSchema(VALID_API_KEY, APP_ID)).rejects.toThrow('Steam API error: 500');
  });
});

describe('getPlayerAchievements', () => {
  const APP_ID = 570;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns typed response on success', async () => {
    const payload = {
      playerstats: {
        steamID: STEAM_ID,
        gameName: 'Dota 2',
        achievements: [{ apiname: 'ACH_1', achieved: 1, unlocktime: 1700000000 }],
        success: true,
      },
    };
    mockFetch.mockResolvedValue(makeFetchResponse(200, payload));

    const result = await getPlayerAchievements(VALID_API_KEY, STEAM_ID, APP_ID);

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('ISteamUserStats/GetPlayerAchievements/v0001/'));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(`appid=${APP_ID}`));
  });

  it('throws SteamError NOT_FOUND on 400', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(400, { playerstats: { success: false, error: 'Requested app has no stats' } }));

    await expect(getPlayerAchievements(VALID_API_KEY, STEAM_ID, APP_ID)).rejects.toMatchObject({
      type: 'SteamError',
      code: 'NOT_FOUND',
      message: 'No achievement data',
    } satisfies Partial<SteamError>);
  });

  it('throws SteamError UNAUTHORIZED on 401', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(401, {}));

    await expect(getPlayerAchievements(VALID_API_KEY, STEAM_ID, APP_ID)).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    } satisfies Partial<SteamError>);
  });

  it('throws SteamError UNAUTHORIZED on 403', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(403, {}));

    await expect(getPlayerAchievements(VALID_API_KEY, STEAM_ID, APP_ID)).rejects.toMatchObject({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
    } satisfies Partial<SteamError>);
  });

  it('throws generic Error on non-ok non-400/401/403 status', async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(500, {}));

    await expect(getPlayerAchievements(VALID_API_KEY, STEAM_ID, APP_ID)).rejects.toThrow('Steam API error: 500');
  });
});
