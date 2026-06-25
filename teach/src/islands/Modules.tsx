// The course hub, reactive. Server-rendered with an empty progress set (so the
// cards are real HTML), then hydrated: as the learner finishes a module's
// check, the next module unlocks and a "Start …" CTA appears — persisted in
// localStorage across reloads. Every card is a single link (fixes the old
// "card isn't clickable" bug).
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { completed } from './progress';
import type { ModuleDef } from '../data/modules';

interface Props {
  modules: ModuleDef[];
}

interface Status {
  unlocked: boolean;
  done: boolean;
  label: string;
  cls: string;
  current: boolean;
}

function statusFor(m: ModuleDef, doneIds: string[], currentNum: number): Status {
  const unlocked = !m.unlockBy || doneIds.includes(m.unlockBy);
  const done = !!m.checkId && doneIds.includes(m.checkId);
  const current = unlocked && !done && m.num === currentNum;
  let label: string;
  let cls: string;
  if (done) {
    label = 'Done';
    cls = 'done';
  } else if (!unlocked) {
    label = m.lockedBadge ?? 'Upcoming';
    cls = '';
  } else if (!m.href) {
    // unlocked in sequence, but its lessons aren't authored yet
    label = 'Coming soon';
    cls = current ? 'next' : '';
  } else {
    label = 'Ready';
    cls = current ? 'next' : 'ready';
  }
  return { unlocked, done, label, cls, current };
}

function Card({ m, s }: { m: ModuleDef; s: Status }) {
  const clickable = s.unlocked && !!m.href;
  const inner = (
    <>
      <h3>
        Module {m.num} · {m.title} <span class={'badge ' + s.cls}>{s.label}</span>
      </h3>
      {m.blurb && <p class="pair">{m.blurb}</p>}
      {(m.pairBible || m.pairApp) && (
        <p class="pair">
          {m.pairBible && (
            <>
              <b>Bible:</b> {m.pairBible}
              <br />
            </>
          )}
          {m.pairApp && (
            <>
              <b>App:</b> {m.pairApp}
            </>
          )}
        </p>
      )}
      {m.lessonHints && (
        <p class="links">
          {m.lessonHints} <span class="arrow">→</span>
        </p>
      )}
    </>
  );

  if (clickable) {
    return (
      <a class={'module' + (s.current ? ' current' : '')} href={m.href}>
        {inner}
      </a>
    );
  }
  return <div class={'module' + (s.unlocked ? '' : ' locked')}>{inner}</div>;
}

export default function Modules({ modules }: Props) {
  // The page is server-rendered with no progress (no localStorage on the
  // server). Render that same empty state on the first client paint so
  // hydration matches the SSR'd DOM, then switch to the live, persisted
  // progress after mount — otherwise Preact errors on the <a> vs <div>
  // structural diff between server and client.
  const live = useStore(completed);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const doneIds = mounted ? live : [];
  // current = first unlocked, not-yet-done module
  const currentNum =
    modules.find(
      (m) =>
        (!m.unlockBy || doneIds.includes(m.unlockBy)) &&
        !(m.checkId && doneIds.includes(m.checkId)),
    )?.num ?? -1;

  // CTA points at the first newly-unlocked module beyond the overview
  const cta = modules.find(
    (m) =>
      m.num > 0 &&
      !!m.href &&
      (!m.unlockBy || doneIds.includes(m.unlockBy)) &&
      !(m.checkId && doneIds.includes(m.checkId)),
  );

  // the terminal module's check doubles as the course-completion signal
  const courseComplete = doneIds.includes('check-advanced');

  return (
    <>
      <div class="modules">
        {modules.map((m) => (
          <Card m={m} s={statusFor(m, doneIds, currentNum)} />
        ))}
      </div>
      {courseComplete ? (
        <a class="next-cta complete" href="/reference/architecture-map">
          <span class="label">Course complete — all five modules done</span>
          <span class="title">You've walked the whole blueprint · revisit the map →</span>
        </a>
      ) : (
        cta && (
          <a class="next-cta" href={cta.href}>
            <span class="label">Next session — unlocked</span>
            <span class="title">Start {cta.title} →</span>
          </a>
        )
      )}
    </>
  );
}
