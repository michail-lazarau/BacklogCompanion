import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@features/auth/store/authSlice';
import type { AuthScreenProps } from '@navigation/types';
import { AuthScreen } from './AuthScreen';

// Minimal mock for navigation props — cast to AuthScreenProps to avoid any
const mockNavProps = {
  navigation: {} as AuthScreenProps['navigation'],
  route: { key: 'Auth', name: 'Auth' as const, params: undefined },
} as AuthScreenProps;

const renderWithStore = (ui: React.ReactElement) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('AuthScreen', () => {
  it('renders without crashing and shows Steam logo', () => {
    const { getByTestId } = renderWithStore(<AuthScreen {...mockNavProps} />);
    expect(getByTestId('svg-mock')).toBeTruthy();
  });

  it('renders the SteamLoginButton', () => {
    const { getByText } = renderWithStore(<AuthScreen {...mockNavProps} />);
    expect(getByText('Sign in with Steam')).toBeTruthy();
  });
});
