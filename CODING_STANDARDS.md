# Coding Standards — bible-codex

The single anchor for code review (human, Codex, or `/code-review`). It records only the
conventions that tools **cannot** check for you. Machine-enforced rules live in config and
are linked, not restated here.

- **Lint:** `app/eslint.config.js` (expo flat config + the ADR-0008 architecture guard)
- **Types:** `app/tsconfig.json` — `strict: true`, path alias `@/* → app/src/*`
- **Domain language:** `CONTEXT.md` (glossary) + `docs/adr/` (decisions)

If a rule below conflicts with an ADR, the ADR wins — fix this file.

## Gates (a change is not done until these pass)

Run from `app/`:

```
pnpm run lint         # eslint (incl. architecture guard)
pnpm run typecheck    # tsc --noEmit
pnpm run test         # engine (vitest) + components (jest) + visual goldens
```

Visual goldens: `pnpm run test:visual`; re-baseline only on an intended render change with
`pnpm run test:visual:update` and eyeball the diff before committing.

## Architecture invariants (non-negotiable)

1. **Engine/model stay framework-agnostic (ADR-0008).** `src/engine/**` and `src/model/**`
   must never import Skia / CanvasKit or reach into `src/draw/**`. Only `src/draw/**` binds
   to the renderer. The lint guard fails the build on violation — do not silence it, restructure.
2. **Computed layout is ephemeral (ADR-0004).** Presentation is a rules layer over the
   corpus; never persist pixel geometry. Anchors are canonical addresses, never pixels
   (ADR-0001, ADR-0003).
3. **Persistence goes through the Drizzle seam (ADR-0009).** Two SQLite DBs (corpus +
   user); no raw SQL scattered outside the `src/db/**` seam. Migrations in
   `src/db/migrations/**` are generated (`pnpm run db:generate`), never hand-edited.
4. **User data is portable by construction (ADR-0011).** New user-data tables must survive
   backup/migration — carry canonical anchors, not translation-local or pixel state.

## Module layout

`src/` is organized by layer, not by feature:

| Dir            | Owns                                                        |
| -------------- | ---------------------------------------------------------- |
| `model/`       | corpus + domain types, addressing, versification (pure)    |
| `engine/`      | typesetting/layout engine, cascade resolver (pure)         |
| `draw/`        | Skia binding — the only layer that touches the renderer    |
| `store/`       | Zustand state (e.g. single canonical reading position)     |
| `db/`          | Drizzle schema, migrations, settings                       |
| `backup/`      | export / envelope / swap-db                                |
| `ui/`, `app/`  | React Native components and Expo Router screens            |
| `lab/`         | dev-only preset lab (gate behind `if (__DEV__)`)           |

Keep the dependency direction downward: `ui`/`app` → `engine`/`model`/`draw` → nothing
framework-specific in the pure layers.

## Naming & domain fidelity

- Use the **exact** terms from `CONTEXT.md`. `Token`, `Original Word`, `Block`,
  `Canonical Verse`, `Anchor`, `Codex mode`, `Scroll mode` are load-bearing — don't
  substitute loose synonyms (`word`, `paragraph`, `vertical mode`).
- Files: kebab-case (`reading-position.ts`). Types/components: PascalCase. Values: camelCase.
- Prefer the `@/` path alias over deep relative imports (`../../..`).

## Tests

- **Test-first** for engine/model logic and bug fixes (`/tdd`). Co-locate: `foo.ts` +
  `foo.test.ts` in the same dir.
- Engine/model → **vitest** (`test:engine`). Components → **jest** (`test:components`).
  Render output → **visual goldens** (`test:visual`).
- A bug fix lands with a test that fails before it and passes after.
- Before closing a phase/PRD issue, run the on-device checklist (`/verify-device`).

## Comments

Comment the **why**, not the what. Reserve them for invariants a reader can't infer —
the architecture guard in `eslint.config.js` is the model: it names the ADR and the
consequence. Match the surrounding file's comment density; don't narrate obvious code.

## Decisions

Anything that changes an invariant, a seam, or the domain language is an ADR
(`docs/adr/`), not a comment or a commit message. Add the ADR in the same change.
