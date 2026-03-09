import React from 'react';
import { render } from '@testing-library/react-native';

let mockIsReducedMotion = false;

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/src/mock'),
  useReducedMotion: () => mockIsReducedMotion,
}));

import { LibraryListSkeleton } from './LibraryListSkeleton';

describe('LibraryListSkeleton', () => {
  beforeEach(() => {
    mockIsReducedMotion = false;
  });

  it('renders 5 skeleton rows', () => {
    const { getAllByTestId } = render(<LibraryListSkeleton />);
    expect(getAllByTestId('skeleton-row')).toHaveLength(5);
  });

  it('renders skeleton rows when reduced motion is enabled (no animation)', () => {
    mockIsReducedMotion = true;
    const { getAllByTestId } = render(<LibraryListSkeleton />);
    expect(getAllByTestId('skeleton-row')).toHaveLength(5);
  });
});
