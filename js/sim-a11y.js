/*
 * sim-a11y.js — 模擬的無障礙描述層
 *
 * 目標：讓使用螢幕報讀器、只用鍵盤、或暫時看不清畫面的人，
 * 打開任一個實驗都能立刻知道「這是什麼、怎麼開始、目前讀數是多少」。
 *
 * 與一般 a11y 補丁的差別：
 *   1. 不只給 canvas 一個 aria-label，而是把「操作方式」寫成可讀的文字
 *      （播放鍵在哪、沒有播放時按哪顆、靜態實驗怎麼互動）。
 *   2. 傳輸列每顆按鈕都有明確的 name / 狀態，切換時用 aria-live 播報。
 *   3. 文字版讀數 + 即時播報，調整參數後一定聽得到結果。
 *   4. 沒有滑桿、只有按鈕的實驗同樣提供完整說明，不會整段跳過。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab;
  if (!PL || !PL._hooks) return;

  const el = PL.el;

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

  function parameterSentence(sliders) {
    return sliders.map(s => {
      const value = PL.fmt(s.read(), s.digits);
      return s.label + " " + value + (s.unit ? " " + s.unit : "");
    }).join("，");
  }

  /*
   * 這支實驗「要怎麼開始」——沒有這段，報讀器使用者會停在
   * 「我按了播放怎麼沒反應」或「這頁是不是壞了」。
   */
  function howToStart(root, context) {
    const playBtn = root.querySelector(".sim-transport-play");
    const playHint = root.querySelector(".sim-transport-hint");
    const stepBtn = root.querySelector(".sim-transport-btn");
    const resetBtn = root.querySelector(".sim-transport-reset");
    const trigger = context.triggerLabel ||
      (function () {
        const b = root.querySelector(".sim-controls .btn-primary");
        return b ? b.textContent.trim() : "";
      })();

    const hasPlay = playBtn && !playBtn.hidden;
    const hasStep = stepBtn && !stepBtn.hidden;
    const hasReset = resetBtn && !resetBtn.hidden;

    const lines = [];
    if (hasPlay) {
      lines.push("按「播放」開始模擬，再按一次可暫停。" +
        (hasStep ? "「單步」可前進 1/60 秒逐格觀察。" : "") +
        (hasReset ? "「全部重設」可把參數與計時歸零。" : ""));
    } else if (trigger) {
      lines.push("這個實驗沒有播放鍵。到參數區按「" + trigger + "」開始。" +
        (hasStep ? "開始後可用「單步」逐格觀察。" : "") +
        (hasReset ? "「全部重設」可重新準備一次。" : ""));
    } else if (playHint && !playHint.hidden && playHint.textContent) {
      lines.push(playHint.textContent.replace(/^[▶\s]+/, "") + "。");
    } else {
      lines.push("調整參數區的控制項，畫面與讀數會即時更新。" +
        (hasReset ? "改亂了可按「全部重設」。" : ""));
    }

    if (context.sliders && context.sliders.length) {
      lines.push("可調參數共 " + context.sliders.length + " 項，用 Tab 選到後以左右方向鍵調整。");
    }
    const buttons = Array.from(root.querySelectorAll(".sim-controls button"))
      .filter(b => !b.disabled && b.type !== "submit");
    if (buttons.length) {
      const names = buttons.slice(0, 6).map(b => b.textContent.trim()).filter(Boolean);
      if (names.length) lines.push("參數區按鈕：" + names.join("、") + "。");
    }
    return lines.join("");
  }

  function paintTransportNames(root, context) {
    const playBtn = root.querySelector(".sim-transport-play");
    const playHint = root.querySelector(".sim-transport-hint");
    const stepBtn = root.querySelector(".sim-transport-btn");
    const resetBtn = root.querySelector(".sim-transport-reset");
    const speed = root.querySelector(".sim-speed");
    const time = root.querySelector(".sim-transport-time");

    if (playBtn) {
      const running = !!(context.loops && context.loops.some(l => l.running));
      playBtn.setAttribute("aria-label", running ? "暫停模擬" : "播放模擬");
      playBtn.setAttribute("aria-pressed", running ? "true" : "false");
    }
    if (playHint && !playHint.hidden) {
      playHint.setAttribute("role", "note");
      playHint.setAttribute("aria-label", "操作提示：" + playHint.textContent);
    }
    if (stepBtn) stepBtn.setAttribute("aria-label", "單步：前進 1/60 秒後暫停");
    if (resetBtn) resetBtn.setAttribute("aria-label", "全部重設：參數、資料與計時歸零");
    if (speed) speed.setAttribute("aria-label", "播放速度");
    if (time) time.setAttribute("aria-label", "目前模擬時間");
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
    const concept = experiment && experiment.concept ? experiment.concept : "";
    const howTo = howToStart(root, context);

    /* 傳輸列按鈕：沒有明確 name 時，報讀器只會唸「按鈕」 */
    paintTransportNames(root, context);

    /* 主要地標加上可讀名稱 */
    const visual = root.querySelector(".sim-visual-panel");
    if (visual) {
      visual.setAttribute("role", "region");
      visual.setAttribute("aria-label", title + "實驗畫面");
    }
    const controlDeck = root.querySelector(".sim-control-deck");
    if (controlDeck) {
      controlDeck.setAttribute("role", "region");
      controlDeck.setAttribute("aria-label", "實驗參數");
    }
    const readoutPanel = root.querySelector(".sim-readout-panel");
    if (readoutPanel) {
      readoutPanel.setAttribute("role", "region");
      readoutPanel.setAttribute("aria-label", "量測讀數");
    }
    const transport = root.querySelector(".sim-transport");
    if (transport) {
      transport.setAttribute("role", "group");
      transport.setAttribute("aria-label", "時間控制");
    }

    /* -----------------------------------------------------------------
       1. 畫布的文字替代：是什麼 + 怎麼開始 + 現在讀數
       ----------------------------------------------------------------- */
    let a11yPanelId = "";
    if (canvas) {
      canvas.setAttribute("role", "img");
      const describe = () => {
        const text = title + "的互動模擬。" +
          (concept ? concept + " " : "") +
          howTo + " " +
          "目前參數：" + (sliders.length ? parameterSentence(sliders) : "無可調參數") + "。" +
          "目前讀數：" + readoutSentence(readouts) + "。" +
          relationSentence(insight) +
          "完整數值與操作說明見「操作說明與文字版讀數」。";
        canvas.setAttribute("aria-label", text);
      };
      describe();
      context.describeCanvas = describe;
    }

    /* -----------------------------------------------------------------
       2. 操作說明 + 文字版讀數
       即使這支實驗沒有滑桿也沒有讀數（只有按鈕），仍然要建立說明，
       否則「只有發射鍵」的實驗對報讀器完全沒有指引。
       ----------------------------------------------------------------- */
    const panel = el("section", "sim-a11y");
    a11yPanelId = "lab-a11y-" + (context.id || "sim");
    panel.id = a11yPanelId;
    panel.setAttribute("aria-label", "操作說明與文字版讀數");

    const details = el("details", "sim-a11y-details", panel);
    const summary = el("summary", null, details);
    summary.textContent = "操作說明與文字版讀數（螢幕報讀器必讀）";

    const howBlock = el("div", "sim-a11y-howto", details);
    const howTitle = el("p", "sim-a11y-howto-title", howBlock);
    howTitle.textContent = "怎麼使用這個實驗";
    const howBody = el("p", "sim-a11y-howto-body", howBlock);
    howBody.textContent = howTo;

    const list = el("dl", "sim-a11y-list", details);
    function paintList() {
      list.innerHTML = "";
      if (!sliders.length && !readouts.length) {
        const row = el("div", "sim-a11y-row", list);
        const dt = el("dt", null, row); dt.textContent = "狀態";
        const dd = el("dd", null, row); dd.textContent = "本實驗以按鈕操作，詳見上方說明。";
        return;
      }
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
    hint.textContent = "鍵盤：Tab 移動到控制項；方向鍵微調滑桿；Home／End 跳到最小／最大值；" +
      "Enter 或 Space 按下按鈕。調整後會自動播報新的讀數。";

    /* -----------------------------------------------------------------
       3. 即時播報
       ----------------------------------------------------------------- */
    const live = el("p", "sim-a11y-live", panel);
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");

    let announceTimer = 0;
    function announce(changed) {
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => {
        paintList();
        paintTransportNames(root, context);
        if (context.describeCanvas) context.describeCanvas();
        const prefix = changed && changed.label
          ? changed.label + " 設為 " +
            PL.fmt(changed.read(), changed.digits) + (changed.unit ? " " + changed.unit : "") + "。"
          : "";
        live.textContent = prefix + readoutSentence(readouts) + "。";
      }, 350);
    }

    sliders.forEach(s => {
      s.el.addEventListener("input", () => announce(s));
      s.el.addEventListener("change", () => announce(s));
    });

    // 傳輸列：播放／暫停／單步／重設都要讓使用者知道發生了什麼
    const playBtn = root.querySelector(".sim-transport-play");
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        paintTransportNames(root, context);
        const running = !!(context.loops && context.loops.some(l => l.running));
        clearTimeout(announceTimer);
        announceTimer = setTimeout(() => {
          paintList();
          if (context.describeCanvas) context.describeCanvas();
          live.textContent = (running ? "模擬播放中。" : "模擬已暫停。") + readoutSentence(readouts) + "。";
        }, 200);
      });
    }
    const stepBtn = root.querySelector(".sim-transport-btn");
    if (stepBtn) {
      stepBtn.addEventListener("click", () => {
        clearTimeout(announceTimer);
        announceTimer = setTimeout(() => {
          paintList();
          live.textContent = "已單步前進 1/60 秒。" + readoutSentence(readouts) + "。";
        }, 200);
      });
    }
    const resetBtn = root.querySelector(".sim-transport-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        clearTimeout(announceTimer);
        announceTimer = setTimeout(() => {
          paintList();
          paintTransportNames(root, context);
          if (context.describeCanvas) context.describeCanvas();
          live.textContent = "已重設所有參數。" + readoutSentence(readouts) + "。";
        }, 350);
      });
    }

    // 實驗自己的觸發鈕（發射／釋放／開始）
    Array.from(root.querySelectorAll(".sim-controls button")).forEach(btn => {
      const label = btn.textContent.trim();
      if (!label || label === "重設" || label === "清除資料") return;
      btn.addEventListener("click", () => {
        clearTimeout(announceTimer);
        announceTimer = setTimeout(() => {
          paintList();
          if (context.describeCanvas) context.describeCanvas();
          live.textContent = "已按下「" + label + "」。" + readoutSentence(readouts) + "。";
        }, 280);
      });
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

    // 畫布指向操作說明，報讀器讀完圖像後可直接跳到說明
    if (canvas && a11yPanelId) canvas.setAttribute("aria-describedby", a11yPanelId);

    // 放在讀數面板之後：先操作、再看數值，順序才自然
    if (readoutPanel && readoutPanel.parentNode) {
      readoutPanel.parentNode.insertBefore(panel, readoutPanel.nextSibling);
    } else if (controlDeck && controlDeck.parentNode) {
      controlDeck.parentNode.insertBefore(panel, controlDeck.nextSibling);
    } else {
      root.appendChild(panel);
    }
    context.a11y = { announce, paintList, panel, howTo };
  });
})();
