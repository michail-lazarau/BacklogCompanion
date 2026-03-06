import { renderHook, act } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import { useLogout } from './useLogout';

// Mock dependencies
const mockClearSession = jest.fn();
jest.mock('@features/auth/hooks/useSteamAuth', () => ({
  useSteamAuth: () => ({
    clearSession: mockClearSession,
    initiateLogin: jest.fn(),
    handleAuthCallback: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('../../../data/QueryProvider', () => ({
  queryClient: { clear: jest.fn() },
}));

jest.mock('../../../data/store', () => ({
  persistor: { purge: jest.fn().mockResolvedValue(undefined) },
}));

// Access mocks after hoisting via requireMock
const getQueryClientMock = () =>
  jest.requireMock('../../../data/QueryProvider') as { queryClient: { clear: jest.Mock } };
const getPersistorMock = () =>
  jest.requireMock('../../../data/store') as { persistor: { purge: jest.Mock } };

describe('useLogout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls Toast.show immediately when initiateLogout is called', async () => {
    const { result } = renderHook(() => useLogout());

    act(() => {
      result.current.initiateLogout().catch(() => undefined);
    });

    expect(Toast.show).toHaveBeenCalledTimes(1);
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text1: 'Signing out…',
        position: 'bottom',
        visibilityTime: 4000,
      }),
    );

    // Advance timers to clean up the pending setTimeout
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
  });

  it('calls clearSession, queryClient.clear, and persistor.purge after timeout when not cancelled', async () => {
    mockClearSession.mockResolvedValue(undefined);
    const { queryClient } = getQueryClientMock();
    const { persistor } = getPersistorMock();

    const { result } = renderHook(() => useLogout());

    act(() => {
      result.current.initiateLogout().catch(() => undefined);
    });

    // Before timeout elapses — session should NOT be cleared yet
    expect(mockClearSession).not.toHaveBeenCalled();
    expect(queryClient.clear).not.toHaveBeenCalled();
    expect(persistor.purge).not.toHaveBeenCalled();

    // Advance past the 4000ms timeout
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    expect(mockClearSession).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(persistor.purge).toHaveBeenCalledTimes(1);
  });

  it('does NOT call clearSession, queryClient.clear, or persistor.purge when UNDO is tapped', async () => {
    const { queryClient } = getQueryClientMock();
    const { persistor } = getPersistorMock();

    let capturedOnPress: (() => void) | undefined;
    (Toast.show as jest.Mock).mockImplementation((options: { onPress?: () => void }) => {
      capturedOnPress = options.onPress;
    });

    const { result } = renderHook(() => useLogout());

    act(() => {
      result.current.initiateLogout().catch(() => undefined);
    });

    // Simulate UNDO tap before timeout
    act(() => {
      capturedOnPress?.();
    });

    // Advance timers past the timeout
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    expect(mockClearSession).not.toHaveBeenCalled();
    expect(queryClient.clear).not.toHaveBeenCalled();
    expect(persistor.purge).not.toHaveBeenCalled();
  });

  it('does not start a second logout if one is already pending', async () => {
    mockClearSession.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout());

    act(() => {
      result.current.initiateLogout().catch(() => undefined);
      result.current.initiateLogout().catch(() => undefined); // rapid second tap
    });

    expect(Toast.show).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it('calls Toast.hide when UNDO is tapped', async () => {
    let capturedOnPress: (() => void) | undefined;
    (Toast.show as jest.Mock).mockImplementation((options: { onPress?: () => void }) => {
      capturedOnPress = options.onPress;
    });

    const { result } = renderHook(() => useLogout());

    act(() => {
      result.current.initiateLogout().catch(() => undefined);
    });

    act(() => {
      capturedOnPress?.();
    });

    expect(Toast.hide).toHaveBeenCalledTimes(1);

    // Advance timers to clean up the pending setTimeout
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
  });
});
