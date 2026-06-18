// Typographic theme — the knobs for "beauty first". Plain numbers/strings only;
// the engine and renderer both read it.

export interface Theme {
  margin: number;
  marginTop: number;
  marginBottom: number;
  maxMeasure: number; // cap line length for readability (vertical mode)
  columnWidth: number; // fixed measure in horizontal-columns mode
  gutter: number; // space between columns

  bodySize: number;
  bodyLine: number;
  paraGap: number;
  paraIndent: number;

  poetrySize: number;
  poetryLine: number;
  poetryIndentStep: number;
  poetryHang: number; // hanging indent for wrapped poetry lines
  poetryGap: number;

  headingSize: number;
  headingTracking: number;
  headingGapAbove: number;
  headingGapBelow: number;

  verseNumSize: number;
  verseNumRise: number; // raise above baseline → true superscript
  verseNumGap: number;

  dropCapLines: number;
  dropCapScale: number; // multiple of bodyLine for the cap glyph size
  dropCapGap: number;

  colors: {
    ink: string;
    gilt: string;
    verse: string;
    dropCap: string;
    faint: string; // un-earned portal / hint
    rule: string;
  };
}

export const THEME: Theme = {
  margin: 56,
  marginTop: 108,
  marginBottom: 96,
  maxMeasure: 600,
  columnWidth: 360,
  gutter: 72,

  bodySize: 25,
  bodyLine: 40,
  paraGap: 16,
  paraIndent: 0,

  poetrySize: 25,
  poetryLine: 40,
  poetryIndentStep: 34,
  poetryHang: 24,
  poetryGap: 4,

  headingSize: 14,
  headingTracking: 2.5,
  headingGapAbove: 18,
  headingGapBelow: 22,

  verseNumSize: 13,
  verseNumRise: 12,
  verseNumGap: 5,

  dropCapLines: 3,
  dropCapScale: 2.7,
  dropCapGap: 12,

  colors: {
    ink: "#2b2117",
    gilt: "#9a6b2f",
    verse: "#b08a4e",
    dropCap: "#8a4b22",
    faint: "#cbb27f",
    rule: "#9a6b2f",
  },
};
