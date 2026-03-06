// src/data/api/httpClient.ts
import * as Sentry from '@sentry/react-native';
import type { NetworkError, SteamError } from '@shared/types/errors.types';
import { API_BASE_URLS, type ApiOptions } from '@shared/types/httpClient.types';

const REQUEST_TIMEOUT_MS = 10_000;

const apiFetch = async <T>(options: ApiOptions): Promise<T> => {
  const { api, endpoint, params, headers = {}, method = 'GET', body } = options;
  const baseUrl = API_BASE_URLS[api];
  const rawQuery = params?.toString();
  const queryString = rawQuery ? `?${rawQuery}` : '';
  const url = `${baseUrl}/${endpoint}${queryString}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      ...(body && method !== 'GET' && method !== 'HEAD'
        ? { body: JSON.stringify(body) }
        : {}),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw {
          type: 'SteamError',
          code: 'UNAUTHORIZED',
          message: `HTTP ${response.status}`,
        } satisfies SteamError;
      }
      if (response.status === 429) {
        throw {
          type: 'SteamError',
          code: 'RATE_LIMITED',
          message: 'Rate limited',
        } satisfies SteamError;
      }
      const networkError: NetworkError = {
        type: 'NetworkError',
        code: 'UNKNOWN',
        message: `HTTP ${response.status}`,
      };
      Sentry.captureException(networkError, { data: { url, method, status: response.status } });
      throw networkError;
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    // Already a typed AppError (thrown above or from nested call) — rethrow unchanged
    if (err !== null && typeof err === 'object' && 'type' in err) {
      throw err;
    }
    // AbortController fired — request timed out
    if (err !== null && typeof err === 'object' && (err as { name?: unknown }).name === 'AbortError') {
      throw {
        type: 'NetworkError',
        code: 'TIMEOUT',
        message: 'Request timed out',
      } satisfies NetworkError;
    }
    // Network-level failure (DNS, offline, etc.)
    const networkError: NetworkError = {
      type: 'NetworkError',
      code: 'UNKNOWN',
      message: err instanceof Error ? err.message : String(err),
    };
    Sentry.captureException(networkError, { data: { url, method } });
    throw networkError;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const geminiFetch = <T>(
  endpoint: string,
  params: URLSearchParams,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown> | unknown[],
) => apiFetch<T>({ api: 'googleapis', endpoint, params, method, body });

export const steamFetch = <T>(endpoint: string, params: URLSearchParams) =>
  apiFetch<T>({ api: 'steam', endpoint, params, method: 'GET' });

export const storeFetch = <T>(endpoint: string, params: URLSearchParams) =>
  apiFetch<T>({ api: 'store', endpoint, params, method: 'GET' });
