import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { colors } from '../res/theme';
import { MainTabParamList } from '../types/navigation.types';
import { AIScreen, LibraryScreen } from '../screens';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => (
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

export default MainTabNavigator;