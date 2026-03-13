# Story 4.2: HLTB Time Estimates Display

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want to see "How Long To Beat" estimates for a game on its detail screen,
so that I can judge whether I have enough time to start or finish it tonight.

## Acceptance Criteria

**AC1 — On-demand HLTB fetch with SQLite cache:**
**Given** the user opens a `GameDetailScreen`
**When** the `HltbSection` mounts
**Then** `useHltbData(appId)` (TanStack Query, key: `queryKeys.games.hltb(appId)`) checks for a cached result in the SQLite `steam_games` table (`hltbCachedAt` column)
**And** if cache is fresh (< 7 days old), the cached `hltbMain`/`hltbExtra`/`hltbComplete` values are served instantly — no network request
**And** if cache is stale or missing, `searchHltb(gameName)` from `hltbClient.ts` is called on-demand to fetch estimates
**And** the fetched result is stored back into `steam_games` columns (`hltb_main`, `hltb_extra`, `hltb_complete`, `hltb_cached_at`) via Drizzle UPDATE
**And** a skeleton shimmer is shown while the fetch is in progress

**AC2 — Three estimates displayed as OmniPill components:**
**Given** HLTB data has loaded successfully
**When** the `HltbSection` renders
**Then** three estimates are displayed: Main Story, Main + Extra, and Completionist
**And** each estimate is rendered as an `OmniPill` component with a label and formatted time (e.g., "5h 30m")
**And** each pill is color-coded by duration:
  - Green (#A3E635) for < 10 hours
  - Amber (#FBBF24) for 10–40 hours
  - Red (#F87171) for > 40 hours
  - Blue (#66C0F4) for 0 (no data / endless / live-service)

**AC3 — Graceful failure handling:**
**Given** the HLTB fetch fails for any reason (network error, rate limit, no match found)
**When** `HltbSection` renders
**Then** all three estimate slots display "—" gracefully
**And** no error modal or blocking state is shown (best-effort enrichment)
**And** the failed fetch does NOT write stale/empty data to SQLite — cache remains unchanged

**AC4 — Reduced motion support:**
**Given** the device has `prefers-reduced-motion` enabled
**When** the skeleton shimmer would normally animate
**Then** static grey placeholder blocks are shown instead of animated shimmer

## Tasks / Subtasks

- [x] Task 1: Create `useHltbData` hook (AC: 1, 3)
  - [x] Subtask 1.1: Create `src/features/gameDetail/hooks/useHltbData.ts`
    - Named export: `export const useHltbData = (appId: number, gameName: string | undefined) => { ... }`
    - Uses `useQuery` from `@tanstack/react-query`
    - Query key: `queryKeys.games.hltb(appId)` — import from `@shared/queryKeys`
    - `enabled: !!gameName` — disabled until game name is available
    - `staleTime: Infinity` — queryFn handles freshness internally
    - `retry: 1` — one retry on transient failures
    - **Cache-aware queryFn logic:**
      1. Read `steam_games` row for this `appId` — get `hltbMain`, `hltbExtra`, `hltbComplete`, `hltbCachedAt`
      2. If `hltbCachedAt` is not null AND `(Date.now() - hltbCachedAt.getTime()) < HLTB_CACHE_TTL_MS` → cache fresh → return `{ main, extra, complete }` from columns (no API call)
      3. If cache is stale or missing → call `searchHltb(gameName!)` from `@shared/utils/hltbClient`
      4. If `searchHltb` returns `null` (no match) → return `{ main: 0, extra: 0, complete: 0 }` (triggers "—" display)
      5. On success → UPDATE `steam_games` row via Drizzle: set `hltbMain`, `hltbExtra`, `hltbComplete`, `hltbCachedAt = new Date()`
      6. Return `{ main: result.mainStory, extra: result.mainExtra, complete: result.completionist }`
    - If `searchHltb` throws → let it propagate (TanStack Query handles as error → AC3 shows "—")
    - Returns: `{ hltbData: { main: number; extra: number; complete: number } | undefined, isPending, isError }`
  - [x] Subtask 1.2: Define `HLTB_CACHE_TTL_MS` constant
    - Add to `src/shared/constants/index.ts`: `export const HLTB_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days`
  - [x] Subtask 1.3: Create `src/features/gameDetail/hooks/useHltbData.test.ts`
    - Test: returns cached data from SQLite when cache is fresh (no `searchHltb` call)
    - Test: fetches from HLTB API when cache is stale (older than 7 days)
    - Test: fetches from HLTB API when no cache exists (`hltbCachedAt` is null)
    - Test: writes fetched data back to `steam_games` via Drizzle UPDATE
    - Test: returns `{ main: 0, extra: 0, complete: 0 }` when `searchHltb` returns null
    - Test: `isPending` is true while fetching
    - Test: `isError` is true when `searchHltb` throws
    - Test: uses correct query key `queryKeys.games.hltb(appId)`
    - Test: disabled when `gameName` is undefined
    - Pattern: mock `@db/index`, `@shared/utils/hltbClient`; fresh `QueryClient` per test with `afterEach(clear)`

- [x] Task 2: Create `OmniPill` component (AC: 2)
  - [x] Subtask 2.1: Create `src/shared/components/OmniPill.tsx`
    - Named export: `export const OmniPill = ({ label, seconds }: { label: string; seconds: number }) => { ... }`
    - Displays `label` (e.g., "Main") and formatted time via `formatHltbTime(seconds)` from `@shared/utils/hltbClient`
    - Color logic based on hours (`seconds / 3600`):
      - `hours === 0` → Blue (`#66C0F4`) — no data / endless
      - `hours < 10` → Green (`#A3E635`)
      - `hours <= 40` → Amber (`#FBBF24`)
      - `hours > 40` → Red (`#F87171`)
    - Style: rounded pill (`borderRadius: 9999`), colored background, dark text (`tokens.colors.surface900`), caption font size, horizontal padding `sm2` (12px), vertical padding `xs` (4px)
    - Uses `StyleSheet.create()` — only dynamic color applied via inline `backgroundColor`
    - No glassmorphism for MVP — solid colored pill is sufficient
  - [x] Subtask 2.2: Create `src/shared/components/OmniPill.test.tsx`
    - Test: renders label and formatted time
    - Test: green pill for < 10h (e.g., 18000 seconds = 5h)
    - Test: amber pill for 10-40h (e.g., 72000 seconds = 20h)
    - Test: red pill for > 40h (e.g., 180000 seconds = 50h)
    - Test: blue pill for 0 seconds (shows "—")

- [x] Task 3: Create `HltbSection` component (AC: 1, 2, 3, 4)
  - [x] Subtask 3.1: Create `src/features/gameDetail/components/HltbSection.tsx`
    - Named export: `export const HltbSection = ({ appId, gameName }: { appId: number; gameName: string | undefined }) => { ... }`
    - Uses `useHltbData(appId, gameName)` hook
    - **Loading state**: skeleton shimmer (3 pill-shaped rectangles in a row)
      - Uses `useReducedMotion()` — static grey blocks if reduced motion preferred
      - Shimmer pattern: same as `AchievementsSection` skeleton (`withRepeat`/`withTiming`)
      - `Animated.View` MUST use `style=` (no `className=`)
    - **Error/empty state**: render 3 `OmniPill` components with `seconds={0}` (shows "—" in blue)
    - **Success state**: section label "How Long To Beat" (H2 typography), then 3 `OmniPill` in a horizontal `flexDirection: 'row'` with `gap: tokens.spacing.sm`
      - Pill 1: `label="Main"` `seconds={hltbData.main}`
      - Pill 2: `label="Main+"` `seconds={hltbData.extra}`
      - Pill 3: `label="100%"` `seconds={hltbData.complete}`
    - All styles in `StyleSheet.create()` — use `tokens` for spacing, colors, fonts
  - [x] Subtask 3.2: Create `src/features/gameDetail/components/HltbSection.test.tsx`
    - Test: renders "How Long To Beat" section label when data available
    - Test: renders 3 OmniPill components with correct labels (Main, Main+, 100%)
    - Test: renders skeleton when isPending
    - Test: renders "—" pills when isError
    - Test: renders "—" pills when all values are 0
    - Pattern: mock `useHltbData` at module level

- [x] Task 4: Integrate `HltbSection` into `GameDetailScreen` (AC: 1)
  - [x] Subtask 4.1: Add `HltbSection` to `GameDetailScreen.tsx` inside the `infoContainer` View
    - Import: `import { HltbSection } from '../components/HltbSection';`
    - Place BETWEEN the playtime text and the `achievementsContainer`:
      ```tsx
      <Text style={styles.playtime}>{formatPlaytime(game.playtimeForever)}</Text>
      <View style={styles.hltbContainer}>
        <HltbSection appId={appId} gameName={game.name} />
      </View>
      <View style={styles.achievementsContainer}>
      ```
    - Add `hltbContainer` style: `{ marginTop: tokens.spacing.lg }`
  - [x] Subtask 4.2: Update `GameDetailScreen.test.tsx`
    - Add mock for `HltbSection` (returns null) — same pattern as existing `AchievementsSection` mock

- [x] Task 5: Validate (AC: TypeScript + ESLint + Jest)
  - [x] Subtask 5.1: `npx tsc --noEmit` — zero new TypeScript errors
  - [x] Subtask 5.2: `npx eslint src/ --ext .ts,.tsx` — zero new lint errors in new/modified files
  - [x] Subtask 5.3: `npx jest` — all tests pass, zero regressions

## Dev Notes

### STOP: Read Before Writing Any Code

These files must NOT be modified beyond what Tasks 1-4 specify:
- `src/features/library/` — no touch
- `src/App.tsx` — no touch
- `src/navigation/` — no touch
- `src/data/QueryProvider.tsx` — no touch
- `src/db/schema.ts` — no touch (HLTB columns already exist)
- `src/db/migrations/` — no touch (no new migration needed)
- `src/shared/queryKeys.ts` — no touch (`games.hltb` key already exists)
- `src/shared/utils/hltbClient.ts` — no touch (client already implemented)

### HLTB Data Storage — CRITICAL TYPE DETAIL

The `steam_games` schema stores HLTB values as follows:
```ts
// src/db/schema.ts (ALREADY EXISTS — DO NOT MODIFY)
hltbMain: real('hltb_main'),           // seconds from HLTB API (NOT hours despite comment)
hltbExtra: real('hltb_extra'),         // seconds from HLTB API
hltbComplete: real('hltb_complete'),   // seconds from HLTB API
hltbCachedAt: integer('hltb_cached_at', { mode: 'timestamp' }), // Drizzle converts to/from JS Date
```

**CRITICAL:** `hltbCachedAt` uses `{ mode: 'timestamp' }` — Drizzle automatically converts between:
- SQLite: Unix integer (seconds)
- TypeScript: `Date | null` object

So when READING: `game.hltbCachedAt` is `Date | null`
When WRITING: pass `new Date()` — Drizzle converts to Unix integer

**CRITICAL:** `hltbMain`/`hltbExtra`/`hltbComplete` are `real` columns storing **seconds** (from HLTB API `comp_main`/`comp_plus`/`comp_100`). The `formatHltbTime(seconds)` function in `hltbClient.ts` handles the display conversion to "Xh Ym" format.

### Cache Staleness Strategy

HLTB data for a game changes very rarely (game length estimates stabilize quickly). A 7-day cache TTL is appropriate.

```
Staleness check:
  hltbCachedAt is null                                     → MISS  (fetch from API)
  (Date.now() - hltbCachedAt.getTime()) < 7 days in ms    → FRESH (serve from SQLite)
  (Date.now() - hltbCachedAt.getTime()) >= 7 days in ms   → STALE (refetch from API)
```

**Why `staleTime: Infinity`:** Same pattern as `useAchievements` — the queryFn handles freshness itself by checking SQLite timestamps. TanStack Query should never auto-refetch.

### `searchHltb` Client Details

Already implemented at `src/shared/utils/hltbClient.ts` (READ ONLY):

```ts
searchHltb(gameName: string): Promise<HltbResult | null>
// Returns: { id, name, mainStory, mainExtra, completionist, imageUrl }
// mainStory/mainExtra/completionist are in SECONDS
// Returns null when no match found (not an error)
// Throws HltbError on network/parse failures

formatHltbTime(seconds: number): string
// 0 → '--'
// 18000 → '5h'
// 19800 → '5h 30m'
```

### `useHltbData` Hook Implementation Guide

```ts
// src/features/gameDetail/hooks/useHltbData.ts
import { useQuery } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';
import { db } from '@db/index';
import { steamGames } from '@db/schema';
import { queryKeys } from '@shared/queryKeys';
import { searchHltb } from '@shared/utils/hltbClient';
import { HLTB_CACHE_TTL_MS } from '@shared/constants';

export type HltbData = {
  main: number;   // seconds
  extra: number;  // seconds
  complete: number; // seconds
};

export const useHltbData = (appId: number, gameName: string | undefined) => {
  const { data: hltbData, isPending, isError } = useQuery({
    queryKey: queryKeys.games.hltb(appId),
    queryFn: async (): Promise<HltbData> => {
      // 1. Check SQLite cache
      const [row] = await db.select({
        hltbMain: steamGames.hltbMain,
        hltbExtra: steamGames.hltbExtra,
        hltbComplete: steamGames.hltbComplete,
        hltbCachedAt: steamGames.hltbCachedAt,
      }).from(steamGames).where(eq(steamGames.appId, appId)).limit(1);

      // 2. Cache fresh? Return immediately
      if (row?.hltbCachedAt) {
        const age = Date.now() - row.hltbCachedAt.getTime();
        if (age < HLTB_CACHE_TTL_MS) {
          return {
            main: row.hltbMain ?? 0,
            extra: row.hltbExtra ?? 0,
            complete: row.hltbComplete ?? 0,
          };
        }
      }

      // 3. Fetch from HLTB API
      const result = await searchHltb(gameName!);
      if (!result) {
        return { main: 0, extra: 0, complete: 0 };
      }

      // 4. Persist to SQLite
      await db.update(steamGames)
        .set({
          hltbMain: result.mainStory,
          hltbExtra: result.mainExtra,
          hltbComplete: result.completionist,
          hltbCachedAt: new Date(), // Drizzle converts to Unix int
        })
        .where(eq(steamGames.appId, appId));

      return {
        main: result.mainStory,
        extra: result.mainExtra,
        complete: result.completionist,
      };
    },
    enabled: !!gameName,
    staleTime: Infinity,
    retry: 1,
  });

  return { hltbData, isPending, isError };
};
```

**Key differences from `useAchievements`:**
- No Keychain access needed (HLTB is a public API — no auth)
- No `steamId` dependency — HLTB looks up by game name
- No separate cache table — uses existing `steam_games` columns
- Writes via `UPDATE` (not `INSERT ... ON CONFLICT`) since the game row already exists
- `enabled: !!gameName` instead of credential-gated

### OmniPill Color Mapping

```ts
// Color coding per UX spec §10.3
const getOmniPillColor = (seconds: number): string => {
  const hours = seconds / 3600;
  if (hours === 0) return '#66C0F4';   // Blue — no data / endless
  if (hours < 10)  return '#A3E635';   // Green — short
  if (hours <= 40) return '#FBBF24';   // Amber — medium
  return '#F87171';                     // Red — long
};
```

Note: `#FBBF24` (amber/yellow) is NOT in `tokens.ts` — define it as a constant in the `OmniPill` component file. Do NOT modify `tokens.ts` or `tailwind.config.js` for this (scope creep).

### HltbSection Integration Point

In `GameDetailScreen.tsx`, the section goes BETWEEN playtime and achievements:

```tsx
// Current (line 152-158):
<View style={styles.infoContainer}>
  <Text testID="game-title" style={styles.title}>{game.name}</Text>
  <Text style={styles.playtime}>{formatPlaytime(game.playtimeForever)}</Text>
  <View style={styles.achievementsContainer}>
    <AchievementsSection appId={appId} />
  </View>
</View>

// After (add HltbSection between playtime and achievements):
<View style={styles.infoContainer}>
  <Text testID="game-title" style={styles.title}>{game.name}</Text>
  <Text style={styles.playtime}>{formatPlaytime(game.playtimeForever)}</Text>
  <View style={styles.hltbContainer}>
    <HltbSection appId={appId} gameName={game.name} />
  </View>
  <View style={styles.achievementsContainer}>
    <AchievementsSection appId={appId} />
  </View>
</View>
```

### What Already Exists — Read First, Don't Recreate

| File | Current State | Action |
|---|---|---|
| `src/shared/utils/hltbClient.ts` | `searchHltb()`, `HltbResult`, `formatHltbTime()`, `HltbError` class | READ ONLY — import and use |
| `src/shared/queryKeys.ts` | `queryKeys.games.hltb(appId)` key factory | READ ONLY — key already exists |
| `src/db/schema.ts` | `steamGames.hltbMain`, `.hltbExtra`, `.hltbComplete`, `.hltbCachedAt` columns | READ ONLY — columns already exist, no migration needed |
| `src/shared/types/errors.types.ts` | `HltbError` type in `AppError` union | READ ONLY |
| `src/shared/constants/index.ts` | Exports `SYNC_THROTTLE_MS` and other constants | EXTEND — add `HLTB_CACHE_TTL_MS` |
| `src/features/gameDetail/screens/GameDetailScreen.tsx` | Renders `AchievementsSection` after playtime | EXTEND — add `HltbSection` above achievements |
| `src/features/gameDetail/screens/GameDetailScreen.test.tsx` | Mocks `AchievementsSection` | EXTEND — add mock for `HltbSection` |
| `src/features/gameDetail/components/AchievementsSection.tsx` | Full component with skeleton pattern | READ for pattern reference |
| `src/features/gameDetail/hooks/useAchievements.ts` | Hook with SQLite cache + API fetch pattern | READ for pattern reference |
| `src/res/tokens.ts` | All design tokens | READ ONLY — import for `style=` props |

### Architecture Compliance Checklist

- `queryKeys.games.hltb(appId)` from `src/shared/queryKeys.ts` — never inline
- Named exports only: `useHltbData`, `HltbData`, `HltbSection`, `OmniPill`
- Tests co-located with source files
- `Animated.View` uses `style=` only, never `className=`
- `tokens.ts` used for all `style=` props (except OmniPill colors which are component-local)
- No new Redux slices — HLTB is server state → TanStack Query
- No new query keys needed — `games.hltb` already exists
- No new native packages — no `jest.config.js` changes needed
- No new SQLite migration — schema columns already exist
- `useReducedMotion` handled in skeleton shimmer
- HLTB values stored as seconds (raw from API), displayed via `formatHltbTime()`

### Path Aliases Reference

- `@features` → `src/features/`
- `@shared` → `src/shared/`
- `@db` → `src/db/`
- `@navigation` → `src/navigation/`
- `@res` → `src/res/`
- No `@data` alias — use relative paths if needed

### Reanimated v4 Skeleton Pattern (from AchievementsSection)

```tsx
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, useReducedMotion,
} from 'react-native-reanimated';

const HltbSkeleton = () => {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withRepeat(
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1, true,
      );
    }
  }, [reducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : opacity.value,
  }));

  // 3 pill-shaped skeleton blocks in a row
  return (
    <View testID="hltb-skeleton" style={{ flexDirection: 'row', gap: tokens.spacing.sm }}>
      {[0, 1, 2].map(i => (
        <Animated.View key={i} style={[skeletonPillStyle, animatedStyle]} />
      ))}
    </View>
  );
};
```

### Testing Patterns

**Hook test pattern for `useHltbData`:**
```ts
jest.mock('@db/index', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    // where is already mocked above — reused for UPDATE
  },
}));

jest.mock('@shared/utils/hltbClient', () => ({
  searchHltb: jest.fn(),
  formatHltbTime: jest.fn((s: number) => s === 0 ? '--' : `${Math.floor(s/3600)}h`),
}));
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

**Component test pattern:**
```tsx
jest.mock('../hooks/useHltbData');
import { useHltbData } from '../hooks/useHltbData';
const mockUseHltbData = useHltbData as jest.MockedFunction<typeof useHltbData>;
```

### Previous Story Learnings (from 4-1 and 4-3)

- `FastImage` uses **default import**: `import FastImage from '@d11/react-native-fast-image'` — not needed in HltbSection but relevant if adding images
- NativeWind `className=` on `Animated.View` is UNRELIABLE — always use `style=`
- `useReducedMotion` NOT in Reanimated mock — must be overridden in `jest.mock` factory (spread `jest.requireActual('react-native-reanimated/src/mock')` and override `useReducedMotion`)
- Hook `retry: N` overrides `QueryClient.defaultOptions.retry: false` — use persistent `mockRejectedValue` (not `mockRejectedValueOnce`) for error tests
- `afterEach(() => currentQueryClient?.clear())` in every test file with QueryClient
- `GameDetailScreen.test.tsx` mocks child sections (AchievementsSection returns null) — apply same pattern for HltbSection
- Test count baseline: 277 tests pass after Story 4.3

### Git Intelligence (Recent Commits)

```
3a83b92 feat(gameDetail): library_600x900 backdrop fades in after hero exits (story 4-1)
a0cf88b feat(gameDetail): compact bar with capsule image on hero scroll-out (story 4-1)
0e5c4c2 feat(gameDetail): achievement progress display with SQLite cache (story 4-3)
1a52270 feat(gameDetail): GameDetailScreen with parallax hero, skeleton, navigation (story 4-1)
```

Commit format: `feat(gameDetail): <description> (story 4-2)`

### Project Structure Notes

**Files to CREATE:**
- `src/features/gameDetail/hooks/useHltbData.ts`
- `src/features/gameDetail/hooks/useHltbData.test.ts`
- `src/features/gameDetail/components/HltbSection.tsx`
- `src/features/gameDetail/components/HltbSection.test.tsx`
- `src/shared/components/OmniPill.tsx`
- `src/shared/components/OmniPill.test.tsx`

**Files to MODIFY (minimal, targeted changes only):**
- `src/shared/constants/index.ts` — add `HLTB_CACHE_TTL_MS` export
- `src/features/gameDetail/screens/GameDetailScreen.tsx` — add `HltbSection` import + JSX + style
- `src/features/gameDetail/screens/GameDetailScreen.test.tsx` — add mock for `HltbSection`

**Files NOT to touch:**
- `src/shared/utils/hltbClient.ts` — already implemented
- `src/shared/queryKeys.ts` — `games.hltb` already exists
- `src/db/schema.ts` — HLTB columns already exist
- `src/db/migrations/` — no new migration
- `src/features/library/` — no touch
- `src/navigation/` — no touch
- `src/App.tsx` — no touch
- `jest.config.js` — no new native packages

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.2: HLTB Time Estimates Display]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.3 API & Communication — HLTB Integration]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.2 State Ownership Rules] — server state -> TanStack Query
- [Source: _bmad-output/planning-artifacts/architecture.md#4.4 TanStack Query Key Factory] — `queryKeys.games.hltb`
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#10.3 The Omni-Pill] — color-coded duration pill
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#11.2] — skeleton shimmer (no generic spinners)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#12.2] — prefers-reduced-motion support
- [Source: src/shared/utils/hltbClient.ts] — existing HLTB client (searchHltb, formatHltbTime, HltbError)
- [Source: src/shared/queryKeys.ts] — `queryKeys.games.hltb(appId)` already defined
- [Source: src/db/schema.ts] — `steamGames` HLTB columns (hltbMain, hltbExtra, hltbComplete, hltbCachedAt)
- [Source: src/features/gameDetail/screens/GameDetailScreen.tsx] — integration point (line 152-158)
- [Source: src/features/gameDetail/components/AchievementsSection.tsx] — skeleton animation pattern
- [Source: src/features/gameDetail/hooks/useAchievements.ts] — SQLite cache + TanStack Query hook pattern

## Dev Agent Record

### Agent Model Used

claude-opus-4-6 (Story creation — 2026-03-11)
claude-sonnet-4-6 (Implementation — 2026-03-11)

### Debug Log References

- OmniPill color tests: `toJSON().props.style` is an array (`[StyleSheet entry, { backgroundColor }]`) — merged with `Object.assign({}, ...styles)` to read dynamic color.
- `useHltbData` isError test: hook's `retry: 1` overrides `QueryClient.defaultOptions.retry: false` — required `waitFor` with 5000ms timeout for 2-attempt retry cycle to complete.
- `HltbSection.test.tsx`: used `jest.requireActual` inside mock factory to avoid `@typescript-eslint/no-require-imports` lint error.

### Completion Notes List

- Implemented `HLTB_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000` in `src/shared/constants/index.ts`.
- `useHltbData` hook: reads SQLite cache first (`hltbCachedAt` as JS Date via Drizzle `mode: 'timestamp'`), serves from cache if < 7 days old, otherwise calls `searchHltb()`, writes result back via `UPDATE`.
- `OmniPill` component: color-coded pill using `StyleSheet.create()` with inline `backgroundColor` override. Amber (`#FBBF24`) defined as component-local constant (not in tokens).
- `HltbSection` component: skeleton shimmer (3 pill-shaped `Animated.View` blocks), error state (3 blue `OmniPill` with `seconds=0`), success state (section label + 3 pills).
- `HltbSection` integrated into `GameDetailScreen` between playtime and achievements, with `hltbContainer` style (`marginTop: tokens.spacing.lg`).
- 23 new tests added; total suite: 300 tests (up from 277), zero regressions.

### File List

**Created:**
- `src/features/gameDetail/hooks/useHltbData.ts`
- `src/features/gameDetail/hooks/useHltbData.test.ts`
- `src/features/gameDetail/components/HltbSection.tsx`
- `src/features/gameDetail/components/HltbSection.test.tsx`
- `src/shared/components/OmniPill.tsx`
- `src/shared/components/OmniPill.test.tsx`

**Modified:**
- `src/shared/constants/index.ts` — added `HLTB_CACHE_TTL_MS`
- `src/features/gameDetail/screens/GameDetailScreen.tsx` — added `HltbSection` import, JSX, and `hltbContainer` style
- `src/features/gameDetail/screens/GameDetailScreen.test.tsx` — added `HltbSection` mock
- `src/db/schema.ts` — fixed HLTB column comments (hours → seconds)
- `_bmad-output/implementation-artifacts/4-2-hltb-time-estimates-display.md` — story updates
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — status updated

## Change Log

- 2026-03-11: Implemented story 4-2 (HLTB Time Estimates Display). Added `useHltbData` TanStack Query hook with SQLite 7-day cache, `OmniPill` color-coded duration component, `HltbSection` with skeleton/error/success states, and integrated into `GameDetailScreen`. 23 new tests; 300 total passing.
- 2026-03-11: Code review fixes — H1: fixed schema.ts HLTB column comments (hours→seconds); M2: added section label to error state; M3: changed OmniPill text color to #000000 for WCAG AA contrast; M4: added reduced motion test for AC4. M1 (null match not cached) deferred as design decision.
