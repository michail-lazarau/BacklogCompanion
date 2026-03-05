import { authReducer, setAuthenticated, clearAuth } from './authSlice';

describe('authSlice', () => {
  it('has correct initial state', () => {
    const state = authReducer(undefined, { type: '@@INIT' });
    expect(state.isAuthenticated).toBe(false);
    expect(state.steamId).toBeNull();
  });

  it('setAuthenticated sets isAuthenticated=true and steamId', () => {
    const state = authReducer(
      undefined,
      setAuthenticated({ isAuthenticated: true, steamId: '76561198000000000' }),
    );
    expect(state.isAuthenticated).toBe(true);
    expect(state.steamId).toBe('76561198000000000');
  });

  it('setAuthenticated can set isAuthenticated=false with null steamId', () => {
    const state = authReducer(
      undefined,
      setAuthenticated({ isAuthenticated: false, steamId: null }),
    );
    expect(state.isAuthenticated).toBe(false);
    expect(state.steamId).toBeNull();
  });

  it('clearAuth resets to initial state', () => {
    const authenticated = authReducer(
      undefined,
      setAuthenticated({ isAuthenticated: true, steamId: '76561198000000000' }),
    );
    const state = authReducer(authenticated, clearAuth());
    expect(state.isAuthenticated).toBe(false);
    expect(state.steamId).toBeNull();
  });
});
