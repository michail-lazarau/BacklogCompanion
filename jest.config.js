module.exports = {
  preset: 'react-native',
  forceExit: true,
  setupFiles: [
    './node_modules/react-native-gesture-handler/jestSetup.js',
    './jest.setup.ts',
  ],
  moduleNameMapper: {
    '^react-native-mmkv$': '<rootDir>/__mocks__/react-native-mmkv/index.ts',
    '^react-native-config$': '<rootDir>/__mocks__/react-native-config.ts',
    '^@op-engineering/op-sqlite$': '<rootDir>/__mocks__/@op-engineering/op-sqlite.ts',
    '^drizzle-orm/op-sqlite/migrator$': '<rootDir>/__mocks__/drizzle-orm/op-sqlite/migrator.ts',
    '\\.css$': '<rootDir>/__mocks__/fileMock.ts',
    '\\.svg$': '<rootDir>/__mocks__/svgMock.tsx',
    '^react-native-keychain$': '<rootDir>/__mocks__/react-native-keychain.ts',
    '^@sentry/react-native$': '<rootDir>/__mocks__/@sentry/react-native.ts',
    '^react-native-inappbrowser-reborn$': '<rootDir>/__mocks__/react-native-inappbrowser-reborn.ts',
    '^react-native-toast-message$': '<rootDir>/__mocks__/react-native-toast-message.ts',
    '^@d11/react-native-fast-image$': '<rootDir>/__mocks__/@d11/react-native-fast-image.tsx',
    '^react-native-reanimated$': '<rootDir>/node_modules/react-native-reanimated/mock',
    '^react-native-worklets$': '<rootDir>/node_modules/react-native-worklets/src/mock',
    '^@react-native-community/netinfo$': '<rootDir>/__mocks__/@react-native-community/netinfo.ts',
    '^@gorhom/bottom-sheet$': '<rootDir>/__mocks__/@gorhom/bottom-sheet.tsx',
    '^redux-persist$': '<rootDir>/__mocks__/redux-persist.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|@react-native-community|react-native-reanimated|react-native-worklets|@shopify/flash-list|@d11/react-native-fast-image|@gorhom/bottom-sheet|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-mmkv|nativewind|react-redux|@reduxjs|redux-persist|react-native-keyboard-aware-scroll-view|react-native-iphone-x-helper|react-native-config|react-native-toast-message|immer|react-native-keychain|@sentry|react-native-inappbrowser-reborn|react-native-svg)/)',
  ],
};
