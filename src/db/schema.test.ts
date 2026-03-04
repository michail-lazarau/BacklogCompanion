import { steamGames } from './schema';
import type { SteamGame } from './schema';

describe('steamGames schema', () => {
  it('has required TS property names defined', () => {
    const columns = Object.keys(steamGames);
    expect(columns).toContain('appId');
    expect(columns).toContain('name');
    expect(columns).toContain('playtimeForever');
    expect(columns).toContain('lastSyncedAt');
    expect(columns).toContain('hltbCachedAt');
  });

  it('maps to correct SQL column names in the database', () => {
    // Verify the camelCase→snake_case mapping is correct — catches wrong column name strings
    expect(steamGames.appId.name).toBe('app_id');
    expect(steamGames.name.name).toBe('name');
    expect(steamGames.playtimeForever.name).toBe('playtime_forever');
    expect(steamGames.playtime2weeks.name).toBe('playtime_2weeks');
    expect(steamGames.rtimeLastPlayed.name).toBe('rtime_last_played');
    expect(steamGames.imgIconUrl.name).toBe('img_icon_url');
    expect(steamGames.headerImage.name).toBe('header_image');
    expect(steamGames.hltbMain.name).toBe('hltb_main');
    expect(steamGames.hltbExtra.name).toBe('hltb_extra');
    expect(steamGames.hltbComplete.name).toBe('hltb_complete');
    expect(steamGames.hltbCachedAt.name).toBe('hltb_cached_at');
    expect(steamGames.lastSyncedAt.name).toBe('last_synced_at');
  });

  it('SteamGame type is correctly inferred (compile-time check)', () => {
    // This test exists purely to catch type regression — if this compiles, types are correct
    const _typeCheck: SteamGame = {
      appId: 123,
      name: 'Test Game',
      playtimeForever: 0,
      playtime2weeks: null,
      rtimeLastPlayed: null,
      imgIconUrl: null,
      headerImage: null,
      hltbMain: null,
      hltbExtra: null,
      hltbComplete: null,
      hltbCachedAt: null,
      lastSyncedAt: new Date(),
    };
    expect(_typeCheck.appId).toBe(123);
  });
});
