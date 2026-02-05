(function () {
  "use strict";

  function safeMount(mountFn, rootId) {
    try {
      const el = document.getElementById(rootId);
      if (!el) return;
      mountFn(el);
    } catch (err) {
      // 课件不应因某个组件加载失败而整页不可用。
      console.error("[mount]", rootId, err);
      const el = document.getElementById(rootId);
      if (el) {
        el.innerHTML =
          '<div style="padding:12px;border:1px solid rgba(29,26,22,.14);border-radius:14px;background:rgba(255,255,255,.7)">' +
          "<strong>组件加载失败</strong>：请打开控制台查看错误信息。</div>";
      }
    }
  }

  safeMount(window.BalanceSolver?.mount, "balance-root");
  safeMount(window.SystemsGeoGebra?.mount, "systems-root");
  safeMount(window.AreaSquare?.mount, "square-root");

  // 进入页面后，如果有 hash 就滚动到对应模块。
  function scrollToHash() {
    const id = location.hash.replace("#", "");
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  window.addEventListener("hashchange", scrollToHash);
  setTimeout(scrollToHash, 120);
})();

