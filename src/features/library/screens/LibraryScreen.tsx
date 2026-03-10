import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import type { FilterOption } from '../store/librarySlice';
import { GameCard } from '../components/GameCard';
import { LibraryListSkeleton } from '../components/LibraryListSkeleton';
import { FilterSheet } from '../components/FilterSheet';
import { SearchBar } from '../components/SearchBar';
import { OfflineBanner } from '@shared/components/OfflineBanner';
import { tokens } from '@res/tokens';
import type { SteamGame } from '@db/schema';
import { useLibraryScreen } from '../hooks/useLibraryScreen';

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
  const {
    searchQuery, setSearchQuery, debouncedSearchQuery,
    games, isPending, isPlaceholderData, syncStatus,
    activeFilter, showSkeleton, listRef,
    isPullRefreshing, onRefresh,
    isFilterSheetVisible, openFilterSheet, closeFilterSheet, clearFilter,
  } = useLibraryScreen();

  return (
    <SafeAreaView className="flex-1 bg-surface-900" edges={['top']}>
      <OfflineBanner />

      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search games…" />

      {/* Library toolbar: active filter pill + filter button */}
      <View style={styles.toolbar}>
        <View style={styles.filterPillWrapper}>
          {activeFilter !== null && (
            <TouchableOpacity testID="active-filter-pill" onPress={clearFilter} style={styles.filterPill}>
              <Text style={styles.pillText}>{FILTER_LABELS[activeFilter]}</Text>
              <Text style={styles.pillX}>×</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity testID="open-filter-sheet-button" onPress={openFilterSheet} style={styles.filterButton}>
          <Text style={styles.filterButtonText}>Filter / Sort</Text>
        </TouchableOpacity>
      </View>

      <Animated.View key={showSkeleton ? 'skeleton' : 'list'} entering={FadeIn.duration(300)} style={styles.fadeContainer}>
        {showSkeleton ? (
          <LibraryListSkeleton />
        ) : (
          <FlashList
            key={debouncedSearchQuery}
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
                onRefresh={onRefresh}
                tintColor={tokens.colors.primary}
                colors={[tokens.colors.primary]}
              />
            }
            ListEmptyComponent={
              // Suppress empty state while debounce hasn't caught up to raw input —
              // avoids flash of stale "no results" between keystrokes (including clear).
              !isPending && !isPlaceholderData && syncStatus !== 'syncing' && searchQuery === debouncedSearchQuery ? (
                <View style={{ height: height * 0.6 }} className="items-center justify-center px-8">
                  <Text className="text-text-100 font-rubik text-lg text-center">
                    {searchQuery.trim().length > 0
                      ? `No games match '${searchQuery}'`
                      : activeFilter !== null
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
      <FilterSheet isVisible={isFilterSheetVisible} onClose={closeFilterSheet} />
    </SafeAreaView>
  );
};
