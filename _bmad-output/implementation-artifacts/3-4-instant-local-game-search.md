# Story 3.4: Instant Local Game Search

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want to search for a game by title with instant results,
so that I can find a specific game in my library without scrolling through hundreds of entries.

## Acceptance Criteria

**AC1 — Search input on Library screen:**
**Given** the user is on the Library screen
**When** they tap the `SearchBar` and begin typing
**Then** search results are filtered locally against the in-memory game list (no new SQLite query per keystroke)
**And** results update within < 100ms of each keystroke (NFR-PERF-03)
**And** search is case-insensitive and matches partial titles (e.g., "cast" matches "Castlevania")

**AC2 — Search results use GameCard:**
**Given** the search query returns results
**When** the list updates
**Then** matching games are displayed in the same `GameCard` List variant format (identical to the non-search list)
**And** any active filter from Story 3.3 is applied on top of the search results (filter stack: search → activeFilter → activeSort)

**AC3 — No results empty state:**
**Given** the search query returns no results
**When** the list updates
**Then** a clear empty state message is shown: "No games match '{{query}}'"
**And** no error state or spinner is shown
**And** the SearchBar remains active and editable

**AC4 — Clear search restores library:**
**Given** the user clears the search bar (empties the input)
**When** the input is empty
**Then** the full library list is restored with the previously active filter/sort applied (no flash, no loading state)

## Tasks / Subtasks

- [x] Task 1: Create `SearchBar` component (AC: 1, 4)
  - [x] Subtask 1.1: Create `src/features/library/components/SearchBar.tsx` — named export `SearchBar`
    - Props: `value: string; onChangeText: (text: string) => void; placeholder?: string`
    - Uses `TextInput` from React Native with `autoCorrect={false}` and `autoCapitalize="none"`
    - Left search icon (use a `🔍` text or Text component as placeholder — no vector-icons dependency needed)
    - Right clear button (×) shown only when `value.length > 0`; pressing it calls `onChangeText('')`
    - Styled with `tokens.ts`: `surface800` background, `text300` placeholder color, `primary` cursor color, `text100`/`white` input text color (see Dev Notes: SearchBar Design)
    - `testID="search-bar-input"` on the TextInput
    - `testID="search-bar-clear"` on the clear button (only rendered when value non-empty)
  - [x] Subtask 1.2: Create `src/features/library/components/SearchBar.test.tsx`
    - Test: renders TextInput with correct placeholder
    - Test: calls `onChangeText` when text is typed
    - Test: clear button NOT rendered when value is empty
    - Test: clear button rendered when value is non-empty
    - Test: pressing clear button calls `onChangeText('')`

- [x] Task 2: Create search filtering logic in `useLibraryFilters` (AC: 1, 2, 4)
  - [x] Subtask 2.1: Add `searchGames` pure function to `src/features/library/hooks/useLibraryFilters.ts` (named export)
    - Signature: `export const searchGames = (games: SteamGame[], query: string): SteamGame[]`
    - Returns all games if `query.trim()` is empty (no allocation cost for the common case)
    - Filters by case-insensitive substring match on `game.name` using `game.name.toLowerCase().includes(query.toLowerCase())`
    - Pre-lowercase `query` once outside the `.filter()` callback (performance: avoids repeated `.toLowerCase()` per game)
  - [x] Subtask 2.2: Update `useLibraryFilters` hook signature to accept optional `searchQuery: string = ''`
    - Pipeline order: `searchGames` → `filterGames` → `sortGames`
    - Add `searchQuery` to `useMemo` dependency array
    - Return type unchanged (`{ ...rest, data: SteamGame[] | undefined }`)
  - [x] Subtask 2.3: Update `src/features/library/hooks/useLibraryFilters.test.ts`
    - Test `searchGames('')` → returns all games (no-op)
    - Test `searchGames('cast')` → matches "Castlevania", "Castlevania II" but not "Counter-Strike"
    - Test `searchGames('CAST')` → same results (case-insensitive)
    - Test `searchGames('no match at all xyz')` → returns empty array
    - Test `searchGames` with empty games array → returns empty array
    - Test `useLibraryFilters('cast')` → returns only games whose name includes 'cast' (hook integration)
    - Test `useLibraryFilters('')` → returns all games (same behavior as before)
    - Test `useLibraryFilters('cast')` with `activeFilter='unplayed'` → applies both (search AND filter)

- [x] Task 3: Create `useDebounce` shared hook (AC: 1)
  - [x] Subtask 3.1: Create `src/shared/hooks/useDebounce.ts` — named export `useDebounce<T>`
    - Signature: `export const useDebounce = <T>(value: T, delay: number): T`
    - Uses `useState` + `useEffect` with `setTimeout` / `clearTimeout` cleanup
    - Returns the debounced value (updates only after `delay` ms of no new value)
    - See Dev Notes: `useDebounce` Implementation
  - [x] Subtask 3.2: Create `src/shared/hooks/useDebounce.test.ts`
    - Test: returns initial value immediately
    - Test: does NOT update within the delay window (still returns old value)
    - Test: updates after the delay window elapses (use `jest.useFakeTimers` + `act`)
    - Test: cancels pending update if value changes again before delay elapses (debounce resets)

- [x] Task 4: Integrate `SearchBar` into `LibraryScreen` (AC: 1, 2, 3, 4)
  - [x] Subtask 4.1: Add `const [searchQuery, setSearchQuery] = useState('')` local state in `LibraryScreen`
  - [x] Subtask 4.2: Add `const debouncedSearchQuery = useDebounce(searchQuery, 50)` — import from `@shared/hooks/useDebounce`
  - [x] Subtask 4.3: Pass `debouncedSearchQuery` into `useLibraryFilters(debouncedSearchQuery)` — the hook receives the debounced value (batches render cycles); `SearchBar` receives raw `searchQuery` (input stays snappy)
  - [x] Subtask 4.4: Add `<SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search games…" />` above the toolbar `<View>` (between `<OfflineBanner />` and the toolbar)
  - [x] Subtask 4.5: Update `FlashList` `ListEmptyComponent` for search state:
    - Use raw `searchQuery` (not debounced) for the empty-state message — shows current typed text immediately
    - When `searchQuery.trim().length > 0` AND `games?.length === 0` → show `"No games match '{{searchQuery}}'"`
    - When `activeFilter !== null` AND `games?.length === 0` → show existing "No games match the current filter." message
    - When both are active (search + filter) AND `games?.length === 0` → show `"No games match '{{searchQuery}}'"` (search takes priority in message)
    - When `games?.length === 0` and both empty → show existing "Your library is empty..." message
  - [x] Subtask 4.6: No new `StyleSheet.create()` entries needed in `LibraryScreen` — `SearchBar` is self-contained with its own `StyleSheet`
  - [x] Subtask 4.7: Do NOT clear `searchQuery` when filter/sort changes (the user's search should persist across filter changes)

- [x] Task 5: Validate (AC: TypeScript + ESLint + Jest)
  - [x] Subtask 5.1: `npx tsc --noEmit` — zero TypeScript errors
  - [x] Subtask 5.2: `npx eslint src/ --ext .ts,.tsx` — zero new lint errors introduced by this story
  - [x] Subtask 5.3: `npx jest` — 229 tests pass (210 baseline → +19 new); zero regressions

## Dev Notes

### STOP: Read Before Writing Any Code

These files must NOT be modified (read-only, import only):
- `src/features/library/hooks/useGameLibrary.ts` — `useLibraryFilters` wraps it; never touch
- `src/shared/queryKeys.ts` — no new query keys needed (search is in-memory filtering only)
- `src/navigation/RootNavigator.tsx` — no touch
- `src/navigation/types.ts` — no touch
- `src/App.tsx` — no touch
- `src/db/schema.ts` — no schema migration needed; `name` column already exists
- `src/features/library/hooks/useSteamSync.ts` — no changes
- `src/data/mmkv.ts` — no changes
- `src/shared/constants/index.ts` — no changes
- `src/features/library/store/librarySlice.ts` — search is local/transient state, NOT Redux state

### What Already Exists — Read First, Don't Recreate

| File | Current State | Action |
|---|---|---|
| `src/features/library/screens/LibraryScreen.tsx` | Full library screen with filter/sort toolbar, FilterSheet, FlashList, OfflineBanner; uses `useLibraryFilters()` with 0 args; StyleSheet.create() block at module level | EXTEND — add SearchBar above toolbar, pass `searchQuery` to hook, update empty state |
| `src/features/library/hooks/useLibraryFilters.ts` | Exports `filterGames`, `sortGames`, `useLibraryFilters` — pipeline: filterGames → sortGames | EXTEND — add `searchGames` export; update `useLibraryFilters(searchQuery = '')` to apply search first |
| `src/features/library/hooks/useLibraryFilters.test.ts` | 12 tests: 4 for filterGames, 5 for sortGames, 3 for hook | EXTEND — add tests for `searchGames` (5) and updated hook behavior (3+) |
| `src/res/tokens.ts` | Colors, spacing, borderRadius, fontSize, fontFamily | READ ONLY — import for `style=` props |
| `src/shared/hooks/reduxHooks.ts` | Exports `useAppSelector`, `useAppDispatch` | READ ONLY |
| `jest.config.js` | No new external packages needed | NO CHANGES NEEDED |
| `src/features/library/store/librarySlice.ts` | `activeFilter`, `activeSort` — filter is `FilterOption \| null`, sort is `SortOption` | NO CHANGES — search is local state only |

### SearchBar Design (Task 1)

```tsx
// src/features/library/components/SearchBar.tsx
import { useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { tokens } from '@res/tokens';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ value, onChangeText, placeholder = 'Search games…' }: SearchBarProps) => {
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        ref={inputRef}
        testID="search-bar-input"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.text300}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={styles.input}
      />
      {value.length > 0 && (
        <TouchableOpacity
          testID="search-bar-clear"
          onPress={() => {
            onChangeText('');
            inputRef.current?.focus(); // keep keyboard open on clear
          }}
          style={styles.clearButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.clearText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface800,
    borderRadius: tokens.borderRadius.lg,   // or 12 if lg is not defined — check tokens.ts
    marginHorizontal: tokens.spacing.md,
    marginVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm2,
    paddingVertical: tokens.spacing.sm,
    minHeight: 44,                          // accessibility: minimum tap target height
  },
  icon: {
    fontSize: 16,
    marginRight: tokens.spacing.xs,
  },
  input: {
    flex: 1,
    color: tokens.colors.text100,           // use text100 (brightest) or check tokens for white
    fontSize: tokens.fontSize.body,
    fontFamily: tokens.fontFamily.regular,
    paddingVertical: 0,                     // important: prevents extra vertical padding on Android
  },
  clearButton: {
    marginLeft: tokens.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearText: {
    color: tokens.colors.text300,
    fontSize: 20,
    lineHeight: 22,
  },
});
```

**Import paths (from `src/features/library/components/`):**
- `'@res/tokens'` → alias ✅

**IMPORTANT — Verify tokens before coding:**
- Check `src/res/tokens.ts` for the exact key names: `text100` vs `white`, `surface800`, `text300`, `borderRadius.lg` etc.
- `tokens.colors` — confirm all referenced color keys exist
- If `borderRadius.lg` doesn't exist, use `12` inline

### `searchGames` Implementation (Task 2)

```ts
// Add to src/features/library/hooks/useLibraryFilters.ts

export const searchGames = (games: SteamGame[], query: string): SteamGame[] => {
  if (!query.trim()) return games;          // fast-path: no filtering needed
  const lower = query.toLowerCase();        // pre-compute once — not per-game
  return games.filter((g) => g.name.toLowerCase().includes(lower));
};
```

**Updated `useLibraryFilters` hook:**

```ts
export const useLibraryFilters = (searchQuery: string = '') => {
  const activeFilter = useAppSelector((state) => state.library.activeFilter);
  const activeSort = useAppSelector((state) => state.library.activeSort);
  const { data: games, ...rest } = useGameLibrary();

  const data = useMemo(() => {
    if (!games) return undefined;
    const searched = searchGames(games, searchQuery);   // 1. Search
    const filtered = filterGames(searched, activeFilter); // 2. Filter
    return sortGames(filtered, activeSort);              // 3. Sort
  }, [games, searchQuery, activeFilter, activeSort]);

  return { ...rest, data };
};
```

**Pipeline order rationale:**
- Search first (most restrictive, eliminates most items up front → faster filter/sort)
- Filter second (applies status filter on top of search scope)
- Sort last (stable sort on already-narrowed list)

**Key notes:**
- `query.trim()` fast-path avoids `filter` allocation when search bar is empty (common case)
- Pre-computing `query.toLowerCase()` outside `.filter()` callback is a micro-optimization for 500–2000 games
- `searchQuery` default `= ''` means existing call sites in tests (`useLibraryFilters()`) remain valid with no arguments

### `useDebounce` Implementation (Task 3)

```ts
// src/shared/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer); // cancel on next keystroke before delay elapses
  }, [value, delay]);

  return debouncedValue;
};
```

**Test pattern (fake timers):**
```ts
// src/shared/hooks/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from './useDebounce';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('returns initial value immediately', () => {
  const { result } = renderHook(() => useDebounce('hello', 50));
  expect(result.current).toBe('hello');
});

it('does not update before delay elapses', () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 50),
    { initialProps: { value: 'a' } },
  );
  rerender({ value: 'ab' });
  act(() => { jest.advanceTimersByTime(30); }); // 30ms < 50ms delay
  expect(result.current).toBe('a'); // still old value
});

it('updates after delay elapses', () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 50),
    { initialProps: { value: 'a' } },
  );
  rerender({ value: 'ab' });
  act(() => { jest.advanceTimersByTime(50); }); // exactly 50ms
  expect(result.current).toBe('ab');
});

it('resets timer if value changes before delay', () => {
  const { result, rerender } = renderHook(
    ({ value }) => useDebounce(value, 50),
    { initialProps: { value: 'a' } },
  );
  rerender({ value: 'ab' });
  act(() => { jest.advanceTimersByTime(30); }); // 30ms in — not yet triggered
  rerender({ value: 'abc' });                    // new value resets the timer
  act(() => { jest.advanceTimersByTime(30); }); // another 30ms — still < 50ms from last change
  expect(result.current).toBe('a');              // still the original
  act(() => { jest.advanceTimersByTime(20); }); // now 50ms since 'abc'
  expect(result.current).toBe('abc');
});
```

**Import path:** `src/shared/hooks/useDebounce.ts` — accessible as `@shared/hooks/useDebounce` via alias.

### LibraryScreen Integration (Task 4)

**Adding SearchBar + debounce between OfflineBanner and toolbar:**

```tsx
// LibraryScreen.tsx additions
import { useState } from 'react';   // already imported
import { SearchBar } from '../components/SearchBar';         // new import
import { useDebounce } from '@shared/hooks/useDebounce';    // new import

// Inside component:
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearchQuery = useDebounce(searchQuery, 50);

// Hook update — pass DEBOUNCED value to avoid a render per keystroke:
const { data: games, isPending, isPlaceholderData, isFetching } = useLibraryFilters(debouncedSearchQuery);

// JSX structure (SafeAreaView children order):
<SafeAreaView className="flex-1 bg-surface-900" edges={['top']}>
  <OfflineBanner />
  {/* SearchBar receives RAW value — input stays snappy; filtering uses debounced value */}
  <SearchBar
    value={searchQuery}
    onChangeText={setSearchQuery}
    placeholder="Search games…"
  />
  {/* toolbar row (filter pill + filter button) */}
  <View style={styles.toolbar}>...</View>
  {/* list or skeleton */}
  {showSkeleton ? <LibraryListSkeleton /> : <FlashList ... />}
  {/* bottom sheet LAST */}
  <FilterSheet ... />
</SafeAreaView>
```

**Key split — raw vs debounced:**
- `SearchBar value={searchQuery}` — raw value: TextInput stays in sync with every keystroke (no lag in the input itself)
- `useLibraryFilters(debouncedSearchQuery)` — debounced value: the expensive `useMemo` recomputation and FlashList re-render only fires 50ms after the user stops typing
- Empty-state message uses raw `searchQuery` so it reflects what the user actually typed

**Updated `ListEmptyComponent`:**

```tsx
const renderEmpty = () => {
  if (syncStatus === 'syncing') return null; // list populating — don't show empty state

  // Use raw searchQuery for message (reflects what's currently typed)
  if (searchQuery.trim().length > 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{`No games match '${searchQuery}'`}</Text>
      </View>
    );
  }
  if (activeFilter !== null) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No games match the current filter.</Text>
      </View>
    );
  }
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        Your library is empty. Sync your Steam library to get started.
      </Text>
    </View>
  );
};
```

### Testing Strategy

**`SearchBar.test.tsx` — simple component tests:**
```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('renders TextInput with placeholder', () => {
    const { getByTestId } = render(
      <SearchBar value="" onChangeText={jest.fn()} placeholder="Search…" />,
    );
    expect(getByTestId('search-bar-input').props.placeholder).toBe('Search…');
  });

  it('does not render clear button when value is empty', () => {
    const { queryByTestId } = render(
      <SearchBar value="" onChangeText={jest.fn()} />,
    );
    expect(queryByTestId('search-bar-clear')).toBeNull();
  });

  it('renders clear button when value is non-empty', () => {
    const { getByTestId } = render(
      <SearchBar value="cas" onChangeText={jest.fn()} />,
    );
    expect(getByTestId('search-bar-clear')).toBeTruthy();
  });

  it('calls onChangeText with empty string when clear button pressed', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <SearchBar value="cas" onChangeText={onChangeText} />,
    );
    fireEvent.press(getByTestId('search-bar-clear'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('calls onChangeText when text typed', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <SearchBar value="" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(getByTestId('search-bar-input'), 'cast');
    expect(onChangeText).toHaveBeenCalledWith('cast');
  });
});
```

**`useLibraryFilters.test.ts` — new `searchGames` tests (add to existing file):**
```ts
import { filterGames, sortGames, searchGames } from './useLibraryFilters';

// Reuse the makeGame helper already defined in the file

describe('searchGames', () => {
  it('returns all games when query is empty', () => {
    const games = [makeGame({ name: 'Castlevania' }), makeGame({ name: 'Counter-Strike' })];
    expect(searchGames(games, '')).toHaveLength(2);
  });

  it('returns all games when query is whitespace only', () => {
    const games = [makeGame({ name: 'Castlevania' })];
    expect(searchGames(games, '   ')).toHaveLength(1);
  });

  it('matches partial title (case-insensitive)', () => {
    const games = [
      makeGame({ name: 'Castlevania', appId: 1 }),
      makeGame({ name: 'Counter-Strike', appId: 2 }),
    ];
    expect(searchGames(games, 'cast')).toHaveLength(1);
    expect(searchGames(games, 'cast')[0].name).toBe('Castlevania');
  });

  it('is case-insensitive', () => {
    const games = [makeGame({ name: 'Castlevania' })];
    expect(searchGames(games, 'CAST')).toHaveLength(1);
    expect(searchGames(games, 'CaStLeVaNiA')).toHaveLength(1);
  });

  it('returns empty array when no matches', () => {
    const games = [makeGame({ name: 'Castlevania' })];
    expect(searchGames(games, 'zzznomatch')).toHaveLength(0);
  });

  it('handles empty game list', () => {
    expect(searchGames([], 'cast')).toHaveLength(0);
  });
});

// Add to hook integration describe block:
describe('useLibraryFilters (with search)', () => {
  it('returns only matching games when searchQuery is provided', async () => {
    mockUseQuery.mockReturnValue({
      data: [
        makeGame({ name: 'Castlevania', appId: 1 }),
        makeGame({ name: 'Counter-Strike', appId: 2 }),
      ],
      isPending: false,
      // ... other fields
    });

    const { result } = renderHook(() => useLibraryFilters('cast'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0].name).toBe('Castlevania');
  });

  it('returns all games when searchQuery is empty', async () => {
    // ... same mock setup, useLibraryFilters('') returns full list
  });

  it('applies both search and active filter', async () => {
    // Setup store with activeFilter='unplayed', searchQuery='cast'
    // Only unplayed games matching 'cast' should appear
  });
});
```

**For the hook integration tests**, use the same `createWrapper()` factory with `QueryClientProvider` + Redux `Provider` already in the test file. The `searchQuery` arg is passed directly to `renderHook(() => useLibraryFilters('cast'), { wrapper })`.

### Architecture Compliance Checklist

- ✅ Search state is local component state (`useState`) — correct for transient UI state (state ownership matrix)
- ✅ 50ms debounce via `useDebounce` — batches render cycles; input still receives raw value (stays snappy)
- ✅ Search filtering in-memory (no new SQLite query per keystroke) — meets NFR-PERF-03 < 100ms
- ✅ `queryKeys.ts` unchanged — no new query keys; still uses `queryKeys.games.all(steamId)` via `useGameLibrary`
- ✅ `searchGames` is a pure exported function — easy to unit test without hooks
- ✅ `useMemo` dependency array updated with `searchQuery` — no stale closures
- ✅ `useLibraryFilters` default arg `= ''` — backward compatible; all existing tests pass without modification (no args = '' = no filtering)
- ✅ `useDebounce` placed in `src/shared/hooks/` — general-purpose utility, not library-feature-specific
- ✅ Named exports only — `SearchBar`, `searchGames`, `useLibraryFilters`, `useDebounce`
- ✅ Tests co-located with source files
- ✅ No new Redux slices (search is transient UI state)
- ✅ No new `queryKeys` entries (purely in-memory operation)
- ✅ No jest.config.js changes needed (no new native packages)
- ✅ `tokens.ts` used for `style=` props (all SearchBar styles use tokens)
- ✅ NativeWind `className=` used on SafeAreaView in LibraryScreen (no change to existing pattern)
- ✅ `useRef<TextInput>` used in SearchBar to keep keyboard open on clear (UX best practice)

### Performance Analysis — NFR-PERF-03 (< 100ms per keystroke)

The in-memory `searchGames` approach easily meets this requirement:
- 2000 games × `toLowerCase().includes()` ≈ 1–2ms on modern hardware (well within 100ms budget)
- `useMemo` prevents redundant recomputation between renders
- `query.trim()` fast-path returns original array reference on empty query (zero allocation)
- 50ms debounce batches rapid keystrokes into a single render cycle

**Why debounce at 50ms:**
- `useGameLibrary` performs a real async `db.select()` on first load — the result is then cached by TanStack Query in memory, but every `useMemo` recomputation still schedules React reconciliation + `FlashList` re-render
- Without debounce, typing "castle" fires 6 separate `useMemo` + FlashList re-renders in quick succession; with 50ms debounce, only the final stabilised value triggers one re-render
- 50ms is imperceptible to users (well under the 100ms NFR threshold) but eliminates the redundant intermediate renders
- The `SearchBar` input itself receives the raw (non-debounced) value so the cursor and text stay perfectly responsive — users never feel the debounce

### Previous Story Learnings (from Stories 3-0 → 3-3)

- **`@data/*` alias does NOT exist** — use relative `'../../../data/...'` paths if needed (not needed in this story)
- **`@db` alias exists** — `@db/index`, `@db/schema`, `@db` all work ✅
- **`@res/tokens`** → alias works ✅
- **`@res/theme` is @deprecated** — do NOT import; use `tokens.ts` only
- **MMKV v4 API**: `.set(key, value)` / `.getString(key)` / `.remove(key)` — NOT `.setItem`/`.getItem`
- **TanStack Query in tests**: wrap with `QueryClientProvider` + fresh `QueryClient({ defaultOptions: { queries: { retry: false } } })`; use `renderHook` from `@testing-library/react-native`
- **`@shopify/flash-list` v2**: no `estimatedItemSize` prop (removed in v2)
- **`@d11/react-native-fast-image`**: default export — `import FastImage from '@d11/react-native-fast-image'`
- **Named exports only** — `export const X = ...`, never `export default` (except `__mocks__`)
- **StyleSheet.create()** — extract all static styles to module-level `StyleSheet.create()` (established in 3-3 review); only truly dynamic styles (computed from layout, runtime state) left inline
- **Bottom sheet notes** — `@gorhom/bottom-sheet` at `index=-1` reserves layout space — but this story doesn't add a new sheet, just a search bar
- **Test count baseline**: 210 tests pass after Story 3-3

### Git Intelligence (Recent Commits)

```
47b2279 fix(library): add 3-line title truncation to GameCard; add NativeWind styling guide
5152fec fix(library): code review fixes for LibraryScreen and useSteamSync (story 3-3)
1fc8962 fix(library): fix empty-state flash, polish auth UX, add filter/sort (story 3-3)
7457851 fix(ui): fix GameCard image aspect ratio, tab bar color, and token coverage
33ca717 feat(library): local-first list view with GameCard and offline support (story 3-2)
```

Patterns established:
- Commit format: `feat(library): <description> (story 3-4)`
- All library feature work stays in `src/features/library/`
- Tokens (`@res/tokens`) are used in all library components — same pattern for SearchBar

### Project Structure Notes

**Files to CREATE:**
- `src/shared/hooks/useDebounce.ts`
- `src/shared/hooks/useDebounce.test.ts`
- `src/features/library/components/SearchBar.tsx`
- `src/features/library/components/SearchBar.test.tsx`

**Files to MODIFY (content changes):**
- `src/features/library/hooks/useLibraryFilters.ts` — add `searchGames` export; update `useLibraryFilters` signature and pipeline
- `src/features/library/hooks/useLibraryFilters.test.ts` — add ~8 new tests for `searchGames` + hook integration
- `src/features/library/screens/LibraryScreen.tsx` — add SearchBar + debounce, `searchQuery` state, pass debounced value to hook, update empty state

**Files NOT to create or modify:**
- `src/features/library/hooks/useGameLibrary.ts` — read only
- `src/features/library/hooks/useSteamSync.ts` — read only
- `src/features/library/store/librarySlice.ts` — NO changes (search is local state, not Redux)
- `src/features/library/store/librarySlice.test.ts` — no changes
- `src/shared/queryKeys.ts` — no changes
- `src/shared/constants/index.ts` — no changes
- `src/db/schema.ts` — no migration needed
- `jest.config.js` — no changes (no new native packages)
- `src/navigation/` — no touch
- `src/App.tsx` — no touch

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4: Instant Local Game Search]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR-PERF-03] — < 100ms search results
- [Source: _bmad-output/planning-artifacts/architecture.md#3.1 Data Architecture] — Local-first, in-memory filtering
- [Source: src/features/library/hooks/useLibraryFilters.ts] — pipeline to extend with searchGames
- [Source: src/features/library/screens/LibraryScreen.tsx] — current structure to extend
- [Source: src/res/tokens.ts] — all tokens (colors, spacing, borderRadius, fontSize, fontFamily)
- [Source: _bmad-output/implementation-artifacts/3-3-library-filter-and-sort-controls.md#Dev Notes] — StyleSheet.create() pattern, bottom sheet notes, test patterns

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Story creation — 2026-03-10)
claude-sonnet-4-6 (Implementation — 2026-03-10)

### Debug Log References

- TS error in `useDebounce.test.ts`: `renderHook` callback needed explicit `{ value: string }` prop type annotation due to strict `props: unknown` typing in `@testing-library/react-native`. Fixed by annotating the destructured parameter.

### Completion Notes List

- Created `SearchBar` component with `useRef<TextInput>` for focus-on-clear UX; all styles use `tokens.ts`; conditional clear button renders only when `value.length > 0`.
- Added `searchGames` as a named export pure function to `useLibraryFilters.ts`; pre-computes `query.toLowerCase()` once outside the filter callback for performance. Fast-path returns original array reference on empty/whitespace query.
- Updated `useLibraryFilters` to accept optional `searchQuery: string = ''`; pipeline order: search → filter → sort. Backward compatible — existing call sites with no args continue to work.
- Created generic `useDebounce<T>` hook in `src/shared/hooks/`; uses `useState` + `useEffect` with `clearTimeout` cleanup.
- Integrated into `LibraryScreen`: raw `searchQuery` fed to `SearchBar` (snappy input), debounced value fed to `useLibraryFilters` (batched re-renders), raw value used for empty-state message copy.
- Empty-state priority: search message > filter message > empty library message. Also added `syncStatus !== 'syncing'` guard to match existing skeleton logic.
- Test count: 210 → 229 (+19 new tests across 4 files). Zero regressions. Zero TS errors. Zero ESLint errors.
- ✅ Code review fixes (2026-03-10): Fixed showSkeleton race condition (skeleton no longer flashes during background refetch when search returns 0 results); added default-placeholder test to SearchBar; added delay-change test to useDebounce; added comment documenting intentional search-persist-on-refresh behaviour. Final test count: 231.

### File List

- src/features/library/components/SearchBar.tsx (created)
- src/features/library/components/SearchBar.test.tsx (created)
- src/shared/hooks/useDebounce.ts (created)
- src/shared/hooks/useDebounce.test.ts (created)
- src/features/library/hooks/useLibraryFilters.ts (modified)
- src/features/library/hooks/useLibraryFilters.test.ts (modified)
- src/features/library/screens/LibraryScreen.tsx (modified)
- _bmad-output/implementation-artifacts/3-4-instant-local-game-search.md (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Senior Developer Review (AI)

**Review Date:** 2026-03-10
**Outcome:** Changes Requested → Fixed

### Action Items

- [x] [High] `showSkeleton` race: `isFetching && games.length === 0` would flash skeleton when search returns 0 results during background refetch — fixed by adding `&& searchQuery === ''` guard [LibraryScreen.tsx:104]
- [x] [Med] Missing default-placeholder test in `SearchBar.test.tsx` — no test verified the default `'Search games…'` prop value [SearchBar.test.tsx]
- [x] [Med] `useDebounce` dep array includes `delay` but no test covered delay-change timer-reset behaviour [useDebounce.test.ts]
- [x] [Med] No comment explaining why `searchQuery` is intentionally not cleared on pull-to-refresh [LibraryScreen.tsx:162]

## Change Log

| Date | Change |
|---|---|
| 2026-03-10 | Implemented Story 3.4: created SearchBar component, useDebounce hook, searchGames pure function; extended useLibraryFilters with search pipeline; integrated into LibraryScreen with raw/debounced split pattern; 19 new tests added (210→229 total) |
| 2026-03-10 | Code review fixes: showSkeleton skeleton-flash bug, 2 new tests (default placeholder + delay change), search-persist-on-refresh comment; final count 231 tests |
