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

/** The manuscript palette — resolved per theme (light/dark). Same warm-ink /
 * gilt-ornament language in both; only the values invert. */
export interface Palette {
  /** Body ink. */
  readonly ink: string;
  /** Gilt — verse-number ornaments, acrostic letters, the versal. */
  readonly gilt: string;
  /** Muted ink — superscriptions and secondary headings. */
  readonly muted: string;
  /** Page parchment. */
  readonly parchment: string;
  /** Letterbox bands around the fixed page canvas. */
  readonly letterbox: string;
}

/** The reading theme — a GLOBAL setting (ADR-0004), not a cascade knob. */
export type Theme = 'light' | 'dark';

export const THEMES: Record<Theme, Palette> = {
  /** Warm ink on parchment, gilt ornaments. */
  light: {
    ink: '#2A2520',
    gilt: '#A8842C',
    muted: '#6D6156',
    parchment: '#F6F0E4',
    letterbox: '#221E19',
  },
  /** The night codex: warm-light ink on a dark parchment, brighter gilt. */
  dark: {
    ink: '#E7DDCB',
    gilt: '#C9A24B',
    muted: '#9A8E7C',
    parchment: '#211D18',
    letterbox: '#0E0C0A',
  },
} as const;

/** The default (light) palette — the historical `PALETTE` export. */
export const PALETTE: Palette = THEMES.light;

/** Geometry-preserving ink treatment of one block's tokens. */
export interface BlockStyle {
  readonly color: string;
  readonly bold: boolean;
  readonly italic: boolean;
}

/** Role treatments that differ from the plain-body text, built for a palette. */
function roleStyle(p: Palette, role: BlockRole): BlockStyle | undefined {
  switch (role) {
    case 'book_title':
    case 'major_section':
    case 'section':
      return { color: p.ink, bold: true, italic: false };
    case 'psalm_title':
      return { color: p.muted, bold: false, italic: true };
    case 'acrostic':
      return { color: p.gilt, bold: true, italic: false };
    case 'refrain':
      return { color: p.ink, bold: false, italic: true };
    default:
      return undefined;
  }
}

export function styleForBlock(
  genre: Genre,
  role: BlockRole | null,
  palette: Palette = PALETTE,
): BlockStyle {
  if (role) {
    const style = roleStyle(palette, role);
    if (style) return style;
  }
  // Every heading must read as one — an unregistered role falls back to a
  // heading treatment, never silently to prose.
  return genre === 'heading'
    ? { color: palette.muted, bold: true, italic: false }
    : { color: palette.ink, bold: false, italic: false };
}

/** The gilt superscript verse-number ornament (ADR-0016 look). */
export interface VerseNumStyle {
  readonly color: string;
  /** Font-size multiplier — MUST match the slot the engine reserved. */
  readonly scale: number;
  /** Baseline raise above the body baseline, in em of the body size. */
  readonly raiseEm: number;
}

export function verseNumStyle(palette: Palette = PALETTE): VerseNumStyle {
  return { color: palette.gilt, scale: VERSE_NUM_SCALE, raiseEm: 0.33 };
}
