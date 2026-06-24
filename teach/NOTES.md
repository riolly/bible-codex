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
Course hub = `index.html` (lists modules + status badges).
- **Module 0 · Overview** — Anchor, two data worlds, spokes & hubs, the 4-phase map. *(DONE: lessons 0001, 0002 + architecture-map reference.)*
- **Module 1 · Phase 1 — Reading** — Token, Block, Canonical Verse, Versification, layout. *(NEXT)*
- **Module 2 · Phase 2 — Annotation** — Markup vs Ink, scene graph, Layer.
- **Module 3 · Phase 3 — Lexicon** — Original Word hub, Alignment, Strong's/lemma/morphology.
- **Module 4 · Remaining — Advanced** — Portal, Journey, themes/tags, research mode.
Lessons keep **global sequential numbering** (0001, 0002, …); the *module* grouping lives in `index.html`.

## Interactive games (learner request, 2026-06-25)
Use games for checks, not just MCQ. Reusable components in `assets/games.js`:
- **connect** — connect-the-arrows matcher (click left term → right match; correct = green line). Great for term↔meaning, world↔role.
- **sequence** — tap chips into the correct order (e.g. the four phases; later: word-tap reveal rungs).
Build new game types here as components when a module needs them; never inline.

## Environment quirks
- A repo session hook ("caveman mode") compresses chat replies. **Lessons and teaching prose
  stay in full clear English** — terseness would defeat a beginner's comprehension.
- App does not exist yet (docs + throwaway prototype only). Teaching is about the *blueprint*,
  grounded in the repo docs as primary sources.
