/**
 * The 66-book Protestant canon: USFM book code → corpus `book` row. The SLUG
 * is the canonical book id used in every Anchor coordinate (ADR-0001) — it is
 * permanent. `position` is canonical book order.
 *
 * ebible.org USFM zips can carry extra material (Apocrypha, front matter);
 * ingest keeps exactly these codes and skips the rest.
 */

export interface BookDef {
  readonly code: string; // USFM \id code
  readonly slug: string; // canonical id used in anchors — PERMANENT
  readonly name: string;
  readonly testament: 'ot' | 'nt';
  readonly position: number;
}

const ot = (code: string, slug: string, name: string, position: number): BookDef => ({
  code,
  slug,
  name,
  testament: 'ot',
  position,
});
const nt = (code: string, slug: string, name: string, position: number): BookDef => ({
  code,
  slug,
  name,
  testament: 'nt',
  position,
});

export const CANON: readonly BookDef[] = [
  ot('GEN', 'Genesis', 'Genesis', 1),
  ot('EXO', 'Exodus', 'Exodus', 2),
  ot('LEV', 'Leviticus', 'Leviticus', 3),
  ot('NUM', 'Numbers', 'Numbers', 4),
  ot('DEU', 'Deuteronomy', 'Deuteronomy', 5),
  ot('JOS', 'Joshua', 'Joshua', 6),
  ot('JDG', 'Judges', 'Judges', 7),
  ot('RUT', 'Ruth', 'Ruth', 8),
  ot('1SA', '1Samuel', '1 Samuel', 9),
  ot('2SA', '2Samuel', '2 Samuel', 10),
  ot('1KI', '1Kings', '1 Kings', 11),
  ot('2KI', '2Kings', '2 Kings', 12),
  ot('1CH', '1Chronicles', '1 Chronicles', 13),
  ot('2CH', '2Chronicles', '2 Chronicles', 14),
  ot('EZR', 'Ezra', 'Ezra', 15),
  ot('NEH', 'Nehemiah', 'Nehemiah', 16),
  ot('EST', 'Esther', 'Esther', 17),
  ot('JOB', 'Job', 'Job', 18),
  ot('PSA', 'Psalms', 'Psalms', 19),
  ot('PRO', 'Proverbs', 'Proverbs', 20),
  ot('ECC', 'Ecclesiastes', 'Ecclesiastes', 21),
  ot('SNG', 'SongOfSolomon', 'Song of Solomon', 22),
  ot('ISA', 'Isaiah', 'Isaiah', 23),
  ot('JER', 'Jeremiah', 'Jeremiah', 24),
  ot('LAM', 'Lamentations', 'Lamentations', 25),
  ot('EZK', 'Ezekiel', 'Ezekiel', 26),
  ot('DAN', 'Daniel', 'Daniel', 27),
  ot('HOS', 'Hosea', 'Hosea', 28),
  ot('JOL', 'Joel', 'Joel', 29),
  ot('AMO', 'Amos', 'Amos', 30),
  ot('OBA', 'Obadiah', 'Obadiah', 31),
  ot('JON', 'Jonah', 'Jonah', 32),
  ot('MIC', 'Micah', 'Micah', 33),
  ot('NAM', 'Nahum', 'Nahum', 34),
  ot('HAB', 'Habakkuk', 'Habakkuk', 35),
  ot('ZEP', 'Zephaniah', 'Zephaniah', 36),
  ot('HAG', 'Haggai', 'Haggai', 37),
  ot('ZEC', 'Zechariah', 'Zechariah', 38),
  ot('MAL', 'Malachi', 'Malachi', 39),
  nt('MAT', 'Matthew', 'Matthew', 40),
  nt('MRK', 'Mark', 'Mark', 41),
  nt('LUK', 'Luke', 'Luke', 42),
  nt('JHN', 'John', 'John', 43),
  nt('ACT', 'Acts', 'Acts', 44),
  nt('ROM', 'Romans', 'Romans', 45),
  nt('1CO', '1Corinthians', '1 Corinthians', 46),
  nt('2CO', '2Corinthians', '2 Corinthians', 47),
  nt('GAL', 'Galatians', 'Galatians', 48),
  nt('EPH', 'Ephesians', 'Ephesians', 49),
  nt('PHP', 'Philippians', 'Philippians', 50),
  nt('COL', 'Colossians', 'Colossians', 51),
  nt('1TH', '1Thessalonians', '1 Thessalonians', 52),
  nt('2TH', '2Thessalonians', '2 Thessalonians', 53),
  nt('1TI', '1Timothy', '1 Timothy', 54),
  nt('2TI', '2Timothy', '2 Timothy', 55),
  nt('TIT', 'Titus', 'Titus', 56),
  nt('PHM', 'Philemon', 'Philemon', 57),
  nt('HEB', 'Hebrews', 'Hebrews', 58),
  nt('JAS', 'James', 'James', 59),
  nt('1PE', '1Peter', '1 Peter', 60),
  nt('2PE', '2Peter', '2 Peter', 61),
  nt('1JN', '1John', '1 John', 62),
  nt('2JN', '2John', '2 John', 63),
  nt('3JN', '3John', '3 John', 64),
  nt('JUD', 'Jude', 'Jude', 65),
  nt('REV', 'Revelation', 'Revelation', 66),
];

export const CANON_BY_CODE: ReadonlyMap<string, BookDef> = new Map(
  CANON.map((b) => [b.code, b]),
);
