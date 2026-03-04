module.exports = {
  preset: 'react-native',
  setupFiles: ['./node_modules/react-native-gesture-handler/jestSetup.js'],
  moduleNameMapper: {
    '^react-native-mmkv$': '<rootDir>/__mocks__/react-native-mmkv/index.ts',
    '^react-native-config$': '<rootDir>/__mocks__/react-native-config.ts',
    '^@op-engineering/op-sqlite$': '<rootDir>/__mocks__/@op-engineering/op-sqlite.ts',
    '^drizzle-orm/op-sqlite/migrator$': '<rootDir>/__mocks__/drizzle-orm/op-sqlite/migrator.ts',
    '\\.css$': '<rootDir>/__mocks__/fileMock.ts',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-reanimated|@shopify/flash-list|@d11/react-native-fast-image|@gorhom/bottom-sheet|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-mmkv|nativewind|react-redux|@reduxjs|redux-persist|react-native-keyboard-aware-scroll-view|react-native-iphone-x-helper|react-native-config|react-native-toast-message|immer)/)',
  ],
};
