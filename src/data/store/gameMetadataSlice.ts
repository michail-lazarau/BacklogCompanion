import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CachedMetadata, GameMetadataState } from '../../types/compressed-library.types';

const initialState: GameMetadataState = {
  metadata: {},
};

const gameMetadataSlice = createSlice({
  name: 'gameMetadata',
  initialState,
  reducers: {
    setGameMetadata(state, action: PayloadAction<{ appId: number; data: CachedMetadata }>) {
      const { appId, data } = action.payload;
      state.metadata[appId.toString()] = data;
    },
    removeGameMetadata(state, action: PayloadAction<number>) {
       const appId = action.payload;
       delete state.metadata[appId.toString()];
    }
  },
});

export const { reducer } = gameMetadataSlice;
export const { setGameMetadata, removeGameMetadata } = gameMetadataSlice.actions;

