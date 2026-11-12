/*
 * sim-a11y.js — 模擬的無障礙描述層
 * canvas 對報讀器是空白方塊；這裡提供：操作說明、文字版讀數、即時播報。
 */
(function () {
  "use strict";
  /* 讀數的朗讀文字：單位只接在數字後面（「不適用」「至少 2 筆」後面不掛單位），與畫面上的讀數一致 */
  const valueText = r => (r.value || "—") + (r.unit && /^[-−+≈~<>≤≥]?\s?\.?\d/.test(String(r.value)) ? " " + r.unit : "");
  const PL = window.PhysicsLab;
  if (!PL || !PL._hooks) return;

  const el = PL.el;

  function readoutSentence(readouts) {
    const parts = readouts
      .filter(r => r.value && r.value !== "—")
      .map(r => r.label + " " + valueText(r));
    return parts.length ? parts.join("、") : "まだ測定値がありません";
  }

  function relationSentence(insight) {
    if (!insight) return "";
    const lines = [];
    const primary = insight.primary;
    if (primary && (primary.direction === "up" || primary.direction === "down")) {
      lines.push("「" + primary.slider.label + "」を大きくすると、「" + primary.readout.label + "」が" +
        (primary.direction === "up" ? "大きくなる" : "小さくなる") + "。");
    }
    (insight.invariants || []).slice(0, 1).forEach(r => {
      lines.push("「" + r.readout.label + "」は「" + r.slider.label + "」の影響を受けません。");
    });
    return lines.join("");
  }

  function parameterSentence(sliders) {
    return sliders.map(s => {
      const value = PL.fmt(s.read(), s.digits);
      return s.label + " " + value + (s.unit ? " " + s.unit : "");
    }).join("、");
  }

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
      lines.push("「再生」で開始／一時停止します。" +
        (hasStep ? "「コマ送り」で 1 コマずつ見られます。" : "") +
        (hasReset ? "「すべてリセット」で最初に戻ります。" : ""));
    } else if (trigger) {
      lines.push("再生ボタンはありません。パラメータの欄の「" + trigger + "」で始めます。" +
        (hasStep ? "始めたあとは「コマ送り」で 1 コマずつ見られます。" : ""));
    } else if (playHint && !playHint.hidden && playHint.textContent) {
      lines.push(playHint.textContent.replace(/^[▶\s]+/, "") + "。");
    } else {
      lines.push("パラメータの欄で操作すると、画面と測定値がすぐ更新されます。" +
        (hasReset ? "わからなくなったら「すべてリセット」。" : ""));
    }

    if (context.sliders && context.sliders.length) {
      lines.push("調整できるパラメータは " + context.sliders.length + " 個です。Tab で選んで左右の矢印キーで調整します。");
    }
    const buttons = Array.from(root.querySelectorAll(".sim-controls button"))
      .filter(b => !b.disabled && b.type !== "submit");
    if (buttons.length) {
      const names = buttons.slice(0, 6).map(b => b.textContent.trim()).filter(Boolean);
      if (names.length) lines.push("ボタン：" + names.join("、") + "。");
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
      playBtn.setAttribute("aria-label", running ? "シミュレーションを一時停止" : "シミュレーションを再生");
      playBtn.setAttribute("aria-pressed", running ? "true" : "false");
    }
    if (playHint && !playHint.hidden) {
      playHint.setAttribute("role", "note");
      playHint.setAttribute("aria-label", "操作のヒント：" + playHint.textContent);
    }
    if (stepBtn) stepBtn.setAttribute("aria-label", "コマ送り：1/60 秒進めて止めます");
    if (resetBtn) resetBtn.setAttribute("aria-label", "すべてリセット：パラメータ、データ、時間を最初に戻します");
    if (speed) speed.setAttribute("aria-label", "再生の速さ");
    if (time) time.setAttribute("aria-label", "いまのシミュレーションの時間");
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

    const title = experiment ? experiment.title : (profile.stage || "シミュレーション");
    const concept = experiment && experiment.concept ? experiment.concept : "";
    const howTo = howToStart(root, context);

    /* 傳輸列按鈕：沒有明確 name 時，報讀器只會唸「按鈕」 */
    paintTransportNames(root, context);

    /* 主要地標加上可讀名稱 */
    const visual = root.querySelector(".sim-visual-panel");
    if (visual) {
      visual.setAttribute("role", "region");
      visual.setAttribute("aria-label", title + " の実験画面");
    }
    const controlDeck = root.querySelector(".sim-control-deck");
    if (controlDeck) {
      controlDeck.setAttribute("role", "region");
      controlDeck.setAttribute("aria-label", "実験のパラメータ");
    }
    const readoutPanel = root.querySelector(".sim-readout-panel");
    if (readoutPanel) {
      readoutPanel.setAttribute("role", "region");
      readoutPanel.setAttribute("aria-label", "測定値");
    }
    const transport = root.querySelector(".sim-transport");
    if (transport) {
      transport.setAttribute("role", "group");
      transport.setAttribute("aria-label", "時間の操作");
    }

    /* -----------------------------------------------------------------
       1. 畫布的文字替代：是什麼 + 怎麼開始 + 現在讀數
       ----------------------------------------------------------------- */
    let a11yPanelId = "";
    if (canvas) {
      canvas.setAttribute("role", "img");
      const describe = () => {
        const text = title + " のインタラクティブなシミュレーション。" +
          (concept ? concept + " " : "") +
          howTo + " " +
          "いまのパラメータ：" + (sliders.length ? parameterSentence(sliders) : "調整できるパラメータはありません") + "。" +
          "いまの測定値：" + readoutSentence(readouts) + "。" +
          relationSentence(insight) +
          "数値と操作方法は「操作の説明と文字の測定値」にまとめてあります。";
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
    panel.setAttribute("aria-label", "操作の説明と文字の測定値");

    const details = el("details", "sim-a11y-details", panel);
    const summary = el("summary", null, details);
    summary.textContent = "操作の説明と文字の測定値（スクリーンリーダー向け）";

    const howBlock = el("div", "sim-a11y-howto", details);
    const howTitle = el("p", "sim-a11y-howto-title", howBlock);
    howTitle.textContent = "この実験の使い方";
    const howBody = el("p", "sim-a11y-howto-body", howBlock);
    howBody.textContent = howTo;

    const list = el("dl", "sim-a11y-list", details);
    function paintList() {
      list.innerHTML = "";
      if (!sliders.length && !readouts.length) {
        const row = el("div", "sim-a11y-row", list);
        const dt = el("dt", null, row); dt.textContent = "状態";
        const dd = el("dd", null, row); dd.textContent = "この実験はボタンで操作します。上の説明を見てください。";
        return;
      }
      sliders.forEach(s => {
        const row = el("div", "sim-a11y-row", list);
        const dt = el("dt", null, row); dt.textContent = s.label;
        const dd = el("dd", null, row);
        dd.textContent = PL.fmt(s.read(), s.digits) + (s.unit ? " " + s.unit : "") +
          "（調整できる範囲 " + PL.fmt(s.min, s.digits) + " ～ " + PL.fmt(s.max, s.digits) + "）";
      });
      readouts.forEach(r => {
        const row = el("div", "sim-a11y-row is-readout", list);
        const dt = el("dt", null, row); dt.textContent = r.label;
        const dd = el("dd", null, row);
        dd.textContent = valueText(r);
      });
    }
    paintList();

    const hint = el("p", "sim-a11y-hint", details);
    hint.textContent = "キーボード：Tab で移動、矢印キーで微調整、Home／End で最小／最大、Enter/Space でボタン。";

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
          ? changed.label + " を " +
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
          live.textContent = (running ? "シミュレーションを再生中。" : "シミュレーションを一時停止しました。") + readoutSentence(readouts) + "。";
        }, 200);
      });
    }
    const stepBtn = root.querySelector(".sim-transport-btn");
    if (stepBtn) {
      stepBtn.addEventListener("click", () => {
        clearTimeout(announceTimer);
        announceTimer = setTimeout(() => {
          paintList();
          live.textContent = "1/60 秒進めました。" + readoutSentence(readouts) + "。";
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
          live.textContent = "すべてのパラメータをリセットしました。" + readoutSentence(readouts) + "。";
        }, 350);
      });
    }

    // 實驗自己的觸發鈕（發射／釋放／開始）
    Array.from(root.querySelectorAll(".sim-controls button")).forEach(btn => {
      const label = btn.textContent.trim();
      if (!label || label === "リセット" || label === "データを消す") return;
      btn.addEventListener("click", () => {
        clearTimeout(announceTimer);
        announceTimer = setTimeout(() => {
          paintList();
          if (context.describeCanvas) context.describeCanvas();
          live.textContent = "「" + label + "」。" + readoutSentence(readouts) + "。";
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
