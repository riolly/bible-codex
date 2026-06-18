# bible-codex — Phase-1 prototype (THROWAWAY)

> Throwaway code that answers a question. When the question is answered, the
> verdict gets folded into the real docs/ADRs and **this directory is deleted**.
> Do not build on it.

## The question

**Can Skia render genuinely beautiful literary scripture, with smooth scroll —
and does the vision feel worth building?** If Skia can't make scripture beautiful
and fluid in the browser-wasm (pessimistic) case, the whole RN-Skia bet is wrong.

## Verdict — _proven, pending on-device feel_

Built and observed working (see the build session screenshots):

- **Skia text, three scripts, one font.** Latin, polytonic Greek, and pointed
  (niqqud) Hebrew all shape correctly via Skia `Paragraph` in Cardo — RTL Hebrew
  reorders, Greek accents/breathings/iota-subscript land, HiDPI-crisp.
- **Genre-aware beauty.** Drop cap, gilt superscript verse numbers, prose
  paragraphs (Genesis/John) vs. hanging-indented poetry cola (Psalm 1).
- **Both scroll axes.** Vertical reading ⇄ horizontal scroll-columns, toggled live.
- **Incremental word-tap reveal.** gloss → transliteration + Strong's → original
  script → meaning, one rung per tap (revelation earned, not dumped).
- **The beginning Portal.** "beginning" in John 1:1 sits dim/dashed until Genesis 1
  is read past halfway, then **glows** and taps through to Genesis 1:1.
- **Mocked study Layer.** A highlight Mark + a margin Note + a Connector arrow on
  John 1:14 — anchored to scripture coordinates, so they **reflow** on every
  font / scroll-mode / translation change.
- **Translation toggle.** NASB ⇄ KJV re-typesets; anchors port across translations.
- **Perf.** Sustained 120 fps (capped) on a full-chapter scroll with full-scene
  repaint each frame, on desktop GPU. _Remaining:_ feel it on the physical
  Android tablet in Chrome (the pessimistic case this whole prototype targets).

## Run

```bash
pnpm install      # from this prototype/ directory
pnpm dev          # http://localhost:5173  (served with --host for LAN/tablet)
```

Open the Network URL printed by Vite in the tablet's Chrome to feel it on-device.

## How the migration-fatal seams are honored

The point of this throwaway is to validate the bet **without** poisoning the real
RN-Skia build. The three seams from the handoff:

1. **Anchors key off canonical coordinates** (`book/chapter/verse/word-index`),
   never pixels or internal ids — see [`src/model/types.ts`](src/model/types.ts)
   (`Anchor`) and how marks/portals resolve in the engine.
2. **Text is rendered in Skia**, not CSS — [`src/canvaskit/`](src/canvaskit/).
3. **Mocked annotations anchor to scripture coordinates**, not canvas coords —
   [`src/model/annotations.ts`](src/model/annotations.ts), resolved to geometry
   at render time in the engine (ADR 0003).

And the one rule that makes Phase 2 cheap:

- **The typesetting engine + data model are framework-agnostic.**
  [`src/engine/`](src/engine/) is pure TS: `(chapter, shaper, viewport, mode) →
  positioned draw commands + Token hit-rects`, with **no CanvasKit type** in its
  surface. The only Skia-specific code is [`src/canvaskit/`](src/canvaskit/)
  (the `TextShaper` impl + the `Renderer`). Phase 2 swaps those two files for
  `@shopify/react-native-skia` and the engine/data are untouched.

## What's mocked / out of scope

- **No persistence, no DB, no scraper, no auth, no sync.** State is in memory.
- **Annotations are hand-placed**, not user-created or saved (see
  [`src/data/corpus.ts`](src/data/corpus.ts) `STUDY_LAYER_JOHN`).
- **Portal "earned" logic is mocked**: reading a scroll past 50% marks it read.
- **Drawing/Ink is not built** — only Markup (Mark/Note/Connector) is mocked.
- `(window as any).__bc` is a **debug hook** used to script the validation run.

## ⚠️ Text fidelity caveat

The 4 chapters were **hand-prepared** (no scraper, per scope). **KJV is public
domain.** The **NASB** text (Genesis 1 + John 1 only) was **reproduced from memory
for internal throwaway use and is NOT verified against a printed edition** — it may
contain errors and **must not be redistributed.** Strong's / Original-Word data
covers only the curated demo words, not every token.

If verified text matters before showing this around, the cheapest swap is to drop
in **WEB (World English Bible, public domain, modern)** as the modern default
instead of NASB — architecturally identical, no copyright or recall risk.

## The corpus (one thread)

Genesis 1 (Hebrew narrative) · Psalm 1 (poetry) · John 1 prologue (Greek gospel) ·
1 John 1 (epistle). Shared motif: "In the beginning" (Gen 1:1 / John 1:1) + the
John↔1 John authorship link (Greek _archē_ / _logos_).
