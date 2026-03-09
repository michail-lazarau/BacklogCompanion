import { createMMKV } from 'react-native-mmkv';

// Single MMKV instance shared across the app (not for Redux Persist — that uses store/index.ts)
export const mmkv = createMMKV();
