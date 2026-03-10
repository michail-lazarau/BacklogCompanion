import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { authReducer } from '@features/auth/store/authSlice';
import { libraryReducer } from '@features/library/store/librarySlice';
import type { FilterOption, SortOption } from '../store/librarySlice';
import { filterGames, sortGames, useLibraryFilters } from './useLibraryFilters';
import type { SteamGame } from '@db/schema';

// --- Module mocks (same as useGameLibrary.test.ts) ---

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

// --- Helpers ---

const makeGame = (overrides: Partial<SteamGame>): SteamGame => ({
  appId: 1,
  name: 'Test Game',
  playtimeForever: 0,
  playtime2weeks: null,
  rtimeLastPlayed: null,
  imgIconUrl: null,
  headerImage: null,
  hltbMain: null,
  hltbExtra: null,
  hltbComplete: null,
  hltbCachedAt: null,
  lastSyncedAt: new Date(),
  ...overrides,
});

const STEAM_ID = '76561198012345678';

const createWrapper = (
  activeFilter: FilterOption | null = null,
  activeSort: SortOption = 'alphabetical',
) => {
  const store = configureStore({
    reducer: { auth: authReducer, library: libraryReducer },
    preloadedState: {
      auth: { isAuthenticated: true, steamId: STEAM_ID },
      library: { sync_status: 'idle' as const, syncErrorReason: null, activeFilter, activeSort },
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { store } as any,
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    );
};

// --- filterGames tests ---

describe('filterGames', () => {
  it('returns all games when filter is null', () => {
    const games = [makeGame({ playtimeForever: 0 }), makeGame({ playtimeForever: 100 })];
    expect(filterGames(games, null)).toHaveLength(2);
  });

  it('returns only 0-playtime games for unplayed filter', () => {
    const games = [
      makeGame({ appId: 1, playtimeForever: 0 }),
      makeGame({ appId: 2, playtimeForever: 100 }),
      makeGame({ appId: 3, playtimeForever: 0 }),
    ];
    const result = filterGames(games, 'unplayed');
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.playtimeForever === 0)).toBe(true);
  });

  it('returns only >0-playtime games for in_progress filter', () => {
    const games = [
      makeGame({ appId: 1, playtimeForever: 0 }),
      makeGame({ appId: 2, playtimeForever: 50 }),
      makeGame({ appId: 3, playtimeForever: 200 }),
    ];
    const result = filterGames(games, 'in_progress');
    expect(result).toHaveLength(2);
    expect(result.every((g) => g.playtimeForever > 0)).toBe(true);
  });

  it('returns empty array for completed filter (Story 4.4 placeholder)', () => {
    const games = [makeGame({ playtimeForever: 0 }), makeGame({ playtimeForever: 100 })];
    expect(filterGames(games, 'completed')).toHaveLength(0);
  });
});

// --- sortGames tests ---

describe('sortGames', () => {
  it('sorts alphabetically by name', () => {
    const games = [
      makeGame({ appId: 1, name: 'Zelda' }),
      makeGame({ appId: 2, name: 'Apex' }),
      makeGame({ appId: 3, name: 'Minecraft' }),
    ];
    const result = sortGames(games, 'alphabetical');
    expect(result.map((g) => g.name)).toEqual(['Apex', 'Minecraft', 'Zelda']);
  });

  it('sorts by playtime ascending', () => {
    const games = [
      makeGame({ appId: 1, playtimeForever: 300 }),
      makeGame({ appId: 2, playtimeForever: 10 }),
      makeGame({ appId: 3, playtimeForever: 150 }),
    ];
    const result = sortGames(games, 'playtime_asc');
    expect(result.map((g) => g.playtimeForever)).toEqual([10, 150, 300]);
  });

  it('sorts by playtime descending', () => {
    const games = [
      makeGame({ appId: 1, playtimeForever: 10 }),
      makeGame({ appId: 2, playtimeForever: 300 }),
      makeGame({ appId: 3, playtimeForever: 150 }),
    ];
    const result = sortGames(games, 'playtime_desc');
    expect(result.map((g) => g.playtimeForever)).toEqual([300, 150, 10]);
  });

  it('sorts by timeLastPlayed (rtimeLastPlayed descending, nulls last)', () => {
    const games = [
      makeGame({ appId: 1, rtimeLastPlayed: 1000 }),
      makeGame({ appId: 2, rtimeLastPlayed: null }),
      makeGame({ appId: 3, rtimeLastPlayed: 5000 }),
    ];
    const result = sortGames(games, 'timeLastPlayed');
    expect(result.map((g) => g.appId)).toEqual([3, 1, 2]);
  });

  it('does not mutate the original array', () => {
    const games = [
      makeGame({ appId: 1, name: 'Zelda' }),
      makeGame({ appId: 2, name: 'Apex' }),
    ];
    const original = [...games];
    sortGames(games, 'alphabetical');
    expect(games.map((g) => g.appId)).toEqual(original.map((g) => g.appId));
  });
});

// --- useLibraryFilters hook tests ---

describe('useLibraryFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { db } = jest.requireMock('../../../db') as { db: { select: jest.Mock } };
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockResolvedValue([]),
      }),
    });
  });

  it('returns only 0-playtime games when activeFilter is unplayed', async () => {
    const games = [
      { appId: 1, name: 'Alpha', playtimeForever: 0, playtime2weeks: null, rtimeLastPlayed: null, imgIconUrl: null, headerImage: null, hltbMain: null, hltbExtra: null, hltbComplete: null, hltbCachedAt: null, lastSyncedAt: new Date() },
      { appId: 2, name: 'Beta', playtimeForever: 100, playtime2weeks: null, rtimeLastPlayed: null, imgIconUrl: null, headerImage: null, hltbMain: null, hltbExtra: null, hltbComplete: null, hltbCachedAt: null, lastSyncedAt: new Date() },
    ];
    const { db } = jest.requireMock('../../../db') as { db: { select: jest.Mock } };
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({ orderBy: jest.fn().mockResolvedValue(games) }),
    });

    const { result } = renderHook(() => useLibraryFilters(), {
      wrapper: createWrapper('unplayed', 'alphabetical'),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].appId).toBe(1);
  });

  it('returns games in descending playtime order when activeSort is playtime_desc', async () => {
    const games = [
      { appId: 1, name: 'Alpha', playtimeForever: 10, playtime2weeks: null, rtimeLastPlayed: null, imgIconUrl: null, headerImage: null, hltbMain: null, hltbExtra: null, hltbComplete: null, hltbCachedAt: null, lastSyncedAt: new Date() },
      { appId: 2, name: 'Beta', playtimeForever: 300, playtime2weeks: null, rtimeLastPlayed: null, imgIconUrl: null, headerImage: null, hltbMain: null, hltbExtra: null, hltbComplete: null, hltbCachedAt: null, lastSyncedAt: new Date() },
      { appId: 3, name: 'Gamma', playtimeForever: 150, playtime2weeks: null, rtimeLastPlayed: null, imgIconUrl: null, headerImage: null, hltbMain: null, hltbExtra: null, hltbComplete: null, hltbCachedAt: null, lastSyncedAt: new Date() },
    ];
    const { db } = jest.requireMock('../../../db') as { db: { select: jest.Mock } };
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({ orderBy: jest.fn().mockResolvedValue(games) }),
    });

    const { result } = renderHook(() => useLibraryFilters(), {
      wrapper: createWrapper(null, 'playtime_desc'),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((g) => g.playtimeForever)).toEqual([300, 150, 10]);
  });

  it('returns undefined data when games are not yet loaded', () => {
    const { result } = renderHook(() => useLibraryFilters(), {
      wrapper: createWrapper(null, 'alphabetical'),
    });
    // Before query resolves, data is undefined
    expect(result.current.data).toBeUndefined();
  });
});
