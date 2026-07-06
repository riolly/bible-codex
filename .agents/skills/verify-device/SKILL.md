---
name: verify-device
description: On-device/simulator verification checklist for the reading app. Use after a phase lands, before closing a PRD issue, or when the user says "verify on device" / "device check" / "run the checklist".
---

# Verify on Device

Green tests prove the seams; a beautiful reader is judged on a tablet. This skill
splits verification into what Claude drives on a **simulator** and what the human
confirms on a **physical device** — never skip the human half for a phase wrap.

Everything off-device (typecheck, engine/component/visual suites) must already be
green before starting; this skill is about what those cannot see.

Where this sits in the wider workflow (per-PR goldens vs. targeted pass vs.
phase-end full run) is documented for humans in `app/README.md` §"Verification
workflow". Cadence rules: a **targeted** Part-A pass (only the at-risk stations)
for PRs touching `src/draw/` or `src/engine/layout/`, gallery posted as a PR
comment; the **full** run (Part A + Part B) only at phase end, reported on the
phase issue.

## Part A — Claude, on the simulator

Launch the app on an iPad simulator (`pnpm run ios` from `app/`, or the installed
dev client + `pnpm start`). Use `xcrun simctl` for device control and screenshots:

```sh
xcrun simctl list devices | grep -i ipad          # find a booted/available iPad
xcrun simctl io booted screenshot <out>.png       # capture; read the PNG back
# rotate: Cmd+Left/Right in the Simulator app (via computer-use), or
xcrun simctl status_bar ... (cosmetics only — rotation needs the UI)
```

Walk the checklist, screenshotting each station. Read every screenshot back and
judge it — clipped text, overlapping runs, wrong theme colors, missing UI are
Claude-visible defects. Report as a gallery with verdicts.

### Checklist (both A and B use this)

1. **Cold open** — app opens on the last bookmarked passage, at the saved verse
   (not the chapter head), in the last-chosen translation.
2. **Navigation** — picker jumps to a far book (e.g. Revelation 12); header pill
   shows it; flip goes chapter ± 1 and clamps at the book's ends.
3. **Rotation** — portrait shows the Codex Page (letterboxed, margin rail);
   landscape shows Scroll columns. Rotate mid-chapter: the same verse stays in
   view both directions.
4. **Layout-adjust** — open the Aa panel; change font size, line height, measure,
   margin: text re-typesets immediately, margin grows outward. Switch preset,
   then theme light⇄dark (whole surface, not just text, must swap).
5. **Translation switch** — KJV⇄BSB on a divergent-ish passage (Psalm 3): same
   canonical verse stays in view; settings untouched.
6. **Long chapter** — Psalm 119: open time feels instant; scroll/flip stays
   smooth end to end.
7. **Backup** — export produces a share sheet; import a previous export: confirm
   dialog → app reloads → settings + per-book positions restored.

## Part B — Human, on the physical tablet

Claude cannot judge: real-panel rendering (subpixel, color, glare), touch/scroll
physics, flip gesture feel, perceived open latency, and whether the typography is
*beautiful*. That is the human's part.

1. Install/update the dev build (`pnpm run build:local` or `build:remote`, then
   install the artifact; subsequent JS-only changes arrive via Metro or EAS Update).
2. Run the same checklist above, ~10 minutes.
3. Report back in chat: "pass" per station, plus a photo/screenshot of anything
   that looks off (device screenshots beat photos when the issue isn't panel-related).

## Wrap

Claude collects Part A verdicts + Part B report into a short verification note on
the phase's issue (stations, pass/fail, screenshots of failures). A phase issue
does not close with Part B unreported — device screenshots pending ≠ verified.
