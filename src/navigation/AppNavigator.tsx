import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import QRScanScreen from '../screens/QRScanScreen';
import SplashScreen from '../screens/SplashScreen';

export type RootStackParamList = {
  Splash: undefined;
  QRScan: undefined;
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
