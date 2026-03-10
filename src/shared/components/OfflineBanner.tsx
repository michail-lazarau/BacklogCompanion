import { useEffect, useRef } from 'react';
import Toast from 'react-native-toast-message';
import { useNetworkStatus } from '@shared/hooks/useNetworkStatus';

export const OfflineBanner = () => {
  const { isConnected } = useNetworkStatus();
  const wasConnected = useRef(isConnected);

  useEffect(() => {
    if (!isConnected && wasConnected.current) {
      Toast.show({
        type: 'error',
        text1: 'No Internet Connection',
        text2: 'Showing cached library',
        position: 'bottom',
        visibilityTime: 4000,
      });
    }
    wasConnected.current = isConnected;
  }, [isConnected]);

  return null;
};
