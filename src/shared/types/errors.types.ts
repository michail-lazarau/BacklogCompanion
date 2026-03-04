// AppError discriminated union — fully typed in Story 1.5
// Stub here to allow imports to compile
export type SteamError = { type: 'SteamError'; message: string };
export type HltbError = { type: 'HltbError'; message: string };
export type GeminiError = { type: 'GeminiError'; message: string };
export type NetworkError = { type: 'NetworkError'; message: string };
export type AppError = SteamError | HltbError | GeminiError | NetworkError;
