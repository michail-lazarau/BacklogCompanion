import { useEffect } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import { AuthScreen } from '@features/auth/screens/AuthScreen';
import { useSteamAuth } from '@features/auth/hooks/useSteamAuth';
import { MainTabNavigator } from './MainTabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const DEEP_LINK_PREFIX = 'backlogcompanion://auth/callback';

export const RootNavigator = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { handleAuthCallback } = useSteamAuth();

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      if (event.url.startsWith(DEEP_LINK_PREFIX)) {
        void handleAuthCallback(event.url);
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

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
