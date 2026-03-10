import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import * as Keychain from 'react-native-keychain';
import Toast from 'react-native-toast-message';
import { authReducer } from '@features/auth/store/authSlice';
import { libraryReducer } from '@features/library/store/librarySlice';
import { useSteamSync } from './useSteamSync';
import { getOwnedGamesWithKey, getRecentlyPlayedGamesWithKey } from '../../../data/api/steam';
import { mmkv } from '../../../data/mmkv';
import { SYNC_THROTTLE_MS } from '@shared/constants';

// --- Module mocks ---

jest.mock('../../../data/api/steam', () => ({
  getOwnedGamesWithKey: jest.fn(),
  getRecentlyPlayedGamesWithKey: jest.fn(),
}));

jest.mock('../../../data/mmkv', () => ({
  mmkv: {
    getString: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

// Mock Drizzle db — op-sqlite already mocked in jest.config.js
// Drizzle select: await db.select().from(table) resolves directly (no .all())
jest.mock('../../../db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockResolvedValue([]),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
      }),
    }),
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

jest.mock('@features/auth/hooks/useSessionExpiry', () => ({
  useSessionExpiry: () => ({
    handleSteamAuthError: mockHandleSteamAuthError,
  }),
}));

// Hoisted mock function for handleSteamAuthError
const mockHandleSteamAuthError = jest.fn().mockResolvedValue(undefined);

// --- Typed mock helpers ---

const mockGetOwnedGamesWithKey = getOwnedGamesWithKey as jest.Mock;
const mockGetRecentlyPlayedGamesWithKey = getRecentlyPlayedGamesWithKey as jest.Mock;
const mockMmkvGetString = mmkv.getString as jest.Mock;
const mockMmkvSet = mmkv.set as jest.Mock;

// --- Store factory ---

const createTestStore = (authOverrides: Record<string, unknown> = {}) =>
  configureStore({
    reducer: { auth: authReducer, library: libraryReducer },
    preloadedState: {
      auth: { isAuthenticated: true, steamId: '76561198012345678', ...authOverrides },
      library: { sync_status: 'idle' as const, syncErrorReason: null, activeFilter: null, activeSort: 'alphabetical' as const },
    },
  });

type TestStore = ReturnType<typeof createTestStore>;

const makeWrapper = (store: TestStore) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return React.createElement(Provider, { store, children: React.createElement(QueryClientProvider, { client: queryClient }, children) } as any);
  };
};

// --- Sample data ---

const makeGame = (appid: number, playtime = 100, rtime = 1700000000) => ({
  appid,
  name: `Game ${appid}`,
  playtime_forever: playtime,
  rtime_last_played: rtime,
  img_icon_url: 'abc123',
});

// --- Setup ---

beforeEach(() => {
  jest.clearAllMocks();
  // Default: API key available
  (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
    username: 'steam',
    password: 'test-api-key-123',
    service: 'steam_api_key',
    storage: '',
  });
  // Default: no prior sync (forces full sync)
  mockMmkvGetString.mockReturnValue(undefined);
  // Default: no existing rows in db
  const { db } = jest.requireMock('../../../db') as { db: { select: jest.Mock; insert: jest.Mock } };
  db.select.mockReturnValue({
    from: jest.fn().mockResolvedValue([]),
  });
  db.insert.mockReturnValue({
    values: jest.fn().mockReturnValue({
      onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
    }),
  });
});

// --- Tests ---

describe('useSteamSync — full sync (no prior MMKV timestamp)', () => {
  it('calls getOwnedGamesWithKey, not getRecentlyPlayedGamesWithKey, on first sync', async () => {
    mockGetOwnedGamesWithKey.mockResolvedValue({
      response: { game_count: 1, games: [makeGame(570)] },
    });

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetOwnedGamesWithKey).toHaveBeenCalledWith('test-api-key-123', '76561198012345678');
    expect(mockGetRecentlyPlayedGamesWithKey).not.toHaveBeenCalled();
    unmount();
  });

  it('updates MMKV last_full_sync on successful full sync', async () => {
    mockGetOwnedGamesWithKey.mockResolvedValue({
      response: { game_count: 1, games: [makeGame(570)] },
    });

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockMmkvSet).toHaveBeenCalledWith('last_full_sync', expect.any(String));
    unmount();
  });

  it('sets sync_status to idle on successful sync', async () => {
    mockGetOwnedGamesWithKey.mockResolvedValue({
      response: { game_count: 1, games: [makeGame(570)] },
    });

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(store.getState().library.sync_status).toBe('idle');
    unmount();
  });

  it('sets sync_status to syncing before API call resolves (AC1)', async () => {
    let resolveApi!: (v: unknown) => void;
    const pending = new Promise((res) => { resolveApi = res; });
    mockGetOwnedGamesWithKey.mockReturnValue(pending);

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    // Flush up to (but not past) the awaited API call
    await act(async () => {
      await Promise.resolve();
    });

    expect(store.getState().library.sync_status).toBe('syncing');

    // Resolve to clean up open handles
    resolveApi({ response: { game_count: 0, games: [] } });
    await act(async () => { await Promise.resolve(); });
    unmount();
  });
});

describe('useSteamSync — incremental sync (within throttle window)', () => {
  it('calls getRecentlyPlayedGamesWithKey, skips getOwnedGamesWithKey when throttled', async () => {
    // Last full sync was 1 minute ago — within throttle window
    const recentTs = (Date.now() - 60_000).toString();
    mockMmkvGetString.mockReturnValue(recentTs);
    mockGetRecentlyPlayedGamesWithKey.mockResolvedValue({
      response: { total_count: 1, games: [makeGame(570)] },
    });

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetRecentlyPlayedGamesWithKey).toHaveBeenCalledWith('test-api-key-123', '76561198012345678', 10);
    expect(mockGetOwnedGamesWithKey).not.toHaveBeenCalled();
    unmount();
  });

  it('does NOT update MMKV on incremental sync', async () => {
    const recentTs = (Date.now() - 60_000).toString();
    mockMmkvGetString.mockReturnValue(recentTs);
    mockGetRecentlyPlayedGamesWithKey.mockResolvedValue({
      response: { total_count: 0, games: [] },
    });

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockMmkvSet).not.toHaveBeenCalled();
    unmount();
  });

  it('skips batch DB select when incremental sync returns empty games array (H3)', async () => {
    const recentTs = (Date.now() - 60_000).toString();
    mockMmkvGetString.mockReturnValue(recentTs);
    mockGetRecentlyPlayedGamesWithKey.mockResolvedValue({
      response: { total_count: 0, games: [] },
    });

    const { db } = jest.requireMock('../../../db') as { db: { select: jest.Mock } };
    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(db.select).not.toHaveBeenCalled();
    unmount();
  });

  it('calls full sync when MMKV timestamp is older than SYNC_THROTTLE_MS', async () => {
    const oldTs = (Date.now() - SYNC_THROTTLE_MS - 1000).toString();
    mockMmkvGetString.mockReturnValue(oldTs);
    mockGetOwnedGamesWithKey.mockResolvedValue({
      response: { game_count: 1, games: [makeGame(570)] },
    });

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetOwnedGamesWithKey).toHaveBeenCalled();
    expect(mockGetRecentlyPlayedGamesWithKey).not.toHaveBeenCalled();
    unmount();
  });
});

describe('useSteamSync — private profile guard (AC5)', () => {
  it('dispatches setSyncError private_profile and shows Toast when games array is empty', async () => {
    mockGetOwnedGamesWithKey.mockResolvedValue({
      response: { game_count: 0, games: [] },
    });

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(store.getState().library.sync_status).toBe('error');
    expect(store.getState().library.syncErrorReason).toBe('private_profile');
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'Library is Private' }),
    );
    unmount();
  });

  it('does NOT write to SQLite when games array is empty', async () => {
    mockGetOwnedGamesWithKey.mockResolvedValue({
      response: { game_count: 0, games: [] },
    });

    const { db } = jest.requireMock('../../../db') as { db: { insert: jest.Mock } };
    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(db.insert).not.toHaveBeenCalled();
    unmount();
  });

  it('does NOT write to SQLite when games field is missing/undefined', async () => {
    mockGetOwnedGamesWithKey.mockResolvedValue({
      response: { game_count: 0 },
    });

    const { db } = jest.requireMock('../../../db') as { db: { insert: jest.Mock } };
    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(db.insert).not.toHaveBeenCalled();
    unmount();
  });
});

describe('useSteamSync — UNAUTHORIZED error (AC4)', () => {
  it('calls handleSteamAuthError when getOwnedGamesWithKey throws SteamError UNAUTHORIZED', async () => {
    const unauthorizedError = { type: 'SteamError', code: 'UNAUTHORIZED', message: 'Steam API returned 401' };
    mockGetOwnedGamesWithKey.mockRejectedValue(unauthorizedError);

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockHandleSteamAuthError).toHaveBeenCalledWith(unauthorizedError);
    unmount();
  });
});

describe('useSteamSync — API error / backoff (AC4)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('dispatches setSyncError api_error on generic API failure', async () => {
    mockGetOwnedGamesWithKey.mockRejectedValue(new Error('Steam API error: 429'));

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(store.getState().library.sync_status).toBe('error');
    expect(store.getState().library.syncErrorReason).toBe('api_error');
    unmount();
  });
});

describe('useSteamSync — delta detection (AC2)', () => {
  it('only upserts rows with changed playtime', async () => {
    const changedGame = makeGame(570, 200, 1700000000); // playtime changed from 100 to 200
    const unchangedGame = makeGame(730, 50, 1700000000); // same as existing

    const { db } = jest.requireMock('../../../db') as { db: { select: jest.Mock; insert: jest.Mock } };
    db.select.mockReturnValue({
      from: jest.fn().mockResolvedValue([
        { appId: 570, playtimeForever: 100, rtimeLastPlayed: 1700000000 },
        { appId: 730, playtimeForever: 50, rtimeLastPlayed: 1700000000 },
      ]),
    });
    const mockOnConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
    const mockValues = jest.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    db.insert.mockReturnValue({ values: mockValues });

    mockGetOwnedGamesWithKey.mockResolvedValue({
      response: { game_count: 2, games: [changedGame, unchangedGame] },
    });

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    // Only the changed game (570) should be upserted
    expect(mockValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ appId: 570, playtimeForever: 200 }),
      ]),
    );
    // The unchanged game (730) must NOT be in the upsert
    const calledWith = mockValues.mock.calls[0][0] as Array<{ appId: number }>;
    expect(calledWith.find(r => r.appId === 730)).toBeUndefined();
    unmount();
  });
});

describe('useSteamSync — triggerSync (manual refresh)', () => {
  it('triggerSync triggers a second sync when called explicitly', async () => {
    mockGetOwnedGamesWithKey.mockResolvedValue({
      response: { game_count: 1, games: [makeGame(570)] },
    });

    const store = createTestStore();
    const { result, unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    // Let the auto-trigger on mount complete
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetOwnedGamesWithKey).toHaveBeenCalledTimes(1);

    // Call triggerSync manually (simulates Story 3.2 pull-to-refresh)
    await act(async () => {
      await result.current.triggerSync();
    });

    expect(mockGetOwnedGamesWithKey).toHaveBeenCalledTimes(2);
    unmount();
  });
});

describe('useSteamSync — MMKV library snapshot (Story 3.2)', () => {
  it('writes library_snapshot to MMKV after successful full sync', async () => {
    mockGetOwnedGamesWithKey.mockResolvedValue({
      response: { game_count: 1, games: [makeGame(570)] },
    });

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockMmkvSet).toHaveBeenCalledWith('library_snapshot', expect.any(String));
    // Snapshot value is valid JSON
    const snapshotCall = mockMmkvSet.mock.calls.find(
      (call: unknown[]) => call[0] === 'library_snapshot',
    );
    expect(snapshotCall).toBeDefined();
    expect(() => JSON.parse(snapshotCall![1] as string)).not.toThrow();
    unmount();
  });

  it('does NOT write library_snapshot on incremental sync', async () => {
    const recentTs = (Date.now() - 60_000).toString();
    mockMmkvGetString.mockReturnValue(recentTs);
    mockGetRecentlyPlayedGamesWithKey.mockResolvedValue({
      response: { total_count: 0, games: [] },
    });

    const store = createTestStore();
    const { unmount } = renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockMmkvSet).not.toHaveBeenCalledWith('library_snapshot', expect.anything());
    unmount();
  });
});

describe('useSteamSync — unauthenticated / no API key', () => {
  it('does not run sync when not authenticated', async () => {
    const store = createTestStore({ isAuthenticated: false, steamId: null });
    renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetOwnedGamesWithKey).not.toHaveBeenCalled();
    expect(mockGetRecentlyPlayedGamesWithKey).not.toHaveBeenCalled();
  });

  it('does not run sync when API key is not in Keychain', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

    const store = createTestStore();
    renderHook(() => useSteamSync(), { wrapper: makeWrapper(store) });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetOwnedGamesWithKey).not.toHaveBeenCalled();
  });
});
