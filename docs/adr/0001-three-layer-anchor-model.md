# Three-layer anchor model for text and annotations

We store scripture as a per-translation **token stream** with **verse** and literary-**block** overlays, and we connect multiple translations *only* through two shared hubs — the **canonical verse** (coarse, reconciled per translation via versification maps) and the **original-language word** (fine, via interlinear alignment). Translations are never linked token-to-token. This keeps beautiful literary rendering (driven by blocks) independent from precise addressing (driven by verses), and gives word-level cross-translation links a real anchor — the Greek/Hebrew word — instead of an impossible 1:1 token mapping. Glossary in `CONTEXT.md`.

## Considered options

- **Verse as the storage unit** — rejected: a verse crosses paragraph and poetry-line boundaries, so it blocks genre-aware literary typesetting (the core "beautiful read" bet).
- **Direct translation-to-translation token alignment** — rejected: word counts and order differ, one word renders many and vice-versa; there is no stable 1:1 edge. The original word is the only stable word-level hub.

## Consequences

- A word-level user mark ports across translations only where interlinear alignment exists (route through the original word); otherwise it falls back to verse grain.
- Requires shipping a canonical versification + per-translation versification maps before "same verse across translations" works.
