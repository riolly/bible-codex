-- SQLite DDL derived from schema.dbml (Phase 1). DBML enums → TEXT + CHECK.
-- Scratch only. PROTOTYPE — wipe me.
PRAGMA foreign_keys = ON;

CREATE TABLE translation (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  abbrev        TEXT NOT NULL UNIQUE,
  language      TEXT NOT NULL,
  year          INTEGER,
  license       TEXT,
  versification TEXT NOT NULL
);

CREATE TABLE book (
  id        INTEGER PRIMARY KEY,
  slug      TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  testament TEXT NOT NULL CHECK (testament IN ('ot','nt')),
  position  INTEGER NOT NULL
);

CREATE TABLE block (
  id             INTEGER PRIMARY KEY,
  translation_id INTEGER NOT NULL REFERENCES translation(id),
  book_id        INTEGER NOT NULL REFERENCES book(id),
  chapter        INTEGER NOT NULL,            -- FINDING: missing from schema.dbml; block.seq is per-chapter
  genre          TEXT NOT NULL CHECK (genre IN ('prose','poetry','heading')),
  role           TEXT,
  indent         INTEGER NOT NULL DEFAULT 0,
  seq            INTEGER NOT NULL
);

CREATE TABLE token (
  id             INTEGER PRIMARY KEY,
  translation_id INTEGER NOT NULL REFERENCES translation(id),
  book_id        INTEGER NOT NULL REFERENCES book(id),
  chapter        INTEGER NOT NULL,
  verse          INTEGER NOT NULL,            -- canonical; 0 = pre-verse (heading/title)
  word_index     INTEGER,                     -- word ordinal in verse, punct excluded
  seq            INTEGER NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('word','punct')),
  text           TEXT NOT NULL,
  block_id       INTEGER NOT NULL REFERENCES block(id),
  verse_start    INTEGER NOT NULL DEFAULT 0,
  ow_id          TEXT                         -- SEAM P3: Original Word hub id; null in Phase 1
);
CREATE INDEX ix_token_render  ON token (translation_id, book_id, chapter, verse, seq);
CREATE INDEX ix_token_anchor  ON token (translation_id, book_id, chapter, verse, word_index);
CREATE INDEX ix_block_render  ON block (translation_id, book_id, seq);

CREATE TABLE versification_map (
  id             INTEGER PRIMARY KEY,
  translation_id INTEGER NOT NULL REFERENCES translation(id),
  book_id        INTEGER NOT NULL REFERENCES book(id),
  src_chapter    INTEGER NOT NULL,
  src_verse      INTEGER NOT NULL,
  canon_chapter  INTEGER NOT NULL,
  canon_verse    INTEGER NOT NULL
);

-- Presentation layer (user data). Not filled by ingestion; seeded with a demo to
-- prove the cascade resolves by SEMANTIC KEY (genre/role/book), never token.id.
CREATE TABLE layout_preset (
  id                INTEGER PRIMARY KEY,
  name              TEXT NOT NULL,
  font_family       TEXT,
  font_size         REAL,
  line_height       REAL,
  margin            REAL,
  paragraph_spacing REAL,
  indent_step       REAL,
  align             TEXT
);

CREATE TABLE layout_override (
  id                INTEGER PRIMARY KEY,
  preset_id         INTEGER NOT NULL REFERENCES layout_preset(id),
  scope_kind        TEXT NOT NULL CHECK (scope_kind IN ('genre','role','book')),
  scope_value       TEXT NOT NULL,
  font_family       TEXT,
  font_size         REAL,
  line_height       REAL,
  margin            REAL,
  paragraph_spacing REAL,
  indent_step       REAL,
  align             TEXT,
  UNIQUE (preset_id, scope_kind, scope_value)
);

CREATE TABLE reading_settings (
  id               INTEGER PRIMARY KEY,
  scroll_mode      TEXT NOT NULL DEFAULT 'vertical' CHECK (scroll_mode IN ('horizontal','vertical')),
  theme            TEXT NOT NULL DEFAULT 'light',
  active_preset_id INTEGER REFERENCES layout_preset(id)
);

-- ============================================================
-- Annotation layer (Phase 2) — user data. Mirrors schema.dbml; see ADR-0006.
-- IDs: TEXT (UUID, client-generated). NO FK INTO THE CORPUS — anchors join by
-- coordinate (translation abbrev + book slug + chapter + verse + word_index), so a
-- corpus re-ingest that renumbers integer ids orphans nothing. Only within-layer FKs
-- (layer / connector / ink_annotation) are real. Lifecycle on every table:
-- created_at/updated_at/deleted_at (epoch ms); deleted_at = soft-delete tombstone.
-- ============================================================

CREATE TABLE layer (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  visible    INTEGER NOT NULL DEFAULT 1,
  seq        INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

-- Mark — decoration ON words; target ALWAYS scripture → inline anchor.
CREATE TABLE mark (
  id                 TEXT PRIMARY KEY,
  layer_id           TEXT NOT NULL REFERENCES layer(id),
  kind               TEXT NOT NULL CHECK (kind IN ('underline','highlight','box','circle','strike')),
  target_translation TEXT NOT NULL,                 -- abbrev, e.g. 'WEB'
  target_book_slug   TEXT NOT NULL,
  target_chapter     INTEGER NOT NULL,
  target_verse       INTEGER NOT NULL,
  target_word_index  INTEGER,                        -- null = whole verse
  target_word_count  INTEGER,                        -- span length in words
  target_ow_id       TEXT,                           -- SEAM P3
  color              TEXT NOT NULL,
  weight             REAL,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  deleted_at         INTEGER
);
CREATE INDEX ix_mark_anchor ON mark (target_translation, target_book_slug, target_chapter, target_verse);
CREATE INDEX ix_mark_layer  ON mark (layer_id);

CREATE TABLE note (
  id              TEXT PRIMARY KEY,
  layer_id        TEXT NOT NULL REFERENCES layer(id),
  pin_translation TEXT NOT NULL,
  pin_book_slug   TEXT NOT NULL,
  pin_chapter     INTEGER NOT NULL,
  pin_verse       INTEGER NOT NULL,
  pin_word_index  INTEGER,
  pin_ow_id       TEXT,
  offset_dx       REAL NOT NULL,
  offset_dy       REAL NOT NULL,
  text            TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  deleted_at      INTEGER
);
CREATE INDEX ix_note_anchor ON note (pin_translation, pin_book_slug, pin_chapter, pin_verse);

CREATE TABLE connector (
  id         TEXT PRIMARY KEY,
  layer_id   TEXT NOT NULL REFERENCES layer(id),
  color      TEXT NOT NULL,
  weight     REAL,
  arrowhead  INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

-- Binding — ONE row per connector endpoint (endpoint = binding, 1:1). Polymorphic
-- target: a scripture coordinate OR an element (mark|note). The CHECK is the real
-- guard DBML cannot express; ix_binding_backref is the tldraw-style back-reference.
CREATE TABLE binding (
  id                 TEXT PRIMARY KEY,
  connector_id       TEXT NOT NULL REFERENCES connector(id),
  role               TEXT NOT NULL CHECK (role IN ('from','to')),
  target_kind        TEXT NOT NULL CHECK (target_kind IN ('scripture','mark','note')),
  anchor_translation TEXT,
  anchor_book_slug   TEXT,
  anchor_chapter     INTEGER,
  anchor_verse       INTEGER,
  anchor_word_index  INTEGER,
  anchor_word_count  INTEGER,
  anchor_ow_id       TEXT,
  target_element_id  TEXT,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  deleted_at         INTEGER,
  CHECK (
    (target_kind = 'scripture'
       AND anchor_translation IS NOT NULL AND anchor_chapter IS NOT NULL AND anchor_verse IS NOT NULL
       AND target_element_id IS NULL)
    OR
    (target_kind IN ('mark','note')
       AND target_element_id IS NOT NULL
       AND anchor_translation IS NULL AND anchor_chapter IS NULL AND anchor_verse IS NULL)
  ),
  UNIQUE (connector_id, role)
);
CREATE INDEX ix_binding_backref ON binding (target_kind, target_element_id);

-- InkAnnotation — strokes over one passage in ONE layout. Anchor by coordinate (no
-- block_id FK); (translation, scroll_mode) gate visibility; layout_hash → re-place/hide.
CREATE TABLE ink_annotation (
  id                 TEXT PRIMARY KEY,
  layer_id           TEXT NOT NULL REFERENCES layer(id),
  anchor_translation TEXT NOT NULL,
  anchor_book_slug   TEXT NOT NULL,
  anchor_chapter     INTEGER NOT NULL,
  anchor_verse       INTEGER NOT NULL,
  anchor_verse_end   INTEGER,
  scroll_mode        TEXT NOT NULL CHECK (scroll_mode IN ('horizontal','vertical')),
  layout_hash        TEXT NOT NULL,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  deleted_at         INTEGER
);
CREATE INDEX ix_ink_anchor ON ink_annotation (anchor_translation, anchor_book_slug, anchor_chapter, anchor_verse);

-- InkStroke — one committed stroke; points = packed Float32 BLOB (opaque, never
-- queried per-point). Eraser/undo = soft-delete (deleted_at).
CREATE TABLE ink_stroke (
  id            TEXT PRIMARY KEY,
  annotation_id TEXT NOT NULL REFERENCES ink_annotation(id),
  tool          TEXT NOT NULL CHECK (tool IN ('pen','highlighter')),
  color         TEXT NOT NULL,
  width         REAL NOT NULL,
  points        BLOB NOT NULL,
  point_count   INTEGER NOT NULL,
  point_format  TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER
);
CREATE INDEX ix_stroke_anno ON ink_stroke (annotation_id);
