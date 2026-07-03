// The word-tap research ladder (VISION: revelation earned and incremental — a
// tap at a time, never a dump). DOM chrome over the Skia canvas: gloss → Strong's
// + transliteration → original script → meaning. Each tap descends one rung.
import type { OriginalWord } from "../model/types";

const STYLE = `
.reveal {
  position: fixed; z-index: 20; max-width: 320px; min-width: 200px;
  background: #fbf5e6; color: #2b2117;
  border: 1px solid #d8c79c; border-radius: 12px;
  box-shadow: 0 10px 34px rgba(40,28,12,.28);
  padding: 16px 18px 13px; font-family: "Cardo", Georgia, serif;
  transform-origin: top left; animation: revIn .16s ease-out;
  cursor: pointer; user-select: none;
}
@keyframes revIn { from { opacity: 0; transform: translateY(6px) scale(.98);} to {opacity:1;} }
.reveal .gloss { font-size: 26px; line-height: 1.1; }
.reveal .meta { font-size: 14px; color: #9a6b2f; letter-spacing: .04em; margin-top: 4px; }
.reveal .orig { font-size: 38px; margin-top: 10px; color: #1f1810; }
.reveal .orig small { font-size: 14px; color: #9a6b2f; letter-spacing: .1em; text-transform: uppercase; display:block; margin-bottom:-2px;}
.reveal .meaning { font-size: 16.5px; line-height: 1.5; margin-top: 11px; color: #3a2e20; }
.reveal .rung { margin-top: 12px; font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
  color: #b08a4e; display:flex; align-items:center; gap:8px; }
.reveal .rung .dots { display:flex; gap:5px; }
.reveal .rung .dot { width:6px; height:6px; border-radius:50%; background:#e0cfa3; }
.reveal .rung .dot.on { background:#9a6b2f; }
.reveal .hidden { display:none; }
`;

export class Reveal {
  private el: HTMLDivElement;
  private step = 0;
  private ow: OriginalWord | null = null;

  constructor() {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);
    this.el = document.createElement("div");
    this.el.className = "reveal hidden";
    this.el.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.advance();
    });
    document.body.appendChild(this.el);
  }

  get isOpen() {
    return !this.el.classList.contains("hidden");
  }

  open(ow: OriginalWord, screenX: number, screenY: number) {
    this.ow = ow;
    this.step = 0;
    this.render();
    this.el.classList.remove("hidden");
    // place near the word, flipping if it would run off-screen
    const r = this.el.getBoundingClientRect();
    let x = screenX;
    let y = screenY + 14;
    if (x + r.width > window.innerWidth - 12) x = window.innerWidth - r.width - 12;
    if (y + r.height > window.innerHeight - 12) y = screenY - r.height - 14;
    this.el.style.left = Math.max(12, x) + "px";
    this.el.style.top = Math.max(12, y) + "px";
  }

  close() {
    this.el.classList.add("hidden");
    this.ow = null;
  }

  private advance() {
    if (this.step < 3) {
      this.step++;
      this.render();
    } else {
      this.close();
    }
  }

  private render() {
    const ow = this.ow;
    if (!ow) return;
    const s = this.step;
    const scriptLabel = ow.script === "greek" ? "Greek" : "Hebrew";
    const dots = [0, 1, 2, 3].map((i) => `<span class="dot ${i <= s ? "on" : ""}"></span>`).join("");
    const rungText =
      s === 0 ? "tap to go deeper" : s === 1 ? "the word itself" : s === 2 ? "its meaning" : "tap to close";
    this.el.innerHTML = `
      <div class="gloss">${ow.gloss}</div>
      <div class="meta ${s >= 1 ? "" : "hidden"}">${ow.translit} · ${ow.strongs}</div>
      <div class="orig ${s >= 2 ? "" : "hidden"}"><small>${scriptLabel}</small>${ow.text}</div>
      <div class="meaning ${s >= 3 ? "" : "hidden"}">${ow.meaning}</div>
      <div class="rung"><span class="dots">${dots}</span>${rungText}</div>`;
  }
}
