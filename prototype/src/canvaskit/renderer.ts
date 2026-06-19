// Draws a Scene to a Skia canvas, in scene coordinates, offset by scroll. Fixed
// layer order so annotations land behind/over text correctly. Skia-specific;
// the Scene it consumes is framework-agnostic.
import type { CanvasKit, Canvas, Paint, Path } from "canvaskit-wasm";
import type { Scene, DrawStroke } from "../engine/scene";
import { CkText } from "./text";

export class Renderer {
  private fill: Paint;
  private stroke: Paint;
  private glowPaint: Paint;
  private inkPaint: Paint;

  constructor(
    private CK: CanvasKit,
    private text: CkText,
  ) {
    this.fill = new CK.Paint();
    this.fill.setAntiAlias(true);
    this.fill.setStyle(CK.PaintStyle.Fill);
    this.stroke = new CK.Paint();
    this.stroke.setAntiAlias(true);
    this.stroke.setStyle(CK.PaintStyle.Stroke);
    this.glowPaint = new CK.Paint();
    this.glowPaint.setAntiAlias(true);
    this.glowPaint.setStyle(CK.PaintStyle.Fill);
    this.inkPaint = new CK.Paint();
    this.inkPaint.setAntiAlias(true);
    this.inkPaint.setStyle(CK.PaintStyle.Stroke);
    this.inkPaint.setStrokeCap(CK.StrokeCap.Round);
    this.inkPaint.setStrokeJoin(CK.StrokeJoin.Round);
  }

  paint(
    canvas: Canvas,
    scene: Scene,
    scrollX: number,
    scrollY: number,
    dpr: number,
    bg: string,
    glowPulse = 1,
  ) {
    const { CK } = this;
    canvas.save();
    canvas.scale(dpr, dpr);
    canvas.clear(CK.parseColorString(bg));
    canvas.translate(-scrollX, -scrollY);

    // 1 — glows (earned Portals); intensity carries presence, glowPulse animates
    for (const g of scene.glows) {
      const lvl = g.intensity * glowPulse;
      const sigma = 9 + 7 * lvl;
      const blur = CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, sigma, false);
      this.glowPaint.setMaskFilter(blur);
      this.glowPaint.setColor(withAlpha(CK, g.color, 0.24 + 0.42 * lvl));
      canvas.drawRRect(CK.RRectXY(CK.LTRBRect(g.x, g.y, g.x + g.w, g.y + g.h), 6, 6), this.glowPaint);
      blur.delete();
    }
    this.glowPaint.setMaskFilter(null);

    // 2 — fills (highlights, boxes, note-card backgrounds drawn here too)
    for (const r of scene.fills) {
      const rr = CK.RRectXY(CK.LTRBRect(r.x, r.y, r.x + r.w, r.y + r.h), r.radius ?? 0, r.radius ?? 0);
      if (r.fill) {
        this.fill.setColor(CK.parseColorString(r.color));
        canvas.drawRRect(rr, this.fill);
      } else {
        this.stroke.setColor(CK.parseColorString(r.color));
        this.stroke.setStrokeWidth(1.5);
        this.stroke.setPathEffect(null);
        canvas.drawRRect(rr, this.stroke);
      }
    }

    // 2b — highlighter Ink (under the glyphs, so text stays crisp on top)
    for (const s of scene.strokes) if (s.tool === "highlighter") this.drawStroke(canvas, s);

    // 3 — words (scripture)
    for (const w of scene.words) this.text.drawWord(canvas, w);

    // 3b — pen Ink (over the glyphs — writing on the page)
    for (const s of scene.strokes) if (s.tool === "pen") this.drawStroke(canvas, s);

    // 4 — note cards (drawn over body, words inside)
    for (const c of scene.cards) {
      const rr = CK.RRectXY(CK.LTRBRect(c.x, c.y, c.x + c.w, c.y + c.h), 8, 8);
      // soft shadow
      const shadow = new CK.Paint();
      shadow.setAntiAlias(true);
      shadow.setColor(withAlpha(CK, "#000000", 0.12));
      shadow.setMaskFilter(CK.MaskFilter.MakeBlur(CK.BlurStyle.Normal, 8, false));
      canvas.drawRRect(CK.RRectXY(CK.LTRBRect(c.x + 1, c.y + 3, c.x + c.w + 1, c.y + c.h + 3), 8, 8), shadow);
      shadow.delete();
      this.fill.setColor(CK.parseColorString(c.bg));
      canvas.drawRRect(rr, this.fill);
      this.stroke.setColor(CK.parseColorString(c.border));
      this.stroke.setStrokeWidth(1);
      this.stroke.setPathEffect(null);
      canvas.drawRRect(rr, this.stroke);
      for (const w of c.words) this.text.drawWord(canvas, w);
    }

    // 5 — rules (underlines, portal underline, connectors)
    for (const ru of scene.rules) {
      this.stroke.setColor(CK.parseColorString(ru.color));
      this.stroke.setStrokeWidth(ru.width);
      if (ru.dash) {
        const dash = CK.PathEffect.MakeDash([4, 4], 0);
        this.stroke.setPathEffect(dash);
      } else {
        this.stroke.setPathEffect(null);
      }
      canvas.drawLine(ru.x1, ru.y1, ru.x2, ru.y2, this.stroke);
      if (ru.arrow) this.drawArrow(canvas, ru.x1, ru.y1, ru.x2, ru.y2, ru.color);
    }
    this.stroke.setPathEffect(null);

    canvas.restore();
  }

  // Freehand Ink. Highlighter: wide + translucent + Multiply (sits under text);
  // pen: opaque round-cap. A single tap renders as a dot.
  private drawStroke(canvas: Canvas, s: DrawStroke) {
    const { CK } = this;
    const pts = s.points;
    if (pts.length === 0) return;
    const hl = s.tool === "highlighter";
    const base = withAlpha(CK, s.color, hl ? 0.34 : 1);
    if (pts.length === 1) {
      // a dot
      this.fill.setColor(base);
      this.fill.setBlendMode(hl ? CK.BlendMode.Multiply : CK.BlendMode.SrcOver);
      canvas.drawCircle(pts[0].x, pts[0].y, s.width / 2, this.fill);
      this.fill.setBlendMode(CK.BlendMode.SrcOver);
      return;
    }
    const path = this.smoothPath(pts);
    this.inkPaint.setColor(base);
    this.inkPaint.setStrokeWidth(s.width);
    this.inkPaint.setBlendMode(hl ? CK.BlendMode.Multiply : CK.BlendMode.SrcOver);
    canvas.drawPath(path, this.inkPaint);
    this.inkPaint.setBlendMode(CK.BlendMode.SrcOver);
    path.delete();
  }

  // Quadratic smoothing through point midpoints — the classic freehand curve
  // that turns jittery pointer samples into a flowing line.
  private smoothPath(pts: { x: number; y: number }[]): Path {
    const path = new this.CK.Path();
    path.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2;
      const my = (pts[i].y + pts[i + 1].y) / 2;
      path.quadTo(pts[i].x, pts[i].y, mx, my);
    }
    const last = pts[pts.length - 1];
    path.lineTo(last.x, last.y);
    return path;
  }

  private drawArrow(canvas: Canvas, x1: number, y1: number, x2: number, y2: number, color: string) {
    const { CK } = this;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const len = 9;
    const spread = 0.5;
    const path = new CK.Path();
    path.moveTo(x2, y2);
    path.lineTo(x2 - len * Math.cos(ang - spread), y2 - len * Math.sin(ang - spread));
    path.lineTo(x2 - len * Math.cos(ang + spread), y2 - len * Math.sin(ang + spread));
    path.close();
    this.fill.setColor(CK.parseColorString(color));
    canvas.drawPath(path, this.fill);
    path.delete();
  }
}

function withAlpha(CK: CanvasKit, hex: string, alpha: number) {
  const c = CK.parseColorString(hex);
  return CK.Color4f(c[0], c[1], c[2], alpha);
}
