import type { ReducedSteamGame, SteamOwnedGamesResponse } from '../types/steam.types';

export const reduceOwnedGames = (response: SteamOwnedGamesResponse): ReducedSteamGame[] =>
  (response.response?.games || []).map(game => ({
    appid: game.appid,
    name: game.name,
    playtime_forever: game.playtime_forever || 0,
    rtime_updated: game.rtime_updated || 0,
    content_descriptorids: game.content_descriptorids || [],
    playtime_recently: game.rtime_last_played || 0,
  }));