---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
status: complete
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-BacklogCompanion-2026-02-23.md
  - docs/index.md
  - docs/development-guide.md
  - docs/architecture-root.md
  - docs/api-contracts-root.md
  - docs/data-models-root.md
  - docs/source-tree-analysis.md
workflowType: 'prd'
---

# Product Requirements Document - BacklogCompanion

**Author:** m.lazarau
**Date:** 2026-02-24

## 1. Project Discovery

### 1.1 Project Classification
- **Type**: Mobile Application (`mobile_app`)
- **Domain**: General / Utility (Gaming Companion)
- **Complexity**: Low-Medium (Uses external Steam API, local persistence, specialized data models)
- **Nature**: Greenfield (New Development)

### 1.2 Development Context
- **Framework**: React Native (New Architecture) with TypeScript
- **Platforms**: iOS, Android
- **Key Technologies**: Redux Toolkit, React Query, MMKV, Steam Web API, Gemini AI
- **Primary Goal**: Create a "backlog manager" to help users organize and finish their video games.

## 2. Executive Summary

### 2.1 Product Vision
BacklogCompanion is an intelligent mobile backlog manager designed to transform game collection management from a passive list into an active, personalized gaming concierge. By leveraging Steam Web API data and user behavior analysis, the application curates play recommendations that align with the user's current tastes and available time, effectively solving the "paradox of choice" in modern gaming.

### 2.2 Value Proposition
- **For the Gamer:** Eliminates decision fatigue by filtering a massive library down to the "right game for right now."
- **Smart Curation:** Unlike static library viewers, BacklogCompanion actively learns player preferences to surface forgotten gems and validate new purchases.
- **Financial & Emotional ROI:** Reduces "buyer's remorse" by ensuring purchased games are played and enjoyed, justifying the rising cost of gaming in an abundant market.

### 2.3 Key Differentiators
- **Taste-Driven Recommendation Engine:** Moves beyond simple sorting (alphabetical/playtime) to interest-based suggestions.
- **Context-Aware Feasibility:** Integrates "How Long To Beat" data with user availability to suggest games that can actually be finished.
- **Psychological Focus:** Shifts the metric from "collection size" to "completion satisfaction."

### 2.4 Future State
A successful BacklogCompanion creates a relationship of trust where the user relies on the app to guide their gaming time. The ultimate goal is a user base that no longer feels frustrated by their backlog but empowered by it, knowing that every game they buy has a place and a time to be enjoyed.

## 3. Success Metrics

### 3.1 User Success Metrics (The "Heart" Metrics)
- **The "Unstuck" Rate:** 70% of users launch a recommended game within 5 minutes of opening the app (solving the "what do I play?" paralysis).
- **Completion Confidence:** Users mark at least 1 game as "Completed" or "Shelved" (intentionally) per month, reducing backlog clutter.
- **Sentiment:** Qualitative feedback confirms a shift from "guilt" to "satisfaction" regarding their library.

### 3.2 Business Success Metrics (The "Growth" Metrics)
- **Retention:** Day-30 retention rate of >20% (indicating the app is a habit, not a novelty).
- **Trust/Conversion:** High click-through rate on "Why this game?" explanations (proving users value the AI rationale).
- **Virality:** Users sharing their "Year in Review" or "Backlog Busting" stats on social media.

### 3.3 Technical Success Metrics (The "Quality" Metrics)
- **Sync Speed:** Steam library synchronization (<500 games) completes in under 5 seconds.
- **Offline Capability:** Core features (viewing library, filtering) work 100% offline (critical for portable gaming devices like Steam Deck/Switch).
- **AI Latency:** Recommendation generation takes <2 seconds to feel conversational/responsive.

## 4. User Journeys

### 4.1 The "Saturated Strategist" (Alex) - The Core Journey
- **The Situation:** It's Friday night. Alex has 2 hours before bed. They open Steam, stare for 15 minutes, feel overwhelmed, and end up watching YouTube instead.
- **The Rising Action:** Alex downloads BacklogCompanion. They link their Steam account. The app digests their 800 games.
- **The Climax:** Validating the library, Alex sees a "Quick Wins" section. The app suggests *Katana Zero* because "It's only 4 hours long, matches your love for *Hotline Miami*, and you already own it."
- **The Resolution:** Alex plays for an hour, loves it, and marks it as "In Progress." They go to bed feeling productive, not guilty.

### 4.2 The "Value Optimizer" (Sam) - The Secondary Journey
- **The Situation:** Sam is a student on a budget. They have a huge backlog of free Epic/Amazon Prime games and cheap bundle keys but don't know which ones are actually *good*.
- **The Rising Action:** Sam filters their library by "Highest Rated" + "Unplayed."
- **The Climax:** The app highlights a 95% rated indie game they got in a bundle 3 years ago and forgot about.
- **The Resolution:** Sam realizes they don't need to buy the new $70 AAA game because they have "gold" sitting in their library already.

## 5. Domain-Specific Requirements

### 5.1 Steam Web API Constraints
- **Rate Limits:** 100,000 calls per day.
- **Caching:** Must respect caching headers to minimize redundant API calls.
- **Attribution:** Comply with Steam branding guidelines in UI.

### 5.2 Data Privacy & Trust
- **Read-Only Access:** The app only *reads* public profile data; it never modifies the user's library or account settings.
- **Local-First Architecture:** User data (play history, tags) is stored locally on the device via MMKV/SQLite, not on a central server.
- **Transparency:** Clear "What we access" disclosure during the Steam linking process.

### 5.3 Gaming Ecosystem Standards
- **Platform Parity:** UI/UX should feel native on both iOS and Android while respecting gaming aesthetics.
- **Data Freshness:** Users expect "Hours Played" to update within minutes of closing a game.

## 6. Innovation Focus (Optional)
This section is reserved for outlining truly novel features or approaches. Given the "Backlog Manager" space is established, our innovation lies in **Actionable AI Curation** rather than a new technological paradigm. This will be detailed in the Functional Requirements.

## 7. Mobile-Specific Requirements

### 7.1 Architecture
- **Framework:** React Native (New Architecture - Bridgeless Mode).
- **State Management:** Redux Toolkit (Session/Global settings), React Query (Server capabilities).
- **Persistence:** MMKV for synchronous high-performance storage.

### 7.2 Offline Strategy
- **"Read" Operations:** 100% available offline. Users can browse, search, and filter their cached library without internet.
- **"Write" Operations:** Queueable. If a user tags a game while offline, it saves locally immediately.
- **Sync Logic:** Auto-sync with Steam API happens only when foregrounded + online.

### 7.3 Device Integration
- **Haptics:** Use haptic feedback for satisfying interactions (e.g., marking a game "Complete").
- **Deep Linking:** Support `steam://` protocol to launch games directly from the app on the device (if Steam Mobile is installed) or on PC (via remote download).

### 7.4 Store Compliance
- **iOS:** strict adherence to Human Interface Guidelines (HIG). No "Unlock with Steam" as a gate that violates IAP rules (since we don't sell content, this is safer, but "Sign in with Steam" must differ from "Sign in with Apple").
- **Android:** Material Design 3 adaptation.

## 8. Scoping & Roadmap

### 8.1 Strategic Goal
Build a "Problem-Solving MVP" that focuses entirely on **Analysis & Curation**. We don't need social features, complicated "Backlog Battles," or multi-platform support (e.g., PlayStation/Xbox) in V1. The goal is to make the Steam Library usable.

### 8.2 Phase 1: The MVP (The "Analyst")
- **Authentication:** Sign in with Steam (OpenID).
- **Ingestion:** Fetch full library + playtime stats.
- **The "Smart List":** Filter by "Unplayed," "In Progress," "Completed."
- **AI Curation:** "What to Play Next" based on simple heuristics (e.g., "Highly Rated + Short Playtime").
- **Game Details:** The screen we just built (HLTB data, Achievements).
- **Manual Tracking:** Mark games as "Completed" or "Shelved" (Local Storage).

### 8.3 Phase 2: The Engagement Layer (Post-MVP)
- **Advanced AI:** LLM-powered explicit recommendations ("I feel like a sci-fi shooter").
- **Collections:** User-created lists ("Halloween Spooky List").
- **Stats Dashboard:** Graphs showing "Years of Backlog Cleared."
- **Notifications:** "You're 2 hours away from beating *Hades*!"

### 8.4 Phase 3: The Ecosystem (Long Term)
- **Cross-Platform:** Import data from EPIC, GOG, PSN, Xbox.
- **Social:** Share lists with friends.
- **Cloud Sync:** Sync progress across devices (requires backend).

## 9. Functional Requirements

### 9.1 Authentication & Profile (FR-AUTH)
- **FR-AUTH-01:** User can sign in using their Steam credentials via OpenID.
- **FR-AUTH-02:** User can view their Steam profile summary (Avatar, Persona Name, Level) on a dashboard.
- **FR-AUTH-03:** User can manually logout, clearing local session data.

### 9.2 Library Management (FR-LIB)
- **FR-LIB-01 (Ingestion):** System fetches the user's full owned game library from Steam Web API.
- **FR-LIB-02 (Playtime):** System fetches and displays total playtime for each game.
- **FR-LIB-03 (Filtering):** User can filter library by status: "Unplayed" (0 hours), "In Progress" (>0 hours), "Completed" (Manual Tag).
- **FR-LIB-04 (Sorting):** User can sort library by: Alphabetical, Playtime (Asc/Desc), Metacritic Score (if available), Release Date.
- **FR-LIB-05 (Search):** User can search for a game by title with instant local results.

### 9.3 Game Details & Enrichment (FR-DETAIL)
- **FR-DETAIL-01:** User can view a detailed screen for any specific game.
- **FR-DETAIL-02:** System displays "How Long To Beat" estimates (Main Story, Main + Extra, Completionist).
- **FR-DETAIL-03:** System displays achievement progress (e.g., "15/50 unlocked").
- **FR-DETAIL-04:** User can manually assign a "Backlog Status" (Backlog, Playing, Completed, Abandoned, Shelved).

### 9.4 Recommendations Engine (FR-REC)
- **FR-REC-01 (The "Quick Win"):** System identifies and displays a "Quick Win" recommendation (High Rating + Short Playtime + Unplayed).
- **FR-REC-02 (The "Forgotten Gem"):** System identifies a "Forgotten Gem" (High Rating + Purchased >1 year ago + Unplayed).
- **FR-REC-03 (Explanation):** Every recommendation must include a text rationale (e.g., "Because you liked Hades...").

## 10. Non-Functional Requirements

### 10.1 Performance (The "Snap" Factor)
- **NFR-PERF-01 (Launch Time):** App must be interactive (clickable) within 1.5 seconds of cold start on an iPhone 15 / Pixel 7 equivalent.
- **NFR-PERF-02 (Scroll Performance):** The game list must scroll at a consistent 60fps (or 120fps on ProMotion devices), even with 500+ items and images loading.
- **NFR-PERF-03 (Search Latency):** Local search results must update in <100ms after keystroke.

### 10.2 Reliability & Data Integrity
- **NFR-REL-01 (Offline Grace):** If the Steam API fails or device is offline, the app must silently fall back to cached data without showing error modals to the user (toast notification only if specific action fails).
- **NFR-REL-02 (Token Refresh):** App must handle OpenID session expiry gracefully, prompting for re-login only when absolutely necessary.

### 10.3 Usability & Accessibility
- **NFR-USE-01 (One-Handed Use):** Primary navigation elements should be reachable within the "thumb zone" for standard smartphones.
- **NFR-ACC-01 (Dynamic Type):** App must respect system font size settings (critical for accessibility).
- **NFR-ACC-02 (Dark Mode):** App must support system Dark Mode (default for "Gamers").
