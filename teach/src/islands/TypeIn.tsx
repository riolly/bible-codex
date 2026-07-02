// Typed-answer quiz — the learner *produces* the term instead of recognising
// it among options (harder retrieval than MCQ; use for vocabulary that must
// come to mind unprompted). Matching is forgiving: case, punctuation, extra
// whitespace and hyphens are ignored, and several phrasings can be accepted.
// A wrong try does NOT lock the question — type again, or reveal the answer.
// A question resolves on a correct answer or a reveal; when every question is
// resolved the island reports itself complete (same contract as Quiz.tsx).
import { useState } from 'preact/hooks';
import { markComplete } from './progress';

export interface TypedQuestion {
  stem: string;
  /** accepted answers (any phrasing); the first is shown as THE answer */
  accept: string[];
  explain?: string;
}

interface Props {
  title?: string;
  questions: TypedQuestion[];
  completeId?: string;
}

/** lowercase, strip punctuation, collapse spaces/hyphens — typo-tolerant it is not */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s-]+/g, ' ')
    .trim();
}

interface QState {
  value: string;
  /** at least one wrong try — unlocks the Reveal escape hatch */
  missed: boolean;
  solved: boolean;
  revealed: boolean;
}

export default function TypeIn({ title, questions, completeId }: Props) {
  const [state, setState] = useState<QState[]>(() =>
    questions.map(() => ({ value: '', missed: false, solved: false, revealed: false })),
  );

  function update(qi: number, patch: Partial<QState>) {
    const next = state.slice();
    next[qi] = { ...next[qi], ...patch };
    setState(next);
    if (next.every((q) => q.solved || q.revealed)) markComplete(completeId);
  }

  function check(qi: number) {
    const q = state[qi];
    if (q.solved || q.revealed || !q.value.trim()) return;
    const ok = questions[qi].accept.some((a) => norm(a) === norm(q.value));
    update(qi, ok ? { solved: true } : { missed: true });
  }

  return (
    <div class="quiz typein">
      {title && <div class="quiz-head">{title}</div>}
      {questions.map((q, qi) => {
        const s = state[qi];
        const resolved = s.solved || s.revealed;
        return (
          <div class="quiz-q">
            <div class="stem">{q.stem}</div>
            <form
              class="typein-row"
              onSubmit={(e) => {
                e.preventDefault();
                check(qi);
              }}
            >
              <input
                type="text"
                value={s.value}
                placeholder="Type your answer…"
                disabled={resolved}
                onInput={(e) => update(qi, { value: (e.target as HTMLInputElement).value })}
              />
              <button type="submit" class="typein-btn" disabled={resolved}>
                Check
              </button>
              {s.missed && !resolved && (
                <button type="button" class="typein-btn ghost" onClick={() => update(qi, { revealed: true })}>
                  Show answer
                </button>
              )}
            </form>
            {s.solved && (
              <div class="quiz-feedback show ok">{'Correct. ' + (q.explain || '')}</div>
            )}
            {s.revealed && (
              <div class="quiz-feedback show no">
                {`The answer: “${q.accept[0]}”. ` + (q.explain || '')}
              </div>
            )}
            {s.missed && !resolved && (
              <div class="quiz-feedback show no">Not quite — try again, or show the answer.</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
