import Config from 'react-native-config';
import type { SteamOwnedGamesResponse } from '../../types/steam.types';

const STEAM_API_BASE_URL = 'https://api.steampowered.com';

/**
 * A generic fetch wrapper for making API requests.
 * It handles JSON parsing and basic error handling.
 * @param endpoint The API endpoint to call.
 * @param params URL search parameters.
 * @returns The JSON response.
 */
async function steamApiFetch<T>(endpoint: string, params: URLSearchParams): Promise<T> {
  const url = `${STEAM_API_BASE_URL}/${endpoint}?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Steam API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const getOwnedGames = (steamId: string): Promise<SteamOwnedGamesResponse> => {
  const params = new URLSearchParams({
    key: Config.STEAM_API_KEY,
    steamid: steamId,
    format: 'json',
    include_appinfo: 'true',
  });
  return steamApiFetch<SteamOwnedGamesResponse>('IPlayerService/GetOwnedGames/v0001/', params);
};