# bible-codex — Wishlist

Post-POC ideas. Not committed, not scoped, not in the prototype. Captured so they're not lost.

## Portal — the earned cross-reference

A **Portal** is a Cross-reference you *unlock* rather than one simply shown.

**The feel:** as you read, a word quietly begins to **glow** — but only once you've earned it (read the passage it connects to, or collected the clue that reveals it). Follow it and you're **carried** to the related passage — back to a past story or forward to its echo — to read it again with deeper meaning.

**Example (the "beginning" thread):** after reading Genesis 1 and progressing to John 1, the word *"beginning"* glows; following it returns the reader to Genesis 1:1 — "In the beginning God created" now resonating against "In the beginning was the Word."

**Why:** it turns reading into an **adventure** — the reader is actively *looking for something*, and discovery is a reward, not a handout. It is "challenge, not ease" and "navigation by discovery" made tangible: gamification in service of attention and memory, not points.

**How it fits (cheap, architecturally):** a Portal rides entirely on primitives already locked —
- **Cross-reference** — the editorial link between two Anchors,
- **reading progress / collected clues** — a visibility gate,
- **presentation** — glow + transport.

No new data model. It is *a gate and a skin* over a Cross-reference. That is why it can wait for later with **zero migration cost**.

**Status:** the full mechanic is post-POC. The POC *does* include one **mocked** scripted glow (finish John 1 → *"beginning"* glows → carries to Genesis 1:1) as a taste — locked as POC option B.

## Journey — reading at the reader's pace (gamification)

The antidote to how most people feel about the Bible: overwhelmed. The app meets each reader where they are and opens the text gradually — a journey, not a wall.

- **A collection of scrolls.** No single all-in-one binding. You select a book and scroll it to your last point; **each book holds one bookmark** (one reading position).
- **Start small, beginner-friendly.** New readers begin with only a few accessible books open.
- **A limit on open scrolls.** Only so many books open at once — focus over firehose.
- **Books open as you journey.** As you finish books (or parts of them), new ones unlock as your next leg; the open-scroll limit grows with your reading.
- **Adaptive to the reader.** Each person may *start* at a different place depending on familiarity, and the **pace of clues** (and Portal glows) adapts to them.

**Status (P1.5 track A grill, ADR-0019):** gating **deferred, not rejected** — unlock rules,
open-scroll limits, and adaptive pacing all hang off the journey-state engine below, which gets
its own grill post-P1.5. The foundation shipped anyway: per-book bookmarks (`reading_position`
unique per book) and the Scroll surface gating would decorate (landmarks, overview, hagah).

## Themes & tags

- Readers **tag passages with themes** — how they *relate* to a story: forgiveness, anger, temptation, the Spirit of God…
- The app **suggests tags** drawn from the reader's own notes.
- Early on, the app **teaches the reader to create tags**, building the habit.

## Research mode (deepening the word-tap)

The POC shows the first taste (tap a word → gloss → original → meaning). Beyond it (from the original brief, parked here so it isn't lost):

- **Different translation on hover** — compare renderings of a word or verse without leaving the page.
- **Incremental resource suggestions** — surface a study-bible note, a lexicon entry, a related passage *one step at a time*, never a wall of tabs (the anti-"too much information" stance).
- **Deeper lexicon** — full Strong's / BDB / Thayer's, morphology, usage across the canon.

## The engine underneath (note)

Journey progression, clue/Portal pacing, and tag suggestion all draw on one latent thing: the reader's **journey state** — what they've read and how familiar they are. One model, many surfaces. Worth building once, later.

## Span-grain literary emphasis (deferred from ADR-0017)

The literary edition (ADR-0017) ships **block-grain** ops only. The deferred half: **emphasis on
word ranges inside a block** — bold, italic, text color (BibleProject uses these for repeated
keywords, e.g. the refrains of Genesis 1).

Why deferred, recorded honestly:

- **Word-grain coordinates are translation-bound** (KJV and BSB word orders differ) — every
  emphasized range is curated **per translation**, doubling the work per book. Verse-grain ops
  don't pay this; spans always do.
- Needs a **new span table** (canonical verse + per-translation word-index range + style) and
  **renderer support for token-range styling** — which is visually the same machinery as Mark
  rendering (highlight/underline over a token range). Build it once, shared, or not at all.
- The structure vocabulary (lineation, indents, headings, pages) is ~90% of the BibleProject
  look; emphasis is garnish.

**Revisit trigger:** after Genesis reads beautifully on device, if a specific passage screams for
keyword emphasis (Gen 1's refrains are the test case), weigh the per-translation curation cost
then — as an **additive** table, zero migration.
