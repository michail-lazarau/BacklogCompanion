import { libraryReducer, setSyncStatus, setActiveFilter, setActiveSort } from './librarySlice';

describe('librarySlice', () => {
  it('has correct initial state', () => {
    const state = libraryReducer(undefined, { type: '@@INIT' });
    expect(state.sync_status).toBe('idle');
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
