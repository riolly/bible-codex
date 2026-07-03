import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { nativeModuleLoads } from './native-probe';

/**
 * USFM → USJ drift guard. usfm-grammar loads a NATIVE tree-sitter binding, so
 * this suite runs only where build scripts ran (local dev); CI installs with
 * ignore-scripts and skips it. The committed fixtures/adversarial.usj.json is
 * what the pure-TS golden tests (normalize.test.ts) run against — this test
 * proves that committed USJ is still exactly what the parser produces from
 * the committed USFM, so the two can never drift apart silently.
 *
 * Probed in a subprocess: an ABI-mismatched tree-sitter binding segfaults on
 * import, which an in-process try/catch cannot contain (see native-probe).
 */

const native = nativeModuleLoads(
  "import('usfm-grammar').then(() => process.exit(0), () => process.exit(1));",
);

describe.skipIf(!native)('usfm-grammar → committed USJ fixture', () => {
  it('fixtures/adversarial.usj.json matches a fresh parse of fixtures/adversarial.usfm', async () => {
    const { usfmToUsj } = await import('./parse');
    const usfm = readFileSync(join(__dirname, 'fixtures', 'adversarial.usfm'), 'utf8');
    const committed = JSON.parse(
      readFileSync(join(__dirname, 'fixtures', 'adversarial.usj.json'), 'utf8'),
    );
    const { usj, parseErrors } = usfmToUsj(usfm);
    expect(parseErrors).toEqual([]);
    expect(usj).toEqual(committed);
  });
});
