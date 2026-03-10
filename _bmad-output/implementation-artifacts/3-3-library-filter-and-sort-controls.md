# Story 3.3: Library Filter & Sort Controls

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want to filter my library by backlog status and sort it by multiple criteria,
so that I can quickly surface the games most relevant to what I want to play.

## Acceptance Criteria

**AC1 — Filter and sort via bottom sheet:**
**Given** the user is on the Library screen
**When** they tap the filter/sort button in the header toolbar
**Then** a `FilterSheet` bottom sheet opens (`@gorhom/bottom-sheet`)
**And** they can filter by status: All (null — default), Unplayed (`'unplayed'`), In Progress (`'in_progress'`), Completed (`'completed'`)
**And** they can sort by: Alphabetical (`'alphabetical'`), Playtime Ascending (`'playtime_asc'`), Playtime Descending (`'playtime_desc'`), Release Date (`'release_date'`)
**And** active filter and sort selections are stored in `librarySlice` Redux state (persisted via Redux Persist)
**And** the list updates immediately when a filter or sort option is selected — no loading state (filter/sort applied to the in-memory SQLite result via `useLibraryFilters`)

**AC2 — Active filter visual indicator:**
**Given** the user selects a non-"All" filter
**When** the library list re-renders
**Then** only matching games are shown:
  - `'unplayed'`: games with `playtimeForever === 0`
  - `'in_progress'`: games with `playtimeForever > 0`
  - `'completed'`: empty list (awaits Story 4.4 `user_annotations` table)
**And** the active filter is visually indicated as a dismissible pill in the Library header row
**And** tapping the pill's × clears the filter (dispatches `setActiveFilter(null)`)

**AC3 — Filter and sort persistence:**
**Given** the user closes the app and reopens it
**When** the Library screen loads
**Then** the previously selected filter and sort are restored from Redux (persisted via Redux Persist + MMKV storage adapter — no extra work needed)

## Tasks / Subtasks

- [x] Task 1: Add `FilterOption` and `SortOption` types to `librarySlice.ts` (AC: 1, 3)
  - [x] Subtask 1.1: Add exported type `FilterOption = 'unplayed' | 'in_progress' | 'completed'` (no `'all'` — `null` represents "all")
  - [x] Subtask 1.2: Add exported type `SortOption = 'alphabetical' | 'playtime_asc' | 'playtime_desc' | 'release_date'`
  - [x] Subtask 1.3: Update `LibraryState.activeFilter` to `FilterOption | null` — default `null` unchanged
  - [x] Subtask 1.4: Update `LibraryState.activeSort` to `SortOption` — default `'alphabetical'` unchanged
  - [x] Subtask 1.5: Update `setActiveFilter` payload type to `FilterOption | null`
  - [x] Subtask 1.6: Update `setActiveSort` payload type to `SortOption`
  - [x] Subtask 1.7: Verify `librarySlice.test.ts` still passes — `'unplayed'` and `'playtime_desc'` are valid members of the new types so no test changes are needed

- [x] Task 2: Create `@gorhom/bottom-sheet` Jest mock (AC: 1)
  - [x] Subtask 2.1: Create `__mocks__/@gorhom/bottom-sheet.tsx` — simple View-based mock (see Dev Notes: Bottom Sheet Mock)
  - [x] Subtask 2.2: Add `'^@gorhom/bottom-sheet$': '<rootDir>/__mocks__/@gorhom/bottom-sheet.tsx'` to `moduleNameMapper` in `jest.config.js`
  - [x] NOTE: `@gorhom/bottom-sheet` is ALREADY in `transformIgnorePatterns` — only `moduleNameMapper` needs updating

- [x] Task 3: Create `useLibraryFilters` hook (AC: 1, 2)
  - [x] Subtask 3.1: Create `src/features/library/hooks/useLibraryFilters.ts`
    - Named export `filterGames(games: SteamGame[], filter: FilterOption | null): SteamGame[]` — pure function
    - Named export `sortGames(games: SteamGame[], sort: SortOption): SteamGame[]` — pure function (sorts a copy)
    - Named export `useLibraryFilters()` hook: reads `activeFilter` + `activeSort` from Redux, calls `useGameLibrary()`, computes filtered+sorted list in `useMemo`, returns `{ ...rest, data: filteredGames }`
    - See Dev Notes: `useLibraryFilters` Implementation
  - [x] Subtask 3.2: Create `src/features/library/hooks/useLibraryFilters.test.ts`
    - Test `filterGames` with null → returns all games
    - Test `filterGames('unplayed')` → only 0-playtime games
    - Test `filterGames('in_progress')` → only >0-playtime games
    - Test `filterGames('completed')` → empty array (Story 4.4 placeholder)
    - Test `sortGames('alphabetical')` → sorted by name localeCompare
    - Test `sortGames('playtime_asc')` → ascending playtime
    - Test `sortGames('playtime_desc')` → descending playtime
    - Test `sortGames('release_date')` → descending `rtimeLastPlayed` (nulls last)
    - Test `useLibraryFilters` hook: activeFilter='unplayed' returns only 0-playtime games
    - Test `useLibraryFilters` hook: activeSort='playtime_desc' returns games in descending playtime order

- [x] Task 4: Create `FilterSheet` component (AC: 1, 2)
  - [x] Subtask 4.1: Create `src/features/library/components/FilterSheet.tsx` — named export `FilterSheet`
    - Props: `isVisible: boolean; onClose: () => void`
    - Uses `BottomSheet` from `@gorhom/bottom-sheet` with `index={isVisible ? 0 : -1}`, `snapPoints={useMemo(() => ['50%'], [])}`, `enablePanDownToClose={true}`, `onChange` callback (calls `onClose` when index becomes -1)
    - Reads `activeFilter` and `activeSort` from Redux; dispatches `setActiveFilter` / `setActiveSort` on tap
    - Renders two sections: "Filter" row + "Sort" row (see Dev Notes: FilterSheet Design)
    - Active option styled with `tokens.colors.primary` background + `tokens.colors.surface900` text; inactive options: `tokens.colors.surface800` background + `tokens.colors.text300` text
    - Pill shape via `borderRadius: 9999` (no `borderRadius.full` in tokens — use inline number)
  - [x] Subtask 4.2: Create `src/features/library/components/FilterSheet.test.tsx`
    - Test: renders filter options when `isVisible={true}`
    - Test: renders nothing when `isVisible={false}` (mock BottomSheet renders null when index=-1)
    - Test: tapping `testID="filter-option-unplayed"` dispatches `setActiveFilter('unplayed')`
    - Test: tapping `testID="filter-option-all"` dispatches `setActiveFilter(null)`
    - Test: tapping `testID="sort-option-playtime_desc"` dispatches `setActiveSort('playtime_desc')`
    - Test: `onClose` is called when BottomSheet onChange fires with index -1

- [x] Task 5: Update `LibraryScreen` (AC: 1, 2, 3)
  - [x] Subtask 5.1: Replace `useGameLibrary()` call with `useLibraryFilters()` — same destructured fields, `data` is now filtered+sorted
  - [x] Subtask 5.2: Add `const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false)` local state
  - [x] Subtask 5.3: Add `const activeFilter = useAppSelector(state => state.library.activeFilter)` and `const dispatch = useAppDispatch()` for the pill + clear action
  - [x] Subtask 5.4: Add a header toolbar `<View>` between `<OfflineBanner />` and the FlashList/skeleton:
    - Layout: `flexDirection: 'row'`, `alignItems: 'center'`, `paddingHorizontal: tokens.spacing.md`, `paddingVertical: tokens.spacing.sm`, `borderBottomWidth: 1`, `borderBottomColor: tokens.colors.surface800`
    - Left (flex: 1): conditional active-filter pill (see Dev Notes: Active Filter Pill)
    - Right: "Filter" button (text + icon placeholder) that calls `setIsFilterSheetVisible(true)`
  - [x] Subtask 5.5: Add `<FilterSheet isVisible={isFilterSheetVisible} onClose={() => setIsFilterSheetVisible(false)} />` at the bottom of the SafeAreaView (after FlashList/skeleton block — bottom sheets must be rendered in the tree but not inside a ScrollView)
  - [x] Subtask 5.6: Update `FlashList` `ListEmptyComponent`: when `activeFilter !== null` → show "No games match the current filter." (instead of the sync message); when `activeFilter === null` → show existing "Your library is empty..." message

- [x] Task 6: Validate (AC: TypeScript + ESLint + Jest)
  - [x] Subtask 6.1: `npx tsc --noEmit` — zero TypeScript errors
  - [x] Subtask 6.2: `npx eslint src/ --ext .ts,.tsx` — zero new lint errors introduced by this story
  - [x] Subtask 6.3: `npx jest` — 210 tests pass (191 baseline → 210, +19 new); 1 pre-existing GameCard failure unrelated to this story

## Dev Notes

### STOP: Read Before Writing Any Code

These files must NOT be modified (read-only, import only):
- `src/shared/queryKeys.ts` — no changes needed; `queryKeys.games.all(steamId)` is used inside `useGameLibrary` which `useLibraryFilters` calls
- `src/features/library/hooks/useGameLibrary.ts` — do NOT modify; `useLibraryFilters` wraps it
- `src/navigation/RootNavigator.tsx` — no touch
- `src/navigation/types.ts` — no touch (GameDetail route is Story 4.1)
- `src/App.tsx` — no touch
- `src/db/schema.ts` — no migration needed in this story
- `src/features/library/hooks/useSteamSync.ts` — no changes
- `src/data/mmkv.ts` — no changes
- `src/shared/constants/index.ts` — no changes

### What Already Exists — Read First, Don't Recreate

| File | Current State | Action |
|---|---|---|
| `src/features/library/store/librarySlice.ts` | Has `activeFilter: string \| null` and `activeSort: string`; actions `setActiveFilter`, `setActiveSort` | ADD types only — tighten to `FilterOption \| null` and `SortOption` |
| `src/features/library/store/librarySlice.test.ts` | Tests `setActiveFilter('unplayed')` and `setActiveSort('playtime_desc')` — both valid in new types | NO CHANGES NEEDED |
| `src/features/library/screens/LibraryScreen.tsx` | Uses `useGameLibrary()`, `FlashList`, `OfflineBanner` | EXTEND — add toolbar, FilterSheet, swap hook |
| `src/features/library/hooks/useGameLibrary.ts` | Fetches ALL games alphabetically from SQLite | READ ONLY — `useLibraryFilters` wraps it |
| `jest.config.js` | `@gorhom/bottom-sheet` already in `transformIgnorePatterns` | ADD `moduleNameMapper` entry only |
| `src/shared/hooks/reduxHooks.ts` | Exports `useAppSelector`, `useAppDispatch` | READ ONLY |
| `src/res/tokens.ts` | Colors, spacing, borderRadius, fontSize, fontFamily | READ ONLY — import for native `style=` props |

### `FilterOption` and `SortOption` Types (Task 1)

Add to `src/features/library/store/librarySlice.ts` BEFORE the interface:

```ts
export type FilterOption = 'unplayed' | 'in_progress' | 'completed';
export type SortOption = 'alphabetical' | 'playtime_asc' | 'playtime_desc' | 'release_date';
```

Update the `LibraryState` interface and `PayloadAction` types for `setActiveFilter` and `setActiveSort`. The initial state values (`null` and `'alphabetical'`) remain unchanged and are valid with the new types.

**Why `null` for "all" instead of `'all'` as a union member:**
- `null` is already used as the default and "no filter" sentinel in the existing slice
- `librarySlice.test.ts` already tests `setActiveFilter(null)` to clear — this remains valid
- Keeps the FilterOption type clean (only meaningful non-null filters)

### `@gorhom/bottom-sheet` Jest Mock (Task 2)

Create `__mocks__/@gorhom/bottom-sheet.tsx`:

```tsx
// Mock for @gorhom/bottom-sheet
// Renders children when index >= 0, renders null when index === -1
import React from 'react';
import { View } from 'react-native';

const BottomSheet = ({
  children,
  index,
  onChange,
}: {
  children: React.ReactNode;
  index: number;
  onChange?: (index: number) => void;
  [key: string]: any;
}) => {
  // Simulate pan-down close by immediately firing onChange(-1) when index becomes -1
  // (only in tests that manually set index to -1)
  if (index === -1) return null;
  return <View testID="bottom-sheet">{children}</View>;
};

export const BottomSheetView = ({
  children,
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => <View testID="bottom-sheet-view">{children}</View>;

export const BottomSheetScrollView = ({
  children,
}: {
  children: React.ReactNode;
  [key: string]: any;
}) => <View testID="bottom-sheet-scroll-view">{children}</View>;

export default BottomSheet;
```

**Add to `jest.config.js` `moduleNameMapper`:**
```js
'^@gorhom/bottom-sheet$': '<rootDir>/__mocks__/@gorhom/bottom-sheet.tsx',
```

**Note:** `@gorhom/bottom-sheet` is already in `transformIgnorePatterns` (confirmed in `jest.config.js` line 22). Only `moduleNameMapper` needs to be updated. The mock file handles the `default` export (`BottomSheet`) and named exports (`BottomSheetView`, `BottomSheetScrollView`).

### `useLibraryFilters` Implementation (Task 3)

```ts
// src/features/library/hooks/useLibraryFilters.ts
import { useMemo } from 'react';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import { useGameLibrary } from './useGameLibrary';
import type { FilterOption, SortOption } from '../store/librarySlice';
import type { SteamGame } from '@db/schema';

export const filterGames = (games: SteamGame[], filter: FilterOption | null): SteamGame[] => {
  switch (filter) {
    case 'unplayed':
      return games.filter((g) => g.playtimeForever === 0);
    case 'in_progress':
      return games.filter((g) => g.playtimeForever > 0);
    case 'completed':
      // user_annotations table added in Story 4.4 — returns empty until then
      return [];
    case null:
    default:
      return games;
  }
};

export const sortGames = (games: SteamGame[], sort: SortOption): SteamGame[] => {
  const copy = [...games]; // never mutate the original
  switch (sort) {
    case 'alphabetical':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'playtime_asc':
      return copy.sort((a, b) => a.playtimeForever - b.playtimeForever);
    case 'playtime_desc':
      return copy.sort((a, b) => b.playtimeForever - a.playtimeForever);
    case 'release_date':
      // Steam GetOwnedGames does not return release_date.
      // Using rtimeLastPlayed as proxy (most recently played first).
      // Games never played (rtimeLastPlayed = null/0) sort to the end.
      return copy.sort((a, b) => (b.rtimeLastPlayed ?? 0) - (a.rtimeLastPlayed ?? 0));
    default:
      return copy;
  }
};

export const useLibraryFilters = () => {
  const activeFilter = useAppSelector((state) => state.library.activeFilter);
  const activeSort = useAppSelector((state) => state.library.activeSort);
  const { data: games, ...rest } = useGameLibrary();

  const data = useMemo(() => {
    if (!games) return undefined;
    const filtered = filterGames(games, activeFilter);
    return sortGames(filtered, activeSort as SortOption);
  }, [games, activeFilter, activeSort]);

  return { ...rest, data };
};
```

**Key notes:**
- `filterGames` and `sortGames` are exported pure functions — easy to unit test without hooks
- `useMemo` ensures filtered+sorted array is only recomputed when `games`, `activeFilter`, or `activeSort` changes — prevents unnecessary renders
- `activeSort` from Redux is `string` typed (before the slice type update) — cast `as SortOption` is safe after Task 1 narrows the type in Redux state
- After Task 1, the cast is no longer needed — the type flows through correctly
- `sortGames` creates a `copy` with spread — never mutates the input array from TanStack Query cache

**Import paths (from `src/features/library/hooks/`):**
- `'../store/librarySlice'` → relative ✅ (for `FilterOption`, `SortOption`)
- `'./useGameLibrary'` → relative ✅
- `'@shared/hooks/reduxHooks'` → alias ✅
- `'@db/schema'` → alias ✅

### FilterSheet Design (Task 4)

```tsx
// src/features/library/components/FilterSheet.tsx
import { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useAppDispatch, useAppSelector } from '@shared/hooks/reduxHooks';
import { setActiveFilter, setActiveSort } from '../store/librarySlice';
import type { FilterOption, SortOption } from '../store/librarySlice';
import { tokens } from '@res/tokens';

interface FilterSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const FILTER_OPTIONS: { label: string; value: FilterOption | null }[] = [
  { label: 'All', value: null },
  { label: 'Unplayed', value: 'unplayed' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Alphabetical', value: 'alphabetical' },
  { label: 'Playtime ↑', value: 'playtime_asc' },
  { label: 'Playtime ↓', value: 'playtime_desc' },
  { label: 'Release Date', value: 'release_date' },
];

export const FilterSheet = ({ isVisible, onClose }: FilterSheetProps) => {
  const dispatch = useAppDispatch();
  const activeFilter = useAppSelector((state) => state.library.activeFilter);
  const activeSort = useAppSelector((state) => state.library.activeSort);
  const snapPoints = useMemo(() => ['50%'], []);

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) onClose();
    },
    [onClose],
  );

  return (
    <BottomSheet
      index={isVisible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onChange={handleChange}
      backgroundStyle={{ backgroundColor: tokens.colors.surface800 }}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: tokens.spacing.md, paddingTop: tokens.spacing.sm }}>
        {/* Filter section */}
        <Text
          style={{
            color: tokens.colors.text300,
            fontSize: tokens.fontSize.caption,
            fontFamily: tokens.fontFamily.medium,
            marginBottom: tokens.spacing.sm,
          }}
        >
          FILTER
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg }}>
          {FILTER_OPTIONS.map((opt) => {
            const isActive = activeFilter === opt.value;
            return (
              <TouchableOpacity
                key={opt.value ?? 'all'}
                testID={`filter-option-${opt.value ?? 'all'}`}
                onPress={() => dispatch(setActiveFilter(opt.value))}
                style={{
                  paddingHorizontal: tokens.spacing.md,
                  paddingVertical: tokens.spacing.sm,
                  borderRadius: 9999,
                  backgroundColor: isActive ? tokens.colors.primary : tokens.colors.surface900,
                }}
              >
                <Text
                  style={{
                    color: isActive ? tokens.colors.surface900 : tokens.colors.text300,
                    fontSize: tokens.fontSize.caption,
                    fontFamily: tokens.fontFamily.medium,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sort section */}
        <Text
          style={{
            color: tokens.colors.text300,
            fontSize: tokens.fontSize.caption,
            fontFamily: tokens.fontFamily.medium,
            marginBottom: tokens.spacing.sm,
          }}
        >
          SORT
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm }}>
          {SORT_OPTIONS.map((opt) => {
            const isActive = activeSort === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                testID={`sort-option-${opt.value}`}
                onPress={() => dispatch(setActiveSort(opt.value))}
                style={{
                  paddingHorizontal: tokens.spacing.md,
                  paddingVertical: tokens.spacing.sm,
                  borderRadius: 9999,
                  backgroundColor: isActive ? tokens.colors.primary : tokens.colors.surface900,
                }}
              >
                <Text
                  style={{
                    color: isActive ? tokens.colors.surface900 : tokens.colors.text300,
                    fontSize: tokens.fontSize.caption,
                    fontFamily: tokens.fontFamily.medium,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};
```

**BottomSheet notes:**
- `index={isVisible ? 0 : -1}` — controlled visibility: 0 = open at first snapPoint, -1 = closed/hidden
- `snapPoints={['50%']}` — 50% screen height is sufficient for 2 rows of options
- `enablePanDownToClose` — user can swipe down to dismiss (triggers `onChange(-1)` → `onClose()`)
- `backgroundStyle` — override default white background with Surface-800 dark background
- `gap` in flexWrap row — React Native >= 0.71 supports `gap` in StyleSheet; RN 0.83.1 fully supports it

**Import paths (from `src/features/library/components/`):**
- `'../store/librarySlice'` → relative ✅
- `'@shared/hooks/reduxHooks'` → alias ✅
- `'@res/tokens'` → alias ✅

### Active Filter Pill in LibraryScreen (Task 5)

Add between `<OfflineBanner />` and the skeleton/FlashList block:

```tsx
{/* Library toolbar: active filter pill + filter button */}
<View
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.surface800,
    minHeight: 44, // accessibility: minimum tap target height
  }}
>
  {/* Active filter pill (visible when a filter is selected) */}
  <View style={{ flex: 1, flexDirection: 'row' }}>
    {activeFilter !== null && (
      <TouchableOpacity
        testID="active-filter-pill"
        onPress={() => dispatch(setActiveFilter(null))}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: tokens.colors.primary,
          borderRadius: 9999,
          paddingHorizontal: tokens.spacing.sm2,
          paddingVertical: tokens.spacing.xs,
        }}
      >
        <Text
          style={{
            color: tokens.colors.surface900,
            fontSize: tokens.fontSize.caption,
            fontFamily: tokens.fontFamily.medium,
          }}
        >
          {FILTER_LABELS[activeFilter]}
        </Text>
        <Text
          style={{
            color: tokens.colors.surface900,
            fontSize: tokens.fontSize.caption,
            fontFamily: tokens.fontFamily.medium,
            marginLeft: tokens.spacing.xs,
          }}
        >
          ×
        </Text>
      </TouchableOpacity>
    )}
  </View>

  {/* Filter / Sort button */}
  <TouchableOpacity
    testID="open-filter-sheet-button"
    onPress={() => setIsFilterSheetVisible(true)}
    style={{
      paddingHorizontal: tokens.spacing.sm2,
      paddingVertical: tokens.spacing.xs,
    }}
  >
    <Text
      style={{
        color: tokens.colors.primary,
        fontSize: tokens.fontSize.caption,
        fontFamily: tokens.fontFamily.medium,
      }}
    >
      Filter / Sort
    </Text>
  </TouchableOpacity>
</View>
```

Define `FILTER_LABELS` constant at the top of `LibraryScreen.tsx`:
```ts
const FILTER_LABELS: Record<FilterOption, string> = {
  unplayed: 'Unplayed',
  in_progress: 'In Progress',
  completed: 'Completed',
};
```

**Complete `LibraryScreen` updated imports:**
```ts
import { useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useAppSelector, useAppDispatch } from '@shared/hooks/reduxHooks';
import { setActiveFilter } from '../store/librarySlice';
import type { FilterOption } from '../store/librarySlice';
import { useSteamSync } from '../hooks/useSteamSync';
import { useLibraryFilters } from '../hooks/useLibraryFilters';  // replaces useGameLibrary
import { GameCard } from '../components/GameCard';
import { LibraryListSkeleton } from '../components/LibraryListSkeleton';
import { FilterSheet } from '../components/FilterSheet';
import { OfflineBanner } from '@shared/components/OfflineBanner';
import { tokens } from '@res/tokens';
import type { SteamGame } from '@db/schema';
```

**FilterSheet placement — important:**
`<FilterSheet>` must be rendered OUTSIDE the `FlashList` / `SafeAreaView` contents as a sibling, but inside the root `SafeAreaView`. Bottom sheets use an absolute overlay internally — placing them inside a `ScrollView` or `FlashList` will break z-ordering. Place it as the last child inside `<SafeAreaView>`:

```tsx
<SafeAreaView className="flex-1 bg-surface-900" edges={['top']}>
  <OfflineBanner />
  {/* toolbar row */}
  <View ...>...</View>
  {/* list */}
  {showSkeleton ? <LibraryListSkeleton /> : <FlashList ... />}
  {/* bottom sheet LAST — not inside FlashList */}
  <FilterSheet isVisible={isFilterSheetVisible} onClose={() => setIsFilterSheetVisible(false)} />
</SafeAreaView>
```

### Testing Strategy

**`useLibraryFilters.test.ts` — test pure functions directly:**
```ts
import { filterGames, sortGames } from './useLibraryFilters';
// No hooks/providers needed for pure function tests

const makeGame = (overrides: Partial<SteamGame>): SteamGame => ({
  appId: 1,
  name: 'Test Game',
  playtimeForever: 0,
  playtime2weeks: null,
  rtimeLastPlayed: null,
  imgIconUrl: null,
  headerImage: null,
  hltbMain: null,
  hltbExtra: null,
  hltbComplete: null,
  hltbCachedAt: null,
  lastSyncedAt: new Date(),
  ...overrides,
});

describe('filterGames', () => {
  it('returns all games when filter is null', () => {
    const games = [makeGame({ playtimeForever: 0 }), makeGame({ playtimeForever: 100 })];
    expect(filterGames(games, null)).toHaveLength(2);
  });
  // ... etc
});
```

**`FilterSheet.test.tsx` — use Provider + mock store:**
```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { libraryReducer } from '../store/librarySlice';
import { authReducer } from '../../auth/store/authSlice';

const makeStore = (overrides = {}) =>
  configureStore({
    reducer: { library: libraryReducer, auth: authReducer },
    preloadedState: {
      library: { sync_status: 'idle', syncErrorReason: null, activeFilter: null, activeSort: 'alphabetical' },
      auth: { isAuthenticated: true, steamId: '76561198012345678' },
      ...overrides,
    },
  });

it('dispatches setActiveFilter when Unplayed tapped', () => {
  const store = makeStore();
  const { getByTestId } = render(
    <Provider store={store}>
      <FilterSheet isVisible={true} onClose={jest.fn()} />
    </Provider>,
  );
  fireEvent.press(getByTestId('filter-option-unplayed'));
  expect(store.getState().library.activeFilter).toBe('unplayed');
});
```

**For `useLibraryFilters` hook test**, use `renderHook` with `QueryClientProvider` + Redux `Provider` wrapper (same pattern as `useGameLibrary.test.ts`).

### Architecture Compliance Checklist

- ✅ Filter/sort state in Redux (`librarySlice`) — correct for UI/session state (state ownership matrix)
- ✅ `useLibraryFilters` wraps `useGameLibrary` (TanStack Query) — no new query keys added
- ✅ `queryKeys.ts` unchanged — `useGameLibrary` still uses `queryKeys.games.all(steamId)`
- ✅ Filter/sort applied in JS (`useMemo`) — instant update, no loading state
- ✅ Named exports only — `FilterSheet`, `useLibraryFilters`, `filterGames`, `sortGames`, `FilterOption`, `SortOption`
- ✅ Tests co-located with source files
- ✅ No new Redux slices for game data (filter/sort logic is UI state, not server state)
- ✅ `@gorhom/bottom-sheet` used (installed in Story 1.1 per architecture spec)
- ✅ `tokens.ts` used for `style=` props (dynamic active state colors — cannot use NativeWind for runtime-dynamic values)
- ✅ `className=` used for static NativeWind styling where applicable
- ✅ Pill border radius: `9999` (no `borderRadius.full` in tokens — use inline number, same pattern is acceptable)
- ✅ No `@data/*` alias — no imports from `src/data/` needed in this story

### Release Date Sort — Known Gap

Steam's `GetOwnedGames` API response does NOT include a `release_date` field. The `steam_games` schema has no `release_date` column. For Story 3.3, `'release_date'` sort uses `rtimeLastPlayed` (last Steam launch time) as a proxy: games most recently played appear first; games never launched (`rtimeLastPlayed = null`) appear last.

**Why this is acceptable for MVP:**
- Most users' "interesting to play" games have some recent activity signal
- True release-date sort would require a separate Steam Store API call per game (expensive, adds latency)
- The label "Release Date" in the spec is preserved in the UI — if there is a desire to change the label to "Recently Played" to be accurate, that's a product decision outside story scope

**Note in Dev Notes for Story 4.x:** If true release date sort is required, add `releaseDate: integer('release_date')` to `steam_games` schema and populate it via `GetAppDetails` API in the sync engine. This requires a schema migration.

### Previous Story Learnings (from Stories 3-0 → 3-2)

- **`@data/*` alias does NOT exist** — use relative `'../../../data/...'` from feature hooks (not needed in this story, but be aware)
- **`@db` alias exists** — `@db/index`, `@db/schema`, `@db` all work via alias
- **`@res/tokens`** → alias works ✅ (used in `GameCard.tsx` already)
- **`@res/theme` is @deprecated** — do NOT import it; use `tokens.ts` only
- **MMKV v4 API**: `.set(key, value)` / `.getString(key)` / `.remove(key)` — NOT `.setItem`/`.getItem`
- **TanStack Query in tests**: wrap with `QueryClientProvider` + fresh `QueryClient({ defaultOptions: { queries: { retry: false } } })`; use `renderHook` from `@testing-library/react-native`
- **`@shopify/flash-list` v2**: no `estimatedItemSize` prop (removed in v2 — confirmed in Story 3-2 debug log); already removed from `LibraryScreen`
- **`@d11/react-native-fast-image`**: default export — `import FastImage from '@d11/react-native-fast-image'`
- **Named exports only** — `export const X = ...`, never `export default` (except `__mocks__` which may use default for interop)
- **Commit pattern**: `feat(library): <description> (story 3-3)`
- **Test count baseline**: 191 tests pass after Story 3-2

### Git Intelligence (Recent Commits)

```
7457851 fix(ui): fix GameCard image aspect ratio, tab bar color, and token coverage
33ca717 feat(library): local-first list view with GameCard and offline support (story 3-2)
e4d22dc feat(library): Steam library sync engine with delta detection (story 3-1)
```

Patterns established:
- Commit format: `feat(library): <description> (story 3-3)`
- UI fix commits follow feature commits — `fix(ui): ...` is acceptable for follow-up
- All library feature work stays in `src/features/library/`
- Tokens (`@res/tokens`) are used in GameCard — same pattern for FilterSheet/LibraryScreen

### Project Structure Notes

**Files to CREATE:**
- `__mocks__/@gorhom/bottom-sheet.tsx`
- `src/features/library/hooks/useLibraryFilters.ts`
- `src/features/library/hooks/useLibraryFilters.test.ts`
- `src/features/library/components/FilterSheet.tsx`
- `src/features/library/components/FilterSheet.test.tsx`

**Files to MODIFY (content changes):**
- `src/features/library/store/librarySlice.ts` — add `FilterOption`, `SortOption` types; tighten `PayloadAction` types
- `src/features/library/screens/LibraryScreen.tsx` — add toolbar, FilterSheet, swap `useGameLibrary` → `useLibraryFilters`
- `jest.config.js` — add `@gorhom/bottom-sheet` to `moduleNameMapper`

**Files NOT to create or modify:**
- `src/features/library/hooks/useGameLibrary.ts` — read only
- `src/features/library/hooks/useSteamSync.ts` — read only
- `src/features/library/store/librarySlice.test.ts` — no changes needed (existing tests pass with narrowed types)
- `src/shared/queryKeys.ts` — no changes
- `src/shared/constants/index.ts` — no changes
- `src/db/schema.ts` — no migration needed
- `src/navigation/` — no touch
- `src/App.tsx` — no touch

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.3: Library Filter & Sort Controls]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.2 State Ownership Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.3 Project Structure — library/hooks/useLibraryFilters.ts]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.4 TanStack Query Key Factory]
- [Source: src/features/library/store/librarySlice.ts — activeFilter, activeSort, setActiveFilter, setActiveSort]
- [Source: src/features/library/hooks/useGameLibrary.ts — TanStack Query pattern to wrap]
- [Source: src/features/library/screens/LibraryScreen.tsx — current structure to extend]
- [Source: src/res/tokens.ts — all tokens (colors, spacing, borderRadius, fontSize, fontFamily)]
- [Source: jest.config.js — moduleNameMapper, transformIgnorePatterns]
- [Source: _bmad-output/implementation-artifacts/3-2-library-screen-local-first-list-view.md#Dev Notes]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Story creation — 2026-03-09)

### Debug Log References

- TypeScript narrowing side effect: existing tests in `useGameLibrary.test.ts`, `useSteamSync.test.ts`, and `RootNavigator.test.tsx` used `activeSort: 'alphabetical'` as plain string in `preloadedState`. After narrowing `SortOption` to a union type, TS inferred these as `string` rather than the literal — fixed by adding `as const`.
- Pre-existing `GameCard.test.tsx` failure (`numberOfLines` test) is unrelated to this story; `GameCard.tsx` was not modified.

### Completion Notes List

- Implemented `FilterOption` and `SortOption` union types in `librarySlice.ts`, tightening `PayloadAction` generics.
- Created `__mocks__/@gorhom/bottom-sheet.tsx` View-based mock; renders children when `index >= 0`, returns null when `index === -1`. Added `moduleNameMapper` entry to `jest.config.js`.
- Created `useLibraryFilters` hook with exported pure functions `filterGames` and `sortGames` (19 new tests total).
- Created `FilterSheet` component using controlled `index` prop pattern; dispatches to Redux on selection.
- Updated `LibraryScreen`: swapped `useGameLibrary` → `useLibraryFilters`, added toolbar row with dismissible active-filter pill and "Filter / Sort" button, placed `FilterSheet` as last child of SafeAreaView.
- Test count: 191 → 210 (+19). Zero new TypeScript errors. Zero new ESLint errors.

### File List

- `__mocks__/@gorhom/bottom-sheet.tsx` (created)
- `jest.config.js` (modified — added `@gorhom/bottom-sheet` moduleNameMapper entry)
- `src/features/library/store/librarySlice.ts` (modified — added FilterOption, SortOption types; tightened PayloadAction types)
- `src/features/library/hooks/useLibraryFilters.ts` (created)
- `src/features/library/hooks/useLibraryFilters.test.ts` (created)
- `src/features/library/components/FilterSheet.tsx` (created)
- `src/features/library/components/FilterSheet.test.tsx` (created)
- `src/features/library/screens/LibraryScreen.tsx` (modified — toolbar, FilterSheet, hook swap, empty state)
- `src/features/library/hooks/useGameLibrary.test.ts` (modified — `activeSort: 'alphabetical' as const` for type narrowing)
- `src/features/library/hooks/useSteamSync.test.ts` (modified — `activeSort: 'alphabetical' as const` for type narrowing)
- `src/navigation/RootNavigator.test.tsx` (modified — `activeSort: 'alphabetical' as const` for type narrowing)

## Change Log

- 2026-03-09: Implemented story 3-3 — filter/sort types, bottom sheet mock, useLibraryFilters hook, FilterSheet component, LibraryScreen toolbar + pill. 19 new tests added (210 total). TypeScript clean, no new lint errors.
- 2026-03-09: Code review fixes — bottom-sheet mock now fires `onChange(-1)` via `useEffect` when index transitions from ≥0 to -1; `FilterSheet.test.tsx` `onClose` test now asserts `onClose` was called; removed `[key: string]: any` open index signatures from mock props.
- 2026-03-10: Code review fixes (adversarial review) — H1: removed lazy-mount conditional around `FilterSheet`; component is now always rendered so `@gorhom/bottom-sheet` can animate from `index=-1` to `index=0` on open. H2: extracted all static inline style objects from `LibraryScreen.tsx` into a `StyleSheet.create()` block at module level (toolbar, filterPillWrapper, filterPill, pillText, pillX, filterButton, filterButtonText, fadeContainer); the one remaining inline style (`height: height * 0.6`) is dynamic and correctly left inline. M1: updated `ListEmptyComponent` comment to accurately describe the settled-empty-array guard. M2: documented intentional deviation from AC2 spec — `refreshing` uses local `isPullRefreshing` state instead of `syncStatus === 'syncing'` because `syncStatus` fires for all syncs (including background/programmatic on-mount syncs), which would incorrectly light up the pull-to-refresh spinner for operations the user did not initiate; local state restricts the spinner to user-initiated pull-to-refresh only. M3: added inline comment on `games ?? []` to document why the nullish coalescing is a TS requirement despite being logically unreachable.
