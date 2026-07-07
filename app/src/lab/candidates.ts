/**
 * Preset-lab candidate state (#41) — pure helpers behind the lab screen's
 * useState. A candidate is a WORKING COPY of a shipped builtin (ADR-0018):
 * tweaks patch its base knobs locally and resolve through the same production
 * cascade call the live settings seam uses (db/settings.ts) — the user DB is
 * never touched. Pure TS, unit-tested in Node.
 */

import {
  BUILTIN_PRESETS,
  resolveCascade,
  type BuiltinPreset,
  type CascadeContext,
  type PresetSlug,
  type ResolvedRules,
} from '@/engine/layout';
import { THEMES, type Palette, type Theme } from '@/draw/style';
import type { AdjustValues } from '@/ui/adjust-panel';

export interface LabCandidate {
  /** The seeded builtin's slug — stable through tweaks. */
  readonly id: PresetSlug;
  readonly label: string;
  readonly preset: BuiltinPreset;
}

/** The knobs a lab tweak may patch — the panel's stepper surface. */
export type LabTweak = Partial<
  Pick<BuiltinPreset, 'fontFamily' | 'fontSize' | 'lineHeight' | 'measure' | 'railWidth'>
>;

/** One working copy per shipped builtin. */
export function seedCandidates(): readonly LabCandidate[] {
  return Object.values(BUILTIN_PRESETS).map((preset) => ({
    id: preset.slug,
    label: preset.name,
    preset,
  }));
}

/** Patch one shipped candidate's knobs. Never mutates. */
export function applyTweak(
  candidates: readonly LabCandidate[],
  id: PresetSlug,
  tweak: LabTweak,
): readonly LabCandidate[] {
  return candidates.map((c) => (c.id === id ? { ...c, preset: { ...c.preset, ...tweak } } : c));
}

/** Return one candidate to its seeded builtin values. */
export function resetCandidate(
  candidates: readonly LabCandidate[],
  seeded: readonly LabCandidate[],
  id: PresetSlug,
): readonly LabCandidate[] {
  const seed = seeded.find((s) => s.id === id);
  if (!seed) return candidates;
  return candidates.map((c) => (c.id === id ? seed : c));
}

/** Resolve a candidate's concrete rules for one block context — the same
 * cascade call resolveSettings makes, minus the DB. */
export function candidateRules(candidate: LabCandidate, context: CascadeContext): ResolvedRules {
  return resolveCascade(candidate.preset, candidate.preset.overrides, context);
}

/** Project the candidate onto the adjust panel's controlled values. */
export function adjustValuesOf(candidate: LabCandidate): AdjustValues {
  const { fontFamily, fontSize, lineHeight, measure, railWidth } = candidate.preset;
  return { fontFamily, fontSize, lineHeight, measure, railWidth };
}

/** The pane palette: the global theme's inks over the CANDIDATE's paper tint
 * (the first consumer of BuiltinPreset.paper). */
export function labPalette(candidate: LabCandidate, theme: Theme): Palette {
  return { ...THEMES[theme], parchment: candidate.preset.paper[theme] };
}
