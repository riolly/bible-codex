/**
 * Fetch the pinned USFM source zips into scripts/ingest/sources/ (gitignored)
 * and verify their sha256 against sources.ts. Run once before `pnpm ingest`:
 *
 *   pnpm ingest:download
 */

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SOURCES } from './sources';

const SOURCES_ROOT = join(import.meta.dirname, 'sources');

async function main() {
  await mkdir(SOURCES_ROOT, { recursive: true });
  for (const src of SOURCES) {
    const dest = join(SOURCES_ROOT, src.dir);
    if (existsSync(dest)) {
      console.log(`✓ ${src.meta.abbrev}: ${dest} exists — skipping (rm it to re-download)`);
      continue;
    }
    console.log(`↓ ${src.meta.abbrev}: ${src.url}`);
    const res = await fetch(src.url);
    if (!res.ok) throw new Error(`${src.url} → HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const digest = createHash('sha256').update(buf).digest('hex');
    if (digest !== src.sha256) {
      throw new Error(
        `${src.meta.abbrev}: sha256 mismatch — upstream re-published.\n` +
          `  pinned:   ${src.sha256}\n  fetched:  ${digest}\n` +
          `Updating the pin is a NEW EDITION (ADR-0013): bump sources.ts consciously.`,
      );
    }
    const zipPath = join(SOURCES_ROOT, `${src.dir}.zip`);
    await writeFile(zipPath, buf);
    await mkdir(dest, { recursive: true });
    execFileSync('unzip', ['-oq', zipPath, '-d', dest]);
    await rm(zipPath);
    console.log(`✓ ${src.meta.abbrev}: verified sha256, unpacked to ${dest}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
