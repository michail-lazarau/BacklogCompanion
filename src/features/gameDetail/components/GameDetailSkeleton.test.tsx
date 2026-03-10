import React from 'react';
import { render } from '@testing-library/react-native';

let mockIsReducedMotion = false;

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/src/mock'),
  useReducedMotion: () => mockIsReducedMotion,
}));

import { GameDetailSkeleton } from './GameDetailSkeleton';

describe('GameDetailSkeleton', () => {
  beforeEach(() => {
    mockIsReducedMotion = false;
  });

  it('renders hero, title, and playtime skeleton bones', () => {
    const { getByTestId } = render(<GameDetailSkeleton />);
    expect(getByTestId('skeleton-hero')).toBeTruthy();
    expect(getByTestId('skeleton-title')).toBeTruthy();
    expect(getByTestId('skeleton-playtime')).toBeTruthy();
  });

  it('renders correctly with reduced motion enabled', () => {
    mockIsReducedMotion = true;
    const { getByTestId } = render(<GameDetailSkeleton />);
    expect(getByTestId('skeleton-hero')).toBeTruthy();
    expect(getByTestId('skeleton-title')).toBeTruthy();
  });
});
