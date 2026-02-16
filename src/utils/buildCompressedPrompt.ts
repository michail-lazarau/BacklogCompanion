import type { CompressedLibrary, GameGroup, SeriesStats } from '../types/compressed-library.types';

// todo: propose games beyond library (e.g. similar to owned but not owned, based on similarity to top played)
export function buildCompressedPrompt(compressed: CompressedLibrary): string {
  const { stats, groups, series } = compressed;

  // ✅ PRIORITY SORT (High inactive #1!)
  const priorityGroups = groups
    .sort((a, b) => getGroupPriority(b.label) - getGroupPriority(a.label));
    // .slice(0, 12);

  // ✅ READABLE FORMAT (4k tokens)
  const prompt = `Steam backlog expert. Recommend **3-5 games** from my library to play next.

🔥 TOP PRIORITY GROUPS (first!):
${priorityGroups
    // .slice(0, 6)
    .map(g => 
  `• ${g.label} (${g.count} games, ${g.avgHours}h): ${g.sampleGames.map(s => `${s.name} (steam appid: ${s.appid})`).join(', ')}`
).join('\n')}

🏆 Series:
${series
    // .slice(0, 5)
    .map((s: SeriesStats) => 
  `• ${s.seriesName}: ${s.owned} games (${s.unplayed} unplayed)`
).join('\n')}

Output ONLY JSON:
{
  "reasoning": "1 sentence why these recommendations",
  "appids": [730, 578080, ...]
}`;

  return prompt;
}

function getGroupPriority(label: string): number {
  const [, behavior] = label.split(' - ');
  return {
    'High hours inactive': 5,    // #1!
    'Recent': 4,
    'All time favorites': 3,
    'Low hours': 2,
    'Unplayed': 1,                // #5!
  }[behavior as string] || 0;
}

// 📊 Stats:
// Games: ${stats.totalGames} | Hours: ${stats.totalPlaytimeHours} | Unplayed: ${stats.unplayedCount}