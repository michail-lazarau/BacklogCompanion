// Sync throttle: skip full Steam library sync if last sync was < 30 minutes ago
export const SYNC_THROTTLE_MS = 30 * 60 * 1000; // 30 minutes in ms

export const MMKV_KEYS = {
  LAST_FULL_SYNC: 'last_full_sync',
  LIBRARY_SNAPSHOT: 'library_snapshot',
} as const;
