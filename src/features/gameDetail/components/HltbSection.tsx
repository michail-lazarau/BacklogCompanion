import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { tokens } from '@res/tokens';
import { OmniPill } from '@shared/components/OmniPill';
import { useHltbData } from '../hooks/useHltbData';

// Skeleton pill approximates OmniPill rendered size:
// width ≈ sm2 padding (12) * 2 + text (~48) = 72
// height ≈ xs padding (4) * 2 + two caption lines (14 * 2) + gap ≈ 40
const SKELETON_PILL_WIDTH = 72;
const SKELETON_PILL_HEIGHT = 40;

const HltbSkeleton = () => {
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
    <View testID="hltb-skeleton" style={styles.pillRow}>
      {[0, 1, 2].map((i) => (
        <Animated.View key={i} style={[styles.skeletonPill, animatedStyle]} />
      ))}
    </View>
  );
};

export const HltbSection = ({
  appId,
  gameName,
}: {
  appId: number;
  gameName: string | undefined;
}) => {
  const { hltbData, isPending, isError } = useHltbData(appId, gameName);

  if (isPending) {
    return <HltbSkeleton />;
  }

  if (isError || !hltbData) {
    return (
      <View testID="hltb-error">
        <Text style={styles.sectionLabel}>How Long To Beat</Text>
        <View style={styles.pillRow}>
          <OmniPill label="Main" seconds={0} />
          <OmniPill label="Main+" seconds={0} />
          <OmniPill label="100%" seconds={0} />
        </View>
      </View>
    );
  }

  return (
    <View testID="hltb-section">
      <Text style={styles.sectionLabel}>How Long To Beat</Text>
      <View style={styles.pillRow}>
        <OmniPill label="Main" seconds={hltbData.main} />
        <OmniPill label="Main+" seconds={hltbData.extra} />
        <OmniPill label="100%" seconds={hltbData.complete} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: tokens.fontSize.h2,
    fontFamily: tokens.fontFamily.bold,
    color: tokens.colors.text100,
    marginBottom: tokens.spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  skeletonPill: {
    width: SKELETON_PILL_WIDTH,
    height: SKELETON_PILL_HEIGHT,
    borderRadius: 9999,
    backgroundColor: tokens.colors.surface800,
  },
});
