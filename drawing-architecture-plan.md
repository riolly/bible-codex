# Bible App — Drawing Layer Architecture Plan

> Working reference for the prototype. Captures the framework choice, the drawing-engine
> strategy, the migration path, and the boundaries we must get right up front.

**Status:** Draft for prototype
**Scope:** Drawing / annotation subsystem (not the whole app)
**Last updated:** 2026-06-17

---

## 1. Product summary

A Bible reading app whose core differentiator is **drawing directly on scripture like a physical Bible** — freehand pen annotation over the text, with the ability to **toggle notes on and off** as visibility layers. Handwritten annotations should be **recognized as text** for search/reference. **Tablet-first.**

**Platform order:** Android first, iPadOS second.

---

## 2. Goals and non-goals

**Goals**
- Natural, low-latency pen drawing over scripture text on tablets.
- Annotations organized as toggleable layers ("switch notes on/off").
- Handwriting recognition (strokes → text), ideally offline.
- A codebase that stays mostly TypeScript and ships on both platforms without being rebuilt twice.
- An architecture that can later adopt best-in-class native pen rendering on a single platform *without* a rewrite.

**Non-goals (for v1)**
- Matching Procreate/GoodNotes-level inking fidelity on day one.
- Building a custom native ink engine.
- Running three rendering paths in parallel.
- Desktop/web (revisit later).

---

## 3. Key technical decisions

| Area | Decision | Rationale |
|---|---|---|
| App framework | **React Native (TypeScript-first)** with targeted native modules | Keeps the bulk of the app in our language; native code limited to where the pen feel lives. |
| Drawing engine (v1) | **`@shopify/react-native-skia`** as the single cross-platform surface | GPU-accelerated, runs over JSI (no old serialized bridge), proven in production note apps. |
| Handwriting recognition | **Google ML Kit Digital Ink Recognition** | Stroke-based (not image OCR), offline, cross-platform, 300+ languages. Consumes the same stroke data we already capture. |
| iOS premium pen (later) | **PencilKit**, behind our interface | Best-in-class iPad inking; reached via a native module — cannot be used directly from RN. |
| Android premium pen (later) | **Ink API (`androidx.ink`)**, behind our interface | Google's PencilKit-equivalent; modular. **Currently alpha — pin versions, expect API drift.** |

---

## 4. Architecture strategy

There is a spectrum from "all shared TypeScript" to "all native," trading reusable code for pen-feel fidelity:

- **A — Skia only.** `react-native-skia` is the engine on both platforms. One render path, mostly TS. *(Our v1.)*
- **B — One wrapped native engine.** A single custom Skia/Metal engine behind a native module. More control, needs native graphics expertise.
- **C — Skia + native bridges.** Skia baseline plus PencilKit (iOS) and Ink API (Android). Three render paths. Highest cost and complexity.
- **D — Fully native, no RN.** Separate Swift + Kotlin apps. Best feel, double the work, abandons our TS strength.

**Chosen path: start at A. Keep the door to C cheaply open. Escalate only if real-device testing proves the pen feel insufficient.**

Important reframes:
- Going native on one platform is **adding a second rendering path**, not "moving to C." Skia stays on the other platform. We only reach full C if we ever go native on both — and we may never want to.
- **C is a door, not a destination.** Skia plus our own motion-prediction and stroke-smoothing can get genuinely close to native feel. There is a real chance A is enough forever.
- The only up-front cost worth paying for optionality is **interface + data-model hygiene** (Section 5–6). We build nothing else *for* C, or we pay the complexity tax for a future that may not arrive.

---

## 5. Why Skia is fast — and what it does *not* give us

Two things make Skia smooth, and they are easy to conflate:

1. **GPU rendering.** The Skia `<Canvas>` is a real native view backed by a GPU surface (Metal on iOS, OpenGL/Vulkan on Android) — the same C++ engine behind Chrome and Android.
2. **JSI, not the old bridge.** It talks to JS through JSI and can run drawing on the UI thread via Reanimated worklets, so the touch-to-pixel path doesn't bottleneck on the JS thread.

**The gap vs PencilKit / Ink:** *render speed is not the same as input latency.* Skia gives us buttery 60fps frame rendering. PencilKit and Ink add OS-level latency tricks Skia doesn't do out of the box — **front-buffer rendering** (active stroke painted straight to the front buffer) and **motion prediction** (extrapolating the pen tip to hide sensor-to-screen lag). That's the "ink glued to the tip" feel. Skia can approach it, but we'd implement prediction/smoothing ourselves — which is exactly the value the native APIs hand us for free, *if* we ever escalate.

---

## 6. The two boundaries we must get right from day one

These are cheap now and painful to retrofit. They are what make the future native swap "almost cosmetic."

### 6.1 The portable stroke data model (the crown jewel)

The **persisted data format matters more than the runtime interface.** The interface decides what we can call this week; the data format decides whether years of users' annotations survive an engine swap.

Rules:
- **Store raw, engine-agnostic input**, not Skia-specific blobs (no serialized Skia paths, no SVG snapshots as the source of truth).
- Per point: `x, y, pressure, tilt, timestamp`, plus tool metadata, grouped into strokes.
- **Normalized 0–1 coordinates** (fraction of page width/height), never raw pixels — so strokes survive different screen sizes and DPI.
- Any engine (Skia now, PencilKit/Ink later) can re-render from this. Bonus: it's exactly the shape ML Kit Digital Ink wants.

### 6.2 The `DrawingSurface` interface

A single abstraction the rest of the app talks to. Skia is the default implementation; a native PencilKit/Ink surface implements the *same* interface later.

The one rule that protects everything: **no Skia type ever leaks into the domain or persistence layer.** Notes-layering and verse-anchoring sit *above* the surface and only ever touch the neutral model — never engine types.

(Concrete contract in Appendix A; data model in Appendix B.)

---

## 7. Handwriting recognition

- **Library:** ML Kit Digital Ink Recognition. Offline, on-device, stroke-based, 300+ languages.
- **Why it composes well:** it takes the *stroke vectors* we already capture for drawing — no rasterize-then-OCR round trip. Feed our `Stroke[]` straight in.
- **Caveat:** RN wrappers for digital ink are community-maintained and thinner than the drawing ecosystem. Budget for writing or forking a small native bridge.

**Decision needed early (see Section 10):** is recognized text *searchable and linked to verses*, or only for cleanup/export? This shapes the data model from day one.

---

## 8. Notes layering and verse anchoring

- Annotations are grouped into **layers** with a `visible` flag — this *is* the "notes on/off" feature.
- Each page's annotations are **anchored to scripture, not pixels** (translation + book + chapter + verse range), so they reflow correctly across font sizes and devices.
- Layering and anchoring live in the TS domain layer, **above** the `DrawingSurface`.

---

## 9. Native escalation plan (when/if we go to C on one platform)

PencilKit and Ink do **not** slot in symmetrically — this should influence *which* platform we go native on first:

- **Ink API (Android)** is modular by design (separate authoring, rendering, strokes, storage). It behaves like a rendering *backend* we compose behind our interface. **But it's alpha** — version churn risk.
- **PencilKit (iOS)** is opinionated: `PKCanvasView` / `PKDrawing` wants to own input capture, storage, and the tool-picker UI. We can extract neutral stroke data from `PKDrawing`, but it resists being "just a backend."

**Counterintuitive consequence:** the *cleaner* native migration may be **Android/Ink**, even though iPad is usually the premium-pen target. Choose the first native platform on integration friction + user impact, not just on which feels more premium.

---

## 10. Open questions / decisions needed

1. **Recognition scope:** searchable handwriting linked to verses, or cleanup/export only? *(Affects data model now.)*
2. **First native platform**, if/when we escalate — weigh Ink's modularity (easier) vs iPad's premium expectation.
3. **Sync model & storage backend** for strokes/layers (local-first? cloud sync? conflict handling?).
4. **Eraser semantics:** vector erase (remove whole strokes) vs pixel erase — affects the stroke model.
5. **Performance ceiling per page:** target max strokes before we must tile/paginate.

---

## 11. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Skia input latency feels short of native on iPad | Add our own motion prediction + smoothing first; escalate to PencilKit only if still insufficient. |
| Data locked to Skia format → painful migration | Neutral, normalized stroke model from day one (6.1). Non-negotiable. |
| Dense pages degrade performance (1k+ strokes) | Dual-canvas pattern: separate *active* stroke canvas from *committed* annotations canvas. |
| Ink API alpha churn | Pin versions; isolate behind the interface; treat Android-native as a later phase. |
| Recognition wrappers immature | Plan for a thin custom native bridge to ML Kit. |
| Over-engineering for C too early | Build only interface + data-model hygiene for optionality; nothing else. |

---

## 12. Phased roadmap

- **Phase 0 — Foundations.** Lock the stroke data model (Appendix B) and `DrawingSurface` interface (Appendix A). Define coordinate space (normalized 0–1) and verse-anchor schema.
- **Phase 1 — Skia MVP (Android).** Skia surface implementing the interface: pen draw, highlighter, eraser, undo/redo, layer toggle. Dual-canvas perf pattern. Persist strokes in the neutral format.
- **Phase 2 — Recognition.** Wire ML Kit Digital Ink to the captured strokes. Decide searchable-vs-export (Q1).
- **Phase 3 — iPad.** Ship the same Skia surface on iPadOS. Evaluate pen feel on-device against PencilKit.
- **Phase 4 (optional) — Native escalation.** If Phase 3 shows a real gap, add one native rendering surface (likely Android/Ink first per Section 9), behind the existing interface.

---

## Appendix A — `DrawingSurface` contract (TypeScript)

```ts
// The rendering surface owns RENDERING ONLY. It never owns persistence,
// layering policy, or verse anchoring — those live above it in the domain layer.
// Skia is the default impl; NativePencilKitSurface / NativeInkSurface implement
// this same interface later. No engine type appears in this file.

interface ToolStyle {
  tool: ToolKind;
  color: string;   // sRGB hex
  width: number;   // base width, normalized units
}

interface DrawingSurface {
  // lifecycle
  loadLayers(layers: AnnotationLayer[]): void;
  clear(): void;

  // live input — surface renders; it does not persist
  beginStroke(style: ToolStyle, at: InputPoint): void;
  extendStroke(at: InputPoint): void;
  endStroke(): Stroke;                 // returns committed, normalized stroke

  // editing
  undo(): void;
  redo(): void;
  setActiveLayer(layerId: string): void;
  setLayerVisible(layerId: string, visible: boolean): void;

  // export / interop
  exportStrokes(): Stroke[];
  snapshotPNG(): Promise<Uint8Array>;  // for thumbnails/share, NOT source of truth
}
```

## Appendix B — Stroke data model (persisted, engine-agnostic)

```ts
type ToolKind = 'pen' | 'highlighter' | 'eraser';

interface InputPoint {
  x: number;        // 0..1 of page width  (NOT pixels)
  y: number;        // 0..1 of page height
  p: number;        // pressure 0..1 (default 1 if unsupported)
  tx?: number;      // tilt X, radians (optional)
  ty?: number;      // tilt Y, radians (optional)
  t: number;        // ms since stroke start
}

interface Stroke {
  id: string;
  tool: ToolKind;
  color: string;    // sRGB hex
  width: number;    // base width, normalized units
  points: InputPoint[];
  createdAt: number; // epoch ms
}

interface AnnotationLayer {
  id: string;
  name: string;
  visible: boolean;  // the notes on/off toggle
  strokes: Stroke[];
}

interface VerseAnchor {
  translation: string;     // e.g. "NIV"
  book: string;            // e.g. "John"
  chapter: number;
  verseStart: number;
  verseEnd: number;
}

interface PageAnnotations {
  anchor: VerseAnchor;     // anchored to scripture, not pixels
  layers: AnnotationLayer[];
}
```

## Appendix C — Key libraries & references

- `@shopify/react-native-skia` — GPU drawing surface (v1 engine).
- `react-native-gesture-handler` / `react-native-reanimated` — input + UI-thread work.
- Google ML Kit Digital Ink Recognition — handwriting (stroke-based, offline).
- Apple PencilKit — iOS premium pen (later, via native module).
- `androidx.ink` (Ink API) — Android premium pen (later; alpha).
- Production reference: Notesnook (open-source notes app using react-native-skia for drawing).
- Cautionary reference: GoodNotes' cross-platform-native effort (Swift→Wasm) — illustrates why multiple native paths are expensive.
