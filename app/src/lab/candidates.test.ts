import { describe, expect, it } from 'vitest';

import { BUILTIN_PRESETS } from '@/engine/layout';
import type { CascadeContext } from '@/engine/layout';
import { THEMES } from '@/draw/style';
import {
  adjustValuesOf,
  applyTweak,
  candidateRules,
  labPalette,
  resetCandidate,
  seedCandidates,
} from './candidates';

const PROSE: CascadeContext = { genre: 'prose', role: null, bookSlug: 'Genesis' };
const POETRY: CascadeContext = { genre: 'poetry', role: null, bookSlug: 'Psalms' };

describe('seedCandidates', () => {
  it('seeds one candidate per shipped builtin, in builtin order', () => {
    const candidates = seedCandidates();
    expect(candidates.map((c) => c.id)).toEqual(['classic', 'modern']);
    expect(candidates[0].preset).toEqual(BUILTIN_PRESETS.classic);
    expect(candidates[0].label).toBe('Classic');
  });
});

describe('applyTweak', () => {
  it('patches only the tweaked knob on the named candidate, immutably', () => {
    const seeded = seedCandidates();
    const next = applyTweak(seeded, 'modern', { fontSize: 21 });
    expect(next.find((c) => c.id === 'modern')?.preset.fontSize).toBe(21);
    // other knobs and the other candidate untouched
    expect(next.find((c) => c.id === 'modern')?.preset.lineHeight).toBe(
      BUILTIN_PRESETS.modern.lineHeight,
    );
    expect(next.find((c) => c.id === 'classic')?.preset).toEqual(BUILTIN_PRESETS.classic);
    // input not mutated
    expect(seeded.find((c) => c.id === 'modern')?.preset.fontSize).toBe(
      BUILTIN_PRESETS.modern.fontSize,
    );
  });

  it('resetCandidate returns the named candidate to its seeded builtin', () => {
    const seeded = seedCandidates();
    const tweaked = applyTweak(seeded, 'classic', { fontSize: 40 });
    expect(resetCandidate(tweaked, seeded, 'classic')[0].preset).toEqual(BUILTIN_PRESETS.classic);
  });
});

describe('candidateRules', () => {
  it("resolves through the candidate's own internal cascade (Classic poetry indent)", () => {
    const classic = seedCandidates()[0];
    expect(candidateRules(classic, POETRY).indentStep).toBe(1.5);
    expect(candidateRules(classic, PROSE).indentStep).toBe(BUILTIN_PRESETS.classic.indentStep);
  });

  it('a tweak flows through resolution', () => {
    const tweaked = applyTweak(seedCandidates(), 'classic', { measure: 24 });
    expect(candidateRules(tweaked[0], PROSE).measure).toBe(24);
  });
});

describe('adjustValuesOf', () => {
  it("projects the candidate's panel knobs", () => {
    const modern = seedCandidates()[1];
    expect(adjustValuesOf(modern)).toEqual({
      fontFamily: BUILTIN_PRESETS.modern.fontFamily,
      fontSize: BUILTIN_PRESETS.modern.fontSize,
      lineHeight: BUILTIN_PRESETS.modern.lineHeight,
      measure: BUILTIN_PRESETS.modern.measure,
      railWidth: BUILTIN_PRESETS.modern.railWidth,
    });
  });
});

describe('labPalette', () => {
  it("overrides only parchment with the candidate's paper tint, per theme", () => {
    const classic = seedCandidates()[0];
    const light = labPalette(classic, 'light');
    expect(light.parchment).toBe(BUILTIN_PRESETS.classic.paper.light);
    expect(light.ink).toBe(THEMES.light.ink);
    const dark = labPalette(classic, 'dark');
    expect(dark.parchment).toBe(BUILTIN_PRESETS.classic.paper.dark);
    expect(dark.gilt).toBe(THEMES.dark.gilt);
  });
});
