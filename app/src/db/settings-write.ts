/**
 * Reading-settings mutations (RN-bound: touches the expo-sqlite client). Every
 * write bumps `updatedAt` and every insert mints a client UUID (ADR-0011), so
 * the rows stay sync-ready. The pure row↔rules mapping lives in settings.ts;
 * the reactive read lives in use-settings.ts.
 */

import { and, eq, isNull } from 'drizzle-orm';

import type { ResolvedRules } from '@/engine/layout';
import type { Theme } from '@/draw/style';
import { db } from './client';
import { layoutOverride, layoutPreset, readingSettings } from './schema';
import { SEED_PRESETS } from './settings';
import { uuidv7 } from './uuid';

/** Epoch SECONDS, matching the schema's `unixepoch()` column default. */
const now = () => Math.floor(Date.now() / 1000);

/** The knobs a preset/override write may set. */
export type KnobPatch = Partial<
  Pick<
    ResolvedRules,
    'fontFamily' | 'fontSize' | 'lineHeight' | 'margin' | 'paragraphSpacing' | 'indentStep' | 'align' | 'measure' | 'railWidth'
  >
>;

/** The single live reading-settings row, or null before the first seed. */
export async function loadSettingsRow() {
  const rows = await db
    .select()
    .from(readingSettings)
    .where(isNull(readingSettings.deletedAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Idempotently seed the named presets + the global settings row on first
 * launch. Safe to call every boot: it no-ops once a live settings row exists.
 *
 * Single-flight: `useReadingSettings` mounts in more than one place at once (the
 * reader + the adjust-panel container), and React double-invokes effects in
 * dev. Without a shared in-flight guard the concurrent callers each read "no
 * row yet" before any insert commits and seed a duplicate set (6 presets, 2
 * settings rows). We memoize the first call's promise; a failure clears it so a
 * later boot can retry.
 */
let seedInFlight: Promise<void> | null = null;

export function ensureSeed(): Promise<void> {
  seedInFlight ??= seedOnce().catch((err) => {
    seedInFlight = null;
    throw err;
  });
  return seedInFlight;
}

async function seedOnce(): Promise<void> {
  if (await loadSettingsRow()) return;
  const t = now();
  const ids = SEED_PRESETS.map(() => uuidv7());
  await db.insert(layoutPreset).values(
    SEED_PRESETS.map((preset, i) => ({
      id: ids[i],
      name: preset.name,
      fontFamily: preset.fontFamily ?? null,
      fontSize: preset.fontSize ?? null,
      lineHeight: preset.lineHeight ?? null,
      margin: preset.margin ?? null,
      paragraphSpacing: preset.paragraphSpacing ?? null,
      indentStep: preset.indentStep ?? null,
      align: preset.align ?? null,
      measure: preset.measure ?? null,
      railWidth: preset.railWidth ?? null,
      createdAt: t,
      updatedAt: t,
    })),
  );
  await db.insert(readingSettings).values({
    id: uuidv7(),
    theme: 'light',
    activePresetId: ids[0],
    createdAt: t,
    updatedAt: t,
  });
}

/** Switch the active preset (a global choice — the cascade base). */
export async function selectPreset(presetId: string): Promise<void> {
  const row = await loadSettingsRow();
  if (!row) return;
  await db
    .update(readingSettings)
    .set({ activePresetId: presetId, updatedAt: now() })
    .where(eq(readingSettings.id, row.id));
}

/** Set the global theme (light/dark) — not a cascade knob (ADR-0004). */
export async function setTheme(theme: Theme): Promise<void> {
  const row = await loadSettingsRow();
  if (!row) return;
  await db
    .update(readingSettings)
    .set({ theme, updatedAt: now() })
    .where(eq(readingSettings.id, row.id));
}

/** Persist the reader's chosen translation (abbrev) — the durable seed (#12). */
export async function setActiveTranslation(abbrev: string): Promise<void> {
  const row = await loadSettingsRow();
  if (!row) return;
  await db
    .update(readingSettings)
    .set({ activeTranslation: abbrev, updatedAt: now() })
    .where(eq(readingSettings.id, row.id));
}

/** Refine the active preset's global knobs (the cascade base). */
export async function updateActivePreset(patch: KnobPatch): Promise<void> {
  const row = await loadSettingsRow();
  const presetId = row?.activePresetId;
  if (!presetId) return;
  await db
    .update(layoutPreset)
    .set({ ...patch, updatedAt: now() })
    .where(eq(layoutPreset.id, presetId));
}

/**
 * Insert or update a per-scope override on the active preset (ADR-0004 cascade:
 * genre / role / book refinement). Upsert by the (preset, scope) unique key.
 */
export async function upsertOverride(
  scopeKind: 'genre' | 'role' | 'book',
  scopeValue: string,
  patch: KnobPatch,
): Promise<void> {
  const row = await loadSettingsRow();
  const presetId = row?.activePresetId;
  if (!presetId) return;
  const t = now();
  const existing = await db
    .select()
    .from(layoutOverride)
    .where(
      and(
        eq(layoutOverride.presetId, presetId),
        eq(layoutOverride.scopeKind, scopeKind),
        eq(layoutOverride.scopeValue, scopeValue),
        isNull(layoutOverride.deletedAt),
      ),
    )
    .limit(1);
  if (existing[0]) {
    await db
      .update(layoutOverride)
      .set({ ...patch, updatedAt: t })
      .where(eq(layoutOverride.id, existing[0].id));
    return;
  }
  await db.insert(layoutOverride).values({
    id: uuidv7(),
    presetId,
    scopeKind,
    scopeValue,
    ...patch,
    createdAt: t,
    updatedAt: t,
  });
}
