module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Inline EXPO_PUBLIC_* and NEXT_PUBLIC_* env vars at build time
      ['transform-inline-environment-variables', {
        include: [
          'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
          'EXPO_PUBLIC_API_URL',
          'EXPO_PUBLIC_WEB_URL',
          'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        ]
      }]
    ],
  };
};
