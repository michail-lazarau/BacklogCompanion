import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  steamId: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  steamId: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticated(
      state,
      action: PayloadAction<{ isAuthenticated: boolean; steamId: string | null }>,
    ) {
      state.isAuthenticated = action.payload.isAuthenticated;
      state.steamId = action.payload.steamId;
    },
    clearAuth(state) {
      state.isAuthenticated = false;
      state.steamId = null;
    },
  },
});

export const { setAuthenticated, clearAuth } = authSlice.actions;
export const authReducer = authSlice.reducer;
