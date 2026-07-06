// Visual-goldens setup: boot CanvasKit into global.CanvasKit before any test
// module loads, so the web-Skia shim (src/draw/__visual__/skia-web.ts) can build
// its API. LoadSkiaWeb is idempotent (guards on global.CanvasKit).
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/commonjs/web/LoadSkiaWeb';
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import { expect } from 'vitest';

expect.extend({ toMatchImageSnapshot });

await LoadSkiaWeb();
