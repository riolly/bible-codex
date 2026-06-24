/* ============================================================================
   bible-codex — teaching workspace quiz + retrieval widgets
   Reusable across every lesson. No build step, no deps.

   USAGE — multiple choice with immediate feedback:
     <div class="quiz" data-title="Lesson 1 — recall">
       <script type="application/json">
       {
         "questions": [
           { "stem": "…?",
             "options": ["A", "B", "C", "D"],
             "answer": 2,
             "explain": "why C is right (shown after answering)" }
         ]
       }
       </script>
     </div>

   USAGE — free-recall flip card (retrieval practice, the strongest kind):
     <div class="recall">
       <div class="prompt">Say it from memory: …</div>
       <button class="flip">Reveal</button>
       <div class="answer">the model answer…</div>
     </div>
   ============================================================================ */
(function () {
  "use strict";

  function buildQuiz(root) {
    var cfgEl = root.querySelector('script[type="application/json"]');
    if (!cfgEl) return;
    var cfg;
    try { cfg = JSON.parse(cfgEl.textContent); } catch (e) { return; }
    cfgEl.remove();

    if (root.dataset.title) {
      var head = document.createElement("div");
      head.className = "quiz-head";
      head.textContent = root.dataset.title;
      root.appendChild(head);
    }

    (cfg.questions || []).forEach(function (q) {
      var qEl = document.createElement("div");
      qEl.className = "quiz-q";

      var stem = document.createElement("div");
      stem.className = "stem";
      stem.textContent = q.stem;
      qEl.appendChild(stem);

      var feedback = document.createElement("div");
      feedback.className = "quiz-feedback";

      var answered = false;
      var buttons = [];

      q.options.forEach(function (optText, i) {
        var btn = document.createElement("button");
        btn.className = "quiz-opt";
        btn.type = "button";
        btn.textContent = optText;
        btn.addEventListener("click", function () {
          if (answered) return;
          answered = true;
          var correct = i === q.answer;
          buttons.forEach(function (b, j) {
            b.disabled = true;
            if (j === q.answer) b.classList.add("correct");
          });
          if (!correct) btn.classList.add("wrong");
          feedback.className = "quiz-feedback show " + (correct ? "ok" : "no");
          feedback.textContent =
            (correct ? "Correct. " : "Not quite. ") + (q.explain || "");
        });
        buttons.push(btn);
        qEl.appendChild(btn);
      });

      qEl.appendChild(feedback);
      root.appendChild(qEl);
    });
  }

  function wireRecall(card) {
    var btn = card.querySelector("button.flip");
    var ans = card.querySelector(".answer");
    if (!btn || !ans) return;
    btn.addEventListener("click", function () {
      var shown = ans.classList.toggle("show");
      btn.textContent = shown ? "Hide" : "Reveal";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".quiz").forEach(buildQuiz);
    document.querySelectorAll(".recall").forEach(wireRecall);
  });
})();
