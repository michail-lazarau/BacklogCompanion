# Story 4.1: Game Detail Screen Navigation & Header

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want to tap any game in my library and open a detailed view with a cinematic header,
so that I can access all enriched information for a specific game in a focused, immersive screen.

## Acceptance Criteria

**AC1 — Navigation from LibraryScreen:**
**Given** the user is on the Library screen
**When** they tap a `GameCard`
**Then** `GameDetailScreen` opens via a native stack push transition
**And** a back button returns the user to the Library screen

**AC2 — Cinematic header with parallax cover image:**
**Given** the `GameDetailScreen` is open
**When** the screen renders
**Then** the screen header displays a parallax cover image that transitions smoothly as the user scrolls
**And** the game title (H1 typography, `tokens.fontSize.h1 = 32px`, `tokens.fontFamily.bold`) and total playtime are visible below the hero image
**And** the header collapses to a compact title bar as the user scrolls down

**AC3 — Local-first data loading:**
**Given** the `GameDetailScreen` is open
**When** the screen renders
**Then** `useGameDetail` (TanStack Query, key: `queryKeys.games.detail(appId)`) reads the game record from SQLite via Drizzle
**And** the screen is interactive immediately using locally cached data — no network wait
**And** a skeleton shimmer is shown only if the SQLite query is still resolving (should be near-instant)

## Tasks / Subtasks

- [x] Task 1: Extend navigation types and RootNavigator for GameDetail route (AC: 1)
  - [x] Subtask 1.1: Add `GameDetail` to `RootStackParamList` in `src/navigation/types.ts`
    - Param: `{ appId: number }`
    - Add `GameDetailScreenProps` type alias: `NativeStackScreenProps<RootStackParamList, 'GameDetail'>`
  - [x] Subtask 1.2: Add `GameDetail` screen to `RootNavigator.tsx` inside `<Stack.Navigator>`
    - Import `GameDetailScreen` from `@features/gameDetail/screens/GameDetailScreen`
    - Add after `MainTabs`: `<Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ headerShown: false }} />`
    - `GameDetail` must be accessible regardless of auth state guard — only authenticated users can reach it (MainTabs gate already ensures this)
    - Note: `GameDetail` is added to the root stack (not the tab navigator) so it slides over tabs with native stack animation
  - [x] Subtask 1.3: Wire `onPress` in `LibraryScreen` to navigate to `GameDetail`
    - `LibraryScreen` uses `useLibraryScreen` hook — navigation must be passed in or accessed via `useNavigation`
    - Add `const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();` to `useLibraryScreen.ts`
    - Replace the TODO comment in `LibraryScreen` `GameCard` `onPress` with: `navigation.push('GameDetail', { appId: item.appId })`

- [x] Task 2: Create `useGameDetail` hook (AC: 3)
  - [x] Subtask 2.1: Create `src/features/gameDetail/hooks/useGameDetail.ts`
    - Named export: `export const useGameDetail = (appId: number) => { ... }`
    - Uses `useQuery` from `@tanstack/react-query`
    - Query key: `queryKeys.games.detail(appId)` — import from `@shared/queryKeys`
    - Query function: select from `steamGames` table via Drizzle where `steamGames.appId === appId` → returns `SteamGame | null`
    - Uses `db` import from `@db/index`
    - Returns: `{ game: SteamGame | null | undefined, isPending, isError }`
    - staleTime: `Infinity` — game detail data never goes stale mid-session (sync engine updates SQLite)
  - [x] Subtask 2.2: Create `src/features/gameDetail/hooks/useGameDetail.test.ts`
    - Test: returns `null` when appId not found in mock db
    - Test: returns game object when found
    - Test: `isPending` is true while query is loading
    - Test: uses correct query key `queryKeys.games.detail(appId)`
    - Pattern: mock `@db/index` with a jest mock (same pattern as `useGameLibrary.test.ts`)

- [x] Task 3: Create `GameDetailScreen` with parallax header (AC: 1, 2, 3)
  - [x] Subtask 3.1: Create `src/features/gameDetail/screens/GameDetailScreen.tsx`
    - Named export: `export const GameDetailScreen = ({ route, navigation }: GameDetailScreenProps) => { ... }`
    - Extract `appId` from `route.params.appId`
    - Use `useGameDetail(appId)` for data
    - Use `useSharedValue` + `useAnimatedScrollHandler` from `react-native-reanimated` for scroll offset tracking
    - Use `useAnimatedStyle` for parallax header image translation: `translateY = scrollY * 0.4` (40% parallax ratio)
    - **Header structure:**
      - `Animated.View` (NOT `className=`) with `style={[styles.headerContainer, animatedHeaderStyle]}`
      - Inside: `FastImage` for cover art (`headerImage` URL, `resizeMode: cover`)
      - Gradient overlay at the bottom of the header image (dark → transparent, bottom to top) for title legibility
      - A back button (`<TouchableOpacity onPress={() => navigation.goBack()}>`) positioned top-left with `SafeAreaView` edge padding
    - **Title section** (below the header image, in a static scroll view):
      - Game title: `Text` with `style={{ fontSize: tokens.fontSize.h1, fontFamily: tokens.fontFamily.bold, color: tokens.colors.text100 }}`
      - Playtime: `Text` with `formatPlaytime(game.playtimeForever)`, caption style
    - **Scroll container:** `Animated.ScrollView` with `onScroll={scrollHandler}` and `scrollEventThrottle={16}`
    - **Skeleton state:** When `isPending`, show `GameDetailSkeleton` (see Task 4)
    - **Error/empty state:** If `!game && !isPending`, show a brief "Game not found" message with back button
  - [x] Subtask 3.2: Create `src/features/gameDetail/screens/GameDetailScreen.test.tsx`
    - Test: renders game title when data is available
    - Test: renders skeleton when isPending
    - Test: back button navigates back (mock `navigation.goBack`)
    - Pattern: mock `useGameDetail` at module level; provide mock navigation via `@react-navigation/native` mock

- [x] Task 4: Create `GameDetailSkeleton` component (AC: 3)
  - [x] Subtask 4.1: Create `src/features/gameDetail/components/GameDetailSkeleton.tsx`
    - Named export: `export const GameDetailSkeleton = () => { ... }`
    - Two blocks: a large rectangle for the hero image area, two smaller rectangles for title + playtime
    - Uses `Animated` from `react-native-reanimated` for shimmer pulse animation
    - Check `useReducedMotion()` — if true, render static grey rectangles instead of shimmer
    - Colors: `tokens.colors.surface800` (base), slightly lighter pulse for shimmer
    - Style: `style=` only (no `className=` on `Animated.View`)
    - See Dev Notes for shimmer pattern reference from existing `LibraryListSkeleton`

- [x] Task 5: Validate (AC: TypeScript + ESLint + Jest)
  - [x] Subtask 5.1: `npx tsc --noEmit` — zero new TypeScript errors (2 pre-existing errors in useLibraryScreen.test.ts remain unchanged)
  - [x] Subtask 5.2: `npx eslint src/ --ext .ts,.tsx` — zero new lint errors (2 pre-existing `as any` warnings in test files)
  - [x] Subtask 5.3: `npx jest` — 249 tests pass (baseline 231 + 18 new); zero regressions

## Dev Notes

### STOP: Read Before Writing Any Code

These files must NOT be modified beyond what Tasks 1-4 specify:
- `src/shared/queryKeys.ts` — `queryKeys.games.detail(appId)` already exists, use it as-is
- `src/db/schema.ts` — no schema changes needed; `headerImage`, `name`, `playtimeForever`, `appId` all exist
- `src/features/library/hooks/useGameLibrary.ts` — no touch
- `src/features/library/hooks/useLibraryFilters.ts` — no touch
- `src/features/library/screens/LibraryScreen.tsx` — only the `onPress` TODO line changes
- `src/App.tsx` — no touch
- `src/navigation/MainTabNavigator.tsx` — no touch (GameDetail is on root stack, not tab navigator)

### Navigation Architecture (CRITICAL)

**Why `GameDetail` goes on the root stack, not inside tab navigator:**

The `GameDetailScreen` must slide over the entire tab bar (bottom tabs disappear on detail view). This requires it to be on the `RootStackParamList`, not nested inside `MainTabParamList`. Pattern already established by `Auth`, `ApiKey`, and `MainTabs` screens.

```
RootStackParamList:
  Auth → AuthScreen
  Loading → LoadingScreen
  ApiKey → ApiKeyScreen
  MainTabs → MainTabNavigator (has HomeTab, LibraryTab, ProfileTab)
  GameDetail → GameDetailScreen  ← ADD HERE
```

**Accessing navigation from `useLibraryScreen.ts`:**

```ts
// src/features/library/hooks/useLibraryScreen.ts — add:
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';

// Inside the hook:
const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
// Return it alongside other values so LibraryScreen can use it
```

**Then in `LibraryScreen.tsx`:**

```tsx
const { ..., navigation } = useLibraryScreen();

// In GameCard onPress:
<GameCard
  game={item}
  onPress={() => navigation.push('GameDetail', { appId: item.appId })}
/>
```

**Types to add to `src/navigation/types.ts`:**

```ts
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Auth: undefined;
  Loading: undefined;
  ApiKey: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  GameDetail: { appId: number };  // ← ADD THIS
};

// Add at bottom of types.ts:
export type GameDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'GameDetail'>;
```

### `useGameDetail` Hook Implementation

```ts
// src/features/gameDetail/hooks/useGameDetail.ts
import { useQuery } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';
import { db } from '@db/index';
import { steamGames } from '@db/schema';
import { queryKeys } from '@shared/queryKeys';

export const useGameDetail = (appId: number) => {
  const { data: game, isPending, isError } = useQuery({
    queryKey: queryKeys.games.detail(appId),
    queryFn: async () => {
      const result = await db.select().from(steamGames).where(eq(steamGames.appId, appId)).limit(1);
      return result[0] ?? null;
    },
    staleTime: Infinity, // game detail data never goes stale mid-session; sync engine updates SQLite
  });

  return { game, isPending, isError };
};
```

**Import paths (from `src/features/gameDetail/hooks/`):**
- `'@tanstack/react-query'` ✅
- `'drizzle-orm'` → `eq` (equality operator for WHERE clause) ✅
- `'@db/index'` → `db` ✅
- `'@db/schema'` → `steamGames` ✅
- `'@shared/queryKeys'` → `queryKeys` ✅

### `GameDetailScreen` Parallax Pattern

This is the critical implementation. Use Reanimated v4 worklets:

```tsx
// src/features/gameDetail/screens/GameDetailScreen.tsx
import { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, Animated } from 'react-native-reanimated';

const HEADER_HEIGHT = 280; // px — hero image area height
const PARALLAX_RATIO = 0.4; // how much the image moves relative to scroll

export const GameDetailScreen = ({ route, navigation }: GameDetailScreenProps) => {
  const { appId } = route.params;
  const { game, isPending } = useGameDetail(appId);
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Parallax: image translates upward at 40% of scroll speed → "peeling" effect
  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scrollY.value * PARALLAX_RATIO }],
  }));

  if (isPending) {
    return <GameDetailSkeleton />;
  }

  if (!game) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.surface900 }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: tokens.colors.primary, padding: tokens.spacing.md }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: tokens.colors.text100, textAlign: 'center' }}>Game not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.surface900 }}>
      {/* Fixed back button — always visible at top */}
      <SafeAreaView style={styles.backButtonWrapper} edges={['top']} pointerEvents="box-none">
        <TouchableOpacity
          testID="back-button"
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: tokens.spacing.xxl }}
      >
        {/* Parallax hero image — Animated.View MUST use style=, never className= */}
        <Animated.View style={[styles.headerContainer, animatedImageStyle]}>
          <FastImage
            source={{ uri: game.headerImage ?? undefined, priority: FastImage.priority.high }}
            style={styles.heroImage}
            resizeMode={FastImage.resizeMode.cover}
          />
          {/* Dark gradient overlay for title legibility */}
          <View style={styles.headerGradient} />
        </Animated.View>

        {/* Game info — rendered in normal scroll flow below hero */}
        <View style={styles.infoContainer}>
          <Text testID="game-title" style={styles.title}>{game.name}</Text>
          <Text style={styles.playtime}>{formatPlaytime(game.playtimeForever)}</Text>
          {/* Story 4.2: HltbSection will be added here */}
          {/* Story 4.3: AchievementsSection will be added here */}
          {/* Story 4.4: StatusSelector will be added here */}
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  backButtonWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  backButton: {
    margin: tokens.spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(23, 26, 33, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: tokens.colors.text100,
    fontSize: tokens.fontSize.body,
    fontFamily: tokens.fontFamily.bold,
  },
  headerContainer: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: HEADER_HEIGHT + 60, // extra height to allow parallax movement without blank space
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
    // Bottom-biased gradient overlay — black at bottom, transparent at top
    // React Native doesn't have LinearGradient built-in; use a semi-transparent overlay
    // For full LinearGradient: import from 'react-native-linear-gradient' (not in stack)
    // Use a simple View with gradient-like opacity for now (Story 4.1 scope)
    backgroundImage: undefined, // not supported in RN
    // Simple dark bottom overlay — sufficient for title legibility
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(23, 26, 33, 0)',
  },
  infoContainer: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.fontSize.h1,
    fontFamily: tokens.fontFamily.bold,
    color: tokens.colors.text100,
    marginBottom: tokens.spacing.xs,
  },
  playtime: {
    fontSize: tokens.fontSize.caption,
    fontFamily: tokens.fontFamily.regular,
    color: tokens.colors.text300,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
```

**IMPORTANT notes on the gradient overlay:**
- `react-native-linear-gradient` is NOT in the installed stack — do not add it
- Use a simple dark-to-transparent workaround: a `View` with `backgroundColor: 'rgba(23,26,33,0.6)'` at the bottom portion of the header
- OR skip the gradient overlay in Story 4.1 (title is rendered BELOW the hero image in normal flow, not overlaid) — simpler and still correct per AC
- The AC says "title visible below the hero image" — no overlay requirement; gradient is a UX enhancement

### `GameDetailSkeleton` Component

```tsx
// src/features/gameDetail/components/GameDetailSkeleton.tsx
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';
import { tokens } from '@res/tokens';

export const GameDetailSkeleton = () => {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withRepeat(
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,  // infinite
        true, // reverse
      );
    }
  }, [reducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? 1 : opacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Hero image placeholder */}
      <Animated.View style={[styles.heroBone, animatedStyle]} />
      {/* Title placeholder */}
      <View style={styles.infoContainer}>
        <Animated.View style={[styles.titleBone, animatedStyle]} />
        <Animated.View style={[styles.playtimeBone, animatedStyle]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.surface900,
  },
  heroBone: {
    height: 280,
    backgroundColor: tokens.colors.surface800,
  },
  infoContainer: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.md,
  },
  titleBone: {
    height: 36,
    borderRadius: tokens.borderRadius.sm,
    backgroundColor: tokens.colors.surface800,
    marginBottom: tokens.spacing.sm,
    width: '70%',
  },
  playtimeBone: {
    height: 16,
    borderRadius: tokens.borderRadius.xs,
    backgroundColor: tokens.colors.surface800,
    width: '30%',
  },
});
```

**`useReducedMotion` note:** As documented in MEMORY.md — `useReducedMotion` is NOT in the default Reanimated mock. Your `jest.mock('react-native-reanimated', ...)` factory must spread `jest.requireActual('react-native-reanimated/src/mock')` and override `useReducedMotion` with a jest function returning `false`.

### What Already Exists — Read First, Don't Recreate

| File | Current State | Action |
|---|---|---|
| `src/navigation/types.ts` | `RootStackParamList` (Auth, Loading, ApiKey, MainTabs), `MainTabParamList` (HomeTab, LibraryTab, ProfileTab), typed props | EXTEND — add `GameDetail: { appId: number }` and `GameDetailScreenProps` |
| `src/navigation/RootNavigator.tsx` | Stack navigator with Auth gate; renders Auth/Loading/ApiKey/MainTabs | EXTEND — add `<Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ headerShown: false }} />` |
| `src/features/library/screens/LibraryScreen.tsx` | Full library screen; GameCard `onPress` has TODO comment for Story 4.1 | EXTEND — wire onPress via navigation from `useLibraryScreen` |
| `src/features/library/hooks/useLibraryScreen.ts` | Controls all library screen state + refresh logic | EXTEND — add `useNavigation` import and return navigation |
| `src/shared/queryKeys.ts` | Includes `games.detail(appId)` key factory | READ ONLY — key already exists |
| `src/db/schema.ts` | `steamGames`: has `appId`, `name`, `playtimeForever`, `headerImage`, `hltbMain/Extra/Complete`, `hltbCachedAt`, `lastSyncedAt` | READ ONLY — no migration needed |
| `src/shared/utils/formatPlaytime.ts` | Formats playtime minutes → human-readable string | READ ONLY — import as `@shared/utils/formatPlaytime` |
| `src/res/tokens.ts` | All design tokens | READ ONLY — import for `style=` props |
| `src/features/gameDetail/components/` | Has `.gitkeep` only — empty | CREATE `GameDetailSkeleton.tsx` |
| `src/features/gameDetail/hooks/` | Has `.gitkeep` only — empty | CREATE `useGameDetail.ts` + test |
| `src/features/gameDetail/screens/` | Has `.gitkeep` only — empty | CREATE `GameDetailScreen.tsx` + test |

### Architecture Compliance Checklist

- ✅ `GameDetail` on root stack (not tab navigator) — tabs hide during detail view, native slide animation
- ✅ `queryKeys.games.detail(appId)` from `src/shared/queryKeys.ts` — never inline
- ✅ Game data from SQLite via Drizzle (local-first, no network wait) — NFR-PERF-01 compliance
- ✅ `staleTime: Infinity` on `useGameDetail` — sync engine is responsible for SQLite freshness
- ✅ `Animated.View` uses `style=` only, never `className=` — NativeWind v4 known limitation
- ✅ Named exports only: `GameDetailScreen`, `useGameDetail`, `GameDetailSkeleton`
- ✅ Tests co-located with source files
- ✅ No new Redux slices — game data is server state → TanStack Query
- ✅ No new `queryKeys` entries needed — `games.detail` already exists
- ✅ No new native packages — no jest.config.js changes needed
- ✅ `tokens.ts` used for all `style=` props — `@res/tokens`
- ✅ No `react-native-linear-gradient` (not in stack) — use simple color overlay
- ✅ `SafeAreaView` from `react-native-safe-area-context` — same as all other screens
- ✅ `FastImage` from `@d11/react-native-fast-image` (default import) with high priority for detail view
- ✅ `useReducedMotion` handled in skeleton — `prefers-reduced-motion` compliance (UX spec §12.2)
- ✅ `@navigation/types` alias available (check `babel.config.js` and `tsconfig.json` if needed)

### Path Aliases Reference

From prior stories, confirmed working aliases:
- `@features` → `src/features/`
- `@shared` → `src/shared/`
- `@db` → `src/db/`
- `@navigation` → `src/navigation/`
- `@res` → `src/res/`

If `@navigation` alias doesn't exist, use relative path `'../../../navigation/types'` from `src/features/gameDetail/hooks/`.

### Reanimated v4 Pattern (from Story 2.3 / 3.2)

- `useSharedValue`, `useAnimatedScrollHandler`, `useAnimatedStyle`, `withRepeat`, `withTiming`, `Easing` all from `'react-native-reanimated'`
- `Animated.ScrollView` and `Animated.View` from `react-native-reanimated` (not the bare RN `Animated`)
- `scrollEventThrottle={16}` — required on `Animated.ScrollView` for 60fps scroll tracking
- NEVER use `className=` on `Animated.View` — always `style=`

### Testing Patterns (from Epic 3 learnings)

**Hook test mock pattern for `useGameDetail`:**
```ts
// src/features/gameDetail/hooks/useGameDetail.test.ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useGameDetail } from './useGameDetail';

// Mock the db module
jest.mock('@db/index', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
```

**Screen test mock pattern:**
```tsx
// src/features/gameDetail/screens/GameDetailScreen.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { GameDetailScreen } from './GameDetailScreen';

// Mock useGameDetail hook
jest.mock('../hooks/useGameDetail');
import { useGameDetail } from '../hooks/useGameDetail';
const mockUseGameDetail = useGameDetail as jest.MockedFunction<typeof useGameDetail>;

// Mock navigation
const mockNavigation = { goBack: jest.fn(), push: jest.fn() };
const mockRoute = { params: { appId: 123 }, key: 'GameDetail-1', name: 'GameDetail' as const };

// Render helper
const renderScreen = () =>
  render(<GameDetailScreen route={mockRoute as any} navigation={mockNavigation as any} />);
```

### Previous Story Learnings (Stories 3.0 → 3.4)

- **`@d11/react-native-fast-image`** uses **default import**: `import FastImage from '@d11/react-native-fast-image'` ✅
- **`@data/*` alias does NOT exist** — not needed in this story
- **`@db` alias exists and works**: `@db/index`, `@db/schema` ✅
- **`@res/tokens`** alias works ✅
- **MMKV v4 API**: `.set(key, value)` / `.getString(key)` / `.remove(key)` — not needed in this story
- **Named exports only**: `export const X = ...`, never `export default` (exception: `__mocks__/`)
- **StyleSheet.create()**: module-level static styles; only dynamic styles inline
- **TanStack Query in tests**: fresh `QueryClient` per test, `retry: false`, wrap with `QueryClientProvider`
- **`useReducedMotion` NOT in Reanimated mock**: must be overridden in `jest.mock` factory — see MEMORY.md
- **NativeWind `className=` on `Animated.View` is unreliable**: always use `style=` — per architecture rules
- **FlashList v2**: no `estimatedItemSize` prop (removed) — not relevant to this story
- **Test count baseline**: 231 tests pass after Story 3.4

### Git Intelligence (Recent Commits)

```
4f2db5e feat(library): instant local game search with debounce (story 3-4)
47b2279 fix(library): add 3-line title truncation to GameCard; add NativeWind styling guide
5152fec fix(library): code review fixes for LibraryScreen and useSteamSync (story 3-3)
1fc8962 fix(library): fix empty-state flash, polish auth UX, add filter/sort (story 3-3)
7457851 fix(ui): fix GameCard image aspect ratio, tab bar color, and token coverage
33ca717 feat(library): local-first list view with GameCard and offline support (story 3-2)
```

Patterns established:
- Commit format: `feat(gameDetail): <description> (story 4-1)`
- New feature work lives in `src/features/gameDetail/`
- Token usage for all `style=` props is universal across the codebase
- Screen-level logic extracted to co-located hooks (e.g., `useLibraryScreen`, `useApiKeyScreen`)

### Project Structure Notes

**Files to CREATE:**
- `src/features/gameDetail/hooks/useGameDetail.ts`
- `src/features/gameDetail/hooks/useGameDetail.test.ts`
- `src/features/gameDetail/components/GameDetailSkeleton.tsx`
- `src/features/gameDetail/components/GameDetailSkeleton.test.tsx`
- `src/features/gameDetail/screens/GameDetailScreen.tsx`
- `src/features/gameDetail/screens/GameDetailScreen.test.tsx`

**Files to MODIFY (minimal, targeted changes only):**
- `src/navigation/types.ts` — add `GameDetail` param to `RootStackParamList` + `GameDetailScreenProps` type
- `src/navigation/RootNavigator.tsx` — add `<Stack.Screen name="GameDetail" ...>` import + JSX
- `src/features/library/hooks/useLibraryScreen.ts` — add `useNavigation` + return `navigation`
- `src/features/library/screens/LibraryScreen.tsx` — wire `onPress` to `navigation.push('GameDetail', { appId: ... })`

**Files NOT to touch:**
- `src/features/library/hooks/useGameLibrary.ts` — read only
- `src/features/library/hooks/useLibraryFilters.ts` — read only
- `src/shared/queryKeys.ts` — no new keys needed
- `src/db/schema.ts` — no migration (schema already has all needed columns)
- `src/navigation/MainTabNavigator.tsx` — no touch
- `src/App.tsx` — no touch
- `jest.config.js` — no new native packages

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1: Game Detail Screen Navigation & Header]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.2 State Ownership Rules] — server state → TanStack Query
- [Source: _bmad-output/planning-artifacts/architecture.md#4.3 Project Structure] — `src/features/gameDetail/` layout
- [Source: _bmad-output/planning-artifacts/architecture.md#4.4 TanStack Query Key Factory] — `queryKeys.games.detail`
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#10.2 The Game Card] — List variant tap → Detail View
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#9.1 Flow 1] — Tap card → Detail view → Decision
- [Source: src/navigation/types.ts] — existing RootStackParamList structure
- [Source: src/navigation/RootNavigator.tsx] — stack navigator pattern
- [Source: src/features/library/screens/LibraryScreen.tsx:111] — TODO comment for GameDetail navigation
- [Source: src/features/auth/hooks/useApiKeyScreen.ts] — hook pattern for screen logic separation
- [Source: src/shared/queryKeys.ts] — `queryKeys.games.detail(appId)` already defined
- [Source: src/db/schema.ts] — `SteamGame` type, available columns

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Story creation — 2026-03-10)
claude-sonnet-4-6 (Implementation — 2026-03-10)

### Debug Log References

- `mockLimit` in jest.mock factory cannot reference outer `let` variable due to hoisting → used `jest.requireMock` pattern instead
- `jest.mock()` factory cannot reference imported `React`/`View` variables → used inline `require()` inside factory
- `useNavigation` called without NavigationContainer in `useLibraryScreen.test.ts` after adding hook → added `@react-navigation/native` mock to that test file

### Completion Notes List

- Implemented all 4 tasks (navigation extension, useGameDetail hook, GameDetailScreen with parallax header, GameDetailSkeleton with reduced-motion support)
- GameDetail placed on root stack so it slides over tabs with native animation
- `useNavigation` added to `useLibraryScreen` hook; returned as `navigation` so LibraryScreen can call `navigation.push('GameDetail', { appId })`
- Parallax effect: `translateY = scrollY * 0.4` via `useAnimatedStyle` on `Animated.View` (style= only, never className=)
- Compact title bar: fades in via `interpolate` / `Extrapolation.CLAMP` once hero scrolls past threshold (AC2 collapse behavior)
- Skeleton uses `useReducedMotion()` — static grey blocks when reduced motion is preferred
- All styles moved to `StyleSheet.create()` — zero inline style warnings
- Code review fixes applied: compact bar, Jest leak resolved, no-op gradient removed, not-found back button testID + test, explicit `options={{ headerShown: false }}` on GameDetail screen
- Test count: 231 baseline → 251 (20 new tests across 3 new test files + 2 updated existing tests)

### File List

**Created:**
- src/features/gameDetail/hooks/useGameDetail.ts
- src/features/gameDetail/hooks/useGameDetail.test.ts
- src/features/gameDetail/components/GameDetailSkeleton.tsx
- src/features/gameDetail/components/GameDetailSkeleton.test.tsx
- src/features/gameDetail/screens/GameDetailScreen.tsx
- src/features/gameDetail/screens/GameDetailScreen.test.tsx

**Modified:**
- src/navigation/types.ts
- src/navigation/RootNavigator.tsx
- src/features/library/hooks/useLibraryScreen.ts
- src/features/library/hooks/useLibraryScreen.test.ts
- src/features/library/screens/LibraryScreen.tsx

### Change Log

- feat(gameDetail): implement game detail screen navigation and header (story 4-1) — 2026-03-10
- fix(gameDetail): code review fixes — compact title bar, test leak, gradient no-op, missing tests, headerShown option (story 4-1) — 2026-03-10
