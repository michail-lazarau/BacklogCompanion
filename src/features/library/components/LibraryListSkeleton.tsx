import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

export const LibraryListSkeleton = () => {
  const opacity = useSharedValue(0.4);
  const isReducedMotion = useReducedMotion();

  // Respect prefers-reduced-motion accessibility preference
  // Use useEffect to avoid mutating shared value during render phase
  useEffect(() => {
    if (!isReducedMotion) {
      opacity.value = withRepeat(
        withSequence(withTiming(0.8, { duration: 800 }), withTiming(0.4, { duration: 800 })),
        -1, // infinite
      );
    }
  }, [isReducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <>
      {[...Array(5)].map((_, i) => (
        <Animated.View
          key={i}
          testID="skeleton-row"
          style={animatedStyle}
          className="flex-row items-center px-4 py-3 border-b border-surface-800"
        >
          <View className="w-16 h-16 rounded bg-surface-800 mr-3" />
          <View className="flex-1">
            <View className="h-4 bg-surface-800 rounded mb-2 w-3/4" />
            <View className="h-3 bg-surface-800 rounded w-1/4" />
          </View>
        </Animated.View>
      ))}
    </>
  );
};
