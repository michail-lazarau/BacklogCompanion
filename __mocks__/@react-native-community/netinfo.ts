// Mock for @react-native-community/netinfo
// Default: simulates an online device
export const useNetInfo = jest.fn(() => ({
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
  details: null,
}));

export const addEventListener = jest.fn(() => jest.fn());
export const fetch = jest.fn().mockResolvedValue({ isConnected: true });

export default {
  addEventListener,
  fetch,
  useNetInfo,
};
