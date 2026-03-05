import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@features/auth/store/authSlice';
import { SteamLoginButton } from './SteamLoginButton';
import InAppBrowser from 'react-native-inappbrowser-reborn';

const createStore = () => configureStore({ reducer: { auth: authReducer } });

const renderWithStore = (ui: React.ReactElement) => {
  const store = createStore();
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('SteamLoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the sign-in label', () => {
    const { getByText } = renderWithStore(<SteamLoginButton />);
    expect(getByText('Sign in with Steam')).toBeTruthy();
  });

  it('calls InAppBrowser.openAuth when pressed', async () => {
    const { getByText } = renderWithStore(<SteamLoginButton />);
    await act(async () => {
      fireEvent.press(getByText('Sign in with Steam'));
    });
    expect(InAppBrowser.openAuth).toHaveBeenCalled();
  });
});
