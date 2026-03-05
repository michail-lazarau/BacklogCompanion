import { useState, useCallback } from 'react';
import * as Keychain from 'react-native-keychain';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import { useSessionExpiry } from '@features/auth/hooks/useSessionExpiry';
import { getPlayerSummaries } from '../../../data/api/steam';
import { STEAM_KEYCHAIN_SERVICES } from '@features/auth/hooks/useSteamAuth';
import type { SteamError } from '@shared/types/errors.types';

const isSteamError = (e: unknown): e is SteamError =>
  typeof e === 'object' &&
  e !== null &&
  (e as SteamError).type === 'SteamError';

export const useApiKeySetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steamId = useAppSelector((state) => state.auth.steamId);
  const { handleSteamAuthError } = useSessionExpiry();

  const validateAndSaveApiKey = useCallback(
    async (apiKey: string): Promise<boolean> => {
      if (!apiKey.trim()) {
        setError('Please enter your API key');
        return false;
      }

      if (!steamId) {
        setError('Could not read Steam ID. Please sign in again.');
        return false;
      }

      setIsLoading(true);
      setError(null);

      try {
        await getPlayerSummaries(apiKey, steamId);
      } catch (e: unknown) {
        if (isSteamError(e) && e.code === 'UNAUTHORIZED') {
          await handleSteamAuthError(e);
        } else {
          setError('Invalid API key. Please check and try again.');
        }
        setIsLoading(false);
        return false;
      }

      try {
        await Keychain.setGenericPassword('steam', apiKey, {
          service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY,
        });
        return true;
      } catch {
        setError('Could not save API key. Please try again.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [steamId, handleSteamAuthError],
  );

  return { validateAndSaveApiKey, isLoading, error };
};
