import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  QRScanScreen,
  SplashScreen,
} from '../screens';
import MainTabNavigator from './MainTabNavigator';
import { RootStackParamList } from '../types/navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * @deprecated Replaced by `RootNavigator` (Story 1.4).
 * Kept only for prototype screen compatibility (src/screens/).
 * Do NOT use in new code.
 */
// eslint-disable-next-line no-restricted-syntax
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Splash">
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="QRScan" component={QRScanScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
