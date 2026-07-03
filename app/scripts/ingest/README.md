# Corpus ingest (issue #6, ADR-0010)

Build-time Node pipeline: USFM → USJ (usfm-grammar) → normalize → the bundled
read-only corpus SQLite asset. Nothing here ships in the app; the device only
reads normalized rows through the Drizzle seam (`src/db/corpus-schema.ts`,
shared by the writer here and the app reader).

```
pnpm ingest:download   # once: fetch pinned ebible.org zips, verify sha256 → sources/ (gitignored)
pnpm ingest            # sources → ../../assets/corpus/corpus.db (gitignored build artifact)
```

Run both before a native/dev build that renders scripture — `corpus.db` is
generated, not committed, and Metro bundles it as an asset once app code
imports `src/db/corpus.ts`.

## Layout

- `tokenize.ts` — **the registered tokenization policy (ADR-0014).** Part of
  the locked anchor seam; a change here is an anchor migration.
- `normalize.ts` — USJ → `Token[]`/`Block[]` (the canonical model types) +
  stats bag of everything Phase 1 deliberately drops. Unknown structure throws.
- `parse.ts` — usfm-grammar wrapper (strict first, lenient with logged errors;
  versified-`\d` grammar-gap preprocess).
- `books.ts` — the 66-book canon: USFM code → permanent anchor slug.
- `edition.ts` — deterministic `translation.edition` stamp (ADR-0013): sha256
  over the source text, immune to zip repackaging.
- `sources.ts` / `download.ts` — pinned upstream zips + checksums. A checksum
  mismatch means upstream revised the text: updating the pin is a NEW edition.
- `write-db.ts` / `run.ts` — Drizzle(better-sqlite3) writer + CLI with
  invariant validation and verse-coverage warnings.

## Golden fixtures

`fixtures/adversarial.usfm` + its committed USJ. Pure-TS suites
(`tokenize.test.ts`, `normalize.test.ts`) always run — including in CI, which
installs with `ignore-scripts` and has no native modules. `parse.test.ts`
(USFM→USJ drift guard) and `roundtrip.test.ts` (write seam ↔ read seam)
self-skip where the native tree-sitter / better-sqlite3 bindings are unbuilt.

After editing the fixture USFM, regenerate the committed USJ:

```
node -e "const{readFileSync,writeFileSync}=require('node:fs');const{USFMParser}=require('usfm-grammar');writeFileSync('scripts/ingest/fixtures/adversarial.usj.json',JSON.stringify(new USFMParser(readFileSync('scripts/ingest/fixtures/adversarial.usfm','utf8')).toUSJ(),null,2)+'\n')"
```

## Native build note

usfm-grammar needs `tree-sitter` / `tree-sitter-usfm3` (node-gyp). On Node 24
the tree-sitter 0.25 build fails against the C++20 `cppgc` headers; build it
with:

```
cd node_modules/tree-sitter        && CXXFLAGS='-std=gnu++20' npx node-gyp rebuild
cd node_modules/tree-sitter-usfm3  && CXXFLAGS='-std=gnu++20' npx node-gyp rebuild
```

better-sqlite3 builds cleanly via `pnpm rebuild better-sqlite3`.
