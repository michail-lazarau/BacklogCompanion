import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const QRScanScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Scan Screen</Text>
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed ? styles.buttonPressed : styles.buttonDefault,
        ]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.primaryButtonText}>← Back to Splash</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 24,
    color: '#4A5568',
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
});

export default QRScanScreen;
