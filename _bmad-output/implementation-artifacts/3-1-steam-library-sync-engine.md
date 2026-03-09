# Story 3.1: Steam Library Sync Engine

Status: ready-for-dev

> **Prerequisite:** Story 3-0 (Network HTTP Client) must be done first. This story assumes:
> - `httpClient.ts` throws typed `AppError` subtypes (`SteamError UNAUTHORIZED/RATE_LIMITED`, `NetworkError TIMEOUT/UNKNOWN`)
> - `src/shared/types/httpClient.types.ts` exists and `src/types/httpClient.types.ts` is already a re-export stub (both done by 3-0)

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want my Steam game library to be silently fetched and kept up to date in the background,
so that my library data is always fresh without me having to manually trigger a sync.

## Acceptance Criteria

**AC1 — Full sync on app open (throttled):**
**Given** the user is authenticated with a valid Steam API key
**When** the app opens and the Library tab is shown
**Then** `useSteamSync` triggers a full library fetch via `GetOwnedGames` only if `last_full_sync` in MMKV is older than `SYNC_THROTTLE_MS` (30 minutes)
**And** `librarySlice.sync_status` is set to `'syncing'` during the fetch
**And** `librarySlice.sync_status` is set to `'idle'` on success
**And** `last_full_sync` in MMKV is updated (`.set()`) on successful full sync

**AC2 — Delta detection: only dirty rows written:**
**Given** a full sync runs successfully
**When** `GetOwnedGames` response is processed
**Then** delta detection compares incoming `rtime_last_played` + `playtime_forever` against the existing `last_synced_at` / `playtime_forever` in `steam_games` SQLite — only rows where these values differ are upserted
**And** `last_synced_at` is set to `Date.now()` (Unix ms → seconds if using `{ mode: 'timestamp' }`) for each upserted row
**And** user annotations (`user_annotations` table, added in Story 4.4) are never touched by the sync engine

**AC3 — Incremental sync: recently played only (within throttle window):**
**Given** a subsequent app open within 30 minutes of the last full sync
**When** `useSteamSync` runs
**Then** a full `GetOwnedGames` sync is skipped
**And** `GetRecentlyPlayedGames` (limit: 10 games) is called instead for an incremental update
**And** the same delta detection logic applies to the returned games
**And** `librarySlice.sync_status` cycles through `'syncing'` → `'idle'` (or `'error'`)

**AC4 — API error handling: exponential backoff, no data loss:**
**Given** the Steam API returns a 429 (rate limit) or any network error
**When** the sync fails
**Then** `librarySlice.sync_status` is set to `'error'`
**And** exponential backoff with jitter is applied on retry (do not retry immediately)
**And** previously cached SQLite library data remains intact and visible
**And** no error modal is shown to the user — silent failure (NFR-REL-01)

**AC5 — Private profile guard: empty array must NOT wipe local library:**
**Given** `GetOwnedGames` returns an empty games array (0 items)
**When** the sync engine processes the response
**Then** the sync engine must NOT overwrite the local SQLite library with an empty dataset
**And** `librarySlice.sync_status` is set to `'error'` with reason `'private_profile'`
**And** a non-blocking toast informs the user: "Your Steam library is private. Go to Steam → Privacy Settings → Game Details → set to Public."
**And** previously cached library data remains intact and visible

> **Constraint:** Steam's `GetOwnedGames` API returns an empty array (not an error) when the user's game details are set to Private. An empty response must be treated as a private-profile error, not a valid empty library, to avoid data loss.

## Tasks / Subtasks

- [ ] Task 1: Migrate `steam.types.ts` and add new API functions (AC: 1, 3)
  - [ ] Subtask 1.1: Migrate `src/types/steam.types.ts` → `src/shared/types/steam.types.ts` (copy content); replace original with re-export stub (see Dev Notes: Type File Migration)
  - [ ] Subtask 1.2: Add `GetRecentlyPlayedGamesResponse` interface to `src/shared/types/steam.types.ts` (reuses existing `SteamGame` type; add to export list — do NOT export other currently-unexported interfaces)
  - [ ] Subtask 1.3: Update imports in `src/data/api/steam.ts` to use `@shared/types/steam.types` and `@shared/types/httpClient.types` (the latter already has a canonical file from Story 3-0)
  - [ ] Subtask 1.4: Add `getOwnedGamesWithKey(apiKey: string, steamId: string): Promise<SteamOwnedGamesResponse>` to `src/data/api/steam.ts` — named export; raw fetch with 401/403 → `SteamError` (same pattern as `getPlayerSummaries`)
  - [ ] Subtask 1.5: Add `getRecentlyPlayedGamesWithKey(apiKey: string, steamId: string, count?: number): Promise<GetRecentlyPlayedGamesResponse>` to `src/data/api/steam.ts` — named export; calls `IPlayerService/GetRecentlyPlayedGames/v0001/` with `count=10`
  - [ ] Subtask 1.6: Write/update tests in `src/data/api/steam.test.ts` for the two new functions (mock `fetch`; assert URL params; assert `SteamError` thrown on 401/403)
  - [ ] Subtask 1.7: `npx tsc --noEmit` — zero errors after migration (prototype files resolve via re-export stubs)

- [ ] Task 2: Extend `librarySlice.ts` with `private_profile` error reason (AC: 5)
  - [ ] Subtask 2.1: Update `SyncStatus` in `src/features/library/store/librarySlice.ts` to `'idle' | 'syncing' | 'error'` (already exists) — no change needed to status values
  - [ ] Subtask 2.2: Add `syncErrorReason: 'private_profile' | 'api_error' | null` field to `LibraryState` and `initialState`
  - [ ] Subtask 2.3: Add `setSyncError(state, action: PayloadAction<'private_profile' | 'api_error'>)` reducer that sets both `sync_status: 'error'` AND `syncErrorReason`
  - [ ] Subtask 2.4: Update `setSyncStatus` or keep separate — ensure `setSyncStatus('idle')` resets `syncErrorReason` to `null`
  - [ ] Subtask 2.5: Update `librarySlice.test.ts` to cover `syncErrorReason` transitions

- [ ] Task 3: Create `src/features/library/hooks/useSteamSync.ts` (AC: 1, 2, 3, 4, 5)
  - [ ] Subtask 3.1: Create `src/features/library/hooks/useSteamSync.ts` — named export `useSteamSync`
  - [ ] Subtask 3.2: Read `steamId` from `useAppSelector(state => state.auth.steamId)`
  - [ ] Subtask 3.3: Read `isAuthenticated` from `useAppSelector(state => state.auth.isAuthenticated)`
  - [ ] Subtask 3.4: Read Steam API key from Keychain on mount: `Keychain.getGenericPassword({ service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY })`
  - [ ] Subtask 3.5: Check MMKV `last_full_sync` value (key: `'last_full_sync'`) using `mmkv.getString('last_full_sync')` — compare against `Date.now() - SYNC_THROTTLE_MS`
  - [ ] Subtask 3.6: If throttle elapsed (or no prior sync): call `getOwnedGamesWithKey`, process full sync
  - [ ] Subtask 3.7: If within throttle window: call `getRecentlyPlayedGamesWithKey`, process incremental sync
  - [ ] Subtask 3.8: Delta detection logic: for each game in API response, check if `steam_games` row exists via `db.select().from(steamGames).where(eq(steamGames.appId, game.appid))` — compare `playtimeForever` and `rtimeLastPlayed`; upsert only if different
  - [ ] Subtask 3.9: Upsert pattern: use Drizzle `db.insert(steamGames).values({...}).onConflictDoUpdate({ target: steamGames.appId, set: { ... } })`; set `lastSyncedAt: new Date()` on upserted rows
  - [ ] Subtask 3.10: Empty array guard (AC5): if `response.response.games.length === 0`, dispatch `setSyncError('private_profile')`, show Toast, return early — do NOT touch SQLite
  - [ ] Subtask 3.11: Error handling (AC4): catch errors, dispatch `setSyncError('api_error')`; implement exponential backoff with jitter using `useRef` for retry count
  - [ ] Subtask 3.12: On successful full sync: call `mmkv.set('last_full_sync', Date.now().toString())`
  - [ ] Subtask 3.13: `useSessionExpiry.handleSteamAuthError` for `SteamError` with `code === 'UNAUTHORIZED'` (401/403 from sync call)
  - [ ] Subtask 3.14: Expose `{ syncStatus, triggerSync }` from hook (for manual refresh in Story 3.2)

- [ ] Task 4: Create MMKV singleton for sync flags (AC: 1, 3)
  - [ ] Subtask 4.1: Create `src/data/mmkv.ts` — named export `mmkv` as a module-level singleton: `export const mmkv = new MMKV();` (import from `react-native-mmkv`)
  - [ ] Subtask 4.2: Key constant: export `MMKV_KEYS = { LAST_FULL_SYNC: 'last_full_sync' } as const` from `src/shared/constants/index.ts`
  - [ ] Subtask 4.3: `useSteamSync` imports `mmkv` from `src/data/mmkv`; never creates a new MMKV instance inline

- [ ] Task 5: Write tests for `useSteamSync` (AC: all)
  - [ ] Subtask 5.1: Create `src/features/library/hooks/useSteamSync.test.ts`
  - [ ] Subtask 5.2: Test: first sync (no `last_full_sync` in MMKV) → calls `getOwnedGamesWithKey`, not `getRecentlyPlayedGamesWithKey`
  - [ ] Subtask 5.3: Test: sync within throttle window → calls `getRecentlyPlayedGamesWithKey`, skips full sync
  - [ ] Subtask 5.4: Test: empty games array → dispatch `setSyncError('private_profile')`, SQLite NOT written, Toast shown
  - [ ] Subtask 5.5: Test: `getOwnedGamesWithKey` throws `SteamError { code: 'UNAUTHORIZED' }` → `handleSteamAuthError` called
  - [ ] Subtask 5.6: Test: API 429/network error → `setSyncError('api_error')` dispatched, backoff applied
  - [ ] Subtask 5.7: Test: delta detection — only rows with changed playtime/rtime are upserted (mock db, verify upsert called for dirty rows only)
  - [ ] Subtask 5.8: Test: successful full sync → `mmkv.set('last_full_sync', ...)` called
  - [ ] Subtask 5.9: Mock setup: `jest.mock('src/data/mmkv')`, `jest.mock('@op-engineering/op-sqlite')` (already in jest.config.js), `jest.mock('react-native-keychain')`, `jest.mock('src/data/api/steam')`

- [ ] Task 6: Validate (AC: TypeScript + ESLint + Jest)
  - [ ] Subtask 6.1: `npx tsc --noEmit` — zero TypeScript errors
  - [ ] Subtask 6.2: `npx eslint src/ --ext .ts,.tsx` — zero new lint errors
  - [ ] Subtask 6.3: `npx jest` — all tests pass (currently 121)

## Dev Notes

### STOP: Read Before Writing Any Code

These files must NOT be modified (read only, import only):
- `src/data/api/httpClient.ts` — shared HTTP abstraction; no changes needed
- `src/features/library/store/librarySlice.ts` — extend only (add `syncErrorReason` field and `setSyncError` action); do NOT remove existing actions
- `src/features/auth/hooks/useSessionExpiry.ts` — import `handleSteamAuthError` only; do NOT modify
- `src/features/auth/hooks/useSteamAuth.ts` — import `STEAM_KEYCHAIN_SERVICES` only; do NOT modify
- `src/shared/queryKeys.ts` — no new keys needed for this story (sync engine is not a TanStack Query hook)
- `src/navigation/RootNavigator.tsx` — do NOT touch
- `src/App.tsx` — do NOT touch

### What Already Exists — Read First, Don't Recreate

| File | Current State | Action |
|---|---|---|
| `src/data/api/steam.ts` | Has `getOwnedGames(steamId)` using `Config.STEAM_API_KEY` (env var) | ADD `getOwnedGamesWithKey(apiKey, steamId)` — do NOT modify `getOwnedGames` |
| `src/types/steam.types.ts` | Has `SteamOwnedGamesResponse`, `SteamGame` interfaces | ADD `GetRecentlyPlayedGamesResponse` interface only |
| `src/features/library/store/librarySlice.ts` | Has `sync_status: SyncStatus`, `setSyncStatus`, `setActiveFilter`, `setActiveSort` | ADD `syncErrorReason` field + `setSyncError` action |
| `src/shared/constants/index.ts` | Has `SYNC_THROTTLE_MS = 30 * 60 * 1000` | ADD `MMKV_KEYS` constant |
| `src/features/library/hooks/` | Empty `.gitkeep` | CREATE `useSteamSync.ts` + `useSteamSync.test.ts` |
| `jest.config.js` | Has `react-native-mmkv` mock mapper | No changes expected — MMKV already mocked |

### Critical Architecture Warning: getOwnedGames vs getOwnedGamesWithKey

The existing `getOwnedGames(steamId)` in `steam.ts` reads `Config.STEAM_API_KEY` from environment variables — this is a **prototype pattern**. In production (Epic 3+), the API key is user-supplied and stored in Keychain (established in Story 2.2). The sync engine **must** use the Keychain key, not the env var.

**DO NOT** call `getOwnedGames(steamId)` from `useSteamSync`. Instead:
1. Read API key from Keychain: `Keychain.getGenericPassword({ service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY })`
2. Call `getOwnedGamesWithKey(apiKey, steamId)` with the retrieved key

The new function follows the same raw-fetch pattern as `getPlayerSummaries` in `steam.ts` (line 46+) to preserve 401/403 status code detection:

```ts
export const getOwnedGamesWithKey = async (
  apiKey: string,
  steamId: string,
): Promise<SteamOwnedGamesResponse> => {
  const queryString =
    'key=' + encodeURIComponent(apiKey) +
    '&steamid=' + encodeURIComponent(steamId) +
    '&format=json' +
    '&include_appinfo=1';
  const url = `${API_BASE_URLS.steam}/IPlayerService/GetOwnedGames/v0001/?${queryString}`;

  const response = await fetch(url);

  if (response.status === 401 || response.status === 403) {
    const steamError: SteamError = {
      type: 'SteamError',
      code: 'UNAUTHORIZED',
      message: `Steam API returned ${response.status}`,
    };
    throw steamError;
  }

  if (!response.ok) {
    throw new Error(`Steam API error: ${response.status}`);
  }

  return response.json() as Promise<SteamOwnedGamesResponse>;
};
```

### Type File Migration: steam.types.ts only

**Story 3-0 already handles:** `src/types/httpClient.types.ts` → `src/shared/types/httpClient.types.ts` (canonical) + stub. That is done before this story runs.

**This story handles:** `src/types/steam.types.ts` only.

| From | To | Alias |
|---|---|---|
| `src/types/steam.types.ts` | `src/shared/types/steam.types.ts` | `@shared/types/steam.types` |
| `src/types/httpClient.types.ts` | ✅ done by Story 3-0 | `@shared/types/httpClient.types` |

**Migration steps:**
1. Copy full content of `src/types/steam.types.ts` to `src/shared/types/steam.types.ts`
2. Add `GetRecentlyPlayedGamesResponse` to `src/shared/types/steam.types.ts` (see below)
3. Replace `src/types/steam.types.ts` with a re-export stub:

```ts
// src/types/steam.types.ts — STUB after migration
/** @deprecated Import from @shared/types/steam.types instead */
export type { SteamOwnedGamesResponse, SteamGame, SteamAppData, SteamAppDetailsResponse, ReducedSteamGame, LLMGameSuggestionResponse, GetRecentlyPlayedGamesResponse } from '../shared/types/steam.types';
```

4. Update `src/data/api/steam.ts` imports to `@shared/types/steam.types` and `@shared/types/httpClient.types`
5. `npx tsc --noEmit` — prototype files in `src/types/` resolve via stubs transparently

**After migration, `src/data/api/steam.ts` imports become:**
```ts
import type { SteamError } from '@shared/types/errors.types';
import type { SteamOwnedGamesResponse, SteamGame, GetRecentlyPlayedGamesResponse } from '@shared/types/steam.types';
import { API_BASE_URLS } from '@shared/types/httpClient.types';
```

**`GetRecentlyPlayedGamesResponse` — add to `src/shared/types/steam.types.ts`:**

```ts
// Add this interface (Steam API endpoint IPlayerService/GetRecentlyPlayedGames/v0001/)
interface GetRecentlyPlayedGamesResponse {
  response: {
    total_count: number;
    games: SteamGame[]; // reuses existing SteamGame interface — no new type needed
  };
}
```

Then add to the export list at the bottom:
```ts
export type { ..., GetRecentlyPlayedGamesResponse };
```

**Note:** Most interfaces in `steam.types.ts` are intentionally NOT exported (internal to the API layer). Only add `GetRecentlyPlayedGamesResponse` to the export — do not export other currently-unexported interfaces.

### MMKV Singleton — Create src/data/mmkv.ts

MMKV is used in `src/data/store/index.ts` (Redux Persist) and should be used for the sync timestamp. Create a dedicated singleton to avoid multiple MMKV instances:

```ts
// src/data/mmkv.ts
import { MMKV } from 'react-native-mmkv';

// Single MMKV instance shared across the app (not for Redux Persist — that uses store/index.ts)
export const mmkv = new MMKV();
```

**Note:** The `reduxStorage` adapter in `src/data/store/index.ts` creates its own MMKV instance (`createMMKV()`) for Redux Persist. This is intentional separation. The `src/data/mmkv.ts` singleton is for direct MMKV operations (like sync timestamp flags).

**MMKV v4 API reminder:**
- Write: `mmkv.set(key, value)` — value must be `string | number | boolean`
- Read string: `mmkv.getString(key)` — returns `string | undefined`
- Delete: `mmkv.remove(key)`
- **DO NOT use:** `.setItem()` / `.getItem()` / `.removeItem()` (MMKV v3 API — removed in v4)

### Drizzle Upsert Pattern (op-sqlite)

```ts
import { eq } from 'drizzle-orm';
import { db } from '@db/index';
import { steamGames } from '@db/schema';
import type { NewSteamGame } from '@db/schema';

// Delta detection: only upsert if data changed
const existingRow = await db
  .select({ playtimeForever: steamGames.playtimeForever, rtimeLastPlayed: steamGames.rtimeLastPlayed })
  .from(steamGames)
  .where(eq(steamGames.appId, game.appid))
  .get();

const isDirty =
  !existingRow ||
  existingRow.playtimeForever !== game.playtime_forever ||
  (existingRow.rtimeLastPlayed?.getTime() ?? 0) !== (game.rtime_last_played ?? 0) * 1000;

if (isDirty) {
  const row: NewSteamGame = {
    appId: game.appid,
    name: game.name,
    playtimeForever: game.playtime_forever,
    playtime2weeks: game.playtime_2weeks ?? null,
    rtimeLastPlayed: game.rtime_last_played
      ? new Date(game.rtime_last_played * 1000)
      : null,
    imgIconUrl: game.img_icon_url,
    headerImage: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
    lastSyncedAt: new Date(),
    // HLTB fields start null — populated on-demand in Story 4.2
  };

  await db
    .insert(steamGames)
    .values(row)
    .onConflictDoUpdate({
      target: steamGames.appId,
      set: {
        name: row.name,
        playtimeForever: row.playtimeForever,
        playtime2weeks: row.playtime2weeks,
        rtimeLastPlayed: row.rtimeLastPlayed,
        imgIconUrl: row.imgIconUrl,
        headerImage: row.headerImage,
        lastSyncedAt: row.lastSyncedAt,
      },
    });
}
```

**Key notes:**
- `lastSyncedAt` column uses `{ mode: 'timestamp' }` in schema — Drizzle stores/retrieves as `Date` object (seconds × 1000)
- `rtime_last_played` from Steam API is a Unix timestamp in **seconds** — multiply by 1000 for JS Date
- Header image URL is derived client-side (Steam CDN pattern) — never returned by `GetOwnedGames`
- Do NOT touch `hltbMain`, `hltbExtra`, `hltbComplete`, `hltbCachedAt` — those are set in Story 4.2

### Performance: Batch Writes for Large Libraries

A user may have 500–2000 games. Avoid N+1 queries. Consider batching:
1. Fetch all existing `appId` + `playtimeForever` + `rtimeLastPlayed` in one `db.select()` call
2. Build a Map for O(1) dirty-check lookups
3. Collect all dirty rows into an array
4. Batch insert with `db.insert(steamGames).values(dirtyRows).onConflictDoUpdate(...)` — Drizzle/op-sqlite supports multi-row insert

```ts
// Batch select all existing rows (one query, not N queries)
const existingRows = await db
  .select({ appId: steamGames.appId, playtimeForever: steamGames.playtimeForever, rtimeLastPlayed: steamGames.rtimeLastPlayed })
  .from(steamGames);

const existingMap = new Map(existingRows.map(r => [r.appId, r]));

// Compute dirty rows
const dirtyRows: NewSteamGame[] = games
  .filter(game => {
    const existing = existingMap.get(game.appid);
    return !existing || existing.playtimeForever !== game.playtime_forever;
  })
  .map(game => ({ ... }));

// Single batch upsert (if any dirty)
if (dirtyRows.length > 0) {
  await db.insert(steamGames).values(dirtyRows).onConflictDoUpdate({ ... });
}
```

### Exponential Backoff with Jitter

```ts
const getBackoffDelay = (retryCount: number): number => {
  const base = Math.min(1000 * Math.pow(2, retryCount), 30000); // cap at 30s
  const jitter = Math.random() * 1000; // 0–1s random jitter
  return base + jitter;
};
```

Use `useRef<number>` to track retry count across renders without triggering re-renders.

### Private Profile Toast

```ts
import Toast from 'react-native-toast-message';

Toast.show({
  type: 'error',
  text1: 'Library is Private',
  text2: 'Go to Steam → Privacy Settings → Game Details → set to Public.',
  position: 'bottom',
  visibilityTime: 6000,
});
```

`react-native-toast-message` is already in `transformIgnorePatterns` and mocked at `__mocks__/react-native-toast-message.ts`. The `<Toast />` instance is rendered in `App.tsx` (from Story 2.1). Do NOT add another instance.

### useSteamSync Hook — Implementation Sketch

```ts
// src/features/library/hooks/useSteamSync.ts
import { useEffect, useRef, useCallback } from 'react';
import * as Keychain from 'react-native-keychain';
import { useAppSelector, useAppDispatch } from '@shared/hooks/reduxHooks';
import { setSyncStatus, setSyncError } from '@features/library/store/librarySlice';
import { useSessionExpiry } from '@features/auth/hooks/useSessionExpiry';
import { STEAM_KEYCHAIN_SERVICES } from '@features/auth/hooks/useSteamAuth';
import { getOwnedGamesWithKey, getRecentlyPlayedGamesWithKey } from '../../../data/api/steam';
import type { SteamGame } from '@shared/types/steam.types';
import { db } from '@db/index';
import { steamGames } from '@db/schema';
import { mmkv } from '../../../data/mmkv';
import { SYNC_THROTTLE_MS, MMKV_KEYS } from '@shared/constants';
import type { SteamError } from '@shared/types/errors.types';
import Toast from 'react-native-toast-message';

const isSteamError = (e: unknown): e is SteamError =>
  typeof e === 'object' && e !== null && (e as SteamError).type === 'SteamError';

export const useSteamSync = () => {
  const dispatch = useAppDispatch();
  const steamId = useAppSelector((state) => state.auth.steamId);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { handleSteamAuthError } = useSessionExpiry();
  const retryCountRef = useRef(0);

  const runSync = useCallback(async () => {
    if (!isAuthenticated || !steamId) return;

    // Read API key from Keychain (not env var — production pattern)
    const keychainResult = await Keychain.getGenericPassword({
      service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY,
    });
    if (!keychainResult) return; // No API key stored — skip sync

    const apiKey = keychainResult.password;

    dispatch(setSyncStatus('syncing'));

    try {
      // Throttle check
      const lastFullSyncStr = mmkv.getString(MMKV_KEYS.LAST_FULL_SYNC);
      const lastFullSync = lastFullSyncStr ? parseInt(lastFullSyncStr, 10) : 0;
      const isThrottled = Date.now() - lastFullSync < SYNC_THROTTLE_MS;

      let games: SteamGame[];

      if (isThrottled) {
        // Incremental: recently played only
        const response = await getRecentlyPlayedGamesWithKey(apiKey, steamId, 10);
        games = response.response.games ?? [];
      } else {
        // Full sync
        const response = await getOwnedGamesWithKey(apiKey, steamId);

        // Private profile guard (AC5)
        if (!response.response.games || response.response.games.length === 0) {
          dispatch(setSyncError('private_profile'));
          Toast.show({
            type: 'error',
            text1: 'Library is Private',
            text2: 'Go to Steam → Privacy Settings → Game Details → set to Public.',
            position: 'bottom',
            visibilityTime: 6000,
          });
          return;
        }

        games = response.response.games;

        // Update MMKV throttle timestamp on successful full sync
        mmkv.set(MMKV_KEYS.LAST_FULL_SYNC, Date.now().toString());
      }

      // Delta detection + batch upsert
      await applyDeltaSync(games);

      retryCountRef.current = 0;
      dispatch(setSyncStatus('idle'));
    } catch (e: unknown) {
      if (isSteamError(e) && e.code === 'UNAUTHORIZED') {
        await handleSteamAuthError(e);
        return;
      }

      dispatch(setSyncError('api_error'));

      // Exponential backoff: back off on rate-limit (429) and transient errors.
      // After Story 3-0, RATE_LIMITED is a typed SteamError code — no message parsing needed.
      retryCountRef.current += 1;
      const delay = getBackoffDelay(retryCountRef.current);
      setTimeout(() => runSync(), delay);
    }
  }, [isAuthenticated, steamId, dispatch, handleSteamAuthError]);

  useEffect(() => {
    runSync();
  }, [runSync]);

  return { triggerSync: runSync };
};
```

### Import Path Conventions

From `src/features/library/hooks/`:
- `@features/auth/hooks/useSteamAuth` → `@features/auth/hooks/useSteamAuth` (alias works)
- `@features/auth/hooks/useSessionExpiry` → `@features/auth/hooks/useSessionExpiry` (alias works)
- `src/data/api/steam` → `'../../../data/api/steam'` (relative, `@data` alias does NOT exist)
- `src/data/mmkv` → `'../../../data/mmkv'` (relative)
- `src/db/index` → `'../../../db'` (via `@db` alias — check tsconfig)
- `src/db/schema` → `'../../../db/schema'` (via `@db` alias or relative)

**Verify tsconfig aliases before coding:**
```json
// tsconfig.json path aliases configured in Story 1.1:
// @features → src/features
// @shared   → src/shared
// @db       → src/db
// @res      → src/res
// @navigation → src/navigation
```

`@data` alias does NOT exist. Use relative paths (`../../../data/...`) for all `src/data/` imports from `src/features/library/hooks/`.

### Testing Strategy

**Mock approach for `useSteamSync`:**

```ts
// Mock entire src/data/api/steam module
jest.mock('../../../data/api/steam', () => ({
  getOwnedGamesWithKey: jest.fn(),
  getRecentlyPlayedGamesWithKey: jest.fn(),
}));

// Mock MMKV singleton
jest.mock('../../../data/mmkv', () => ({
  mmkv: {
    getString: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

// Mock Drizzle db — op-sqlite is already mocked in jest.config.js
jest.mock('../../../db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        all: jest.fn().mockResolvedValue([]),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

// Mock react-native-keychain (already mocked at __mocks__/react-native-keychain.ts)
// Override getGenericPassword for API key retrieval:
import * as Keychain from 'react-native-keychain';
(Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
  username: 'steam',
  password: 'test-api-key-123',
  service: 'steam_api_key',
  storage: '',
});
```

**Test wrapper:**
```ts
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

const createTestStore = (overrides = {}) =>
  configureStore({
    reducer: { auth: authReducer, library: libraryReducer },
    preloadedState: {
      auth: { isAuthenticated: true, steamId: '76561198012345678' },
      library: { sync_status: 'idle', syncErrorReason: null, activeFilter: null, activeSort: 'alphabetical' },
      ...overrides,
    },
  });
```

### Steam Store appdetails Rate Limit — DO NOT CALL IN THIS STORY

`getAppDetails` (Steam Store `/api/appdetails`) is **rate-limited at ~200 requests per 5 minutes** (community-observed; undocumented by Valve). A user with 500–2000 games would immediately hit this limit if called during library sync.

**This story must NOT call `getAppDetails` or `getManyAppDetails`.** Here is why it is unnecessary:

`GetOwnedGames` with `include_appinfo=1` already returns everything needed for the library list view and the sync engine:
- `appid` — primary key
- `name` — game title
- `playtime_forever` — total playtime (minutes)
- `playtime_2weeks` — recent playtime (minutes)
- `rtime_last_played` — last played Unix timestamp (used for delta detection)
- `img_icon_url` — small icon hash (used to build CDN URL)

The `header_image` URL is **derived client-side** from the CDN pattern and does not require an API call:
```
https://cdn.akamai.steamstatic.com/steam/apps/{appid}/header.jpg
```

`getAppDetails` is reserved exclusively for Story 4 (Game Detail screen) where it is called **on-demand for a single game** when the user opens that game's detail screen — never in bulk during sync.

**If you find yourself importing or calling `getAppDetails` or `getManyAppDetails` in `useSteamSync` — stop. That is wrong.**

### Architecture Compliance Checklist

- ✅ Types migrated to `src/shared/types/` — reachable via `@shared/types/` alias; `src/types/` stubs preserve prototype compatibility
- ✅ Named exports only — `export const useSteamSync = ...`, `export const getOwnedGamesWithKey = ...`
- ✅ API key from Keychain — NOT from `Config.STEAM_API_KEY` (env var only used in prototype `getOwnedGames`)
- ✅ Sync timestamp stored in MMKV (non-sensitive flag) — NOT in Redux or SQLite
- ✅ Steam game data stored in SQLite via Drizzle — NOT in Redux
- ✅ `sync_status` + `syncErrorReason` in Redux (`librarySlice`) — correct state ownership (UI/session state)
- ✅ `queryKeys.ts` NOT used here — sync engine is not TanStack Query (direct db writes, not server state cached by Query)
- ✅ User annotations NOT touched by sync engine
- ✅ Unix timestamps: SQLite schema uses `{ mode: 'timestamp' }` → Drizzle handles Date ↔ integer conversion
- ✅ Empty response = private profile error, NOT valid empty library
- ✅ Tests co-located with source files (`useSteamSync.test.ts` next to `useSteamSync.ts`)
- ✅ `@data` alias does NOT exist — use 3-level relative paths
- ✅ No default exports

### Previous Story Learnings (from Stories 2-1 through 2-4)

- **`@data/*` alias does NOT exist** — use relative `'../../../data/...'` for `src/data/` imports from feature hooks
- **`@db` alias exists** — can use `@db/index` and `@db/schema` for Drizzle imports (verify in tsconfig)
- **MMKV v4 API** — `.set()` / `.getString()` / `.remove()` only; `.setItem()` etc. were v3 and are gone
- **react-native-toast-message** — already in `transformIgnorePatterns`; `Toast.show`/`Toast.hide` mocked at `__mocks__/react-native-toast-message.ts`
- **react-native-keychain** — `getGenericPassword` / `setGenericPassword` / `resetGenericPassword` mocked at `__mocks__/react-native-keychain.ts`; override per-test for specific return values
- **TanStack Query in tests** — wrap with `QueryClientProvider` + fresh `QueryClient`; this story doesn't use TanStack Query in the hook itself
- **Named exports only** — `export const X = ...`, never `export default`
- **Commit pattern** — `feat(library): <description> (story 3-1)`
- **Test count** — currently 121 tests pass; all new tests must add to this without breaking existing

### Git Intelligence (Recent Commits)

```
b0d1cb0 feat(auth): logout with UNDO toast and session clearing (story 2-4)
9dec01d feat(auth): Steam profile summary view with skeleton and session expiry (story 2-3)
f4907e2 feat(design): NativeWind design token system and style migration (story 2-0)
b5e4205 fix(auth): code review fixes for story 2-1 (round 3)
9226e64 feat(auth): Steam Web API key entry gate and validation (story 2-2)
```

Patterns established:
- Commit format: `feat(library): <description> (story 3-1)` for Epic 3 work
- All library work goes in `src/features/library/`
- API functions added to `src/data/api/steam.ts` as named exports

### Project Structure Notes

**Files to create:**
- `src/shared/types/steam.types.ts` — migrated from `src/types/steam.types.ts` + `GetRecentlyPlayedGamesResponse` added
- `src/data/mmkv.ts` — MMKV singleton
- `src/features/library/hooks/useSteamSync.ts` — main sync hook
- `src/features/library/hooks/useSteamSync.test.ts` — tests

**Files to modify (content changes):**
- `src/types/steam.types.ts` — replace with re-export stub pointing to `@shared/types/steam.types`
- `src/data/api/steam.ts` — update imports to `@shared/types/...`; add `getOwnedGamesWithKey`, `getRecentlyPlayedGamesWithKey`
- `src/data/api/steam.test.ts` — add test cases for new functions (create if doesn't exist)
- `src/features/library/store/librarySlice.ts` — add `syncErrorReason` + `setSyncError`
- `src/features/library/store/librarySlice.test.ts` — add `syncErrorReason` tests
- `src/shared/constants/index.ts` — add `MMKV_KEYS`

**Files NOT to create or modify (read-only):**
- `src/data/api/httpClient.ts` — read-only (imports will update to `@shared/types/` but logic unchanged)
- `src/features/auth/hooks/useSteamAuth.ts` — import `STEAM_KEYCHAIN_SERVICES` only
- `src/features/auth/hooks/useSessionExpiry.ts` — import `handleSteamAuthError` only
- `src/screens/` — prototype screens; they import from `src/types/` which now resolves via stubs — do NOT touch
- `src/utils/` — prototype utilities importing from `src/types/` — do NOT touch
- `src/hooks/useSteam.ts` — prototype hook — do NOT touch
- `src/navigation/RootNavigator.tsx` — do NOT touch
- `src/App.tsx` — do NOT touch
- `jest.config.js` — no new native packages in this story; no changes expected
- `src/data/store/index.ts` — read-only

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1: Steam Library Sync Engine]
- [Source: _bmad-output/planning-artifacts/architecture.md#Sync Strategy — Background Sync with Delta Detection]
- [Source: _bmad-output/planning-artifacts/architecture.md#Steam API — Rate Limit Strategy]
- [Source: _bmad-output/planning-artifacts/architecture.md#State Ownership Matrix]
- [Source: _bmad-output/planning-artifacts/architecture.md#MMKV Usage Patterns]
- [Source: src/db/schema.ts — steamGames table definition with lastSyncedAt]
- [Source: src/data/api/steam.ts — getPlayerSummaries raw-fetch pattern for 401/403 detection]
- [Source: src/features/library/store/librarySlice.ts — existing SyncStatus type and reducers]
- [Source: src/shared/constants/index.ts — SYNC_THROTTLE_MS]
- [Source: src/shared/queryKeys.ts — query key factory (not used by sync engine)]
- [Source: src/shared/types/errors.types.ts — SteamError discriminated union]
- [Source: _bmad-output/implementation-artifacts/2-4-logout-and-session-clearing.md#Dev Notes]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Story creation — 2026-03-06)

### Debug Log References

### Completion Notes List

### File List
