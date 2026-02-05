
export const API_BASE_URLS = {
  steam: 'https://api.steampowered.com',
  store: 'https://store.steampowered.com/api',
} as const;

type ApiType = keyof typeof API_BASE_URLS;

export interface ApiOptions {
  api: ApiType;
  endpoint: string;
  params: URLSearchParams;
  headers?: Record<string, string>;
}