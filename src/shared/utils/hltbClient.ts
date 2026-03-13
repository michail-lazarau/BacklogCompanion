/**
 * Lightweight HLTB (HowLongToBeat) client for React Native.
 *
 * Uses the HLTB JSON search API directly via fetch (available natively in RN/Hermes).
 * Replaces the Node.js-only howlongtobeat-js library which used fs/cheerio/axios.
 *
 * HLTB API endpoint is dynamic — discovered by:
 *   1. Scraping the homepage for the bundled _app JS script URL
 *   2. Regex-extracting the POST endpoint path from that script
 *   3. Fetching an x-auth-token from <endpoint>/init?t=<timestamp>
 *   4. POST <endpoint> with x-auth-token header
 *
 * Results used in Story 4.2 (HLTB Time Estimates Display).
 */

const HLTB_BASE_URL = 'https://howlongtobeat.com';
// Fallback based on current live endpoint extracted from HLTB's bundled JS
const HLTB_FALLBACK_SEARCH_PATH = '/api/finder';
const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** In-memory cache to avoid re-scraping on every call within the same session */
let _cachedEndpoint: string | null = null;
let _cachedToken: string | null = null;
let _tokenFetchedAt = 0;

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

const COMMON_HEADERS = {
  Referer: `${HLTB_BASE_URL}/`,
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
};

/**
 * Step 1+2: Scrape the HLTB homepage, find Next.js chunk scripts,
 * and extract the dynamic POST endpoint path (e.g. "/api/finder").
 *
 * HLTB uses Turbopack/Next.js with hash-named chunks — there is no single
 * _app bundle. We scan all /_next/static/chunks/*.js scripts until we find
 * one containing a fetch call with method:"POST" to an /api/* path.
 */
const discoverSearchEndpoint = async (): Promise<string> => {
  const homeResp = await fetch(HLTB_BASE_URL, { headers: COMMON_HEADERS });
  if (!homeResp.ok) {
    return HLTB_FALLBACK_SEARCH_PATH;
  }
  const html = await homeResp.text();

  // Collect all /_next/static/chunks/*.js script src values
  const chunkPattern = /src="(\/_next\/static\/chunks\/[^"]+\.js)"/g;
  const chunkUrls: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = chunkPattern.exec(html)) !== null) {
    chunkUrls.push(m[1]);
  }

  if (chunkUrls.length === 0) {
    return HLTB_FALLBACK_SEARCH_PATH;
  }

  // Fetch each chunk and look for the POST search endpoint
  for (const chunkPath of chunkUrls) {
    let scriptText: string;
    try {
      const scriptResp = await fetch(`${HLTB_BASE_URL}${chunkPath}`, {
        headers: COMMON_HEADERS,
      });
      if (!scriptResp.ok) continue;
      scriptText = await scriptResp.text();
    } catch {
      continue;
    }

    // Match: fetch("/api/finder", { ..., method:"POST", ... })
    const endpointMatch = scriptText.match(
      /fetch\s*\(\s*["'](\/api\/[a-zA-Z0-9_/]+)["']\s*,\s*\{[^}]*method:\s*["']POST["']/,
    );
    if (endpointMatch) {
      // Normalise to base two-segment path e.g. "/api/finder" (strip /v2 etc.)
      const parts = endpointMatch[1].split('/');
      return `/${parts[1]}/${parts[2]}`;
    }
  }

  return HLTB_FALLBACK_SEARCH_PATH;
};

/**
 * Step 3: Fetch the x-auth-token required by HLTB's search endpoint.
 */
const fetchAuthToken = async (searchPath: string): Promise<string | null> => {
  const url = `${HLTB_BASE_URL}${searchPath}/init?t=${Date.now()}`;
  const resp = await fetch(url, { headers: COMMON_HEADERS });
  if (!resp.ok) {
    return null;
  }
  const json = (await resp.json()) as { token?: string };
  return json.token ?? null;
};

/**
 * Resolve (and cache) the current search endpoint + auth token.
 */
const resolveEndpointAndToken = async (): Promise<{
  searchUrl: string;
  token: string | null;
}> => {
  const now = Date.now();
  if (_cachedEndpoint && _cachedToken && now - _tokenFetchedAt < TOKEN_TTL_MS) {
    return { searchUrl: `${HLTB_BASE_URL}${_cachedEndpoint}`, token: _cachedToken };
  }

  const searchPath = await discoverSearchEndpoint();
  const token = await fetchAuthToken(searchPath);

  _cachedEndpoint = searchPath;
  _cachedToken = token;
  _tokenFetchedAt = now;

  return { searchUrl: `${HLTB_BASE_URL}${searchPath}`, token };
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
  const { searchUrl, token } = await resolveEndpointAndToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...COMMON_HEADERS,
  };
  if (token) {
    headers['x-auth-token'] = token;
  }

  const response = await fetch(searchUrl, {
    method: 'POST',
    headers,
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
