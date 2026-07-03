module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Inline `import x from './*.sql'` as a string so drizzle's bundled
      // migrations load (migrations.js → migration.sql). Pairs with
      // `sourceExts.push('sql')` in metro.config.js — without this plugin
      // Metro parses the .sql as JS and dies on "Missing semicolon".
      ['inline-import', { extensions: ['.sql'] }],
      // react-native-worklets/plugin must be LAST (reanimated 4 / worklets).
      'react-native-worklets/plugin',
    ],
  };
};
