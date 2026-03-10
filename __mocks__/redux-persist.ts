// Mock redux-persist to prevent persistStore's internal setTimeout from leaking
// into Jest worker processes. persistReducer returns the base reducer unchanged;
// persistStore returns a no-op stub. All action type constants are preserved so
// the store's serializableCheck ignoredActions list remains valid.

export const FLUSH = 'persist/FLUSH';
export const PAUSE = 'persist/PAUSE';
export const PERSIST = 'persist/PERSIST';
export const PURGE = 'persist/PURGE';
export const REGISTER = 'persist/REGISTER';
export const REHYDRATE = 'persist/REHYDRATE';

// Return the base reducer directly — no _persist wrapping, no internal timers
export const persistReducer = (_config: unknown, reducer: unknown) => reducer;

export const persistStore = () => ({
  purge: () => Promise.resolve(),
  flush: () => Promise.resolve(),
  pause: () => {},
  persist: () => {},
  dispatch: () => {},
  getState: () => ({}),
  subscribe: () => () => {},
});
