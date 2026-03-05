import { useState, useCallback } from 'react';
import { Linking } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import * as Keychain from 'react-native-keychain';
import { useAppDispatch } from '@shared/hooks/reduxHooks';
import { setAuthenticated } from '@features/auth/store/authSlice';

export const STEAM_KEYCHAIN_SERVICES = {
  STEAM_ID: 'steam_id',
  STEAM_API_KEY: 'steam_api_key',
  GEMINI_API_KEY: 'gemini_api_key',
} as const;

const CALLBACK_URL = 'backlogcompanion://auth/callback';
const STEAM_OPENID_URL =
  'https://steamcommunity.com/openid/login' +
  '?openid.ns=http://specs.openid.net/auth/2.0' +
  '&openid.mode=checkid_setup' +
  '&openid.return_to=' + encodeURIComponent(CALLBACK_URL) +
  '&openid.realm=' + encodeURIComponent(CALLBACK_URL) +
  '&openid.identity=http://specs.openid.net/auth/2.0/identifier_select' +
  '&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select';

const STEAM_ID_REGEX = /https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17,25})/;

export const useSteamAuth = () => {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthCallback = useCallback(async (callbackUrl: string): Promise<void> => {
    try {
      // Parse openid.claimed_id from query string (URL API unavailable in RN TS lib)
      const queryString = callbackUrl.includes('?') ? callbackUrl.split('?')[1] ?? '' : '';
      const params = queryString.split('&').reduce<Record<string, string>>((acc, pair) => {
        const eqIdx = pair.indexOf('=');
        if (eqIdx > -1) {
          const key = decodeURIComponent(pair.slice(0, eqIdx));
          const value = decodeURIComponent(pair.slice(eqIdx + 1));
          acc[key] = value;
        }
        return acc;
      }, {});
      const claimedId = params['openid.claimed_id'] ?? null;
      const match = claimedId?.match(STEAM_ID_REGEX);
      const steamId = match?.[1] ?? null;

      if (steamId) {
        await Keychain.setGenericPassword('steam', steamId, {
          service: STEAM_KEYCHAIN_SERVICES.STEAM_ID,
        });
        dispatch(setAuthenticated({ isAuthenticated: true, steamId }));
      }
      // If no steamId: malformed callback — remain on AuthScreen (AC4/Subtask 4.5)
    } catch (error) {
      console.warn('[useSteamAuth] malformed callback URL:', error);
    }
  }, [dispatch]);

  const initiateLogin = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (await InAppBrowser.isAvailable()) {
        const result = await InAppBrowser.openAuth(
          STEAM_OPENID_URL,
          'backlogcompanion://',
          {
            ephemeralWebSession: false,
            showTitle: false,
            enableUrlBarHiding: true,
            enableDefaultShare: false,
          },
        );
        if (result.type === 'success' && result.url) {
          await handleAuthCallback(result.url);
        }
        // result.type === 'cancel' → user dismissed browser (AC4: no error shown)
      } else {
        await Linking.openURL(STEAM_OPENID_URL);
      }
    } catch {
      InAppBrowser.close();
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthCallback]);

  const clearSession = useCallback(async (): Promise<void> => {
    await Keychain.resetGenericPassword({ service: STEAM_KEYCHAIN_SERVICES.STEAM_ID });
    await Keychain.resetGenericPassword({ service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY });
    dispatch(setAuthenticated({ isAuthenticated: false, steamId: null }));
  }, [dispatch]);

  return { initiateLogin, handleAuthCallback, clearSession, isLoading };
};
