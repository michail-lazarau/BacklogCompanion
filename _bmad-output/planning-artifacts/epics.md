---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-BacklogCompanion-2026-02-23.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/validation-report-prd-2026-03-02.md
---

# BacklogCompanion - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for BacklogCompanion, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR-AUTH-01: User can sign in using their Steam credentials via OpenID.
FR-AUTH-02: User can view their Steam profile summary (Avatar, Persona Name, Level) on a dashboard.
FR-AUTH-03: User can manually logout, clearing local session data.
FR-LIB-01: System fetches the user's full owned game library from Steam Web API.
FR-LIB-02: System fetches and displays total playtime for each game.
FR-LIB-03: User can filter library by status: "Unplayed" (0 hours), "In Progress" (>0 hours), "Completed" (Manual Tag).
FR-LIB-04: User can sort library by: Alphabetical, Playtime (Asc/Desc), Release Date. *(Metacritic Score sort deferred to Phase 2)*
FR-LIB-05: User can search for a game by title with instant local results.
FR-DETAIL-01: User can view a detailed screen for any specific game.
FR-DETAIL-02: System displays "How Long To Beat" estimates (Main Story, Main + Extra, Completionist).
FR-DETAIL-03: System displays achievement progress (e.g., "15/50 unlocked").
FR-DETAIL-04: User can manually assign a "Backlog Status" (Backlog, Playing, Completed, Abandoned, Shelved).
FR-REC-01: System identifies and displays a "Quick Win" recommendation (Metacritic where available, otherwise Steam positive review % ≥ 75% + Short Playtime + Unplayed).
FR-REC-02: System identifies a "Forgotten Gem" recommendation (Metacritic where available, otherwise Steam positive review % ≥ 75% + Purchased >1 year ago + Unplayed).
FR-REC-03: Every recommendation must include a text rationale (e.g., "Because you liked Hades...").

### NonFunctional Requirements

NFR-PERF-01: App must be interactive (clickable) within 1.5 seconds of cold start on an iPhone 15 / Pixel 7 equivalent.
NFR-PERF-02: The game list must scroll at a consistent 60fps (or 120fps on ProMotion devices), even with 500+ items and images loading.
NFR-PERF-03: Local search results must update in <100ms after keystroke.
NFR-REL-01: If the Steam API fails or device is offline, the app must silently fall back to cached data without showing error modals (toast notification only if specific action fails).
NFR-REL-02: App must handle OpenID session expiry gracefully, prompting for re-login only when absolutely necessary.
NFR-USE-01: Primary navigation elements should be reachable within the "thumb zone" for standard smartphones.
NFR-ACC-01: App must respect system font size settings (Dynamic Type — critical for accessibility).
NFR-ACC-02: App must support system Dark Mode (default for "Gamers").

### Additional Requirements

**From Architecture:**
- No starter template — custom React Native 0.83.1 project (New Architecture / Nitro Modules enabled)
- Local-First data strategy: op-sqlite as the source of truth; MMKV for cold-start snapshot cache
- Drizzle ORM with Drizzle Kit migrations; migrations bundled via Babel/Metro plugin and run on startup via `useMigrations`
- All Steam-sourced tables require `last_synced_at` timestamp column; `sync_status` enum in Redux
- Background Sync with Delta Detection: render from SQLite immediately on app open, then trigger Steam API delta sync in background
- Full library sync throttled: skipped if `last_full_sync` < 30 minutes ago (MMKV); incremental sync via `GetRecentlyPlayedGames` thereafter
- Authentication via system browser (SafariViewController / Chrome Custom Tabs) with deep link callback `backlogcompanion://auth/callback`
- Secure credential storage via `react-native-keychain` (Steam ID, Steam Web API key, Gemini API key)
- MMKV must NOT be used for secrets — fast-path cache only
- HLTB integration via `howlongtobeat-js`: on-demand fetch on game detail open, result cached in SQLite with `hltb_cached_at`; failures surface "—" gracefully
- Gemini AI integration: pre-filtered via `compressLibrary.ts`, streamed via `react-native-sse`; user-provided API key stored in Keychain (MVP)
- Shared `AppError` discriminated union: `SteamError | HltbError | GeminiError | NetworkError`
- CI/CD via GitHub Actions (macOS runner for iOS, ubuntu runner for Android); no Expo / EAS dependency
- Sentry (`@sentry/react-native`) for crash reporting and error tracking from day one
- FlashList (`@shopify/flash-list`) for list virtualization (60fps with 500–2000 games)
- `@d11/react-native-fast-image` for native-backed image caching (SDWebImage / Glide)
- State ownership matrix must be followed: Remote state → TanStack Query; UI/session state → Redux; Cold-start cache → MMKV; Persistent user data → SQLite via Drizzle
- Named exports only; no default exports; co-located test files; Unix timestamps in SQLite; `queryKeys.ts` as single source of truth for TanStack Query keys

**From UX Design:**
- Bottom Tab Bar navigation with 3 tabs: Home (Concierge Dashboard), Library (Management), Profile (Settings/Stats)
- Hybrid Home screen: Netflix-style hero "Quick Win" card + horizontal carousels (e.g., "Forgotten Gems")
- "The Deck" discovery mode: swipe-based binary decision interface (Left = Shelve/Skip, Right = Play/Save), triggered via "Help Me Choose" CTA
- GameCard component with 3 variants: Hero (3:4, full bleed art), Deck (full screen, simplified), List (compact row)
- Omni-Pill metadata tag: color-coded HLTB duration with glassmorphism style on top of game art
- Concierge Bubble component: AI explanation text with Sparkle icon (distinct from game data)
- Skeleton shimmer loading states (no generic spinners); "Cinema Mode" fallback for long syncs (>3s)
- Confetti/particle animation for game "Completed" milestone
- Toast/Snackbar with UNDO for destructive actions (Shelve/Abandon) — no confirmation dialogs
- Haptic feedback for key interactions (marking Complete, Shelving a game)
- Deep linking support for `steam://` protocol to launch games from device
- WCAG AA (4.5:1) contrast compliance on all dark backgrounds
- Dynamic Type: all text containers expand vertically; fixed heights forbidden on text elements
- `prefers-reduced-motion` support: animations disabled when system setting is active
- Swipe gestures supplemented by visible tap buttons (accessibility for motor impairments)
- NativeWind (Tailwind-for-RN) styling engine; react-native-reanimated for 60fps micro-interactions
- react-native-vector-icons for iconography
- Color palette: Surface-900 (#171A21), Surface-800 (#2A475E), Primary (#66C0F4), Success (#A3E635), Destructive (#F87171)
- Typography: Rubik typeface; H1 32px, H2 24px, Body 16px, Caption 12px uppercase
- Phone Portrait Mode only for MVP (no tablet optimization)

### FR Coverage Map

FR-AUTH-01: Epic 2 — Steam OpenID sign-in flow
FR-AUTH-02: Epic 2 — Steam profile summary display
FR-AUTH-03: Epic 2 — Logout and local session clearing
FR-LIB-01: Epic 3 — Steam library ingestion via API
FR-LIB-02: Epic 3 — Playtime display per game
FR-LIB-03: Epic 3 — Library status filtering
FR-LIB-04: Epic 3 — Library sorting options
FR-LIB-05: Epic 3 — Instant local game search
FR-DETAIL-01: Epic 4 — Game detail screen
FR-DETAIL-02: Epic 4 — HLTB estimates display
FR-DETAIL-03: Epic 4 — Achievement progress display
FR-DETAIL-04: Epic 4 — Manual backlog status assignment
FR-REC-01: Epic 5 — "Quick Win" recommendation
FR-REC-02: Epic 5 — "Forgotten Gem" recommendation
FR-REC-03: Epic 5 — AI recommendation rationale

## Epic List

### Epic 1: Project Foundation & Infrastructure
The development team has a working, deployable React Native application shell: project scaffold initialized (RN 0.83.1 New Architecture), local database configured (op-sqlite + Drizzle + migrations), Redux store with MMKV persistence wired up, bottom tab navigation structure in place, CI/CD pipelines running (GitHub Actions, iOS + Android), Sentry monitoring active, and all core dependencies installed and verified.
**FRs covered:** *(none directly — enables all subsequent epics)*

### Epic 2: Steam Authentication & User Profile
Users can sign in with their Steam account through a secure system browser flow, view their Steam profile summary (avatar, display name, level), and sign out — with session persisted across app restarts.
**FRs covered:** FR-AUTH-01, FR-AUTH-02, FR-AUTH-03

### Epic 3: Steam Library — Sync, Browse & Search
Users can see their complete Steam game library with playtime data, filter by status (Unplayed / In Progress / Completed), sort by multiple criteria, and search instantly. The library is always available offline, loading from local cache with a silent background delta sync.
**FRs covered:** FR-LIB-01, FR-LIB-02, FR-LIB-03, FR-LIB-04, FR-LIB-05

### Epic 4: Game Details & Personal Backlog Tracking
Users can tap any game to view enriched details — HLTB time estimates, achievement progress — and assign a personal backlog status (Backlog / Playing / Completed / Abandoned / Shelved), with satisfying haptic and visual feedback on key interactions.
**FRs covered:** FR-DETAIL-01, FR-DETAIL-02, FR-DETAIL-03, FR-DETAIL-04

### Epic 5: AI-Powered Recommendations
Users receive personalized game recommendations from their own library — "Quick Win" and "Forgotten Gem" — each with a transparent AI rationale streamed in real time via the Concierge Dashboard.
**FRs covered:** FR-REC-01, FR-REC-02, FR-REC-03

---

## Epic 1: Project Foundation & Infrastructure

The development team has a working, deployable React Native application shell: project scaffold initialized (RN 0.83.1 New Architecture), local database configured (op-sqlite + Drizzle + migrations), Redux store with MMKV persistence wired up, bottom tab navigation structure in place, CI/CD pipelines running (GitHub Actions, iOS + Android), Sentry monitoring active, and all core dependencies installed and verified.

### Story 1.1: Project Scaffold & Core Dependencies

As a **developer**,
I want an initialized React Native 0.83.1 project with New Architecture enabled, TypeScript strict mode, and all core UI/utility dependencies installed and verified,
So that the team has a clean, buildable foundation with the correct structure before any feature work begins.

**Acceptance Criteria:**

**Given** a new repository
**When** the project is initialized
**Then** `react-native` 0.83.1 with New Architecture (nitro-modules / bridgeless) is configured
**And** TypeScript strict mode is enabled in `tsconfig.json`
**And** NativeWind, react-native-reanimated, react-native-vector-icons, @shopify/flash-list, @d11/react-native-fast-image, @gorhom/bottom-sheet, howlongtobeat-js, and react-native-sse are installed and peer-dependency compatible
**And** ESLint and Prettier are configured with project conventions
**And** `react-native-config` is installed with a committed `.env.example` listing all required variable keys
**And** the full `src/` directory structure matches the architecture spec (features/, shared/, db/, navigation/)
**And** the app builds and runs on iOS Simulator and Android Emulator with no errors

### Story 1.2: Local Database & Drizzle Configuration

As a **developer**,
I want op-sqlite and Drizzle ORM configured with the initial schema and a working migration pipeline,
So that subsequent epics can persist game data locally without any further database setup.

**Acceptance Criteria:**

**Given** the project scaffold from Story 1.1
**When** the database layer is configured
**Then** `@op-engineering/op-sqlite` and `drizzle-orm` are installed
**And** `src/db/schema.ts` defines the `steam_games` table with all required columns (`app_id`, `last_synced_at`, `playtime_forever`, `hltb_cached_at`, etc.) *(The `user_annotations` table is added via incremental migration in Story 4.4 when first needed)*
**And** `drizzle.config.ts` is configured and `drizzle-kit generate` produces a versioned initial migration in `src/db/migrations/`
**And** the Babel/Metro plugin bundles migrations into the app bundle
**And** `src/db/index.ts` opens the op-sqlite connection and exposes it as a named export
**And** `useMigrations` runs pending migrations on app startup and tracks history in `__drizzle_migrations`
**And** `App.tsx` initializes the DB connection before rendering the navigator

### Story 1.3: Redux Store, MMKV & State Foundation

As a **developer**,
I want the Redux store configured with MMKV persistence, initial slices defined, and TanStack Query wired up,
So that all subsequent features can immediately use the established state ownership pattern without re-architecting.

**Acceptance Criteria:**

**Given** the project scaffold from Story 1.1
**When** the state layer is configured
**Then** `@reduxjs/toolkit`, `redux-persist`, `react-native-mmkv`, and `react-native-keychain` are installed
**And** Redux store uses MMKV as the Redux Persist storage adapter
**And** `authSlice.ts` (`isAuthenticated: boolean`, `steamId: string | null`) is created as a named export
**And** `librarySlice.ts` (`sync_status: 'idle' | 'syncing' | 'error'`, `activeFilter: string | null`, `activeSort: string`) is created as a named export
**And** `src/shared/queryKeys.ts` defines the query key factory as a named export (games.all, games.detail, games.hltb, recommendations.all)
**And** `src/shared/constants/index.ts` exports `SYNC_THROTTLE_MS` and other project constants
**And** `TanStack Query v5` `QueryClientProvider` and `Redux Provider` wrap the app in `App.tsx`
**And** Redux state survives an app restart (Redux Persist rehydration confirmed)

### Story 1.4: Navigation Shell & App Entry Point

As a **developer**,
I want the full navigation structure in place with an auth gate and three placeholder tab screens,
So that routing logic is established and any screen can be wired up in subsequent epics without touching the navigator.

**Acceptance Criteria:**

**Given** the Redux store from Story 1.3
**When** the navigation shell is configured
**Then** React Navigation v7 (native-stack + bottom-tabs) is installed
**And** `src/navigation/RootNavigator.tsx` gates on `isAuthenticated` from Redux: authenticated users see the tab navigator, unauthenticated users see the AuthScreen
**And** the bottom tab navigator has exactly 3 tabs: Home, Library, Profile — each rendering a placeholder screen with its tab label
**And** `src/navigation/types.ts` defines typed navigation params as named exports
**And** all screen components use named exports
**And** navigating between the 3 tabs works correctly on both iOS and Android

### Story 1.5: CI/CD Pipelines & Crash Reporting

As a **developer**,
I want GitHub Actions CI/CD pipelines for iOS and Android, and Sentry crash reporting configured,
So that every merge is validated by a build and production errors are captured from the first release.

**Acceptance Criteria:**

**Given** the project repository on GitHub
**When** the CI/CD and monitoring configuration is complete
**Then** `.github/workflows/ios.yml` runs on pull requests using a macOS runner and produces a successful Xcode build
**And** `.github/workflows/android.yml` runs on pull requests using an ubuntu runner and produces a successful Gradle build
**And** `@sentry/react-native` is installed and initialized in `App.tsx` with a DSN from environment config (not hardcoded)
**And** Sentry is wired to capture unhandled JS exceptions and native crashes
**And** `src/shared/types/errors.types.ts` defines the `AppError` discriminated union (`SteamError | HltbError | GeminiError | NetworkError`) as a named export
**And** Flipper is available for local development debugging

---

## Epic 2: Steam Authentication & User Profile

Users can sign in with their Steam account through a secure system browser flow, view their Steam profile summary (avatar, display name, level), and sign out — with session persisted across app restarts.

### Story 2.1: Auth Screen & Steam OpenID Sign-In

As a **new user**,
I want to sign in with my Steam account via the system browser,
So that the app can securely identify me and access my Steam library data.

**Acceptance Criteria:**

**Given** the user is unauthenticated
**When** the app launches
**Then** `AuthScreen` is displayed (RootNavigator auth gate from Story 1.4)
**And** `AuthScreen` shows a "Sign in with Steam" button styled per the design system (Surface-800 card, Primary accent)

**Given** the user taps "Sign in with Steam"
**When** the system browser opens
**Then** the Steam OpenID URL is constructed correctly and opens in SafariViewController (iOS) / Chrome Custom Tab (Android)
**And** after successful Steam login, the deep link `backlogcompanion://auth/callback` is triggered
**And** the app intercepts the callback and extracts the Steam ID from `openid.claimed_id`
**And** the Steam ID is stored in `react-native-keychain`
**And** `authSlice` is updated: `isAuthenticated: true`, `steamId: "<extracted_id>"`
**And** RootNavigator routes the user to the main tab navigator

**Given** the user cancels the browser without completing login
**When** the deep link callback is not received
**Then** the user remains on `AuthScreen` with no error state shown

**Given** any authenticated Steam API call returns a 401 or 403 response
**When** the error is received by any hook or service
**Then** `auth/setAuthenticated(false)` is dispatched, Keychain entries for Steam ID and API key are cleared, and RootNavigator routes to `AuthScreen`
**And** a non-blocking toast informs the user: "Steam session expired. Please sign in again." (NFR-REL-02)

### Story 2.2: Steam Web API Key Entry

As a **new user completing onboarding**,
I want to input my Steam Web API key after signing in,
So that the app can make authenticated Steam API calls to fetch my library data.

**Acceptance Criteria:**

**Given** the user has completed Steam OpenID sign-in (Story 2.1) but no Steam Web API key is stored in Keychain
**When** the user reaches the main app for the first time
**Then** an API key entry screen (or bottom sheet) is displayed before the library is accessible
**And** a clear explanation of why the key is needed and a link to the Steam API key page is shown

**Given** the user inputs a Steam Web API key and submits
**When** the key is validated (test call to `GetPlayerSummaries` succeeds)
**Then** the API key is stored in `react-native-keychain`
**And** the user is navigated to the Library tab

**Given** the user inputs an invalid or empty API key
**When** validation fails
**Then** an inline error message is displayed without navigating away
**And** the Keychain is not updated

**Given** the `GetPlayerSummaries` validation call returns a 401 or 403 response
**When** the error is received
**Then** `useSessionExpiry.handleSteamAuthError` is called
**And** `auth/setAuthenticated({ isAuthenticated: false, steamId: null })` is dispatched
**And** Keychain entries for Steam ID (`service: 'steam_id'`) and API key (`service: 'steam_api_key'`) are cleared
**And** RootNavigator routes to `AuthScreen`
**And** a non-blocking toast informs the user: "Steam session expired. Please sign in again." (NFR-REL-02)

**Given** the user has a valid API key already stored in Keychain
**When** the app launches
**Then** the API key entry screen is skipped entirely

### Story 2.3: Steam Profile Summary View

As an **authenticated user**,
I want to view my Steam profile information in the Profile tab,
So that I can confirm the correct account is linked and feel a sense of identity within the app.

**Acceptance Criteria:**

**Given** the user is authenticated and navigates to the Profile tab
**When** the `ProfileScreen` loads
**Then** a TanStack Query fetch calls `GetPlayerSummaries` using the stored Steam ID and API key from Keychain
**And** the response is cached via TanStack Query (stale-while-revalidate pattern)
**And** the screen displays: Steam avatar (loaded via @d11/react-native-fast-image), persona name (H2 typography), and Steam level
**And** a skeleton shimmer is shown while data is loading (no generic spinner)

**Given** the Steam API is unavailable or the device is offline
**When** the profile screen is opened
**Then** previously cached profile data is displayed
**And** a non-blocking offline indicator is shown (NFR-REL-01)

**Given** no cached data exists and the API is unavailable
**When** the profile screen is opened
**Then** an empty state is shown with a "Retry" option

### Story 2.4: Logout & Session Clearing

As an **authenticated user**,
I want to sign out of the app,
So that I can unlink my Steam account or switch accounts if needed.

**Acceptance Criteria:**

**Given** the user is on the Profile tab
**When** they tap the "Sign Out" button
**Then** a destructive-styled confirmation Toast/Snackbar appears with an UNDO option (no modal dialog)
**And** if confirmed (UNDO not tapped within the timeout), all session data is cleared: `authSlice` reset (`isAuthenticated: false`, `steamId: null`), Keychain entries for Steam ID and API key are deleted, MMKV cache snapshot is cleared
**And** RootNavigator routes the user back to `AuthScreen`

**Given** the user taps "Sign Out" then taps UNDO within the snackbar timeout
**When** UNDO is tapped
**Then** no data is cleared and the user remains on the Profile tab

**Given** `authSlice.isAuthenticated` becomes `false` for any reason (including future session expiry per NFR-REL-02)
**When** the app is in any state
**Then** RootNavigator immediately routes to `AuthScreen` without data loss beyond the session

---

## Epic 3: Steam Library — Sync, Browse & Search

Users can see their complete Steam game library with playtime data, filter by status (Unplayed / In Progress / Completed), sort by multiple criteria, and search instantly. The library is always available offline, loading from local cache with a silent background delta sync.

### Story 3.1: Steam Library Sync Engine

As an **authenticated user**,
I want my Steam game library to be silently fetched and kept up to date in the background,
So that my library data is always fresh without me having to manually trigger a sync.

**Acceptance Criteria:**

**Given** the user is authenticated with a valid Steam API key
**When** the app opens and the Library tab is shown
**Then** `useSteamSync` triggers a full library fetch via `GetOwnedGames` only if `last_full_sync` in MMKV is older than `SYNC_THROTTLE_MS` (30 minutes)
**And** `librarySlice.sync_status` is set to `'syncing'` during the fetch and `'idle'` on success
**And** delta detection compares `last_synced_at` timestamps — only dirty rows are written to the `steam_games` SQLite table
**And** user annotations (`user_annotations` table: status, tags, notes) are never touched by the sync engine
**And** `last_full_sync` in MMKV is updated on successful full sync

**Given** a subsequent app open within 30 minutes of the last full sync
**When** `useSteamSync` runs
**Then** a full `GetOwnedGames` sync is skipped
**And** `GetRecentlyPlayedGames` (5–10 games) is called instead for an incremental update

**Given** the Steam API returns a 429 or network error
**When** the sync fails
**Then** `librarySlice.sync_status` is set to `'error'`
**And** exponential backoff with jitter is applied on retry
**And** the user sees previously cached library data with no error modal (NFR-REL-01)

**Given** `GetOwnedGames` returns an empty games array (0 items)
**When** the sync engine processes the response
**Then** the sync engine must NOT overwrite the local SQLite library with an empty dataset
**And** `librarySlice.sync_status` is set to `'error'` with reason `'private_profile'`
**And** a non-blocking toast informs the user: "Your Steam library is private. Go to Steam → Privacy Settings → Game Details → set to Public." (NFR-REL-01)
**And** previously cached library data remains intact and visible

> **Constraint:** Steam's `GetOwnedGames` API returns an empty array (not an error) when the user's game details are set to Private. An empty response must be treated as a private-profile error, not a valid empty library, to avoid data loss.

### Story 3.2: Library Screen — Local-First List View

As an **authenticated user**,
I want to see my full Steam game library rendered immediately on app open, with cover art and playtime,
So that I can start browsing my library in under 1.5 seconds without waiting for a network sync.

**Acceptance Criteria:**

**Given** the user navigates to the Library tab
**When** `LibraryScreen` mounts
**Then** game data is read from SQLite via `useGameLibrary` (TanStack Query) and rendered immediately — no network wait (NFR-PERF-01)
**And** the cold-start MMKV snapshot is used if SQLite is not yet hydrated, meeting the < 1.5s interactive requirement
**And** games are displayed as a `FlashList` of `GameCard` (List variant): square cover art + game title + total playtime + status badge
**And** cover art images are loaded and cached via `@d11/react-native-fast-image` with priority queue for visible items
**And** the list scrolls at a consistent 60fps with 500+ items (NFR-PERF-02)
**And** games with 0 playtime display an "Unplayed" badge
**And** a skeleton shimmer (matching card row shapes) is displayed while the initial SQLite query resolves — no spinner

**Given** the device is offline
**When** the Library tab is opened
**Then** the cached library renders normally
**And** a non-blocking `OfflineBanner` component is shown (NFR-REL-01)

### Story 3.3: Library Filter & Sort Controls

As an **authenticated user**,
I want to filter my library by backlog status and sort it by multiple criteria,
So that I can quickly surface the games most relevant to what I want to play.

**Acceptance Criteria:**

**Given** the user is on the Library screen
**When** they open the filter/sort controls (via a `FilterSheet` bottom sheet)
**Then** they can filter by status: Unplayed (0 playtime + no Completed tag), In Progress (> 0 playtime + not Completed), Completed (manually tagged)
**And** they can sort by: Alphabetical (A–Z), Playtime Ascending, Playtime Descending, Release Date
**And** active filter and sort selections are stored in `librarySlice` (Redux)
**And** the list updates immediately when a filter or sort option is selected — no loading state required (filter/sort applied to in-memory SQLite query result)

**Given** the user selects "Unplayed" filter
**When** the library list re-renders
**Then** only games with 0 total playtime and no "Completed" annotation are shown
**And** the active filter is visually indicated (pill/chip in the header)

**Given** the user closes the app and reopens it
**When** the Library screen loads
**Then** the previously selected filter and sort are restored from Redux (persisted via Redux Persist)

### Story 3.4: Instant Local Game Search

As an **authenticated user**,
I want to search for a game by title with instant results,
So that I can find a specific game in my library without scrolling through hundreds of entries.

**Acceptance Criteria:**

**Given** the user is on the Library screen
**When** they tap the `SearchBar` and begin typing
**Then** search results are filtered locally against the SQLite `steam_games` table
**And** results update within < 100ms of each keystroke (NFR-PERF-03)
**And** search is case-insensitive and matches partial titles (e.g., "cast" matches "Castlevania")

**Given** the search query returns results
**When** the list updates
**Then** matching games are displayed in the same `GameCard` List variant format
**And** any active filter from Story 3.3 is applied on top of the search results

**Given** the search query returns no results
**When** the list updates
**Then** a clear empty state message is shown ("No games match '[query]'")
**And** no error state or spinner is shown

**Given** the user clears the search bar
**When** the input is empty
**Then** the full library list is restored with the previously active filter/sort applied

---

## Epic 4: Game Details & Personal Backlog Tracking

Users can tap any game to view enriched details — HLTB time estimates, achievement progress — and assign a personal backlog status (Backlog / Playing / Completed / Abandoned / Shelved), with satisfying haptic and visual feedback on key interactions.

### Story 4.1: Game Detail Screen Navigation & Header

As an **authenticated user**,
I want to tap any game in my library and open a detailed view with a cinematic header,
So that I can access all enriched information for a specific game in a focused, immersive screen.

**Acceptance Criteria:**

**Given** the user is on the Library screen
**When** they tap a `GameCard`
**Then** `GameDetailScreen` opens via a native stack push transition
**And** the screen header displays a parallax cover image that transitions smoothly from the card art
**And** the game title (H1 typography) and total playtime are visible below the hero image
**And** a back button returns the user to the Library screen

**Given** the `GameDetailScreen` is open
**When** the screen renders
**Then** `useGameDetail` (TanStack Query, key: `queryKeys.games.detail(appId)`) reads the game record from SQLite
**And** the screen is interactive immediately using locally cached data — no network wait

### Story 4.2: HLTB Time Estimates Display

As an **authenticated user**,
I want to see "How Long To Beat" estimates for a game on its detail screen,
So that I can judge whether I have enough time to start or finish it tonight.

**Acceptance Criteria:**

**Given** the user opens a `GameDetailScreen`
**When** the `HltbSection` mounts
**Then** `useHltbData` (TanStack Query, key: `queryKeys.games.hltb(appId)`) checks for a cached result in the SQLite `steam_games.hltb_cached_at` column
**And** if cache is stale or missing, `howlongtobeat-js` is called on-demand to fetch estimates
**And** the `HltbSection` displays three estimates: Main Story, Main + Extra, and Completionist
**And** each estimate is rendered as an `OmniPill` with color coding: green (< 10h), yellow (10–40h), red (> 40h), blue (∞ for endless/live-service)
**And** the fetched result is stored in SQLite with `hltb_cached_at` timestamp for future visits

**Given** the HLTB fetch fails for any reason
**When** `HltbSection` renders
**Then** all three estimate slots display "—" gracefully
**And** no error modal or blocking state is shown (best-effort enrichment)
**And** a skeleton shimmer is shown while the fetch is in progress

### Story 4.3: Achievement Progress Display

As an **authenticated user**,
I want to see my achievement progress for a game on its detail screen,
So that I can gauge how much of the game I've experienced and feel motivated to keep playing.

**Acceptance Criteria:**

**Given** the user opens a `GameDetailScreen`
**When** the `AchievementsSection` mounts
**Then** `useGameDetail` triggers an on-demand fetch of `GetPlayerAchievements` via the Steam API (key: `queryKeys.games.detail(appId)`)
**And** the section displays a progress summary header: e.g., "15 / 50 unlocked"
**And** each achievement is shown with its icon, name, and unlock date (for unlocked achievements)
**And** locked achievements are visually dimmed/greyed out
**And** a skeleton shimmer is shown while the fetch is in progress

**Given** the Steam API is unavailable or the game has no achievements
**When** `AchievementsSection` renders
**Then** a graceful empty state is shown ("No achievements available")
**And** no error modal or blocking state is shown

**Given** the device is offline
**When** `AchievementsSection` mounts
**Then** TanStack Query's in-session memory cache is used if available (populated during the current app session)
**And** no network fetch is attempted (NetInfo gate)
**And** if no in-session cache exists, the graceful empty state is shown ("No achievements available") — achievements are not persisted across app restarts

### Story 4.4: Manual Backlog Status Assignment

As an **authenticated user**,
I want to assign and update a personal backlog status to any game,
So that I can track my progress and feel a sense of accomplishment when I complete or declutter my library.

**Acceptance Criteria:**

**Given** Story 4.4 is the first story requiring user annotation storage
**When** the story is implemented
**Then** a Drizzle incremental migration adds the `user_annotations` table with columns: `app_id` (FK to `steam_games`), `status` (enum: Backlog | Playing | Completed | Abandoned | Shelved), `updated_at` (Unix timestamp)
**And** the migration runs on startup via `useMigrations` (established in Story 1.2)

**Given** the user is on a `GameDetailScreen`
**When** they interact with the `StatusSelector` component
**Then** the current status is displayed (defaulting to "Backlog" if unset)
**And** they can select from: Backlog, Playing, Completed, Abandoned, Shelved
**And** the selected status is persisted to the `user_annotations` SQLite table via Drizzle immediately
**And** TanStack Query cache for `queryKeys.games.all` is invalidated so the Library list reflects the change

**Given** the user sets status to "Completed"
**When** the status is saved
**Then** haptic feedback fires (success pattern)
**And** a full-screen confetti/particle animation celebrates the milestone
**And** the `StatusSelector` displays "Completed" with the Success accent color (#A3E635)

**Given** the user sets status to "Shelved" or "Abandoned"
**When** the status is saved
**Then** a Toast/Snackbar appears with an UNDO button (no confirmation dialog)
**And** if UNDO is tapped within the timeout, the previous status is restored in SQLite
**And** haptic feedback fires (light pattern)

**Given** the app is offline
**When** the user changes a status
**Then** the change is persisted locally to SQLite immediately
**And** no network call is needed (user annotations are local-only)

---

## Epic 5: AI-Powered Recommendations

Users receive personalized game recommendations from their own library — "Quick Win" and "Forgotten Gem" — each with a transparent AI rationale streamed in real time via the Concierge Dashboard.

### Story 5.1: Gemini API Key Setup

As an **authenticated user**,
I want to enter my Gemini API key so the app can generate AI recommendations,
So that the AI-powered Home screen activates without requiring a shared backend key.

**Acceptance Criteria:**

**Given** the user navigates to the Home tab for the first time without a Gemini API key stored in Keychain
**When** `HomeScreen` renders
**Then** a setup prompt is displayed ("Add your Gemini API key to unlock recommendations") with a CTA to enter the key
**And** the user can input their Gemini API key in a dedicated text field

**Given** the user submits a Gemini API key
**When** a validation request is made (minimal test call to Gemini API)
**Then** if valid, the key is stored in `react-native-keychain`
**And** the Home screen transitions to the Concierge Dashboard

**Given** the user submits an invalid or empty Gemini API key
**When** validation fails
**Then** an inline error message is displayed without clearing the field
**And** the Keychain is not updated

**Given** the user has a valid Gemini API key already stored in Keychain
**When** the Home tab is opened
**Then** the setup prompt is skipped and the Concierge Dashboard loads directly

**Given** the user wants to update or remove their Gemini API key
**When** they navigate to the Profile tab settings section
**Then** they can view (masked), update, or delete the stored Gemini key from Keychain

### Story 5.2: Recommendation Engine & Library Compression

As an **authenticated user**,
I want the app to intelligently select and compress my library data and send it to Gemini to generate tailored recommendations,
So that the AI has the right context to surface genuinely relevant games rather than random suggestions.

**Acceptance Criteria:**

**Given** the user has a valid Gemini API key and a synced library
**When** `useRecommendations` is triggered
**Then** `compressLibrary.ts` processes the SQLite library and produces a weighted payload of up to 25 games using: behavioural grouping (Unplayed, Recent, High-hours-inactive), playtime-aware sampling, and semantic clustering by genre + developer
**And** `useRecommendations` (TanStack Query, key: `queryKeys.recommendations.all(steamId)`) sends the compressed payload to the Gemini API with a prompt requesting "Quick Win" and "Forgotten Gem" recommendations
**And** the response is received via SSE streaming (`react-native-sse`)
**And** the parsed recommendations include: game title, recommendation category (Quick Win / Forgotten Gem), and a text rationale ("Because you played X...")
**And** the result is cached by TanStack Query for the session (no redundant re-calls on tab switch)

**Given** `compressLibrary.ts` processes the library to build the Gemini payload
**When** it identifies candidates for each recommendation category
**Then** "Quick Win" candidates are Unplayed games with rating ≥ 75 (Metacritic score where available, otherwise Steam positive review % ≥ 75%) AND HLTB Main Story estimate ≤ 5 hours
**And** "Forgotten Gem" candidates are Unplayed games with rating ≥ 75 (same fallback) AND Steam library add date > 1 year ago
**And** only games meeting their category threshold are included in the respective candidate pool sent to Gemini

**Given** the Gemini API call fails (network error, invalid key, quota exceeded)
**When** `useRecommendations` errors
**Then** `GeminiError` is returned as part of the `AppError` discriminated union
**And** the error is surfaced to the UI with an inline "Retry" CTA (not a modal or crash)
**And** no fallback recommendation is fabricated — error state is shown honestly

**Given** the library has fewer than 5 games
**When** `compressLibrary.ts` runs
**Then** all available games are included in the payload without crashing

### Story 5.3: Home Screen Concierge Dashboard

As an **authenticated user**,
I want to open the app and immediately see AI-curated game recommendations with clear rationale on a polished Home screen,
So that I can make a play decision in seconds without browsing my entire library.

**Acceptance Criteria:**

**Given** the user opens the Home tab with a valid Gemini key and recommendations available
**When** `HomeScreen` renders
**Then** the top section displays a hero `GameCard` (Hero variant: 3:4, full-bleed art) for the top "Quick Win" recommendation
**And** the hero card includes a `ConciergeBubble` component showing the AI rationale text with a Sparkle icon (streamed progressively via SSE)
**And** below the hero, a horizontal carousel section labelled "Forgotten Gems" displays additional `RecommendationCard` items
**And** all text containers respect Dynamic Type (NFR-ACC-01) and display correctly in Dark Mode (NFR-ACC-02)
**And** primary navigation elements (tab bar) remain within the thumb zone (NFR-USE-01)

**Given** recommendations are being fetched/streamed
**When** `HomeScreen` renders before results arrive
**Then** a skeleton shimmer matching the hero card and carousel shapes is displayed (no generic spinner)
**And** if streaming takes > 3s, "Cinema Mode" (ambient content) is shown to retain the user

**Given** the Gemini call fails
**When** `HomeScreen` renders in error state
**Then** an inline error message is shown within the hero section with a "Try Again" button
**And** the Library and Profile tabs remain fully accessible

**Given** the user taps the hero `GameCard` or any `RecommendationCard`
**When** the card is tapped
**Then** `GameDetailScreen` opens for that game (navigation from Epic 4)

**Given** the user's device has `prefers-reduced-motion` enabled
**When** the Home screen loads and animates
**Then** all entrance animations and streaming text effects are disabled or replaced with instant transitions
