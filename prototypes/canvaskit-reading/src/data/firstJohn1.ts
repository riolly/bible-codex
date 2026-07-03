// 1 John 1 — the epistle. KJV (public domain). Shares the archē ("beginning")
// and logos ("Word of life") hub entries with John 1 — that overlap is the
// John ↔ 1 John authorship thread the corpus is built to surface.
import { buildChapter, heading, prose, v, type LinkSpec } from "../model/build";

const links: LinkSpec[] = [
  { verse: 1, word: "beginning", ow: "G746" },
  { verse: 1, word: "Word", ow: "G3056" },
  { verse: 3, word: "fellowship", occurrence: 1, ow: "G2842" },
];

export const firstJohn1_KJV = buildChapter({
  book: "1 John",
  chapter: 1,
  translation: "KJV",
  links,
  blocks: [
    heading("The Word of Life"),
    prose(
      v(1),
      "That which was from the beginning, which we have heard, which we have seen with our eyes, which we have looked upon, and our hands have handled, of the Word of life;",
      v(2),
      "(For the life was manifested, and we have seen it, and bear witness, and shew unto you that eternal life, which was with the Father, and was manifested unto us;)",
      v(3),
      "That which we have seen and heard declare we unto you, that ye also may have fellowship with us: and truly our fellowship is with the Father, and with his Son Jesus Christ.",
      v(4),
      "And these things write we unto you, that your joy may be full.",
    ),
    prose(
      v(5),
      "This then is the message which we have heard of him, and declare unto you, that God is light, and in him is no darkness at all.",
      v(6),
      "If we say that we have fellowship with him, and walk in darkness, we lie, and do not the truth:",
      v(7),
      "But if we walk in the light, as he is in the light, we have fellowship one with another, and the blood of Jesus Christ his Son cleanseth us from all sin.",
      v(8),
      "If we say that we have no sin, we deceive ourselves, and the truth is not in us.",
      v(9),
      "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.",
      v(10),
      "If we say that we have not sinned, we make him a liar, and his word is not in us.",
    ),
  ],
});
