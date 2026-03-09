import { useQuery } from '@tanstack/react-query';
import { asc } from 'drizzle-orm';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import { queryKeys } from '@shared/queryKeys';
import { db } from '@db/index';
import { steamGames } from '@db/schema';
import type { SteamGame } from '@db/schema';
import { mmkv } from '../../../data/mmkv';
import { MMKV_KEYS } from '@shared/constants';

export const useGameLibrary = () => {
  const steamId = useAppSelector((state) => state.auth.steamId);

  return useQuery<SteamGame[]>({
    queryKey: queryKeys.games.all(steamId ?? ''),
    queryFn: () =>
      db.select().from(steamGames).orderBy(asc(steamGames.name)),
    enabled: !!steamId,
    placeholderData: () => {
      const raw = mmkv.getString(MMKV_KEYS.LIBRARY_SNAPSHOT);
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as SteamGame[];
      } catch {
        return undefined;
      }
    },
  });
};
