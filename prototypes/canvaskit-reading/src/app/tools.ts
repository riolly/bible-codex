// DOM chrome: the authoring tool palette (right edge). Pure UI — it owns no
// scripture and no marks; it only reports the active tool / colour / layer
// visibility back to main, which does the actual capture on the Skia canvas.
//
// Tools split along the two annotation physics from the architecture plan:
//   • Note  → Markup (anchored text, reflows + ports) — built via the engine.
//   • Pen / Highlighter → Ink (freehand, glued to this layout) — captured raw.
//   • Eraser → vector whole-stroke delete of Ink.
// Read is the default (scroll + tap-to-reveal + tap-portal).

export type ToolName = "read" | "note" | "pen" | "highlighter" | "eraser";

const INK = "#2b2117";
const HL = "#f2c14e";

// swatch palette — warm enough that the highlighter reads as a real marker.
const SWATCHES = ["#2b2117", "#9a6b2f", "#9b2f2f", "#2f5b8f", "#3a6b3a", "#f2c14e"];

interface Handlers {
  onTool: (t: ToolName) => void;
  onUndo: () => void;
  onToggleLayer: (visible: boolean) => void;
}

const TOOLS: { id: ToolName; glyph: string; label: string }[] = [
  { id: "read", glyph: "✋", label: "Read" },
  { id: "note", glyph: "✎", label: "Note" },
  { id: "pen", glyph: "🖊", label: "Pen" },
  { id: "highlighter", glyph: "▌", label: "Mark" },
  { id: "eraser", glyph: "⌫", label: "Erase" },
];

const STYLE = `
.tools { position: fixed; right: 14px; top: 50%; transform: translateY(-50%); z-index: 12;
  display:flex; flex-direction:column; gap:6px; padding:8px; border-radius:16px;
  background: #2b2117e8; border:1px solid #5c4a30; box-shadow:0 8px 26px rgba(20,12,4,.4);
  font-family:"Cardo", Georgia, serif; user-select:none; }
.tools .tbtn { width:50px; height:48px; border-radius:11px; border:1px solid transparent;
  background:#3a2e1d; color:#d9c69b; cursor:pointer; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:1px; line-height:1; }
.tools .tbtn .g { font-size:19px; }
.tools .tbtn .l { font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:#b29764; }
.tools .tbtn.on { background:#9a6b2f; border-color:#caa05c; color:#2b2117; }
.tools .tbtn.on .l { color:#2b2117; }
.tools .tbtn:disabled { opacity:.38; cursor:default; }
.tools .div { height:1px; background:#5c4a30; margin:3px 2px; }
.tools .swatches { display:none; flex-direction:column; gap:5px; align-items:center; padding:3px 0; }
.tools .swatches.show { display:flex; }
.tools .sw { width:24px; height:24px; border-radius:50%; cursor:pointer; border:2px solid #00000022;
  box-shadow:0 0 0 1px #00000033 inset; }
.tools .sw.on { border-color:#f3e8c8; box-shadow:0 0 0 2px #9a6b2f; }
`;

export class Tools {
  private el: HTMLDivElement;
  private btns = new Map<ToolName, HTMLButtonElement>();
  private swatchWrap: HTMLDivElement;
  private swatchEls: HTMLDivElement[] = [];
  private undoBtn: HTMLButtonElement;
  private eyeBtn: HTMLButtonElement;

  private tool: ToolName = "read";
  private colorByTool: Record<"pen" | "highlighter", string> = { pen: INK, highlighter: HL };
  private layerVisible = true;

  constructor(private handlers: Handlers) {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);

    this.el = document.createElement("div");
    this.el.className = "tools";

    for (const t of TOOLS) {
      const b = document.createElement("button");
      b.className = "tbtn" + (t.id === this.tool ? " on" : "");
      b.innerHTML = `<span class="g">${t.glyph}</span><span class="l">${t.label}</span>`;
      b.addEventListener("click", () => this.selectTool(t.id));
      this.btns.set(t.id, b);
      this.el.appendChild(b);
    }

    this.swatchWrap = document.createElement("div");
    this.swatchWrap.className = "swatches";
    for (const c of SWATCHES) {
      const sw = document.createElement("div");
      sw.className = "sw";
      sw.style.background = c;
      sw.addEventListener("click", () => this.selectColor(c));
      this.swatchEls.push(sw);
      this.swatchWrap.appendChild(sw);
    }
    this.el.appendChild(this.swatchWrap);

    const div = document.createElement("div");
    div.className = "div";
    this.el.appendChild(div);

    this.undoBtn = document.createElement("button");
    this.undoBtn.className = "tbtn";
    this.undoBtn.innerHTML = `<span class="g">↶</span><span class="l">Undo</span>`;
    this.undoBtn.disabled = true;
    this.undoBtn.addEventListener("click", () => this.handlers.onUndo());
    this.el.appendChild(this.undoBtn);

    this.eyeBtn = document.createElement("button");
    this.eyeBtn.className = "tbtn";
    this.eyeBtn.innerHTML = `<span class="g">👁</span><span class="l">Notes</span>`;
    this.eyeBtn.addEventListener("click", () => {
      this.layerVisible = !this.layerVisible;
      this.eyeBtn.classList.toggle("on", this.layerVisible);
      this.eyeBtn.querySelector(".g")!.textContent = this.layerVisible ? "👁" : "🚫";
      this.handlers.onToggleLayer(this.layerVisible);
    });
    this.eyeBtn.classList.add("on");
    this.el.appendChild(this.eyeBtn);

    document.body.appendChild(this.el);
    this.refreshSwatches();
  }

  get currentTool() {
    return this.tool;
  }
  get currentColor() {
    return this.tool === "highlighter" ? this.colorByTool.highlighter : this.colorByTool.pen;
  }
  get currentWidth() {
    return this.tool === "highlighter" ? 20 : 3.2;
  }
  get isLayerVisible() {
    return this.layerVisible;
  }

  setUndoEnabled(on: boolean) {
    this.undoBtn.disabled = !on;
  }

  private selectTool(t: ToolName) {
    this.tool = t;
    for (const [id, b] of this.btns) b.classList.toggle("on", id === t);
    const drawing = t === "pen" || t === "highlighter";
    this.swatchWrap.classList.toggle("show", drawing);
    if (drawing) this.refreshSwatches();
    this.handlers.onTool(t);
  }

  private selectColor(c: string) {
    if (this.tool === "pen" || this.tool === "highlighter") {
      this.colorByTool[this.tool] = c;
      this.refreshSwatches();
    }
  }

  private refreshSwatches() {
    const active = this.currentColor;
    this.swatchEls.forEach((el, i) => el.classList.toggle("on", SWATCHES[i] === active));
  }
}
