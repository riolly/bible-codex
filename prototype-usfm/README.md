# prototype-usfm — THROWAWAY

**Question 1 (Phase 1):** does the [`schema.dbml`](../schema.dbml) reading corpus survive
ingesting **real** USFM? Map real markers (`\p \q1-4 \d \mt \ms \v \c`, inline `\w \wj \qs
\f \x`) onto `block` / `token` / `versification_map` rows, then check the model holds —
verse⇄block independence, poetry indent, native↔canonical numbering, the Phase-3 Strong's
seam — and surface whatever the schema can't represent.

**Question 2 (Phase 2):** does the [`schema.dbml`](../schema.dbml) **annotation layer**
(Markup + Ink) hold against the real corpus — do coordinate anchors resolve, does Markup
**port across translations** (with verse-grain fallback), does the binding scene graph
cascade, does ink round-trip + gate by layout, and do marks **survive a corpus re-ingest**?

**Question 3 (Phase 3):** does the [`schema.dbml`](../schema.dbml) **Original Word hub +
interlinear alignment + lexicon** hold — does the cross-tier **string-key join** (token →
OW → Strong's/lemma/morphology) resolve, does the M:N junction + `token.ow_id` head work,
does word-grain Markup **port across translations *correctly* via `ow_id`** where naive
index-match fails, does Hebrew **morpheme-grain** segmentation model real morphology, and do
the hub + seam **survive a corpus re-ingest and a lexicon re-source**? Plus: can the hub be
derived from a reading translation's inline `\w strong=` tags (Q1)?

**Branch:** logic prototype (data-shape question, not UI). Per `/prototype` skill.

## Run

```bash
pnpm install
pnpm ingest     # build scratch DB, print the Phase-1 report + Phase-2 + Phase-3 proofs
pnpm repl       # same, then an interactive  ref>  lookup (e.g. "Psalms 3:1")
```

Real text = World English Bible (public domain), `data/{GEN,PSA,JHN}.usfm`, plus a small
public-domain **KJV** John slice `data/JHN.kjv.usfm` — a 2nd translation, so the
cross-translation portability proofs (Phase 2 + 3) have real divergent tokenization to test
(John 1:3 genuinely differs in word count/order). The Phase-3 **Original Word hub** slice
(John 1:3 Greek + Genesis 1:1 Hebrew, real Strong's/lemmas/morphology) is **hand-built but
accurate** — a stand-in for a MACULA/OSHB corpus we don't ship yet — because the hub is
reference data, not user data. Scratch DB = `PROTOTYPE-wipe-me.sqlite` (git-ignored, rebuilt
each run).

## What's keepable vs throwaway

- **Keep:** [`src/usfm.ts`](src/usfm.ts) — the pure USFM→rows ingester (lifts into the real app).
  From [`src/anno.ts`](src/anno.ts): `packPoints`/`unpackPoints` (the ink BLOB codec) and
  `resolveMark` (anchor→tokens with cross-translation verse-grain fallback). The coordinate-join
  shape in [`src/ingest.ts`](src/ingest.ts). From [`src/phase3.ts`](src/phase3.ts): the
  cross-tier string-key **join chain** and the `ow_id` **portability resolver** (`tokenByOw`) —
  the shape the real reverse-interlinear + word-grain Markup port lifts from. Partly
  [`src/render.ts`](src/render.ts) — spacing-from-token-kind (proves Q1).
- **Throwaway:** `src/main.ts`, `src/ingest.ts` + the proofs in `src/anno.ts` / `src/phase3.ts`
  (harness wiring + the hand-built hub fixture), `schema.sql`, `data/`.

## Phase-1 verdict

**The Phase-1 schema holds against real USFM.** Ingested 3 WEB books → 6,644 blocks,
113,756 tokens, all under `foreign_keys=ON` (referential integrity passed). Round-trips
back to correctly-typeset prose + poetry from the rows alone.

**Validated:**
- **Q1 (drop space tokens):** spacing reconstructed from token *kind* at render — Genesis prose
  and Psalm 3 poetry render correctly with **no stored spaces**.
- **Q2 (verse ⇄ block independence):** **2,573** verses span >1 block (poetry), **535** blocks
  span >1 verse (prose). The membership partition handles both; verse-as-storage-unit would die
  here. (Psalms 3:1 = `poetry/indent1 + poetry/indent2`.)
- **Q3 (sparse versification):** `versification_map` = **0 rows** for WEB — English ≈ canonical;
  the real divergence is Hebrew/LXX, correctly deferred to Phase 3.
- **ADR-0004 (presentation by semantic key):** a poetry block in Psalms resolves
  `font=Gentium Plus` (book scope) + `indent_step=1.5` (genre scope) using **only** genre/book
  keys, never `token.id`.
- **Anchor-by-coordinate:** `Genesis 1:1 word[0] = "In"` via pure coordinate lookup.
- **Phase-3 seam has real data:** **80,710** `\w` words carry Strong's numbers in source — the
  `ow_id` seam can be populated from this same USFM when Phase 3 arrives.

**Findings folded back / needing a decision:**
1. **FIXED — `block` needed a `chapter` column** (`block.seq` is per-chapter). Added to
   `../schema.dbml`.
2. **RESOLVED — pre-verse content** (psalm titles `\d`, book titles `\mt`, sections `\ms`):
   1,107 word tokens with no verse. **`token.verse` is now nullable** (NULL = non-verse content;
   addressed via Block). Folded into `../schema.dbml` + `../CONTEXT.md`.
3. **Phase-2/3 — character-style spans** with no schema slot: words-of-Jesus `\wj` (459),
   Selah `\qs` (71). Inline styles over a token range — likely a later token-style attribute or
   a Markup-like span, not Phase 1.
4. **Phase-4 — editorial cross-references** `\x` (33) are present in USFM → a real ingest source
   for the Phase-4 `cross_reference` table.
5. Footnotes `\f` (144) extracted cleanly; not tokens. ✓

## Phase-2 verdict (annotation layer)

**The Phase-2 schema HOLDS — all 16 checks pass, no structural change needed** (contrast
Phase 1, which forced `block.chapter` + nullable `token.verse`). The harness seeds Markup
(Layer / Mark / Note / Connector / Binding) + Ink against the real corpus, then proves:

1. **Anchor → real tokens.** Verse- and word-grain marks resolve purely by coordinate; one
   range mark over **Psalms 3:1 spans 2 blocks** — verse⇄block independence holds for Markup too.
2. **Markup ports across translations (ADR-0002).** A verse-grain mark created in WEB
   re-renders in KJV; a word-grain mark **survives by falling back to verse grain** (`ow_id`
   null until P3). Honest limit shown: WEB & KJV John 3:16 are **both 25 words yet word[11] is
   `born` vs `begotten`** → index-match is unreliable; word-grain genuinely needs the Original
   Word hub.
3. **Scene graph (ADR-0003).** A connector renders from its 2 `binding` rows; the
   `(target_kind, target_element_id)` **back-reference** finds it in one hit; deleting the Note
   **cascades a tombstone** to the connector; the `binding` **CHECK** — isolated from
   `UNIQUE(connector_id,role)` on a fresh connector — rejects **both** malformed shapes
   (both-targets-set, and element-kind-with-no-id).
4. **Ink (Q5/Q6).** 64 `Float32` points **round-trip exactly** through the BLOB (1024 bytes);
   the stroke renders under `(WEB, vertical)`, **hides** under `(WEB, horizontal)`, and is
   flagged **stale** under a new `layout_hash`.
5. **Re-ingest safety (ADR-0004/0006).** Wiping + re-ingesting the corpus renumbers integer ids
   (WEB `1→2`, John `3→1`) yet **every mark survives** and resolves to the **same text** —
   because annotations carry **no FK into the corpus**, only coordinates.

**Findings (no schema change — all confirmations):**
- The `binding` **CHECK is load-bearing** and must live in the real SQLite DDL (DBML can't
  express it). Proven to reject both malformed shapes once isolated from the UNIQUE constraint —
  a weak first version of this test was masked by the UNIQUE collision; fixed.
- **Cascade is application logic**, not a DB FK cascade (by design — soft-delete tombstones); the
  back-reference index is what makes it cheap.
- **Cross-translation fallback is resolver policy**, not schema — the schema only carries `ow_id`
  (null) + the coordinate. Confirms ADR-0005.

## Phase-3 verdict (Original Word hub + lexicon)

**The Phase-3 schema HOLDS — all 14 checks pass, no structural change needed** (like Phase 2;
contrast Phase 1). The hub is reference data we don't ship yet, so the harness seeds a small
**accurate hand-built slice** (John 1:3 Greek + Genesis 1:1 Hebrew, real Strong's / lemmas /
morphology) plus interlinear alignment to the **real** WEB + KJV tokens, then proves:

1. **Cross-tier join by string keys.** One query crosses corpus → hub → lexicon (`token →
   interlinear_alignment → original_word → strongs + lemma + morphology`) entirely by **string
   keys**, no cross-tier FK: WEB `through` → OW δι' → `G1223 διά`, preposition. (Q3)
2. **Real inline Strong's are noise — can't BE the hub.** Meeting the real data: WEB tags Gen 1:1
   `In|H8064` (H8064 = *heavens*, wrong) and the Greek article `the|G1722` (G1722 = *ἐν*, wrong).
   The tags **exist but are systematically miscycled** → the hub must key off a dedicated aligned
   corpus (MACULA/OSHB), exactly **ADR-0007 Q1**. (A finding, not a fix.)
3. **M:N alignment + `token.ow_id` head (Q2).** WEB `All`+`things` both carry head OW πάντα
   (N tokens → 1 OW); the junction resolves πάντα back to **both** tokens (many-to-many).
4. **Hebrew morpheme grain (Q7).** The written word בְּרֵאשִׁית is **2 ordered segments** sharing
   `segment_of` (preposition בְּ + noun רֵאשִׁית); tapping WEB `In` resolves to the preposition
   morpheme's **own `ow_id`** (no Strong's — honest: inseparable prefixes lack one), *not* the
   noun `H7225` — one uniform entity, no special path.
5. **Cross-translation portability PAYOFF — the reason Phase 3 exists.** John 1:3 genuinely
   diverges: the 2nd `him` is WEB word[7] but KJV word[8]. A word-grain mark ported by **index**
   lands on KJV `without` (**wrong**); ported by **`ow_id`** it lands on KJV `him` (**correct**).
   This is precisely what Phase 2 could only *fall back to verse grain* for.
6. **Re-ingest + re-source survival (Q1/Q3).** Wiping + re-ingesting the corpus churns token ids
   (`91616→91511`) yet the **OW hub is untouched** (no corpus FK into it) and the
   `mark.target_ow_id` seam **still ports to KJV `him`** after re-deriving alignment; re-sourcing
   the whole lexicon leaves OW→Strong's intact (string join, no FK weld).

**Findings (no schema change — all confirmations):**
- **Alignment is corpus-internal derived data**, regenerated each ingest (it FKs `token.id`, so it
  must be wiped/rebuilt with the corpus) — while the hub + the annotation `ow_id` seam, keyed by
  **opaque string ids**, survive untouched. This split is the whole point of Q3's tiering.
- **The hub cannot be bootstrapped from the reading corpus's inline tags** (Proof 2) — a concrete,
  real-data vindication of choosing an external word-id corpus (Q1). Sourcing a redistributable one
  (MACULA / STEPBible / OSHB+MorphGNT) is the open **non-schema** risk.
- **Portability is resolver policy over a `ow_id` schema column** — the schema carries the opaque
  id + coordinate; the resolver does the rest. Confirms ADR-0005/0007.

**Next:** all three phases validated. This prototype can be deleted once `src/usfm.ts` (+ the ink
codec, `resolveMark`, the coordinate-join shape, and the Phase-3 string-key join + `ow_id`
portability resolver) are lifted into the real RN ingester. The remaining real-world unknowns are
unchanged and **non-schema**: **on-device pen feel** (a tablet job) and **sourcing a
redistributable interlinear corpus** (a licensing job).
