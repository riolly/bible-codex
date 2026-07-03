# reader — bible-codex app

Expo (React Native + `@shopify/react-native-skia`) reading app. The beautiful
typesetting is painted on a single Skia canvas; the typesetting/layout engine,
corpus model, and presentation cascade live in a **framework-agnostic TS layer
with no Skia import** (ADR-0008). Persistence is Drizzle over `expo-sqlite`
(ADR-0009); storage locations encode the backup policy (ADR-0011).

Target device: **tablets** (iPad + Android tablet). No web build (desktop is P4+).

---

## Prerequisites

- Node + [pnpm](https://pnpm.io)
- An **Android tablet** with USB debugging on (primary dev device), and/or the
  **iOS Simulator** (Xcode) for the iPad check
- `adb` on PATH (`brew install android-platform-tools`) for the Android tablet
- An [Expo account](https://expo.dev) + `eas` login for cloud builds (optional
  for day-to-day; only needed to (re)build the dev client via EAS)

```bash
pnpm install
```

---

## The three loops

Development runs in three loops, **fastest first**. You live in Loop A and B;
Loop C is occasional. The split mirrors the architecture: the hard logic is pure
TS you can drive in Node, so most of the day never touches a device.

### Loop A — engine work (Node, ~milliseconds)

The typesetting engine, corpus model, and cascade are pure TypeScript — no Skia,
no RN runtime. This is where the hard problems get solved, test-first. Keep a
Vitest watcher running:

```bash
pnpm test:engine:watch      # vitest, watch mode — red-green-refactor loop
```

Files under `src/engine/**` and `src/model/**`, tested by `*.test.ts` next to
them. A lint guard **fails the build** if a Skia/CanvasKit/draw import leaks into
these dirs — that invariant is what keeps this loop device-free.

### Loop B — UI / draw work (tablet on desk, ~1 second)

Once an engine piece works, wire it into a component and paint it on the Skia
canvas. Day-to-day this is just Fast Refresh over Wi-Fi — every save reloads on
the tablet in about a second.

```bash
pnpm start                  # Metro bundler; dev client loads the JS over the network
# or target directly:
pnpm android                # open on the connected Android tablet
```

One-time setup: the tablet needs the **dev client** installed once (see
[Building the dev client](#building-the-dev-client)). After that, `pnpm start`
is all you need until a *native* dependency changes.

> Tip: set up **wireless adb** (`adb pair` / `adb tcpip 5555`) so the tablet
> isn't tethered — you can hold it like a reader while iterating, which matters
> for judging typography. The Skia-beauty bet is validated here, by eye — not by
> a test.

Component / store behavior is tested under jest-expo:

```bash
pnpm test:components:watch  # jest --watch — RN render + store tests
```

### Loop C — cross-platform check (iPad, occasional)

Spot-check the iPad before closing an issue. No Apple hardware needed — the
simulator runs the dev build.

```bash
pnpm ios                    # open on the iOS Simulator (iPad)
```

---

## Testing

Two runners, split along the ADR-0008 seam. Match the lane to the layer.

| Lane | Command | Runner | Scope |
|------|---------|--------|-------|
| Engine / model | `pnpm test:engine` | Vitest (Node) | Pure TS: layout, corpus, cascade |
| Components | `pnpm test:components` | jest-expo | RN render + Zustand store wiring |
| Both (CI) | `pnpm test` | — | Runs engine then components, once |

Watch variants for the loops: `pnpm test:engine:watch`, `pnpm test:components:watch`.

**Rule of thumb:** if a test can't reach it in Node or jest-expo, it belongs in
the engine, not the canvas. Push everything testable *out* of the draw layer so
the Skia component stays a thin renderer of already-tested layout data. Don't try
to unit-test how the typography *looks* — that's judged by eye in Loop B.

Pre-flight before every PR:

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

## Building the dev client

The dev client is a custom build of the app that hosts the JS bundle — you build
it **once per device** (and rebuild only when native deps change, e.g. an SDK
upgrade). Day-to-day work needs no rebuild.

```bash
pnpm build:remote           # EAS cloud build, Android dev client (development profile)
pnpm build:local            # same, built locally instead of on EAS
```

Both use the `development` profile in [`eas.json`](eas.json): a dev-client build,
`internal` distribution. Install the resulting `.apk` on the tablet, then run
`pnpm start`.

---

## Distribution (internal testing)

EAS profiles in [`eas.json`](eas.json), each bound to an update channel:

| Profile | Distribution | Channel | Use |
|---------|-------------|---------|-----|
| `development` | internal | `development` | Dev-client builds for the dev loop |
| `preview` | internal | `preview` | Shareable internal test builds (real, no Metro) |
| `production` | store | `production` | Release builds (auto-incremented) |

`expo-updates` is wired, so once a build exists on a channel you can push
**JS-only changes over the air** (no rebuild) to that channel with EAS Update —
the fast path for internal testers. A native change still requires a new build.

```bash
eas build   --profile preview --platform android   # a standalone internal test build
eas update  --channel preview -m "what changed"     # OTA JS update to existing preview builds
```

---

## Database

Drizzle over `expo-sqlite`. Schema in `src/db/schema.ts`; the client seam is
`src/db/client.ts`. Storage locations (`src/db/paths.ts`) encode ADR-0011: the
user DB rides the device-backup-included sandbox dir; the rebuildable
computed-layout cache uses a non-backed-up cache dir.

```bash
pnpm db:generate            # drizzle-kit generate — new migration from schema changes
```

Migrations are bundled as strings and applied on-device.

---

## Project layout

```
src/
  app/        Expo Router routes (thin screens)
  draw/       THE Skia layer — the ONLY place Skia may be imported (ADR-0008)
  engine/     Framework-agnostic typesetting/layout — pure TS, Node-tested
  model/      Framework-agnostic corpus/coordinate model — pure TS
  store/      Zustand UI state
  db/         Drizzle schema, client, paths, bundled migrations
__tests__/    jest-expo component tests
```

See `CONTEXT.md` and `docs/adr/` at the repo root for the decisions behind this.
```
