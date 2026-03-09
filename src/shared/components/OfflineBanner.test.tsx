import React from 'react';
import { render } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when online', () => {
    (useNetInfo as jest.Mock).mockReturnValue({ isConnected: true, isInternetReachable: true });

    const { toJSON } = render(<OfflineBanner />);
    expect(toJSON()).toBeNull();
  });

  it('renders banner when offline', () => {
    (useNetInfo as jest.Mock).mockReturnValue({ isConnected: false, isInternetReachable: false });

    const { getByText } = render(<OfflineBanner />);
    expect(getByText(/No internet connection/i)).toBeTruthy();
  });

  it('renders null when isConnected is null (optimistic — treat as connected)', () => {
    (useNetInfo as jest.Mock).mockReturnValue({ isConnected: null, isInternetReachable: null });

    const { toJSON } = render(<OfflineBanner />);
    expect(toJSON()).toBeNull();
  });
});
