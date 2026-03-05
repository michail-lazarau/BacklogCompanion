import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Auth: undefined;
  Loading: undefined;
  ApiKey: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

export type MainTabParamList = {
  HomeTab: undefined;
  LibraryTab: undefined;
  ProfileTab: undefined;
};

export type AuthScreenProps = NativeStackScreenProps<RootStackParamList, 'Auth'>;
export type HomeTabScreenProps = BottomTabScreenProps<MainTabParamList, 'HomeTab'>;
export type LibraryTabScreenProps = BottomTabScreenProps<MainTabParamList, 'LibraryTab'>;
export type ProfileTabScreenProps = BottomTabScreenProps<MainTabParamList, 'ProfileTab'>;
