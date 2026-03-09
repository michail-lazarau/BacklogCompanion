module.exports = (api) => {
  const isTest = api.env('test');

  return {
    presets: [
      'module:@react-native/babel-preset',
      ...(isTest ? [] : ['nativewind/babel']),
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@features': './src/features',
            '@shared': './src/shared',
            '@db': './src/db',
            '@navigation': './src/navigation',
            '@res': './src/res',
          },
        },
      ],
      // Inline .sql files as strings — needed for Drizzle migration bundling
      ['inline-import', { extensions: ['.sql'] }],
      ...(isTest ? [] : ['react-native-reanimated/plugin']), // MUST be last
    ],
  };
};
