/**
 * Build-time corpus ingest (issue #6, ADR-0010): USFM → bundled SQLite.
 *
 *   pnpm ingest:download   # once: fetch + verify pinned sources
 *   pnpm ingest            # sources → assets/corpus/corpus.db
 *
 * Translation-agnostic: every SOURCES entry runs through the same
 * parse (usfm-grammar → USJ) → normalize → write pipeline. The output
 * corpus.db is a generated build artifact (gitignored) that Metro bundles as
 * an asset; run this before a native/dev build that renders scripture.
 */

import { readdirSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import type { IngestStats } from './normalize';
import { CANON_BY_CODE } from './books';
import { computeEdition, type SourceFile } from './edition';
import { normalizeUsj } from './normalize';
import { usfmToUsj, usjBookCode } from './parse';
import { SOURCES } from './sources';
import { createCorpusDb, insertBook, insertBookRows, insertTranslation } from './write-db';

const SOURCES_ROOT = join(import.meta.dirname, 'sources');
const OUT_DIR = join(import.meta.dirname, '..', '..', 'assets', 'corpus');
const OUT_PATH = join(OUT_DIR, 'corpus.db');

function readSourceFiles(dir: string): SourceFile[] {
  const root = join(SOURCES_ROOT, dir);
  const files: SourceFile[] = [];
  for (const name of readdirSync(root)) {
    if (!name.toLowerCase().endsWith('.usfm')) continue;
    const usfm = readFileSync(join(root, name), 'utf8');
    const code = usfm.match(/^\\id (\w{3})/)?.[1];
    if (!code || !CANON_BY_CODE.has(code)) continue; // FRT, Apocrypha, …
    files.push({ code, usfm });
  }
  if (files.length !== CANON_BY_CODE.size) {
    const seen = new Set(files.map((f) => f.code));
    const missing = [...CANON_BY_CODE.keys()].filter((c) => !seen.has(c));
    throw new Error(`${dir}: expected 66 canon books, got ${files.length} (missing: ${missing.join(', ')})`);
  }
  return files;
}

const addStats = (into: Record<string, number>, from: IngestStats) => {
  for (const [k, v] of Object.entries(from)) {
    if (typeof v === 'number') into[k] = (into[k] ?? 0) + v;
  }
};

function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  rmSync(OUT_PATH, { force: true });
  const { db, sqlite } = createCorpusDb(OUT_PATH);

  for (const src of SOURCES) {
    const files = readSourceFiles(src.dir);
    const edition = computeEdition(files);
    const translationId = insertTranslation(db, { ...src.meta, edition });
    console.log(`\n${src.meta.abbrev} — edition ${edition}`);

    const totals: Record<string, number> = {};
    let blockCount = 0;
    let tokenCount = 0;
    const ingestAll = sqlite.transaction(() => {
      for (const file of [...files].sort(
        (a, b) => CANON_BY_CODE.get(a.code)!.position - CANON_BY_CODE.get(b.code)!.position,
      )) {
        const bookDef = CANON_BY_CODE.get(file.code)!;
        const bookId = insertBook(db, bookDef);
        const { usj, parseErrors, versifiedTitleRewrites } = usfmToUsj(file.usfm);
        if (versifiedTitleRewrites > 0) {
          console.warn(
            `  ⚠ ${file.code}: ${versifiedTitleRewrites} versified \\d title(s) rewritten to \\qd (grammar gap, see parse.ts)`,
          );
        }
        if (parseErrors.length > 0) {
          console.warn(
            `  ⚠ ${file.code}: usfm-grammar strict parse failed, ingested with ignoreErrors —\n` +
              parseErrors.map((e) => `      ${e}`).join('\n'),
          );
        }
        const usjCode = usjBookCode(usj);
        if (usjCode !== file.code) {
          throw new Error(`${file.code}: USJ book code mismatch ("${usjCode}")`);
        }
        const { blocks, tokens, stats } = normalizeUsj(usj);
        validate(file.code, blocks.length, tokens);
        warnVerseGaps(file.code, tokens);
        insertBookRows(db, { translationId, bookId }, { blocks, tokens });
        addStats(totals, stats);
        blockCount += blocks.length;
        tokenCount += tokens.length;
      }
    });
    ingestAll();
    console.log(`  ${blockCount} blocks, ${tokenCount} tokens`);
    console.log(`  not modelled in Phase 1 (dropped/unwrapped, counted): ${JSON.stringify(totals)}`);
  }

  sqlite.exec('VACUUM; ANALYZE;');
  sqlite.close();
  console.log(`\n✓ wrote ${OUT_PATH}`);
}

/** Corpus invariants (CONTEXT.md) — fail the build, not the reader. */
function validate(code: string, blockCount: number, tokens: { blockId: number; verse: number | null; wordIndex: number | null; text: string; kind: string }[]) {
  const usedBlocks = new Set<number>();
  for (const t of tokens) {
    if (t.blockId < 0 || t.blockId >= blockCount) {
      throw new Error(`${code}: token references unknown block ${t.blockId}`);
    }
    usedBlocks.add(t.blockId);
    if (/\s/.test(t.text) || t.text.length === 0) {
      throw new Error(`${code}: whitespace leaked into token text ${JSON.stringify(t.text)}`);
    }
    if (t.verse === 0) throw new Error(`${code}: verse 0 sentinel — heading tokens must carry NULL`);
    if (t.verse == null && t.wordIndex != null) {
      throw new Error(`${code}: non-verse token carries a word_index`);
    }
    if (t.kind === 'punct' && t.wordIndex != null) {
      throw new Error(`${code}: punct token carries a word_index`);
    }
  }
  if (usedBlocks.size !== blockCount) {
    throw new Error(`${code}: ${blockCount - usedBlocks.size} empty block(s) break the partition`);
  }
}

/**
 * Non-fatal coverage check: a hole in 1..max(verse) per chapter usually means
 * the parser dropped text (a real translation may also legitimately omit
 * late-manuscript verses — hence warn, not throw; a human reads the log).
 */
function warnVerseGaps(code: string, tokens: { chapter: number; verse: number | null }[]) {
  const byChapter = new Map<number, Set<number>>();
  for (const t of tokens) {
    if (t.verse == null) continue;
    (byChapter.get(t.chapter) ?? byChapter.set(t.chapter, new Set()).get(t.chapter)!).add(t.verse);
  }
  for (const [chapter, verses] of byChapter) {
    const max = Math.max(...verses);
    const missing = [];
    for (let v = 1; v <= max; v++) if (!verses.has(v)) missing.push(v);
    if (missing.length > 0) {
      console.warn(`  ⚠ ${code} ${chapter}: no tokens for verse(s) ${missing.join(', ')}`);
    }
  }
}

main();
