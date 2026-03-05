import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { colors } from '../res/theme';
import { AIScreen, LibraryScreen } from '../screens';
import { HomeScreen } from '@features/recommendations/screens/HomeScreen';
import { LibraryScreen as CanonicalLibraryScreen } from '@features/library/screens/LibraryScreen';
import { ProfileScreen } from '@features/auth/screens/ProfileScreen';
import type { MainTabParamList as CanonicalMainTabParamList } from './types';

/** @deprecated Prototype tab param list — used only by LegacyMainTabNavigator */
type LegacyTabParamList = { LibraryTab: undefined; AITab: undefined };

const Tab = createBottomTabNavigator<LegacyTabParamList>();

/**
 * @deprecated Use named export `MainTabNavigator` below instead.
 * Kept for prototype screen compatibility (src/screens/ references).
 */
const LegacyMainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.inactive,
      headerShown: false,
      tabBarStyle: styles.tabBar,
    }}
  >
    <Tab.Screen
      name="LibraryTab"
      component={LibraryScreen}
      options={{ tabBarLabel: 'Library' }}
    />

    <Tab.Screen
      name="AITab"
      component={AIScreen}
      options={{ tabBarLabel: 'AI' }}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    paddingBottom: 8,
  },
});

/** @deprecated Use named export `MainTabNavigator` below */
// eslint-disable-next-line no-restricted-syntax
export default LegacyMainTabNavigator;

// ─── Canonical navigator (Story 1.4) ─────────────────────────────────────────

const CanonicalTab = createBottomTabNavigator<CanonicalMainTabParamList>();

export const MainTabNavigator = () => (
  <CanonicalTab.Navigator
    screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.inactive,
      headerShown: false,
    }}
  >
    <CanonicalTab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
    <CanonicalTab.Screen name="LibraryTab" component={CanonicalLibraryScreen} options={{ tabBarLabel: 'Library' }} />
    <CanonicalTab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
  </CanonicalTab.Navigator>
);