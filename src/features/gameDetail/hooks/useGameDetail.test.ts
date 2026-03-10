import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useGameDetail } from './useGameDetail';
import { queryKeys } from '@shared/queryKeys';

// Mock the db module — use jest.fn() inline so it's safe to hoist
jest.mock('@db/index', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@db/schema', () => ({
  steamGames: {
    appId: 'app_id',
    name: 'name',
    playtimeForever: 'playtime_forever',
    playtime2weeks: 'playtime_2weeks',
    rtimeLastPlayed: 'rtime_last_played',
    imgIconUrl: 'img_icon_url',
    headerImage: 'header_image',
    hltbMain: 'hltb_main',
    hltbExtra: 'hltb_extra',
    hltbComplete: 'hltb_complete',
    lastSyncedAt: 'last_synced_at',
    hltbCachedAt: 'hltb_cached_at',
  },
}));

// Helper to get typed reference to the mocked limit fn after hoisting
const getMockDb = () =>
  jest.requireMock('@db/index') as {
    db: {
      select: jest.Mock;
      from: jest.Mock;
      where: jest.Mock;
      limit: jest.Mock;
    };
  };

let currentQueryClient: QueryClient;

afterEach(() => currentQueryClient?.clear());

const createWrapper = () => {
  currentQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: currentQueryClient }, children);
  return Wrapper;
};

const makeGame = (appId: number) => ({
  appId,
  name: `Game ${appId}`,
  playtimeForever: 120,
  playtime2weeks: null,
  rtimeLastPlayed: 1700000000,
  imgIconUrl: 'abc123',
  headerImage: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
  hltbMain: null,
  hltbExtra: null,
  hltbComplete: null,
  hltbCachedAt: null,
  lastSyncedAt: new Date(),
});

describe('useGameDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set up chaining after clearAllMocks resets return values
    const { db } = getMockDb();
    db.select.mockReturnThis();
    db.from.mockReturnThis();
    db.where.mockReturnThis();
    db.limit.mockResolvedValue([]);
  });

  it('returns null when appId not found in db', async () => {
    getMockDb().db.limit.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useGameDetail(999), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.game).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('returns game object when found', async () => {
    const game = makeGame(570);
    getMockDb().db.limit.mockResolvedValueOnce([game]);
    const { result } = renderHook(() => useGameDetail(570), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.game).toEqual(game);
    expect(result.current.isError).toBe(false);
  });

  it('isPending is true while query is loading', async () => {
    let resolveFn!: (value: unknown[]) => void;
    const pending = new Promise<unknown[]>((resolve) => { resolveFn = resolve; });
    getMockDb().db.limit.mockReturnValueOnce(pending);
    const { result, unmount } = renderHook(() => useGameDetail(570), { wrapper: createWrapper() });

    expect(result.current.isPending).toBe(true);

    // Resolve and unmount so the async operation doesn't leak into subsequent tests
    resolveFn([]);
    unmount();
  });

  it('uses correct query key queryKeys.games.detail(appId)', async () => {
    currentQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: currentQueryClient }, children);

    getMockDb().db.limit.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useGameDetail(570), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    const expectedKey = queryKeys.games.detail(570);
    const cachedQuery = currentQueryClient.getQueryState(expectedKey);
    expect(cachedQuery).toBeDefined();
    expect(cachedQuery?.status).toBe('success');
  });
});
