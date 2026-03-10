# Story 4.3: Achievement Progress Display

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want to see my achievement progress for a game on its detail screen,
so that I can gauge how much of the game I've experienced and feel motivated to keep playing.

## Acceptance Criteria

**AC1 — Achievement progress summary:**
**Given** the user opens a `GameDetailScreen`
**When** the `AchievementsSection` mounts
**Then** `useAchievements(appId)` loads achievement data — from SQLite cache if fresh, or via Steam API if stale/missing
**And** the section displays a progress summary header: e.g., "15 / 50 unlocked" with a horizontal progress bar
**And** a skeleton shimmer is shown while the fetch is in progress

**AC2 — Achievement list with icons:**
**Given** achievement data has loaded successfully
**When** the achievements are rendered
**Then** each achievement is shown with its icon (from `GetSchemaForGame`), display name, and unlock date (for unlocked achievements)
**And** locked achievements display the greyed-out icon (`icongray` URL) and are visually dimmed
**And** unlocked achievements are sorted first (by `unlocktime` descending), then locked achievements
**And** only the first 6 achievements are shown initially, with a "Show all (N)" button to expand

**AC3 — SQLite persistence with smart invalidation:**
**Given** the user opens a `GameDetailScreen` for a game they have NOT played since the last achievement fetch
**When** `useAchievements(appId)` runs
**Then** the cached achievement data from SQLite is served instantly — no network request
**And** the cache remains valid until `steam_games.rtime_last_played > achievement_cache.cached_at` (i.e., the user played the game since we last fetched)

**Given** the user opens a `GameDetailScreen` for a game they HAVE played since the last achievement fetch
**When** `useAchievements(appId)` runs
**Then** the stale SQLite cache is used as `placeholderData` for instant render
**And** a background API fetch replaces the cache with fresh data
**And** the new data is persisted to SQLite with an updated `cached_at` timestamp

**AC4 — No achievements / API error graceful fallback:**
**Given** the Steam API is unavailable, the game has no achievements, or the profile is private for achievement stats
**When** `AchievementsSection` renders
**Then** a graceful empty state is shown ("No achievements available")
**And** no error modal or blocking state is shown

**AC5 — Offline behavior:**
**Given** the device is offline
**When** `AchievementsSection` mounts
**Then** SQLite-cached achievement data is served if available (persists across app restarts)
**And** if no cached data exists, the graceful empty state is shown

## Tasks / Subtasks

- [x] Task 1: Add `achievement_cache` SQLite table + Drizzle migration (AC: 3)
  - [x] Subtask 1.1: Add `achievementCache` table to `src/db/schema.ts`
    ```ts
    export const achievementCache = sqliteTable('achievement_cache', {
      appId: integer('app_id').primaryKey().references(() => steamGames.appId),
      cachedAt: integer('cached_at').notNull(),       // Unix timestamp (seconds)
      unlockedCount: integer('unlocked_count').notNull(),
      totalCount: integer('total_count').notNull(),
      data: text('data').notNull(),                    // JSON string of MergedAchievement[]
    });

    export type AchievementCacheRow = typeof achievementCache.$inferSelect;
    ```
  - [x] Subtask 1.2: Run `npx drizzle-kit generate` to produce the new migration SQL file
    - Expected output: `src/db/migrations/0001_*.sql` with `CREATE TABLE achievement_cache ...`
    - Verify the generated SQL is correct
  - [x] Subtask 1.3: Update `src/db/migrations/index.ts`
    - Import the new migration: `import m0001 from './0001_<generated_name>.sql';`
    - Add `m0001` to the `migrations` object
  - [x] Subtask 1.4: Verify migration runs on startup — `useMigrations` (Story 1.2) handles this automatically

- [x] Task 2: Add Steam achievement API functions (AC: 1)
  - [x] Subtask 2.1: Export `SteamGameSchemaResponse`, `SteamPlayerAchievementsResponse`, `Achievement`, `AchievementProgress` types from `src/shared/types/steam.types.ts`
    - These interfaces already exist but are not exported — add them to the `export type { ... }` statement
  - [x] Subtask 2.2: Add `getGameSchema` function to `src/data/api/steam.ts`
    - Signature: `export const getGameSchema = async (apiKey: string, appId: number): Promise<SteamGameSchemaResponse>`
    - Endpoint: `ISteamUserStats/GetSchemaForGame/v0002/`
    - Params: `key`, `appid`, `l=english`
    - Uses raw `fetch` (same pattern as `getPlayerSummaries`) to detect 401/403
    - Returns `SteamGameSchemaResponse` — includes `game.availableGameStats.achievements[]` with `icon` and `icongray` full URLs
    - If response has no `availableGameStats` (game has no achievements), return `{ game: { gameName: '', gameVersion: '', availableGameStats: { stats: [], achievements: [] } } }`
  - [x] Subtask 2.3: Add `getPlayerAchievements` function to `src/data/api/steam.ts`
    - Signature: `export const getPlayerAchievements = async (apiKey: string, steamId: string, appId: number): Promise<SteamPlayerAchievementsResponse>`
    - Endpoint: `ISteamUserStats/GetPlayerAchievements/v0001/`
    - Params: `key`, `steamid`, `appid`, `l=english`
    - Uses raw `fetch` to detect 401/403 → throws `SteamError { code: 'UNAUTHORIZED' }`
    - If HTTP 400 (game has no achievements or profile stats are private) → throw `SteamError { code: 'NOT_FOUND', message: 'No achievement data' }`
    - Returns `SteamPlayerAchievementsResponse`
  - [x] Subtask 2.4: Create `src/data/api/steam.test.ts` (or extend existing) — unit tests for `getGameSchema` and `getPlayerAchievements`
    - Test: success path returns typed response
    - Test: 401/403 throws `SteamError { code: 'UNAUTHORIZED' }`
    - Test: 400 on `getPlayerAchievements` throws `SteamError { code: 'NOT_FOUND' }`
    - Mock `global.fetch`

- [x] Task 3: Add achievement query key (AC: 1)
  - [x] Subtask 3.1: Add `achievements` key to `src/shared/queryKeys.ts`
    - `achievements: (appId: number) => ['games', 'detail', appId, 'achievements'] as const`
    - Add inside `queryKeys.games` — follows existing `hltb` key nesting pattern

- [x] Task 4: Create `useAchievements` hook (AC: 1, 3, 4, 5)
  - [x] Subtask 4.1: Create `src/features/gameDetail/hooks/useAchievements.ts`
    - Named export: `export const useAchievements = (appId: number) => { ... }`
    - Reads `apiKey` from Keychain via `react-native-keychain` (`getGenericPassword({ service: 'steam_api_key' })`)
    - Reads `steamId` from Redux via `useAppSelector(state => state.auth.steamId)`
    - Uses `useQuery` with key: `queryKeys.games.achievements(appId)`
    - `enabled: !!apiKey && !!steamId` — disabled until credentials resolve
    - `retry: 1` — one retry on transient failures
    - **Cache-aware `queryFn` logic:**
      1. Read `achievement_cache` row from SQLite for this `appId`
      2. Read `steam_games.rtime_last_played` for this `appId`
      3. If cache exists AND `cachedAt >= rtimeLastPlayed` → cache is fresh → parse and return `data` JSON (no API call)
      4. If cache is missing or stale → call `getGameSchema` + `getPlayerAchievements` via `Promise.allSettled`, merge, write result to SQLite (`INSERT ... ON CONFLICT DO UPDATE`), return merged data
    - `placeholderData`: read from SQLite synchronously-ish at query creation time (see Dev Notes for pattern)
    - `staleTime: Infinity` — the queryFn itself handles freshness; TanStack Query should never auto-refetch
    - Merge logic: map each schema `Achievement`, find matching `AchievementProgress` by `name === apiname`, combine into `MergedAchievement`
    - Sort: unlocked first (by `unlocktime` desc), then locked (preserve schema order)
    - If either API call throws `SteamError { code: 'NOT_FOUND' }` → return empty array (not an error)
    - If `SteamError { code: 'UNAUTHORIZED' }` → let it propagate (session expiry handling)
    - Returns: `{ achievements: MergedAchievement[], totalCount: number, unlockedCount: number, isPending, isError }`
  - [x] Subtask 4.2: Define `MergedAchievement` type in `src/features/gameDetail/hooks/useAchievements.ts`
    ```ts
    export type MergedAchievement = {
      apiname: string;
      displayName: string;
      description?: string;
      icon: string;       // Full URL to unlocked icon
      icongray: string;   // Full URL to locked/grey icon
      achieved: boolean;
      unlocktime: number; // Unix timestamp (0 if locked)
      hidden: boolean;
    };
    ```
  - [x] Subtask 4.3: Create `src/features/gameDetail/hooks/useAchievements.test.ts`
    - Test: returns cached data from SQLite when cache is fresh (no API call made)
    - Test: fetches from API when cache is stale (`rtime_last_played > cached_at`)
    - Test: fetches from API when no cache exists
    - Test: writes fetched data to SQLite `achievement_cache` table
    - Test: returns merged achievements sorted by unlocktime desc (unlocked first)
    - Test: returns empty array when schema has no achievements
    - Test: returns empty array when `getPlayerAchievements` throws NOT_FOUND
    - Test: `isPending` is true while fetching
    - Test: uses correct query key `queryKeys.games.achievements(appId)`
    - Test: `unlockedCount` and `totalCount` are computed correctly
    - Pattern: mock `@db/index`, `@db/schema`, `@data/api/steam`, `react-native-keychain`, `@shared/hooks/reduxHooks`; fresh `QueryClient` per test with `afterEach(clear)`

- [x] Task 5: Create `AchievementsSection` component (AC: 1, 2, 4)
  - [x] Subtask 5.1: Create `src/features/gameDetail/components/AchievementsSection.tsx`
    - Named export: `export const AchievementsSection = ({ appId }: { appId: number }) => { ... }`
    - Uses `useAchievements(appId)` hook
    - **Loading state**: skeleton shimmer (3 horizontal bars matching achievement row layout)
    - **Empty state**: "No achievements available" text (caption style, centered)
    - **Progress header**: Section label "Achievements" (H2 typography), progress text "N / M unlocked", horizontal progress bar (`View` with percentage width fill, `tokens.colors.primary` bar on `tokens.colors.surface800` track, `borderRadius: tokens.borderRadius.xs`)
    - **Achievement list** (NOT FlashList — small list, max ~6 visible initially):
      - Each row: `FastImage` (40x40 rounded, `icon` or `icongray` URL), display name text, unlock date or "Locked" caption
      - Locked rows: `opacity: 0.5` on the entire row
      - Unlocked rows: full opacity, unlock date formatted as "MMM DD, YYYY" (use `new Date(unlocktime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`)
    - **Show more/less**: if `totalCount > 6`, show only first 6 with "Show all (N)" `TouchableOpacity`; tapping toggles to show all, label changes to "Show less"
    - All styles in `StyleSheet.create()` — use `tokens` for spacing, colors, fonts
    - `Animated.View` MUST use `style=` (no `className=`) — applies to skeleton shimmer blocks
  - [x] Subtask 5.2: Create `src/features/gameDetail/components/AchievementsSection.test.tsx`
    - Test: renders progress summary "N / M unlocked" when data is available
    - Test: renders skeleton when isPending
    - Test: renders "No achievements available" when achievements array is empty
    - Test: renders locked achievements with dimmed style
    - Test: "Show all" button appears when > 6 achievements; tap expands list
    - Pattern: mock `useAchievements` at module level

- [x] Task 6: Integrate `AchievementsSection` into `GameDetailScreen` (AC: 1)
  - [x] Subtask 6.1: Add `AchievementsSection` to `GameDetailScreen.tsx` inside the `infoContainer` `View`, below the playtime text
    - `<AchievementsSection appId={appId} />`
    - Add after the `{/* Story 4.3: AchievementsSection will be added here */}` comment — replace the comment
    - Add a `marginTop: tokens.spacing.lg` wrapper or style

- [x] Task 7: Validate (AC: TypeScript + ESLint + Jest)
  - [x] Subtask 7.1: `npx tsc --noEmit` — zero new TypeScript errors
  - [x] Subtask 7.2: `npx eslint src/ --ext .ts,.tsx` — zero new lint errors in new/modified files
  - [x] Subtask 7.3: `npx jest` — 277/277 tests pass, zero regressions

## Dev Notes

### STOP: Read Before Writing Any Code

These files must NOT be modified beyond what Tasks 1-6 specify:
- `src/features/library/` — no touch
- `src/App.tsx` — no touch
- `src/navigation/` — no touch
- `src/data/QueryProvider.tsx` — no touch

### Smart Invalidation Strategy (CRITICAL)

The key insight: `steam_games.rtime_last_played` is updated by the sync engine every time the user opens the app (via `GetOwnedGames` or `GetRecentlyPlayedGames`). This tells us when the user last played a game. If the user hasn't played since we last fetched achievements, the data cannot have changed.

```
Staleness check:
  achievement_cache.cached_at >= steam_games.rtime_last_played → FRESH (serve from SQLite)
  achievement_cache.cached_at <  steam_games.rtime_last_played → STALE (refetch from API)
  achievement_cache row missing                                → MISS  (fetch from API)
```

Both `cached_at` and `rtime_last_played` are Unix timestamps in seconds. The comparison is straightforward.

**Known edge case — stale `rtime_last_played`:** If the user plays a game and unlocks achievements but then opens the app before the sync engine has run (i.e., `rtime_last_played` hasn't been refreshed yet from `GetOwnedGames`/`GetRecentlyPlayedGames`), the cache will appear fresh and serve outdated achievement data. This resolves itself once the sync engine completes on the current or next app open, at which point `rtime_last_played` updates and the achievement cache becomes stale. No mitigation needed — the sync engine runs automatically on every app open (Story 3.1), so the window is brief (seconds).

**Why `staleTime: Infinity`:** The queryFn handles freshness itself by checking SQLite timestamps. TanStack Query should never auto-refetch — the data is either served from cache (instant) or fetched from API (inside queryFn). This avoids double-fetching and makes offline behavior predictable.

### `useAchievements` Hook Implementation Guide

```ts
// src/features/gameDetail/hooks/useAchievements.ts
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import Keychain from 'react-native-keychain';
import { eq } from 'drizzle-orm';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import { queryKeys } from '@shared/queryKeys';
import { getGameSchema, getPlayerAchievements } from '@data/api/steam';
import { isAppError } from '@shared/types/errors.types';
import { db } from '@db/index';
import { achievementCache, steamGames } from '@db/schema';

export type MergedAchievement = {
  apiname: string;
  displayName: string;
  description?: string;
  icon: string;
  icongray: string;
  achieved: boolean;
  unlocktime: number;
  hidden: boolean;
};

export const useAchievements = (appId: number) => {
  const steamId = useAppSelector(state => state.auth.steamId);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    Keychain.getGenericPassword({ service: 'steam_api_key' })
      .then(creds => setApiKey(creds ? creds.password : null))
      .catch(() => setApiKey(null));
  }, []);

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.games.achievements(appId),
    queryFn: async (): Promise<MergedAchievement[]> => {
      // 1. Check SQLite cache freshness
      const [cacheRow] = await db.select()
        .from(achievementCache)
        .where(eq(achievementCache.appId, appId))
        .limit(1);

      const [gameRow] = await db.select({ rtimeLastPlayed: steamGames.rtimeLastPlayed })
        .from(steamGames)
        .where(eq(steamGames.appId, appId))
        .limit(1);

      const rtimeLastPlayed = gameRow?.rtimeLastPlayed ?? 0;

      // 2. If cache is fresh, return it immediately (no API call)
      if (cacheRow && cacheRow.cachedAt >= rtimeLastPlayed) {
        try {
          return JSON.parse(cacheRow.data) as MergedAchievement[];
        } catch {
          // Corrupted cache — fall through to API fetch
        }
      }

      // 3. Cache stale or missing — fetch from Steam API
      const [schema, progress] = await Promise.allSettled([
        getGameSchema(apiKey!, appId),
        getPlayerAchievements(apiKey!, steamId!, appId),
      ]);

      // If schema failed fatally, no achievements to show
      if (schema.status === 'rejected') {
        const err = schema.reason;
        if (isAppError(err) && err.code === 'UNAUTHORIZED') throw err;
        return []; // NOT_FOUND or other → empty
      }

      const schemaAchievements = schema.value.game.availableGameStats?.achievements ?? [];
      if (schemaAchievements.length === 0) return [];

      // If player progress failed, show schema-only (all locked)
      const playerMap = new Map<string, { achieved: number; unlocktime: number }>();
      if (progress.status === 'fulfilled') {
        for (const pa of progress.value.playerstats.achievements) {
          playerMap.set(pa.apiname, { achieved: pa.achieved, unlocktime: pa.unlocktime ?? 0 });
        }
      } else {
        const err = progress.reason;
        if (isAppError(err) && err.code === 'UNAUTHORIZED') throw err;
        // NOT_FOUND or network → treat as all locked
      }

      const merged: MergedAchievement[] = schemaAchievements.map(sa => {
        const pa = playerMap.get(sa.name);
        return {
          apiname: sa.name,
          displayName: sa.displayName,
          description: sa.description,
          icon: sa.icon,
          icongray: sa.icongray,
          achieved: pa ? pa.achieved === 1 : false,
          unlocktime: pa?.unlocktime ?? 0,
          hidden: sa.hidden === 1,
        };
      });

      // Sort: unlocked first (newest unlock first), then locked
      merged.sort((a, b) => {
        if (a.achieved && !b.achieved) return -1;
        if (!a.achieved && b.achieved) return 1;
        if (a.achieved && b.achieved) return b.unlocktime - a.unlocktime;
        return 0; // both locked — preserve schema order
      });

      // 4. Persist to SQLite cache
      const unlockedCount = merged.filter(a => a.achieved).length;
      const nowUnix = Math.floor(Date.now() / 1000);
      await db.insert(achievementCache)
        .values({
          appId,
          cachedAt: nowUnix,
          unlockedCount,
          totalCount: merged.length,
          data: JSON.stringify(merged),
        })
        .onConflictDoUpdate({
          target: achievementCache.appId,
          set: {
            cachedAt: nowUnix,
            unlockedCount,
            totalCount: merged.length,
            data: JSON.stringify(merged),
          },
        });

      return merged;
    },
    enabled: !!apiKey && !!steamId,
    staleTime: Infinity, // queryFn handles freshness via SQLite timestamp comparison
    retry: 1,
  });

  const achievements = data ?? [];
  const totalCount = achievements.length;
  const unlockedCount = achievements.filter(a => a.achieved).length;

  return { achievements, totalCount, unlockedCount, isPending, isError };
};
```

**Key design decisions:**
- `Promise.allSettled` (not `Promise.all`) — so if player progress fails (private profile) we can still show schema-only achievements as all locked
- `UNAUTHORIZED` errors propagate to trigger session expiry
- `NOT_FOUND` is swallowed → empty array (no achievements for this game)
- `staleTime: Infinity` — queryFn itself checks SQLite cache freshness; TanStack Query never auto-refetches
- Freshness = `cached_at >= rtime_last_played` — if user hasn't played since last fetch, cache is valid indefinitely
- `INSERT ... ON CONFLICT DO UPDATE` (upsert) — safe for both first write and updates

### Steam Achievement API Details

**`ISteamUserStats/GetSchemaForGame/v0002/`**
- Returns achievement definitions for a game: `name` (API identifier), `displayName`, `description`, `icon` (full URL to unlocked icon), `icongray` (full URL to greyed icon)
- `icon` and `icongray` are already full URLs (e.g., `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/{appid}/{hash}.jpg`) — no URL construction needed
- Does NOT require `steamid` — game schema is public
- Requires `key` (API key) and `appid`
- If the game has no stats/achievements, `availableGameStats` may be absent from the response

**`ISteamUserStats/GetPlayerAchievements/v0001/`**
- Returns the player's unlock status per achievement: `apiname`, `achieved` (0/1), `unlocktime` (Unix timestamp)
- Requires `key`, `steamid`, `appid`
- Returns HTTP 400 with `{ playerstats: { success: false, error: "Requested app has no stats" } }` when:
  - The game has no achievements
  - The player's achievement stats are set to private
- Returns HTTP 403 when API key is invalid or unauthorized

**Merging Strategy:**
```
GetSchemaForGame → Achievement[] (definitions: displayName, icon, icongray, description, hidden)
GetPlayerAchievements → AchievementProgress[] (progress: apiname, achieved, unlocktime)

Merge on: Achievement.name === AchievementProgress.apiname
Result: MergedAchievement[] with both visual info and unlock status
```

### Achievement Icon Image Loading

Achievement icons (`icon` and `icongray` fields from `GetSchemaForGame`) are full URLs served from `steamcdn-a.akamaihd.net`. They are small images (typically 64x64 or 120x120). Use `FastImage` for native caching (SDWebImage/Glide).

```tsx
<FastImage
  source={{ uri: achievement.achieved ? achievement.icon : achievement.icongray }}
  style={styles.achievementIcon}
  resizeMode={FastImage.resizeMode.cover}
/>
```

### Keychain Access Pattern (from Story 2.2)

```ts
import Keychain from 'react-native-keychain';

// Read API key
const creds = await Keychain.getGenericPassword({ service: 'steam_api_key' });
const apiKey = creds ? creds.password : null;
```

The API key is stored as the `password` field in Keychain (Story 2.2 pattern). The hook reads it asynchronously on mount via `useEffect` + `useState`.

### `AchievementsSection` Component Guide

```tsx
// src/features/gameDetail/components/AchievementsSection.tsx

// Progress bar:
<View style={styles.progressBarTrack}>
  <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
</View>

// Achievement row:
<View style={[styles.achievementRow, !achievement.achieved && styles.achievementRowLocked]}>
  <FastImage
    source={{ uri: achievement.achieved ? achievement.icon : achievement.icongray }}
    style={styles.achievementIcon}
    resizeMode={FastImage.resizeMode.cover}
  />
  <View style={styles.achievementInfo}>
    <Text style={styles.achievementName}>{achievement.displayName}</Text>
    <Text style={styles.achievementDate}>
      {achievement.achieved
        ? new Date(achievement.unlocktime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Locked'}
    </Text>
  </View>
</View>

// Style patterns:
achievementIcon: { width: 40, height: 40, borderRadius: tokens.borderRadius.xs }
achievementRowLocked: { opacity: 0.5 }
progressBarTrack: { height: 6, borderRadius: tokens.borderRadius.xs, backgroundColor: tokens.colors.surface800 }
progressBarFill: { height: 6, borderRadius: tokens.borderRadius.xs, backgroundColor: tokens.colors.primary }
```

### Skeleton Pattern (from GameDetailSkeleton)

Reuse the shimmer animation pattern from `GameDetailSkeleton.tsx`:
- `useReducedMotion()` check — static grey blocks if reduced motion preferred
- `withRepeat(withTiming(0.4, { duration: 800 }), -1, true)` for pulse
- 3 skeleton rows: rectangle (40x40) + two text bars

### Drizzle Migration Notes (from Story 1.2 learnings)

```bash
# Generate the migration (from project root):
npx drizzle-kit generate

# Expected output:
# src/db/migrations/0001_<random_name>.sql — CREATE TABLE achievement_cache ...
```

After generating:
1. Verify the SQL file creates the correct table with FK reference
2. Import as `m0001` in `src/db/migrations/index.ts`
3. Add `m0001` to the `migrations` object
4. The `useMigrations` hook (Story 1.2) runs pending migrations automatically on app startup

**IMPORTANT:** `cachedAt` uses `integer('cached_at')` NOT `integer('cached_at', { mode: 'timestamp' })`. The architecture rule says "Unix integer in SQLite" — use plain integers (seconds since epoch), matching the format of `rtime_last_played`. The `{ mode: 'timestamp' }` Drizzle option converts to JS `Date` objects which complicates the comparison. Keep both as raw Unix integers.

### What Already Exists — Read First, Don't Recreate

| File | Current State | Action |
|---|---|---|
| `src/shared/types/steam.types.ts` | `Achievement`, `AchievementProgress`, `SteamGameSchemaResponse`, `SteamPlayerAchievementsResponse` defined but NOT exported | EXTEND — add to export statement |
| `src/data/api/steam.ts` | Has `steamFetch`, `getPlayerSummaries`, `getOwnedGamesWithKey` patterns | EXTEND — add `getGameSchema`, `getPlayerAchievements` |
| `src/shared/queryKeys.ts` | Has `games.detail`, `games.hltb` | EXTEND — add `games.achievements` |
| `src/db/schema.ts` | Has `steamGames` table | EXTEND — add `achievementCache` table |
| `src/db/migrations/index.ts` | Has `m0000` only | EXTEND — add `m0001` |
| `src/features/gameDetail/screens/GameDetailScreen.tsx` | Has placeholder comment `{/* Story 4.3: AchievementsSection will be added here */}` | EXTEND — replace comment with `<AchievementsSection appId={appId} />` |
| `src/shared/types/errors.types.ts` | `SteamError` with `NOT_FOUND` code already exists | READ ONLY — use for error handling |
| `src/shared/hooks/reduxHooks.ts` | `useAppSelector`, `useAppDispatch` | READ ONLY — import for `steamId` |
| `src/res/tokens.ts` | All design tokens | READ ONLY — import for `style=` props |
| `@d11/react-native-fast-image` | Installed, works with default import | READ ONLY — use for achievement icons |

### Architecture Compliance Checklist

- Achievement data is server state → TanStack Query (with SQLite as persistent cache layer)
- `queryKeys.games.achievements(appId)` from `src/shared/queryKeys.ts` — never inline
- Named exports only: `useAchievements`, `AchievementsSection`, `MergedAchievement`, `getGameSchema`, `getPlayerAchievements`, `achievementCache`, `AchievementCacheRow`
- Tests co-located with source files
- `Animated.View` uses `style=` only, never `className=`
- `tokens.ts` used for all `style=` props
- `FastImage` (default import from `@d11/react-native-fast-image`) for achievement icons
- No new native packages — no `jest.config.js` changes needed
- No new Redux slices
- `useReducedMotion` handled in skeleton shimmer
- Raw `fetch` for new API functions (same pattern as `getPlayerSummaries`) to detect HTTP status codes
- Unix integer timestamps in SQLite (never ISO strings, never `{ mode: 'timestamp' }`)
- Drizzle migration via `drizzle-kit generate` — not hand-written SQL

### Path Aliases Reference

- `@features` → `src/features/`
- `@shared` → `src/shared/`
- `@db` → `src/db/`
- `@navigation` → `src/navigation/`
- `@res` → `src/res/`
- `@data` → `src/data/` (verify — may not exist; use relative path `'../../../data/api/steam'` from `src/features/gameDetail/hooks/` if needed)

### Testing Patterns

**Hook test pattern for `useAchievements`:**
```ts
// Mock the DB module
jest.mock('@db/index', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock the API module
jest.mock('@data/api/steam', () => ({
  getGameSchema: jest.fn(),
  getPlayerAchievements: jest.fn(),
}));

// Mock Keychain
jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn().mockResolvedValue({ password: 'test-api-key' }),
}));

// Mock Redux hook
jest.mock('@shared/hooks/reduxHooks', () => ({
  useAppSelector: jest.fn().mockReturnValue('test-steam-id'),
  useAppDispatch: jest.fn(),
}));
```

**Component test pattern for `AchievementsSection`:**
```tsx
jest.mock('../hooks/useAchievements');
import { useAchievements } from '../hooks/useAchievements';
const mockUseAchievements = useAchievements as jest.MockedFunction<typeof useAchievements>;
```

**TanStack Query test wrapper:**
```ts
let currentQueryClient: QueryClient;

const createWrapper = () => {
  currentQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={currentQueryClient}>{children}</QueryClientProvider>
  );
};

afterEach(() => currentQueryClient?.clear());
```

### Previous Story Learnings (applicable to 4.3)

- `FastImage` uses **default import**: `import FastImage from '@d11/react-native-fast-image'`
- NativeWind `className=` on `Animated.View` is UNRELIABLE — always use `style=`
- `useReducedMotion` NOT in Reanimated mock — must be overridden in `jest.mock` factory
- Hook `retry: N` overrides `QueryClient.defaultOptions.retry: false` — use persistent `mockRejectedValue` (not Once) for error tests
- `afterEach(() => currentQueryClient?.clear())` in every test file with QueryClient
- `useMigrations` import: `drizzle-orm/op-sqlite/migrator`
- `useMigrations` format: `{ journal, migrations: { m0000: string, m0001: string } }`
- Stray `migrations/migrations.js` auto-generated by drizzle-kit — already in .gitignore

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3: Achievement Progress Display]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.2 State Ownership Rules] — server state → TanStack Query
- [Source: _bmad-output/planning-artifacts/architecture.md#4.4 TanStack Query Key Factory] — `queryKeys.games`
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#11.2] — skeleton shimmer (no generic spinners)
- [Source: src/shared/types/steam.types.ts] — existing achievement type definitions
- [Source: src/data/api/steam.ts] — existing API patterns (raw fetch for status detection)
- [Source: src/features/gameDetail/screens/GameDetailScreen.tsx:111] — placeholder comment for AchievementsSection
- [Source: src/features/gameDetail/components/GameDetailSkeleton.tsx] — shimmer animation pattern
- [Source: src/db/schema.ts] — existing schema + migration pattern
- [Source: src/db/migrations/index.ts] — migration registry pattern

## Dev Agent Record

### Agent Model Used

claude-opus-4-6 (Story creation — 2026-03-10)
claude-sonnet-4-6 (Implementation — 2026-03-10)

### Implementation Notes

- Migration `0001_aberrant_stone_men.sql` generated by `npx drizzle-kit generate` — creates `achievement_cache` table with FK to `steam_games.app_id`
- Keychain import uses `import * as Keychain` (namespace import) matching the pattern established in `useSteamSync.ts` and `useApiKeyGate.ts`
- `GameDetailScreen.test.tsx` updated to mock `AchievementsSection` (returns null) — screen tests test screen-level concerns only; section has its own tests
- `@data` path alias does not exist — used relative path `'../../../data/api/steam'` from `src/features/gameDetail/hooks/`
- All 277 tests pass; zero regressions

### Completion Notes

✅ AC1: `useAchievements(appId)` hook with TanStack Query, skeleton shimmer, progress header "N / M unlocked" + progress bar
✅ AC2: `AchievementsSection` renders achievement rows with FastImage icons, unlock dates, locked/unlocked visual distinction; show more/less toggle at 6 items
✅ AC3: SQLite `achievement_cache` table with smart invalidation — serves cache if `cachedAt >= rtimeLastPlayed`, refetches if stale; `INSERT ... ON CONFLICT DO UPDATE` upsert
✅ AC4: Graceful fallback — "No achievements available" for empty state; `NOT_FOUND` errors swallowed; no blocking error UI
✅ AC5: SQLite cache persists across app restarts; offline fallback to cached data or empty state

## File List

### New Files
- `src/db/migrations/0001_aberrant_stone_men.sql`
- `src/db/migrations/meta/_journal.json` (updated by drizzle-kit)
- `src/db/migrations/meta/0001_snapshot.json` (generated by drizzle-kit)
- `src/features/gameDetail/hooks/useAchievements.ts`
- `src/features/gameDetail/hooks/useAchievements.test.ts`
- `src/features/gameDetail/components/AchievementsSection.tsx`
- `src/features/gameDetail/components/AchievementsSection.test.tsx`

### Modified Files
- `src/db/schema.ts` — added `achievementCache` table + `AchievementCacheRow` type
- `src/db/migrations/index.ts` — added `m0001` import and entry
- `src/shared/queryKeys.ts` — added `games.achievements(appId)` key
- `src/shared/types/steam.types.ts` — exported `Achievement`, `AchievementProgress`, `SteamGameSchemaResponse`, `SteamPlayerAchievementsResponse`; removed eslint-disable comments
- `src/data/api/steam.ts` — added `getGameSchema` and `getPlayerAchievements` functions
- `src/data/api/steam.test.ts` — added tests for `getGameSchema` and `getPlayerAchievements`
- `src/features/gameDetail/screens/GameDetailScreen.tsx` — integrated `AchievementsSection`, added `achievementsContainer` style
- `src/features/gameDetail/screens/GameDetailScreen.test.tsx` — added mock for `AchievementsSection`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status: in-progress → review

## Change Log

- 2026-03-10: Implemented story 4-3 — achievement progress display with SQLite cache, Steam API integration, AchievementsSection component (claude-sonnet-4-6)
- 2026-03-10: Code review fixes — H1: added encodeURIComponent for appId in getGameSchema/getPlayerAchievements; H2: fixed permanent isPending when Keychain fails (added keyResolved flag); M2: added UNAUTHORIZED error propagation tests; M3: added 0001_snapshot.json to File List (claude-opus-4-6)
