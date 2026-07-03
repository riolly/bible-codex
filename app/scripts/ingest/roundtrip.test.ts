import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readChapter } from '../../src/db/corpus-read';
import { normalizeUsj, type UsjDoc } from './normalize';

/**
 * DB round-trip across the ADR-0009 seam: normalized rows written through
 * drizzle(better-sqlite3) and read back with the SAME readChapter query the
 * app runs through drizzle(expo-sqlite). Skipped where the better-sqlite3
 * native module is unbuilt (CI installs with ignore-scripts).
 */

const native = await (async () => {
  try {
    // the import succeeds even when the native binding is unbuilt — only
    // construction touches the .node file, so probe that
    const { default: Database } = await import('better-sqlite3');
    new Database(':memory:').close();
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!native)('corpus DB round-trip (write seam ↔ read seam)', () => {
  it('a chapter read returns the exact Token+Block rows the normalizer produced', async () => {
    const { createCorpusDb, insertBook, insertBookRows, insertTranslation } = await import(
      './write-db'
    );
    const usj = JSON.parse(
      readFileSync(join(__dirname, 'fixtures', 'adversarial.usj.json'), 'utf8'),
    ) as UsjDoc;
    const { blocks, tokens } = normalizeUsj(usj);

    const { db, sqlite } = createCorpusDb(':memory:');
    const translationId = insertTranslation(db, {
      name: 'Fixture',
      abbrev: 'FIX',
      language: 'english',
      year: 2026,
      license: 'Public Domain',
      versification: 'av11n',
      edition: 'sha256:0000000000000000',
    });
    const bookId = insertBook(db, { slug: 'John', name: 'John', testament: 'nt', position: 43 });
    insertBookRows(db, { translationId, bookId }, { blocks, tokens });

    // chapter 1 read includes chapter-0 front matter (\mt book title)
    const ch1 = readChapter(db, 'FIX', 'John', 1);
    const expectBlocks = blocks.filter((b) => b.chapter <= 1);
    const expectTokens = tokens.filter((t) => t.chapter <= 1);
    expect(ch1.blocks.length).toBe(expectBlocks.length);
    expect(ch1.tokens.length).toBe(expectTokens.length);
    // domain fields survive the round-trip exactly (storage ids differ)
    expect(
      ch1.blocks.map((b) => [b.chapter, b.genre, b.role, b.indent, b.seq]),
    ).toEqual(expectBlocks.map((b) => [b.chapter, b.genre, b.role, b.indent, b.seq]));
    expect(
      ch1.tokens.map((t) => [t.chapter, t.verse, t.wordIndex, t.seq, t.kind, t.text, t.verseStart, t.owId]),
    ).toEqual(
      expectTokens.map((t) => [t.chapter, t.verse, t.wordIndex, t.seq, t.kind, t.text, t.verseStart, t.owId]),
    );
    // block membership survives via the local-ordinal → rowid mapping
    const localToRow = new Map<number, number>();
    ch1.blocks.forEach((b, i) => localToRow.set(expectBlocks[i].id, b.id));
    ch1.tokens.forEach((t, i) => {
      expect(t.blockId).toBe(localToRow.get(expectTokens[i].blockId));
    });

    // a non-first chapter read does NOT include front matter
    const ch2 = readChapter(db, 'FIX', 'John', 2);
    expect(ch2.blocks.every((b) => b.chapter === 2)).toBe(true);
    expect(ch2.tokens.some((t) => t.verse === null)).toBe(true); // \d + \qa headings

    // unknown coordinate reads empty, not throwing
    expect(readChapter(db, 'KJV', 'John', 1)).toEqual({ blocks: [], tokens: [] });

    sqlite.close();
  });
});
