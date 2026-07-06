/**
 * Parse standard `.vrs` versification mapping data → sparse `versification_map`
 * rows (ADR-0010). A `.vrs` mapping line reconciles a translation's NATIVE
 * numbering to the av11n CANONICAL numbering:
 *
 *     # comment
 *     JOL 3:1-5 = JOL 2:28-32      # native (left) = canonical (right)
 *     MAL 3:19-24 = MAL 4:1-6
 *     REV 12:18 = REV 13:1
 *
 * Each side is `CODE chapter:verse` or `CODE chapter:vStart-vEnd` (a verse range
 * within one chapter). Ranges expand to one row per verse and MUST be
 * equal-length on both sides. Book codes are USFM `\id` codes resolved to the
 * permanent canonical slug via CANON_BY_CODE (books.ts) — the slug is what every
 * row and Anchor keys on, never the code.
 *
 * Only DIVERGENT lines appear in a `.vrs`; an av11n translation's file has none
 * (or no file), so its map is empty and every address is identity — which is the
 * whole point of the sparse table.
 */

import { CANON_BY_CODE } from './books';
import type { VersificationRow } from '../../src/model/versification';

interface Ref {
  readonly code: string;
  readonly slug: string;
  readonly chapter: number;
  readonly verses: readonly number[]; // one or more (expanded range), in order
}

/** Parse one `CODE C:V` or `CODE C:Va-Vb` side. */
function parseRef(text: string, line: number): Ref {
  const m = text.trim().match(/^([0-9A-Z]{3})\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`vrs: unparseable reference "${text}" (line ${line})`);
  const [, code, chapterStr, startStr, endStr] = m;
  const bookDef = CANON_BY_CODE.get(code);
  if (!bookDef) throw new Error(`vrs: unknown/non-canon book code "${code}" (line ${line})`);
  const chapter = parseInt(chapterStr, 10);
  const start = parseInt(startStr, 10);
  const end = endStr ? parseInt(endStr, 10) : start;
  if (end < start) throw new Error(`vrs: descending verse range "${text}" (line ${line})`);
  const verses: number[] = [];
  for (let v = start; v <= end; v++) verses.push(v);
  return { code, slug: bookDef.slug, chapter, verses };
}

/**
 * Parse `.vrs` mapping text → sparse rows. Non-mapping content (comments, blank
 * lines, and any leading non-mapping directives) is ignored; a malformed mapping
 * line throws so a bad file fails the build, not the reader.
 */
export function parseVrs(text: string): VersificationRow[] {
  const rows: VersificationRow[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].replace(/#.*$/, '').trim(); // strip trailing comment
    if (raw === '') continue;
    if (!raw.includes('=')) continue; // not a mapping line (a scheme directive, etc.)
    const [srcText, canonText, ...extra] = raw.split('=');
    if (extra.length > 0) throw new Error(`vrs: multiple "=" on line ${i + 1}`);
    const src = parseRef(srcText, i + 1);
    const canon = parseRef(canonText, i + 1);
    if (src.verses.length !== canon.verses.length) {
      throw new Error(`vrs: mismatched range lengths on line ${i + 1} ("${raw}")`);
    }
    if (src.slug !== canon.slug) {
      // A row is book-scoped; cross-book renumbering is not modelled in P1.
      throw new Error(`vrs: cross-book mapping ${src.code}→${canon.code} on line ${i + 1}`);
    }
    for (let k = 0; k < src.verses.length; k++) {
      rows.push({
        book: src.slug,
        srcChapter: src.chapter,
        srcVerse: src.verses[k],
        canonChapter: canon.chapter,
        canonVerse: canon.verses[k],
      });
    }
  }
  return rows;
}
