// THROWAWAY shell: ingest real WEB USFM → scratch SQLite → pressure-test report.
// The pure, keepable bit is src/usfm.ts. Run: `pnpm ingest`  or  `pnpm repl`.
import Database from "better-sqlite3";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { type Stats } from "./usfm";
import { renderLine, type RToken } from "./render";
import { ingestCorpus } from "./ingest";
import { runPhase2Proofs } from "./anno";
import { runPhase3Proofs } from "./phase3";

const ROOT = join(__dirname, "..");
const DB_PATH = join(ROOT, "PROTOTYPE-wipe-me.sqlite");
const B = (s: string) => `\x1b[1m${s}\x1b[0m`;
const D = (s: string) => `\x1b[2m${s}\x1b[0m`;
const G = (s: string) => `\x1b[32m${s}\x1b[0m`;
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`;
const hr = (t: string) => console.log("\n" + B(`━━ ${t} ` + "━".repeat(Math.max(0, 56 - t.length))));

function build() {
  if (existsSync(DB_PATH)) rmSync(DB_PATH);
  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");
  db.exec(readFileSync(join(ROOT, "schema.sql"), "utf8"));

  const total = ingestCorpus(db, ROOT);  // WEB (Gen/Psa/Jhn) + a small KJV John slice (Phase-2 fixture)

  // seed presentation demo (proves the cascade resolves by semantic key, not token.id).
  // #4: UUID (text) ids + lifecycle, like the synced annotation layer.
  const T = Date.now();
  const presetId = "preset-reading";
  db.prepare(`INSERT INTO layout_preset (id,name,font_family,font_size,line_height,margin,paragraph_spacing,indent_step,align,created_at,updated_at)
              VALUES (?,'Reading','Cardo',18,1.5,24,8,1.0,'left',?,?)`).run(presetId, T, T);
  db.prepare(`INSERT INTO layout_override (id,preset_id,scope_kind,scope_value,indent_step,created_at,updated_at) VALUES (?,?,'genre','poetry',1.5,?,?)`).run("ov-poetry", presetId, T, T);
  db.prepare(`INSERT INTO layout_override (id,preset_id,scope_kind,scope_value,font_family,created_at,updated_at) VALUES (?,?,'book','Psalms','Gentium Plus',?,?)`).run("ov-psalms", presetId, T, T);
  db.prepare(`INSERT INTO reading_settings (id,scroll_mode,theme,active_preset_id,created_at,updated_at) VALUES (?,'vertical','light',?,?,?)`).run("rs-1", presetId, T, T);

  return { db, total };
}

function report(db: Database.Database, total: Stats) {
  const one = (sql: string, ...a: any[]) => (db.prepare(sql).get(...a) as any);
  const all = (sql: string, ...a: any[]) => db.prepare(sql).all(...a) as any[];

  hr("INGESTED");
  console.log(`books    ${B(String(one(`SELECT count(*) c FROM book`).c))}` +
    `   blocks ${B(String(one(`SELECT count(*) c FROM block`).c))}` +
    `   tokens ${B(String(one(`SELECT count(*) c FROM token`).c))}`);
  console.log("blocks by genre: " + all(`SELECT genre,count(*) c FROM block GROUP BY genre`).map(r => `${r.genre}=${r.c}`).join("  "));
  console.log("tokens by kind:  " + all(`SELECT kind,count(*) c FROM token GROUP BY kind`).map(r => `${r.kind}=${r.c}`).join("  "));

  hr("SCHEMA STRESS — verse ⇄ block independence (Q2)");
  const vcb = all(`SELECT translation_id,book_id,chapter,verse, count(distinct block_id) c FROM token WHERE verse IS NOT NULL GROUP BY translation_id,book_id,chapter,verse HAVING c>1`);
  const bcv = all(`SELECT block_id, count(distinct verse) c FROM token WHERE verse IS NOT NULL GROUP BY block_id HAVING c>1`);
  console.log(`${G("✓")} verses spanning >1 block : ${B(String(vcb.length))}  ${D("(poetry — verse crosses block)")}`);
  console.log(`${G("✓")} blocks spanning >1 verse : ${B(String(bcv.length))}  ${D("(prose — block crosses verse)")}`);
  const ex = one(`SELECT b.slug FROM book b WHERE b.slug='Psalms'`);
  const psa = one(`SELECT id FROM book WHERE slug='Psalms'`).id;
  const s31 = all(`SELECT distinct bl.genre, bl.indent, bl.seq FROM token t JOIN block bl ON bl.id=t.block_id WHERE t.book_id=? AND t.chapter=3 AND t.verse=1 ORDER BY bl.seq`, psa);
  console.log(D(`  e.g. Psalms 3:1 lives in ${s31.length} blocks: `) + s31.map(r => `${r.genre}/indent${r.indent}`).join(" + "));

  hr("HEADINGS — non-verse content (verse=NULL, #1/#3 RESOLVED)");
  const pv = all(`SELECT bl.role, count(*) c FROM token t JOIN block bl ON bl.id=t.block_id WHERE t.verse IS NULL AND t.kind='word' GROUP BY bl.role`);
  console.log(`${G("✓")} word tokens with verse=NULL : ${B(String(total.preVerseWordTokens))}  ${D("(headings/titles, incl. mid-chapter \\s — carry NO verse, NO word_index)")}`);
  console.log(D("  by role: ") + pv.map(r => `${r.role}=${r.c}`).join("  "));
  console.log(D("  → RESOLVED (#1): nullable token.verse (NULL, not 0). Headings not anchorable in v1 (#2)."));

  hr("GENRE / ROLE coverage produced");
  for (const r of all(`SELECT genre,role,count(*) c FROM block GROUP BY genre,role ORDER BY genre`))
    console.log(`  ${r.genre.padEnd(8)} ${String(r.role ?? D("(null)")).padEnd(14)} ${r.c}`);
  console.log("poetry indent levels: " + all(`SELECT indent,count(*) c FROM block WHERE genre='poetry' GROUP BY indent`).map(r => `q${r.indent}=${r.c}`).join("  "));

  hr("VERSIFICATION (Q3) & PHASE-3 SEAM");
  console.log(`versification_map rows : ${B(String(one(`SELECT count(*) c FROM versification_map`).c))}  ${D("(0 expected — WEB≈canonical English; Hebrew divergence is Phase-3)")}`);
  console.log(`Strong's attrs in source: ${B(String(total.strongAttrs))} on ${B(String(total.wWrapped))} \\w words  ${G("← Phase-3 ow_id seam has real data NOW")}`);

  hr("NOT MODELLED in Phase 1 (findings)");
  console.log(`  footnotes \\f   = ${total.footnotes}   ${D("(extracted; not tokens)")}`);
  console.log(`  cross-refs \\x  = ${total.xrefs}   ${D("(→ feeds Phase-4 Cross-reference)")}`);
  console.log(`  words-of-Jesus = ${total.wordsOfJesus}   ${Y("(char-style span — no schema slot)")}`);
  console.log(`  Selah \\qs      = ${total.selah}   ${Y("(char-style span — no schema slot)")}`);

  hr("ROUND-TRIP RENDER from rows (spacing derived, no stored spaces — proves Q1)");
  renderChapter(db, "Genesis", 1, 3);
  console.log();
  renderChapter(db, "Psalms", 3, 99);

  hr("PRESENTATION CASCADE resolves by SEMANTIC KEY (proves ADR-0004)");
  cascade(db, "Psalms", "poetry");

  hr("ANCHOR by COORDINATE (not DB id)");
  const a = one(`SELECT text FROM token WHERE book_id=(SELECT id FROM book WHERE slug='Genesis') AND chapter=1 AND verse=1 AND word_index=0`);
  console.log(`  Genesis 1:1 word[0] = ${B(a.text)}   ${D("(looked up purely by coordinate)")}`);
}

function renderChapter(db: Database.Database, slug: string, chapter: number, verseMax: number) {
  const bookId = (db.prepare(`SELECT id FROM book WHERE slug=?`).get(slug) as any).id;
  const blocks = db.prepare(`SELECT * FROM block WHERE book_id=? AND chapter=? ORDER BY seq`).all(bookId, chapter) as any[];
  console.log(D(`${slug} ${chapter}` + (verseMax < 99 ? ` (v1–${verseMax})` : "")));
  for (const bl of blocks) {
    const toks = db.prepare(
      `SELECT kind,text,verse,verse_start FROM token WHERE block_id=? AND (verse IS NULL OR verse<=?) ORDER BY seq`
    ).all(bl.id, verseMax) as any[];
    if (!toks.length) continue;
    const pad = bl.genre === "poetry" ? "  ".repeat(bl.indent) : bl.genre === "heading" ? "    " : "";
    // group consecutive tokens by verse so every verse number shows inline
    const parts: string[] = [];
    let curV = -1, buf: RToken[] = [];
    const flush = () => { if (buf.length) { parts.push((curV > 0 ? D(`${curV} `) : "") + renderLine(buf)); buf = []; } };
    for (const t of toks as any[]) { if (t.verse !== curV) { flush(); curV = t.verse; } buf.push(t); }
    flush();
    const text = parts.join(" ");
    console.log(bl.genre === "heading" ? `${pad}${D("〔" + renderLine(toks as RToken[]) + "〕")}` : `${pad}${text}`);
  }
}

function cascade(db: Database.Database, bookSlug: string, genre: string) {
  const preset = db.prepare(`SELECT * FROM layout_preset WHERE id=(SELECT active_preset_id FROM reading_settings WHERE id='rs-1')`).get() as any;
  const resolved: any = { ...preset };
  const apply = (kind: string, val: string) => {
    const ov = db.prepare(`SELECT * FROM layout_override WHERE preset_id=? AND scope_kind=? AND scope_value=?`).get(preset.id, kind, val) as any;
    if (!ov) return;
    for (const k of ["font_family", "font_size", "line_height", "margin", "paragraph_spacing", "indent_step", "align"])
      if (ov[k] != null) resolved[k] = ov[k];
  };
  apply("genre", genre);   // base < genre
  apply("book", bookSlug); // < book (most specific)
  console.log(`  resolving a ${B(genre)} block in ${B(bookSlug)} (keys only — no token.id):`);
  console.log(`    base preset '${preset.name}': font=${preset.font_family} indent_step=${preset.indent_step}`);
  console.log(`    ${G("→ resolved")}: font=${B(resolved.font_family)} indent_step=${B(String(resolved.indent_step))}  ${D("(book Psalms→Gentium Plus, genre poetry→1.5)")}`);
}

function repl(db: Database.Database) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(D("\nrepl: type a reference like  Psalms 3:1   or  Genesis 1:1   (q to quit)"));
  const ask = () => rl.question("ref> ", (line) => {
    const s = line.trim();
    if (s === "q" || s === "quit") return rl.close();
    const m = s.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (!m) { console.log(D("format: <Book> <ch>:<vs>")); return ask(); }
    const book = db.prepare(`SELECT id FROM book WHERE slug=? COLLATE NOCASE`).get(m[1]) as any;
    if (!book) { console.log(D("unknown book")); return ask(); }
    const toks = db.prepare(
      `SELECT t.kind,t.text,t.word_index,bl.genre,bl.indent,bl.role
       FROM token t JOIN block bl ON bl.id=t.block_id
       WHERE t.book_id=? AND t.chapter=? AND t.verse=? ORDER BY t.seq`
    ).all(book.id, +m[2], +m[3]) as any[];
    if (!toks.length) { console.log(D("no tokens")); return ask(); }
    console.log("  text   : " + renderLine(toks as RToken[]));
    console.log("  blocks : " + [...new Set(toks.map(t => `${t.genre}/indent${t.indent}${t.role ? "/" + t.role : ""}`))].join("  "));
    console.log("  words  : " + toks.filter(t => t.kind === "word").map(t => `${D("[" + t.word_index + "]")}${t.text}`).join(" "));
    ask();
  });
  ask();
}

const { db, total } = build();
report(db, total);
runPhase2Proofs(db, ROOT);   // Phase-2 annotation-layer pressure-test
runPhase3Proofs(db, ROOT);   // Phase-3 Original Word hub pressure-test (mutates corpus last, via re-ingest proof)
if (process.argv.includes("--repl")) repl(db); else db.close();
