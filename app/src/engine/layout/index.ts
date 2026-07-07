/**
 * The layout engine's public seam (#7): corpus rows + resolved rules
 * (+ viewport, Scroll mode only) → computed layout model. Pure TS — the draw
 * layer (#9) paints the model; nothing here touches Skia (ADR-0008). The
 * output is ephemeral and rebuildable, never persisted (ADR-0004).
 */

export {
  LAYOUT_RULE_KNOBS,
  resolveCascade,
  type CascadeContext,
  type LayoutOverride,
  type ScopeKind,
} from './cascade';
export { layoutCodexPage, type CodexPageInput } from './codex';
export { fitPageToViewport, type PageFit } from './fit';
export { readingModeForViewport, type ReadingMode } from './mode';
export {
  codexOffsetForVerse,
  codexVerseAnchors,
  codexVerseAtOffset,
  scrollOffsetForVerse,
  scrollVerseAnchors,
  scrollVerseAtOffset,
  verseAtAnchorOffset,
  type VerseAnchor,
} from './position';
export type {
  Direction,
  DropCap,
  ApparatusTone,
  LayoutBlock,
  Line,
  LineItem,
  PageLayout,
  Region,
  RunningHead,
  RunningHeadIdentity,
  RunningHeadStyle,
  ScrollColumn,
  ScrollLayout,
  ScrollLine,
  TokenItem,
  TokenRun,
  VerseNumItem,
  VerseNumberStyle,
  Viewport,
} from './model';
export {
  BUILTIN_PRESETS,
  DEFAULT_PRESET_SLUG,
  builtinPreset,
  type BuiltinPreset,
  type PaperTint,
  type PresetSlug,
  type VersalStyle,
} from './presets';
export { DEFAULT_PRESET, applyFontScale, fontScaleFromDisplayedSize, resolveRules } from './rules';
export type { Align, LayoutPresetInput, ResolvedRules } from './rules';
export { layoutScrollColumns, type ScrollInput } from './scroll';
export { DEFAULT_VERSE_NUMBER_STYLE, VERSE_NUM_SCALE, type MeasureToken } from './typeset';
