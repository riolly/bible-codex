// MCQ with immediate per-question feedback. Ported from assets/quiz.js:
// answering locks that question, reveals the correct option + explanation.
// When every question has been answered the quiz reports itself complete.
import { useState } from 'preact/hooks';
import { markComplete } from './progress';

export interface Question {
  stem: string;
  options: string[];
  answer: number;
  explain?: string;
}

interface Props {
  title?: string;
  questions: Question[];
  /** id marked complete once every question is answered */
  completeId?: string;
}

export default function Quiz({ title, questions, completeId }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    questions.map(() => null),
  );

  function choose(qi: number, oi: number) {
    if (answers[qi] != null) return; // immediate lock, like the vanilla version
    const next = answers.slice();
    next[qi] = oi;
    setAnswers(next);
    if (next.every((a) => a != null)) markComplete(completeId);
  }

  return (
    <div class="quiz">
      {title && <div class="quiz-head">{title}</div>}
      {questions.map((q, qi) => {
        const chosen = answers[qi];
        const answered = chosen != null;
        const correct = answered && chosen === q.answer;
        return (
          <div class="quiz-q">
            <div class="stem">{q.stem}</div>
            {q.options.map((opt, oi) => {
              let cls = 'quiz-opt';
              if (answered && oi === q.answer) cls += ' correct';
              else if (answered && oi === chosen) cls += ' wrong';
              return (
                <button
                  type="button"
                  class={cls}
                  disabled={answered}
                  onClick={() => choose(qi, oi)}
                >
                  {opt}
                </button>
              );
            })}
            {answered && (
              <div class={'quiz-feedback show ' + (correct ? 'ok' : 'no')}>
                {(correct ? 'Correct. ' : 'Not quite. ') + (q.explain || '')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
