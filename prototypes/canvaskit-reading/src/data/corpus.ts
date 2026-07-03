// The corpus — "a collection of scrolls, not a bound book" (VISION.md). Four
// curated scrolls on one thread; per-scroll translations; the editorial
// Cross-references (incl. the beginning Portal); and a mocked study Layer.
import type { Chapter } from "../model/types";
import type { CrossReference, Anchor } from "../model/types";
import type { MockStudyLayer } from "../model/annotations";
import { OW } from "./originalWords";
import { genesis1_KJV, genesis1_NASB } from "./genesis1";
import { john1_KJV, john1_NASB } from "./john1";
import { psalm1_KJV } from "./psalm1";
import { firstJohn1_KJV } from "./firstJohn1";

export type Script = "hebrew" | "greek";

export interface Scroll {
  id: string;
  title: string; // poetic scroll title
  ref: string; // canonical reference, e.g. "Genesis 1"
  testament: string; // "Torah", "Writings", "Gospel", "Epistle"
  script: Script;
  genreLabel: string;
  translations: Record<string, Chapter>;
  defaultTranslation: string;
}

export const SCROLLS: Scroll[] = [
  {
    id: "genesis-1",
    title: "In the Beginning",
    ref: "Genesis 1",
    testament: "Torah",
    script: "hebrew",
    genreLabel: "narrative",
    translations: { NASB: genesis1_NASB, KJV: genesis1_KJV },
    defaultTranslation: "NASB",
  },
  {
    id: "psalm-1",
    title: "The Two Ways",
    ref: "Psalm 1",
    testament: "Writings",
    script: "hebrew",
    genreLabel: "poetry",
    translations: { KJV: psalm1_KJV },
    defaultTranslation: "KJV",
  },
  {
    id: "john-1",
    title: "The Word",
    ref: "John 1",
    testament: "Gospel",
    script: "greek",
    genreLabel: "gospel · prologue",
    translations: { NASB: john1_NASB, KJV: john1_KJV },
    defaultTranslation: "NASB",
  },
  {
    id: "first-john-1",
    title: "The Word of Life",
    ref: "1 John 1",
    testament: "Epistle",
    script: "greek",
    genreLabel: "epistle",
    translations: { KJV: firstJohn1_KJV },
    defaultTranslation: "KJV",
  },
];

export function scrollById(id: string): Scroll {
  const s = SCROLLS.find((x) => x.id === id);
  if (!s) throw new Error("no scroll " + id);
  return s;
}

const a = (book: string, chapter: number, verse: number, word: number): Anchor => ({
  book,
  chapter,
  verse,
  word,
});

// The beginning Portal: the word "beginning" in John 1:1 (word index 2) lights
// up once Genesis 1 has been read, and carries you back to Genesis 1:1 — the
// adventure made mechanical (VISION.md).
export const CROSS_REFERENCES: CrossReference[] = [
  {
    id: "portal-beginning",
    label: "the beginning",
    from: a("John", 1, 1, 2),
    to: a("Genesis", 1, 1, 2),
    portal: true,
  },
  {
    // the John ↔ 1 John authorship thread, same Greek archē
    id: "xref-1john-beginning",
    label: "from the beginning",
    from: a("1 John", 1, 1, 5),
    to: a("John", 1, 1, 2),
    portal: true,
  },
];

/** Cross-references whose `from` lives on a given scroll. */
export function crossRefsFrom(scroll: Scroll): CrossReference[] {
  const ch = scroll.translations[scroll.defaultTranslation];
  return CROSS_REFERENCES.filter((x) => x.from.book === ch.book && x.from.chapter === ch.chapter);
}

// A mocked study Layer on John 1 — a margin Note + a Connector arrow to the
// word it comments on, plus a highlight Mark. Reflows on every font / scroll /
// translation change because it is anchored, not pixel-placed.
export const STUDY_LAYER_JOHN: MockStudyLayer = {
  marks: [
    {
      id: "m-flesh",
      kind: "highlight",
      from: a("John", 1, 14, 3), // "the Word became flesh" → highlight "Word became flesh"
      to: a("John", 1, 14, 5),
      color: "#e8c98a",
    },
  ],
  notes: [
    {
      id: "n-incarnation",
      anchor: a("John", 1, 14, 5), // pinned at "flesh"
      side: "right",
      text: "ἐσκήνωσεν — “tabernacled.” The glory of the tent of meeting, now in a body.",
    },
  ],
  connectors: [
    {
      id: "c-flesh",
      from: { kind: "note", noteId: "n-incarnation" },
      to: { kind: "anchor", anchor: a("John", 1, 14, 5) },
    },
  ],
};

export { OW };
