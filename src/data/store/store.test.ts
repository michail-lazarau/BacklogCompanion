import { store } from './index';
import { setAuthenticated, clearAuth } from '@features/auth/store/authSlice';
import { setSyncStatus } from '@features/library/store/librarySlice';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Redux store', () => {
  beforeEach(() => {
    store.dispatch(clearAuth());
    store.dispatch(setSyncStatus('idle'));
  });

  it('has correct initial state shape', () => {
    const state = store.getState();
    expect(state).toHaveProperty('auth');
    expect(state).toHaveProperty('library');
  });

  it('auth initial state: isAuthenticated=false, steamId=null', () => {
    const { auth } = store.getState() as any;
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.steamId).toBeNull();
  });

  it('library initial state: sync_status=idle, activeFilter=null', () => {
    const { library } = store.getState() as any;
    expect(library.sync_status).toBe('idle');
    expect(library.activeFilter).toBeNull();
  });

  it('dispatched auth state is readable from store (simulates rehydration shape)', () => {
    store.dispatch(setAuthenticated({ isAuthenticated: true, steamId: '76561198000000000' }));
    const { auth } = store.getState() as any;
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.steamId).toBe('76561198000000000');
  });

  it('dispatched library state is readable from store', () => {
    store.dispatch(setSyncStatus('syncing'));
    const { library } = store.getState() as any;
    expect(library.sync_status).toBe('syncing');
  });
});
