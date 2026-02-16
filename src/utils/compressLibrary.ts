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
  const _ = await prefetchTopGamesMetadata(games).catch(console.warn);

  const stats = computeLibraryStats(games);
  const groups = await createGameGroups(games);
//   const series = extractSeriesStats(games);

  return {
    stats,
    groups,
    // series,
  };
}

function computeLibraryStats(games: ReducedSteamGame[]): LibraryStats {
  const totalPlaytimeMinutes = games.reduce((sum, g) => sum + g.playtime_forever, 0);
  const topMostPlayedLimit = 10;
  return {
    totalGames: games.length,
    totalPlaytimeHours: Math.round(totalPlaytimeMinutes / 60 * 10) / 10,
    unplayedCount: games.filter(g => g.playtime_forever === 0).length,
    // topMostPlayed: games
    //   .sort((a, b) => b.playtime_forever - a.playtime_forever)
    //   .slice(0, topMostPlayedLimit)
    //   .map(g => ({
    //     appid: g.appid,
    //     name: g.name,
    //     hours: Math.round(g.playtime_forever / 60 * 10) / 10,
    //   })),
  };
}

async function createGameGroups(games: ReducedSteamGame[]): Promise<Record<string, GameGroup[]>> {
  const groupsByLabel: Record<string, GameGroup[]> = {};

  const addGroups = (label: string, next: GameGroup[]) => {
    if (!groupsByLabel[label]) groupsByLabel[label] = [];
    groupsByLabel[label].push(...next);
  };

  const unplayed = games.filter(g => g.playtime_forever === 0);
  const unplayedGroups = await createSemanticGroupsFast(unplayed, 'Unplayed');
  addGroups('Unplayed', unplayedGroups);

  const recent = games.filter(g => g.playtime_2weeks && g.playtime_2weeks > 60);
  const recentGroups = await createSemanticGroupsFast(recent, 'Recent');
  addGroups('Recent', recentGroups);

//   const lowHours = games.filter(g => g.playtime_forever > 0 && g.playtime_forever < 120);
//   const lowGroups = await createSemanticGroupsFast(lowHours, 'Low hours');
//   addGroups('Low hours', lowGroups);

  const highHoursInactive = games.filter(g => 
    g.playtime_forever > 10 * 60 && (!g.playtime_2weeks || g.playtime_2weeks === 0)
  );
  const inactiveGroups = await createSemanticGroupsFast(highHoursInactive, 'High hours inactive');
  addGroups('High hours inactive', inactiveGroups);

//   const favorites = games.sort((a, b) => b.playtime_forever - a.playtime_forever).slice(0, 20);
//   const favoriteGroups = await createSemanticGroupsFast(favorites, 'All time favorites');
//   addGroups('All time favorites', favoriteGroups);

  console.log('Created groups:', groupsByLabel);
  return groupsByLabel;
}

function playtimeAwareSample(games: ReducedSteamGame[], maxCount: number = 25): ReducedSteamGame[] {
  if (games.length === 0) return [];

  // 1. Series >=2 с score = size * (avg_hours + 0.5)
  const seriesMap = new Map<string, ReducedSteamGame[]>();
  games
//   .slice(0, 60)
  .forEach(game => {
    const series = extractSeriesName(game.name);
    if (series) {
      if (!seriesMap.has(series)) seriesMap.set(series, []);
      seriesMap.get(series)!.push(game);
    }
  });

  // 2. Score + hours-sort внутри
  const scoredSeries = Array.from(seriesMap.entries())
    .filter(([,group]) => group.length >= 2)
    .map(([series, group]) => {
      const avgHours = group.reduce((sum, g) => sum + g.playtime_forever, 0) / group.length / 60;
      const score = group.length * (avgHours + 0.5);  // 0h ≠ 0!
      return { 
        series, 
        group: group.sort((a,b) => b.playtime_forever - a.playtime_forever),
        score 
      };
    })
    .sort((a,b) => b.score - a.score);

  // 3. Топ-2 из топ серий
  const sample: ReducedSteamGame[] = [];
  for (const { group } of scoredSeries
    // .slice(0, 10)
) {
    sample.push(...group.slice(0, 2));
    if (sample.length >= maxCount * 0.7) break;
  }

  // 4. Fallback: топ hours одиночки
  const singles = games
    .filter(g => !sample.some(s => s.appid === g.appid))
    .sort((a,b) => b.playtime_forever - a.playtime_forever);
  sample.push(...singles.slice(0, maxCount - sample.length));

  return sample;
}

async function createSemanticGroupsFast(
  behaviorGroup: ReducedSteamGame[], 
  label: string
): Promise<GameGroup[]> {
  // 1. Playtime-aware sample (25 weighted игр)
  const sample = playtimeAwareSample(behaviorGroup, 25);

  // 2. Canopy по primary genre+dev (O(n))
  const canopyMap = new Map<string, ReducedSteamGame[]>();
  for (const game of sample) {
    const key = await getSemanticKey(game);
    if (!key) continue;
    const canopyKey = `${key.genres.split(',')[0]}|${key.dev}`;  // "RTS|Relic"
    if (!canopyMap.has(canopyKey)) canopyMap.set(canopyKey, []);
    canopyMap.get(canopyKey)!.push(game);
  }

  // 3. Fuzzy внутри canopy (O(k), k=3-8)
  const groups: GameGroup[] = [];
  for (const [canopyKey, canopyGames] of canopyMap) {
    if (canopyGames.length < 1) continue;
    
    // Rep = max hours
    const repGame = canopyGames.sort((a,b) => b.playtime_forever - a.playtime_forever)[0];
    const repKey = await getSemanticKey(repGame)!;
    const metadata = await getCachedMetadata(repGame.appid)!;

    const cluster: ReducedSteamGame[] = [repGame];
    for (const game of canopyGames) {
      if (game.appid === repGame.appid) continue;
      const key = await getSemanticKey(game)!;
      if (calculateSimilarity(key!, repKey!, game.name, repGame.name) > 0.6) {
        cluster.push(game);
      }
    }

    if (!metadata?.genres?.length) continue;

    groups.push({
      label: generateGroupLabel(canopyKey, metadata),
      count: cluster.length,
      avgHours: Math.round(sumBy(cluster, playtimeSelector) / cluster.length / 60 * 10) / 10,
      totalHours: Math.round(sumBy(cluster, playtimeSelector) / 60 * 10) / 10,
      sampleGames: cluster.slice(0, 2).map(g => ({
        // appid: g.appid,
        name: g.name,
        // hours: Math.round(g.playtime_forever / 60 * 10) / 10
      })),
      genres: metadata?.genres || [],
      categories: metadata?.categories.slice(0, 5)|| [],
      developers: metadata?.developers || [],
      publishers: metadata?.publishers || [],
    });
  }

  // 4. Priority + filter
  return groups
    // .filter(g => g.count >= 2)
    // .sort((a,b) => getGroupPriority(b.label) - getGroupPriority(a.label));
    // .slice(0, 6);
}

// function getGroupPriority(label: string): number {
//   const [, behavior] = label.split(' - ');
//   return {
//     'High hours inactive': 5,
//     'Recent': 4,
//     'All time favorites': 3,
//     'Low hours': 2,
//     'Unplayed': 1,
//   }[behavior as keyof typeof getGroupPriority] || 0;
// }

function generateGroupLabel(keyStr: string, metadata: CachedMetadata | null): string {
  const [genresStr] = keyStr.split('|'); // genres только!
  const genres = genresStr.split(',').slice(0, 2);
  
  const dev = metadata?.developers?.[0] || 'Indie';
  return `${genres[0]} by ${dev}`;
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
