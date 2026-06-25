# Handoff — teaching workspace: author the Phase 3 (Lexicon) module

> **For the next agent.** One job: author **Module 3 · Phase 3 — Lexicon** as lessons in the
> existing Astro + Preact teaching workspace. The infra is **done** (see [`HANDOFF.md`](HANDOFF.md) —
> Astro 7 migration + Phase 1) and the **pattern is set** by [`HANDOFF-phase2-annotation.md`](HANDOFF-phase2-annotation.md)
> (Module 2, lessons 0006–0008 — read it as the worked example). This is **teaching content**, not
> infra: follow the learner's ZPD and ground every claim in the repo ADRs/CONTEXT (cite them). Read
> §0–§1 for the lay of the land, then execute §2–§7.
>
> **Created:** 2026-06-25 · **Decided by:** project owner (riolly) · **Status:** ✅ **DONE** (2026-06-25).
> Module 3 authored: lessons `0009` (Down to the original word — the hub & alignment), `0010` (Naming
> the word — Strong's, lemma, morphology, gloss), `0011` (Re-sourceable by design — external ids &
> three tiers), with three new diagrams (`AlignmentHub`, `WordLabels`, `ThreeTiers`). `0011`'s terminal
> quiz carries `completeId="check-lexicon"` → flips Module 3 → Done and unlocks Module 4. Manifest `m3`
> got its `href` + `lessonHints`. All games verified via preview (Connect reaches "All connected";
> the three quizzes write `0009`/`0010`/`check-lexicon` to `localStorage['bc.completed']`; the hub
> flips Module 3 → Done). `pnpm -C teach build` is clean (14 pages). No learning record written — the
> learner has not yet *demonstrated* the material (authoring ≠ learning), and no glossary terms
> pre-seeded (same reason; the `Original Word` stub stays until demonstrated). **Next:** Phase 4 —
> Advanced, specced in [`HANDOFF-phase4-advanced.md`](HANDOFF-phase4-advanced.md).

---

## 0. Prerequisites — read these first (workspace state, keep as `.md`)

- [`MISSION.md`](MISSION.md) — the why + success criteria. All teaching traces to this.
- [`NOTES.md`](NOTES.md) — learner preferences, the 5-module structure, the games + tooling
  decisions. **Read "Course structure" + "Interactive games."**
- [`learning-records/0001-starting-floor.md`](learning-records/0001-starting-floor.md) — the
  learner's ZPD: beginner at the *biblical* domain, fluent in *software architecture*; **interleave**
  every lesson (tangible idea → app mechanic).
- [`GLOSSARY.md`](GLOSSARY.md) — the learned-terms subset. **It already carries an `Original Word`
  stub marked "met fully in Module 3"** — this module is where it's earned. [`../CONTEXT.md`](../CONTEXT.md)
  is the authoritative full glossary.
- [`RESOURCES.md`](RESOURCES.md) — trusted sources.
- [`HANDOFF-phase2-annotation.md`](HANDOFF-phase2-annotation.md) — **the pattern this file mirrors.**

**Skill format specs (obey them):** `~/.claude/skills/teach/{MISSION,GLOSSARY,LEARNING-RECORD,RESOURCES}-FORMAT.md`.

**ZPD note for *this* module:** Phase 3 has the **most new biblical vocabulary** of any module
(original languages, Strong's, lemma, morphology) *and* a meaty data-modeling story (a three-tier,
externally-keyed, re-sourceable bridge — the learner's strength). Don't drown the learner in Greek;
the win is *why the original-language layer is a separate, re-sourceable hub*, not Greek grammar.
Lead with the tangible **interlinear Bible** the learner can picture, then the app mechanic.

---

## 1. Current state of the workspace (what you're building into)

Astro 7 + Preact, static output. **Node ≥ 22.12 required.** Run via the `teach` launch config
(`fnm exec --using=22 pnpm -C teach dev`, port **4321**); build with `fnm exec --using=22 pnpm -C teach build`.

```
teach/src/
├── layouts/Layout.astro · components/{CourseNav,PrimarySource}.astro
├── components/diagrams/*.astro       # SVG diagrams as scoped-<style> components
├── islands/{Quiz,Connect,Sequence,Recall,Modules}.tsx · progress.ts
├── content/lessons/0001..0008.mdx    # Modules 0–2 are authored
├── content.config.ts · data/modules.ts
└── pages/{index,glossary}.astro · lessons/[...slug].astro · reference/architecture-map.astro
```

**Lesson numbering is global + sequential.** `0001`–`0008` are taken (Modules 0–2), so **Phase 3
lessons start at `0009`.** The `[...slug]` route uses the file stem, so
`0009-down-to-the-original-word.mdx` → `/lessons/0009-down-to-the-original-word`.

**Module 3 already exists in the manifest** ([`src/data/modules.ts`](src/data/modules.ts)) with
`checkId: 'check-lexicon'`, `unlockBy: 'check-annotation'`, `lockedBadge: 'Upcoming'`, and the
Bible/App pair text. It currently has **no `href`** → the hub shows it **"Coming soon."** Adding
`href` + `lessonHints` flips it to a real, clickable, "Ready"-when-unlocked card (mirror how `m1`/`m2`
read). Module 2's terminal check `check-annotation` is what unlocks it.

**The progress/unlock model:** each game/quiz island takes a `completeId`; finishing it adds that id
to the persistent store. A module is *Done* when its `checkId` is in the set; the next unlocks when
its `unlockBy` (the previous module's `checkId`) is set. So the **terminal check of your last Phase-3
lesson must use `completeId="check-lexicon"`** — that flips Module 3 → Done and unlocks Module 4.

---

## 2. The one-sentence goal (Phase 3)

The learner should be able to explain **why the original Greek/Hebrew lives in a separate,
morpheme-grained, *externally-keyed* hub + lexicon — three tiers (corpus → hub → lexicon) joined by
stable string keys, never foreign keys** — so the lexicon is re-sourceable and licence-clean, and the
fine, word-grain bridge between translations (the second of Module 0's two hubs) finally populates.

---

## 3. Biblical / tangible concepts to teach (bottom-up, plain language)

Lead with the interlinear study Bible the learner can already picture:

- **Under every translation sits the original.** A reader who wants to "go deeper" opens an
  **interlinear**: the Greek (NT) or Hebrew (OT) word printed under (or over) the English, often with
  a **Strong's number** (G#### / H####), the **dictionary form** (lemma), a tiny **parsing** code
  (tense/case/person…), and a one-word **gloss**. That's the whole Phase-3 surface, on paper.
- **Translations don't agree word-for-word.** One Greek word may become three English words; three
  English words may collapse to one Greek word. So the link between a translation and the original is
  **many-to-many**, not a tidy 1:1 — that's the *alignment*.
- **Hebrew packs several "words" into one.** Hebrew glues a conjunction + article + preposition +
  stem + suffix into one written word; scholars split it into **morphemes**, each with its own
  Strong's/lemma/gloss. So "the original word" the app keys on is a **morpheme-occurrence**, not
  always a whole written word (Greek words are single-segment; Hebrew words are several).

> **Module 0 callback to open with:** Module 0's *two hubs* were the **Canonical Verse** (coarse, by
> passage) and the **Original Word** (fine, by the underlying Greek/Hebrew word). Phase 3 is where
> that second hub is actually built — and it's also where the **`ow_id` seam** that has sat *null* on
> `token`/`mark`/`note`/`binding` since Phases 1–2 finally gets wired (word-grain Markup gains true
> cross-translation portability the moment the hub populates).

---

## 4. App mechanics to teach (cite as you go)

Sources: [`../docs/adr/0007-original-word-hub-is-a-morpheme-grained-externally-keyed-bridge.md`](../docs/adr/0007-original-word-hub-is-a-morpheme-grained-externally-keyed-bridge.md)
(the keystone), supporting [`../docs/adr/0001-three-layer-anchor-model.md`](../docs/adr/0001-three-layer-anchor-model.md)
(the hub seam) and [`../docs/adr/0005-four-product-phases-design-all-build-in-order.md`](../docs/adr/0005-four-product-phases-design-all-build-in-order.md)
(design-now-build-later). [`../CONTEXT.md`](../CONTEXT.md) (Original Word · Segment · Written Word ·
Alignment · Lemma · Strong's · Morphology · Gloss), [`../data-architecture.md`](../data-architecture.md)
(P3 row), [`../schema.dbml`](../schema.dbml) (P3 tables: `original_word · interlinear_alignment ·
lemma · strongs · morphology`).

- **The Original Word hub is morpheme-grained (ADR-0007 #2).** An `original_word` is a lexical
  *segment*-occurrence — a whole word in Greek, a **morpheme** in Hebrew. A **Written Word** is
  regrouped via `segment_of` + `segment_index`. One uniform entity means alignment, gloss, mark, and
  morphology all target an `ow_id` with no morpheme-special path.
- **`ow_id` is an opaque *external* id, never self-minted (ADR-0007 #1).** It comes from a maintained
  corpus (MACULA / STEPBible / OSHB class) and is **never parsed** → remappable if we swap sources.
  This is the **NASB-licensing lesson applied to reference data** (callback to Phase 1's data-sources
  note) *and* the Anchor's "don't store something that renumbers under you" applied to word ids.
- **`token.ow_id` is the denormalized head; `interlinear_alignment` is the M:N truth (ADR-0007 #3).**
  The single column answers "the one Original Word this Token primarily maps to" (portability + fast
  path); the bare junction `(token_id, original_word_id)` carries the full many-to-many for
  interlinear rendering. **Reverse-interlinear is *derived* by walking alignment, never stored.**
- **Three tiers, joined by stable string keys; FK only *within* a tier (ADR-0007 #4).**
  `corpus → hub → lexicon`: anything crossing a boundary (`token.ow_id`, `alignment.original_word_id`,
  `original_word.lemma_id`/`strong_id`/`parse_code`) is a string key with **no FK**; the only real FK
  is corpus-internal (`alignment.token_id → token.id`, regenerated on ingest like `block_id`). So the
  **lexicon is re-sourceable** and can ship as a separate attachable file — the same "two worlds join
  by coordinate, not FK" idea the learner met in Phase 2, now across three tiers.
- **Lexicon contents (ADR-0007 #6–#8).** `lemma` (the dictionary-form **spine** stats hang off) +
  `strongs` (the launch dictionary, its own number space) ship now; BDB/Thayer/Louw–Nida are additive
  later tables off `lemma`. **Morphology** = a raw `parse_code` on the word + a small code-keyed
  `morphology(code → features)` decode table (not wide per-word columns). **Gloss** is one editorial
  under-the-original cue inline on the hub.
- **Teaching-honesty beats (like Phase 1's "unvalidated round-trip" and Phase 2's open questions).**
  From ADR-0007's Consequences + [`../OVERVIEW.md`](../OVERVIEW.md) §5: **sourcing is the open risk,
  not the schema** — a redistributable interlinear corpus must be *chosen and licence-checked*;
  "lemma is the spine" *depends on the source supplying a lemma id* (else `lemma_id` is null at
  launch and stats hang off `strong_id`); and there is **no DB-enforced cross-tier integrity** — an
  ingest-time validation pass must assert every `ow_id`/`strong_id`/`lemma_id`/`parse_code` resolves
  (the price of separability).

---

## 5. Suggested lessons (short, one win each; games + recall in every one)

- **`0009` — "Down to the original word: the hub & alignment."** Interlinear → the second hub from
  Module 0; Original Word as a morpheme-occurrence; Alignment as N tokens ↔ M original words;
  `token.ow_id` head vs the M:N junction; reverse-interlinear is derived. **Game:** `connect` the
  many-to-many cases (e.g. "one Greek word → three English Tokens" ↔ "alignment is M:N"; "Hebrew
  written word" ↔ "several morpheme Original Words"). **Diagram:** translation Tokens aligning up into
  the Original Word hub (echo the Module-0 spokes/hubs visual).
- **`0010` — "Naming the word: Strong's, lemma, morphology, gloss."** The four interlinear labels and
  what each *is* in the model; lemma = spine, Strong's = numbered join-key-only id, morphology = raw
  code + decode table, gloss = inline editorial cue. **Game:** `connect` each term ↔ its role (watch
  the Strong's-vs-lemma distinction — they're separate id spaces). **Diagram:** the one Original Word
  fanning out to its lemma / Strong's / parse-code / gloss.
- *(Optional)* **`0011` — "Re-sourceable by design: external ids & three tiers."** ADR-0007's storage
  shape: opaque external `ow_id`, `corpus → hub → lexicon` joined by string keys (FK only within a
  tier), validation-pass integrity, sourcing as the open risk. **Game:** `connect` each decision ↔ the
  re-sourcing/licensing reason it exists (mirrors Phase 2's lesson 8 "decision ↔ reason").

**Module check:** put `completeId="check-lexicon"` on the **terminal check of your last authored
lesson** (0011 if you do it, else 0010). That flips Module 3 → Done and unlocks Module 4. Give the
earlier lessons their own ids (`"0009"`, `"0010"`).

---

## 6. Glossary terms to add (only after the learner uses them correctly)

`Original Word` (promote the existing stub from "met fully in Module 3" to a full entry), `Segment`,
`Written Word`, `Alignment`, `Lemma`, `Strong's`, `Morphology`, `Gloss` — use [`../CONTEXT.md`](../CONTEXT.md)
§"Original language & lexicon (Phase 3)" as the authority, phrased beginner-facing. **Do not pre-seed
them** on authoring: per `GLOSSARY-FORMAT`, terms are promoted only once the learner *demonstrates*
them. (Phases 1 and 2 deliberately added none for the same reason.)

---

## 7. Wire-up after authoring

1. **Module manifest** ([`src/data/modules.ts`](src/data/modules.ts)) — give `m3` an `href`
   (`/lessons/0009-down-to-the-original-word`) and a `lessonHints` string (mirror `m1`/`m2`). With an
   `href`, the hub auto-shows Module 3 as **Ready** when unlocked and the card becomes one link.
2. **Chaining** — each lesson's `next-links` footer points to the next; the last points back to `/`
   ("See Phase 4 / Advanced unlock →"). Set `module: 3` and `order: 9/10/11` in each frontmatter.
3. **Learning record** — write one **only if the learner demonstrates understanding** (per
   `LEARNING-RECORD-FORMAT`; coverage ≠ learning). Authoring the lessons is *not* grounds for a record.
4. **`NOTES.md`** — flip the Module-3 structure line to DONE when finished; add any new stated learner
   preferences.
5. **`HANDOFF-phase4-advanced.md`** — optionally leave the next agent a Phase-4 handoff (Portal,
   Journey, themes & tags, research mode, the journey-state engine — see `WISHLIST.md` /
   `VISION.md`), mirroring this file. That is the final module (`m4`, `checkId` currently unset —
   give it one if Phase 4 gets a terminal check).

---

## 8. How to build the interactive pieces (reuse + gotchas — unchanged from Phase 2)

**Reuse the islands** — `Quiz`, `Connect`, `Sequence`, `Recall` exist and are verified. Import them
into MDX and pass props (`completeId`, `questions`/`pairs`/`items`, `title`, `hint`). New **diagrams**
are `.astro` components under `src/components/diagrams/` (SVG + a scoped `<style>`). New **game types**,
if needed, go in `src/islands/` as Preact components — never inline.

**Gotchas (don't rediscover them):**

- **Hydrate `client:idle`, not `client:visible`** — the games are the unlock gate and the verify
  preview runs a 0×0 viewport, so the IntersectionObserver never fires there. `client:idle` is
  deferred but robust.
- **MDX/Astro escaping — the one that bit Phase 2:** in an **`.astro`** template, a literal `{` is a
  JS expression. Render `{ target, style }` etc. as a *string*: `{'{ target, style }'}` (a bare
  `{ x, y }` in `<text>` throws `x is not defined` at build). In **MDX** prose, `{` also starts an
  expression — use a code span (`` `{x:1}` ``). In a JS prop string a backslash needs doubling
  (`"USFM \\p"`). `class` works in Astro MDX. Note MDX applies **smart quotes** (`'` → `’`) in prose —
  fine for reading, but don't match on a straight apostrophe in any verification `eval`.
- **Node ≥ 22.12** for every `astro` command (`fnm exec --using=22 …`).
- The `Connect` success line is a fixed Module-0 string ("…how the worlds relate") — reads fine
  generically; parameterize via a prop only if it bothers you.

---

## 9. Verification (don't ask the user — use the `preview_*` tools)

1. `preview_start` the `teach` config, then **`preview_resize` to a real size (e.g. 1280×900)** — the
   default 0×0 viewport breaks visibility-based hydration.
2. For each new page: `preview_console_logs` at `error` (expect **none** — watch hydration
   mismatches), then drive each game via `preview_eval` (click pairs/chips/options with a short
   `await` between clicks so Preact re-renders — synchronous clicks hit stale closures and no-op).
   Confirm green/red feedback and that the `completeId` lands in `localStorage['bc.completed']`.
3. On the hub: completing the module's terminal check flips Module 3 → **Done** and unlocks Module 4.
   Verify computed diagram styles via `preview_eval` (`getComputedStyle` on a diagram class) — the
   screenshot tool ignores scroll, so style/geometry asserts are the reliable proof.
4. `fnm exec --using=22 pnpm -C teach build` must succeed with no warnings.

---

## 10. Reference index

- **Phase-3 ADR:** [0007 Original-Word hub + lexicon](../docs/adr/0007-original-word-hub-is-a-morpheme-grained-externally-keyed-bridge.md).
  Supporting: [0001 Anchor / hub seam](../docs/adr/0001-three-layer-anchor-model.md),
  [0005 design-all-build-in-order](../docs/adr/0005-four-product-phases-design-all-build-in-order.md).
- **Domain:** [`../CONTEXT.md`](../CONTEXT.md) §"Original language & lexicon (Phase 3)",
  [`../data-architecture.md`](../data-architecture.md) (P3 row + the two bridges),
  [`../schema.dbml`](../schema.dbml) (P3 tables + enums), [`../OVERVIEW.md`](../OVERVIEW.md) §5 (open
  questions = honesty beats). Licensing/sourcing context: the [Bible data sources] memory + the NASB
  note (re-sourceable reference data is the same discipline).
- **Workspace:** this file · [`HANDOFF-phase2-annotation.md`](HANDOFF-phase2-annotation.md) (worked
  example) · [`HANDOFF.md`](HANDOFF.md) (the build + Phase-1 pattern) · the five `.md` state files ·
  `learning-records/`. **Skill + formats:** `~/.claude/skills/teach/`.
