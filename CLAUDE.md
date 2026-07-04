# bible-codex

Use /caveman always except when done or reporting/explaining to me.

## Agent skills

Leverage these skills during development:
/tdd
/domain-modeling
/codebase-design

And these skill when needed:
/diagnosing-bugs
/prototype
/research

/code-review

### Code navigation

Prefer `ast-grep` for structural search/codemods, and use the `ts-app` / `ts-teach` Use LSP-MCP on big/unknown files where whole-file reads are costly; plain `Read` for small or
already-known files (LSP startup + round-trips aren't worth it).

### Issue tracker

Issues and PRDs are tracked as GitHub issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
