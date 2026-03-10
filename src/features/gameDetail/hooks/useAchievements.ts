import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Keychain from 'react-native-keychain';
import { eq } from 'drizzle-orm';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import { queryKeys } from '@shared/queryKeys';
import { getGameSchema, getPlayerAchievements } from '../../../data/api/steam';
import { isAppError } from '@shared/types/errors.types';
import { db } from '@db/index';
import { achievementCache, steamGames } from '@db/schema';

export type MergedAchievement = {
  apiname: string;
  displayName: string;
  description?: string;
  icon: string;       // Full URL to unlocked icon
  icongray: string;   // Full URL to locked/grey icon
  achieved: boolean;
  unlocktime: number; // Unix timestamp (0 if locked)
  hidden: boolean;
};

export const useAchievements = (appId: number) => {
  const steamId = useAppSelector(state => state.auth.steamId);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyResolved, setKeyResolved] = useState(false);

  useEffect(() => {
    Keychain.getGenericPassword({ service: 'steam_api_key' })
      .then(creds => setApiKey(creds ? creds.password : null))
      .catch(() => setApiKey(null))
      .finally(() => setKeyResolved(true));
  }, []);

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.games.achievements(appId),
    queryFn: async (): Promise<MergedAchievement[]> => {
      // 1. Check SQLite cache freshness
      const [cacheRow] = await db.select()
        .from(achievementCache)
        .where(eq(achievementCache.appId, appId))
        .limit(1);

      const [gameRow] = await db.select({ rtimeLastPlayed: steamGames.rtimeLastPlayed })
        .from(steamGames)
        .where(eq(steamGames.appId, appId))
        .limit(1);

      const rtimeLastPlayed = gameRow?.rtimeLastPlayed ?? 0;

      // 2. If cache is fresh, return it immediately (no API call)
      if (cacheRow && cacheRow.cachedAt >= rtimeLastPlayed) {
        try {
          return JSON.parse(cacheRow.data) as MergedAchievement[];
        } catch {
          // Corrupted cache — fall through to API fetch
        }
      }

      // 3. Cache stale or missing — fetch from Steam API
      const [schema, progress] = await Promise.allSettled([
        getGameSchema(apiKey!, appId),
        getPlayerAchievements(apiKey!, steamId!, appId),
      ]);

      // If schema failed fatally, no achievements to show
      if (schema.status === 'rejected') {
        const err = schema.reason;
        if (isAppError(err) && err.code === 'UNAUTHORIZED') throw err;
        return []; // NOT_FOUND or other → empty
      }

      const schemaAchievements = schema.value.game.availableGameStats?.achievements ?? [];
      if (schemaAchievements.length === 0) return [];

      // If player progress failed, show schema-only (all locked)
      const playerMap = new Map<string, { achieved: number; unlocktime: number }>();
      if (progress.status === 'fulfilled') {
        for (const pa of progress.value.playerstats.achievements) {
          playerMap.set(pa.apiname, { achieved: pa.achieved, unlocktime: pa.unlocktime ?? 0 });
        }
      } else {
        const err = progress.reason;
        if (isAppError(err) && err.code === 'UNAUTHORIZED') throw err;
        // NOT_FOUND or network → treat as all locked
      }

      const merged: MergedAchievement[] = schemaAchievements.map(sa => {
        const pa = playerMap.get(sa.name);
        return {
          apiname: sa.name,
          displayName: sa.displayName,
          description: sa.description,
          icon: sa.icon,
          icongray: sa.icongray,
          achieved: pa ? pa.achieved === 1 : false,
          unlocktime: pa?.unlocktime ?? 0,
          hidden: sa.hidden === 1,
        };
      });

      // Sort: unlocked first (newest unlock first), then locked
      merged.sort((a, b) => {
        if (a.achieved && !b.achieved) return -1;
        if (!a.achieved && b.achieved) return 1;
        if (a.achieved && b.achieved) return b.unlocktime - a.unlocktime;
        return 0; // both locked — preserve schema order
      });

      // 4. Persist to SQLite cache
      const unlockedCount = merged.filter(a => a.achieved).length;
      const nowUnix = Math.floor(Date.now() / 1000);
      await db.insert(achievementCache)
        .values({
          appId,
          cachedAt: nowUnix,
          unlockedCount,
          totalCount: merged.length,
          data: JSON.stringify(merged),
        })
        .onConflictDoUpdate({
          target: achievementCache.appId,
          set: {
            cachedAt: nowUnix,
            unlockedCount,
            totalCount: merged.length,
            data: JSON.stringify(merged),
          },
        });

      return merged;
    },
    enabled: !!apiKey && !!steamId,
    staleTime: Infinity, // queryFn handles freshness via SQLite timestamp comparison
    retry: 1,
  });

  const achievements = data ?? [];
  const totalCount = achievements.length;
  const unlockedCount = achievements.filter(a => a.achieved).length;

  // When credentials are resolved but missing, the query stays disabled (isPending: true
  // in TanStack Query v5). Override to false so the UI shows empty state, not infinite skeleton.
  const credsMissing = keyResolved && (!apiKey || !steamId);
  const effectivePending = credsMissing ? false : isPending;

  return { achievements, totalCount, unlockedCount, isPending: effectivePending, isError };
};
