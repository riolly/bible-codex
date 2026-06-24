CREATE TYPE "pos_types" AS ENUM (
  'common',
  'perfect_qatal',
  'sequential_imperfect_wayyiqtol',
  'jussive',
  'imperfect_yiqtol',
  'participle_active',
  'infinitive_construct',
  'adjective',
  'cardinal_number',
  'ordinal_number',
  'direct_object_marker',
  'definite_article',
  'relative',
  'pronominal'
);

CREATE TYPE "pos_stems" AS ENUM (
  'qal',
  'hiphil',
  'niphal'
);

CREATE TYPE "pos_persons" AS ENUM (
  'third_person'
);

CREATE TYPE "pos_genders" AS ENUM (
  'masculine',
  'feminine',
  'both'
);

CREATE TYPE "pos_numbers" AS ENUM (
  'singular',
  'plural'
);

CREATE TYPE "pos_state" AS ENUM (
  'absolute',
  'construct'
);

CREATE TYPE "languages" AS ENUM (
  'hebrew',
  'aramic',
  'greek'
);

CREATE TYPE "speech_codes" AS ENUM (
  'N',
  'V',
  'A',
  'P',
  'D',
  'article',
  'R',
  'C',
  'interjection',
  'T',
  'S'
);

CREATE TYPE "speeches" AS ENUM (
  'noun',
  'verb',
  'adjective',
  'pronoun',
  'adverb',
  'article',
  'preposition',
  'conjunction',
  'interjection',
  'particle',
  'suffix'
);

CREATE TYPE "translation_type" AS ENUM (
  'word_to_word',
  'meaning_to_meaning'
);

CREATE TABLE "Strongs" (
  "id" varchar(6) PRIMARY KEY,
  "word" string,
  "transliteration" string,
  "language" language
);

CREATE TABLE "Pos" (
  "id" integer PRIMARY KEY,
  "speech" speeches,
  "code" speech_codes,
  "type" pos_types,
  "typeCode" string,
  "stem" pos_stems,
  "person" pos_persons,
  "gender" pos_genders,
  "number" pos_numbers,
  "state" pos_state,
  "long" string
);

CREATE TABLE "Word_Prefix" (
  "id" integer PRIMARY KEY,
  "word_id" integer,
  "prefix_id" integer
);

CREATE TABLE "Prefixes" (
  "id" integer PRIMARY KEY,
  "word" string,
  "pos_id" integer
);

CREATE TABLE "Words" (
  "id" integer PRIMARY KEY,
  "word" varchar,
  "transliteration" string,
  "pos_id" varchar(6),
  "strong_id" varchar(6)
);

CREATE TABLE "Translations" (
  "id" integer PRIMARY KEY,
  "name" string,
  "abbreviation" string,
  "language" string,
  "type" translation_type,
  "year" number
);

CREATE TABLE "Words_Translations" (
  "id" integer PRIMARY KEY,
  "translation" string,
  "prefix" string,
  "suffix" string,
  "word_id" integer,
  "translation_id" integer
);

CREATE TABLE "Books" (
  "id" integer PRIMARY KEY,
  "name" string
);

CREATE TABLE "Books_Classes" (
  "id" integer PRIMARY KEY,
  "order" integer,
  "book_id" integer,
  "class_id" integer
);

CREATE TABLE "Classes" (
  "id" integer PRIMARY KEY,
  "name" string,
  "description" string
);

CREATE TABLE "Indexes" (
  "id" integer PRIMARY KEY,
  "chapter" integer,
  "verse" integer,
  "index" integer,
  "book_id" integer,
  "word_translation_id" integer
);

ALTER TABLE "Words" ADD FOREIGN KEY ("strong_id") REFERENCES "Strongs" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Words" ADD FOREIGN KEY ("pos_id") REFERENCES "Pos" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Prefixes" ADD FOREIGN KEY ("pos_id") REFERENCES "Pos" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Word_Prefix" ADD FOREIGN KEY ("word_id") REFERENCES "Words" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Word_Prefix" ADD FOREIGN KEY ("prefix_id") REFERENCES "Prefixes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Words_Translations" ADD FOREIGN KEY ("translation_id") REFERENCES "Translations" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Words_Translations" ADD FOREIGN KEY ("word_id") REFERENCES "Words" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Books_Classes" ADD FOREIGN KEY ("book_id") REFERENCES "Books" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Books_Classes" ADD FOREIGN KEY ("class_id") REFERENCES "Classes" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Indexes" ADD FOREIGN KEY ("book_id") REFERENCES "Books" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "Indexes" ADD FOREIGN KEY ("word_translation_id") REFERENCES "Words_Translations" ("id") DEFERRABLE INITIALLY IMMEDIATE;
