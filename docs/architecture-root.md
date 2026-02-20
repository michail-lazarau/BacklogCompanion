# Architecture Documentation

## Executive Summary
BacklogCompanion is a React Native mobile application designed to help users manage their game backlog. It integrates with the Steam API to fetch user libraries and uses an LLM service (Gemini) to generate personalized game suggestions. The app is built with the "New Architecture" enabled and uses modern React Native libraries.

## Technology Stack
- **Framework**: React Native 0.83.1 (New Architecture enabled via `nitro-modules`)
- **Language**: TypeScript 5.x
- **Navigation**: React Navigation v7 (Native Stack + Bottom Tabs)
- **State Management**:
    - **Global Client State**: Redux Toolkit + Redux Persist
    - **Server State**: TanStack Query v5
- **Storage**: MMKV (High-performance key-value storage)
- **Networking**: `fetch` with custom clients.
- **Hardware**: `react-native-vision-camera` for QR code scanning.

## Architecture Pattern
The project follows a **Component-Based / Feature-Sliced** hybrid architecture.
- **Screens**: Top-level route components located in `src/screens/`.
- **Navigation**: configuration in `src/navigation/`.
- **Data Layer**: Centralized in `src/data/`, separating:
    - `api/`: Raw API clients.
    - `query/`: React Query hooks and configuration.
    - `store/`: Redux slices for synchronous global state.
- **Business Logic**: Encapsulated in `src/hooks/` and `src/utils/`.

## Data Architecture
### Core Entities
- **User**: Stores Steam ID and preferences. Persisted via Redux Persist.
- **Game Library**: Fetched from Steam, cached via TanStack Query. Large datasets are transformed and reduced before storage/processing to optimize memory.
- **Game Metadata**: Detailed info about games, fetched on demand.

### Data Flow
1.  **Fetching**: `useSteam` hook calls `steamApi`.
2.  **Caching**: TanStack Query caches the response.
3.  **Persistence**: Critical user data is persisted to MMKV via Redux Persist.
4.  **Transformation**: `steamDataTransformer.ts` normalizes raw API data for UI consumption.

## API Design
- **External Integration**: The app acts as a client for:
    - **Steam Web API**: For user and game data.
    - **Google Gemini (LLM)**: For generating suggestions.
- **Internal Contracts**: See [Internal API Contracts](api-contracts-root.md).

## Component Overview
- **UI Components**: Currently minimal reusable library in `src/components`.
- **Screens**:
    - `LibraryScreen`: Complex list view with performance optimizations (`FlatList`).
    - `AIScreen`: Interactive chat-like interface.
    - `QRScanScreen`: Camera interface for login.

## Development Workflow
- **Environment**: TypeScript strict mode.
- **Linting**: ESLint configuration provided.
- **Testing**: Jest for unit/integration tests.
- **Build**: Standard React Native CLI build process (Gradle/CocoaPods).

## Deployment Architecture
- **Mobile**: Standard app store distribution (IPA/APK/AAB).
- **CI/CD**: Not currently implemented (no workflows found).
