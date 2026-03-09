import { formatPlaytime } from './formatPlaytime';

describe('formatPlaytime', () => {
  it('returns "0 min" for 0 minutes', () => {
    expect(formatPlaytime(0)).toBe('0 min');
  });

  it('returns "< 1 hr" for 1 minute', () => {
    expect(formatPlaytime(1)).toBe('< 1 hr');
  });

  it('returns "< 1 hr" for 59 minutes', () => {
    expect(formatPlaytime(59)).toBe('< 1 hr');
  });

  it('returns "1 hr" for exactly 60 minutes', () => {
    expect(formatPlaytime(60)).toBe('1 hr');
  });

  it('returns "1 hr" for 61 minutes', () => {
    expect(formatPlaytime(61)).toBe('1 hr');
  });

  it('returns "2 hrs" for 120 minutes', () => {
    expect(formatPlaytime(120)).toBe('2 hrs');
  });

  it('returns "3 hrs" for 180 minutes', () => {
    expect(formatPlaytime(180)).toBe('3 hrs');
  });

  it('returns "33 hrs" for 2000 minutes', () => {
    expect(formatPlaytime(2000)).toBe('33 hrs');
  });

  it('returns "0 min" for negative input', () => {
    expect(formatPlaytime(-1)).toBe('0 min');
  });
});
