# prototype-usfm — THROWAWAY

**Question:** does the Phase-1 [`schema.dbml`](../schema.dbml) survive ingesting **real** USFM?
Map real markers (`\p \q1-4 \d \mt \ms \v \c`, inline `\w \wj \qs \f \x`) onto
`block` / `token` / `versification_map` rows, then check the model holds — verse⇄block
independence, poetry indent, native↔canonical numbering, the Phase-3 Strong's seam — and
surface whatever the schema can't represent.

**Branch:** logic prototype (data-shape question, not UI). Per `/prototype` skill.

## Run

```bash
pnpm install
pnpm ingest     # build scratch DB + print the pressure-test report
pnpm repl       # same, then an interactive  ref>  lookup (e.g. "Psalms 3:1")
```

Real text = World English Bible (public domain), `data/{GEN,PSA,JHN}.usfm`.
Scratch DB = `PROTOTYPE-wipe-me.sqlite` (git-ignored, rebuilt each run).

## What's keepable vs throwaway

- **Keep:** [`src/usfm.ts`](src/usfm.ts) — the pure USFM→rows ingester (lifts into the real app).
  Partly [`src/render.ts`](src/render.ts) — spacing-from-token-kind (proves Q1).
- **Throwaway:** `src/main.ts` (db build + report + repl), `schema.sql`, `data/`.

## Verdict

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

**Next:** fold decision #2 into `schema.dbml`/`CONTEXT.md`, then this prototype can be deleted
(keep the verdict + lift `src/usfm.ts` into the real ingester).
