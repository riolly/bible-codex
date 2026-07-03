// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'src/db/migrations/*'] },
  {
    // ARCHITECTURE GUARD (ADR-0008): the typesetting/layout engine and the
    // corpus model are framework-agnostic — they must NEVER import Skia /
    // CanvasKit, nor reach into the draw layer. Only `src/draw/**` may. A
    // violation here fails the build. This is the invariant #5 exists to lock.
    files: ['src/engine/**/*.{ts,tsx}', 'src/model/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@shopify/react-native-skia',
                '@shopify/react-native-skia/**',
                'canvaskit-wasm',
                '**/draw/**',
              ],
              message:
                'Engine/model must stay framework-agnostic: no Skia/CanvasKit/draw imports (ADR-0008).',
            },
          ],
        },
      ],
    },
  },
]);
