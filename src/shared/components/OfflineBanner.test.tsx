import React from 'react';
import { render } from '@testing-library/react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import { OfflineBanner } from './OfflineBanner';

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null (no visual element)', () => {
    (useNetInfo as jest.Mock).mockReturnValue({ isConnected: true, isInternetReachable: true });

    const { toJSON } = render(<OfflineBanner />);
    expect(toJSON()).toBeNull();
  });

  it('shows toast when connectivity drops', () => {
    (useNetInfo as jest.Mock).mockReturnValue({ isConnected: true, isInternetReachable: true });

    const { rerender } = render(<OfflineBanner />);

    (useNetInfo as jest.Mock).mockReturnValue({ isConnected: false, isInternetReachable: false });
    rerender(<OfflineBanner />);

    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text1: 'No Internet Connection',
      }),
    );
  });

  it('does not show toast on initial mount when already offline', () => {
    (useNetInfo as jest.Mock).mockReturnValue({ isConnected: false, isInternetReachable: false });

    render(<OfflineBanner />);

    expect(Toast.show).not.toHaveBeenCalled();
  });

  it('does not show toast when isConnected is null (optimistic)', () => {
    (useNetInfo as jest.Mock).mockReturnValue({ isConnected: null, isInternetReachable: null });

    const { toJSON } = render(<OfflineBanner />);
    expect(toJSON()).toBeNull();
    expect(Toast.show).not.toHaveBeenCalled();
  });
});
