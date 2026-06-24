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

**Branch:** logic prototype (data-shape question, not UI). Per `/prototype` skill.

## Run

```bash
pnpm install
pnpm ingest     # build scratch DB, print the Phase-1 report + the Phase-2 proofs
pnpm repl       # same, then an interactive  ref>  lookup (e.g. "Psalms 3:1")
```

Real text = World English Bible (public domain), `data/{GEN,PSA,JHN}.usfm`, plus a small
public-domain **KJV** John slice `data/JHN.kjv.usfm` — a 2nd translation, so the
cross-translation portability proof (Phase 2) has real divergent tokenization to test.
Scratch DB = `PROTOTYPE-wipe-me.sqlite` (git-ignored, rebuilt each run).

## What's keepable vs throwaway

- **Keep:** [`src/usfm.ts`](src/usfm.ts) — the pure USFM→rows ingester (lifts into the real app).
  From [`src/anno.ts`](src/anno.ts): `packPoints`/`unpackPoints` (the ink BLOB codec) and
  `resolveMark` (anchor→tokens with cross-translation verse-grain fallback). The coordinate-join
  shape in [`src/ingest.ts`](src/ingest.ts). Partly [`src/render.ts`](src/render.ts) —
  spacing-from-token-kind (proves Q1).
- **Throwaway:** `src/main.ts`, `src/ingest.ts` + the proofs in `src/anno.ts` (harness wiring),
  `schema.sql`, `data/`.

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

**Next:** both phases validated. This prototype can be deleted once `src/usfm.ts` (+ the ink
codec, `resolveMark`, and the coordinate-join shape) are lifted into the real RN ingester. The
remaining real-world unknown is unchanged: **on-device pen feel** (a tablet job, not a schema job).
