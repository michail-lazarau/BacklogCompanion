import { View, Text } from 'react-native';
import { useNetworkStatus } from '@shared/hooks/useNetworkStatus';

export const OfflineBanner = () => {
  const { isConnected } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <View className="bg-destructive/20 px-4 py-2 items-center">
      <Text className="text-destructive text-caption font-rubik uppercase tracking-wider">
        No internet connection — showing cached library
      </Text>
    </View>
  );
};
