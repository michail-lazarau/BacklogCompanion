import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const steamGames = sqliteTable('steam_games', {
  // Primary key
  appId: integer('app_id').primaryKey(),

  // Game identity
  name: text('name').notNull(),

  // Playtime (minutes) — from Steam GetOwnedGames
  playtimeForever: integer('playtime_forever').notNull().default(0),
  playtime2weeks: integer('playtime_2weeks'), // nullable: absent when 0

  // Last activity — used by delta sync engine (Story 3) for change detection
  rtimeLastPlayed: integer('rtime_last_played'), // Unix timestamp from Steam

  // Cover art
  imgIconUrl: text('img_icon_url'), // small icon: img_icon_url from Steam
  headerImage: text('header_image'), // large cover: https://cdn.akamai.steamstatic.com/steam/apps/{appid}/header.jpg

  // HLTB cache — populated on-demand in Story 4.2, null until fetched
  hltbMain: real('hltb_main'), // Main Story hours
  hltbExtra: real('hltb_extra'), // Main + Extra hours
  hltbComplete: real('hltb_complete'), // Completionist hours
  hltbCachedAt: integer('hltb_cached_at', { mode: 'timestamp' }), // when HLTB was fetched

  // REQUIRED by architecture for ALL Steam-sourced tables — delta sync
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }).notNull(),
});

// Inferred TypeScript types — used throughout the app instead of manual interfaces
export type SteamGame = typeof steamGames.$inferSelect;
export type NewSteamGame = typeof steamGames.$inferInsert;

export const achievementCache = sqliteTable('achievement_cache', {
  appId: integer('app_id').primaryKey().references(() => steamGames.appId),
  cachedAt: integer('cached_at').notNull(),       // Unix timestamp (seconds)
  unlockedCount: integer('unlocked_count').notNull(),
  totalCount: integer('total_count').notNull(),
  data: text('data').notNull(),                    // JSON string of MergedAchievement[]
});

export type AchievementCacheRow = typeof achievementCache.$inferSelect;
