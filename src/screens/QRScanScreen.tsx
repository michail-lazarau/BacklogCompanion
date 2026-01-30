import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { setSteamId } from '../data/store/userSlice';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const QRScanScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const dispatch = useDispatch();
  const [manualId, setManualId] = useState('');

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.container}
      resetScrollToCoords={{ x: 0, y: 0 }}
      scrollEnabled={false}
      keyboardShouldPersistTaps="handled"
    >
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

      <Text style={styles.orText}>- or -</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter Steam ID manually"
        value={manualId}
        onChangeText={setManualId}
        placeholderTextColor="#A0AEC0"
      />
      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : styles.buttonDefault, !manualId ? styles.buttonDisabled : {}]}
        onPress={() => dispatch(setSteamId(manualId))}
        disabled={!manualId}>
        <Text style={styles.primaryButtonText}>✓ Submit</Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  orText: {
    fontSize: 16,
    color: '#718096',
    marginVertical: 16,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#CBD5E0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#A0AEC0',
  },
});

export default QRScanScreen;
