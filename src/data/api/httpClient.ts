import { API_BASE_URLS, ApiOptions } from "../../types/httpClient.types";

const apiFetch = async <T>(options: ApiOptions): Promise<T> => {
  const { api, endpoint, params, headers = {}, method = 'GET', body } = options;
  const baseUrl = API_BASE_URLS[api];
  const queryString = params ? `?${params.toString()}` : '';
  const url = `${baseUrl}/${endpoint}${queryString}`;

  console.log(`[${api.toUpperCase()}] Fetching: ${url}`);

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    console.log(`[${api.toUpperCase()}] Response status:`, response.status);

    if (!response.ok) {
      throw new Error(`${api.toUpperCase()} error: ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch (err) {
    console.error(`[${api.toUpperCase()}] Network Error Details:`, {
      message: err instanceof Error ? err.message : String(err),
      url,
      method,
      body,
      code: (err as any).code,
      errno: (err as any).errno,
    });
    throw err;
  }
};

export const geminiFetch = <T>(endpoint: string, params: URLSearchParams, method: 'GET' | 'POST' = 'GET', body?: any) =>
  apiFetch<T>({ api: 'googleapis', endpoint, params, method, body });

export const steamFetch = <T>(endpoint: string, params: URLSearchParams) =>
  apiFetch<T>({ api: 'steam', endpoint, params, method: 'GET' });

export const storeFetch = <T>(endpoint: string, params: URLSearchParams) =>
  apiFetch<T>({ api: 'store', endpoint, params, method: 'GET' });