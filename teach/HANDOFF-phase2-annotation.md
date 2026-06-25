# Handoff — teaching workspace: author the Phase 2 (Annotation) module

> **For the next agent.** One job: author **Module 2 · Phase 2 — Annotation** as lessons in the
> existing Astro + Preact teaching workspace. The infra is **done** (see
> [`HANDOFF.md`](HANDOFF.md) — Astro 7 migration + Phase 1 lessons, both complete). This is
> **teaching content**, not infra: follow the learner's ZPD and ground every claim in the repo
> ADRs/CONTEXT (cite them). Read §0–§1 for the lay of the land, then execute §2–§7.
>
> **Created:** 2026-06-25 · **Decided by:** project owner (riolly) · **Status:** not started.

---

## 0. Prerequisites — read these first (workspace state, keep as `.md`)

- [`MISSION.md`](MISSION.md) — the why + success criteria. All teaching traces to this.
- [`NOTES.md`](NOTES.md) — learner preferences, the 5-module structure, the games decision, the
  tooling decision (now DONE). **Read the "Course structure" + "Interactive games" sections.**
- [`learning-records/0001-starting-floor.md`](learning-records/0001-starting-floor.md) — the
  learner's ZPD: beginner at the *biblical* domain, fluent in *software architecture*;
  **interleave** every lesson (tangible idea → app mechanic).
- [`GLOSSARY.md`](GLOSSARY.md) — the learned-terms subset (grows only as the learner *uses* terms
  correctly). [`../CONTEXT.md`](../CONTEXT.md) is the authoritative full glossary.
- [`RESOURCES.md`](RESOURCES.md) — trusted sources.
- [`HANDOFF.md`](HANDOFF.md) — the completed Astro+Preact rewrite + Phase 1 spec. **It is the
  pattern this handoff follows** (its §4 "Job B" is the model for authoring a module).

**Skill format specs (obey them):** `~/.claude/skills/teach/{MISSION,GLOSSARY,LEARNING-RECORD,RESOURCES}-FORMAT.md`.

**ZPD note for *this* module:** Phase 2 is lighter on new *biblical* vocabulary and heavier on the
data-modeling *why* — which plays to the learner's strength. Still interleave: lead with the
tangible **"marking a physical Bible"** experience, then the app mechanic. Spend the budget on the
**why** (the ADR rationale), not on re-explaining software basics.

---

## 1. Current state of the workspace (what you're building into)

Astro 7 + Preact, static output. **Node ≥ 22.12 required** (Astro 7); the repo default is Node 20.

**Run it:** the `teach` launch config (`.claude/launch.json`) →
`fnm exec --using=22 pnpm -C teach dev` (port **4321**). Build:
`fnm exec --using=22 pnpm -C teach build`. The `.node-version` (22.21) pins it; if `fnm` isn't
your manager, just ensure `node -v` ≥ 22.12 for any `astro` command.

```
teach/
├── src/
│   ├── layouts/Layout.astro            # page chrome: title, eyebrow, here (breadcrumb), footer
│   ├── components/
│   │   ├── CourseNav.astro             # the ONE nav (don't fork it)
│   │   ├── PrimarySource.astro         # the "read this next" block (slot)
│   │   └── diagrams/*.astro            # SVG diagrams as scoped-<style> components
│   ├── islands/                        # Preact (.tsx), hydrated
│   │   ├── Quiz.tsx Connect.tsx Sequence.tsx Recall.tsx
│   │   ├── Modules.tsx                 # the reactive hub grid + CTA
│   │   └── progress.ts                 # persistent completed-set store (localStorage)
│   ├── content/lessons/*.mdx           # the lessons (prose + inline islands)
│   ├── content.config.ts               # lessons collection schema
│   ├── data/modules.ts                 # the module manifest (the course spine)
│   ├── pages/{index,glossary}.astro · lessons/[...slug].astro · reference/architecture-map.astro
│   └── styles/global.css               # design system + print CSS + @font-face Cardo
├── public/fonts/Cardo-*.ttf
└── *.md state files + learning-records/   ← stay at teach/ root
```

**Lesson numbering is global + sequential.** `0001`–`0005` are taken (Module 0 + Phase 1), so
**Phase 2 lessons start at `0006`.** Module grouping lives in `src/data/modules.ts`, not the
filename. The `[...slug]` route uses the file stem, so `0006-two-kinds-of-marks.mdx` →
`/lessons/0006-two-kinds-of-marks`.

**Module 2 already exists in the manifest** ([`src/data/modules.ts`](src/data/modules.ts)) with
`checkId: 'check-annotation'`, `unlockBy: 'check-reading'`, `lockedBadge: 'Upcoming'`, and the
Bible/App pair text. It currently has **no `href`** → the hub shows it **"Coming soon."** Adding
`href` + `lessonHints` (see §7) flips it to a real, clickable, "Ready"-when-unlocked card.

**The progress/unlock model:** each game/quiz island takes a `completeId`; finishing it adds that
id to the persistent store. A module is *Done* when its `checkId` is in the set; the next module
unlocks when its `unlockBy` (the previous module's `checkId`) is set. So the **terminal check of
your last Phase-2 lesson must use `completeId="check-annotation"`** — that's what flips Module 2 →
Done and unlocks Module 3.

---

## 2. The one-sentence goal (Phase 2)

The learner should be able to explain **why user annotations are a scripture-anchored *scene
graph* (never canvas coordinates)**, why **Markup and Ink are two different "physics,"** and how
the **sync-first store** (client-generated ids, no corpus foreign keys, soft-delete tombstones)
keeps marks alive and portable — all of it the **Anchor** idea (Module 0) applied to *your* marks.

---

## 3. Biblical / tangible concepts to teach (bottom-up, plain language)

Lead with the physical reading experience the learner already understands:

- **Marking a physical study Bible.** Over years a reader builds up layers: **underline /
  highlight** a phrase, write a **margin note**, draw an **arrow** joining two verses, or **doodle
  freehand** in the margin. These are the four things Phase 2 lets you do digitally.
- **The pain on paper.** Switch to a different Bible (translation), or a bigger-print edition, and
  all those marks are stranded — they were tied to *that* page. The Module-0 promise ("your marks
  survive") is what Phase 2 delivers for annotations.
- **Two felt categories.** A clean underline/box/arrow is *semantic* — it means "emphasise these
  words." A freehand pen scribble is *expressive* — its value is the exact hand-drawn strokes.
  That felt difference is the seed of the **Markup vs Ink** split.

---

## 4. App mechanics to teach (cite as you go)

Sources: [`../docs/adr/0002-two-annotation-classes-markup-first.md`](../docs/adr/0002-two-annotation-classes-markup-first.md),
[`../docs/adr/0003-annotations-are-a-scripture-anchored-scene-graph.md`](../docs/adr/0003-annotations-are-a-scripture-anchored-scene-graph.md),
[`../docs/adr/0006-annotation-layer-is-a-sync-first-coordinate-anchored-store.md`](../docs/adr/0006-annotation-layer-is-a-sync-first-coordinate-anchored-store.md),
[`../CONTEXT.md`](../CONTEXT.md) (Markup · Mark · Note · Connector · Endpoint · Binding · Ink ·
Layer), [`../data-architecture.md`](../data-architecture.md) (P2 row),
[`../schema.dbml`](../schema.dbml) (P2 tables `layer · mark · note · connector · binding ·
ink_annotation · ink_stroke`).

- **Markup vs Ink — two physics (ADR-0002).** **Markup** stores a *reference* `{target, style}`
  and is re-rendered by the app — so it reflows across fonts, ports across translations, is
  queryable, syncs as tiny rows, and runs on the web. **Ink** is freehand pen strokes captured
  over *one* translation's rendered layout — the "physical Bible" feel, but bound to that layout,
  not portable, tablet-only. **Markup is built first; Ink is a later tablet-native phase.**
- **The scene graph, scripture-anchored (ADR-0003) — the keystone callback.** Markup is a small
  scene graph: **Mark** (decoration on words — underline/highlight/box/circle/strike), **Note**
  (free user text, pinned), **Connector** (arrow/line). Connector endpoints and Note pins bind to
  their target through a separate **Binding** record, so *any* element can be a target (even an
  arrow from a Token to a Note). The inversion vs a whiteboard (Excalidraw/tldraw): **no element
  stores absolute canvas coordinates** — every position resolves from a scripture **Anchor**
  (+ an offset for free-placed Notes), computed at render. This is exactly the Module-0 Anchor and
  the ADR-0004 "rules, not pixels" idea, now applied to *user marks*.
- **Layer (CONTEXT).** A named, toggleable group of marks (`visible` flag) — the "notes on/off"
  feature; spans both Markup and Ink.
- **Sync-first storage (ADR-0006).** The user layer is local-first, offline-editable, synced
  across one user's devices — so: **client-generated UUIDv7 ids** (offline creation can't collide;
  time-sortable); the layer **never foreign-keys into the corpus** (it joins by *coordinate* —
  translation + `book.slug` + chapter + verse + word_index — so a corpus re-ingest orphans
  nothing); **soft-delete tombstones** (`deleted_at`, since a hard delete can't propagate to an
  offline device — and it doubles as undo); **Ink is opaque** (stroke points packed as a
  `Float32` BLOB, bound to a layout by `(translation, scroll_mode, layout_hash)`).
- **Teaching-honesty beats (good, like Phase 1's "unvalidated round-trip").** From
  [`../OVERVIEW.md`](../OVERVIEW.md) §5: the Markup **target set** (`Verse | Token range | Original
  Word`) and **snap-only** free placement aren't finalized; the v1 **style vocabulary** (which
  marks first, colors) is open; **Ink reflow policy** on font change and the **first pen platform**
  are undecided; the **sync backend** (PowerSync vs Electric) is unpicked. Naming an open question
  is honest teaching, not a gap.

---

## 5. Suggested lessons (short, one win each; games + recall in every one)

- **`0006` — "Two kinds of marks: Markup & Ink."** Physical-Bible marking → the two physics; why
  Markup is built first. **Game:** `connect` — a property ↔ which class (e.g. "reflows across
  fonts" ↔ Markup; "freehand pen feel, tablet-only" ↔ Ink; "ports across translations" ↔ Markup;
  "bound to one layout's pixels" ↔ Ink). **Diagram:** a two-column "two physics" comparison.
- **`0007` — "Marks that point, not pixels: the scene graph."** Mark / Note / Connector +
  Endpoint / Binding; anchored to scripture, never canvas coords; the whiteboard inversion; the
  Module-0 Anchor callback. **Game:** `sequence` — how a Mark survives a translation switch
  (draw → store `{anchor, style}` → switch translation → re-resolve the anchor → re-render), or a
  `connect` of term ↔ definition. **Diagram:** a scene graph whose Bindings resolve from Anchors,
  not pixels.
- *(Optional)* **`0008` — "Your notes, everywhere: the sync-first layer."** ADR-0006: client
  UUIDv7, no corpus FK (join by coordinate), tombstones, the Layer toggle, Ink-as-BLOB.
  **Game:** `connect` each storage decision ↔ the offline/sync reason it exists.

**Module check:** put `completeId="check-annotation"` on the **terminal check of your last
authored lesson** (0008 if you do it, else 0007). That flips Module 2 → Done and unlocks Module 3.
Give the earlier lessons their own ids (`"0006"`, `"0007"`).

---

## 6. Glossary terms to add (only after the learner uses them correctly)

`Markup`, `Mark`, `Note`, `Connector`, `Endpoint`, `Binding`, `Ink`, `Layer` — use
[`../CONTEXT.md`](../CONTEXT.md) as the authority, phrased beginner-facing. **Do not pre-seed
them** on authoring: per `GLOSSARY-FORMAT`, terms are promoted only once the learner *demonstrates*
them. (Phase 1 deliberately added none for the same reason.)

---

## 7. Wire-up after authoring

1. **Module manifest** ([`src/data/modules.ts`](src/data/modules.ts)) — give `m2` an `href`
   (`/lessons/0006-two-kinds-of-marks`) and a `lessonHints` string listing the lessons (mirror how
   `m0`/`m1` read). With an `href`, the hub auto-shows Module 2 as **Ready** when unlocked (instead
   of "Coming soon") and the card becomes a single clickable link.
2. **Chaining** — each lesson's `next-links` footer points to the next lesson; the last points back
   to `/`. Set `module: 2` and `order: 6/7/8` in each lesson's frontmatter.
3. **Learning record** — write one **only if the learner demonstrates understanding** (per
   `LEARNING-RECORD-FORMAT`; coverage ≠ learning). Authoring the lessons is *not* grounds for a
   record.
4. **`NOTES.md`** — update the Module-structure line (Module 2 → DONE) when finished; add any new
   stated learner preferences.
5. **`HANDOFF-phase3-lexicon.md`** — optionally leave the next agent a Phase-3 handoff (Original
   Word hub, Alignment, Strong's/lemma/morphology — ADR-0007), mirroring this file.

---

## 8. How to build the interactive pieces (reuse + gotchas from the Phase-1 build)

**Reuse the islands** — `Quiz`, `Connect`, `Sequence`, `Recall` already exist and are verified.
Import them into MDX and pass props (`completeId`, `questions`/`pairs`/`items`, `title`, `hint`).
New **diagrams** are `.astro` components under `src/components/diagrams/` (SVG + a scoped `<style>`
— Astro scopes per-component, so generic class names like `.box`/`.li` don't collide). New **game
types**, if a lesson needs one, go in `src/islands/` as Preact components — never inline.

**Gotchas (learned the hard way — don't rediscover them):**

- **Hydrate `client:idle`, not `client:visible`.** Two reasons: (a) the games are the lesson
  payoff and the unlock gate, so they must reliably hydrate; (b) the verification preview runs a
  **0×0 viewport**, so `client:visible`'s IntersectionObserver **never fires** there and the game
  can't be tested. `client:idle` is still deferred (not eager `client:load`) but robust.
- **Any island that reads `progress.ts` for its *initial* render needs the mount-gate** (render the
  empty/SSR state first, swap to the live store in a `useEffect`) — see `Modules.tsx`. Otherwise
  Preact throws a hydration mismatch (SSR has no localStorage; the client does). The game islands
  don't read progress on first render, so they're fine as-is.
- **MDX escaping:** `{` starts a JS expression — put literal braces in code spans (`` `{x:1}` ``)
  or `{'{'}`. In a JS prop string a backslash needs doubling (`"USFM \\p"`, not `"\p"`). `class`
  works in Astro MDX. Inline `style="…"` strings are fine in `.astro`; prefer a class in MDX.
- **Node ≥ 22.12** for every `astro` command (`fnm exec --using=22 …`).
- The `Connect` success line is a fixed Module-0 string ("…how the worlds relate"). It reads fine
  generically; parameterize it via a prop only if it bothers you.

---

## 9. Verification (don't ask the user — use the `preview_*` tools)

1. `preview_start` the `teach` config, then **`preview_resize` to a real size (e.g. 1280×900)** —
   the default viewport is 0×0, which breaks visibility-based hydration and IO.
2. For each new page: `preview_console_logs` at `error` (expect **none** — watch for hydration
   mismatches), `preview_eval`/`preview_snapshot` to confirm structure and that diagram scoped
   styles applied (e.g. a class's computed `fill`).
3. **Exercise every game** via `preview_eval` (click chips/options/pairs with a short `await`
   between clicks so Preact re-renders — synchronous clicks hit stale closures and silently no-op).
   Confirm green/red feedback, the completion id lands in `localStorage['bc.completed']`, and on
   the hub: completing the module's terminal check flips Module 2 → **Done** and Module 3 unlocks.
4. `fnm exec --using=22 pnpm -C teach build` must succeed with no warnings. `preview_screenshot`
   the new diagrams + the updated hub as proof.

---

## 10. Reference index

- **Phase-2 ADRs:** [0002 Markup vs Ink](../docs/adr/0002-two-annotation-classes-markup-first.md) ·
  [0003 scripture-anchored scene graph](../docs/adr/0003-annotations-are-a-scripture-anchored-scene-graph.md) ·
  [0006 sync-first annotation store](../docs/adr/0006-annotation-layer-is-a-sync-first-coordinate-anchored-store.md).
  Supporting: [0001 Anchor](../docs/adr/0001-three-layer-anchor-model.md),
  [0004 presentation-is-rules](../docs/adr/0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md).
- **Domain:** [`../CONTEXT.md`](../CONTEXT.md) (the P2 "User marks" terms),
  [`../data-architecture.md`](../data-architecture.md) (P2 row + the two bridges),
  [`../schema.dbml`](../schema.dbml) (P2 tables + the `mark_kind`/`binding_target`/`ink_tool`
  enums), [`../OVERVIEW.md`](../OVERVIEW.md) §5 (open questions = honesty beats),
  [`../drawing-architecture-plan.md`](../drawing-architecture-plan.md) and
  [`../ink-app-comparison.md`](../ink-app-comparison.md) (Ink depth, when you reach it).
- **Workspace:** this file · [`HANDOFF.md`](HANDOFF.md) (the build + Phase-1 pattern) · the five
  `.md` state files · `learning-records/`. **Skill + formats:** `~/.claude/skills/teach/`.
