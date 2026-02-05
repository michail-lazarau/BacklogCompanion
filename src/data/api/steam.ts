import Config from "react-native-config";
import { SteamAppData, SteamAppDetailsResponse, SteamOwnedGamesResponse } from "../../types/steam.types";
import { steamFetch, storeFetch } from "./httpClient";

export const getOwnedGames = (steamId: string): Promise<SteamOwnedGamesResponse> => {
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

export const getAppDetails = async (appid: number): Promise<SteamAppData> => {
  const params = new URLSearchParams({
    appids: appid.toString(),
    cc: 'US',
    l: 'russian',
    filters: 'basic,header_image',
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

export const getManyAppDetails = async (appids: number[]): Promise<SteamAppData[]> => {
  const promises = appids.map(async (appid) => getAppDetails(appid));
  return Promise.all(promises);
};