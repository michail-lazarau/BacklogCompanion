import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHltbData } from './useHltbData';
import { HLTB_CACHE_TTL_MS } from '@shared/constants';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockSelect = jest.fn();
const mockFrom = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockUpdate = jest.fn();
const mockSet = jest.fn();
const mockUpdateWhere = jest.fn();

jest.mock('@db/index', () => ({
  db: {
    select: (...args: unknown[]) => { mockSelect(...args); return { from: mockFrom }; },
    update: (...args: unknown[]) => { mockUpdate(...args); return { set: mockSet }; },
  },
}));

jest.mock('@db/schema', () => ({
  steamGames: {
    appId: 'appId',
    hltbMain: 'hltbMain',
    hltbExtra: 'hltbExtra',
    hltbComplete: 'hltbComplete',
    hltbCachedAt: 'hltbCachedAt',
  },
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
}));

const mockSearchHltb = jest.fn();
jest.mock('@shared/utils/hltbClient', () => ({
  searchHltb: (...args: unknown[]) => mockSearchHltb(...args),
}));

jest.mock('@shared/queryKeys', () => ({
  queryKeys: {
    games: {
      hltb: (appId: number) => ['games', 'detail', appId, 'hltb'],
    },
  },
}));

// ─── Test helpers ────────────────────────────────────────────────────────────

let currentQueryClient: QueryClient;

const createWrapper = () => {
  currentQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: currentQueryClient }, children);
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

afterEach(() => currentQueryClient?.clear());

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useHltbData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default chain: select().from().where().limit()
    mockSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
  });

  const setupSelectChain = (result: unknown[]) => {
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue(result);
  };

  it('returns cached data from SQLite when cache is fresh (no searchHltb call)', async () => {
    const freshDate = new Date(Date.now() - 1000); // 1 second old
    setupSelectChain([
      { hltbMain: 18000, hltbExtra: 36000, hltbComplete: 72000, hltbCachedAt: freshDate },
    ]);

    const { result } = renderHook(
      () => useHltbData(570, 'Dota 2'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.hltbData).toEqual({ main: 18000, extra: 36000, complete: 72000 });
    expect(mockSearchHltb).not.toHaveBeenCalled();
  });

  it('fetches from HLTB API when cache is stale (older than 7 days)', async () => {
    const staleDate = new Date(Date.now() - HLTB_CACHE_TTL_MS - 1000);
    setupSelectChain([
      { hltbMain: 0, hltbExtra: 0, hltbComplete: 0, hltbCachedAt: staleDate },
    ]);
    mockSearchHltb.mockResolvedValue({
      id: 1, name: 'Dota 2', mainStory: 20000, mainExtra: 40000, completionist: 80000,
    });

    const { result } = renderHook(
      () => useHltbData(570, 'Dota 2'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockSearchHltb).toHaveBeenCalledWith('Dota 2');
    expect(result.current.hltbData).toEqual({ main: 20000, extra: 40000, complete: 80000 });
  });

  it('fetches from HLTB API when no cache exists (hltbCachedAt is null)', async () => {
    setupSelectChain([
      { hltbMain: null, hltbExtra: null, hltbComplete: null, hltbCachedAt: null },
    ]);
    mockSearchHltb.mockResolvedValue({
      id: 2, name: 'Portal', mainStory: 9000, mainExtra: 14000, completionist: 18000,
    });

    const { result } = renderHook(
      () => useHltbData(400, 'Portal'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockSearchHltb).toHaveBeenCalledWith('Portal');
    expect(result.current.hltbData).toEqual({ main: 9000, extra: 14000, complete: 18000 });
  });

  it('fetches from HLTB API when row is missing entirely', async () => {
    setupSelectChain([]);
    mockSearchHltb.mockResolvedValue({
      id: 3, name: 'Skyrim', mainStory: 75600, mainExtra: 144000, completionist: 360000,
    });

    const { result } = renderHook(
      () => useHltbData(72850, 'Skyrim'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockSearchHltb).toHaveBeenCalledWith('Skyrim');
    expect(result.current.hltbData).toEqual({ main: 75600, extra: 144000, complete: 360000 });
  });

  it('writes fetched data back to steam_games via Drizzle UPDATE', async () => {
    setupSelectChain([]);
    mockSearchHltb.mockResolvedValue({
      id: 4, name: 'Hades', mainStory: 21600, mainExtra: 43200, completionist: 108000,
    });

    const { result } = renderHook(
      () => useHltbData(1145360, 'Hades'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      hltbMain: 21600,
      hltbExtra: 43200,
      hltbComplete: 108000,
    }));
  });

  it('returns { main: 0, extra: 0, complete: 0 } when searchHltb returns null', async () => {
    setupSelectChain([]);
    mockSearchHltb.mockResolvedValue(null);

    const { result } = renderHook(
      () => useHltbData(99999, 'Unknown Game'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.hltbData).toEqual({ main: 0, extra: 0, complete: 0 });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('isPending is true while fetching', () => {
    // Never resolves
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(
      () => useHltbData(570, 'Dota 2'),
      { wrapper: createWrapper() },
    );

    expect(result.current.isPending).toBe(true);
  });

  it('isError is true when searchHltb throws', async () => {
    setupSelectChain([]);
    mockSearchHltb.mockRejectedValue(new Error('HLTB API down'));

    const { result } = renderHook(
      () => useHltbData(570, 'Dota 2'),
      { wrapper: createWrapper() },
    );

    // retry: 1 on the hook means two attempts before isError settles — allow extra time
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.hltbData).toBeUndefined();
  });

  it('uses correct query key queryKeys.games.hltb(appId)', async () => {
    setupSelectChain([
      { hltbMain: 3600, hltbExtra: 7200, hltbComplete: 14400, hltbCachedAt: new Date() },
    ]);

    renderHook(() => useHltbData(570, 'Dota 2'), { wrapper: createWrapper() });

    // The query was registered with the correct key
    await waitFor(() =>
      expect(currentQueryClient.getQueryData(['games', 'detail', 570, 'hltb'])).toBeDefined(),
    );
  });

  it('is disabled when gameName is undefined', () => {
    const { result } = renderHook(
      () => useHltbData(570, undefined),
      { wrapper: createWrapper() },
    );

    // Query disabled → isPending true, no DB calls
    expect(result.current.isPending).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockSearchHltb).not.toHaveBeenCalled();
  });
});
