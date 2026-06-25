# Teaching notes — bible-codex

Working notes on how the user wants to be taught. Refer back when designing lessons.

## Learner preferences (stated)
- **Progressive, little by little** — one tightly-scoped win per lesson; don't dump.
- **Lots of feedback** — quizzes, recall prompts, questions. Build retrieval into every lesson.
- **Diagrams** — explain visually wherever possible (SVG in the HTML lessons).
- Output lives in `teach/` (this workspace).

## Who the learner is
- Owner/architect of bible-codex (git user `riolly`); wrote/commissioned the ADRs + prototype.
- **Self-identified beginner at biblical terminology** — this is the real bottleneck.
- Comfortable with software architecture; the hard part is the *biblical* side and mapping it to the model.
- Secondary audience: a **future new developer** should be able to walk this same path. Keep artifacts onboarding-quality and self-contained.

## Teaching approach (chosen)
- **Interleave** each lesson: lead with the *biblical* concept (plain language), then the
  *app* mechanic built on it. This matches the learner's own framing of "two hard things."
- Glossary grows only as terms are *demonstrated*, per GLOSSARY-FORMAT. `CONTEXT.md` is the
  full canonical dictionary; workspace `GLOSSARY.md` is the learned subset.

## Course structure — MODULES (learner request, 2026-06-25)
Break the path into **5 modules, one short session each**, so nothing runs too long.
Course hub = `src/pages/index.astro` (renders module cards + status badges, reactive to progress).
- **Module 0 · Overview** — Anchor, two data worlds, spokes & hubs, the 4-phase map. *(DONE: lessons 0001, 0002 + architecture-map reference.)*
- **Module 1 · Phase 1 — Reading** — Token, Block, Canonical Verse, Versification, layout. *(DONE: lessons 0003–0005 + TokenBlockStream / Versification / LayoutRules diagrams.)*
- **Module 2 · Phase 2 — Annotation** — Markup vs Ink, scene graph, Layer. *(DONE: lessons 0006–0008 + TwoPhysics / SceneGraph / SyncFirstStore diagrams.)*
- **Module 3 · Phase 3 — Lexicon** — Original Word hub, Alignment, Strong's/lemma/morphology. *(NEXT — spec in `HANDOFF-phase3-lexicon.md`.)*
- **Module 4 · Remaining — Advanced** — Portal, Journey, themes/tags, research mode.
Lessons keep **global sequential numbering** (0001, 0002, …); the *module* grouping lives in the
module manifest `src/data/modules.ts`. The hub computes Ready / Coming soon / Locked / Done from
the persisted progress store and unlocks the next module's check.

## Interactive games (learner request, 2026-06-25)
Use games for checks, not just MCQ. Now Preact island components in `src/islands/`:
- **Connect.tsx** — connect-the-arrows matcher (click left term → right match; correct = green line). Great for term↔meaning, world↔role.
- **Sequence.tsx** — tap chips into the correct order (e.g. the four phases; the layout cascade).
- **Quiz.tsx** / **Recall.tsx** — MCQ with per-question feedback; free-recall flip card.
Islands mark their `completeId` done on completion → drives the unlock store. Hydrate `client:idle`
(deferred but reliable — the headless preview can't fire `client:visible`'s IntersectionObserver).
Build new game types here as island components when a module needs them; never inline.

## Tooling decision (2026-06-25) — DONE
Workspace moved from static HTML → **Astro 7 + Preact (full)**: one shared `Layout.astro` +
`CourseNav.astro` (nav drift fixed), MDX lessons, Preact island games, and a persistent progress
store (`@nanostores/persistent` → localStorage) driving completion → unlock-next. The three
original issues are resolved (every module card is one link; the sequence game reveals a Next CTA;
nav is a single component). The old static `index.html` / `lessons/*.html` / `reference/*.html` /
`assets/*` were removed after parity was verified. Diagrams are `.astro` components under
`src/components/diagrams/`; the five `.md` state files + `learning-records/` stay at `teach/` root.
**Run it:** the `teach` launch config (`fnm exec --using=22 pnpm -C teach dev`, port 4321) — Astro 7
needs Node ≥22.12 (pinned in `.node-version`); `pnpm -C teach build` for the static build.

## Environment quirks
- A repo session hook ("caveman mode") compresses chat replies. **Lessons and teaching prose
  stay in full clear English** — terseness would defeat a beginner's comprehension.
- App does not exist yet (docs + throwaway prototype only). Teaching is about the *blueprint*,
  grounded in the repo docs as primary sources.
