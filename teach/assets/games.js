/* ============================================================================
   bible-codex — teaching workspace interactive games
   Reusable across every lesson. No build step, no deps. Pairs with the
   .game / .connect / .seq styles in assets/styles.css.

   ── CONNECT (draw arrows between matching pairs) ────────────────────────────
     <div class="game" data-game="connect" data-title="Connect the pairs">
       <script type="application/json">
       {
         "hint": "Click a term on the left, then its match on the right.",
         "pairs": [
           { "left": "Read-only corpus", "right": "The Bible text, shipped" },
           { "left": "User layer",       "right": "Your marks, synced" }
         ]
       }
       </script>
     </div>

   ── SEQUENCE (tap chips into the correct order) ─────────────────────────────
     <div class="game" data-game="sequence" data-title="Put these in order">
       <script type="application/json">
       {
         "hint": "Tap the phases in build order, 1 → 4.",
         "items": ["Phase 1", "Phase 2", "Phase 3", "Phase 4"]
       }
       </script>
     </div>
     (items are listed in the CORRECT order; they are shuffled for display.)
   ============================================================================ */
(function () {
  "use strict";

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function readCfg(root) {
    var el = root.querySelector('script[type="application/json"]');
    if (!el) return null;
    var cfg;
    try { cfg = JSON.parse(el.textContent); } catch (e) { return null; }
    el.remove();
    return cfg;
  }

  function head(root, title) {
    if (!title) return;
    var h = document.createElement("div");
    h.className = "game-head";
    h.textContent = title;
    root.appendChild(h);
  }

  /* ---------------------------------------------------------------- CONNECT */
  function buildConnect(root, cfg) {
    head(root, root.dataset.title);
    var body = document.createElement("div");
    body.className = "game-body";
    root.appendChild(body);

    if (cfg.hint) {
      var hint = document.createElement("div");
      hint.className = "game-hint";
      hint.textContent = cfg.hint;
      body.appendChild(hint);
    }

    var wrap = document.createElement("div");
    wrap.className = "connect-wrap";
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "connect-svg");
    wrap.appendChild(svg);

    var cols = document.createElement("div");
    cols.className = "connect-cols";
    var colL = document.createElement("div"); colL.className = "connect-col left";
    var colR = document.createElement("div"); colR.className = "connect-col right";
    cols.appendChild(colL); cols.appendChild(colR);
    wrap.appendChild(cols);
    body.appendChild(wrap);

    var status = document.createElement("div");
    status.className = "game-status";
    body.appendChild(status);

    var leftBtns = {}, rightBtns = {};
    cfg.pairs.forEach(function (p, i) {
      var l = document.createElement("button");
      l.className = "connect-item"; l.type = "button";
      l.textContent = p.left; l.dataset.id = i;
      colL.appendChild(l); leftBtns[i] = l;
    });
    shuffle(cfg.pairs.map(function (_, i) { return i; })).forEach(function (i) {
      var r = document.createElement("button");
      r.className = "connect-item"; r.type = "button";
      r.textContent = cfg.pairs[i].right; r.dataset.id = i;
      colR.appendChild(r); rightBtns[i] = r;
    });

    var selected = null;       // left id currently selected
    var matched = [];          // [{id}] for redraw
    var total = cfg.pairs.length;

    function center(el) {
      var w = wrap.getBoundingClientRect(), b = el.getBoundingClientRect();
      return { x: b.left - w.left, y: b.top - w.top + b.height / 2,
               right: b.right - w.left };
    }
    function line(id, cls) {
      var lc = center(leftBtns[id]), rc = center(rightBtns[id]);
      var ln = document.createElementNS(svgNS, "line");
      ln.setAttribute("x1", lc.right); ln.setAttribute("y1", lc.y);
      ln.setAttribute("x2", rc.x);     ln.setAttribute("y2", rc.y);
      ln.setAttribute("stroke", cls === "ok" ? "#2f6b3f" : "#9a3b2f");
      ln.setAttribute("stroke-width", "2.5");
      ln.setAttribute("data-line", id);
      svg.appendChild(ln);
      return ln;
    }
    function redraw() {
      svg.innerHTML = "";
      matched.forEach(function (id) { line(id, "ok"); });
    }
    window.addEventListener("resize", redraw);

    function clearSel() {
      if (selected != null) leftBtns[selected].classList.remove("selected");
      selected = null;
    }

    Object.keys(leftBtns).forEach(function (id) {
      leftBtns[id].addEventListener("click", function () {
        if (leftBtns[id].classList.contains("matched")) return;
        clearSel();
        selected = +id;
        leftBtns[id].classList.add("selected");
      });
    });
    Object.keys(rightBtns).forEach(function (id) {
      rightBtns[id].addEventListener("click", function () {
        if (selected == null || rightBtns[id].classList.contains("matched")) return;
        var ok = +id === selected;
        if (ok) {
          leftBtns[selected].classList.remove("selected");
          leftBtns[selected].classList.add("matched");
          rightBtns[id].classList.add("matched");
          matched.push(selected);
          line(selected, "ok");
          selected = null;
          if (matched.length === total) {
            status.className = "game-status ok";
            status.textContent = "All connected. That's the whole map of how the worlds relate.";
          }
        } else {
          var bad = line(selected, "no");
          var lb = leftBtns[selected], rb = rightBtns[id];
          lb.classList.add("wrong"); rb.classList.add("wrong");
          status.className = "game-status no";
          status.textContent = "Not a match — try again.";
          setTimeout(function () {
            if (bad.parentNode) bad.parentNode.removeChild(bad);
            lb.classList.remove("wrong", "selected"); rb.classList.remove("wrong");
            status.className = "game-status"; status.textContent = "";
          }, 850);
          selected = null;
        }
      });
    });
  }

  /* --------------------------------------------------------------- SEQUENCE */
  function buildSequence(root, cfg) {
    head(root, root.dataset.title);
    var body = document.createElement("div");
    body.className = "game-body";
    root.appendChild(body);

    if (cfg.hint) {
      var hint = document.createElement("div");
      hint.className = "game-hint";
      hint.textContent = cfg.hint;
      body.appendChild(hint);
    }

    var slotsEl = document.createElement("div"); slotsEl.className = "seq-slots";
    var poolEl  = document.createElement("div"); poolEl.className = "seq-pool";
    var status  = document.createElement("div"); status.className = "game-status";
    var reset   = document.createElement("button");
    reset.className = "game-reset"; reset.type = "button"; reset.textContent = "Reset";
    body.appendChild(slotsEl); body.appendChild(poolEl);
    body.appendChild(status); body.appendChild(reset);

    var correct = cfg.items;          // in correct order
    var placed = [];                  // chip indices placed, in slot order

    function render() {
      // slots
      slotsEl.innerHTML = "";
      correct.forEach(function (_, i) {
        var slot = document.createElement("div"); slot.className = "seq-slot";
        var num = document.createElement("span"); num.className = "num"; num.textContent = i + 1;
        slot.appendChild(num);
        if (placed[i] != null) {
          var f = document.createElement("span"); f.className = "filled";
          f.textContent = correct[placed[i]];
          slot.appendChild(f);
        }
        slotsEl.appendChild(slot);
      });
      // pool
      poolEl.innerHTML = "";
      shuffledOrder.forEach(function (idx) {
        var chip = document.createElement("button");
        chip.className = "seq-chip" + (placed.indexOf(idx) > -1 ? " placed" : "");
        chip.type = "button"; chip.textContent = correct[idx];
        if (placed.indexOf(idx) === -1) {
          chip.addEventListener("click", function () {
            if (placed.length >= correct.length) return;
            placed.push(idx);
            render();
            if (placed.length === correct.length) check();
          });
        }
        poolEl.appendChild(chip);
      });
    }
    function check() {
      var allOk = true;
      [].forEach.call(slotsEl.children, function (slot, i) {
        var ok = placed[i] === i;       // chip idx equals slot idx => correct order
        slot.classList.add(ok ? "ok" : "no");
        if (!ok) allOk = false;
      });
      status.className = "game-status " + (allOk ? "ok" : "no");
      status.textContent = allOk
        ? "Correct order. Nicely done."
        : "Some are out of place — hit Reset and try again.";
    }
    reset.addEventListener("click", function () {
      placed = [];
      status.className = "game-status"; status.textContent = "";
      render();
    });

    var shuffledOrder = shuffle(correct.map(function (_, i) { return i; }));
    render();
  }

  /* ------------------------------------------------------------------- boot */
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".game").forEach(function (root) {
      var cfg = readCfg(root);
      if (!cfg) return;
      if (root.dataset.game === "connect") buildConnect(root, cfg);
      else if (root.dataset.game === "sequence") buildSequence(root, cfg);
    });
  });
})();
