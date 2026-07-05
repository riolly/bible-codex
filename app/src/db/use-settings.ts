/**
 * Reactive reading-settings read (RN-bound). `useLiveQuery` re-runs on every
 * write to the user DB, so a preset/override/theme change re-resolves the rules
 * and the reader re-typesets immediately — no manual refresh (ADR-0004).
 *
 * The rules cascade is resolved lazily per block context via `rulesFor`, so one
 * subscription serves a whole chapter of mixed genres/roles.
 */

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { isNull } from 'drizzle-orm';
import { useEffect, useMemo } from 'react';

import type { CascadeContext, ResolvedRules } from '@/engine/layout';
import { THEMES, type Palette, type Theme } from '@/draw/style';
import { db } from './client';
import { layoutOverride, layoutPreset, readingSettings, type LayoutPreset } from './schema';
import { resolveSettings } from './settings';
import { ensureSeed } from './settings-write';

export interface ReadingSettings {
  /** False until the seed row exists and the first query has resolved. */
  readonly ready: boolean;
  readonly theme: Theme;
  readonly palette: Palette;
  /** All named presets, for the adjust panel's preset picker. */
  readonly presets: readonly LayoutPreset[];
  readonly activePreset: LayoutPreset | null;
  /** Resolve the concrete rules for one block's corpus context (the cascade). */
  readonly rulesFor: (context: CascadeContext) => ResolvedRules;
}

export function useReadingSettings(): ReadingSettings {
  // Seed once; the live queries pick the rows up when they land.
  useEffect(() => {
    void ensureSeed();
  }, []);

  const settings = useLiveQuery(
    db.select().from(readingSettings).where(isNull(readingSettings.deletedAt)).limit(1),
  );
  const presets = useLiveQuery(
    db.select().from(layoutPreset).where(isNull(layoutPreset.deletedAt)),
  );
  const overrides = useLiveQuery(
    db.select().from(layoutOverride).where(isNull(layoutOverride.deletedAt)),
  );

  const settingsRow = settings.data?.[0] ?? null;
  const presetRows = useMemo(() => presets.data ?? [], [presets.data]);
  const overrideRows = useMemo(() => overrides.data ?? [], [overrides.data]);

  const theme: Theme = settingsRow?.theme ?? 'light';
  const activePreset =
    presetRows.find((p) => p.id === settingsRow?.activePresetId) ?? presetRows[0] ?? null;

  const rulesFor = useMemo(() => {
    const scoped = overrideRows.filter((o) => o.presetId === activePreset?.id);
    return (context: CascadeContext) => resolveSettings(activePreset, scoped, context);
  }, [activePreset, overrideRows]);

  return {
    ready: settingsRow !== null,
    theme,
    palette: THEMES[theme],
    presets: presetRows,
    activePreset,
    rulesFor,
  };
}
