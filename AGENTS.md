# bible-codex

Always use `$caveman full` skill except when you are done and reporting/answering back to me (make it easy to understand).

## Workflow

PRD → grill → **design** (`$design`, mandatory for new user-visible surfaces/features) → build → `$verify-device`. An issue labeled `needs-design` is not build-ready until its design spec is approved (`design-approved`).

## Agent skills

Leverage these skills during development:
`$tdd`
`$domain-modeling`
`$codebase-design`
`$design` (design gate before building user-visible surfaces)

And these skill when needed:
`$research`
`$prototype`
`$diagnosing-bugs`
`$verify-device` (before closing a phase/PRD issue)

### Code navigation

Prefer `ast-grep` for structural search/codemods, and use the `ts-app` / `ts-teach` Use LSP-MCP on big/unknown files where whole-file reads are costly; plain `Read` for small or already-known files (LSP startup + round-trips aren't worth it).

### Issue tracker

Issues and PRDs are tracked as GitHub issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Coding standards

Review anchor (human, Codex, `/code-review`): `CODING_STANDARDS.md` at the repo root — gates, architecture invariants, module layout, naming, test conventions.
