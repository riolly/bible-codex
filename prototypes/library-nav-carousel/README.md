# prototypes/library-nav-carousel

## Question

What should the **First Readable Bible** main menu look and feel like — the surface that
lets you pick any book, then any chapter, and hand off to the #8 Skia renderer? (Scaffold
for [#23](https://github.com/riolly/bible-codex/issues/23); the real navigation UI is #10.)

## Bet

An **inside-the-circle carousel** — the reader stands at the center of a continuous ring of
book "covers" and rotates through it (Torah → Revelation → Torah, looping both ways) — is a
more distinctive, codex-native front door than a scrolled grid, without losing legibility.

## Run

Open `index.html` directly in a browser, or serve the folder:

```
python3 -m http.server 5175 --directory prototypes/library-nav-carousel
# then open http://localhost:5175
```

Self-contained: one HTML file, no build, no deps. (Standalone falls back to unicode arrows
instead of the Tabler webfont — cosmetic only.)

Interactions: **drag / ← → / mouse-wheel** rotate the ring; **tap the center book** opens its
chapter grid; **tap a side book** rotates it to center; tapping a chapter shows a "render →
Book N (#8 Skia page)" stub (no real rendering wired).

## Current state (end of design session — 2026-07-05)

This is the tuned result of an iterative design conversation. Decisions that are **locked**:

- **Layout family:** inside-the-circle carousel (chosen over: two-pane master/detail,
  single-column accordion, standing-spine shelf, side-scroll shelves, and a vertical
  face-out cover grid). Earlier finalists are gone; this is the direction.
- **Cover style:** face-out "book" — left spine + page-edge shading + per-group muted tint,
  dominant English title top-left, **original-language title** under it (Hebrew first-word
  name for OT, Greek incipit for NT), and a **partial illustration slot** (bottom-right).
  The art is a placeholder abstract SVG; real per-book art/SVG drops into that same slot
  later and is **partial, not full-bleed**. Missing art must degrade to the plain tinted tile.
- **Grouping:** BibleProject categorization, exact order — Torah / Prophets / Writings /
  Gospels / Acts / Letters / Revelation. Group ticker (top-right) tracks the focused book.
- **Motion model:** center is the **hero** — largest (scale 1.12), upright, front-most z,
  deepest shadow. The **sharp focus trio** is center + 1 each side (no blur on neighbors).
  The outer pair **loom** (scale up) with a **mild** blur and are kept opaque (floor 0.78),
  only partially visible at the edges. 7 books in view total. One flat baseline (no vertical
  float). Snap-to-nearest on release.

Key tuning constants live in `drawStage()` — `txmag` (spacing: 152 first step, 86 after),
`scale` (1.12 center → 0.90 at ±1 → grows outward), `blur` (starts past ±1, caps 3.6px),
`op` (edge floor 0.78), `ry` (`-o*14`), `sk` (`o*3`), `z` (`200 - ao*12`, center front).

## Open questions / next iteration

1. **Navigability is the main risk.** A single 66-book loop is *sequential* — no jump-to-book.
   For a dogfooding scaffold you'll hit specific chapters constantly. Strongly consider making
   the **group ticker tappable** (jump to a group's arc) and/or arrows that step group-to-group.
   Decide before this becomes the daily driver.
2. **Skia/RN port cost.** This prototype uses CSS 3D transforms + live `filter: blur()`.
   On-device (react-native-skia) the blur must NOT be recomputed per drag frame — pre-blur a
   snapshot / use a lower-res soft layer / `ImageFilter.blur` on a cached picture. Budget for it.
3. **NFC normalization.** The original-language titles are decorative here but on real covers
   they must be Unicode **NFC**-normalized (Cardo advance drift — see
   [#25](https://github.com/riolly/bible-codex/issues/25)). The `ORIG` map here is sample data,
   not the curated/normalized source of truth.
4. **Translation toggle (KJV/BSB)** is not in this build — earlier grid variants had it in the
   header. Decide where it lives in the carousel (header? per-book? deferred to #12).
5. **Chapter-picker overlay** is a plain 8-col grid placeholder — not designed, just functional.

## Verdict

**Pending.** Layout direction chosen; on-device feel + navigability unproven. Fold into #23
(or #10) once validated, then delete this directory per the prototypes death ritual.

## Related

- Design verdict comment: https://github.com/riolly/bible-codex/issues/23#issuecomment-4881790390
- [#23](https://github.com/riolly/bible-codex/issues/23) First Readable Bible (this scaffold)
- [#10] real navigation UI · [#25](https://github.com/riolly/bible-codex/issues/25) NFC · [#8] renderer
