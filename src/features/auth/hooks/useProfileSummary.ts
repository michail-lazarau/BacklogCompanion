import { useQuery } from '@tanstack/react-query';
import * as Keychain from 'react-native-keychain';
import { queryKeys } from '@shared/queryKeys';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import type { SteamError } from '@shared/types/errors.types';
import { useSessionExpiry } from '@features/auth/hooks/useSessionExpiry';
import { STEAM_KEYCHAIN_SERVICES } from '@features/auth/hooks/useSteamAuth';
import { getPlayerSummaries } from '../../../data/api/steam';
import type { SteamPlayerSummary } from '../../../data/api/steam';

const isSteamError = (e: unknown): e is SteamError =>
  typeof e === 'object' &&
  e !== null &&
  (e as SteamError).type === 'SteamError';

export const useProfileSummary = () => {
  const steamId = useAppSelector((state) => state.auth.steamId);
  const { handleSteamAuthError } = useSessionExpiry();

  return useQuery<SteamPlayerSummary | null>({
    queryKey: queryKeys.profile.summary(steamId ?? ''),
    enabled: !!steamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    queryFn: async () => {
      const creds = await Keychain.getGenericPassword({
        service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY,
      });
      if (!creds) return null;

      try {
        const result = await getPlayerSummaries(creds.password, steamId!);
        return result.response.players[0] ?? null;
      } catch (e) {
        if (isSteamError(e) && e.code === 'UNAUTHORIZED') {
          await handleSteamAuthError(e);
          throw e; // let TanStack Query set isError=true; navigation occurs via handleSteamAuthError
        }
        throw e;
      }
    },
  });
};
