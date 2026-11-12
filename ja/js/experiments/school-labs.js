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
  // AP.thermometer 液柱頂端的位置與反算（球泡半徑 0.85w，液柱底在球心上方 0.4 個半徑）：把手抓液柱頂上下拖
  const thY = (yT, yB, w, f) => { const b = yB - 1.19 * w; return yT + (b - yT) * (1 - PL.clamp(f, 0, 1)); };
  const thF = (yT, yB, w, y) => { const b = yB - 1.19 * w; return (b - y) / (b - yT); };

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
          D.text(ctx, "「1 回記録」を押すとデータがたまりはじめます", chart.W / 2, chart.H / 2,
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
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const G_TRUE = 9.80;
    let t = 0, swings = 0, lastSign = 1;

    PL.ui.section(L.controls, "実験の設定");
    const sL = PL.ui.slider(L.controls, { label: "振り子の長さ L（つるした点から球の中心まで）", min: 0.20, max: 1.60, step: 0.05, value: 0.40, unit: "m", digits: 2 });
    const sN = PL.ui.stepper(L.controls, { label: "1 回に測る往復の数 n", min: 5, max: 50, step: 5, value: 20 });
    const cErr = PL.ui.checkbox(L.controls, { label: "時間を測るときの反応の誤差を入れる（±0.2 s）", checked: true });
    const row = PL.ui.buttonRow(L.controls);
    const bRec = PL.ui.button(row, "1 回記録", () => record(), { primary: true });
    PL.ui.button(row, "データを消す", () => { panel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "教科書に「n 回の往復を測って n でわる」とあるのは、ストップウォッチを押すときの反応の誤差を小さくするためです。" +
      "上の回数を 5 から 50 に変えて、データの点がばらばらな状態から 1 本の線になっていく様子を見ます。");

    // 把手抓擺錘：離懸點多遠就是擺長（改擺長會從頭計時）
    let pg = { x: 0, y: 0, k: 1 };
    const grip = PL.ui.handle(cv, { slider: sL, label: "おもり（上下に引いて振り子の長さを変える）", toValue: (x, y) => Math.hypot(x - pg.x, y - pg.y) / pg.k });
    const rT = PL.ui.readout(L.readouts, { label: "今回の周期 T", unit: "s" });
    const rSlope = PL.ui.readout(L.readouts, { label: "T²–L の傾き", unit: "s²/m" });
    const rG = PL.ui.readout(L.readouts, { label: "求めた g = 4π²/傾き", unit: "m/s²" });
    const rErr = PL.ui.readout(L.readouts, { label: "9.80 との差", unit: "%" });

    const panel = fitPanel(root, {
      title: "T² – L グラフ", xLabel: "L (m)", yLabel: "T² (s²)", xMax: 1.6, yMax: 6.5, xTolerance: 0.01,
      cap: "理論上 T² = (4π²/g)·L は原点を通ります。傾きが正確なほど、求めた g は 9.80 m/s² に近くなります。"
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
        rSlope.set("—"); rG.set("2 回以上"); rErr.set("—");
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

      // 支架：鐵架直柱 + 橫桿夾頭。擺長是從夾頭量到球心，架子畫出來這件事就自己解釋了
      const AP = PL.apparatus;
      AP.benchTop(ctx, W, H, H - 22);
      AP.standRod(ctx, pivotX - 118, H - 20, pivotY - 26);
      AP.crossArm(ctx, pivotX - 118, pivotY - 16, pivotX);
      // 鉛直參考線與擺線
      D.line(ctx, pivotX, pivotY, pivotX, pivotY + len, PL.theme.pale(0.18), 1, [4, 4]);
      AP.cord(ctx, pivotX, pivotY, bobX, bobY);
      AP.bob(ctx, bobX, bobY, 13);
      pg = { x: pivotX, y: pivotY, k: scale }; grip.place(bobX, bobY);

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
      D.text(ctx, "測る区間：" + Math.floor(swings) + " / " + nTarget + " 回の往復",
        gxs, gys - 8, { color: PL.col("text-dim"), size: 10.5 });
      for (let i = 0; i < nTarget; i += 1) {
        const done = i < Math.floor(swings);
        D.rect(ctx, gxs + i * cellW, gys, Math.max(2, cellW - 2), 9,
          { fill: done ? MC() : PL.theme.pale(0.10), r: 2 });
      }

      // 碼錶
      const boxW = 132, boxX = W - boxW - 16, boxY = 16;
      if (AP.stopwatch) {
        AP.stopwatch(ctx, boxX + 28, boxY + 28, 22);
        D.text(ctx, "往復の回数の合計", boxX + 56, boxY + 18, { color: PL.col("text-faint"), size: 10 });
        D.text(ctx, Math.floor(swings) + " / " + sN.get() + " 回", boxX + 56, boxY + 40, { color: MC(), size: 16, weight: "700" });
      } else {
        D.rect(ctx, boxX, boxY, boxW, 54, { fill: PL.theme.shade(0.45), stroke: PL.theme.pale(0.25), r: 6 });
        D.text(ctx, "往復の回数の合計", boxX + 10, boxY + 19, { color: PL.col("text-faint"), size: 10 });
        D.text(ctx, Math.floor(swings) + " / " + sN.get() + " 回", boxX + 10, boxY + 40, { color: MC(), size: 17, weight: "700" });
      }

      PL.ui.caption(cv, "振れが小さい（ここでは 8°）とき T = 2π√(L/g) で、おもりの質量にも振幅にも関係しません。");
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
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const K_TRUE = 24;              // N/m，學生要求出來的目標
    let t = 0;

    PL.ui.section(L.controls, "つるす質量");
    const sM = PL.ui.slider(L.controls, { label: "おもりの質量 m", min: 0.10, max: 1.00, step: 0.05, value: 0.30, unit: "kg", digits: 2 });
    const cErr = PL.ui.checkbox(L.controls, { label: "時間を測るときの誤差を入れる", checked: true });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "1 回記録", () => record(), { primary: true });
    PL.ui.button(row, "データを消す", () => { panel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "同じばねの k は 2 つの方法で求められます。おもりをつるして伸びを測る静的な方法（フックの法則）と、" +
      "周期を測る動的な方法です。画面には 2 つの結果が同時に出るので、たがいに確かめ合えます。");

    // 把手抓左邊（靜態）那顆砝碼：往下拉到哪，就換成伸長到那裡所需的質量
    let sg = { y0: 0, k: 1 };
    const grip = PL.ui.handle(cv, { slider: sM, label: "おもり（下に引く＝重くする）", toValue: (x, y) => (y - sg.y0) / sg.k });
    const rT = PL.ui.readout(L.readouts, { label: "周期 T", unit: "s" });
    const rX = PL.ui.readout(L.readouts, { label: "静的な伸び x", unit: "cm" });
    const rKs = PL.ui.readout(L.readouts, { label: "静的な方法 k = mg/x", unit: "N/m" });
    const rKd = PL.ui.readout(L.readouts, { label: "動的な方法 k = 4π²/傾き", unit: "N/m" });

    const panel = fitPanel(root, {
      title: "T² – m グラフ", xLabel: "m (kg)", yLabel: "T² (s²)", xMax: 1.0, yMax: 1.8, xTolerance: 0.01,
      cap: "T² = (4π²/k)·m。傾きが大きいほどばねはやわらかく、傾きからばね定数 k が求められます。"
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
      else rKd.set("2 回以上");
    }

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const m = sM.get(), w = Math.sqrt(K_TRUE / m);
      const natural = 90, stretch = m * 9.8 / K_TRUE * 260;   // 靜態伸長（像素）
      const amp = 26, dy = amp * Math.cos(w * t);

      const topY = 44;
      const AP = PL.apparatus;
      AP.benchTop(ctx, W, H, H - 22);
      // 左：靜態量伸長；右：動態量週期。並排讓兩種方法的關係一眼看清。
      [{ x: W * 0.32, moving: false, tag: "静的：おもりをつるして伸びを測る" },
       { x: W * 0.68, moving: true, tag: "動的：引いてはなし周期を測る" }].forEach(col => {
        const offset = col.moving ? dy : 0;
        const bottom = topY + natural + stretch + offset;
        // 兩座鐵架並排：同一根彈簧、同一顆砝碼，只差在量的方式
        AP.standRod(ctx, col.x - 74, H - 20, topY - 22);
        AP.crossArm(ctx, col.x - 74, topY - 12, col.x);
        if (AP.clampHead) AP.clampHead(ctx, col.x, topY - 4, 16, 0);
        D.spring(ctx, col.x, topY, col.x, bottom, 9, 11, MC());
        AP.weight(ctx, col.x, bottom, 44, 30, m.toFixed(2) + " kg");
        if (!col.moving) { sg = { y0: topY + natural + 15, k: 9.8 / K_TRUE * 260 }; grip.place(col.x, bottom + 15); }
        D.text(ctx, col.tag, col.x, H - 30, { color: PL.col("text-faint"), size: 11, align: "center" });

        if (!col.moving) {
          // 自然長度基準線與伸長量標示
          D.line(ctx, col.x - 66, topY + natural, col.x + 60, topY + natural, PL.theme.pale(0.22), 1, [4, 4]);
          D.text(ctx, "自然の長さ", col.x - 68, topY + natural - 5, { color: PL.col("text-faint"), size: 10, align: "right" });
          D.arrow(ctx, col.x - 62, topY + natural, col.x - 62, bottom, { color: PL.col("accent-2"), width: 1.5, head: 6 });
          D.text(ctx, "x=" + (stretch / 260 * 100).toFixed(1) + "cm", col.x - 58, (topY + natural + bottom) / 2,
            { color: PL.col("accent-2"), size: 11 });
        } else {
          D.line(ctx, col.x - 52, topY + natural + stretch, col.x + 52, topY + natural + stretch, PL.theme.pale(0.22), 1, [4, 4]);
          D.text(ctx, "つり合いの位置", col.x + 56, topY + natural + stretch + 4, { color: PL.col("text-faint"), size: 10 });
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
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const SURFACES = {
      wood: { label: "木片 / 木の板", mu: 0.42 },
      rubber: { label: "ゴム / 木の板", mu: 0.72 },
      steel: { label: "鋼のかたまり / 鋼板", mu: 0.24 },
      teflon: { label: "テフロン / 鋼板", mu: 0.08 }
    };
    let angle = 0, sliding = false, slideS = 0, key = "wood", held = false, rg = null;

    PL.ui.section(L.controls, "ふれ合う面と荷重");
    PL.ui.select(L.controls, {
      label: "ふれ合う面の組み合わせ",
      options: Object.entries(SURFACES).map(([value, s]) => ({ value, label: s.label })),
      value: "wood",
      onChange: v => { key = v; angle = 0; sliding = false; slideS = 0; panel.clear(); refresh(); }
    });
    const sM = PL.ui.slider(L.controls, { label: "木片の質量 m", min: 0.2, max: 2.0, step: 0.2, value: 0.6, unit: "kg", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "すべるまでゆっくり持ち上げる", () => { angle = 0; sliding = false; slideS = 0; }, { primary: true });
    PL.ui.button(row, "今回の摩擦角を記録", () => record());
    PL.ui.button(row, "データを消す", () => { panel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "質量を 0.2 kg から 2.0 kg まで変えて 1 回ずつ記録すると、データの点が水平な線に並びます。" +
      "この平らな線が、実験で示したい結論です。静止摩擦係数は物体の重さに関係しません。");

    /*
     * 把手抓斜面木板的上端：學生自己用手慢慢抬，超過臨界角木塊就開始滑（播放時才會滑下去）；
     * 放低到臨界角以下，木塊放回原位。抓著的時候自動抬升暫停。
     */
    const grip = PL.ui.handle(cv, { label: "斜面の板（上下に引いて傾きを変える）",
      onGrab: () => { held = true; }, onRelease: () => { held = false; },
      onDrag: (x, y) => {
        if (!rg) return;
        angle = PL.clamp(Math.atan2(rg.y - y, x - rg.x) * 180 / Math.PI, 0, 45);
        if (angle < criticalAngle()) { sliding = false; slideS = 0; } else sliding = true;
        rAngle.set(angle, 1); draw();
      } });
    const rAngle = PL.ui.readout(L.readouts, { label: "いまの傾きの角 θ", unit: "°" });
    const rCrit = PL.ui.readout(L.readouts, { label: "臨界角 θc", unit: "°" });
    const rMu = PL.ui.readout(L.readouts, { label: "μs = tan θc" });
    const rAvg = PL.ui.readout(L.readouts, { label: "何回かの平均 μs" });

    const panel = fitPanel(root, {
      title: "μs – 質量グラフ", xLabel: "m (kg)", yLabel: "μs = tan θc", xMax: 2.2, yMax: 0.9, xTolerance: 0.05,
      cap: "理論上は水平な線になるはずです。傾き≈0 は、静止摩擦係数が質量で変わらず、2 つの面の材質だけで決まることを表します。"
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
      rAvg.set(avg == null ? "まだ記録していない" : avg.toFixed(3));
      panel.draw();
    }

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const thc = criticalAngle(), rad = angle * Math.PI / 180;
      const baseX = 54, baseY = H - 58, run = W - 150;
      const tipY = baseY - run * Math.tan(rad);

      // 斜面本體：一端鉸接在桌上、慢慢抬起的木板
      const AP = PL.apparatus;
      AP.benchTop(ctx, W, H, baseY + 6);
      AP.ramp(ctx, baseX, baseY, run / Math.cos(rad), rad);
      AP.brassDisc(ctx, baseX, baseY + 2, 5);
      const gd = Math.min(run / Math.cos(rad) * 0.9, (baseY - 24) / Math.max(Math.sin(rad), 1e-6));
      rg = { x: baseX, y: baseY }; grip.place(baseX + gd * Math.cos(rad), baseY - gd * Math.sin(rad));

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
      ctx.restore();
      AP.massBlock(ctx, bx, by, bw, bh, { color: MC(), label: sM.get().toFixed(1) + "kg", ang: -rad, noShadow: true });

      // 狀態徽章：靜止 / 剛好要滑 / 滑動
      const state = sliding ? "すべっている" : (angle >= thc - 0.4 ? "すべり出しそう" : "静止（静止摩擦力が足りている）");
      const stateColor = sliding ? PL.col("danger") : (angle >= thc - 0.4 ? PL.col("warn") : PL.col("ok"));
      D.rect(ctx, 14, 14, 190, 30, { fill: PL.theme.shade(0.45), stroke: stateColor, r: 6 });
      D.text(ctx, state, 24, 34, { color: stateColor, size: 13, weight: "700" });

      D.text(ctx, "臨界角 θc = " + thc.toFixed(1) + "° ， μs = tan θc = " + SURFACES[key].mu.toFixed(2),
        14, H - 20, { color: PL.col("text-faint"), size: 11 });
    }

    const anim = PL.loop(dt => {
      if (dt) {
        const thc = criticalAngle();
        if (!held && !sliding && angle < thc) { angle = Math.min(thc, angle + dt * 7); }        // 緩慢抬升
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
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    const MATERIALS = {
      copper: { label: "銅", rho: 1.68e-8, color: "#e08a4a" },
      aluminum: { label: "アルミニウム", rho: 2.65e-8, color: "#b8c3cf" },
      iron: { label: "鉄", rho: 9.71e-8, color: "#8d9099" },
      nichrome: { label: "ニクロム（電熱線）", rho: 1.10e-6, color: "#c4707a" }
    };
    let key = "nichrome";

    PL.ui.section(L.controls, "導線の規格");
    PL.ui.select(L.controls, {
      label: "材質", value: key,
      options: Object.entries(MATERIALS).map(([value, m]) => ({ value, label: m.label })),
      onChange: v => { key = v; panel.clear(); draw(); refresh(); }
    });
    const sLen = PL.ui.slider(L.controls, { label: "導線の長さ ℓ", min: 0.2, max: 2.0, step: 0.1, value: 1.0, unit: "m", digits: 1 });
    const sD = PL.ui.slider(L.controls, { label: "導線の直径 d", min: 0.2, max: 1.2, step: 0.1, value: 0.5, unit: "mm", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "1 回記録", () => record(), { primary: true });
    PL.ui.button(row, "データを消す", () => { panel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "まず直径を固定して長さだけを変え、4〜5 回記録します。次に長さを固定して直径だけを変えます。" +
      "横軸で ℓ と A をまとめて ℓ/A にしているので、2 組のデータはどちらも原点を通る同じ直線にのります。");

    const rArea = PL.ui.readout(L.readouts, { label: "断面積 A", unit: "mm²" });
    const rR = PL.ui.readout(L.readouts, { label: "抵抗計の読み R", unit: "Ω" });
    const rRho = PL.ui.readout(L.readouts, { label: "求めた ρ（傾き）", unit: "Ω·m" });
    const rErr = PL.ui.readout(L.readouts, { label: "理論値とのずれ", unit: "%" });

    const panel = fitPanel(root, {
      title: "R – ℓ/A グラフ", xLabel: "ℓ/A (1/m)", yLabel: "R (Ω)", xTolerance: 1e4,
      cap: "R = ρ·(ℓ/A)。導線をのばしても細くしても、ℓ/A が同じなら抵抗は同じです。傾きが抵抗率 ρ です。"
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
      } else { rRho.set("2 回以上"); rErr.set("—"); }
    }

    /*
     * 動態：歐姆檔量電阻時，電表送出一個固定的小測試電流 I 穿過導線。
     * 電荷的漂移速率 v = I / (n·e·A)：同一種材質、同樣的電流，截面積越大走得越慢——
     * 把直徑加倍，導線裡的亮點就慢成四分之一；探棒導線粗細不變，亮點速率始終一樣。
     * 這也是 R ∝ 1/A 的直觀圖像：同樣的電流分散在更寬的通道裡，電荷不必「擠著跑」。
     * 長度只改變電荷要走的路有多長（R ∝ ℓ），漂移速率不變。
     */
    const DRIFT_K = 60 * 0.5 * 0.5;               // d = 0.5 mm 時漂移 60 px/s（v ∝ 1/d²）
    const LEAD_V = 60;                            // 探棒導線上的速率（截面固定）
    let sWire = 0, sLead = 0;
    const driftV = () => Math.min(400, DRIFT_K / (sD.get() * sD.get()));
    let geo = { x0: 70, span: 1 };
    // 把手抓右端的鱷魚夾：夾在導線上的位置決定接入電路的長度 ℓ
    const grip = PL.ui.handle(cv, { slider: sLen, label: "右端のクリップ（導線の長さ ℓ）", toValue: x => (x - geo.x0) / geo.span * 2.0 });

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const mat = MATERIALS[key];
      const x0 = 70, x1 = x0 + (W - 210) * (sLen.get() / 2.0);      // 長度直接對應畫面長度
      geo = { x0, span: W - 210 };
      cv.calibrate((W - 210) / 2.0, "m");   // 尺可直接量導線長度
      const y = H * 0.46;
      const thick = 3 + sD.get() * 7;                                // 直徑直接對應線粗

      // 俯視的實驗桌：待測導線拉直、兩端鎖在黃銅接線座上
      const AP = PL.apparatus;
      AP.deskTop(ctx, 0, 0, W, H);
      [x0 - 14, x1].forEach(cx0 => { AP.brass(ctx, cx0, y - 16, 14, 32); AP.brassDisc(ctx, cx0 + 7, y - 9, 3.5); AP.brassDisc(ctx, cx0 + 7, y + 9, 3.5); });
      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = thick; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x0, y + 2); ctx.lineTo(x1, y + 2); ctx.stroke();
      ctx.strokeStyle = mat.color; ctx.lineWidth = thick;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = Math.max(1, thick * 0.3);
      ctx.beginPath(); ctx.moveTo(x0, y - thick * 0.2); ctx.lineTo(x1, y - thick * 0.2); ctx.stroke();
      ctx.restore();

      ruler(ctx, x0, y + 34, x1 - x0, "ℓ = " + sLen.get().toFixed(1) + " m");
      D.text(ctx, "d = " + sD.get().toFixed(1) + " mm", (x0 + x1) / 2, y - thick / 2 - 12,
        { color: PL.col("accent-2"), size: 12, align: "center" });

      // 三用電表（歐姆檔）：紅黑探棒夾在導線兩端
      const mW = 104, mH = 128, mX = W - mW - 16, mY = 12;
      const jacks = AP.multimeter(ctx, mX, mY, mW, mH, PL.fmt(resistance(), 2), { unit: "Ω" });
      AP.cable(ctx, [jacks.red, { x: jacks.red.x, y: mY + mH + 30 }, { x: x1 + 7, y: y + 9 }], "rgb(200,44,40)", 2.6, 0);
      // 黑探棒繞到導線下方再接左端，不和待測導線疊在一起（否則分不清哪條線上的電荷在走）
      const low = y + 96;
      const blackPath = [jacks.black, { x: jacks.black.x, y: low }, { x: x0 - 7, y: low }, { x: x0 - 7, y: y + 9 }];
      AP.cable(ctx, blackPath, "rgb(30,32,36)", 2.6, 0);
      // 測試電流：紅探棒 → 右端 → 沿導線往左 → 左端 → 黑探棒
      const dot = PL.theme.isLight() ? "#fff06a" : "#fff4c2";
      PL.motion.flow(ctx, [[jacks.red.x, jacks.red.y], [jacks.red.x, mY + mH + 30], [x1 + 7, y + 9]], sLead, { gap: 22, r: 2.2, color: dot, glow: 5 });
      PL.motion.flow(ctx, blackPath.slice().reverse(), sLead, { gap: 22, r: 2.2, color: dot, glow: 5 });
      PL.motion.flow(ctx, [[x1, y], [x0, y]], sWire, { gap: 16, r: Math.min(2.6, 1.2 + thick * 0.18), color: dot, glow: 5 });
      D.text(ctx, "導線の中の電荷の流れる速さ ∝ 1/A（同じ試験電流のとき）", x0, y + 74, { color: PL.col("text-dim"), size: 10.5 });
      // 右端鱷魚夾：夾在導線上，拖曳即改變接入長度
      grip.place(x1 + 7, y);

      // 放左上角：左下角會被「可直接拖曳」提示蓋住
      D.text(ctx, mat.label + "：ρ = " + mat.rho.toExponential(2) + " Ω·m",
        16, 22, { color: PL.col("text-faint"), size: 11 });
    }

    const anim = PL.loop(dt => { if (dt) { sWire += driftV() * dt; sLead += LEAD_V * dt; } draw(); }, 30);
    // 暫停時拉滑桿也要立即重畫主畫面（迴圈停著時 draw 不會被呼叫）
    [sLen, sD].forEach(s => s.el.addEventListener("input", () => { draw(); refresh(); }));
    cv.onResize(() => draw()); panel.chart.onResize(refresh);
    refresh(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); panel.chart.destroy(); }, rerender() { draw(); refresh(); } };
  }});

  /* ==================================================================
     模組十 · 溫度對電阻的影響（金屬 vs 熱敏電阻）
     ================================================================== */
  PL.register("resistance-vs-temperature", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    const R0 = 100, ALPHA = 0.00393;        // 白金 Pt100：R = R0(1 + αΔT)
    const B = 3500, RT25 = 100;             // NTC 熱敏電阻：R = R25·exp(B(1/T − 1/298))

    PL.ui.section(L.controls, "湯せんの温度");
    const sT = PL.ui.slider(L.controls, { label: "温度 T", min: 0, max: 100, step: 5, value: 25, unit: "°C", digits: 0 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "1 回記録", () => record(), { primary: true });
    PL.ui.button(row, "データを消す", () => { metalPanel.records.length = 0; ntcPanel.records.length = 0; refresh(); });
    PL.ui.note(L.controls,
      "0 °C から 100 °C まで、10 °C ごとに 1 回記録します。金属の点は直線に並びます（温度とともに抵抗が上がる）が、" +
      "サーミスターは急に下に曲がるグラフになります。同じ温度差でも抵抗の変化がずっと大きいので、温度センサーに使えます。");

    let tg = null;
    const grip = PL.ui.handle(cv, { slider: sT, label: "温度計（上下に引いて水温を決める）", toValue: (x, y) => tg ? 100 * thF(tg[0], tg[1], 16, y) : sT.get() });
    const rMetal = PL.ui.readout(L.readouts, { label: "金属の抵抗", unit: "Ω" });
    const rNtc = PL.ui.readout(L.readouts, { label: "サーミスター", unit: "Ω" });
    const rAlpha = PL.ui.readout(L.readouts, { label: "求めた温度係数 α", unit: "/°C" });
    const rRatio = PL.ui.readout(L.readouts, { label: "サーミスター / 金属 の感度の比" });

    const metalR = T => R0 * (1 + ALPHA * (T - 0));
    const ntcR = T => RT25 * Math.exp(B * (1 / (T + 273.15) - 1 / 298.15));

    const charts = PL.ui.charts(root);
    // 兩張圖並排：同一組溫度、兩種元件，差異一目了然。
    const metalChart = PL.ui.chart(charts, {
      title: "金属（Pt100）：R – T", aspect: 0.62,
      cap: "R = R₀(1 + αT) は直線で、傾きは R₀α です。金属は温度が上がると結晶の格子の振動がはげしくなり、電子が散乱されやすくなるので、抵抗が上がります。"
    });
    const ntcChart = PL.ui.chart(charts, {
      title: "サーミスター（NTC）：R – T", aspect: 0.62,
      cap: "半導体は温度が上がるとキャリアが増えるので、抵抗はかえって急に下がります。だからグラフは直線ではなく、下に曲がります。"
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
        D.text(chart.ctx, "点線は理論のグラフ。「1 回記録」を押すと点をとりはじめる",
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
      if (fit && fit.intercept > 0) rAlpha.set(fit.slope / fit.intercept, 5); else rAlpha.set("2 回以上");
      // 靈敏度比：同樣升 1 °C，兩者電阻變化量的比值（取絕對值）
      const dm = Math.abs(metalR(T + 0.5) - metalR(T - 0.5));
      const dn = Math.abs(ntcR(T + 0.5) - ntcR(T - 0.5));
      rRatio.set(dm > 0 ? (dn / dm).toFixed(1) + " 倍" : "—");
    }

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const T = sT.get();
      const AP = PL.apparatus;
      const beakerX = 40, beakerW = W * 0.44;
      // 水浴放在電熱板上：溫度越高加熱盤越紅、水色越暖
      const warm = Math.max(0, Math.min(1, T / 100));
      const water = "rgb(" + Math.round(60 + warm * 170) + "," + Math.round(140 - warm * 90) + "," + Math.round(210 - warm * 150) + ")";
      AP.labRoom(ctx, W, H, H - 20, {});
      const plateTop = AP.hotPlate(ctx, beakerX + beakerW / 2, H - 20, beakerW + 24, warm);
      const beakerY = 46, beakerH = plateTop - beakerY;
      AP.beaker(ctx, beakerX + beakerW / 2, plateTop, beakerW, beakerH, (beakerH - 20) / beakerH, water);

      // 加熱時冒出的氣泡數量隨溫度增加
      const bubbles = Math.round(warm * 14);
      for (let i = 0; i < bubbles; i++) {
        const bx = beakerX + 16 + ((i * 53) % (beakerW - 32));
        const by = beakerY + beakerH - ((i * 37 + Date.now() / 22) % (beakerH - 40));
        D.disc(ctx, bx, by, 2 + (i % 3), { fill: "rgba(255,255,255,0.5)" });
      }

      // 溫度計
      const tx = beakerX + beakerW + 34;
      AP.thermometer(ctx, tx + 8, beakerY, beakerY + beakerH, 16, warm);
      tg = [beakerY, beakerY + beakerH]; grip.place(tx + 8, Math.max(thY(beakerY, beakerY + beakerH, 16, warm), beakerY + 10));
      const col = (beakerH - 30) * warm;
      D.text(ctx, T + " °C", tx + 26, beakerY + beakerH - 20 - col + 4, { color: PL.col("danger"), size: 14, weight: "700" });

      // 兩顆待測元件浸在水裡，各自顯示即時電阻
      const items = [
        { label: "金属 Pt100", value: metalR(T), color: PL.col("accent-2"), y: beakerY + beakerH * 0.35 },
        { label: "サーミスター NTC", value: ntcR(T), color: PL.col("accent-3"), y: beakerY + beakerH * 0.68 }
      ];
      items.forEach((item, k) => {
        // 感測元件吊在導線上浸入水中：Pt100 是金屬探棒、NTC 是黑色小珠
        ctx.strokeStyle = PL.theme.isLight() ? "rgba(40,44,52,0.8)" : "rgba(220,226,236,0.8)"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(beakerX + 49, beakerY - 16); ctx.lineTo(beakerX + 49, item.y - 12); ctx.stroke();
        if (k === 0) AP.steel(ctx, beakerX + 22, item.y - 8, 54, 16, 10);
        else { ctx.fillStyle = "rgb(30,32,36)"; ctx.beginPath(); ctx.ellipse(beakerX + 49, item.y, 10, 8, 0, 0, Math.PI * 2); ctx.fill(); }
        D.text(ctx, item.label, beakerX + 84, item.y - 2, { color: PL.col("text"), size: 11 });
        D.text(ctx, PL.fmt(item.value, 1) + " Ω", beakerX + 84, item.y + 12, { color: item.color, size: 12, weight: "700" });
      });

      PL.ui.caption(cv, "同じ湯せん、同じ温度でも、2 つの部品の反応はまったく違います。");
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
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.54);
    let t = 0, curve = [];

    PL.ui.section(L.controls, "はじめの条件");
    const sT0 = PL.ui.slider(L.controls, { label: "湯のはじめの温度 T₀", min: 40, max: 95, step: 5, value: 90, unit: "°C", digits: 0 });
    const sEnv = PL.ui.slider(L.controls, { label: "室温 T室温", min: 5, max: 35, step: 1, value: 25, unit: "°C", digits: 0 });
    const sK = PL.ui.slider(L.controls, { label: "冷えやすさ k（保温の具合）", min: 0.004, max: 0.05, step: 0.002, value: 0.016, unit: "1/s", digits: 3 });
    const row = PL.ui.buttonRow(L.controls);
    /* 播放／暫停一律交給引擎的傳輸列。實驗自己再維護一個 running 旗標的話，
       兩個開關必須同時打開才會動，而學生看不出來要按哪一個——這是實際回報過的問題。 */
    PL.ui.button(row, "やり直す", () => reset());
    PL.ui.note(L.controls,
      "冷えていくグラフはそのままだと曲がっていて、「速さ」が判断しにくいです。右下のグラフは縦軸を ln(T − T室温) にしたので直線になり、" +
      "傾きが −k です。指数の関係を「まっすぐ」にしてパラメータを読む、ふつうのやり方です。");

    /*
     * 兩個把手：溫度計液柱頂上下拖＝重新倒一杯這個溫度的熱水（從 t = 0 重來，不會自己開始播放）；
     * 保溫套外緣左右拖＝加厚或變薄（套子只有十幾 px 可動，改成相對拖曳，拖 150 px 走完整個量程）。
     */
    let ng = null, j0 = null;
    const gripT = PL.ui.handle(cv, { slider: sT0, label: "温度計（上下に引いて湯のはじめの温度を決める）", toValue: (x, y) => ng ? 5 + 95 * thF(ng[0], ng[1], 16, y) : sT0.get() });
    const gripK = PL.ui.handle(cv, { slider: sK, label: "保温カバー（外に引く＝厚くなり、冷えにくくなる）", onRelease: () => { j0 = null; },
      toValue: x => { if (!j0) j0 = { x, v: sK.get() }; return j0.v + (x - j0.x) / 150 * 0.046; } });
    const rT = PL.ui.readout(L.readouts, { label: "いまの水温", unit: "°C" });
    const rDiff = PL.ui.readout(L.readouts, { label: "室温との温度差", unit: "°C" });
    const rHalf = PL.ui.readout(L.readouts, { label: "温度差が半分になるまでの時間", unit: "s" });
    const rFit = PL.ui.readout(L.readouts, { label: "直線の傾きから求めた k", unit: "1/s" });

    const charts = PL.ui.charts(root);
    const rawChart = PL.ui.chart(charts, {
      title: "元のデータ：T – t の冷却曲線", aspect: 0.62,
      cap: "温度差が大きいほど速く冷え、室温に近づくほどゆっくりになるので、だんだん平らになるグラフで、室温より下がることはありません。"
    });
    const logChart = PL.ui.chart(charts, {
      title: "対数をとると：ln(T − T室温) – t", aspect: 0.62,
      cap: "同じデータでも縦軸を変えると直線になります。直線の傾き = −k。実験で「グラフからパラメータを求める」のはこのためです。"
    });

    /*
     * 拿掉播放鍵時漏刪了這一行：bRun 已經不存在，按「重新開始」會丟 ReferenceError，
     * 整個實驗當場停住。刪東西比加東西更容易留下這種懸空的引用。
     */
    function reset() { t = 0; curve = []; }

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
      g1.label(6, env + 4, "室温 " + env + "°C", { color: PL.col("accent-2"), size: 10 });
      if (curve.length > 1) g1.curve(curve, { color: MC(), width: 2.4 });
      if (curve.length) g1.dot(curve[curve.length - 1][0], curve[curve.length - 1][1], { r: 5, color: PL.col("warn"), glow: PL.col("warn") });

      logChart.clear();
      const logPts = curve.filter(p => p[1] - env > 0.5).map(p => [p[0], Math.log(p[1] - env)]);
      const maxLn = Math.log(Math.max(1, T0 - env));
      const g2 = PL.graph(logChart, { x: 50, y: 16, w: logChart.W - 64, h: logChart.H - 40 },
        { x0: 0, x1: 300, y0: -1, y1: Math.ceil(maxLn) + 0.5 });
      g2.frame({ xlabel: "t (s)", ylabel: "ln(T−T室温)" }); g2.grid(6, 5);
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

      // 燒杯與水：放在隔熱墊上的一杯熱水，水色隨溫度由紅轉藍
      const AP = PL.apparatus;
      const bx = 46, by = 40, bw = W * 0.4, bh = H - 92;
      const water = "rgb(" + Math.round(60 + warm * 175) + "," + Math.round(150 - warm * 100) + "," + Math.round(215 - warm * 160) + ")";
      AP.labRoom(ctx, W, H, by + bh + 6, {});
      ctx.fillStyle = "rgb(214,210,196)"; ctx.fillRect(bx - 8, by + bh, bw + 16, 6);
      AP.beaker(ctx, bx + bw / 2, by + bh, bw, bh + 10, bh / (bh + 10) * 0.92, water);
      /* 保溫套：k 越小（保溫越好）套子越厚，暫停時拉滑桿也看得到差別 */
      const ins = 3 + 19 * (1 - (sK.get() - 0.004) / 0.046);
      gripK.place(bx - ins, by + bh * 0.55);
      ctx.fillStyle = "rgba(226,196,146,0.8)"; ctx.fillRect(bx - ins, by + 10, ins, bh - 10); ctx.fillRect(bx + bw, by + 10, ins, bh - 10);
      ctx.strokeStyle = "rgba(150,110,60,0.45)"; ctx.lineWidth = 1;
      for (let yy = by + 18; yy < by + bh; yy += 10) { ctx.beginPath(); ctx.moveTo(bx - ins, yy); ctx.lineTo(bx, yy + 4); ctx.moveTo(bx + bw, yy); ctx.lineTo(bx + bw + ins, yy + 4); ctx.stroke(); }

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
      AP.thermometer(ctx, tx + 8, by - 6, by - 6 + bh, 16, warm);
      ng = [by - 6, by - 6 + bh]; gripT.place(tx + 8, Math.max(thY(by - 6, by - 6 + bh, 16, warm), by + 4));
      const col = (bh - 36) * warm;
      D.text(ctx, T.toFixed(1) + " °C", tx + 26, by - 6 + bh - 10 - col, { color: PL.col("danger"), size: 15, weight: "700" });
      D.text(ctx, "室温 " + env + " °C", tx + 26, by + bh - 4, { color: PL.col("accent-2"), size: 11 });

      // 即時的溫差條，讓「溫差」不只是數字
      const diff = T - env;
      const barX = tx + 26, barY = by + 22, barW = Math.max(0, Math.min(W - barX - 24, diff * 2.4));
      AP.infoCard(ctx, barX - 10, barY - 24, Math.min(W - barX - 14, 260), 46);
      D.text(ctx, "温度差 ΔT = " + diff.toFixed(1) + " °C", barX, barY - 6, { color: PL.col("text-dim"), size: 11 });
      D.rect(ctx, barX, barY, barW, 12, { fill: MC(), r: 6 });
      PL.ui.caption(cv, "冷える速さ ∝ ΔT なので、温度差が小さいほどゆっくり冷えます。");

      D.text(ctx, "t = " + t.toFixed(0) + " s", 16, H - 16, { color: PL.col("text-faint"), size: 11 });
    }

    const anim = PL.loop(dt => {
      if (dt && t < 300) {
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
      rFit.set(fit ? Math.abs(fit.slope).toFixed(4) : "データを集めているところ");
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
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    const F_TRUE = 0.15;             // 公尺；學生要量出來的焦距

    PL.ui.section(L.controls, "光学台");
    const sU = PL.ui.slider(L.controls, { label: "物体までの距離 u（物体からレンズまで）", min: 0.18, max: 0.80, step: 0.02, value: 0.30, unit: "m", digits: 2 });
    const cErr = PL.ui.checkbox(L.controls, { label: "ピント合わせの誤差を入れる（±2 mm）", checked: true });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "ピントを合わせて記録", () => record(), { primary: true });
    PL.ui.button(row, "データを消す", () => { panel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "物体が焦点に近いほど、像までの距離はぐんと遠くなり、像も大きくなります。だからプロジェクターではスクリーンを遠くに置きます。" +
      "1/u と 1/v をグラフにすると傾き −1 の直線になり、どちらの軸の切片も 1/f です。");

    const rV = PL.ui.readout(L.readouts, { label: "像までの距離 v", unit: "m" });
    const rMag = PL.ui.readout(L.readouts, { label: "倍率 |v/u|" });
    const rF = PL.ui.readout(L.readouts, { label: "求めた焦点距離 f", unit: "m" });
    const rSlope = PL.ui.readout(L.readouts, { label: "直線の傾き（理論 −1）" });

    const panel = fitPanel(root, {
      title: "1/v – 1/u グラフ", xLabel: "1/u (1/m)", yLabel: "1/v (1/m)", xMax: 6, yMax: 6, xTolerance: 0.05,
      cap: "1/u + 1/v = 1/f から 1/v = −1/u + 1/f。傾きは −1 で、縦軸の切片が 1/f のはずです。"
    });

    // 成像公式；對焦誤差加在像距上（實際實驗中就是螢幕位置抓不準）
    function imageDistance(u) {
      const v = 1 / (1 / F_TRUE - 1 / u);
      return cErr.get() ? v + jitter(u * 1000, 0.002) : v;
    }

    // 「對焦並記錄」：先把光屏推回最清晰的位置，再記下這一筆
    function record() { const u = sU.get(); screenM = null; panel.add(1 / u, 1 / imageDistance(u)); draw(); refresh(); }

    function refresh() {
      const u = sU.get(), v = imageDistance(u);
      rV.set(v, 3); rMag.set(Math.abs(v / u), 2);
      const fit = panel.draw([1 / u, 1 / v]);
      if (fit) {
        rSlope.set(fit.slope, 2);
        rF.set(fit.intercept > 0 ? (1 / fit.intercept).toFixed(3) : "データが足りない");
      } else { rSlope.set("—"); rF.set("2 回以上"); }
    }

    /*
     * 動態與操作：
     *  · 光點從燭焰頂端出發，沿三條特徵光線前進（平行光→過 F′、過光心不偏折、過 F→平行射出），
     *    經透鏡後會聚到同一點——像就是光真的匯聚的地方，不是畫上去的。
     *  · 可以抓蠟燭改物距，也可以抓光屏前後移動自己對焦：光屏不在會聚點時，
     *    光點在屏前就交叉（或還沒交會）打在屏上散成一片，像就糊了。
     *    「對焦並記錄」會先把光屏推到最清晰的位置，讀數仍以清晰成像的像距 v 為準。
     */
    const C_PX = 150;                  // 光點速率（px/s），只是讓傳播方向看得見
    let screenM = null;                // 光屏離透鏡的距離（m）；null＝自動對焦在像距上
    let geo = { lensX: 0, scale: 1, W: 0 };
    const gripObj = PL.ui.handle(cv, { slider: sU, label: "ろうそく（物体までの距離 u）", toValue: x => (geo.lensX - x) / geo.scale });
    const gripScr = PL.ui.handle(cv, { label: "スクリーン（前後に動かしてピントを合わせる）",
      onDrag: x => { screenM = PL.clamp((x - geo.lensX) / geo.scale, 30 / geo.scale, (geo.W - 34 - geo.lensX) / geo.scale); draw(); } });

    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const u = sU.get(), v = imageDistance(u);
      const axisY = H * 0.5;
      const lensX = W * 0.42;
      const scale = Math.min((lensX - 60) / 0.85, (W - lensX - 60) / Math.max(0.35, v));
      cv.calibrate(scale, "m");   // 可自己量物距與像距，不必只信讀數
      geo = { lensX, scale, W };

      // 光具座：導軌 + 滑座
      const AP = PL.apparatus;
      AP.benchTop(ctx, W, H, axisY + 88);
      AP.bench(ctx, 24, W - 24, axisY + 62, { pxPerCm: scale / 100 });
      D.line(ctx, 24, axisY, W - 24, axisY, PL.theme.pale(0.22), 1, [5, 4]);

      // 透鏡
      AP.carrier(ctx, lensX, axisY + 62, axisY + 62);
      AP.lens(ctx, lensX, axisY, 56, true);
      D.text(ctx, "凸レンズ", lensX, axisY - 70, { color: MC(), size: 11, align: "center" });

      // 焦點
      [-1, 1].forEach(s => {
        const fx = lensX + s * F_TRUE * scale;
        D.disc(ctx, fx, axisY, 3.5, { fill: PL.col("warn") });
        D.text(ctx, s < 0 ? "F" : "F′", fx, axisY - 8, { color: PL.col("warn"), size: 11, align: "center" });
      });

      // 物體：蠟燭（燭焰頂端就是物高）
      const objX = lensX - u * scale, objH = 42;
      AP.carrier(ctx, objX, axisY + 62, axisY + 9);
      AP.candle(ctx, objX, axisY + 9, { h: 30 });
      D.text(ctx, "物体", objX, axisY - 58, { color: PL.col("accent-2"), size: 11, align: "center" });
      gripObj.place(objX, axisY + 55);

      // 像（倒立實像），高度依放大率縮放
      const imgX = lensX + v * scale, imgH = objH * (v / u);
      const onScreen = imgX < W - 26;
      // 光屏位置：自動對焦時就在像上；像跑出導軌時停在導軌盡頭
      const scrX = screenM != null ? lensX + screenM * scale : onScreen ? imgX : W - 34;
      // 屏上光斑（模糊圈）直徑 ≈ 透鏡有效口徑 × |屏到像| / 像距
      const blurPx = 84 * Math.abs(scrX - imgX) / Math.max(1, imgX - lensX);
      const sharp = 1 / (1 + blurPx / 5);

      // 三條特徵光線：在透鏡上的入射點，之後都朝像點前進，畫到光屏為止
      const tip = [objX, axisY - objH], img = [imgX, axisY + imgH];
      // 光線畫到光屏為止；從屏下緣漏過去的光打到導軌就停（不畫進桌子裡）
      const toScreen = p => {
        const k = (scrX - p[0]) / (img[0] - p[0]), y = p[1] + (img[1] - p[1]) * k, floor = axisY + 60;
        if (y <= floor) return [scrX, y];
        const k2 = (floor - p[1]) / (img[1] - p[1]);
        return [p[0] + (img[0] - p[0]) * k2, floor];
      };
      const yF = axisY + objH * F_TRUE / (u - F_TRUE);        // 過 F 的光線打在透鏡上的高度
      const rays = [[tip, [lensX, axisY - objH]], [tip, [lensX, axisY]]];
      if (Math.abs(yF - axisY) < 52) rays.push([tip, [lensX, yF]]);
      const lightCol = PL.theme.isLight() ? "#e39400" : "#fff4c2";
      rays.forEach((r, i) => {
        const end = toScreen(r[1]), pts = [r[0], r[1], end];
        ctx.save(); ctx.globalAlpha = i === 0 ? 0.85 : 0.5;
        D.line(ctx, r[0][0], r[0][1], r[1][0], r[1][1], i === 0 ? PL.col("warn") : lightCol, 1.2, i === 1 ? [4, 3] : null);
        D.line(ctx, r[1][0], r[1][1], end[0], end[1], i === 0 ? PL.col("warn") : lightCol, 1.2, i === 1 ? [4, 3] : null);
        ctx.restore();
        PL.motion.flow(ctx, pts, anim.t * C_PX, { gap: 20, r: 2.3, color: lightCol, glow: 6 });
      });

      // 白色紙屏上的倒立燭焰：對焦越準越清晰
      AP.carrier(ctx, scrX, axisY + 62, axisY + 62);
      // 像的大小與位置跟著光線走：燭焰（約 23 px 高）放大 m 倍，焰尖落在光線會聚點上；
      // 光屏不在像上時，取主光線（過光心）打在屏上的位置
      const kS = (scrX - lensX) / Math.max(1, imgX - lensX), fh = PL.clamp(32 * (v / u) * kS, 8, 160);
      const tipY = axisY + imgH * kS, anchor = tipY - (0.58 * fh + 2);
      AP.screen(ctx, scrX, axisY, 24, 124, c2 => AP.projectedFlame(c2, scrX, anchor, fh + blurPx * 0.4, true, sharp));
      // 光屏把手放在屏框頂端：放在底座會蓋住屏面下半部的倒立像
      gripScr.place(scrX, axisY - 66);
      if (sharp > 0.8) D.text(ctx, "倒立の実像", scrX, axisY - 90, { color: PL.col("ok"), size: 11, align: "center", weight: "700" });
      else D.text(ctx, "像がぼやけている：スクリーンを前後に動かしてピントを合わせる", Math.min(scrX, W - 90), axisY - 90, { color: PL.col("warn"), size: 11, align: "center", weight: "700" });
      if (!onScreen) D.text(ctx, "像までの距離が遠すぎて、紙のスクリーンをレールの端まで動かしても、はっきりした像が映らない", lensX + 40, axisY - 110, { color: PL.col("danger"), size: 12 });

      // 距離標示
      D.arrow(ctx, objX, axisY + 44, lensX, axisY + 44, { color: PL.col("text-faint"), width: 1.2, head: 6 });
      D.text(ctx, "u = " + u.toFixed(2) + " m", (objX + lensX) / 2, axisY + 40, { color: PL.col("text-dim"), size: 11, align: "center" });
      if (onScreen) {
        D.arrow(ctx, lensX, axisY + 44, imgX, axisY + 44, { color: PL.col("text-faint"), width: 1.2, head: 6 });
        D.text(ctx, "v = " + v.toFixed(2) + " m", (lensX + imgX) / 2, axisY + 40, { color: PL.col("text-dim"), size: 11, align: "center" });
      }
    }

    // 光點用迴圈自己的時間前進；暫停時拉滑桿或勾選誤差也要立即重畫主畫面
    const anim = PL.loop(() => draw(), 30);
    sU.el.addEventListener("input", () => { screenM = null; draw(); refresh(); });
    cErr.el.addEventListener("change", () => { draw(); refresh(); });
    cv.onResize(() => draw()); panel.chart.onResize(refresh);
    refresh(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); panel.chart.destroy(); }, rerender() { draw(); refresh(); } };
  }});

  /* ==================================================================
     模組八 · 共鳴管測聲速
     ================================================================== */
  PL.register("resonance-tube-sound-speed", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const V_TRUE = 343;              // 25 °C 空氣中的聲速
    const TUBE_R = 0.02;             // 管半徑，用於端點修正
    let t = 0;

    PL.ui.section(L.controls, "音さと水位");
    const sF = PL.ui.slider(L.controls, { label: "音さの振動数 f", min: 256, max: 1024, step: 32, value: 512, unit: "Hz", digits: 0 });
    const sLen = PL.ui.slider(L.controls, { label: "空気の柱の長さ L（水位を調節）", min: 0.05, max: 0.60, step: 0.005, value: 0.16, unit: "m", digits: 3 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "1 回目の共鳴の位置を自動で探す", () => { sLen.set(firstResonance()); refresh(); }, { primary: true });
    PL.ui.button(row, "この共鳴の位置を記録", () => record());
    PL.ui.button(row, "データを消す", () => { panel.clear(); refresh(); });
    PL.ui.note(L.controls,
      "水位をゆっくり変えていき、音がいちばん大きい位置が共鳴の位置です。5 種類の音さでそれぞれ記録すると、" +
      "L と 1/f は直線になり、傾きを 4 倍したものが音の速さです。進んでいく音波を実際に追いかけなくても求められます。");

    // 把手抓管內水面：上下拖就是升降水位、改變空氣柱長度
    let rq = { top: 0, k: 1 };
    const grip = PL.ui.handle(cv, { slider: sLen, label: "水位（上下に引いて空気の柱の長さを変える）", toValue: (x, y) => (y - rq.top) / rq.k });
    const rLoud = PL.ui.readout(L.readouts, { label: "共鳴の強さ", unit: "%" });
    const rFirst = PL.ui.readout(L.readouts, { label: "理論上の 1 回目の共鳴の長さ", unit: "m" });
    const rSlope = PL.ui.readout(L.readouts, { label: "L–1/f の傾き", unit: "m·Hz" });
    const rV = PL.ui.readout(L.readouts, { label: "求めた音の速さ v = 4×傾き", unit: "m/s" });

    const panel = fitPanel(root, {
      title: "L – 1/f グラフ", xLabel: "1/f (s)", yLabel: "L (m)", xMax: 0.004, yMax: 0.4, xTolerance: 1e-5,
      cap: "一端が開いた空気の柱の 1 回目の共鳴は L + 0.6r = v/(4f) なので、L と 1/f は直線になり、傾き = v/4 です。"
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
      } else { rSlope.set("—"); rV.set("2 回以上"); }
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

      // 管壁與水柱：鐵架夾住的玻璃共鳴管，管內水位可以上下調
      const AP = PL.apparatus;
      AP.labRoom(ctx, W, H, bottom + 20, {});
      AP.standRod(ctx, tubeX - 60, bottom + 20, top - 10);
      AP.clampHead(ctx, tubeX - 60, top + 40, 52, 0);
      AP.clampHead(ctx, tubeX - 60, bottom - 60, 52, 0);
      AP.glassTube(ctx, tubeX + tubeW / 2, top, bottom, tubeW, waterY);
      rq = { top, k: scale }; grip.place(tubeX + tubeW / 2, waterY);
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
      D.text(ctx, "腹", tubeX + tubeW + 10, top + 12, { color: MC(), size: 10 });
      D.text(ctx, "節", tubeX + tubeW + 10, waterY - 8, { color: MC(), size: 10 });

      // 音叉：振動幅度固定，聲音大小由共鳴決定
      const forkX = tubeX + tubeW / 2, forkY = top - 22;
      const wob = Math.sin(TAU * 8 * t) * 1.5;
      AP.tuningFork(ctx, forkX + wob, forkY + 12, 36);
      D.text(ctx, f + " Hz", forkX + 24, forkY - 8, { color: PL.col("text-dim"), size: 11 });

      // 音量計：共鳴時衝到滿格，是最直觀的「找到了」訊號
      const mX = W - 150, mY = 60, mW = 118, mH = 16;
      AP.infoCard(ctx, mX - 12, mY - 28, mW + 24, 100);
      D.text(ctx, "耳に聞こえる音の大きさ", mX, mY - 10, { color: PL.col("text-faint"), size: 11 });
      D.rect(ctx, mX, mY, mW, mH, { fill: PL.theme.pale(0.10), stroke: PL.theme.pale(0.22), r: 8 });
      const barColor = loud > 0.85 ? PL.col("ok") : (loud > 0.4 ? PL.col("warn") : PL.col("text-faint"));
      D.rect(ctx, mX + 2, mY + 2, (mW - 4) * loud, mH - 4, { fill: barColor, r: 6 });
      D.text(ctx, loud > 0.85 ? "共鳴！ ここがいちばん大きい" : (loud > 0.4 ? "共鳴に近い。もう少し調節する" : "まだ共鳴していない"),
        mX, mY + 36, { color: barColor, size: 12, weight: "700" });
      D.text(ctx, "理論上の共鳴の長さ " + firstResonance().toFixed(3) + " m", mX, mY + 58, { color: PL.col("text-faint"), size: 11 });
    }

    const anim = PL.loop(dt => { if (dt) t += dt; draw(); }, 45);
    [sF, sLen].forEach(s => s.el.addEventListener("input", refresh));
    cv.onResize(draw); panel.chart.onResize(refresh);
    refresh(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); panel.chart.destroy(); }, rerender() { draw(); refresh(); } };
  }});

})();
