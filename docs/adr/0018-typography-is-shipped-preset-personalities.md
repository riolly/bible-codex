# Typography is shipped preset personalities

Reading typography ships as **two or three curated built-in presets** — aesthetic
*personalities* — instead of an open adjust surface. **Classic** (traditional print Bible:
serif, justified, drop cap, ivory paper) and **Modern** (contemporary: airy leading, left-aligned,
raised cap, cool white) ship first; **Manuscript** (parchment, ornate versals, Skia texture) is a
reserved third slot, earned by being amazing, not filled by default. The user keeps exactly one
knob: a **font-size stepper** (`fontScale`, a multiplier over the preset's base — eyes differ in
a way taste doesn't). The adjust panel from #11 is demoted to a `__DEV__` tuning tool.

The pillars:

1. **The axis rule.** *Translation* picks the words, *edition* picks the structure
   ([ADR-0017](0017-the-literary-edition-is-compiled-editorial-block-structure.md)), **preset
   picks the typography**, *mode* picks the purpose
   ([ADR-0016](0016-codex-and-scroll-are-purpose-bound-reading-modes.md)). Presets never
   duplicate another axis — there is no "Study preset"; study is Codex mode.
2. **Built-ins live in code, not the user DB.** Preset values are *product* — typed engine
   constants (extending `DEFAULT_PRESET`), versioned and updated with the app.
   `reading_settings.activePresetId` becomes a builtin slug (`'classic' | 'modern'`);
   `reading_settings` gains `fontScale`. The `layout_preset` / `layout_override` tables stay
   **physically present but dormant** — no destructive migration, backup envelope (#13)
   untouched, and the `genre/role/book` cascade machinery remains available for the built-ins'
   own internal use (e.g. Classic's poetry indent step).
3. **Apparatus is mode-bound, not a setting.** Codex (study) shows verse numbers, rendered
   *quietly* — size/placement styled per preset; Scroll (journey) is clean: no verse numbers, no
   running heads (nothing in v1 Scroll anchors, so nothing needs them — the ADR-0016 "clean"
   discipline extended). Titles need no switch at all: the USFM edition shows the source's
   headings, the literary edition shows exactly the curated ones.
4. **A preset is a full personality**: font, leading, measure, margins, alignment, verse-number
   style, versal style, and **paper tint per theme** (Classic-light = ivory, Classic-dark = warm
   charcoal). Dark/light itself stays a **global** choice outside the cascade (a
   means-of-viewing concern, ADR-0004 discipline).
5. **Ornament placement is editorial; ornament style is typographic.** The default versal sits
   at **book start** only. The literary edition may *author* additional versals (a significant
   narrative turn — Noah, Abraham) and **section breaks** (fleuron/asterism divider) — placement
   ops in the ADR-0017 sidecar; each preset decides what a versal or divider looks like.
   Classic's drop cap pays the carried P1 gap. Scroll mode gets no versals by default (revisit
   at the journey grill if book openings want ceremony).
6. **Presets are designed on-device and pinned by goldens.** Fonts are **OFL/open-license only**
   (bundled like the texts); polytonic Greek + pointed Hebrew coverage is a tiebreaker for the
   Phase-3 trajectory (Cardo, the incumbent, covers both — NFC caveat #25 stands). Shortlist
   bake-off — Classic: Cardo / EB Garamond / Crimson Pro; Modern: Literata / Source Serif / a
   humanist sans if earned — in a `__DEV__` **preset lab** screen (real Skia render of a fixed
   spread: Genesis prose, a Psalm, a heading; side-by-side candidates; tweaks via the demoted
   adjust panel). A preset is *done* when its **light + dark goldens** land (paying the carried
   dark-goldens gap).

## Considered options

- **Presets primary + "Advanced" escape hatch** — rejected: every exposed knob is a promise to
  support its combinations, and it dilutes the editions-not-settings identity. The panel
  survives only behind `__DEV__` as the tuning tool.
- **Purpose-axis presets** (Study / Reading / Meditation) — rejected: purpose is the mode axis;
  purpose-presets create nonsense combinations ("Meditation preset in Study mode").
- **Density-axis presets** (compact / comfortable / large) — rejected: the `fontScale` stepper
  owns density; the previous "large print default" is absorbed into preset + stepper.
- **Seeding built-ins as user-DB rows at first run** — rejected: shipped-value updates then
  fight user-data merge semantics on every upgrade/restore (which copy wins?).
- **Dropping `layout_preset`/`layout_override`** — rejected: destructive migration + backup
  churn for zero gain over dormancy.
- **Number-hiding as a preset property, a user toggle, or an edition property** — each rejected:
  numbers are study *apparatus*, not taste (preset), not another setting (toggle — contradicts
  the subtraction move), and not structure (edition — literary structure will be wanted in study
  contexts *with* numbers).
- **Web/CSS prototyping for type tuning** — rejected: wrong rasterizer; CSS lies about Skia
  metrics, hinting, and paper tint. Judgment happens on the device the reading happens on.

## Consequences

- `reading_settings` gains `font_scale`; `active_preset_id` re-documents as a builtin slug. No
  other schema change; dormant tables documented in `schema.dbml` prose.
- The preset-lab dev screen and golden-diff coverage (light + dark per preset) are the build's
  acceptance ratchet; `/verify-device` on the real tablet closes each preset.
- The user-facing settings surface shrinks to: preset cards, font-size stepper, theme, and
  (per ADR-0017) the `textEdition` toggle — the whole "endless customization" branch is gone.
- ADR-0017's op vocabulary grows two **ornament ops** (versal placement, section break) — still
  block-grain, still canonical (verse-grain placement, no split maps). The dev editor gains the
  two ops.
- The ink **edition key**'s "typography preset fingerprint" (ADR-0016/0017) is computed from the
  builtin preset's values + `fontScale`, so a stepper change is honestly a new edition
  (re-slot rail ink at verse grain) — same physics as any typography change.
- Sequencing: the `reading_settings` columns + preset lab land **before** #35's dev editor, so
  preset decisions inform how literary pages render; exact interleave lives in the track-B PRD
  issue.
