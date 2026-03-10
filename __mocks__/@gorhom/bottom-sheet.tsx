// Mock for @gorhom/bottom-sheet
// Renders children when index >= 0, renders null when index === -1
// Calls onChange(-1) synchronously when index is -1 to simulate pan-down dismiss
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';

const BottomSheet = ({
  children,
  index,
  onChange,
}: {
  children: React.ReactNode;
  index: number;
  onChange?: (index: number) => void;
}) => {
  const prevIndexRef = useRef(index);

  useEffect(() => {
    if (index === -1 && prevIndexRef.current !== -1 && onChange) {
      onChange(-1);
    }
    prevIndexRef.current = index;
  }, [index, onChange]);

  if (index === -1) return null;
  return <View testID="bottom-sheet">{children}</View>;
};

export const BottomSheetView = ({
  children,
}: {
  children: React.ReactNode;
}) => <View testID="bottom-sheet-view">{children}</View>;

export const BottomSheetScrollView = ({
  children,
}: {
  children: React.ReactNode;
}) => <View testID="bottom-sheet-scroll-view">{children}</View>;

export default BottomSheet;
