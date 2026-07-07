/**
 * The preset lab's state hook (#41) — candidates, selection, theme, and the
 * TS-source export, all local React state over the pure candidates module.
 * No Skia, no user DB: the reader's settings are never touched, and the hook
 * unit-tests under jest-expo without mocks.
 */

import { useCallback, useMemo, useState } from 'react';

import type { Theme } from '@/draw/style';
import type { PresetSlug } from '@/engine/layout';
import type { AdjustValues } from '@/ui/adjust-panel';
import {
  adjustValuesOf,
  applyTweak,
  resetCandidate,
  seedCandidates,
  type LabCandidate,
  type LabTweak,
} from './candidates';
import { emitPresetSource } from './emit-preset';

export interface LabState {
  readonly candidates: readonly LabCandidate[];
  readonly selectedId: PresetSlug;
  readonly selected: LabCandidate;
  /** The selected candidate's knobs, shaped for the adjust panel. */
  readonly selectedValues: AdjustValues;
  readonly theme: Theme;
  readonly select: (id: PresetSlug) => void;
  /** Patch the SELECTED candidate's knobs. */
  readonly tweak: (patch: LabTweak) => void;
  /** Return the selected candidate to its shipped builtin values. */
  readonly reset: () => void;
  readonly setTheme: (theme: Theme) => void;
  /** Emit the selected candidate as paste-ready TS constant source. */
  readonly exportSelected: () => string;
}

export function useLabState(): LabState {
  const seeded = useMemo(() => seedCandidates(), []);
  const [candidates, setCandidates] = useState(seeded);
  const [selectedId, setSelectedId] = useState(seeded[0].id);
  const [theme, setTheme] = useState<Theme>('light');

  const selected =
    candidates.find((c) => c.id === selectedId) ?? candidates[0];

  const tweak = useCallback(
    (patch: LabTweak) => setCandidates((prev) => applyTweak(prev, selectedId, patch)),
    [selectedId],
  );

  const reset = useCallback(
    () => setCandidates((prev) => resetCandidate(prev, seeded, selectedId)),
    [seeded, selectedId],
  );

  const exportSelected = useCallback(() => emitPresetSource(selected.preset), [selected]);

  return {
    candidates,
    selectedId,
    selected,
    selectedValues: adjustValuesOf(selected),
    theme,
    select: setSelectedId,
    tweak,
    reset,
    setTheme,
    exportSelected,
  };
}
