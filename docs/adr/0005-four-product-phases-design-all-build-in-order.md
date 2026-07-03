# Four product phases: design the data model for all, build in order

The product roadmap is four feature phases — **P1** beautiful text + layout-adjust, **P2**
handwriting & notes (the annotation layer), **P3** lexicon / Strong's (the Original Word hub +
interlinear alignment + a separate lexicon reference schema), **P4** advanced (Portal, Journey,
Themes, research-mode deepening). **P1 and P2 are the priority.** The data model is **architected
for all four phases now**, but each schema is built and populated only when its phase arrives;
only the three migration-fatal seams ([ADR-0001](0001-three-layer-anchor-model.md),
[ADR-0003](0003-annotations-are-a-scripture-anchored-scene-graph.md)) are locked from P1.

The surprising part worth recording: **annotations (P2) ship before the lexicon / Original Word
hub (P3)** — the opposite of what "research tool first" intuition suggests.

## Considered options

- **Lexicon before annotations** — rejected: handwriting & notes is the product's emotional
  differentiator and its authoring loop is already prototype-proven, whereas the lexicon is
  heavier data work entangled with sourcing and licensing. Shipping P1+P2 delivers the product's
  soul first; the lexicon deepens it later.
- **Build only the current phase's data model (no forward design)** — rejected: the migration-fatal
  seams must exist from P1 or a later phase forces a corpus/anchor migration. They are cheap to
  stub now (e.g. the nullable `ow_id` / `Anchor.originalWord` slot) and expensive to retrofit.

## Consequences

- **Word-target Markup created in P2 ports across translations at verse grain only until P3.**
  The Original Word hub (`token.ow_id` / `Anchor.originalWord`) stays null until P3 populates it;
  the verse-first-word fallback (prototype-validated) covers the gap. **No migration when P3
  lands — the column already exists.**
- [ADR-0002](0002-two-annotation-classes-markup-first.md)'s "Markup before Ink" is now an
  ordering *internal to P2*, not a top-level phase ordering.
- "Phase" now denotes the **product-feature axis** repo-wide. The prototype technology path
  (CanvasKit-wasm → Expo/RN-Skia) is the orthogonal **build track** (Stage A/B), and the
  annotation roadmap in `docs/design/drawing-architecture-plan.md` §10 is a set of **sub-steps inside P2**.
