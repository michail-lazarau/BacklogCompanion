import { useEffect } from 'react';
import { Linking, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import { AuthScreen } from '@features/auth/screens/AuthScreen';
import { ApiKeyScreen } from '@features/auth/screens/ApiKeyScreen';
import { useSteamAuth } from '@features/auth/hooks/useSteamAuth';
import { useApiKeyGate } from '@features/auth/hooks/useApiKeyGate';
import { MainTabNavigator } from './MainTabNavigator';
import { GameDetailScreen } from '@features/gameDetail/screens/GameDetailScreen';
import type { RootStackParamList } from './types';

const LoadingScreen = () => (
  <View style={loadingStyles.root}>
    <ActivityIndicator size="large" color="#66C0F4" />
  </View>
);

const loadingStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#171A21' },
});

const Stack = createNativeStackNavigator<RootStackParamList>();

const DEEP_LINK_PREFIX = 'backlogcompanion://auth/callback';

export const RootNavigator = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { handleAuthCallback } = useSteamAuth();
  const { apiKeyChecked, hasApiKey, onApiKeySaved } = useApiKeyGate(isAuthenticated);

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      if (event.url.startsWith(DEEP_LINK_PREFIX)) {
        handleAuthCallback(event.url).catch((err: unknown) => {
          console.warn('[RootNavigator] deep link callback error:', err);
        });
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    Linking.getInitialURL()
      .then((url) => {
        if (url && url.startsWith(DEEP_LINK_PREFIX)) {
          return handleAuthCallback(url);
        }
      })
      .catch((err: unknown) => {
        console.warn('[RootNavigator] getInitialURL error:', err);
      });

    return () => {
      subscription.remove();
    };
  }, [handleAuthCallback]);

  const renderScreen = () => {
    if (!isAuthenticated) {
      return <Stack.Screen name="Auth" component={AuthScreen} />;
    }
    if (!apiKeyChecked) {
      return <Stack.Screen name="Loading" component={LoadingScreen} />;
    }
    if (!hasApiKey) {
      return (
        <Stack.Screen name="ApiKey">
          {() => <ApiKeyScreen onKeySaved={onApiKeySaved} />}
        </Stack.Screen>
      );
    }
    return <Stack.Screen name="MainTabs" component={MainTabNavigator} />;
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {renderScreen()}
        <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
