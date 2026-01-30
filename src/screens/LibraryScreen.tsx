import React, { useCallback } from 'react';
import {
  FlatList,
  Text,
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSteamLibrary } from '../hooks/useSteamLibrary';
import type { SteamGame } from '../types/steam.types';
import type { RootState } from '../data/store';
import { useSelector } from 'react-redux';

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
        <TouchableOpacity style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hi NamePlaceholder</Text>
        <Text style={styles.headerSubtitle}>You own {gameCount} games</Text>
      </View>

      {/* Только "All" чип */}
      <View style={styles.allChipContainer}>
        <View style={styles.allChip}>
          <Text style={styles.allChipText}>All</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
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
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#000' },
  headerSubtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  
  allChipContainer: { 
    paddingHorizontal: 20, 
    paddingVertical: 8, 
    alignItems: 'flex-start' 
  },
  allChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  allChipText: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: 'white' 
  },
  
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20 },
  gameItem: { 
    flexDirection: 'row', 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F3F4' 
  },
  gameIcon: { 
    width: 72, 
    height: 72, 
    borderRadius: 12, 
    marginRight: 16 
  },
  gameInfo: { flex: 1 },
  gameName: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  playtime: { fontSize: 15, color: '#666', fontWeight: '500' },
  unplayedBadge: { 
    marginTop: 4, 
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    backgroundColor: '#E5E5E7', 
    borderRadius: 12, 
    fontSize: 12, 
    color: '#86868B', 
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
  emptyText: { fontSize: 17, color: '#86868B', textAlign: 'center' },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40 
  },
  errorText: { fontSize: 17, color: '#FF3B30', textAlign: 'center' },
  retryButton: { 
    marginTop: 16,
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    backgroundColor: '#007AFF', 
    borderRadius: 12 
  },
  retryText: { color: 'white', fontWeight: '600' },
});

export default LibraryScreen;
