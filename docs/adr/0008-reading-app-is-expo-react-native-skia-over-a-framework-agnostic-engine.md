# The reading app is Expo + react-native-skia over a framework-agnostic engine

Phase 1 ships as an **Expo** app rendering text **in Skia** (`@shopify/react-native-skia`,
`Paragraph` API), with **one Skia canvas** serving **tablet (iPad + Android tablet)** and — later —
annotations in the same coordinate space. **Desktop is deferred to Phase 4+**, so Phase 1 ships
**no web/CanvasKit product surface** and pays no web-compat tax. The **typesetting/layout engine,
the corpus model, and the presentation cascade are plain TypeScript with no Skia/CanvasKit type
leak** (the Skia draw layer is the only platform-specific code), so the engine is unit-testable
off-device, the prototype's CanvasKit-wasm draw layer is the only thing rewritten for the
production app, and the **desktop/web door stays open for free** when Phase 4+ wants it. Supporting
picks: **Expo Router** (navigation), **Zustand** (UI/app state), **Vitest** (engine tests) +
**jest-expo** (component/integration). The dev loop is **Vitest on the engine + Fast Refresh on a
tablet simulator/device** — not a web build. Confirms the build track in
[OVERVIEW.md §Stack](../../OVERVIEW.md) and the Stage-A→Stage-B port.

## Considered options

- **Bare React Native (no Expo)** — rejected: Expo SDK 55 + the Expo Skia template wire up
  web/CanvasKit, Metro asset handling, and Expo Router out of the box; we lose nothing we need and
  gain the bundled-asset + web path for free. op-sqlite-style native modules still work via Expo
  dev builds when we need them ([ADR-0009](0009-persistence-is-two-sqlite-databases-behind-a-drizzle-seam.md)).
- **CSS/DOM or platform text for the body, Skia only for drawing** — rejected: annotations
  (Phase 2) must anchor to exact token rects in the *same* coordinate space as the text
  ([ADR-0003](0003-annotations-are-a-scripture-anchored-scene-graph.md)); two text engines means
  two layout truths. The cost — a custom typesetting engine on Skia `Paragraph` — is already paid
  and proven in `prototypes/canvaskit-reading/`.
- **Ship desktop in Phase 1 (web build via CanvasKit, or RN macOS/Windows)** — rejected: desktop is
  **deferred to Phase 4+**. Shipping it now would cost a dual render path (native Skia vs CanvasKit),
  manual web font loading, a ~2.9 MB wasm payload, and a native-only-API avoidance discipline — all
  for a surface the product doesn't need until research-mode deepening. When desktop does arrive it
  is served by the **web build** (react-native-skia runs in-browser via CanvasKit), needing no third
  native target; the framework-agnostic engine keeps that door open at zero ongoing cost.
- **Keep a web build as a dev/iteration surface even without shipping desktop** — rejected: RN
  iteration speed comes from **Fast Refresh on a tablet simulator/device**, not from a browser, and
  the engine's fast loop is **Vitest in Node**. A web dev surface would re-introduce the dual-render
  and font tax we just avoided, for no speed gain.
- **Redux / heavy state** — rejected: reading settings live in SQLite and are read reactively via
  Drizzle `useLiveQuery`; only ephemeral UI state needs a store, which Zustand covers.

## Consequences

- The engine (corpus → layout model) is **pure TS**, tested in Vitest with no RN runtime — the
  highest test seam ([the Phase-1 PRD](https://github.com/riolly/bible-codex/issues/4)). Only the
  draw layer and gestures need device/component tests.
- **No web build in Phase 1** → no CanvasKit wasm payload, no manual web font loading, no
  dual-render-path testing. The fonts (Cardo / Gentium Plus) are bundled for native Skia only. The
  ~2.9 MB gzipped CanvasKit cost returns only when Phase 4+ adds the desktop/web surface.
- Pins a modern floor: react-native-skia 2.6.x ⇒ RN 0.79+ / React 19 / Expo SDK 55. Treated as a
  baseline, not a locked seam — upgradeable.
- The "no engine type leak" rule is a **reviewable invariant**, not just guidance: a Skia/CanvasKit
  import appearing under the engine/model directories is a defect, because it would re-bind the
  port the prototype was built to keep loose.
