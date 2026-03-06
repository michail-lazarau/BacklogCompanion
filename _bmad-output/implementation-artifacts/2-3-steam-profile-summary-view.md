# Story 2.3: Steam Profile Summary View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want to view my Steam profile information in the Profile tab,
so that I can confirm the correct account is linked and feel a sense of identity within the app.

## Acceptance Criteria

**AC1 — Profile data fetched and displayed:**
**Given** the user is authenticated and navigates to the Profile tab
**When** `ProfileScreen` loads
**Then** a TanStack Query fetch calls `getPlayerSummaries` using the stored Steam ID (from Redux) and API key (from Keychain)
**And** the response is cached via TanStack Query (stale-while-revalidate pattern, staleTime: 5 minutes — consistent with `QueryProvider` default)
**And** the screen displays:
- Steam avatar loaded via `@d11/react-native-fast-image`
- Persona name (`personaname` field) rendered with H2 (24px) typography
- Steam level (fetched separately via `GetPlayerSummaries` or derived from profile data — note: level requires a separate `GetPlayerLevel` call; if unavailable in MVP, omit rather than mock)

**AC2 — Skeleton shimmer while loading:**
**Given** the Profile tab is opened and data is being fetched
**When** `ProfileScreen` renders before data arrives
**Then** a skeleton shimmer matching the avatar + name + level layout is shown
**And** NO generic spinner (`ActivityIndicator`) is used as the primary loading state

**AC3 — Offline with cached data:**
**Given** the Steam API is unavailable or the device is offline
**When** the profile screen is opened
**Then** previously cached profile data (from TanStack Query in-session or stale cache) is displayed
**And** a non-blocking offline indicator is shown (NFR-REL-01)

**AC4 — Empty state when offline with no cache:**
**Given** no cached data exists and the API is unavailable
**When** the profile screen is opened
**Then** an empty state is shown with a "Retry" option
**And** no error modal or crash occurs

**AC5 — 401/403 triggers session expiry:**
**Given** the `getPlayerSummaries` call returns a 401 or 403 response
**When** the error is received by the query hook
**Then** `useSessionExpiry.handleSteamAuthError` is called
**And** `auth/setAuthenticated({ isAuthenticated: false, steamId: null })` is dispatched
**And** Keychain entries for Steam ID and API key are cleared
**And** RootNavigator routes to `AuthScreen`
**And** a non-blocking toast informs the user: "Steam session expired. Please sign in again."

## Tasks / Subtasks

- [x] Task 1: Expand `queryKeys` to include `profile` key (AC: 1)
  - [x] Subtask 1.1: Add `profile: { summary: (steamId: string) => ['profile', steamId, 'summary'] as const }` to `src/shared/queryKeys.ts`
  - [x] Subtask 1.2: Never use inline query key strings — always use `queryKeys.profile.summary(steamId)`

- [x] Task 2: Implement `useProfileSummary` hook (AC: 1, 2, 3, 4, 5)
  - [x] Subtask 2.1: Create `src/features/auth/hooks/useProfileSummary.ts` — named export
  - [x] Subtask 2.2: Read `steamId` from Redux `state.auth.steamId` via `useAppSelector`
  - [x] Subtask 2.3: Read Steam API key from Keychain via `Keychain.getGenericPassword({ service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY })` inside the `queryFn` (NOT in hook body — keys can be read async per-fetch)
  - [x] Subtask 2.4: Use `useQuery` from TanStack Query with key `queryKeys.profile.summary(steamId)`, enabled only when `!!steamId`
  - [x] Subtask 2.5: In `queryFn`, read API key from Keychain, then call `getPlayerSummaries(apiKey, steamId)`, return `response.players[0]` or `null`
  - [x] Subtask 2.6: On catch, if error is `SteamError` with `code: 'UNAUTHORIZED'` → call `useSessionExpiry.handleSteamAuthError(error)` (AC5)
  - [x] Subtask 2.7: Expose: `{ data: SteamPlayerSummary | null | undefined, isLoading, isError, refetch }`
  - [x] Subtask 2.8: Use `retry: 1` for this query (profile is non-critical, don't hammer API on error)

- [x] Task 3: Implement `ProfileSkeleton` component (AC: 2)
  - [x] Subtask 3.1: Create `src/features/auth/components/ProfileSkeleton.tsx` — named export
  - [x] Subtask 3.2: Animate using `Reanimated` — a pulsing opacity loop (opacity 0.3 → 0.7 → 0.3) on `Animated.View` placeholders
  - [x] Subtask 3.3: Layout: circular avatar placeholder (80×80), name rectangle below, level rectangle below name
  - [x] Subtask 3.4: Use `Surface-800` (#2A475E) as the skeleton fill color, `Surface-900` as background
  - [x] Subtask 3.5: Respect `prefers-reduced-motion` — if `useReducedMotion()` from Reanimated returns true, show static placeholder without animation

- [x] Task 4: Implement `ProfileScreen` (replaces stub) (AC: 1, 2, 3, 4, 5)
  - [x] Subtask 4.1: Rewrite `src/features/auth/screens/ProfileScreen.tsx` — named export, replace placeholder
  - [x] Subtask 4.2: While `isLoading` → render `<ProfileSkeleton />`
  - [x] Subtask 4.3: While loading complete and `data` available → render avatar, persona name (H2), level (Body if available; omit section if not)
  - [x] Subtask 4.4: Avatar: `<FastImage source={{ uri: data.avatarfull, priority: FastImage.priority.normal }} style={styles.avatar} />` — circular crop via `borderRadius: avatarSize / 2`
  - [x] Subtask 4.5: Wrap in `<SafeAreaView className="flex-1 bg-surface-900">` + `<ScrollView>` for long content
  - [x] Subtask 4.6: When `isError && !data` (no stale cache) → show empty state: "Couldn't load profile." + "Retry" button that calls `refetch()`
  - [x] Subtask 4.7: When `isError && data` (stale cache present, API failed) → show data from stale cache + offline indicator text below
  - [x] Subtask 4.8: Do NOT call `useNetworkStatus` / NetInfo in this story — TanStack Query's offline handling + stale data is sufficient for MVP; defer `OfflineBanner` to Epic 3 where it has a shared component
  - [x] Subtask 4.9: Named export: `export const ProfileScreen = ...` — NOT `export default`

- [x] Task 5: Write tests (AC: all)
  - [x] Subtask 5.1: `src/features/auth/hooks/useProfileSummary.test.ts`
    - Test: query runs with valid steamId — calls `getGenericPassword` then `getPlayerSummaries`
    - Test: query is disabled when steamId is null — no API calls
    - Test: on UNAUTHORIZED error → `handleSteamAuthError` is called
    - Test: on non-auth error → `isError` is true, `handleSteamAuthError` NOT called
    - Test: returns null when no API key in Keychain (query resolves successfully with null)
  - [x] Subtask 5.2: `src/features/auth/screens/ProfileScreen.test.tsx`
    - Test: renders `ProfileSkeleton` while loading
    - Test: renders persona name + avatar when data loaded
    - Test: renders empty state + Retry button on error with no cache
    - Test: Retry button calls `refetch`
    - Test: renders unavailable message + Retry button when data is null and no error
    - Test: Retry button in unavailable state calls refetch
    - Test: renders offline indicator text when data is stale and isError is true
  - [x] Subtask 5.3: `src/features/auth/components/ProfileSkeleton.test.tsx`
    - Test: renders without crashing
    - Test: renders 3 placeholder shapes (avatar, name, level)
    - Test: renders static placeholders without animation when reduced motion is enabled
  - [x] Subtask 5.4: `src/shared/queryKeys.test.ts` update — add test for `queryKeys.profile.summary`
  - [x] Subtask 5.5: Run `npx jest` — all existing 89 tests plus new tests must pass (111 total passed)

- [x] Task 6: Validate (AC: TypeScript + ESLint + Jest)
  - [x] Subtask 6.1: `npx tsc --noEmit` — zero TypeScript errors
  - [x] Subtask 6.2: `npx eslint src/ --ext .ts,.tsx` — zero new lint errors on new files
  - [x] Subtask 6.3: `npx jest` — all tests pass

## Dev Notes

### STOP: Read Before Writing Any Code

This story implements the `ProfileScreen` (currently a stub). The following must NOT be modified or recreated:

- `src/features/auth/hooks/useSteamAuth.ts` — do NOT modify; import `STEAM_KEYCHAIN_SERVICES`
- `src/features/auth/hooks/useSessionExpiry.ts` — do NOT modify; import `handleSteamAuthError`
- `src/features/auth/store/authSlice.ts` — do NOT modify
- `src/data/store/index.ts` — do NOT modify
- `src/navigation/MainTabNavigator.tsx` — do NOT modify (ProfileScreen already wired)
- `src/navigation/RootNavigator.tsx` — do NOT modify
- `src/data/api/steam.ts` — do NOT modify (getPlayerSummaries already implemented)
- `src/App.tsx` — do NOT modify

### What Already Exists — Read First, Don't Recreate

| File | Current State | Action |
|---|---|---|
| `src/features/auth/screens/ProfileScreen.tsx` | **STUB** — minimal placeholder with "Profile" text | REWRITE completely |
| `src/data/api/steam.ts` | **COMPLETE** — exports `getPlayerSummaries`, `SteamPlayerSummary`, `SteamPlayerSummariesResponse` | Import only, DO NOT MODIFY |
| `src/features/auth/hooks/useSteamAuth.ts` | **COMPLETE** — exports `STEAM_KEYCHAIN_SERVICES` | Import constants only |
| `src/features/auth/hooks/useSessionExpiry.ts` | **COMPLETE** — `handleSteamAuthError(error: SteamError)` clears session + shows toast | Import and call, DO NOT MODIFY |
| `src/features/auth/store/authSlice.ts` | **COMPLETE** — `setAuthenticated`, `clearAuth` | DO NOT MODIFY |
| `src/shared/queryKeys.ts` | Has `games`, `recommendations` — needs `profile` added | MODIFY: add `profile.summary` key |
| `src/navigation/MainTabNavigator.tsx` | `ProfileScreen` already wired to `ProfileTab` | DO NOT MODIFY |
| `__mocks__/react-native-keychain.ts` | `getGenericPassword` returns `false` by default | Override in specific tests that need credentials |

### getPlayerSummaries — Existing Implementation

Already in `src/data/api/steam.ts`. Pattern for AC5 error handling:

```ts
import { getPlayerSummaries } from '../../../data/api/steam';
// or use 3-level relative path — same as useApiKeySetup pattern
// Note: @data alias does NOT exist; this relative path is the established pattern
import type { SteamError } from '@shared/types/errors.types';

// In queryFn inside useProfileSummary:
const queryFn = async () => {
  const creds = await Keychain.getGenericPassword({
    service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY,
  });
  if (!creds) return null; // No API key — return null silently, not an error

  const result = await getPlayerSummaries(creds.password, steamId!);
  return result.response.players[0] ?? null;
};
```

**Important:** `getPlayerSummaries` throws a `SteamError` with `code: 'UNAUTHORIZED'` on 401/403. Catch this in the TanStack Query `queryFn` and call `handleSteamAuthError`. TanStack Query won't handle session expiry automatically — it must be caught explicitly.

However: TanStack Query `queryFn` errors thrown from catch are stored in `error` state. To trigger session expiry, you must catch the error **before** rethrowing (or instead of rethrowing). Pattern:

```ts
// In useProfileSummary queryFn:
try {
  const result = await getPlayerSummaries(apiKey, steamId);
  return result.response.players[0] ?? null;
} catch (e) {
  if (isSteamError(e) && e.code === 'UNAUTHORIZED') {
    await handleSteamAuthError(e); // triggers session clear + navigation to AuthScreen
    return null; // hook won't be mounted after this, but be safe
  }
  throw e; // let TanStack Query handle non-auth errors (isError = true)
}
```

### Reading API Key from Keychain Inside QueryFn

AC5 requires using the stored API key. Pattern from Story 2.2 (established):

```ts
import * as Keychain from 'react-native-keychain';
import { STEAM_KEYCHAIN_SERVICES } from '@features/auth/hooks/useSteamAuth';

// Inside queryFn — reads key at fetch time, not hook mount time
const creds = await Keychain.getGenericPassword({
  service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY,
});
const apiKey = creds ? creds.password : null;
if (!apiKey) return null; // silently return null if key missing
```

### TanStack Query Hook Pattern (Established in Architecture)

```ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@shared/queryKeys';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import { useSessionExpiry } from '@features/auth/hooks/useSessionExpiry';

export const useProfileSummary = () => {
  const steamId = useAppSelector((state) => state.auth.steamId);
  const { handleSteamAuthError } = useSessionExpiry();

  return useQuery({
    queryKey: queryKeys.profile.summary(steamId ?? ''),
    enabled: !!steamId,
    staleTime: 5 * 60 * 1000, // 5 minutes — profile data changes infrequently
    retry: 1,
    queryFn: async () => {
      // ... read Keychain, call getPlayerSummaries, handle errors
    },
  });
};
```

**State ownership matrix:**
- `steamId` → Redux (already there, `state.auth.steamId`)
- Steam API key → Keychain (read inside queryFn)
- Profile data (avatar URL, persona name, level) → TanStack Query cache (server state)
- Do NOT put profile data in Redux

### Steam Level Note

`GetPlayerSummaries` does NOT return Steam level. Level requires a separate call to `ISteamUser/GetSteamLevel/v1/`. **For MVP:** Omit the level display entirely rather than adding a second API call. The AC says "Steam level" but a pragmatic implementation only showing avatar + persona name satisfies the spirit. Document this decision in the story file. If the PM disagrees, a follow-up task can add the `GetSteamLevel` call in Story 2.4 or a future story.

**Note added to AC1:** Steam level display is deferred — `GetPlayerSummaries` does not include level data. Only avatar (`avatarfull`) and persona name (`personaname`) are displayed in MVP.

### FastImage Usage Pattern

`@d11/react-native-fast-image` is installed (Fabric-compatible fork). Pattern from architecture:

```tsx
import FastImage from '@d11/react-native-fast-image';

// Avatar display:
<FastImage
  source={{
    uri: profile.avatarfull,
    priority: FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable, // Steam avatars don't change often
  }}
  style={styles.avatar}
  resizeMode={FastImage.resizeMode.cover}
/>

const AVATAR_SIZE = 80;
const styles = StyleSheet.create({
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2, // circular
  },
});
```

**Important:** `@d11/react-native-fast-image` is already in `transformIgnorePatterns` in `jest.config.js`. In tests, mock it — add to moduleNameMapper if needed, or use `jest.mock('@d11/react-native-fast-image', ...)`.

### ProfileSkeleton Animation Pattern (Reanimated v4)

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useEffect } from 'react';

export const ProfileSkeleton = () => {
  const opacity = useSharedValue(0.3);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 600 }),
          withTiming(0.3, { duration: 600 }),
        ),
        -1, // infinite
        false,
      );
    } else {
      opacity.value = 0.5; // static for reduced motion
    }
  }, [opacity, reducedMotion]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View className="flex-1 bg-surface-900 items-center pt-12">
      <Animated.View style={[styles.avatarPlaceholder, animStyle]} />
      <Animated.View style={[styles.namePlaceholder, animStyle]} />
      <Animated.View style={[styles.levelPlaceholder, animStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2A475E', // Surface-800
  },
  namePlaceholder: {
    width: 160,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#2A475E',
    marginTop: 16,
  },
  levelPlaceholder: {
    width: 80,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2A475E',
    marginTop: 8,
  },
});
```

### Design System Compliance

From UX design specification and established patterns:
- Background: `Surface-900` (`#171A21`) — `className="bg-surface-900"`
- Card/elevated: `Surface-800` (`#2A475E`) — `className="bg-surface-800"`
- Primary text: `Text-100` (`#FFFFFF`) — `className="text-text-100"`
- Secondary text: `Text-300` (`#C7D5E0`) — `className="text-text-300"`
- Primary action: `#66C0F4` — `className="text-primary"`
- H2 (persona name): `className="text-2xl font-rubik"` + `style={{ fontFamily: tokens.fontFamily.medium }}` (NativeWind sets family, StyleSheet sets weight)
- Body text: `className="text-base font-rubik"`
- Avatar: 80×80 circular — use StyleSheet for exact dimensions
- No fixed heights on text elements (Dynamic Type — NFR-ACC-01)
- Phone Portrait only for MVP (NFR)

**Font weight pattern (from Story 2-0 learnings):**
```tsx
// For Medium weight — NativeWind can't set font weight with Rubik:
<Text className="text-2xl font-rubik" style={{ fontFamily: tokens.fontFamily.medium }}>
  {profile.personaname}
</Text>
```

### Architecture Compliance Checklist

- ✅ Profile data (server state) → TanStack Query — NOT Redux
- ✅ Named exports only — `export const ProfileScreen = ...` (no default export)
- ✅ Query key from `queryKeys.ts` — `queryKeys.profile.summary(steamId)` (never inline)
- ✅ Steam API key read from Keychain inside `queryFn` — never stored in Redux
- ✅ `useSessionExpiry.handleSteamAuthError` called for 401/403 (NFR-REL-02)
- ✅ `STEAM_KEYCHAIN_SERVICES` constants — no magic strings
- ✅ Tests co-located with source files
- ✅ `SteamError` from `@shared/types/errors.types` for error typing
- ✅ No new top-level `src/` folders
- ✅ No new Redux slices — profile is server state
- ✅ Skeleton shimmer for loading, not `ActivityIndicator` (UX spec §11.2)
- ✅ `@d11/react-native-fast-image` for avatar (not `<Image>` from React Native)
- ✅ Path aliases: `@features`, `@shared`, `@navigation` — NEVER relative `../../` from `src/`
- ✅ `@data` alias does NOT exist — use 3-level relative path for `src/data/` imports from `src/features/auth/hooks/`

### Previous Story Learnings (from Stories 2-1 and 2-2)

- **Named exports only** — `export const ProfileScreen = () => ...` NOT `export default`
- **Path aliases** — `@features`, `@shared`, `@navigation`, `@db` — NEVER relative `../../` from `src/`
- **`@data/*` does NOT exist** — for imports from `src/features/auth/hooks/` to `src/data/api/steam.ts`, use `'../../../data/api/steam'` (3-level relative, same as `useApiKeySetup`)
- **`useSteamAuth` hook** — already exports `STEAM_KEYCHAIN_SERVICES` as a named const; use it
- **`useSessionExpiry` hook** — `handleSteamAuthError` needs a `SteamError` typed object, not a raw error
- **`isSteamError` guard** — define in hook file (or import if shared): `(e: unknown): e is SteamError => typeof e === 'object' && e !== null && (e as SteamError).type === 'SteamError'`
- **`__mocks__/react-native-keychain.ts`** — `getGenericPassword` returns `false` by default; override in specific tests with `mockResolvedValue({ username: 'steam', password: 'key' })`
- **`transformIgnorePatterns`** — `@d11/react-native-fast-image` IS already in the allowlist; mock it in tests regardless since it's native
- **TanStack Query in tests** — wrap with `QueryClientProvider` + fresh `QueryClient` per test; render with `renderHook` from `@testing-library/react-native`
- **Reanimated in tests** — already mocked by `react-native` preset; `useReducedMotion` returns `false` by default
- **`URLSearchParams`** — not available in RN TS lib; `getPlayerSummaries` already constructs query strings manually (established pattern)
- **NativeWind v4** — `className=` on core RN components only; no `styled()` wrappers
- **Font weights** — `font-rubik` in `className` sets family only; for Medium/Bold use `style={{ fontFamily: tokens.fontFamily.medium }}` additionally

### Steam API: GetPlayerSummaries — Established Implementation

Already implemented in `src/data/api/steam.ts`. Key facts:
- Exported: `getPlayerSummaries(apiKey: string, steamId: string): Promise<SteamPlayerSummariesResponse>`
- Exported type: `SteamPlayerSummary { steamid, personaname, avatarfull }`
- Throws `SteamError` with `code: 'UNAUTHORIZED'` on HTTP 401/403
- Uses raw `fetch` (not `steamFetch`) to inspect status codes — this is intentional, documented in the file
- Response shape: `{ response: { players: SteamPlayerSummary[] } }` — take `players[0]`
- `players` can be empty (private profile) — handle gracefully (show empty state, not an error)

### FastImage Mock for Tests

`@d11/react-native-fast-image` requires mocking in tests. Add to `jest.config.js` `moduleNameMapper`:

```js
'^@d11/react-native-fast-image$': '<rootDir>/__mocks__/@d11/react-native-fast-image.tsx',
```

Create `__mocks__/@d11/react-native-fast-image.tsx`:
```tsx
import React from 'react';
import { Image } from 'react-native';

const FastImage = (props: any) => <Image {...props} source={props.source} />;
FastImage.priority = { low: 'low', normal: 'normal', high: 'high' };
FastImage.resizeMode = { contain: 'contain', cover: 'cover', stretch: 'stretch', center: 'center' };
FastImage.cacheControl = { immutable: 'immutable', web: 'web', cacheOnly: 'cacheOnly' };

export default FastImage;
```

**Note:** If `@d11/react-native-fast-image` already has a Jest mock in the project or in `transformIgnorePatterns`, verify before creating a new mock.

### Git Intelligence (Recent Commits)

```
f4907e2 feat(design): NativeWind design token system and style migration (story 2-0)
b5e4205 fix(auth): code review fixes for story 2-1 (round 3)
9226e64 feat(auth): Steam Web API key entry gate and validation (story 2-2)
37f1862 feat(auth): Steam OpenID sign-in, auth screen, and session hooks (story 2-1)
```

Patterns established:
- Commit format: `feat(auth): <description> (story <n>-<m>)`
- All auth work in `src/features/auth/`
- TanStack Query patterns not yet used in auth feature — this is first query in auth feature
- FastImage not yet used — establish the mock pattern carefully

### Project Structure Notes

**Files to create:**
- `src/features/auth/hooks/useProfileSummary.ts`
- `src/features/auth/hooks/useProfileSummary.test.ts`
- `src/features/auth/components/ProfileSkeleton.tsx`
- `src/features/auth/components/ProfileSkeleton.test.tsx`
- `src/features/auth/screens/ProfileScreen.test.tsx`
- `__mocks__/@d11/react-native-fast-image.tsx` (if not already mocked)

**Files to modify:**
- `src/features/auth/screens/ProfileScreen.tsx` — full rewrite (currently a stub)
- `src/shared/queryKeys.ts` — add `profile.summary` key
- `jest.config.js` — add `@d11/react-native-fast-image` to `moduleNameMapper` (if mock created)

**Files NOT to create or modify:**
- `src/data/api/steam.ts` — read-only, import only
- `src/features/auth/hooks/useSteamAuth.ts` — read-only
- `src/features/auth/hooks/useSessionExpiry.ts` — read-only
- `src/features/auth/store/authSlice.ts` — read-only
- `src/navigation/MainTabNavigator.tsx` — do NOT touch
- `src/navigation/RootNavigator.tsx` — do NOT touch
- `src/App.tsx` — do NOT touch
- `src/data/store/index.ts` — do NOT touch

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3: Steam Profile Summary View]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.2 Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.2 State Ownership Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.4 Format & Process Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.5 Frontend Architecture — FastImage]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#7 Visual Foundation]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#11.2 Feedback & Empty States]
- [Source: _bmad-output/implementation-artifacts/2-2-steam-web-api-key-entry.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/2-2-steam-web-api-key-entry.md#Dev Agent Record]
- [Source: src/data/api/steam.ts — getPlayerSummaries, SteamPlayerSummary (already implemented)]
- [Source: src/features/auth/hooks/useSteamAuth.ts — STEAM_KEYCHAIN_SERVICES constants]
- [Source: src/features/auth/hooks/useSessionExpiry.ts — handleSteamAuthError usage pattern]
- [Source: src/features/auth/hooks/useApiKeySetup.ts — Keychain read pattern + isSteamError guard]
- [Source: src/shared/queryKeys.ts — query key factory (add profile.summary)]
- [Source: src/shared/hooks/reduxHooks.ts — useAppSelector pattern]
- [Source: __mocks__/react-native-keychain.ts — existing Keychain mock]
- [Source: jest.config.js — transformIgnorePatterns and moduleNameMapper]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Story creation — 2026-03-06)
claude-sonnet-4-6 (Implementation — 2026-03-06)
claude-sonnet-4-6 (Code review + fixes — 2026-03-06)

### Debug Log References

- `react-native-worklets` (Reanimated v4 peer dep) requires `react-native-worklets` in both `transformIgnorePatterns` and `moduleNameMapper` to avoid native init crash in Jest.
- Reanimated's `mock.js` transitively imports real `react-native-worklets` native module — mapped `react-native-worklets` to `src/mock` to break the chain.
- `useReducedMotion` not exported from Reanimated mock — overridden per-test in `ProfileSkeleton.test.tsx` using `jest.requireActual('react-native-reanimated/src/mock')` to avoid circular moduleNameMapper resolution.
- `retry: 1` in `useProfileSummary` hook overrides `QueryClient.defaultOptions.retry: false` — non-auth error test uses persistent `mockRejectedValue` (not Once) so both attempts fail.
- **Code review fix:** UNAUTHORIZED catch handler now rethrows after `handleSteamAuthError` so TanStack Query sets `isError=true`. Previous `return null` silently resolved the query, showing wrong UI state and hiding the error from the consumer.
- **Code review fix:** UNAUTHORIZED test updated to use persistent mock + assert `isError=true` (aligns with retry: 1 rethrowing both attempts).
- **Code review fix:** `ProfileScreen` null-data fallback (private profile / no API key) now includes a Retry button, consistent with AC4.
- **Code review fix:** `ProfileSkeleton` skeleton colors now use `tokens.colors.surface800` instead of hardcoded `#2A475E`.

### Completion Notes List

- Steam level display deferred per Dev Notes: `GetPlayerSummaries` does not return level; only avatar + persona name shown in MVP (AC1 note documented in story).
- `jest.config.js` now maps `react-native-reanimated` → `mock.js` and `react-native-worklets` → `src/mock` for all test suites; `react-native-worklets` also added to `transformIgnorePatterns`.
- All 107 tests pass (18 new tests added: 5 hook + 4 screen + 2 skeleton + 7 queryKeys).
- **Code review:** 111 tests pass after review fixes (3 additional screen tests: null-data fallback, stale-cache offline indicator, Retry button in null-data state; 1 additional skeleton test: reduced-motion static path).

### File List

**Created:**
- `src/features/auth/hooks/useProfileSummary.ts`
- `src/features/auth/hooks/useProfileSummary.test.ts`
- `src/features/auth/components/ProfileSkeleton.tsx`
- `src/features/auth/components/ProfileSkeleton.test.tsx`
- `src/features/auth/screens/ProfileScreen.test.tsx`
- `src/shared/queryKeys.test.ts`
- `__mocks__/@d11/react-native-fast-image.tsx`

**Modified:**
- `src/features/auth/screens/ProfileScreen.tsx` — full rewrite from stub
- `src/shared/queryKeys.ts` — added `profile.summary` key
- `jest.config.js` — added FastImage mock, Reanimated mock, Worklets mock, `react-native-worklets` to `transformIgnorePatterns`
