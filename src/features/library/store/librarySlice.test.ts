import { libraryReducer, setSyncStatus, setSyncError, setActiveFilter, setActiveSort } from './librarySlice';

describe('librarySlice', () => {
  it('has correct initial state', () => {
    const state = libraryReducer(undefined, { type: '@@INIT' });
    expect(state.sync_status).toBe('idle');
    expect(state.syncErrorReason).toBeNull();
    expect(state.activeFilter).toBeNull();
    expect(state.activeSort).toBe('alphabetical');
  });

  it('setSyncStatus updates to syncing', () => {
    const state = libraryReducer(undefined, setSyncStatus('syncing'));
    expect(state.sync_status).toBe('syncing');
  });

  it('setSyncStatus updates to error', () => {
    const state = libraryReducer(undefined, setSyncStatus('error'));
    expect(state.sync_status).toBe('error');
  });

  it('setSyncStatus can return to idle', () => {
    const syncing = libraryReducer(undefined, setSyncStatus('syncing'));
    const state = libraryReducer(syncing, setSyncStatus('idle'));
    expect(state.sync_status).toBe('idle');
  });

  it('setSyncStatus idle resets syncErrorReason to null', () => {
    const errored = libraryReducer(undefined, setSyncError('api_error'));
    const state = libraryReducer(errored, setSyncStatus('idle'));
    expect(state.sync_status).toBe('idle');
    expect(state.syncErrorReason).toBeNull();
  });

  it('setSyncError sets sync_status to error and records private_profile reason', () => {
    const state = libraryReducer(undefined, setSyncError('private_profile'));
    expect(state.sync_status).toBe('error');
    expect(state.syncErrorReason).toBe('private_profile');
  });

  it('setSyncError sets sync_status to error and records api_error reason', () => {
    const state = libraryReducer(undefined, setSyncError('api_error'));
    expect(state.sync_status).toBe('error');
    expect(state.syncErrorReason).toBe('api_error');
  });

  it('setActiveFilter updates activeFilter', () => {
    const state = libraryReducer(undefined, setActiveFilter('unplayed'));
    expect(state.activeFilter).toBe('unplayed');
  });

  it('setActiveFilter can clear to null', () => {
    const withFilter = libraryReducer(undefined, setActiveFilter('unplayed'));
    const cleared = libraryReducer(withFilter, setActiveFilter(null));
    expect(cleared.activeFilter).toBeNull();
  });

  it('setActiveSort updates activeSort', () => {
    const state = libraryReducer(undefined, setActiveSort('playtime_desc'));
    expect(state.activeSort).toBe('playtime_desc');
  });
});
