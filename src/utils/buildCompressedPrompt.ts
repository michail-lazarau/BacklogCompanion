import type { CompressedLibrary } from '../types/compressed-library.types';

export function buildCompressedPrompt(compressed: CompressedLibrary): string {
  const { stats, groups } = compressed;

  const recentGroups = (groups['Recent'] || []).slice(0, 3);           // Топ Recent
  const highInactiveGroups = (groups['High hours inactive'] || []).slice(0, 2);  // Топ High
  const activeGroups = [...recentGroups, ...highInactiveGroups];  

  const unplayedGroups = (groups['Unplayed'] || []).slice(0, 4);

  return `Steam backlog expert. Recommend **5-8 games** similar to ACTIVE PROFILE.

Stats: ${stats.totalGames} games, ${stats.totalPlaytimeHours}h total, ${stats.unplayedCount} unplayed.

ACTIVE PROFILE (your current taste - match genres/categories):
${activeGroups.map(g =>
  `• ${g.label} (${g.avgHours?.toFixed(0)}h avg): genres=${(g.genres ?? []).slice(0,2).join('/')}, cat=${(g.categories ?? []).slice(0,2).join('/')} | ${g.sampleGames.map(s => s.name).join(', ')}`
).join('\n')}

UNPLAYED (recommend ONLY if genres/categories match ACTIVE >50%; max 1 per series):
${unplayedGroups.map(g =>
  `• ${g.label} (0h): genres=${(g.genres ?? []).slice(0,2).join('/')}, cat=${(g.categories ?? []).slice(0,2).join('/')} | ${g.sampleGames.map(s => s.name).join(', ')}`
).join('\n')}

Output ONLY JSON: {"reasoning": "1 short sentence why", "appids": [730, 553850]}`;
}
