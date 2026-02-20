# Data Models Documentation

## 1. Core Entities

### User
- **Source**: `src/data/store/userSlice.ts`
- **Fields**: Probably `steamId`, `preferences`.

### Game Metadata
- **Source**: `src/data/store/gameMetadataSlice.ts`
- **Fields**: `appid`, `description`, `tags`, etc.
- **Persistence**: likely via Redux Persist.

### Steam Game
- **Source**: `src/types/steam.types.ts`
- **Interface**: `SteamGame`
    - `appid`: number
    - `name`: string
    - `playtime_forever`: number
    - `img_icon_url`: string

## 2. Storage Schema (MMKV/Redux Persist)
- **Keys**: likely `persist:root`
- **Structure**: serialized Redux state.
