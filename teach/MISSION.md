# Mission: Understanding bible-codex (the biblical domain + its architecture)

## Why
I own and am designing bible-codex, but I'm a beginner at biblical terminology — and
that gap makes the app's blueprint (Anchors, Tokens, Original Words, versification…) hard
to reason about. I want to genuinely understand *both* the biblical concepts *and* the
architecture built on them, so I can confidently extend the design, defend its decisions,
and onboard a future developer into the same dual understanding.

## Success looks like
- I can read any term in `CONTEXT.md` or any `docs/adr/*` and explain it in plain language without a lookup.
- I can explain *why* a design choice exists in terms of the biblical reality it serves (e.g. why the corpus is a token-stream and not a verse-list; why an Anchor is a coordinate, not pixels).
- I can walk a new developer, unprompted, through the four-schema / two-bridge data model and where any feature lands.
- I can take a WISHLIST idea (Portal, Journey) and map it onto the already-locked primitives, with no new data model.

## Constraints
- Beginner at biblical concepts — teach the domain bottom-up, never assume it.
- Comfortable with software architecture — the bottleneck is the *biblical* side and how it maps to the model, not databases or code.
- Teach **progressively, little by little** — one tightly-scoped win per lesson.
- I learn best with **lots of feedback (quizzes, questions) and diagrams**.
- All teaching artifacts live in `teach/`.

## Out of scope (for now)
- Devotional / theological study for its own sake — only the concepts the app models.
- Learning to read Greek/Hebrew as a language — only enough to understand the lexicon/interlinear features.
- Actually *implementing* the RN-Skia v1 — this mission is understanding the blueprint, not building it yet.
