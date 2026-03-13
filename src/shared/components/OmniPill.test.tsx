import React from 'react';
import { render } from '@testing-library/react-native';
import { OmniPill } from './OmniPill';

const mockFormatHltbTime = jest.fn((s: number) => (s === 0 ? '--' : `${s}s`));
jest.mock('@shared/utils/hltbClient', () => ({
  formatHltbTime: (s: number) => mockFormatHltbTime(s),
}));

type StyleEntry = Record<string, unknown>;
type PillJSON = { props: { style: StyleEntry | StyleEntry[] } };

const getPillColor = (json: unknown): string => {
  const { style } = (json as PillJSON).props;
  const styles = Array.isArray(style) ? style : [style];
  const merged = Object.assign({}, ...styles) as StyleEntry;
  return merged.backgroundColor as string;
};

describe('OmniPill', () => {
  it('renders label and formatted time', () => {
    const { getByText } = render(<OmniPill label="Main" seconds={18000} />);
    expect(getByText('Main')).toBeTruthy();
    expect(getByText('18000s')).toBeTruthy();
    expect(mockFormatHltbTime).toHaveBeenCalledWith(18000);
  });

  it('green pill for < 10h (18000 seconds = 5h)', () => {
    const { toJSON } = render(<OmniPill label="Main" seconds={18000} />);
    expect(getPillColor(toJSON())).toBe('#A3E635');
  });

  it('amber pill for 10–40h (72000 seconds = 20h)', () => {
    const { toJSON } = render(<OmniPill label="Main+" seconds={72000} />);
    expect(getPillColor(toJSON())).toBe('#FBBF24');
  });

  it('red pill for > 40h (180000 seconds = 50h)', () => {
    const { toJSON } = render(<OmniPill label="100%" seconds={180000} />);
    expect(getPillColor(toJSON())).toBe('#F87171');
  });

  it('blue pill for 0 seconds (shows "--")', () => {
    const { getByText, toJSON } = render(<OmniPill label="Main" seconds={0} />);
    expect(getByText('--')).toBeTruthy();
    expect(getPillColor(toJSON())).toBe('#66C0F4');
  });
});
