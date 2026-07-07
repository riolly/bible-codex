/**
 * Emit a tuned candidate as paste-ready TS source (#41, ADR-0018 pillar 6):
 * the preset-lab's judged values travel back into `engine/layout/presets.ts`
 * as a `BuiltinPreset` constant in that file's exact house style. Pure TS —
 * unit-tested in Node; the share-sheet plumbing lives in share-export.ts.
 */

import { LAYOUT_RULE_KNOBS, VERSE_NUM_SCALE, type BuiltinPreset, type LayoutOverride } from '@/engine/layout';

/** Quote strings single-quoted (apostrophes escaped); leave numbers bare. */
const lit = (value: string | number): string =>
  typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : String(value);

type EmittedPresetField =
  | 'slug'
  | 'name'
  | (typeof LAYOUT_RULE_KNOBS)[number]
  | 'verseNumber'
  | 'runningHead'
  | 'versal'
  | 'paper'
  | 'overrides';

const EMITTED_PRESET_FIELDS_COVER_BUILTIN_PRESET: Record<
  Exclude<keyof BuiltinPreset, EmittedPresetField>,
  never
> = {};

function emitOverride(override: LayoutOverride): string {
  const parts = [`scopeKind: ${lit(override.scopeKind)}`, `scopeValue: ${lit(override.scopeValue)}`];
  for (const knob of LAYOUT_RULE_KNOBS) {
    const value = override[knob];
    if (value !== null && value !== undefined) parts.push(`${knob}: ${lit(value)}`);
  }
  return `    { ${parts.join(', ')} },`;
}

export function emitPresetSource(preset: BuiltinPreset): string {
  void EMITTED_PRESET_FIELDS_COVER_BUILTIN_PRESET;
  const verseNumberScale =
    preset.verseNumber.scale === VERSE_NUM_SCALE
      ? 'VERSE_NUM_SCALE'
      : lit(preset.verseNumber.scale);
  const lines = [
    `const ${preset.slug.toUpperCase()}: BuiltinPreset = {`,
    `  slug: ${lit(preset.slug)},`,
    `  name: ${lit(preset.name)},`,
    ...LAYOUT_RULE_KNOBS.map((knob) => `  ${knob}: ${lit(preset[knob])},`),
    `  verseNumber: { scale: ${verseNumberScale}, raiseEm: ${lit(preset.verseNumber.raiseEm)}, tone: ${lit(preset.verseNumber.tone)} },`,
    `  runningHead: { scale: ${lit(preset.runningHead.scale)}, tone: ${lit(preset.runningHead.tone)} },`,
    `  versal: { kind: ${lit(preset.versal.kind)}, lines: ${lit(preset.versal.lines)} },`,
    `  paper: { light: ${lit(preset.paper.light)}, dark: ${lit(preset.paper.dark)} },`,
    preset.overrides.length === 0
      ? '  overrides: [],'
      : ['  overrides: [', ...preset.overrides.map(emitOverride), '  ],'].join('\n'),
    '};',
  ];
  return lines.join('\n') + '\n';
}
