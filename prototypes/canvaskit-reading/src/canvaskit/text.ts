// CanvasKit-backed text: implements the engine's TextShaper (measurement) and
// draws individual shaped words. One Paragraph per (text, style, color) is
// cached and reused for both measuring and drawing — the corpus is small so the
// cache stays bounded. This + renderer.ts are the ONLY Skia-specific code.
import type { CanvasKit, Paragraph, Canvas, FontMgr } from "canvaskit-wasm";
import type { TextShaper, TextStyleSpec, WordMetrics } from "../engine/shaper";
import type { DrawWord } from "../engine/scene";

const FAMILY = "Cardo";
const BIG = 100000; // lay out at "infinite" width → single line, true intrinsic width

export class CkText implements TextShaper {
  private cache = new Map<string, { p: Paragraph; w: number; ascent: number; descent: number }>();

  constructor(
    private CK: CanvasKit,
    private fontMgr: FontMgr,
  ) {}

  private key(text: string, style: TextStyleSpec, color: string) {
    return `${color}|${style.fontSize}|${style.bold ? 1 : 0}${style.italic ? 1 : 0}|${
      style.letterSpacing ?? 0
    }|${text}`;
  }

  private get(text: string, style: TextStyleSpec, color: string) {
    const k = this.key(text, style, color);
    let hit = this.cache.get(k);
    if (hit) return hit;
    const { CK } = this;
    const paraStyle = new CK.ParagraphStyle({
      textStyle: {
        color: CK.parseColorString(color),
        fontFamilies: [FAMILY],
        fontSize: style.fontSize,
        letterSpacing: style.letterSpacing ?? 0,
        fontStyle: {
          weight: style.bold ? CK.FontWeight.Bold : CK.FontWeight.Normal,
          slant: style.italic ? CK.FontSlant.Italic : CK.FontSlant.Upright,
        },
      },
      textAlign: CK.TextAlign.Left,
      maxLines: 1,
    });
    const b = CK.ParagraphBuilder.Make(paraStyle, this.fontMgr);
    b.addText(text);
    const p = b.build();
    p.layout(BIG);
    b.delete();
    hit = {
      p,
      w: p.getMaxIntrinsicWidth(),
      ascent: p.getAlphabeticBaseline(),
      descent: p.getHeight() - p.getAlphabeticBaseline(),
    };
    this.cache.set(k, hit);
    return hit;
  }

  // TextShaper — measurement uses ink colour (colour doesn't affect metrics).
  measure(text: string, style: TextStyleSpec): WordMetrics {
    const h = this.get(text, style, "#000000");
    return { width: h.w, ascent: h.ascent, descent: h.descent };
  }

  drawWord(canvas: Canvas, word: DrawWord) {
    const h = this.get(word.text, word.style, word.color);
    // DrawWord.y is the baseline; drawParagraph draws from the top.
    canvas.drawParagraph(h.p, word.x, word.y - h.ascent);
  }
}
