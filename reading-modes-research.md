# bible-codex — Codex & Scroll: reading modes, margins, and pagination

> Research + direction from the 2026-07-02 design session. Answers two questions:
> **(1)** should the two scroll modes have distinct *purposes* (and distinct margin roles)
> instead of being two interchangeable layouts? **(2)** page-flip or continuous scroll?
>
> **Status:** decisions recorded — [ADR-0016](docs/adr/0016-codex-and-scroll-are-purpose-bound-reading-modes.md)
> written; schema + CONTEXT/OVERVIEW/VISION/drawing-plan updated 2026-07-02. This doc remains
> the research record behind the ADR.
> Supersedes the "reflow policy on rotation" framing of the old Finding-5 discussion — the
> mode-purpose split *dissolves* that problem rather than mitigating it.

---

## The problem that started this

Ink is layout-bound (ADR-0002/0006). Vertical scroll has **left/right** margin space; horizontal
scroll has **top/bottom** margin space. Margin ink drawn in one mode has no honest home in the
other — the spaces don't transform. And rotation (the most frequent layout change on a tablet)
forces the question daily, not rarely.

The insight under evaluation: **don't transform — assign.** Give each mode a distinct purpose and
let the annotation's mode be part of its meaning.

---

## Part 1 — Margins: what history and design say

### Insight 1 — The scribes already solved this: margins were never interchangeable

The Masoretic manuscripts used exactly this split, deliberately:

- **Masorah parva** (small) — terse, abbreviation-dense guard-notes — in the **side margins**,
  adjacent to the text column.
- **Masorah magna** (large) — the expansive lists and cross-references — in the **top and bottom
  margins**, where there is room.

Same tradition, two margin regions, two content grains: **side = short + word-adjacent;
top/bottom = long + passage-level.** Medieval Christian manuscripts made the same move with the
Glossa Ordinaria (interlinear word-glosses vs. marginal passage-commentary); the Talmud page is
the extreme case (concentric zones, each a different voice). *The margin's position encodes the
annotation's kind* — a thousand-year-old convention, not a workaround.

### Insight 2 — Mode-purpose assignment extends the project's own two-physics discipline

The repo's best decisions share one shape: when two things have different physics, refuse to
pretend they're one thing (Markup/Ink, corpus/user-data, rules/computed-layout). Transforming
side-margin ink into top-margin ink is pretending. Assigning purpose is the same honesty one
level up.

### Insight 3 — "Page" literally means "column of a scroll"

Latin ***pagina*** originally named **one column of writing in a papyrus scroll**. Ancient scroll
reading exposed one or two columns at a time — *reading a scroll was a paged experience*. Smooth
continuous scrolling is a modern web invention with no ancient precedent. The horizontal column
mode is already secretly a codex; column-snapping makes it more authentic, not less.

---

## Part 2 — Flip vs. scroll: what research and precedent say

### Insight 4 — The codex is Christian history; flipping is not a betrayal of the scroll vision

Early Christians were the codex's most aggressive early adopters — surviving early Christian
scripture is overwhelmingly codices while contemporary Jewish and pagan literature stayed on
scrolls. Both formats are authentically part of this text's story. (The app is named
**bible-codex**.)

### Insight 5 — Pagination preserves spatial memory; scrolling taxes working memory

From the reading-comprehension literature:

- Readers use **spatial position as a memory cue** ("that verse was top-left"); scrolling moves
  those markers and measurably hurts re-finding and recall (ISLS, *Is Scrolling Disrupting While
  Reading?*).
- Paging readers built a **better mental model** of the text and located information faster
  (Piolat et al., via Chaparro & Baker).
- Scrolling **loads working memory** during comprehension of complex text; the cost falls hardest
  on low-WM readers (Sanchez & Wiley 2009).
- Raw comprehension-score results are mixed across studies; the **spatial-memory effect is the
  consistent finding**.

Mapped to VISION.md (*challenge not ease; revelation earned; Portals as places*): stable text
geography is a **product feature**, not a rendering preference. Key nuance: what the research
punishes is *moving/reflowing* spatial markers — **geometric fixity matters more than flipping
per se**. A fixed-geometry canvas you scroll over keeps its landmarks; a reflowing text does not.

### Insight 6 — Every serious ink app is page-based; pages turn rotation into scaling

GoodNotes, Notability, Noteshelf, Flexcil (see `ink-app-comparison.md`) all ink onto **fixed
pages**; OneNote's infinite canvas is the lone exception and the cautionary tale. On rotation a
fixed page **letterboxes and scales uniformly** — ink stays glued because the page's internal
geometry never changes. *A page absorbs rotation by construction.*

### Insight 7 — But scroll genuinely wins at flow

Continuous scroll is better for immersive narrative reading and skimming. So: not either/or —
**assign per mode** (which is the Part-1 conclusion arriving from the opposite direction).

---

## The proposal: Codex mode & Scroll mode

Rename the modes by purpose, not pixels:

| | 📖 **Codex mode** | 📜 **Scroll mode** |
|---|---|---|
| Orientation | **Portrait** (hard-bound) | **Landscape** (hard-bound) |
| Motion | Paged — **flip** | Continuous **horizontal columns** |
| Purpose | **Study**: Ink + Notes + Markup | **Journey**: immersive reading, Portals, progress |
| Margin role | **Side margin rail** — first-class reserved region (journaling-Bible precedent), home of margin ink & note pins — *Masorah parva* | **Top/bottom bands** — passage-level & meta content (threads, progress, portal indicators) — *Masorah magna* |
| Ink | Yes (rail; see §Decisions #3) | **Never** |
| Precedent | Wide-margin / journaling Bible; annotation culture is codex culture; portrait = writing posture | The original scroll; *pagina* = column; landscape = reading sweep |

**Rotation becomes a meaningful gesture:** upright = "I'm studying", sideways = "I'm reading".
The rotation-orphans-ink problem **cannot occur**: ink exists only in Codex mode, whose page
geometry does not reflow on rotation.

**Why not the inverse assignment:** writing posture favors portrait (every notebook and
journaling Bible); marginalia tradition is codex tradition; landscape's wide sweep is what makes
multi-column scroll feel like a scroll. The inverse has no historical or ergonomic precedent.

**Honest limit, stated plainly:** fixed pages absorb *rotation and device* changes. They do
**not** absorb typography changes — changing font/preset re-typesets and effectively creates a
new *edition*. Rail ink survives this at verse grain (it re-slots); ink drawn *over the words
themselves* would not — which is why v1 scopes it out (§Decisions #3).

---

## Decisions agreed (2026-07-02)

1. **Codex/Scroll mode-purpose split adopted; mode is hard-bound to orientation.** Docs, schema
   naming (`scroll_mode` → mode `{codex, scroll}` or derived from orientation), and ADRs to be
   updated accordingly (see §Docs to update).
2. **Fixed page geometry** (typeset like a printed edition; device letterboxes/scales). Ink
   stable across rotation *and* devices by construction.
   - **2.1 Page = chapter (semantic pagination), with internal scroll for overflow** — page
     *width* and typography are fixed (the measure never reflows); page *height* grows with the
     chapter. Short psalm → fits one screen, a true page. Psalm 119 → one tall fixed canvas
     scrolled through a window. Flip = chapter-grain navigation. Spatial landmarks stay valid
     because the canvas geometry is fixed even when scrolled (Insight 5 nuance). *(Refinement
     option, later: pericope-grain page breaks if on-device use shows long-chapter scroll hurts.)*
   - **2.2 Margins: base + user-expandable, expansion is additive canvas** — expanding the margin
     rail **widens the page outward** (into letterbox space); the text measure and block geometry
     are untouched, so no reflow, no new edition, no ink invalidation. Margin expansion can never
     orphan anything. (A margin change that altered the text measure would re-paginate — that
     design is rejected.)
3. **v1 Ink is rail-only (CONFIRMED); in-text ink is a later phase, not rejected.** No in-text
   ink (circling/underlining words in freehand) in v1 — in-text decoration is Markup's job
   (which reflows and ports by design). Rail ink is verse-slotted: the blob's *content* never
   distorts; its *slot position* follows the verse. This makes ink survive re-pagination at
   verse grain honestly and removes most `layout_hash` complexity. In-text ink returns as a
   deliberate later sub-phase carrying the full edition-bound fragility machinery.
4. **Scroll mode stays a clean reading surface in v1.** No Markup authoring there; keep it
   pure. Possible later: display-only marks, or authoring via pencil-hover (S-Pen / Apple
   Pencil hover) — only if it stays simple.

## Open questions

- **Rail ink slot semantics:** slot = verse it sits beside at draw time; multi-verse-tall
  blobs — bind to first verse or span? Decide during P2 build.
- **Chapter-flip transition** (page-curl vs slide vs fade) and whether Scroll mode column-snaps —
  presentation polish, decide on device.

## Architectural impact (all reversible — no locked seam touched)

- `reading_settings.scroll_mode` global toggle → mode derived from orientation (or kept as a
  stored preference with new enum values). Enum `scroll_mode {horizontal, vertical}` renames to
  mode `{codex, scroll}`. Trivial now (no user data exists).
- `ink_annotation`: keys by **edition** (translation + preset/typography hash) + verse slot,
  replacing the broad `(translation, scroll_mode, layout_hash)` context key; `scroll_mode`
  column becomes moot if ink is Codex-only. Shape change is P2-schema work, pre-build.
- Pagination engine: page = chapter canvas at fixed measure → **no page-break algorithm needed
  for v1** (chapter is the break). Column-break code (prototype) remains for Scroll mode.
- Anchors, corpus model, scene graph, two-DB split: **untouched.**

## Docs updated (done 2026-07-02)

- ✅ **[ADR-0016](docs/adr/0016-codex-and-scroll-are-purpose-bound-reading-modes.md)** — the decision record for everything in this doc.
- ✅ `VISION.md` — Beauty-first paragraph now describes Codex/Scroll purpose-bound surfaces.
- ✅ `OVERVIEW.md` — P1/P2 phase descriptions, open questions, document map.
- ✅ `CONTEXT.md` — new "Reading surfaces" section (Codex mode, Scroll mode, Page, Margin rail,
  Rail ink); Ink entry rewritten.
- ✅ `drawing-architecture-plan.md` — §3 rail model, §8.5 resolved, status header.
- ✅ `schema.dbml` — `scroll_mode` enum + columns removed; `ink_annotation` reshaped
  (`edition_hash`, rail-slot comments).
- *(ADR-0004's own text needed no change — "scroll_mode is global, not part of the cascade"
  is now simply vacuous; the mode is orientation-derived per ADR-0016.)*

## Sources

- [ISLS — Is Scrolling Disrupting While Reading?](https://repository.isls.org/bitstream/1/497/1/18.pdf)
- [Sanchez & Wiley — To Scroll or Not to Scroll: Scrolling, Working Memory Capacity, and Comprehending Complex Texts](https://www.researchgate.net/publication/41668120_To_Scroll_or_Not_to_Scroll_Scrolling_Working_Memory_Capacity_and_Comprehending_Complex_Texts)
- [Chaparro & Baker — The Impact of Paging vs. Scrolling on Reading Online Text Passages](https://www.semanticscholar.org/paper/535a87a6697b6c83730acd3ddd0867a4c15e92a0)
- [Joshi — Is Pagination Better than Scrolling when Reading on a Phone?](https://nikhitajoshi.ca/papers/scroll-vs-page.pdf)
- [Delgado et al. — Decoding digital reading: a network meta-analysis](https://link.springer.com/article/10.1007/s10639-025-13843-8)
- [UASV — The Role of Marginalia in Ancient Hebrew Manuscripts](https://uasvbible.org/2025/10/17/the-role-of-marginalia-in-ancient-hebrew-manuscripts/)
- [UASV — Medieval Biblical Manuscripts: Foundations of the Masoretic Tradition](https://uasvbible.org/2025/06/17/medieval-biblical-manuscripts-foundations-of-the-masoretic-tradition/)
- [Wikipedia — Marginalia](https://en.wikipedia.org/wiki/Marginalia)
