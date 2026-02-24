---
stepsCompleted: [step-01-init, step-02-vision]
inputDocuments:
  - docs/index.md
  - docs/development-guide.md
  - docs/architecture-root.md
  - docs/api-contracts-root.md
  - docs/data-models-root.md
  - docs/source-tree-analysis.md
date: 2026-02-23
author: m.lazarau
project_name: BacklogCompanion
---

# Product Brief: BacklogCompanion

## Executive Summary

BacklogCompanion is a mobile application solving the "analysis paralysis" of modern PC gaming. By leveraging personal library data and AI-driven analysis, it cuts through the marketing noise of the Steam Store to deliver highly relevant game recommendations. It uniquely serves two critical needs: discovering new titles that genuinely match a user's taste, and "reviving" the backlog by surfacing timely reasons—such as major updates—to return to owned games. It essentially acts as a personalized curator, replacing the generic, ad-heavy browse experience across finding something new or something you already own, with a clean, focused mobile companion.

---

## Core Vision

### Problem Statement

Gamers with extensive Steam libraries struggle to find relevant games to play—both new titles and existing "backlog" entries. The volume of choice is overwhelming, and current discovery methods (Steam Store, generic lists) are cluttered with marketing-driven suggestions that prioritize publisher budgets over player preference. Users waste time shifting through "popular" lists that push what they already own or don't want, rather than finding what they'd actually enjoy playing *right now*.

### Problem Impact

*   **Analysis Paralysis:** Players spend more time browsing than playing, often settling for "safe" choices or not playing at all.
*   **Pile of Shame:** Massive libraries of unplayed games grow larger, with users unaware of major updates or improvements that would make those games worth revisiting.
*   **Missed Opportunities:** Truly relevant games are buried under "Best Sellers" and "New & Trending" lists that dominate the store front.

### Why Existing Solutions Fall Short

*   **Steam Store:** Heavily biased towards new releases and games with large marketing budgets. The interface is cluttered ("newspaper spread") and recommendations often focus on engagement metrics (time spent, new mechanics) rather than personal taste or backlog utility.
*   **Generic Trackers (Steam Update Tracker, etc.):** Often disconnected from the discovery experience, requiring users to actively manage lists or subscribe to bots, rather than receiving proactive, intelligent nudges.
*   **Manual Research:** Browsing Reddit or review sites is time-consuming and disconnected from the user's actual library and play history.

### Proposed Solution

A mobile-first "companion" application that integrates directly with a user's Steam library to provide:
1.  **AI-Curated Discovery:** Personalized recommendations for new games based on actual play history and preferences, not just sales charts.
2.  **Backlog Revival:** Intelligent notifications about significant updates to owned games, giving users a compelling reason to install and play titles they may have ignored.
3.  **Streamlined Interface:** A distraction-free mobile UX focused solely on "what to play next," removing the clutter of store banners and social feeds.

### Key Differentiators

*   **AI-Driven Relevance:** Recommendations based on *your* data, verified playing habits, and stated preferences, ensuring high-signal suggestions.
*   **Dual Focus (Discovery + Revival):** Uniquely treats the user's existing backlog as a primary source of "new" gameplay experiences, putting owned games on equal footing with new purchases.
*   **Marketing-Free Zone:** A product experience designed for the user's benefit, not the publisher's ad spend.

## Target Users

### Primary Users: "The Saturated Strategist" (Alex)
*   **Profile:** An experienced PC gamer with a 500+ game Steam library, largely accumulated through years of bundles and sales. They work full-time and have limited gaming hours (e.g., 5-10 hours/week).
*   **Behavior:**
    *   **Safe Harbors:** Spends 80% of their time playing just ~20% of their library—reliable favorites like *Castlevania* or extraction shooters where they feel comfortable.
    *   **Strategic Buyer:** Purchases ~20 new games a year, primarily during big seasonal sales or high-profile releases in their favorite genres.
    *   **The Pile of Shame:** Has hundreds of unplayed games (often freebies or impulsively bought bundles) that induce guilt but no action.
*   **The Struggle:** Boredom with their usual rotation but afraid to "waste" their limited free time on a new game that might suck. They want new impressions but default to familiarity because manual discovery is too tiresome.
*   **Core Need:** "Guess my choice I may not be aware of myself." A reliable recommendation that bridges the gap between their safe preferences and a fresh, exciting experience.

### Secondary Users: "The Deal Hunter" (Sam)
*   **Profile:** A price-conscious gamer who maximizes value per dollar.
*   **Behavior:**
    *   **Deep Diver:** Invests huge hours into a few games they love.
    *   **Late Adopter:** Rarely changes habits unless the barrier to entry is extremely low (cheap price) and social proof is overwhelming (positive reviews).
*   **The Struggle:** Missing out on great experiences because they aren't currently "trending" or don't appear in the "Under $5" filter.
*   **Core Need:** Validation that a discounted game is worth their specific time investment, proving it aligns with their deep-dive playstyle.

### User Journey: The "Analysis Paralysis" Intervention

**1. The Trigger (Friday Night):**
Alex finishes a long week. They have 2 hours to play. They open Steam, look at their "Recent" list (the same 5 games), feel bored, and scroll through their "Unplayed" collection. Overwhelmed by 300 icons, they almost close Steam to watch Netflix instead.

**2. The Intervention:**
Alex opens **BacklogCompanion** on their phone.
*   **Scenario A (The Bored Veteran):** The app suggests: *"Based on your love for Castlevania, try [Hidden Gem X] from your backlog—it just got a major content update."*
*   **Scenario B (The Time-Crunched Pro):** Alex selects "Quality Short Session" mood. The app recommends: *"You own [Game Y]. It takes 4 hours to beat and matches your high-action preference. Perfect for tonight."*

**3. The Success Moment:**
Alex installs the game. It clicks. They spend their 2 hours engaged in a fresh experience they already owned but had forgotten.

**4. The Habit:**
Before booting up their PC, Alex checks BacklogCompanion to see "what's good tonight," treating it as their personalized gaming concierge.

## 3. Success Metrics

### North Star Metric
**Recommendation-to-Playtime Ratio:**
The percentage of a user's total monthly playtime that is spent in games specifically recommended by BacklogCompanion (versus games launched organically).
*   **Why it matters:** This proves the product is successfully influencing behavior and solving the discovery problem, rather than just being a passive library viewer.

### User Success Metrics
*   **Recommendation Conversion Rate:** Percentage of recommended games that are installed and launched within 7 days of the suggestion.
*   **Quality of Play (The "stickiness" of a match):** Percentage of recommended games where the user exceeds 5 hours of playtime. (Filters out "bounce" installs where a user plays for 15 minutes and quits).
*   **Satisfaction Score:** Percentage of "Yes" responses to "Did you enjoy this game?" prompts triggered after significant playtime milestones.

### Business Objectives
*   **Retention (The Habit):** Percentage of Weekly Active Users (WAU) who check the app before launching a game on their PC.
*   **Backlog Activation:** Total number of "dormant" games (owned > 1 year with < 2 hours playtime) that are "revived" and played for 5+ hours per month.
*   **Prediction Accuracy:** Improvement in positive feedback loops ("Do you want more games like X?") over time, indicating the AI model is learning effectively.

## MVP Scope

### Core Features (v1.0)

1.  **Authentication & Onboarding**
    *   **Manual ID Entry:** Simple input field for SteamID (64-bit ID).
    *   **API Key Config:** User inputs their own Web API Key (for "power user" MVP phase) to bypass public rate limits/restrictions.
    *   **Local Persistence:** Securely store SteamID and Keys via MMKV/AsyncStorage.

2.  **The Library (Home)**
    *   **Read-Only List:** Vertical scrollable list of owned games fetched via `GetOwnedGames`.
    *   **Basic Metadata:** Cover art, Title, Total Playtime.
    *   **Status Indicators:** Simple "Unplayed" badge for games with 0 playtime.

3.  **Game Details (Light)**
    *   **Header:** Parallax cover image transition.
    *   **Stats:** Total Playtime, Recent Playtime (2 weeks).
    *   **Achievements:** List of unlocked/locked achievements with icons and unlock dates.

4.  **The "Magical" Feature: AI Recommendations Screen**
    *   **Single Provider:** Direct integration with one LLM (e.g., Gemini) using a user-provided or local API key.
    *   **Context:** Sends a minimized JSON payload of the user's "Top 20 Played" and "Top 20 Unplayed" games to the model.
    *   **Output:** Returns 1-3 specific game recommendations from the user's *existing* library (Backlog Revival) or *new* titles (Discovery) with a roughly 50/50 split.
    *   **UI:** Simple card display with "Why you'll like it" text generated by AI.

### Out of Scope for MVP

*   **Social Features:** Friends lists, chat, activity feeds.
*   **Wishlist Integration:** Syncing or managing Steam Wishlist.
*   **Price Tracking:** Discounts, sales alerts, or "IsThereAnyDeal" integration for unowned games.
*   **Complex Filtering:** Genre tags, advanced sorting (e.g., "Sort by Review Score").
*   **Cloud Sync:** Firebase Auth/Firestore for syncing settings across devices.
*   **QR Login:** Deferred due to complexity/lack of public API documentation for direct QR session generation.

### Future Vision (Post-MVP)

*   **"Mood" Selector:** "I have 30 mins" vs "I want an epic story."
*   **Deep Filtering:** "Show me only Action RPGs under 10 hours long."
*   **Automated Backlog Revival:** Push notifications when an unplayed game gets a "Major Update" (News Hub integration).
*   **Multi-Provider AI:** Allow users to switch between Gemini, OpenAI, Claude, or local LLMs.
