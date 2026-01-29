// Current state storage setup for Redux store with persistence using react-native-mmkv
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { createMMKV, MMKV } from 'react-native-mmkv';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  // single-time action that restores persisted state
  REHYDRATE,
  Persistor,
} from 'redux-persist';
import {
  persistReducer,
  persistStore,
} from 'redux-persist';
import { Storage } from 'redux-persist/es/types';
import userSlice from './userSlice';

const storage: MMKV = createMMKV();

// Create a custom storage object for redux-persist
export const reduxStorage: Storage = {
  setItem: (key, value) => {
    storage.set(key, value);
    return Promise.resolve(true);
  },
  getItem: (key) => {
    const value = storage.getString(key);
    return Promise.resolve(value);
  },
  removeItem: (key) => {
    storage.remove(key);
    return Promise.resolve();
  },
};

const persistConfig = {
  key: 'root',
  storage: reduxStorage,
  whitelist: ['user'], // Persist only the 'user' slice
};

// Calculates user state
// Combine all reducers into a single root reducer
const rootReducer = combineReducers({
  user: userSlice.reducer,
});

// можно упроситить до persistedReducer = userSlice.reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer, // Use the persisted reducer as the root reducer
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // отключает Redux Toolkit warnings for non-serializable values in actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
// persistor = persistenceManager - responsible for saving and rehydrating the store
export const persistor: Persistor = persistStore(store);
