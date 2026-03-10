import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useAppSelector, useAppDispatch } from '@shared/hooks/reduxHooks';
import { setActiveFilter } from '../store/librarySlice';
import type { FilterOption } from '../store/librarySlice';
import { useSteamSync } from '../hooks/useSteamSync';
import { useLibraryFilters } from '../hooks/useLibraryFilters';
import { GameCard } from '../components/GameCard';
import { LibraryListSkeleton } from '../components/LibraryListSkeleton';
import { FilterSheet } from '../components/FilterSheet';
import { OfflineBanner } from '@shared/components/OfflineBanner';
import { tokens } from '@res/tokens';
import type { SteamGame } from '@db/schema';

const FILTER_LABELS: Record<FilterOption, string> = {
  unplayed: 'Unplayed',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.surface800,
    minHeight: 44,
  },
  filterPillWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.primary,
    borderRadius: 9999,
    paddingHorizontal: tokens.spacing.sm2,
    paddingVertical: tokens.spacing.xs,
  },
  pillText: {
    color: tokens.colors.surface900,
    fontSize: tokens.fontSize.caption,
    fontFamily: tokens.fontFamily.medium,
  },
  pillX: {
    color: tokens.colors.surface900,
    fontSize: tokens.fontSize.caption,
    fontFamily: tokens.fontFamily.medium,
    marginLeft: tokens.spacing.xs,
  },
  filterButton: {
    paddingHorizontal: tokens.spacing.sm2,
    paddingVertical: tokens.spacing.xs,
  },
  filterButtonText: {
    color: tokens.colors.primary,
    fontSize: tokens.fontSize.caption,
    fontFamily: tokens.fontFamily.medium,
  },
  fadeContainer: {
    flex: 1,
  },
});

export const LibraryScreen = () => {
  const { height } = useWindowDimensions();
  const { triggerSync } = useSteamSync();
  const dispatch = useAppDispatch();
  const syncStatus = useAppSelector((state) => state.library.sync_status);
  const activeFilter = useAppSelector((state) => state.library.activeFilter);
  const activeSort = useAppSelector((state) => state.library.activeSort);
  const { data: games, isPending, isPlaceholderData, isFetching } = useLibraryFilters();
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const listRef = useRef<FlashListRef<SteamGame>>(null);
  const prevFilterSort = useRef({ activeFilter, activeSort });

  useEffect(() => {
    if (prevFilterSort.current.activeFilter !== activeFilter ||
        prevFilterSort.current.activeSort !== activeSort) {
      prevFilterSort.current = { activeFilter, activeSort };
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
      });
    }
  }, [activeFilter, activeSort]);

  const showSkeleton =
    // [must] query has no data — pending with no placeholder from MMKV
    games === undefined ||
    // [must] sync running with empty list — real fix for op-sqlite microtask batching
    (syncStatus === 'syncing' && games.length === 0) ||
    // [safety] would catch async refetch with empty list — currently dead for op-sqlite
    (isFetching && games.length === 0);

  return (
    <SafeAreaView className="flex-1 bg-surface-900" edges={['top']}>
      <OfflineBanner />

      {/* Library toolbar: active filter pill + filter button */}
      <View style={styles.toolbar}>
        {/* Active filter pill (visible when a filter is selected) */}
        <View style={styles.filterPillWrapper}>
          {activeFilter !== null && (
            <TouchableOpacity
              testID="active-filter-pill"
              onPress={() => dispatch(setActiveFilter(null))}
              style={styles.filterPill}
            >
              <Text style={styles.pillText}>{FILTER_LABELS[activeFilter]}</Text>
              <Text style={styles.pillX}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter / Sort button */}
        <TouchableOpacity
          testID="open-filter-sheet-button"
          onPress={() => setIsFilterSheetVisible(true)}
          style={styles.filterButton}
        >
          <Text style={styles.filterButtonText}>Filter / Sort</Text>
        </TouchableOpacity>
      </View>

      <Animated.View key={showSkeleton ? 'skeleton' : 'list'} entering={FadeIn.duration(300)} style={styles.fadeContainer}>
        {showSkeleton ? (
          <LibraryListSkeleton />
        ) : (
          <FlashList
            ref={listRef}
            data={games ?? []} // ?? [] is a TS requirement; showSkeleton guards the empty case above
            keyExtractor={(item: SteamGame) => item.appId.toString()}
            renderItem={({ item }: { item: SteamGame }) => (
              <GameCard
                game={item}
                onPress={() => {
                  // TODO Story 4.1: navigate to GameDetailScreen
                  // navigation.push('GameDetail', { appId: item.appId })
                }}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={() => {
                  setIsPullRefreshing(true);
                  triggerSync().finally(() => setIsPullRefreshing(false));
                }}
                tintColor={tokens.colors.primary}
                colors={[tokens.colors.primary]}
              />
            }
            ListEmptyComponent={
              // Only shown when games is a settled empty array (sync done, no games or filter mismatch)
              !isPending && !isPlaceholderData ? (
                <View style={{ height: height * 0.6 }} className="items-center justify-center px-8">
                  <Text className="text-text-100 font-rubik text-lg text-center">
                    {activeFilter !== null
                      ? 'No games match the current filter.'
                      : 'Your library is empty. Sync your Steam account to get started.'}
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </Animated.View>

      {/* FilterSheet is always mounted so BottomSheet can animate from index -1 → 0 on open */}
      <FilterSheet isVisible={isFilterSheetVisible} onClose={() => setIsFilterSheetVisible(false)} />
    </SafeAreaView>
  );
};
