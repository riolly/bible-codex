// bible-codex — THROWAWAY prototype. Proves the core bet: Skia renders genuinely
// beautiful literary scripture with smooth scroll, plus the vision beats
// (genre-aware typesetting, incremental word-tap reveal, scroll-mode + translation
// toggles, and the earned "beginning" Portal). See README.md.
import { boot, resizeBacking, makeSurface } from "./canvaskit/boot";
import { CkText } from "./canvaskit/text";
import { Renderer } from "./canvaskit/renderer";
import { layout, type Mode } from "./engine/layout";
import type { Scene, DrawStroke } from "./engine/scene";
import type { MockNote, MockStudyLayer } from "./model/annotations";
import type { Anchor } from "./model/types";
import {
  SCROLLS,
  scrollById,
  CROSS_REFERENCES,
  STUDY_LAYER_JOHN,
  OW,
} from "./data/corpus";
import { Reveal } from "./app/reveal";
import { Bars } from "./app/bars";
import { Tools, type ToolName } from "./app/tools";
import { NoteEditor } from "./app/noteEditor";

const PARCHMENT = "#f5edda";

async function run() {
  const booted = await boot("stage");
  const { CK, fontMgr, canvas, dpr } = booted;
  let surface = booted.surface; // remade on resize (GL buffer is size-bound)
  document.getElementById("boot")?.remove();

  const text = new CkText(CK, fontMgr);
  const renderer = new Renderer(CK, text);
  const reveal = new Reveal();

  // ── state ──
  let scrollId = "genesis-1"; // open on the drop-cap showpiece
  let translation = scrollById(scrollId).defaultTranslation;
  let mode: Mode = "vertical";
  let scrollX = 0;
  let scrollY = 0;
  const readScrolls = new Set<string>();
  let scene: Scene = null as unknown as Scene;
  let earnedKey = "";
  let dirty = true;

  // ── user annotation store (in-memory, throwaway) ──
  // Notes are Markup: anchored to scripture → reflow + port across translations.
  // Ink strokes are freehand: glued to the layout they were drawn over → tagged
  // with the (scroll|translation|mode) context and only shown in that context.
  const userNotes: MockNote[] = [];
  interface UserStroke {
    id: string;
    ctx: string;
    draw: DrawStroke;
  }
  const userStrokes: UserStroke[] = [];
  type UndoOp =
    | { kind: "note"; id: string }
    | { kind: "stroke"; id: string }
    | { kind: "erase"; strokes: UserStroke[] };
  const undoStack: UndoOp[] = [];
  let live: DrawStroke | null = null; // in-progress ink
  let uid = 0;
  let suppressTapUntil = 0; // swallow the canvas tap that commits an open editor
  const ctxKey = () => `${scrollId}|${translation}|${mode}`;

  const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });

  function earnedSet(): Set<string> {
    const e = new Set<string>();
    if (readScrolls.has("genesis-1")) e.add("portal-beginning");
    if (readScrolls.has("john-1")) e.add("xref-1john-beginning");
    return e;
  }

  function relayout() {
    const scroll = scrollById(scrollId);
    const chapter = scroll.translations[translation] ?? scroll.translations[scroll.defaultTranslation];
    scene = layout({
      chapter,
      shaper: text,
      viewport: viewport(),
      mode,
      study: studyForCurrent(chapter.book, chapter.chapter),
      crossRefs: CROSS_REFERENCES,
      earned: earnedSet(),
    });
    scene.strokes = currentStrokes();
    clampScroll();
    dirty = true;
    updateBars();
  }

  // Markup layer for the current chapter: the pre-seeded John mock (a worked
  // example) + the user's own Notes on this chapter. Hidden when Notes are off.
  function studyForCurrent(book: string, chapter: number): MockStudyLayer | undefined {
    if (!tools.isLayerVisible) return undefined;
    const base: MockStudyLayer =
      scrollId === "john-1"
        ? { marks: STUDY_LAYER_JOHN.marks, notes: [...STUDY_LAYER_JOHN.notes], connectors: STUDY_LAYER_JOHN.connectors }
        : { marks: [], notes: [], connectors: [] };
    const mine = userNotes.filter((n) => n.anchor.book === book && n.anchor.chapter === chapter);
    return { ...base, notes: [...base.notes, ...mine] };
  }

  // Ink for the current context only (Ink is layout-bound, not portable).
  function currentStrokes(): DrawStroke[] {
    if (!tools.isLayerVisible) return [];
    const arr = userStrokes.filter((s) => s.ctx === ctxKey()).map((s) => s.draw);
    if (live) arr.push(live);
    return arr;
  }

  function refreshStrokes() {
    scene.strokes = currentStrokes();
    dirty = true;
  }

  function maxScrollY() {
    return Math.max(0, scene.contentHeight - window.innerHeight);
  }
  function maxScrollX() {
    return Math.max(0, scene.contentWidth - window.innerWidth);
  }
  function clampScroll() {
    scrollY = Math.min(Math.max(0, scrollY), maxScrollY());
    scrollX = Math.min(Math.max(0, scrollX), maxScrollX());
  }

  function markReadIfDeep() {
    const frac =
      mode === "vertical"
        ? maxScrollY() > 0
          ? scrollY / maxScrollY()
          : 1
        : maxScrollX() > 0
          ? scrollX / maxScrollX()
          : 1;
    if (frac > 0.5 && !readScrolls.has(scrollId)) {
      readScrolls.add(scrollId);
      const k = [...earnedSet()].sort().join(",");
      if (k !== earnedKey) {
        earnedKey = k;
        relayout(); // earning changes the scene (a Portal now glows)
      }
    }
  }

  // ── chrome ──
  const bars = new Bars(SCROLLS, {
    onSelectScroll: (id) => {
      if (id === scrollId) return;
      scrollId = id;
      const s = scrollById(id);
      if (!s.translations[translation]) translation = s.defaultTranslation;
      scrollX = scrollY = 0;
      reveal.close();
      noteEditor.close();
      live = null;
      relayout();
    },
    onToggleMode: () => {
      mode = mode === "vertical" ? "columns" : "vertical";
      scrollX = scrollY = 0;
      reveal.close();
      noteEditor.close();
      live = null;
      relayout();
    },
    onSelectTranslation: (tr) => {
      translation = tr;
      reveal.close();
      noteEditor.close();
      live = null;
      relayout();
    },
  });

  function updateBars() {
    bars.update({
      scrollId,
      translation,
      mode,
      portalReady: scene?.portals.length > 0,
    });
  }

  // ── authoring chrome ──
  const noteEditor = new NoteEditor();
  const tools = new Tools({
    onTool: (t: ToolName) => {
      reveal.close();
      noteEditor.close();
      live = null;
      canvas.style.cursor = t === "read" ? "grab" : t === "eraser" ? "cell" : "crosshair";
    },
    onUndo: () => undo(),
    onToggleLayer: () => relayout(), // re-resolves notes + strokes for visibility
  });
  canvas.style.cursor = "grab";

  // ── input ──
  let down = false;
  let moved = false;
  let sx0 = 0;
  let sy0 = 0;
  let scr0x = 0;
  let scr0y = 0;

  const contentPt = (e: PointerEvent) => ({ x: e.clientX + scrollX, y: e.clientY + scrollY });

  canvas.addEventListener("pointerdown", (e) => {
    if (noteEditor.isOpen) return; // its blur-commit handles this gesture
    down = true;
    moved = false;
    sx0 = e.clientX;
    sy0 = e.clientY;
    scr0x = scrollX;
    scr0y = scrollY;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointers (test harness) have no capturable id */
    }
    const tool = tools.currentTool;
    if (tool === "pen" || tool === "highlighter") {
      live = { tool, color: tools.currentColor, width: tools.currentWidth, points: [contentPt(e)] };
      refreshStrokes();
    } else if (tool === "eraser") {
      eraseAt(contentPt(e));
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - sx0;
    const dy = e.clientY - sy0;
    if (Math.hypot(dx, dy) > 4) moved = true;
    if (live) {
      live.points.push(contentPt(e));
      refreshStrokes();
      return;
    }
    if (tools.currentTool === "eraser") {
      eraseAt(contentPt(e));
      return;
    }
    // read / note → drag scrolls (wheel scrolls too, regardless of tool)
    if (mode === "vertical") scrollY = scr0y - dy;
    else scrollX = scr0x - dx;
    clampScroll();
    markReadIfDeep();
    dirty = true;
  });
  canvas.addEventListener("pointerup", (e) => {
    down = false;
    if (live) {
      const s = live;
      live = null; // clear before commit so the refresh doesn't double-count it
      if (s.points.length >= 1) commitStroke(s);
      return;
    }
    if (tools.currentTool === "eraser") return;
    if (!moved) handleTap(e.clientX, e.clientY);
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (mode === "vertical") scrollY += e.deltaY;
      else scrollX += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      clampScroll();
      markReadIfDeep();
      dirty = true;
    },
    { passive: false },
  );

  function handleTap(clientX: number, clientY: number) {
    if (performance.now() < suppressTapUntil) return;
    const px = clientX + scrollX;
    const py = clientY + scrollY;

    if (tools.currentTool === "note") {
      handleNoteTap(px, py, clientX, clientY);
      return;
    }

    // earned Portal first
    for (const p of scene.portals) {
      if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) {
        navigatePortal(p.crossRefId);
        return;
      }
    }
    // word reveal
    for (const h of scene.hits) {
      if (px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h) {
        if (h.ow && OW[h.ow]) {
          reveal.open(OW[h.ow], clientX, clientY);
          return;
        }
      }
    }
    reveal.close();
  }

  // ── Note authoring (Markup) ──
  function handleNoteTap(px: number, py: number, clientX: number, clientY: number) {
    // tap an existing user note → edit it
    for (const c of scene.cards) {
      if (px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h) {
        const note = userNotes.find((n) => n.id === c.id);
        if (note) {
          editNote(note, clientX, clientY);
          return;
        }
      }
    }
    // else tap a word → create a note pinned to it
    for (const h of scene.hits) {
      if (px >= h.x && px <= h.x + h.w && py >= h.y && py <= h.y + h.h) {
        createNote(h.anchor, clientX, clientY);
        return;
      }
    }
  }

  function createNote(anchor: Anchor, clientX: number, clientY: number) {
    noteEditor.open(clientX, clientY, "", (textRaw) => {
      suppressTapUntil = performance.now() + 350;
      const textv = textRaw.trim();
      if (!textv) return;
      const note: MockNote = {
        id: "un-" + ++uid,
        anchor: { ...anchor },
        side: clientX < window.innerWidth / 2 ? "right" : "left",
        text: textv,
      };
      userNotes.push(note);
      undoStack.push({ kind: "note", id: note.id });
      syncUndo();
      relayout();
    });
  }

  function editNote(note: MockNote, clientX: number, clientY: number) {
    noteEditor.open(clientX, clientY, note.text, (textRaw) => {
      suppressTapUntil = performance.now() + 350;
      const textv = textRaw.trim();
      if (!textv) {
        const i = userNotes.indexOf(note);
        if (i >= 0) userNotes.splice(i, 1);
      } else {
        note.text = textv;
      }
      relayout();
    });
  }

  // ── Ink authoring (freehand) ──
  function commitStroke(draw: DrawStroke) {
    const us: UserStroke = { id: "us-" + ++uid, ctx: ctxKey(), draw };
    userStrokes.push(us);
    undoStack.push({ kind: "stroke", id: us.id });
    syncUndo();
    refreshStrokes();
  }

  function eraseAt(pt: { x: number; y: number }) {
    const R = 13;
    const removed: UserStroke[] = [];
    for (let i = userStrokes.length - 1; i >= 0; i--) {
      const us = userStrokes[i];
      if (us.ctx !== ctxKey()) continue;
      const hit = us.draw.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) <= R + us.draw.width / 2);
      if (hit) {
        removed.push(us);
        userStrokes.splice(i, 1);
      }
    }
    if (removed.length) {
      undoStack.push({ kind: "erase", strokes: removed });
      syncUndo();
      refreshStrokes();
    }
  }

  function undo() {
    const op = undoStack.pop();
    if (!op) return;
    if (op.kind === "note") {
      const i = userNotes.findIndex((n) => n.id === op.id);
      if (i >= 0) userNotes.splice(i, 1);
      relayout();
    } else if (op.kind === "stroke") {
      const i = userStrokes.findIndex((s) => s.id === op.id);
      if (i >= 0) userStrokes.splice(i, 1);
      refreshStrokes();
    } else {
      userStrokes.push(...op.strokes);
      refreshStrokes();
    }
    syncUndo();
  }

  function syncUndo() {
    tools.setUndoEnabled(undoStack.length > 0);
  }

  function navigatePortal(crossRefId: string) {
    const ref = CROSS_REFERENCES.find((r) => r.id === crossRefId);
    if (!ref) return;
    const target = SCROLLS.find(
      (s) => s.translations[s.defaultTranslation].book === ref.to.book &&
        s.translations[s.defaultTranslation].chapter === ref.to.chapter,
    );
    if (!target) return;
    reveal.close();
    scrollId = target.id;
    translation = target.translations[translation] ? translation : target.defaultTranslation;
    scrollX = scrollY = 0;
    relayout();
  }

  // ── resize ── remake the surface; the GL drawing buffer is size-bound.
  window.addEventListener("resize", () => {
    resizeBacking(canvas, dpr);
    surface.delete();
    surface = makeSurface(CK, canvas);
    relayout();
  });

  // ── frame loop (repaint on motion / glow; idle otherwise) ──
  let frames = 0;
  let fpsT = performance.now();
  const glowPulse = () => 0.5 + 0.5 * Math.sin(performance.now() / 520);

  relayout();

  // debug hook (throwaway) — lets the preview harness drive real pointer events
  // at known word rects and read state.
  (window as unknown as { __bc: unknown }).__bc = {
    state: () => ({ scrollId, translation, mode, scrollX, scrollY, earned: [...earnedSet()] }),
    scene: () => ({
      hits: scene.hits,
      portals: scene.portals,
      h: scene.contentHeight,
      cards: scene.cards.map((c) => ({ id: c.id, x: c.x, y: c.y, w: c.w, h: c.h })),
      strokes: scene.strokes.length,
    }),
    tapScene: (px: number, py: number) => handleTap(px - scrollX, py - scrollY),
    setScroll: (x: number, y: number) => {
      scrollX = x;
      scrollY = y;
      clampScroll();
      markReadIfDeep();
      dirty = true;
    },
  };

  // Loop on window rAF (not surface.requestAnimationFrame) so it reads the
  // CURRENT surface each frame — survives surface recreation on resize.
  const frame = () => {
    const animating = scene.glows.length > 0; // glowing Portal on this scroll
    if (dirty || animating) {
      renderer.paint(surface.getCanvas(), scene, scrollX, scrollY, dpr, PARCHMENT, glowPulse());
      surface.flush();
      dirty = false;
      frames++;
      const now = performance.now();
      if (now - fpsT >= 500) {
        bars.setFps(Math.round((frames * 1000) / (now - fpsT)));
        frames = 0;
        fpsT = now;
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

run().catch((e) => {
  console.error(e);
  const b = document.getElementById("boot");
  if (b) b.textContent = "boot failed: " + (e?.message ?? e);
});
