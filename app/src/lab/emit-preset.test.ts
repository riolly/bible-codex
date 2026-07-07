import { describe, expect, it } from 'vitest';

import { BUILTIN_PRESETS } from '@/engine/layout';
import { emitPresetSource } from './emit-preset';

describe('emitPresetSource', () => {
  it('emits a paste-ready BuiltinPreset constant in the presets.ts house style', () => {
    const src = emitPresetSource(BUILTIN_PRESETS.classic);
    expect(src).toContain('const CLASSIC: BuiltinPreset = {');
    expect(src).toContain("slug: 'classic',");
    expect(src).toContain("name: 'Classic',");
    expect(src.trimEnd().endsWith('};')).toBe(true);
  });

  it('carries every rule knob with the tuned values (numbers bare, strings quoted)', () => {
    const tuned = { ...BUILTIN_PRESETS.modern, fontSize: 19.5, measure: 27, fontFamily: 'Literata' };
    const src = emitPresetSource(tuned);
    expect(src).toContain("fontFamily: 'Literata',");
    expect(src).toContain('fontSize: 19.5,');
    expect(src).toContain('lineHeight: 1.8,');
    expect(src).toContain('margin: 2,');
    expect(src).toContain('paragraphSpacing: 0.75,');
    expect(src).toContain('indentStep: 1,');
    expect(src).toContain("align: 'left',");
    expect(src).toContain('measure: 27,');
    expect(src).toContain('railWidth: 6,');
  });

  it('carries the personality blocks', () => {
    const src = emitPresetSource(BUILTIN_PRESETS.classic);
    expect(src).toContain("verseNumber: { scale: VERSE_NUM_SCALE, raiseEm: 0.33, tone: 'gilt' },");
    expect(src).toContain("versal: { kind: 'drop', lines: 3 },");
    expect(src).toContain("paper: { light: '#F6F0E4', dark: '#211D18' },");
    expect(src).toContain("{ scopeKind: 'genre', scopeValue: 'poetry', indentStep: 1.5 },");
  });

  it('an empty overrides list emits the empty-array literal', () => {
    expect(emitPresetSource(BUILTIN_PRESETS.modern)).toContain('overrides: [],');
  });

  it('escapes apostrophes in string knobs — the source always parses', () => {
    const tuned = { ...BUILTIN_PRESETS.classic, fontFamily: "Baskerville 'Classic'" };
    expect(emitPresetSource(tuned)).toContain("fontFamily: 'Baskerville \\'Classic\\'',");
  });

  it('emits a numeric verse scale when a candidate diverges from the shared constant', () => {
    const tuned = {
      ...BUILTIN_PRESETS.classic,
      verseNumber: { ...BUILTIN_PRESETS.classic.verseNumber, scale: 0.7 },
    };
    expect(emitPresetSource(tuned)).toContain(
      "verseNumber: { scale: 0.7, raiseEm: 0.33, tone: 'gilt' },",
    );
  });

  it('is deterministic — same preset, same source', () => {
    expect(emitPresetSource(BUILTIN_PRESETS.classic)).toBe(
      emitPresetSource(BUILTIN_PRESETS.classic),
    );
  });
});
