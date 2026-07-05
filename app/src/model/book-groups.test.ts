import { describe, expect, it } from 'vitest';

import { CANON } from '../../scripts/ingest/books';
import { BOOK_GROUPS, groupBooks, groupOfBook } from './book-groups';

// The grouping is BibleProject categorization with Tanakh OT order (#23) — NOT
// the corpus's canonical `position` (Ruth, Chronicles, Daniel move to Writings).
// These tests pin the exact order and guard against canon drift.

const ALL_SLUGS = CANON.map((b) => b.slug);

describe('BOOK_GROUPS', () => {
  it('lists the seven groups in the #23 order', () => {
    expect(BOOK_GROUPS.map((g) => g.name)).toEqual([
      'Torah',
      'Prophets',
      'Writings',
      'Gospels',
      'Acts',
      'Letters',
      'Revelation',
    ]);
  });

  it('assigns every canonical book to exactly one group', () => {
    const grouped = BOOK_GROUPS.flatMap((g) => g.bookSlugs);
    expect([...grouped].sort()).toEqual([...ALL_SLUGS].sort());
    expect(grouped.length).toBe(ALL_SLUGS.length); // no duplicates
  });

  it('opens the Writings with Psalms and moves Ruth/Chronicles out of canonical order', () => {
    const writings = BOOK_GROUPS.find((g) => g.name === 'Writings')!.bookSlugs;
    expect(writings[0]).toBe('Psalms');
    expect(writings).toContain('Ruth');
    expect(writings).toContain('1Chronicles');
  });
});

describe('groupOfBook', () => {
  it('maps a slug back to its group name', () => {
    expect(groupOfBook('Genesis')).toBe('Torah');
    expect(groupOfBook('Ruth')).toBe('Writings');
    expect(groupOfBook('Jude')).toBe('Letters');
  });

  it('returns null for an unknown slug', () => {
    expect(groupOfBook('Tobit')).toBeNull();
  });
});

describe('groupBooks', () => {
  const books = ALL_SLUGS.map((slug) => ({ slug, name: slug, chapters: 1 }));

  it('threads available books into grouped, ordered sections', () => {
    const sections = groupBooks(books);
    expect(sections.map((s) => s.name)).toEqual(BOOK_GROUPS.map((g) => g.name));
    const torah = sections.find((s) => s.name === 'Torah')!;
    expect(torah.books.map((b) => b.slug)).toEqual([
      'Genesis',
      'Exodus',
      'Leviticus',
      'Numbers',
      'Deuteronomy',
    ]);
  });

  it('drops empty groups and books absent from the corpus', () => {
    const partial = books.filter((b) => b.slug === 'Matthew' || b.slug === 'Genesis');
    const sections = groupBooks(partial);
    expect(sections.map((s) => s.name)).toEqual(['Torah', 'Gospels']);
    expect(sections[0].books).toHaveLength(1);
  });

  it('ignores a book not present in the grouping table', () => {
    const sections = groupBooks([...books, { slug: 'Tobit', name: 'Tobit', chapters: 14 }]);
    const total = sections.flatMap((s) => s.books).length;
    expect(total).toBe(ALL_SLUGS.length);
  });
});
