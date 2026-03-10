import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import * as Keychain from 'react-native-keychain';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@features/auth/store/authSlice';
import { useSteamAuth, STEAM_KEYCHAIN_SERVICES } from '@features/auth/hooks/useSteamAuth';

const createWrapper = () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    React.createElement(Provider, { store } as any, children);
  return { store, wrapper };
};

describe('useSteamAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleAuthCallback', () => {
    it('extracts Steam ID from valid claimed_id URL and stores in Keychain', async () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useSteamAuth(), { wrapper });

      const validCallbackUrl =
        'backlogcompanion://auth/callback?openid.claimed_id=https%3A%2F%2Fsteamcommunity.com%2Fopenid%2Fid%2F76561198002516729&openid.mode=id_res';

      await act(async () => {
        await result.current.handleAuthCallback(validCallbackUrl);
      });

      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'steam',
        '76561198002516729',
        { service: STEAM_KEYCHAIN_SERVICES.STEAM_ID },
      );
      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(store.getState().auth.steamId).toBe('76561198002516729');
    });

    it('does not dispatch setAuthenticated when claimed_id is missing', async () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useSteamAuth(), { wrapper });

      await act(async () => {
        await result.current.handleAuthCallback('backlogcompanion://auth/callback?openid.mode=cancel');
      });

      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
      expect(store.getState().auth.isAuthenticated).toBe(false);
    });

    it('does not dispatch setAuthenticated when claimed_id has malformed Steam ID', async () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useSteamAuth(), { wrapper });

      const malformedUrl =
        'backlogcompanion://auth/callback?openid.claimed_id=https%3A%2F%2Fsteamcommunity.com%2Fopenid%2Fid%2FBADID';

      await act(async () => {
        await result.current.handleAuthCallback(malformedUrl);
      });

      expect(Keychain.setGenericPassword).not.toHaveBeenCalled();
      expect(store.getState().auth.isAuthenticated).toBe(false);
    });

    it('handles a completely malformed URL without throwing', async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSteamAuth(), { wrapper });

      await act(async () => {
        await expect(
          result.current.handleAuthCallback('not-a-valid-url:::'),
        ).resolves.toBeUndefined();
      });
    });
  });

  describe('clearSession', () => {
    it('resets all Keychain entries and dispatches setAuthenticated false', async () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useSteamAuth(), { wrapper });

      await act(async () => {
        await result.current.clearSession();
      });

      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: STEAM_KEYCHAIN_SERVICES.STEAM_ID,
      });
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY,
      });
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
        service: STEAM_KEYCHAIN_SERVICES.GEMINI_API_KEY,
      });
      expect(store.getState().auth.isAuthenticated).toBe(false);
      expect(store.getState().auth.steamId).toBeNull();
    });
  });

  describe('initiateLogin', () => {
    it('calls InAppBrowser.openAuth with correct Steam OpenID URL and deep link scheme', async () => {
      const { wrapper } = createWrapper();
      const { result } = renderHook(() => useSteamAuth(), { wrapper });

      await act(async () => {
        await result.current.initiateLogin();
      });

      expect(InAppBrowser.openAuth).toHaveBeenCalledTimes(1);

      const [calledUrl, calledScheme] = (InAppBrowser.openAuth as jest.Mock).mock.calls[0] as [string, string, unknown];

      expect(calledScheme).toBe('backlogcompanion://');

      // Verify all 6 required OpenID parameters are present in the URL
      expect(calledUrl).toContain('https://steamcommunity.com/openid/login');
      expect(calledUrl).toContain('openid.ns=http://specs.openid.net/auth/2.0');
      expect(calledUrl).toContain('openid.mode=checkid_setup');
      expect(calledUrl).toContain('openid.return_to=');
      expect(calledUrl).toContain(encodeURIComponent('michail-lazarau.github.io'));
      expect(calledUrl).toContain('openid.realm=');
      expect(calledUrl).toContain('openid.identity=http://specs.openid.net/auth/2.0/identifier_select');
      expect(calledUrl).toContain('openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select');
    });
  });
});
