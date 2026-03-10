import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from './useDebounce';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 50));
    expect(result.current).toBe('hello');
  });

  it('does not update before delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 50),
      { initialProps: { value: 'a' } },
    );
    rerender({ value: 'ab' });
    act(() => { jest.advanceTimersByTime(30); });
    expect(result.current).toBe('a');
  });

  it('updates after delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 50),
      { initialProps: { value: 'a' } },
    );
    rerender({ value: 'ab' });
    act(() => { jest.advanceTimersByTime(50); });
    expect(result.current).toBe('ab');
  });

  it('resets timer when delay changes before it elapses', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 50 } },
    );
    rerender({ value: 'ab', delay: 50 });
    act(() => { jest.advanceTimersByTime(30); }); // 30ms in — not yet fired
    rerender({ value: 'ab', delay: 200 });        // delay increases — timer resets
    act(() => { jest.advanceTimersByTime(50); }); // only 50ms since delay change — not 200ms yet
    expect(result.current).toBe('a');
    act(() => { jest.advanceTimersByTime(150); }); // now 200ms since delay change
    expect(result.current).toBe('ab');
  });

  it('resets timer if value changes before delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 50),
      { initialProps: { value: 'a' } },
    );
    rerender({ value: 'ab' });
    act(() => { jest.advanceTimersByTime(30); });
    rerender({ value: 'abc' });
    act(() => { jest.advanceTimersByTime(30); }); // 30ms since 'abc' — still < 50ms
    expect(result.current).toBe('a');
    act(() => { jest.advanceTimersByTime(20); }); // now 50ms since 'abc'
    expect(result.current).toBe('abc');
  });
});
