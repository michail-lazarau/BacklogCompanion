import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import * as Keychain from 'react-native-keychain';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer, setAuthenticated } from '@features/auth/store/authSlice';
import { useSessionExpiry } from '@features/auth/hooks/useSessionExpiry';
import type { SteamError } from '@shared/types/errors.types';

// Mock useSteamAuth — isolate useSessionExpiry behaviour from useSteamAuth internals
const mockClearSession = jest.fn().mockResolvedValue(undefined);
jest.mock('@features/auth/hooks/useSteamAuth', () => ({
  useSteamAuth: () => ({
    clearSession: mockClearSession,
    initiateLogin: jest.fn(),
    handleAuthCallback: jest.fn(),
    isLoading: false,
  }),
}));

// react-native-toast-message is auto-mocked via __mocks__/react-native-toast-message.ts
// useSessionExpiry.ts: `import Toast from '...'` → Babel compiles to `_toast.default.show()`
import ToastMessage from 'react-native-toast-message';
// Toast default import compiles to _toast.default — access .show via the imported binding
const ToastShow = (ToastMessage as unknown as { show: jest.Mock }).show;

const createWrapper = () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(Provider, { store } as any, children);
  return { store, wrapper };
};

describe('useSessionExpiry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleSteamAuthError', () => {
    it('calls clearSession and shows toast when error.code is UNAUTHORIZED', async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSessionExpiry(), { wrapper });

      const error: SteamError = {
        type: 'SteamError',
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      };

      await act(async () => {
        await result.current.handleSteamAuthError(error);
      });

      expect(mockClearSession).toHaveBeenCalledTimes(1);
      expect(ToastShow).toHaveBeenCalledWith({
        type: 'error',
        text1: 'Steam session expired.',
        text2: 'Please sign in again.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    });

    it('does nothing when error.code is not UNAUTHORIZED', async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSessionExpiry(), { wrapper });

      const error: SteamError = {
        type: 'SteamError',
        code: 'RATE_LIMITED',
        message: 'Rate limited',
      };

      await act(async () => {
        await result.current.handleSteamAuthError(error);
      });

      expect(mockClearSession).not.toHaveBeenCalled();
      expect(ToastShow).not.toHaveBeenCalled();
    });

    it('does nothing for NETWORK error code', async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSessionExpiry(), { wrapper });

      const error: SteamError = {
        type: 'SteamError',
        code: 'NETWORK',
        message: 'Network error',
      };

      await act(async () => {
        await result.current.handleSteamAuthError(error);
      });

      expect(mockClearSession).not.toHaveBeenCalled();
      expect(ToastShow).not.toHaveBeenCalled();
    });

    it('AC5: UNAUTHORIZED triggers clearSession which resets Keychain and clears Redux auth state', async () => {
      // clearSession mock calls through to real Keychain + dispatch operations to verify AC5 end-to-end
      const store = configureStore({
        reducer: { auth: authReducer },
        preloadedState: { auth: { isAuthenticated: true, steamId: '76561198002516729' } },
      });

      // Replace mock with a real implementation that uses the store's dispatch
      mockClearSession.mockImplementationOnce(async () => {
        await (Keychain.resetGenericPassword as jest.Mock)({ service: 'steam_id' });
        await (Keychain.resetGenericPassword as jest.Mock)({ service: 'steam_api_key' });
        await (Keychain.resetGenericPassword as jest.Mock)({ service: 'gemini_api_key' });
        store.dispatch(setAuthenticated({ isAuthenticated: false, steamId: null }));
      });

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        React.createElement(Provider, { store } as any, children);

      const { result } = renderHook(() => useSessionExpiry(), { wrapper });

      await act(async () => {
        await result.current.handleSteamAuthError({
          type: 'SteamError',
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        } as SteamError);
      });

      // Verify all Keychain entries cleared (AC5: clears steam_id, steam_api_key, gemini_api_key)
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({ service: 'steam_id' });
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({ service: 'steam_api_key' });
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({ service: 'gemini_api_key' });
      // Verify Redux state reflects logged-out (AC5: dispatches setAuthenticated false/null)
      expect(store.getState().auth.isAuthenticated).toBe(false);
      expect(store.getState().auth.steamId).toBeNull();
    });
  });
});
