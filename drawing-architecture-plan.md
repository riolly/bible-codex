# bible-codex — Annotation Architecture Plan (Markup + Ink)

> Working reference for the prototype. Two annotation classes, the anchor model that ties them
> to scripture, the engine strategy, the migration path, and the boundaries to get right up front.

**Status:** Draft for prototype
**Scope:** Annotation subsystem — **Markup** (semantic) and **Ink** (freehand). Not the whole app.
**Last updated:** 2026-06-17
**Related:** [`CONTEXT.md`](./CONTEXT.md) (Token, Verse, Original Word, Anchor, Cross-reference, Markup, Mark, Note, Connector, Endpoint, Binding, Ink, Layer) · [ADR-0001](./docs/adr/0001-three-layer-anchor-model.md) · [ADR-0002](./docs/adr/0002-two-annotation-classes-markup-first.md) · [ADR-0003](./docs/adr/0003-annotations-are-a-scripture-anchored-scene-graph.md)

---

## 1. Product summary

Annotation over scripture comes in **two classes with opposite physics**:

- **Markup (semantic)** — underline, box, circle, arrow, highlight, strike — attached to a **Token range, Verse, or Original Word**. The app *re-renders* it from `{target, style}`. Reflows across font changes, ports across translations, runs on **web + tablet + desktop**. **Built first.** Its sub-kinds — **Mark**, **Note**, **Connector** — are detailed in §3.1.
- **Ink (freehand)** — pen annotation captured as **strokes over one translation's rendered layout**. The "physical Bible" feel and the product's emotional differentiator. Bound to that layout, **tablet-native**, not portable. **Later phase.**

Both group into toggleable **Layers** ("notes on/off"). Ink handwriting → text (ML Kit) is a later sub-phase.

---

## 2. Why two classes (the core framing)

| | **Ink** (freehand) | **Markup** (semantic) |
|---|---|---|
| What it is | captured stroke points over a rendered layout | `{ target, style }` — app redraws it |
| Examples | handwriting, doodle, the pen feel | underline, box, circle, arrow, highlight, strike |
| Reflows on font change? | **No** — glued to where words landed | **Yes** — redrawn under current Token rects |
| Ports across translations? | **No** — those words aren't there | **Yes** — verse-target by verse; word-target via the Original Word hub |
| Queryable (→ research mode)? | No (opaque pixels) | **Yes** (circle a word → tap → lexicon) |
| Runs on web POC / desktop? | No (needs tablet pen hardware) | **Yes** (hit-test + draw) |
| Syncs as | heavy stroke blobs | tiny structured rows |

Markup is **data**; Ink is **pixels**. Everything you can do to Markup — reflow, translate, query, sync cheaply, render in a browser — you cannot do to Ink, and Ink's expressive freehand feel cannot be reduced to `{target, style}`. They do **not** share a data model below the Anchor.

---

## 3. Anchoring to scripture (ties to `CONTEXT.md`)

Both classes attach to the canonical **Anchor**, never to pixels — but they use it differently:

- **Markup target = Anchor** (`Verse` | `Token range` | `Original Word`). The app draws the style under whatever Token rects the *current* layout produces. Change the font → re-drawn correctly. Open another translation → a verse-target re-draws by verse; a token-target re-draws via the **Original Word** hub where alignment exists. Fully portable and reflow-safe **by construction**.
- **Ink = strokes** captured in coordinates normalized to the **laid-out passage block**, plus a coarse `Anchor` (the verse/passage the strokes sit over) and a `layoutHash`.
  **Honest limit:** block-normalized stroke points do **not** truly reflow when words move *inside* the block. On a font change we can re-place strokes only at the **block grain** (best-effort), and we **never** transplant Ink to another translation. _(This corrects the earlier plan's "strokes reflow correctly across font sizes" claim — that property belongs to Markup, not Ink.)_

---

## 3.1 The annotation scene graph (Mark / Note / Connector) — design now, build later

Markup grows into a small **scene graph**, modeled on Excalidraw/tldraw bindings but with one inversion. See [ADR-0003](./docs/adr/0003-annotations-are-a-scripture-anchored-scene-graph.md).

- **Mark** — decoration bound to a scripture Anchor (underline/highlight/box/circle/strike); position derived from the words.
- **Note** — free content object (user text) pinned to a scripture Anchor **+ offset**; has identity → can be a target.
- **Connector** — arrow/line between two **Endpoints**; an `Endpoint` binds to a scripture Anchor **or** an element id. A connector across two passages is a user-authored cross-reference.
- **Binding** — the relationship is its own record (tldraw-style), so any element can be a target.

**Steal from Excalidraw/tldraw:** `boundElements` back-references for efficient re-route, normalized-anchor + gap, intentional binding (only on endpoint drag), bindings as first-class records.

**The inversion — do NOT steal:** whiteboards store truth as absolute canvas coordinates because nothing reflows. Ours reflows (font), re-paginates (scroll mode), and is replaced (translation). So **no element stores absolute coords** — every position resolves from a scripture Anchor (+ offset), computed at render.

**Build order (all post read + scroll):** Mark → Note → Connector. The seam (`Endpoint = Anchor | element`, separate `Binding` records) is designed in from day one; the editor is built in phases. In the POC, annotations are **mocked** (pre-placed, not persisted) — zero migration cost, full visual proof.

---

## 4. Markup subsystem — build first

- **Pure TS + Skia rendering, identical on RN and web (CanvasKit).** No pen hardware, no latency tricks, no ML Kit.
- **Pipeline:** select Token(s)/Verse → choose kind + style → store a `Mark` (or `Note` / `Connector`) → the renderer hit-tests the target's Token rects on each layout and paints the style (a rough/ink-like brush is optional, to keep the hand-drawn aesthetic).
- **Portable & reflow-safe** because it stores a reference, not pixels. Syncs as tiny rows — fits the multi-device (tablet ↔ desktop) local-first requirement.
- **Composes with research mode:** a circled Token is data → tap → interlinear / lexicon.
- It is the part of "drawing" the **web POC can actually exercise**.

---

## 5. Ink subsystem — later phase (tablet-native)

The engineering below is sound and preserved; it is simply **sequenced after Markup**.

- **Framework:** React Native (TS-first) + **`@shopify/react-native-skia`** as the single cross-platform surface (JSI/GPU, no serialized bridge). The same Skia canvas renders text + Markup + Ink in one coordinate space → Ink anchoring to Token rects is cheap.
- **Skia is fast, but render speed ≠ input latency.** Skia gives 60fps frame rendering via GPU + JSI/Reanimated worklets. PencilKit / Ink API add OS-level **front-buffer rendering** + **motion prediction** for the "ink glued to the tip" feel. Skia can approach this with our own prediction + smoothing.
- **Native escalation is a door, not a destination.** PencilKit (iOS — opinionated, wants to own input/storage/tool UI) and `androidx.ink` (Android — modular, behaves like a backend, **but alpha**) sit behind the `DrawingSurface` interface. The *cleaner* migration may be **Android/Ink** despite iPad being the usual premium-pen target.
- **Platform order:** **Android first, iPad second.** Web/desktop never get Ink.
- **Dual-canvas perf** (active vs committed strokes) for dense pages.
- **Handwriting recognition (sub-phase):** ML Kit Digital Ink — offline, stroke-based, 300+ languages — consumes the same stroke vectors we capture. RN wrappers are thin; budget a small native bridge.

---

## 6. The boundaries to get right up front

1. **The Anchor (both classes).** Canonical, from `CONTEXT.md`. The contract that lets Markup port and lets Ink re-place. Most important of the three.
2. **Engine-agnostic stroke model (Ink).** Store raw `{x, y, pressure, tilt, t}` normalized to the laid-out passage block — never Skia blobs, never raw pixels. Any engine (Skia now, PencilKit/Ink later) replays it; it is also ML Kit's input shape.
3. **`DrawingSurface` interface (Ink).** Rendering only — no engine type leaks into the domain or persistence layer. Layering + anchoring live above it.

---

## 7. Platform reconciliation (resolves the doc-vs-brainstorm conflict)

The original drawing plan said "Android first; desktop/web = non-goal." The app brainstorm said "web POC first; multi-device sync tablet + desktop." They reconcile cleanly once split by class:

- **Reading + Markup:** web (POC, fastest iteration) → RN (Android, iPad) → desktop. Multi-device sync, tablet + desktop. **No phone.**
- **Ink:** tablet only (Android → iPad). Not on web/desktop — pen feel needs real hardware and Ink is layout-bound anyway.
- **Net:** a desktop research user gets reading + Markup, **no freehand**. Accepted.

---

## 8. Open questions / decisions needed

1. **Markup target set** — confirm `Verse | Token range | Original Word`; arrows need two endpoints. Free placement disallowed (**snap-only**) to keep portability?
2. **Markup style vocabulary** — which kinds in v1 (underline + highlight first?), colors, hand-drawn vs clean rendering.
3. **Sync backend** for the user layer (PowerSync / Electric candidates). Markup = tiny rows, Ink = heavy blobs — different treatment?
4. **Ink eraser semantics** — vector (whole stroke) vs pixel.
5. **Ink reflow policy** on font change — best-effort re-place at block grain vs lock layout when Ink exists on a passage.
6. **Recognition scope** (later) — searchable handwriting linked to verses vs cleanup/export only.
7. **First native Ink platform** if/when we escalate — Ink-modularity (Android) vs iPad premium expectation.

---

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| **Building Ink first → annotations broken by font customization & multi-translation roadmap** | **Markup first** (ADR-0002). Ink is the later, tablet-scoped phase. |
| Skia input latency feels short of native on iPad | Our own motion prediction + smoothing first; escalate to PencilKit only if still insufficient. |
| Ink data locked to Skia format → painful migration | Neutral, block-normalized stroke model from day one (§6.2). Non-negotiable. |
| Dense pages degrade performance (1k+ strokes) | Dual-canvas pattern: active stroke canvas separate from committed. |
| Ink API alpha churn | Pin versions; isolate behind `DrawingSurface`; treat Android-native as a later phase. |
| Recognition wrappers immature | Plan a thin custom native bridge to ML Kit. |
| Over-engineering native (path C) too early | Build only the interface + data-model hygiene for optionality; nothing else. |

---

## 10. Phased roadmap (resequenced)

- **Phase 0 — Foundations.** Lock the `Anchor` model (`CONTEXT.md`) + `Mark` / `Note` / `Connector` schema + `Layer` model. Coordinate spaces: Markup = canonical Anchor; Ink = block-normalized strokes.
- **Phase 1 — Markup MVP.** Web POC + RN: underline / highlight (then box / circle), layers, multi-device sync, research-mode tap-through. Portable & reflow-safe.
- **Phase 2 — Ink MVP (Android).** Skia surface implementing `DrawingSurface`: pen / highlighter / eraser, undo/redo, layer toggle, dual-canvas, engine-agnostic stroke persistence.
- **Phase 3 — Ink on iPad.** Same Skia surface; evaluate pen feel vs PencilKit on-device.
- **Phase 4 — Handwriting recognition.** Wire ML Kit Digital Ink to captured strokes; decide searchable-vs-export.
- **Phase 5 (optional) — Native ink escalation** behind `DrawingSurface` (likely Android/Ink first).

---

## Appendix A — `DrawingSurface` contract (Ink only, TypeScript)

```ts
// Ink RENDERING ONLY. Never owns persistence, layering, or anchoring — those live above it.
// Skia is the default impl; NativePencilKitSurface / NativeInkSurface implement this later.
// No engine type appears in this file.

interface InkToolStyle {
  tool: InkTool;
  color: string;   // sRGB hex
  width: number;   // base width, normalized units
}

interface DrawingSurface {
  loadLayers(layers: Layer[]): void;
  clear(): void;

  // live input — surface renders; it does not persist
  beginStroke(style: InkToolStyle, at: InputPoint): void;
  extendStroke(at: InputPoint): void;
  endStroke(): InkStroke;              // committed, block-normalized stroke

  undo(): void;
  redo(): void;
  setActiveLayer(layerId: string): void;
  setLayerVisible(layerId: string, visible: boolean): void;

  exportStrokes(): InkStroke[];
  snapshotPNG(): Promise<Uint8Array>;  // thumbnails/share, NOT source of truth
}
```

## Appendix B — Data models (persisted)

```ts
// ---- Shared canonical anchor (see CONTEXT.md) ----
interface Anchor {
  translation: string;     // translation it was created in (e.g. "KJV", "BSB")
  book: string;            // e.g. "John"
  chapter: number;
  verse: number;           // canonical versification
  wordIndex?: number;      // 0-based Token index within the verse; omit = whole verse
  wordCount?: number;      // span length in Tokens (Token-range targets)
  originalWord?: string;   // optional Original Word hub id (e.g. MACULA id) for cross-translation transfer
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;        // the notes on/off toggle
}

// ---- Markup scene graph (semantic, portable) ----
type MarkKind = 'underline' | 'highlight' | 'box' | 'circle' | 'strike';

// an endpoint binds to scripture OR another element — never to canvas coords
type Endpoint =
  | { kind: 'scripture'; anchor: Anchor }
  | { kind: 'element'; elementId: string };

interface Mark {            // decoration ON the words
  id: string;
  kind: MarkKind;
  target: Anchor;          // verse | Token | Token-range; rendered under current layout
  style: { color: string; weight?: number };
  layerId: string;
  createdAt: number;       // epoch ms
}

interface Note {           // free content, pinned to scripture
  id: string;
  pin: Anchor;             // canonical pin
  offset: { dx: number; dy: number };  // into margin/whitespace, normalized
  text: string;            // translation-agnostic
  layerId: string;
  createdAt: number;
}

interface Connector {      // arrow/line; a user cross-reference when it spans passages
  id: string;
  from: Endpoint;
  to: Endpoint;
  style: { color: string; weight?: number; arrowhead?: boolean };
  layerId: string;
  createdAt: number;
}

// ---- Ink (freehand, scoped) ----
type InkTool = 'pen' | 'highlighter' | 'eraser';

interface InputPoint {
  x: number;        // 0..1 of the LAID-OUT PASSAGE BLOCK width (NOT pixels, NOT screen)
  y: number;        // 0..1 of the laid-out passage block height
  p: number;        // pressure 0..1 (default 1 if unsupported)
  tx?: number;      // tilt X, radians (optional)
  ty?: number;      // tilt Y, radians (optional)
  t: number;        // ms since stroke start
}

interface InkStroke {
  id: string;
  tool: InkTool;
  color: string;    // sRGB hex
  width: number;    // base width, normalized units
  points: InputPoint[];
  createdAt: number;
}

interface InkAnnotation {
  id: string;
  anchor: Anchor;          // coarse: the verse/passage the strokes sit over (translation-bound)
  layoutHash: string;      // layout the strokes were captured against; on change, re-place best-effort at block grain
  layerId: string;
  strokes: InkStroke[];
}
```

## Appendix C — Key libraries & references

- `@shopify/react-native-skia` — GPU drawing surface, RN **and** web via CanvasKit (renders text + Markup + Ink).
- `react-native-gesture-handler` / `react-native-reanimated` — input + UI-thread work.
- Google ML Kit Digital Ink Recognition — handwriting (stroke-based, offline).
- Apple PencilKit — iOS premium pen (later, via native module).
- `androidx.ink` (Ink API) — Android premium pen (later; alpha).
- Production reference: Notesnook (open-source notes app using react-native-skia for drawing).
- Cautionary reference: GoodNotes' cross-platform-native effort — why multiple native paths are expensive.
