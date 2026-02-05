interface SteamOwnedGamesResponse {
  response: {
    game_count: number;
    games: SteamGame[];
  };
}

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url: string;
  img_logo_url?: string;
  has_community_visible_stats?: boolean;
  playtime_windows_forever?: number;
  playtime_mac_forever?: number;
  playtime_linux_forever?: number;
  playtime_deck_forever?: number;
  rtime_last_played?: number;
  rtime_updated?: number;
  content_descriptorids?: number[];
  playtime_disconnected?: number;
  has_leaderboards?: boolean;
}

interface SteamAppDetailsResponse {
  [appid: string]: AppDetailResponse;
}

interface AppDetailResponse {
  success: boolean;
  data?: SteamAppData;
}

interface SteamAppData {
  type: string;
  name: string;
  steam_appid: number;
  header_image: string;
  capsule_image?: string;
  short_description: string;
  detailed_description?: string;
  genres?: Array<{ id: string; description: string }>;
  // ... other fields can be added as needed
}

export type { SteamOwnedGamesResponse, SteamGame, SteamAppData, SteamAppDetailsResponse };