# design/

The standing **design harness**: browser CanvasKit running the PRODUCTION
engine + draw layer (`app/src`), so a design variant is pixel-identical to what
the app ships. This is where the design gate (see `/design` skill) renders its
variants — the workflow is PRD → grill → **design** → build → verify-device.

## Run

```sh
pnpm --dir design install   # once
pnpm --dir design dev       # → http://localhost:5173
```

URL params: `?feature=<slug>&variant=<key>`. Flip variants with the floating
pill or ←/→ keys. Each state has a **Save PNG** button — those files are the
design-spec screenshots posted on the issue.

## Layout

- `harness/` — **permanent.** CanvasKit boot, web-Skia shim, font loading
  (shared measure core → identical metrics to device/goldens), production
  picture renderers (`renderPage`, `renderScroll`) and the freeform
  `renderCustom`, the shell UI.
- `<feature-slug>/variants.ts` — **throwaway.** One dir per design question,
  default-exporting a `DesignFeature` (see `harness/types.ts`). `_sample/` is
  the copyable template, not a live question.

## Policy

- **One dir = one question.** The feature's `question` field states it; the
  GitHub issue holds the verdict (the approved design spec).
- **Fake, never build.** A variant is a picture, not a feature: no state, no
  persistence, no gestures, no tests, no new engine capability. If the engine
  already renders the thing, drive it with different constants; otherwise fake
  the look with `renderCustom`. The capability itself is built in the build
  phase, with TDD, against the approved picture.
- **Death ritual.** When the spec comment lands on the issue
  (screenshots + token table, label `needs-design` → `design-approved`),
  delete the feature dir. The harness stays. History keeps the code.

## Skia backend

`vite.config.ts` aliases `@shopify/react-native-skia` → `harness/skia-web.ts`
(the same trick as `app/vitest.visual.config.ts`), and `design/package.json`
pins Skia deps to the app's exact versions — keep them in lockstep when the
app upgrades.
