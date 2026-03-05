import { getPlayerSummaries } from './steam';
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
    mockFetch.mockResolvedValue(makeFetchResponse(200, { response: { players: [] } }));

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
