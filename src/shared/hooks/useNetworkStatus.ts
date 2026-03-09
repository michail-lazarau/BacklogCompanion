import { useNetInfo } from '@react-native-community/netinfo';

export const useNetworkStatus = (): { isConnected: boolean } => {
  const netInfo = useNetInfo();
  // isConnected is null until NetInfo resolves — treat null as connected (optimistic)
  return { isConnected: netInfo.isConnected !== false };
};
