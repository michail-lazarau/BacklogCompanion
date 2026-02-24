import React, { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  ParamListBase,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { SteamGame, ReducedSteamGame, SteamAppData } from '../types/steam.types';
import { usePlayerAchievements, useGameSchema } from '../hooks/useGameDetails';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../res/theme';

type GameDetailsRouteProp = RouteProp<
  { GameDetails: { game: SteamGame | ReducedSteamGame } },
  'GameDetails'
>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const HEADER_HEIGHT = 250;
const TAB_BAR_HEIGHT = 50;

const GameDetailsScreen = () => {
  const route = useRoute<GameDetailsRouteProp>();
  const navigation = useNavigation();
  const { game } = route.params;
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<'Stats' | 'Achievements' | 'AI'>('Achievements');

  const { data: achievementsData, isLoading: isLoadingAchievements, error: achievementsError } = usePlayerAchievements(game.appid);
  const { data: schemaData, isLoading: isLoadingSchema } = useGameSchema(game.appid);

  // Parallax Header Animations
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [HEADER_HEIGHT, 0], // Collapses
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
     inputRange: [0, HEADER_HEIGHT / 2],
     outputRange: [1, 0],
     extrapolate: 'clamp',
  });
  
  const capsuleOpacity = scrollY.interpolate({
      inputRange: [HEADER_HEIGHT / 2, HEADER_HEIGHT],
      outputRange: [0, 1],
      extrapolate: 'clamp',
  });

  const mergedAchievements = useMemo(() => {
    if (!achievementsData?.playerstats?.achievements || !schemaData?.game?.availableGameStats?.achievements) {
      return [];
    }
    const player achievementsList = achievementsData.playerstats.achievements;
    const schemaAchievements = schemaData.game.availableGameStats.achievements;

    return playerAchievementsList.map((pa) => {
      const schema = schemaAchievements.find((sa) => sa.name === pa.apiname);
      return {
        ...pa,
        ...schema,
      };
    }).sort((a, b) => (b.unlocktime || 0) - (a.unlocktime || 0));
  }, [achievementsData, schemaData]);


  const renderHeader = () => {
      // In a real app we would fetch SteamAppData to get specialized images if not passed in game object.
      // game object from library might be minimal.
      // Assuming we have basic images or fallbacks.
      const headerImage = (game as any).img_logo_url 
        ? `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${(game as any).img_logo_url}.jpg`
        : 'https://via.placeholder.com/460x215';
        
      const iconImage = (game as any).img_icon_url
        ? `http://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${(game as any).img_icon_url}.jpg`
        : 'https://via.placeholder.com/64';

      return (
          <View style={[styles.headerContainer, { height: HEADER_HEIGHT }]}>
             <Animated.Image
                source={{ uri: headerImage }}
                style={[styles.headerImage, { opacity: headerOpacity }]}
                resizeMode="cover"
             />
             <Animated.View style={[styles.capsuleContainer, { opacity: capsuleOpacity, paddingTop: insets.top }]}>
                <Image source={{ uri: iconImage }} style={styles.capsuleImage} />
                <Text style={styles.capsuleTitle} numberOfLines={1}>{game.name}</Text>
             </Animated.View>
             
             {/* Gradient overlay for text readability on header image */}
             <Animated.View style={[styles.headerOverlay, { opacity: headerOpacity }]}>
                <Text style={styles.gameTitle}>{game.name}</Text>
             </Animated.View>
          </View>
      );
  };

  const renderTabs = () => (
    <View style={styles.tabBar}>
      {(['Stats', 'Achievements', 'AI'] as const).map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStats = () => (
    <View style={styles.contentContainer}>
       <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Playtime:</Text>
          <Text style={styles.statValue}>{(game.playtime_forever / 60).toFixed(1)} hours</Text>
       </View>
       <View style={styles.statRow}>
          <Text style={styles.statLabel}>Recent Playtime (2 weeks):</Text>
          <Text style={styles.statValue}>{((game.playtime_2weeks || 0) / 60).toFixed(1)} hours</Text>
       </View>
       {/* Genres would ideally come from SteamAppData which we might need to fetch separately if not in ReducedSteamGame */}
    </View>
  );

  const renderAchievements = () => {
      if (isLoadingAchievements || isLoadingSchema) {
          return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />;
      }
      
      if (achievementsError) {
          return <Text style={styles.errorText}>Could not load achievements. Profile might be private.</Text>;
      }

      if (mergedAchievements.length === 0) {
          return <Text style={styles.emptyText}>No achievements yet. Keep playing!</Text>;
      }

      return (
          <View style={styles.achievementsList}>
              {mergedAchievements.map((item, index) => (
                  <View key={index} style={styles.achievementItem}>
                      <Image source={{ uri: item.icon }} style={styles.achievementIcon} />
                      <View style={styles.achievementInfo}>
                          <Text style={styles.achievementName}>{item.displayName}</Text>
                          <Text style={styles.achievementDescription} numberOfLines={2}>{item.description}</Text>
                          {item.unlocktime ? (
                              <Text style={styles.achievementDate}>Unlocked: {new Date(item.unlocktime * 1000).toLocaleDateString()}</Text>
                          ) : (
                             <Text style={styles.lockedText}>Locked</Text>
                          )}
                      </View>
                  </View>
              ))}
          </View>
      );
  };

  const renderAI = () => (
      <View style={styles.contentContainer}>
          <Text style={styles.stubText}>AI Recommendations coming soon...</Text>
      </View>
  );

  return (
    <View style={styles.container}>
      {/* Sticky Header Effect requires careful placement or handling with ScrollView stickyHeaderIndices */}
      {/* For simplicity we use a basic ScrollView standard structure here and let the header scroll away naturally, 
          but implement the 'turning into capsule' by manipulating a fixed header view on top if needed.
          
          Actually, let's use a standard pattern: ScrollView has a large empty space at top (padding), 
          and the Header is absolute positioned.
      */}
      
       <Animated.View style={[styles.fixedHeader, { height: headerHeight }]}>
          {renderHeader()}
       </Animated.View>

       {/* Back Button */}
       <TouchableOpacity style={[styles.backButton, { top: insets.top + 10 }]} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
       </TouchableOpacity>

      <ScrollView
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
        onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
         <View style={styles.body}>
            {renderTabs()}
            {activeTab === 'Stats' && renderStats()}
            {activeTab === 'Achievements' && renderAchievements()}
            {activeTab === 'AI' && renderAI()}
         </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.containerBackground,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 1,
    backgroundColor: colors.primary, // Fallback color
  },
  headerContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  gameTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  capsuleContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.primary, // Solid background when collapsed
    justifyContent: 'center', // Center title when collapsed? Or left align with back button space
    paddingLeft: 80, // Space for back button
  },
  capsuleImage: {
      width: 30,
      height: 30,
      borderRadius: 4,
      marginRight: 10,
  },
  capsuleTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#fff',
      flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  body: {
      backgroundColor: colors.containerBackground,
      minHeight: 500,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.inactive,
    backgroundColor: colors.surface,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTabItem: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.subtitle,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  statLabel: {
    color: colors.subtitle,
    fontSize: 16,
  },
  statValue: {
    color: colors.title,
    fontSize: 16,
    fontWeight: 'bold',
  },
  achievementsList: {
      padding: 10,
  },
  achievementItem: {
      flexDirection: 'row',
      marginBottom: 10,
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 10,
      alignItems: 'center',
  },
  achievementIcon: {
      width: 50,
      height: 50,
      borderRadius: 4,
      marginRight: 10,
  },
  achievementInfo: {
      flex: 1,
  },
  achievementName: {
      color: colors.title,
      fontWeight: 'bold',
      fontSize: 16,
  },
  achievementDescription: {
      color: colors.textFootnote,
      fontSize: 12,
  },
  achievementDate: {
      color: colors.primary,
      fontSize: 12,
      marginTop: 4,
  },
  lockedText: {
      color: colors.inactive,
      fontSize: 12,
      marginTop: 4,
      fontStyle: 'italic',
  },
  errorText: {
      color: colors.textError,
      textAlign: 'center',
      marginTop: 20,
  },
  emptyText: {
      color: colors.subtitle,
      textAlign: 'center',
      marginTop: 20,
  },
  stubText: {
      color: colors.subtitle,
      textAlign: 'center',
      marginTop: 40,
      fontStyle: 'italic',
  },
});

export default GameDetailsScreen;
