import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadVersificationMap } from '../../src/db/corpus-read';
import { buildVersificationMap, toCanonical, toNative } from '../../src/model/versification';
import { CANON_BY_CODE } from './books';
import { nativeModuleLoads } from './native-probe';
import { parseVrs } from './vrs';

/**
 * ADR-0010 P1 HARD GATE. KJV & BSB are both av11n, so production never populates
 * versification_map — this deliberately divergent fixture is the ONLY thing that
 * exercises the native↔canonical round-trip an Anchor depends on. It must
 * round-trip an anchor through the map in BOTH directions:
 *   1. as pure functions over the parsed rows, and
 *   2. through the actual versification_map table (written by the ingest writer,
 *      read back by the app-side query) — proving the whole seam, not just math.
 * P1 does not ship until this passes (OVERVIEW §5).
 */

const divergentVrs = readFileSync(join(__dirname, 'fixtures', 'divergent.vrs'), 'utf8');

// The four classic divergence sites, as [book, native, canonical] anchors.
const ANCHORS = [
  { book: 'Psalms', native: { chapter: 3, verse: 1 }, canon: { chapter: 3, verse: 0 } }, // title
  { book: 'Psalms', native: { chapter: 3, verse: 2 }, canon: { chapter: 3, verse: 1 } },
  { book: 'Joel', native: { chapter: 3, verse: 1 }, canon: { chapter: 2, verse: 28 } },
  { book: 'Joel', native: { chapter: 4, verse: 1 }, canon: { chapter: 3, verse: 1 } },
  { book: 'Malachi', native: { chapter: 3, verse: 19 }, canon: { chapter: 4, verse: 1 } },
  { book: 'Malachi', native: { chapter: 3, verse: 24 }, canon: { chapter: 4, verse: 6 } },
  { book: 'Revelation', native: { chapter: 12, verse: 18 }, canon: { chapter: 13, verse: 1 } },
  { book: 'Revelation', native: { chapter: 13, verse: 1 }, canon: { chapter: 13, verse: 2 } },
] as const;

describe('divergent versification fixture — pure round-trip (hard gate)', () => {
  const rows = parseVrs(divergentVrs);
  const map = buildVersificationMap(rows);

  it('parses the fixture into sparse rows for every divergence site', () => {
    // 9 (Ps3) + 5 (Joel 3) + 21 (Joel 4) + 6 (Mal) + 1 (Rev 12:18) + 17 (Rev 13) = 59
    expect(rows).toHaveLength(59);
  });

  it('maps each anchor native→canonical exactly', () => {
    for (const a of ANCHORS) {
      expect(toCanonical(map, a.book, a.native), `${a.book} ${a.native.chapter}:${a.native.verse}`)
        .toEqual(a.canon);
    }
  });

  it('maps each anchor canonical→native exactly', () => {
    for (const a of ANCHORS) {
      expect(toNative(map, a.book, a.canon), `${a.book} ${a.canon.chapter}:${a.canon.verse}`)
        .toEqual(a.native);
    }
  });

  it('round-trips an anchor through the map in BOTH directions', () => {
    for (const a of ANCHORS) {
      expect(toCanonical(map, a.book, toNative(map, a.book, a.canon))).toEqual(a.canon);
      expect(toNative(map, a.book, toCanonical(map, a.book, a.native))).toEqual(a.native);
    }
  });

  it('leaves an undiverged verse identity (sparse map)', () => {
    expect(toCanonical(map, 'Joel', { chapter: 1, verse: 1 })).toEqual({ chapter: 1, verse: 1 });
    expect(toCanonical(map, 'Genesis', { chapter: 1, verse: 1 })).toEqual({ chapter: 1, verse: 1 });
  });
});

const native = nativeModuleLoads(
  "import('better-sqlite3').then(({ default: Database }) => { new Database(':memory:').close(); process.exit(0); }, () => process.exit(1));",
);

describe.skipIf(!native)('divergent versification fixture — DB round-trip through versification_map', () => {
  it('writes the sparse rows and reads them back into an identical map', async () => {
    const { createCorpusDb, insertBook, insertTranslation, insertVersification } = await import(
      './write-db'
    );

    const { db, sqlite } = createCorpusDb(':memory:');
    const translationId = insertTranslation(db, {
      name: 'Divergent Fixture',
      abbrev: 'DIV',
      language: 'hebrew',
      year: 2026,
      license: 'Public Domain',
      versification: 'org',
      edition: 'sha256:0000000000000000',
    });

    // Insert the books the fixture touches and resolve slug → storage id.
    const bookIdBySlug = new Map<string, number>();
    for (const code of ['PSA', 'JOL', 'MAL', 'REV', 'GEN']) {
      const b = CANON_BY_CODE.get(code)!;
      bookIdBySlug.set(b.slug, insertBook(db, b));
    }

    const rows = parseVrs(divergentVrs).map((r) => ({
      bookId: bookIdBySlug.get(r.book)!,
      srcChapter: r.srcChapter,
      srcVerse: r.srcVerse,
      canonChapter: r.canonChapter,
      canonVerse: r.canonVerse,
    }));
    insertVersification(db, translationId, rows);

    // Read back through the SAME app-side query the reader uses, build the map,
    // and round-trip every anchor both directions through the PERSISTED rows.
    const map = loadVersificationMap(db, 'DIV');
    for (const a of ANCHORS) {
      expect(toCanonical(map, a.book, a.native)).toEqual(a.canon);
      expect(toNative(map, a.book, a.canon)).toEqual(a.native);
      expect(toNative(map, a.book, toCanonical(map, a.book, a.native))).toEqual(a.native);
    }

    // A translation with no divergence rows (the av11n production case) reads an
    // empty, identity map — no rows leak across the translation join.
    expect(loadVersificationMap(db, 'KJV').nativeToCanon.size).toBe(0);

    sqlite.close();
  });
});
