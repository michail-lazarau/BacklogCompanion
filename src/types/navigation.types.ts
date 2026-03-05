/**
 * @deprecated This file is superseded by `src/navigation/types.ts`.
 * Kept only for prototype screen compatibility (src/screens/ and AppNavigator.tsx).
 * Do NOT use in new code.
 */

// ─── Re-exports from canonical types (Story 1.4) ─────────────────────────────
// New code should import directly from src/navigation/types.ts
export type {
  MainTabParamList,
  AuthScreenProps,
  HomeTabScreenProps,
  LibraryTabScreenProps,
  ProfileTabScreenProps,
} from '../navigation/types';

// ─── Prototype-only types (AppNavigator / src/screens/ compat) ───────────────
import { NavigatorScreenParams } from '@react-navigation/core';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList } from '../navigation/types';

/** @deprecated Prototype route list — use RootStackParamList from src/navigation/types.ts */
export type RootStackParamList = {
  Splash: undefined;
  QRScan: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

/** @deprecated Prototype screen prop */
export type SplashScreenProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

/** @deprecated Prototype screen prop */
export type QRScanScreenProp = NativeStackNavigationProp<RootStackParamList, 'QRScan'>;