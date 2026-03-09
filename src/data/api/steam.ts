import Config from "react-native-config";
import type { SteamError } from "@shared/types/errors.types";
import type { SteamAppData, SteamAppDetailsResponse, SteamOwnedGamesResponse, GetRecentlyPlayedGamesResponse } from "@shared/types/steam.types";
import { steamFetch, storeFetch } from "./httpClient";
import { API_BASE_URLS } from "@shared/types/httpClient.types";

/** @deprecated Prototype only — reads API key from env var. Use getOwnedGamesWithKey (Keychain) instead. */
const getOwnedGames = (steamId: string): Promise<SteamOwnedGamesResponse> => {
  const params = new URLSearchParams({
    key: Config.STEAM_API_KEY,
    steamid: steamId,
    format: 'json',
    include_appinfo: 'true',
  });
  return steamFetch<SteamOwnedGamesResponse>(
    'IPlayerService/GetOwnedGames/v0001/',
    params,
  );
};

const getAppDetails = async (appid: number): Promise<SteamAppData> => {
  const params = new URLSearchParams({
    appids: appid.toString(),
    cc: 'US',
    l: 'english',
    // filters: 'basic,genres,categories,developers,publishers',
  });
  const data = await storeFetch<SteamAppDetailsResponse>(
    'appdetails',
    params
  );
  const detail = data[appid.toString()];

  if (!detail?.success || !detail.data) {
    throw new Error(`App ${appid} details failed`);
  }

  return detail.data;
};

const getManyAppDetails = async (appids: number[]): Promise<SteamAppData[]> => {
  const promises = appids.map(async (appid) => getAppDetails(appid));
  return Promise.all(promises);
};

interface SteamPlayerSummary {
  steamid: string;
  personaname: string;
  avatarfull: string;
}

interface SteamPlayerSummariesResponse {
  response: {
    players: SteamPlayerSummary[];
  };
}

// NOTE: Uses raw fetch (not steamFetch) to inspect the HTTP status code directly.
// steamFetch swallows non-ok responses as a generic Error and loses the status value.
// 401/403 must be distinguished from other errors to trigger session expiry (AC4).
const getPlayerSummaries = async (
  apiKey: string,
  steamId: string,
): Promise<SteamPlayerSummariesResponse> => {
  const queryString =
    'key=' + encodeURIComponent(apiKey) +
    '&steamids=' + encodeURIComponent(steamId) +
    '&format=json';
  const url = `${API_BASE_URLS.steam}/ISteamUser/GetPlayerSummaries/v0002/?${queryString}`;

  const response = await fetch(url);

  if (response.status === 401 || response.status === 403) {
    const steamError: SteamError = {
      type: 'SteamError',
      code: 'UNAUTHORIZED',
      message: `Steam API returned ${response.status}`,
    };
    throw steamError;
  }

  if (!response.ok) {
    throw new Error(`Steam API error: ${response.status}`);
  }

  const data = await response.json() as SteamPlayerSummariesResponse;

  // Steam returns 200 with empty players for invalid/unauthorized keys
  if (!data?.response?.players?.length) {
    throw new Error('Steam API returned no players — API key may be invalid or not yet active');
  }

  return data;
};

// NOTE: Uses raw fetch to preserve HTTP status code for 401/403 detection.
// The user-supplied API key is read from Keychain (production pattern) — not Config.STEAM_API_KEY.
export const getOwnedGamesWithKey = async (
  apiKey: string,
  steamId: string,
): Promise<SteamOwnedGamesResponse> => {
  const queryString =
    'key=' + encodeURIComponent(apiKey) +
    '&steamid=' + encodeURIComponent(steamId) +
    '&format=json' +
    '&include_appinfo=1';
  const url = `${API_BASE_URLS.steam}/IPlayerService/GetOwnedGames/v0001/?${queryString}`;

  const response = await fetch(url);

  if (response.status === 401 || response.status === 403) {
    const steamError: SteamError = {
      type: 'SteamError',
      code: 'UNAUTHORIZED',
      message: `Steam API returned ${response.status}`,
    };
    throw steamError;
  }

  if (!response.ok) {
    throw new Error(`Steam API error: ${response.status}`);
  }

  return (await response.json()) as SteamOwnedGamesResponse;
};

export const getRecentlyPlayedGamesWithKey = async (
  apiKey: string,
  steamId: string,
  count: number = 10,
): Promise<GetRecentlyPlayedGamesResponse> => {
  const queryString =
    'key=' + encodeURIComponent(apiKey) +
    '&steamid=' + encodeURIComponent(steamId) +
    '&count=' + count +
    '&format=json';
  const url = `${API_BASE_URLS.steam}/IPlayerService/GetRecentlyPlayedGames/v0001/?${queryString}`;

  const response = await fetch(url);

  if (response.status === 401 || response.status === 403) {
    const steamError: SteamError = {
      type: 'SteamError',
      code: 'UNAUTHORIZED',
      message: `Steam API returned ${response.status}`,
    };
    throw steamError;
  }

  if (!response.ok) {
    throw new Error(`Steam API error: ${response.status}`);
  }

  return (await response.json()) as GetRecentlyPlayedGamesResponse;
};

export { getOwnedGames, getAppDetails, getManyAppDetails, getPlayerSummaries };
export type { SteamPlayerSummary, SteamPlayerSummariesResponse };