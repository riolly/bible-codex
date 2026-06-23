# Cross-Platform Ink / Handwriting Note Apps — Competitive Comparison

> Competitive reference for bible-codex's Ink subsystem. Focus: apps with genuinely
> good handwriting/ink that run on **both Android tablet and iPad** (the platform
> targets in `drawing-architecture-plan.md` §7: Android first, iPad second).
>
> **As of early 2026.** App capabilities — especially cross-platform support and AI —
> move fast; re-verify before citing externally.

---

## The filter that matters: cross-platform (Android **and** iPad)

Most famous handwriting apps are **single-platform** and are excluded here:

| Excluded app | Why |
|---|---|
| **Notability** | iOS / macOS only. (Great ink + unique audio-synced-to-strokes, but no Android.) |
| **Apple Notes** | Apple only. |
| **Samsung Notes** | Samsung devices only (not even all Android, not iPad). |
| **Squid / Penbook** | Android+Chromebook / Windows respectively — not iPad. |

---

## The contenders (run on Android tablet + iPad)

| App | Why it wins | Platforms | Pricing |
|---|---|---|---|
| **GoodNotes 6** | Premium ink feel; AI (handwriting search, math, scrawl→text). Went truly cross-platform in 2024. All-round headline pick. | iPad, Android, Windows, web | Freemium / one-time + subs |
| **Nebo** (MyScript) | **Best handwriting→text recognition**; also diagram/math recognition. | iPad, Android, Windows | Freemium |
| **Noteshelf 3** | Solid ink + audio recording, clean UI, friendlier pricing. | iPad, Android, Mac, Windows | One-time |
| **Flexcil** | Best **PDF + notes** combo (study/markup/reading workflow). | iPad, Android | Freemium |
| **OneNote** | **Free**, everywhere, infinite canvas, surprisingly good pen. | iPad, Android, Windows, web | Free |
| **Concepts** | Infinite-canvas **vector** sketching (sketch-heavy / diagram notes). | iPad, Android, Windows | Freemium |

**Quick pick:**
- All-round premium → **GoodNotes 6**
- Handwriting-to-text priority → **Nebo**
- Free + ubiquitous → **OneNote**
- PDF-centric study workflow → **Flexcil**

---

## The catch — pen *feel* vs. cross-platform reach

Cross-platform apps feel **slightly less "glued to the nib"** than platform-native ones,
because native gets OS-level tricks the cross-platform layer can't fully match:

- **iPad** → PencilKit: front-buffer rendering + motion prediction.
- **Samsung** → native S-Pen low-latency path.

Core lesson (already in the prototype handoff + architecture plan): **render speed ≠ input
latency.** A 60fps GPU canvas (Skia) can still feel laggy without prediction + smoothing +
ideally front-buffer rendering.

**GoodNotes is the proof point both ways:** it *is* cross-platform now, but getting there
cost a major engine rewrite — making it also the cautionary tale about how expensive
cross-platform-native ink is.

---

## Implications for bible-codex (engine references, not just UX)

- **GoodNotes 6** — premium-feel **benchmark** + cross-platform-cost **warning**. Confirms
  sequencing: prove ink on Android first before paying for iPad.
- **Nebo / MyScript** — recognition engine we may **license** vs. building (vs. ML Kit
  Digital Ink, named in the plan). Worth a licensing-cost spike before committing.
- **Concepts** — clean **vector-ink data model** to study (maps to our neutral,
  block-normalized stroke model — never Skia blobs, never raw pixels).
- **Notesnook + `@shopify/react-native-skia`** — closest **stack** reference (open-source
  RN-Skia ink). Most directly informative for the real build.

### The strategic gap this confirms
None of these apps is *also* a true linked knowledge base. Ink-first apps treat everything
as **pixels** (not queryable/linkable); KB-first apps (Obsidian, Tana, Notion) have **no
real ink**. bible-codex's two-physics split — anchored **Markup as data** (linkable;
cross-refs/Portals = a knowledge graph over scripture) + **Ink as pixels** (the feel) — is
the bridge none of them build. That split is the product's structural moat, not just an
implementation detail.

---

## See also
- `drawing-architecture-plan.md` — Markup vs Ink, `DrawingSurface` contract, platform
  sequencing (§7), library references (Appendix C).
- `docs/adr/0002-two-annotation-classes-markup-first.md` — why Markup (data) and Ink
  (pixels) are separate classes.
- Prototype lessons handoff (OS temp dir) — two-physics thesis demonstrated live; pen feel
  the one unproven piece, pending on-device tablet test.