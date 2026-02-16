export interface LibraryStats {
  totalGames: number;
  totalPlaytimeHours: number;
  unplayedCount: number;
  // topMostPlayed: Array<{
  //   appid: number;
  //   name: string;
  //   hours: number;
  // }>;
}

export interface GameGroup {
  label: string;
  count: number;
  avgHours: number;
  totalHours: number;
  lastPlayed?: number;
  sampleGames: Array<{
    // appid: number;
    name: string;
    // hours: number;
  }>;
  genres?: string[];
  categories?: string[];  // "Multiplayer", "Co-op", "Single-Player"
  developers?: string[];
  publishers?: string[];
}

export interface SeriesStats {
  seriesName: string;
  owned: number;
  totalHours: number;
  unplayed: number;
  lastPlayed?: number;
}

export interface CompressedLibrary {
  stats: LibraryStats;
  groups: Record<string, GameGroup[]>;
  // series: SeriesStats[];
}

export interface CachedMetadata {
  genres: string[];
  categories: string[];
  developers: string[];
  publishers: string[];
  cachedAt: number;
}

export interface GameMetadataState {
  metadata: Record<string, CachedMetadata>;
}