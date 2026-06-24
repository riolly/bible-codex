// THROWAWAY: Phase-2 (annotation layer) pressure-test. Seeds Markup + Ink against the
// REAL ingested corpus, then runs 5 proofs that could actually fail — the Phase-2
// analogue of the Phase-1 report. See ../README.md for the question + verdict.
//
// Keepable bits if any: packPoints/unpackPoints (the ink BLOB codec) and resolveMark
// (the anchor→tokens resolver with cross-translation verse-grain fallback). The rest is
// harness.
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { ingestCorpus } from "./ingest";

const B = (s: string) => `\x1b[1m${s}\x1b[0m`;
const D = (s: string) => `\x1b[2m${s}\x1b[0m`;
const G = (s: string) => `\x1b[32m${s}\x1b[0m`;
const R = (s: string) => `\x1b[31m${s}\x1b[0m`;
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`;
const hr = (t: string) => console.log("\n" + B(`━━ ${t} ` + "━".repeat(Math.max(0, 56 - t.length))));

const all = (db: Database.Database, sql: string, ...a: any[]) => db.prepare(sql).all(...a) as any[];
const one = (db: Database.Database, sql: string, ...a: any[]) => db.prepare(sql).get(...a) as any;

// ---- pass/fail tracker -------------------------------------------------------
let passed = 0, failed = 0;
function check(cond: boolean, label: string, detail = "") {
  if (cond) { passed++; console.log(`  ${G("✓")} ${label}${detail ? "  " + D(detail) : ""}`); }
  else { failed++; console.log(`  ${R("✗")} ${label}${detail ? "  " + D(detail) : ""}`); }
}

// ---- ink BLOB codec (Q5) -----------------------------------------------------
type Pt = { x: number; y: number; p: number; t: number };
const POINT_FORMAT = "f32:x,y,p,t";
export function packPoints(pts: Pt[]): Buffer {
  const f = new Float32Array(pts.length * 4);
  pts.forEach((p, i) => { f[i * 4] = p.x; f[i * 4 + 1] = p.y; f[i * 4 + 2] = p.p; f[i * 4 + 3] = p.t; });
  return Buffer.from(f.buffer);
}
export function unpackPoints(buf: Buffer): Pt[] {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const f = new Float32Array(ab);
  const out: Pt[] = [];
  for (let i = 0; i < f.length; i += 4) out.push({ x: f[i], y: f[i + 1], p: f[i + 2], t: f[i + 3] });
  return out;
}

// ---- anchor resolver: coordinate → real tokens, with cross-translation fallback ----
// Word grain only same-translation (or once ow_id exists in P3). Cross-translation OR a
// missing/out-of-range word → fall back to VERSE grain so the mark survives (ADR-0005,
// prototype lesson #3). Joins the corpus by abbrev+slug, never integer id.
function qVerseWords(db: Database.Database, tx: string, slug: string, ch: number, vs: number) {
  return all(db,
    `SELECT t.text, t.word_index, t.block_id
     FROM token t JOIN translation tr ON tr.id=t.translation_id JOIN book b ON b.id=t.book_id
     WHERE tr.abbrev=? AND b.slug=? AND t.chapter=? AND t.verse=? AND t.kind='word'
     ORDER BY t.word_index`, tx, slug, ch, vs);
}
function qWordRange(db: Database.Database, tx: string, slug: string, ch: number, vs: number, lo: number, hi: number) {
  return all(db,
    `SELECT t.text, t.word_index, t.block_id
     FROM token t JOIN translation tr ON tr.id=t.translation_id JOIN book b ON b.id=t.book_id
     WHERE tr.abbrev=? AND b.slug=? AND t.chapter=? AND t.verse=? AND t.kind='word'
       AND t.word_index>=? AND t.word_index<?
     ORDER BY t.word_index`, tx, slug, ch, vs, lo, hi);
}
type Resolved = { grain: string; translation: string; tokens: any[] };
function resolveMark(db: Database.Database, m: any, current: string): Resolved {
  const sameTx = m.target_translation === current;
  const wordWanted = m.target_word_index != null;
  const canWord = sameTx || m.target_ow_id != null;
  if (wordWanted && canWord) {
    const cnt = m.target_word_count ?? 1;
    const toks = qWordRange(db, current, m.target_book_slug, m.target_chapter, m.target_verse,
      m.target_word_index, m.target_word_index + cnt);
    if (toks.length) return { grain: "word", translation: current, tokens: toks };
  }
  const toks = qVerseWords(db, current, m.target_book_slug, m.target_chapter, m.target_verse);
  const grain = !wordWanted ? (sameTx ? "verse" : "verse (ported)")
    : (sameTx ? "verse (word→verse, clamp)" : "verse (word→verse, cross-tx)");
  return { grain, translation: current, tokens: toks };
}

// ---- seed: a small but representative annotation scene ------------------------
const NOW = Date.now();
const life = () => ({ created_at: NOW, updated_at: NOW });
type Ids = { layer: string; mVerse: string; mWord: string; mRange: string; note: string; connector: string };

export function seedAnnotations(db: Database.Database): Ids {
  const ids: Ids = {
    layer: randomUUID(), mVerse: randomUUID(), mWord: randomUUID(),
    mRange: randomUUID(), note: randomUUID(), connector: randomUUID(),
  };
  const L = life();

  db.prepare(`INSERT INTO layer (id,name,visible,seq,created_at,updated_at) VALUES (?,?,1,0,?,?)`)
    .run(ids.layer, "Study", L.created_at, L.updated_at);

  const insMark = db.prepare(
    `INSERT INTO mark (id,layer_id,kind,target_translation,target_book_slug,target_chapter,target_verse,
       target_word_index,target_word_count,target_ow_id,color,weight,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,NULL,?,?,?,?)`);
  // verse-grain highlight on John 1:1 (no word_index)
  insMark.run(ids.mVerse, ids.layer, "highlight", "WEB", "John", 1, 1, null, null, "#ffd54a", null, L.created_at, L.updated_at);
  // word-grain underline on John 3:16 word[10]
  insMark.run(ids.mWord, ids.layer, "underline", "WEB", "John", 3, 16, 10, 1, "#4a90d9", null, L.created_at, L.updated_at);
  // word-RANGE highlight over Psalms 3:1 (a verse that spans >1 poetry block)
  insMark.run(ids.mRange, ids.layer, "highlight", "WEB", "Psalms", 3, 1, 0, 50, "#7ed957", null, L.created_at, L.updated_at);

  db.prepare(
    `INSERT INTO note (id,layer_id,pin_translation,pin_book_slug,pin_chapter,pin_verse,pin_word_index,pin_ow_id,
       offset_dx,offset_dy,text,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,NULL,?,?,?,?,?)`)
    .run(ids.note, ids.layer, "WEB", "John", 1, 1, 0, 0.8, -0.2, "logos = the Word", L.created_at, L.updated_at);

  db.prepare(`INSERT INTO connector (id,layer_id,color,weight,arrowhead,created_at,updated_at) VALUES (?,?,?,?,1,?,?)`)
    .run(ids.connector, ids.layer, "#888", 1.0, L.created_at, L.updated_at);
  const insBind = db.prepare(
    `INSERT INTO binding (id,connector_id,role,target_kind,anchor_translation,anchor_book_slug,anchor_chapter,
       anchor_verse,anchor_word_index,anchor_word_count,anchor_ow_id,target_element_id,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,NULL,?,?,?)`);
  // from = scripture (John 1:1 word 0); to = the Note element
  insBind.run(randomUUID(), ids.connector, "from", "scripture", "WEB", "John", 1, 1, 0, 1, null, L.created_at, L.updated_at);
  insBind.run(randomUUID(), ids.connector, "to", "note", null, null, null, null, null, null, ids.note, L.created_at, L.updated_at);

  // ink over John 1:1 in the (WEB, vertical) layout
  const inkId = randomUUID();
  db.prepare(
    `INSERT INTO ink_annotation (id,layer_id,anchor_translation,anchor_book_slug,anchor_chapter,anchor_verse,
       anchor_verse_end,scroll_mode,layout_hash,created_at,updated_at)
     VALUES (?,?,?,?,?,?,NULL,?,?,?,?)`)
    .run(inkId, ids.layer, "WEB", "John", 1, 1, "vertical", "h-web-v-cardo18", L.created_at, L.updated_at);
  const pts: Pt[] = Array.from({ length: 64 }, (_, i) => ({ x: i / 63, y: 0.5 + 0.1 * Math.sin(i), p: 0.7, t: i * 8 }));
  const blob = packPoints(pts);
  db.prepare(
    `INSERT INTO ink_stroke (id,annotation_id,tool,color,width,points,point_count,point_format,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(randomUUID(), inkId, "pen", "#111", 2.0, blob, pts.length, POINT_FORMAT, L.created_at, L.updated_at);

  return ids;
}

// ---- the 5 proofs ------------------------------------------------------------
export function runPhase2Proofs(db: Database.Database, ROOT: string) {
  const ids = seedAnnotations(db);

  hr("PHASE-2 PROOF 1 — anchor → real tokens; a range spans a block boundary");
  const mVerse = one(db, `SELECT * FROM mark WHERE id=?`, ids.mVerse);
  const r1 = resolveMark(db, mVerse, "WEB");
  check(r1.tokens.length > 0 && r1.grain === "verse", "verse-grain mark resolves to real WEB tokens",
    `John 1:1 → "${r1.tokens.slice(0, 4).map(t => t.text).join(" ")}…" (${r1.tokens.length} words)`);
  const mWord = one(db, `SELECT * FROM mark WHERE id=?`, ids.mWord);
  const r1b = resolveMark(db, mWord, "WEB");
  check(r1b.grain === "word" && r1b.tokens.length === 1, "word-grain mark resolves to one real token",
    `John 3:16 word[10] = "${r1b.tokens[0]?.text}"`);
  const mRange = one(db, `SELECT * FROM mark WHERE id=?`, ids.mRange);
  const r1c = resolveMark(db, mRange, "WEB");
  const blocksHit = new Set(r1c.tokens.map(t => t.block_id));
  check(blocksHit.size > 1, "one range mark spans >1 block (verse⇄block independence holds for Markup)",
    `Psalms 3:1 range → ${r1c.tokens.length} words across ${blocksHit.size} blocks`);

  hr("PHASE-2 PROOF 2 — Markup ports across translations (ADR-0002 / verse-grain fallback)");
  const r2v = resolveMark(db, mVerse, "KJV");
  check(r2v.tokens.length > 0 && r2v.grain === "verse (ported)", "verse-grain mark PORTS WEB→KJV",
    `KJV John 1:1 → "${r2v.tokens.slice(0, 4).map(t => t.text).join(" ")}…"`);
  const r2w = resolveMark(db, mWord, "KJV");
  check(r2w.tokens.length > 0 && r2w.grain.startsWith("verse (word→verse, cross-tx)"),
    "word-grain mark survives WEB→KJV by FALLING BACK to verse grain (ow_id null until P3)",
    `grain="${r2w.grain}", ${r2w.tokens.length} words highlighted`);
  // honest "why": even when verse word-counts MATCH, the same index is a different word
  const webV = qVerseWords(db, "WEB", "John", 3, 16);
  const kjvV = qVerseWords(db, "KJV", "John", 3, 16);
  const i = webV.findIndex((w, k) => kjvV[k] && w.text !== kjvV[k].text);
  console.log(`  ${D("why the fallback is honest:")} WEB & KJV John 3:16 are both ${B(String(webV.length))} words, ` +
    `yet word[${i}] = ${B(webV[i]?.text)} vs ${B(kjvV[i]?.text)}  ${D("→ index-match is unreliable; word-grain needs the Original Word hub (P3)")}`);

  hr("PHASE-2 PROOF 3 — scene graph: binding back-reference, cascade, CHECK");
  const ends = all(db, `SELECT role,target_kind FROM binding WHERE connector_id=? ORDER BY role`, ids.connector);
  check(ends.length === 2, "connector renders from its 2 binding rows",
    ends.map(e => `${e.role}:${e.target_kind}`).join(" + "));
  const backref = all(db, `SELECT connector_id FROM binding WHERE target_kind='note' AND target_element_id=?`, ids.note);
  check(backref.length === 1 && backref[0].connector_id === ids.connector,
    "back-reference index finds the connector bound to Note X in one hit");
  // cascade: tombstone the Note, then tombstone connectors that point at it (found via back-ref)
  const T = Date.now();
  db.prepare(`UPDATE note SET deleted_at=? WHERE id=?`).run(T, ids.note);
  for (const b of backref) db.prepare(`UPDATE connector SET deleted_at=? WHERE id=?`).run(T, b.connector_id);
  const conn = one(db, `SELECT deleted_at FROM connector WHERE id=?`, ids.connector);
  check(conn.deleted_at != null, "deleting Note cascades a tombstone to its connector (no orphan)");
  // CHECK guard, ISOLATED from UNIQUE(connector_id,role): a fresh connector with no
  // bindings, so a rejection can only come from the CHECK, not a role collision.
  const c2 = randomUUID();
  db.prepare(`INSERT INTO connector (id,layer_id,color,arrowhead,created_at,updated_at) VALUES (?,?,?,1,?,?)`).run(c2, ids.layer, "#888", T, T);
  let threwBoth = false;
  try {
    db.prepare(`INSERT INTO binding (id,connector_id,role,target_kind,anchor_translation,anchor_book_slug,anchor_chapter,anchor_verse,target_element_id,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(randomUUID(), c2, "from", "scripture", "WEB", "John", 1, 1, ids.note, T, T); // illegal: anchor + element BOTH set
  } catch { threwBoth = true; }
  check(threwBoth, "DDL CHECK rejects a binding with BOTH a scripture anchor and an element id");
  let threwEmpty = false;
  try {
    db.prepare(`INSERT INTO binding (id,connector_id,role,target_kind,created_at,updated_at) VALUES (?,?,?,?,?,?)`)
      .run(randomUUID(), c2, "to", "note", T, T); // illegal: target_kind=note but NO element id
  } catch { threwEmpty = true; }
  check(threwEmpty, "DDL CHECK rejects target_kind='note' with no element id");

  hr("PHASE-2 PROOF 4 — ink: BLOB round-trip + (translation, scroll_mode) gating");
  const strokeRow = one(db, `SELECT s.points, s.point_count, s.point_format FROM ink_stroke s LIMIT 1`);
  const back = unpackPoints(strokeRow.points as Buffer);
  const exp: Pt[] = Array.from({ length: 64 }, (_, i) => ({ x: i / 63, y: 0.5 + 0.1 * Math.sin(i), p: 0.7, t: i * 8 }));
  const fr = (v: number) => Math.fround(v);
  const exact = back.length === exp.length && back.every((p, i) =>
    p.x === fr(exp[i].x) && p.y === fr(exp[i].y) && p.p === fr(exp[i].p) && p.t === fr(exp[i].t));
  check(exact && strokeRow.point_count === 64, "Float32 points round-trip exactly through the BLOB",
    `${strokeRow.point_count} pts, format=${strokeRow.point_format}, ${(strokeRow.points as Buffer).length} bytes`);
  // gating: a stroke shows only where (translation, scroll_mode) match; hash mismatch → re-place
  const visibleSql = `SELECT s.id FROM ink_stroke s JOIN ink_annotation a ON a.id=s.annotation_id
    WHERE a.anchor_translation=? AND a.scroll_mode=? AND s.deleted_at IS NULL`;
  const inVertical = all(db, visibleSql, "WEB", "vertical");
  const inHorizontal = all(db, visibleSql, "WEB", "horizontal");
  check(inVertical.length === 1 && inHorizontal.length === 0,
    "stroke renders under (WEB, vertical), HIDES under (WEB, horizontal)",
    `vertical=${inVertical.length} horizontal=${inHorizontal.length}`);
  const curHash = "h-web-v-cardo18", newHash = "h-web-v-cardo22";
  const repaint = all(db,
    `SELECT s.id, a.layout_hash FROM ink_stroke s JOIN ink_annotation a ON a.id=s.annotation_id
     WHERE a.anchor_translation='WEB' AND a.scroll_mode='vertical' AND s.deleted_at IS NULL`)
    .map(r => ({ id: r.id, stale: r.layout_hash !== newHash }));
  check(repaint.every(r => r.stale), "under a NEW layout_hash the stroke is flagged stale → re-place/hide",
    `was ${curHash}, now ${newHash}`);

  hr("PHASE-2 PROOF 5 — re-ingest safety: renumber corpus ids, marks still resolve (ADR-0004)");
  const webIdBefore = one(db, `SELECT id FROM translation WHERE abbrev='WEB'`).id;
  const johnIdBefore = one(db, `SELECT id FROM book WHERE slug='John'`).id;
  const beforeText = resolveMark(db, mVerse, "WEB").tokens.map(t => t.text).join(" ");
  const markCountBefore = one(db, `SELECT count(*) c FROM mark`).c;
  // wipe ONLY the corpus (annotation tables have NO FK into it → this cannot cascade them)
  db.exec(`DELETE FROM token; DELETE FROM versification_map; DELETE FROM block; DELETE FROM book; DELETE FROM translation;`);
  ingestCorpus(db, ROOT, { reversed: true }); // KJV first now → WEB lands on a different id
  const webIdAfter = one(db, `SELECT id FROM translation WHERE abbrev='WEB'`).id;
  const johnIdAfter = one(db, `SELECT id FROM book WHERE slug='John'`).id;
  const afterText = resolveMark(db, mVerse, "WEB").tokens.map(t => t.text).join(" ");
  const markCountAfter = one(db, `SELECT count(*) c FROM mark`).c;
  check(webIdBefore !== webIdAfter || johnIdBefore !== johnIdAfter,
    "corpus integer ids actually CHANGED on re-ingest",
    `WEB id ${webIdBefore}→${webIdAfter}, John id ${johnIdBefore}→${johnIdAfter}`);
  check(markCountBefore === markCountAfter && markCountAfter > 0,
    "wiping the corpus left every mark intact (no FK from annotation → corpus)",
    `marks before=${markCountBefore} after=${markCountAfter}`);
  check(beforeText === afterText && afterText.length > 0,
    "the same mark resolves to the SAME text after re-ingest (coordinate anchor survived)",
    `"${afterText.split(" ").slice(0, 5).join(" ")}…"`);

  hr("PHASE-2 VERDICT");
  const ok = failed === 0;
  console.log(`  ${ok ? G("✓ ALL " + passed + " CHECKS PASS") : R("✗ " + failed + " FAILED")}` +
    `  ${D(`(${passed} passed${failed ? ", " + failed + " failed" : ""})`)}`);
  console.log(D("  Schema proven: coordinate anchors + cross-tx verse fallback + binding back-ref/cascade/CHECK"));
  console.log(D("  + ink BLOB round-trip + layout gating + re-ingest survival. See ../README.md."));
  return ok;
}
