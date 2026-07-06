# The library is a book-ring carousel

The library — the surface where a reader picks a book — is the **inside-the-circle carousel**
prototyped in `prototypes/library-nav-carousel/` (layout family, cover style, and BibleProject
grouping locked there in the 2026-07-05 design session): the reader stands at the center of a
continuous ring of face-out book covers, Torah → Revelation → Torah, looping both ways. One
library serves both orientations, and in landscape it is the **top rung of the altitude
ladder** ([ADR-0019](0019-scroll-mode-is-an-altitude-ladder-overview-ribbon-hagah.md)) — the
zoom axis now runs unbroken from the library ring down to a single murmured verse.

The pillars:

1. **One library, both orientations.** Landscape: pinch out of the Scroll overview ascends to
   the ring (the reserved ADR-0019 rung, hereby resolved). Portrait: the ring is a pushed
   screen over Codex — the reader stays home (#10 nav model), the library never becomes a
   mandatory hallway. Same component; per-orientation tuning only (visible-cover count,
   spacing constants), not a redesign. Two library surfaces would split the front-door bet
   before it is validated.
2. **Tap a book = open it at its bookmark.** Each scroll holds its place (per-book
   `reading_position`; VISION's collection of scrolls) — the reader does not re-choose a
   chapter at the door. Landscape: an express, choreographed descent *through* the book's
   overview to the ribbon at the bookmark (spread instead of tap browses rung-by-rung, and the
   overview shows a bookmark marker). Codex: the Page containing the bookmark. **The
   prototype's chapter-grid overlay dies** — superseded by the Scroll overview (spatial,
   landmark-rich, built by #37) in landscape and by the in-reader chapter picker (#10's slot)
   in Codex. Address-picking is in-book apparatus, not front-door furniture.
3. **Two-grain rotation, never teleportation.** The book ring rotates by drag with tuned flick
   physics (fine grain). Below it sits the **category band**: the seven groups (Torah /
   Prophets / Writings / Gospels / Acts / Letters / Revelation — the locked BibleProject
   taxonomy) as their own scrollable strip; dragging the band turns the book ring at **group
   grain** — a coarse gear under the fine gear, watch-crown style. Tapping a category spins
   there (same mechanic, free); the band highlights the focused group as the ring turns,
   doubling as a position map. Coarse or fine, the reader always *arrives by rotating* —
   navigation by place, no jump list, no search box.
4. **The carousel carries nothing but ring, band, and covers.** The KJV/BSB translation toggle
   lives in the settings surface beside its axis siblings (preset, `textEdition`, theme —
   the shrunken ADR-0018 surface): translation is one global reading axis
   (`reading_settings.activeTranslation`), not a per-visit or per-book choice. Every chip
   added to the front door is the rejected knob-creep returning.
5. **Spike first; the verdict gates the real build.** The bet is proven in CSS 3D and unproven
   in Skia — and *feel* (drag latency, blur budget) is exactly what the wrong rasterizer
   cannot testify to (ADR-0018's argument, reversed). A `__DEV__` device spike (preset-lab
   pattern) ports the ring with the committed render strategy: each cover a **cached
   SkPicture** rendered once to a texture; ring motion a Reanimated shared value driving
   transforms only; neighbor depth-blur as **2–3 pre-rendered blurred variants cross-faded by
   ring position** — never a live `ImageFilter.blur` during drag. Verdict lands in the
   prototype README (death ritual: fold results, delete the directory), then the real library
   builds and **replaces the P1 book-list menu**.

## Considered options

- **Carousel as Scroll-side library only, separate Codex picker** — rejected: two front doors
  to design, art-direct, and maintain; dilutes the distinctive-front-door bet before device
  validation.
- **Standalone home screen, not ladder-attached** — rejected: wastes the zoom continuity
  ADR-0019 explicitly reserved a rung for.
- **Keep the chapter-grid step on book-open** — rejected: resets the "scroll keeps its place"
  feel on every entry and duplicates (worse) what the Scroll overview already does spatially.
- **Tap-to-jump group bar** (tap a segment, ring teleport-spins to the group) — superseded by
  the category band: same reachability (worst case one band-drag + a few steps), but the band
  keeps *rotation* the single navigation verb at two grains instead of adding a tap-jump verb.
- **Pure sequential + flick physics alone** — rejected: ~33-step worst case; flick precision
  across 66 covers is a slot machine under daily use.
- **Jump list / search overlay** — rejected: a lookup box at the front door is what VISION
  rejects, and bypassing the ring concedes the carousel failed.
- **Translation toggle in the library header / per-book** — rejected: breaks the axis-siblings
  pattern; per-book misrepresents a global setting and doubles cover states.
- **Build the real library directly, no spike** — rejected: risks plumbing built on a layout
  that fails on device and then can't die cheaply.
- **Blur-free spike** — rejected: the loom-and-blur depth *is* the bet; validating a flat ring
  validates nothing.

## Consequences

- ADR-0019's reserved top rung resolves: **library ring above the Scroll overview** (amended
  in place). The full axis: ring → book overview → ribbon → hagah verse.
- Cover data: original-language titles (Hebrew first-word names, Greek incipits) come from a
  curated **NFC-normalized** source at build time (#25 Cardo rule) — the prototype's `ORIG`
  map is sample data and dies with it. Missing cover art degrades to the plain tinted tile
  (prototype cover rule stands); the partial-illustration slot awaits real per-book art.
- The P1 book-list menu is scaffold and is **replaced** when the real library lands; the
  prototype directory is deleted after the spike verdict (prototypes death ritual).
- No schema change: bookmark landing reads existing `reading_position`; grouping is static
  taxonomy (engine constant, like presets).
- The spike is throwaway by contract: placeholder covers, no reader wiring — it answers only
  "does the ring feel right on the tablet at 60fps within the blur budget."
- Sequencing: the spike is independent of #35/#36/#37 and can run any time; the real build
  waits for the verdict, and its landscape attach needs #37's overview (portrait pushed-screen
  path has no dependency).
