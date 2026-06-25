// Connect-the-pairs matcher. Ported from the buildConnect half of
// assets/games.js. Click a left term, then its right match: a correct pair
// locks green and draws a green SVG line; a wrong pair flashes red for 850ms.
// The right column is shuffled once on mount; matched lines are recomputed on
// resize (the old version's window-resize redraw).
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { markComplete } from './progress';

export interface Pair {
  left: string;
  right: string;
}

interface Props {
  title?: string;
  hint?: string;
  pairs: Pair[];
  completeId?: string;
}

interface Ln {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cls: 'ok' | 'no';
}

function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export default function Connect({ title, hint, pairs, completeId }: Props) {
  const total = pairs.length;
  // right-column display order, fixed once for the lifetime of the island
  const [rightOrder] = useState(() => shuffle(pairs.map((_, i) => i)));

  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrong, setWrong] = useState<{ left: number; right: number } | null>(null);
  const [lines, setLines] = useState<Ln[]>([]);
  const [status, setStatus] = useState<{ text: string; cls: '' | 'ok' | 'no' }>({
    text: '',
    cls: '',
  });

  const wrapRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const rightRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  function edge(el: HTMLElement) {
    const w = wrapRef.current!.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    return {
      left: b.left - w.left,
      right: b.right - w.left,
      y: b.top - w.top + b.height / 2,
    };
  }

  function computeLines(): Ln[] {
    if (!wrapRef.current) return [];
    const out: Ln[] = [];
    const draw = (id: number, cls: 'ok' | 'no') => {
      const l = leftRefs.current[id];
      const r = rightRefs.current[id];
      if (!l || !r) return;
      const lc = edge(l);
      const rc = edge(r);
      out.push({ id, x1: lc.right, y1: lc.y, x2: rc.left, y2: rc.y, cls });
    };
    matched.forEach((id) => draw(id, 'ok'));
    if (wrong) draw(wrong.left, 'no');
    return out;
  }

  // redraw after every match/wrong change (DOM is laid out by now)
  useLayoutEffect(() => {
    setLines(computeLines());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched, wrong]);

  // redraw matched lines on resize, like the vanilla window-resize listener
  useEffect(() => {
    const onResize = () => setLines(computeLines());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched, wrong]);

  function clickLeft(id: number) {
    if (matched.includes(id)) return;
    setSelected(id);
  }

  function clickRight(id: number) {
    if (selected == null || matched.includes(id)) return;
    if (id === selected) {
      const nextMatched = [...matched, selected];
      setMatched(nextMatched);
      setSelected(null);
      if (nextMatched.length === total) {
        setStatus({
          text: "All connected. That's the whole map of how the worlds relate.",
          cls: 'ok',
        });
        markComplete(completeId);
      }
    } else {
      const bad = { left: selected, right: id };
      setWrong(bad);
      setSelected(null);
      setStatus({ text: 'Not a match — try again.', cls: 'no' });
      window.setTimeout(() => {
        setWrong(null);
        setStatus({ text: '', cls: '' });
      }, 850);
    }
  }

  return (
    <div class="game">
      {title && <div class="game-head">{title}</div>}
      <div class="game-body">
        {hint && <div class="game-hint">{hint}</div>}
        <div class="connect-wrap" ref={wrapRef}>
          <svg class="connect-svg">
            {lines.map((ln) => (
              <line
                x1={ln.x1}
                y1={ln.y1}
                x2={ln.x2}
                y2={ln.y2}
                stroke={ln.cls === 'ok' ? '#2f6b3f' : '#9a3b2f'}
                stroke-width="2.5"
              />
            ))}
          </svg>
          <div class="connect-cols">
            <div class="connect-col left">
              {pairs.map((p, i) => {
                let cls = 'connect-item';
                if (matched.includes(i)) cls += ' matched';
                else if (selected === i) cls += ' selected';
                if (wrong?.left === i) cls += ' wrong';
                return (
                  <button
                    type="button"
                    class={cls}
                    ref={(el) => (leftRefs.current[i] = el)}
                    onClick={() => clickLeft(i)}
                  >
                    {p.left}
                  </button>
                );
              })}
            </div>
            <div class="connect-col right">
              {rightOrder.map((i) => {
                let cls = 'connect-item';
                if (matched.includes(i)) cls += ' matched';
                if (wrong?.right === i) cls += ' wrong';
                return (
                  <button
                    type="button"
                    class={cls}
                    ref={(el) => (rightRefs.current[i] = el)}
                    onClick={() => clickRight(i)}
                  >
                    {pairs[i].right}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div class={'game-status ' + status.cls}>{status.text}</div>
      </div>
    </div>
  );
}
