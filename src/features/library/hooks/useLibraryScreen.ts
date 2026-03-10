import { useCallback, useEffect, useRef, useState } from 'react';
import { type FlashListRef } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useAppSelector, useAppDispatch } from '@shared/hooks/reduxHooks';
import { setActiveFilter } from '../store/librarySlice';
import { useSteamSync } from './useSteamSync';
import { useLibraryFilters } from './useLibraryFilters';
import { useDebounce } from '@shared/hooks/useDebounce';
import type { SteamGame } from '@db/schema';

const SEARCH_DEBOUNCE_MS = 50;

export const useLibraryScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { triggerSync } = useSteamSync();
  const dispatch = useAppDispatch();
  const syncStatus = useAppSelector((state) => state.library.sync_status);
  const activeFilter = useAppSelector((state) => state.library.activeFilter);
  const activeSort = useAppSelector((state) => state.library.activeSort);

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);
  const { data: games, isPending, isPlaceholderData, isFetching } = useLibraryFilters(debouncedSearchQuery);

  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const listRef = useRef<FlashListRef<SteamGame>>(null);
  const prevSortFilter = useRef({ activeFilter, activeSort });
  useEffect(() => {
    if (
      prevSortFilter.current.activeFilter !== activeFilter ||
      prevSortFilter.current.activeSort !== activeSort
    ) {
      prevSortFilter.current = { activeFilter, activeSort };
      const rafId = requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [activeFilter, activeSort]);

  const showSkeleton =
    games === undefined ||
    (syncStatus === 'syncing' && games.length === 0) ||
    // Only show skeleton on background refetch when library is genuinely empty —
    // not when search/filter is responsible for the empty result set.
    (isFetching && games.length === 0 && debouncedSearchQuery === '' && activeFilter === null);

  const openFilterSheet = useCallback(() => setIsFilterSheetVisible(true), []);
  const closeFilterSheet = useCallback(() => setIsFilterSheetVisible(false), []);
  const clearFilter = useCallback(() => dispatch(setActiveFilter(null)), [dispatch]);
  const onRefresh = useCallback(() => {
    // Intentionally NOT clearing searchQuery on refresh — the active search
    // persists so newly synced games matching the query appear immediately.
    setIsPullRefreshing(true);
    triggerSync().finally(() => setIsPullRefreshing(false));
  }, [triggerSync]);

  return {
    navigation,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    games,
    isPending,
    isPlaceholderData,
    syncStatus,
    activeFilter,
    showSkeleton,
    listRef,
    isPullRefreshing,
    onRefresh,
    isFilterSheetVisible,
    openFilterSheet,
    closeFilterSheet,
    clearFilter,
  };
};
