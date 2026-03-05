import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SteamLoginButton } from '@features/auth/components/SteamLoginButton';
import type { AuthScreenProps } from '@navigation/types';

export const AuthScreen = (_props: AuthScreenProps) => (
  <SafeAreaView style={styles.root}>
    <View style={styles.container}>
      <View style={styles.brandingArea}>
        <Text style={styles.title}>BacklogCompanion</Text>
        <Text style={styles.subtitle}>Your Steam backlog, organized.</Text>
      </View>
      <View style={styles.card}>
        <SteamLoginButton />
      </View>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#171A21',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  brandingArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Rubik-Bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#66C0F4',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
  },
  card: {
    backgroundColor: '#2A475E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
});
