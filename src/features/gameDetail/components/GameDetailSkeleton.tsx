import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { tokens } from '@res/tokens';

export const GameDetailSkeleton = () => {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withRepeat(
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [reducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View testID="skeleton-hero" style={[styles.heroBone, animatedStyle]} />
      <View style={styles.infoContainer}>
        <Animated.View testID="skeleton-title" style={[styles.titleBone, animatedStyle]} />
        <Animated.View testID="skeleton-playtime" style={[styles.playtimeBone, animatedStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.surface900,
  },
  heroBone: {
    height: 280,
    backgroundColor: tokens.colors.surface800,
  },
  infoContainer: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
  },
  titleBone: {
    height: 36,
    borderRadius: tokens.borderRadius.sm,
    backgroundColor: tokens.colors.surface800,
    marginBottom: tokens.spacing.sm,
    width: '70%',
  },
  playtimeBone: {
    height: 16,
    borderRadius: tokens.borderRadius.xs,
    backgroundColor: tokens.colors.surface800,
    width: '30%',
  },
});
