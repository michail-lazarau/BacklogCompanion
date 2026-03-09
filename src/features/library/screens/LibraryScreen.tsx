import { View, Text, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import { useSteamSync } from '../hooks/useSteamSync';
import { useGameLibrary } from '../hooks/useGameLibrary';
import { GameCard } from '../components/GameCard';
import { LibraryListSkeleton } from '../components/LibraryListSkeleton';
import { OfflineBanner } from '@shared/components/OfflineBanner';
import type { SteamGame } from '@db/schema';

export const LibraryScreen = () => {
  const { height } = useWindowDimensions();
  const { triggerSync } = useSteamSync();
  const syncStatus = useAppSelector((state) => state.library.sync_status);
  const { data: games, isPending, isPlaceholderData } = useGameLibrary();

  const showSkeleton = isPending && !isPlaceholderData;

  return (
    <SafeAreaView className="flex-1 bg-surface-900" edges={['top']}>
      <OfflineBanner />
      {showSkeleton ? (
        <LibraryListSkeleton />
      ) : (
        <FlashList
          data={games ?? []}
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
          onRefresh={triggerSync}
          refreshing={syncStatus === 'syncing'}
          ListEmptyComponent={
            <View style={{ height: height * 0.6 }} className="items-center justify-center px-8">
              <Text className="text-text-300 font-rubik text-base text-center">
                Your library is empty. Sync your Steam account to get started.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};
