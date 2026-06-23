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
