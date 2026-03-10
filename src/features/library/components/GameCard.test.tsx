import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GameCard } from './GameCard';
import type { SteamGame } from '@db/schema';

// @d11/react-native-fast-image is mocked by moduleNameMapper in jest.config.js

jest.mock('@db/schema', () => ({
  steamGames: {},
}));

const makeGame = (overrides: Partial<SteamGame> = {}): SteamGame => ({
  appId: 570,
  name: 'Dota 2',
  playtimeForever: 100,
  playtime2weeks: null,
  rtimeLastPlayed: 1700000000,
  imgIconUrl: 'abc123',
  headerImage: 'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
  hltbMain: null,
  hltbExtra: null,
  hltbComplete: null,
  lastSyncedAt: new Date(),
  hltbCachedAt: null,
  ...overrides,
});

describe('GameCard', () => {
  it('renders game title', () => {
    const { getByText } = render(<GameCard game={makeGame()} onPress={jest.fn()} />);
    expect(getByText('Dota 2')).toBeTruthy();
  });

  it('renders formatted playtime when playtime > 0', () => {
    const { getByText } = render(
      <GameCard game={makeGame({ playtimeForever: 120 })} onPress={jest.fn()} />,
    );
    expect(getByText('2 hrs')).toBeTruthy();
  });

  it('shows "Unplayed" badge when playtimeForever === 0', () => {
    const { getByText } = render(
      <GameCard game={makeGame({ playtimeForever: 0 })} onPress={jest.fn()} />,
    );
    expect(getByText(/Unplayed/i)).toBeTruthy();
  });

  it('hides "Unplayed" badge when playtimeForever > 0', () => {
    const { queryByText } = render(
      <GameCard game={makeGame({ playtimeForever: 60 })} onPress={jest.fn()} />,
    );
    expect(queryByText(/Unplayed/i)).toBeNull();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<GameCard game={makeGame()} onPress={onPress} />);
    fireEvent.press(getByTestId('game-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('truncates long titles to 3 lines', () => {
    const longTitle = 'A'.repeat(200);
    const { getByText } = render(
      <GameCard game={makeGame({ name: longTitle })} onPress={jest.fn()} />,
    );
    const titleElement = getByText(longTitle);
    expect(titleElement.props.numberOfLines).toBe(3);
  });
});
