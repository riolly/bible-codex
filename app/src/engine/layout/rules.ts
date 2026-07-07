/**
 * Presentation rules — the resolved input half of the layout engine (#7).
 *
 * INVARIANTS:
 * - ADR-0004: adjustable magnitudes are RELATIVE units — em and em-multipliers
 *   (`fontSize` is the single root scalar, in device-independent points).
 *   Never absolute pixels.
 * - ADR-0008: pure TS, no Skia / CanvasKit import.
 * - The cascade (base preset < genre < role < book) is STUBBED to base-only in
 *   this slice; the full override resolver lands with layout-adjust (#11).
 */

/** Text alignment of the prose measure (schema.dbml `layout_preset.align`). */
export type Align = 'left' | 'justify';

/**
 * The knobs of one typography preset (schema.dbml `layout_preset`), all
 * optional/nullable — null = inherit the default. `measure` and `railWidth`
 * are engine knobs introduced by #7; they join the schema with #11.
 */
export interface LayoutPresetInput {
  readonly fontFamily?: string | null;
  /** Root scalar: device-independent points per em. */
  readonly fontSize?: number | null;
  /** Line height as an em multiplier. */
  readonly lineHeight?: number | null;
  /** Page margin around the text region, in em. */
  readonly margin?: number | null;
  /** Vertical space between blocks, in em. */
  readonly paragraphSpacing?: number | null;
  /** Horizontal step per `block.indent` level, in em. */
  readonly indentStep?: number | null;
  readonly align?: Align | null;
  /** Text measure (column width), in em. */
  readonly measure?: number | null;
  /** Margin-rail base width, in em (ADR-0016 pillar 4). */
  readonly railWidth?: number | null;
}

/** Fully resolved rules — every knob concrete. What the engine consumes. */
export interface ResolvedRules {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly margin: number;
  readonly paragraphSpacing: number;
  readonly indentStep: number;
  readonly align: Align;
  readonly measure: number;
  readonly railWidth: number;
}

/** The default preset this slice ships with (#7 — no adjust UI yet). */
export const DEFAULT_PRESET: ResolvedRules = {
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.6,
  margin: 2,
  paragraphSpacing: 0.5,
  indentStep: 1,
  align: 'left',
  measure: 30,
  railWidth: 6,
};

/**
 * Apply the user's one typographic knob (ADR-0018): `fontScale` multiplies the
 * root scalar only — every em/em-multiplier knob rides along (ADR-0004). An
 * invalid scale (non-finite, ≤ 0, or a null column) reads as 1.
 */
export function applyFontScale(
  rules: ResolvedRules,
  fontScale: number | null | undefined,
): ResolvedRules {
  const scale = fontScale != null && Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  return scale === 1 ? rules : { ...rules, fontSize: rules.fontSize * scale };
}

/**
 * Inverse of `applyFontScale` for UI that steps the displayed size. Invalid
 * base/displayed sizes collapse back to the neutral scale.
 */
export function fontScaleFromDisplayedSize(baseFontSize: number, displayedFontSize: number): number {
  if (!Number.isFinite(baseFontSize) || baseFontSize <= 0) return 1;
  if (!Number.isFinite(displayedFontSize) || displayedFontSize <= 0) return 1;
  return displayedFontSize / baseFontSize;
}

/**
 * Resolve a preset to concrete rules. Base-only: null/omitted knobs fall back
 * to DEFAULT_PRESET; genre/role/book overrides are the cascade (cascade.ts).
 */
export function resolveRules(preset: LayoutPresetInput = {}): ResolvedRules {
  const rules: ResolvedRules = {
    fontFamily: preset.fontFamily ?? DEFAULT_PRESET.fontFamily,
    fontSize: preset.fontSize ?? DEFAULT_PRESET.fontSize,
    lineHeight: preset.lineHeight ?? DEFAULT_PRESET.lineHeight,
    margin: preset.margin ?? DEFAULT_PRESET.margin,
    paragraphSpacing: preset.paragraphSpacing ?? DEFAULT_PRESET.paragraphSpacing,
    indentStep: preset.indentStep ?? DEFAULT_PRESET.indentStep,
    align: preset.align ?? DEFAULT_PRESET.align,
    measure: preset.measure ?? DEFAULT_PRESET.measure,
    railWidth: preset.railWidth ?? DEFAULT_PRESET.railWidth,
  };
  if (rules.fontSize <= 0) throw new Error(`fontSize must be > 0, got ${rules.fontSize}`);
  if (rules.measure <= 0) throw new Error(`measure must be > 0, got ${rules.measure}`);
  return rules;
}
