import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import * as Keychain from 'react-native-keychain';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@features/auth/store/authSlice';
import { useApiKeySetup } from '@features/auth/hooks/useApiKeySetup';
import type { SteamError } from '@shared/types/errors.types';

// Mock getPlayerSummaries — tested in isolation
const mockGetPlayerSummaries = jest.fn();
jest.mock('../../../data/api/steam', () => ({
  getPlayerSummaries: (...args: unknown[]) => mockGetPlayerSummaries(...args),
}));

// Mock useSessionExpiry — isolate from its internals
const mockHandleSteamAuthError = jest.fn().mockResolvedValue(undefined);
jest.mock('@features/auth/hooks/useSessionExpiry', () => ({
  useSessionExpiry: () => ({
    handleSteamAuthError: mockHandleSteamAuthError,
  }),
}));

const STEAM_ID = '76561198002516729';
const VALID_API_KEY = 'ABCDEF1234567890ABCDEF1234567890';

const createWrapper = (steamId: string | null = STEAM_ID) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { isAuthenticated: true, steamId } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(Provider, { store, children } as any);
  return { store, wrapper };
};

describe('useApiKeySetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAndSaveApiKey', () => {
    it('valid key triggers GetPlayerSummaries, stores in Keychain, returns true, no error', async () => {
      mockGetPlayerSummaries.mockResolvedValueOnce({
        response: { players: [{ steamid: STEAM_ID, personaname: 'TestUser', avatarfull: '' }] },
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useApiKeySetup(), { wrapper });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.validateAndSaveApiKey(VALID_API_KEY);
      });

      expect(mockGetPlayerSummaries).toHaveBeenCalledWith(VALID_API_KEY, STEAM_ID);
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith('steam', VALID_API_KEY, {
        service: 'steam_api_key',
      });
      expect(success).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('empty key → inline error set, no API call, no Keychain write, returns false', async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useApiKeySetup(), { wrapper });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.validateAndSaveApiKey('');
      });

      expect(mockGetPlayerSummaries).not.toHaveBeenCalled();
      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
      expect(success).toBe(false);
      expect(result.current.error).toBe('Please enter your API key');
    });

    it('whitespace-only key → inline error, no API call, no Keychain write', async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useApiKeySetup(), { wrapper });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.validateAndSaveApiKey('   ');
      });

      expect(mockGetPlayerSummaries).not.toHaveBeenCalled();
      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
      expect(success).toBe(false);
      expect(result.current.error).toBe('Please enter your API key');
    });

    it('API returns 400 (generic error) → inline error, no Keychain write, returns false', async () => {
      mockGetPlayerSummaries.mockRejectedValueOnce(new Error('Steam API error: 400'));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useApiKeySetup(), { wrapper });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.validateAndSaveApiKey(VALID_API_KEY);
      });

      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
      expect(success).toBe(false);
      expect(result.current.error).toBe('Invalid API key. Please check and try again.');
    });

    it('401/403 from API → handleSteamAuthError called, no Keychain write, returns false', async () => {
      const steamError: SteamError = {
        type: 'SteamError',
        code: 'UNAUTHORIZED',
        message: 'Steam API returned 401',
      };
      mockGetPlayerSummaries.mockRejectedValueOnce(steamError);

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useApiKeySetup(), { wrapper });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.validateAndSaveApiKey(VALID_API_KEY);
      });

      expect(mockHandleSteamAuthError).toHaveBeenCalledWith(steamError);
      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
      expect(success).toBe(false);
    });

    it('valid key with empty players array (private profile) → stored in Keychain, returns true', async () => {
      mockGetPlayerSummaries.mockResolvedValueOnce({
        response: { players: [] },
      });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useApiKeySetup(), { wrapper });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.validateAndSaveApiKey(VALID_API_KEY);
      });

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith('steam', VALID_API_KEY, {
        service: 'steam_api_key',
      });
      expect(success).toBe(true);
    });

    it('isLoading is false after completion', async () => {
      mockGetPlayerSummaries.mockResolvedValueOnce({ response: { players: [] } });

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useApiKeySetup(), { wrapper });

      await act(async () => {
        await result.current.validateAndSaveApiKey(VALID_API_KEY);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('null steamId → inline error set, no API call, no Keychain write, returns false', async () => {
      const { wrapper } = createWrapper(null);
      const { result } = renderHook(() => useApiKeySetup(), { wrapper });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.validateAndSaveApiKey(VALID_API_KEY);
      });

      expect(mockGetPlayerSummaries).not.toHaveBeenCalled();
      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
      expect(success).toBe(false);
      expect(result.current.error).toBe('Could not read Steam ID. Please sign in again.');
    });

    it('Keychain write failure → shows storage error, returns false', async () => {
      mockGetPlayerSummaries.mockResolvedValueOnce({ response: { players: [] } });
      (Keychain.setGenericPassword as jest.Mock).mockRejectedValueOnce(new Error('Keychain locked'));

      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useApiKeySetup(), { wrapper });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.validateAndSaveApiKey(VALID_API_KEY);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Could not save API key. Please try again.');
      expect(result.current.isLoading).toBe(false);
    });
  });
});
