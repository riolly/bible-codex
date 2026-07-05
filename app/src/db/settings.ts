/**
 * Pure mapping between the user-DB rows and the layout engine's rules cascade
 * (ADR-0004). Kept free of any expo-sqlite / RN import so it runs in Node and
 * is unit-tested: the reactive hook (use-settings.ts) and the mutations
 * (settings-write.ts) are the only RN-bound seams.
 *
 * The engine consumes RELATIVE units only; these mappers pass the stored knobs
 * through verbatim — a null column means "inherit", which the cascade honors.
 */

import {
  resolveCascade,
  type CascadeContext,
  type LayoutOverride as CascadeOverride,
  type LayoutPresetInput,
  type ResolvedRules,
} from '@/engine/layout';
import type { LayoutOverride as LayoutOverrideRow, LayoutPreset } from './schema';

/**
 * The named presets seeded on first launch (ADR-0011: each created with a
 * client UUID by settings-write.ts). Selecting a preset sets it active; the
 * user's refinements then layer onto THAT preset's row, so switching preserves
 * each preset's tuning. Magnitudes are RELATIVE units — em / em-multipliers,
 * `fontSize` the root scalar in device-independent points, never pixels
 * (ADR-0004); a null knob inherits the engine's DEFAULT_PRESET.
 */
export interface SeedPreset extends LayoutPresetInput {
  readonly name: string;
}
export const SEED_PRESETS: readonly SeedPreset[] = [
  { name: 'Reading', fontFamily: 'Cardo', fontSize: 18, lineHeight: 1.6, measure: 30 },
  { name: 'Large Print', fontFamily: 'Cardo', fontSize: 22, lineHeight: 1.7, measure: 26 },
  { name: 'Compact', fontFamily: 'Cardo', fontSize: 16, lineHeight: 1.45, measure: 34 },
];

/** Font faces offered by the adjust panel. Only Cardo is bundled today; the
 * knob is a plain string so more faces drop in without a schema change. */
export const FONT_FAMILIES = ['Cardo'] as const;

/** The tunable knob columns shared by a preset row and an override row. */
const KNOB_COLUMNS = [
  'fontFamily',
  'fontSize',
  'lineHeight',
  'margin',
  'paragraphSpacing',
  'indentStep',
  'align',
  'measure',
  'railWidth',
] as const;

/** Project a preset row's knob columns to the engine's partial preset input. */
export function presetRowToInput(row: LayoutPreset): LayoutPresetInput {
  const input: Record<string, unknown> = {};
  for (const key of KNOB_COLUMNS) input[key] = row[key];
  return input as LayoutPresetInput;
}

/** Project an override row to a cascade override (scope selector + knobs). */
export function overrideRowToCascade(row: LayoutOverrideRow): CascadeOverride {
  const input: Record<string, unknown> = {
    scopeKind: row.scopeKind,
    scopeValue: row.scopeValue,
  };
  for (const key of KNOB_COLUMNS) input[key] = row[key];
  return input as unknown as CascadeOverride;
}

/**
 * Resolve the concrete rules for one block from the live DB rows. `preset` null
 * (no seed yet) falls back to an empty base → the engine's DEFAULT_PRESET.
 */
export function resolveSettings(
  preset: LayoutPreset | null,
  overrideRows: readonly LayoutOverrideRow[],
  context: CascadeContext,
): ResolvedRules {
  const base = preset ? presetRowToInput(preset) : {};
  return resolveCascade(base, overrideRows.map(overrideRowToCascade), context);
}
