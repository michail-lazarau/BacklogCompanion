import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface LibraryState {
  sync_status: SyncStatus;
  activeFilter: string | null;
  activeSort: string;
}

const initialState: LibraryState = {
  sync_status: 'idle',
  activeFilter: null,
  activeSort: 'alphabetical',
};

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    setSyncStatus(state, action: PayloadAction<SyncStatus>) {
      state.sync_status = action.payload;
    },
    setActiveFilter(state, action: PayloadAction<string | null>) {
      state.activeFilter = action.payload;
    },
    setActiveSort(state, action: PayloadAction<string>) {
      state.activeSort = action.payload;
    },
  },
});

export const { setSyncStatus, setActiveFilter, setActiveSort } = librarySlice.actions;
export const libraryReducer = librarySlice.reducer;
