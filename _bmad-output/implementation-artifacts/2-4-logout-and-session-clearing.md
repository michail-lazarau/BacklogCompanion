# Story 2.4: Logout & Session Clearing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want to sign out of the app,
so that I can unlink my Steam account or switch accounts if needed.

## Acceptance Criteria

**AC1 — Sign Out button visible on Profile tab:**
**Given** the user is on the Profile tab
**When** `ProfileScreen` renders
**Then** a "Sign Out" button is visible on the screen (below the profile info)
**And** the button is styled with the Destructive accent color (`#F87171`) to signal irreversibility

**AC2 — Destructive Toast/Snackbar with UNDO (no modal):**
**Given** the user taps "Sign Out"
**When** the tap is received
**Then** a destructive-styled Toast/Snackbar appears immediately at the bottom of the screen
**And** the Toast contains a message (e.g., "Signing out…") and an **UNDO** action button
**And** no modal dialog or confirmation dialog is shown — the Toast IS the sole confirmation mechanism (per UX spec §11.3)
**And** the actual session clearing (Keychain, Redux, cache) is **deferred** until the Toast times out

**AC3 — Confirmed logout: all session data cleared:**
**Given** the user taps "Sign Out" and does NOT tap UNDO within the snackbar timeout (≈4 seconds)
**When** the timeout elapses
**Then** `clearSession()` from `useSteamAuth` is called, which:
  - Resets Keychain entry for Steam ID (`service: 'steam_id'`)
  - Resets Keychain entry for Steam API key (`service: 'steam_api_key'`)
  - Resets Keychain entry for Gemini API key (`service: 'gemini_api_key'`)
  - Dispatches `auth/setAuthenticated({ isAuthenticated: false, steamId: null })` to Redux
**And** TanStack Query cache is cleared via `queryClient.clear()`
**And** Redux Persist MMKV snapshot is purged via `persistor.purge()`
**And** RootNavigator immediately routes the user to `AuthScreen` (driven by `isAuthenticated: false`)

**AC4 — UNDO taps within timeout cancels logout:**
**Given** the user taps "Sign Out" then taps UNDO within the snackbar timeout
**When** UNDO is tapped
**Then** no session data is cleared (no Keychain resets, no Redux dispatch, no cache clear)
**And** the Toast is dismissed
**And** the user remains on the Profile tab in the authenticated state

**AC5 — RootNavigator auth gate handles isAuthenticated=false (any source):**
**Given** `authSlice.isAuthenticated` becomes `false` for any reason (manual logout per AC3, future session expiry per NFR-REL-02)
**When** the app is in any state
**Then** RootNavigator immediately routes to `AuthScreen` without further action needed in the Profile screen
**And** no data loss beyond the session occurs (SQLite user annotations are NOT cleared on logout — they belong to the device, not the session)

## Tasks / Subtasks

- [x] Task 1: Create `useLogout` hook (AC: 2, 3, 4)
  - [x] Subtask 1.1: Create `src/features/auth/hooks/useLogout.ts` — named export
  - [x] Subtask 1.2: Import `useSteamAuth` (for `clearSession`), `queryClient` (from `@data/QueryProvider` — see note), `persistor` (from `@data/store`), `Toast` (from `react-native-toast-message`)
  - [x] Subtask 1.3: Implement `initiateLogout()` function:
    - Show Toast immediately with UNDO action button (visibilityTime: 4000ms)
    - Store a pending cancel ref (`cancelRef = { current: false }`) that UNDO sets to true
    - After visibilityTime elapses (use `setTimeout` matching Toast duration), check `cancelRef.current`; if false → call `await clearSession()`, then `queryClient.clear()`, then `persistor.purge()`
    - If UNDO tapped: set `cancelRef.current = true`, call `Toast.hide()`
  - [x] Subtask 1.4: Return `{ initiateLogout }` as named export
  - [x] Subtask 1.5: **Important:** UNDO button in `react-native-toast-message` is passed via `props2` or via a custom `onPress` in `text2` — use the `Toast.show` `onHide` / timeout approach. See Dev Notes for the recommended implementation pattern.

- [x] Task 2: Add "Sign Out" button to `ProfileScreen` (AC: 1, 2)
  - [x] Subtask 2.1: Modify `src/features/auth/screens/ProfileScreen.tsx`
  - [x] Subtask 2.2: Import `useLogout` hook
  - [x] Subtask 2.3: Add a `TouchableOpacity` "Sign Out" button below the profile info section (avatar + name area)
  - [x] Subtask 2.4: Button text: "Sign Out", color: Destructive (`className="text-destructive"` or `style={{ color: tokens.colors.destructive }}`), font-rubik
  - [x] Subtask 2.5: `onPress` calls `initiateLogout()` from `useLogout`
  - [x] Subtask 2.6: Button should appear in the authenticated data view only (not in loading/error/empty states)
  - [x] Subtask 2.7: Ensure `accessibilityRole="button"` and `accessibilityLabel="Sign out of Steam account"` are set

- [x] Task 3: Write tests (AC: all)
  - [x] Subtask 3.1: `src/features/auth/hooks/useLogout.test.ts`
    - Test: `initiateLogout()` calls `Toast.show` immediately
    - Test: `initiateLogout()` without UNDO → after timeout, calls `clearSession`, `queryClient.clear`, `persistor.purge`
    - Test: `initiateLogout()` with UNDO tapped → does NOT call `clearSession` or `queryClient.clear` or `persistor.purge`
    - Test: `initiateLogout()` with UNDO calls `Toast.hide`
  - [x] Subtask 3.2: `src/features/auth/screens/ProfileScreen.test.tsx` — update existing tests
    - Test: renders "Sign Out" button when profile data is loaded
    - Test: tapping "Sign Out" calls `initiateLogout`
    - Test: "Sign Out" button NOT rendered in loading state
    - Test: "Sign Out" button NOT rendered in error-no-data state
  - [x] Subtask 3.3: Run `npx jest` — all existing 111 tests plus new tests must pass (119 passed)

- [x] Task 4: Validate (AC: TypeScript + ESLint + Jest)
  - [x] Subtask 4.1: `npx tsc --noEmit` — zero TypeScript errors
  - [x] Subtask 4.2: `npx eslint src/ --ext .ts,.tsx` — zero new lint errors on new files
  - [x] Subtask 4.3: `npx jest` — all tests pass

## Dev Notes

### STOP: Read Before Writing Any Code

These files must NOT be modified (read only, import only):
- `src/features/auth/hooks/useSteamAuth.ts` — `clearSession()` already fully implemented; import it
- `src/features/auth/hooks/useSessionExpiry.ts` — do NOT modify; this handles session expiry (different from manual logout)
- `src/features/auth/store/authSlice.ts` — do NOT modify; `setAuthenticated` dispatched by `clearSession`
- `src/data/store/index.ts` — do NOT modify; just import `persistor`
- `src/data/QueryProvider.tsx` — do NOT modify; just import `queryClient`
- `src/navigation/RootNavigator.tsx` — do NOT modify; auth gate already handles `isAuthenticated: false`
- `src/navigation/MainTabNavigator.tsx` — do NOT modify
- `src/App.tsx` — do NOT modify

### What Already Exists — Read First, Don't Recreate

| File | Current State | Action |
|---|---|---|
| `src/features/auth/screens/ProfileScreen.tsx` | **COMPLETE** from Story 2.3 — shows avatar + persona name + retry/error states | MODIFY: add Sign Out button |
| `src/features/auth/hooks/useSteamAuth.ts` | **COMPLETE** — exports `clearSession()`, `STEAM_KEYCHAIN_SERVICES` | Import `clearSession` only |
| `src/data/QueryProvider.tsx` | **COMPLETE** — exports `queryClient` (QueryClient instance) | Import `queryClient` |
| `src/data/store/index.ts` | **COMPLETE** — exports `persistor` | Import `persistor` |
| `src/features/auth/hooks/useSessionExpiry.ts` | **COMPLETE** — handles API 401/403 session expiry (different use case) | DO NOT MODIFY |
| `__mocks__/react-native-toast-message.ts` | `Toast.show` and `Toast.hide` mocked | Use as-is for tests |
| `__mocks__/react-native-keychain.ts` | `resetGenericPassword` mocked as `jest.fn().mockResolvedValue(true)` | Use as-is for tests |

### clearSession() — Existing Implementation

Already in `src/features/auth/hooks/useSteamAuth.ts`:

```ts
const clearSession = useCallback(async (): Promise<void> => {
  await Keychain.resetGenericPassword({ service: STEAM_KEYCHAIN_SERVICES.STEAM_ID });
  await Keychain.resetGenericPassword({ service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY });
  await Keychain.resetGenericPassword({ service: STEAM_KEYCHAIN_SERVICES.GEMINI_API_KEY });
  dispatch(setAuthenticated({ isAuthenticated: false, steamId: null }));
}, [dispatch]);
```

This handles ALL Keychain and Redux cleanup. The logout hook only needs to call `clearSession()` — do NOT replicate its internals.

### Import Path for queryClient and persistor

The `@data` alias does NOT exist. Use relative paths from `src/features/auth/hooks/`:

```ts
import { queryClient } from '../../../data/QueryProvider'; // 3-level relative
import { persistor } from '../../../data/store';           // 3-level relative
```

Same pattern as `useApiKeySetup` which imports from `src/data/api/steam.ts` using `'../../../data/api/steam'`.

### useLogout Hook — Recommended Implementation

The key challenge is the UNDO pattern with `react-native-toast-message`. The library supports a custom action button via the `text2` prop or a custom component. However the simplest and most testable approach is a timeout-with-cancel-ref pattern:

```ts
import { useCallback, useRef } from 'react';
import Toast from 'react-native-toast-message';
import { useSteamAuth } from '@features/auth/hooks/useSteamAuth';
import { queryClient } from '../../../data/QueryProvider';
import { persistor } from '../../../data/store';

const LOGOUT_UNDO_TIMEOUT_MS = 4000; // match Toast visibilityTime

export const useLogout = () => {
  const { clearSession } = useSteamAuth();
  const cancelledRef = useRef(false);

  const initiateLogout = useCallback(async () => {
    cancelledRef.current = false;

    Toast.show({
      type: 'info',
      text1: 'Signing out…',
      text2: 'Tap UNDO to cancel',
      position: 'bottom',
      visibilityTime: LOGOUT_UNDO_TIMEOUT_MS,
      onPress: () => {
        // UNDO action — tap the toast to cancel
        cancelledRef.current = true;
        Toast.hide();
      },
    });

    // Wait for the Toast duration, then execute logout if not cancelled
    await new Promise<void>((resolve) => setTimeout(resolve, LOGOUT_UNDO_TIMEOUT_MS));

    if (!cancelledRef.current) {
      await clearSession();
      queryClient.clear();
      await persistor.purge();
    }
  }, [clearSession]);

  return { initiateLogout };
};
```

**Note on UNDO UX:** `react-native-toast-message` renders the `onPress` on the entire Toast tap area — this serves as the UNDO mechanism. The AC specifies the UNDO option must be available within the timeout. Tapping anywhere on the Toast = UNDO. This satisfies the UX spec §11.3 requirement for UNDO without a modal.

**Alternative:** If a more prominent UNDO button is needed, use a custom Toast type with a `renderCustomToast` prop in `App.tsx`. For MVP, the tap-to-cancel pattern is sufficient and avoids scope creep.

### persistor.purge() — MMKV Cache Clear

`persistor` is exported from `src/data/store/index.ts`. Calling `persistor.purge()` clears the entire Redux Persist MMKV snapshot. This satisfies the AC requirement to "clear MMKV cache snapshot."

**Important:** Do NOT call `persistor.purge()` before `clearSession()` — Redux state changes first, then we purge the persisted snapshot.

**Order matters:**
1. `await clearSession()` — clears Keychain + dispatches Redux state change → RootNavigator routes to AuthScreen
2. `queryClient.clear()` — clears TanStack Query in-memory cache
3. `await persistor.purge()` — clears MMKV persisted snapshot

After step 1, the component tree changes (navigates to AuthScreen), but steps 2-3 are async fire-and-forget at that point and still execute correctly.

### SQLite User Annotations — NOT Cleared on Logout

Per AC5: user annotations in SQLite (`user_annotations` table) are intentionally NOT cleared on logout. They are device-local data (personal game status), not session credentials. The architecture treats them as persistent user data (Epic 4). Do not add SQLite deletion to the logout flow.

### Sign Out Button Design

From UX spec and design tokens:
- Color: Destructive (`#F87171`) — `className="text-destructive"` or `style={{ color: tokens.colors.destructive }}`
- Font: `className="text-base font-rubik"`
- Position: Below the profile data section (after avatar + persona name)
- No fixed height on text — respect Dynamic Type (NFR-ACC-01)
- Accessibility: `accessibilityRole="button"`, `accessibilityLabel="Sign out of Steam account"`

```tsx
// Inside ProfileScreen, in the authenticated data view (after avatar + name):
<TouchableOpacity
  onPress={initiateLogout}
  className="mt-8 px-6 py-3 rounded-lg bg-surface-800"
  accessibilityRole="button"
  accessibilityLabel="Sign out of Steam account"
>
  <Text className="text-base font-rubik text-destructive text-center">
    Sign Out
  </Text>
</TouchableOpacity>
```

### Testing useLogout — Fake Timers

The hook relies on `setTimeout` for the UNDO window. Use Jest fake timers:

```ts
jest.useFakeTimers();

// After initiateLogout(), advance timers:
act(() => {
  jest.advanceTimersByTime(4000);
});
```

For the UNDO test, simulate `onPress` call before advancing timers — verify `clearSession` was NOT called.

**Mocking queryClient and persistor:**
```ts
jest.mock('../../../data/QueryProvider', () => ({
  queryClient: { clear: jest.fn() },
}));
jest.mock('../../../data/store', () => ({
  persistor: { purge: jest.fn().mockResolvedValue(undefined) },
}));
```

### Architecture Compliance Checklist

- ✅ Named exports only — `export const useLogout = ...` (no default export)
- ✅ `clearSession()` imported from `useSteamAuth` — NOT reimplementing Keychain logic
- ✅ `persistor` imported from `src/data/store` — satisfies MMKV cache clear AC
- ✅ `queryClient.clear()` called on confirmed logout — cleans TanStack Query cache
- ✅ No new Redux slices — logout is a side effect, not new state
- ✅ No modal confirmation dialog — Toast/Snackbar with UNDO only (UX spec §11.3)
- ✅ SQLite user annotations NOT cleared (not session data)
- ✅ Tests co-located with source files
- ✅ Path aliases: `@features`, `@shared` — use relative paths for `src/data/` imports
- ✅ `@data` alias does NOT exist — use 3-level relative path

### Previous Story Learnings (from Stories 2-1 through 2-3)

- **Named exports only** — `export const ProfileScreen = () => ...` NOT `export default`
- **`@data/*` does NOT exist** — use 3-level relative path `'../../../data/...'` for `src/data/` imports from `src/features/auth/hooks/`
- **`useSteamAuth` hook** — already exports `clearSession` as a named function; import it, don't duplicate
- **`react-native-toast-message`** — already in `transformIgnorePatterns`; `Toast.show`/`Toast.hide` already mocked at `__mocks__/react-native-toast-message.ts`
- **TanStack Query in tests** — wrap with `QueryClientProvider` + fresh `QueryClient`; use `renderHook` from `@testing-library/react-native`
- **`useReducedMotion`** — override in tests using `jest.requireActual('react-native-reanimated/src/mock')` spread pattern (established in 2-3)
- **`transformIgnorePatterns`** — no new native packages in this story, no changes to `jest.config.js` expected
- **Font weights** — `font-rubik` in `className` sets family only; for Bold/Medium use `style={{ fontFamily: tokens.fontFamily.medium }}` additionally

### Toast Implementation Notes

`react-native-toast-message` v2 API for the logout toast:

```ts
import Toast from 'react-native-toast-message';

Toast.show({
  type: 'info',         // or 'error' for destructive styling
  text1: 'Signing out…',
  text2: 'Tap to UNDO',
  position: 'bottom',
  visibilityTime: 4000, // ms — match LOGOUT_UNDO_TIMEOUT_MS
  onPress: () => {
    cancelledRef.current = true;
    Toast.hide();
  },
});
```

**Note:** `react-native-toast-message` renders `<Toast />` in `App.tsx` already (from Story 2.1). Do NOT add another `<Toast />` instance.

### Git Intelligence (Recent Commits)

```
9dec01d feat(auth): Steam profile summary view with skeleton and session expiry (story 2-3)
f4907e2 feat(design): NativeWind design token system and style migration (story 2-0)
b5e4205 fix(auth): code review fixes for story 2-1 (round 3)
9226e64 feat(auth): Steam Web API key entry gate and validation (story 2-2)
```

Patterns established:
- Commit format: `feat(auth): <description> (story <n>-<m>)`
- All auth work in `src/features/auth/`
- ProfileScreen now fully implemented — modify rather than rewrite

### Project Structure Notes

**Files to create:**
- `src/features/auth/hooks/useLogout.ts`
- `src/features/auth/hooks/useLogout.test.ts`

**Files to modify:**
- `src/features/auth/screens/ProfileScreen.tsx` — add Sign Out button + `useLogout` import
- `src/features/auth/screens/ProfileScreen.test.tsx` — add Sign Out button tests

**Files NOT to create or modify:**
- `src/features/auth/hooks/useSteamAuth.ts` — read-only
- `src/features/auth/hooks/useSessionExpiry.ts` — read-only
- `src/features/auth/store/authSlice.ts` — read-only
- `src/data/store/index.ts` — read-only
- `src/data/QueryProvider.tsx` — read-only
- `src/navigation/RootNavigator.tsx` — do NOT touch
- `src/navigation/MainTabNavigator.tsx` — do NOT touch
- `src/App.tsx` — do NOT touch (Toast component already rendered there)
- `jest.config.js` — no new mocks expected for this story

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4: Logout & Session Clearing]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.2 Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.2 State Ownership Rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#11.3 Actions & Undo]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#7 Visual Foundation]
- [Source: _bmad-output/implementation-artifacts/2-3-steam-profile-summary-view.md#Dev Notes]
- [Source: src/features/auth/hooks/useSteamAuth.ts — clearSession(), STEAM_KEYCHAIN_SERVICES]
- [Source: src/features/auth/hooks/useSessionExpiry.ts — Toast.show pattern]
- [Source: src/features/auth/screens/ProfileScreen.tsx — current ProfileScreen implementation]
- [Source: src/data/QueryProvider.tsx — queryClient export]
- [Source: src/data/store/index.ts — persistor export]
- [Source: __mocks__/react-native-toast-message.ts — Toast mock]
- [Source: __mocks__/react-native-keychain.ts — Keychain mock (resetGenericPassword)]
- [Source: jest.config.js — transformIgnorePatterns and moduleNameMapper]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Story creation — 2026-03-06)
claude-sonnet-4-6 (Story implementation — 2026-03-06)

### Debug Log References

- Jest module factory hoisting: `jest.mock` factories are hoisted above `const` declarations, so module-level mock variables cannot be referenced inside factory functions. Fixed by using `jest.requireMock()` inside tests to access mock instances after hoisting.

### Completion Notes List

- Created `useLogout` hook with `cancelledRef` pattern for UNDO — tap anywhere on Toast within 4s cancels logout; timeout-based clearSession call after 4s if not cancelled
- Added Sign Out button to `ProfileScreen` authenticated data view only (not in loading, error-no-data, or null-data states)
- All 4 useLogout tests pass; all 4 ProfileScreen Sign Out tests pass
- Full suite: 119/119 tests pass (8 new tests added)
- TypeScript: zero errors; ESLint: zero new errors on new/modified files
- `@data` alias does not exist — used 3-level relative paths for `QueryProvider` and `store` imports (pattern confirmed by story notes)
- Pre-existing `require()` lint errors in ProfileScreen.test.tsx skeleton mock were present before this story; not introduced by this work

### File List

- src/features/auth/hooks/useLogout.ts (created)
- src/features/auth/hooks/useLogout.test.ts (created)
- src/features/auth/screens/ProfileScreen.tsx (modified)
- src/features/auth/screens/ProfileScreen.test.tsx (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified — story status set to review)

## Senior Developer Review (AI)

**Reviewer:** m.lazarau | **Date:** 2026-03-06 | **Outcome:** Approved (after fixes)

**Issues found and fixed (5 HIGH/MEDIUM):**
- **H1 [FIXED]** Toast `type` changed `'info'` → `'error'` to satisfy AC2 destructive-styled requirement ([useLogout.ts:17](src/features/auth/hooks/useLogout.ts#L17))
- **M1 [FIXED]** Toast text updated to `'Tap to UNDO'` — consistent with AC2 UNDO action wording (whole-toast-tap MVP trade-off documented in Dev Notes, accepted)
- **M2 [FIXED]** Added `pendingRef` guard in `initiateLogout` — rapid double-tap no longer queues duplicate logout; `Toast.show` called once, `clearSession` called once ([useLogout.ts](src/features/auth/hooks/useLogout.ts))
- **M3 [FIXED]** Added missing test: `'does NOT render Sign Out button when data is null (unavailable state)'` in ProfileScreen.test.tsx
- **M4 [FIXED]** `sprint-status.yaml` added to story File List

**Also added:** Double-tap guard test in useLogout.test.ts; timer cleanup in test 1 and 4 to eliminate Jest force-exit noise.

**Test counts:** 121/121 pass (was 119; +2 new tests from review fixes)

## Change Log

- 2026-03-06: Implemented Story 2.4 — created `useLogout` hook with UNDO-capable Toast pattern; added Sign Out button to ProfileScreen authenticated view; 8 new tests added; all 119 tests pass
- 2026-03-06: Code review fixes — Toast type→error (AC2), pendingRef double-tap guard, missing null-data Sign Out absence test, File List corrected; 121/121 pass
