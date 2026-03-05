import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ApiKeyScreen } from './ApiKeyScreen';

// Mock useApiKeySetup to control its behaviour per test
const mockValidateAndSaveApiKey = jest.fn();
const mockIsLoading = { current: false };
const mockError = { current: null as string | null };

jest.mock('@features/auth/hooks/useApiKeySetup', () => ({
  useApiKeySetup: () => ({
    validateAndSaveApiKey: mockValidateAndSaveApiKey,
    isLoading: mockIsLoading.current,
    error: mockError.current,
  }),
}));

describe('ApiKeyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoading.current = false;
    mockError.current = null;
    mockValidateAndSaveApiKey.mockResolvedValue(false);
  });

  it('renders TextInput, submit button, and link to Steam API key page', () => {
    const { getByPlaceholderText, getByText } = render(<ApiKeyScreen />);

    expect(getByPlaceholderText('Paste your Steam Web API key')).toBeTruthy();
    expect(getByText('Save & Continue')).toBeTruthy();
    expect(getByText('Get your key at steamcommunity.com/dev/apikey')).toBeTruthy();
  });

  it('renders explanation text', () => {
    const { getByText } = render(<ApiKeyScreen />);
    expect(
      getByText(/To fetch your Steam library, the app needs your Steam Web API key/),
    ).toBeTruthy();
  });

  it('submit with empty field calls validateAndSaveApiKey with empty string', async () => {
    mockValidateAndSaveApiKey.mockResolvedValueOnce(false);

    const { getByText } = render(<ApiKeyScreen />);

    fireEvent.press(getByText('Save & Continue'));

    await waitFor(() => {
      expect(mockValidateAndSaveApiKey).toHaveBeenCalledWith('');
    });
  });

  it('typing in input and submitting passes the value to validateAndSaveApiKey', async () => {
    mockValidateAndSaveApiKey.mockResolvedValueOnce(true);

    const { getByPlaceholderText, getByText } = render(<ApiKeyScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Paste your Steam Web API key'),
      'MYAPIKEY12345',
    );
    fireEvent.press(getByText('Save & Continue'));

    await waitFor(() => {
      expect(mockValidateAndSaveApiKey).toHaveBeenCalledWith('MYAPIKEY12345');
    });
  });

  it('calls onKeySaved callback when validateAndSaveApiKey returns true', async () => {
    mockValidateAndSaveApiKey.mockResolvedValueOnce(true);
    const onKeySaved = jest.fn();

    const { getByText } = render(<ApiKeyScreen onKeySaved={onKeySaved} />);

    fireEvent.press(getByText('Save & Continue'));

    await waitFor(() => {
      expect(onKeySaved).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call onKeySaved when validateAndSaveApiKey returns false', async () => {
    mockValidateAndSaveApiKey.mockResolvedValueOnce(false);
    const onKeySaved = jest.fn();

    const { getByText } = render(<ApiKeyScreen onKeySaved={onKeySaved} />);

    fireEvent.press(getByText('Save & Continue'));

    await waitFor(() => {
      expect(mockValidateAndSaveApiKey).toHaveBeenCalled();
    });
    expect(onKeySaved).not.toHaveBeenCalled();
  });

  it('loading state disables submit button and shows ActivityIndicator', () => {
    mockIsLoading.current = true;

    const { getByTestId, queryByText } = render(<ApiKeyScreen />);

    // Button text is hidden during loading
    expect(queryByText('Save & Continue')).toBeNull();
    // ActivityIndicator is rendered
    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('renders inline error message when error is set', () => {
    mockError.current = 'Please enter your API key';

    const { getByText } = render(<ApiKeyScreen />);

    expect(getByText('Please enter your API key')).toBeTruthy();
  });

  it('does not render error text when error is null', () => {
    mockError.current = null;

    const { queryByText } = render(<ApiKeyScreen />);

    expect(queryByText('Please enter your API key')).toBeNull();
    expect(queryByText('Invalid API key. Please check and try again.')).toBeNull();
  });
});
