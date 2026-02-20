# API Contracts Documentation

## 1. External APIs

### Steam API
- **Client**: `src/data/api/steam.ts`
- **Endpoints**:
    - `IPlayerService/GetOwnedGames/v0001`: Fetches user library.
    - `api/appdetails`: Fetches game metadata.
- **Types**: `SteamOwnedGamesResponse`, `SteamAppDetailsResponse` in `src/types/steam.types.ts`

### LLM API
- **Client**: `src/data/api/llm.ts`
- **Purpose**: Generates game suggestions based on library.
- **Types**: `src/types/googleapis.gemini.types.ts`

## 2. Internal Data Flow
- **Pattern**: Repository pattern via `src/data/api/` clients.
- **State Integration**: TanStack Query hooks in `src/hooks/` consume these APIs.
