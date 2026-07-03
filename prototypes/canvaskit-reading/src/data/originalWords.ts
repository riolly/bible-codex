// The Original Word hub — shared across translations and chapters (CONTEXT.md:
// N Tokens → 1 Original Word). Hand-prepped from Blue Letter Bible / Bible Hub
// for the curated demo words only; this is NOT a complete lexicon.
//
// The motif word "beginning" appears as TWO Original Words — Hebrew rēʾšîṯ
// (Gen 1:1) and Greek archē (John 1:1 / 1 John 1:1) — which is exactly the
// spoke/hub point: the English Tokens differ per translation but each aligns to
// its own original-language hub entry.
import type { OwRegistry } from "../model/build";

export const OW: OwRegistry = {
  // ── Hebrew (Genesis 1, Psalm 1) ─────────────────────────────
  "H7225": {
    id: "H7225", script: "hebrew", text: "רֵאשִׁית", translit: "rēʾšîṯ", strongs: "H7225",
    gloss: "beginning",
    meaning:
      "The first, the chief, the starting point. From rōʾš, “head.” Not merely the earliest moment but the source from which a thing proceeds — a head-water, a first-fruit.",
  },
  "H1254": {
    id: "H1254", script: "hebrew", text: "בָּרָא", translit: "bārāʾ", strongs: "H1254",
    gloss: "created",
    meaning:
      "To shape, fashion, create — in the Qal always with God as subject. Reserved for the divine act of bringing into being what was not.",
  },
  "H430": {
    id: "H430", script: "hebrew", text: "אֱלֹהִים", translit: "ʾĕlōhîm", strongs: "H430",
    gloss: "God",
    meaning:
      "The plural form used for the one God of Israel — a plural of majesty. The grammatical plurality with singular verbs (“God created”) is a quiet seam later readers will return to.",
  },
  "H7307": {
    id: "H7307", script: "hebrew", text: "ר֫וּחַ", translit: "rûaḥ", strongs: "H7307",
    gloss: "Spirit",
    meaning:
      "Breath, wind, spirit — all one word. The same rûaḥ that hovers over the waters is breath and wind; the boundary we draw between them is not in the Hebrew.",
  },
  "H216": {
    id: "H216", script: "hebrew", text: "א֖וֹר", translit: "ʾôr", strongs: "H216",
    gloss: "light",
    meaning:
      "Light — and here, light made before the sun (v.14). Illumination as the first spoken thing, distinct from its later luminaries.",
  },
  "H2896": {
    id: "H2896", script: "hebrew", text: "ט֑וֹב", translit: "ṭôḇ", strongs: "H2896",
    gloss: "good",
    meaning:
      "Good, pleasing, fitting — the refrain of the chapter. Less a moral verdict than a craftsman’s satisfaction: it is as it should be.",
  },
  "H835": {
    id: "H835", script: "hebrew", text: "אַ֥שְֽׁרֵי", translit: "ʾašrê", strongs: "H835",
    gloss: "blessed",
    meaning:
      "An exclamation — “O the happinesses of…!” Plural, intensive. Not a wish but a declaration of the flourishing that belongs to the one described.",
  },
  "H8451": {
    id: "H8451", script: "hebrew", text: "תּוֹרַ֥ת", translit: "tôrāṯ", strongs: "H8451",
    gloss: "law",
    meaning:
      "Instruction, teaching, direction — from yārāh, “to throw/point.” Wider than “law”: the whole shape of guidance the LORD gives.",
  },
  "H1897": {
    id: "H1897", script: "hebrew", text: "יֶהְגֶּ֗ה", translit: "yehgê", strongs: "H1897",
    gloss: "meditate",
    meaning:
      "To murmur, mutter, growl — to speak under the breath. Meditation here is audible, a low rehearsing of the text, not silent thought.",
  },

  // ── Greek (John 1, 1 John 1) ────────────────────────────────
  "G746": {
    id: "G746", script: "greek", text: "ἀρχῇ", translit: "archē", strongs: "G746",
    gloss: "beginning",
    meaning:
      "Beginning, origin, first cause — and rule (whence “arch-”, “monarch”). The same word the Septuagint uses in Genesis 1:1; John reaches back and lays his sentence over the creation account.",
  },
  "G3056": {
    id: "G3056", script: "greek", text: "λόγος", translit: "logos", strongs: "G3056",
    gloss: "Word",
    meaning:
      "Word, reason, account, the principle of order. To a Greek ear, the rational structure of the cosmos; to a Hebrew ear, the dāḇār by which God speaks worlds into being. John fuses both.",
  },
  "G2316": {
    id: "G2316", script: "greek", text: "θεός", translit: "theos", strongs: "G2316",
    gloss: "God",
    meaning:
      "God. In “the Word was God,” theos stands without the article — a deliberate construction generations of readers have weighed.",
  },
  "G2222": {
    id: "G2222", script: "greek", text: "ζωὴ", translit: "zōē", strongs: "G2222",
    gloss: "life",
    meaning:
      "Life — not bios (the span of a life) but zōē, life as such, the animating principle. John’s favourite of the two.",
  },
  "G5457": {
    id: "G5457", script: "greek", text: "φῶς", translit: "phōs", strongs: "G5457",
    gloss: "light",
    meaning:
      "Light. John pairs it at once with darkness (skotia) — the same opposition Genesis opens with, now moral as well as physical.",
  },
  "G4561": {
    id: "G4561", script: "greek", text: "σὰρξ", translit: "sarx", strongs: "G4561",
    gloss: "flesh",
    meaning:
      "Flesh — frail, mortal humanity. The scandal of v.14 is the verb beside it: the Word became this.",
  },
  "G4637": {
    id: "G4637", script: "greek", text: "ἐσκήνωσεν", translit: "eskēnōsen", strongs: "G4637",
    gloss: "dwelt",
    meaning:
      "Literally “tented / tabernacled among us.” The glory that filled the tent of meeting now pitches its tent in a body.",
  },
  "G5485": {
    id: "G5485", script: "greek", text: "χάριτος", translit: "charis", strongs: "G5485",
    gloss: "grace",
    meaning:
      "Grace, favour, gift freely given. v.16: “grace upon grace” — charin anti charitos, grace replacing grace, wave on wave.",
  },
  "G2842": {
    id: "G2842", script: "greek", text: "κοινωνίαν", translit: "koinōnia", strongs: "G2842",
    gloss: "fellowship",
    meaning:
      "Partnership, sharing, common life. Not mere company but holding something in common — the thing John writes so that “you also may have” it.",
  },
};
