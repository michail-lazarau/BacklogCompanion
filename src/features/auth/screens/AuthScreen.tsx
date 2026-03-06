import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SteamLoginButton } from '@features/auth/components/SteamLoginButton';
import { tokens } from '@res/tokens';
import type { AuthScreenProps } from '@navigation/types';
import SteamLogo from '@res/SteamLogos/Steam Logo Full white (R).svg';

export const AuthScreen = (_props: AuthScreenProps) => (
  <SafeAreaView className="flex-1 bg-surface-900">
    <View className="flex-1 justify-center items-center px-6">
      <View className="items-center mb-12">
        <SteamLogo width={240} height={122} style={{ marginBottom: tokens.spacing.md }} />
        <Text className="text-primary text-base font-rubik">Your Steam backlog, organized.</Text>
      </View>
      <View className="bg-surface-800 rounded-card p-6 w-full items-center">
        <SteamLoginButton />
      </View>
    </View>
  </SafeAreaView>
);
