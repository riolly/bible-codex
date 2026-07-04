# Code navigation tooling

Two complementary tools help agents (and humans) navigate the TS codebase.
Neither indexes anything — no staleness, no rebuild step.

## 1. ast-grep — structural search + codemods (no server)

Syntax-aware search/rewrite. Run from the shell.

```sh
brew install ast-grep
```

Examples:

```sh
ast-grep -p 'interface $NAME { $$$ }' -l ts app/
ast-grep -p 'export function $F($$$) { $$$ }' -l ts app/
```

Use for "shapes that look like X" and repo-wide rewrites. Prefer over regex grep
for anything syntactic.

## 2. LSP via MCP (`ts-app`, `ts-teach`) — semantic, exact

`mcp-language-server` wraps `typescript-language-server`, giving the agent real
go-to-def / find-references / rename blast-radius from the TS compiler.

Config lives in committed `app/.mcp.json`. The Claude Code project root is
`app/` (where `.claude/` sits) — not the repo root, so the `ts-app` workspace
`.` resolves to `app/`. One server per TS root: `ts-app` (workspace `.`) and
`ts-teach` (workspace `../teach`).

Per-machine install (each dev, once):

```sh
# ts language server
npm install -g typescript-language-server typescript
# mcp bridge (needs Go)
brew install go
go install github.com/isaacphi/mcp-language-server@latest
```

Both binaries must be on a **stable** PATH that Claude Code's MCP launcher sees
(not an fnm-ephemeral shell dir). Simplest: symlink into `/opt/homebrew/bin`:

```sh
ln -sf "$(go env GOPATH)/bin/mcp-language-server" /opt/homebrew/bin/mcp-language-server
ln -sf "$(command -v typescript-language-server)" /opt/homebrew/bin/typescript-language-server
```

Restart Claude Code to load the `ts-app` / `ts-teach` MCP servers.

## When to use which

- ast-grep = "find/rewrite this pattern everywhere."
- LSP-MCP = "what is this exact symbol and who calls it."
- plain `Read` = small/unknown file, or you already know the path and want the
  whole thing. Don't pay LSP round-trip cost to read a one-liner.

These tools cut token cost on *navigation* (locating a symbol, mapping its
callers) — not on reading a file you've already found. Reach for them when the
alternative is reading several whole files to answer "where / who / what-shape."

Deliberately **not** using codegraph: it's a staler approximation of the LSP
answer, and this is a single-language repo where the live LSP dominates.
