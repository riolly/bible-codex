# Accessibility and OS text integration are consciously deferred

Rendering scripture in Skia means the OS sees pictures, not text: **screen readers**
(VoiceOver / TalkBack) find an empty canvas, **OS text selection / copy** doesn't exist, and
**dynamic type** has no effect. These are real costs of the
[ADR-0008](0008-reading-app-is-expo-react-native-skia-over-a-framework-agnostic-engine.md)
engine choice that no ADR had weighed — paid until now by omission. This ADR converts the
omission into a decision: bible-codex v1 is **personal/internal software** (no app-store
distribution; a handful of invited testers), so full accessibility work is **deferred** — and
the deferral carries its re-trigger: **any move toward public distribution reopens this ADR
first.**

What is *not* deferred:

- **Copy/share a verse** ships in Phase 2 as an action on the Markup selection flow (select
  range → highlight | copy | share). Format: quote + reference + translation
  ("… — John 1:1, BSB"). The selection machinery is shared with Markup authoring — near-zero
  extra architecture.

Why the deferral is cheap to reverse (the pre-paid path): the layout engine is a pure function
that already produces per-Block rects *and* their text — emitting invisible RN accessibility
nodes per Block over the canvas is a mechanical transform (per-Block labels first; verse-grain
navigation later). Dynamic type is one multiplier atop the
[ADR-0004](0004-presentation-is-a-rules-layer-computed-layout-is-ephemeral.md) cascade, since
all magnitudes are already relative. In-app font-size controls (`layout_preset.font_size`)
cover the owner's own large-text needs meanwhile.

## Considered options

- **Ship minimal per-Block labels in P1 anyway** — rejected: days of work with no current
  audience; the engine seam keeps it cheap whenever the trigger fires.
- **Leave it undocumented** — rejected: an omission looks identical to ignorance; a recorded
  deferral with a trigger does not.

## Consequences

- v1 is explicitly not accessible to screen-reader users. Acceptable only under
  personal/internal distribution — that scope condition is now load-bearing.
- The public-release checklist gains a hard item: accessibility pass (block labels, dynamic
  type, selection) before any store submission — both ethical baseline and review risk.
