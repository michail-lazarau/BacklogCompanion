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

interface ReducedSteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  rtime_last_played: number;
  playtime_2weeks?: number;
  content_descriptorids?: number[];
}

interface SteamAppDetailsResponse {
  [appid: string]: AppDetailResponse;
}

interface AppDetailResponse {
  success: boolean;
  data?: SteamAppData;
}

// https://store.steampowered.com/api
interface SteamAppData {
  type: string;
  name: string;
  steam_appid: number;
  required_age: string;
  is_free: boolean;
  controller_support: string;
  dlc: number[];
  detailed_description?: string;
  about_the_game: string;
  short_description: string;
  supported_languages: string;
  header_image: string;
  capsule_image?: string;
  capsule_imagev5?: string;
  website?: string;
  pc_requirements: SystemRequirements;
  mac_requirements?: SystemRequirements;
  linux_requirements?: SystemRequirements;
  legal_notice: string;
  developers?: string[];
  publishers?: string[];
  price_overview?: PriceOverview;
  packages?: number[];
  package_groups?: PackageGroup[];
  platforms: Platforms;
  categories?: Category[];
  genres?: Genre[];
  screenshots?: Screenshot[];
  movies?: Movie[];
  recommendations?: Recommendations;
  achievements?: Achievements;
  release_date?: ReleaseDate;
  support_info?: SupportInfo;
  background: string;
  background_raw: string;
  content_descriptors: ContentDescriptors;
  ratings: Ratings;
}

interface SystemRequirements {
  minimum: string;
  recommended: string;
}

interface PriceOverview {
  currency: string;
  initial: number;
  final: number;
  discount_percent: number;
  initial_formatted: string;
  final_formatted: string;
}

interface PackageGroup {
  name: string;
  title: string;
  description: string;
  selection_text: string;
  save_text: string;
  display_type: number;
  is_recurring_subscription: string; // "false"/"true" in payload
  subs: PackageSub[];
}

interface PackageSub {
  packageid: number;
  percent_savings_text: string;
  percent_savings: number;
  option_text: string;
  option_description: string;
  can_get_free_license: string; // "0"/"1" in payload
  is_free_license: boolean;
  price_in_cents_with_discount: number;
}

interface Platforms {
  windows: boolean;
  mac: boolean;
  linux: boolean;
}

interface Category {
  id: number;
  description: string;
}

interface Genre {
  id: string;
  description: string;
}

interface Screenshot {
  id: number;
  path_thumbnail: string;
  path_full: string;
}

interface Movie {
  id: number;
  name: string;
  thumbnail: string;
  dash_av1: string;
  dash_h264: string;
  hls_h264: string;
  highlight: boolean;
}

interface Recommendations {
  total: number;
}

interface Achievements {
  total: number;
  highlighted: AchievementHighlight[];
}

interface AchievementHighlight {
  name: string;
  path: string;
}

interface ReleaseDate {
  coming_soon: boolean;
  date: string;
}

interface SupportInfo {
  url: string;
  email: string;
}

interface ContentDescriptors {
  ids: number[];
  notes: null;
}

interface Ratings {
  esrb: EsrbRating;
  oflc: OflcRating;
  nzoflc: NzoflcRating;
  pegi: PegiRating;
  dejus: DejusRating;
  usk: UskRating;
  steam_germany: SteamGermanyRating;
}

interface EsrbRating {
  rating: string;
  descriptors: string;
  required_age: string;
  use_age_gate: string;
  interactive_elements: string;
}

interface OflcRating {
  rating: string;
  descriptors: string;
  required_age: string;
  use_age_gate: string;
}

interface NzoflcRating {
  rating: string;
  descriptors: string;
  use_age_gate: string;
  required_age: string;
}

interface PegiRating {
  rating: string;
  descriptors: string;
  required_age: string;
  use_age_gate: string;
}

interface DejusRating {
  rating: string;
  descriptors: string;
  use_age_gate: string;
  required_age: string;
}

interface UskRating {
  rating: string;
  required_age: string;
}

interface SteamGermanyRating {
  rating_generated: string;
  rating: string;
  required_age: string;
  banned: string;
  use_age_gate: string;
  descriptors: string;
}

// https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v0002

interface Stat {
  name: string;
  defaultvalue: number;
  displayName?: string;
}

interface Achievement {
  name: string;
  defaultvalue: number;
  displayName: string;
  hidden?: number;
  description?: string;
  icon: string;
  icongray: string;
}

interface AvailableGameStats {
  stats: Stat[];
  achievements: Achievement[];
}

interface GameSchema {
  gameName: string;
  gameVersion: string;
  availableGameStats: AvailableGameStats;
}

interface SteamGameSchemaResponse {
  game: GameSchema;
}

// https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/

interface AchievementProgress {
  apiname: string;
  achieved: number;  // 0 или 1
  unlocktime?: number;  // unix timestamp
}

interface PlayerStats {
  steamID: string;
  gameName: string;
  achievements: AchievementProgress[];
  success: boolean;
}

interface SteamPlayerAchievementsResponse {
  playerstats: PlayerStats;
}

interface LLMGameSuggestionResponse {
  reasoning: string;
  appids: number[];
}

export type { SteamOwnedGamesResponse, SteamGame, SteamAppData, SteamAppDetailsResponse, ReducedSteamGame , LLMGameSuggestionResponse };