import { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useAppDispatch, useAppSelector } from '@shared/hooks/reduxHooks';
import { setActiveFilter, setActiveSort } from '../store/librarySlice';
import type { FilterOption, SortOption } from '../store/librarySlice';
import { tokens } from '@res/tokens';

interface FilterSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const FILTER_OPTIONS: { label: string; value: FilterOption | null }[] = [
  { label: 'All', value: null },
  { label: 'Unplayed', value: 'unplayed' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Alphabetical', value: 'alphabetical' },
  { label: 'Playtime ↑', value: 'playtime_asc' },
  { label: 'Playtime ↓', value: 'playtime_desc' },
  { label: 'Last Played', value: 'timeLastPlayed' },
];

export const FilterSheet = ({ isVisible, onClose }: FilterSheetProps) => {
  const dispatch = useAppDispatch();
  const activeFilter = useAppSelector((state) => state.library.activeFilter);
  const activeSort = useAppSelector((state) => state.library.activeSort);
  const snapPoints = useMemo(() => ['50%'], []);

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose],
  );

  return (
    <BottomSheet
      index={isVisible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleChange}
      backgroundStyle={{ backgroundColor: tokens.colors.surface800 }}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: tokens.spacing.md, paddingTop: tokens.spacing.sm }}>
        {/* Filter section */}
        <Text
          style={{
            color: tokens.colors.text300,
            fontSize: tokens.fontSize.caption,
            fontFamily: tokens.fontFamily.medium,
            marginBottom: tokens.spacing.sm,
          }}
        >
          FILTER
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg }}>
          {FILTER_OPTIONS.map((opt) => {
            const isActive = activeFilter === opt.value;
            return (
              <TouchableOpacity
                key={opt.value ?? 'all'}
                testID={`filter-option-${opt.value ?? 'all'}`}
                onPress={() => dispatch(setActiveFilter(opt.value))}
                style={{
                  paddingHorizontal: tokens.spacing.md,
                  paddingVertical: tokens.spacing.sm,
                  borderRadius: 9999,
                  backgroundColor: isActive ? tokens.colors.primary : tokens.colors.surface900,
                }}
              >
                <Text
                  style={{
                    color: isActive ? tokens.colors.surface900 : tokens.colors.text300,
                    fontSize: tokens.fontSize.caption,
                    fontFamily: tokens.fontFamily.medium,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sort section */}
        <Text
          style={{
            color: tokens.colors.text300,
            fontSize: tokens.fontSize.caption,
            fontFamily: tokens.fontFamily.medium,
            marginBottom: tokens.spacing.sm,
          }}
        >
          SORT
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
          {SORT_OPTIONS.map((opt) => {
            const isActive = activeSort === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                testID={`sort-option-${opt.value}`}
                onPress={() => dispatch(setActiveSort(opt.value))}
                style={{
                  paddingHorizontal: tokens.spacing.md,
                  paddingVertical: tokens.spacing.sm,
                  borderRadius: 9999,
                  backgroundColor: isActive ? tokens.colors.primary : tokens.colors.surface900,
                }}
              >
                <Text
                  style={{
                    color: isActive ? tokens.colors.surface900 : tokens.colors.text300,
                    fontSize: tokens.fontSize.caption,
                    fontFamily: tokens.fontFamily.medium,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};
