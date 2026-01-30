import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { RootState } from '../data/store';
import { SteamOwnedGamesResponse } from '../types/steam.types';
import { getOwnedGames } from '../data/api/steam';

export const useSteamLibrary = () => {
  const steamId = useSelector((state: RootState) => state.user.steamId);

  return useQuery<SteamOwnedGamesResponse>({
    queryKey: ['steamLibrary', steamId],
    queryFn: () => getOwnedGames(steamId!), // steamId! is safe here due to the enabled condition
    enabled: !!steamId,
    staleTime: 5 * 60 * 1000,  // 5 min
    retry: 2,
  });
};