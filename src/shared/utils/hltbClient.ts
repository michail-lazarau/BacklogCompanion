/**
 * Lightweight HLTB (HowLongToBeat) client for React Native.
 *
 * Uses the HLTB JSON search API directly via fetch (available natively in RN/Hermes).
 * Replaces the Node.js-only howlongtobeat-js library which used fs/cheerio/axios.
 *
 * HLTB API: POST https://howlongtobeat.com/api/search
 * Results used in Story 4.2 (HLTB Time Estimates Display).
 */

const HLTB_BASE_URL = 'https://howlongtobeat.com';
const HLTB_SEARCH_URL = `${HLTB_BASE_URL}/api/search`;

export type HltbResult = {
  id: number;
  name: string;
  /** Main story completion time in seconds, 0 if not available */
  mainStory: number;
  /** Main + extras completion time in seconds */
  mainExtra: number;
  /** Completionist time in seconds */
  completionist: number;
  imageUrl: string;
};

type HltbSearchPayload = {
  searchType: string;
  searchTerms: string[];
  searchPage: number;
  size: number;
  searchOptions: {
    games: {
      userId: number;
      platform: string;
      sortCategory: string;
      rangeCategory: string;
      rangeTime: { min: number | null; max: number | null };
      gameplay: { perspective: string; flow: string; genre: string; subGenre: string };
      rangeYear: { min: string; max: string };
      modifier: string;
    };
    users: { sortCategory: string };
    lists: { sortCategory: string };
    filter: string;
    sort: number;
    randomizer: number;
  };
};

type HltbRawGame = {
  game_id: number;
  game_name: string;
  comp_main: number;
  comp_plus: number;
  comp_100: number;
  game_image: string;
};

type HltbSearchResponse = {
  data: HltbRawGame[];
};

const buildSearchPayload = (gameName: string): HltbSearchPayload => ({
  searchType: 'games',
  searchTerms: gameName.split(' '),
  searchPage: 1,
  size: 5,
  searchOptions: {
    games: {
      userId: 0,
      platform: '',
      sortCategory: 'popular',
      rangeCategory: 'main',
      rangeTime: { min: null, max: null },
      gameplay: { perspective: '', flow: '', genre: '', subGenre: '' },
      rangeYear: { min: '', max: '' },
      modifier: '',
    },
    users: { sortCategory: 'postcount' },
    lists: { sortCategory: 'follows' },
    filter: '',
    sort: 0,
    randomizer: 0,
  },
});

/**
 * Search HLTB for a game by name.
 * Returns the best matching result, or null if none found.
 *
 * Note: HLTB rate-limits aggressively — results should be cached in SQLite (Story 4.2).
 */
export const searchHltb = async (gameName: string): Promise<HltbResult | null> => {
  const response = await fetch(HLTB_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: HLTB_BASE_URL,
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    },
    body: JSON.stringify(buildSearchPayload(gameName)),
  });

  if (!response.ok) {
    throw new HltbError(`HLTB search failed: ${response.status}`);
  }

  const json = (await response.json()) as HltbSearchResponse;

  if (!json.data || json.data.length === 0) {
    return null;
  }

  const best = json.data[0];
  return {
    id: best.game_id,
    name: best.game_name,
    mainStory: best.comp_main,
    mainExtra: best.comp_plus,
    completionist: best.comp_100,
    imageUrl: best.game_image
      ? `${HLTB_BASE_URL}/games/${best.game_image}`
      : '',
  };
};

export class HltbError extends Error {
  readonly type = 'HltbError' as const;
  constructor(message: string) {
    super(message);
    this.name = 'HltbError';
  }
}

/** Convert HLTB seconds to a human-readable string e.g. "12h 30m" */
export const formatHltbTime = (seconds: number): string => {
  if (seconds === 0) {
    return '--';
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
};
