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

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-src="${src}"]`);
      if (existing) {
        if (existing.getAttribute("data-loaded") === "true") resolve();
        else existing.addEventListener("load", () => resolve());
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.defer = true;
      s.setAttribute("data-src", src);
      s.addEventListener("load", () => {
        s.setAttribute("data-loaded", "true");
        resolve();
      });
      s.addEventListener("error", () => reject(new Error(`脚本加载失败：${src}`)));
      document.head.appendChild(s);
    });
  }

  function mount(root) {
    const style = makeEl("style", {
      html: `
      .sg {
        display:grid;
        grid-template-columns: 0.95fr 1.05fr;
        gap: 14px;
        align-items: start;
      }
      .sg__card {
        border:1px solid rgba(29,26,22,.14);
        background: rgba(255,255,255,.70);
        border-radius: 18px;
        padding: 14px;
        box-shadow: 0 10px 24px rgba(29,26,22,.08);
      }
      .sg__title { font-family: var(--font-display); font-size: 22px; margin:0 0 8px; }
      .sg__hint { margin:0; color: rgba(29,26,22,.74); font-size: 13px; }
      .sg__controls { margin-top: 12px; display:grid; gap:10px; }
      .sg__row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
      .sg__label { font-size: 12px; color: rgba(29,26,22,.68); min-width: 120px; }
      .sg__pill {
        font-family: var(--mono);
        font-size: 13px;
        padding: 7px 10px;
        border-radius: 999px;
        border: 1px solid rgba(29,26,22,.14);
        background: rgba(251,246,236,.72);
      }
      .sg__select {
        border:1px solid rgba(29,26,22,.18);
        background: rgba(251,246,236,.70);
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 14px;
        min-width: 180px;
      }
      .sg__input {
        border:1px solid rgba(29,26,22,.18);
        background: rgba(251,246,236,.70);
        border-radius: 12px;
        padding: 10px 12px;
        font-size: 14px;
        width: 86px;
        font-family: var(--mono);
      }
      .sg__slider {
        width: 260px;
      }
      .sg__btn {
        border:1px solid rgba(29,26,22,.16);
        background: rgba(255,255,255,.76);
        padding: 10px 12px;
        border-radius: 12px;
        font-size: 13px;
        cursor: pointer;
        transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
      }
      .sg__btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 22px rgba(29,26,22,.10);
        background: rgba(255,255,255,.92);
      }
      .sg__btn--accent {
        background: rgba(209,75,42,.12);
        border-color: rgba(209,75,42,.30);
      }
      .sg__btn--ghost { background: rgba(251,246,236,.55); }
      .sg__eq {
        margin-top: 12px;
        padding: 12px;
        border-radius: 16px;
        border: 1px dashed rgba(29,26,22,.22);
        background: rgba(251,246,236,.78);
      }
      .sg__eq strong { font-family: var(--mono); }
      .sg__eqSmall {
        margin-top: 8px;
        color: rgba(29,26,22,.78);
        font-size: 13px;
      }
      .sg__msg { margin-top: 10px; font-size: 13px; color: rgba(29,26,22,.78); }
      .sg__msg .ok, .sg__eq .ok { color: var(--accent2); font-weight: 700; }
      .sg__ggbWrap {
        border:1px solid rgba(29,26,22,.14);
        border-radius: 18px;
        overflow:hidden;
        background: rgba(255,255,255,.65);
        box-shadow: 0 10px 24px rgba(29,26,22,.08);
      }
      .sg__ggb {
        width: 100%;
        height: 520px;
      }

      @media (max-width: 980px) {
        .sg { grid-template-columns: 1fr; }
        .sg__slider { width: 100%; }
        .sg__ggb { height: 420px; }
      }
      `,
    });

    const ui = makeEl("div", { class: "sg" });
    const left = makeEl("div", { class: "sg__card" });
    const right = makeEl("div", { class: "sg__ggbWrap" });

    const title = makeEl("h3", { class: "sg__title", html: "两条线的交点 = 同时满足两个条件的一对 (x, y)" });
    const hint = makeEl("p", {
      class: "sg__hint",
      html: "建议上课顺序：先列举表格与点，再用 GeoGebra 拖动验证，最后代回两条方程检验。",
    });

    const typeSel = makeEl("select", { class: "sg__select", "aria-label": "选择第二个条件" });
    [
      { v: "x", t: "条件 B：x = t（竖直线）" },
      { v: "y", t: "条件 B：y = t（水平线）" },
      { v: "sum", t: "条件 B：x + y = k（平行/重合）" },
    ].forEach((o) => typeSel.appendChild(makeEl("option", { value: o.v, html: o.t })));

    const sSlider = makeEl("input", { class: "sg__slider", type: "range", min: "0", max: "12", step: "1", value: "8" });
    const tSlider = makeEl("input", { class: "sg__slider", type: "range", min: "0", max: "8", step: "1", value: "2" });
    const kSlider = makeEl("input", { class: "sg__slider", type: "range", min: "0", max: "12", step: "1", value: "10" });

    const sVal = makeEl("span", { class: "sg__pill", html: "s = 8" });
    const tVal = makeEl("span", { class: "sg__pill", html: "t = 2" });
    const kVal = makeEl("span", { class: "sg__pill", html: "k = 10" });

    const eqBox = makeEl("div", { class: "sg__eq" });
    const msgBox = makeEl("div", { class: "sg__msg", html: "" });

    const randomBtn = makeEl("button", {
      class: "sg__btn",
      html: "出一题（随机）",
      onclick: () => {
        const s = 3 + Math.floor(Math.random() * 10); // 3..12
        sSlider.value = String(s);
        // 让点留在第一象限：t ≤ s
        tSlider.max = String(s);
        const t = Math.floor(Math.random() * (s + 1));
        tSlider.value = String(t);
        const k = 0 + Math.floor(Math.random() * 13);
        kSlider.value = String(k);
        renderMathAndSync();
      },
    });

    const ggbId = `ggb-${Math.random().toString(16).slice(2)}`;
    const ggbDiv = makeEl("div", { class: "sg__ggb", id: ggbId });

    right.appendChild(ggbDiv);

    left.appendChild(title);
    left.appendChild(hint);

    const controls = makeEl("div", { class: "sg__controls" });

    controls.appendChild(makeEl("div", { class: "sg__row" }, [makeEl("div", { class: "sg__label", html: "条件 A：" }), makeEl("div", { class: "sg__pill", html: "<strong>x + y = s</strong>" })]));
    controls.appendChild(makeEl("div", { class: "sg__row" }, [makeEl("div", { class: "sg__label", html: "调整 s：" }), sSlider, sVal]));

    controls.appendChild(makeEl("div", { class: "sg__row" }, [makeEl("div", { class: "sg__label", html: "条件 B：" }), typeSel]));
    controls.appendChild(makeEl("div", { class: "sg__row", id: "row-t" }, [makeEl("div", { class: "sg__label", html: "调整 t：" }), tSlider, tVal]));
    controls.appendChild(makeEl("div", { class: "sg__row", id: "row-k" }, [makeEl("div", { class: "sg__label", html: "调整 k：" }), kSlider, kVal]));
    controls.appendChild(makeEl("div", { class: "sg__row" }, [randomBtn]));

    left.appendChild(controls);
    left.appendChild(eqBox);
    left.appendChild(msgBox);

    ui.appendChild(left);
    ui.appendChild(right);

    root.innerHTML = "";
    root.appendChild(style);
    root.appendChild(ui);

    const state = {
      api: null,
      type: "x",
      showAnswer: false,
    };

    // eqBox：把“交点=解”做成一个小流程：先猜 → 再代回检验 → 需要时再揭晓答案。
    // 注意：这里不能用 eqBox.innerHTML 整块重写，否则会把输入框/按钮清空，互动会失效。
    const eqIntro = makeEl("div", {
      class: "sg__eqSmall",
      html: "先猜一猜，再用代回检验通关；需要时再点“显示答案”。",
    });
    const eqA = makeEl("div", { class: "sg__eqSmall", html: "" });
    const eqB = makeEl("div", { class: "sg__eqSmall", html: "" });

    const guessRow = makeEl("div", { class: "sg__row" });
    const guessLabel = makeEl("div", { class: "sg__label", html: "猜一猜 (x,y)：" });
    const guessXInput = makeEl("input", { class: "sg__input", inputmode: "numeric", placeholder: "x", value: "" });
    const guessYInput = makeEl("input", { class: "sg__input", inputmode: "numeric", placeholder: "y", value: "" });
    const guessBtn = makeEl("button", { class: "sg__btn sg__btn--accent", html: "检查", onclick: () => checkGuess() });
    const toggleBtn = makeEl("button", { class: "sg__btn sg__btn--ghost", html: "显示答案", onclick: () => toggleAnswer() });

    guessRow.appendChild(guessLabel);
    guessRow.appendChild(guessXInput);
    guessRow.appendChild(guessYInput);
    guessRow.appendChild(guessBtn);
    guessRow.appendChild(toggleBtn);

    const feedback = makeEl("div", { class: "sg__eqSmall", html: "提示：先猜一猜，再按“检查”。" });
    const answerBox = makeEl("div", { class: "sg__eqSmall", html: "" });

    eqBox.appendChild(eqIntro);
    eqBox.appendChild(eqA);
    eqBox.appendChild(eqB);
    eqBox.appendChild(guessRow);
    eqBox.appendChild(feedback);
    eqBox.appendChild(answerBox);

    function currentSolution() {
      const { s, t, k } = readValues();
      if (state.type === "x") return { kind: "unique", x: t, y: s - t };
      if (state.type === "y") return { kind: "unique", x: s - t, y: t };
      // sum
      if (k === s) return { kind: "infinite", s };
      return { kind: "none" };
    }

    function toggleAnswer() {
      state.showAnswer = !state.showAnswer;
      toggleBtn.textContent = state.showAnswer ? "隐藏答案" : "显示答案";

      if (state.showAnswer) {
        const sol = currentSolution();
        if (sol.kind === "unique") {
          guessXInput.value = String(sol.x);
          guessYInput.value = String(sol.y);
        }
      }

      renderChallengeBox();
    }

    function checkGuess() {
      const x = Number(guessXInput.value);
      const y = Number(guessYInput.value);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        feedback.textContent = "请输入 x 和 y（用整数即可）。";
        return;
      }

      const { s, t, k } = readValues();
      const okA = x + y === s;
      let okB = false;
      if (state.type === "x") okB = x === t;
      else if (state.type === "y") okB = y === t;
      else okB = x + y === k;

      if (okA && okB) {
        feedback.innerHTML = `<span class="ok">通关 ✓</span>  代回：x+y=${x + y}；第二个条件也满足。`;
      } else {
        const aMsg = okA ? `x+y=${x + y} ✓` : `x+y=${x + y} ✗（应为 ${s}）`;
        let bMsg = "";
        if (state.type === "x") bMsg = okB ? `x=${x} ✓` : `x=${x} ✗（应为 ${t}）`;
        else if (state.type === "y") bMsg = okB ? `y=${y} ✓` : `y=${y} ✗（应为 ${t}）`;
        else bMsg = okB ? `x+y=${x + y} ✓` : `x+y=${x + y} ✗（应为 ${k}）`;
        feedback.textContent = `还没通关：${aMsg}；${bMsg}。`;
      }
    }

    function setVisibility() {
      const rowT = left.querySelector("#row-t");
      const rowK = left.querySelector("#row-k");
      if (!rowT || !rowK) return;
      if (state.type === "sum") {
        rowT.style.display = "none";
        rowK.style.display = "flex";
      } else {
        rowT.style.display = "flex";
        rowK.style.display = "none";
      }
    }

    function readValues() {
      const s = Number(sSlider.value);
      const t = Number(tSlider.value);
      const k = Number(kSlider.value);
      return { s, t, k };
    }

    function renderMathAndSync() {
      const { s, t, k } = readValues();
      sVal.textContent = `s = ${s}`;
      tVal.textContent = `t = ${t}`;
      kVal.textContent = `k = ${k}`;

      // 保持第一象限：当用 x=t 或 y=t 时，强制 t ≤ s
      if (state.type !== "sum") {
        tSlider.max = String(s);
        if (Number(tSlider.value) > s) tSlider.value = String(s);
      }

      setVisibility();
      renderChallengeBox();
      syncGeoGebra();
    }

    function renderChallengeBox() {
      const { s, t, k } = readValues();

      const A = `x + y = ${s}`;
      let B = "";

      if (state.type === "x") {
        B = `x = ${t}`;
      } else if (state.type === "y") {
        B = `y = ${t}`;
      } else {
        B = `x + y = ${k}`;
      }

      // 课堂默认：只显示“两个条件”，不要提前把答案写出来（留给学生猜/检验）。
      eqA.innerHTML = `<strong>条件 A：</strong> <strong>${A}</strong>`;
      eqB.innerHTML = `<strong>条件 B：</strong> <strong>${B}</strong>`;

      if (!state.showAnswer) {
        answerBox.innerHTML = "";
        return;
      }

      const sol = currentSolution();
      if (sol.kind === "unique") {
        const x = sol.x;
        const y = sol.y;
        const verifyA = `${x} + ${y} = ${s} ✓`;
        const verifyB = state.type === "x" ? `x = ${x} ✓` : `y = ${y} ✓`;
        answerBox.innerHTML = `
          <div><strong>答案（交点）：</strong> <span class="ok">(x, y) = (${x}, ${y})</span></div>
          <div style="margin-top:6px"><strong>代回检验：</strong></div>
          <div>- ${verifyA}</div>
          <div>- ${verifyB}</div>
        `;
        return;
      }

      if (sol.kind === "infinite") {
        answerBox.innerHTML = `
          <div><strong>结论：</strong> <span class="ok">无穷多组解（两条线重合）</span></div>
          <div style="margin-top:6px">因为两个条件其实一样：都在说 <strong>x + y = ${sol.s}</strong>。</div>
        `;
        return;
      }

      answerBox.innerHTML = `
        <div><strong>结论：</strong> <span class="ok">没有共同解（两条线平行，不相交）</span></div>
        <div style="margin-top:6px">同一个点不可能同时满足 <strong>x + y = ${s}</strong> 和 <strong>x + y = ${k}</strong>。</div>
      `;
    }

    function syncGeoGebra() {
      const api = state.api;
      if (!api) {
        msgBox.textContent = "GeoGebra 正在加载…（首次加载需要联网）";
        return;
      }

      const { s, t, k } = readValues();

      try {
        // 变量：s,t,k
        if (!api.exists("s")) api.evalCommand("s=8");
        if (!api.exists("t")) api.evalCommand("t=2");
        if (!api.exists("k")) api.evalCommand("k=10");
        api.setValue("s", s);
        api.setValue("t", t);
        api.setValue("k", k);

        // 线：l1, l2
        if (!api.exists("l1")) api.evalCommand("l1: x + y = s");
        // l2 会切换，所以每次都重建
        if (api.exists("l2")) api.deleteObject("l2");
        if (api.exists("P")) api.deleteObject("P");
        if (!api.exists("O")) api.evalCommand("O = (0, 0)");

        if (state.type === "x") {
          api.evalCommand("l2: x = t");
          api.evalCommand("P = (t, s - t)");
        } else if (state.type === "y") {
          api.evalCommand("l2: y = t");
          api.evalCommand("P = (s - t, t)");
        } else {
          api.evalCommand("l2: x + y = k");
          // 不强行创建交点，避免误导
        }

        // 轻量样式（避免工具栏干扰课堂）
        try {
          api.setColor("l1", 209, 75, 42);
          api.setLineThickness("l1", 6);
          api.setColor("l2", 30, 107, 90);
          api.setLineThickness("l2", 6);
          // 原点要“看得见”：用 O 标出来，不要躲在角落。
          if (api.exists("O")) {
            api.setColor("O", 29, 26, 22);
            api.setPointSize("O", 6);
            api.setLabelVisible("O", true);
          }
          if (api.exists("P")) {
            api.setColor("P", 29, 26, 22);
            api.setPointSize("P", 6);
            api.setLabelVisible("P", true);
          }
        } catch (_) {
          // 某些方法在不同 app 版本/配置下可能不可用，忽略即可。
        }

        // 视图：尽量锁定在第一象限附近
        try {
          // 给 0 留一点“边距”，让原点不要贴边。
          api.setCoordSystem(-0.5, 12.5, -0.5, 12.5);
        } catch (_) {}

        msgBox.innerHTML = `<span class="ok">已同步：</span>拖动滑块，看交点如何变化。`;
      } catch (err) {
        console.error("[geogebra]", err);
        msgBox.textContent = "GeoGebra 同步失败：请刷新页面重试。";
      }
    }

    // Event wiring
    typeSel.addEventListener("change", () => {
      state.type = typeSel.value;
      renderMathAndSync();
    });
    sSlider.addEventListener("input", renderMathAndSync);
    tSlider.addEventListener("input", renderMathAndSync);
    kSlider.addEventListener("input", renderMathAndSync);

    // Load GeoGebra
    loadScriptOnce("https://www.geogebra.org/apps/deployggb.js")
      .then(() => {
        if (typeof window.GGBApplet !== "function") throw new Error("GGBApplet 未找到");
        const params = {
          id: `ggbApplet_${ggbId}`,
          appName: "graphing",
          showToolBar: false,
          showAlgebra: false,
          showAlgebraInput: false,
          showMenuBar: false,
          // 课堂版尽量“少控件、少干扰”：缩放/全屏等留给老师需要时再打开。
          enableShiftDragZoom: false,
          enableRightClick: false,
          allowStyleBar: false,
          enableLabelDrags: false,
          showZoomButtons: false,
          showFullscreenButton: false,
          appletOnLoad: function (api) {
            state.api = api;
            try {
              // 课堂更清爽：只保留图像视图（不同版本可能不支持，失败则忽略）。
              api.setPerspective?.("G");
              api.evalCommand?.('SetPerspective("G")');
              api.evalCommand("ShowGrid(true)");
              api.evalCommand("ShowAxes(true)");
            } catch (_) {}
            renderMathAndSync();
          },
        };
        const applet = new window.GGBApplet(params, true);
        applet.inject(ggbId);
      })
      .catch((err) => {
        console.error(err);
        msgBox.textContent = "GeoGebra 加载失败：请确认已联网，或稍后刷新重试。";
      });

    // Init UI
    state.type = typeSel.value;
    setVisibility();
    renderMathAndSync();
  }

  window.SystemsGeoGebra = { mount };
})();
