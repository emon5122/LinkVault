// Babel configuration for LinkVault.
// - `babel-preset-expo` enables the Expo runtime + React Compiler (see app.json `experiments.reactCompiler`).
// - `jsxImportSource: 'nativewind'` wires up NativeWind's className transform (NativeWind v4.1+ needs no separate plugin).
// - `react-native-worklets/plugin` MUST be listed last for Reanimated 4 worklets to compile.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }]],
    plugins: ['react-native-worklets/plugin'],
  };
};
