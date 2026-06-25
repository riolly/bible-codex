// Right-margin "on this page" rail — a scroll-spy table of contents built from
// the current page's <h2>s. Reuses the dead vertical space beside the 46rem
// reading column. Doubles as a reading-progress indicator: the gilt track fills
// as you scroll, the current section is highlighted. Self-hides on short pages
// and (via CSS) on viewports too narrow to spare the margin.
import { useEffect, useState } from 'preact/hooks';

interface Heading {
  id: string;
  text: string;
  el: HTMLElement;
}

// Match the markdown slugger closely enough for headings authored in .astro
// pages (which, unlike markdown/MDX, get no auto id).
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

export default function Toc() {
  const [items, setItems] = useState<Heading[]>([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;

    const list: Heading[] = Array.from(main.querySelectorAll('h2')).map((el) => {
      const h = el as HTMLElement;
      if (!h.id) h.id = slugify(h.textContent ?? '');
      return { id: h.id, text: h.textContent ?? '', el: h };
    });
    // Not worth a rail for one or two sections.
    if (list.length < 3) return;
    setItems(list);

    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docH > 0 ? Math.min(1, window.scrollY / docH) : 0);

      // Active = last heading whose top has passed the read line.
      const readLine = 140;
      let idx = 0;
      for (let i = 0; i < list.length; i++) {
        if (list[i].el.getBoundingClientRect().top <= readLine) idx = i;
        else break;
      }
      setActive(idx);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  if (items.length === 0) return null;

  function jump(e: Event, id: string) {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
  }

  return (
    <nav class="toc" aria-label="On this page">
      <p class="toc-label">On this page</p>
      <ul class="toc-list" style={`--toc-progress:${progress}`}>
        {items.map((it, i) => (
          <li
            class={`toc-item${i === active ? ' active' : ''}${i < active ? ' past' : ''}`}
          >
            <a href={`#${it.id}`} onClick={(e) => jump(e, it.id)}>
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
