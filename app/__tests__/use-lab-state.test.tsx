import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { BUILTIN_PRESETS } from '@/engine/layout';
import { useLabState } from '@/lab/use-lab-state';

// The lab's state hook under jest-expo: proves the panel wiring semantics
// (select / tweak / reset / export) without Skia or the user DB.
describe('useLabState', () => {
  it('seeds a candidate per builtin and selects the first', async () => {
    const { result } = await renderHook(() => useLabState());
    expect(result.current.candidates.map((c) => c.id)).toEqual(['classic', 'modern']);
    expect(result.current.selectedId).toBe('classic');
  });

  it('a tweak patches only the selected candidate', async () => {
    const { result } = await renderHook(() => useLabState());
    await act(async () => result.current.select('modern'));
    await act(async () => result.current.tweak({ fontSize: 24 }));
    const modern = result.current.candidates.find((c) => c.id === 'modern');
    const classic = result.current.candidates.find((c) => c.id === 'classic');
    expect(modern?.preset.fontSize).toBe(24);
    expect(classic?.preset.fontSize).toBe(BUILTIN_PRESETS.classic.fontSize);
  });

  it('selecting the other candidate rebinds the panel values', async () => {
    const { result } = await renderHook(() => useLabState());
    await act(async () => result.current.tweak({ measure: 22 }));
    expect(result.current.selectedValues.measure).toBe(22);
    await act(async () => result.current.select('modern'));
    expect(result.current.selectedValues.measure).toBe(BUILTIN_PRESETS.modern.measure);
  });

  it('reset returns the selected candidate to its shipped builtin', async () => {
    const { result } = await renderHook(() => useLabState());
    await act(async () => result.current.tweak({ fontSize: 30, lineHeight: 2.0 }));
    await act(async () => result.current.reset());
    const classic = result.current.candidates.find((c) => c.id === 'classic');
    expect(classic?.preset).toEqual(BUILTIN_PRESETS.classic);
  });

  it('export emits TS source carrying the tweaked value', async () => {
    const { result } = await renderHook(() => useLabState());
    await act(async () => result.current.tweak({ fontSize: 21 }));
    const src = result.current.exportSelected();
    expect(src).toContain('const CLASSIC: BuiltinPreset = {');
    expect(src).toContain('fontSize: 21,');
  });

  it('theme starts light and toggles', async () => {
    const { result } = await renderHook(() => useLabState());
    expect(result.current.theme).toBe('light');
    await act(async () => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
  });
});
