import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useSteamAuth } from '@features/auth/hooks/useSteamAuth';
import { tokens } from '@res/tokens';

export const SteamLoginButton = () => {
  const { initiateLogin, isLoading } = useSteamAuth();

  return (
    <TouchableOpacity
      className="bg-surface-800 rounded-xl py-3.5 px-8 items-center justify-center min-h-[52px]"
      onPress={initiateLogin}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Steam"
      accessibilityState={{ busy: isLoading }}
    >
      {isLoading ? (
        <ActivityIndicator color={tokens.colors.primary} size="small" />
      ) : (
        <Text className="text-primary text-base font-rubik" style={{ fontFamily: tokens.fontFamily.medium }}>Sign in with Steam</Text>
      )}
    </TouchableOpacity>
  );
};
