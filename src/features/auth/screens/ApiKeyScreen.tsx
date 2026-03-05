import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApiKeySetup } from '@features/auth/hooks/useApiKeySetup';

const STEAM_API_KEY_URL = 'https://steamcommunity.com/dev/apikey';

interface ApiKeyScreenOwnProps {
  onKeySaved?: () => void;
}

export const ApiKeyScreen = ({ onKeySaved }: ApiKeyScreenOwnProps) => {
  const [apiKey, setApiKey] = useState('');
  const { validateAndSaveApiKey, isLoading, error } = useApiKeySetup();

  const handleSubmit = () => {
    validateAndSaveApiKey(apiKey)
      .then((success) => { if (success) { onKeySaved?.(); } })
      .catch(() => { /* errors handled inside hook */ });
  };

  const handleOpenLink = () => {
    Linking.openURL(STEAM_API_KEY_URL).catch(() => { /* ignore */ });
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <Text style={styles.title}>Steam API Key</Text>
        <Text style={styles.explanation}>
          To fetch your Steam library, the app needs your Steam Web API key.
          This key stays on your device.
        </Text>
        <TouchableOpacity onPress={handleOpenLink}>
          <Text style={styles.link}>Get your key at steamcommunity.com/dev/apikey</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Paste your Steam Web API key"
            placeholderTextColor="#8F98A0"
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={false}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator testID="activity-indicator" color="#171A21" />
            ) : (
              <Text style={styles.buttonText}>Save & Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#171A21',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Rubik-Bold',
    marginBottom: 16,
  },
  explanation: {
    color: '#8F98A0',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    marginBottom: 12,
    lineHeight: 24,
  },
  link: {
    color: '#66C0F4',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    marginBottom: 32,
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: '#2A475E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  input: {
    backgroundColor: '#171A21',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Rubik-Regular',
    marginBottom: 12,
  },
  errorText: {
    color: '#F87171',
    fontSize: 14,
    fontFamily: 'Rubik-Regular',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#66C0F4',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#171A21',
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
  },
});
