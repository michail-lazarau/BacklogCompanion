import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@features/auth/store/authSlice';
import { libraryReducer } from '@features/library/store/librarySlice';
import type { FilterOption, SortOption } from '../store/librarySlice';
import { FilterSheet } from './FilterSheet';

const makeStore = (activeFilter: FilterOption | null = null, activeSort: SortOption = 'alphabetical') =>
  configureStore({
    reducer: { library: libraryReducer, auth: authReducer },
    preloadedState: {
      library: { sync_status: 'idle' as const, syncErrorReason: null, activeFilter, activeSort },
      auth: { isAuthenticated: true, steamId: '76561198012345678' },
    },
  });

const renderSheet = (
  isVisible: boolean,
  onClose = jest.fn(),
  activeFilter: FilterOption | null = null,
  activeSort: SortOption = 'alphabetical',
) => {
  const store = makeStore(activeFilter, activeSort);
  const utils = render(
    <Provider store={store}>
      <FilterSheet isVisible={isVisible} onClose={onClose} />
    </Provider>,
  );
  return { ...utils, store };
};

describe('FilterSheet', () => {
  it('renders filter options when isVisible is true', () => {
    const { getByTestId } = renderSheet(true);
    expect(getByTestId('filter-option-all')).toBeTruthy();
    expect(getByTestId('filter-option-unplayed')).toBeTruthy();
    expect(getByTestId('filter-option-in_progress')).toBeTruthy();
    expect(getByTestId('filter-option-completed')).toBeTruthy();
  });

  it('renders nothing (null) when isVisible is false', () => {
    const { queryByTestId } = renderSheet(false);
    // Mock returns null when index=-1, so bottom-sheet is absent
    expect(queryByTestId('bottom-sheet')).toBeNull();
  });

  it('dispatches setActiveFilter("unplayed") when Unplayed is tapped', () => {
    const { getByTestId, store } = renderSheet(true);
    fireEvent.press(getByTestId('filter-option-unplayed'));
    expect(store.getState().library.activeFilter).toBe('unplayed');
  });

  it('dispatches setActiveFilter(null) when All is tapped', () => {
    const { getByTestId, store } = renderSheet(true, jest.fn(), 'unplayed');
    fireEvent.press(getByTestId('filter-option-all'));
    expect(store.getState().library.activeFilter).toBeNull();
  });

  it('dispatches setActiveSort("playtime_desc") when Playtime ↓ is tapped', () => {
    const { getByTestId, store } = renderSheet(true);
    fireEvent.press(getByTestId('sort-option-playtime_desc'));
    expect(store.getState().library.activeSort).toBe('playtime_desc');
  });

  it('calls onClose when BottomSheet onChange fires with index -1', async () => {
    const onClose = jest.fn();
    const { rerender, queryByTestId } = render(
      <Provider store={makeStore()}>
        <FilterSheet isVisible={true} onClose={onClose} />
      </Provider>,
    );
    expect(queryByTestId('bottom-sheet')).toBeTruthy();

    rerender(
      <Provider store={makeStore()}>
        <FilterSheet isVisible={false} onClose={onClose} />
      </Provider>,
    );
    expect(queryByTestId('bottom-sheet')).toBeNull();
    // Mock fires onChange(-1) via useEffect when index transitions from 0 → -1,
    // which triggers handleChange(-1) → onClose()
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
