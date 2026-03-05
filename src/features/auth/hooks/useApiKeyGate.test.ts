import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as Keychain from 'react-native-keychain';
import { useApiKeyGate } from './useApiKeyGate';

const MOCK_CREDENTIALS = { username: 'steam', password: 'MYAPIKEY', service: 'steam_api_key' };

describe('useApiKeyGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
  });

  it('starts with checked=false, hasKey=false', () => {
    const { result } = renderHook(() => useApiKeyGate(false));
    expect(result.current.apiKeyChecked).toBe(false);
    expect(result.current.hasApiKey).toBe(false);
  });

  it('fires Keychain check when isAuthenticated transitions to true', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

    const { result, rerender } = renderHook(
      ({ auth }: { auth: boolean }) => useApiKeyGate(auth),
      { initialProps: { auth: false } },
    );

    rerender({ auth: true });

    await waitFor(() => {
      expect(result.current.apiKeyChecked).toBe(true);
    });

    expect(Keychain.getGenericPassword).toHaveBeenCalledWith({ service: 'steam_api_key' });
  });

  it('hasApiKey=true when Keychain returns credentials', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(MOCK_CREDENTIALS);

    const { result } = renderHook(() => useApiKeyGate(true));

    await waitFor(() => {
      expect(result.current.apiKeyChecked).toBe(true);
    });

    expect(result.current.hasApiKey).toBe(true);
  });

  it('hasApiKey=false when Keychain returns false (no key stored)', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useApiKeyGate(true));

    await waitFor(() => {
      expect(result.current.apiKeyChecked).toBe(true);
    });

    expect(result.current.hasApiKey).toBe(false);
  });

  it('hasApiKey=false when Keychain throws', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockRejectedValue(new Error('Keychain error'));

    const { result } = renderHook(() => useApiKeyGate(true));

    await waitFor(() => {
      expect(result.current.apiKeyChecked).toBe(true);
    });

    expect(result.current.hasApiKey).toBe(false);
  });

  it('resets checked and hasKey on logout (isAuthenticated → false)', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(MOCK_CREDENTIALS);

    const { result, rerender } = renderHook(
      ({ auth }: { auth: boolean }) => useApiKeyGate(auth),
      { initialProps: { auth: true } },
    );

    await waitFor(() => {
      expect(result.current.apiKeyChecked).toBe(true);
      expect(result.current.hasApiKey).toBe(true);
    });

    act(() => {
      rerender({ auth: false });
    });

    expect(result.current.apiKeyChecked).toBe(false);
    expect(result.current.hasApiKey).toBe(false);
  });

  it('onApiKeySaved sets hasApiKey=true without Keychain call', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useApiKeyGate(true));

    await waitFor(() => {
      expect(result.current.apiKeyChecked).toBe(true);
    });

    expect(result.current.hasApiKey).toBe(false);

    act(() => {
      result.current.onApiKeySaved();
    });

    expect(result.current.hasApiKey).toBe(true);
    expect(result.current.apiKeyChecked).toBe(true);
    // Only one Keychain call on mount — onApiKeySaved doesn't trigger another
    expect(Keychain.getGenericPassword).toHaveBeenCalledTimes(1);
  });
});
