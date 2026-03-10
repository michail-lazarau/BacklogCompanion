import { useMemo } from 'react';
import { useAppSelector } from '@shared/hooks/reduxHooks';
import { useGameLibrary } from './useGameLibrary';
import type { FilterOption, SortOption } from '../store/librarySlice';
import type { SteamGame } from '@db/schema';

export const filterGames = (games: SteamGame[], filter: FilterOption | null): SteamGame[] => {
  switch (filter) {
    case 'unplayed':
      return games.filter((g) => g.playtimeForever === 0);
    case 'in_progress':
      return games.filter((g) => g.playtimeForever > 0);
    case 'completed':
      // user_annotations table added in Story 4.4 — returns empty until then
      return [];
    case null:
    default:
      return games;
  }
};

export const sortGames = (games: SteamGame[], sort: SortOption): SteamGame[] => {
  const copy = [...games]; // never mutate the original
  switch (sort) {
    case 'alphabetical':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'playtime_asc':
      return copy.sort((a, b) => a.playtimeForever - b.playtimeForever);
    case 'playtime_desc':
      return copy.sort((a, b) => b.playtimeForever - a.playtimeForever);
    case 'timeLastPlayed':
      // Uses rtimeLastPlayed (most recently played first).
      // Games never launched (rtimeLastPlayed = null) sort to the end.
      return copy.sort((a, b) => (b.rtimeLastPlayed ?? 0) - (a.rtimeLastPlayed ?? 0));
    default:
      return copy;
  }
};

export const searchGames = (games: SteamGame[], query: string): SteamGame[] => {
  if (!query.trim()) return games;
  const lower = query.normalize('NFC').toLowerCase();
  return games.filter((g) => g.name.normalize('NFC').toLowerCase().includes(lower));
};

export const useLibraryFilters = (searchQuery: string = '') => {
  const activeFilter = useAppSelector((state) => state.library.activeFilter);
  const activeSort = useAppSelector((state) => state.library.activeSort);
  const { data: games, ...rest } = useGameLibrary();

  const data = useMemo(() => {
    if (!games) return undefined;
    const searched = searchGames(games, searchQuery);
    const filtered = filterGames(searched, activeFilter);
    return sortGames(filtered, activeSort);
  }, [games, searchQuery, activeFilter, activeSort]);

  return { ...rest, data };
};
