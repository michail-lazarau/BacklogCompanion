import { useEffect, useRef, useCallback } from 'react';
import * as Keychain from 'react-native-keychain';
import Toast from 'react-native-toast-message';
import { sql } from 'drizzle-orm';
import { useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '@shared/hooks/reduxHooks';
import { setSyncStatus, setSyncError } from '@features/library/store/librarySlice';
import { useSessionExpiry } from '@features/auth/hooks/useSessionExpiry';
import { STEAM_KEYCHAIN_SERVICES } from '@features/auth/hooks/useSteamAuth';
import { getOwnedGamesWithKey, getRecentlyPlayedGamesWithKey } from '../../../data/api/steam';
import type { SteamGame } from '@shared/types/steam.types';
import { db } from '@db/index';
import { steamGames } from '@db/schema';
import type { NewSteamGame } from '@db/schema';
import { mmkv } from '../../../data/mmkv';
import { SYNC_THROTTLE_MS, MMKV_KEYS } from '@shared/constants';
import { queryKeys } from '@shared/queryKeys';
import type { SteamError } from '@shared/types/errors.types';

const isSteamError = (e: unknown): e is SteamError =>
  typeof e === 'object' && e !== null && (e as SteamError).type === 'SteamError';

/** Maximum number of automatic retry attempts after a sync error before giving up. */
const MAX_RETRIES = 5;

/**
 * Returns the delay in milliseconds before the next retry attempt.
 * Uses exponential backoff capped at 30s, plus up to 1s of random jitter
 * to avoid thundering-herd when many users retry simultaneously.
 */
const getBackoffDelay = (retryCount: number): number => {
  const base = Math.min(1000 * Math.pow(2, retryCount), 30000); // cap at 30s
  const jitter = Math.random() * 1000; // 0–1s random jitter
  return base + jitter;
};

/**
 * Writes only changed games to SQLite (delta detection).
 *
 * Strategy:
 * 1. Batch-select all existing rows in one query → O(1) Map lookup per game.
 * 2. A game is "dirty" if it is new, or its playtimeForever or rtimeLastPlayed changed.
 * 3. All dirty rows are written in a single batch upsert (INSERT … ON CONFLICT DO UPDATE).
 *
 * Does nothing when `games` is empty — avoids a full table scan for a no-op incremental sync.
 */
const applyDeltaSync = async (games: SteamGame[]): Promise<void> => {
  if (games.length === 0) return;

  // Batch select all existing rows for O(1) dirty-check lookups
  const existingRows = await db
    .select({
      appId: steamGames.appId,
      playtimeForever: steamGames.playtimeForever,
      rtimeLastPlayed: steamGames.rtimeLastPlayed,
    })
    .from(steamGames);

  const existingMap = new Map(existingRows.map(r => [r.appId, r]));

  const dirtyRows: NewSteamGame[] = games
    .filter(game => {
      const existing = existingMap.get(game.appid);
      if (!existing) return true;
      if (existing.playtimeForever !== game.playtime_forever) return true;
      // Only compare rtimeLastPlayed when the API provides it
      // (GetRecentlyPlayedGames does NOT return rtime_last_played)
      if (game.rtime_last_played != null &&
          (existing.rtimeLastPlayed ?? 0) !== game.rtime_last_played) return true;
      return false;
    })
    .map(game => {
      const existing = existingMap.get(game.appid);
      return {
        appId: game.appid,
        name: game.name,
        playtimeForever: game.playtime_forever,
        playtime2weeks: game.playtime_2weeks ?? null,
        // Preserve existing rtimeLastPlayed when the API doesn't provide it
        rtimeLastPlayed: game.rtime_last_played ?? existing?.rtimeLastPlayed ?? null,
        imgIconUrl: game.img_icon_url,
        headerImage: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
        lastSyncedAt: new Date(),
      };
    });

  if (dirtyRows.length > 0) {
    await db
      .insert(steamGames)
      .values(dirtyRows)
      .onConflictDoUpdate({
        target: steamGames.appId,
        set: {
          name: sql`excluded.name`,
          playtimeForever: sql`excluded.playtime_forever`,
          playtime2weeks: sql`excluded.playtime_2weeks`,
          rtimeLastPlayed: sql`excluded.rtime_last_played`,
          imgIconUrl: sql`excluded.img_icon_url`,
          headerImage: sql`excluded.header_image`,
          lastSyncedAt: sql`excluded.last_synced_at`,
        },
      });
  }
};

/**
 * Silently syncs the user's Steam game library to local SQLite in the background.
 *
 * ## Sync modes
 * - **Full sync** (`GetOwnedGames`): runs on mount when no prior sync exists, or when
 *   the last full sync is older than `SYNC_THROTTLE_MS` (30 minutes). Fetches the
 *   entire owned library including appinfo.
 * - **Incremental sync** (`GetRecentlyPlayedGames`): runs instead of a full sync when
 *   within the throttle window. Fetches only the 10 most recently played games.
 *
 * ## Guards
 * - Skips entirely if the user is not authenticated or has no `steamId`.
 * - Skips if no API key is found in Keychain (key stored by Story 2.2).
 * - Treats an empty `GetOwnedGames` response as a private-profile error — **never**
 *   wipes local SQLite data on empty response.
 *
 * ## Error handling
 * - `SteamError { code: 'UNAUTHORIZED' }`: delegates to `useSessionExpiry.handleSteamAuthError`
 *   which triggers logout.
 * - Any other error: dispatches `setSyncError('api_error')` and schedules a retry with
 *   exponential backoff + jitter, up to `MAX_RETRIES` (5) attempts.
 * - Pending retry timeout is cancelled on unmount to prevent post-unmount dispatches.
 *
 * ## State ownership
 * - `sync_status` / `syncErrorReason` → Redux `librarySlice` (UI/session state).
 * - `last_full_sync` timestamp → MMKV (lightweight non-sensitive flag).
 * - Game data → SQLite via Drizzle (persistent local cache).
 *
 * @returns `{ triggerSync }` — call to manually re-run sync (e.g. pull-to-refresh in Story 3.2).
 */
export const useSteamSync = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const steamId = useAppSelector((state) => state.auth.steamId);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { handleSteamAuthError } = useSessionExpiry();
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref holds the latest runSync to allow safe self-scheduling in setTimeout
  const runSyncRef = useRef<() => Promise<void>>(async () => { /* placeholder */ });

  const runSync = useCallback(async () => {
    if (!isAuthenticated || !steamId) return;

    // Read API key from Keychain (not env var — production pattern)
    const keychainResult = await Keychain.getGenericPassword({
      service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY,
    });
    if (!keychainResult) return; // No API key stored — skip sync

    const apiKey = keychainResult.password;

    dispatch(setSyncStatus('syncing'));

    try {
      // Throttle check
      const lastFullSyncStr = mmkv.getString(MMKV_KEYS.LAST_FULL_SYNC);
      const lastFullSync = lastFullSyncStr ? parseInt(lastFullSyncStr, 10) : 0;
      const isThrottled = Date.now() - lastFullSync < SYNC_THROTTLE_MS;

      let games: SteamGame[];
      let wasFullSync = false;

      if (isThrottled) {
        // Incremental: recently played only
        const response = await getRecentlyPlayedGamesWithKey(apiKey, steamId, 10);
        games = response.response.games ?? [];
      } else {
        // Full sync
        const response = await getOwnedGamesWithKey(apiKey, steamId);

        // Private profile guard (AC5): empty array means private — do NOT wipe local library
        if (!response.response.games || response.response.games.length === 0) {
          dispatch(setSyncError('private_profile'));
          Toast.show({
            type: 'error',
            text1: 'Library is Private',
            text2: 'Go to Steam → Privacy Settings → Game Details → set to Public.',
            position: 'bottom',
            visibilityTime: 6000,
          });
          return;
        }

        games = response.response.games;

        // Update throttle timestamp only on successful full sync
        mmkv.set(MMKV_KEYS.LAST_FULL_SYNC, Date.now().toString());
        wasFullSync = true;
      }

      await applyDeltaSync(games);

      // Write MMKV snapshot only after full sync (not incremental) — used as placeholderData
      // by useGameLibrary for instant cold-start render (Story 3.2).
      // Excludes Date-mode fields (lastSyncedAt, hltbCachedAt) to avoid JSON serialization issues.
      if (wasFullSync) {
        const snapshotRows = await db
          .select({
            appId: steamGames.appId,
            name: steamGames.name,
            playtimeForever: steamGames.playtimeForever,
            playtime2weeks: steamGames.playtime2weeks,
            headerImage: steamGames.headerImage,
            imgIconUrl: steamGames.imgIconUrl,
            rtimeLastPlayed: steamGames.rtimeLastPlayed,
            hltbMain: steamGames.hltbMain,
            hltbExtra: steamGames.hltbExtra,
            hltbComplete: steamGames.hltbComplete,
          })
          .from(steamGames);
        mmkv.set(MMKV_KEYS.LIBRARY_SNAPSHOT, JSON.stringify(snapshotRows));
      }

      retryCountRef.current = 0;
      dispatch(setSyncStatus('idle'));
      // Invalidate the games query so useGameLibrary refetches from SQLite
      await queryClient.invalidateQueries({ queryKey: queryKeys.games.all(steamId) });
    } catch (e: unknown) {
      if (isSteamError(e) && e.code === 'UNAUTHORIZED') {
        await handleSteamAuthError(e);
        return;
      }

      dispatch(setSyncError('api_error'));

      // Exponential backoff with jitter — capped at MAX_RETRIES to prevent infinite loops
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        const delay = getBackoffDelay(retryCountRef.current);
        // Use ref to avoid stale-closure self-reference (ESLint react-hooks/immutability)
        retryTimeoutRef.current = setTimeout(() => { runSyncRef.current().catch(() => { /* backoff retry — silent */ }); }, delay);
      }
    }
  }, [isAuthenticated, steamId, dispatch, handleSteamAuthError, queryClient]);

  // Keep ref up-to-date with latest runSync after every render
  useEffect(() => {
    runSyncRef.current = runSync;
  });

  useEffect(() => {
    runSync().catch(() => { /* sync errors handled internally */ });
    return () => {
      if (retryTimeoutRef.current !== null) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [runSync]);

  return { triggerSync: runSync };
};
