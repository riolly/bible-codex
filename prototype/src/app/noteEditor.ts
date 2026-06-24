// DOM editor for a Markup Note. Opens a small parchment textarea near the tapped
// word; on commit it hands the text back to main, which stores a Note anchored to
// that word (the engine then renders + reflows it as a margin card). Empty text
// commits as a delete. Enter commits, Shift+Enter = newline, Esc cancels, blur
// commits. DOM-only — the rendered note itself lives on the Skia canvas.

const STYLE = `
.noteEd { position: fixed; z-index: 22; width: 232px;
  background:#fbf5e6; border:1px solid #d8c79c; border-radius:12px;
  box-shadow:0 12px 34px rgba(40,28,12,.3); padding:10px; font-family:"Cardo", Georgia, serif;
  transform-origin: top left; animation: edIn .14s ease-out; }
@keyframes edIn { from { opacity:0; transform:translateY(5px);} to {opacity:1;} }
.noteEd textarea { width:100%; box-sizing:border-box; border:none; outline:none; resize:none;
  background:transparent; color:#2b2117; font-family:inherit; font-size:16.5px; line-height:1.45;
  font-style:italic; min-height:54px; }
.noteEd textarea::placeholder { color:#b9a677; font-style:italic; }
.noteEd .hint { font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:#b08a4e;
  margin-top:4px; text-align:right; }
.noteEd.hidden { display:none; }
`;

export class NoteEditor {
  private el: HTMLDivElement;
  private ta: HTMLTextAreaElement;
  private onCommit: ((text: string) => void) | null = null;
  private committing = false;

  constructor() {
    const style = document.createElement("style");
    style.textContent = STYLE;
    document.head.appendChild(style);

    this.el = document.createElement("div");
    this.el.className = "noteEd hidden";
    this.ta = document.createElement("textarea");
    this.ta.placeholder = "write a note…";
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "enter to save · esc to cancel";
    this.el.append(this.ta, hint);
    document.body.appendChild(this.el);

    this.ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.cancel();
      }
    });
    this.ta.addEventListener("blur", () => this.commit());
    // keep canvas/global handlers from stealing the gesture
    this.el.addEventListener("pointerdown", (e) => e.stopPropagation());
  }

  get isOpen() {
    return !this.el.classList.contains("hidden");
  }

  open(screenX: number, screenY: number, text: string, onCommit: (text: string) => void) {
    this.onCommit = onCommit;
    this.committing = false;
    this.ta.value = text;
    this.el.classList.remove("hidden");

    // place near the tap, flipping to stay on-screen
    const r = this.el.getBoundingClientRect();
    let x = screenX;
    let y = screenY + 12;
    if (x + r.width > window.innerWidth - 12) x = window.innerWidth - r.width - 12;
    if (y + r.height > window.innerHeight - 70) y = screenY - r.height - 12;
    this.el.style.left = Math.max(12, x) + "px";
    this.el.style.top = Math.max(12, y) + "px";

    this.ta.focus();
    this.ta.setSelectionRange(text.length, text.length);
  }

  private commit() {
    if (this.committing || !this.isOpen) return;
    this.committing = true;
    const cb = this.onCommit;
    const val = this.ta.value.trim();
    this.hide();
    cb?.(val);
  }

  private cancel() {
    this.committing = true; // suppress the blur-triggered commit
    this.hide();
  }

  close() {
    this.committing = true;
    this.hide();
  }

  private hide() {
    this.el.classList.add("hidden");
    this.ta.blur();
    this.onCommit = null;
  }
}
