import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '@res/tokens';
import { formatHltbTime } from '@shared/utils/hltbClient';

// Colors not in tokens — component-local constants per story spec
const COLOR_BLUE = '#66C0F4';   // no data / endless
const COLOR_GREEN = '#A3E635';  // < 10h
const COLOR_AMBER = '#FBBF24';  // 10–40h
const COLOR_RED = '#F87171';    // > 40h

const getOmniPillColor = (seconds: number): string => {
  const hours = seconds / 3600;
  if (hours === 0) return COLOR_BLUE;
  if (hours < 10) return COLOR_GREEN;
  if (hours <= 40) return COLOR_AMBER;
  return COLOR_RED;
};

export const OmniPill = ({ label, seconds }: { label: string; seconds: number }) => {
  const backgroundColor = getOmniPillColor(seconds);
  return (
    <View style={[styles.pill, { backgroundColor }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.time}>{formatHltbTime(seconds)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: 9999,
    paddingHorizontal: tokens.spacing.sm2,
    paddingVertical: tokens.spacing.xs,
    alignItems: 'center',
  },
  label: {
    fontSize: tokens.fontSize.caption,
    fontFamily: tokens.fontFamily.medium,
    color: '#000000',
    lineHeight: 14,
  },
  time: {
    fontSize: tokens.fontSize.caption,
    fontFamily: tokens.fontFamily.regular,
    color: '#000000',
    lineHeight: 14,
  },
});
