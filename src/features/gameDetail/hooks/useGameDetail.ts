import { useQuery } from '@tanstack/react-query';
import { eq } from 'drizzle-orm';
import { db } from '@db/index';
import { steamGames } from '@db/schema';
import { queryKeys } from '@shared/queryKeys';

export const useGameDetail = (appId: number) => {
  const { data: game, isPending, isError } = useQuery({
    queryKey: queryKeys.games.detail(appId),
    queryFn: async () => {
      const result = await db.select().from(steamGames).where(eq(steamGames.appId, appId)).limit(1);
      return result[0] ?? null;
    },
    staleTime: Infinity,
  });

  return { game, isPending, isError };
};
