/**
 * Reactive reading-settings read (RN-bound). `useLiveQuery` re-runs on every
 * write to the user DB, so a preset/fontScale/theme change re-resolves the
 * rules and the reader re-typesets immediately — no manual refresh (ADR-0004).
 *
 * ADR-0018: rules resolve from the BUILTIN preset the settings row's slug
 * names (+ the user's fontScale); the dormant layout_preset / layout_override
 * tables are not read at all. The rules cascade is resolved lazily per block
 * context via `rulesFor`, so one subscription serves a whole chapter of mixed
 * genres/roles.
 */

import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { isNull } from 'drizzle-orm';
import { useEffect, useMemo } from 'react';

import {
  builtinPreset,
  type BuiltinPreset,
  type CascadeContext,
  type ResolvedRules,
} from '@/engine/layout';
import type { Palette, Theme } from '@/draw/style';
import { db } from './client';
import { readingSettings } from './schema';
import {
  normalizeTextEdition,
  resolveSettings,
  settingsPalette,
  type TextEdition,
} from './settings';
import { ensureSeed } from './settings-write';

export interface ReadingSettings {
  /** False until the seed row exists and the first query has resolved. */
  readonly ready: boolean;
  readonly theme: Theme;
  readonly palette: Palette;
  /** Durable translation choice (abbrev) that seeds the reader on cold open (#12). */
  readonly activeTranslation: string;
  /** Structural edition axis: source USFM blocks or curated literary structure. */
  readonly textEdition: TextEdition;
  /** The resolved builtin personality (unknown/null slug already fell back). */
  readonly activePreset: BuiltinPreset;
  /** The user's one typographic knob (ADR-0018). */
  readonly fontScale: number;
  /** Resolve the concrete rules for one block's corpus context (the cascade). */
  readonly rulesFor: (context: CascadeContext) => ResolvedRules;
}

export function useReadingSettings(): ReadingSettings {
  // Seed once; the live query picks the row up when it lands.
  useEffect(() => {
    void ensureSeed();
  }, []);

  const settings = useLiveQuery(
    db.select().from(readingSettings).where(isNull(readingSettings.deletedAt)).limit(1),
  );

  const settingsRow = settings.data?.[0] ?? null;
  const theme: Theme = settingsRow?.theme ?? 'light';
  const activePresetId = settingsRow?.activePresetId ?? null;
  const fontScale = settingsRow?.fontScale ?? 1;
  const textEdition = normalizeTextEdition(settingsRow?.textEdition);

  const rulesFor = useMemo(
    () => (context: CascadeContext) => resolveSettings(activePresetId, fontScale, context),
    [activePresetId, fontScale],
  );

  return {
    ready: settingsRow !== null,
    theme,
    palette: settingsPalette(activePresetId, theme),
    activeTranslation: settingsRow?.activeTranslation ?? 'KJV',
    textEdition,
    activePreset: builtinPreset(activePresetId),
    fontScale,
    rulesFor,
  };
}
