import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@features/auth/store/authSlice';
import { libraryReducer } from '@features/library/store/librarySlice';
import { RootNavigator } from './RootNavigator';

const createTestStore = (isAuthenticated = false) =>
  configureStore({
    reducer: { auth: authReducer, library: libraryReducer },
    preloadedState: {
      auth: { isAuthenticated, steamId: null },
      library: { sync_status: 'idle' as const, activeFilter: null, activeSort: 'alphabetical' },
    },
  });

describe('RootNavigator', () => {
  it('shows AuthScreen when not authenticated', () => {
    const { getByText } = render(
      <Provider store={createTestStore(false)}>
        <RootNavigator />
      </Provider>,
    );
    expect(getByText('Auth')).toBeTruthy();
  });

  it('shows tab navigator when authenticated', () => {
    const { queryByText, getAllByText } = render(
      <Provider store={createTestStore(true)}>
        <RootNavigator />
      </Provider>,
    );
    // Tab screen content + tab bar label both render "Home" — confirms navigator mounted
    expect(getAllByText('Home').length).toBeGreaterThanOrEqual(2);
    // Auth screen must NOT be visible
    expect(queryByText('Auth')).toBeNull();
  });
});
