import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { MainTabNavigator } from './MainTabNavigator';

const renderWithNav = (ui: React.ReactElement) =>
  render(<NavigationContainer>{ui}</NavigationContainer>);

describe('MainTabNavigator', () => {
  it('renders all 3 tab bar labels', () => {
    const { getAllByText } = renderWithNav(<MainTabNavigator />);
    // Each label appears in both the tab bar and the screen content
    expect(getAllByText('Home').length).toBeGreaterThanOrEqual(2);
    expect(getAllByText('Library').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Profile').length).toBeGreaterThanOrEqual(1);
  });

  it('does not render AuthScreen', () => {
    const { queryByText } = renderWithNav(<MainTabNavigator />);
    expect(queryByText('Auth')).toBeNull();
  });

  it('shows Home screen content by default', () => {
    const { getAllByText } = renderWithNav(<MainTabNavigator />);
    // Screen content "Home" rendered alongside tab label
    expect(getAllByText('Home').length).toBeGreaterThanOrEqual(2);
  });
});
