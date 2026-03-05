/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { App } from '../src/App';
import * as Sentry from '@sentry/react-native';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test('Sentry.init is called at module load with dsn and enabled flag', () => {
  expect(Sentry.init).toHaveBeenCalledWith(
    expect.objectContaining({
      enabled: expect.any(Boolean),
      environment: expect.any(String),
    }),
  );
});

test('Sentry.wrap is called to wrap the App component', () => {
  expect(Sentry.wrap).toHaveBeenCalled();
});
