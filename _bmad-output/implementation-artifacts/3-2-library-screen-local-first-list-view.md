# Story 3.2: Library Screen — Local-First List View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want to see my full Steam game library rendered immediately on app open, with cover art and playtime,
so that I can start browsing my library in under 1.5 seconds without waiting for a network sync.

## Acceptance Criteria

**AC1 — Immediate render from SQLite (local-first):**
**Given** the user navigates to the Library tab
**When** `LibraryScreen` mounts
**Then** game data is read from SQLite via `useGameLibrary` (TanStack Query, key: `queryKeys.games.all(steamId)`) and rendered immediately — no network wait (NFR-PERF-01)
**And** the cold-start MMKV snapshot (`MMKV_KEYS.LIBRARY_SNAPSHOT`) is used as `placeholderData` if SQLite is not yet hydrated, meeting the < 1.5s interactive requirement
**And** games are displayed as a `FlashList` of `GameCard` (List variant): square cover art + game title + total playtime + status badge
**And** cover art images are loaded and cached via `@d11/react-native-fast-image` with `priority: FastImage.priority.normal` for visible items
**And** the list scrolls at a consistent 60fps with 500+ items (NFR-PERF-02), enabled by FlashList virtualisation and `estimatedItemSize`
**And** games with 0 `playtimeForever` display an "Unplayed" badge
**And** a skeleton shimmer (matching card row shapes) is displayed while the initial SQLite query resolves with no prior placeholder data — no generic spinner

**AC2 — Sync integration:**
**When** `LibraryScreen` mounts
**Then** `useSteamSync` is called to trigger background delta sync (no UI wait — render from local data first)
**And** pull-to-refresh is wired to `triggerSync()`, with `refreshing` driven by `librarySlice.sync_status === 'syncing'`

**AC3 — Offline graceful degradation:**
**Given** the device is offline
**When** the Library tab is opened
**Then** the cached library renders normally from SQLite (or MMKV placeholder)
**And** a non-blocking `OfflineBanner` component is shown at the top of the screen (NFR-REL-01)

## Tasks / Subtasks

- [x] Task 1: Add `@react-native-community/netinfo` dependency (AC: 3)
  - [x] Subtask 1.1: Add `"@react-native-community/netinfo": "^11.4.1"` to `dependencies` in `package.json` and run `npm install`
  - [x] Subtask 1.2: After npm install, run `cd ios && pod install` to link the native module
  - [x] Subtask 1.3: Create `__mocks__/@react-native-community/netinfo.ts` — mock `useNetInfo` returning `{ isConnected: true, isInternetReachable: true }` (see Dev Notes: NetInfo Mock)
  - [x] Subtask 1.4: Add `'^@react-native-community/netinfo$': '<rootDir>/__mocks__/@react-native-community/netinfo.ts'` to `moduleNameMapper` in `jest.config.js`
  - [x] Subtask 1.5: Add `@react-native-community/netinfo` to `transformIgnorePatterns` allowlist in `jest.config.js` (for CI environments where the mock may not run)

- [x] Task 2: Create `useNetworkStatus` hook and `OfflineBanner` component (AC: 3)
  - [x] Subtask 2.1: Create `src/shared/hooks/useNetworkStatus.ts` — named export `useNetworkStatus`; wraps `useNetInfo` from `@react-native-community/netinfo`; returns `{ isConnected: boolean }`
  - [x] Subtask 2.2: Create `src/shared/components/OfflineBanner.tsx` — named export `OfflineBanner`; renders a sticky banner at the top of the screen when `isConnected === false` (see Dev Notes: OfflineBanner Design)
  - [x] Subtask 2.3: Create `src/shared/components/OfflineBanner.test.tsx` — test: renders banner when offline, renders null when online

- [x] Task 3: Create `formatPlaytime` utility (AC: 1)
  - [x] Subtask 3.1: Create `src/shared/utils/formatPlaytime.ts` — named export `formatPlaytime(minutes: number): string`; returns `'< 1 hr'` for 1–59 min, `'1 hr'` for 60–119 min, `'X hrs'` for ≥ 120 min (integer hours); 0 min returns `'0 min'` (shown as fallback — "Unplayed" badge is primary indicator)
  - [x] Subtask 3.2: Create `src/shared/utils/formatPlaytime.test.ts` — test all boundary values: 0, 1, 59, 60, 61, 120, 180, 2000 minutes

- [x] Task 4: Add `LIBRARY_SNAPSHOT` MMKV key and extend `useSteamSync` to write it (AC: 1)
  - [x] Subtask 4.1: Add `LIBRARY_SNAPSHOT: 'library_snapshot'` to `MMKV_KEYS` in `src/shared/constants/index.ts`
  - [x] Subtask 4.2: In `useSteamSync.ts`, after a successful FULL sync (`applyDeltaSync` completes and `last_full_sync` is written), read all rows from SQLite (`db.select({ appId, name, playtimeForever, headerImage, imgIconUrl }).from(steamGames)`) and write `JSON.stringify(rows)` to `mmkv.set(MMKV_KEYS.LIBRARY_SNAPSHOT, ...)` (see Dev Notes: MMKV Snapshot Strategy)
  - [x] Subtask 4.3: Do NOT write snapshot on incremental sync (throttle window) — only after full sync, to avoid partial snapshots
  - [x] Subtask 4.4: Update `src/features/library/hooks/useSteamSync.test.ts` — add test: after successful full sync, `mmkv.set` called with `MMKV_KEYS.LIBRARY_SNAPSHOT` and valid JSON string; verify NOT called on incremental sync path

- [x] Task 5: Create `useGameLibrary` hook (AC: 1)
  - [x] Subtask 5.1: Create `src/features/library/hooks/useGameLibrary.ts` — named export `useGameLibrary`
  - [x] Subtask 5.2: Use `useQuery<SteamGame[]>` from `@tanstack/react-query`; key: `queryKeys.games.all(steamId ?? '')` (from `src/shared/queryKeys.ts`); `enabled: !!steamId`
  - [x] Subtask 5.3: `queryFn`: reads all rows from SQLite via `db.select().from(steamGames).orderBy(asc(steamGames.name))`; returns `SteamGame[]` (sorted alphabetically — filter/sort UI added in Story 3.3)
  - [x] Subtask 5.4: `placeholderData`: synchronously reads `mmkv.getString(MMKV_KEYS.LIBRARY_SNAPSHOT)` → `JSON.parse()` → returns as `SteamGame[]` cast; returns `undefined` if no snapshot (see Dev Notes: placeholderData vs initialData)
  - [x] Subtask 5.5: Returns the full query result: `{ data, isPending, isPlaceholderData, isFetching, error }` — caller decides rendering based on these flags
  - [x] Subtask 5.6: Create `src/features/library/hooks/useGameLibrary.test.ts`
    - Test: returns games from SQLite when query resolves
    - Test: returns undefined data and `isPending: true` when no steamId (disabled)
    - Test: `placeholderData` function is called and reads from MMKV (mock `mmkv.getString` with valid JSON)
    - Test: `placeholderData` returns undefined when MMKV has no snapshot
    - Test: uses correct query key `queryKeys.games.all(steamId)`

- [x] Task 6: Create `GameCard` component — List variant (AC: 1)
  - [x] Subtask 6.1: Create `src/features/library/components/GameCard.tsx` — named export `GameCard`; accepts props: `game: SteamGame`, `onPress: () => void` (see Dev Notes: GameCard List Variant Design)
  - [x] Subtask 6.2: Render a `TouchableOpacity` row containing:
    - Square image (64×64): `@d11/react-native-fast-image` with `source={{ uri: game.headerImage ?? undefined }}` and `FastImage.resizeMode.cover`
    - Game title: Body 16px, `text-100` color, `font-rubik`, truncated to 1 line (`numberOfLines={1}`)
    - Playtime text: Caption 12px, `text-300`, `formatPlaytime(game.playtimeForever)`
    - "Unplayed" badge: shown when `game.playtimeForever === 0` — small pill shape, `bg-surface-800`, `text-primary`, Caption 12px uppercase
  - [x] Subtask 6.3: Add `testID="game-card"` to root element for test selectors
  - [x] Subtask 6.4: Create `src/features/library/components/GameCard.test.tsx`:
    - Test: renders game title
    - Test: renders formatted playtime when playtime > 0
    - Test: shows "Unplayed" badge when playtimeForever === 0
    - Test: hides "Unplayed" badge when playtimeForever > 0
    - Test: calls `onPress` when tapped
    - Test: truncates long titles to 1 line

- [x] Task 7: Create skeleton shimmer component (AC: 1)
  - [x] Subtask 7.1: Create `src/features/library/components/LibraryListSkeleton.tsx` — named export `LibraryListSkeleton`; renders 5 placeholder rows matching GameCard List variant shape (see Dev Notes: Skeleton Shimmer)
  - [x] Subtask 7.2: Each placeholder row: 64×64 grey square + two grey bars (title + playtime widths) with pulsing opacity animation via Reanimated `withRepeat` / `withTiming`

- [x] Task 8: Implement full `LibraryScreen` (AC: 1, 2, 3)
  - [x] Subtask 8.1: Replace placeholder in `src/features/library/screens/LibraryScreen.tsx` with full implementation
  - [x] Subtask 8.2: Wire `useGameLibrary()` and `useSteamSync()` hooks
  - [x] Subtask 8.3: Wire `useAppSelector(state => state.library.sync_status)` for `refreshing` prop
  - [x] Subtask 8.4: Render `<LibraryListSkeleton />` when `isPending === true` AND `!isPlaceholderData` (no data at all)
  - [x] Subtask 8.5: Render `FlashList` with `GameCard` List variant when data is available (including placeholder)
  - [x] Subtask 8.6: `onPress` on `GameCard` → `() => { /* TODO Story 4.1: navigate to GameDetail */ }` (no-op for now)
  - [x] Subtask 8.7: Wire pull-to-refresh: `onRefresh={triggerSync}`, `refreshing={syncStatus === 'syncing'}`
  - [x] Subtask 8.8: Render `<OfflineBanner />` above the list (inside `SafeAreaView` if needed)
  - [x] Subtask 8.9: Render empty state text ("Your library is empty. Sync your Steam account to get started.") when `data` is an empty array and `!isPending`

- [x] Task 9: Validate (AC: TypeScript + ESLint + Jest)
  - [x] Subtask 9.1: `npx tsc --noEmit` — zero TypeScript errors
  - [x] Subtask 9.2: `npx eslint src/ --ext .ts,.tsx` — zero new lint errors
  - [x] Subtask 9.3: `npx jest` — all tests pass (162 baseline → 189 tests after additions)

## Dev Notes

### STOP: Read Before Writing Any Code

These files must NOT be modified (read only, import only):
- `src/data/api/steam.ts` — no changes needed for this story
- `src/data/api/httpClient.ts` — no changes needed
- `src/features/auth/hooks/useSteamAuth.ts` — import `STEAM_KEYCHAIN_SERVICES` only if needed
- `src/features/auth/hooks/useSessionExpiry.ts` — no changes needed
- `src/shared/queryKeys.ts` — already has `queryKeys.games.all(steamId)` — no changes needed
- `src/navigation/RootNavigator.tsx` — do NOT touch
- `src/navigation/types.ts` — do NOT touch (GameDetail route added in Story 4.1)
- `src/App.tsx` — do NOT touch
- `src/db/schema.ts` — read-only (no migration needed in this story)

### What Already Exists — Read First, Don't Recreate

| File | Current State | Action |
|---|---|---|
| `src/features/library/hooks/useSteamSync.ts` | Complete sync engine with `triggerSync` export | EXTEND ONLY — add snapshot write after full sync |
| `src/features/library/store/librarySlice.ts` | Has `sync_status`, `syncErrorReason`, `activeFilter`, `activeSort` | READ ONLY — import `setActiveFilter`, `setActiveSort` if needed |
| `src/shared/queryKeys.ts` | Has `queryKeys.games.all(steamId)` | READ ONLY |
| `src/shared/constants/index.ts` | Has `SYNC_THROTTLE_MS`, `MMKV_KEYS.LAST_FULL_SYNC` | ADD `LIBRARY_SNAPSHOT` only |
| `src/data/mmkv.ts` | `createMMKV()` singleton exported as `mmkv` | READ ONLY |
| `src/db/schema.ts` | `steamGames` table + `SteamGame` type | READ ONLY |
| `src/features/library/screens/LibraryScreen.tsx` | Placeholder View with `<Text>Library</Text>` | REPLACE entirely |
| `__mocks__/@d11/react-native-fast-image.tsx` | Default export mock with `FastImage.priority`, `.resizeMode` | READ ONLY |
| `jest.config.js` | Has `@d11/react-native-fast-image` in `moduleNameMapper`; `@shopify/flash-list` in `transformIgnorePatterns` | ADD netinfo entries only |

### NetInfo: Installation and Mock

**Install:**
```bash
npm install @react-native-community/netinfo
cd ios && pod install
```

**Add to `jest.config.js` moduleNameMapper:**
```js
'^@react-native-community/netinfo$': '<rootDir>/__mocks__/@react-native-community/netinfo.ts',
```

**Add to `jest.config.js` transformIgnorePatterns** (inside the allowlist regex, add `|@react-native-community`):
```
react-native|@react-native|@react-navigation|@react-native-community|...
```

**Create `__mocks__/@react-native-community/netinfo.ts`:**
```ts
// Mock for @react-native-community/netinfo
// Default: simulates an online device
export const useNetInfo = jest.fn(() => ({
  isConnected: true,
  isInternetReachable: true,
  type: 'wifi',
  details: null,
}));

export const addEventListener = jest.fn(() => jest.fn());
export const fetch = jest.fn().mockResolvedValue({ isConnected: true });

export default {
  addEventListener,
  fetch,
  useNetInfo,
};
```

To simulate offline in a specific test:
```ts
import { useNetInfo } from '@react-native-community/netinfo';
(useNetInfo as jest.Mock).mockReturnValueOnce({ isConnected: false, isInternetReachable: false });
```

### `useNetworkStatus` Hook

```ts
// src/shared/hooks/useNetworkStatus.ts
import { useNetInfo } from '@react-native-community/netinfo';

export const useNetworkStatus = (): { isConnected: boolean } => {
  const netInfo = useNetInfo();
  // isConnected is null until NetInfo resolves — treat null as connected (optimistic)
  return { isConnected: netInfo.isConnected !== false };
};
```

### OfflineBanner Design

```tsx
// src/shared/components/OfflineBanner.tsx
import { View, Text } from 'react-native';
import { useNetworkStatus } from '@shared/hooks/useNetworkStatus';

export const OfflineBanner = () => {
  const { isConnected } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <View className="bg-destructive/20 px-4 py-2 items-center">
      <Text className="text-destructive text-caption font-rubik uppercase tracking-wider">
        No internet connection — showing cached library
      </Text>
    </View>
  );
};
```

### MMKV Snapshot Strategy

**Why:** `useGameLibrary` uses `placeholderData` from MMKV so the first render is instantaneous. MMKV reads are synchronous (no bridge overhead), whereas Drizzle's `db.select()` is async.

**When to write:** Only after a successful FULL sync (not incremental). Writing a partial snapshot from incremental sync would make the snapshot inconsistent.

**What to store:** Only the fields needed for list rendering — avoids serializing Date objects (which JSON.parse returns as strings, causing type mismatches):

```ts
// Add after applyDeltaSync + mmkv.set(MMKV_KEYS.LAST_FULL_SYNC, ...) in useSteamSync.ts
const snapshotRows = await db
  .select({
    appId: steamGames.appId,
    name: steamGames.name,
    playtimeForever: steamGames.playtimeForever,
    playtime2weeks: steamGames.playtime2weeks,
    headerImage: steamGames.headerImage,
    imgIconUrl: steamGames.imgIconUrl,
    rtimeLastPlayed: steamGames.rtimeLastPlayed,
    hltbMain: steamGames.hltbMain,
    hltbExtra: steamGames.hltbExtra,
    hltbComplete: steamGames.hltbComplete,
  })
  .from(steamGames);
mmkv.set(MMKV_KEYS.LIBRARY_SNAPSHOT, JSON.stringify(snapshotRows));
```

**Note:** `lastSyncedAt` and `hltbCachedAt` are Date objects in Drizzle schema (`{ mode: 'timestamp' }`). Exclude them from the snapshot to avoid serialization issues. The snapshot is for display only — truth remains SQLite.

**Reading in `useGameLibrary`:**
```ts
placeholderData: () => {
  const raw = mmkv.getString(MMKV_KEYS.LIBRARY_SNAPSHOT);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as SteamGame[];
  } catch {
    return undefined;
  }
},
```

**`placeholderData` vs `initialData`:**
- `initialData` is treated as real cached data — if stale, it may block a refetch
- `placeholderData` is treated as temporary filler — TQ always fetches the real data immediately; `isPlaceholderData: true` flag is set during this time
- Use `placeholderData` here to ensure SQLite always wins over the MMKV snapshot

### `useGameLibrary` Implementation Sketch

```ts
// src/features/library/hooks/useGameLibrary.ts
import { useQuery } from '@tanstack/react-query';
import { asc } from 'drizzle-orm';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import { queryKeys } from '@shared/queryKeys';
import { db } from '@db/index';
import { steamGames } from '@db/schema';
import type { SteamGame } from '@db/schema';
import { mmkv } from '../../../data/mmkv';
import { MMKV_KEYS } from '@shared/constants';

export const useGameLibrary = () => {
  const steamId = useAppSelector((state) => state.auth.steamId);

  return useQuery<SteamGame[]>({
    queryKey: queryKeys.games.all(steamId ?? ''),
    queryFn: () =>
      db.select().from(steamGames).orderBy(asc(steamGames.name)),
    enabled: !!steamId,
    placeholderData: () => {
      const raw = mmkv.getString(MMKV_KEYS.LIBRARY_SNAPSHOT);
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as SteamGame[];
      } catch {
        return undefined;
      }
    },
  });
};
```

**Key notes:**
- `@db` alias resolves to `src/db` — use `@db/index` and `@db/schema`
- `@data` alias does NOT exist — use relative `'../../../data/mmkv'` from `src/features/library/hooks/`
- `@shared` alias resolves to `src/shared` — use `@shared/queryKeys`, `@shared/constants`, `@shared/hooks/reduxHooks`
- Sort is alphabetical by default (Story 3.3 adds sort UI and changes this query to use `activeSort` from Redux)
- Filter is applied in Story 3.3 — for 3.2, return ALL games

### GameCard List Variant Design

**Layout (row, 72–80px tall):**
```
[64×64 cover art] [title (Body)     ] [Unplayed badge?]
                  [playtime (Caption)]
```

**Cover art URL:** Use `game.headerImage` (Steam CDN URL written by sync engine). Fall back to placeholder if null. Example URL: `https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg`

**FastImage usage:**
```tsx
import FastImage from '@d11/react-native-fast-image';

<FastImage
  source={{ uri: game.headerImage ?? undefined, priority: FastImage.priority.normal }}
  style={{ width: 64, height: 64, borderRadius: 4 }}
  resizeMode={FastImage.resizeMode.cover}
/>
```

**Note:** `@d11/react-native-fast-image` uses a **default export** (`import FastImage from ...`). Do NOT use named import.

**"Unplayed" badge — only when `playtimeForever === 0`:**
```tsx
{game.playtimeForever === 0 && (
  <View className="bg-surface-800 rounded px-2 py-0.5">
    <Text className="text-primary text-caption font-rubik uppercase">Unplayed</Text>
  </View>
)}
```

**Playtime text:**
```tsx
<Text className="text-text-300 text-caption font-rubik">
  {formatPlaytime(game.playtimeForever)}
</Text>
```

### `formatPlaytime` Utility

```ts
// src/shared/utils/formatPlaytime.ts
export const formatPlaytime = (minutes: number): string => {
  if (minutes === 0) return '0 min';
  if (minutes < 60) return '< 1 hr';
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? '1 hr' : `${hours} hrs`;
};
```

### Skeleton Shimmer (Reanimated v4)

Use Reanimated's `withRepeat` + `withTiming` + `withSequence` for the pulsing animation. Reanimated v4 API (already installed as `^4.2.2`):

```tsx
// src/features/library/components/LibraryListSkeleton.tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';

export const LibraryListSkeleton = () => {
  const opacity = useSharedValue(0.4);
  const isReducedMotion = useReducedMotion();

  // Respect prefers-reduced-motion (NFR from UX spec)
  if (!isReducedMotion) {
    opacity.value = withRepeat(
      withSequence(withTiming(0.8, { duration: 800 }), withTiming(0.4, { duration: 800 })),
      -1, // infinite
    );
  }

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <>
      {[...Array(5)].map((_, i) => (
        <Animated.View
          key={i}
          testID="skeleton-row"
          style={animatedStyle}
          className="flex-row items-center px-4 py-3 border-b border-surface-800"
        >
          <View className="w-16 h-16 rounded bg-surface-800 mr-3" />
          <View className="flex-1">
            <View className="h-4 bg-surface-800 rounded mb-2 w-3/4" />
            <View className="h-3 bg-surface-800 rounded w-1/4" />
          </View>
        </Animated.View>
      ))}
    </>
  );
};
```

**Important:** `useReducedMotion` is part of the Reanimated mock (`jest.requireActual('react-native-reanimated/src/mock')` spread), but verify it's in the mock per MEMORY.md: "spread `jest.requireActual('react-native-reanimated/src/mock')` in `jest.mock` factory and override `useReducedMotion`". If the test file for `LibraryListSkeleton` needs to test the non-animated case, mock `useReducedMotion` return value in that test.

### LibraryScreen Structure

```tsx
// src/features/library/screens/LibraryScreen.tsx
import { View, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import { useSteamSync } from '../hooks/useSteamSync';
import { useGameLibrary } from '../hooks/useGameLibrary';
import { GameCard } from '../components/GameCard';
import { LibraryListSkeleton } from '../components/LibraryListSkeleton';
import { OfflineBanner } from '@shared/components/OfflineBanner';
import type { SteamGame } from '@db/schema';

export const LibraryScreen = () => {
  const { triggerSync } = useSteamSync();
  const syncStatus = useAppSelector((state) => state.library.sync_status);
  const { data: games, isPending, isPlaceholderData } = useGameLibrary();

  const showSkeleton = isPending && !isPlaceholderData;

  return (
    <View className="flex-1 bg-surface-900">
      <OfflineBanner />
      {showSkeleton ? (
        <LibraryListSkeleton />
      ) : (
        <FlashList
          data={games ?? []}
          keyExtractor={(item: SteamGame) => item.appId.toString()}
          renderItem={({ item }: { item: SteamGame }) => (
            <GameCard
              game={item}
              onPress={() => {
                // TODO Story 4.1: navigate to GameDetailScreen
                // navigation.push('GameDetail', { appId: item.appId })
              }}
            />
          )}
          estimatedItemSize={80}
          onRefresh={triggerSync}
          refreshing={syncStatus === 'syncing'}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Text className="text-text-300 font-rubik text-body">
                Your library is empty. Sync your Steam account to get started.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};
```

**Note:** `LibraryTabScreenProps` from `src/navigation/types.ts` can be added to the component signature for type-safety: `({ navigation }: LibraryTabScreenProps)` — this will be used in Story 4.1 to call `navigation.navigate`.

### FlashList Notes

- `estimatedItemSize={80}` — required for FlashList to estimate list height efficiently (card row ~72–80px)
- FlashList uses `data` not `dataSource` (unlike VirtualizedList)
- `onRefresh` + `refreshing` props work identically to FlatList
- `keyExtractor` must return a string — `item.appId.toString()` (appId is integer in schema)
- `ListEmptyComponent` shows when `data` is an empty array
- `@shopify/flash-list` is already in `transformIgnorePatterns` in `jest.config.js` — no changes needed

### Import Path Conventions

From `src/features/library/screens/`:
- `@shared/hooks/reduxHooks` → `@shared/hooks/reduxHooks` ✅
- `@shared/components/OfflineBanner` → `@shared/components/OfflineBanner` ✅
- `../hooks/useSteamSync` → relative ✅
- `../hooks/useGameLibrary` → relative ✅
- `../components/GameCard` → relative ✅
- `@db/schema` → `@db/schema` ✅
- `@shopify/flash-list` → package import ✅

From `src/features/library/hooks/`:
- `@data/*` alias does NOT exist — use `'../../../data/mmkv'` (relative)
- `@db/index` and `@db/schema` → aliases work ✅
- `@shared/*` aliases work ✅

From `src/shared/components/`:
- `@shared/hooks/useNetworkStatus` → `@shared/hooks/useNetworkStatus` ✅

### Testing Strategy

**`useGameLibrary.test.ts`:**
```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';

// Mock the db module
jest.mock('../../../db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

// Mock MMKV singleton
jest.mock('../../../data/mmkv', () => ({
  mmkv: {
    getString: jest.fn().mockReturnValue(undefined),
    set: jest.fn(),
  },
}));

const createWrapper = (steamId = '76561198012345678') => {
  const store = configureStore({
    reducer: { auth: authReducer, library: libraryReducer },
    preloadedState: {
      auth: { isAuthenticated: true, steamId },
      library: { sync_status: 'idle', syncErrorReason: null, activeFilter: null, activeSort: 'alphabetical' },
    },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
};
```

**`GameCard.test.tsx`:**
- Import `GameCard` and `fireEvent`, `render` from `@testing-library/react-native`
- Create a mock `SteamGame` fixture with all required fields
- No need to mock `@d11/react-native-fast-image` separately — already in `moduleNameMapper`

**`OfflineBanner.test.tsx`:**
```ts
import { useNetInfo } from '@react-native-community/netinfo';
// Override per test:
(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false });
```

### Architecture Compliance Checklist

- ✅ `useGameLibrary` uses TanStack Query — correct for server/local state (SQLite read)
- ✅ Query key from `queryKeys.ts` — never inline
- ✅ `activeFilter` and `activeSort` in Redux (`librarySlice`) — correct state ownership
- ✅ MMKV used for cold-start snapshot flag only — NOT for secrets or complex state
- ✅ FlashList used — not FlatList (architecture §3.5)
- ✅ `@d11/react-native-fast-image` used — not `react-native-fast-image` (New Architecture compat)
- ✅ Named exports only — no default exports on any component/hook
- ✅ Tests co-located with source files
- ✅ No new Redux slices for library data (TanStack Query owns server/local state)
- ✅ No ISO date strings passed to SQLite — all existing schema timestamps are integers
- ✅ `prefers-reduced-motion` respected in skeleton shimmer (`useReducedMotion`)
- ✅ Dynamic Type: all text containers use `className=` (NativeWind) — no fixed heights on text
- ✅ `@data` alias does NOT exist — relative paths used for `src/data/` imports from hooks

### Previous Story Learnings (from Stories 3-0 and 3-1)

- **`@data/*` alias does NOT exist** — use relative `'../../../data/...'` paths from feature hooks
- **`@db` alias exists** — can use `@db/index` and `@db/schema` from anywhere in `src/`
- **`createMMKV()` factory** — the `mmkv` singleton in `src/data/mmkv.ts` uses `createMMKV()`, not `new MMKV()`; the mock at `__mocks__/react-native-mmkv/index.ts` handles this
- **MMKV v4 API**: `.set(key, value)` / `.getString(key)` / `.remove(key)` — NOT `.setItem`/`.getItem`
- **Drizzle `db.select()` chain**: `await db.select().from(table).orderBy(...)` resolves directly (no `.all()` needed — op-sqlite driver resolves the promise)
- **TanStack Query in tests**: wrap with `QueryClientProvider` + fresh `QueryClient({ defaultOptions: { queries: { retry: false } } })`; use `renderHook` from `@testing-library/react-native`; `waitFor` for async query resolution
- **react-native-toast-message**: already mocked at `__mocks__/react-native-toast-message.ts`
- **`@d11/react-native-fast-image`**: default export mock at `__mocks__/@d11/react-native-fast-image.tsx` — import as `import FastImage from '@d11/react-native-fast-image'`
- **`@shopify/flash-list`**: in `transformIgnorePatterns` already — tests should work; `FlashList` renders like a standard list in Jest
- **Named exports only** — `export const X = ...`, never `export default`
- **Commit pattern**: `feat(library): <description> (story 3-2)`
- **Test count baseline**: 162 tests pass after Story 3-1

### Git Intelligence (Recent Commits)

```
e4d22dc feat(library): Steam library sync engine with delta detection (story 3-1)
aceb101 feat(steam): validate player summary response and update Podfile.lock
5d93447 fix(config): harden build config for GitHub Pages OpenID shim
6b626af feat(auth): add GitHub Pages Steam OpenID redirect shim
b41172a feat(network): typed HTTP client with AppError, timeout, and Sentry (story 3-0)
```

Patterns established:
- Commit format: `feat(library): <description> (story 3-2)` for this story
- All library feature work in `src/features/library/`
- Shared components/hooks go in `src/shared/` (confirmed by OfflineBanner, useNetworkStatus)

### Project Structure Notes

**Files to CREATE:**
- `src/features/library/hooks/useGameLibrary.ts`
- `src/features/library/hooks/useGameLibrary.test.ts`
- `src/features/library/components/GameCard.tsx`
- `src/features/library/components/GameCard.test.tsx`
- `src/features/library/components/LibraryListSkeleton.tsx`
- `src/shared/components/OfflineBanner.tsx`
- `src/shared/components/OfflineBanner.test.tsx`
- `src/shared/hooks/useNetworkStatus.ts`
- `src/shared/utils/formatPlaytime.ts`
- `src/shared/utils/formatPlaytime.test.ts`
- `__mocks__/@react-native-community/netinfo.ts`

**Files to MODIFY (content changes):**
- `src/features/library/screens/LibraryScreen.tsx` — replace placeholder with full implementation
- `src/features/library/hooks/useSteamSync.ts` — add MMKV snapshot write after full sync
- `src/features/library/hooks/useSteamSync.test.ts` — add snapshot-write test
- `src/shared/constants/index.ts` — add `LIBRARY_SNAPSHOT` to `MMKV_KEYS`
- `jest.config.js` — add netinfo to `moduleNameMapper` and `transformIgnorePatterns`
- `package.json` — add `@react-native-community/netinfo` dependency

**Files NOT to create or modify (read-only for this story):**
- `src/data/api/steam.ts`
- `src/data/api/httpClient.ts`
- `src/data/mmkv.ts`
- `src/db/schema.ts`
- `src/db/index.ts`
- `src/shared/queryKeys.ts`
- `src/features/auth/hooks/useSteamAuth.ts`
- `src/features/auth/hooks/useSessionExpiry.ts`
- `src/navigation/RootNavigator.tsx`
- `src/navigation/types.ts`
- `src/App.tsx`
- `src/screens/` — prototype screens; do NOT touch

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2: Library Screen — Local-First List View]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.1 Data Architecture — Sync Strategy — Background Sync with Delta Detection]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.5 Frontend Architecture — List Virtualization]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.5 Frontend Architecture — Image Caching]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.2 State Ownership Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.4 TanStack Query Key Factory]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#10.2 The Game Card — List Variant]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#11.2 Feedback & Empty States — Skeleton Shimmer]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#12.2 Accessibility — Dynamic Type, Reduced Motion]
- [Source: src/db/schema.ts — steamGames table with SteamGame / NewSteamGame types]
- [Source: src/shared/queryKeys.ts — queryKeys.games.all(steamId)]
- [Source: src/shared/constants/index.ts — SYNC_THROTTLE_MS, MMKV_KEYS]
- [Source: src/data/mmkv.ts — mmkv singleton (createMMKV factory)]
- [Source: src/features/library/hooks/useSteamSync.ts — triggerSync export, applyDeltaSync pattern]
- [Source: src/features/library/store/librarySlice.ts — sync_status, SyncStatus type]
- [Source: src/shared/hooks/reduxHooks.ts — useAppSelector, useAppDispatch]
- [Source: src/res/tokens.ts — design tokens (color, spacing, typography)]
- [Source: tailwind.config.js — NativeWind custom classes (surface-900, surface-800, text-100, text-300, etc.)]
- [Source: _bmad-output/implementation-artifacts/3-1-steam-library-sync-engine.md#Dev Notes]
- [Source: jest.config.js — moduleNameMapper, transformIgnorePatterns]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Story creation — 2026-03-09)
claude-sonnet-4-6 (Implementation — 2026-03-09)
claude-sonnet-4-6 (Code review + fixes — 2026-03-09)

### Debug Log References

- `@shopify/flash-list` v2 removed `estimatedItemSize` prop — dropped from `LibraryScreen` (TypeScript caught this).
- `placeholderData` test needed separate snapshot fixture (no Date fields) to avoid JSON serialization mismatch between `Date` and ISO string after round-trip.
- `useGameLibrary` uses `'../../../db'` relative mock path in tests (same pattern as `useSteamSync`) because `@db` alias is not in `moduleNameMapper`; babel transforms handle it at runtime.

### Completion Notes List

- Implemented full local-first Library screen with FlashList + GameCard + LibraryListSkeleton + OfflineBanner.
- `useGameLibrary` hook: TanStack Query reads SQLite alphabetically, MMKV snapshot as `placeholderData` for instant cold-start render.
- `useSteamSync` extended: writes MMKV `library_snapshot` after full sync only (not incremental), excluding Date-mode fields to avoid JSON serialization issues.
- `@react-native-community/netinfo` installed and mocked; `useNetworkStatus` + `OfflineBanner` created for AC3.
- `formatPlaytime` utility covers all boundary cases (0, <60, 60, >60 minutes).
- `LibraryListSkeleton` uses Reanimated v4 `withRepeat`/`withTiming`; respects `useReducedMotion`.
- All 189 tests pass (162 baseline + 27 new). Zero TypeScript errors. Zero new ESLint errors.
- Code review fixes (2026-03-09): moved `LibraryListSkeleton` animation start to `useEffect` (render-phase mutation bug); completed `@db/schema` mock in `useSteamSync.test.ts` (added hltb fields); added fake timers to backoff error test to prevent open timer handle; added `LibraryListSkeleton.test.tsx` (2 tests); strengthened `useGameLibrary` query key test to assert via QueryClient cache lookup. All 191 tests pass post-review.

### File List

**Created:**
- `__mocks__/@react-native-community/netinfo.ts`
- `src/shared/hooks/useNetworkStatus.ts`
- `src/shared/components/OfflineBanner.tsx`
- `src/shared/components/OfflineBanner.test.tsx`
- `src/shared/utils/formatPlaytime.ts`
- `src/shared/utils/formatPlaytime.test.ts`
- `src/features/library/hooks/useGameLibrary.ts`
- `src/features/library/hooks/useGameLibrary.test.ts`
- `src/features/library/components/GameCard.tsx`
- `src/features/library/components/GameCard.test.tsx`
- `src/features/library/components/LibraryListSkeleton.tsx`
- `src/features/library/components/LibraryListSkeleton.test.tsx`

**Modified:**
- `package.json` — added `@react-native-community/netinfo: ^11.4.1`
- `package-lock.json` — updated by npm install
- `jest.config.js` — added netinfo to `moduleNameMapper` and `transformIgnorePatterns`
- `src/shared/constants/index.ts` — added `LIBRARY_SNAPSHOT` to `MMKV_KEYS`
- `src/features/library/hooks/useSteamSync.ts` — added MMKV snapshot write after full sync
- `src/features/library/hooks/useSteamSync.test.ts` — added snapshot write tests; completed schema mock; added fake timers to error test
- `src/features/library/screens/LibraryScreen.tsx` — replaced placeholder with full implementation
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status updated to `review`

## Change Log

- Implemented Library Screen local-first list view with FlashList, GameCard, skeleton shimmer, offline banner, and MMKV cold-start snapshot (Story 3-2, 2026-03-09)
- Code review fixes: LibraryListSkeleton render-phase animation bug, incomplete db schema mock, open timer handle in error test, missing skeleton tests, weak query key test (2026-03-09)
