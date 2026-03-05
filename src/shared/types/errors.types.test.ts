import {
  isAppError,
  type AppError,
  type SteamError,
  type HltbError,
  type GeminiError,
  type NetworkError,
} from './errors.types';

describe('isAppError', () => {
  it('returns true for a valid SteamError', () => {
    const err: SteamError = { type: 'SteamError', code: 'RATE_LIMITED', message: 'Rate limited' };
    expect(isAppError(err)).toBe(true);
  });

  it('returns true for a valid HltbError', () => {
    const err: HltbError = { type: 'HltbError', code: 'NOT_FOUND', message: 'Not found' };
    expect(isAppError(err)).toBe(true);
  });

  it('returns true for a valid GeminiError', () => {
    const err: GeminiError = { type: 'GeminiError', code: 'QUOTA_EXCEEDED', message: 'Quota exceeded' };
    expect(isAppError(err)).toBe(true);
  });

  it('returns true for a valid NetworkError', () => {
    const err: NetworkError = { type: 'NetworkError', code: 'OFFLINE', message: 'Offline' };
    expect(isAppError(err)).toBe(true);
  });

  it('returns false for a plain object without type', () => {
    expect(isAppError({ message: 'oops' })).toBe(false);
  });

  it('returns false for an unknown type string', () => {
    expect(isAppError({ type: 'UnknownError', message: 'oops' })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isAppError(null)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isAppError('SteamError')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isAppError(undefined)).toBe(false);
  });

  it('returns false for a native Error object', () => {
    expect(isAppError(new Error('oops'))).toBe(false);
  });

  it('returns false for an object with valid type but missing code field', () => {
    expect(isAppError({ type: 'SteamError', message: 'missing code' })).toBe(false);
  });

  it('returns false for an object with valid type but missing message field', () => {
    expect(isAppError({ type: 'NetworkError', code: 'OFFLINE' })).toBe(false);
  });

  it('AppError union covers all four types', () => {
    const errors: AppError[] = [
      { type: 'SteamError', code: 'UNAUTHORIZED', message: 'Unauthorized' },
      { type: 'HltbError', code: 'PARSE_ERROR', message: 'Parse error' },
      { type: 'GeminiError', code: 'INVALID_KEY', message: 'Invalid key' },
      { type: 'NetworkError', code: 'TIMEOUT', message: 'Timeout' },
    ];
    errors.forEach(err => expect(isAppError(err)).toBe(true));
  });
});
