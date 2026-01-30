import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import LibraryScreen from '../screens/LibraryScreen';

export type MainTabParamList = {
  LibraryTab: undefined;
  ProfileTab: undefined;
  AITab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#4299E1',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
      tabBarStyle: styles.tabBar,
    }}
  >
    <Tab.Screen 
      name="LibraryTab" 
      component={LibraryScreen} 
      options={{ tabBarLabel: 'Library' }} 
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    paddingBottom: 8,
  },
});

export default MainTabNavigator;