import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSteamAuth } from '@features/auth/hooks/useSteamAuth';

export const SteamLoginButton = () => {
  const { initiateLogin, isLoading } = useSteamAuth();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={initiateLogin}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Steam"
    >
      {isLoading ? (
        <ActivityIndicator color="#66C0F4" size="small" />
      ) : (
        <Text style={styles.label}>Sign in with Steam</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2A475E',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  label: {
    color: '#66C0F4',
    fontSize: 16,
    fontFamily: 'Rubik-Medium',
  },
});
