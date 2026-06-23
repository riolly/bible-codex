// Reconstruct readable text from word/punct tokens WITH NO STORED SPACES.
// This is the proof that Q1 (drop space tokens; spacing is a render concern) works:
// spacing is derived here from token kind, not read from data. Somewhat keepable.

const OPENERS = new Set(["“", "‘", "(", "[", "{", "¿", "¡", "«"]);
const NO_SPACE_BEFORE = new Set([
  ",", ".", ";", ":", "!", "?", "”", "’", ")", "]", "}", "…", "»", "*",
]);

export interface RToken { kind: "word" | "punct"; text: string }

export function renderLine(tokens: RToken[]): string {
  let out = "";
  let prev = "";
  for (const t of tokens) {
    let space = out !== "";
    if (t.kind === "word") {
      if (OPENERS.has(prev)) space = false;
    } else {
      // punct: space only if it's an opener (starts a new group)
      space = out !== "" && OPENERS.has(t.text[0]);
      if (NO_SPACE_BEFORE.has(t.text[0])) space = false;
    }
    out += (space ? " " : "") + t.text;
    prev = t.text;
  }
  return out;
}
