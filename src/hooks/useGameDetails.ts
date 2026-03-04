// Stub hooks — will be implemented in Story 4.3 (Achievement Progress Display)
export const usePlayerAchievements = (_appId: number) => ({
  data: undefined as { playerstats?: { achievements?: { apiname: string; unlocktime?: number }[] } } | undefined,
  isLoading: false,
  error: null as Error | null,
});

export const useGameSchema = (_appId: number) => ({
  data: undefined as { game?: { availableGameStats?: { achievements?: { name: string; displayName?: string; description?: string; icon?: string }[] } } } | undefined,
  isLoading: false,
});
