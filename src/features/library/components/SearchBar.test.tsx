import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('renders TextInput with correct placeholder', () => {
    const { getByTestId } = render(
      <SearchBar value="" onChangeText={jest.fn()} placeholder="Search…" />,
    );
    expect(getByTestId('search-bar-input').props.placeholder).toBe('Search…');
  });

  it('renders default placeholder when none is provided', () => {
    const { getByTestId } = render(
      <SearchBar value="" onChangeText={jest.fn()} />,
    );
    expect(getByTestId('search-bar-input').props.placeholder).toBe('Search games…');
  });

  it('calls onChangeText when text is typed', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <SearchBar value="" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(getByTestId('search-bar-input'), 'cast');
    expect(onChangeText).toHaveBeenCalledWith('cast');
  });

  it('does not render clear button when value is empty', () => {
    const { queryByTestId } = render(
      <SearchBar value="" onChangeText={jest.fn()} />,
    );
    expect(queryByTestId('search-bar-clear')).toBeNull();
  });

  it('renders clear button when value is non-empty', () => {
    const { getByTestId } = render(
      <SearchBar value="cas" onChangeText={jest.fn()} />,
    );
    expect(getByTestId('search-bar-clear')).toBeTruthy();
  });

  it('calls onChangeText with empty string when clear button is pressed', () => {
    const onChangeText = jest.fn();
    const { getByTestId } = render(
      <SearchBar value="cas" onChangeText={onChangeText} />,
    );
    fireEvent.press(getByTestId('search-bar-clear'));
    expect(onChangeText).toHaveBeenCalledWith('');
  });
});
