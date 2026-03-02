---
stepsCompleted: [step-01-init, step-02-context, step-03-starter, step-04-decisions, step-05-patterns, step-06-structure, step-07-validation, step-08-complete]
lastStep: 8
status: 'complete'
completedAt: '2026-03-02'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-BacklogCompanion-2026-02-23.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/project-context.md
workflowType: 'architecture'
project_name: 'BacklogCompanion'
user_name: 'm.lazarau'
date: '2026-02-24'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## 1. Project Context Analysis

### 1.1 Requirements Analysis

**Functional Scope:**

- **Authentication (FR-AUTH):** Steam OpenID integration, local session management.
- **Library Management (FR-LIB):** Large-scale data ingestion (potentially 500+ items), local search/sort/filter, offline persistence.
- **Game Details (FR-DETAIL):** Enrichment via 3rd party data (HLTB), achievement tracking, manual status workflow.
- **Recommendation Engine (FR-REC):** On-device logic + External AI (Gemini) integration.

### 1.2 UX & Performance Implications (NFRs)

- **"Insta-Load" (NFR-PERF-01):** The < 1.5s time-to-interactive requirement mandates a "Local-First" architecture where the UI *always* renders from a local cache (MMKV/SQLite) before attempting network sync.
- **Offline Grace (NFR-REL-01):** The app must be fully functional offline (read-only), requiring robust sync queues and optimistic UI updates for status changes.
- **Fluidity (NFR-PERF-02):** 60fps scrolling with heavy image assets (cover art) requires aggressive image caching and memoization (React Native "FlashList" or similar).

### 1.3 Project Scale & Complexity

**Complexity Level:** **Low-Medium**

-   **Data Volume:** Moderate (Users typically have <2000 games). feasible for full local storage.
-   **Real-time:** None. Data freshness is "minutes," not "milliseconds."
-   **Integration:** Medium complexity. Dependencies on Steam Web API (Rate limits), HLTB (Scraping/API?), and LLM (Latency management).
-   **State Management:** Complex. Needs to reconcile Local User State (Tags/Status) with Remote Steam State (Playtime/Achievements).

### 1.4 Architectural Drivers

The key drivers that will shape our decisions are:
1.  **Offline-First Data Strategy:** We cannot rely on live API calls for the "Home Screen." We need a local database that acts as the source of truth.
2.  **Rate Limit Management:** We need a smart sync engine to avoid hitting the 100k limit, especially with large libraries.
3.  **Asset Optimization:** Handling 500+ cover art images without jank is a primary UI challenge.

## 2. Technical Foundation

### 2.1 Starter Template Selection
We are proceeding with a **Custom High-Performance Architecture** rather than a generic starter template. This aligns with the "New Architecture" requirements of React Native 0.83+ and the specific performance needs of the application.

### 2.2 Core Technology Stack
- **Framework:** React Native 0.83.1 (New Architecture enabled via `nitro-modules`)
- **Language:** TypeScript (Strict Mode)
- **Navigation:** React Navigation v7 (Native Stack)
- **State Management:**
    - **Global/Session:** Redux Toolkit (`@reduxjs/toolkit`) + Redux Persist
    - **Server State:** TanStack Query v5 (`@tanstack/react-query`)
- **Persistence:** MMKV (`react-native-mmkv`) for high-performance synchronous storage.
- **Networking:** Axios / Fetch + `react-native-sse` for streaming AI responses.
- **Styling Strategy:** Hybrid approach using `StyleSheet` for core performance components and `NativeWind` (where applicable per UX spec) for rapid UI development, ensuring zero-runtime overhead.

### 2.3 Key Library Decisions
- **rnav-vision-camera:** Selected for future-proofing specific visual features (if needed).
- **Jest:** Standard testing framework.
- **ESLint/Prettier:** Standard code quality tools.

## 3. Core Architectural Decisions

### 3.1 Data Architecture

#### Local Database
- **Choice:** `@op-engineering/op-sqlite` v15.2.5
- **Rationale:** JSI-based (zero bridge overhead), fastest available SQLite for React Native, aligns with New Architecture / nitro-modules stance. Handles 500–2000 game libraries well within performance budget.

#### ORM / Query Layer
- **Choice:** Drizzle ORM (`drizzle-orm/op-sqlite`)
- **Rationale:** Official op-sqlite driver, TypeScript schema definitions, type-safe queries, migration hooks. Reactive data handled by TanStack Query v5 (already in stack) — no dependency on expo-sqlite's `useLiveQuery`.

#### Sync Strategy — Background Sync with Delta Detection
- On app open: render immediately from SQLite (meets NFR-PERF-01 < 1.5s)
- TanStack Query triggers background Steam API fetch after render
- Delta detection via `last_updated` timestamp comparison — only dirty rows written
- User annotations (status, tags, notes) live in dedicated columns, never touched by the sync engine
- Rate limit budget consumed only on changed records (protects 100k/day Steam limit)

#### Migration Approach
- **Choice:** Drizzle Kit generated SQL migrations
- `drizzle-kit generate` on schema changes → versioned `.sql` files in source control
- Bundled into app via Babel/Metro plugin
- `useMigrations` hook runs pending migrations on startup, tracks history in `__drizzle_migrations` table

#### Cascading Implications
- All Steam-sourced tables require a `last_synced_at` timestamp column for delta detection
- A `sync_status` enum (`idle | syncing | error`) is needed in Redux for UI feedback
- MMKV handles the fast-path cache (last known library snapshot) so the critical render path never waits on SQLite

### 3.2 Authentication & Security

#### Steam OpenID Flow
- **Choice:** System browser (`expo-web-browser` / `AuthSession` — bare RN compatible)
- **Rationale:** iOS/Android store guidelines discourage WKWebView/WebView for auth. System browser (SafariViewController / Chrome Custom Tabs) is the correct pattern.
- Deep link callback scheme: `backlogcompanion://auth/callback`
- Steam ID extracted from `openid.claimed_id` in the redirect URL

#### Secure Storage
- **Choice:** `react-native-keychain`
- Stores: Steam ID, Steam Web API key, user-provided Gemini API key
- MMKV is explicitly NOT used for secrets — fast-path cache only

#### API Key Strategy
- **MVP:** User provides their own Gemini API key, stored in Keychain
- **Post-MVP:** Backend proxy to hold Gemini key server-side (avoids exposing key, enables key rotation without app update)

#### Session Persistence
- No token refresh needed — Steam API keys do not expire
- `isAuthenticated` + `steamId` in Redux slice, persisted via Redux Persist → MMKV
- App launch: rehydrate Redux → route to library or auth screen

#### Data Encryption
- SQLite database not encrypted at rest (op-sqlite SQLCipher deferred — no PII stored, game backlog data is low sensitivity)
- Keychain handles all sensitive credential storage at OS level

### 3.3 API & Communication

#### Steam API — Rate Limit Strategy
- Full library sync throttled: skipped if `last_full_sync` < 30 minutes ago (MMKV)
- Incremental sync: `GetRecentlyPlayedGames` (5–10 games) for subsequent syncs
- Achievement data fetched on-demand only (game detail screen open)
- Exponential backoff with jitter on 429 responses → `sync_status: error` in Redux

#### HLTB Integration
- **Package:** `howlongtobeat-js` (most actively maintained unofficial package)
- **Pattern:** On-demand fetch triggered by game detail screen open
- **Caching:** Result stored in SQLite with `hltb_cached_at` timestamp; stale threshold TBD
- **Resilience:** Feature treated as best-effort enrichment — failures surface "—" gracefully, never block core app function

#### Gemini AI Integration
- **Pattern:** Pre-filtered library context
- **Compression layer:** `compressLibrary.ts` (already implemented) — behavioural grouping (Unplayed, Recent, High hours inactive), playtime-aware sampling (25 weighted games), semantic clustering by genre + developer. This is the canonical Gemini prompt input.
- **Streaming:** `react-native-sse` (already in stack)
- **Key storage:** User-provided key in Keychain (MVP); backend proxy post-MVP

#### Error Handling Standards
- Shared `AppError` discriminated union: `SteamError | HltbError | GeminiError | NetworkError`
- Steam sync failure: silent → `sync_status: error` in Redux → retry on next open
- HLTB failure: silent → returns `null` → UI shows "—"
- Gemini failure: surfaced → inline error with retry CTA
- Offline (NetInfo): requests skipped entirely → offline indicator shown
- No global error boundaries swallowing feature-level failures

### 3.4 Infrastructure & Deployment

#### Build System
- **Choice:** Custom CI — GitHub Actions with macOS runner
- iOS builds: Xcode via macOS GitHub Actions runner
- Android builds: Gradle via standard GitHub Actions ubuntu runner
- No Expo / EAS dependency
- App store submission: manual via Xcode Organizer / Google Play Console

#### Environment Configuration
- `react-native-config` for environment variables
- `.env.development` / `.env.production` — git-ignored
- `.env.example` committed as reference for required variables
- Sensitive values (API keys) always in Keychain at runtime, never in `.env` files
- GitHub Actions secrets store CI-time build variables

#### Monitoring & Crash Reporting
- **MVP:** Sentry (`@sentry/react-native`) — crash reporting, JS error tracking, performance traces
- Flipper for local development debugging
- **Post-MVP:** Expand Sentry performance monitoring as user base grows

### 3.5 Frontend Architecture

#### List Virtualization
- **Choice:** `@shopify/flash-list`
- **Rationale:** Purpose-built for large React Native lists; native recycling mechanism handles 500–2000 game covers without jank. Drop-in FlatList replacement. Directly addresses NFR-PERF-02 (60fps scrolling with heavy image assets).

#### Image Caching
- **Choice:** `@d11/react-native-fast-image`
- **Rationale:** Community fork of `react-native-fast-image` with explicit New Architecture / Fabric support. Native-backed caching via SDWebImage (iOS) and Glide (Android). Priority queue loads visible cover art first. Drop-in API replacement — essential for a cover-art-heavy grid UI on RN 0.83+.

#### Previously Decided (confirmed)
- State: Redux Toolkit (global) + TanStack Query v5 (server state)
- Navigation: React Navigation v7 Native Stack
- Styling: StyleSheet (perf-critical) + NativeWind (UI components)

## 4. Implementation Patterns & Consistency Rules

### 4.1 Naming Conventions

#### Database (Drizzle Schema)
- Tables: `snake_case` plural — `steam_games`, `user_annotations`
- Columns: `snake_case` — `app_id`, `last_synced_at`, `playtime_forever`
- TypeScript properties: `camelCase` via Drizzle mapping — `appId`, `lastSyncedAt`
- Foreign keys: `{table_singular}_id` — `steam_game_id`
- Indexes: `idx_{table}_{column}` — `idx_steam_games_app_id`

#### Code
- Components: `PascalCase.tsx` — `GameCard.tsx`, `LibraryScreen.tsx`
- Hooks: `camelCase` prefixed `use` — `useGameLibrary.ts`, `useSyncStatus.ts`
- Utilities/helpers: `camelCase` — `compressLibrary.ts`, `formatPlaytime.ts`
- Redux slices: `camelCase` + `Slice` suffix — `librarySlice.ts`, `authSlice.ts`
- Redux actions (RTK): `slice/actionName` — `library/setGameStatus`, `auth/setAuthenticated`
- Types/interfaces: `PascalCase` — `SteamGame`, `UserAnnotation`, `AppError`
- Constants: `SCREAMING_SNAKE_CASE` — `SYNC_THROTTLE_MS`, `MAX_HLTB_RETRIES`

### 4.2 State Ownership Rules

**All agents MUST follow this ownership matrix — no exceptions:**

| Data Type | Owner | Examples |
|---|---|---|
| Remote server state | TanStack Query | Steam library, HLTB data, Gemini responses |
| UI / session state | Redux | `isAuthenticated`, `steamId`, `sync_status`, active filters |
| Fast-path cold-start cache | MMKV | Last known library snapshot |
| Persistent user data | SQLite via Drizzle | Game status, tags, notes, settings |

**Anti-patterns (forbidden):**
- ❌ Server-fetched data stored in Redux slices
- ❌ MMKV used for anything except cold-start snapshot and non-sensitive session flags
- ❌ TanStack Query used for purely local UI state

### 4.3 Project Structure

```
src/
  features/
    library/          # Home screen, game grid, search/filter
      components/
      hooks/
      store/          # librarySlice.ts
      screens/
    gameDetail/       # Game detail, HLTB, achievements
      components/
      hooks/
      screens/
    recommendations/  # Gemini AI feature
      components/
      hooks/
      screens/
    auth/             # Steam OpenID, session
      components/
      hooks/
      store/          # authSlice.ts
      screens/
  shared/
    components/       # Reusable UI components
    hooks/            # Cross-feature hooks
    utils/            # compressLibrary.ts, formatPlaytime.ts, etc.
    types/            # Shared TypeScript types
    constants/        # SYNC_THROTTLE_MS, etc.
    queryKeys.ts      # TanStack Query key factory (single source of truth)
  db/
    schema.ts         # Drizzle table definitions
    migrations/       # Generated .sql files
    index.ts          # DB connection initialization
```

### 4.4 Format & Process Patterns

#### Date/Time Storage
- SQLite: Unix timestamps as `integer` — `integer('created_at', { mode: 'timestamp' })`
- Drizzle handles JS `Date` ↔ integer conversion automatically
- UI display: format from Unix timestamp at render time, never store formatted strings

#### TanStack Query Key Factory
All query keys defined in `src/shared/queryKeys.ts` — never inline string keys:
```ts
export const queryKeys = {
  games: {
    all: (steamId: string) => ['games', steamId] as const,
    detail: (appId: number) => ['games', 'detail', appId] as const,
    hltb: (appId: number) => ['games', 'detail', appId, 'hltb'] as const,
  },
  recommendations: {
    all: (steamId: string) => ['recommendations', steamId] as const,
  },
}
```

#### Export Pattern
- Named exports only — no default exports
- `export const GameCard = ...` ✅  |  `export default GameCard` ❌

#### Test File Location
- Co-located with source: `GameCard.test.tsx` next to `GameCard.tsx`
- Test utilities: `src/shared/testUtils/`

### 4.5 Enforcement Guidelines

**All AI agents MUST:**
- Follow the state ownership matrix — never put server state in Redux
- Use `queryKeys.ts` for all TanStack Query keys — never inline string keys
- Use named exports only
- Store dates as Unix integer timestamps
- Place tests co-located with source files
- Keep secrets out of `.env` files — Keychain only

**Agents MUST NOT:**
- Create new top-level `src/` folders outside the defined structure
- Add new Redux slices for server-fetched data
- Inline TanStack Query keys as strings or arrays
- Use default exports
- Store ISO date strings in SQLite

## 5. Project Structure & Boundaries

### 5.1 Requirements → Structure Mapping

| FR | Feature | Lives in |
|---|---|---|
| FR-AUTH | Steam OpenID, session | `src/features/auth/` |
| FR-LIB | Game library, sync engine, search/filter | `src/features/library/` |
| FR-DETAIL | Game detail, HLTB, achievements | `src/features/gameDetail/` |
| FR-REC | Gemini AI recommendations | `src/features/recommendations/` |

### 5.2 Complete Project Directory Tree

```
BacklogCompanion/
├── .env.example
├── .env.development              # git-ignored
├── .env.production               # git-ignored
├── .eslintrc.js
├── .gitignore
├── .prettierrc
├── app.json
├── babel.config.js               # includes Drizzle migration bundler plugin
├── drizzle.config.ts
├── index.js                      # RN entry point
├── metro.config.js
├── package.json
├── tsconfig.json
│
├── .github/
│   └── workflows/
│       ├── ios.yml               # macOS runner, Xcode build
│       └── android.yml           # ubuntu runner, Gradle build
│
├── android/                      # RN Android native project
├── ios/                          # RN iOS native project
│
└── src/
    ├── App.tsx                   # Root component, NavigationContainer, DB init
    │
    ├── db/
    │   ├── schema.ts             # Drizzle table definitions (steam_games, user_annotations)
    │   ├── index.ts              # op-sqlite connection + useMigrations bootstrap
    │   └── migrations/           # Generated .sql files (drizzle-kit output)
    │
    ├── features/
    │   ├── auth/
    │   │   ├── components/
    │   │   │   └── SteamLoginButton.tsx
    │   │   ├── hooks/
    │   │   │   └── useSteamAuth.ts
    │   │   ├── store/
    │   │   │   └── authSlice.ts  # isAuthenticated, steamId
    │   │   └── screens/
    │   │       └── AuthScreen.tsx
    │   │
    │   ├── library/
    │   │   ├── components/
    │   │   │   ├── GameCard.tsx
    │   │   │   ├── GameCard.test.tsx
    │   │   │   ├── LibraryGrid.tsx
    │   │   │   ├── SearchBar.tsx
    │   │   │   └── FilterSheet.tsx
    │   │   ├── hooks/
    │   │   │   ├── useGameLibrary.ts     # TanStack Query: SQLite read
    │   │   │   ├── useSteamSync.ts       # delta sync engine
    │   │   │   └── useLibraryFilters.ts
    │   │   ├── store/
    │   │   │   └── librarySlice.ts       # sync_status, active filters
    │   │   └── screens/
    │   │       └── LibraryScreen.tsx
    │   │
    │   ├── gameDetail/
    │   │   ├── components/
    │   │   │   ├── GameDetailHeader.tsx
    │   │   │   ├── HltbSection.tsx
    │   │   │   ├── AchievementsSection.tsx
    │   │   │   └── StatusSelector.tsx
    │   │   ├── hooks/
    │   │   │   ├── useGameDetail.ts      # TanStack Query: game + achievements
    │   │   │   └── useHltbData.ts        # on-demand HLTB fetch + cache
    │   │   └── screens/
    │   │       └── GameDetailScreen.tsx
    │   │
    │   └── recommendations/
    │       ├── components/
    │       │   ├── RecommendationCard.tsx
    │       │   └── RecommendationStream.tsx  # SSE streaming UI
    │       ├── hooks/
    │       │   └── useRecommendations.ts     # Gemini call via compressLibrary
    │       └── screens/
    │           └── RecommendationsScreen.tsx
    │
    ├── shared/
    │   ├── components/
    │   │   ├── ErrorBoundary.tsx
    │   │   ├── OfflineBanner.tsx
    │   │   └── LoadingSpinner.tsx
    │   ├── hooks/
    │   │   └── useNetworkStatus.ts       # NetInfo wrapper
    │   ├── utils/
    │   │   ├── compressLibrary.ts        # Gemini prompt compression
    │   │   ├── gameSimilarity.ts
    │   │   ├── gameMetadataCache.ts
    │   │   └── formatPlaytime.ts
    │   ├── types/
    │   │   ├── steam.types.ts
    │   │   ├── compressed-library.types.ts
    │   │   └── errors.types.ts           # AppError discriminated union
    │   ├── constants/
    │   │   └── index.ts                  # SYNC_THROTTLE_MS, etc.
    │   └── queryKeys.ts                  # TanStack Query key factory
    │
    └── navigation/
        ├── RootNavigator.tsx             # auth gate → library or auth screen
        └── types.ts                      # typed navigation params
```

### 5.3 Integration Boundaries & Data Flow

**App startup sequence:**
```
index.js → App.tsx
  → DB init (op-sqlite + useMigrations)
  → Redux rehydrate (Redux Persist → MMKV)
  → Auth check (isAuthenticated?)
    → Yes: LibraryScreen (render from SQLite immediately)
           → background: useSteamSync fires delta sync
    → No:  AuthScreen → Steam OpenID → authSlice.setAuthenticated
```

**External integration points:**

| Service | Entry point | Pattern |
|---|---|---|
| Steam Web API | `useSteamSync.ts` | TanStack Query mutation + delta sync |
| HLTB | `useHltbData.ts` | On-demand query, SQLite cache |
| Gemini API | `useRecommendations.ts` | SSE stream via `react-native-sse` |
| Keychain | `useSteamAuth.ts` | Read/write on auth events only |

## 6. Architecture Validation Results

### Coherence Validation ✅

All technology choices are New Architecture compatible. One issue found and resolved during validation: `react-native-fast-image` replaced with `@d11/react-native-fast-image` (Fabric-compatible community fork). All other decisions are mutually compatible.

### Requirements Coverage ✅

| FR / NFR | Coverage |
|---|---|
| FR-AUTH | Steam OpenID system browser + Keychain + authSlice + deep link |
| FR-LIB | op-sqlite + Drizzle + FlashList + delta sync engine |
| FR-DETAIL | GameDetailScreen + useHltbData + AchievementsSection |
| FR-REC | compressLibrary.ts → Gemini SSE streaming |
| NFR-PERF-01 (< 1.5s TTI) | MMKV cold-start + SQLite render-first pattern |
| NFR-REL-01 (offline) | Local-first, NetInfo gate, OfflineBanner |
| NFR-PERF-02 (60fps) | FlashList + @d11/react-native-fast-image |

### Implementation Readiness ✅

- All critical decisions documented with rationale
- State ownership matrix prevents the most common agent conflicts
- Naming conventions cover all code surfaces
- Project structure maps every FR to specific directories
- Integration boundaries and data flow clearly specified

### Gap Analysis

| Priority | Gap | Status |
|---|---|---|
| Critical | `react-native-fast-image` New Architecture incompatibility | ✅ Resolved — switched to `@d11/react-native-fast-image` |
| Deferred | HLTB stale threshold | Non-blocking — set during implementation |
| Deferred | First-run empty state UX | Non-blocking — UX concern, not architecture |

### Architecture Completeness Checklist

- [x] Project context and requirements analyzed
- [x] Scale and complexity assessed (Low-Medium)
- [x] Technology stack fully specified with versions
- [x] Data architecture: op-sqlite + Drizzle + delta sync
- [x] Authentication: Steam OpenID system browser + Keychain
- [x] API integrations: Steam, HLTB, Gemini — all patterns defined
- [x] Infrastructure: GitHub Actions CI, react-native-config, Sentry
- [x] Frontend: FlashList, @d11/react-native-fast-image confirmed
- [x] Implementation patterns: naming, state ownership, exports
- [x] Project structure: complete file tree with FR mapping
- [x] Integration boundaries and data flow documented

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**
**Confidence Level: High**

**Key Strengths:**
- Local-first architecture eliminates loading states on the critical render path
- State ownership matrix prevents the most common AI agent conflicts
- All third-party integrations have explicit failure/resilience patterns documented
- Feature-based structure keeps agent work boundaries clean and non-overlapping

**Areas for Future Enhancement (Post-MVP):**
- HLTB stale cache threshold (set during implementation)
- op-sqlite SQLCipher encryption (if user base grows and data sensitivity increases)
- Gemini backend proxy (for proper API key management at scale)
- Sentry performance monitoring expansion

### Implementation Handoff — First Steps

1. Initialize bare RN 0.83.1 project
2. Install and configure op-sqlite + Drizzle (define `src/db/schema.ts`)
3. Set up Redux store with Redux Persist + MMKV storage adapter
4. Implement `auth` feature (Steam OpenID deep link flow)
5. Build `library` feature (SQLite read → FlashList render → background delta sync)
