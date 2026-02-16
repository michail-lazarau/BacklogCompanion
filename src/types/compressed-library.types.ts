export interface LibraryStats {
  totalGames: number;
  totalPlaytimeHours: number;
  unplayedCount: number;
  // activeLast3MonthsCount: number;
  topMostPlayed: Array<{
    appid: number;
    name: string;
    hours: number;
  }>;
}

export interface GameGroup {
  label: string;
  count: number;
  avgHours: number;
  totalHours: number;
  lastPlayed?: number;
  sampleGames: Array<{
    appid: number;
    name: string;
    hours: number;
  }>;
  genres?: string[];
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
  groups: GameGroup[];
  series: SeriesStats[];
}

export interface CachedMetadata {
  genres: string[];
  developers: string[];
  publishers: string[];
  cachedAt: number;
}

export interface GameMetadataState {
  metadata: Record<string, CachedMetadata>;
}