
export const API_BASE_URLS = {
  steam: 'http://api.steampowered.com',
  store: 'https://store.steampowered.com/api',
  googleapis: 'https://generativelanguage.googleapis.com/v1beta',
} as const;

type ApiType = keyof typeof API_BASE_URLS;

export interface ApiOptions {
  api: ApiType;
  endpoint: string;
  params?: URLSearchParams;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  body?: any;
}