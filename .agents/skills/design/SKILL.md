---
name: design
description: Run the design gate — render structurally different variants of a user-visible surface in the design harness, get one approved, capture the spec on the issue. Use when an issue carries needs-design, before building a new surface or feature, or when the user says "design this" / "show me options first".
---

# Design Gate

Grilling agrees on logic; the gate agrees on the **picture**. No user-visible
surface is built until a picture of it is approved — the build answers to the
spec, not to adjectives in the issue.

Place in the workflow: PRD → grill → **design** → build → verify-device.
Mandatory for new surfaces/features; judgment call for smaller visual changes
(a pure token tweak can skip variants and go straight to a one-render spec,
step 4).

## Fake, never build

A variant is a **picture**, not a feature: no state, no persistence, no
gestures, no tests, no new engine capability. If the production engine already
renders the thing, drive it with different constants; if it can't yet, fake the
look with `renderCustom`. The capability itself is built in the build phase,
with TDD, against the approved picture. Writing engine or app code inside
`design/` means the build phase is leaking forward — stop and fake it instead.

## Steps

1. **State the question.** One line distilled from the issue + grill output,
   plus the list of states every variant must show (e.g. light/dark, base/large
   font, versal page, section break, long poetry). Label the issue
   `needs-design` (see `docs/agents/triage-labels.md` — it blocks
   `ready-for-agent` for the build). Done when: question + state list are on
   the issue (or confirmed in chat when the user is present).

2. **Build 3 variants.** Create `design/<feature-slug>/variants.ts`
   default-exporting a `DesignFeature` — copy `design/_sample/variants.ts` for
   the shape; contract in `design/harness/types.ts`, run mechanics in
   `design/README.md`. Rules:
   - Variants disagree about **structure** — layout, hierarchy, primary
     affordance. Recolors are wallpaper, not variants; if two drafts come out
     alike, redo one under an explicit "no X" constraint.
   - Real corpus text (`ChapterBuilder` fixtures or ingested corpus), never
     lorem ipsum.
   - Every variant renders every required state from step 1.
   Done when: `pnpm --dir design dev` shows all three flipping via the pill
   with no error box.

3. **Hand over.** Surface the URL (`http://localhost:5173/?feature=<slug>`)
   and the variant keys. The user flips, picks, or mixes — "header from B,
   margins from C" IS the design; fold mixes into the leading variant and
   iterate. Done when: the user says "approved" about one specific rendered
   variant — not a description of it.

4. **Capture the spec.** Post a `## Design spec (approved)` comment on the
   issue: the Save-PNG screenshot of every required state, plus an exact token
   table — every knob the variant set (fontSize, lineHeight, margin, measure,
   align, paragraphSpacing, ornament styles, palette values). Swap label
   `needs-design` → `design-approved`. Done when: the picture could be rebuilt
   from the comment alone, without the variant code.

5. **Death ritual.** Delete `design/<feature-slug>/`; the harness stays,
   history keeps the code. From here the spec is the single source of truth: a
   build PR that deviates must update the spec comment first, and verify-device
   compares the device against the spec screenshots. Done when: the dir is
   gone and the issue carries `design-approved`.
