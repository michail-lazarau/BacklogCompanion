import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@features/auth/store/authSlice';
import { libraryReducer } from '../store/librarySlice';
import type { FilterOption, SortOption, SyncStatus } from '../store/librarySlice';
import type { SteamGame } from '@db/schema';
import { useLibraryScreen } from './useLibraryScreen';

jest.mock('./useLibraryFilters');
jest.mock('./useSteamSync');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ push: jest.fn(), goBack: jest.fn() }),
}));

const mockUseLibraryFilters = (jest.requireMock('./useLibraryFilters') as { useLibraryFilters: jest.Mock }).useLibraryFilters;
const mockUseSteamSync = (jest.requireMock('./useSteamSync') as { useSteamSync: jest.Mock }).useSteamSync;

const makeGame = (overrides: Partial<SteamGame> = {}): SteamGame => ({
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

type LibraryPreloadState = {
  sync_status?: SyncStatus;
  activeFilter?: FilterOption | null;
  activeSort?: SortOption;
};

function createWrapper(libraryState: LibraryPreloadState = {}) {
  const store = configureStore({
    reducer: { auth: authReducer, library: libraryReducer },
    preloadedState: {
      library: {
        sync_status: 'idle' as SyncStatus,
        syncErrorReason: null,
        activeFilter: null,
        activeSort: 'timeLastPlayed' as SortOption,
        ...libraryState,
      },
    } as Parameters<typeof configureStore>[0]['preloadedState'],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(Provider, { store } as any, children)
  );
}

const triggerSyncMock = jest.fn();

beforeEach(() => {
  mockUseLibraryFilters.mockReturnValue({
    data: [makeGame()],
    isPending: false,
    isPlaceholderData: false,
    isFetching: false,
  });
  triggerSyncMock.mockResolvedValue(undefined);
  mockUseSteamSync.mockReturnValue({ triggerSync: triggerSyncMock });
});

// --- showSkeleton ---

describe('showSkeleton', () => {
  it('is true when games is undefined (no data, no placeholder)', () => {
    mockUseLibraryFilters.mockReturnValue({
      data: undefined, isPending: true, isPlaceholderData: false, isFetching: false,
    });
    const { result } = renderHook(() => useLibraryScreen(), { wrapper: createWrapper() });
    expect(result.current.showSkeleton).toBe(true);
  });

  it('is true when syncing with empty game list', () => {
    mockUseLibraryFilters.mockReturnValue({
      data: [], isPending: false, isPlaceholderData: false, isFetching: false,
    });
    const { result } = renderHook(() => useLibraryScreen(), {
      wrapper: createWrapper({ sync_status: 'syncing' }),
    });
    expect(result.current.showSkeleton).toBe(true);
  });

  it('is true on background refetch with empty library, no search, no filter', () => {
    mockUseLibraryFilters.mockReturnValue({
      data: [], isPending: false, isPlaceholderData: false, isFetching: true,
    });
    const { result } = renderHook(() => useLibraryScreen(), {
      wrapper: createWrapper({ sync_status: 'idle', activeFilter: null }),
    });
    expect(result.current.showSkeleton).toBe(true);
  });

  it('is false on background refetch when filter is active (empty result from filter, not empty library)', () => {
    mockUseLibraryFilters.mockReturnValue({
      data: [], isPending: false, isPlaceholderData: false, isFetching: true,
    });
    const { result } = renderHook(() => useLibraryScreen(), {
      wrapper: createWrapper({ sync_status: 'idle', activeFilter: 'unplayed' }),
    });
    expect(result.current.showSkeleton).toBe(false);
  });

  it('is false when games are present regardless of isFetching', () => {
    mockUseLibraryFilters.mockReturnValue({
      data: [makeGame()], isPending: false, isPlaceholderData: false, isFetching: true,
    });
    const { result } = renderHook(() => useLibraryScreen(), { wrapper: createWrapper() });
    expect(result.current.showSkeleton).toBe(false);
  });
});

describe('showSkeleton — search active (debounce)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is false on background refetch when search query is active (empty result from search, not empty library)', () => {
    mockUseLibraryFilters.mockReturnValue({
      data: [], isPending: false, isPlaceholderData: false, isFetching: true,
    });
    const { result } = renderHook(() => useLibraryScreen(), {
      wrapper: createWrapper({ sync_status: 'idle', activeFilter: null }),
    });
    act(() => { result.current.setSearchQuery('warhammer'); });
    act(() => { jest.advanceTimersByTime(50); }); // fire debounce
    expect(result.current.showSkeleton).toBe(false);
  });
});

// --- onRefresh ---

describe('onRefresh', () => {
  it('sets isPullRefreshing true immediately and false after triggerSync resolves', async () => {
    let resolveSync!: () => void;
    triggerSyncMock.mockReturnValue(new Promise<void>((resolve) => { resolveSync = resolve; }));

    const { result } = renderHook(() => useLibraryScreen(), { wrapper: createWrapper() });

    act(() => { result.current.onRefresh(); });
    expect(result.current.isPullRefreshing).toBe(true);

    await act(async () => { resolveSync(); });
    expect(result.current.isPullRefreshing).toBe(false);
  });
});

// --- clearFilter ---

describe('clearFilter', () => {
  it('dispatches setActiveFilter(null) to Redux store', () => {
    const store = configureStore({
      reducer: { auth: authReducer, library: libraryReducer },
      preloadedState: {
        library: {
          sync_status: 'idle' as SyncStatus,
          syncErrorReason: null,
          activeFilter: 'unplayed' as FilterOption,
          activeSort: 'timeLastPlayed' as SortOption,
        },
      } as Parameters<typeof configureStore>[0]['preloadedState'],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(Provider, { store } as any, children);

    const { result } = renderHook(() => useLibraryScreen(), { wrapper });
    act(() => { result.current.clearFilter(); });
    expect(store.getState().library.activeFilter).toBeNull();
  });
});
