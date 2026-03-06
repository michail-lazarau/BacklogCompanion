import { useCallback, useRef } from 'react';
import Toast from 'react-native-toast-message';
import { useSteamAuth } from '@features/auth/hooks/useSteamAuth';
import { queryClient } from '../../../data/QueryProvider';
import { persistor } from '../../../data/store';

const LOGOUT_UNDO_TIMEOUT_MS = 4000;

export const useLogout = () => {
  const { clearSession } = useSteamAuth();
  const cancelledRef = useRef(false);
  const pendingRef = useRef(false);

  const initiateLogout = useCallback(async () => {
    if (pendingRef.current) {
      return;
    }
    pendingRef.current = true;
    cancelledRef.current = false;

    Toast.show({
      type: 'error',
      text1: 'Signing out…',
      text2: 'Tap to UNDO',
      position: 'bottom',
      visibilityTime: LOGOUT_UNDO_TIMEOUT_MS,
      onPress: () => {
        cancelledRef.current = true;
        Toast.hide();
      },
    });

    await new Promise<void>((resolve) => setTimeout(resolve, LOGOUT_UNDO_TIMEOUT_MS));

    pendingRef.current = false;

    if (!cancelledRef.current) {
      await clearSession();
      queryClient.clear();
      await persistor.purge();
    }
  }, [clearSession]);

  return { initiateLogout };
};
