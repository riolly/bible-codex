// The course spine. Order + unlock gates live here; lesson prose lives in the
// content collection. The hub (src/islands/Modules.tsx) reads this plus the
// progress store to compute each module's status (Ready / Next / Locked / Done)
// and to reveal the "next module" CTA. Mirrors bible-codex's own earned-unlock
// (Journey) idea.
export interface ModuleDef {
  num: number;
  id: string;
  title: string;
  /** paired biblical idea (shown on the card) */
  pairBible?: string;
  /** paired app mechanic (shown on the card) */
  pairApp?: string;
  /** one-line description */
  blurb?: string;
  /** what's inside, as plain text (no nested links — the whole card is a link) */
  lessonHints?: string;
  /** landing link; omitted while the module has no pages yet */
  href?: string;
  /** id whose completion marks THIS module done (its check game) */
  checkId?: string;
  /** id that must be complete before this module unlocks (prev module's check) */
  unlockBy?: string;
  /** badge label to show while still locked (preserves the original look) */
  lockedBadge?: string;
}

export const modules: ModuleDef[] = [
  {
    num: 0,
    id: 'm0',
    title: 'Overview',
    blurb:
      'The Anchor, the two data worlds, translations as spokes, and the map of all four phases — the "you are here" before we descend into each phase.',
    lessonHints:
      'Lesson 1 — The Anchor · Lesson 2 — Two worlds & spokes · Reference — Architecture map',
    href: '/lessons/0001-the-anchor',
    checkId: 'check-overview',
  },
  {
    num: 1,
    id: 'm1',
    title: 'Phase 1 — Reading',
    pairBible:
      'scripture has literary shape (prose, poetry, headings); book·chapter·verse; why numbering differs.',
    pairApp: 'Token · Block · Canonical Verse · Versification · the layout-adjust table.',
    lessonHints:
      'Lesson 3 — Token & Block · Lesson 4 — Same verse, different numbers · Lesson 5 — Your layout, your rules',
    href: '/lessons/0003-scripture-has-shape',
    checkId: 'check-reading',
    unlockBy: 'check-overview',
    lockedBadge: 'Next session',
  },
  {
    num: 2,
    id: 'm2',
    title: 'Phase 2 — Annotation',
    pairBible: 'marking a Bible — underline, note, connect, draw freehand.',
    pairApp: 'Markup vs Ink (the two physics) · scripture-anchored scene graph · Layer.',
    lessonHints:
      'Lesson 6 — Two kinds of marks · Lesson 7 — Marks that point, not pixels · Lesson 8 — Your notes, everywhere',
    href: '/lessons/0006-two-kinds-of-marks',
    checkId: 'check-annotation',
    unlockBy: 'check-reading',
    lockedBadge: 'Upcoming',
  },
  {
    num: 3,
    id: 'm3',
    title: 'Phase 3 — Lexicon',
    pairBible: "the original Greek & Hebrew, Strong's numbers, lemma, interlinear.",
    pairApp: 'the Original Word hub · Alignment · the re-sourceable lexicon tiers.',
    checkId: 'check-lexicon',
    unlockBy: 'check-annotation',
    lockedBadge: 'Upcoming',
  },
  {
    num: 4,
    id: 'm4',
    title: 'Remaining — Advanced',
    pairBible: 'reading as a journey and an adventure.',
    pairApp: 'Portal · Journey · Themes & tags · research mode · the journey-state engine.',
    unlockBy: 'check-lexicon',
    lockedBadge: 'Upcoming',
  },
];
