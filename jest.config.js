module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-reanimated|@shopify/flash-list|@d11/react-native-fast-image|@gorhom/bottom-sheet|react-native-gesture-handler|react-native-safe-area-context|react-native-screens|react-native-mmkv|nativewind|react-redux|@reduxjs|redux-persist|react-native-keyboard-aware-scroll-view)/)',
  ],
};
