import type { ReducedSteamGame, SteamOwnedGamesResponse } from '../types/steam.types';

export const reduceOwnedGames = (response: SteamOwnedGamesResponse): ReducedSteamGame[] =>
  (response.response?.games || []).map(game => ({
    appid: game.appid,
    name: game.name,
    playtime_forever: game.playtime_forever || 0,
    rtime_last_played: game.rtime_last_played || 0,
    playtime_2weeks: game.playtime_2weeks || 0,
    content_descriptorids: game.content_descriptorids || [],
  }));