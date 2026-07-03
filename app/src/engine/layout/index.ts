/**
 * The layout engine's public seam (#7): corpus rows + resolved rules
 * (+ viewport, Scroll mode only) → computed layout model. Pure TS — the draw
 * layer (#9) paints the model; nothing here touches Skia (ADR-0008). The
 * output is ephemeral and rebuildable, never persisted (ADR-0004).
 */

export { layoutCodexPage, type CodexPageInput } from './codex';
export { fitPageToViewport, type PageFit } from './fit';
export type {
  Direction,
  DropCap,
  LayoutBlock,
  Line,
  LineItem,
  PageLayout,
  Region,
  ScrollColumn,
  ScrollLayout,
  ScrollLine,
  TokenItem,
  TokenRun,
  VerseNumItem,
  Viewport,
} from './model';
export { DEFAULT_PRESET, resolveRules } from './rules';
export type { Align, LayoutPresetInput, ResolvedRules } from './rules';
export { layoutScrollColumns, type ScrollInput } from './scroll';
export type { MeasureToken } from './typeset';
