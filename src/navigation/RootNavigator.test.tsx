import React from 'react';
import { Linking } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import * as Keychain from 'react-native-keychain';
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
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no initial URL, no API key in Keychain
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    jest.spyOn(Linking, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
  });

  it('shows AuthScreen when not authenticated', () => {
    const { getByText } = render(
      <Provider store={createTestStore(false)}>
        <RootNavigator />
      </Provider>,
    );
    expect(getByText('Sign in with Steam')).toBeTruthy();
  });

  it('shows tab navigator when authenticated and API key is stored', async () => {
    // Simulate API key present in Keychain
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
      username: 'steam',
      password: 'MYAPIKEY',
      service: 'steam_api_key',
    });

    const { queryByText, getAllByText } = render(
      <Provider store={createTestStore(true)}>
        <RootNavigator />
      </Provider>,
    );

    // Wait for async Keychain check to complete
    await waitFor(() => {
      // Tab screen content + tab bar label both render "Home" — confirms navigator mounted
      expect(getAllByText('Home').length).toBeGreaterThanOrEqual(2);
    });
    // Auth screen must NOT be visible
    expect(queryByText('Sign in with Steam')).toBeNull();
  });

  it('shows ApiKeyScreen when authenticated but no API key stored', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

    const { getByPlaceholderText } = render(
      <Provider store={createTestStore(true)}>
        <RootNavigator />
      </Provider>,
    );

    await waitFor(() => {
      expect(getByPlaceholderText('Paste your Steam Web API key')).toBeTruthy();
    });
  });

  it('registers a Linking url event listener on mount', () => {
    render(
      <Provider store={createTestStore(false)}>
        <RootNavigator />
      </Provider>,
    );
    expect(Linking.addEventListener).toHaveBeenCalledWith('url', expect.any(Function));
  });

  it('removes the Linking listener on unmount', () => {
    const mockRemove = jest.fn();
    jest.spyOn(Linking, 'addEventListener').mockReturnValue({ remove: mockRemove } as never);

    const { unmount } = render(
      <Provider store={createTestStore(false)}>
        <RootNavigator />
      </Provider>,
    );
    unmount();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('processes a cold-start deep link from getInitialURL and authenticates', async () => {
    const validCallbackUrl =
      'backlogcompanion://auth/callback?openid.claimed_id=https%3A%2F%2Fsteamcommunity.com%2Fopenid%2Fid%2F76561198002516729';

    let resolveInitialUrl!: (url: string) => void;
    const pendingPromise = new Promise<string>((res) => { resolveInitialUrl = res; });
    jest.spyOn(Linking, 'getInitialURL').mockReturnValue(pendingPromise);

    const store = createTestStore(false);

    render(
      <Provider store={store}>
        <RootNavigator />
      </Provider>,
    );

    await act(async () => {
      resolveInitialUrl(validCallbackUrl);
      await pendingPromise;
    });

    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().auth.steamId).toBe('76561198002516729');
  });

  it('ignores a cold-start URL that does not match the deep link prefix', async () => {
    let resolveInitialUrl!: (url: string) => void;
    const pendingPromise = new Promise<string>((res) => { resolveInitialUrl = res; });
    jest.spyOn(Linking, 'getInitialURL').mockReturnValue(pendingPromise);

    const store = createTestStore(false);

    render(
      <Provider store={store}>
        <RootNavigator />
      </Provider>,
    );

    await act(async () => {
      resolveInitialUrl('https://someother.com/link');
      await pendingPromise;
    });

    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});
