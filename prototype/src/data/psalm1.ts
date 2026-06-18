// Psalm 1 — the poetry showpiece. KJV (public domain). Set as cola (poetry
// lines) with hanging indent so the parallelism reads visually — the genre
// contrast against Genesis/John prose is the point of including it.
import { buildChapter, poetry, v, type LinkSpec } from "../model/build";

const links: LinkSpec[] = [
  { verse: 1, word: "Blessed", ow: "H835" },
  { verse: 2, word: "law", occurrence: 1, ow: "H8451" },
  { verse: 2, word: "meditate", ow: "H1897" },
];

export const psalm1_KJV = buildChapter({
  book: "Psalms",
  chapter: 1,
  translation: "KJV",
  links,
  blocks: [
    poetry(0, v(1), "Blessed is the man that walketh not in the counsel of the ungodly,"),
    poetry(1, "nor standeth in the way of sinners,"),
    poetry(1, "nor sitteth in the seat of the scornful."),
    poetry(0, v(2), "But his delight is in the law of the LORD;"),
    poetry(1, "and in his law doth he meditate day and night."),
    poetry(0, v(3), "And he shall be like a tree planted by the rivers of water,"),
    poetry(1, "that bringeth forth his fruit in his season;"),
    poetry(1, "his leaf also shall not wither;"),
    poetry(1, "and whatsoever he doeth shall prosper."),
    poetry(0, v(4), "The ungodly are not so:"),
    poetry(1, "but are like the chaff which the wind driveth away."),
    poetry(0, v(5), "Therefore the ungodly shall not stand in the judgment,"),
    poetry(1, "nor sinners in the congregation of the righteous."),
    poetry(0, v(6), "For the LORD knoweth the way of the righteous:"),
    poetry(1, "but the way of the ungodly shall perish."),
  ],
});
