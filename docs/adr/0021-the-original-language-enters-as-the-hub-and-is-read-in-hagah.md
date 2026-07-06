# The original language enters as the hub and is read in hagah

The original-language text (Hebrew and Greek) enters the corpus **now**, as the Phase-3 hub
tables CONTEXT.md already fixes — `original_word` / `segment` — and its first reading surface
is **hagah** ([ADR-0019](0019-scroll-mode-is-an-altitude-ladder-overview-ribbon-hagah.md)): a
**vertical swipe** in the one-verse focus state flips the focused verse between the active
translation and its original, and the yad glides over the original words. Per-verse switching
on the reading surfaces (Codex page, Scroll ribbon) waits for Phase 3.

The pillars:

1. **Hagah is the home; composition isolation kills the rendering risk.** One verse alone on
   screen makes RTL the composition's *native* direction — no pointed-Hebrew verse embedded in
   an LTR column, no BiDi paragraph engine (the hardest rendering problem an in-page swap would
   force, paid years early). Thematically the bullseye: hagah (הגה) is *murmur* — muttering the
   verse in its own tongue, the yad doing the Torah pointer's actual historical job. The flip
   is transient view apparatus, **not** the translation axis: nothing in settings, no
   edition-key impact (hagah anchors nothing). It is **sticky within the hagah session** —
   stepped verses stay flipped (meditating *through* a passage in Hebrew) — and resets to the
   translation on ascent to the ribbon.
2. **The hub tables start now, and nothing is throwaway.** Ingest lands in `original_word` /
   `segment` per the fixed CONTEXT.md shapes: verse-addressed (canonical), ordered, stable
   external word-ids, surface text; Strong's and morphology parse codes ride along as **opaque
   columns** (present in the sources — store, don't decode). Hebrew display reconstructs
   Written Words from ordered sibling Segments (the standing definition). **Whole canon at
   ingest** — the sources are complete and machine-readable; no per-book curation exists to
   slice by. Phase 3 *adds* (Alignment, Gloss, lexicon decode) on these exact rows;
   `token.owId` finally gets its other side. The yad's word-glow needs word boundaries, which
   is what makes any verse-blob shortcut a false economy.
3. **One hub, and it is OSHB + Robinson-Pierpont.** Hebrew: the Open Scriptures Hebrew Bible
   (WLC-based, CC BY, morphology included) — the only serious open option. Greek: the
   **Robinson-Pierpont Byzantine Textform** — public domain outright *including* Robinson's
   parsing; textually nearest the KJV's Vorlage (the project's first-curated translation
   everywhere), and the best verse coverage against the av11n/KJV spine (fewest hagah
   dead-ends). One Greek edition only — the Original Word is *the* shared alignment target
   (the spoke rule); two editions would mean two hubs and doubled Phase-3 alignment forever.
   **Escape hatch, recorded:** swapping the Greek edition is a cheap re-ingest *until*
   Alignment data hangs off the word-ids — the decision hardens then, not now.
4. **Pointed, not cantillated; stored full, stripped at display.** Display shows niqqud (vowel
   points — what a murmurer needs to pronounce) and strips te'amim (cantillation), the standard
   readers'-edition presentation. Stripping is display-side normalization — the stored segment
   stays source-faithful, so cantillation display is a later option, never a re-ingest. NFC
   normalization end-to-end (the #25 Cardo rule). A verse with no original (Comma-class) shows
   a quiet "no original text" state — never a silent skip.
5. **Hebrew first; Genesis 1:1 is the acceptance verse.** The device spike proves Cardo mark
   positioning in the Skia shaper (niqqud placement — HarfBuzz territory), the RTL hagah
   composition (centering, line order for long verses), RTL yad hit-testing (word boundaries
   and glow tracking right-to-left), and NFC end-to-end. Polytonic Greek is LTR and rides
   along free. If בְּרֵאשִׁית shapes correctly with the yad gliding right-to-left, the rest of
   the track is downhill.

## Considered options

- **In-place per-verse swap on reading surfaces** — deferred to Phase 3: forces mixed-direction
  line stacking inside LTR columns (a BiDi paragraph engine), and study contexts immediately
  want tap-a-word → gloss, pulling the whole Phase-3 apparatus forward.
- **Companion/interlinear display beside the translation** — deferred: doubles the composition
  and *is* Phase-3 research mode.
- **Originals as pseudo-translations** (token streams in the `translation` machinery) —
  rejected: translations are spokes, the original is the hub (locked rule); it would leak into
  the translation axis as a switchable "translation" and force the English-centric tokenize
  policy onto Hebrew.
- **Throwaway verse-blob table** — rejected: discarded at Phase 3 *and* loses the word
  boundaries the yad needs; its only advantage evaporates.
- **SBLGNT as the Greek hub** — rejected for now: more verse-holes against the KJV spine
  (Acts 8:37-class), messier future KJV alignment (KJV words with no Greek behind them), and
  an attribution obligation where Robinson-Pierpont has none. Verse-grain hagah display makes
  the eclectic-vs-Byzantine word-grain differences invisible; revisit at the escape hatch if
  Phase-3 scholarship demands it.
- **Both Greek editions, keyed per translation** — rejected: two hubs.
- **Cantillation displayed** — rejected for v1 display: maximal shaping risk and visual noise
  on a meditation surface. (Stored regardless.)
- **Unpointed consonantal display** — rejected: unpronounceable except for fluent readers;
  kills the murmur.
- **Transliteration / pronunciation line** — deferred to `WISHLIST.md`: word-grain editorial
  data, Gloss territory (Phase 3), and it doubles the composition. Honest cost: v1 serves
  readers who can already sound out the scripts.

## Consequences

- Corpus schema gains `original_word` / `segment` (hub shape per CONTEXT.md); ingest gains
  OSHB and Robinson-Pierpont loaders (ADR-0010 pattern — build-time, new source mappers). No
  user-schema change; the flip is unpersisted view state.
- Hagah (ADR-0019) gains the vertical-swipe language flip: horizontal axis = sequence,
  vertical axis = depth into the original tongue. No chrome added to the composition.
- Cardo's polytonic-Greek + pointed-Hebrew coverage — ADR-0018's Phase-3 *tiebreaker* —
  becomes load-bearing now; the preset bake-off inherits this as a hard constraint for
  whichever font renders the hagah original.
- The spike's shaping/RTL learnings (mark positioning, RTL hit-testing) are the foundation
  Phase-3 interlinear rendering builds on.
- Sequencing: after #37 (the hagah composition must exist). Ingest work is independent and
  can land earlier.
