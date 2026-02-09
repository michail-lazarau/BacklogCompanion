import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { setSteamId } from '../data/store/userSlice';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { colors } from '../res/theme';
import { QRScanScreenProp } from '../types/navigation.types';

const QRScanScreen = () => {
  const navigation = useNavigation<QRScanScreenProp>();
  const dispatch = useDispatch();
  const [manualId, setManualId] = useState('76561198050360571');

  const handleSubmit = () => {
    if (manualId) {
      dispatch(setSteamId(manualId));
      navigation.navigate('MainTabs', { screen: 'LibraryTab' });
    }
  };

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
        onPress={handleSubmit}
        disabled={!manualId}>
        <Text style={styles.primaryButtonText}>✓ Submit & Go to Library</Text>
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
    backgroundColor: colors.primary,
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  primaryButtonText: { color: colors.textPressableComponent, fontSize: 18, fontWeight: '600' },
  orText: {
    fontSize: 16,
    color: colors.textFootnote,
    marginVertical: 16,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: colors.containerBackground,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: colors.inactive,
  },
});

export default QRScanScreen;
