import { useState } from 'react';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { useApiKeySetup } from './useApiKeySetup';

const STEAM_API_KEY_URL = 'https://steamcommunity.com/dev/apikey';

export const useApiKeyScreen = (onKeySaved?: () => void) => {
  const [apiKey, setApiKey] = useState('');
  const { validateAndSaveApiKey, isLoading, error } = useApiKeySetup();

  const handleSubmit = () => {
    validateAndSaveApiKey(apiKey)
      .then((success) => { if (success) { onKeySaved?.(); } })
      .catch(() => { /* errors handled inside useApiKeySetup */ });
  };

  const handleOpenLink = () => {
    // openAuth (ASWebAuthenticationSession) shares the Steam session from the login step.
    // The user copies the key and taps Cancel — the 'cancel' result is expected and ignored.
    InAppBrowser.openAuth(STEAM_API_KEY_URL, 'backlogcompanion://', {
      ephemeralWebSession: false,
      showTitle: false,
      enableUrlBarHiding: true,
      enableDefaultShare: false,
    }).catch(() => { /* ignore */ });
  };

  return { apiKey, setApiKey, isLoading, error, handleSubmit, handleOpenLink };
};
