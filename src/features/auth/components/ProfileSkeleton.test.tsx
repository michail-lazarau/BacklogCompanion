import React from 'react';
import { render } from '@testing-library/react-native';

// Extend Reanimated mock to include useReducedMotion (not in default mock).
// Use jest.requireActual with the direct src/mock path to avoid circular resolution
// via moduleNameMapper (which maps react-native-reanimated → mock.js → src/mock).
let mockReducedMotion = false;
jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/src/mock');
  return {
    ...Reanimated,
    useReducedMotion: () => mockReducedMotion,
  };
});

import { ProfileSkeleton } from './ProfileSkeleton';

describe('ProfileSkeleton', () => {
  beforeEach(() => {
    mockReducedMotion = false;
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<ProfileSkeleton />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders 3 placeholder shapes (avatar, name, level)', () => {
    const { getByTestId } = render(<ProfileSkeleton />);

    expect(getByTestId('skeleton-avatar')).toBeTruthy();
    expect(getByTestId('skeleton-name')).toBeTruthy();
    expect(getByTestId('skeleton-level')).toBeTruthy();
  });

  it('renders static placeholders without animation when reduced motion is enabled', () => {
    mockReducedMotion = true;

    const { getByTestId } = render(<ProfileSkeleton />);

    expect(getByTestId('skeleton-avatar')).toBeTruthy();
    expect(getByTestId('skeleton-name')).toBeTruthy();
    expect(getByTestId('skeleton-level')).toBeTruthy();
  });
});
