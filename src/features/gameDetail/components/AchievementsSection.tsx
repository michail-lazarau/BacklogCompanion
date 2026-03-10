import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import FastImage from '@d11/react-native-fast-image';
import { tokens } from '@res/tokens';
import { useAchievements } from '../hooks/useAchievements';
import type { MergedAchievement } from '../hooks/useAchievements';

const INITIAL_SHOW_COUNT = 6;

const AchievementSkeleton = () => {
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
    <View testID="achievements-skeleton">
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.skeletonRow}>
          <Animated.View style={[styles.skeletonIcon, animatedStyle]} />
          <View style={styles.skeletonTextContainer}>
            <Animated.View style={[styles.skeletonTextPrimary, animatedStyle]} />
            <Animated.View style={[styles.skeletonTextSecondary, animatedStyle]} />
          </View>
        </View>
      ))}
    </View>
  );
};

const AchievementRow = ({ achievement }: { achievement: MergedAchievement }) => {
  const unlockDate = achievement.achieved
    ? new Date(achievement.unlocktime * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Locked';

  return (
    <View
      testID={`achievement-row-${achievement.apiname}`}
      style={[styles.achievementRow, !achievement.achieved && styles.achievementRowLocked]}
    >
      <FastImage
        source={{ uri: achievement.achieved ? achievement.icon : achievement.icongray }}
        style={styles.achievementIcon}
        resizeMode={FastImage.resizeMode.cover}
      />
      <View style={styles.achievementInfo}>
        <Text style={styles.achievementName}>{achievement.displayName}</Text>
        <Text style={styles.achievementDate}>{unlockDate}</Text>
      </View>
    </View>
  );
};

export const AchievementsSection = ({ appId }: { appId: number }) => {
  const { achievements, totalCount, unlockedCount, isPending } = useAchievements(appId);
  const [showAll, setShowAll] = useState(false);

  if (isPending) {
    return <AchievementSkeleton />;
  }

  if (totalCount === 0) {
    return (
      <View testID="achievements-empty" style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No achievements available</Text>
      </View>
    );
  }

  const percentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;
  const visibleAchievements = showAll ? achievements : achievements.slice(0, INITIAL_SHOW_COUNT);
  const hasMore = totalCount > INITIAL_SHOW_COUNT;

  return (
    <View testID="achievements-section">
      <Text style={styles.sectionLabel}>Achievements</Text>

      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>{`${unlockedCount} / ${totalCount} unlocked`}</Text>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
        </View>
      </View>

      {visibleAchievements.map((achievement) => (
        <AchievementRow key={achievement.apiname} achievement={achievement} />
      ))}

      {hasMore && (
        <TouchableOpacity
          testID="show-all-button"
          onPress={() => setShowAll(prev => !prev)}
          style={styles.showMoreButton}
        >
          <Text style={styles.showMoreText}>
            {showAll ? 'Show less' : `Show all (${totalCount})`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
  },
  emptyText: {
    fontSize: tokens.fontSize.caption,
    fontFamily: tokens.fontFamily.regular,
    color: tokens.colors.text300,
  },
  sectionLabel: {
    fontSize: tokens.fontSize.h2,
    fontFamily: tokens.fontFamily.bold,
    color: tokens.colors.text100,
    marginBottom: tokens.spacing.sm,
  },
  progressHeader: {
    marginBottom: tokens.spacing.sm,
  },
  progressText: {
    fontSize: tokens.fontSize.caption,
    fontFamily: tokens.fontFamily.regular,
    color: tokens.colors.text300,
    marginBottom: tokens.spacing.xs,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: tokens.borderRadius.xs,
    backgroundColor: tokens.colors.surface800,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: tokens.borderRadius.xs,
    backgroundColor: tokens.colors.primary,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  achievementRowLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: tokens.borderRadius.xs,
    marginRight: tokens.spacing.sm,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: tokens.fontSize.body,
    fontFamily: tokens.fontFamily.medium,
    color: tokens.colors.text100,
    marginBottom: tokens.spacing.xxs,
  },
  achievementDate: {
    fontSize: tokens.fontSize.caption,
    fontFamily: tokens.fontFamily.regular,
    color: tokens.colors.text300,
  },
  showMoreButton: {
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: tokens.fontSize.caption,
    fontFamily: tokens.fontFamily.medium,
    color: tokens.colors.primary,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: tokens.borderRadius.xs,
    backgroundColor: tokens.colors.surface800,
    marginRight: tokens.spacing.sm,
  },
  skeletonTextContainer: {
    flex: 1,
  },
  skeletonTextPrimary: {
    height: 14,
    borderRadius: tokens.borderRadius.xs,
    backgroundColor: tokens.colors.surface800,
    width: '60%',
    marginBottom: tokens.spacing.xxs,
  },
  skeletonTextSecondary: {
    height: 12,
    borderRadius: tokens.borderRadius.xs,
    backgroundColor: tokens.colors.surface800,
    width: '35%',
  },
});
