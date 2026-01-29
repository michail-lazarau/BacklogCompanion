// Manages user-related state in the Redux store

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  steamId: string | null;
  llmApiKey: string | null;
  llmProvider: 'openai'; // Пока один
}

const initialState: UserState = {
  steamId: null,
  llmApiKey: null,
  llmProvider: 'openai',
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setSteamId(state, action: PayloadAction<string>) {
      state.steamId = action.payload;
    },
    setLlmApiKey(state, action: PayloadAction<string>) {
      state.llmApiKey = action.payload;
    },
  },
});

export default userSlice;
