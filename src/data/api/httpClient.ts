export const apiFetch = async <T>(options: ApiOptions): Promise<T> => {
  const { api, endpoint, params, headers = {} } = options;
  const baseUrl = API_BASE_URLS[api];
  const url = `${baseUrl}/${endpoint}?${params.toString()}`;

  console.log(`[${api.toUpperCase()}] ${url}`);

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`${api.toUpperCase()} error: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const steamFetch = <T>(endpoint: string, params: URLSearchParams) =>
  apiFetch<T>({ api: 'steam', endpoint, params });

export const storeFetch = <T>(endpoint: string, params: URLSearchParams) =>
  apiFetch<T>({ api: 'store', endpoint, params });
