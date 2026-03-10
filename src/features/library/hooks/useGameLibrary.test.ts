import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { authReducer } from '@features/auth/store/authSlice';
import { libraryReducer } from '@features/library/store/librarySlice';
import { useGameLibrary } from './useGameLibrary';
import { mmkv } from '../../../data/mmkv';
import { queryKeys } from '@shared/queryKeys';

// --- Module mocks ---

jest.mock('../../../db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockResolvedValue([]),
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

jest.mock('../../../data/mmkv', () => ({
  mmkv: {
    getString: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
  },
}));

// --- Typed mock helpers ---

const mockMmkvGetString = mmkv.getString as jest.Mock;

// --- Test data ---

const STEAM_ID = '76561198012345678';

const makeStoredGame = (appId: number) => ({
  appId,
  name: `Game ${appId}`,
  playtimeForever: 100,
  playtime2weeks: null,
  rtimeLastPlayed: 1700000000,
  imgIconUrl: 'abc123',
  headerImage: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
  hltbMain: null,
  hltbExtra: null,
  hltbComplete: null,
  lastSyncedAt: new Date(),
  hltbCachedAt: null,
});

// Snapshot fixture mirrors what useSteamSync actually writes to MMKV:
// Date-mode fields (lastSyncedAt, hltbCachedAt) are excluded to avoid JSON serialization issues
const makeSnapshotGame = (appId: number) => ({
  appId,
  name: `Game ${appId}`,
  playtimeForever: 100,
  playtime2weeks: null,
  rtimeLastPlayed: 1700000000,
  imgIconUrl: 'abc123',
  headerImage: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
  hltbMain: null,
  hltbExtra: null,
  hltbComplete: null,
});

// --- Wrapper factory ---

let currentQueryClient: QueryClient;

afterEach(() => currentQueryClient?.clear());

const createWrapper = (steamId: string | null = STEAM_ID) => {
  const store = configureStore({
    reducer: { auth: authReducer, library: libraryReducer },
    preloadedState: {
      auth: { isAuthenticated: true, steamId },
      library: {
        sync_status: 'idle' as const,
        syncErrorReason: null,
        activeFilter: null,
        activeSort: 'alphabetical' as const,
      },
    },
  });
  currentQueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { store } as any,
      React.createElement(QueryClientProvider, { client: currentQueryClient }, children),
    );
};

// --- Tests ---

describe('useGameLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { db } = jest.requireMock('../../../db') as {
      db: { select: jest.Mock };
    };
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockResolvedValue([]),
      }),
    });
    mockMmkvGetString.mockReturnValue(undefined);
  });

  it('returns games from SQLite when query resolves', async () => {
    const games = [makeStoredGame(570), makeStoredGame(730)];
    const { db } = jest.requireMock('../../../db') as { db: { select: jest.Mock } };
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockResolvedValue(games),
      }),
    });

    const { result } = renderHook(() => useGameLibrary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(games);
  });

  it('returns undefined data and isPending: true when no steamId (disabled)', () => {
    const { result } = renderHook(() => useGameLibrary(), {
      wrapper: createWrapper(null),
    });

    // Query is disabled — isPending is true, data is undefined
    expect(result.current.data).toBeUndefined();
    expect(result.current.isPending).toBe(true);
  });

  it('placeholderData function reads from MMKV and returns parsed games', async () => {
    const snapshotGames = [makeSnapshotGame(570)];
    mockMmkvGetString.mockReturnValue(JSON.stringify(snapshotGames));

    const { result } = renderHook(() => useGameLibrary(), {
      wrapper: createWrapper(),
    });

    // With placeholderData, data is available immediately from MMKV before SQLite resolves
    expect(result.current.data).toEqual(snapshotGames);
    expect(result.current.isPlaceholderData).toBe(true);
  });

  it('placeholderData returns undefined when MMKV has no snapshot', () => {
    mockMmkvGetString.mockReturnValue(undefined);

    const { result } = renderHook(() => useGameLibrary(), {
      wrapper: createWrapper(),
    });

    // No snapshot — placeholderData returns undefined, isPending is true
    expect(result.current.isPending).toBe(true);
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it('uses correct query key queryKeys.games.all(steamId)', async () => {
    // Verify the query key by reading it from the QueryClient cache after the query runs.
    // TanStack Query stores queries indexed by their key — if the key were wrong, the
    // cache lookup would fail and the test would time out or return wrong data.
    currentQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const store = (() => {
      const { configureStore: cs } = jest.requireActual('@reduxjs/toolkit') as typeof import('@reduxjs/toolkit');
      return cs({
        reducer: { auth: authReducer, library: libraryReducer },
        preloadedState: {
          auth: { isAuthenticated: true, steamId: STEAM_ID },
          library: { sync_status: 'idle' as const, syncErrorReason: null, activeFilter: null, activeSort: 'alphabetical' as const },
        },
      });
    })();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        require('react-redux').Provider,
        { store } as any,
        React.createElement(QueryClientProvider, { client: currentQueryClient }, children),
      );

    const { result } = renderHook(() => useGameLibrary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The expected key must exist in the QueryClient cache
    const expectedKey = queryKeys.games.all(STEAM_ID);
    const cachedQuery = currentQueryClient.getQueryState(expectedKey);
    expect(cachedQuery).toBeDefined();
    expect(cachedQuery?.status).toBe('success');
  });
});
