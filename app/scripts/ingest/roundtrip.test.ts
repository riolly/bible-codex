import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readChapter } from '../../src/db/corpus-read';
import { nativeModuleLoads } from './native-probe';
import { normalizeUsj, type UsjDoc } from './normalize';

/**
 * DB round-trip across the ADR-0009 seam: normalized rows written through
 * drizzle(better-sqlite3) and read back with the SAME readChapter query the
 * app runs through drizzle(expo-sqlite). Skipped where the better-sqlite3
 * native module is unbuilt (CI installs with ignore-scripts) or built for a
 * different Node ABI — probed in a subprocess so a hard crash cannot take
 * down the vitest worker (see native-probe). The import alone succeeds even
 * when the binding is unbuilt; only construction touches the .node file.
 */

const native = nativeModuleLoads(
  "import('better-sqlite3').then(({ default: Database }) => { new Database(':memory:').close(); process.exit(0); }, () => process.exit(1));",
);

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

/**
 * The write-db.ts DDL string hand-mirrors src/db/corpus-schema.ts (no
 * generator connects them — drizzle-kit only owns the user DB). This guard
 * makes one-sided edits fail here instead of shipping a corpus the app reads
 * with silent NULLs (issue #20). Tables are discovered from the schema module,
 * so a table added there without DDL also fails.
 */
describe.skipIf(!native)('DDL ↔ drizzle schema parity (write-db.ts hand-mirrors corpus-schema.ts)', () => {
  it('the DDL creates exactly the tables, columns, defaults and indexes the schema declares', async () => {
    const { createCorpusDb } = await import('./write-db');
    const { getTableConfig, SQLiteTable } = await import('drizzle-orm/sqlite-core');
    const { is } = await import('drizzle-orm');
    const schema = await import('../../src/db/corpus-schema');

    const { sqlite } = createCorpusDb(':memory:');
    const configs = Object.values(schema)
      .filter((v) => is(v, SQLiteTable))
      .map((t) => getTableConfig(t as InstanceType<typeof SQLiteTable>));

    // same set of tables
    const ddlTables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all()
      .map((r) => (r as { name: string }).name);
    expect(ddlTables.sort()).toEqual(configs.map((c) => c.name).sort());

    for (const table of configs) {
      // same columns: name, NOT NULL, primary key, presence of a default
      const info = sqlite.prepare(`PRAGMA table_info(${table.name})`).all() as {
        name: string; notnull: number; pk: number; dflt_value: string | null;
      }[];
      const ddlCols = info
        .map((c) => ({
          name: c.name,
          // sqlite reports INTEGER PRIMARY KEY with notnull=0 though it is implicitly NOT NULL
          notNull: c.pk > 0 || c.notnull === 1,
          primary: c.pk > 0,
          hasDefault: c.dflt_value != null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const schemaCols = table.columns
        .map((c) => ({
          name: c.name,
          notNull: c.primary || c.notNull,
          primary: c.primary,
          hasDefault: c.default !== undefined,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      expect(ddlCols, `columns of ${table.name}`).toEqual(schemaCols);

      // same named indexes over the same column lists (UNIQUE autoindexes excluded)
      const ddlIndexes = new Map<string, string[]>();
      const list = sqlite.prepare(`PRAGMA index_list(${table.name})`).all() as {
        name: string; origin: string;
      }[];
      for (const idx of list) {
        if (idx.origin !== 'c') continue; // 'u'/'pk' autoindexes are column-level, checked below
        const cols = sqlite.prepare(`PRAGMA index_info(${idx.name})`).all() as { name: string }[];
        ddlIndexes.set(idx.name, cols.map((c) => c.name));
      }
      const schemaIndexes = new Map<string, string[]>(
        table.indexes.map((idx) => [
          idx.config.name,
          idx.config.columns.map((c) => (c as { name: string }).name),
        ]),
      );
      expect(ddlIndexes, `indexes of ${table.name}`).toEqual(schemaIndexes);

      // same UNIQUE columns (origin 'u' autoindexes ↔ column-level .unique())
      const ddlUnique = list
        .filter((i) => i.origin === 'u')
        .flatMap((i) => (sqlite.prepare(`PRAGMA index_info(${i.name})`).all() as { name: string }[]).map((c) => c.name))
        .sort();
      const schemaUnique = table.columns.filter((c) => c.isUnique).map((c) => c.name).sort();
      expect(ddlUnique, `UNIQUE columns of ${table.name}`).toEqual(schemaUnique);
    }

    sqlite.close();
  });
});
