// Reusable corpus ingester (extracted from main so the Phase-2 re-ingest proof can
// rebuild the corpus with DIFFERENT integer ids). Translations/books/blocks/tokens are
// inserted WITHOUT explicit ids and rely on insertion ORDER — `reversed` swaps WEB/KJV
// order so the same rows land on different integer pks. Nothing reads those ids except
// internal corpus FKs; anchors join by abbrev+slug.
import type Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseUsfm, type Stats } from "./usfm";

type BookDef = { file: string; slug: string; name: string; testament: string; position: number };

const WEB_BOOKS: BookDef[] = [
  { file: "GEN.usfm", slug: "Genesis", name: "Genesis", testament: "ot", position: 1 },
  { file: "PSA.usfm", slug: "Psalms", name: "Psalms", testament: "ot", position: 19 },
  { file: "JHN.usfm", slug: "John", name: "John", testament: "nt", position: 43 },
];
// Phase-2 fixture: a small public-domain KJV slice of John (John 1:1–5 + 3:16) as a
// 2nd translation, so cross-translation Markup portability (ADR-0002) is testable.
const KJV_JOHN: BookDef = { file: "JHN.kjv.usfm", slug: "John", name: "John", testament: "nt", position: 43 };

export function ingestCorpus(db: Database.Database, ROOT: string, opts: { reversed?: boolean } = {}): Stats {
  const insTranslation = db.prepare(
    `INSERT INTO translation (name,abbrev,language,year,license,versification) VALUES (?,?,?,?,?,?)`
  );
  const getBook = db.prepare(`SELECT id FROM book WHERE slug=?`);
  const insBook = db.prepare(`INSERT INTO book (slug,name,testament,position) VALUES (?,?,?,?)`);
  const insBlock = db.prepare(
    `INSERT INTO block (translation_id,book_id,chapter,genre,role,indent,seq) VALUES (?,?,?,?,?,?,?)`
  );
  const insTok = db.prepare(
    `INSERT INTO token (translation_id,book_id,chapter,verse,word_index,seq,kind,text,block_id,verse_start,ow_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,NULL)`
  );

  const total: Stats = { footnotes: 0, xrefs: 0, wordsOfJesus: 0, selah: 0, strongAttrs: 0, wWrapped: 0, preVerseWordTokens: 0 };

  const ingestBook = (translationId: number, b: BookDef, accrue: boolean) => {
    const { blocks, tokens, stats } = parseUsfm(readFileSync(join(ROOT, "data", b.file), "utf8"));
    let bookId = (getBook.get(b.slug) as any)?.id as number | undefined;
    if (bookId == null) bookId = insBook.run(b.slug, b.name, b.testament, b.position).lastInsertRowid as number;
    const blockId = new Map<number, number>();
    for (const bl of blocks)
      blockId.set(bl.localId, insBlock.run(translationId, bookId, bl.chapter, bl.genre, bl.role, bl.indent, bl.seq).lastInsertRowid as number);
    for (const t of tokens)
      insTok.run(translationId, bookId, t.chapter, t.verse, t.wordIndex, t.seq, t.kind, t.text, blockId.get(t.blockLocalId), t.verseStart ? 1 : 0);
    if (accrue) for (const k of Object.keys(total) as (keyof Stats)[]) total[k] += stats[k];
  };

  const web = () => {
    const id = insTranslation.run("World English Bible", "WEB", "english", 2000, "Public Domain", "av11n").lastInsertRowid as number;
    for (const b of WEB_BOOKS) ingestBook(id, b, true);
  };
  const kjv = () => {
    const id = insTranslation.run("King James Version", "KJV", "english", 1769, "Public Domain", "av11n").lastInsertRowid as number;
    ingestBook(id, KJV_JOHN, false);
  };

  const run = db.transaction(() => { if (opts.reversed) { kjv(); web(); } else { web(); kjv(); } });
  run();
  return total;
}
