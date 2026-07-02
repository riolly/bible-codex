/**
 * Framework-agnostic typesetting primitive.
 *
 * INVARIANT (ADR-0008): this layer is pure TypeScript with NO Skia / CanvasKit
 * import. Computed layout is a pure function of (rules + corpus + viewport)
 * (ADR-0004), so all magnitudes here are relative units — `measure` is a
 * character-count, never absolute pixels.
 *
 * This is a seed: a naive greedy line-breaker that the real engine (#7) grows
 * from. It exists in #5 only to prove the pure-engine seam and its Node test.
 */

export interface LineBreakInput {
  /** The text to lay out. Whitespace runs collapse to single breaks. */
  readonly text: string;
  /** Line width as a character count (relative unit, never pixels). */
  readonly measureChars: number;
}

export interface LineBreakResult {
  readonly lines: readonly string[];
  readonly lineCount: number;
}

/**
 * Greedy word-wrap. Words longer than `measureChars` occupy their own line
 * rather than being split (hyphenation is out of scope for the seed).
 */
export function breakLines({ text, measureChars }: LineBreakInput): LineBreakResult {
  if (measureChars < 1) {
    throw new Error(`measureChars must be >= 1, got ${measureChars}`);
  }

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= measureChars) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);

  return { lines, lineCount: lines.length };
}
