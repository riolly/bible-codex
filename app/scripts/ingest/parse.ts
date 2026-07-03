/**
 * USFM → USJ via usfm-grammar (ADR-0010: parse at build time, never on
 * device). Isolated in its own module because usfm-grammar loads a NATIVE
 * tree-sitter binding at import: everything else in the pipeline is pure TS,
 * so tests import this lazily and skip when the native module is unavailable
 * (CI installs with ignore-scripts).
 *
 * Parsing is STRICT first; on failure it retries with ignoreErrors and
 * surfaces every parser error to the caller, so the ingest log gets human
 * eyes on anything the grammar disliked while the normalize/validate
 * invariants still guard the output.
 *
 * KNOWN GRAMMAR GAP, preprocessed away: USFM allows a \d descriptive title to
 * CONTAIN verse text (BSB Zech 12: `\d` then `\v 1 …`), but tree-sitter-usfm3
 * rejects \v inside \d — even ignoreErrors crashes its USJ generator. The
 * construct is rewritten to `\qd \v …` (a para marker the grammar accepts),
 * and the normalizer maps \qd → heading/psalm_title, so the domain output is
 * exactly what \d meant. The rewrite count is reported to the caller.
 */

import { USFMParser } from 'usfm-grammar';

import type { UsjDoc } from './normalize';

export interface ParseOutcome {
  usj: UsjDoc;
  /** Strict-mode parser errors (empty when the source parsed cleanly). */
  parseErrors: string[];
  /** Count of versified-\d constructs rewritten to \qd pre-parse. */
  versifiedTitleRewrites: number;
}

const VERSIFIED_D = /\\d[ \t]*\r?\n(\\v )/g;

export function usfmToUsj(rawUsfm: string): ParseOutcome {
  const versifiedTitleRewrites = [...rawUsfm.matchAll(VERSIFIED_D)].length;
  const usfm = rawUsfm.replace(VERSIFIED_D, '\\qd $1');
  const parser = new USFMParser(usfm);
  let usj: UsjDoc;
  let parseErrors: string[] = [];
  try {
    usj = parser.toUSJ() as unknown as UsjDoc;
  } catch (e) {
    usj = parser.toUSJ(undefined, undefined, true) as unknown as UsjDoc;
    parseErrors = String(e instanceof Error ? e.message : e)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('At '));
    if (parseErrors.length === 0) throw e;
  }
  if (usj.type !== 'USJ') {
    // lenient mode reports failure as { error } instead of throwing
    const detail = (usj as unknown as { error?: string }).error ?? JSON.stringify(usj).slice(0, 200);
    throw new Error(`usfm-grammar did not return a USJ document: ${detail}`);
  }
  return { usj, parseErrors, versifiedTitleRewrites };
}

/** The USFM book code from the \id line (USJ `book` element). */
export function usjBookCode(usj: UsjDoc): string | null {
  for (const node of usj.content) {
    if (typeof node !== 'string' && node.type === 'book') return node.code ?? null;
  }
  return null;
}
