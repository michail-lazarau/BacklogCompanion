import { useQuery } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';
import { db } from '@db/index';
import { steamGames } from '@db/schema';
import { queryKeys } from '@shared/queryKeys';
import { searchHltb } from '@shared/utils/hltbClient';
import { HLTB_CACHE_TTL_MS } from '@shared/constants';

export type HltbData = {
  main: number;   // seconds
  extra: number;  // seconds
  complete: number; // seconds
};

export const useHltbData = (appId: number, gameName: string | undefined) => {
  const { data: hltbData, isPending, isError } = useQuery({
    queryKey: queryKeys.games.hltb(appId),
    queryFn: async (): Promise<HltbData> => {
      // 1. Check SQLite cache
      const [row] = await db.select({
        hltbMain: steamGames.hltbMain,
        hltbExtra: steamGames.hltbExtra,
        hltbComplete: steamGames.hltbComplete,
        hltbCachedAt: steamGames.hltbCachedAt,
      }).from(steamGames).where(eq(steamGames.appId, appId)).limit(1);

      // 2. Cache fresh? Return immediately
      if (row?.hltbCachedAt) {
        const age = Date.now() - row.hltbCachedAt.getTime();
        if (age < HLTB_CACHE_TTL_MS) {
          return {
            main: row.hltbMain ?? 0,
            extra: row.hltbExtra ?? 0,
            complete: row.hltbComplete ?? 0,
          };
        }
      }

      // 3. Fetch from HLTB API
      const result = await searchHltb(gameName!);
      if (!result) {
        return { main: 0, extra: 0, complete: 0 };
      }

      // 4. Persist to SQLite
      await db.update(steamGames)
        .set({
          hltbMain: result.mainStory,
          hltbExtra: result.mainExtra,
          hltbComplete: result.completionist,
          hltbCachedAt: new Date(), // Drizzle converts to Unix int
        })
        .where(eq(steamGames.appId, appId));

      return {
        main: result.mainStory,
        extra: result.mainExtra,
        complete: result.completionist,
      };
    },
    enabled: !!gameName,
    staleTime: Infinity,
    retry: 1,
  });

  return { hltbData, isPending, isError };
};
