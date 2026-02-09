import React, { useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet, Image } from 'react-native';
import { useSteamLibrary, useSteamAppDetails } from '../hooks/useSteam';
import { useGenerateSuggestions } from '../hooks/useGenerateSuggestions';
import Toast from 'react-native-toast-message';
import Config from 'react-native-config';
import { reduceOwnedGames } from '../utils/steamDataTransformer';
import { SteamAppData, LLMGameSuggestionResponse } from '../types/steam.types';
import { SafeAreaView } from 'react-native-safe-area-context';

const AIScreen = () => {
    const [suggestionAppids, setSuggestionAppids] = useState<number[]>([]);

    const { data: libData, isLoading: libLoading } = useSteamLibrary();
    const games = libData?.response?.games || [];

    const generateSuggestions = useGenerateSuggestions(reduceOwnedGames(libData!));
    const detailsQueries = useSteamAppDetails(suggestionAppids);

    const recommendations = detailsQueries
      .map(query => query.data)
      .filter(Boolean) as SteamAppData[];

    const isReady = !!Config.LLM_API_KEY && !libLoading && games.length > 0;
    const isGenerating = generateSuggestions.isPending;
    const buttonText = isGenerating ? 'Cancel' : 'Generate suggestions';

    const handleGenerateSuggestions = () => {
        if (isGenerating) {
          // True cancellation (requires AbortController in mutationFn)
          generateSuggestions.reset();
          setSuggestionAppids([]);
          return;
        }

        if (!isReady) {
          Toast.show({
            type: 'info',
            text1: 'Not ready',
            text2: 'Need Steam library and LLM key',
          });
          return;
        }

        generateSuggestions.mutate(undefined, {
          onSuccess: (data: LLMGameSuggestionResponse) => {
            setSuggestionAppids(data.appids);
            Toast.show({
              type: 'success',
              text1: 'Suggestions ready',
              text2: `${data.appids.length} games`,
            });
          },
          onError: (error: Error) => {
            Toast.show({
              type: 'error',
              text1: 'AI failed',
              text2: error.message,
            });
          },
        });
    };

    const renderRecommendation = ({ item }: { item: SteamAppData }) => (
      <View style={styles.card}>
        <Image 
          source={{ uri: item.header_image }} 
          style={styles.headerImage}
          resizeMode="cover"
        />
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.desc} numberOfLines={3}>
          {item.short_description}
        </Text>
        {item.genres && (
          <Text style={styles.genres}>
            {item.genres.slice(0, 3).map(g => g.description).join(', ')}
          </Text>
        )}
      </View>
    );

    const isDetailsLoading = suggestionAppids.length > 0 && 
    detailsQueries.some(query => query.isLoading);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>AI Game Recommendations</Text>
      
      {/* Library status */}
      {libLoading ? (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" />
          <Text>Loading your Steam library...</Text>
        </View>
      ) : games.length === 0 ? (
        <Text style={styles.warning}>No games found in library</Text>
      ) : (
        <Text style={styles.ready}>
          📚 {games.length} games analyzed
        </Text>
      )}
      
      {/* Generate button */}
      <Pressable
        style={({ pressed }) => [
            styles.button,
            (!isReady || isGenerating) && styles.buttonDisabled,
            pressed && styles.buttonPressed,  // haptic feedback
        ]}
        onPress={handleGenerateSuggestions}
        disabled={!isReady || isGenerating}
        android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: false }}
      >
        <Text style={styles.buttonText}>{buttonText}</Text>
        {isGenerating && <ActivityIndicator size="small" color="white" />}
      </Pressable>

      {/* Recommendations */}
      {recommendations.length > 0 ? (
        <FlatList
          data={recommendations}
          renderItem={renderRecommendation}
          keyExtractor={item => item.steam_appid.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : isDetailsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>
            Loading {suggestionAppids.length} recommendations...
          </Text>
        </View>
      ) : null}

      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    marginBottom: 20,
  },
  warning: {
    color: '#ff9800',
    textAlign: 'center',
    fontSize: 16,
    padding: 16,
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    marginBottom: 20,
  },
  ready: {
    color: '#4caf50',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  list: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  headerImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  desc: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 8,
  },
  genres: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  buttonPressed: {
  transform: [{ scale: 0.98 }],  // iOS press effect
},
});

export default AIScreen;