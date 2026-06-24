# Handoff — teaching workspace: Astro+Preact rewrite + Phase 1 module

> **For the next agent.** Two jobs, in order: **(A)** migrate this teaching workspace from
> hand-written static HTML to **Astro + Preact**, then **(B)** author the **Phase 1 (Reading)**
> learning module in the new setup. Read §0–§2 for context, then execute §3 (Job A) and §4 (Job B).
>
> **Created:** 2026-06-25 · **Decided by:** project owner (riolly) · **Status:** not started.

---

## 0. Prerequisites — what this workspace is

`teach/` is a **teaching workspace** produced by the `/teach` skill
(`~/.claude/skills/teach/SKILL.md`). It teaches the owner — a **beginner at biblical concepts
but fluent in software architecture** — to understand *both* the biblical domain *and* the
bible-codex blueprint, interleaved. It is also meant to onboard a future developer.

**Read these first (they are the workspace's own state, keep them as `.md`):**
- [`MISSION.md`](MISSION.md) — the why + success criteria. All teaching traces to this.
- [`NOTES.md`](NOTES.md) — learner preferences, the **5-module structure**, the games decision.
- [`learning-records/0001-starting-floor.md`](learning-records/0001-starting-floor.md) — the learner's ZPD: teach the *biblical* side bottom-up, assume architecture fluency, **interleave** (Bible idea → app mechanic) every lesson.
- [`GLOSSARY.md`](GLOSSARY.md) — the learned-terms subset (grows as terms are demonstrated). The repo's [`../CONTEXT.md`](../CONTEXT.md) is the **authoritative full glossary**.
- [`RESOURCES.md`](RESOURCES.md) — trusted sources (repo docs + verified external).

**Skill format specs** (obey them): `~/.claude/skills/teach/{MISSION,GLOSSARY,LEARNING-RECORD,RESOURCES}-FORMAT.md`.

---

## 1. Current state (what exists today)

Static HTML + shared vanilla-JS assets. **No build step** — served via a static file server.

```
teach/
├── index.html                         # course hub: 5 module cards + a sequence game
├── lessons/
│   ├── 0001-the-anchor.html           # Module 0 · Lesson 1 — the Anchor (keystone)
│   └── 0002-two-worlds-and-spokes.html# Module 0 · Lesson 2 — two data worlds + spokes/hubs
├── reference/
│   └── architecture-map.html          # one-page diagram: 4 schemas, 2 bridges, 3 seams
├── assets/
│   ├── styles.css                     # design system (CSS vars, Tufte-ish, print rules)
│   ├── quiz.js                        # MCQ + recall-card widgets (config via embedded JSON)
│   └── games.js                       # connect-arrows + sequence-puzzle games (ditto)
├── MISSION.md GLOSSARY.md RESOURCES.md NOTES.md
└── learning-records/0001-starting-floor.md
```

**Module structure (the course spine — preserve it):**
- **Module 0 · Overview** — Anchor, two data worlds, spokes & hubs, the 4-phase map. ✅ *Done* (L1, L2, architecture-map).
- **Module 1 · Phase 1 — Reading** — **← Job B authors this next.**
- Module 2 · Phase 2 — Annotation · Module 3 · Phase 3 — Lexicon · Module 4 · Remaining — Advanced. *(Later.)*

**Lesson numbering:** global + sequential (`0001`, `0002`, …). Module grouping lives in the hub, not the filename. Phase 1 lessons therefore start at **`0003`**.

**The tested interactive logic lives in `assets/{quiz,games}.js` — reuse these algorithms when porting to Preact. They are correct and verified:**
- `quiz.js`: MCQ with immediate per-question feedback; recall flip-card.
- `games.js` → **connect**: click a left term → its right match; correct draws a locking green SVG line; right column is shuffled; redraws matched lines on resize. **sequence**: tap chips into order; per-slot green/red; reset. ⚠️ **Critical detail to preserve:** in `sequence`, call `render()` *before* `check()` — otherwise `render()` rebuilds the slots and wipes the green/red classes `check()` just set. (This was a real bug, already fixed here.)

**How to run it now:** `launch.json` has a `teach` config → `python3 -m http.server 4178` from repo root. Open `http://localhost:4178/teach/index.html`. (This config gets replaced in Job A.)

**Note:** no `pnpm-workspace.yaml` at repo root; `prototype/` and `prototype-usfm/` are independent projects with their own `node_modules`. The Astro `teach/` project should be **independent** the same way.

---

## 2. Why the rewrite (the three bugs are symptoms of a ceiling)

| Reported issue | Root cause | Fixed by |
|---|---|---|
| Clicking a module card (e.g. "Module 0 · Overview") navigates nowhere | only the inner `<a>`s are links; the card isn't | make the whole card a link/component |
| Completing the ordering game shows no "next" / unlock | the game has no shared state anything can react to | island emits a `complete` event → reveal Next CTA / unlock next module |
| Top nav is inconsistent across pages | nav HTML is **hand-copied** into every file and has drifted | one `<Layout>` + `<CourseNav>` — single source of truth |

Pure static HTML cannot share a header cleanly, and has no state model for progress/unlock — which the course needs as it grows (and which mirrors bible-codex's own **Journey / earned-unlock** idea). Hence: **Astro (zero-JS by default, hydrate only islands) + Preact (small, for the interactive islands).** Not full React — proportionate.

---

## 3. Job A — migrate to Astro + Preact (full)

### 3.1 Target structure
```
teach/
├── astro.config.mjs            # integrations: @astrojs/preact, @astrojs/mdx
├── package.json                # scripts: dev / build / preview
├── tsconfig.json
├── src/
│   ├── layouts/Layout.astro     # <head>, global.css, <CourseNav/>, ask-teacher footer
│   ├── components/
│   │   ├── CourseNav.astro       # ONE nav — fixes the drift
│   │   ├── ModuleCard.astro      # whole card is a link
│   │   ├── PrimarySource.astro   # the "read this next" block
│   │   └── diagrams/*.astro       # the SVGs (AnchorDiagram, SchemaMap, SpokesHub, TwoWorlds)
│   ├── islands/                  # Preact (.tsx), hydrated
│   │   ├── Quiz.tsx               # port quiz.js
│   │   ├── Connect.tsx            # port games.js connect (keep shuffle + resize redraw)
│   │   ├── Sequence.tsx           # port games.js sequence (KEEP render-before-check)
│   │   └── progress.ts            # nanostores/persistent → localStorage (completed lessons)
│   ├── content/
│   │   ├── config.ts              # lessons collection schema (title, module, order, slug, summary)
│   │   └── lessons/*.mdx          # prose + inline <Connect/> <Sequence/> <Quiz/>
│   ├── styles/global.css          # = current assets/styles.css (carry over verbatim, then trim)
│   └── pages/
│       ├── index.astro            # course hub: reads lessons collection + progress → module status
│       ├── lessons/[...slug].astro
│       └── reference/architecture-map.astro
├── public/
│   └── fonts/Cardo-*.ttf          # copy from ../prototype/public/fonts (see 3.4)
└── MISSION.md GLOSSARY.md RESOURCES.md NOTES.md learning-records/ HANDOFF.md
```
The five `.md` state files + `learning-records/` **stay at `teach/` root** (the `/teach` skill expects them there). Astro only owns `src/`, `public/`, configs.

### 3.2 Steps
1. **Scaffold.** From `teach/`: `pnpm create astro@latest . --template minimal --no-install` (it must coexist with the existing `.md` files — choose "continue" if it warns the dir isn't empty; do **not** let it delete the `.md`/`learning-records`). Then `pnpm add -D @astrojs/preact @astrojs/mdx preact` and add both integrations in `astro.config.mjs`.
2. **Global CSS.** Copy `assets/styles.css` → `src/styles/global.css`; import once in `Layout.astro`. Keep the CSS variables/design tokens. The `.quiz`/`.game`/`.connect`/`.seq` rules stay (the islands reuse the same classnames).
3. **Layout + nav.** Build `Layout.astro` (props: `title`, `eyebrow`, breadcrumb). Build `CourseNav.astro` with the canonical links (Course home · Architecture map · Glossary). Every page/lesson uses Layout → nav can no longer drift.
4. **Islands.** Port `quiz.js`, `games.js` logic into `Quiz.tsx`, `Connect.tsx`, `Sequence.tsx` (Preact + hooks/signals). Same behavior, same classNames. Hydrate with `client:visible` (games are below the fold) — `client:load` only if above fold.
5. **Progress store.** `src/islands/progress.ts` using `@nanostores/persistent` (+ `@nanostores/preact`) keyed in `localStorage` (e.g. `bc.completed = ["0001","0002"]`). A lesson marks itself complete when its game/quiz is finished; the hub computes each module's status (Ready / In progress / Locked) and **unlocks the next** module. This is the headline feature the rewrite enables — wire it.
6. **Content.** Define the `lessons` content collection (`src/content/config.ts`). Convert `0001`, `0002` HTML → `*.mdx`: prose as Markdown, SVGs as `diagrams/*.astro` components, interactive bits as `<Connect/>`/`<Sequence/>`/`<Quiz/>` with their JSON moved to component props. The architecture-map → `reference/architecture-map.astro` (its two SVGs → diagram components; **keep the already-fixed geometry** — boxes lowered, alignment arc over the top, non-overlapping labels).
7. **Pages.** `index.astro` renders `ModuleCard`s from a small module manifest + the lessons collection + progress. Each card is a single link. Add a **Next CTA** that appears when a module's check is complete.
8. **launch.json.** Replace the `teach` config (currently `python3 -m http.server 4178`) with Astro dev: `runtimeExecutable: "pnpm"`, `runtimeArgs: ["-C", "teach", "dev"]`, `port: 4321`.
9. **Parity then delete.** Reach feature parity (both lessons + hub + reference render, all games work, nav consistent, progress persists) **before** deleting the old `index.html`, `lessons/*.html`, `reference/*.html`, `assets/*.js`. Keep `assets/styles.css` only if not yet fully migrated; otherwise remove. Verify per §5, then delete the static files in the same change.

### 3.3 Gotchas
- **MDX + islands** need an explicit `client:*` directive or they ship as static markup (no interactivity).
- **SVG in MDX** is fiddly; prefer `.astro` diagram components imported into the MDX.
- **Keep the print CSS** (`@media print`) — reference docs are meant to print well (Tufte goal).
- **`<` and `{}` in MDX** can break parsing (e.g. `{ x: 340 }` in code) — wrap literal braces or use code fences.
- Don't let `create astro` scaffolding clobber the root `.md` files or `learning-records/`.

### 3.4 Optional polish (do if cheap)
- **Bundle the Cardo serif.** `assets/styles.css` asks for `"Cardo"` but no font is bundled, so it falls back to Georgia. Copy `../prototype/public/fonts/Cardo-{Regular,Italic,Bold}.ttf` → `teach/public/fonts/` and add `@font-face` in `global.css` for the literary look the app is going for.

### 3.5 Acceptance criteria (Job A)
- [ ] Nav is identical on every page (one component) and every link resolves.
- [ ] Every module card is fully clickable.
- [ ] Finishing the hub's sequence game reveals a **"Start Phase 1 →"** CTA.
- [ ] Lesson/module completion persists across reload (localStorage) and unlocks the next module.
- [ ] All three islands (Quiz/Connect/Sequence) behave exactly as the verified vanilla versions — incl. the sequence render-before-check fix.
- [ ] No console errors; `pnpm -C teach build` succeeds; print layout intact.
- [ ] Old static `*.html` + `assets/*.js` removed once parity is verified.

---

## 4. Job B — author the Phase 1 (Reading) module

Do this **in the new Astro setup** (after Job A). This is **teaching content**, not infra — ground every claim in the repo docs (cite them), follow the learner's ZPD (Bible idea first, plain language; then the app mechanic).

> **Before teaching:** the learner may not have completed Module 0's checks yet. Open with a 2-line recap of the three Overview keystones (Anchor · two worlds · spokes/hubs), since Phase 1 builds on them.

### 4.1 The one-sentence goal
The learner should be able to explain **why scripture is stored as a Token stream with Block overlays (not as a list of verses)** — and how that choice serves *genre-aware literary beauty* and *stable addressing*.

### 4.2 Biblical concepts to teach (bottom-up, beginner)
- **Scripture has literary *shape* (genre).** Narrative/prose, **poetry** (parallelism, indented lines/cola), and **headings/titles** (incl. Psalm superscriptions). The *same* text reads differently by genre — and bible-codex's core bet is typesetting each to its form. (Source: BibleProject *How to Read the Bible* — narrative/poetry/prose-discourse; see RESOURCES.)
- **`book·chapter·verse` recap**, then the twist: **verse numbering is not universal.** Different traditions number differently — **Psalm titles**, **Joel**, **Malachi**, **Revelation 12/13**, Hebrew/LXX splits. So `chapter:verse` is not a free universal key.

### 4.3 App mechanics to teach (the Phase 1 schema)
Cite as you go: [`../docs/adr/0001-three-layer-anchor-model.md`](../docs/adr/0001-three-layer-anchor-model.md), [`../docs/adr/0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md`](../docs/adr/0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md), [`../CONTEXT.md`](../CONTEXT.md) (Token, Block, Canonical Verse, Translation Verse, Versification Map), [`../data-architecture.md`](../data-architecture.md) (P1 row), [`../schema.dbml`](../schema.dbml) (P1 tables).
- **Token** — one word- or punctuation-occurrence in a translation; the storage/render/hit-test unit. Whitespace is **not** a Token (spacing is presentation).
- **Block** — a contiguous Token range = one literary unit (prose paragraph / poetry line / heading), carrying genre + indent. **Blocks partition the token stream** (every Token in exactly one Block). Derived from **USFM** markers (`\p`, `\q#`, …). Headings sit *outside* the verse sequence (verse = NULL, not anchorable in v1).
- **Why token-stream, not verse-as-storage** (the key insight, ADR-0001): a verse *crosses* paragraph and poetry-line boundaries, so storing by verse would block genre-aware typesetting. Two independent overlays on one stream: **Blocks** (for beauty) and **verses** (for addressing).
- **Canonical Verse vs Translation Verse vs Versification Map** — canonical `(book,chapter,verse)` in one chosen versification (`av11n`); each translation's native numbering reconciled via its map. (Flag the repo's open risk: the versification round-trip is **UNVALIDATED** — see [`../OVERVIEW.md`](../OVERVIEW.md) §5. Good honesty note for the lesson.)
- **Layout-adjust table / presentation = rules layer** (ADR-0004): user-tunable spacing/indent/font/margins reference **canonical structure (Block, verse), never pixels**; computed layout is ephemeral. Ties back to the Anchor philosophy from Module 0.

### 4.4 Suggested lessons (short, one win each)
- **`0003` — "Scripture has shape: Token & Block."** Genre → typesetting; why store words+blocks, not verses. **Game:** `connect` (match genre → Block type: prose paragraph / poetry line / heading) and/or a `sequence` (USFM markers → Token stream → Blocks → rendered page).
- **`0004` — "Same verse, different numbers: Canonical Verse & Versification."** Why `chapter:verse` isn't a universal key; canonical vs translation verse; the map. **Game:** `connect` divergent cases (e.g. "Psalm title" ↔ "is verse 1 in Hebrew, unnumbered in KJV"). Include the "unvalidated round-trip" caveat as a teaching-honesty beat.
- *(Optional `0005`)* "Your layout, your rules" — the layout-adjust table + ADR-0004 (presentation as rules, computed layout ephemeral).

### 4.5 Glossary terms to add (only after the learner uses them correctly)
`Token`, `Block`, `Canonical Verse` (already seeded), `Translation Verse`, `Versification Map`, and a beginner "Genre / literary form" note. Use `CONTEXT.md` definitions as the authority; phrase beginner-facing.

### 4.6 Wire-up after authoring
- Hub: Module 1 badge → **Ready**, add the lesson links; ensure the new progress/unlock logic includes the Phase 1 lessons.
- Write a **learning record** *only if* the learner demonstrates understanding (per LEARNING-RECORD-FORMAT — coverage ≠ learning).
- Update `NOTES.md` if the learner states new preferences.

---

## 5. Verification (both jobs)
Use the `preview_*` tools, not manual asking. After Job A, `preview_start` the `teach` (Astro) config, then for each page: `preview_console_logs` (expect none at `error`), `preview_eval`/`preview_snapshot` to confirm structure, and **exercise every game** (click through connect + sequence, confirm green/red feedback, completion event, and persisted progress on reload). Screenshot the hub + one lesson for proof. The previous agent verified the vanilla games this way — match that bar.

## 6. Reference index
- Repo blueprint: [`../OVERVIEW.md`](../OVERVIEW.md) (map + locked/reversible), [`../CONTEXT.md`](../CONTEXT.md) (glossary), [`../data-architecture.md`](../data-architecture.md), [`../docs/adr/`](../docs/adr/) (0001–0007), [`../schema.dbml`](../schema.dbml), [`../VISION.md`](../VISION.md), [`../WISHLIST.md`](../WISHLIST.md).
- Workspace: this file + the five `.md` state files + `learning-records/`.
- Skill + formats: `~/.claude/skills/teach/`.
