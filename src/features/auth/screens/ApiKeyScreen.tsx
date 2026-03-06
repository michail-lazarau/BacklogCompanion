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
import { tokens } from '@res/tokens';

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
    <SafeAreaView className="flex-1 bg-surface-900">
      <View className="flex-1 justify-center px-6">
        <Text className="text-text-100 text-[28px] font-rubik font-bold mb-4">Steam API Key</Text>
        <Text className="text-base font-rubik mb-3" style={styles.explanation}>
          To fetch your Steam library, the app needs your Steam Web API key.
          This key stays on your device.
        </Text>
        <TouchableOpacity onPress={handleOpenLink}>
          <Text className="text-primary text-sm font-rubik mb-8 underline">
            Get your key at steamcommunity.com/dev/apikey
          </Text>
        </TouchableOpacity>

        <View className="bg-surface-800 rounded-card p-6 w-full">
          <TextInput
            className="bg-surface-900 rounded-input px-4 py-3 text-text-100 text-base font-rubik mb-3"
            placeholder="Paste your Steam Web API key"
            placeholderTextColor={tokens.colors.placeholderText}
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={false}
          />
          {error ? (
            <Text className="text-destructive text-sm font-rubik mb-3">{error}</Text>
          ) : null}
          <TouchableOpacity
            className="bg-primary rounded-input py-3.5 items-center"
            style={isLoading ? styles.buttonDisabled : undefined}
            onPress={handleSubmit}
            disabled={isLoading}
            accessibilityState={{ disabled: isLoading }}
          >
            {isLoading ? (
              <ActivityIndicator testID="activity-indicator" color={tokens.colors.surface900} />
            ) : (
              <Text className="text-surface-900 text-base font-rubik font-bold">Save & Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // lineHeight pixel value + named token color — not expressible in NativeWind
  explanation: {
    color: tokens.colors.placeholderText,
    lineHeight: 24,
  },
  // opacity-based disabled state — conditional class merging requires clsx; inline style is simpler
  buttonDisabled: {
    opacity: 0.6,
  },
});
