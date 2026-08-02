/*
 * school-labs.js — 台灣國高中「必做實驗」補充包
 *
 * 這一批刻意都採同一種學習動線，也就是實驗課真正在做的事：
 *
 *     調整一個變因 → 讀出儀器數值 → 按「記錄一筆」→ 累積資料點
 *     → 自動作出線性圖 → 從斜率算出要求的物理量 → 和公認值比誤差
 *
 * 重點不是看到漂亮的動畫，而是讓學生看見「為什麼要作圖」：
 * 單一次量測會有誤差，多點連成直線後，斜率才是可信的結果。
 * 因此每個實驗都提供「加入量測誤差」開關，讓資料點自然散開，
 * 學生能親眼看到最小平方法把散點收斂成一條線。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", PL.col("accent"));

  /* ------------------------------------------------------------------
     共用：量測 → 作圖 → 求斜率
     ------------------------------------------------------------------ */

  // 最小平方法直線擬合，同時回傳判定係數 r²，讓學生看得出資料好不好。
  function leastSquares(points) {
    const n = points.length;
    if (n < 2) return null;
    let sx = 0, sy = 0, sxy = 0, sxx = 0, syy = 0;
    points.forEach(([x, y]) => { sx += x; sy += y; sxy += x * y; sxx += x * x; syy += y * y; });
    const denom = n * sxx - sx * sx;
    if (Math.abs(denom) < 1e-12) return null;
    const slope = (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    const varY = n * syy - sy * sy;
    const r2 = varY <= 0 ? 1 : Math.pow(n * sxy - sx * sy, 2) / (denom * varY);
    return { slope, intercept, r2, n };
  }

  // 固定的偽隨機誤差：同一組設定重跑會得到同樣的資料，方便老師在課堂上重現。
  function jitter(seed, spread) {
    const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return (s - Math.floor(s) - 0.5) * 2 * spread;
  }

  /*
   * 建立「資料表＋擬合圖」的量測面板。
   * cfg: { title, cap, xLabel, yLabel, unitX, unitY, xMax, yMax }
   */
  function fitPanel(root, cfg) {
    const chart = PL.ui.chart(PL.ui.charts(root), { title: cfg.title, cap: cfg.cap, aspect: 0.62 });
    const records = [];
    const panel = {
      chart, records,
      add(x, y) {
        // 同一個 x 只留最新一次量測，避免重複按鈕堆出假的資料密度。
        const hit = records.findIndex(p => Math.abs(p[0] - x) < (cfg.xTolerance || 1e-6));
        if (hit >= 0) records[hit] = [x, y]; else records.push([x, y]);
        records.sort((a, b) => a[0] - b[0]);
        return panel.fit();
      },
      clear() { records.length = 0; },
      fit() { return leastSquares(records); },
      draw(highlight) {
        chart.clear();
        const ctx = chart.ctx;
        const xs = records.map(p => p[0]).concat(highlight ? [highlight[0]] : []);
        const ys = records.map(p => p[1]).concat(highlight ? [highlight[1]] : []);
        const xMax = Math.max(cfg.xMax || 0, ...xs) * 1.12 || 1;
        const yMax = Math.max(cfg.yMax || 0, ...ys) * 1.12 || 1;
        const g = PL.graph(chart, { x: 46, y: 16, w: chart.W - 60, h: chart.H - 40 },
          { x0: 0, x1: xMax, y0: cfg.yMin != null ? cfg.yMin : 0, y1: yMax });
        g.frame({ xlabel: cfg.xLabel, ylabel: cfg.yLabel });
        g.grid(5, 4);
        const fit = panel.fit();
        if (fit) {
          // 先畫擬合線再畫點，資料點才不會被線蓋住。
          g.fn(x => fit.slope * x + fit.intercept, { color: MC(), width: 2.2 });
        }
        records.forEach(p => g.dot(p[0], p[1], { r: 4, color: PL.col("accent-2") }));
        if (highlight) g.dot(highlight[0], highlight[1], { r: 5, color: PL.col("warn"), glow: PL.col("warn") });
        if (!records.length) {
          D.text(ctx, "按「記錄一筆」開始累積資料", chart.W / 2, chart.H / 2,
            { color: PL.col("text-faint"), size: 12, align: "center" });
        }
        return fit;
      }
    };
    return panel;
  }

  // 誤差百分比的統一呈現
  function errorPct(measured, accepted) {
    if (!isFinite(measured) || !accepted) return null;
    return Math.abs(measured - accepted) / Math.abs(accepted) * 100;
  }

  /* 畫一支刻度尺，讓「長度」這個變因是看得見的，而不只是滑桿上的數字。 */
  function ruler(ctx, x, y, w, label) {
    D.rect(ctx, x, y, w, 13, { fill: PL.theme.pale(0.10), stroke: PL.theme.pale(0.22), r: 2 });
    for (let i = 0; i <= 10; i++) {
      const gx = x + w * i / 10;
      D.line(ctx, gx, y, gx, y + (i % 5 === 0 ? 11 : 6), PL.theme.pale(0.4), 1);
    }
    if (label) D.text(ctx, label, x + w / 2, y + 26, { color: PL.col("text-dim"), size: 11, align: "center" });
  }

  /* ==================================================================
     模組六 · 單擺測重力加速度 g
     ================================================================== */
  PL.register("pendulum-measure-g", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const G_TRUE = 9.80;
    let t = 0, swings = 0, lastSign = 1;

    PL.ui.section(L.controls, "實驗設定");
    const sL = PL.ui.slider(L.controls, { label: "擺長 L（懸點到球心）", min: 0.20, max: 1.60, step: 0.05, value: 0.40, unit: "m", digits: 2 });
    const sN = PL.ui.stepper(L.controls, { label: "每次計時擺動次數 n", min: 5, max: 50, step: 5, value: 20 });
    const cErr = PL.ui.checkbox(L.controls, { label: "加入計時反應誤差（±0.2 s）", checked: true });
    const row = PL.ui.buttonRow(L.controls);
    const bRec = PL.ui.button(row, "記錄一筆", () => record(), { primary: true });
    PL.ui.button(row, "清除資料", () => { panel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "課本要求「測 n 次全振動再除以 n」，就是為了把一次按碼錶的反應誤差攤薄。" +
      "把上面的次數從 5 調到 50，觀察資料點如何從散亂變成一條線。");

    const rT = PL.ui.readout(L.readouts, { label: "本次週期 T", unit: "s" });
    const rSlope = PL.ui.readout(L.readouts, { label: "T²–L 斜率", unit: "s²/m" });
    const rG = PL.ui.readout(L.readouts, { label: "量得 g = 4π²/斜率", unit: "m/s²" });
    const rErr = PL.ui.readout(L.readouts, { label: "與 9.80 的誤差", unit: "%" });

    const panel = fitPanel(root, {
      title: "T² – L 關係圖", xLabel: "L (m)", yLabel: "T² (s²)", xMax: 1.6, yMax: 6.5, xTolerance: 0.01,
      cap: "理論上 T² = (4π²/g)·L 通過原點。斜率越準，求出的 g 就越接近 9.80 m/s²。"
    });

    // 真實週期加上一次計時的反應誤差，再除以 n。
    function measure(Lm) {
      const T = TAU * Math.sqrt(Lm / G_TRUE);
      if (!cErr.get()) return T;
      const n = sN.get();
      const timingError = jitter(Lm * 1000 + n, 0.20);   // 一次啟停碼錶的誤差，不隨 n 變大
      return T + timingError / n;                        // 攤到每一次全振動上
    }

    function record() {
      const Lm = sL.get();
      const T = measure(Lm);
      panel.add(Lm, T * T);
      refresh();
    }

    function refresh() {
      const Lm = sL.get(), T = measure(Lm);
      rT.set(T, 3);
      const fit = panel.draw([Lm, T * T]);
      if (fit && fit.slope > 0) {
        const g = 4 * Math.PI * Math.PI / fit.slope;
        rSlope.set(fit.slope, 3);
        rG.set(g, 2);
        const e = errorPct(g, G_TRUE);
        rErr.set(e == null ? "—" : e.toFixed(1));
      } else {
        rSlope.set("—"); rG.set("至少 2 筆"); rErr.set("—");
      }
    }

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const Lm = sL.get();
      const th0 = 8 * Math.PI / 180;                       // 小角度近似成立的範圍
      const w = Math.sqrt(G_TRUE / Lm);
      const th = th0 * Math.cos(w * t);

      // 計數目前累積的全振動次數，讓「數 20 次」這件事真的看得到。
      const sign = Math.sign(Math.cos(w * t)) || 1;
      if (sign !== lastSign) { lastSign = sign; swings += 0.5; }

      const pivotX = W * 0.5, pivotY = 44;
      const scale = (H - 130) / 1.6;                       // 擺長 1.6 m 對應可用高度
      cv.calibrate(scale, "m");   // 學生可以自己拿尺量擺長，而不只是讀滑桿
      const len = Lm * scale;
      const bobX = pivotX + Math.sin(th) * len, bobY = pivotY + Math.cos(th) * len;

      // 支架
      D.rect(ctx, pivotX - 70, pivotY - 12, 140, 10, { fill: PL.col("text-faint"), r: 3 });
      D.disc(ctx, pivotX, pivotY, 4, { fill: PL.col("text-dim") });
      // 鉛直參考線與擺線
      D.line(ctx, pivotX, pivotY, pivotX, pivotY + len, PL.theme.pale(0.18), 1, [4, 4]);
      D.line(ctx, pivotX, pivotY, bobX, bobY, PL.col("text-dim"), 2);
      D.disc(ctx, bobX, bobY, 13, { fill: MC(), glow: MC(), glowSize: 12 });

      // 擺長標示
      D.arrow(ctx, pivotX - 92, pivotY, pivotX - 92, pivotY + len, { color: PL.col("accent-2"), width: 1.5, head: 7 });
      D.text(ctx, "L = " + Lm.toFixed(2) + " m", pivotX - 88, pivotY + len / 2, { color: PL.col("accent-2"), size: 12 });

      /*
       * 「每次計時擺動次數 n」原本只影響計時何時停止，畫面上完全看不到。
       * 這個實驗的方法重點正是「數多一點次數再除，可以把反應時間的誤差攤掉」，
       * 因此把 n 畫成一排格子：已完成的填滿，還沒完成的留白。
       * 學生一眼就知道「還要再擺幾次」，也看得到 n 調大時格子變多。
       */
      const nTarget = sN.get();
      const gxs = 26, gys = H - 34, gw = Math.min(W - 52, nTarget * 13), cellW = gw / nTarget;
      D.text(ctx, "計時區間：" + Math.floor(swings) + " / " + nTarget + " 次全振動",
        gxs, gys - 8, { color: PL.col("text-dim"), size: 10.5 });
      for (let i = 0; i < nTarget; i += 1) {
        const done = i < Math.floor(swings);
        D.rect(ctx, gxs + i * cellW, gys, Math.max(2, cellW - 2), 9,
          { fill: done ? MC() : PL.theme.pale(0.10), r: 2 });
      }

      // 碼錶
      const boxW = 132, boxX = W - boxW - 16, boxY = 16;
      D.rect(ctx, boxX, boxY, boxW, 54, { fill: PL.theme.shade(0.45), stroke: PL.theme.pale(0.25), r: 6 });
      D.text(ctx, "累積全振動", boxX + 10, boxY + 19, { color: PL.col("text-faint"), size: 10 });
      D.text(ctx, Math.floor(swings) + " / " + sN.get() + " 次", boxX + 10, boxY + 40, { color: MC(), size: 17, weight: "700" });

      PL.ui.caption(cv, "小角度（此處 8°）下 T = 2π√(L/g)，與擺錘質量、振幅無關。");
    }

    const anim = PL.loop(dt => { if (dt) t += dt; draw(); }, 45);
    sL.el.addEventListener("input", () => { t = 0; swings = 0; refresh(); });
    sN.el.addEventListener("click", refresh);
    cErr.el.addEventListener("change", refresh);
    cv.onResize(draw); panel.chart.onResize(refresh);
    refresh(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); panel.chart.destroy(); }, rerender() { draw(); refresh(); } };
  }});

  /* ==================================================================
     模組六 · 彈簧振子測彈性常數 k
     ================================================================== */
  PL.register("spring-measure-k", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const K_TRUE = 24;              // N/m，學生要求出來的目標
    let t = 0;

    PL.ui.section(L.controls, "掛載質量");
    const sM = PL.ui.slider(L.controls, { label: "砝碼質量 m", min: 0.10, max: 1.00, step: 0.05, value: 0.30, unit: "kg", digits: 2 });
    const cErr = PL.ui.checkbox(L.controls, { label: "加入計時誤差", checked: true });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "記錄一筆", () => record(), { primary: true });
    PL.ui.button(row, "清除資料", () => { panel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "同一條彈簧有兩種求 k 的方法：靜態掛砝碼量伸長量（虎克定律），" +
      "以及動態量週期。畫面上兩個結果會同時顯示，可以互相驗證。");

    const rT = PL.ui.readout(L.readouts, { label: "週期 T", unit: "s" });
    const rX = PL.ui.readout(L.readouts, { label: "靜態伸長 x", unit: "cm" });
    const rKs = PL.ui.readout(L.readouts, { label: "靜態法 k = mg/x", unit: "N/m" });
    const rKd = PL.ui.readout(L.readouts, { label: "動態法 k = 4π²/斜率", unit: "N/m" });

    const panel = fitPanel(root, {
      title: "T² – m 關係圖", xLabel: "m (kg)", yLabel: "T² (s²)", xMax: 1.0, yMax: 1.8, xTolerance: 0.01,
      cap: "T² = (4π²/k)·m。斜率越大代表彈簧越軟；由斜率可反推彈性常數 k。"
    });

    function period(m) {
      const T = TAU * Math.sqrt(m / K_TRUE);
      return cErr.get() ? T + jitter(m * 1000, 0.012) : T;
    }

    function record() { const m = sM.get(); const T = period(m); panel.add(m, T * T); refresh(); }

    function refresh() {
      const m = sM.get(), T = period(m);
      const x = m * 9.8 / K_TRUE;                     // 靜態伸長量（公尺）
      rT.set(T, 3); rX.set(x * 100, 1); rKs.set(m * 9.8 / x, 1);
      const fit = panel.draw([m, T * T]);
      if (fit && fit.slope > 0) rKd.set(4 * Math.PI * Math.PI / fit.slope, 1);
      else rKd.set("至少 2 筆");
    }

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const m = sM.get(), w = Math.sqrt(K_TRUE / m);
      const natural = 90, stretch = m * 9.8 / K_TRUE * 260;   // 靜態伸長（像素）
      const amp = 26, dy = amp * Math.cos(w * t);

      const topY = 34;
      // 左：靜態量伸長；右：動態量週期。並排讓兩種方法的關係一眼看清。
      [{ x: W * 0.32, moving: false, tag: "靜態：掛上砝碼量伸長" },
       { x: W * 0.68, moving: true, tag: "動態：拉一下量週期" }].forEach(col => {
        const offset = col.moving ? dy : 0;
        const bottom = topY + natural + stretch + offset;
        D.rect(ctx, col.x - 46, topY - 10, 92, 9, { fill: PL.col("text-faint"), r: 3 });
        D.spring(ctx, col.x, topY, col.x, bottom, 9, 11, MC());
        D.rect(ctx, col.x - 22, bottom, 44, 30, { fill: MC(), stroke: PL.theme.pale(0.4), r: 5 });
        D.text(ctx, m.toFixed(2), col.x, bottom + 20, { color: "#08131c", size: 11, align: "center", weight: "700" });
        D.text(ctx, col.tag, col.x, H - 30, { color: PL.col("text-faint"), size: 11, align: "center" });

        if (!col.moving) {
          // 自然長度基準線與伸長量標示
          D.line(ctx, col.x - 66, topY + natural, col.x + 60, topY + natural, PL.theme.pale(0.22), 1, [4, 4]);
          D.text(ctx, "自然長度", col.x - 68, topY + natural - 5, { color: PL.col("text-faint"), size: 10, align: "right" });
          D.arrow(ctx, col.x - 62, topY + natural, col.x - 62, bottom, { color: PL.col("accent-2"), width: 1.5, head: 6 });
          D.text(ctx, "x=" + (stretch / 260 * 100).toFixed(1) + "cm", col.x - 58, (topY + natural + bottom) / 2,
            { color: PL.col("accent-2"), size: 11 });
        } else {
          D.line(ctx, col.x - 52, topY + natural + stretch, col.x + 52, topY + natural + stretch, PL.theme.pale(0.22), 1, [4, 4]);
          D.text(ctx, "平衡位置", col.x + 56, topY + natural + stretch + 4, { color: PL.col("text-faint"), size: 10 });
        }
      });
    }

    const anim = PL.loop(dt => { if (dt) t += dt; draw(); }, 45);
    sM.el.addEventListener("input", refresh);
    cErr.el.addEventListener("change", refresh);
    cv.onResize(draw); panel.chart.onResize(refresh);
    refresh(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); panel.chart.destroy(); }, rerender() { draw(); refresh(); } };
  }});

  /* ==================================================================
     模組二 · 斜面法測靜摩擦係數
     ================================================================== */
  PL.register("incline-friction-coefficient", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const SURFACES = {
      wood: { label: "木塊 / 木板", mu: 0.42 },
      rubber: { label: "橡膠 / 木板", mu: 0.72 },
      steel: { label: "鋼塊 / 鋼板", mu: 0.24 },
      teflon: { label: "鐵氟龍 / 鋼板", mu: 0.08 }
    };
    let angle = 0, sliding = false, slideS = 0, key = "wood";

    PL.ui.section(L.controls, "接觸面與載重");
    PL.ui.select(L.controls, {
      label: "接觸面組合",
      options: Object.entries(SURFACES).map(([value, s]) => ({ value, label: s.label })),
      value: "wood",
      onChange: v => { key = v; angle = 0; sliding = false; slideS = 0; panel.clear(); refresh(); }
    });
    const sM = PL.ui.slider(L.controls, { label: "木塊質量 m", min: 0.2, max: 2.0, step: 0.2, value: 0.6, unit: "kg", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "緩慢抬升到滑動", () => { angle = 0; sliding = false; slideS = 0; }, { primary: true });
    PL.ui.button(row, "記錄這次臨界角", () => record());
    PL.ui.button(row, "清除資料", () => { panel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "把質量從 0.2 調到 2.0 kg 再各記錄一筆：資料點會排成一條水平線。" +
      "這條「平的線」正是實驗要證明的結論——靜摩擦係數與物體重量無關。");

    const rAngle = PL.ui.readout(L.readouts, { label: "目前傾角 θ", unit: "°" });
    const rCrit = PL.ui.readout(L.readouts, { label: "臨界角 θc", unit: "°" });
    const rMu = PL.ui.readout(L.readouts, { label: "μs = tan θc" });
    const rAvg = PL.ui.readout(L.readouts, { label: "多次平均 μs" });

    const panel = fitPanel(root, {
      title: "μs – 質量關係圖", xLabel: "m (kg)", yLabel: "μs = tan θc", xMax: 2.2, yMax: 0.9, xTolerance: 0.05,
      cap: "理論預期是一條水平線：斜率≈0 代表靜摩擦係數不隨質量改變，只由兩接觸面的材質決定。"
    });

    const criticalAngle = () => Math.atan(SURFACES[key].mu) * 180 / Math.PI;

    function record() {
      const m = sM.get();
      // 量角器讀數本身有誤差，資料點才會像真的實驗一樣略有起伏。
      const theta = criticalAngle() + jitter(m * 100 + key.length, 0.9);
      panel.add(m, Math.tan(theta * Math.PI / 180));
      refresh();
    }

    function refresh() {
      const thc = criticalAngle();
      rAngle.set(angle, 1);
      rCrit.set(thc, 1);
      rMu.set(SURFACES[key].mu, 3);
      const avg = panel.records.length
        ? panel.records.reduce((s, p) => s + p[1], 0) / panel.records.length : null;
      rAvg.set(avg == null ? "尚未記錄" : avg.toFixed(3));
      panel.draw();
    }

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const thc = criticalAngle(), rad = angle * Math.PI / 180;
      const baseX = 54, baseY = H - 58, run = W - 150;
      const tipY = baseY - run * Math.tan(rad);

      // 斜面本體
      ctx.save();
      ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(baseX + run, baseY); ctx.lineTo(baseX + run, tipY); ctx.closePath();
      ctx.fillStyle = PL.theme.pale(0.08); ctx.fill();
      ctx.strokeStyle = PL.col("text-faint"); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();

      // 角度弧與標示
      D.ring(ctx, baseX, baseY, 46, PL.theme.pale(0.3), 1);
      D.text(ctx, "θ = " + angle.toFixed(1) + "°", baseX + 54, baseY - 12, { color: PL.col("accent-2"), size: 13, weight: "700" });

      // 木塊沿斜面擺放（含滑動後的位移）
      const along = 0.42 + slideS;
      const bx = baseX + run * (1 - along) + Math.cos(rad) * 0, by = baseY - run * (1 - along) * Math.tan(rad);
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(-rad);
      const bw = 46, bh = 26 + sM.get() * 6;
      D.rect(ctx, -bw / 2, -bh, bw, bh, { fill: MC(), stroke: PL.theme.pale(0.4), width: 1.5, r: 4 });
      D.text(ctx, sM.get().toFixed(1) + "kg", 0, -bh / 2 + 4, { color: "#08131c", size: 11, align: "center", weight: "700" });
      ctx.restore();

      // 狀態徽章：靜止 / 剛好要滑 / 滑動
      const state = sliding ? "滑動中" : (angle >= thc - 0.4 ? "即將滑動" : "靜止（靜摩擦力足夠）");
      const stateColor = sliding ? PL.col("danger") : (angle >= thc - 0.4 ? PL.col("warn") : PL.col("ok"));
      D.rect(ctx, 14, 14, 190, 30, { fill: PL.theme.shade(0.45), stroke: stateColor, r: 6 });
      D.text(ctx, state, 24, 34, { color: stateColor, size: 13, weight: "700" });

      D.text(ctx, "臨界角 θc = " + thc.toFixed(1) + "° ， μs = tan θc = " + SURFACES[key].mu.toFixed(2),
        14, H - 20, { color: PL.col("text-faint"), size: 11 });
    }

    const anim = PL.loop(dt => {
      if (dt) {
        const thc = criticalAngle();
        if (!sliding && angle < thc) { angle = Math.min(thc, angle + dt * 7); }        // 緩慢抬升
        else if (!sliding && angle >= thc) { sliding = true; }
        if (sliding) { slideS = Math.min(0.5, slideS + dt * 0.35); }
        rAngle.set(angle, 1);
      }
      draw();
    }, 45);

    sM.el.addEventListener("input", refresh);
    cv.onResize(draw); panel.chart.onResize(refresh);
    refresh(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); panel.chart.destroy(); }, rerender() { draw(); refresh(); } };
  }});

  /* ==================================================================
     模組十 · 導線電阻與長度、截面積（電阻率 ρ）
     ================================================================== */
  PL.register("wire-resistivity", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    const MATERIALS = {
      copper: { label: "銅", rho: 1.68e-8, color: "#e08a4a" },
      aluminum: { label: "鋁", rho: 2.65e-8, color: "#b8c3cf" },
      iron: { label: "鐵", rho: 9.71e-8, color: "#8d9099" },
      nichrome: { label: "鎳鉻合金（電熱線）", rho: 1.10e-6, color: "#c4707a" }
    };
    let key = "nichrome";

    PL.ui.section(L.controls, "導線規格");
    PL.ui.select(L.controls, {
      label: "材質", value: key,
      options: Object.entries(MATERIALS).map(([value, m]) => ({ value, label: m.label })),
      onChange: v => { key = v; panel.clear(); refresh(); }
    });
    const sLen = PL.ui.slider(L.controls, { label: "導線長度 ℓ", min: 0.2, max: 2.0, step: 0.1, value: 1.0, unit: "m", digits: 1 });
    const sD = PL.ui.slider(L.controls, { label: "導線直徑 d", min: 0.2, max: 1.2, step: 0.1, value: 0.5, unit: "mm", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "記錄一筆", () => record(), { primary: true });
    PL.ui.button(row, "清除資料", () => { panel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "先固定直徑只改長度，記錄 4～5 筆；再固定長度只改直徑。" +
      "兩組資料都會落在同一條通過原點的直線上，因為橫軸已經把 ℓ 和 A 合併成 ℓ/A。");

    const rArea = PL.ui.readout(L.readouts, { label: "截面積 A", unit: "mm²" });
    const rR = PL.ui.readout(L.readouts, { label: "歐姆計讀數 R", unit: "Ω" });
    const rRho = PL.ui.readout(L.readouts, { label: "量得 ρ（斜率）", unit: "Ω·m" });
    const rErr = PL.ui.readout(L.readouts, { label: "與公認值誤差", unit: "%" });

    const panel = fitPanel(root, {
      title: "R – ℓ/A 關係圖", xLabel: "ℓ/A (1/m)", yLabel: "R (Ω)", xTolerance: 1e4,
      cap: "R = ρ·(ℓ/A)。不論是拉長導線還是變細導線，只要 ℓ/A 相同，電阻就相同；斜率即電阻率 ρ。"
    });

    const area = () => Math.PI * Math.pow(sD.get() / 2000, 2);      // m²（直徑單位為 mm）
    const resistance = () => MATERIALS[key].rho * sLen.get() / area();

    function record() { panel.add(sLen.get() / area(), resistance()); refresh(); }

    function refresh() {
      const A = area();
      rArea.set(A * 1e6, 3);
      rR.set(resistance(), 3);
      const fit = panel.draw([sLen.get() / A, resistance()]);
      if (fit && fit.slope > 0) {
        rRho.set(fit.slope.toExponential(2));
        const e = errorPct(fit.slope, MATERIALS[key].rho);
        rErr.set(e == null ? "—" : e.toFixed(1));
      } else { rRho.set("至少 2 筆"); rErr.set("—"); }
    }

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const mat = MATERIALS[key];
      const x0 = 70, x1 = x0 + (W - 210) * (sLen.get() / 2.0);      // 長度直接對應畫面長度
      cv.calibrate((W - 210) / 2.0, "m");   // 尺可直接量導線長度
      const y = H * 0.46;
      const thick = 3 + sD.get() * 7;                                // 直徑直接對應線粗

      // 導線與夾具
      D.rect(ctx, x0 - 14, y - 16, 14, 32, { fill: PL.col("text-faint"), r: 3 });
      D.rect(ctx, x1, y - 16, 14, 32, { fill: PL.col("text-faint"), r: 3 });
      ctx.save();
      ctx.strokeStyle = mat.color; ctx.lineWidth = thick; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.restore();

      ruler(ctx, x0, y + 34, x1 - x0, "ℓ = " + sLen.get().toFixed(1) + " m");
      D.text(ctx, "d = " + sD.get().toFixed(1) + " mm", (x0 + x1) / 2, y - thick / 2 - 12,
        { color: PL.col("accent-2"), size: 12, align: "center" });

      // 歐姆計
      const mW = 118, mX = W - mW - 16, mY = 18;
      D.rect(ctx, mX, mY, mW, 62, { fill: PL.theme.shade(0.5), stroke: PL.theme.pale(0.25), r: 7 });
      D.text(ctx, "歐姆計", mX + 12, mY + 20, { color: PL.col("text-faint"), size: 10 });
      D.text(ctx, PL.fmt(resistance(), 2) + " Ω", mX + 12, mY + 45, { color: MC(), size: 18, weight: "700" });
      D.line(ctx, mX, mY + 40, x1 + 14, y - 10, PL.col("text-faint"), 1.5);
      D.line(ctx, mX, mY + 52, x0 - 14, y + 10, PL.col("text-faint"), 1.5);

      D.text(ctx, mat.label + "：ρ = " + mat.rho.toExponential(2) + " Ω·m",
        16, H - 16, { color: PL.col("text-faint"), size: 11 });
    }

    const anim = PL.loop(() => draw(), 30);
    [sLen, sD].forEach(s => s.el.addEventListener("input", refresh));
    cv.onResize(draw); panel.chart.onResize(refresh);
    refresh(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); panel.chart.destroy(); }, rerender() { draw(); refresh(); } };
  }});

  /* ==================================================================
     模組十 · 溫度對電阻的影響（金屬 vs 熱敏電阻）
     ================================================================== */
  PL.register("resistance-vs-temperature", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    const R0 = 100, ALPHA = 0.00393;        // 白金 Pt100：R = R0(1 + αΔT)
    const B = 3500, RT25 = 100;             // NTC 熱敏電阻：R = R25·exp(B(1/T − 1/298))

    PL.ui.section(L.controls, "水浴溫度");
    const sT = PL.ui.slider(L.controls, { label: "溫度 T", min: 0, max: 100, step: 5, value: 25, unit: "°C", digits: 0 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "記錄一筆", () => record(), { primary: true });
    PL.ui.button(row, "清除資料", () => { metalPanel.clear(); ntcPanel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "從 0 °C 每 10 °C 記錄一筆到 100 °C。金屬的點會排成直線（電阻隨溫度上升），" +
      "熱敏電阻卻是一條急速下彎的曲線——這正是它能當溫度感測器的原因：同樣溫差下變化大得多。");

    const rMetal = PL.ui.readout(L.readouts, { label: "金屬電阻", unit: "Ω" });
    const rNtc = PL.ui.readout(L.readouts, { label: "熱敏電阻", unit: "Ω" });
    const rAlpha = PL.ui.readout(L.readouts, { label: "量得溫度係數 α", unit: "/°C" });
    const rRatio = PL.ui.readout(L.readouts, { label: "熱敏 / 金屬 靈敏度比" });

    const metalR = T => R0 * (1 + ALPHA * (T - 0));
    const ntcR = T => RT25 * Math.exp(B * (1 / (T + 273.15) - 1 / 298.15));

    const charts = PL.ui.charts(root);
    // 兩張圖並排：同一組溫度、兩種元件，差異一目了然。
    const metalChart = PL.ui.chart(charts, {
      title: "金屬（Pt100）：R – T", aspect: 0.62,
      cap: "R = R₀(1 + αT) 是一條直線，斜率 R₀α。金屬升溫時晶格振動加劇，電子更容易被散射，電阻上升。"
    });
    const ntcChart = PL.ui.chart(charts, {
      title: "熱敏電阻（NTC）：R – T", aspect: 0.62,
      cap: "半導體升溫會釋出更多載子，電阻反而急遽下降，因此曲線是下彎的，不是直線。"
    });
    const metalPanel = { records: [] };
    const ntcPanel = { records: [] };

    function record() {
      const T = sT.get();
      const put = (arr, y) => {
        const i = arr.findIndex(p => Math.abs(p[0] - T) < 0.5);
        if (i >= 0) arr[i] = [T, y]; else arr.push([T, y]);
        arr.sort((a, b) => a[0] - b[0]);
      };
      put(metalPanel.records, metalR(T));
      put(ntcPanel.records, ntcR(T));
      refresh();
    }

    function drawPanel(chart, records, current, color, opts) {
      chart.clear();
      const ys = records.map(p => p[1]).concat([current[1]]);
      const g = PL.graph(chart, { x: 48, y: 16, w: chart.W - 62, h: chart.H - 40 },
        { x0: 0, x1: 105, y0: 0, y1: Math.max(opts.yMax, ...ys) * 1.15 });
      g.frame({ xlabel: "T (°C)", ylabel: "R (Ω)" });
      g.grid(5, 4);
      if (opts.theory) g.fn(opts.theory, { color: PL.theme.pale(0.35), width: 1.6, dash: [5, 4] });
      const fit = records.length >= 2 ? leastSquares(records) : null;
      if (fit && opts.linear) g.fn(x => fit.slope * x + fit.intercept, { color, width: 2.2 });
      records.forEach(p => g.dot(p[0], p[1], { r: 4, color }));
      g.dot(current[0], current[1], { r: 5, color: PL.col("warn"), glow: PL.col("warn") });
      if (!records.length) {
        D.text(chart.ctx, "虛線為理論曲線，按「記錄一筆」開始取點",
          chart.W / 2, chart.H - 14, { color: PL.col("text-faint"), size: 11, align: "center" });
      }
      return fit;
    }

    function refresh() {
      const T = sT.get(), rm = metalR(T), rn = ntcR(T);
      rMetal.set(rm, 1); rNtc.set(rn, 1);
      const fit = drawPanel(metalChart, metalPanel.records, [T, rm], PL.col("accent-2"),
        { yMax: 150, linear: true, theory: metalR });
      drawPanel(ntcChart, ntcPanel.records, [T, rn], PL.col("accent-3"),
        { yMax: 400, linear: false, theory: ntcR });
      if (fit && fit.intercept > 0) rAlpha.set(fit.slope / fit.intercept, 5); else rAlpha.set("至少 2 筆");
      // 靈敏度比：同樣升 1 °C，兩者電阻變化量的比值（取絕對值）
      const dm = Math.abs(metalR(T + 0.5) - metalR(T - 0.5));
      const dn = Math.abs(ntcR(T + 0.5) - ntcR(T - 0.5));
      rRatio.set(dm > 0 ? (dn / dm).toFixed(1) + " 倍" : "—");
    }

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const T = sT.get();
      const beakerX = 40, beakerY = 46, beakerW = W * 0.44, beakerH = H - 100;

      // 水浴：水位固定，顏色隨溫度由藍轉紅，讓「溫度」在畫面上是看得見的
      const warm = Math.max(0, Math.min(1, T / 100));
      const water = "rgb(" + Math.round(60 + warm * 170) + "," + Math.round(140 - warm * 90) + "," + Math.round(210 - warm * 150) + ")";
      D.rect(ctx, beakerX, beakerY + 20, beakerW, beakerH - 20, { fill: water, stroke: PL.col("text-faint"), width: 2, r: 4 });

      // 加熱時冒出的氣泡數量隨溫度增加
      const bubbles = Math.round(warm * 14);
      for (let i = 0; i < bubbles; i++) {
        const bx = beakerX + 16 + ((i * 53) % (beakerW - 32));
        const by = beakerY + beakerH - ((i * 37 + Date.now() / 22) % (beakerH - 40));
        D.disc(ctx, bx, by, 2 + (i % 3), { fill: "rgba(255,255,255,0.5)" });
      }

      // 溫度計
      const tx = beakerX + beakerW + 34;
      D.rect(ctx, tx, beakerY, 16, beakerH, { fill: PL.theme.pale(0.10), stroke: PL.col("text-faint"), r: 8 });
      const col = beakerH * warm;
      D.rect(ctx, tx + 4, beakerY + beakerH - col, 8, col, { fill: PL.col("danger"), r: 4 });
      D.disc(ctx, tx + 8, beakerY + beakerH + 8, 11, { fill: PL.col("danger") });
      D.text(ctx, T + " °C", tx + 26, beakerY + beakerH - col + 4, { color: PL.col("danger"), size: 14, weight: "700" });

      // 兩顆待測元件浸在水裡，各自顯示即時電阻
      const items = [
        { label: "金屬 Pt100", value: metalR(T), color: PL.col("accent-2"), y: beakerY + beakerH * 0.35 },
        { label: "熱敏 NTC", value: ntcR(T), color: PL.col("accent-3"), y: beakerY + beakerH * 0.68 }
      ];
      items.forEach(item => {
        D.rect(ctx, beakerX + 22, item.y - 12, 54, 24, { fill: item.color, r: 4 });
        D.text(ctx, item.label, beakerX + 84, item.y - 2, { color: PL.col("text"), size: 11 });
        D.text(ctx, PL.fmt(item.value, 1) + " Ω", beakerX + 84, item.y + 12, { color: item.color, size: 12, weight: "700" });
      });

      PL.ui.caption(cv, "同一個水浴、同一個溫度，兩種元件的反應完全不同。");
    }

    const anim = PL.loop(() => draw(), 30);
    sT.el.addEventListener("input", refresh);
    cv.onResize(draw); metalChart.onResize(refresh); ntcChart.onResize(refresh);
    refresh(); anim.start();
    return {
      stop() { anim.stop(); cv.destroy(); metalChart.destroy(); ntcChart.destroy(); },
      rerender() { draw(); refresh(); }
    };
  }});

  /* ==================================================================
     模組七 · 牛頓冷卻定律
     ================================================================== */
  PL.register("newton-cooling", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.54);
    let t = 0, curve = [], running = true;

    PL.ui.section(L.controls, "起始條件");
    const sT0 = PL.ui.slider(L.controls, { label: "熱水初溫 T₀", min: 40, max: 95, step: 5, value: 90, unit: "°C", digits: 0 });
    const sEnv = PL.ui.slider(L.controls, { label: "室溫 T環境", min: 5, max: 35, step: 1, value: 25, unit: "°C", digits: 0 });
    const sK = PL.ui.slider(L.controls, { label: "散熱快慢 k（保溫程度）", min: 0.004, max: 0.05, step: 0.002, value: 0.016, unit: "1/s", digits: 3 });
    const row = PL.ui.buttonRow(L.controls);
    const bRun = PL.ui.button(row, "暫停", () => { running = !running; bRun.textContent = running ? "暫停" : "繼續"; }, { primary: true });
    PL.ui.button(row, "重新開始", () => reset());
    PL.ui.note(L.controls,
      "降溫曲線本身是彎的，很難判斷「快慢」。右下圖把縱軸換成 ln(T − T環境) 之後就變成直線，" +
      "斜率就是 −k。這是把指數關係「拉直」來讀參數的標準做法。");

    const rT = PL.ui.readout(L.readouts, { label: "目前水溫", unit: "°C" });
    const rDiff = PL.ui.readout(L.readouts, { label: "與室溫溫差", unit: "°C" });
    const rHalf = PL.ui.readout(L.readouts, { label: "溫差減半所需時間", unit: "s" });
    const rFit = PL.ui.readout(L.readouts, { label: "由直線斜率求得 k", unit: "1/s" });

    const charts = PL.ui.charts(root);
    const rawChart = PL.ui.chart(charts, {
      title: "原始資料：T – t 降溫曲線", aspect: 0.62,
      cap: "溫差越大降得越快，越接近室溫越慢，因此是一條逐漸變平的曲線，永遠不會低於室溫。"
    });
    const logChart = PL.ui.chart(charts, {
      title: "取對數後：ln(T − T環境) – t", aspect: 0.62,
      cap: "同一組資料換個縱軸就變成直線。直線斜率 = −k；這是實驗課要求「作圖求參數」的用意。"
    });

    function reset() { t = 0; curve = []; running = true; bRun.textContent = "暫停"; }

    function temperature(time) {
      const env = sEnv.get();
      return env + (sT0.get() - env) * Math.exp(-sK.get() * time);
    }

    function drawCharts() {
      const env = sEnv.get(), T0 = sT0.get();
      rawChart.clear();
      const g1 = PL.graph(rawChart, { x: 46, y: 16, w: rawChart.W - 60, h: rawChart.H - 40 },
        { x0: 0, x1: 300, y0: 0, y1: 100 });
      g1.frame({ xlabel: "t (s)", ylabel: "T (°C)" }); g1.grid(6, 5);
      // 室溫水平線：說明曲線的漸近線在哪裡
      g1.hline(env, { color: PL.col("accent-2"), dash: [5, 4], width: 1.4 });
      g1.label(6, env + 4, "室溫 " + env + "°C", { color: PL.col("accent-2"), size: 10 });
      if (curve.length > 1) g1.curve(curve, { color: MC(), width: 2.4 });
      if (curve.length) g1.dot(curve[curve.length - 1][0], curve[curve.length - 1][1], { r: 5, color: PL.col("warn"), glow: PL.col("warn") });

      logChart.clear();
      const logPts = curve.filter(p => p[1] - env > 0.5).map(p => [p[0], Math.log(p[1] - env)]);
      const maxLn = Math.log(Math.max(1, T0 - env));
      const g2 = PL.graph(logChart, { x: 50, y: 16, w: logChart.W - 64, h: logChart.H - 40 },
        { x0: 0, x1: 300, y0: -1, y1: Math.ceil(maxLn) + 0.5 });
      g2.frame({ xlabel: "t (s)", ylabel: "ln(T−T環境)" }); g2.grid(6, 5);
      const fit = logPts.length >= 2 ? leastSquares(logPts) : null;
      if (fit) g2.fn(x => fit.slope * x + fit.intercept, { color: PL.col("accent-3"), width: 2.4 });
      if (logPts.length > 1) g2.curve(logPts, { color: MC(), width: 1.6, dash: [3, 3] });
      return fit;
    }

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const env = sEnv.get(), T = temperature(t);
      const warm = Math.max(0, Math.min(1, (T - 5) / 95));

      // 燒杯與水
      const bx = 46, by = 40, bw = W * 0.4, bh = H - 92;
      const water = "rgb(" + Math.round(60 + warm * 175) + "," + Math.round(150 - warm * 100) + "," + Math.round(215 - warm * 160) + ")";
      D.rect(ctx, bx, by, bw, bh, { fill: water, stroke: PL.col("text-faint"), width: 2, r: 4 });

      // 蒸氣：溫差越大冒得越多，直接對應「散熱速率正比於溫差」
      const steam = Math.max(0, Math.min(10, Math.round((T - env) / 7)));
      for (let i = 0; i < steam; i++) {
        const sx = bx + bw * (0.2 + 0.6 * ((i * 7) % 10) / 10);
        const phase = (t * 30 + i * 24) % 60;
        D.disc(ctx, sx + Math.sin(phase / 9) * 6, by - phase * 0.5, 3 + (i % 2),
          { fill: "rgba(200,215,230," + (0.35 * (1 - phase / 60)).toFixed(2) + ")" });
      }

      // 溫度計
      const tx = bx + bw + 32;
      D.rect(ctx, tx, by - 6, 16, bh, { fill: PL.theme.pale(0.10), stroke: PL.col("text-faint"), r: 8 });
      const col = (bh - 12) * warm;
      D.rect(ctx, tx + 4, by - 6 + bh - 6 - col, 8, col, { fill: PL.col("danger"), r: 4 });
      D.text(ctx, T.toFixed(1) + " °C", tx + 26, by - 6 + bh - 10 - col, { color: PL.col("danger"), size: 15, weight: "700" });
      D.text(ctx, "室溫 " + env + " °C", tx + 26, by + bh - 4, { color: PL.col("accent-2"), size: 11 });

      // 即時的溫差條，讓「溫差」不只是數字
      const diff = T - env;
      const barX = tx + 26, barY = by + 22, barW = Math.max(0, Math.min(W - barX - 24, diff * 2.4));
      D.text(ctx, "溫差 ΔT = " + diff.toFixed(1) + " °C", barX, barY - 6, { color: PL.col("text-dim"), size: 11 });
      D.rect(ctx, barX, barY, barW, 12, { fill: MC(), r: 6 });
      PL.ui.caption(cv, "散熱速率 ∝ ΔT，所以溫差越小、降得越慢。");

      D.text(ctx, "t = " + t.toFixed(0) + " s", 16, H - 16, { color: PL.col("text-faint"), size: 11 });
    }

    const anim = PL.loop(dt => {
      if (dt && running && t < 300) {
        t += dt * 12;                                   // 加速 12 倍，5 分鐘的實驗 25 秒看完
        curve.push([t, temperature(t)]);
        if (curve.length > 1200) curve.shift();
      }
      draw();
      const env = sEnv.get(), T = temperature(t);
      rT.set(T, 1);
      rDiff.set(T - env, 1);
      rHalf.set(Math.log(2) / sK.get(), 0);
      const fit = drawCharts();
      rFit.set(fit ? Math.abs(fit.slope).toFixed(4) : "資料累積中");
    }, 40);

    [sT0, sEnv, sK].forEach(s => s.el.addEventListener("input", reset));
    cv.onResize(draw); rawChart.onResize(drawCharts); logChart.onResize(drawCharts);
    anim.start();
    return {
      stop() { anim.stop(); cv.destroy(); rawChart.destroy(); logChart.destroy(); },
      rerender() { draw(); drawCharts(); }
    };
  }});

  /* ==================================================================
     模組九 · 凸透鏡成像規律（1/v – 1/u 作圖求焦距）
     ================================================================== */
  PL.register("lens-focal-measurement", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    const F_TRUE = 0.15;             // 公尺；學生要量出來的焦距

    PL.ui.section(L.controls, "光具座");
    const sU = PL.ui.slider(L.controls, { label: "物距 u（物到透鏡）", min: 0.18, max: 0.80, step: 0.02, value: 0.30, unit: "m", digits: 2 });
    const cErr = PL.ui.checkbox(L.controls, { label: "加入對焦誤差（±2 mm）", checked: true });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "對焦並記錄", () => record(), { primary: true });
    PL.ui.button(row, "清除資料", () => { panel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "物距越靠近焦距，像距衝得越遠、像也越大——這就是投影機要把布幕拉遠的原因。" +
      "把 1/u 與 1/v 畫成圖後會得到一條斜率 −1 的直線，兩軸截距都是 1/f。");

    const rV = PL.ui.readout(L.readouts, { label: "像距 v", unit: "m" });
    const rMag = PL.ui.readout(L.readouts, { label: "放大率 |v/u|" });
    const rF = PL.ui.readout(L.readouts, { label: "量得焦距 f", unit: "m" });
    const rSlope = PL.ui.readout(L.readouts, { label: "直線斜率（理論 −1）" });

    const panel = fitPanel(root, {
      title: "1/v – 1/u 關係圖", xLabel: "1/u (1/m)", yLabel: "1/v (1/m)", xMax: 6, yMax: 6, xTolerance: 0.05,
      cap: "由 1/u + 1/v = 1/f 可得 1/v = −1/u + 1/f：斜率應為 −1，縱軸截距即 1/f。"
    });

    // 成像公式；對焦誤差加在像距上（實際實驗中就是螢幕位置抓不準）
    function imageDistance(u) {
      const v = 1 / (1 / F_TRUE - 1 / u);
      return cErr.get() ? v + jitter(u * 1000, 0.002) : v;
    }

    function record() { const u = sU.get(); panel.add(1 / u, 1 / imageDistance(u)); refresh(); }

    function refresh() {
      const u = sU.get(), v = imageDistance(u);
      rV.set(v, 3); rMag.set(Math.abs(v / u), 2);
      const fit = panel.draw([1 / u, 1 / v]);
      if (fit) {
        rSlope.set(fit.slope, 2);
        rF.set(fit.intercept > 0 ? (1 / fit.intercept).toFixed(3) : "資料不足");
      } else { rSlope.set("—"); rF.set("至少 2 筆"); }
    }

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const u = sU.get(), v = imageDistance(u);
      const axisY = H * 0.5;
      const lensX = W * 0.42;
      const scale = Math.min((lensX - 60) / 0.85, (W - lensX - 60) / Math.max(0.35, v));
      cv.calibrate(scale, "m");   // 可自己量物距與像距，不必只信讀數

      // 光具座軌道
      D.rect(ctx, 24, axisY + 62, W - 48, 8, { fill: PL.theme.pale(0.12), r: 4 });
      D.line(ctx, 24, axisY, W - 24, axisY, PL.theme.pale(0.22), 1, [5, 4]);

      // 透鏡
      ctx.save();
      ctx.strokeStyle = MC(); ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(lensX, axisY, 11, 56, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "rgba(120,190,220,0.16)"; ctx.fill();
      ctx.restore();
      D.text(ctx, "凸透鏡", lensX, axisY + 84, { color: MC(), size: 11, align: "center" });

      // 焦點
      [-1, 1].forEach(s => {
        const fx = lensX + s * F_TRUE * scale;
        D.disc(ctx, fx, axisY, 3.5, { fill: PL.col("warn") });
        D.text(ctx, s < 0 ? "F" : "F′", fx, axisY - 8, { color: PL.col("warn"), size: 11, align: "center" });
      });

      // 物體（向上的箭頭）
      const objX = lensX - u * scale, objH = 42;
      D.arrow(ctx, objX, axisY, objX, axisY - objH, { color: PL.col("accent-2"), width: 3, head: 10 });
      D.text(ctx, "物體", objX, axisY + 20, { color: PL.col("accent-2"), size: 11, align: "center" });

      // 像（倒立實像），高度依放大率縮放
      const imgX = lensX + v * scale, imgH = objH * (v / u);
      const onScreen = imgX < W - 26;
      if (onScreen) {
        D.arrow(ctx, imgX, axisY, imgX, axisY + imgH, { color: PL.col("ok"), width: 3, head: 10 });
        D.text(ctx, "倒立實像", imgX, axisY - 10, { color: PL.col("ok"), size: 11, align: "center" });
        // 白色紙屏
        D.rect(ctx, imgX - 3, axisY - 62, 6, 124, { fill: PL.theme.pale(0.3) });
        // 三條特徵光線：平行→過焦點、過中心→不偏折
        D.line(ctx, objX, axisY - objH, lensX, axisY - objH, PL.col("warn"), 1.4);
        D.line(ctx, lensX, axisY - objH, imgX, axisY + imgH, PL.col("warn"), 1.4);
        D.line(ctx, objX, axisY - objH, imgX, axisY + imgH, PL.theme.pale(0.35), 1.2, [4, 3]);
      } else {
        D.text(ctx, "像距太遠，紙屏已經超出光具座", lensX + 40, axisY - 40, { color: PL.col("danger"), size: 12 });
      }

      // 距離標示
      D.arrow(ctx, objX, axisY + 44, lensX, axisY + 44, { color: PL.col("text-faint"), width: 1.2, head: 6 });
      D.text(ctx, "u = " + u.toFixed(2) + " m", (objX + lensX) / 2, axisY + 40, { color: PL.col("text-dim"), size: 11, align: "center" });
      if (onScreen) {
        D.arrow(ctx, lensX, axisY + 44, imgX, axisY + 44, { color: PL.col("text-faint"), width: 1.2, head: 6 });
        D.text(ctx, "v = " + v.toFixed(2) + " m", (lensX + imgX) / 2, axisY + 40, { color: PL.col("text-dim"), size: 11, align: "center" });
      }
    }

    const anim = PL.loop(() => draw(), 30);
    sU.el.addEventListener("input", refresh);
    cErr.el.addEventListener("change", refresh);
    cv.onResize(draw); panel.chart.onResize(refresh);
    refresh(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); panel.chart.destroy(); }, rerender() { draw(); refresh(); } };
  }});

  /* ==================================================================
     模組八 · 共鳴管測聲速
     ================================================================== */
  PL.register("resonance-tube-sound-speed", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const V_TRUE = 343;              // 25 °C 空氣中的聲速
    const TUBE_R = 0.02;             // 管半徑，用於端點修正
    let t = 0;

    PL.ui.section(L.controls, "音叉與水位");
    const sF = PL.ui.slider(L.controls, { label: "音叉頻率 f", min: 256, max: 1024, step: 32, value: 512, unit: "Hz", digits: 0 });
    const sLen = PL.ui.slider(L.controls, { label: "空氣柱長度 L（調水位）", min: 0.05, max: 0.60, step: 0.005, value: 0.16, unit: "m", digits: 3 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "自動找到第一共鳴點", () => { sLen.set(firstResonance()); refresh(); }, { primary: true });
    PL.ui.button(row, "記錄這個共鳴點", () => record());
    PL.ui.button(row, "清除資料", () => { panel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "慢慢調水位，聲音最大的位置就是共鳴點。換 5 種音叉各記錄一次，" +
      "L 對 1/f 會連成直線，斜率乘以 4 就是聲速——不必真的去追一個跑掉的聲波。");

    const rLoud = PL.ui.readout(L.readouts, { label: "共鳴強度", unit: "%" });
    const rFirst = PL.ui.readout(L.readouts, { label: "理論第一共鳴長", unit: "m" });
    const rSlope = PL.ui.readout(L.readouts, { label: "L–1/f 斜率", unit: "m·Hz" });
    const rV = PL.ui.readout(L.readouts, { label: "量得聲速 v = 4×斜率", unit: "m/s" });

    const panel = fitPanel(root, {
      title: "L – 1/f 關係圖", xLabel: "1/f (s)", yLabel: "L (m)", xMax: 0.004, yMax: 0.4, xTolerance: 1e-5,
      cap: "一端開口的空氣柱第一共鳴為 L + 0.6r = v/(4f)，因此 L 對 1/f 是直線，斜率 = v/4。"
    });

    // 第一共鳴（基音）所需的空氣柱長度，含端點修正
    const firstResonance = () => V_TRUE / (4 * sF.get()) - 0.6 * TUBE_R;

    // 距離共鳴點越近，聲音越大；用高斯型描述共鳴峰
    function loudness() {
      const d = sLen.get() - firstResonance();
      return Math.exp(-Math.pow(d / 0.012, 2));
    }

    function record() {
      const f = sF.get();
      // 用「耳朵判斷最大聲」的位置，本身就有幾 mm 的不確定度
      panel.add(1 / f, firstResonance() + jitter(f, 0.003));
      refresh();
    }

    function refresh() {
      rLoud.set(loudness() * 100, 0);
      rFirst.set(firstResonance(), 3);
      const fit = panel.draw([1 / sF.get(), sLen.get()]);
      if (fit && fit.slope > 0) {
        rSlope.set(fit.slope, 1);
        rV.set(4 * fit.slope, 1);
      } else { rSlope.set("—"); rV.set("至少 2 筆"); }
    }

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const f = sF.get(), Lm = sLen.get(), loud = loudness();
      const tubeX = W * 0.30, tubeW = 66;
      const top = 40, bottom = H - 40, span = bottom - top;
      const scale = span / 0.62;                        // 0.62 m 對應整支管子
      cv.calibrate(scale, "m");   // 可自己量空氣柱長度，對照理論共鳴長
      const waterY = top + Lm * scale;

      // 管壁與水柱
      D.rect(ctx, tubeX, top, tubeW, span, { fill: PL.theme.pale(0.05), stroke: PL.col("text-faint"), width: 2, r: 4 });
      D.rect(ctx, tubeX + 3, waterY, tubeW - 6, bottom - waterY - 3, { fill: "rgba(70,150,215,0.55)", r: 3 });
      D.text(ctx, "水位", tubeX + tubeW + 10, waterY + 4, { color: PL.col("accent-2"), size: 11 });

      // 空氣柱長度標示
      D.arrow(ctx, tubeX - 20, top, tubeX - 20, waterY, { color: PL.col("accent-2"), width: 1.5, head: 7 });
      D.text(ctx, "L = " + Lm.toFixed(3) + " m", tubeX - 26, (top + waterY) / 2, { color: PL.col("accent-2"), size: 12, align: "right" });

      // 管內駐波：開口是波腹、水面是波節
      ctx.save();
      ctx.strokeStyle = MC(); ctx.lineWidth = 2; ctx.globalAlpha = 0.35 + loud * 0.65;
      ctx.beginPath();
      const amp = (tubeW / 2 - 8) * (0.35 + loud * 0.65) * Math.cos(TAU * 6 * t);
      for (let y = top; y <= waterY; y += 2) {
        const phase = (waterY - y) / (waterY - top) * (Math.PI / 2);
        const x = tubeX + tubeW / 2 + Math.sin(phase) * amp;
        y === top ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1; ctx.restore();
      D.text(ctx, "波腹", tubeX + tubeW + 10, top + 12, { color: MC(), size: 10 });
      D.text(ctx, "波節", tubeX + tubeW + 10, waterY - 8, { color: MC(), size: 10 });

      // 音叉：振動幅度固定，聲音大小由共鳴決定
      const forkX = tubeX + tubeW / 2, forkY = top - 22;
      const wob = Math.sin(TAU * 8 * t) * 3;
      D.line(ctx, forkX - 9 + wob, forkY - 24, forkX - 9 + wob, forkY, PL.col("text-dim"), 3);
      D.line(ctx, forkX + 9 - wob, forkY - 24, forkX + 9 - wob, forkY, PL.col("text-dim"), 3);
      D.line(ctx, forkX, forkY, forkX, forkY + 12, PL.col("text-dim"), 3);
      D.text(ctx, f + " Hz", forkX + 24, forkY - 8, { color: PL.col("text-dim"), size: 11 });

      // 音量計：共鳴時衝到滿格，是最直觀的「找到了」訊號
      const mX = W - 150, mY = 60, mW = 118, mH = 16;
      D.text(ctx, "耳朵聽到的音量", mX, mY - 10, { color: PL.col("text-faint"), size: 11 });
      D.rect(ctx, mX, mY, mW, mH, { fill: PL.theme.pale(0.10), stroke: PL.theme.pale(0.22), r: 8 });
      const barColor = loud > 0.85 ? PL.col("ok") : (loud > 0.4 ? PL.col("warn") : PL.col("text-faint"));
      D.rect(ctx, mX + 2, mY + 2, (mW - 4) * loud, mH - 4, { fill: barColor, r: 6 });
      D.text(ctx, loud > 0.85 ? "共鳴！這裡最大聲" : (loud > 0.4 ? "接近共鳴，再微調" : "還沒共鳴"),
        mX, mY + 36, { color: barColor, size: 12, weight: "700" });
      D.text(ctx, "理論共鳴長 " + firstResonance().toFixed(3) + " m", mX, mY + 58, { color: PL.col("text-faint"), size: 11 });
    }

    const anim = PL.loop(dt => { if (dt) t += dt; draw(); }, 45);
    [sF, sLen].forEach(s => s.el.addEventListener("input", refresh));
    cv.onResize(draw); panel.chart.onResize(refresh);
    refresh(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); panel.chart.destroy(); }, rerender() { draw(); refresh(); } };
  }});

})();
