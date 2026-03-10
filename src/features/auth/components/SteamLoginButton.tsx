import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useSteamAuth } from '@features/auth/hooks/useSteamAuth';
import { tokens } from '@res/tokens';

export const SteamLoginButton = () => {
  const { initiateLogin, isLoading } = useSteamAuth();

  return (
    <TouchableOpacity
      className="bg-surface-800 rounded-xl py-3.5 px-8 items-center justify-center"
      onPress={initiateLogin}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Steam"
      accessibilityState={{ busy: isLoading }}
    >
      {/* Text always rendered to keep button dimensions stable */}
      <Text
        className="text-primary text-xl font-rubik"
        style={{ fontFamily: tokens.fontFamily.medium, opacity: isLoading ? 0 : 1 }}
      >
        Sign in with Steam
      </Text>
      {isLoading && (
        <View style={{ position: 'absolute' }}>
          <ActivityIndicator color={tokens.colors.primary} size="small" />
        </View>
      )}
    </TouchableOpacity>
  );
};
