// Query key factory — single source of truth for all TanStack Query keys
// Architecture spec §4.4: NEVER inline query keys as strings or arrays elsewhere
export const queryKeys = {
  games: {
    all: (steamId: string) => ['games', steamId] as const,
    detail: (appId: number) => ['games', 'detail', appId] as const,
    hltb: (appId: number) => ['games', 'detail', appId, 'hltb'] as const,
  },
  recommendations: {
    all: (steamId: string) => ['recommendations', steamId] as const,
  },
} as const;
