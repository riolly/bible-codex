// The typesetting engine. PURE: (chapter, fonts-via-shaper, viewport, mode) →
// positioned draw commands + Token hit-rects. No CanvasKit, no DOM. This is the
// part the handoff says must stay framework-agnostic so the RN-Skia port is
// cheap — the renderer is the only Skia-specific piece downstream.
//
// It does its own line/column wrapping over per-word measurements (rather than
// leaning on a Skia line-breaker), which is what buys drop-cap exclusion,
// poetry hanging indents, superscript verse numbers, and horizontal columns.
import type { Anchor, Block, Chapter } from "../model/types";
import type { CrossReference } from "../model/types";
import type { MockStudyLayer, Endpoint } from "../model/annotations";
import { anchorKey } from "../model/types";
import type { TextShaper, TextStyleSpec } from "./shaper";
import { type Scene, emptyScene } from "./scene";
import { THEME, type Theme } from "./theme";

export type Mode = "vertical" | "columns";

export interface LayoutInput {
  chapter: Chapter;
  shaper: TextShaper;
  viewport: { width: number; height: number };
  mode: Mode;
  theme?: Theme;
  study?: MockStudyLayer;
  crossRefs?: CrossReference[];
  earned?: Set<string>; // cross-ref ids currently glowing
  glow?: number; // 0..1 pulse
}

interface Chunk {
  text: string; // visible text, no trailing space
  anchor?: Anchor;
  ow?: string;
  verseStart?: number;
  width: number;
  spaceAfter: boolean;
}

interface Placed {
  x: number; // left of the word glyphs (after any verse numeral)
  top: number;
  w: number;
  h: number;
  baseline: number;
}

export function layout(input: LayoutInput): Scene {
  const t = input.theme ?? THEME;
  const { shaper, viewport, mode } = input;
  const scene = emptyScene();
  const placedByAnchor = new Map<string, Placed>();
  // first placed word of each verse — lets an anchored Note survive a translation
  // swap even when the exact word index doesn't line up (word counts differ).
  const firstByVerse = new Map<string, Placed>();
  const verseKey = (a: Anchor) => `${a.book} ${a.chapter}:${a.verse}`;

  const colWidth =
    mode === "columns" ? t.columnWidth : Math.min(t.maxMeasure, viewport.width - 2 * t.margin);
  const baseLeft =
    mode === "columns" ? t.margin : Math.max(t.margin, (viewport.width - colWidth) / 2);
  const colStep = colWidth + t.gutter;
  const colTop = t.marginTop;
  const colBottom = viewport.height - t.marginBottom;

  let colIndex = 0;
  let y = colTop; // top of the current line
  let maxCol = 0;

  const bodyStyle: TextStyleSpec = { fontSize: t.bodySize };
  const poetryStyle: TextStyleSpec = { fontSize: t.poetrySize };
  const headStyle: TextStyleSpec = { fontSize: t.headingSize, letterSpacing: t.headingTracking };
  const verseStyle: TextStyleSpec = { fontSize: t.verseNumSize };
  const spaceW = shaper.measure(" ", bodyStyle).width;

  const colLeft = () => baseLeft + colIndex * colStep;
  const breakColumnIfNeeded = (lineH: number) => {
    if (mode === "columns" && y + lineH > colBottom) {
      colIndex++;
      maxCol = Math.max(maxCol, colIndex);
      y = colTop;
    }
  };

  // ── drop cap: the chapter opener (first non-heading block) ──
  const openerIdx = input.chapter.blocks.findIndex((b) => b.genre !== "heading");
  let capState: { char: string; w: number; lines: number } | null = null;

  for (let bi = 0; bi < input.chapter.blocks.length; bi++) {
    const block = input.chapter.blocks[bi];
    if (block.genre === "heading") {
      layoutHeading(block);
      continue;
    }

    const style = block.genre === "poetry" ? poetryStyle : bodyStyle;
    const lineH = block.genre === "poetry" ? t.poetryLine : t.bodyLine;
    const ascent = style.fontSize * 0.8;
    y += block.genre === "poetry" ? t.poetryGap : t.paraGap;

    const chunks = chunksOf(block, shaper, style);
    if (chunks.length === 0) continue;

    // set up drop cap on the opener
    let capLinesLeft = 0;
    if (bi === openerIdx) {
      const first = chunks[0];
      const ch = first.text[0] ?? "";
      const capStyle: TextStyleSpec = { fontSize: Math.round(t.bodyLine * t.dropCapScale) };
      const capW = shaper.measure(ch, capStyle).width;
      capState = { char: ch, w: capW, lines: t.dropCapLines };
      capLinesLeft = t.dropCapLines;
      // the drop cap stands in for the verse-1 marker — don't also print "1"
      first.verseStart = undefined;
      // consume the cap glyph from the first chunk's text
      first.text = first.text.slice(1);
      first.width = first.text ? shaper.measure(first.text, style).width : 0;
      // draw the cap; its baseline sits on the last covered line
      const capBaseline = y + ascent + (t.dropCapLines - 1) * lineH;
      scene.words.push({
        text: ch,
        style: capStyle,
        x: colLeft(),
        y: capBaseline,
        color: t.colors.dropCap,
      });
    }

    const baseIndent = block.genre === "poetry" ? block.indent * t.poetryIndentStep : 0;

    let i = 0;
    let lineInBlock = 0;
    while (i < chunks.length) {
      breakColumnIfNeeded(lineH);
      const left = colLeft();
      const capInset = capState && colIndex === 0 && capLinesLeft > 0 ? capState.w + t.dropCapGap : 0;
      const hang = block.genre === "poetry" && lineInBlock > 0 ? t.poetryHang : 0;
      const lineLeft = left + capInset + baseIndent + hang;
      const availRight = left + colWidth;

      // greedily collect chunks for this line
      const start = i;
      let lineW = 0;
      const offsets: number[] = [];
      const pres: number[] = [];
      while (i < chunks.length) {
        const c = chunks[i];
        const pre = c.verseStart != null ? numeralWidth(c.verseStart) + t.verseNumGap : 0;
        const add = (i > start ? spaceW : 0) + pre + c.width;
        if (i > start && lineLeft + lineW + add > availRight) break;
        offsets.push(lineW + (i > start ? spaceW : 0));
        pres.push(pre);
        lineW += add;
        i++;
      }

      const baseline = y + ascent;
      for (let k = start; k < i; k++) {
        const c = chunks[k];
        const wx = lineLeft + offsets[k - start] + pres[k - start];
        if (c.verseStart != null) {
          // superscript verse numeral, raised above the baseline
          scene.words.push({
            text: String(c.verseStart),
            style: verseStyle,
            x: wx - pres[k - start],
            y: baseline - t.verseNumRise,
            color: t.colors.verse,
          });
        }
        if (c.text) {
          scene.words.push({ text: c.text, style, x: wx, y: baseline, color: t.colors.ink });
        }
        if (c.anchor) {
          const rect: Placed = { x: wx, top: y, w: c.width, h: lineH, baseline };
          placedByAnchor.set(anchorKey(c.anchor), rect);
          const vk = verseKey(c.anchor);
          if (!firstByVerse.has(vk)) firstByVerse.set(vk, rect);
          scene.hits.push({ x: wx, y, w: c.width, h: lineH, anchor: c.anchor, ow: c.ow });
        }
      }

      y += lineH;
      lineInBlock++;
      if (capLinesLeft > 0) capLinesLeft--;
    }
  }

  // ── content bounds (must be set before annotations clamp against them) ──
  if (mode === "columns") {
    scene.contentWidth = baseLeft + (maxCol + 1) * colStep - t.gutter + t.margin;
    scene.contentHeight = viewport.height;
  } else {
    scene.contentWidth = viewport.width;
    scene.contentHeight = y + t.marginBottom;
  }

  // ── resolve annotations + cross-references (anchored → scene coords) ──
  if (input.crossRefs) resolvePortals(input.crossRefs);
  if (input.study) resolveStudy(input.study);

  return scene;

  // ── helpers ──
  function numeralWidth(n: number) {
    return shaper.measure(String(n), verseStyle).width;
  }

  function layoutHeading(block: Block) {
    const text = block.tokens
      .map((tk) => tk.text)
      .join("")
      .trim()
      .toUpperCase();
    const m = shaper.measure(text, headStyle);
    const lineH = t.headingSize + 8;
    y += t.headingGapAbove;
    breakColumnIfNeeded(lineH);
    const x = colLeft() + (colWidth - m.width) / 2;
    scene.words.push({ text, style: headStyle, x, y: y + t.headingSize, color: t.colors.gilt });
    y += lineH + t.headingGapBelow;
  }

  function rectsForSpan(from: Anchor, to: Anchor): Placed[] {
    const out: Placed[] = [];
    for (let w = from.word; w <= to.word; w++) {
      const r = placedByAnchor.get(anchorKey({ ...from, word: w }));
      if (r) out.push(r);
    }
    return out;
  }

  // merge placed rects that share a line into line-runs
  function lineRuns(rects: Placed[]) {
    const byTop = new Map<number, Placed[]>();
    for (const r of rects) {
      const arr = byTop.get(r.top) ?? [];
      arr.push(r);
      byTop.set(r.top, arr);
    }
    return [...byTop.values()].map((arr) => {
      const x = Math.min(...arr.map((r) => r.x));
      const right = Math.max(...arr.map((r) => r.x + r.w));
      const r0 = arr[0];
      return { x, top: r0.top, w: right - x, h: r0.h, baseline: r0.baseline };
    });
  }

  function resolvePortals(refs: CrossReference[]) {
    const ch = input.chapter;
    for (const ref of refs) {
      if (ref.from.book !== ch.book || ref.from.chapter !== ch.chapter) continue;
      const r = placedByAnchor.get(anchorKey(ref.from));
      if (!r) continue;
      const earned = input.earned?.has(ref.id) ?? false;
      const pad = 3;
      if (earned) {
        scene.glows.push({
          x: r.x - 6,
          y: r.top - 2,
          w: r.w + 12,
          h: r.h,
          color: t.colors.gilt,
          intensity: input.glow ?? 1,
        });
        scene.rules.push({
          x1: r.x - pad,
          y1: r.baseline + 5,
          x2: r.x + r.w + pad,
          y2: r.baseline + 5,
          color: t.colors.gilt,
          width: 2,
        });
        scene.portals.push({ x: r.x - 6, y: r.top - 2, w: r.w + 12, h: r.h + 4, crossRefId: ref.id });
      } else {
        // a dim hint — something is here, not yet earned
        scene.rules.push({
          x1: r.x - pad,
          y1: r.baseline + 5,
          x2: r.x + r.w + pad,
          y2: r.baseline + 5,
          color: t.colors.faint,
          width: 1,
          dash: true,
        });
      }
    }
  }

  function endpointPoint(ep: Endpoint, cards: Map<string, { x: number; y: number; w: number; h: number }>) {
    if (ep.kind === "anchor") {
      const r = placedByAnchor.get(anchorKey(ep.anchor));
      if (!r) return null;
      return { x: r.x + r.w / 2, y: r.top + r.h / 2 };
    }
    const c = cards.get(ep.noteId);
    if (!c) return null;
    return { x: c.x, y: c.y + c.h / 2 };
  }

  function resolveStudy(study: MockStudyLayer) {
    // marks
    for (const mk of study.marks) {
      const runs = lineRuns(rectsForSpan(mk.from, mk.to));
      for (const run of runs) {
        if (mk.kind === "highlight") {
          scene.fills.push({
            x: run.x - 2,
            y: run.baseline - run.h * 0.62,
            w: run.w + 4,
            h: run.h * 0.72,
            color: mk.color,
            fill: true,
            radius: 3,
          });
        } else if (mk.kind === "underline") {
          scene.rules.push({
            x1: run.x,
            y1: run.baseline + 4,
            x2: run.x + run.w,
            y2: run.baseline + 4,
            color: mk.color,
            width: 2,
          });
        } else {
          scene.fills.push({
            x: run.x - 4,
            y: run.top - 2,
            w: run.w + 8,
            h: run.h,
            color: mk.color,
            fill: false,
            radius: 4,
          });
        }
      }
    }

    // notes → cards in the margin
    const cardRects = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const note of study.notes) {
      const r = placedByAnchor.get(anchorKey(note.anchor)) ?? firstByVerse.get(verseKey(note.anchor));
      if (!r) continue;
      const cardW = 196;
      const pad = 12;
      const gap = 22;
      const noteStyle: TextStyleSpec = { fontSize: 15, italic: true };
      const words = wrapInto(note.text, noteStyle, cardW - pad * 2);
      const cardH = pad * 2 + words.lines.length * 21;
      let cx = note.side === "right" ? r.x + r.w + gap : r.x - cardW - gap;
      // clamp into the content so a narrow viewport never hides the card
      cx = Math.min(Math.max(8, cx), Math.max(8, scene.contentWidth - cardW - 8));
      const cy = r.top - 6;
      cardRects.set(note.id, { x: cx, y: cy, w: cardW, h: cardH });

      const cardWords = words.lines.map((ln, idx) => ({
        text: ln,
        style: noteStyle,
        x: cx + pad,
        y: cy + pad + 15 + idx * 21,
        color: t.colors.ink,
      }));
      scene.cards.push({
        id: note.id,
        x: cx,
        y: cy,
        w: cardW,
        h: cardH,
        bg: "#fbf5e6",
        border: t.colors.faint,
        words: cardWords,
      });
    }

    // connectors → arrows
    for (const con of study.connectors) {
      const a = endpointPoint(con.from, cardRects);
      const b = endpointPoint(con.to, cardRects);
      if (!a || !b) continue;
      scene.rules.push({
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        color: t.colors.gilt,
        width: 1.5,
        arrow: true,
      });
    }
  }

  function wrapInto(text: string, style: TextStyleSpec, maxW: number) {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const trial = cur ? cur + " " + w : w;
      if (cur && shaper.measure(trial, style).width > maxW) {
        lines.push(cur);
        cur = w;
      } else cur = trial;
    }
    if (cur) lines.push(cur);
    return { lines };
  }
}

function chunksOf(block: Block, shaper: TextShaper, style: TextStyleSpec): Chunk[] {
  const out: Chunk[] = [];
  let cur: Chunk | null = null;
  for (const tok of block.tokens) {
    if (tok.kind === "space") {
      if (cur) {
        cur.spaceAfter = true;
        out.push(cur);
        cur = null;
      }
      continue;
    }
    if (!cur) cur = { text: "", spaceAfter: false, width: 0 };
    cur.text += tok.text;
    if (tok.kind === "word" && cur.anchor === undefined) {
      cur.anchor = tok.anchor;
      cur.ow = tok.ow;
      if (tok.verseStart) cur.verseStart = tok.anchor.verse;
    }
  }
  if (cur) out.push(cur);
  for (const c of out) c.width = shaper.measure(c.text, style).width;
  return out;
}
