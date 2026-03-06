import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@res/tokens';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

export const ProfileSkeleton = () => {
  const opacity = useSharedValue(0.3);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 600 }),
          withTiming(0.3, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      opacity.value = 0.5;
    }
  }, [opacity, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className="flex-1 bg-surface-900 items-center pt-12">
      <Animated.View
        testID="skeleton-avatar"
        style={[styles.avatarPlaceholder, animStyle]}
      />
      <Animated.View
        testID="skeleton-name"
        style={[styles.namePlaceholder, animStyle]}
      />
      <Animated.View
        testID="skeleton-level"
        style={[styles.levelPlaceholder, animStyle]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.surface800,
  },
  namePlaceholder: {
    width: 160,
    height: 24,
    borderRadius: 8,
    backgroundColor: tokens.colors.surface800,
    marginTop: 16,
  },
  levelPlaceholder: {
    width: 80,
    height: 16,
    borderRadius: 8,
    backgroundColor: tokens.colors.surface800,
    marginTop: 8,
  },
});
