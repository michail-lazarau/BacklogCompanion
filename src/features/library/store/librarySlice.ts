import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SyncStatus = 'idle' | 'syncing' | 'error';
export type SyncErrorReason = 'private_profile' | 'api_error';

interface LibraryState {
  sync_status: SyncStatus;
  syncErrorReason: SyncErrorReason | null;
  activeFilter: string | null;
  activeSort: string;
}

const initialState: LibraryState = {
  sync_status: 'idle',
  syncErrorReason: null,
  activeFilter: null,
  activeSort: 'alphabetical',
};

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    setSyncStatus(state, action: PayloadAction<SyncStatus>) {
      state.sync_status = action.payload;
      if (action.payload === 'idle') {
        state.syncErrorReason = null;
      }
    },
    setSyncError(state, action: PayloadAction<SyncErrorReason>) {
      state.sync_status = 'error';
      state.syncErrorReason = action.payload;
    },
    setActiveFilter(state, action: PayloadAction<string | null>) {
      state.activeFilter = action.payload;
    },
    setActiveSort(state, action: PayloadAction<string>) {
      state.activeSort = action.payload;
    },
  },
});

export const { setSyncStatus, setSyncError, setActiveFilter, setActiveSort } = librarySlice.actions;
export const libraryReducer = librarySlice.reducer;
