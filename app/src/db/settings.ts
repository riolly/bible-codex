/**
 * Pure mapping between the user-DB settings row and the layout engine's rules
 * (ADR-0004 / ADR-0018). Kept free of any expo-sqlite / RN import so it runs
 * in Node and is unit-tested: the reactive hook (use-settings.ts) and the
 * mutations (settings-write.ts) are the only RN-bound seams.
 *
 * ADR-0018: presets are shipped engine constants selected by a builtin slug in
 * `reading_settings.active_preset_id`; the user's one typographic knob is
 * `font_scale`. The `layout_preset` / `layout_override` tables are DORMANT —
 * no runtime read resolves through them anymore.
 */

import {
  applyFontScale,
  builtinPreset,
  resolveCascade,
  type CascadeContext,
  type ResolvedRules,
} from '@/engine/layout';
import { THEMES, type Palette, type Theme } from '@/draw/style';

/** Font faces offered by the adjust panel (demoted to a __DEV__ tuning tool
 * by #44). Only Cardo is bundled today; the knob is a plain string so more
 * faces drop in without a schema change (the #45 bake-off feeds this list). */
export const FONT_FAMILIES = ['Cardo'] as const;

export const TEXT_EDITIONS = ['usfm', 'literary'] as const;
export type TextEdition = (typeof TEXT_EDITIONS)[number];

export function normalizeTextEdition(value: string | null | undefined): TextEdition {
  return value === 'literary' ? 'literary' : 'usfm';
}

/**
 * Resolve the concrete rules for one block from the live settings row: the
 * builtin the slug names (unknown/null slug → default builtin) is the cascade
 * base, its own internal overrides layer on per context, and the user's
 * fontScale multiplies the resolved root size (null column reads as 1).
 */
export function resolveSettings(
  activePresetId: string | null,
  fontScale: number | null,
  context: CascadeContext,
): ResolvedRules {
  const preset = builtinPreset(activePresetId);
  return applyFontScale(resolveCascade(preset, preset.overrides, context), fontScale);
}

/** Resolve global theme inks over the active preset's paper tint. */
export function settingsPalette(activePresetId: string | null, theme: Theme): Palette {
  const preset = builtinPreset(activePresetId);
  return { ...THEMES[theme], parchment: preset.paper[theme] };
}
