/**
 * Reading-settings mutations (RN-bound: touches the expo-sqlite client). Every
 * write bumps `updatedAt` and every insert mints a client UUID (ADR-0011), so
 * the rows stay sync-ready. The pure row↔rules mapping lives in settings.ts;
 * the reactive read lives in use-settings.ts.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { DEFAULT_PRESET_SLUG, type ResolvedRules } from '@/engine/layout';
import type { Theme } from '@/draw/style';
import { db } from './client';
import { layoutOverride, layoutPreset, readingSettings } from './schema';
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
 * Idempotently seed the global settings row on first launch. Safe to call
 * every boot: it no-ops once a live settings row exists. ADR-0018: presets are
 * shipped engine constants — NO layout_preset rows are seeded anymore; the
 * settings row starts on the default builtin slug at fontScale 1.
 *
 * Single-flight: `useReadingSettings` mounts in more than one place at once (the
 * reader + the adjust-panel container), and React double-invokes effects in
 * dev. Without a shared in-flight guard the concurrent callers each read "no
 * row yet" before any insert commits and seed duplicate settings rows. We
 * memoize the first call's promise; a failure clears it so a later boot can
 * retry.
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
  await db.insert(readingSettings).values({
    id: uuidv7(),
    theme: 'light',
    activePresetId: DEFAULT_PRESET_SLUG,
    fontScale: 1,
    createdAt: t,
    updatedAt: t,
  });
}

/**
 * Switch the active builtin preset (a slug — ADR-0018 global choice).
 * Deliberately `string`, not `PresetSlug`: the column must tolerate unknown
 * slugs anyway (stale restore), and the read side owns the fallback.
 */
export async function selectPreset(slug: string): Promise<void> {
  const row = await loadSettingsRow();
  if (!row) return;
  await db
    .update(readingSettings)
    .set({ activePresetId: slug, updatedAt: now() })
    .where(eq(readingSettings.id, row.id));
}

/** Step the user's one typographic knob (ADR-0018). */
export async function setFontScale(fontScale: number): Promise<void> {
  const row = await loadSettingsRow();
  if (!row) return;
  await db
    .update(readingSettings)
    .set({ fontScale, updatedAt: now() })
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

/**
 * DORMANT (ADR-0018): writes the dormant layout_preset table, and
 * `activePresetId` is a builtin slug now, so no row matches — a no-op until
 * the #41 preset lab points the dev knobs somewhere real.
 */
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
 * DORMANT (ADR-0018): user-row overrides no longer join the cascade, and
 * `activePresetId` is a builtin slug, so this never fires. Kept for the #41
 * preset lab. Historically: upsert a per-scope override on the active preset
 * by the (preset, scope) unique key.
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
