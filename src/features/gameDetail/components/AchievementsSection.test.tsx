import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { MergedAchievement } from '../hooks/useAchievements';

let mockIsReducedMotion = false;

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/src/mock'),
  useReducedMotion: () => mockIsReducedMotion,
}));

jest.mock('../hooks/useAchievements');

import { useAchievements } from '../hooks/useAchievements';
import { AchievementsSection } from './AchievementsSection';

const mockUseAchievements = useAchievements as jest.MockedFunction<typeof useAchievements>;

const makeAchievement = (overrides: Partial<MergedAchievement> = {}): MergedAchievement => ({
  apiname: 'ACH_1',
  displayName: 'Test Achievement',
  icon: 'https://icon.url/1.jpg',
  icongray: 'https://icon.url/1g.jpg',
  achieved: true,
  unlocktime: 1700000000,
  hidden: false,
  ...overrides,
});

const makeAchievements = (count: number, achievedCount: number = count): MergedAchievement[] =>
  Array.from({ length: count }, (_, i) => makeAchievement({
    apiname: `ACH_${i + 1}`,
    displayName: `Achievement ${i + 1}`,
    achieved: i < achievedCount,
    unlocktime: i < achievedCount ? 1700000000 - i * 1000 : 0,
  }));

describe('AchievementsSection', () => {
  beforeEach(() => {
    mockIsReducedMotion = false;
    mockUseAchievements.mockReturnValue({
      achievements: [],
      totalCount: 0,
      unlockedCount: 0,
      isPending: false,
      isError: false,
    });
  });

  it('renders skeleton when isPending', () => {
    mockUseAchievements.mockReturnValue({
      achievements: [],
      totalCount: 0,
      unlockedCount: 0,
      isPending: true,
      isError: false,
    });

    const { getByTestId } = render(<AchievementsSection appId={570} />);
    expect(getByTestId('achievements-skeleton')).toBeTruthy();
  });

  it('renders "No achievements available" when achievements array is empty', () => {
    mockUseAchievements.mockReturnValue({
      achievements: [],
      totalCount: 0,
      unlockedCount: 0,
      isPending: false,
      isError: false,
    });

    const { getByTestId, getByText } = render(<AchievementsSection appId={570} />);
    expect(getByTestId('achievements-empty')).toBeTruthy();
    expect(getByText('No achievements available')).toBeTruthy();
  });

  it('renders progress summary "N / M unlocked" when data is available', () => {
    const achievements = makeAchievements(50, 15);
    mockUseAchievements.mockReturnValue({
      achievements,
      totalCount: 50,
      unlockedCount: 15,
      isPending: false,
      isError: false,
    });

    const { getByText } = render(<AchievementsSection appId={570} />);
    expect(getByText('15 / 50 unlocked')).toBeTruthy();
  });

  it('renders locked achievements with dimmed style (opacity: 0.5)', () => {
    const lockedAchievement = makeAchievement({ apiname: 'ACH_LOCKED', achieved: false, unlocktime: 0 });
    mockUseAchievements.mockReturnValue({
      achievements: [lockedAchievement],
      totalCount: 1,
      unlockedCount: 0,
      isPending: false,
      isError: false,
    });

    const { getByTestId, getByText } = render(<AchievementsSection appId={570} />);
    const row = getByTestId('achievement-row-ACH_LOCKED');
    expect(row.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 0.5 })]),
    );
    expect(getByText('Locked')).toBeTruthy();
  });

  it('"Show all" button does not appear when <= 6 achievements', () => {
    const achievements = makeAchievements(6);
    mockUseAchievements.mockReturnValue({
      achievements,
      totalCount: 6,
      unlockedCount: 6,
      isPending: false,
      isError: false,
    });

    const { queryByTestId } = render(<AchievementsSection appId={570} />);
    expect(queryByTestId('show-all-button')).toBeNull();
  });

  it('"Show all" button appears when > 6 achievements; tap expands list', () => {
    const achievements = makeAchievements(10);
    mockUseAchievements.mockReturnValue({
      achievements,
      totalCount: 10,
      unlockedCount: 10,
      isPending: false,
      isError: false,
    });

    const { getByTestId, getByText, queryByTestId } = render(<AchievementsSection appId={570} />);

    // Initially only 6 shown, button visible
    const showAllButton = getByTestId('show-all-button');
    expect(getByText('Show all (10)')).toBeTruthy();
    expect(queryByTestId('achievement-row-ACH_7')).toBeNull();

    // Tap to expand
    fireEvent.press(showAllButton);
    expect(getByTestId('achievement-row-ACH_7')).toBeTruthy();
    expect(getByText('Show less')).toBeTruthy();
  });
});
