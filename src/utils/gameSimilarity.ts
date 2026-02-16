import { ReducedSteamGame } from "../types/steam.types";
import { getCachedMetadata } from "./gameMetadataCache";

type SemanticKey = {
  genres: string;
  dev: string;
  pub: string;
};

export async function getSemanticKey(game: ReducedSteamGame): Promise<SemanticKey | null> {
  const metadata = await getCachedMetadata(game.appid);
  if (!metadata) return null;
  
  return {
    genres: metadata.genres.slice(0, 3).join(','),
    dev: metadata.developers[0] || '',
    pub: metadata.publishers[0] || '',
  };
}

export function calculateSimilarity(key1: SemanticKey, key2: SemanticKey, name1: string, name2: string): number {
  let score = 0;
  
  // Genres (0.3)
  const genreScore = calculateJaccard(key1.genres, key2.genres);
  score += genreScore * 0.3;
  
  // Dev (0.3)
  score += isDevMatch(key1.dev, key2.dev) ? 0.3 : 0;
  
  // Pub (0.2)
  score += isPubMatch(key1.pub, key2.pub) ? 0.2 : 0;
  
  // Name (0.2)
  score += nameSimilarityScore(name1, name2) * 0.2;
  
  return score;
}

function calculateJaccard(genres1: string, genres2: string): number {
  const set1 = new Set(genres1.split(',').map(g => g.trim().toLowerCase()).filter(Boolean));
  const set2 = new Set(genres2.split(',').map(g => g.trim().toLowerCase()).filter(Boolean));
  
  if (set1.size === 0 && set2.size === 0) return 1.0;
  
  const intersection = new Set([...set1].filter(g => set2.has(g)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

function nameSimilarityScore(name1: string, name2: string): number {
  const normalized1 = normalizeGameName(name1);
  const normalized2 = normalizeGameName(name2);
  
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 1.0;
  }
  
  const words1 = normalized1.split(/\s+/);
  const words2 = normalized2.split(/\s+/);
  let commonPrefix = 0;
  
  for (let i = 0; i < Math.min(words1.length, words2.length); i++) {
    if (words1[i].toLowerCase() === words2[i].toLowerCase()) {
      commonPrefix++;
    } else break;
  }
  
  return commonPrefix / Math.max(words1.length, words2.length) * 0.8;
}

function normalizeGameName(name: string): string {
  return name
    .replace(/[\d\s]*(?:edition|definitive|remastered|anniversary|legacy)/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isDevMatch(dev1: string, dev2: string): boolean {
  const norm1 = dev1.toLowerCase().trim();
  const norm2 = dev2.toLowerCase().trim();
  return norm1 === norm2 || 
         norm1.includes(norm2.slice(0, 4)) || 
         norm2.includes(norm1.slice(0, 4));
}

function isPubMatch(pub1: string, pub2: string): boolean {
  return isDevMatch(pub1, pub2);
}
