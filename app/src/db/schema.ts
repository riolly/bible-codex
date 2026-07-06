import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * User DB schema (read-write). Phase 1 carries the reading-settings rules
 * layer (ADR-0004): a global `reading_settings`, a named-preset `layout_preset`
 * cascade base, and per-scope `layout_override` rows. The annotation tables
 * land later.
 *
 * Every user row is portable-by-construction (ADR-0011):
 *   - identity is a client-generated UUID (no autoincrement that collides on
 *     restore/merge),
 *   - it carries `createdAt` + `updatedAt` + a soft-delete tombstone
 *     (`deletedAt`) so a future sync merge is last-write-wins and deletes
 *     survive,
 *   - any anchor / scope is a coordinate / semantic key (genre, role,
 *     book.slug), never a corpus DB id.
 *
 * Magnitudes are stored in RELATIVE units — em and em-multipliers, `fontSize`
 * the single root scalar in device-independent points — never absolute pixels
 * (ADR-0004), so a preset stays sane across orientation and device.
 *
 * The corpus DB (translation/book/block/token/versification_map) is a separate
 * read-only bundled asset and is NOT defined here.
 */

/** Client-generated UUID + sync lifecycle carried by every user row (ADR-0011). */
const lifecycle = {
  /** Client-generated UUID. Never an autoincrement id. */
  id: text('id').primaryKey(),
  createdAt: integer('created_at')
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`(unixepoch())`),
  /** Soft-delete tombstone; null = live. */
  deletedAt: integer('deleted_at'),
};

/** The tunable typography knobs, all nullable = inherit (a preset's base or a
 * less-specific cascade level). Shared by the preset and its overrides. */
const knobs = {
  fontFamily: text('font_family'),
  /** Root scalar: device-independent points per em. */
  fontSize: real('font_size'),
  /** Line height as an em multiplier. */
  lineHeight: real('line_height'),
  /** Page margin around the text region, in em. */
  margin: real('margin'),
  /** Vertical space between blocks, in em. */
  paragraphSpacing: real('paragraph_spacing'),
  /** Horizontal step per `block.indent` level, in em. */
  indentStep: real('indent_step'),
  align: text('align', { enum: ['left', 'justify'] }),
  /** Text measure (column width), in em. */
  measure: real('measure'),
  /** Margin-rail base width, in em (ADR-0016 pillar 4). */
  railWidth: real('rail_width'),
};

/**
 * Global, app-wide reading settings (one live row per user). `theme` is GLOBAL
 * — not part of the typography cascade (ADR-0004). No `scroll_mode`: mode
 * (Codex/Scroll) derives from device orientation, never persisted (ADR-0016).
 */
export const readingSettings = sqliteTable('reading_settings', {
  ...lifecycle,
  theme: text('theme', { enum: ['light', 'dark'] })
    .notNull()
    .default('light'),
  /** The currently selected preset (→ layout_preset.id); null = default preset. */
  activePresetId: text('active_preset_id'),
  /**
   * The translation the reader last chose (abbrev, e.g. 'KJV'/'BSB') — #12. The
   * ephemeral reading-position store (ADR-0008) carries the live translation;
   * this is its durable seed so a cold open reopens in the last translation
   * rather than always the KJV default. Canonical-only bookmark (#14, ADR-0012)
   * stays translation-free; the translation CHOICE lives here.
   */
  activeTranslation: text('active_translation').notNull().default('KJV'),
});

/**
 * A named typography bundle the user switches between ("Reading", "Study",
 * "Large print") holding the GLOBAL cascade base. Nullable knobs inherit the
 * engine's DEFAULT_PRESET.
 */
export const layoutPreset = sqliteTable('layout_preset', {
  ...lifecycle,
  name: text('name').notNull(),
  ...knobs,
});

/**
 * Per-scope overrides on top of a preset. Precedence
 * `base < genre < role < book` (most specific wins); scopes join the corpus by
 * SEMANTIC keys (genre / role / book.slug), never a corpus id. The nullable
 * knobs inherit the less-specific level.
 */
export const layoutOverride = sqliteTable(
  'layout_override',
  {
    ...lifecycle,
    /** → layout_preset.id (a within-user-DB reference, resolved in app code). */
    presetId: text('preset_id').notNull(),
    scopeKind: text('scope_kind', { enum: ['genre', 'role', 'book'] }).notNull(),
    /** "poetry" | "psalm_title" | "Romans" (book.slug) — a semantic key. */
    scopeValue: text('scope_value').notNull(),
    ...knobs,
  },
  (table) => [
    // Partial: only LIVE rows are unique per scope, so a soft-deleted override
    // (tombstone kept for sync) does not block re-creating the same scope.
    uniqueIndex('layout_override_scope_unique')
      .on(table.presetId, table.scopeKind, table.scopeValue)
      .where(sql`${table.deletedAt} is null`),
  ],
);

/**
 * One live bookmark per book — the durable "each scroll keeps its place"
 * invariant (ADR-0012). A canonical point anchor at VERSE grain
 * (`bookSlug`/`chapter`/`verse`, canonical/av11n numbering), NOT a pixel or
 * scroll offset (ADR-0004): verse grain is the device-independent truth that
 * restores sanely at any viewport.
 *
 * Deliberately CANONICAL-ONLY — no translation column (the one exception to
 * translation-bound user anchors, CONTEXT.md). The bookmark relates the reader
 * to the passage, so a KJV⇄BSB switch (#12) lands in the same place via the
 * canonical verse.
 *
 * In normal use the row is UPDATED, never deleted; `deletedAt` exists only for
 * the uniform ADR-0011 sync convention. Uniqueness is a PARTIAL index (live
 * rows only) so a soft-deleted tombstone never blocks re-bookmarking a book.
 */
export const readingPosition = sqliteTable(
  'reading_position',
  {
    ...lifecycle,
    /** Canonical book id (corpus book.slug) — a semantic key, never a corpus row id. */
    bookSlug: text('book_slug').notNull(),
    /** Canonical (av11n) chapter number. */
    chapter: integer('chapter').notNull(),
    /** Canonical (av11n) verse number — the grain; no word_index by design. */
    verse: integer('verse').notNull(),
  },
  (table) => [
    // Partial: only LIVE rows are unique per book, so a soft-deleted bookmark
    // (tombstone kept for sync) does not block re-creating that book's row.
    uniqueIndex('reading_position_book_unique')
      .on(table.bookSlug)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export type ReadingSettings = typeof readingSettings.$inferSelect;
export type LayoutPreset = typeof layoutPreset.$inferSelect;
export type LayoutOverride = typeof layoutOverride.$inferSelect;
export type ReadingPositionRow = typeof readingPosition.$inferSelect;
