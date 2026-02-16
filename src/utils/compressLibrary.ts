import type { ReducedSteamGame } from '../types/steam.types';
import type { 
  CompressedLibrary, 
  LibraryStats, 
  GameGroup, 
  SeriesStats, 
  CachedMetadata
} from '../types/compressed-library.types';
import {
  getCachedMetadata,
  prefetchTopGamesMetadata 
} from './gameMetadataCache';
import { calculateSimilarity, getSemanticKey } from './gameSimilarity';

const playtimeSelector = (game: ReducedSteamGame) => game.playtime_forever;

export async function compressLibrary(
  games: ReducedSteamGame[]
): Promise<CompressedLibrary> {
  // Предзагружаем метаданные для топ‑игр (background)
  prefetchTopGamesMetadata(games).catch(console.warn);

  const stats = computeLibraryStats(games);
  const groups = await createGameGroups(games);
  const series = extractSeriesStats(games);

  return {
    stats,
    groups,
    series,
  };
}

function computeLibraryStats(games: ReducedSteamGame[]): LibraryStats {
  const totalPlaytimeMinutes = games.reduce((sum, g) => sum + g.playtime_forever, 0);
  const topMostPlayedLimit = 10;
  return {
    totalGames: games.length,
    totalPlaytimeHours: Math.round(totalPlaytimeMinutes / 60 * 10) / 10,
    unplayedCount: games.filter(g => g.playtime_forever === 0).length,
    // activeLast3MonthsCount: games.filter(g => {
    //   const threeMonthsAgo = Date.now() / 1000 - 90 * 24 * 60 * 60;
    //   return g.rtime_last_played && g.rtime_last_played > threeMonthsAgo;
    // }).length,
    topMostPlayed: games
      .sort((a, b) => b.playtime_forever - a.playtime_forever)
      .slice(0, topMostPlayedLimit)
      .map(g => ({
        appid: g.appid,
        name: g.name,
        hours: Math.round(g.playtime_forever / 60 * 10) / 10,
      })),
  };
}

async function createGameGroups(games: ReducedSteamGame[]): Promise<GameGroup[]> {
  const groups: GameGroup[] = [];

  // 1. Unplayed backlog
  const unplayed = games.filter(g => g.playtime_forever === 0);
  const unplayedGroups = await createSemanticGroups(unplayed, 'Unplayed');
  groups.push(...unplayedGroups);

  // 2. Recently active
  const recent = games.filter(g => g.playtime_2weeks && g.playtime_2weeks > 60);
  const recentGroups = await createSemanticGroups(recent, 'Recent');
  groups.push(...recentGroups);

  // 3. Low hours (abandoned)
  const lowHours = games.filter(g => g.playtime_forever > 0 && g.playtime_forever < 120);
  const lowGroups = await createSemanticGroups(lowHours, 'Low hours');
  groups.push(...lowGroups);

  // 4. High hours but inactive
  const highHoursInactive = games.filter(g => 
    g.playtime_forever > 10 * 60 &&  // > 10h total
    (!g.playtime_2weeks || g.playtime_2weeks === 0)
  );
  const inactiveGroups = await createSemanticGroups(highHoursInactive, 'High hours inactive');
  groups.push(...inactiveGroups);

  // 5. All time favorites
  const favorites = games
  .sort((a, b) => b.playtime_forever - a.playtime_forever).slice(0, 20);
  const favoriteGroups = await createSemanticGroups(favorites, 'All time favorites');
  groups.push(...favoriteGroups);

  console.log('Created groups:', groups);
  return groups;
//   return groups.slice(0, 20);
}

async function createSemanticGroups(
  behaviorGroup: ReducedSteamGame[], 
  label: string,
  similarityThreshold = 0.7
): Promise<GameGroup[]> {
  const diverseSample = diverseSampleByGenre(behaviorGroup);

  const semanticGroups: Record<string, {
    games: ReducedSteamGame[];
    metadata: CachedMetadata | null;
  }> = {};

  for (const game of diverseSample) {
    const key = await getSemanticKey(game);
    if (!key) continue;
    
    // Ищем похожие игры
    let assigned = false;
    for (const [groupKey, group] of Object.entries(semanticGroups)) {
      // Берём representative из группы
      const repGame = group.games[0];
      const repKey = await getSemanticKey(repGame);
      if (!repKey) continue;
      
      const similarity = calculateSimilarity(
        key, repKey, 
        game.name, repGame.name
      );

      if (similarity >= similarityThreshold) {
        // Добавляем в существующую группу
        group.games.push(game);
        assigned = true;
        break;
      }
    }
    
    if (!assigned) {
      // Создаём новую группу
      const metadata = await getCachedMetadata(game.appid);
      const newKey = `${key.genres}|${key.dev}`;
      semanticGroups[newKey] = {
        games: [game],
        metadata: metadata,
      };
    }
  }

  return Object.entries(semanticGroups)
    // .filter(([, group]) => group.games.length >= 1)
    .map(([keyStr, group]) => ({
        label: generateGroupLabel(label, keyStr, group.metadata),
        count: group.games.length,
        avgHours: Math.round(
          sumBy(group.games, playtimeSelector) / group.games.length / 60 * 10
        ) / 10,
        totalHours: Math.round(sumBy(group.games, playtimeSelector) / 60 * 10) / 10,
        sampleGames: group.games.slice(0, 2).map(g => ({
          appid: g.appid,
          name: g.name,
          hours: Math.round(g.playtime_forever / 60 * 10) / 10,
        })),
        genres: group.metadata?.genres || [],
        developers: group.metadata?.developers || [],
        publishers: group.metadata?.publishers || [],
      }));
    // .slice(0, 8);
}

function diverseSampleByGenre(
  games: ReducedSteamGame[], 
  maxCount: number = 20
): ReducedSteamGame[] {
  if (games.length === 0) return [];

  // 1. ✅ Name-based "genres" (эвристика: Warhammer=Strategy, CS=Shooter)
  const seriesMap = new Map<string, ReducedSteamGame[]>();
  
  games.forEach(game => {
    const primarySeries = extractSeriesName(game.name);
    if (!primarySeries) return;
    
    if (!seriesMap.has(primarySeries)) {
      seriesMap.set(primarySeries, []);
    }
    seriesMap.get(primarySeries)!.push(game);
  });

  // 2. Sample по 2-3 из серии (max 10 серий)
  const sample: ReducedSteamGame[] = [];
  const sortedSeries = Array.from(seriesMap.entries())
    .sort(([,a], [,b]) => b.length - a.length);  // Крупные серии первыми

  for (const [_, group] of sortedSeries.slice(0, 10)) {
    sample.push(...group.slice(0, 3));
    if (sample.length >= maxCount) break;
  }

  // 3. Fallback если мало
  const remaining = games.filter(g => 
    !sample.some(s => s.appid === g.appid)
  );
  sample.push(...remaining.slice(0, maxCount - sample.length));

  return sample;
}

function generateGroupLabel(label: string, keyStr: string, metadata: CachedMetadata | null): string {
  const [genresStr] = keyStr.split('|'); // genres только!
  const genres = genresStr.split(',').slice(0, 2);
  
  const dev = metadata?.developers?.[0] || 'Indie';
  return `${label} - ${genres[0]} by ${dev}`;
}

function extractSeriesStats(games: ReducedSteamGame[]): SeriesStats[] {
  const seriesMap = new Map<string, {
    owned: number;
    totalHours: number;
    unplayed: number;
    lastPlayed?: number;
  }>();

  for (const game of games) {
    const seriesName = extractSeriesName(game.name);
    if (!seriesName) continue;

    const key = seriesName.toLowerCase();
    const prev = seriesMap.get(key) || {
      owned: 0,
      totalHours: 0,
      unplayed: 0,
      lastPlayed: 0,
    };

    seriesMap.set(key, {
      owned: prev.owned + 1,
      totalHours: prev.totalHours + game.playtime_forever / 60,
      unplayed: prev.unplayed + (game.playtime_forever === 0 ? 1 : 0),
      lastPlayed: Math.max(prev.lastPlayed || 0, game.rtime_last_played || 0),
    });
  }

  return Array.from(seriesMap.entries())
    .map(([seriesName, stats]) => ({
      seriesName,
      owned: stats.owned,
      totalHours: Math.round(stats.totalHours),
      unplayed: stats.unplayed,
      lastPlayed: stats.lastPlayed,
    }))
    .filter(s => s.owned >= 3)
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 10);
}

function extractSeriesName(name: string): string | null {
  // Простая эвристика для MVP
  const cleaned = name
    .replace(/[\(\[].*?[\)\]]/g, '')  // убрать (Test Server), [Demo]
    .replace(/[^\w\s]/g, ' ')         // знаки в пробелы
    .trim();

  const words = cleaned.split(/\s+/).filter(w => w.length > 2);
  
  // Если есть числовые суффиксы (RE2, RE4), взять базовое имя
  if (words.length >= 2) {
    return `${words[0]} ${words[1]}`;
  }
  
  return words[0] || null;
}

function sumBy<T>(array: T[], selector: (item: T) => number): number {
  return array.reduce((sum, item) => sum + selector(item), 0);
}
