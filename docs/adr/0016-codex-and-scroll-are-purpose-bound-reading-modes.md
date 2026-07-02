# Codex and Scroll are purpose-bound reading modes on fixed chapter-pages

The two reading layouts stop being interchangeable orientations of one surface and become two
**purpose-bound modes**, hard-bound to device orientation. Full research and sources:
[reading-modes-research.md](../../reading-modes-research.md).

- **📖 Codex mode (portrait)** — the *study* surface. Paged like a physical Bible; a page is a
  **chapter** typeset at fixed geometry (semantic pagination), scrolled internally when taller
  than the screen; flip = chapter navigation. A **margin rail** — a first-class reserved region
  (the journaling-Bible precedent) — is the home of Notes and **rail ink**. All annotation
  lives here.
- **📜 Scroll mode (landscape)** — the *journey* surface. Continuous horizontal columns (the
  original format; Latin *pagina* = one column of a scroll), immersive reading, Portals,
  progress. **Clean in v1**: no Ink ever; no Markup authoring yet.

The pillars:

1. **Mode is part of an annotation's meaning.** Side margins and top/bottom margins never
   transform into each other — the Masoretes put different *kinds* of notes in each (Masorah
   parva beside the column, Masorah magna top/bottom). We assign purpose instead of pretending
   to convert. Extends the two-physics discipline
   ([ADR-0002](0002-two-annotation-classes-markup-first.md)).
2. **Fixed page geometry.** A page is typeset like a printed edition (measure and typography
   fixed per preset); the device letterboxes/scales it. Rotation and device changes become
   *viewing* operations — ink cannot be orphaned by them, **by construction**. This dissolves
   (not mitigates) the rotation-reflow problem. Every serious ink app (GoodNotes, Notability —
   see [ink-app-comparison.md](../../ink-app-comparison.md)) is page-based for this reason.
3. **Page = chapter; overflow scrolls.** No page-break algorithm exists in v1 — the chapter is
   the break (no widows/orphans/poem-splitting engine work). Spatial landmarks stay valid when
   a long chapter scrolls because the *canvas* geometry is fixed — the reading research
   punishes moving markers, not scrolling per se.
4. **Margins expand outward only.** The user may widen the rail beyond the preset base;
   expansion grows the page canvas into letterbox space and never squeezes the text measure —
   so it can never reflow text or invalidate ink.
5. **v1 Ink is rail-only.** Rail ink is **verse-slotted**: the stroke blob never distorts; its
   slot follows the verse, so it survives typography changes (re-pagination) at verse grain
   honestly. In-text freehand (circling/underlining words) is a **later** sub-phase carrying
   the full edition-bound fragility; in-text decoration meanwhile is Markup's job (which
   reflows and ports by design).

## Considered options

- **Free mode choice in any orientation** — rejected: the moment both modes exist in both
  orientations, rotation reflow returns and the orphaning problem un-dissolves.
- **Inverse assignment (study in landscape)** — rejected: writing posture is portrait (every
  notebook and journaling Bible); annotation culture is codex culture; landscape's wide sweep
  is what makes multi-column feel like a scroll.
- **Screen-sized pages** — rejected: needs a page-break engine and produces arbitrary
  boundaries; chapter-grain pages are semantic and free. *(Later refinement if long-chapter
  scroll proves painful on device: pericope-grain breaks at whole Blocks.)*
- **Fit-chapter-to-page (shrink type to fit)** — rejected: destroys typographic consistency
  (Psalm 119); fixed type + internal scroll keeps the edition honest.
- **Transforming ink between margin spaces** — rejected as dishonest geometry; the previously
  drafted mitigation policies (hide / best-effort re-place / indicator chip) are all superseded
  by dissolution.

## Consequences

- **Honest limit, stated plainly:** fixed pages absorb rotation and device change, **not
  typography change** — a preset/font change creates a new *edition*: re-paginate, re-slot rail
  ink at verse grain. `ink_annotation` therefore keys by **edition**, not by
  `(scroll_mode, layout_hash)`.
- `reading_settings.scroll_mode` is removed — mode derives from orientation; the `scroll_mode`
  enum leaves the schema.
- Rotation becomes a meaningful gesture (upright = study, sideways = read) — an opinionated
  default squarely in VISION.md's "challenge, not ease" register.
- The naming enters the product language: the app named *bible-codex* offers the Codex and the
  Scroll. CONTEXT.md gains: **Codex mode**, **Scroll mode**, **Page**, **Margin rail**,
  **Rail ink**.
- Rail-slot semantics (multi-verse blobs, slot-internal placement) are decided at the P2 build
  grill; rail ink beside *headings* depends on the deferred block-grain heading anchor
  (OVERVIEW §5).
- Scroll-mode Markup display/authoring stays deferred and reversible (pencil-hover is a
  candidate if it stays simple).
