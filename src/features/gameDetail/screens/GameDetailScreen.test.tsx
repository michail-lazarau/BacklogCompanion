import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/src/mock'),
  useReducedMotion: () => false,
}));

jest.mock('../hooks/useGameDetail');
jest.mock('../components/GameDetailSkeleton', () => ({
  GameDetailSkeleton: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return jest.requireActual<typeof import('react')>('react').createElement(View, { testID: 'game-detail-skeleton' });
  },
}));
jest.mock('../components/AchievementsSection', () => ({
  AchievementsSection: () => null,
}));

import { useGameDetail } from '../hooks/useGameDetail';
import { GameDetailScreen } from './GameDetailScreen';

const mockUseGameDetail = useGameDetail as jest.MockedFunction<typeof useGameDetail>;

const mockNavigation = { goBack: jest.fn(), push: jest.fn() } as any;
const mockRoute = {
  params: { appId: 570 },
  key: 'GameDetail-1',
  name: 'GameDetail' as const,
} as any;

const renderScreen = () =>
  render(<GameDetailScreen route={mockRoute} navigation={mockNavigation} />);

const makeGame = (appId: number) => ({
  appId,
  name: `Game ${appId}`,
  playtimeForever: 120,
  playtime2weeks: null,
  rtimeLastPlayed: 1700000000,
  imgIconUrl: 'abc123',
  headerImage: `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
  hltbMain: null,
  hltbExtra: null,
  hltbComplete: null,
  hltbCachedAt: null,
  lastSyncedAt: new Date(),
});

describe('GameDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders game title when data is available', () => {
    mockUseGameDetail.mockReturnValue({
      game: makeGame(570),
      isPending: false,
      isError: false,
    });

    const { getByTestId } = renderScreen();
    expect(getByTestId('game-title').props.children).toBe('Game 570');
  });

  it('renders skeleton when isPending', () => {
    mockUseGameDetail.mockReturnValue({
      game: undefined,
      isPending: true,
      isError: false,
    });

    const { getByTestId } = renderScreen();
    expect(getByTestId('game-detail-skeleton')).toBeTruthy();
  });

  it('back button calls navigation.goBack', () => {
    mockUseGameDetail.mockReturnValue({
      game: makeGame(570),
      isPending: false,
      isError: false,
    });

    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('back-button'));
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('renders "Game not found" when game is null and not pending', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseGameDetail.mockReturnValue({ game: null as any, isPending: false, isError: false });

    const { getByText } = renderScreen();
    expect(getByText('Game not found.')).toBeTruthy();
  });

  it('not-found back button calls navigation.goBack', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseGameDetail.mockReturnValue({ game: null as any, isPending: false, isError: false });

    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('not-found-back-button'));
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('renders compact title bar with game name', () => {
    mockUseGameDetail.mockReturnValue({
      game: makeGame(570),
      isPending: false,
      isError: false,
    });

    const { getByTestId } = renderScreen();
    expect(getByTestId('compact-title').props.children).toBe('Game 570');
  });
});
