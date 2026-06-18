// bible-codex — THROWAWAY prototype. Proves the core bet: Skia renders genuinely
// beautiful literary scripture with smooth scroll, plus the vision beats
// (genre-aware typesetting, incremental word-tap reveal, scroll-mode + translation
// toggles, and the earned "beginning" Portal). See README.md.
import { boot, resizeBacking, makeSurface } from "./canvaskit/boot";
import { CkText } from "./canvaskit/text";
import { Renderer } from "./canvaskit/renderer";
import { layout, type Mode } from "./engine/layout";
import type { Scene } from "./engine/scene";
import {
  SCROLLS,
  scrollById,
  CROSS_REFERENCES,
  STUDY_LAYER_JOHN,
  OW,
} from "./data/corpus";
import { Reveal } from "./app/reveal";
import { Bars } from "./app/bars";

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
      study: scrollId === "john-1" ? STUDY_LAYER_JOHN : undefined,
      crossRefs: CROSS_REFERENCES,
      earned: earnedSet(),
    });
    clampScroll();
    dirty = true;
    updateBars();
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
      relayout();
    },
    onToggleMode: () => {
      mode = mode === "vertical" ? "columns" : "vertical";
      scrollX = scrollY = 0;
      reveal.close();
      relayout();
    },
    onSelectTranslation: (tr) => {
      translation = tr;
      reveal.close();
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

  // ── input ──
  let down = false;
  let moved = false;
  let sx0 = 0;
  let sy0 = 0;
  let scr0x = 0;
  let scr0y = 0;

  canvas.addEventListener("pointerdown", (e) => {
    down = true;
    moved = false;
    sx0 = e.clientX;
    sy0 = e.clientY;
    scr0x = scrollX;
    scr0y = scrollY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - sx0;
    const dy = e.clientY - sy0;
    if (Math.hypot(dx, dy) > 6) moved = true;
    if (mode === "vertical") scrollY = scr0y - dy;
    else scrollX = scr0x - dx;
    clampScroll();
    markReadIfDeep();
    dirty = true;
  });
  canvas.addEventListener("pointerup", (e) => {
    down = false;
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
    const px = clientX + scrollX;
    const py = clientY + scrollY;

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
    scene: () => ({ hits: scene.hits, portals: scene.portals, h: scene.contentHeight }),
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
