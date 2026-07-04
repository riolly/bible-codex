# prototypes/

Throwaway prototypes, one directory per question. A prototype exists to answer **one
question cheaply**, then die.

## Policy

- **One dir = one question.** The dir's README states the question, the bet, and — once
  known — the verdict.
- **Throwaway by contract.** No production code lives here; nothing imports from here.
  Architecture rules (CLAUDE.md, ADRs, lint guards) do not apply inside a prototype.
- **Death ritual.** When the verdict lands: fold it into an ADR or the relevant issue,
  add a git permalink to the last commit containing the code, then delete the directory.
  History keeps the code; the tree keeps only what's alive.

## Ledger

| Prototype | Question | Verdict | Status |
|---|---|---|---|
| [canvaskit-reading/](canvaskit-reading/README.md) | Can Skia render genuinely beautiful literary scripture, and is the vision worth building? | **PROVEN** (see its README) — pending on-device pen feel ([#1](https://github.com/riolly/bible-codex/issues/1)) | alive until #1 resolves |
| [library-nav-carousel/](library-nav-carousel/README.md) | What should the First Readable Bible main menu ([#23](https://github.com/riolly/bible-codex/issues/23)) look/feel like — book → chapter → render? | **PENDING** — inside-the-circle carousel chosen; on-device feel + navigability unproven | alive until #23/#10 land |
| prototype-usfm ([permalink](https://github.com/riolly/bible-codex/tree/e7accb1501fa0b5329d57b3f83ba77ac5ab96fd4/prototype-usfm)) | Does the Phase-1 schema survive real USFM? | **PROVEN** — findings folded into schema.dbml + [#6](https://github.com/riolly/bible-codex/issues/6) | deleted 2026-07-03 |
