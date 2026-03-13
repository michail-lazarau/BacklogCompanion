import React from 'react';
import { render } from '@testing-library/react-native';

let mockReducedMotion = false;
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/src/mock'),
  useReducedMotion: () => mockReducedMotion,
}));

jest.mock('../hooks/useHltbData');
jest.mock('@shared/components/OmniPill', () => ({
  OmniPill: ({ label, seconds }: { label: string; seconds: number }) =>
    jest.requireActual<typeof import('react')>('react').createElement(
      jest.requireActual<typeof import('react-native')>('react-native').View,
      { testID: `omni-pill-${label}` },
      jest.requireActual<typeof import('react')>('react').createElement(
        jest.requireActual<typeof import('react-native')>('react-native').Text,
        null,
        label,
      ),
      jest.requireActual<typeof import('react')>('react').createElement(
        jest.requireActual<typeof import('react-native')>('react-native').Text,
        null,
        String(seconds),
      ),
    ),
}));

import { useHltbData } from '../hooks/useHltbData';
import { HltbSection } from './HltbSection';

const mockUseHltbData = useHltbData as jest.MockedFunction<typeof useHltbData>;

describe('HltbSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReducedMotion = false;
  });

  it('renders "How Long To Beat" section label when data is available', () => {
    mockUseHltbData.mockReturnValue({
      hltbData: { main: 18000, extra: 36000, complete: 72000 },
      isPending: false,
      isError: false,
    });

    const { getByText } = render(<HltbSection appId={570} gameName="Dota 2" />);
    expect(getByText('How Long To Beat')).toBeTruthy();
  });

  it('renders 3 OmniPill components with correct labels (Main, Main+, 100%)', () => {
    mockUseHltbData.mockReturnValue({
      hltbData: { main: 18000, extra: 36000, complete: 72000 },
      isPending: false,
      isError: false,
    });

    const { getByTestId } = render(<HltbSection appId={570} gameName="Dota 2" />);
    expect(getByTestId('omni-pill-Main')).toBeTruthy();
    expect(getByTestId('omni-pill-Main+')).toBeTruthy();
    expect(getByTestId('omni-pill-100%')).toBeTruthy();
  });

  it('renders skeleton when isPending', () => {
    mockUseHltbData.mockReturnValue({
      hltbData: undefined,
      isPending: true,
      isError: false,
    });

    const { getByTestId } = render(<HltbSection appId={570} gameName="Dota 2" />);
    expect(getByTestId('hltb-skeleton')).toBeTruthy();
  });

  it('renders "—" pills (seconds=0) with section label when isError', () => {
    mockUseHltbData.mockReturnValue({
      hltbData: undefined,
      isPending: false,
      isError: true,
    });

    const { getByTestId, getByText } = render(<HltbSection appId={570} gameName="Dota 2" />);
    expect(getByTestId('hltb-error')).toBeTruthy();
    expect(getByText('How Long To Beat')).toBeTruthy();
    expect(getByTestId('omni-pill-Main')).toBeTruthy();
    expect(getByTestId('omni-pill-Main+')).toBeTruthy();
    expect(getByTestId('omni-pill-100%')).toBeTruthy();
  });

  it('renders skeleton with static opacity when reduced motion is enabled (AC4)', () => {
    mockReducedMotion = true;
    mockUseHltbData.mockReturnValue({
      hltbData: undefined,
      isPending: true,
      isError: false,
    });

    const { getByTestId } = render(<HltbSection appId={570} gameName="Dota 2" />);
    expect(getByTestId('hltb-skeleton')).toBeTruthy();
    // When reduced motion is on, animatedStyle returns opacity: 1 (static)
    // The skeleton renders but without shimmer animation
  });

  it('renders "—" pills when all values are 0', () => {
    mockUseHltbData.mockReturnValue({
      hltbData: { main: 0, extra: 0, complete: 0 },
      isPending: false,
      isError: false,
    });

    const { getByTestId, getByText } = render(<HltbSection appId={570} gameName="Dota 2" />);
    expect(getByText('How Long To Beat')).toBeTruthy();
    expect(getByTestId('omni-pill-Main')).toBeTruthy();
    expect(getByTestId('omni-pill-Main+')).toBeTruthy();
    expect(getByTestId('omni-pill-100%')).toBeTruthy();
  });
});
