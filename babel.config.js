module.exports = (api) => {
  const isTest = api.env('test');

  return {
    presets: ['module:@react-native/babel-preset'],
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
          },
        },
      ],
      ...(isTest
        ? []
        : [
            'nativewind/babel',
            'react-native-reanimated/plugin', // MUST be last
          ]),
    ],
  };
};
