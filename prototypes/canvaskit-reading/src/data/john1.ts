// John 1 — the Greek gospel showpiece. PROTOTYPE SCOPE = the prologue (vv.1–18),
// the literary gem that carries the "In the beginning" motif, the genre-aware
// typesetting, the word-tap reveals, and the source/target of the beginning
// Portal. The rest of the chapter (the Baptist's testimony, vv.19–51) is out of
// scope for the throwaway.
//
// ⚠️ NASB text is hand-reproduced from memory for an internal throwaway and not
// verified against a printed edition — see prototype/README.md. KJV is public
// domain. Do not redistribute either.
import { buildChapter, heading, prose, v, type LinkSpec } from "../model/build";

const links: LinkSpec[] = [
  { verse: 1, word: "beginning", ow: "G746" },
  { verse: 1, word: "Word", occurrence: 1, ow: "G3056" },
  { verse: 1, word: "God", occurrence: 1, ow: "G2316" },
  { verse: 4, word: "life", occurrence: 1, ow: "G2222" },
  { verse: 4, word: "Light", occurrence: 1, ow: "G5457" },
  { verse: 14, word: "flesh", ow: "G4561" },
  { verse: 14, word: "dwelt", ow: "G4637" },
  { verse: 14, word: "grace", ow: "G5485" },
  { verse: 16, word: "grace", occurrence: 1, ow: "G5485" },
];

export const john1_NASB = buildChapter({
  book: "John",
  chapter: 1,
  translation: "NASB",
  links,
  blocks: [
    heading("The Word Became Flesh"),
    prose(
      v(1),
      "In the beginning was the Word, and the Word was with God, and the Word was God.",
      v(2),
      "He was in the beginning with God.",
      v(3),
      "All things came into being through Him, and apart from Him nothing came into being that has come into being.",
      v(4),
      "In Him was life, and the life was the Light of men.",
      v(5),
      "The Light shines in the darkness, and the darkness did not comprehend it.",
    ),
    prose(
      v(6),
      "There came a man sent from God, whose name was John.",
      v(7),
      "He came as a witness, to testify about the Light, so that all might believe through him.",
      v(8),
      "He was not the Light, but he came to testify about the Light.",
    ),
    prose(
      v(9),
      "There was the true Light which, coming into the world, enlightens every man.",
      v(10),
      "He was in the world, and the world was made through Him, and the world did not know Him.",
      v(11),
      "He came to His own, and those who were His own did not receive Him.",
      v(12),
      "But as many as received Him, to them He gave the right to become children of God, even to those who believe in His name,",
      v(13),
      "who were born, not of blood nor of the will of the flesh nor of the will of man, but of God.",
    ),
    prose(
      v(14),
      "And the Word became flesh, and dwelt among us, and we saw His glory, glory as of the only begotten from the Father, full of grace and truth.",
      v(15),
      "John testified about Him and cried out, saying, “This was He of whom I said, ‘He who comes after me has a higher rank than I, for He existed before me.’”",
      v(16),
      "For of His fullness we have all received, and grace upon grace.",
      v(17),
      "For the Law was given through Moses; grace and truth were realized through Jesus Christ.",
      v(18),
      "No one has seen God at any time; the only begotten God who is in the bosom of the Father, He has explained Him.",
    ),
  ],
});

export const john1_KJV = buildChapter({
  book: "John",
  chapter: 1,
  translation: "KJV",
  links,
  blocks: [
    prose(
      v(1),
      "In the beginning was the Word, and the Word was with God, and the Word was God.",
      v(2),
      "The same was in the beginning with God.",
      v(3),
      "All things were made by him; and without him was not any thing made that was made.",
      v(4),
      "In him was life; and the life was the light of men.",
      v(5),
      "And the light shineth in darkness; and the darkness comprehended it not.",
    ),
    prose(
      v(6),
      "There was a man sent from God, whose name was John.",
      v(7),
      "The same came for a witness, to bear witness of the Light, that all men through him might believe.",
      v(8),
      "He was not that Light, but was sent to bear witness of that Light.",
    ),
    prose(
      v(9),
      "That was the true Light, which lighteth every man that cometh into the world.",
      v(10),
      "He was in the world, and the world was made by him, and the world knew him not.",
      v(11),
      "He came unto his own, and his own received him not.",
      v(12),
      "But as many as received him, to them gave he power to become the sons of God, even to them that believe on his name:",
      v(13),
      "which were born, not of blood, nor of the will of the flesh, nor of the will of man, but of God.",
    ),
    prose(
      v(14),
      "And the Word was made flesh, and dwelt among us, (and we beheld his glory, the glory as of the only begotten of the Father,) full of grace and truth.",
      v(15),
      "John bare witness of him, and cried, saying, This was he of whom I spake, He that cometh after me is preferred before me: for he was before me.",
      v(16),
      "And of his fulness have all we received, and grace for grace.",
      v(17),
      "For the law was given by Moses, but grace and truth came by Jesus Christ.",
      v(18),
      "No man hath seen God at any time; the only begotten Son, which is in the bosom of the Father, he hath declared him.",
    ),
  ],
});
