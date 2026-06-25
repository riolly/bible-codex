// Free-recall flip card — the strongest retrieval practice. Ported from the
// wireRecall half of assets/quiz.js. Prompt + a hidden model answer revealed
// on click. Plain-text props keep it trivially serializable from MDX.
import { useState } from 'preact/hooks';

interface Props {
  prompt: string;
  answer: string;
}

export default function Recall({ prompt, answer }: Props) {
  const [shown, setShown] = useState(false);
  return (
    <div class="recall">
      <div class="prompt">{prompt}</div>
      <button type="button" class="flip" onClick={() => setShown(!shown)}>
        {shown ? 'Hide' : 'Reveal'}
      </button>
      <div class={'answer' + (shown ? ' show' : '')}>{answer}</div>
    </div>
  );
}
