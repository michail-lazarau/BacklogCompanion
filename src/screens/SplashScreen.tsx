import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SplashScreenProp } from '../types/navigation.types';
import { colors } from '../res/theme';

const SplashScreen = () => {
  const navigation = useNavigation<SplashScreenProp>();

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🎮📝</Text>
      <Text style={styles.title}>Backlog Companion</Text>
      
      <Text style={styles.header}>Tap into Steam</Text>
      
      <View style={styles.qrPreview} />
      
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed ? styles.buttonPressed : styles.buttonDefault,
        ]}
        onPress={() => navigation.navigate('QRScan')}
      >
        <Text style={styles.primaryButtonText}>🔗 Scan QR Steam ID</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.containerBackground,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 32, color: colors.title },
  header: { fontSize: 24, fontWeight: '600', marginBottom: 24, color: colors.subtitle },
  qrPreview: {
    width: 160,
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    marginBottom: 32,
    backgroundColor: colors.containerBackground,
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDefault: {
    backgroundColor: colors.primary,
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  primaryButtonText: { color: colors.textPressableComponent, fontSize: 18, fontWeight: '600' },
});

export default SplashScreen;