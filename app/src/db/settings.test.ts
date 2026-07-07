import { describe, expect, it } from 'vitest';

import { BUILTIN_PRESETS, DEFAULT_PRESET_SLUG } from '@/engine/layout';
import type { CascadeContext } from '@/engine/layout';
import { resolveSettings, settingsPalette } from './settings';

const PROSE: CascadeContext = { genre: 'prose', role: null, bookSlug: 'Genesis' };
const POETRY: CascadeContext = { genre: 'poetry', role: null, bookSlug: 'Psalms' };

describe('resolveSettings', () => {
  it('resolves each builtin slug to its own personality', () => {
    expect(resolveSettings('classic', 1, PROSE).align).toBe('justify');
    expect(resolveSettings('modern', 1, PROSE).align).toBe('left');
  });

  it('null slug (pre-seed row) and an unknown slug fall back to the default builtin', () => {
    const fallback = BUILTIN_PRESETS[DEFAULT_PRESET_SLUG];
    expect(resolveSettings(null, 1, PROSE).align).toBe(fallback.align);
    expect(resolveSettings('large-print-uuid-from-old-db', 1, PROSE).align).toBe(fallback.align);
  });

  it("applies the builtin's internal cascade (Classic's poetry indent)", () => {
    const poetry = resolveSettings('classic', 1, POETRY);
    const prose = resolveSettings('classic', 1, PROSE);
    expect(poetry.indentStep).toBeGreaterThan(prose.indentStep);
  });

  it('fontScale multiplies the resolved base size; null column reads as 1', () => {
    const base = resolveSettings('classic', null, PROSE).fontSize;
    expect(resolveSettings('classic', 1.5, PROSE).fontSize).toBe(base * 1.5);
    expect(resolveSettings('classic', 1, PROSE).fontSize).toBe(base);
  });

  it('fontScale scales the internally-overridden knobs consistently too', () => {
    // The scale applies AFTER the cascade — whatever fontSize the cascade
    // resolved is what the user's knob multiplies.
    const unscaled = resolveSettings('classic', 1, POETRY);
    const scaled = resolveSettings('classic', 2, POETRY);
    expect(scaled.fontSize).toBe(unscaled.fontSize * 2);
    expect(scaled.indentStep).toBe(unscaled.indentStep);
  });
});

describe('settingsPalette', () => {
  it('uses global theme inks over preset-specific paper tint', () => {
    expect(settingsPalette('classic', 'light').parchment).toBe(BUILTIN_PRESETS.classic.paper.light);
    expect(settingsPalette('classic', 'dark').parchment).toBe(BUILTIN_PRESETS.classic.paper.dark);
    expect(settingsPalette('modern', 'light').parchment).toBe(BUILTIN_PRESETS.modern.paper.light);
    expect(settingsPalette('modern', 'dark').parchment).toBe(BUILTIN_PRESETS.modern.paper.dark);
  });

  it('keeps dark/light as a global ink toggle', () => {
    expect(settingsPalette('classic', 'light').ink).not.toBe(settingsPalette('classic', 'dark').ink);
    expect(settingsPalette('classic', 'dark').ink).toBe(settingsPalette('modern', 'dark').ink);
  });
});
