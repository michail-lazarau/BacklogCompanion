import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  QRScanScreen,
  SplashScreen,
  LibraryScreen,
} from '../screens';
import MainTabNavigator from './MainTabNavigator';

// move to types
export type RootStackParamList = {
  Splash: undefined;
  QRScan: undefined;
  MainTabs: undefined;
};

export type SplashScreenProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

const Stack = createNativeStackNavigator<RootStackParamList>();

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
