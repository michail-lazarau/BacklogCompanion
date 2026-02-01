import { NavigatorScreenParams } from '@react-navigation/core';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Splash: undefined;
  QRScan: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

export type SplashScreenProp = NativeStackNavigationProp<
  RootStackParamList, 'Splash'
>;

export type QRScanScreenProp = NativeStackNavigationProp<
  RootStackParamList, 'QRScan'
>;

export type MainTabParamList = {
    LibraryTab: undefined;
    ProfileTab: undefined;
    AITab: undefined;
};