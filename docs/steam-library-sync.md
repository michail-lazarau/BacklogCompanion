# Steam Library Sync Engine

**Hook:** [`src/features/library/hooks/useSteamSync.ts`](../src/features/library/hooks/useSteamSync.ts)
**Story:** 3-1 — Steam Library Sync Engine

---

## Overview

`useSteamSync` silently fetches and persists the user's Steam game library to local SQLite in the background. It runs automatically on mount and can be triggered manually (e.g. pull-to-refresh). All errors are silent — no error modal is shown to the user.

```ts
const { triggerSync } = useSteamSync();
```

---

## Sync Modes

The hook chooses between two sync paths based on a 30-minute throttle window stored in MMKV.

### Full Sync — `GetOwnedGames`

Runs when:
- No prior sync has ever been recorded (`last_full_sync` not in MMKV), **or**
- The last full sync is older than `SYNC_THROTTLE_MS` (30 minutes)

Calls `IPlayerService/GetOwnedGames/v0001/` with `include_appinfo=1`, which returns the user's complete owned library including game name, playtime, and icon URLs.

On success: updates `last_full_sync` in MMKV.

### Incremental Sync — `GetRecentlyPlayedGames`

Runs when the last full sync was within the last 30 minutes.

Calls `IPlayerService/GetRecentlyPlayedGames/v0001/` with `count=10`, fetching only the 10 most recently played games. The same delta detection logic applies — only rows with changed data are written.

Does **not** update `last_full_sync` in MMKV.

---

## Execution Flow

```
mount
  └─ useEffect([runSync]) → runSync()
        │
        ├─ Guard checks (auth, steamId, API key in Keychain)
        │     └─ any missing → return (noop, status stays 'idle')
        │
        ├─ dispatch(setSyncStatus('syncing'))
        │
        ├─ Read MMKV 'last_full_sync'
        │
        ├─ isThrottled?
        │     ├─ YES → getRecentlyPlayedGamesWithKey(apiKey, steamId, 10)
        │     └─ NO  → getOwnedGamesWithKey(apiKey, steamId)
        │                  └─ empty response? → private profile guard (see below)
        │
        ├─ applyDeltaSync(games)
        │
        └─ dispatch(setSyncStatus('idle'))
             retryCountRef reset to 0
```

---

## Delta Detection (`applyDeltaSync`)

Avoids rewriting rows that haven't changed since the last sync — critical for users with 500–2000 games.

```
applyDeltaSync(games)
  │
  ├─ games.length === 0 → return immediately (no DB work)
  │
  ├─ db.select(appId, playtimeForever, rtimeLastPlayed).from(steamGames)
  │     └─ one batch query → Map<appId, existingRow>
  │
  ├─ games.filter(game => isDirty(game, existingMap))
  │     A game is dirty if:
  │       - appId not found in map (new game)
  │       - playtimeForever changed
  │       - rtimeLastPlayed changed
  │
  └─ dirtyRows.length > 0?
        └─ db.insert(dirtyRows).onConflictDoUpdate(...)
              single batch upsert for all dirty rows
```

**What is never touched:** user annotation columns (populated in Story 4.4), HLTB fields (Story 4.2).

---

## Private Profile Guard

Steam's `GetOwnedGames` returns an empty `games` array (HTTP 200) when the user's library is set to Private — it does not return an error status. An empty response must **not** be treated as a valid empty library.

When `games` is empty or missing on a full sync:

1. `dispatch(setSyncError('private_profile'))` — `sync_status = 'error'`, `syncErrorReason = 'private_profile'`
2. A non-blocking toast is shown: *"Your Steam library is private. Go to Steam → Privacy Settings → Game Details → set to Public."*
3. SQLite is **not touched** — existing local data remains intact.

---

## Error Handling

| Error type | Behaviour |
|---|---|
| `SteamError { code: 'UNAUTHORIZED' }` (401/403) | Delegates to `useSessionExpiry.handleSteamAuthError` → triggers logout flow |
| Private profile (empty games array) | `setSyncError('private_profile')` + toast, no retry |
| Any other error (network, 429, JSON parse) | `setSyncError('api_error')` + exponential backoff retry |

### Exponential Backoff

Retries up to `MAX_RETRIES = 5` times. After 5 failures the hook stops — `sync_status` stays `'error'` until the user manually triggers a refresh or re-mounts.

```
delay = min(1000 × 2^retryCount, 30_000ms) + random(0–1000ms)
```

| Attempt | Base delay | With max jitter |
|---|---|---|
| 1 | 2 s | ~3 s |
| 2 | 4 s | ~5 s |
| 3 | 8 s | ~9 s |
| 4 | 16 s | ~17 s |
| 5 | 30 s | ~31 s |

The pending timeout handle is stored in `retryTimeoutRef` and cleared on unmount to prevent post-unmount Redux dispatches.

---

## State Ownership

| Data | Storage | Why |
|---|---|---|
| `sync_status`, `syncErrorReason` | Redux `librarySlice` | UI/session state — drives loading indicators |
| `last_full_sync` timestamp | MMKV | Lightweight non-sensitive flag; survives app restart |
| Game rows | SQLite via Drizzle | Persistent local cache; survives app restart |
| Steam API key | Keychain | Sensitive credential (set in Story 2.2) |

---

## Why sync_status Lives in Redux

`useSteamSync` and `LibraryScreen` are architecturally separate — a hook that owns the sync lifecycle and a component that needs to react to it. They have no direct parent-child relationship and cannot share local state.

Redux is the contract between them: `useSteamSync` **writes**, `LibraryScreen` (and any future consumer) **reads**.

Without Redux, the alternatives would be:
- Pass callbacks into `useSteamSync` — couples the hook to a specific screen
- Return the async Promise from `triggerSync` and manage it in the component — mixes sync logic into UI

`LibraryScreen` currently reads `sync_status` in two places:

```ts
// 1. Stop the pull-to-refresh spinner when sync finishes
useEffect(() => {
  if (isPullRefreshing && syncStatus !== 'syncing') {
    setIsPullRefreshing(false);
  }
}, [isPullRefreshing, syncStatus]);

// 2. Keep skeleton visible while sync is running with empty list
const showSkeleton =
  games === undefined ||
  (syncStatus === 'syncing' && games.length === 0) ||
  (isFetching && games.length === 0);
```

`syncErrorReason` follows the same pattern — it is written by `useSteamSync` (e.g. `'private_profile'`, `'api_error'`) and available to any component that needs to drive error UI without being directly involved in the sync flow.

---

## API Key Source

The hook reads the API key from Keychain on every sync call — **not** from `Config.STEAM_API_KEY` (env var). The env-var pattern is a prototype used only by the deprecated `getOwnedGames` function.

```ts
const keychainResult = await Keychain.getGenericPassword({
  service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY,
});
if (!keychainResult) return; // no key → skip sync
```

---

## Return Value

```ts
{ triggerSync: () => Promise<void> }
```

`triggerSync` is the same `runSync` callback. Story 3.2 (Library Screen) calls it on pull-to-refresh. It respects the throttle window — within 30 minutes of a full sync it will run an incremental sync instead.

---

## syncStatus as a Rendering Signal in LibraryScreen

`sync_status` is used in `LibraryScreen` not only to drive the pull-to-refresh spinner, but to gate whether the **skeleton or the empty state** is shown:

```ts
const showSkeleton =
  games === undefined ||
  (syncStatus === 'syncing' && games.length === 0) || // ← this leg
  (isFetching && games.length === 0);
```

### Why `isFetching` alone is not enough

When sync completes, it calls `queryClient.invalidateQueries()` which triggers a TanStack Query refetch of the SQLite games table. Under normal async conditions, `isFetching` would flip `true` for at least one render frame, allowing the skeleton to show while the fresh rows arrive.

However, `op-sqlite` executes queries **on the JS thread synchronously** — no native bridge round-trip. This means the refetch Promise resolves in the same microtask batch as the fetch start. React 18's async scheduler (which flushes render work as macrotasks) never sees the `isFetching: true` intermediate state. Both the "start fetch" and "got data" TanStack Query notifications are batched into a single render showing only the final result.

Consequence: without additional guards, a user whose library is empty (pre-first-sync) would see **"Your library is empty"** flash briefly before game cards appeared — because the SQLite query returned `[]` (empty DB) before the network sync finished writing games.

### Why `syncStatus === 'syncing'` works

`setSyncStatus('syncing')` is dispatched **at the very start of `runSync()`**, before any network call, before any SQLite write, before `invalidateQueries`. It is a Redux signal on a completely independent timeline from TanStack Query's fetch lifecycle. The status is cleared to `'idle'` only after `invalidateQueries()` resolves, meaning it remains `'syncing'` for the entire window where:

1. The DB is still empty (sync not done)
2. TanStack Query's `isFetching` is invisible to React (op-sqlite batching)

Showing the skeleton while `syncStatus === 'syncing' && games.length === 0` ensures the empty state is never shown until we can be certain the library is genuinely empty — i.e. sync has completed and confirmed there is nothing to display.

---

## Related Files

| File | Role |
|---|---|
| [`src/data/api/steam.ts`](../src/data/api/steam.ts) | `getOwnedGamesWithKey`, `getRecentlyPlayedGamesWithKey` |
| [`src/features/library/store/librarySlice.ts`](../src/features/library/store/librarySlice.ts) | `sync_status`, `syncErrorReason`, `setSyncStatus`, `setSyncError` |
| [`src/data/mmkv.ts`](../src/data/mmkv.ts) | Shared MMKV singleton |
| [`src/shared/constants/index.ts`](../src/shared/constants/index.ts) | `SYNC_THROTTLE_MS`, `MMKV_KEYS` |
| [`src/db/schema.ts`](../src/db/schema.ts) | `steamGames` table definition |
| [`src/features/auth/hooks/useSessionExpiry.ts`](../src/features/auth/hooks/useSessionExpiry.ts) | `handleSteamAuthError` for 401/403 |
| [`src/features/library/hooks/useSteamSync.test.ts`](../src/features/library/hooks/useSteamSync.test.ts) | Test suite (165 tests total) |
