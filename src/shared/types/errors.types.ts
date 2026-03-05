export type SteamError = {
  type: 'SteamError';
  code: 'RATE_LIMITED' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'NETWORK';
  message: string;
};

export type HltbError = {
  type: 'HltbError';
  code: 'NOT_FOUND' | 'PARSE_ERROR' | 'NETWORK';
  message: string;
};

export type GeminiError = {
  type: 'GeminiError';
  code: 'INVALID_KEY' | 'QUOTA_EXCEEDED' | 'NETWORK' | 'PARSE_ERROR';
  message: string;
};

export type NetworkError = {
  type: 'NetworkError';
  code: 'OFFLINE' | 'TIMEOUT' | 'UNKNOWN';
  message: string;
};

export type AppError = SteamError | HltbError | GeminiError | NetworkError;

export function isAppError(e: unknown): e is AppError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'type' in e &&
    'code' in e &&
    'message' in e &&
    ['SteamError', 'HltbError', 'GeminiError', 'NetworkError'].includes(
      (e as AppError).type,
    )
  );
}
