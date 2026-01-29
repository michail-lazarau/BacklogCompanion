import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SplashScreenProp } from '../navigation/AppNavigator';

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
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 32, color: '#1A202C' },
  header: { fontSize: 24, fontWeight: '600', marginBottom: 24, color: '#4A5568' },
  qrPreview: {
    width: 160,
    height: 160,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4299E1',
    borderStyle: 'dashed',
    marginBottom: 32,
    backgroundColor: '#F7FAFC',
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
    backgroundColor: '#4299E1',
  },
  buttonPressed: {
    backgroundColor: '#3182CE',
  },
  primaryButtonText: { color: 'white', fontSize: 18, fontWeight: '600' },
  secondaryLink: { color: '#718096', fontSize: 16, fontStyle: 'italic' },
});

export default SplashScreen;