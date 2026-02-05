(function () {
  "use strict";

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
      .sq {
        display:grid;
        grid-template-columns: 0.95fr 1.05fr;
        gap: 14px;
        align-items: start;
      }
      .sq__card {
        border:1px solid rgba(29,26,22,.14);
        background: rgba(255,255,255,.70);
        border-radius: 18px;
        padding: 14px;
        box-shadow: 0 10px 24px rgba(29,26,22,.08);
      }
      .sq__title { font-family: var(--font-display); font-size: 22px; margin:0 0 8px; }
      .sq__hint { margin:0; color: rgba(29,26,22,.74); font-size: 13px; }
      .sq__row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top: 12px; }
      .sq__label { font-size: 12px; color: rgba(29,26,22,.68); min-width: 90px; }
      .sq__pill {
        font-family: var(--mono);
        font-size: 13px;
        padding: 7px 10px;
        border-radius: 999px;
        border: 1px solid rgba(29,26,22,.14);
        background: rgba(251,246,236,.72);
      }
      .sq__slider { width: 280px; }
      .sq__btn {
        border:1px solid rgba(29,26,22,.16);
        background: rgba(255,255,255,.76);
        padding: 10px 12px;
        border-radius: 12px;
        font-size: 13px;
        cursor: pointer;
        transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
      }
      .sq__btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 22px rgba(29,26,22,.10);
        background: rgba(255,255,255,.92);
      }
      .sq__input {
        border:1px solid rgba(29,26,22,.18);
        background: rgba(251,246,236,.70);
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 14px;
        width: 120px;
        font-family: var(--mono);
      }
      .sq__msg { margin-top: 10px; font-size: 13px; color: rgba(29,26,22,.78); }
      .sq__msg .ok { color: var(--accent2); font-weight: 700; }

      .sq__nl {
        margin-top: 14px;
        padding: 12px;
        border-radius: 16px;
        border: 1px solid rgba(29,26,22,.14);
        background: rgba(251,246,236,.72);
      }
      .sq__nlHead {
        display:flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
      }
      .sq__nlTitle { font-size: 12px; color: rgba(29,26,22,.72); }
      .sq__nlHint { font-size: 12px; color: rgba(29,26,22,.58); }
      .sq__nlTrack {
        position: relative;
        margin-top: 10px;
        padding-top: 18px;
      }
      .sq__nlLine {
        position:absolute;
        left: 0;
        right: 0;
        top: 26px;
        height: 2px;
        border-radius: 999px;
        background: rgba(29,26,22,.22);
      }
      .sq__nlTicks {
        display:flex;
        justify-content: space-between;
        gap: 6px;
        position: relative;
        z-index: 1;
      }
      .sq__nlTick {
        appearance: none;
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0;
        width: 26px;
        color: rgba(29,26,22,.72);
        font-family: var(--mono);
        font-size: 12px;
      }
      .sq__nlTick::before {
        content:"";
        display:block;
        width: 2px;
        height: 10px;
        border-radius: 3px;
        background: rgba(29,26,22,.26);
        margin: 0 auto 6px;
      }
      .sq__nlTick:hover { color: rgba(29,26,22,.92); }
      .sq__nlTick:hover::before { background: rgba(29,26,22,.38); }
      .sq__nlMarker {
        position:absolute;
        top: 0;
        transform: translateX(-50%);
        display: grid;
        justify-items: center;
        gap: 6px;
        pointer-events: none;
        z-index: 2;
      }
      .sq__nlBadge {
        font-family: var(--mono);
        font-size: 12px;
        padding: 5px 8px;
        border-radius: 999px;
        border: 1px solid rgba(30,107,90,.28);
        background: rgba(30,107,90,.12);
        color: rgba(29,26,22,.88);
      }
      .sq__nlDot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--accent2);
        box-shadow: 0 0 0 6px rgba(30,107,90,.12);
        margin-top: 6px;
      }

      .sq__canvasWrap {
        border:1px solid rgba(29,26,22,.14);
        border-radius: 18px;
        overflow:hidden;
        background: rgba(255,255,255,.65);
        box-shadow: 0 10px 24px rgba(29,26,22,.08);
        padding: 12px;
      }
      .sq__grid {
        /* 聚焦 0..10 的“坐标板”：有清晰原点/数轴，但不过度密集。 */
        --cell: 24px;
        --m: 44px;
        width: 100%;
        aspect-ratio: 1 / 1;
        background-image:
          /* 四周“尺子区”留白：不要让格子跑到边框处，看起来更干净。 */
          linear-gradient(to top, rgba(251,246,236,.92) var(--m), transparent var(--m)),
          linear-gradient(to right, rgba(251,246,236,.92) var(--m), transparent var(--m)),
          linear-gradient(to bottom, rgba(251,246,236,.92) var(--m), transparent var(--m)),
          linear-gradient(to left, rgba(251,246,236,.92) var(--m), transparent var(--m)),
          /* 1 格 = 1：淡网格；每 5 格加深一点，方便数数。 */
          linear-gradient(to right, rgba(29,26,22,.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(29,26,22,.03) 1px, transparent 1px),
          linear-gradient(to right, rgba(29,26,22,.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(29,26,22,.06) 1px, transparent 1px);
        background-size:
          auto,
          auto,
          auto,
          auto,
          var(--cell) var(--cell),
          var(--cell) var(--cell),
          calc(var(--cell) * 5) calc(var(--cell) * 5),
          calc(var(--cell) * 5) calc(var(--cell) * 5);
        /* 让网格“从原点出发”，刻度/格子对齐。原点在左下：(+x 向右, +y 向上) */
        background-position:
          0 0,
          0 0,
          0 0,
          0 0,
          var(--m) calc(100% - var(--m)),
          var(--m) calc(100% - var(--m)),
          var(--m) calc(100% - var(--m)),
          var(--m) calc(100% - var(--m));
        border-radius: 14px;
        position: relative;
        overflow: hidden;
      }
      .sq__axes {
        position:absolute;
        inset: 0;
        pointer-events:none;
      }
      .sq__axisX {
        position:absolute;
        left: var(--m);
        right: var(--m);
        bottom: var(--m);
        height: 2px;
        border-radius: 999px;
        background: rgba(29,26,22,.32);
      }
      .sq__axisY {
        position:absolute;
        top: var(--m);
        bottom: var(--m);
        left: var(--m);
        width: 2px;
        border-radius: 999px;
        background: rgba(29,26,22,.32);
      }
      .sq__axisLabel {
        position:absolute;
        font-family: var(--mono);
        font-size: 12px;
        color: rgba(29,26,22,.72);
        background: rgba(251,246,236,.72);
        border: 1px solid rgba(29,26,22,.12);
        border-radius: 10px;
        padding: 3px 6px;
      }
      .sq__axisLabel--x { right: var(--m); bottom: var(--m); transform: translate(50%, 50%); }
      .sq__axisLabel--y { left: var(--m); top: var(--m); transform: translate(-50%, -50%); }
      .sq__ticksX { position:absolute; inset: 0; }
      .sq__ticksY { position:absolute; inset: 0; }
      .sq__tickX {
        position:absolute;
        top: calc(100% - var(--m));
        width: 1px;
        background: rgba(29,26,22,.28);
        transform: translateX(-50%);
      }
      .sq__tickX--major { height: 10px; }
      .sq__tickX--minor { height: 6px; }
      .sq__tickXLabel {
        position:absolute;
        /* 贴近 x 轴，让孩子更容易把“刻度”和“轴”对应起来。 */
        bottom: calc(var(--m) - 22px);
        transform: translateX(-50%);
        font-family: var(--mono);
        font-size: 11px;
        color: rgba(29,26,22,.74);
      }
      .sq__tickY {
        position:absolute;
        left: calc(var(--m) - 10px);
        height: 1px;
        background: rgba(29,26,22,.28);
      }
      .sq__tickY--major { width: 10px; }
      .sq__tickY--minor { width: 6px; left: calc(var(--m) - 6px); }
      .sq__tickYLabel {
        position:absolute;
        left: 6px;
        width: calc(var(--m) - 14px);
        text-align: right;
        font-family: var(--mono);
        font-size: 11px;
        color: rgba(29,26,22,.74);
      }
      .sq__originDot {
        position:absolute;
        left: var(--m);
        bottom: var(--m);
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: rgba(29,26,22,.88);
        box-shadow: 0 0 0 6px rgba(29,26,22,.10);
        transform: translate(-50%, 50%);
      }
      .sq__originLabel {
        position:absolute;
        left: calc(var(--m) + 10px);
        bottom: calc(var(--m) - 10px);
        font-family: var(--mono);
        font-size: 12px;
        color: rgba(29,26,22,.74);
      }
      .sq__square {
        position:absolute;
        left: var(--m);
        bottom: var(--m);
        background: rgba(209,75,42,.16);
        border: 2px solid rgba(209,75,42,.55);
        border-radius: 10px;
        box-shadow: 0 18px 40px rgba(209,75,42,.16);
      }
      .sq__tag {
        position:absolute;
        right: 12px;
        top: 12px;
        padding: 8px 10px;
        border-radius: 14px;
        border: 1px solid rgba(29,26,22,.14);
        background: rgba(251,246,236,.78);
        font-size: 12px;
        color: rgba(29,26,22,.76);
      }

      @media (max-width: 980px) {
        .sq { grid-template-columns: 1fr; }
        .sq__slider { width: 100%; }
      }
      `,
    });

    const ui = makeEl("div", { class: "sq" });
    const left = makeEl("div", { class: "sq__card" });
    const right = makeEl("div", { class: "sq__canvasWrap" });

    const title = makeEl("h3", { class: "sq__title", html: "用面积理解平方：x² 就是 x×x" });
    const hint = makeEl("p", { class: "sq__hint", html: "主线：只找非负整数解。拓展：(-x)² 也等于 x²。" });

    const xSlider = makeEl("input", { class: "sq__slider", type: "range", min: "0", max: "10", step: "1", value: "4" });
    const xVal = makeEl("span", { class: "sq__pill", html: "x = 4" });
    const areaVal = makeEl("span", { class: "sq__pill", html: "x² = 16" });

    const quizArea = makeEl("span", { class: "sq__pill", html: "题目：x² = 25" });
    const guessInput = makeEl("input", { class: "sq__input", inputmode: "numeric", placeholder: "填 x", value: "" });
    const checkBtn = makeEl("button", { class: "sq__btn", html: "检查", onclick: () => checkGuess() });
    const newBtn = makeEl("button", { class: "sq__btn", html: "换一题", onclick: () => newQuiz() });
    const msg = makeEl("div", { class: "sq__msg", html: "" });

    left.appendChild(title);
    left.appendChild(hint);
    left.appendChild(makeEl("div", { class: "sq__row" }, [makeEl("div", { class: "sq__label", html: "拖动边长：" }), xSlider, xVal, areaVal]));
    left.appendChild(makeEl("div", { class: "sq__row" }, [makeEl("div", { class: "sq__label", html: "小测：" }), quizArea]));
    left.appendChild(makeEl("div", { class: "sq__row" }, [guessInput, checkBtn, newBtn]));
    // 数轴：把“x 是一个数”变成“x 在数轴上的位置”，更适合三年级直觉。
    const nl = makeEl("div", { class: "sq__nl" });
    const nlHead = makeEl("div", { class: "sq__nlHead" }, [
      makeEl("div", { class: "sq__nlTitle", html: "数轴（可点击选 x）" }),
      makeEl("div", { class: "sq__nlHint", html: "范围：0 到 10" }),
    ]);
    const nlTrack = makeEl("div", { class: "sq__nlTrack" });
    const nlLine = makeEl("div", { class: "sq__nlLine" });
    const nlTicks = makeEl("div", { class: "sq__nlTicks" });
    const nlMarker = makeEl("div", { class: "sq__nlMarker", html: "" });
    nlTrack.appendChild(nlLine);
    nlTrack.appendChild(nlMarker);
    nlTrack.appendChild(nlTicks);
    nl.appendChild(nlHead);
    nl.appendChild(nlTrack);
    left.appendChild(nl);
    left.appendChild(msg);

    const grid = makeEl("div", { class: "sq__grid" });
    const axes = makeEl("div", { class: "sq__axes" });
    const axisX = makeEl("div", { class: "sq__axisX" });
    const axisY = makeEl("div", { class: "sq__axisY" });
    const ticksX = makeEl("div", { class: "sq__ticksX" });
    const ticksY = makeEl("div", { class: "sq__ticksY" });
    const originDot = makeEl("div", { class: "sq__originDot", "aria-hidden": "true" });
    const originLabel = makeEl("div", { class: "sq__originLabel", html: "O" });
    const axisLabelX = makeEl("div", { class: "sq__axisLabel sq__axisLabel--x", html: "x" });
    const axisLabelY = makeEl("div", { class: "sq__axisLabel sq__axisLabel--y", html: "y" });
    axes.appendChild(axisX);
    axes.appendChild(axisY);
    axes.appendChild(ticksX);
    axes.appendChild(ticksY);
    axes.appendChild(originDot);
    axes.appendChild(originLabel);
    axes.appendChild(axisLabelX);
    axes.appendChild(axisLabelY);

    const square = makeEl("div", { class: "sq__square" });
    const tag = makeEl("div", { class: "sq__tag", html: "正方形：边长 x" });
    grid.appendChild(axes);
    grid.appendChild(square);
    grid.appendChild(tag);
    right.appendChild(grid);

    ui.appendChild(left);
    ui.appendChild(right);

    root.innerHTML = "";
    root.appendChild(style);
    root.appendChild(ui);

    const state = {
      quizX: 5,
      quizArea: 25,
    };

    const MAX = 10;
    let CELL = 24;
    // 给刻度文字留白（会根据容器大小动态微调）
    let MARGIN = 44;

    function applyGridVars() {
      grid.style.setProperty("--cell", `${CELL}px`);
      grid.style.setProperty("--m", `${MARGIN}px`);
    }

    function syncGridLayout() {
      const size = grid.getBoundingClientRect().width;
      if (!Number.isFinite(size) || size <= 0) return;

      // 让 0..10 刚好铺满“坐标板”，避免出现一大片多余网格（视觉噪音）。
      const MIN_CELL = 18;
      let m = Math.round(Math.max(30, Math.min(64, size * 0.12)));
      let c = Math.floor((size - 2 * m) / MAX);
      if (c < MIN_CELL) {
        m = Math.max(26, Math.floor((size - MAX * MIN_CELL) / 2));
        c = Math.floor((size - 2 * m) / MAX);
      }
      c = Math.max(16, c);

      const changed = c !== CELL || m !== MARGIN;
      CELL = c;
      MARGIN = m;
      applyGridVars();
      if (changed) {
        initAxes();
        renderSquare(Number(xSlider.value));
      }
    }

    function initAxes() {
      ticksX.innerHTML = "";
      ticksY.innerHTML = "";
      // 网格变小时，刻度数字会挤在一起：自动“减密”。
      const showAllX = CELL >= 30;
      const showEvenX = CELL >= 22;
      const showEvenY = CELL >= 24;

      for (let i = 0; i <= MAX; i++) {
        const tick = makeEl("div", { class: `sq__tickX ${i % 5 === 0 ? "sq__tickX--major" : "sq__tickX--minor"}` });
        tick.style.left = `${MARGIN + i * CELL}px`;
        ticksX.appendChild(tick);

        const wantLabel = showAllX || (showEvenX ? i % 2 === 0 : i === 0 || i === 5 || i === MAX);
        if (wantLabel) {
          // x 轴：像“数轴”一样标 0..10，让孩子一眼看到刻度。
          const lab = makeEl("div", { class: "sq__tickXLabel", html: String(i) });
          lab.style.left = `${MARGIN + i * CELL}px`;
          ticksX.appendChild(lab);
        }
      }

      for (let i = 0; i <= MAX; i++) {
        const tick = makeEl("div", { class: `sq__tickY ${i % 5 === 0 ? "sq__tickY--major" : "sq__tickY--minor"}` });
        tick.style.bottom = `${MARGIN + i * CELL}px`;
        ticksY.appendChild(tick);

        // y 轴标签：默认只标偶数；太挤则只标 0/5/10。
        const wantLabel = showEvenY ? i % 2 === 0 : i === 0 || i === 5 || i === MAX;
        if (wantLabel) {
          const lab = makeEl("div", { class: "sq__tickYLabel", html: String(i) });
          lab.style.bottom = `${MARGIN + i * CELL - 6}px`;
          ticksY.appendChild(lab);
        }
      }
    }

    function setMarker(x) {
      if (!Number.isFinite(x) || x < 0 || x > MAX) {
        nlMarker.style.display = "none";
        return;
      }
      nlMarker.style.display = "grid";
      nlMarker.style.left = `${(x / MAX) * 100}%`;
      nlMarker.innerHTML = `<div class="sq__nlBadge">x = ${x}</div><div class="sq__nlDot"></div>`;
    }

    function initNumberLine() {
      nlTicks.innerHTML = "";
      for (let i = 0; i <= MAX; i++) {
        const btn = makeEl("button", {
          class: "sq__nlTick",
          type: "button",
          html: String(i),
          onclick: () => {
            guessInput.value = String(i);
            setMarker(i);
          },
        });
        nlTicks.appendChild(btn);
      }
      setMarker(Number(guessInput.value));
    }

    function renderSquare(x) {
      const size = x * CELL; // 与背景格子一致
      square.style.width = `${size}px`;
      square.style.height = `${size}px`;
      xVal.textContent = `x = ${x}`;
      areaVal.textContent = `x² = ${x * x}`;
    }

    function newQuiz() {
      const x = Math.floor(Math.random() * (MAX + 1)); // 0..10
      state.quizX = x;
      state.quizArea = x * x;
      quizArea.textContent = `题目：x² = ${state.quizArea}`;
      guessInput.value = "";
      setMarker(Number(guessInput.value));
      msg.textContent = "提示：先想平方表，再代回去检验。";
    }

    function checkGuess() {
      const v = Number(guessInput.value);
      if (!Number.isFinite(v)) {
        msg.textContent = "请输入数字。";
        return;
      }
      setMarker(v);
      const ok = v * v === state.quizArea;
      if (ok) {
        msg.innerHTML = `<span class="ok">正确 ✓</span>  检验：${v}² = ${v * v}。`;
      } else {
        msg.textContent = `还差一点。检验：${v}² = ${v * v}，不等于 ${state.quizArea}。再想想平方表。`;
      }
    }

    xSlider.addEventListener("input", () => {
      const x = Number(xSlider.value);
      renderSquare(x);
    });

    guessInput.addEventListener("input", () => {
      const v = Number(guessInput.value);
      setMarker(v);
    });

    // Init
    initNumberLine();
    renderSquare(Number(xSlider.value));
    newQuiz();
    applyGridVars();
    initAxes();

    // 监听右侧容器尺寸变化：保持“0..10 刚好铺满”，避免多余网格干扰注意力。
    try {
      const ro = new ResizeObserver(() => syncGridLayout());
      ro.observe(grid);
    } catch (_) {
      // ResizeObserver 不可用则忽略（大多数现代浏览器都支持）。
    }
    requestAnimationFrame(() => syncGridLayout());
  }

  window.AreaSquare = { mount };
})();
