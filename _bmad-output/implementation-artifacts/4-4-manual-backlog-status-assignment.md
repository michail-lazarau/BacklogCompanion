# Story 4.4: Manual Backlog Status Assignment

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want to assign and update a personal backlog status to any game,
so that I can track my progress and feel a sense of accomplishment when I complete or declutter my library.

## Acceptance Criteria

**AC1 — user_annotations DB migration:**
**Given** Story 4.4 is the first story requiring user annotation storage
**When** the story is implemented
**Then** a Drizzle incremental migration adds the `user_annotations` table with columns: `app_id` (FK to `steam_games`), `status` (TEXT: one of 'Backlog' | 'Playing' | 'Completed' | 'Abandoned' | 'Shelved'), `updated_at` (INTEGER Unix timestamp in seconds)
**And** the migration runs on startup via `useMigrations` (established in Story 1.2)

**AC2 — StatusSelector display and selection:**
**Given** the user is on a `GameDetailScreen`
**When** they interact with the `StatusSelector` component
**Then** the current status is displayed (defaulting to "Backlog" if no annotation exists in `user_annotations`)
**And** they can select from: Backlog, Playing, Completed, Abandoned, Shelved
**And** the selected status is persisted to the `user_annotations` SQLite table via Drizzle immediately (upsert on `app_id`)
**And** TanStack Query cache for `queryKeys.games.all(steamId)` is invalidated so the Library list filter can reflect the change
**And** TanStack Query cache for `queryKeys.games.annotation(appId)` is invalidated so the StatusSelector re-reads the new value

**AC3 — Completed milestone — haptic feedback + confetti:**
**Given** the user sets status to "Completed"
**When** the status is saved to SQLite
**Then** haptic feedback fires (success vibration pattern via `Vibration.vibrate`)
**And** a full-screen `ConfettiOverlay` particle animation celebrates the milestone (30–40 animated colored particles falling from top, auto-dismisses after ~2.5 s)
**And** the `StatusSelector` displays "Completed" with the Success accent color (`tokens.colors.success` / #A3E635)
**And** if `useReducedMotion()` returns `true`, the `ConfettiOverlay` renders nothing (no animation)

**AC4 — Shelved / Abandoned — UNDO toast:**
**Given** the user sets status to "Shelved" or "Abandoned"
**When** the status is saved
**Then** a `react-native-toast-message` toast appears at bottom with text: "Game shelved" or "Game abandoned" and subtext "Tap to UNDO" (using the existing `error` toast type)
**And** if UNDO is tapped within 4 seconds, the previous status is restored in `user_annotations` SQLite and the toast hides
**And** if UNDO is NOT tapped within 4 seconds, the new status remains persisted
**And** haptic feedback fires (light single vibration via `Vibration.vibrate(40)`)

**AC5 — Offline persistence:**
**Given** the app is offline
**When** the user changes a status
**Then** the change is persisted locally to SQLite immediately
**And** no network call is needed (user annotations are local-only, no Steam API involvement)

## Tasks / Subtasks

- [ ] Task 1: Add `user_annotations` SQLite table + Drizzle migration (AC: 1)
  - [ ] Subtask 1.1: Add `userAnnotations` table to `src/db/schema.ts`
    ```ts
    export const userAnnotations = sqliteTable('user_annotations', {
      appId: integer('app_id').primaryKey().references(() => steamGames.appId),
      status: text('status').notNull().default('Backlog'),
      updatedAt: integer('updated_at').notNull(),  // Unix timestamp (seconds)
    });

    export type UserAnnotation = typeof userAnnotations.$inferSelect;
    export type NewUserAnnotation = typeof userAnnotations.$inferInsert;
    export type BacklogStatus = 'Backlog' | 'Playing' | 'Completed' | 'Abandoned' | 'Shelved';
    ```
  - [ ] Subtask 1.2: Run `npx drizzle-kit generate` to produce migration SQL
    - Expected output: `src/db/migrations/0002_*.sql` with `CREATE TABLE user_annotations ...`
    - Verify generated SQL: correct table name, FK to `steam_games(app_id)`, `status TEXT NOT NULL DEFAULT 'Backlog'`, `updated_at INTEGER NOT NULL`
  - [ ] Subtask 1.3: Update `src/db/migrations/index.ts`
    - Import new migration: `import m0002 from './0002_<generated_name>.sql';`
    - Add `m0002` to the `migrations` object (key: `"m0002"`)
  - [ ] Subtask 1.4: Verify `useMigrations` in `App.tsx` runs the new migration automatically on startup (no code change needed — it reads from `allMigrations`)

- [ ] Task 2: Add `games.annotation` query key (AC: 2)
  - [ ] Subtask 2.1: Add `annotation` key to `src/shared/queryKeys.ts` inside the `games` factory
    - `annotation: (appId: number) => ['games', 'detail', appId, 'annotation'] as const`
    - Place after the existing `achievements` key, following the same nesting pattern

- [ ] Task 3: Create `useBacklogStatus` hook (AC: 2, 3, 4, 5)
  - [ ] Subtask 3.1: Create `src/features/gameDetail/hooks/useBacklogStatus.ts`
    - Named export: `export const useBacklogStatus = (appId: number) => { ... }`
    - Reads `steamId` from Redux via `useAppSelector(state => state.auth.steamId)`
    - **Read path**: `useQuery` with key `queryKeys.games.annotation(appId)`, `queryFn` reads from `user_annotations` where `appId` matches; returns `annotation.status ?? 'Backlog'`; `staleTime: Infinity`
    - **Write path**: `setStatus(newStatus: BacklogStatus, previousStatus: BacklogStatus)` function that:
      1. Upserts to `user_annotations` via `db.insert(userAnnotations).values({...}).onConflictDoUpdate({...})`
      2. Calls `queryClient.invalidateQueries({ queryKey: queryKeys.games.annotation(appId) })`
      3. Calls `queryClient.invalidateQueries({ queryKey: queryKeys.games.all(steamId) })` (library list)
      4. If `newStatus === 'Completed'`: fires success haptic + sets `showConfetti` state to `true`
      5. If `newStatus === 'Shelved' | 'Abandoned'`: fires light haptic + shows UNDO toast (see Subtask 3.2)
    - **Haptics**: `import { Vibration } from 'react-native';`
      - Success: `Vibration.vibrate([0, 50, 30, 100])` (pattern, works on Android; on iOS just vibrates once)
      - Light: `Vibration.vibrate(40)` (single short vibration)
    - **UNDO logic** (for Shelved/Abandoned): implement exactly like `useLogout.ts` pattern:
      ```ts
      const cancelledRef = useRef(false);
      const pendingUndoRef = useRef(false);

      // After DB write and before showing toast:
      cancelledRef.current = false;
      pendingUndoRef.current = true;
      Toast.show({
        type: 'error',
        text1: newStatus === 'Shelved' ? 'Game shelved' : 'Game abandoned',
        text2: 'Tap to UNDO',
        position: 'bottom',
        visibilityTime: 4000,
        onPress: () => {
          cancelledRef.current = true;
          Toast.hide();
        },
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 4000));
      pendingUndoRef.current = false;
      if (cancelledRef.current) {
        // Restore previous status
        await db.insert(userAnnotations)
          .values({ appId, status: previousStatus, updatedAt: Math.floor(Date.now() / 1000) })
          .onConflictDoUpdate({
            target: userAnnotations.appId,
            set: { status: previousStatus, updatedAt: Math.floor(Date.now() / 1000) },
          });
        queryClient.invalidateQueries({ queryKey: queryKeys.games.annotation(appId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.games.all(steamId) });
      }
      ```
    - **Confetti state**: `const [showConfetti, setShowConfetti] = useState(false)` — exposed in return value; consumer renders `<ConfettiOverlay>` conditionally
    - **Returns**: `{ currentStatus, setStatus, showConfetti, onConfettiDone, isPending }`
      - `onConfettiDone`: `() => setShowConfetti(false)` — called by `ConfettiOverlay` when animation ends
  - [ ] Subtask 3.2: Create `src/features/gameDetail/hooks/useBacklogStatus.test.ts`
    - Test: returns `'Backlog'` when no annotation exists in SQLite
    - Test: returns stored status when annotation row exists
    - Test: `setStatus` upserts to SQLite with correct values and Unix timestamp
    - Test: `setStatus` invalidates `queryKeys.games.annotation(appId)` and `queryKeys.games.all(steamId)`
    - Test: `setStatus('Completed', prev)` sets `showConfetti` to `true`
    - Test: `setStatus('Shelved', prev)` shows Toast with text "Game shelved" + "Tap to UNDO"
    - Test: `setStatus('Abandoned', prev)` shows Toast with text "Game abandoned" + "Tap to UNDO"
    - Test: UNDO — if `Toast.onPress` is called within timeout, original status is restored in SQLite
    - Pattern: mock `@db/index`, `@db/schema`, `react-native-toast-message`, `react-native` (for Vibration), `@shared/hooks/reduxHooks`; fresh `QueryClient` per test with `afterEach(clear)`

- [ ] Task 4: Create `ConfettiOverlay` component (AC: 3)
  - [ ] Subtask 4.1: Create `src/features/gameDetail/components/ConfettiOverlay.tsx`
    - Named export: `export const ConfettiOverlay = ({ visible, onDone }: { visible: boolean; onDone: () => void }) => { ... }`
    - When `visible` is `false`, render `null`
    - Respects `useReducedMotion()` — if `true`, call `onDone()` immediately and render nothing
    - **Particle system**: 35 particles as `Animated.View` elements (use Reanimated v4 shared values)
      - Each particle: absolute positioned `View` (8x8, `borderRadius: 4`), random color from `[tokens.colors.primary, tokens.colors.success, tokens.colors.destructive, '#FFD700', '#FF69B4']`
      - Random start X: `Math.random() * screenWidth`
      - Y animation: `withTiming(screenHeight, { duration: 2000 + Math.random() * 500 })` via Reanimated
      - X drift: `withTiming(startX + (Math.random() - 0.5) * 200, { duration: 2000 + Math.random() * 500 })`
      - Opacity: `withDelay(1500, withTiming(0, { duration: 500 }))` — fades out in last 500ms
      - Start each particle with `withDelay(Math.random() * 400, ...)` for staggered effect
    - Total animation duration: ~2500ms; after last animation `onDone()` is called via `withDelay(2500, runOnJS(onDone)())`
    - Use `useWindowDimensions()` for screen dimensions
    - Wrap in `StyleSheet.absoluteFillObject` container (`position: 'absolute', pointerEvents: 'none'`) so it overlays without blocking touches
    - `zIndex: 100` to ensure it sits above all content
    - All styles in `StyleSheet.create()` — use `tokens` for colors, sizes
  - [ ] Subtask 4.2: Create `src/features/gameDetail/components/ConfettiOverlay.test.tsx`
    - Test: renders `null` when `visible=false`
    - Test: renders `null` (no particles) when `useReducedMotion()` returns `true`
    - Test: calls `onDone()` immediately when `useReducedMotion()` is `true`
    - Test: renders particles (35 Views) when `visible=true` and motion is allowed
    - Pattern: mock `useReducedMotion` via the module-level `let` variable pattern from Story 2.3 learnings

- [ ] Task 5: Create `StatusSelector` component (AC: 2, 3, 4)
  - [ ] Subtask 5.1: Create `src/features/gameDetail/components/StatusSelector.tsx`
    - Named export: `export const StatusSelector = ({ appId }: { appId: number }) => { ... }`
    - Uses `useBacklogStatus(appId)` hook
    - Renders the `ConfettiOverlay` when `showConfetti` is true: `<ConfettiOverlay visible={showConfetti} onDone={onConfettiDone} />`
    - **Layout**: horizontal `ScrollView` (or wrapping `View`) showing 5 status pill buttons
    - **Status pills** — 5 `TouchableOpacity` buttons, each labeled with the status name:
      - 'Backlog' → pill with `tokens.colors.primary` accent when active
      - 'Playing' → pill with `tokens.colors.primary` accent when active
      - 'Completed' → pill with `tokens.colors.success` (#A3E635) accent when active
      - 'Abandoned' → pill with `tokens.colors.destructive` (#F87171) accent when active
      - 'Shelved' → pill with `tokens.colors.destructive` (#F87171) accent when active
    - **Active pill style**: filled background with accent color, white text
    - **Inactive pill style**: `tokens.colors.surface800` background, `tokens.colors.text300` text, `borderWidth: 1`, `borderColor: tokens.colors.surface800`
    - **On press**: call `setStatus(tappedStatus, currentStatus)` — only if `tappedStatus !== currentStatus`
    - **Loading state**: while `isPending` (query is loading), show a single skeleton pill (shimmer animation, width ~120)
    - Section header: "Backlog Status" label (caption typography, `tokens.colors.text300`, `textTransform: 'uppercase'`)
    - All styles via `StyleSheet.create()` + `tokens`; `Animated.View` for skeleton uses `style=` only (never `className=`)
  - [ ] Subtask 5.2: Create `src/features/gameDetail/components/StatusSelector.test.tsx`
    - Test: renders skeleton when `isPending` is true
    - Test: renders all 5 status pills when loaded
    - Test: active status pill has distinct active style
    - Test: tapping a different status calls `setStatus` with new status and previous status
    - Test: tapping the already-active status does NOT call `setStatus`
    - Test: renders `ConfettiOverlay` with `visible=true` when `showConfetti` is true
    - Pattern: mock `useBacklogStatus` at module level

- [ ] Task 6: Integrate `StatusSelector` into `GameDetailScreen` (AC: 2, 3, 4)
  - [ ] Subtask 6.1: Add `StatusSelector` to `GameDetailScreen.tsx`
    - Import: `import { StatusSelector } from '../components/StatusSelector';`
    - Place inside `infoContainer` `View`, after the existing `achievementsContainer` block
    - Wrap in a `View` with `marginTop: tokens.spacing.lg` style named `statusSelectorContainer`
    - Render: `<StatusSelector appId={appId} />`
  - [ ] Subtask 6.2: Update `src/features/gameDetail/screens/GameDetailScreen.test.tsx`
    - Add mock for `StatusSelector`: `jest.mock('../components/StatusSelector', () => ({ StatusSelector: () => null }));`

- [ ] Task 7: Validate (AC: TypeScript + ESLint + Jest)
  - [ ] Subtask 7.1: `npx tsc --noEmit` — zero new TypeScript errors
  - [ ] Subtask 7.2: `npx eslint src/ --ext .ts,.tsx` — zero new lint errors in new/modified files
  - [ ] Subtask 7.3: `npx jest` — all tests pass, zero regressions (baseline: 277 tests from Story 4.3)

## Dev Notes

### STOP: Read Before Writing Any Code

These files must NOT be modified beyond what Tasks 1–6 specify:
- `src/features/library/` — no touch
- `src/App.tsx` — no touch
- `src/navigation/` — no touch
- `src/data/QueryProvider.tsx` — no touch
- `src/shared/components/toastConfig.tsx` — no touch (existing `error` type is sufficient)
- `src/data/store/` — no touch (no new Redux slices needed)

### DB Migration: user_annotations (CRITICAL — m0002)

This is the **second incremental migration** (after `achievement_cache` in Story 4.3). The migration index journal tracks these by `idx` (0-based). After `npx drizzle-kit generate`:

1. A file `src/db/migrations/0002_<random_name>.sql` is generated
2. Import it as `m0002` in `src/db/migrations/index.ts`
3. Add to the `migrations` object: `{ m0000, m0001, m0002 }`
4. `useMigrations` handles execution automatically on app startup

**Schema decision — `updatedAt` column**: Use plain `integer('updated_at')` (no `{ mode: 'timestamp' }`) per architecture rule: "Unix integer in SQLite (never ISO strings)". Store seconds-since-epoch, not milliseconds.

**Schema decision — `status` column**: Use `text('status').notNull().default('Backlog')`. Although it's logically an enum, SQLite has no native enum type; TEXT with application-level validation is the correct approach. TypeScript `BacklogStatus` type enforces the constraint.

**FK constraint**: `appId: integer('app_id').primaryKey().references(() => steamGames.appId)` — the `app_id` is both the PK and the FK. This means one annotation row per game (upsert pattern). No separate auto-increment ID needed.

```ts
// src/db/schema.ts — add after achievementCache table
export const userAnnotations = sqliteTable('user_annotations', {
  appId: integer('app_id').primaryKey().references(() => steamGames.appId),
  status: text('status').notNull().default('Backlog'),
  updatedAt: integer('updated_at').notNull(),
});

export type UserAnnotation = typeof userAnnotations.$inferSelect;
export type NewUserAnnotation = typeof userAnnotations.$inferInsert;
export type BacklogStatus = 'Backlog' | 'Playing' | 'Completed' | 'Abandoned' | 'Shelved';
```

### useBacklogStatus Hook — Full Implementation Guide

```ts
// src/features/gameDetail/hooks/useBacklogStatus.ts
import { useState, useRef, useCallback } from 'react';
import { Vibration } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { eq } from 'drizzle-orm';
import { db } from '@db/index';
import { userAnnotations } from '@db/schema';
import type { BacklogStatus } from '@db/schema';
import { queryKeys } from '@shared/queryKeys';
import { useAppSelector } from '@shared/hooks/reduxHooks';

const UNDO_TIMEOUT_MS = 4000;

export const useBacklogStatus = (appId: number) => {
  const steamId = useAppSelector(state => state.auth.steamId) ?? '';
  const queryClient = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);
  const cancelledRef = useRef(false);
  const pendingUndoRef = useRef(false);

  const { data: currentStatus = 'Backlog', isPending } = useQuery<BacklogStatus>({
    queryKey: queryKeys.games.annotation(appId),
    queryFn: async () => {
      const rows = await db
        .select()
        .from(userAnnotations)
        .where(eq(userAnnotations.appId, appId))
        .limit(1);
      return (rows[0]?.status as BacklogStatus) ?? 'Backlog';
    },
    staleTime: Infinity,
  });

  const persistStatus = useCallback(async (status: BacklogStatus) => {
    const nowUnix = Math.floor(Date.now() / 1000);
    await db
      .insert(userAnnotations)
      .values({ appId, status, updatedAt: nowUnix })
      .onConflictDoUpdate({
        target: userAnnotations.appId,
        set: { status, updatedAt: nowUnix },
      });
    await queryClient.invalidateQueries({ queryKey: queryKeys.games.annotation(appId) });
    if (steamId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.games.all(steamId) });
    }
  }, [appId, steamId, queryClient]);

  const setStatus = useCallback(async (newStatus: BacklogStatus, previousStatus: BacklogStatus) => {
    if (pendingUndoRef.current) return; // Prevent concurrent status changes during UNDO window

    // Write new status immediately
    await persistStatus(newStatus);

    if (newStatus === 'Completed') {
      Vibration.vibrate([0, 50, 30, 100]);
      setShowConfetti(true);
    } else if (newStatus === 'Shelved' || newStatus === 'Abandoned') {
      Vibration.vibrate(40);
      cancelledRef.current = false;
      pendingUndoRef.current = true;

      Toast.show({
        type: 'error',
        text1: newStatus === 'Shelved' ? 'Game shelved' : 'Game abandoned',
        text2: 'Tap to UNDO',
        position: 'bottom',
        visibilityTime: UNDO_TIMEOUT_MS,
        onPress: () => {
          cancelledRef.current = true;
          Toast.hide();
        },
      });

      await new Promise<void>((resolve) => setTimeout(resolve, UNDO_TIMEOUT_MS));
      pendingUndoRef.current = false;

      if (cancelledRef.current) {
        // Restore previous status
        await persistStatus(previousStatus);
      }
    }
  }, [persistStatus]);

  const onConfettiDone = useCallback(() => setShowConfetti(false), []);

  return { currentStatus, setStatus, showConfetti, onConfettiDone, isPending };
};
```

### ConfettiOverlay Implementation Guide

```tsx
// src/features/gameDetail/components/ConfettiOverlay.tsx
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';
import { tokens } from '@res/tokens';

const PARTICLE_COLORS = [
  tokens.colors.primary,
  tokens.colors.success,
  tokens.colors.destructive,
  '#FFD700',
  '#FF69B4',
];
const PARTICLE_COUNT = 35;
const ANIMATION_DURATION = 2500;

type Particle = {
  id: number;
  startX: number;
  endX: number;
  color: string;
  delay: number;
  duration: number;
};

function generateParticles(screenWidth: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const startX = Math.random() * screenWidth;
    return {
      id: i,
      startX,
      endX: startX + (Math.random() - 0.5) * 200,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      delay: Math.random() * 400,
      duration: 1800 + Math.random() * 600,
    };
  });
}

// Individual animated particle — each needs its own component for isolated shared values
const ParticleView = ({
  particle,
  screenHeight,
  onLastDone,
  isLast,
}: {
  particle: Particle;
  screenHeight: number;
  onLastDone: () => void;
  isLast: boolean;
}) => {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(particle.startX);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const callback = isLast ? () => runOnJS(onLastDone)() : undefined;
    translateY.value = withDelay(
      particle.delay,
      withTiming(screenHeight + 20, { duration: particle.duration }, callback),
    );
    translateX.value = withDelay(
      particle.delay,
      withTiming(particle.endX, { duration: particle.duration }),
    );
    opacity.value = withDelay(
      particle.delay + particle.duration * 0.7,
      withTiming(0, { duration: particle.duration * 0.3 }),
    );
  }, []);  // Run once on mount

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: particle.color },
        style,
      ]}
    />
  );
};

export const ConfettiOverlay = ({
  visible,
  onDone,
}: {
  visible: boolean;
  onDone: () => void;
}) => {
  const reducedMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (visible && reducedMotion) {
      onDone();
    }
  }, [visible, reducedMotion, onDone]);

  if (!visible || reducedMotion) return null;

  const particles = generateParticles(width);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <ParticleView
          key={p.id}
          particle={p}
          screenHeight={height}
          isLast={i === particles.length - 1}
          onLastDone={onDone}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 0,
  },
});
```

**Important**: `generateParticles()` is called at render time (inside the component body after the `null` guard). This ensures particles are only generated when `visible=true` and each confetti trigger gets fresh random positions.

**Caution**: `Animated.View` from Reanimated must use `style=` only — never `className=` (NativeWind v4 limitation confirmed in MEMORY.md).

**`useReducedMotion` in tests**: Must be overridden via a module-level `let` variable in the `jest.mock` factory (NOT `require('react-native-reanimated/mock')` — circular!). See Testing Patterns section below.

### StatusSelector Component Guide

```tsx
// src/features/gameDetail/components/StatusSelector.tsx
const ALL_STATUSES: BacklogStatus[] = ['Backlog', 'Playing', 'Completed', 'Abandoned', 'Shelved'];

const STATUS_COLORS: Record<BacklogStatus, string> = {
  Backlog: tokens.colors.primary,
  Playing: tokens.colors.primary,
  Completed: tokens.colors.success,
  Abandoned: tokens.colors.destructive,
  Shelved: tokens.colors.destructive,
};
```

**Pill layout**: Use `flexDirection: 'row'`, `flexWrap: 'wrap'`, `gap: tokens.spacing.sm` — 5 pills in a wrapping row. Do NOT use a `ScrollView` unless overflow is confirmed — a wrapping row is more accessible.

**Active vs inactive pill styles**:
```ts
// Active: filled background, white text
activePill: { backgroundColor: accentColor, borderRadius: tokens.borderRadius.lg, paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.sm }
activePillText: { color: tokens.colors.text100, fontFamily: tokens.fontFamily.medium, fontSize: tokens.fontSize.caption }

// Inactive: surface800 bg, muted text, border
inactivePill: { backgroundColor: tokens.colors.surface800, borderRadius: tokens.borderRadius.lg, paddingHorizontal: tokens.spacing.md, paddingVertical: tokens.spacing.sm, borderWidth: 1, borderColor: tokens.colors.surface800 }
inactivePillText: { color: tokens.colors.text300, fontFamily: tokens.fontFamily.regular, fontSize: tokens.fontSize.caption }
```

### Toast Integration

`react-native-toast-message` is already configured in `App.tsx` with `<Toast config={toastConfig} />`. The `toastConfig` in `src/shared/components/toastConfig.tsx` defines the `error` type — a surface-800 card with red left border. This is appropriate for destructive status actions (Shelved/Abandoned). **Do not modify `toastConfig.tsx`** — use `type: 'error'` directly.

Pattern from `useLogout.ts` (established in Story 2.4):
```ts
import Toast from 'react-native-toast-message';
// ... (same cancelledRef + pendingUndoRef + setTimeout(4000) pattern)
```

### Haptic Feedback — Vibration API

No haptics library is installed. Use `Vibration` from `react-native` (built-in, no install needed):
```ts
import { Vibration } from 'react-native';

// Success (Completed): multi-step pattern
Vibration.vibrate([0, 50, 30, 100]);
// Android: vibrates in pattern [wait 0ms, vibrate 50ms, wait 30ms, vibrate 100ms]
// iOS: vibrates once (pattern is ignored on iOS — single vibration only)

// Light (Shelved/Abandoned): single short vibration
Vibration.vibrate(40);
```

Note: For richer iOS haptic patterns (UIImpactFeedbackGenerator) post-MVP, `react-native-haptic-feedback` can be added. For MVP, `Vibration` provides acceptable cross-platform feedback without a new native dependency.

### Query Key Addition

```ts
// src/shared/queryKeys.ts — add inside games:
export const queryKeys = {
  games: {
    all: (steamId: string) => ['games', steamId] as const,
    detail: (appId: number) => ['games', 'detail', appId] as const,
    hltb: (appId: number) => ['games', 'detail', appId, 'hltb'] as const,
    achievements: (appId: number) => ['games', 'detail', appId, 'achievements'] as const,
    annotation: (appId: number) => ['games', 'detail', appId, 'annotation'] as const, // NEW
  },
  // ...
};
```

### Architecture Compliance Checklist

- `user_annotations` is **persistent user data** → SQLite/Drizzle ✓ (not Redux, not MMKV, not TanStack Query for writes)
- Reading annotations reactively → TanStack Query (`queryKeys.games.annotation(appId)`) ✓
- Named exports only: `useBacklogStatus`, `StatusSelector`, `ConfettiOverlay`, `userAnnotations`, `UserAnnotation`, `NewUserAnnotation`, `BacklogStatus` ✓
- Tests co-located with source files ✓
- `Animated.View` uses `style=` only — never `className=` ✓
- `tokens.ts` for all `style=` props ✓
- No new Redux slices ✓
- No new native packages (Vibration built-in, Reanimated already installed) ✓
- No changes to `jest.config.js` needed ✓
- `queryKeys.games.all(steamId)` invalidated after status change → Library list filter reflects "Completed" status ✓
- Unix integer timestamps in SQLite (never ISO strings) ✓
- No network calls for annotation writes (user annotations are local-only) ✓
- UNDO pattern matches established `useLogout.ts` pattern ✓

### What Already Exists — Read First, Don't Recreate

| File | Current State | Action |
|---|---|---|
| `src/db/schema.ts` | `steamGames` + `achievementCache` tables | EXTEND — add `userAnnotations` table |
| `src/db/migrations/index.ts` | `m0000` + `m0001` | EXTEND — add `m0002` |
| `src/shared/queryKeys.ts` | `games.detail`, `games.hltb`, `games.achievements` | EXTEND — add `games.annotation` |
| `src/shared/components/toastConfig.tsx` | `error` type defined | READ ONLY — use `type: 'error'` |
| `src/features/auth/hooks/useLogout.ts` | `cancelledRef` + UNDO pattern | READ ONLY — replicate pattern |
| `src/App.tsx` | `<Toast config={toastConfig} />` already mounted | READ ONLY — Toast is already wired |
| `src/features/gameDetail/screens/GameDetailScreen.tsx` | Has `hltbContainer` + `achievementsContainer` | EXTEND — add `statusSelectorContainer` block |
| `src/res/tokens.ts` | All design tokens incl. `success`, `destructive`, `primary` | READ ONLY |
| `src/shared/hooks/reduxHooks.ts` | `useAppSelector`, `useAppDispatch` | READ ONLY |
| `src/data/QueryProvider.tsx` | exports `queryClient` | READ ONLY — import for `queryClient.invalidateQueries` |

### Path Aliases Reference

- `@features` → `src/features/`
- `@shared` → `src/shared/`
- `@db` → `src/db/`
- `@navigation` → `src/navigation/`
- `@res` → `src/res/`
- **`@data` alias does NOT exist** — use relative path `'../../../data/QueryProvider'` from `src/features/gameDetail/hooks/`

### Testing Patterns

**Hook test pattern for `useBacklogStatus`:**
```ts
// Module-level mocks
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
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn(), hide: jest.fn() },
}));
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Vibration: { vibrate: jest.fn() },
}));
jest.mock('@shared/hooks/reduxHooks', () => ({
  useAppSelector: jest.fn().mockReturnValue('test-steam-id'),
  useAppDispatch: jest.fn(),
}));

// QueryClient setup
let currentQueryClient: QueryClient;
const createWrapper = () => {
  currentQueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={currentQueryClient}>{children}</QueryClientProvider>
  );
};
afterEach(() => currentQueryClient?.clear());
```

**`useReducedMotion` mock pattern for ConfettiOverlay tests:**
```ts
// From Story 2.3 / 4.1 learnings — module-level let variable
let mockReducedMotion = false;

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/src/mock'),
  useReducedMotion: () => mockReducedMotion,
  useSharedValue: jest.fn((val) => ({ value: val })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((val) => val),
  withDelay: jest.fn((_, animation) => animation),
  runOnJS: jest.fn((fn) => fn),
}));

// In each test:
beforeEach(() => { mockReducedMotion = false; });

// Test reduced motion:
it('renders nothing when reducedMotion=true', () => {
  mockReducedMotion = true;
  const { queryAllByTestId } = render(<ConfettiOverlay visible onDone={jest.fn()} />);
  expect(queryAllByTestId('particle')).toHaveLength(0);
});
```

**Component test pattern for `StatusSelector`:**
```tsx
jest.mock('../hooks/useBacklogStatus');
import { useBacklogStatus } from '../hooks/useBacklogStatus';
const mockUseBacklogStatus = useBacklogStatus as jest.MockedFunction<typeof useBacklogStatus>;

// Default mock return:
mockUseBacklogStatus.mockReturnValue({
  currentStatus: 'Backlog',
  setStatus: jest.fn(),
  showConfetti: false,
  onConfettiDone: jest.fn(),
  isPending: false,
});
```

### Previous Story Learnings (applicable to 4.4)

- `@data` path alias does NOT exist — use relative path `'../../../data/QueryProvider'` when importing `queryClient` (confirmed in Story 4.3 notes)
- `Animated.View` must use `style=` only — `className=` unreliable with NativeWind v4 on Reanimated views
- `useReducedMotion` NOT in Reanimated mock — must be overridden in `jest.mock` factory via `jest.requireActual('react-native-reanimated/src/mock')` spread (NOT circular `require('react-native-reanimated/mock')`)
- Hook `retry: N` overrides `QueryClient.defaultOptions.retry: false` — use persistent `mockRejectedValue` (not Once) for error tests
- `afterEach(() => currentQueryClient?.clear())` in every test file with QueryClient — TanStack Query v5 has no `destroy()`; use `clear()` instead
- `useMigrations` migration format: `{ journal, migrations: { m0000: string, m0001: string, m0002: string } }` — key must match `"m" + idx.padStart(4, "0")`
- Stray `migrations/migrations.js` auto-generated by drizzle-kit — already in `.gitignore`
- `INSERT ... ON CONFLICT DO UPDATE` (upsert) is correct for single-row-per-game tables (same pattern as `achievement_cache`)
- Keychain import uses `import * as Keychain` namespace — but this story does NOT need Keychain (user annotations are local-only, no API key needed)
- `GameDetailScreen.test.tsx` mocks section components (returns null) — add mock for `StatusSelector` the same way

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4: Manual Backlog Status Assignment]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.1 Data Architecture] — user annotations in dedicated columns, never touched by sync engine
- [Source: _bmad-output/planning-artifacts/architecture.md#4.2 State Ownership Rules] — persistent user data → SQLite/Drizzle
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#11.3 Actions & Undo] — Toast/Snackbar + UNDO for destructive actions; Confetti for "Completed"
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#3.3] — "Shelve" interaction designed to feel positive/liberating
- [Source: src/shared/components/toastConfig.tsx] — existing `error` toast type
- [Source: src/features/auth/hooks/useLogout.ts] — UNDO pattern with cancelledRef + setTimeout
- [Source: src/db/schema.ts:35-43] — achievementCache upsert pattern to replicate for userAnnotations
- [Source: src/db/migrations/index.ts] — migration registry, add m0002
- [Source: src/features/gameDetail/screens/GameDetailScreen.tsx:153-166] — infoContainer structure for integration point
- [Source: src/res/tokens.ts] — success (#A3E635), destructive (#F87171) colors for status pills

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Story creation — 2026-03-11)

### Debug Log References

### Completion Notes List

### File List
