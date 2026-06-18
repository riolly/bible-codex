// Draws a Scene to a Skia canvas, in scene coordinates, offset by scroll. Fixed
// layer order so annotations land behind/over text correctly. Skia-specific;
// the Scene it consumes is framework-agnostic.
import type { CanvasKit, Canvas, Paint } from "canvaskit-wasm";
import type { Scene } from "../engine/scene";
import { CkText } from "./text";

export class Renderer {
  private fill: Paint;
  private stroke: Paint;
  private glowPaint: Paint;

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

    // 3 — words (scripture)
    for (const w of scene.words) this.text.drawWord(canvas, w);

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
