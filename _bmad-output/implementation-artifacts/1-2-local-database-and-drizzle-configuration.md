# Story 1.2: Local Database & Drizzle Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want op-sqlite and Drizzle ORM configured with the initial schema and a working migration pipeline,
So that subsequent epics can persist game data locally without any further database setup.

## Acceptance Criteria

**Given** the project scaffold from Story 1.1
**When** the database layer is configured
**Then** `@op-engineering/op-sqlite` and `drizzle-orm` are installed

**And** `src/db/schema.ts` defines the `steam_games` table with all required columns (`app_id`, `name`, `playtime_forever`, `playtime_2weeks`, `rtime_last_played`, `img_icon_url`, `header_image`, `hltb_main`, `hltb_extra`, `hltb_complete`, `hltb_cached_at`, `last_synced_at`) as named exports using Drizzle's `sqliteTable`

**And** `drizzle.config.ts` is configured in the project root and `npx drizzle-kit generate` produces a versioned initial migration SQL file in `src/db/migrations/`

**And** the Babel plugin (`babel-plugin-inline-import`) is configured to inline `.sql` files as strings, and a `src/db/migrations/index.ts` file bundles the generated migrations for runtime consumption

**And** `src/db/index.ts` opens the op-sqlite connection as a module-level singleton and exports the `db` Drizzle instance as a named export

**And** `useMigrations(db, migrations)` is called in `App.tsx` before any navigator or feature code renders, gating the UI on migration success

**And** migration history is tracked in the `__drizzle_migrations` internal table (managed by drizzle-orm automatically)

**And** `npx tsc --noEmit` reports zero TypeScript errors after all changes

## Tasks / Subtasks

- [x] Task 1: Install database dependencies (AC: op-sqlite and drizzle-orm installed)
  - [x] Subtask 1.1: Run `npm install @op-engineering/op-sqlite@15.2.5 drizzle-orm@0.45.1`
  - [x] Subtask 1.2: Run `npm install --save-dev drizzle-kit@0.31.9 babel-plugin-inline-import@3.0.0`
  - [x] Subtask 1.3: Run `cd ios && pod install && cd ..` to link the op-sqlite native module
  - [x] Subtask 1.4: Verify `package.json` lists `@op-engineering/op-sqlite` under dependencies and `drizzle-kit` + `babel-plugin-inline-import` under devDependencies

- [x] Task 2: Configure Babel for SQL file bundling (AC: Babel/Metro plugin bundles migrations)
  - [x] Subtask 2.1: Add `['inline-import', { extensions: ['.sql'] }]` to `babel.config.js` plugins array, OUTSIDE the `isTest` guard but BEFORE the `nativewind/babel` and `react-native-reanimated/plugin` entries (which remain inside the `!isTest` block and reanimated must stay last)
  - [x] Subtask 2.2: Add a `sql` module declaration so TypeScript accepts `.sql` imports — create `src/shared/types/sql.d.ts` declaring `declare module '*.sql' { const content: string; export default content; }`
  - [x] Subtask 2.3: Run Jest smoke test (`npx jest --passWithNoTests`) to confirm the new Babel plugin does not break the test environment

- [x] Task 3: Define Drizzle schema (AC: src/db/schema.ts with steam_games table)
  - [x] Subtask 3.1: Delete `src/db/.gitkeep`
  - [x] Subtask 3.2: Create `src/db/schema.ts` with `steamGames` table as a named export (see Dev Notes for exact column definitions)
  - [x] Subtask 3.3: Export the inferred `SteamGame` TypeScript type (`export type SteamGame = typeof steamGames.$inferSelect`) as a named export from `src/db/schema.ts`
  - [x] Subtask 3.4: Create `drizzle.config.ts` in the project root (see Dev Notes for content)

- [x] Task 4: Generate and bundle the initial migration (AC: drizzle-kit generate + bundled migrations)
  - [x] Subtask 4.1: Run `npx drizzle-kit generate` — this produces `src/db/migrations/0000_<name>.sql` and `src/db/migrations/meta/_journal.json`
  - [x] Subtask 4.2: Delete `src/db/migrations/.gitkeep`
  - [x] Subtask 4.3: Create `src/db/migrations/index.ts` that imports the SQL file via inline-import and exports the migrations array (see Dev Notes for exact pattern)
  - [x] Subtask 4.4: Confirm the migration SQL file contains a valid `CREATE TABLE steam_games` statement matching the schema

- [x] Task 5: Implement database connection module (AC: src/db/index.ts with named export)
  - [x] Subtask 5.1: Create `src/db/index.ts` opening the op-sqlite connection as a module-level singleton (see Dev Notes for exact pattern)
  - [x] Subtask 5.2: Export `db` as a named export (never default export)
  - [x] Subtask 5.3: Verify the `@db` path alias (configured in story 1.1) resolves `@db/index` correctly in TypeScript

- [x] Task 6: Wire useMigrations in App.tsx (AC: App.tsx initializes DB before navigator)
  - [x] Subtask 6.1: Import `useMigrations` from `drizzle-orm/op-sqlite/migrator`, `db` from `@db/index`, and `migrations` from `@db/migrations/index` in `App.tsx`
  - [x] Subtask 6.2: Call `useMigrations(db, migrations)` at the top of the `App` component and gate rendering on `success === true` (return `null` or a minimal loading view while migrations run)
  - [x] Subtask 6.3: Do NOT alter any existing provider structure (`Providers`, `AppNavigator`) — only add the DB init gate
  - [x] Subtask 6.4: `GestureHandlerRootView` must remain the outermost wrapper even during the migration loading state

- [x] Task 7: Verify and validate (AC: tsc + tests pass)
  - [x] Subtask 7.1: Run `npx tsc --noEmit` — confirm zero TypeScript errors
  - [x] Subtask 7.2: Run `npx eslint src/db/ --ext .ts,.tsx` — confirm zero lint errors
  - [x] Subtask 7.3: Write a unit test `src/db/schema.test.ts` that imports `steamGames` and asserts the `appId`, `name`, `playtimeForever`, `lastSyncedAt` fields exist on the inferred type (compile-time shape test)
  - [x] Subtask 7.4: Run `npx jest` — all tests pass (including the new schema type test)
  - [x] Subtask 7.5: Confirm `src/db/migrations/0000_*.sql` exists and is non-empty

## Dev Notes

### STOP: Read Before Writing Any Code

This story implements the **database layer only**. Do NOT:
- Add Redux store, TanStack Query, or MMKV (Story 1.3)
- Add navigation structure or screens (Story 1.4)
- Add the `user_annotations` table (Story 4.4 adds it via incremental migration)
- Restructure `App.tsx` beyond adding the `useMigrations` gate

### Package Versions (Pinned)

Use **exact versions** — do not upgrade without explicit approval:

| Package | Version | Install as |
|---|---|---|
| `@op-engineering/op-sqlite` | `15.2.5` | dependency |
| `drizzle-orm` | `0.45.1` | dependency |
| `drizzle-kit` | `0.31.9` | devDependency |
| `babel-plugin-inline-import` | `3.0.0` | devDependency |

```bash
npm install @op-engineering/op-sqlite@15.2.5 drizzle-orm@0.45.1
npm install --save-dev drizzle-kit@0.31.9 babel-plugin-inline-import@3.0.0
cd ios && pod install && cd ..
```

> **Android:** op-sqlite uses JSI (no Gradle changes needed beyond standard New Architecture setup which is already enabled via `newArchEnabled=true`).

### Schema Definition — src/db/schema.ts

Create `src/db/schema.ts` with the following **exact** definitions (named exports only):

```ts
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const steamGames = sqliteTable('steam_games', {
  // Primary key
  appId: integer('app_id').primaryKey(),

  // Game identity
  name: text('name').notNull(),

  // Playtime (minutes) — from Steam GetOwnedGames
  playtimeForever: integer('playtime_forever').notNull().default(0),
  playtime2weeks: integer('playtime_2weeks'),          // nullable: absent when 0

  // Last activity — used by delta sync engine (Story 3) for change detection
  rtimeLastPlayed: integer('rtime_last_played'),       // Unix timestamp from Steam

  // Cover art
  imgIconUrl: text('img_icon_url'),                    // small icon: img_icon_url from Steam
  headerImage: text('header_image'),                   // large cover: https://cdn.akamai.steamstatic.com/steam/apps/{appid}/header.jpg

  // HLTB cache — populated on-demand in Story 4.2, null until fetched
  hltbMain: real('hltb_main'),                         // Main Story hours
  hltbExtra: real('hltb_extra'),                       // Main + Extra hours
  hltbComplete: real('hltb_complete'),                 // Completionist hours
  hltbCachedAt: integer('hltb_cached_at', { mode: 'timestamp' }),  // when HLTB was fetched

  // REQUIRED by architecture for ALL Steam-sourced tables — delta sync
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }).notNull(),
});

// Inferred TypeScript types — used throughout the app instead of manual interfaces
export type SteamGame = typeof steamGames.$inferSelect;
export type NewSteamGame = typeof steamGames.$inferInsert;
```

**Architecture rules enforced here:**
- Table name: `snake_case` plural (`steam_games`) ✅
- Columns: `snake_case` in DB, `camelCase` in TS via Drizzle mapping ✅
- Timestamps: `integer` with `{ mode: 'timestamp' }` — never ISO strings ✅
- `last_synced_at` present on all Steam tables ✅
- Named exports only ✅

**Why `headerImage` is stored (not computed):** The delta sync engine (Story 3) receives game data from `GetOwnedGames` with `include_appinfo=1`. Storing `header_image` alongside the game row means the library screen can render cover art from SQLite with zero additional API calls. The URL pattern `https://cdn.akamai.steamstatic.com/steam/apps/{appid}/header.jpg` is a fallback but not guaranteed stable.

**Why `user_annotations` is NOT here:** Story 4.4 adds it via an incremental Drizzle migration. This is by design — the migration pipeline is proven working before the second table is introduced. The architecture explicitly states: *"The `user_annotations` table is added via incremental migration in Story 4.4 when first needed."*

### Drizzle Config — drizzle.config.ts (project root)

Create `drizzle.config.ts` in the **repository root** (same level as `package.json`):

```ts
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'expo', // use 'expo' for React Native SQLite-based drivers
} satisfies Config;
```

> **Note:** drizzle-kit v0.31.x uses `dialect: 'sqlite'` with `driver: 'expo'` for React Native SQLite targets including op-sqlite. If `drizzle-kit generate` fails with a driver error, try `driver: 'op-sqlite'` or omit the `driver` field — consult the `drizzle-kit@0.31.9` changelog.

After creating this file, run:
```bash
npx drizzle-kit generate
```

This produces `src/db/migrations/0000_<hash>_initial.sql` (contains `CREATE TABLE steam_games`) and `src/db/migrations/meta/_journal.json`.

### SQL Bundling — babel.config.js Update

Add `babel-plugin-inline-import` to `babel.config.js`. The plugin inlines `.sql` files as raw strings so Metro can bundle them. It must appear **outside** the `isTest` conditional (it is safe in tests) and **before** the reanimated plugin.

```js
module.exports = (api) => {
  const isTest = api.env('test');

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@features': './src/features',
            '@shared': './src/shared',
            '@db': './src/db',
            '@navigation': './src/navigation',
          },
        },
      ],
      // Inline .sql files as strings — needed for Drizzle migration bundling
      ['inline-import', { extensions: ['.sql'] }],
      ...(isTest
        ? []
        : [
            'nativewind/babel',
            'react-native-reanimated/plugin', // MUST be last
          ]),
    ],
  };
};
```

> ⚠️ `react-native-reanimated/plugin` must remain the **last** plugin (inside the `!isTest` block). Do not change its position.

### TypeScript Declaration for .sql Imports

Create `src/shared/types/sql.d.ts`:

```ts
// Allows TypeScript to accept `import migration from './0000_initial.sql'`
// babel-plugin-inline-import transforms these to raw strings at build time
declare module '*.sql' {
  const content: string;
  export default content;
}
```

### Database Connection — src/db/index.ts

```ts
import { drizzle } from 'drizzle-orm/op-sqlite';
import { open } from '@op-engineering/op-sqlite';
import * as schema from './schema';

// Module-level singleton — opened once, shared across the app
// Database file lives in the app's Documents directory (managed by op-sqlite)
const sqlite = open({ name: 'backlogcompanion.db' });

// Drizzle instance with schema for full type inference on queries
export const db = drizzle(sqlite, { schema });
```

**Rules:**
- `open()` is called at **module level** (not inside a React hook or component) — this is intentional. op-sqlite is synchronous and has no async open cost.
- Named export only: `export const db` ✅
- Never import `db` from anywhere except `@db/index`

### Migrations Bundle — src/db/migrations/index.ts

After running `drizzle-kit generate`, create `src/db/migrations/index.ts` to bundle the generated SQL:

```ts
// Auto-managed: update this file whenever `npx drizzle-kit generate` adds a new migration
// Each entry maps to a generated .sql file — do NOT edit the SQL files manually
import m0000 from './0000_initial.sql';

export const allMigrations = [m0000];
```

> **When new migrations are added** (e.g., Story 4.4 adds `user_annotations`): run `drizzle-kit generate`, then add the new import and append to `allMigrations`. The `useMigrations` hook tracks which migrations have already run via `__drizzle_migrations` — safe to append.

> **Exact useMigrations signature:** Verify against drizzle-orm v0.45.1 source/docs. The hook signature for op-sqlite may be:
> ```ts
> useMigrations(db: OPSQLiteDatabase<Schema>, migrations: string[])
> // OR
> useMigrations(db, { migrations: allMigrations })
> ```
> Consult `node_modules/drizzle-orm/op-sqlite/migrator.d.ts` for the ground truth at install time.

### App.tsx Changes

The current `App.tsx` (story 1.1):
```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';
import { Providers } from './data/QueryProvider';
import '../global.css';

const rootStyle = { flex: 1 } as const;

export function App() {
  return (
    <GestureHandlerRootView style={rootStyle}>
      <Providers>
        <AppNavigator />
      </Providers>
    </GestureHandlerRootView>
  );
}
```

**After story 1.2** — add `useMigrations` gate. Gate the inner content on `success`, keep `GestureHandlerRootView` as the outermost wrapper at all times:

```tsx
import { useMigrations } from 'drizzle-orm/op-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';
import { Providers } from './data/QueryProvider';
import { db } from '@db/index';
import { allMigrations } from '@db/migrations/index';
import '../global.css';

const rootStyle = { flex: 1 } as const;

export function App() {
  const { success, error } = useMigrations(db, allMigrations);

  // DB migration failed — surface crash for Sentry (wired in Story 1.5)
  if (error) {
    throw error;
  }

  return (
    <GestureHandlerRootView style={rootStyle}>
      {success ? (
        <Providers>
          <AppNavigator />
        </Providers>
      ) : null}
    </GestureHandlerRootView>
  );
}
```

**Rules for this change:**
- Do NOT modify `AppNavigator`, `Providers`, or any prototype-era files
- `success` is `false` on first run while migrations execute (fast — sub-50ms for empty DB)
- Returning `null` inside `GestureHandlerRootView` is safe — the gesture handler remains active
- The `throw error` path is intentional: it will cause a red screen in dev and a crash in prod, surfacing migration failures loudly until Sentry is added in Story 1.5

### Testing Approach

Write `src/db/schema.test.ts`:

```ts
import { steamGames } from './schema';
import type { SteamGame } from './schema';

describe('steamGames schema', () => {
  it('has required columns defined', () => {
    const columns = Object.keys(steamGames);
    expect(columns).toContain('appId');
    expect(columns).toContain('name');
    expect(columns).toContain('playtimeForever');
    expect(columns).toContain('lastSyncedAt');
    expect(columns).toContain('hltbCachedAt');
  });

  it('SteamGame type is correctly inferred (compile-time check)', () => {
    // This test exists purely to catch type regression — if this compiles, types are correct
    const _typeCheck: SteamGame = {
      appId: 123,
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
    };
    expect(_typeCheck.appId).toBe(123);
  });
});
```

> **Jest mock for op-sqlite:** op-sqlite uses JSI and will throw in Jest (no native module). Add a manual mock at `__mocks__/@op-engineering/op-sqlite.ts`:
> ```ts
> export const open = jest.fn(() => ({
>   execute: jest.fn(),
>   close: jest.fn(),
> }));
> ```
> Also mock `drizzle-orm/op-sqlite` if the `useMigrations` hook causes issues in tests — the schema test file should avoid importing `src/db/index.ts` to sidestep the native module entirely.

### Project Structure Notes

**Files created/modified by this story:**

```
src/
  db/
    .gitkeep          → DELETE (replaced by real files)
    schema.ts         → CREATE: steamGames table definition
    index.ts          → CREATE: op-sqlite connection + drizzle instance
    migrations/
      .gitkeep        → DELETE (replaced by generated files)
      0000_*.sql      → GENERATED by drizzle-kit (do not edit manually)
      meta/
        _journal.json → GENERATED by drizzle-kit
      index.ts        → CREATE: migration bundle for runtime
  shared/
    types/
      sql.d.ts        → CREATE: TypeScript declaration for .sql imports
  App.tsx             → MODIFY: add useMigrations gate (minimal change)

drizzle.config.ts     → CREATE: project root (alongside package.json)
babel.config.js       → MODIFY: add inline-import plugin
package.json          → MODIFY: new dependencies added
ios/Podfile.lock      → UPDATED: after pod install (new op-sqlite pod)
```

**Alignment with architecture spec:**
- `src/db/schema.ts` = architecture spec section 5.2 ✅
- `src/db/index.ts` = architecture spec section 5.2 ✅
- `src/db/migrations/` = architecture spec section 3.1 ✅
- `drizzle.config.ts` = architecture spec section 5.2 ✅
- State ownership: SQLite via Drizzle = persistent user data ✅ (architecture spec section 4.2)

**Detected cross-story dependency:**
- Story 1.3 will import `db` from `@db/index` for query key factory setup
- Story 3.x will import `steamGames` schema and `SteamGame` type from `@db/schema`
- Story 4.2 will use `hltbMain`, `hltbExtra`, `hltbComplete`, `hltbCachedAt` columns
- Story 4.4 will add `user_annotations` via `npx drizzle-kit generate` + append to migrations index

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#3.1 Data Architecture — Local Database]
- [Source: _bmad-output/planning-artifacts/architecture.md#3.1 Migration Approach]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.1 Naming Conventions — Database]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.2 State Ownership Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#4.4 Date/Time Storage]
- [Source: _bmad-output/planning-artifacts/architecture.md#5.2 Complete Project Directory Tree]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2: Local Database & Drizzle Configuration]
- [Source: _bmad-output/implementation-artifacts/1-1-project-scaffold-and-core-dependencies.md#Project Structure Notes — dependency order]
- [Source: src/types/steam.types.ts — SteamGame, SteamAppData interfaces for schema derivation]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Story creation — 2026-03-04)
claude-sonnet-4-6 (Implementation — 2026-03-04)

### Debug Log References

- `useMigrations` actual import path is `drizzle-orm/op-sqlite/migrator` (not `drizzle-orm/op-sqlite`). Confirmed from `node_modules/drizzle-orm/op-sqlite/migrator.d.ts`.
- `useMigrations` takes `{ journal, migrations: Record<'m0000'|..., string> }` format — key is `m` + zero-padded idx (e.g., `m0000`), not tag name. Confirmed from migrator source.
- `App.test.tsx` had pre-existing broken Jest configuration: missing mocks for `react-native-gesture-handler`, `react-native-mmkv`, `react-native-config`, CSS files, and `react-native-toast-message`. Fixed by adding `setupFiles`, `moduleNameMapper`, and updating `transformIgnorePatterns` in `jest.config.js`.
- Added `drizzle-orm/op-sqlite/migrator` mock for tests so `useMigrations` returns `{ success: true }` without executing real SQLite operations.

### Completion Notes List

- Installed all 4 pinned packages: `@op-engineering/op-sqlite@15.2.5`, `drizzle-orm@0.45.1`, `drizzle-kit@0.31.9`, `babel-plugin-inline-import@3.0.0`.
- Pod install completed: 98 total pods installed.
- `babel.config.js`: Added `inline-import` plugin outside `isTest` guard, before NativeWind/Reanimated.
- `src/shared/types/sql.d.ts`: Created TypeScript declaration for `*.sql` module imports.
- `src/db/schema.ts`: Defined `steamGames` table with all 12 columns, `SteamGame` and `NewSteamGame` types.
- `drizzle.config.ts`: Created in project root with `dialect: 'sqlite'` (no driver field — correct for op-sqlite).
- `src/db/migrations/0000_curvy_starjammers.sql`: Generated by `drizzle-kit generate` — 12-column `CREATE TABLE steam_games`.
- `src/db/migrations/index.ts`: Bundles journal + migrations object with `m0000` key per drizzle migrator API.
- `src/db/index.ts`: Module-level singleton `open()` + named export `db`.
- `src/App.tsx`: Added `useMigrations` gate — GestureHandlerRootView outermost, `ActivityIndicator` shown while migrating, inner content gated on `success`.
- `src/db/schema.test.ts`: 3 tests — TS property names, SQL column name mapping, compile-time type check.
- `jest.config.js`: Fixed pre-existing broken test infrastructure (gesture handler setup, MMKV mock, config mock, CSS mock, migrator mock, op-sqlite mock, transformIgnorePatterns additions).
- All validation passed: `tsc --noEmit` = 0 errors, `eslint src/db/` = 0 errors, `jest` = 4 tests passing.

### File List

- `package.json` — modified: added runtime and dev dependencies
- `ios/Podfile.lock` — updated: pod install after op-sqlite native module
- `babel.config.js` — modified: added inline-import plugin
- `jest.config.js` — modified: fixed pre-existing broken test infrastructure
- `drizzle.config.ts` — created: Drizzle Kit config (project root)
- `src/App.tsx` — modified: added useMigrations gate
- `src/db/schema.ts` — created: steamGames table + SteamGame/NewSteamGame types
- `src/db/index.ts` — created: op-sqlite singleton + db named export
- `src/db/migrations/0000_curvy_starjammers.sql` — generated: initial CREATE TABLE migration
- `src/db/migrations/meta/_journal.json` — generated: drizzle-kit migration journal
- `src/db/migrations/index.ts` — created: migration bundle (journal + SQL map)
- `src/db/schema.test.ts` — created: schema column presence + type inference tests
- `src/shared/types/sql.d.ts` — created: TypeScript declaration for *.sql imports
- `__mocks__/@op-engineering/op-sqlite.ts` — created: Jest mock for native op-sqlite module
- `__mocks__/react-native-mmkv/index.ts` — created: Jest mock for MMKV native module
- `__mocks__/react-native-config.ts` — created: Jest mock for react-native-config
- `__mocks__/drizzle-orm/op-sqlite/migrator.ts` — created: Jest mock for useMigrations hook
- `__mocks__/fileMock.ts` — created: Jest stub for CSS files

## Senior Developer Review (AI)

**Reviewer:** claude-sonnet-4-6 | **Date:** 2026-03-04 | **Outcome:** Changes Requested → Fixed

### Action Items (all resolved)

- [x] [High] Package versions used `^` caret ranges instead of the story-required pinned versions — changed to `~` (patch-only) per user preference
- [x] [High] Stray `src/db/migrations/migrations.js` auto-generated by drizzle-kit not documented or deleted — deleted and added to `.gitignore`
- [x] [High] `@op-engineering/op-sqlite` Jest mock existed but was not wired in `jest.config.js` `moduleNameMapper` — wired explicitly
- [x] [Med] `drizzle.config.ts` used `driver: 'expo'` (wrong driver for op-sqlite) — removed `driver` field entirely
- [x] [Med] Schema test checked JS property names but not SQL column name mappings — added new test asserting all 12 `column.name` values
- [x] [Med] `App.tsx` rendered `null` during migration causing blank white screen — replaced with `ActivityIndicator`
- [x] [Med] `migrations/index.ts` had no explanation of `m0000` key naming convention — added inline documentation
- [x] [Low] `sql.d.ts` comment referenced `0000_initial.sql` instead of actual filename — corrected

## Change Log

- 2026-03-04: Story 1.2 created by claude-sonnet-4-6. Full context analysis from architecture, epics, story 1.1 learnings, and prototype steam types.
- 2026-03-04: Story 1.2 implemented by claude-sonnet-4-6. Database layer complete: op-sqlite + Drizzle ORM configured, schema defined, migration generated and bundled, App.tsx gated on migration success. Pre-existing Jest infrastructure issues resolved. All ACs satisfied, 4 tests passing, 0 TypeScript errors.
- 2026-03-04: Code review by claude-sonnet-4-6. 3 High, 4 Medium, 1 Low issues found and fixed. Package pinning tightened to tilde ranges, stray migrations.js deleted, op-sqlite mock wired, drizzle config driver removed, schema test enhanced with SQL column assertions, loading indicator added to App.tsx, migration index documented.
