# Handoff — teaching workspace: author the Phase 4 (Advanced) module

> **For the next agent.** One job: author **Module 4 · Remaining — Advanced** as lessons in the
> existing Astro + Preact teaching workspace. The infra is **done** (see [`HANDOFF.md`](HANDOFF.md) —
> Astro 7 migration + Phase 1) and the **pattern is set** by [`HANDOFF-phase2-annotation.md`](HANDOFF-phase2-annotation.md)
> and [`HANDOFF-phase3-lexicon.md`](HANDOFF-phase3-lexicon.md) (Modules 2–3, lessons 0006–0011 — read
> them as the worked examples). This is **teaching content**, not infra: follow the learner's ZPD and
> ground every claim in the repo docs (cite them). Read §0–§1 for the lay of the land, then execute
> §2–§7.
>
> **Created:** 2026-06-25 · **Decided by:** project owner (riolly) · **Status:** not started.

---

## 0. Prerequisites — read these first (workspace state, keep as `.md`)

- [`MISSION.md`](MISSION.md) — the why + success criteria. **This module lands the fourth success
  criterion directly:** *"take a WISHLIST idea (Portal, Journey) and map it onto the already-locked
  primitives, with no new data model."* That sentence is the whole spine of Phase 4.
- [`NOTES.md`](NOTES.md) — learner preferences, the 5-module structure, the games + tooling
  decisions. **Read "Course structure" + "Interactive games."**
- [`learning-records/0001-starting-floor.md`](learning-records/0001-starting-floor.md) — the
  learner's ZPD: beginner at the *biblical* domain, fluent in *software architecture*; **interleave**
  every lesson (tangible idea → app mechanic).
- [`GLOSSARY.md`](GLOSSARY.md) — the learned-terms subset. [`../CONTEXT.md`](../CONTEXT.md) is the
  authoritative full glossary (the `Cross-reference` term is the one P4 hook already pinned there).
- [`RESOURCES.md`](RESOURCES.md) — trusted sources.
- [`HANDOFF-phase3-lexicon.md`](HANDOFF-phase3-lexicon.md) — **the pattern this file mirrors.**

**Skill format specs (obey them):** `~/.claude/skills/teach/{MISSION,GLOSSARY,LEARNING-RECORD,RESOURCES}-FORMAT.md`.

**ZPD note for *this* module:** Phase 4 is the **least-locked** phase — there is **no dedicated ADR**;
it lives in [`../WISHLIST.md`](../WISHLIST.md) and [`../VISION.md`](../VISION.md) as *post-POC* ideas.
So the teaching shape inverts the earlier modules: instead of "here is a locked schema, here is why,"
it's **"here is a feature the reader can picture — now watch it ride entirely on primitives you
already learned, with zero new data model."** That reframing is the win and the honesty beat at once:
Phase 4 is design-now-build-later (ADR-0005) taken to its limit. Lead with the *felt* experience
(a word that glows; books that open as you read), then show the primitive it reduces to.

---

## 1. Current state of the workspace (what you're building into)

Astro 7 + Preact, static output. **Node ≥ 22.12 required.** Run via the `teach` launch config
(`fnm exec --using=22 pnpm -C teach dev`, port **4321**); build with `fnm exec --using=22 pnpm -C teach build`.

```
teach/src/
├── layouts/Layout.astro · components/{CourseNav,PrimarySource}.astro
├── components/diagrams/*.astro       # SVG diagrams as scoped-<style> components
├── islands/{Quiz,Connect,Sequence,Recall,Modules}.tsx · progress.ts
├── content/lessons/0001..0011.mdx    # Modules 0–3 are authored
├── content.config.ts · data/modules.ts
└── pages/{index,glossary}.astro · lessons/[...slug].astro · reference/architecture-map.astro
```

**Lesson numbering is global + sequential.** `0001`–`0011` are taken (Modules 0–3), so **Phase 4
lessons start at `0012`.** The `[...slug]` route uses the file stem, so
`0012-the-earned-cross-reference.mdx` → `/lessons/0012-the-earned-cross-reference`.

**Module 4 already exists in the manifest** ([`src/data/modules.ts`](src/data/modules.ts)) with
`unlockBy: 'check-lexicon'` and `lockedBadge: 'Upcoming'` — but **no `checkId` and no `href`**, so the
hub shows it **"Coming soon"** even though Module 3's completion has already satisfied its unlock gate.
This is the **last** module, so unlike the earlier ones you must **add a `checkId`** (suggest
`'check-advanced'`) *and* `href` + `lessonHints`. With those, the hub flips it to a real, clickable,
"Ready"-when-unlocked card.

**The progress/unlock model:** each game/quiz island takes a `completeId`; finishing it adds that id
to the persistent store. A module is *Done* when its `checkId` is in the set. Since Module 4 is the
terminal module, its `checkId` (`check-advanced`) is **also the course-completion signal** — the
terminal check of your last Phase-4 lesson must use `completeId="check-advanced"`, and you may want
the hub/CTA to show a "course complete" state when it's set.

---

## 2. The one-sentence goal (Phase 4)

The learner should be able to take any "wishlist" feature — **Portal** (the earned cross-reference),
**Journey** (reading at the reader's pace), **Themes & tags**, **Research mode** — and **show it
reduces to primitives already locked in Phases 1–3 (Anchor, Cross-reference, presentation rules,
reading progress, the lexicon), with no new data model** — so Phase 4 is a *gate + a skin*, not a
schema, and the four-phase "design all, build in order" bet (ADR-0005) pays off.

---

## 3. Biblical / tangible concepts to teach (bottom-up, plain language)

Lead with the felt reading experience the learner can already picture
([`../WISHLIST.md`](../WISHLIST.md) is the source for all of this):

- **A word that glows once you've earned it.** Read Genesis 1, reach John 1, and the word
  *"beginning"* quietly glows; follow it and you're carried back to "In the beginning God created,"
  now resonating against "In the beginning was the Word." That's a **Portal** — discovery as reward,
  reading as **adventure**, not a handout.
- **The Bible as a collection of scrolls, opened gradually.** Most people feel *overwhelmed* by the
  Bible. The **Journey** meets a reader where they are: a few books open to start, one bookmark per
  book, a limit on open scrolls, and new books unlocking as you finish your current leg.
- **Tagging passages by how they relate to you.** A reader marks a story with a **theme** —
  forgiveness, anger, the Spirit of God — and the app learns to *suggest* tags from the reader's own
  notes, teaching the habit early.
- **Going deeper, one step at a time.** **Research mode** is the word-tap (gloss → original →
  meaning) extended carefully: a translation on hover, a study note surfaced *one step at a time*,
  the deeper lexicon — never a wall of tabs.

> **Callback to open with:** every one of these is a *reading* experience built on the **Anchor**
> (Module 0) and the four phases already taught. Phase 4 doesn't add a fifth world — it *composes*
> the four you have.

---

## 4. App mechanics to teach (cite as you go)

Sources: [`../WISHLIST.md`](../WISHLIST.md) (the keystone — Portal, Journey, Themes & tags, Research
mode, "the engine underneath"), [`../VISION.md`](../VISION.md) (the why/feel), and
[`../docs/adr/0005-four-product-phases-design-all-build-in-order.md`](../docs/adr/0005-four-product-phases-design-all-build-in-order.md)
(design-now-build-later — the licence for Phase 4 to be schema-free). Supporting:
[`../docs/adr/0001-three-layer-anchor-model.md`](../docs/adr/0001-three-layer-anchor-model.md) (the
Anchor + `cross_reference`/`tag` reusing the anchor column-group), [`../CONTEXT.md`](../CONTEXT.md)
(**Cross-reference** — already pinned, with the explicit note "*A Portal is a Cross-reference gated by
reading progress*"), [`../OVERVIEW.md`](../OVERVIEW.md), [`../schema.dbml`](../schema.dbml)
(`cross_reference`, `tag` — the anchor column-group reused verbatim).

- **Portal = a gate + a skin over a Cross-reference (WISHLIST).** A
  <span>Cross-reference</span> is the editorial, shipped link between two Anchors (the read-only
  sibling of a user's Connector). A **Portal** adds nothing to the data model — it's that same
  Cross-reference with **(a)** a *visibility gate* (reading progress / collected clues) and **(b)** a
  *presentation skin* (glow + transport). "No new data model. It is a gate and a skin." This is the
  cleanest possible demonstration of MISSION criterion #4.
- **Journey = reading progress + an unlock gate, no new primitive (WISHLIST).** Scrolls (books) with
  one bookmark each, an open-scroll limit, and books that unlock as you finish your current leg —
  all of it rides on **reading progress** (a position per book) plus the **same earned-unlock gate**
  the Portal uses. (The course hub you're building *into* already mirrors this — module cards
  unlock the next on a completed check. Use that as the interleave hook: the learner has literally
  been *using* a Journey to learn this.)
- **Themes & tags = the Anchor column-group, reused (ADR-0001 / schema `tag`).** A user tags a
  passage with a theme; a `tag` row is just another anchored entity reusing the **same coordinate
  column-group** as a Mark/Note. Tag *suggestion* is a read over the user's own notes — a surface of
  the engine below, not a new store.
- **Research mode = a surface over the Phase-3 lexicon (WISHLIST).** Translation-on-hover, incremental
  resource suggestions, deeper Strong's/BDB/morphology — all reads over the **Original Word hub +
  lexicon** you taught in Module 3, paced "one step at a time" (the anti-"too much information"
  stance). Nothing new underneath.
- **The engine underneath = journey state, one model many surfaces (WISHLIST §"engine").** Journey
  progression, Portal/clue pacing, and tag suggestion all draw on one latent thing — **what the
  reader has read and how familiar they are.** "One model, many surfaces. Worth building once,
  later." This is the synthesis beat: the place all four features converge.
- **Teaching-honesty beats.** Phase 4 is **post-POC and deliberately unlocked** — "Not committed,
  not scoped" (WISHLIST header). The POC ships only a **mocked, scripted** Portal glow (finish John 1
  → "beginning" glows → Genesis 1:1) as a *taste* (POC option B). Saying "this is the least-decided
  phase, and that's on purpose — it's design-now-build-later proven" is honest teaching, exactly like
  Phase 1's "unvalidated round-trip" and Phase 3's "sourcing is the open risk."

---

## 5. Suggested lessons (short, one win each; games + recall in every one)

- **`0012` — "The earned cross-reference: Portal."** Cross-reference (editorial link between two
  Anchors) → Portal = same link + a reading-progress gate + a glow/transport skin; *no new data
  model*. The "beginning" thread (Gen 1 ↔ John 1) as the worked example — and a callback to the
  Original Word hub (the glow can ride word-grain now). **Game:** `connect` each Portal ingredient ↔
  the already-locked primitive it reuses (gate ↔ reading progress; link ↔ Cross-reference; glow ↔
  presentation). **Diagram:** Portal as a thin gate+skin wrapper around a Cross-reference.
- **`0013` — "Reading at your pace: Journey, themes & tags."** Scrolls + bookmark + open-scroll
  limit + unlock-as-you-finish, all on reading progress + the earned-unlock gate; tags as the Anchor
  column-group reused; tag suggestion as a read. **Game:** `sequence` the Journey unlock flow (start
  with a few books → finish a leg → next books open → limit grows), or `connect` feature ↔ primitive.
  **Diagram:** the Journey unlock ladder (echo the course hub's own module-unlock visual).
- *(Optional)* **`0014` — "One engine, many surfaces: journey state & research mode."** The latent
  journey-state model feeding Journey, Portal pacing, and tag suggestion; Research mode as a paced
  surface over the Phase-3 lexicon. The synthesis lesson: *the whole app is the four phases composed.*
  **Game:** `connect` each surface ↔ "journey state" vs "lexicon" as the thing it reads. **Diagram:**
  one engine (journey state) fanning out to many surfaces.

**Module check (this is the LAST module):** put `completeId="check-advanced"` on the **terminal check
of your last authored lesson** (0014 if you do it, else 0013), and **add `checkId: 'check-advanced'`
to `m4`** in the manifest. That flips Module 4 → Done and completes the course. Give the earlier
lessons their own ids (`"0012"`, `"0013"`). Consider a "course complete" CTA/state on the hub when
`check-advanced` is set (check `Modules.tsx` for where the next-module CTA renders).

---

## 6. Glossary terms to add (only after the learner uses them correctly)

`Portal`, `Journey`, `Cross-reference` (promote — it's pinned in CONTEXT but not yet in the learned
subset), `Theme` / `Tag`, and optionally `journey state` — use [`../CONTEXT.md`](../CONTEXT.md) +
[`../WISHLIST.md`](../WISHLIST.md) as the authority, phrased beginner-facing. **Do not pre-seed them**
on authoring: per `GLOSSARY-FORMAT`, terms are promoted only once the learner *demonstrates* them.
(Phases 1–3 deliberately added none for the same reason.)

---

## 7. Wire-up after authoring

1. **Module manifest** ([`src/data/modules.ts`](src/data/modules.ts)) — give `m4` a `checkId`
   (`'check-advanced'`), an `href` (`/lessons/0012-the-earned-cross-reference`), and a `lessonHints`
   string (mirror `m1`/`m2`/`m3`). With those, the hub auto-shows Module 4 as **Ready** when unlocked.
2. **Chaining** — each lesson's `next-links` footer points to the next; the last points back to `/`
   ("Course complete →" / "Back to the start"). Set `module: 4` and `order: 12/13/14` in each
   frontmatter.
3. **Learning record** — write one **only if the learner demonstrates understanding** (per
   `LEARNING-RECORD-FORMAT`; coverage ≠ learning). Authoring the lessons is *not* grounds for a record.
4. **`NOTES.md`** — flip the Module-4 structure line to DONE when finished; add any new stated learner
   preferences. With Module 4 done, the **5-module course is complete** — note that.
5. **Course-complete polish (optional)** — since this is the last module, consider a closing
   reference page or a "you've walked the whole blueprint" state on the hub, tying back to MISSION's
   four success criteria. There is no Phase-5 handoff to leave.

---

## 8. How to build the interactive pieces (reuse + gotchas — unchanged from Phases 2–3)

**Reuse the islands** — `Quiz`, `Connect`, `Sequence`, `Recall` exist and are verified. Import them
into MDX and pass props (`completeId`, `questions`/`pairs`/`items`, `title`, `hint`). New **diagrams**
are `.astro` components under `src/components/diagrams/` (SVG + a scoped `<style>`). New **game types**,
if needed, go in `src/islands/` as Preact components — never inline.

**Gotchas (don't rediscover them):**

- **Hydrate `client:idle`, not `client:visible`** — the games are the unlock gate and the verify
  preview runs a 0×0 viewport, so the IntersectionObserver never fires there. `client:idle` is
  deferred but robust.
- **MDX/Astro escaping:** in an **`.astro`** template a literal `{` is a JS expression — render
  `{ a, b }` as a string (`{'{ a, b }'}`); a bare `{ x, y }` in `<text>` throws at build. In **MDX**
  prose, `{` also starts an expression — use a code span (`` `{x:1}` ``). In a JS prop string a
  backslash needs doubling. **YAML frontmatter:** an unquoted `summary`/`lede` with a `word: word`
  colon-space breaks the build (`bad indentation of a mapping entry`) — quote the value or reword
  (this bit Phase 3). MDX applies **smart quotes** (`'` → `’`) in prose — don't match a straight
  apostrophe in any verification `eval`; match on a distinctive substring instead.
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
   For `Connect`, match by a **distinctive substring** of the right-hand text (the column is shuffled
   and prose gets smart-quoted). Confirm green feedback and that the `completeId` lands in
   `localStorage['bc.completed']`.
3. On the hub: completing the module's terminal check flips Module 4 → **Done**. Verify computed
   diagram styles via `preview_eval` (`getComputedStyle` on a diagram class) — the screenshot tool
   ignores scroll, so style/geometry asserts are the reliable proof.
4. `fnm exec --using=22 pnpm -C teach build` must succeed with no warnings.

---

## 10. Reference index

- **Phase-4 sources (no ADR — that's the point):** [`../WISHLIST.md`](../WISHLIST.md) (Portal,
  Journey, Themes & tags, Research mode, the engine), [`../VISION.md`](../VISION.md) (the feel).
  Licence/build-order rationale: [0005 design-all-build-in-order](../docs/adr/0005-four-product-phases-design-all-build-in-order.md).
  Supporting primitives: [0001 Anchor](../docs/adr/0001-three-layer-anchor-model.md) (the
  `cross_reference`/`tag` anchor column-group), [`../CONTEXT.md`](../CONTEXT.md) (**Cross-reference**),
  [`../schema.dbml`](../schema.dbml) (`cross_reference`, `tag`).
- **Workspace:** this file · [`HANDOFF-phase3-lexicon.md`](HANDOFF-phase3-lexicon.md) and
  [`HANDOFF-phase2-annotation.md`](HANDOFF-phase2-annotation.md) (worked examples) ·
  [`HANDOFF.md`](HANDOFF.md) (the build + Phase-1 pattern) · the five `.md` state files ·
  `learning-records/`. **Skill + formats:** `~/.claude/skills/teach/`.
