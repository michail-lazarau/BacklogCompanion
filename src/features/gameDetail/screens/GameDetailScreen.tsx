import { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import FastImage from '@d11/react-native-fast-image';
import { tokens } from '@res/tokens';
import { formatPlaytime } from '@shared/utils/formatPlaytime';
import { useGameDetail } from '../hooks/useGameDetail';
import { GameDetailSkeleton } from '../components/GameDetailSkeleton';
import { AchievementsSection } from '../components/AchievementsSection';
import type { GameDetailScreenProps } from '@navigation/types';

// Steam header images are 460×215 — use this ratio so the image fits exactly
// at screen width in portrait with no cropping.
const STEAM_HEADER_RATIO = 215 / 460;
const LANDSCAPE_HEADER_HEIGHT = 280;
const PARALLAX_RATIO = 0.4;

export const GameDetailScreen = ({ route, navigation }: GameDetailScreenProps) => {
  const { appId } = route.params;
  const { game, isPending } = useGameDetail(appId);
  const { width, height } = useWindowDimensions();
  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  // Portrait: fit the Steam header image (460×215) exactly at screen width — no cropping.
  // Landscape: fixed height (original behaviour) — image fills the wider screen naturally.
  const isLandscape = width > height;
  const headerHeight = isLandscape ? LANDSCAPE_HEADER_HEIGHT : width * STEAM_HEADER_RATIO;
  const parallaxBuffer = Math.ceil(headerHeight * PARALLAX_RATIO);
  const compactBarFadeStart = headerHeight - 60;
  const compactBarFadeEnd = headerHeight + 10;

  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * PARALLAX_RATIO }],
  }));

  const compactBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [compactBarFadeStart, compactBarFadeEnd],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  if (isPending) {
    return <GameDetailSkeleton />;
  }

  if (!game) {
    return (
      <SafeAreaView style={styles.root}>
        <TouchableOpacity testID="not-found-back-button" onPress={goBack}>
          <Text style={styles.notFoundBack}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.notFoundText}>Game not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      {/* Compact title bar — fades in as hero scrolls out of view */}
      <Animated.View style={[styles.compactBar, compactBarStyle]} pointerEvents="none">
        <SafeAreaView edges={['top']} style={styles.compactBarInner}>
          <Text testID="compact-title" style={styles.compactTitle} numberOfLines={1}>
            {game.name}
          </Text>
        </SafeAreaView>
      </Animated.View>

      {/* Back button — always on top */}
      <SafeAreaView style={styles.backButtonWrapper} edges={['top']} pointerEvents="box-none">
        <TouchableOpacity
          testID="back-button"
          onPress={goBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[styles.headerContainer, { height: headerHeight }, animatedImageStyle]}>
          <FastImage
            source={{ uri: game.headerImage ?? undefined, priority: FastImage.priority.high }}
            style={[styles.heroImage, { height: headerHeight + parallaxBuffer }]}
            resizeMode={FastImage.resizeMode.cover}
          />
        </Animated.View>

        <View style={styles.infoContainer}>
          <Text testID="game-title" style={styles.title}>{game.name}</Text>
          <Text style={styles.playtime}>{formatPlaytime(game.playtimeForever)}</Text>
          <View style={styles.achievementsContainer}>
            <AchievementsSection appId={appId} />
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.colors.surface900,
  },
  notFoundBack: {
    color: tokens.colors.primary,
    padding: tokens.spacing.md,
  },
  notFoundText: {
    color: tokens.colors.text100,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: tokens.spacing.xxl,
  },
  backButtonWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  backButton: {
    margin: tokens.spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(23, 26, 33, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: tokens.colors.text100,
    fontSize: tokens.fontSize.body,
    fontFamily: tokens.fontFamily.bold,
  },
  compactBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    backgroundColor: tokens.colors.surface900,
  },
  compactBarInner: {
    paddingHorizontal: tokens.spacing.xl,
    paddingBottom: tokens.spacing.sm,
    alignItems: 'center',
  },
  compactTitle: {
    fontSize: tokens.fontSize.body,
    fontFamily: tokens.fontFamily.bold,
    color: tokens.colors.text100,
  },
  headerContainer: {
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
  },
  infoContainer: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.fontSize.h1,
    fontFamily: tokens.fontFamily.bold,
    color: tokens.colors.text100,
    marginBottom: tokens.spacing.xs,
  },
  playtime: {
    fontSize: tokens.fontSize.caption,
    fontFamily: tokens.fontFamily.regular,
    color: tokens.colors.text300,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  achievementsContainer: {
    marginTop: tokens.spacing.lg,
  },
});
