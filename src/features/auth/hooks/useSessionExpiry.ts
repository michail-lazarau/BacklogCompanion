import { useCallback } from 'react';
import Toast from 'react-native-toast-message';
import { useSteamAuth } from '@features/auth/hooks/useSteamAuth';
import type { SteamError } from '@shared/types/errors.types';

export const useSessionExpiry = () => {
  const { clearSession } = useSteamAuth();

  const handleSteamAuthError = useCallback(async (error: SteamError): Promise<void> => {
    if (error.code === 'UNAUTHORIZED') {
      await clearSession();
      Toast.show({
        type: 'error',
        text1: 'Steam session expired.',
        text2: 'Please sign in again.',
        position: 'bottom',
        visibilityTime: 4000,
      });
    }
  }, [clearSession]);

  return { handleSteamAuthError };
};
