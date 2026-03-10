import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAchievements } from './useAchievements';
import { queryKeys } from '@shared/queryKeys';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('@db/index', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@db/schema', () => ({
  steamGames: {
    appId: 'app_id',
    rtimeLastPlayed: 'rtime_last_played',
  },
  achievementCache: {
    appId: 'app_id',
    cachedAt: 'cached_at',
    unlockedCount: 'unlocked_count',
    totalCount: 'total_count',
    data: 'data',
  },
}));

jest.mock('../../../data/api/steam', () => ({
  getGameSchema: jest.fn(),
  getPlayerAchievements: jest.fn(),
}));

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn().mockResolvedValue({ password: 'test-api-key' }),
}));

jest.mock('@shared/hooks/reduxHooks', () => ({
  useAppSelector: jest.fn().mockReturnValue('test-steam-id'),
  useAppDispatch: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getMockDb = () =>
  jest.requireMock('@db/index') as {
    db: {
      select: jest.Mock;
      from: jest.Mock;
      where: jest.Mock;
      limit: jest.Mock;
      insert: jest.Mock;
      values: jest.Mock;
      onConflictDoUpdate: jest.Mock;
    };
  };

const getMockSteam = () =>
  jest.requireMock('../../../data/api/steam') as {
    getGameSchema: jest.Mock;
    getPlayerAchievements: jest.Mock;
  };

const makeSchemaResponse = (achievements: object[] = []) => ({
  game: {
    gameName: 'Test Game',
    gameVersion: '1',
    availableGameStats: {
      stats: [],
      achievements,
    },
  },
});

const makePlayerAchievementsResponse = (achievements: object[] = []) => ({
  playerstats: {
    steamID: 'test-steam-id',
    gameName: 'Test Game',
    achievements,
    success: true,
  },
});

const SCHEMA_ACH_1 = {
  name: 'ACH_1',
  defaultvalue: 0,
  displayName: 'First Achievement',
  description: 'Do the first thing',
  icon: 'https://icon.url/1.jpg',
  icongray: 'https://icon.url/1g.jpg',
  hidden: 0,
};

const SCHEMA_ACH_2 = {
  name: 'ACH_2',
  defaultvalue: 0,
  displayName: 'Second Achievement',
  icon: 'https://icon.url/2.jpg',
  icongray: 'https://icon.url/2g.jpg',
  hidden: 0,
};

let currentQueryClient: QueryClient;

afterEach(() => currentQueryClient?.clear());

const createWrapper = () => {
  currentQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: currentQueryClient }, children);
  return Wrapper;
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAchievements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { db } = getMockDb();
    db.select.mockReturnThis();
    db.from.mockReturnThis();
    db.where.mockReturnThis();
    db.limit.mockResolvedValue([]);
    db.insert.mockReturnThis();
    db.values.mockReturnThis();
    db.onConflictDoUpdate.mockResolvedValue(undefined);
  });

  it('returns cached data from SQLite when cache is fresh (no API call made)', async () => {
    const cachedAchievements = [
      { apiname: 'ACH_1', displayName: 'First Achievement', icon: 'https://icon.url/1.jpg', icongray: 'https://icon.url/1g.jpg', achieved: true, unlocktime: 1700000000, hidden: false },
    ];
    const { db } = getMockDb();
    // cache row (cachedAt=1000) >= rtime_last_played (500) → fresh
    db.limit
      .mockResolvedValueOnce([{ appId: 570, cachedAt: 1000, unlockedCount: 1, totalCount: 1, data: JSON.stringify(cachedAchievements) }]) // achievement_cache
      .mockResolvedValueOnce([{ rtimeLastPlayed: 500 }]); // steam_games

    const { result } = renderHook(() => useAchievements(570), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.achievements).toEqual(cachedAchievements);
    expect(getMockSteam().getGameSchema).not.toHaveBeenCalled();
    expect(getMockSteam().getPlayerAchievements).not.toHaveBeenCalled();
  });

  it('fetches from API when cache is stale (rtime_last_played > cached_at)', async () => {
    const { db } = getMockDb();
    // cache row (cachedAt=500) < rtime_last_played (1000) → stale
    db.limit
      .mockResolvedValueOnce([{ appId: 570, cachedAt: 500, unlockedCount: 0, totalCount: 1, data: JSON.stringify([]) }])
      .mockResolvedValueOnce([{ rtimeLastPlayed: 1000 }]);

    getMockSteam().getGameSchema.mockResolvedValue(makeSchemaResponse([SCHEMA_ACH_1]));
    getMockSteam().getPlayerAchievements.mockResolvedValue(
      makePlayerAchievementsResponse([{ apiname: 'ACH_1', achieved: 1, unlocktime: 1700000000 }]),
    );

    const { result } = renderHook(() => useAchievements(570), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(getMockSteam().getGameSchema).toHaveBeenCalledWith('test-api-key', 570);
    expect(getMockSteam().getPlayerAchievements).toHaveBeenCalledWith('test-api-key', 'test-steam-id', 570);
    expect(result.current.achievements[0].apiname).toBe('ACH_1');
    expect(result.current.achievements[0].achieved).toBe(true);
  });

  it('fetches from API when no cache exists', async () => {
    const { db } = getMockDb();
    // no cache row, no game row
    db.limit
      .mockResolvedValueOnce([]) // no achievement_cache
      .mockResolvedValueOnce([]); // no steam_games row

    getMockSteam().getGameSchema.mockResolvedValue(makeSchemaResponse([SCHEMA_ACH_1]));
    getMockSteam().getPlayerAchievements.mockResolvedValue(
      makePlayerAchievementsResponse([{ apiname: 'ACH_1', achieved: 0, unlocktime: 0 }]),
    );

    const { result } = renderHook(() => useAchievements(570), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(getMockSteam().getGameSchema).toHaveBeenCalled();
    expect(result.current.achievements).toHaveLength(1);
  });

  it('writes fetched data to SQLite achievement_cache table', async () => {
    const { db } = getMockDb();
    db.limit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    getMockSteam().getGameSchema.mockResolvedValue(makeSchemaResponse([SCHEMA_ACH_1]));
    getMockSteam().getPlayerAchievements.mockResolvedValue(
      makePlayerAchievementsResponse([{ apiname: 'ACH_1', achieved: 1, unlocktime: 1700000000 }]),
    );

    const { result } = renderHook(() => useAchievements(570), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(db.insert).toHaveBeenCalled();
    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({ appId: 570, unlockedCount: 1, totalCount: 1 }),
    );
    expect(db.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('returns merged achievements sorted: unlocked first (by unlocktime desc), then locked', async () => {
    const { db } = getMockDb();
    db.limit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    getMockSteam().getGameSchema.mockResolvedValue(
      makeSchemaResponse([SCHEMA_ACH_1, SCHEMA_ACH_2]),
    );
    getMockSteam().getPlayerAchievements.mockResolvedValue(
      makePlayerAchievementsResponse([
        { apiname: 'ACH_2', achieved: 1, unlocktime: 1700000200 },
        { apiname: 'ACH_1', achieved: 1, unlocktime: 1700000100 },
      ]),
    );

    const { result } = renderHook(() => useAchievements(570), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.achievements[0].apiname).toBe('ACH_2'); // newer unlock first
    expect(result.current.achievements[1].apiname).toBe('ACH_1');
  });

  it('returns empty array when schema has no achievements', async () => {
    const { db } = getMockDb();
    db.limit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    getMockSteam().getGameSchema.mockResolvedValue(makeSchemaResponse([]));
    getMockSteam().getPlayerAchievements.mockResolvedValue(makePlayerAchievementsResponse([]));

    const { result } = renderHook(() => useAchievements(570), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.achievements).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('returns empty array when getPlayerAchievements throws NOT_FOUND', async () => {
    const { db } = getMockDb();
    db.limit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    getMockSteam().getGameSchema.mockResolvedValue(makeSchemaResponse([SCHEMA_ACH_1]));
    getMockSteam().getPlayerAchievements.mockRejectedValue({
      type: 'SteamError',
      code: 'NOT_FOUND',
      message: 'No achievement data',
    });

    const { result } = renderHook(() => useAchievements(570), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    // Schema achievements are shown as all locked (not empty)
    expect(result.current.achievements).toHaveLength(1);
    expect(result.current.achievements[0].achieved).toBe(false);
  });

  it('isPending is true while fetching', async () => {
    const { db } = getMockDb();
    let resolveCache!: (value: unknown[]) => void;
    const pendingCache = new Promise<unknown[]>((resolve) => { resolveCache = resolve; });
    db.limit.mockReturnValueOnce(pendingCache);

    const { result, unmount } = renderHook(() => useAchievements(570), { wrapper: createWrapper() });

    expect(result.current.isPending).toBe(true);

    resolveCache([]);
    unmount();
  });

  it('uses correct query key queryKeys.games.achievements(appId)', async () => {
    currentQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: currentQueryClient }, children);

    const { db } = getMockDb();
    db.limit.mockResolvedValue([]);
    getMockSteam().getGameSchema.mockResolvedValue(makeSchemaResponse([]));
    getMockSteam().getPlayerAchievements.mockResolvedValue(makePlayerAchievementsResponse([]));

    const { result } = renderHook(() => useAchievements(570), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    const expectedKey = queryKeys.games.achievements(570);
    const cachedQuery = currentQueryClient.getQueryState(expectedKey);
    expect(cachedQuery).toBeDefined();
    expect(cachedQuery?.status).toBe('success');
  });

  it('propagates UNAUTHORIZED error from getGameSchema (session expiry)', async () => {
    const { db } = getMockDb();
    // Use persistent mock — retry: 1 means queryFn runs twice, each calling limit twice
    db.limit.mockResolvedValue([]);

    getMockSteam().getGameSchema.mockRejectedValue({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
      message: 'Steam API returned 401',
    });
    getMockSteam().getPlayerAchievements.mockResolvedValue(
      makePlayerAchievementsResponse([]),
    );

    const { result } = renderHook(() => useAchievements(570), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  });

  it('propagates UNAUTHORIZED error from getPlayerAchievements (session expiry)', async () => {
    const { db } = getMockDb();
    // Use persistent mock — retry: 1 means queryFn runs twice, each calling limit twice
    db.limit.mockResolvedValue([]);

    getMockSteam().getGameSchema.mockResolvedValue(makeSchemaResponse([SCHEMA_ACH_1]));
    getMockSteam().getPlayerAchievements.mockRejectedValue({
      type: 'SteamError',
      code: 'UNAUTHORIZED',
      message: 'Steam API returned 401',
    });

    const { result } = renderHook(() => useAchievements(570), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
  });

  it('computes unlockedCount and totalCount correctly', async () => {
    const { db } = getMockDb();
    db.limit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    getMockSteam().getGameSchema.mockResolvedValue(
      makeSchemaResponse([SCHEMA_ACH_1, SCHEMA_ACH_2]),
    );
    getMockSteam().getPlayerAchievements.mockResolvedValue(
      makePlayerAchievementsResponse([
        { apiname: 'ACH_1', achieved: 1, unlocktime: 1700000000 },
        { apiname: 'ACH_2', achieved: 0, unlocktime: 0 },
      ]),
    );

    const { result } = renderHook(() => useAchievements(570), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.totalCount).toBe(2);
    expect(result.current.unlockedCount).toBe(1);
  });
});
