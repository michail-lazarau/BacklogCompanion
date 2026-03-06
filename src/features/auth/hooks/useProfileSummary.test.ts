import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import * as Keychain from 'react-native-keychain';
import { authReducer } from '@features/auth/store/authSlice';
import { useProfileSummary } from '@features/auth/hooks/useProfileSummary';
import type { SteamError } from '@shared/types/errors.types';

// Mock getPlayerSummaries — isolated
const mockGetPlayerSummaries = jest.fn();
jest.mock('../../../data/api/steam', () => ({
  getPlayerSummaries: (...args: unknown[]) => mockGetPlayerSummaries(...args),
}));

// Mock useSessionExpiry — isolated
const mockHandleSteamAuthError = jest.fn().mockResolvedValue(undefined);
jest.mock('@features/auth/hooks/useSessionExpiry', () => ({
  useSessionExpiry: () => ({
    handleSteamAuthError: mockHandleSteamAuthError,
  }),
}));

const STEAM_ID = '76561198002516729';
const VALID_API_KEY = 'ABCDEF1234567890ABCDEF1234567890';

const MOCK_PLAYER = {
  steamid: STEAM_ID,
  personaname: 'TestUser',
  avatarfull: 'https://example.com/avatar.jpg',
};

const createWrapper = (steamId: string | null = STEAM_ID) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { isAuthenticated: true, steamId } },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      Provider,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { store } as any,
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        children,
      ),
    );
  return { store, queryClient, wrapper };
};

describe('useProfileSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls getGenericPassword then getPlayerSummaries when steamId is valid', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce({
      username: 'steam',
      password: VALID_API_KEY,
    });
    mockGetPlayerSummaries.mockResolvedValueOnce({
      response: { players: [MOCK_PLAYER] },
    });

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfileSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(Keychain.getGenericPassword).toHaveBeenCalledWith({
      service: 'steam_api_key',
    });
    expect(mockGetPlayerSummaries).toHaveBeenCalledWith(VALID_API_KEY, STEAM_ID);
    expect(result.current.data).toEqual(MOCK_PLAYER);
  });

  it('query is disabled (does not fire) when steamId is null', async () => {
    const { wrapper } = createWrapper(null);
    const { result } = renderHook(() => useProfileSummary(), { wrapper });

    // Query is disabled — should stay in idle/pending with no fetching
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));

    expect(Keychain.getGenericPassword).not.toHaveBeenCalled();
    expect(mockGetPlayerSummaries).not.toHaveBeenCalled();
  });

  it('on UNAUTHORIZED SteamError → handleSteamAuthError is called, isError is true', async () => {
    const steamError: SteamError = {
      type: 'SteamError',
      code: 'UNAUTHORIZED',
      message: 'Steam API returned 401',
    };
    // Use persistent mocks so retries also fail — hook has retry: 1
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
      username: 'steam',
      password: VALID_API_KEY,
    });
    mockGetPlayerSummaries.mockRejectedValue(steamError);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfileSummary(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });

    expect(mockHandleSteamAuthError).toHaveBeenCalledWith(steamError);
  });

  it('on non-auth error → isError is true, handleSteamAuthError NOT called', async () => {
    // Use persistent mock (not Once) so retries also fail — hook has retry: 1
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
      username: 'steam',
      password: VALID_API_KEY,
    });
    mockGetPlayerSummaries.mockRejectedValue(new Error('Network failure'));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfileSummary(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });

    expect(mockHandleSteamAuthError).not.toHaveBeenCalled();
  });

  it('returns null when no API key in Keychain', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValueOnce(false);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProfileSummary(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockGetPlayerSummaries).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });
});
