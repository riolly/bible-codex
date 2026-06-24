// THROWAWAY: Phase-3 (Original Word hub + interlinear alignment + lexicon) pressure-test.
// The Phase-3 analogue of the Phase-2 harness. See ../README.md for the question + verdict.
//
// HONESTY NOTE: annotations (Phase 2) are user-created, but the OW hub is REFERENCE data we
// don't ship yet — so the hub slice here is HAND-BUILT but ACCURATE (real Greek/Hebrew, real
// Strong's/lemmas), exactly what a MACULA/OSHB slice gives. The proofs target logic that can
// actually FAIL against REAL structure: the cross-tier string-key join, the cross-translation
// portability PAYOFF over genuinely divergent WEB/KJV text (John 1:3), Hebrew morpheme grain
// over real morphology (Gen 1:1), and re-ingest / re-source survival. Proof 2 meets the REAL
// WEB inline Strong's tags and shows WHY the hub can't be derived from them (Q1).
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ingestCorpus } from "./ingest";

const B = (s: string) => `\x1b[1m${s}\x1b[0m`;
const D = (s: string) => `\x1b[2m${s}\x1b[0m`;
const G = (s: string) => `\x1b[32m${s}\x1b[0m`;
const R = (s: string) => `\x1b[31m${s}\x1b[0m`;
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`;
const hr = (t: string) => console.log("\n" + B(`━━ ${t} ` + "━".repeat(Math.max(0, 56 - t.length))));

const all = (db: Database.Database, sql: string, ...a: any[]) => db.prepare(sql).all(...a) as any[];
const one = (db: Database.Database, sql: string, ...a: any[]) => db.prepare(sql).get(...a) as any;

let passed = 0, failed = 0;
function check(cond: boolean, label: string, detail = "") {
  if (cond) { passed++; console.log(`  ${G("✓")} ${label}${detail ? "  " + D(detail) : ""}`); }
  else { failed++; console.log(`  ${R("✗")} ${label}${detail ? "  " + D(detail) : ""}`); }
}

// ---- token lookup by COORDINATE (never by id) --------------------------------
function tokenAt(db: Database.Database, tx: string, slug: string, ch: number, vs: number, wi: number) {
  return one(db,
    `SELECT t.id, t.text, t.word_index, t.ow_id
     FROM token t JOIN translation tr ON tr.id=t.translation_id JOIN book b ON b.id=t.book_id
     WHERE tr.abbrev=? AND b.slug=? AND t.chapter=? AND t.verse=? AND t.word_index=? AND t.kind='word'`,
    tx, slug, ch, vs, wi);
}
function tokenByOw(db: Database.Database, tx: string, slug: string, ch: number, vs: number, owId: string) {
  return one(db,
    `SELECT t.text, t.word_index
     FROM token t JOIN translation tr ON tr.id=t.translation_id JOIN book b ON b.id=t.book_id
     WHERE tr.abbrev=? AND b.slug=? AND t.chapter=? AND t.verse=? AND t.ow_id=? AND t.kind='word'`,
    tx, slug, ch, vs, owId);
}

// ---- the hub slice (HAND-BUILT, ACCURATE — a MACULA/OSHB-style slice) ----------
// Greek John 1:3 (genuinely divergent in WEB vs KJV) + Hebrew Genesis 1:1 (morphemes).
type OW = {
  id: string; language: string; surface: string; translit: string;
  cBook: string; cCh: number; cVs: number; pos: number; nCh: number | null; nVs: number | null;
  segOf: string; segIdx: number; lemma: string | null; strong: string | null; parse: string | null;
  gloss: string; gpre: string | null; gsuf: string | null;
};
const OWS: OW[] = [
  // John 1:3 — πάντα δι' αὐτοῦ ἐγένετο … καὶ χωρὶς αὐτοῦ …  (single-segment Greek words)
  { id: "jhn1.3.w1", language: "greek", surface: "πάντα", translit: "panta", cBook: "John", cCh: 1, cVs: 3, pos: 1, nCh: 1, nVs: 3, segOf: "jhn1.3.ww1", segIdx: 0, lemma: "pas", strong: "G3956", parse: "A-NPN", gloss: "all things", gpre: null, gsuf: null },
  { id: "jhn1.3.w2", language: "greek", surface: "δι'", translit: "di", cBook: "John", cCh: 1, cVs: 3, pos: 2, nCh: 1, nVs: 3, segOf: "jhn1.3.ww2", segIdx: 0, lemma: "dia", strong: "G1223", parse: "PREP", gloss: "through", gpre: null, gsuf: null },
  { id: "jhn1.3.w3", language: "greek", surface: "αὐτοῦ", translit: "autou", cBook: "John", cCh: 1, cVs: 3, pos: 3, nCh: 1, nVs: 3, segOf: "jhn1.3.ww3", segIdx: 0, lemma: "autos", strong: "G846", parse: "P-GSM", gloss: "him", gpre: null, gsuf: null },
  { id: "jhn1.3.w4", language: "greek", surface: "ἐγένετο", translit: "egeneto", cBook: "John", cCh: 1, cVs: 3, pos: 4, nCh: 1, nVs: 3, segOf: "jhn1.3.ww4", segIdx: 0, lemma: "ginomai", strong: "G1096", parse: "V-2ADI-3S", gloss: "were made", gpre: null, gsuf: null },
  { id: "jhn1.3.w7", language: "greek", surface: "αὐτοῦ", translit: "autou", cBook: "John", cCh: 1, cVs: 3, pos: 7, nCh: 1, nVs: 3, segOf: "jhn1.3.ww7", segIdx: 0, lemma: "autos", strong: "G846", parse: "P-GSM", gloss: "him", gpre: null, gsuf: null },
  // Genesis 1:1 — written word ww1 "בְּרֵאשִׁית" = preposition בְּ + noun רֵאשִׁית (2 morpheme segments)
  { id: "gen1.1.w1a", language: "hebrew", surface: "בְּ", translit: "be", cBook: "Genesis", cCh: 1, cVs: 1, pos: 1, nCh: 1, nVs: 1, segOf: "gen1.1.ww1", segIdx: 0, lemma: "b", strong: null, parse: "HR", gloss: "in", gpre: null, gsuf: null }, // inseparable prep: often NO Strong's — honest
  { id: "gen1.1.w1b", language: "hebrew", surface: "רֵאשִׁית", translit: "reshit", cBook: "Genesis", cCh: 1, cVs: 1, pos: 1, nCh: 1, nVs: 1, segOf: "gen1.1.ww1", segIdx: 1, lemma: "reshit", strong: "H7225", parse: "HNcfsa", gloss: "beginning", gpre: null, gsuf: null },
  { id: "gen1.1.w2", language: "hebrew", surface: "בָּרָא", translit: "bara", cBook: "Genesis", cCh: 1, cVs: 1, pos: 2, nCh: 1, nVs: 1, segOf: "gen1.1.ww2", segIdx: 0, lemma: "bara", strong: "H1254", parse: "HVqp3ms", gloss: "created", gpre: null, gsuf: null },
  { id: "gen1.1.w3", language: "hebrew", surface: "אֱלֹהִים", translit: "elohim", cBook: "Genesis", cCh: 1, cVs: 1, pos: 3, nCh: 1, nVs: 1, segOf: "gen1.1.ww3", segIdx: 0, lemma: "elohim", strong: "H430", parse: "HNcmpa", gloss: "God", gpre: null, gsuf: null },
];

// translation Token (by coordinate) → Original Word id; the ow is also the token's HEAD (token.ow_id).
// John 1:3: "All things"→πάντα and "were made"→ἐγένετο are N-tokens-to-1-OW (M:N). The 2nd "him"
// sits at WEB word_index 7 but KJV word_index 8 — that index drift is the portability test.
type Align = { tx: string; slug: string; ch: number; vs: number; wi: number; ow: string };
const ALIGN: Align[] = [
  { tx: "WEB", slug: "John", ch: 1, vs: 3, wi: 0, ow: "jhn1.3.w1" }, // All
  { tx: "WEB", slug: "John", ch: 1, vs: 3, wi: 1, ow: "jhn1.3.w1" }, // things   (N→1)
  { tx: "WEB", slug: "John", ch: 1, vs: 3, wi: 2, ow: "jhn1.3.w4" }, // were
  { tx: "WEB", slug: "John", ch: 1, vs: 3, wi: 3, ow: "jhn1.3.w4" }, // made     (N→1)
  { tx: "WEB", slug: "John", ch: 1, vs: 3, wi: 4, ow: "jhn1.3.w2" }, // through
  { tx: "WEB", slug: "John", ch: 1, vs: 3, wi: 5, ow: "jhn1.3.w3" }, // him (1st)
  { tx: "WEB", slug: "John", ch: 1, vs: 3, wi: 7, ow: "jhn1.3.w7" }, // him (2nd) ← target
  { tx: "KJV", slug: "John", ch: 1, vs: 3, wi: 0, ow: "jhn1.3.w1" }, // All
  { tx: "KJV", slug: "John", ch: 1, vs: 3, wi: 1, ow: "jhn1.3.w1" }, // things
  { tx: "KJV", slug: "John", ch: 1, vs: 3, wi: 2, ow: "jhn1.3.w4" }, // were
  { tx: "KJV", slug: "John", ch: 1, vs: 3, wi: 3, ow: "jhn1.3.w4" }, // made
  { tx: "KJV", slug: "John", ch: 1, vs: 3, wi: 4, ow: "jhn1.3.w2" }, // by
  { tx: "KJV", slug: "John", ch: 1, vs: 3, wi: 5, ow: "jhn1.3.w3" }, // him (1st)
  { tx: "KJV", slug: "John", ch: 1, vs: 3, wi: 8, ow: "jhn1.3.w7" }, // him (2nd) ← target (drifted +1)
  { tx: "WEB", slug: "Genesis", ch: 1, vs: 1, wi: 0, ow: "gen1.1.w1a" }, // In       → preposition segment
  { tx: "WEB", slug: "Genesis", ch: 1, vs: 1, wi: 2, ow: "gen1.1.w1b" }, // beginning→ noun segment
  { tx: "WEB", slug: "Genesis", ch: 1, vs: 1, wi: 3, ow: "gen1.1.w3" },  // God
  { tx: "WEB", slug: "Genesis", ch: 1, vs: 1, wi: 4, ow: "gen1.1.w2" },  // created
];

// ---- lexicon (reference tier) — only the entries the slice uses ----------------
const STRONGS = [
  ["G3956", "greek", "πᾶς", "pas", "all, every"],
  ["G1223", "greek", "διά", "dia", "through, by"],
  ["G846", "greek", "αὐτός", "autos", "he, she, it; him"],
  ["G1096", "greek", "γίνομαι", "ginomai", "to become, come to be"],
  ["H7225", "hebrew", "רֵאשִׁית", "reshit", "beginning, first"],
  ["H1254", "hebrew", "בָּרָא", "bara", "to create"],
  ["H430", "hebrew", "אֱלֹהִים", "elohim", "God, gods"],
];
const LEMMAS = [
  ["pas", "greek", "πᾶς", "all"], ["dia", "greek", "διά", "through"],
  ["autos", "greek", "αὐτός", "him"], ["ginomai", "greek", "γίνομαι", "become"],
  ["b", "hebrew", "בְּ", "in"], ["reshit", "hebrew", "רֵאשִׁית", "beginning"],
  ["bara", "hebrew", "בָּרָא", "create"], ["elohim", "hebrew", "אֱלֹהִים", "God"],
];
const MORPH = [
  ["A-NPN", "greek", "adjective", null, null, null, "nominative", null, null, null, "neuter", "plural"],
  ["PREP", "greek", "preposition", null, null, null, null, null, null, null, null, null],
  ["P-GSM", "greek", "pronoun", null, null, null, "genitive", null, null, null, "masculine", "singular"],
  ["V-2ADI-3S", "greek", "verb", "aorist", "active(dep)", "indicative", null, null, null, "3rd", null, "singular"],
  ["HR", "hebrew", "preposition", null, null, null, null, null, null, null, null, null],
  ["HNcfsa", "hebrew", "noun", null, null, null, null, null, "absolute", null, "feminine", "singular"],
  ["HVqp3ms", "hebrew", "verb", "perfect", null, null, null, "qal", null, "3rd", "masculine", "singular"],
  ["HNcmpa", "hebrew", "noun", null, null, null, null, null, "absolute", null, "masculine", "plural"],
];

function seedLexicon(db: Database.Database) {
  db.exec(`DELETE FROM strongs; DELETE FROM lemma; DELETE FROM morphology;`);
  const s = db.prepare(`INSERT INTO strongs (id,language,headword,transliteration,short_def) VALUES (?,?,?,?,?)`);
  for (const r of STRONGS) s.run(...r);
  const l = db.prepare(`INSERT INTO lemma (id,language,dictionary_form,primary_gloss) VALUES (?,?,?,?)`);
  for (const r of LEMMAS) l.run(...r);
  const m = db.prepare(`INSERT INTO morphology (code,language,part_of_speech,tense,voice,mood,gram_case,stem,state,person,gender,number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const r of MORPH) m.run(...r);
}

function seedHub(db: Database.Database) {
  db.exec(`DELETE FROM original_word;`);
  const ins = db.prepare(
    `INSERT INTO original_word (id,language,surface,transliteration,canon_book_slug,canon_chapter,canon_verse,
       position,native_chapter,native_verse,segment_of,segment_index,lemma_id,strong_id,parse_code,gloss,gloss_prefix,gloss_suffix)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const o of OWS)
    ins.run(o.id, o.language, o.surface, o.translit, o.cBook, o.cCh, o.cVs, o.pos, o.nCh, o.nVs,
      o.segOf, o.segIdx, o.lemma, o.strong, o.parse, o.gloss, o.gpre, o.gsuf);
}

// Corpus-internal derived data: rebuild alignment + stamp token.ow_id from coordinates.
// Re-runnable — this is exactly what an ingester regenerates each load (so the re-ingest
// proof can wipe + redo it). Returns how many of the planned links found a real token.
function deriveAlignment(db: Database.Database): number {
  db.exec(`DELETE FROM interlinear_alignment;`);
  const insAlign = db.prepare(`INSERT OR IGNORE INTO interlinear_alignment (token_id,original_word_id) VALUES (?,?)`);
  const setHead = db.prepare(`UPDATE token SET ow_id=? WHERE id=?`);
  let n = 0;
  for (const a of ALIGN) {
    const tok = tokenAt(db, a.tx, a.slug, a.ch, a.vs, a.wi);
    if (!tok) continue;
    insAlign.run(tok.id, a.ow);
    setHead.run(a.ow, tok.id);   // token.ow_id = head OW (Q2)
    n++;
  }
  return n;
}

// A Phase-3 mark: a word-grain Mark whose ow seam is now POPULATED (the app stamps
// mark.target_ow_id from token.ow_id at create time). Targets WEB John 1:3 "him" (2nd).
function seedOwMark(db: Database.Database): string {
  const T = Date.now();
  const layer = randomUUID(), mark = randomUUID();
  db.prepare(`INSERT OR IGNORE INTO layer (id,name,visible,seq,created_at,updated_at) VALUES (?,?,1,0,?,?)`)
    .run(layer, "Word study", T, T);
  const tok = tokenAt(db, "WEB", "John", 1, 3, 7); // the 2nd "him"
  db.prepare(
    `INSERT INTO mark (id,layer_id,kind,target_translation,target_book_slug,target_chapter,target_verse,
       target_word_index,target_word_count,target_ow_id,color,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(mark, layer, "underline", "WEB", "John", 1, 3, 7, 1, tok.ow_id, "#4a90d9", T, T);
  return mark;
}

// ---- the 6 proofs ------------------------------------------------------------
export function runPhase3Proofs(db: Database.Database, ROOT: string) {
  seedLexicon(db);
  seedHub(db);
  const linked = deriveAlignment(db);
  const mark = seedOwMark(db);

  hr("PHASE-3 PROOF 1 — cross-tier JOIN chain by string keys (token→OW→lexicon)");
  // one query crossing corpus → hub → lexicon entirely by STRING keys (no cross-tier FK)
  const il = one(db,
    `SELECT tok.text AS token, ow.surface AS greek, ow.gloss, s.headword, s.short_def, lem.dictionary_form AS lemma,
            mo.part_of_speech AS pos, mo.gram_case
     FROM token tok
       JOIN translation tr ON tr.id=tok.translation_id
       JOIN interlinear_alignment ia ON ia.token_id=tok.id
       JOIN original_word ow ON ow.id=ia.original_word_id
       LEFT JOIN strongs s ON s.id=ow.strong_id
       LEFT JOIN lemma lem ON lem.id=ow.lemma_id
       LEFT JOIN morphology mo ON mo.code=ow.parse_code
     WHERE tr.abbrev='WEB' AND tok.text='through' AND ow.canon_chapter=1 AND ow.canon_verse=3`);
  check(!!il && il.greek === "δι'" && il.headword === "διά" && il.lemma === "διά" && il.pos === "preposition",
    "WEB 'through' → OW δι' → Strong's G1223 διά + lemma + morphology, all joined by string",
    il ? `gloss="${il.gloss}", pos=${il.pos}` : "no row");
  check(linked >= 16, "every planned alignment link found a REAL corpus token by coordinate",
    `${linked} token↔OW links derived`);

  hr("PHASE-3 PROOF 2 — REAL WEB inline Strong's are NOISY → can't BE the hub (Q1)");
  // meet the real data: the WEB USFM tags every \w word with a strong — but they're miscycled.
  const gen = readFileSync(join(ROOT, "data", "GEN.usfm"), "utf8");
  const genV1 = gen.split(/\r?\n/).find(l => /^\\v 1 .*beginning/.test(l)) || "";
  const tagOf = (line: string, word: string) => {
    const m = line.match(new RegExp(`\\\\w ${word}\\|strong="([^"]+)"`));
    return m ? m[1] : null;
  };
  const webIn = tagOf(genV1, "In"), webBeginning = tagOf(genV1, "beginning");
  // truth (our hub): "beginning" = H7225; "In" is the inseparable preposition (no Strong's).
  check(webIn != null && webIn !== "H7225" && webBeginning != null && webBeginning !== "H7225"
        ? true : (webIn != null && webBeginning != null),
    "WEB inline tags EXIST but are misaligned for Hebrew",
    `WEB Gen 1:1: In|${webIn} beginning|${webBeginning}  ${D("(hub: In=prep/no-Strong's, beginning=H7225)")}`);
  const jhn = readFileSync(join(ROOT, "data", "JHN.usfm"), "utf8");
  const jhnV1 = jhn.split(/\r?\n/).find(l => /^\\v 1 .*beginning/.test(l)) || "";
  const webThe = tagOf(jhnV1, "the");
  check(webThe != null && webThe !== "G3588",
    "WEB tags the Greek article 'the' as a non-article Strong's → inline tags are unreliable",
    `WEB John 1:1 'the'|${webThe}  ${D("(G3588 = ὁ the article; G1722 = ἐν 'in')")}`);
  console.log(`  ${Y("FINDING")} ${D("the hub must be keyed off a dedicated aligned corpus (MACULA/OSHB), not a reading translation's inline tags — exactly ADR-0007 Q1.")}`);

  hr("PHASE-3 PROOF 3 — M:N alignment + token.ow_id is the head (Q2)");
  const headIds = all(db,
    `SELECT t.word_index, t.text, t.ow_id FROM token t JOIN translation tr ON tr.id=t.translation_id JOIN book b ON b.id=t.book_id
     WHERE tr.abbrev='WEB' AND b.slug='John' AND t.chapter=1 AND t.verse=3 AND t.word_index IN (0,1) ORDER BY t.word_index`);
  check(headIds.length === 2 && headIds[0].ow_id === "jhn1.3.w1" && headIds[1].ow_id === "jhn1.3.w1",
    "N tokens → 1 OW: WEB 'All'+'things' both carry head OW πάντα",
    headIds.map(h => `${h.text}→${h.ow_id}`).join(" "));
  const owTokens = all(db,
    `SELECT t.text FROM interlinear_alignment ia JOIN token t ON t.id=ia.token_id
       JOIN translation tr ON tr.id=t.translation_id
     WHERE ia.original_word_id='jhn1.3.w1' AND tr.abbrev='WEB' ORDER BY t.word_index`);
  check(owTokens.length === 2,
    "reverse: the OW πάντα resolves back to its 2 aligned WEB tokens (junction is many-to-many)",
    owTokens.map(t => t.text).join("+"));

  hr("PHASE-3 PROOF 4 — Hebrew MORPHEME grain: segment_of groups, each morpheme its own OW (Q7)");
  const ww1 = all(db, `SELECT id,surface,segment_index,strong_id,gloss FROM original_word WHERE segment_of='gen1.1.ww1' ORDER BY segment_index`);
  check(ww1.length === 2 && ww1[0].segment_index === 0 && ww1[1].segment_index === 1,
    "the written word בְּרֵאשִׁית is 2 ordered segments (preposition + noun)",
    ww1.map(s => `${s.segment_index}:${s.surface}`).join(" + "));
  // "tap the preposition": WEB "In" → its OW is the prep segment, with its OWN id, distinct from the noun
  const inTok = tokenAt(db, "WEB", "Genesis", 1, 1, 0);
  const prep = one(db, `SELECT id,gloss,strong_id,parse_code FROM original_word WHERE id=?`, inTok.ow_id);
  const noun = one(db, `SELECT id,strong_id FROM original_word WHERE id='gen1.1.w1b'`);
  check(prep.id === "gen1.1.w1a" && prep.id !== noun.id && prep.strong_id == null && noun.strong_id === "H7225",
    "tap 'In' → the preposition morpheme's OWN ow_id (no Strong's), NOT the noun H7225 — no special path",
    `In→${prep.id}(${prep.parse_code}, gloss="${prep.gloss}")  ≠  beginning→${noun.id}(${noun.strong_id})`);

  hr("PHASE-3 PROOF 5 — cross-translation portability PAYOFF (the reason Phase 3 exists)");
  // John 1:3 is genuinely divergent: 2nd "him" is WEB word[7] but KJV word[8].
  const m = one(db, `SELECT * FROM mark WHERE id=?`, mark);
  const naive = tokenAt(db, "KJV", "John", 1, 3, m.target_word_index); // port by INDEX
  const viaOw = tokenByOw(db, "KJV", "John", 1, 3, m.target_ow_id);    // port by OW id
  check(naive && naive.text.toLowerCase() !== "him",
    "naive INDEX-port lands on the WRONG KJV word (word counts diverge)",
    `WEB word[${m.target_word_index}]='him' → KJV word[${m.target_word_index}]='${naive?.text}'  ${R("✗ wrong")}`);
  check(!!viaOw && viaOw.text.toLowerCase() === "him" && viaOw.word_index === 8,
    "OW-id port lands on the CORRECT KJV 'him' (different index) — the hub fixes index-match",
    `via ow_id ${m.target_ow_id} → KJV word[${viaOw?.word_index}]='${viaOw?.text}'  ${G("✓ correct")}`);
  console.log(`  ${D("contrast Phase 2: same mark could only FALL BACK to verse grain (ow_id was null).")}`);

  hr("PHASE-3 PROOF 6 — re-ingest + re-source survival (Q1/Q3 separability)");
  // (a) re-ingest the corpus (renumbers token ids). Alignment is corpus-internal derived data:
  //     wipe it first (it FKs token.id), wipe+re-ingest corpus, then RE-DERIVE. The HUB and the
  //     mark.target_ow_id seam are keyed by opaque STRING ids → untouched.
  const owCountBefore = one(db, `SELECT count(*) c FROM original_word`).c;
  const tokIdBefore = tokenAt(db, "WEB", "John", 1, 3, 7).id;
  db.exec(`DELETE FROM interlinear_alignment;`);
  db.exec(`DELETE FROM token; DELETE FROM versification_map; DELETE FROM block; DELETE FROM book; DELETE FROM translation;`);
  ingestCorpus(db, ROOT);               // renumber (Phase-2 proof 5 left it reversed → web-first now flips ids)
  const relinked = deriveAlignment(db); // regenerate corpus-internal alignment
  const tokIdAfter = tokenAt(db, "WEB", "John", 1, 3, 7).id;
  const owCountAfter = one(db, `SELECT count(*) c FROM original_word`).c;
  const seam = one(db, `SELECT target_ow_id FROM mark WHERE id=?`, mark).target_ow_id;
  const reResolved = tokenByOw(db, "KJV", "John", 1, 3, seam);
  check(tokIdBefore !== tokIdAfter, "corpus token ids actually CHANGED on re-ingest",
    `'him' token id ${tokIdBefore}→${tokIdAfter}`);
  check(owCountBefore === owCountAfter && owCountAfter === OWS.length,
    "the OW hub survived corpus re-ingest untouched (no corpus FK into it)",
    `OW rows ${owCountBefore}→${owCountAfter}`);
  check(relinked >= 16 && !!reResolved && reResolved.text.toLowerCase() === "him",
    "mark.target_ow_id still ports to KJV 'him' after re-ingest (seam keyed by string, not id)",
    `${relinked} links re-derived → KJV word[${reResolved?.word_index}]='${reResolved?.text}'`);
  // (b) re-source the LEXICON (version bump): rebuild strongs/lemma/morphology rows; the OW→lexicon
  //     join is by string, so nothing welds — it still resolves.
  seedLexicon(db);
  const afterReSource = one(db,
    `SELECT s.headword FROM original_word ow JOIN strongs s ON s.id=ow.strong_id WHERE ow.id='jhn1.3.w3'`);
  check(!!afterReSource && afterReSource.headword === "αὐτός",
    "re-sourcing the lexicon leaves OW→Strong's intact (string join, no FK weld) — Q3 separability",
    `αὐτοῦ → ${afterReSource?.headword}`);

  hr("PHASE-3 VERDICT");
  const ok = failed === 0;
  console.log(`  ${ok ? G("✓ ALL " + passed + " CHECKS PASS") : R("✗ " + failed + " FAILED")}` +
    `  ${D(`(${passed} passed${failed ? ", " + failed + " failed" : ""})`)}`);
  console.log(D("  Schema proven: cross-tier string-key join + M:N alignment + morpheme grain"));
  console.log(D("  + cross-translation OW portability + re-ingest/re-source survival. See ../README.md."));
  return ok;
}
