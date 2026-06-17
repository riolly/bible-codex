# Two annotation classes: portable Markup, scoped Ink — Markup first

User marks split into two classes with opposite physics. **Markup** is a semantic annotation (underline, box, circle, arrow, highlight, strike) that *targets* a token/verse/original-word and is re-rendered by the app from `{target, style}`. **Ink** is freehand pen strokes captured over one translation's rendered layout — the "physical Bible" feel and the product's emotional differentiator. Because Markup stores a reference rather than pixels, it reflows across font changes, ports across translations, is queryable by research mode, syncs as tiny rows, and runs in a browser. Ink does none of these. We therefore **build Markup first** and treat Ink as a later, tablet-native phase.

## Considered options

- **Ink first (as the original drawing plan implied)** — rejected: our own roadmap (font/typeface customization, multiple translations) reflows or replaces the layout Ink is glued to, so v1 Ink would silently break under v2 features. Ink also can't run on the web prototype, where pen feel is unevaluable anyway.
- **One unified mark model** — rejected: a freehand path cannot be reduced to `{target, style}` without losing its expressive feel, and a semantic mark gains nothing from being stored as pixels.

## Consequences

- Desktop and web carry reading + Markup but **not** Ink; Ink is tablet-only (Android then iPad).
- Ink reflow is honest only at the verse-block grain; Markup is the class that genuinely reflows and ports.
