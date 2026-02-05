import React, { useCallback } from 'react';
import {
  FlatList,
  Text,
  View,
  Image,
  StyleSheet,
  ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSteamLibrary } from '../hooks/useSteam';
import type { SteamGame } from '../types/steam.types';
import type { RootState } from '../data/store';
import { useSelector } from 'react-redux';
import { colors } from '../res/theme';

const LibraryScreen = () => {
  const steamId = useSelector((state: RootState) => state.user.steamId);
  const { data, isLoading, error, refetch } = useSteamLibrary();

  const games: SteamGame[] = data?.response.games || [];
  const gameCount = data?.response.game_count || 0;

  const renderGame = useCallback(({ item }: { item: SteamGame }) => (
    <View style={styles.gameItem}>
      <Image
        source={{
          uri: `https://media.steampowered.com/steamcommunity/public/images/apps/${item.appid}/${item.img_icon_url}.jpg`,
        }}
        style={styles.gameIcon}
      />
      <View style={styles.gameInfo}>
        <Text style={styles.gameName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.playtime}>{item.playtime_forever} min</Text>
        {item.playtime_forever === 0 && <Text style={styles.unplayedBadge}>Unplayed</Text>}
      </View>
    </View>
  ), []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error.message}</Text>
        <Pressable
          onPress={() => refetch()}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.buttonPressed,
          ]}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hi NamePlaceholder</Text>
        <Text style={styles.headerSubtitle}>You own {gameCount} games</Text>
      </View>

      <View style={styles.allChipContainer}>
        <View style={styles.allChip}>
          <Text style={styles.allChipText}>All</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          renderItem={renderGame}
          keyExtractor={item => item.appid.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No games found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.containerBackground },
  header: { padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: colors.title },
  headerSubtitle: { fontSize: 16, color: colors.textFootnote, marginTop: 4 },
  
  allChipContainer: { 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    alignItems: 'flex-start' 
  },
  allChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  allChipText: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: colors.textPressableComponent
  },
  
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20 },
  gameItem: { 
    flexDirection: 'row', 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.surface 
  },
  gameIcon: { 
    width: 72, 
    height: 72, 
    borderRadius: 12, 
    marginRight: 16 
  },
  gameInfo: { flex: 1 },
  gameName: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  playtime: { fontSize: 15, color: colors.textFootnote, fontWeight: '500' },
  unplayedBadge: { 
    marginTop: 4, 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    backgroundColor: colors.surface, 
    borderRadius: 12, 
    fontSize: 12, 
    color: colors.textFootnote, 
    alignSelf: 'flex-start' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 12 
  },
  loadingText: { fontSize: 16 },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 60 
  },
  emptyText: { fontSize: 17, color: colors.textFootnote, textAlign: 'center' },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40 
  },
  errorText: { fontSize: 17, color: colors.textError, textAlign: 'center' },
  retryButton: { 
    marginTop: 16,
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    backgroundColor: colors.primary, 
    borderRadius: 12 
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  retryText: { color: colors.textPressableComponent, fontWeight: '600' },
});

export default LibraryScreen;
