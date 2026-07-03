// DOM chrome: the top "scroll" header and the bottom control rail (scroll
// switcher = the collection-of-scrolls, scroll-mode toggle, translation toggle,
// and an FPS read-out so on-device smoothness is measurable). Pure UI; all
// scripture lives on the Skia canvas.
import type { Scroll } from "../data/corpus";
import type { Mode } from "../engine/layout";

export interface BarState {
  scrollId: string;
  translation: string;
  mode: Mode;
  portalReady: boolean;
}

interface Handlers {
  onSelectScroll: (id: string) => void;
  onToggleMode: () => void;
  onSelectTranslation: (tr: string) => void;
}

const STYLE = `
.bars { font-family: "Cardo", Georgia, serif; color: #efe2c4; }
.topbar { position: fixed; top: 0; left: 0; right: 0; z-index: 10; padding: 14px 22px 16px;
  background: linear-gradient(#2b2117f2, #2b211700); pointer-events: none; display:flex; align-items:flex-end; gap:14px;}
.topbar .title { font-size: 26px; line-height: 1; color: #f3e8c8; }
.topbar .sub { font-size: 13px; letter-spacing: .12em; text-transform: uppercase; color: #c4a86a; padding-bottom:3px;}
.topbar .portal { margin-left:auto; font-size:12px; letter-spacing:.1em; text-transform:uppercase;
  color:#e7c66a; padding-bottom:3px; opacity:0; transition:opacity .4s;}
.topbar .portal.on { opacity:1; }

.botbar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 10; padding: 12px 16px 16px;
  background: linear-gradient(#2b211700, #2b2117f2); display:flex; align-items:center; gap:10px; flex-wrap:wrap;}
.scrolls { display:flex; gap:7px; }
.chip { padding: 7px 12px; border-radius: 999px; border:1px solid #5c4a30; background:#3a2e1d;
  color:#d9c69b; font-size:14px; cursor:pointer; white-space:nowrap; }
.chip .ref { color:#b08a4e; font-size:11px; letter-spacing:.08em; text-transform:uppercase; margin-left:6px;}
.chip.active { background:#9a6b2f; border-color:#caa05c; color:#2b2117; }
.chip.active .ref { color:#3a2e1d; }
.spacer { flex: 1 1 auto; }
.seg { display:flex; border:1px solid #5c4a30; border-radius:999px; overflow:hidden; }
.seg button { background:#3a2e1d; color:#d9c69b; border:none; padding:7px 13px; font-size:13px;
  font-family:inherit; cursor:pointer; letter-spacing:.04em;}
.seg button.on { background:#9a6b2f; color:#2b2117; }
.seg button:disabled { opacity:.4; cursor:default; }
.fps { font-size:12px; color:#7e6a45; letter-spacing:.08em; min-width:62px; text-align:right;}
`;

export class Bars {
  private fpsEl!: HTMLSpanElement;
  private titleEl!: HTMLSpanElement;
  private subEl!: HTMLSpanElement;
  private portalEl!: HTMLSpanElement;
  private chipsWrap!: HTMLDivElement;
  private modeBtn!: HTMLButtonElement;
  private trSeg!: HTMLDivElement;

  constructor(
    private scrolls: Scroll[],
    private handlers: Handlers,
  ) {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);

    const wrap = document.createElement("div");
    wrap.className = "bars";

    const top = document.createElement("div");
    top.className = "topbar";
    this.titleEl = span("title");
    this.subEl = span("sub");
    this.portalEl = span("portal");
    this.portalEl.textContent = "✦ a portal has opened";
    top.append(this.titleEl, this.subEl, this.portalEl);

    const bot = document.createElement("div");
    bot.className = "botbar";
    this.chipsWrap = document.createElement("div");
    this.chipsWrap.className = "scrolls";
    for (const s of scrolls) {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.dataset.id = s.id;
      chip.innerHTML = `${s.title}<span class="ref">${s.ref}</span>`;
      chip.addEventListener("click", () => handlers.onSelectScroll(s.id));
      this.chipsWrap.appendChild(chip);
    }

    const spacer = document.createElement("div");
    spacer.className = "spacer";

    this.modeBtn = document.createElement("button");
    const modeSeg = document.createElement("div");
    modeSeg.className = "seg";
    this.modeBtn.addEventListener("click", () => handlers.onToggleMode());
    modeSeg.appendChild(this.modeBtn);

    this.trSeg = document.createElement("div");
    this.trSeg.className = "seg";

    this.fpsEl = document.createElement("span");
    this.fpsEl.className = "fps";

    bot.append(this.chipsWrap, spacer, this.trSeg, modeSeg, this.fpsEl);
    wrap.append(top, bot);
    document.body.appendChild(wrap);
  }

  setFps(n: number) {
    this.fpsEl.textContent = `${n} fps`;
  }

  update(state: BarState) {
    const scroll = this.scrolls.find((s) => s.id === state.scrollId)!;
    this.titleEl.textContent = scroll.title;
    this.subEl.textContent = `${scroll.ref} · ${scroll.genreLabel}`;
    this.portalEl.classList.toggle("on", state.portalReady);

    for (const chip of Array.from(this.chipsWrap.children) as HTMLDivElement[]) {
      chip.classList.toggle("active", chip.dataset.id === state.scrollId);
    }

    this.modeBtn.textContent = state.mode === "vertical" ? "↕ Vertical" : "↔ Columns";
    this.modeBtn.className = "on";

    // translation segmented control — only the translations this scroll has
    const trs = Object.keys(scroll.translations);
    this.trSeg.innerHTML = "";
    for (const tr of trs) {
      const b = document.createElement("button");
      b.textContent = tr;
      b.className = tr === state.translation ? "on" : "";
      b.disabled = trs.length < 2;
      b.addEventListener("click", () => this.handlers.onSelectTranslation(tr));
      this.trSeg.appendChild(b);
    }
  }
}

function span(cls: string) {
  const s = document.createElement("span");
  s.className = cls;
  return s;
}
