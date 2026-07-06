# Scroll mode is an altitude ladder: overview, ribbon, hagah

Scroll mode (landscape, the *journey* surface —
[ADR-0016](0016-codex-and-scroll-are-purpose-bound-reading-modes.md)) gains a vertical dimension:
three **altitudes on one zoom axis**. Pinch out of the reading ribbon ascends to a **schematic
book overview**; spread on a verse descends into **hagah** (הגה — murmur, meditate): a
one-verse-at-a-time focus state with a reader-driven pointer aid (the **yad**). Hagah is a
*state within* Scroll, not a third mode — the orientation rule (rotation is the mode switch)
survives untouched.

The pillars:

1. **Hagah lives inside Scroll.** Meditation and journey are not rival purposes — hagah is *how*
   you journey slowly. Scroll is already the meditation-shaped surface (clean: no apparatus, no
   ink); Codex's furniture (margin rail, verse numbers) is study furniture. The axis rule
   (CONTEXT.md) is untouched: *mode* picks the purpose; hagah is a state within one purpose,
   like a zoom level — not a fifth axis. Codex has no hagah.
2. **The ribbon renders literary-page seams as landmark ceremony.** Text flows in continuous
   columns (no panels, no snap points), but a literary-page boundary
   ([ADR-0017](0017-the-literary-edition-is-compiled-editorial-block-structure.md)) renders as
   visible ceremony: extra column gap, the curated heading, authored section-break ornaments.
   Landmark hierarchy: **book > page > section break** — a book opening is the biggest ceremony
   (title, and a versal: this resolves ADR-0018's reserved "Scroll versals" question — yes, at
   the book seam). Spatial memory needs landmarks along a path; a uniform ribbon is a
   featureless corridor.
3. **Pinch-out ascends to a schematic overview — a map, not a miniature.** The whole book as one
   proportional spatial strip: body text as faint bars (no readable glyphs), landmarks rendered
   full — book title, page-seam headings, section ornaments. Tap or spread a region to descend
   into the ribbon there. This is spatial memory made usable ("Noah is a third in, past the
   second seam") **and** Scroll's navigation story — navigation by place, not a lookup box
   (VISION: "navigation by discovery, not search"). Uncurated books fall back to chapter seams,
   labeled by chapter number *on the map only* — the map is navigation apparatus, not the
   reading surface, so the ADR-0018 "Scroll is clean" discipline is untouched.
4. **Spread on a verse descends into a dedicated hagah typeset.** A zoom-choreographed
   transition (camera pushes toward the verse, cross-fades) lands on a composition designed for
   one verse: large, centered, generous space, faint edges of the previous/next verse for sense
   of place — styled by the active preset ([ADR-0018](0018-typography-is-shipped-preset-personalities.md)),
   not a new typography axis. Pinch reverses the choreography and lands exactly where the verse
   sits in the ribbon. **Swipe steps** one verse at a time; stepping updates the per-book
   `reading_position` at its existing verse grain. Hagah is **pure view state** — no new tables,
   no session log.
5. **The yad is reader-driven.** The pointer aid (after the Torah pointer): drag a finger or pen
   along the words and a quiet glow follows the touch (pen **hover** where the stylus supports
   it; touch always works). No pacing engine, no tempo setting — the reader murmurs at their own
   breath rhythm and the yad follows the *reader*, never the reverse. Dragging past the last
   word does **not** auto-advance; the verse step stays deliberate. v1 yad is hagah-only.

## Considered options

- **Hagah as a true third mode** (explicit enter/exit from anywhere) — rejected: breaks
  "rotation is the mode switch" (mode no longer derivable from orientation), needs mode-state
  machinery and entry chrome, and teleports the reader to a placeless verse card — surrendering
  the spatial thread that motivates the track.
- **Hagah as an overlay available in both modes** — rejected for v1 for the same placelessness;
  Codex meditation can be revisited if study posture demands it.
- **Pages vanish in Scroll** (flat block stream) — rejected: throws away curated pericope
  structure exactly where journey reading happens; no landmarks, no loci.
- **Pages as hard panels with snap** — rejected: pagination-sideways un-dissolves what
  continuous columns bought, and snap is layout-engine work.
- **Pure camera zoom into the ribbon layout** (magnified column text as the meditation view) —
  rejected: the destination inherits column line-breaks and bleeding neighbors; meditation
  deserves its own composition. The zoom survives as *choreography*; the destination is a
  dedicated render.
- **Instant toggle into a hagah screen** (no choreography) — rejected: teleportation; the
  transition is what carries the sense of place.
- **App-paced pointer** (karaoke/RSVP illumination) — rejected: passive consumption is the
  opposite of "challenge, not ease", and a tempo knob contradicts the ADR-0018 subtraction
  move.
- **Full-fidelity overview miniature** (typeset whole book, scaled) — rejected: expensive and
  unreadable at scale anyway; the schematic map is cheaper and clearer.
- **Journey gating in this phase** (locked books, open-scroll limit, unlocks) — deferred, not
  rejected: gating quality depends on the journey-state engine (progress model, unlock pacing,
  adaptive start — `WISHLIST.md`), which deserves its own grill; and locking books from the
  sole P1.5 reader while iterating on reading feel is pure friction. Per-book bookmarks — the
  foundation — already exist (`reading_position` is unique per book).

## Consequences

- **No schema change.** Hagah is view state; overview and landmarks render from data #35
  already ships (`literary_page` ranges, headings, ornament ops); position updates reuse
  `reading_position` verse-grain.
- [ADR-0016](0016-codex-and-scroll-are-purpose-bound-reading-modes.md)'s Scroll definition
  gains the ladder (amended in place); [ADR-0018](0018-typography-is-shipped-preset-personalities.md)'s
  "Scroll gets no versals by default (revisit at the journey grill)" resolves to: **book-seam
  versals in the ribbon**, authored versals appear at their ADR-0017 placements; each preset
  styles them.
- The hagah composition is part of each **preset's** personality (Classic hagah vs Modern
  hagah) — goldens for the hagah view join the preset golden set (light + dark).
- The zoom ladder's **top rung is reserved**: zooming out past the book overview is where the
  library (nav carousel, separate grill) can attach later — designed for, not built here.
- The yad needs word hit-testing in the hagah composition — the existing word-tap machinery
  applies; pen-hover support is a device check at build time, touch is the guaranteed path.
- Sequencing: this track builds **after** #36 steps 1–3 (the hagah typeset is preset-styled)
  and after #35's schema/ingest (seams need `literary_page`); the chapter-seam fallback lets
  ribbon/overview work start before Genesis curation finishes.
- CONTEXT.md gains: **Hagah**, **Yad**, **Altitude ladder**, **Scroll overview**.
