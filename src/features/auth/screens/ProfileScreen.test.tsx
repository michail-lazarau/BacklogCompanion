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

// Mock useLogout — isolate from hook internals
const mockInitiateLogout = jest.fn();
jest.mock('@features/auth/hooks/useLogout', () => ({
  useLogout: () => ({ initiateLogout: mockInitiateLogout }),
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
    mockInitiateLogout.mockReset();
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

  it('renders Sign Out button when profile data is loaded', () => {
    mockQueryState.data = MOCK_PLAYER;

    const { getByText } = render(<ProfileScreen />);

    expect(getByText('Sign Out')).toBeTruthy();
  });

  it('tapping Sign Out calls initiateLogout', () => {
    mockQueryState.data = MOCK_PLAYER;

    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText('Sign Out'));

    expect(mockInitiateLogout).toHaveBeenCalledTimes(1);
  });

  it('does NOT render Sign Out button in loading state', () => {
    mockQueryState.isLoading = true;

    const { queryByText } = render(<ProfileScreen />);

    expect(queryByText('Sign Out')).toBeNull();
  });

  it('does NOT render Sign Out button in error-no-data state', () => {
    mockQueryState.isError = true;
    mockQueryState.data = undefined;

    const { queryByText } = render(<ProfileScreen />);

    expect(queryByText('Sign Out')).toBeNull();
  });

  it('does NOT render Sign Out button when data is null (unavailable state)', () => {
    mockQueryState.data = null;
    mockQueryState.isError = false;

    const { queryByText } = render(<ProfileScreen />);

    expect(queryByText('Sign Out')).toBeNull();
  });
});
