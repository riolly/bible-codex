// Left-margin course tree — always visible (mirrors the right TOC). A vertical
// spine of module dots, each labelled "Module N · Title", that expands/collapses
// to reveal its lessons ("Lesson N — title"). The current module is open by
// default and the current lesson is marked. Reuses the same `completed` store +
// unlock semantics as the hub (Modules.tsx), so the two never disagree.
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { completed } from './progress';

interface RailLesson {
  id: string;
  order: number;
  title: string;
}
interface RailModule {
  num: number;
  title: string;
  href: string | null;
  checkId: string | null;
  unlockBy: string | null;
  lessons: RailLesson[];
}
interface Props {
  /** the course spine, built in Layout.astro from modules + the lesson collection */
  tree: RailModule[];
  /** the module this page belongs to (lesson frontmatter); omitted elsewhere */
  currentModule?: number;
  /** the lesson id this page is, to mark the active row */
  currentLesson?: string;
}

export default function CourseRail({ tree, currentModule, currentLesson }: Props) {
  // Same SSR-safe hydration guard the hub uses: first client paint matches the
  // server's empty-progress render, then we switch to live localStorage.
  const live = useStore(completed);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const doneIds = mounted ? live : [];

  // On non-lesson pages there's no module prop — fall back to the first unlocked,
  // not-yet-done module. (With empty progress that's the first module, so the
  // initial expanded state matches SSR and hydration stays clean.)
  const firstOpen =
    tree.find(
      (m) =>
        (!m.unlockBy || doneIds.includes(m.unlockBy)) &&
        !(m.checkId && doneIds.includes(m.checkId)),
    )?.num ?? tree[0]?.num ?? -1;
  const here = currentModule ?? firstOpen;

  // Start with the current module open. Toggling is in-memory (resets on nav,
  // which is what you want: landing on a lesson opens its module).
  const [open, setOpen] = useState<number[]>(() => [currentModule ?? firstOpen]);
  const toggle = (num: number) =>
    setOpen((cur) => (cur.includes(num) ? cur.filter((n) => n !== num) : [...cur, num]));

  return (
    <nav class="rail" aria-label="Course progress">
      <p class="rail-h">Course</p>
      <ol class="rail-mods">
        {tree.map((m) => {
          const unlocked = !m.unlockBy || doneIds.includes(m.unlockBy);
          const done = !!m.checkId && doneIds.includes(m.checkId);
          const isHere = m.num === here;
          const isOpen = open.includes(m.num);
          const state = done ? 'done' : !unlocked ? 'locked' : 'open';
          const hasLessons = m.lessons.length > 0;
          const dot = <span class="rail-dot">{done ? '✓' : m.num}</span>;
          const title = (
            <span class="rail-mtitle">
              Module {m.num} · {m.title}
            </span>
          );
          return (
            <li class={`rail-mod ${state}${isHere ? ' here' : ''}${isOpen ? ' open-now' : ''}`}>
              {hasLessons ? (
                <button
                  class="rail-mtoggle"
                  aria-expanded={isOpen}
                  onClick={() => toggle(m.num)}
                >
                  {dot}
                  {title}
                  <span class="rail-caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                </button>
              ) : (
                <span class="rail-mtoggle">
                  {dot}
                  {title}
                </span>
              )}
              {isOpen && hasLessons && (
                <ol class="rail-lessons">
                  {m.lessons.map((l) => (
                    <li class={`rail-lesson${l.id === currentLesson ? ' now' : ''}`}>
                      <a
                        href={`/lessons/${l.id}`}
                        aria-current={l.id === currentLesson ? 'page' : undefined}
                      >
                        Lesson {l.order} — {l.title}
                      </a>
                    </li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
