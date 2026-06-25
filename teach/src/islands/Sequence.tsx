// Sequence puzzle. Ported from the buildSequence half of assets/games.js.
// `items` are given in the CORRECT order and shuffled for the chip pool; tap
// chips to fill slots 1..n; when full, each slot shows green/red.
//
// NOTE on the old "render-before-check" bug: in the vanilla version render()
// rebuilt the slot DOM and wiped the green/red classes check() had just set,
// so the fix was to call render() *before* check(). This declarative port is
// immune by construction: slot status is DERIVED from state (`placed` +
// `checked`) on every render, so there is no separate mutate-then-rebuild step
// to clobber. Do not reintroduce imperative class-setting here.
import { useState } from 'preact/hooks';
import { markComplete } from './progress';

interface Props {
  title?: string;
  hint?: string;
  /** items in CORRECT order; shuffled for the pool */
  items: string[];
  completeId?: string;
}

function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function Sequence({ title, hint, items, completeId }: Props) {
  const n = items.length;
  const [pool] = useState(() => shuffle(items.map((_, i) => i)));
  const [placed, setPlaced] = useState<number[]>([]);

  const full = placed.length === n;
  const allOk = full && placed.every((idx, slot) => idx === slot);

  function place(idx: number) {
    if (placed.length >= n || placed.includes(idx)) return;
    const next = [...placed, idx];
    setPlaced(next);
    if (next.length === n && next.every((v, s) => v === s)) {
      markComplete(completeId); // only the fully-correct order counts
    }
  }

  function reset() {
    setPlaced([]);
  }

  return (
    <div class="game">
      {title && <div class="game-head">{title}</div>}
      <div class="game-body">
        {hint && <div class="game-hint">{hint}</div>}

        <div class="seq-slots">
          {items.map((_, slot) => {
            let cls = 'seq-slot';
            if (full) cls += placed[slot] === slot ? ' ok' : ' no';
            const idx = placed[slot];
            return (
              <div class={cls}>
                <span class="num">{slot + 1}</span>
                {idx != null && <span class="filled">{items[idx]}</span>}
              </div>
            );
          })}
        </div>

        <div class="seq-pool">
          {pool.map((idx) => {
            const isPlaced = placed.includes(idx);
            return (
              <button
                type="button"
                class={'seq-chip' + (isPlaced ? ' placed' : '')}
                onClick={() => place(idx)}
                disabled={isPlaced}
              >
                {items[idx]}
              </button>
            );
          })}
        </div>

        <div class={'game-status ' + (full ? (allOk ? 'ok' : 'no') : '')}>
          {full
            ? allOk
              ? 'Correct order. Nicely done.'
              : 'Some are out of place — hit Reset and try again.'
            : ''}
        </div>

        <button type="button" class="game-reset" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
