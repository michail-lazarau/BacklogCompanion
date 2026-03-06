import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileScreen } from './ProfileScreen';

// Mock useProfileSummary — isolate from TanStack Query and network
const mockRefetch = jest.fn();
const mockQueryState = {
  data: undefined as { personaname: string; avatarfull: string; steamid: string } | null | undefined,
  isLoading: false,
  isError: false,
  refetch: mockRefetch,
};

jest.mock('@features/auth/hooks/useProfileSummary', () => ({
  useProfileSummary: () => mockQueryState,
}));

// Mock ProfileSkeleton — verify it is rendered; avoid animation in tests
jest.mock('@features/auth/components/ProfileSkeleton', () => ({
  ProfileSkeleton: () => {
    const { View } = require('react-native');
    return require('react').createElement(View, { testID: 'profile-skeleton' });
  },
}));

const MOCK_PLAYER = {
  steamid: '76561198002516729',
  personaname: 'SteamUser42',
  avatarfull: 'https://example.com/avatar_full.jpg',
};

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryState.data = undefined;
    mockQueryState.isLoading = false;
    mockQueryState.isError = false;
    mockQueryState.refetch = mockRefetch;
  });

  it('renders ProfileSkeleton while loading', () => {
    mockQueryState.isLoading = true;

    const { getByTestId } = render(<ProfileScreen />);

    expect(getByTestId('profile-skeleton')).toBeTruthy();
  });

  it('renders persona name and avatar when data is loaded', () => {
    mockQueryState.data = MOCK_PLAYER;

    const { getByText, getByTestId } = render(<ProfileScreen />);

    expect(getByText('SteamUser42')).toBeTruthy();
    expect(getByTestId('profile-avatar')).toBeTruthy();
  });

  it('renders empty state and Retry button when isError and no cache', () => {
    mockQueryState.isError = true;
    mockQueryState.data = undefined;

    const { getByText } = render(<ProfileScreen />);

    expect(getByText("Couldn't load profile.")).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('Retry button calls refetch', () => {
    mockQueryState.isError = true;
    mockQueryState.data = undefined;

    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText('Retry'));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders unavailable message and Retry button when data is null and no error', () => {
    mockQueryState.data = null;
    mockQueryState.isError = false;

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Profile data unavailable.')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('Retry button in unavailable state calls refetch', () => {
    mockQueryState.data = null;
    mockQueryState.isError = false;

    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText('Retry'));

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders offline indicator text when data is stale and isError is true', () => {
    mockQueryState.data = MOCK_PLAYER;
    mockQueryState.isError = true;

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('SteamUser42')).toBeTruthy();
    expect(getByText('Showing cached data — offline')).toBeTruthy();
  });
});
