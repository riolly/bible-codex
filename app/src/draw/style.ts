/**
 * Style resolution — the pure half of the draw layer (#8): block genre/role →
 * ink treatment. No Skia import (kept pure so vitest covers it); the Skia
 * picture builder maps these specs onto Paragraph text styles.
 *
 * CONSTRAINT: the engine (#7) measured every token at 1em with role-blind
 * metrics, so a style may never change advance geometry — no font size, no
 * letter-spacing, no small caps. Color and slant/weight only; per-token
 * anchoring absorbs the small width drift of the bold/italic faces. Role-aware
 * sizing arrives with the presentation cascade (#11), where the measure seam
 * learns about roles too.
 */

import { VERSE_NUM_SCALE } from '../engine/layout';
import type { BlockRole, Genre } from '../model/corpus';

/** The manuscript palette: warm ink on parchment, gilt ornaments. */
export const PALETTE = {
  /** Body ink — warm near-black. */
  ink: '#2A2520',
  /** Gilt — verse-number ornaments, acrostic letters, the versal. */
  gilt: '#A8842C',
  /** Muted ink — superscriptions and secondary headings. */
  muted: '#6D6156',
  /** Page parchment. */
  parchment: '#F6F0E4',
  /** Letterbox bands around the fixed page canvas. */
  letterbox: '#221E19',
} as const;

/** Geometry-preserving ink treatment of one block's tokens. */
export interface BlockStyle {
  readonly color: string;
  readonly bold: boolean;
  readonly italic: boolean;
}

const BODY: BlockStyle = { color: PALETTE.ink, bold: false, italic: false };

/** Role treatments that differ from the body text. */
const ROLE_STYLE: Partial<Record<BlockRole, BlockStyle>> = {
  book_title: { color: PALETTE.ink, bold: true, italic: false },
  major_section: { color: PALETTE.ink, bold: true, italic: false },
  section: { color: PALETTE.ink, bold: true, italic: false },
  psalm_title: { color: PALETTE.muted, bold: false, italic: true },
  acrostic: { color: PALETTE.gilt, bold: true, italic: false },
  refrain: { color: PALETTE.ink, bold: false, italic: true },
};

/** Every heading must read as one — an unregistered role falls back here,
 * never silently to prose. */
const HEADING_FALLBACK: BlockStyle = { color: PALETTE.muted, bold: true, italic: false };

export function styleForBlock(genre: Genre, role: BlockRole | null): BlockStyle {
  if (role && ROLE_STYLE[role]) return ROLE_STYLE[role];
  return genre === 'heading' ? HEADING_FALLBACK : BODY;
}

/** The gilt superscript verse-number ornament (ADR-0016 look). */
export interface VerseNumStyle {
  readonly color: string;
  /** Font-size multiplier — MUST match the slot the engine reserved. */
  readonly scale: number;
  /** Baseline raise above the body baseline, in em of the body size. */
  readonly raiseEm: number;
}

export function verseNumStyle(): VerseNumStyle {
  return { color: PALETTE.gilt, scale: VERSE_NUM_SCALE, raiseEm: 0.33 };
}
