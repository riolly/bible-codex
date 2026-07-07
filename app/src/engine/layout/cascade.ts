/**
 * The override cascade resolver (#11) — the full form of the base-only stub in
 * rules.ts (#7). Resolves the typography rules for one block by layering
 * per-scope overrides on top of the active preset.
 *
 * INVARIANTS:
 * - ADR-0004: precedence is `base preset < genre < role < book` (most specific
 *   wins); each knob inherits INDEPENDENTLY (a book override of `fontSize`
 *   leaves `measure` inheriting from the preset). `theme` is GLOBAL — never a
 *   cascade knob.
 * - ADR-0004 / ADR-0011: overrides join the corpus by SEMANTIC keys
 *   (`genre` / `role` / `book.slug`), never by a corpus row id.
 * - ADR-0008: pure TS, no Skia. Output feeds the ephemeral layout model.
 */

import type { BlockRole, Genre } from '../../model/corpus';
import { resolveRules, type LayoutPresetInput, type ResolvedRules } from './rules';

/** Which corpus dimension an override scopes to (schema.dbml `layout_override.scope_kind`). */
export type ScopeKind = 'genre' | 'role' | 'book';

/**
 * One `layout_override` row: a scope selector plus the same partial knobs as a
 * preset (null/omitted = inherit the less-specific level).
 */
export interface LayoutOverride extends LayoutPresetInput {
  readonly scopeKind: ScopeKind;
  /** A SEMANTIC key: a genre, a role, or a `book.slug` — never a corpus id. */
  readonly scopeValue: string;
}

/** The corpus coordinates a block is resolved against. */
export interface CascadeContext {
  readonly genre: Genre;
  readonly role: BlockRole | null;
  readonly bookSlug: string;
}

/** Least → most specific (ADR-0004). A later match overwrites an earlier one. */
const PRECEDENCE: readonly ScopeKind[] = ['genre', 'role', 'book'];

/** The tunable knobs — the keys shared by a preset and an override. */
export const LAYOUT_RULE_KNOBS = [
  'fontFamily',
  'fontSize',
  'lineHeight',
  'margin',
  'paragraphSpacing',
  'indentStep',
  'align',
  'measure',
  'railWidth',
] as const satisfies readonly (keyof LayoutPresetInput)[];

function matchesScope(override: LayoutOverride, context: CascadeContext): boolean {
  switch (override.scopeKind) {
    case 'genre':
      return override.scopeValue === context.genre;
    case 'role':
      // A block with no role (plain prose/poetry) matches no role override.
      return context.role !== null && override.scopeValue === context.role;
    case 'book':
      return override.scopeValue === context.bookSlug;
  }
}

/** Copy only the knobs the override actually SETS (non-null) onto the accumulator. */
function applyKnobs(into: Record<string, unknown>, from: LayoutOverride): void {
  for (const knob of LAYOUT_RULE_KNOBS) {
    const value = from[knob];
    if (value !== null && value !== undefined) into[knob] = value;
  }
}

/**
 * Resolve the concrete rules for a block: start from the active preset, then
 * apply the matching genre → role → book overrides in that order (most specific
 * wins, per-knob). Delegates default-fill + validation to resolveRules, so
 * DEFAULT_PRESET stays the single source of fallbacks.
 */
export function resolveCascade(
  base: LayoutPresetInput,
  overrides: readonly LayoutOverride[],
  context: CascadeContext,
): ResolvedRules {
  const merged: Record<string, unknown> = {};
  for (const knob of LAYOUT_RULE_KNOBS) {
    const value = base[knob];
    if (value !== null && value !== undefined) merged[knob] = value;
  }
  for (const kind of PRECEDENCE) {
    const match = overrides.find((o) => o.scopeKind === kind && matchesScope(o, context));
    if (match) applyKnobs(merged, match);
  }
  return resolveRules(merged as LayoutPresetInput);
}
