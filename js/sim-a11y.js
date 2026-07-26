/*
 * sim-a11y.js — 模擬的無障礙描述層
 *
 * 現況：整個實驗的內容都畫在 <canvas> 上，對螢幕報讀器而言那是一個空白方塊。
 * 使用報讀器的學生打開實驗，能聽到的只有滑桿名稱，完全不知道畫面在演什麼、
 * 讀數是多少、調整參數之後發生了什麼變化。245 個實驗全部如此。
 *
 * PhET 的做法叫「Interactive Description」：為模擬提供一份會隨狀態更新的
 * 文字描述，讓非視覺的使用經驗和視覺的一樣完整。他們有 89 個模擬做到這件事。
 *
 * 這裡用同樣的概念，但做法上有一個關鍵優勢——探測引擎已經知道每個實驗的
 * 滑桿、讀數與物理關係，因此描述可以自動生成，245 個實驗一次到位：
 *
 *   1. 畫布本身給一段摘要（這是什麼實驗、目前的關鍵讀數）
 *   2. 調整參數後，用 aria-live 播報「改了什麼、哪個讀數跟著變成多少」
 *   3. 另外提供一份「文字版讀數」表格，讓報讀器使用者可以逐項瀏覽
 *   4. 鍵盤使用者不需要滑鼠也能完成整個量測流程
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab;
  if (!PL || !PL._hooks) return;

  const el = PL.el;

  const numeric = r => (r && r.number != null ? r.number : null);

  function readoutSentence(readouts) {
    const parts = readouts
      .filter(r => r.value && r.value !== "—")
      .map(r => r.label + " " + r.value + (r.unit ? " " + r.unit : ""));
    return parts.length ? parts.join("，") : "尚無讀數";
  }

  function relationSentence(insight) {
    if (!insight) return "";
    const lines = [];
    const primary = insight.primary;
    if (primary && (primary.direction === "up" || primary.direction === "down")) {
      lines.push("調高「" + primary.slider.label + "」時，「" + primary.readout.label + "」會" +
        (primary.direction === "up" ? "變大" : "變小") + "。");
    }
    (insight.invariants || []).slice(0, 1).forEach(r => {
      lines.push("「" + r.readout.label + "」不受「" + r.slider.label + "」影響。");
    });
    return lines.join("");
  }

  /* 目前所有參數的文字敘述，供摘要與播報使用 */
  function parameterSentence(sliders) {
    return sliders.map(s => {
      const value = PL.fmt(s.read(), s.digits);
      return s.label + " " + value + (s.unit ? " " + s.unit : "");
    }).join("，");
  }

  PL._hooks.onBuilt((context, api) => {
    const root = context.root;
    const canvasInfo = context.stageCanvas;
    const canvas = canvasInfo && canvasInfo.cv && canvasInfo.cv.canvas;
    const sliders = context.sliders || [];
    const readouts = context.readouts || [];
    const insight = context.insight;
    const profile = context.profile || {};
    const experiment = (function () {
      const modules = (window.PhysicsLabCurriculum || {}).modules || [];
      for (const m of modules) {
        const found = m.experiments.find(e => e.id === context.id);
        if (found) return found;
      }
      return null;
    })();

    const title = experiment ? experiment.title : (profile.stage || "互動模擬");

    /* -----------------------------------------------------------------
       1. 畫布的文字替代
       canvas 預設對報讀器完全不可見，至少要說明「這是什麼、現在如何」。
       ----------------------------------------------------------------- */
    if (canvas) {
      canvas.setAttribute("role", "img");
      const describe = () => {
        const text = title + "的互動模擬。" +
          (experiment && experiment.concept ? experiment.concept + " " : "") +
          "目前參數：" + (sliders.length ? parameterSentence(sliders) : "無可調參數") + "。" +
          "目前讀數：" + readoutSentence(readouts) + "。" +
          relationSentence(insight) +
          "本模擬的完整數值可在下方的「文字版讀數」中逐項閱讀。";
        canvas.setAttribute("aria-label", text);
      };
      describe();
      context.describeCanvas = describe;
    }

    if (!sliders.length && !readouts.length) return;

    /* -----------------------------------------------------------------
       2. 文字版讀數
       把畫布上的數字用真正的 DOM 呈現一份，報讀器才能逐項瀏覽，
       同時也方便所有人複製數值去做紀錄。
       ----------------------------------------------------------------- */
    const panel = el("section", "sim-a11y");
    panel.setAttribute("aria-label", "文字版讀數與操作說明");
    const details = el("details", "sim-a11y-details", panel);
    const summary = el("summary", null, details);
    summary.textContent = "文字版讀數（適合螢幕報讀器與紀錄用）";

    const list = el("dl", "sim-a11y-list", details);
    function paintList() {
      list.innerHTML = "";
      sliders.forEach(s => {
        const row = el("div", "sim-a11y-row", list);
        const dt = el("dt", null, row); dt.textContent = s.label;
        const dd = el("dd", null, row);
        dd.textContent = PL.fmt(s.read(), s.digits) + (s.unit ? " " + s.unit : "") +
          "（可調範圍 " + PL.fmt(s.min, s.digits) + " 至 " + PL.fmt(s.max, s.digits) + "）";
      });
      readouts.forEach(r => {
        const row = el("div", "sim-a11y-row is-readout", list);
        const dt = el("dt", null, row); dt.textContent = r.label;
        const dd = el("dd", null, row);
        dd.textContent = (r.value || "—") + (r.unit ? " " + r.unit : "");
      });
    }
    paintList();

    const hint = el("p", "sim-a11y-hint", details);
    hint.textContent = "鍵盤操作：用 Tab 移到參數上，左右方向鍵可微調、Home 與 End 可直接跳到最小值與最大值。" +
      "調整後下方會自動播報新的讀數。";

    /* -----------------------------------------------------------------
       3. 即時播報
       報讀器使用者調整滑桿後，必須聽到「結果變成什麼」，
       否則操作是沒有回饋的。節流避免拖曳時洗版。
       ----------------------------------------------------------------- */
    const live = el("p", "sim-a11y-live", panel);
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");

    let announceTimer = 0;
    function announce(changed) {
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => {
        paintList();
        if (context.describeCanvas) context.describeCanvas();
        const prefix = changed ? changed.label + " 設為 " +
          PL.fmt(changed.read(), changed.digits) + (changed.unit ? " " + changed.unit : "") + "。" : "";
        live.textContent = prefix + readoutSentence(readouts) + "。";
      }, 350);
    }

    sliders.forEach(s => {
      s.el.addEventListener("input", () => announce(s));
      s.el.addEventListener("change", () => announce(s));
    });

    // 播放狀態改變後也要播報一次目前的數值
    const transport = root.querySelector(".sim-transport-play");
    if (transport) transport.addEventListener("click", () => announce(null));
    const resetBtn = root.querySelector(".sim-transport-reset");
    if (resetBtn) resetBtn.addEventListener("click", () => {
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => {
        paintList();
        live.textContent = "已重設所有參數。" + readoutSentence(readouts) + "。";
      }, 350);
    });

    /*
     * 動畫進行中時，每隔一段時間更新一次文字版讀數，
     * 但不播報——持續播報會讓報讀器完全無法使用。
     */
    const previousTick = context.onTick;
    let acc = 0;
    context.onTick = (dt, t) => {
      if (previousTick) previousTick(dt, t);
      acc += dt;
      if (acc >= 1.5) { acc = 0; paintList(); }
    };

    // 放在讀數面板之後：先操作、再看數值，順序才自然
    const readoutPanel = root.querySelector(".sim-readout-panel");
    if (readoutPanel && readoutPanel.parentNode) {
      readoutPanel.parentNode.insertBefore(panel, readoutPanel.nextSibling);
    } else {
      root.appendChild(panel);
    }
    context.a11y = { announce, paintList, panel };
  });
})();
