(function () {
  "use strict";

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function fmtTermAx(a) {
    if (a === 0) return "";
    if (a === 1) return "x";
    if (a === -1) return "-x";
    return `${a}x`;
  }

  function fmtLeft(a, b) {
    const ax = fmtTermAx(a);
    const hasX = a !== 0;
    const hasB = b !== 0;
    if (!hasX && !hasB) return "0";
    if (!hasX) return String(b);
    if (!hasB) return ax;
    if (b > 0) return `${ax} + ${b}`;
    return `${ax} - ${Math.abs(b)}`;
  }

  function fmtEquation(st) {
    return `${fmtLeft(st.a, st.b)} = ${st.c}`;
  }

  function makeEl(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, String(v));
    }
    for (const ch of children) el.appendChild(ch);
    return el;
  }

  function mount(root) {
    const style = makeEl("style", {
      html: `
      .bs {
        display:grid; gap:14px;
        grid-template-columns: 1fr 0.95fr;
      }
      .bs__card {
        border:1px solid rgba(29,26,22,.14);
        background: rgba(255,255,255,.70);
        border-radius: 18px;
        padding: 14px;
        box-shadow: 0 10px 24px rgba(29,26,22,.08);
      }
      .bs__title { font-family: var(--font-display); font-size: 22px; margin:0 0 6px; }
      .bs__hint { color: rgba(29,26,22,.72); font-size: 13px; margin:0; }
      .bs__row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top: 10px; }
      .bs__select, .bs__input {
        border:1px solid rgba(29,26,22,.18);
        background: rgba(251,246,236,.70);
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 14px;
      }
      .bs__select { min-width: 220px; }
      .bs__input { width: 120px; font-family: var(--mono); }
      .bs__btn {
        border:1px solid rgba(29,26,22,.16);
        background: rgba(255,255,255,.76);
        padding: 10px 12px;
        border-radius: 12px;
        font-size: 13px;
        cursor: pointer;
        transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
      }
      .bs__btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 22px rgba(29,26,22,.10);
        background: rgba(255,255,255,.92);
      }
      .bs__btn--accent {
        background: rgba(209,75,42,.12);
        border-color: rgba(209,75,42,.30);
      }
      .bs__btn--ghost { background: rgba(251,246,236,.55); }

      .bs__equation {
        margin-top: 10px;
        padding: 12px 12px;
        border-radius: 16px;
        border: 1px dashed rgba(29,26,22,.22);
        background: rgba(251,246,236,.78);
        font-family: var(--mono);
        font-size: 18px;
        letter-spacing: 0.2px;
      }
      .bs__equation[data-solved="true"] {
        border-style: solid;
        border-color: rgba(30,107,90,.35);
        box-shadow: 0 0 0 6px rgba(30,107,90,.12);
      }
      .bs__msg {
        margin-top: 10px;
        font-size: 13px;
        color: rgba(29,26,22,.78);
      }
      .bs__msg strong { color: var(--accent2); }

      .bs__viz {
        display:grid;
        grid-template-rows: auto 1fr;
        gap: 10px;
      }
      .bs__balance {
        border-radius: 18px;
        border: 1px solid rgba(29,26,22,.14);
        background:
          radial-gradient(120% 70% at 10% 0%, rgba(209,75,42,.14), transparent 55%),
          radial-gradient(120% 70% at 95% 60%, rgba(30,107,90,.12), transparent 60%),
          rgba(255,255,255,.70);
        box-shadow: 0 10px 24px rgba(29,26,22,.08);
        padding: 12px;
      }
      .bs__beam {
        height: 8px;
        border-radius: 999px;
        background: rgba(29,26,22,.16);
        position: relative;
        margin: 8px 0 12px;
      }
      .bs__beam::after {
        content:"";
        position:absolute;
        left: 50%;
        top: -10px;
        width: 8px;
        height: 28px;
        border-radius: 999px;
        background: rgba(29,26,22,.18);
        transform: translateX(-50%);
      }
      .bs__plates {
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .bs__plate {
        border-radius: 16px;
        border: 1px solid rgba(29,26,22,.12);
        background: rgba(251,246,236,.72);
        padding: 10px;
        min-height: 110px;
      }
      .bs__plateTitle { font-size: 12px; color: rgba(29,26,22,.65); margin-bottom: 8px; }
      .bs__tokens { display:flex; flex-wrap:wrap; gap:8px; }
      .bs__bag {
        width: 36px;
        height: 36px;
        border-radius: 12px 12px 14px 14px;
        background: rgba(29,26,22,.10);
        border: 1px solid rgba(29,26,22,.16);
        display:grid;
        place-items:center;
        font-family: var(--mono);
        font-weight: 700;
      }
      .bs__coin {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        border: 1px solid rgba(29,26,22,.18);
        background: rgba(255,255,255,.85);
        display:grid;
        place-items:center;
        font-family: var(--mono);
        font-size: 12px;
      }
      .bs__coin--neg {
        background: rgba(209,75,42,.12);
        border-color: rgba(209,75,42,.30);
      }
      .bs__history {
        border-radius: 18px;
        border: 1px solid rgba(29,26,22,.14);
        background: rgba(255,255,255,.70);
        box-shadow: 0 10px 24px rgba(29,26,22,.08);
        padding: 12px;
        max-height: 260px;
        overflow:auto;
      }
      .bs__historyTitle { font-size: 12px; color: rgba(29,26,22,.65); margin-bottom: 6px; }
      .bs__step { font-family: var(--mono); font-size: 13px; padding: 6px 8px; border-radius: 12px; background: rgba(251,246,236,.65); border: 1px solid rgba(29,26,22,.10); margin: 6px 0; }
      .bs__step small { font-family: var(--font-body); color: rgba(29,26,22,.66); }

      @media (max-width: 980px) {
        .bs { grid-template-columns: 1fr; }
      }
      `,
    });

    const puzzles = [
      { id: "L01-1", label: "x + 3 = 7（入门）", a: 1, b: 3, c: 7 },
      { id: "L02-1", label: "x - 4 = 6（加法还原）", a: 1, b: -4, c: 6 },
      { id: "L03-1", label: "4x = 20（平均分）", a: 4, b: 0, c: 20 },
      { id: "L04-1", label: "3x + 2 = 14（两步）", a: 3, b: 2, c: 14 },
      // 第 05 课：x 在两边（袋子先集中到一边）
      { id: "L05-1", label: "x + 3 = 2x + 1（先拿走 1 袋）", a: 1, b: 3, c: 0, extraRight: { a: 2, b: 1 } },
      { id: "L05-2", label: "3x + 1 = x + 9（先拿走 1 袋）", a: 3, b: 1, c: 0, extraRight: { a: 1, b: 9 } },
    ];

    const state = {
      mode: "single", // single | bothSides
      currentIndex: 0,
      st: { a: 1, b: 3, c: 7 },
      right: null, // for bothSides: {a,b}
      history: [],
      msg: "",
      ui: {
        // 记录“操作下拉框/输入框”的选择，避免每次 render() 都重置为默认值
        op: null,
        kText: "1",
      },
    };

    function loadPuzzle(idx) {
      state.currentIndex = idx;
      const p = puzzles[idx];
      if (p.extraRight) {
        state.mode = "bothSides";
        state.st = { a: p.a, b: p.b, c: p.c };
        state.right = { a: p.extraRight.a, b: p.extraRight.b };
      } else {
        state.mode = "single";
        state.st = { a: p.a, b: p.b, c: p.c };
        state.right = null;
      }
      state.history = [];
      state.msg =
        state.mode === "bothSides"
          ? "目标：先把袋子（x）集中到一边，再把 x 单独留下来；最后代回检验。"
          : "目标：把 x 单独留下来，然后代回检验。";

      // 换题/重置时，操作栏回到默认（但应用步骤/撤销/提示不应重置）
      state.ui.op = null;
      state.ui.kText = "1";
      render();
    }

    function fmtEquationBothSides() {
      const left = fmtLeft(state.st.a, state.st.b);
      const right = fmtLeft(state.right.a, state.right.b);
      return `${left} = ${right}`;
    }

    function isSolved() {
      if (state.mode === "single") return state.st.a === 1 && state.st.b === 0;
      // bothSides: 任意一边是 x，另一边是纯常数（0x + b）即可
      if (!state.right) return false;
      const L = state.st;
      const R = state.right;
      const leftSolved = L.a === 1 && L.b === 0 && R.a === 0;
      const rightSolved = R.a === 1 && R.b === 0 && L.a === 0;
      return leftSolved || rightSolved;
    }

    function currentXValueIfSolved() {
      if (!isSolved()) return null;
      if (state.mode === "single") return state.st.c;
      const L = state.st;
      const R = state.right;
      if (!R) return null;
      if (L.a === 1 && L.b === 0 && R.a === 0) return R.b;
      if (R.a === 1 && R.b === 0 && L.a === 0) return L.b;
      return null;
    }

    function applyOp(op, k) {
      const prev = {
        mode: state.mode,
        st: { ...state.st },
        right: state.right ? { ...state.right } : null,
      };

      if (state.mode === "single") {
        const a = state.st.a;
        const b = state.st.b;
        const c = state.st.c;
        if (op === "+") {
          state.st = { a, b: b + k, c: c + k };
        } else if (op === "-") {
          state.st = { a, b: b - k, c: c - k };
        } else if (op === "×") {
          state.st = { a: a * k, b: b * k, c: c * k };
        } else if (op === "÷") {
          if (k === 0) throw new Error("不能除以 0");
          if (a % k !== 0 || b % k !== 0 || c % k !== 0) {
            throw new Error("这一步会出现分数。建议先做加减，让它整除。");
          }
          state.st = { a: a / k, b: b / k, c: c / k };
        }
      } else {
        // bothSides: left is ax + b, right is a2x + b2
        const L = state.st;
        const R = state.right;
        if (!R) throw new Error("内部状态错误");
        if (op === "+x") {
          state.st = { ...L, a: L.a + k };
          state.right = { ...R, a: R.a + k };
        } else if (op === "-x") {
          const min = Math.min(L.a, R.a);
          if (k > min) throw new Error(`袋子不够减：最多只能两边同时减 ${min} 袋 x。`);
          state.st = { ...L, a: L.a - k };
          state.right = { ...R, a: R.a - k };
        } else if (op === "+") {
          state.st = { ...L, b: L.b + k };
          state.right = { ...R, b: R.b + k };
        } else if (op === "-") {
          state.st = { ...L, b: L.b - k };
          state.right = { ...R, b: R.b - k };
        } else if (op === "×") {
          state.st = { a: L.a * k, b: L.b * k, c: 0 };
          state.right = { a: R.a * k, b: R.b * k };
        } else if (op === "÷") {
          if (k === 0) throw new Error("不能除以 0");
          if (L.a % k !== 0 || L.b % k !== 0 || R.a % k !== 0 || R.b % k !== 0) {
            throw new Error("这一步会出现分数。建议先做加减或先消掉 x。");
          }
          state.st = { a: L.a / k, b: L.b / k, c: 0 };
          state.right = { a: R.a / k, b: R.b / k };
        }
      }

      state.history.unshift({
        op,
        k,
        prev,
        after: stateSnapshot(),
      });
    }

    function stateSnapshot() {
      return {
        mode: state.mode,
        st: { ...state.st },
        right: state.right ? { ...state.right } : null,
      };
    }

    function undo() {
      const step = state.history.shift();
      if (!step) return;
      state.mode = step.prev.mode;
      state.st = { ...step.prev.st };
      state.right = step.prev.right ? { ...step.prev.right } : null;
    }

    function suggestNext() {
      if (isSolved()) {
        const x = currentXValueIfSolved();
        state.msg = `已解出：x = ${x}。下一步：代回原方程检验 ✓`;
        return;
      }

      if (state.mode === "single") {
        const { a, b } = state.st;
        if (b !== 0) {
          const k = Math.abs(b);
          state.msg = b > 0 ? `提示：想消掉 “+${b}”，可以两边同时 -${k}。` : `提示：想消掉 “-${k}”，可以两边同时 +${k}。`;
          return;
        }
        if (a !== 1) {
          state.msg = `提示：想把 “${a}x” 变成 “x”，可以两边同时 ÷${a}。`;
          return;
        }
        state.msg = "提示：继续把 x 单独留下来。";
        return;
      }

      // bothSides
      const L = state.st;
      const R = state.right;
      if (!R) return;
      const bothHaveX = L.a !== 0 && R.a !== 0;
      if (bothHaveX) {
        const k = Math.min(L.a, R.a);
        state.msg = `提示：先“拿袋子”：两边同时减 ${k} 袋 x（也就是两边同时 -${k}x）。`;
        return;
      }

      // 只剩一边有 x：把常数从“有 x 的那边”拿走
      const xSide = L.a !== 0 ? L : R;
      const xIsLeft = xSide === L;
      if (xSide.b !== 0) {
        const k = Math.abs(xSide.b);
        const op = xSide.b > 0 ? "-" : "+";
        state.msg = `提示：把常数从${xIsLeft ? "左边" : "右边"}拿走：两边同时 ${op}${k}。`;
        return;
      }

      if (xSide.a !== 1) {
        state.msg = `提示：把 “${xSide.a}x” 变成 “x”：两边同时 ÷${xSide.a}。`;
        return;
      }

      state.msg = "提示：继续把 x 单独留下来。";
    }

    function renderVizTokens(container, a, b) {
      container.innerHTML = "";
      const tokens = makeEl("div", { class: "bs__tokens" });
      const bagCount = clamp(Math.abs(a), 0, 8);
      for (let i = 0; i < bagCount; i++) tokens.appendChild(makeEl("div", { class: "bs__bag", html: "x" }));

      if (b !== 0) {
        const count = clamp(Math.abs(b), 0, 12);
        const cls = b < 0 ? "bs__coin bs__coin--neg" : "bs__coin";
        for (let i = 0; i < count; i++) tokens.appendChild(makeEl("div", { class: cls, html: "1" }));
        if (Math.abs(b) > count) {
          tokens.appendChild(makeEl("div", { class: cls, html: `×${Math.abs(b)}` }));
        }
      }
      container.appendChild(tokens);
    }

    function render() {
      root.innerHTML = "";
      root.appendChild(style);

      const leftCard = makeEl("div", { class: "bs__card" });
      const rightCard = makeEl("div", { class: "bs__viz" });

      const title = makeEl("h3", { class: "bs__title", html: "选择一道题，按“等式不变”做步骤" });
      const hint = makeEl("p", {
        class: "bs__hint",
        html: '建议话术：每一步都让学生说清楚：<strong>“我对两边都做了什么？”</strong>',
      });

      const puzzleSel = makeEl("select", { class: "bs__select", "aria-label": "选择题目" });
      puzzles.forEach((p, i) => puzzleSel.appendChild(makeEl("option", { value: String(i), html: p.label })));
      puzzleSel.value = String(state.currentIndex);
      puzzleSel.addEventListener("change", () => loadPuzzle(Number(puzzleSel.value)));

      const eqText = makeEl("div", {
        class: "bs__equation",
        "data-solved": String(isSolved()),
        html: state.mode === "single" ? fmtEquation(state.st) : fmtEquationBothSides(),
      });

      const opSel = makeEl("select", { class: "bs__select", "aria-label": "选择操作" });
      const ops = state.mode === "bothSides" ? ["-x", "+x", "+", "-", "×", "÷"] : ["+", "-", "×", "÷"];
      for (const op of ops) {
        const label =
          op === "-x"
            ? "两边同时 -（  ）袋 x"
            : op === "+x"
              ? "两边同时 +（  ）袋 x"
              : `两边同时 ${op}`;
        opSel.appendChild(makeEl("option", { value: op, html: label }));
      }
      // 恢复上一次选择；若当前模式不支持该操作，则回退到第一个可用操作
      if (!state.ui.op || !ops.includes(state.ui.op)) state.ui.op = ops[0];
      opSel.value = state.ui.op;
      opSel.addEventListener("change", () => {
        state.ui.op = opSel.value;
      });

      const valInput = makeEl("input", {
        class: "bs__input",
        inputmode: "numeric",
        value: state.ui.kText ?? "1",
        placeholder: "数字/袋子数",
        "aria-label": "操作数",
      });
      valInput.addEventListener("input", () => {
        state.ui.kText = valInput.value;
      });

      const applyBtn = makeEl("button", {
        class: "bs__btn bs__btn--accent",
        html: "应用这一步",
        onclick: () => {
          const op = opSel.value;
          const kText = valInput.value;
          // 先落盘 UI 状态：即使本次输入不合法，render 后也保持用户刚刚的选择/输入
          state.ui.op = op;
          state.ui.kText = kText;

          const k = Number(kText);
          if (!Number.isFinite(k)) {
            state.msg = "请输入数字。";
            render();
            return;
          }
          if (!Number.isInteger(k)) {
            state.msg = "请输入整数（不写小数/分数）。";
            render();
            return;
          }
          if (k < 0) {
            state.msg = "本互动器默认用正数操作（减法请用“−”操作）。";
            render();
            return;
          }
          try {
            applyOp(op, k);
            state.msg = isSolved()
              ? `已解出：x = ${currentXValueIfSolved()}。下一步：代回检验 ✓`
              : "做得好：你对两边做了同一件事，等号保持不变。";
          } catch (e) {
            state.msg = String(e?.message || e);
          }
          render();
        },
      });

      const undoBtn = makeEl("button", { class: "bs__btn bs__btn--ghost", html: "撤销一步", onclick: () => (undo(), render()) });
      const resetBtn = makeEl("button", { class: "bs__btn bs__btn--ghost", html: "重置", onclick: () => loadPuzzle(state.currentIndex) });
      const hintBtn = makeEl("button", { class: "bs__btn", html: "给我提示", onclick: () => (suggestNext(), render()) });

      const msg = makeEl("div", { class: "bs__msg", html: state.msg });

      leftCard.appendChild(title);
      leftCard.appendChild(hint);
      leftCard.appendChild(makeEl("div", { class: "bs__row" }, [puzzleSel]));
      leftCard.appendChild(eqText);
      leftCard.appendChild(makeEl("div", { class: "bs__row" }, [opSel, valInput, applyBtn, undoBtn, resetBtn, hintBtn]));
      leftCard.appendChild(msg);

      const balance = makeEl("div", { class: "bs__balance" });
      const balanceTitle = makeEl("div", { class: "bs__plateTitle", html: "天平图（帮助理解等号：左右一样多）" });
      const beam = makeEl("div", { class: "bs__beam" });
      const plates = makeEl("div", { class: "bs__plates" });
      const leftPlate = makeEl("div", { class: "bs__plate" });
      const rightPlate = makeEl("div", { class: "bs__plate" });

      leftPlate.appendChild(makeEl("div", { class: "bs__plateTitle", html: "左边" }));
      rightPlate.appendChild(makeEl("div", { class: "bs__plateTitle", html: "右边" }));

      if (state.mode === "single") {
        renderVizTokens(leftPlate, state.st.a, state.st.b);
        const rightTokens = makeEl("div", { class: "bs__tokens" });
        const cCount = clamp(Math.abs(state.st.c), 0, 12);
        for (let i = 0; i < cCount; i++) rightTokens.appendChild(makeEl("div", { class: "bs__coin", html: "1" }));
        if (Math.abs(state.st.c) > cCount) rightTokens.appendChild(makeEl("div", { class: "bs__coin", html: `×${Math.abs(state.st.c)}` }));
        rightPlate.appendChild(rightTokens);
      } else {
        renderVizTokens(leftPlate, state.st.a, state.st.b);
        renderVizTokens(rightPlate, state.right.a, state.right.b);
      }

      plates.appendChild(leftPlate);
      plates.appendChild(rightPlate);
      balance.appendChild(balanceTitle);
      balance.appendChild(beam);
      balance.appendChild(plates);

      const history = makeEl("div", { class: "bs__history" });
      history.appendChild(makeEl("div", { class: "bs__historyTitle", html: "步骤记录（每一步都必须对两边做同一件事）" }));
      if (state.history.length === 0) {
        history.appendChild(makeEl("div", { class: "bs__step", html: '<small>还没有步骤。先选一个操作，然后点击“应用这一步”。</small>' }));
      } else {
        state.history.forEach((h, idx) => {
          const beforeEq = h.prev.mode === "single" ? fmtEquation(h.prev.st) : fmtLeft(h.prev.st.a, h.prev.st.b) + " = " + fmtLeft(h.prev.right.a, h.prev.right.b);
          const afterEq = h.after.mode === "single" ? fmtEquation(h.after.st) : fmtLeft(h.after.st.a, h.after.st.b) + " = " + fmtLeft(h.after.right.a, h.after.right.b);
          const opText = h.op === "-x" ? `- ${h.k} 袋 x` : h.op === "+x" ? `+ ${h.k} 袋 x` : `${h.op} ${h.k}`;
          history.appendChild(
            makeEl("div", {
              class: "bs__step",
              html:
                `<div><strong>第 ${idx + 1} 步：</strong> 两边同时 ${opText}</div>` +
                `<div style="margin-top:6px"><small>${beforeEq}  →  ${afterEq}</small></div>`,
            }),
          );
        });
      }

      rightCard.appendChild(balance);
      rightCard.appendChild(history);

      const grid = makeEl("div", { class: "bs" }, [leftCard, rightCard]);
      root.appendChild(grid);
    }

    // Init
    loadPuzzle(0);
  }

  window.BalanceSolver = { mount };
})();
