// @ts-nocheck — prototype file, references deprecated store shape; will be rewritten in Story 3.x+
import type { ReducedSteamGame } from '../types/steam.types';
import { store } from '../data/store';
import { setGameMetadata, removeGameMetadata } from '../data/store/gameMetadataSlice';
import { fetchSteamAppDetail } from '../hooks/useSteam';
import { CachedMetadata } from '../types/compressed-library.types';

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function getCachedMetadata(
  appid: number
): Promise<CachedMetadata | null> {
  const state = store.getState();
  const cached = state.gameMetadata.metadata[appid.toString()];

  if (!cached) return null;

  if (Date.now() - cached.cachedAt > CACHE_TTL) {
    store.dispatch(removeGameMetadata(appid));
    return null;
  }
  return cached;
}

export async function cacheMetadata(
  appid: number, 
  metadata: Omit<CachedMetadata, 'cachedAt'>
): Promise<void> {
  store.dispatch(setGameMetadata({
    appId: appid,
    data: {
      ...metadata,
      cachedAt: Date.now(),
    }
  }));
}

export async function prefetchTopGamesMetadata(
  games: ReducedSteamGame[],
  maxTop = 500
): Promise<void> {
  const topGames = games
    .sort((a, b) => b.playtime_forever - a.playtime_forever)
    .slice(0, maxTop);
  
  console.log('Current store metadata:', store.getState().gameMetadata.metadata);

  // Implement a worker pool to limit concurrency
  const CONCURRENCY_LIMIT = Math.max(1, Math.floor(maxTop / 10));
  const queue = [...topGames];

  const worker = async () => {
    while (queue.length > 0) {
      const game = queue.shift();
      if (!game) break;

      const cached = await getCachedMetadata(game.appid);
      if (!cached) {
        try {
          // Use react-query's cache or fetch if missing
          const details = await fetchSteamAppDetail(game.appid);

          await cacheMetadata(game.appid, {
            genres: details.genres?.map(g => g.description) || [],
            categories: details.categories?.map(c => c.description) || [],
            developers: details.developers || [],
            publishers: details.publishers || [],
          });
        } catch (e) {
          console.warn(`Failed to cache metadata for ${game.appid}`);
        }
      }
    }
  };

  // Start workers
  await Promise.all(
    Array.from({ length: CONCURRENCY_LIMIT }).map(() => worker())
  );
}

// export async function getGroupMetadata(
//   groupGames: ReducedSteamGame[]
// ): Promise<{
//   genres: string[];
//   developers: string[];
//   publishers: string[];
//   categories: string[];
// } | null> {
//   const sample = groupGames;
//   if (sample.length === 0) return null;
  
//   const metadataPromises = sample.map(game => 
//     getCachedMetadata(game.appid).then(m => ({ game, metadata: m }))
//   );
  
//   const results = await Promise.all(metadataPromises);
  
//   const withMetadata = results.reduce<CachedMetadata[]>((acc, r) => {
//     if (r.metadata) acc.push(r.metadata);
//     return acc;
//   }, []);
    
//   if (withMetadata.length === 0) return null;
  
//   const categories = Array.from(
//     new Set(
//       withMetadata
//         .flatMap(m => m.categories)
//     )
//   ).slice(0, 5);
//   const genres: string[] = Array.from(
//     new Set(
//       withMetadata
//         .flatMap(m => m.genres)
//     )
//   ).slice(0, 5);
//   const developers: string[] = Array.from(new Set(
//     withMetadata.flatMap(m => m.developers)
//     .slice(0, 5)
//   ));
//   const publishers = Array.from(new Set(
//     withMetadata.flatMap(m => m.publishers)
//     .slice(0, 5)
//   ));
  
//   return { genres, developers, publishers, categories };
// }

