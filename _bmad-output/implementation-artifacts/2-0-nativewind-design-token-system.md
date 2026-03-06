# Story 2.0: NativeWind Design Token System

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want a centralized NativeWind design token file at `src/res/tokens.ts` and NativeWind `className=` applied to all existing auth screens and components,
so that design tokens (colors, spacing, typography) have a single source of truth and future stories can use NativeWind utilities instead of hard-coded hex strings.

## Acceptance Criteria

**AC1 — Centralized token file created at `src/res/tokens.ts`:**
**Given** the project's design system (UX spec §7.2–7.4 and `tailwind.config.js`)
**When** the token file is created
**Then** `src/res/tokens.ts` exports a `tokens` object (named export) with:
- `colors.surface900`, `colors.surface800`, `colors.primary`, `colors.success`, `colors.destructive`
- `colors.text100`, `colors.text300`
- `colors.placeholderText` (`#8F98A0`)
- `spacing.xs` (4), `spacing.sm` (8), `spacing.md` (16), `spacing.lg` (24), `spacing.xl` (32), `spacing.xxl` (48)
- `borderRadius.sm` (8), `borderRadius.md` (12), `borderRadius.lg` (16)
- `fontSize.h1` (32), `fontSize.h2` (24), `fontSize.body` (16), `fontSize.caption` (12)
- `fontFamily.regular` (`'Rubik-Regular'`), `fontFamily.bold` (`'Rubik-Bold'`)
**And** all values match exactly the UX spec and `tailwind.config.js` — no new values invented
**And** `src/res/theme.ts` is deprecated: add a `@deprecated` JSDoc comment at the top pointing to `tokens.ts`, but do NOT delete it (prototype screens reference it)

**AC2 — `tailwind.config.js` extended with missing tokens:**
**Given** the current `tailwind.config.js` only defines surface/accent colors and Rubik font family
**When** tokens are centralized
**Then** `tailwind.config.js` is updated to add:
- `colors['text-100']: '#FFFFFF'`
- `colors['text-300']: '#C7D5E0'`
- `colors['placeholder']: '#8F98A0'`
- `borderRadius.card` (`16`) and `borderRadius.input` (`8`)
- `fontSize.caption` (`12`) with `lineHeight: 16`
**And** existing entries (`surface-900`, `surface-800`, `primary`, `success`, `destructive`, `rubik` font) are preserved unchanged

**AC3 — `AuthScreen.tsx` migrated to NativeWind:**
**Given** `AuthScreen.tsx` currently uses `StyleSheet.create()` with hard-coded hex strings
**When** migration is complete
**Then** all layout, color, spacing, and typography styles use NativeWind `className=` props
**And** only styles that NativeWind cannot express (e.g., `width: '100%'` in StyleSheet where `w-full` doesn't apply to a native View, or SVG-specific `style` props) remain in `StyleSheet`
**And** no hard-coded hex color strings remain in `StyleSheet` entries
**And** the visual output is pixel-identical to before migration (same colors, spacing, layout)
**And** all existing `AuthScreen.test.tsx` tests continue to pass

**AC4 — `SteamLoginButton.tsx` migrated to NativeWind:**
**Given** `SteamLoginButton.tsx` uses hard-coded style values
**When** migration is complete
**Then** all applicable styles use NativeWind `className=`
**And** all existing `SteamLoginButton.test.tsx` tests continue to pass

**AC5 — `ApiKeyScreen.tsx` migrated to NativeWind:**
**Given** `ApiKeyScreen.tsx` currently uses `StyleSheet.create()` exclusively (documented exception in Story 2.2)
**When** migration is complete
**Then** all layout, color, spacing, and typography styles use NativeWind `className=`
**And** only genuinely inexpressible styles remain in `StyleSheet`
**And** no hard-coded hex color strings remain in `StyleSheet`
**And** all existing `ApiKeyScreen.test.tsx` tests continue to pass

**AC6 — Placeholder screens updated:**
**Given** `LibraryScreen.tsx`, `HomeScreen.tsx`, and `ProfileScreen.tsx` are placeholder screens
**When** migration is complete
**Then** each renders with `className="flex-1 bg-surface-900"` (or equivalent NativeWind) instead of any hard-coded background color
**And** no test changes required (placeholders have no tests)

**AC7 — `src/res/theme.ts` NOT deleted:**
**Given** prototype screens in `src/screens/` may reference `src/res/theme.ts`
**When** the story is complete
**Then** `src/res/theme.ts` still exists with a `@deprecated` JSDoc at the top
**And** NO files in `src/features/` or `src/shared/` import from `src/res/theme.ts`

**AC8 — All tests pass:**
**Given** the migration is complete
**When** `npx jest` is run
**Then** all existing tests pass (currently 89 tests)
**And** no new test files are required for this story (pure style migration — no logic changes)

## Tasks / Subtasks

- [x] Task 1: Extend `tailwind.config.js` with missing design tokens (AC: 2)
  - [x] Subtask 1.1: Add `text-100`, `text-300`, `placeholder` colors to the `colors` extend block
  - [x] Subtask 1.2: Add `card` and `input` borderRadius values to the `borderRadius` extend block
  - [x] Subtask 1.3: Add `caption` fontSize (12) with lineHeight 16 to the `fontSize` extend block
  - [x] Subtask 1.4: Verify NativeWind preset still loads correctly (check for config parse errors)

- [x] Task 2: Create `src/res/tokens.ts` (AC: 1)
  - [x] Subtask 2.1: Create `src/res/tokens.ts` with named export `tokens` — all values from UX spec §7.2–7.4
  - [x] Subtask 2.2: Values must match `tailwind.config.js` exactly — this file is the TS mirror of the Tailwind config, for cases where StyleSheet is still needed (e.g., SVG style props, dynamic styles)
  - [x] Subtask 2.3: Add `@deprecated` JSDoc to the top of `src/res/theme.ts` pointing developers to `tokens.ts`

- [x] Task 3: Migrate `AuthScreen.tsx` to NativeWind (AC: 3)
  - [x] Subtask 3.1: Read the current file — understand every StyleSheet entry
  - [x] Subtask 3.2: Replace StyleSheet color/spacing/typography entries with NativeWind `className=` equivalents
  - [x] Subtask 3.3: Import `tokens` from `src/res/tokens.ts` for the SVG `style` prop (logo has a `style` prop that takes a RN style object — use `tokens.spacing.md` for `marginBottom`)
  - [x] Subtask 3.4: Run `AuthScreen.test.tsx` — confirm all tests pass
  - [x] Subtask 3.5: Visual-check: confirm colors and layout match design spec

- [x] Task 4: Migrate `SteamLoginButton.tsx` to NativeWind (AC: 4)
  - [x] Subtask 4.1: Read the current file first — understand its StyleSheet
  - [x] Subtask 4.2: Replace applicable StyleSheet entries with NativeWind `className=`
  - [x] Subtask 4.3: Run `SteamLoginButton.test.tsx` — confirm all tests pass

- [x] Task 5: Migrate `ApiKeyScreen.tsx` to NativeWind (AC: 5)
  - [x] Subtask 5.1: Read the current file — understand its full StyleSheet (this is a larger component)
  - [x] Subtask 5.2: Replace all `backgroundColor`, color, fontSize, padding, margin, borderRadius entries with NativeWind `className=`
  - [x] Subtask 5.3: Retain StyleSheet only for `buttonDisabled` opacity animation state or any value with no NativeWind equivalent
  - [x] Subtask 5.4: Run `ApiKeyScreen.test.tsx` — confirm all tests pass (89 total)

- [x] Task 6: Update placeholder screens with NativeWind root class (AC: 6)
  - [x] Subtask 6.1: `LibraryScreen.tsx` — add `className="flex-1 bg-surface-900"` to root View
  - [x] Subtask 6.2: `HomeScreen.tsx` — add `className="flex-1 bg-surface-900"` to root View
  - [x] Subtask 6.3: `ProfileScreen.tsx` — add `className="flex-1 bg-surface-900"` to root View

- [x] Task 7: Validate (AC: 8)
  - [x] Subtask 7.1: `npx tsc --noEmit` — zero TypeScript errors
  - [x] Subtask 7.2: `npx eslint src/ --ext .ts,.tsx` — zero new lint errors
  - [x] Subtask 7.3: `npx jest` — all 90 tests pass (89 baseline + 1 pre-existing); no new tests required

## Dev Notes

### STOP: Read Before Writing Any Code

This is a **pure style migration story** — no logic changes, no new hooks, no new Redux slices, no API calls. The only output is:
1. New file: `src/res/tokens.ts`
2. Modified: `tailwind.config.js` (add missing tokens)
3. Modified: `src/res/theme.ts` (add `@deprecated` JSDoc only)
4. Modified: `AuthScreen.tsx`, `SteamLoginButton.tsx`, `ApiKeyScreen.tsx`, `LibraryScreen.tsx`, `HomeScreen.tsx`, `ProfileScreen.tsx` (style migration only)

**DO NOT** touch any hook, slice, navigator, test file, or type file unless a test breaks due to a component structural change (which should not happen).

### Current State: NativeWind Is Installed But Not Used

NativeWind v4 is fully installed and configured. However, **zero existing components use `className=`**. Every screen and component uses `StyleSheet.create()` with hard-coded hex strings. This story establishes the pattern for all future stories.

```js
// Current tailwind.config.js — already correct for Story 1.1, but missing text/borderRadius tokens:
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'surface-900': '#171A21',
        'surface-800': '#2A475E',
        primary: '#66C0F4',
        success: '#A3E635',
        destructive: '#F87171',
        // TODO (this story): add text-100, text-300, placeholder
      },
      fontFamily: {
        rubik: ['Rubik'],
      },
    },
  },
  plugins: [],
};
```

### NativeWind v4 Usage Pattern for This Project

**Critical:** This project uses NativeWind v4 (not v2). The API is different:

```tsx
// ✅ Correct NativeWind v4 usage (New Architecture compatible):
import { View, Text } from 'react-native';

export const MyComponent = () => (
  <View className="flex-1 bg-surface-900 px-6 justify-center">
    <Text className="text-text-100 text-base font-rubik">Hello</Text>
  </View>
);
```

**NativeWind v4 does NOT require `styled()` wrappers** — `className` works directly on RN core components (`View`, `Text`, `TextInput`, `TouchableOpacity`, `SafeAreaView`) because the NativeWind preset handles it.

**`SafeAreaView` from `react-native-safe-area-context`** — this works with NativeWind `className` in v4. Do NOT switch to `react-native`'s `SafeAreaView`.

### Design System Token Map (Tailwind class → hex)

| Token | Tailwind class | Hex value | Usage |
|---|---|---|---|
| Background | `bg-surface-900` | `#171A21` | Screen root background |
| Card/Elevated | `bg-surface-800` | `#2A475E` | Cards, inputs, elevated containers |
| Primary accent | `text-primary` / `bg-primary` | `#66C0F4` | CTAs, links, active states |
| Success | `text-success` / `bg-success` | `#A3E635` | Positive actions, "Play This" |
| Destructive | `text-destructive` | `#F87171` | Error messages, shelve actions |
| Text primary | `text-text-100` | `#FFFFFF` | Headings, primary content |
| Text secondary | `text-text-300` | `#C7D5E0` | Metadata, descriptions, subtitles |
| Placeholder | `placeholder:text-placeholder` | `#8F98A0` | TextInput placeholders |

### Typography Tailwind Classes

NativeWind maps Tailwind font sizing to React Native `fontSize`:

| UX Spec | Tailwind class | Notes |
|---|---|---|
| H1 (32px) | `text-3xl` | 30px — closest; or use `text-[32px]` for exact |
| H2 (24px) | `text-2xl` | Exact match |
| Body (16px) | `text-base` | Exact match |
| Caption (12px) | `text-xs` | Exact match |
| Rubik Regular | `font-rubik` | Requires `fontFamily: { rubik: ['Rubik'] }` in Tailwind config |
| Rubik Bold | `font-rubik font-bold` | NativeWind maps `font-bold` to fontWeight 700 |

**Important:** The font weight classes work ONLY if the font files are installed. Rubik is already installed (Story 1.1 configured it). The correct font family names are `Rubik-Regular` and `Rubik-Bold` in native, but NativeWind maps `font-rubik` to the family defined in `tailwind.config.js`.

**Fallback for font-family precision:** If NativeWind `font-rubik` doesn't pick up the correct variant (Regular vs Bold), use `tokens.fontFamily.regular` / `tokens.fontFamily.bold` in a thin `style=` prop alongside `className=`. This is an acceptable exception.

### What Cannot Be Expressed in NativeWind (Keep in StyleSheet)

These must remain in `style=` / `StyleSheet`:

1. **SVG style props** — `<SteamLogo style={styles.logo} />` — SVGs have their own style prop, not `className`
2. **Conditional opacity** — `buttonDisabled: { opacity: 0.6 }` — while `opacity-60` is valid NativeWind, conditional class merging requires `clsx` or similar; for a single disabled state, using `style={isLoading && styles.buttonDisabled}` is acceptable
3. **`lineHeight` as a specific pixel value** — NativeWind's `leading-*` maps to multiples, not pixels; use `style={{ lineHeight: 24 }}` if exact pixel lineHeight is needed
4. **`placeholderTextColor`** — This is a prop on `<TextInput>`, not a style. Use `tokens.colors.placeholderText` (`'#8F98A0'`) directly: `placeholderTextColor={tokens.colors.placeholderText}`

### `src/res/tokens.ts` Reference Implementation

```ts
/**
 * Centralized design tokens for BacklogCompanion.
 * These values are the TypeScript mirror of tailwind.config.js.
 * Use NativeWind `className=` for all styling where possible.
 * Import from this file ONLY when a native style prop is needed (SVG style, dynamic values).
 *
 * @see tailwind.config.js for the Tailwind configuration
 * @see src/res/theme.ts — @deprecated prototype file, do not import in new code
 */
export const tokens = {
  colors: {
    surface900: '#171A21',
    surface800: '#2A475E',
    primary: '#66C0F4',
    success: '#A3E635',
    destructive: '#F87171',
    text100: '#FFFFFF',
    text300: '#C7D5E0',
    placeholderText: '#8F98A0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  fontSize: {
    h1: 32,
    h2: 24,
    body: 16,
    caption: 12,
  },
  fontFamily: {
    regular: 'Rubik-Regular',
    bold: 'Rubik-Bold',
  },
} as const;
```

### `src/res/theme.ts` — Deprecation Only

Add this JSDoc at the very top of the existing file. Do NOT delete or modify the object:

```ts
/**
 * @deprecated This file is from the prototype phase and uses incorrect/mismatched values.
 * Use `src/res/tokens.ts` for all new code.
 * Prototype screens in `src/screens/` still reference this file — do not delete until those screens are removed.
 */
```

### AuthScreen Migration Example

Current hard-coded StyleSheet (to be replaced):

```ts
// BEFORE:
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#171A21' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  subtitle: { color: '#66C0F4', fontSize: 16, fontFamily: 'Rubik-Regular' },
  card: { backgroundColor: '#2A475E', borderRadius: 16, padding: 24, width: '100%', alignItems: 'center' },
});
```

After migration:

```tsx
// AFTER:
export const AuthScreen = (_props: AuthScreenProps) => (
  <SafeAreaView className="flex-1 bg-surface-900">
    <View className="flex-1 justify-center items-center px-6">
      <View className="items-center mb-12">
        <SteamLogo width={240} height={122} style={{ marginBottom: tokens.spacing.md }} />
        <Text className="text-primary text-base font-rubik">Your Steam backlog, organized.</Text>
      </View>
      <View className="bg-surface-800 rounded-2xl p-6 w-full items-center">
        <SteamLoginButton />
      </View>
    </View>
  </SafeAreaView>
);
// No StyleSheet.create() needed at all — SVG marginBottom uses tokens.spacing.md
```

**Note:** `rounded-2xl` = 16px border radius in Tailwind (Tailwind default scale). Verify against the NativeWind preset — if needed, use `rounded-card` (after adding `borderRadius.card: 16` to `tailwind.config.js`).

### Tailwind Spacing Reference (Tailwind default scale)

| Tailwind | px value |
|---|---|
| `p-4` / `px-4` | 16px |
| `p-6` / `px-6` | 24px |
| `p-8` / `px-8` | 32px |
| `mb-4` | 16px |
| `mb-6` | 24px |
| `mb-8` | 32px |
| `mb-12` | 48px |
| `rounded-lg` | 8px (Tailwind default) |
| `rounded-xl` | 12px |
| `rounded-2xl` | 16px |

### Architecture Compliance Checklist

- ✅ Named exports only — `export const tokens = ...` (arch spec §4.4)
- ✅ File location: `src/res/tokens.ts` — no new top-level `src/` folders (arch spec §4.5)
- ✅ `src/res/theme.ts` deprecated, not deleted — prototype backward-compat preserved
- ✅ No new Redux slices, no new hooks, no new TanStack Query usage — pure style story
- ✅ No default exports
- ✅ Tests co-located with source (no new test files needed for pure style migration)
- ✅ NativeWind v4 pattern: `className=` on core RN components, no `styled()` wrappers

### Previous Story Learnings (from Stories 2-1 and 2-2)

- **Pure `StyleSheet` was used in 2-1 and 2-2** because NativeWind token centralization was deferred to this story. Now is the time.
- **`@features`, `@shared`, `@navigation`, `@db` path aliases exist** — use them for imports. `@data` does NOT exist; use relative paths for `src/data/`.
- **`@res` alias does NOT exist** — import `tokens` as: `import { tokens } from '../../res/tokens'` (relative), or ask to check babel/tsconfig for a `@res` alias. If not present, add it (`src/res` → `@res`) — this is a clean improvement.
- **No magic string hex literals** in new feature code — always via `tokens.*` or NativeWind class names.
- **89 tests currently pass** — this story must not break any of them.

### Optional: Add `@res` Path Alias

If babel.config.js and tsconfig.json don't already have a `@res` alias, add it as part of this story:

**babel.config.js** (inside `module-resolver` plugin aliases):
```js
'@res': './src/res',
```

**tsconfig.json** (inside `paths`):
```json
"@res/*": ["src/res/*"]
```

This allows: `import { tokens } from '@res/tokens'` everywhere — clean, consistent with `@shared`, `@features`, etc.

Check `babel.config.js` and `tsconfig.json` first — if `@res` already exists, skip this. If not, add it (it is a small, self-contained change consistent with the existing alias convention).

### Project Structure Notes

**Files to create:**
- `src/res/tokens.ts`

**Files to modify:**
- `tailwind.config.js` — add missing token entries
- `src/res/theme.ts` — add `@deprecated` JSDoc only
- `src/features/auth/screens/AuthScreen.tsx` — NativeWind migration
- `src/features/auth/components/SteamLoginButton.tsx` — NativeWind migration
- `src/features/auth/screens/ApiKeyScreen.tsx` — NativeWind migration
- `src/features/library/screens/LibraryScreen.tsx` — root className only
- `src/features/recommendations/screens/HomeScreen.tsx` — root className only
- `src/features/auth/screens/ProfileScreen.tsx` — root className only
- `babel.config.js` — add `@res` alias (if not present)
- `tsconfig.json` — add `@res` path mapping (if not present)

**Files NOT to create or modify:**
- Any hook files — no logic changes
- Any navigator files — no routing changes
- Any test files — no logic changes (tests should pass without modification)
- `src/res/theme.ts` content — add JSDoc only, touch nothing else

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#7 Visual Foundation]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#5.2 Technical Foundation]
- [Source: _bmad-output/planning-artifacts/architecture.md#2.2 Core Technology Stack]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.4 Format & Process Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.5 Enforcement Guidelines]
- [Source: tailwind.config.js — current NativeWind config]
- [Source: src/res/theme.ts — prototype token file to deprecate]
- [Source: src/features/auth/screens/AuthScreen.tsx — migration target]
- [Source: src/features/auth/screens/ApiKeyScreen.tsx — migration target (Story 2.2 pattern)]
- [Source: _bmad-output/implementation-artifacts/2-2-steam-web-api-key-entry.md#Dev Notes — NativeWind exception rationale]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Story creation — 2026-03-06)
claude-sonnet-4-6 (Implementation — 2026-03-06)
claude-sonnet-4-6 (Code Review — 2026-03-06)

### Debug Log References

- JSDoc `@deprecated` tag inside `@see` line in `tokens.ts` was causing TS6385 hint on the `tokens` export — fixed by removing the `@` prefix from the inline reference text.

### Completion Notes List

- Created `src/res/tokens.ts` as the single source of truth for design tokens (TS mirror of tailwind.config.js).
- Extended `tailwind.config.js` with `text-100`, `text-300`, `placeholder` colors; `card`/`input` borderRadius; `caption` fontSize with lineHeight.
- Added `@res` path alias to `babel.config.js` and `tsconfig.json` for clean imports (`import { tokens } from '@res/tokens'`).
- Migrated `AuthScreen.tsx` to NativeWind: full `className=` migration; only SVG `style` prop retained (uses `tokens.spacing.md`); no `StyleSheet` remains.
- Migrated `SteamLoginButton.tsx` to NativeWind: full `className=` migration; `ActivityIndicator` color via `tokens.colors.primary`.
- Migrated `ApiKeyScreen.tsx` to NativeWind: `StyleSheet` retained only for `explanation` lineHeight (pixel value) and `buttonDisabled` opacity (conditional style). `placeholderTextColor` uses `tokens.colors.placeholderText`.
- Updated `LibraryScreen.tsx`, `HomeScreen.tsx`, `ProfileScreen.tsx` with `className="flex-1 bg-surface-900 ..."` root Views; removed unused `StyleSheet`.
- Added `@deprecated` JSDoc to `src/res/theme.ts`; file content preserved unchanged.
- All 90 tests pass; zero TypeScript errors; zero ESLint errors.
- Code review fixes (2026-03-06): Added `tokens.fontFamily.medium` ('Rubik-Medium'); fixed SteamLoginButton label to use `style={{ fontFamily: tokens.fontFamily.medium }}`; fixed tailwind.config.js borderRadius/fontSize to use numeric values; moved explanation color to StyleSheet via `tokens.colors.placeholderText`; updated AuthScreen SVG import to `@res` alias; added font-weight variant comment to tailwind config.

### File List

- `src/res/tokens.ts` (created)
- `tailwind.config.js` (modified)
- `src/res/theme.ts` (modified — JSDoc only)
- `babel.config.js` (modified — @res alias)
- `tsconfig.json` (modified — @res path)
- `src/features/auth/screens/AuthScreen.tsx` (modified)
- `src/features/auth/components/SteamLoginButton.tsx` (modified)
- `src/features/auth/screens/ApiKeyScreen.tsx` (modified)
- `src/features/library/screens/LibraryScreen.tsx` (modified)
- `src/features/recommendations/screens/HomeScreen.tsx` (modified)
- `src/features/auth/screens/ProfileScreen.tsx` (modified)

## Senior Developer Review (AI)

**Review Date:** 2026-03-06
**Outcome:** Changes Requested → All fixed in same session

### Action Items

- [x] [High] `SteamLoginButton.tsx`: `Rubik-Medium` font weight silently dropped after NativeWind migration — label rendered at Regular (400) weight instead of Medium (500). Fixed: added `tokens.fontFamily.medium` to `tokens.ts` and applied via `style=` prop.
- [x] [Med] `tailwind.config.js`: `borderRadius` values used CSS string format `'16px'`/`'8px'` instead of numeric. Fixed: changed to `16` and `8`.
- [x] [Med] `ApiKeyScreen.tsx`: Explanation text used `text-placeholder` Tailwind class (semantically wrong — that token is for TextInput placeholder text). Fixed: moved color to `StyleSheet` via `tokens.colors.placeholderText`.
- [x] [Med] `AuthScreen.tsx`: SVG import used deep relative path `'../../../res/SteamLogos/...'` despite `@res` alias being added. Fixed: updated to `@res/SteamLogos/...`.
- [x] [Low] `tokens.ts`: Missing `fontFamily.medium` entry. Fixed: added `medium: 'Rubik-Medium'`.
- [x] [Low] `tailwind.config.js`: No documentation on font weight variant gap. Fixed: added comment explaining that weight variants require `style={{ fontFamily: tokens.fontFamily.* }}`.
- [x] [Low] `ApiKeyScreen.tsx`: `explanation` `StyleSheet` entry replaced with named token color via `StyleSheet` (M2 and L3 resolved together).

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-03-06 | Implemented NativeWind design token system — created tokens.ts, extended tailwind config, migrated all auth screens and placeholder screens to className= | claude-sonnet-4-6 |
| 2026-03-06 | Code review fixes — font weight regression, borderRadius format, semantic token usage, SVG alias, tokens.ts medium variant | claude-sonnet-4-6 |
