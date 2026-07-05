/**
 * BibleProject reading-order grouping for the book/chapter menu (#23).
 *
 * This is a PRESENTATION ordering, distinct from the corpus's canonical
 * `book.position` (the Protestant order used for anchors). The OT follows the
 * Tanakh arrangement — Ruth, Chronicles, Daniel, Ezra–Nehemiah sit in the
 * Writings, not among the histories/prophets — so the sequence cannot be
 * derived from `position`; it is spelled out here.
 *
 * Slugs are the PERMANENT canonical ids (scripts/ingest/books.ts). This layer
 * is framework-agnostic — no Skia, no DB (ADR-0008). It orders whatever books
 * the corpus actually carries; a book absent from the DB is simply omitted.
 */

export interface BookGroup {
  readonly name: string;
  readonly bookSlugs: readonly string[];
}

export const BOOK_GROUPS: readonly BookGroup[] = [
  { name: 'Torah', bookSlugs: ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'] },
  {
    name: 'Prophets',
    bookSlugs: [
      'Joshua',
      'Judges',
      '1Samuel',
      '2Samuel',
      '1Kings',
      '2Kings',
      'Isaiah',
      'Jeremiah',
      'Ezekiel',
      'Hosea',
      'Joel',
      'Amos',
      'Obadiah',
      'Jonah',
      'Micah',
      'Nahum',
      'Habakkuk',
      'Zephaniah',
      'Haggai',
      'Zechariah',
      'Malachi',
    ],
  },
  {
    name: 'Writings',
    bookSlugs: [
      'Psalms',
      'Proverbs',
      'Job',
      'SongOfSolomon',
      'Ruth',
      'Lamentations',
      'Ecclesiastes',
      'Esther',
      'Daniel',
      'Ezra',
      'Nehemiah',
      '1Chronicles',
      '2Chronicles',
    ],
  },
  { name: 'Gospels', bookSlugs: ['Matthew', 'Mark', 'Luke', 'John'] },
  { name: 'Acts', bookSlugs: ['Acts'] },
  {
    name: 'Letters',
    bookSlugs: [
      'Romans',
      '1Corinthians',
      '2Corinthians',
      'Galatians',
      'Ephesians',
      'Philippians',
      'Colossians',
      '1Thessalonians',
      '2Thessalonians',
      '1Timothy',
      '2Timothy',
      'Titus',
      'Philemon',
      'Hebrews',
      'James',
      '1Peter',
      '2Peter',
      '1John',
      '2John',
      '3John',
      'Jude',
    ],
  },
  { name: 'Revelation', bookSlugs: ['Revelation'] },
];

const GROUP_OF_SLUG: ReadonlyMap<string, string> = new Map(
  BOOK_GROUPS.flatMap((g) => g.bookSlugs.map((slug) => [slug, g.name] as const)),
);

/** The group name a book slug belongs to, or null for an unknown slug. */
export function groupOfBook(slug: string): string | null {
  return GROUP_OF_SLUG.get(slug) ?? null;
}

/** A book as surfaced to the menu — corpus identity plus its chapter count. */
export interface MenuBook {
  readonly slug: string;
  readonly name: string;
  readonly chapters: number;
}

export interface BookSection {
  readonly name: string;
  readonly books: readonly MenuBook[];
}

/**
 * Thread the corpus's available books into the grouped reading order. Books
 * are placed by slug, groups keep their #23 sequence, and empty groups (and
 * books outside the grouping table) are dropped — so the menu shows exactly
 * what the bundled corpus can render.
 */
export function groupBooks(available: readonly MenuBook[]): BookSection[] {
  const bySlug = new Map(available.map((b) => [b.slug, b]));
  const sections: BookSection[] = [];
  for (const group of BOOK_GROUPS) {
    const books = group.bookSlugs
      .map((slug) => bySlug.get(slug))
      .filter((b): b is MenuBook => b !== undefined);
    if (books.length > 0) sections.push({ name: group.name, books });
  }
  return sections;
}
