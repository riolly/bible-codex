/**
 * Built-in preset personalities (ADR-0018) — typography ships as curated
 * product constants, not user-DB rows. Classic (traditional print Bible) and
 * Modern (contemporary) are the shipped set; Manuscript is a reserved third
 * slot, earned not defaulted.
 *
 * INVARIANTS:
 * - ADR-0018: `reading_settings.active_preset_id` stores one of these slugs;
 *   an unknown slug (stale restore, a future preset) falls back to the
 *   default, never crashes.
 * - A preset is a FULL personality: every ResolvedRules knob concrete plus
 *   verse-number style, versal style, and paper tint per theme. Dark/light
 *   itself stays a GLOBAL choice (ADR-0004) — the preset only supplies the
 *   tint for each.
 * - The genre/role/book cascade machinery serves the built-ins' own internal
 *   use (`overrides`, e.g. Classic's poetry indent) — not user rows.
 * - ADR-0008: pure TS, no Skia import.
 *
 * Font values are PLACEHOLDERS until the #45 bake-off; the shape is the
 * deliverable here.
 */

import type { LayoutOverride } from './cascade';
import type {
  RunningHeadStyle,
  SectionBreakStyle,
  VersalStyle,
  VerseNumberStyle,
} from './model';
import type { ResolvedRules } from './rules';
import { VERSE_NUM_SCALE } from './typeset';

/** The shipped personality slugs (ADR-0018). */
export type PresetSlug = 'classic' | 'modern';

/** Paper tint per GLOBAL theme — hex fills for the page parchment. */
export interface PaperTint {
  readonly light: string;
  readonly dark: string;
}

/** One shipped personality: concrete base rules + the non-cascade styling. */
export interface BuiltinPreset extends ResolvedRules {
  readonly slug: PresetSlug;
  readonly name: string;
  readonly verseNumber: VerseNumberStyle;
  readonly runningHead: RunningHeadStyle;
  readonly versal: VersalStyle;
  readonly sectionBreak: SectionBreakStyle;
  readonly paper: PaperTint;
  /** The preset's own internal cascade refinements (genre/role/book). */
  readonly overrides: readonly LayoutOverride[];
}

/**
 * Classic — the traditional print Bible: serif, justified measure, drop cap,
 * ivory paper (warm charcoal in the dark theme).
 */
const CLASSIC: BuiltinPreset = {
  slug: 'classic',
  name: 'Classic',
  fontFamily: 'Cardo',
  fontSize: 18,
  lineHeight: 1.6,
  margin: 2,
  paragraphSpacing: 0.5,
  indentStep: 1,
  align: 'justify',
  measure: 30,
  railWidth: 6,
  verseNumber: { scale: VERSE_NUM_SCALE, raiseEm: 0.33, tone: 'gilt' },
  runningHead: { scale: 0.72, tone: 'gilt' },
  versal: { kind: 'drop', lines: 3 },
  sectionBreak: { glyph: '✦', scale: 0.9, tone: 'gilt' },
  paper: { light: '#F6F0E4', dark: '#211D18' },
  overrides: [
    // The print-Bible poetry convention: deeper hanging indents than prose.
    { scopeKind: 'genre', scopeValue: 'poetry', indentStep: 1.5 },
  ],
};

/**
 * Modern — contemporary: airy leading, left-aligned rag, raised cap, cool
 * white paper (cool charcoal in the dark theme).
 */
const MODERN: BuiltinPreset = {
  slug: 'modern',
  name: 'Modern',
  fontFamily: 'Cardo',
  fontSize: 18,
  lineHeight: 1.8,
  margin: 2,
  paragraphSpacing: 0.75,
  indentStep: 1,
  align: 'left',
  measure: 28,
  railWidth: 6,
  verseNumber: { scale: 0.58, raiseEm: 0.25, tone: 'muted' },
  runningHead: { scale: 0.68, tone: 'muted' },
  versal: { kind: 'raised', lines: 2 },
  sectionBreak: { glyph: '✶', scale: 0.75, tone: 'muted' },
  paper: { light: '#FAFAF8', dark: '#1B1D20' },
  overrides: [],
};

export const BUILTIN_PRESETS: Record<PresetSlug, BuiltinPreset> = {
  classic: CLASSIC,
  modern: MODERN,
};

/** The out-of-the-box personality. */
export const DEFAULT_PRESET_SLUG: PresetSlug = 'classic';

function isPresetSlug(slug: string): slug is PresetSlug {
  return slug in BUILTIN_PRESETS;
}

/**
 * Resolve a stored slug to its built-in. Unknown or missing slugs (pre-seed
 * row, stale restore carrying a retired/future slug) fall back to the default.
 */
export function builtinPreset(slug: string | null | undefined): BuiltinPreset {
  return slug != null && isPresetSlug(slug)
    ? BUILTIN_PRESETS[slug]
    : BUILTIN_PRESETS[DEFAULT_PRESET_SLUG];
}
