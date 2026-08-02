/* 模組六 · 簡諧運動 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#4fc3f7");

  /* 彈簧振子 */
  PL.register("spring", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    let t = 0, hist = [];
    const sM = PL.ui.slider(L.controls, { label: "質量 m", min: 0.5, max: 6, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: () => hist = [] });
    const sK = PL.ui.slider(L.controls, { label: "勁度 k", min: 5, max: 60, step: 1, value: 20, unit: "N/m", digits: 0, onInput: () => hist = [] });
    const sA = PL.ui.slider(L.controls, { label: "振幅 A", min: 0.5, max: 2.5, step: 0.1, value: 1.6, unit: "m", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    const bP = PL.ui.button(row, "暫停", () => { anim.toggle(); bP.textContent = anim.running ? "暫停" : "播放"; }, { primary: true });
    const rT = PL.ui.readout(L.readouts, { label: "週期 T", unit: "s" });
    const rX = PL.ui.readout(L.readouts, { label: "位移 x", unit: "m" });
    const rV = PL.ui.readout(L.readouts, { label: "速度 v", unit: "m/s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m = sM.get(), k = sK.get(), A = sA.get(), w = Math.sqrt(k / m);
      const x = A * Math.cos(w * t), v = -A * w * Math.sin(w * t);
      const midY = 70, wallX = 40, sc = (W - 160) / 5, eqX = wallX + 90 + 2.5 * sc * 0.5;
      cv.calibrate(sc, "m");      // 尺可直接量振幅與位移
      // 牆
      D.rect(ctx, wallX - 8, midY - 34, 8, 68, { fill: PL.col("text-faint") });
      const mx = eqX + x * sc;
      D.spring(ctx, wallX, midY, mx - 22, midY, 11, 12, MC());
      D.rect(ctx, mx - 22, midY - 22, 44, 44, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 6 });
      // 平衡線
      D.line(ctx, eqX, midY - 40, eqX, midY + 40, "rgba(255,255,255,0.15)", 1, [3, 3]);
      D.arrow(ctx, mx, midY, mx + v * 12, midY, { color: PL.col("accent-2"), width: 2, label: "v" });
      // x–t 圖
      const bx = 40, by = 150, bw = W - 80, bh = H - by - 16, Tw = 4 * Math.PI / w;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: Tw, y0: -A, y1: A });
      g.frame({ title: "x – t 圖", xlabel: "t (s)" }); g.grid(4, 2);
      const pts = hist.filter(h => h[0] > t - Tw).map(h => [h[0] - (t - Tw), h[1]]);
      if (pts.length > 1) g.curve(pts, { color: MC(), width: 2.2 });
      g.dot(Tw, x, { color: MC(), glow: MC() });
      rT.set(TAU / w, 2); rX.set(x, 2); rV.set(v, 2);
    }
    const anim = PL.loop(dt => { if (dt) { t += dt; const m = sM.get(), k = sK.get(), A = sA.get(), w = Math.sqrt(k / m); hist.push([t, A * Math.cos(w * t)]); if (hist.length > 900) hist.shift(); } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 單擺 */
  PL.register("pendulum", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    let t = 0;
    const sL = PL.ui.slider(L.controls, { label: "擺長 L", min: 0.5, max: 4, step: 0.1, value: 2, unit: "m", digits: 1 });
    const sG = PL.ui.slider(L.controls, { label: "重力 g", min: 1.6, max: 20, step: 0.1, value: 9.8, unit: "m/s²", digits: 1 });
    const sTh = PL.ui.slider(L.controls, { label: "初始角 θ₀", min: 2, max: 18, step: 1, value: 12, unit: "°", digits: 0 });
    const rT = PL.ui.readout(L.readouts, { label: "週期 T", unit: "s" });
    const rTh = PL.ui.readout(L.readouts, { label: "當前角度", unit: "°" });
    PL.ui.note(L.controls, "小角度下週期只與擺長、重力有關，與擺錘質量、振幅無關。");
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const Lm = sL.get(), g = sG.get(), th0 = sTh.get() * Math.PI / 180, w = Math.sqrt(g / Lm);
      const th = th0 * Math.cos(w * t);
      const px = W / 2, py = 34, Lpx = Math.min((H - 80), (W * 0.42)) * (Lm / 4) + 40;
      D.rect(ctx, px - 40, py - 8, 80, 8, { fill: PL.col("text-faint") });
      // 擺動弧
      D.ring(ctx, px, py, Lpx, "rgba(255,255,255,0.06)", 1);
      const bx = px + Lpx * Math.sin(th), by = py + Lpx * Math.cos(th);
      D.line(ctx, px, py, bx, by, "#c9d3e0", 2);
      D.line(ctx, px, py, px, py + Lpx, "rgba(255,255,255,0.12)", 1, [3, 3]);
      D.disc(ctx, bx, by, 15, { fill: MC(), glow: MC(), glowSize: 16 });
      rT.set(TAU / w, 2); rTh.set(th * 180 / Math.PI, 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 簡諧運動的位移–時間關係 */
  PL.register("shm-graph", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let t = 0;
    const sA = PL.ui.slider(L.controls, { label: "振幅 A", min: 0.5, max: 2, step: 0.1, value: 1.5, unit: "m", digits: 1 });
    const sT = PL.ui.slider(L.controls, { label: "週期 T", min: 1, max: 5, step: 0.2, value: 3, unit: "s", digits: 1 });
    const sPh = PL.ui.slider(L.controls, { label: "相位 φ", min: 0, max: 360, step: 5, value: 0, unit: "°", digits: 0 });
    PL.ui.note(L.controls, "速度超前位移 90°，加速度與位移反相（相差 180°）。");
    const rX = PL.ui.readout(L.readouts, { label: "x", unit: "m" });
    const rV = PL.ui.readout(L.readouts, { label: "v", unit: "m/s" });
    const rAcc = PL.ui.readout(L.readouts, { label: "a", unit: "m/s²" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const A = sA.get(), T = sT.get(), w = TAU / T, ph = sPh.get() * Math.PI / 180;
      /*
       * 原本的座標軸是 x1 = 2T、y = ±A·ω²·1.1，兩軸都跟著參數自動縮放。
       * 後果是拉「振幅」與「週期」時畫面**完全沒有變化**：
       * 波形永遠佔滿整個框、永遠顯示剛好兩個週期。三根滑桿有兩根等於白放。
       *
       * 這是很容易犯的錯：把座標軸縮放成剛好貼合資料，
       * 等於親手把滑桿想示範的效果 normalize 掉。
       *
       * 改成固定座標軸：
       *   x 軸固定 0～10 s  → 週期變長，波就變疏，看得見
       *   y 軸固定 ±2.3 m   → 振幅變大，波就變高，看得見
       * 三條曲線改成除以各自的 ω 次方（v÷ω、a÷ω²），
       * 這樣三者同單位、同大小，可以直接比較相位差，
       * 而振幅仍然真實地反映在高度上。
       */
      const A_MAX = 2.3, T_SPAN = 10;
      const bx = 40, by = 24, bw = W - 80, bh = H - 48;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: T_SPAN, y0: -A_MAX, y1: A_MAX });
      g.frame({ title: "位移 x、速度 v÷ω、加速度 a÷ω²（三者同單位，便於比較相位）", xlabel: "t (s)" });
      g.grid(5, 4);
      const fx = tt => A * Math.cos(w * tt + ph), fv = tt => -A * w * Math.sin(w * tt + ph), fa = tt => -A * w * w * Math.cos(w * tt + ph);
      g.fn(fx, { color: MC(), width: 2.2 });
      g.fn(tt => fv(tt) / w, { color: PL.col("accent-2"), width: 2.2 });
      g.fn(tt => fa(tt) / (w * w), { color: PL.col("accent-3"), width: 2.2 });
      // 振幅包絡線：讓「振幅」這根滑桿的作用一眼可辨
      g.hline(A, { color: PL.theme.pale(0.28), dash: [5, 4], width: 1 });
      g.hline(-A, { color: PL.theme.pale(0.28), dash: [5, 4], width: 1 });
      g.label(0.15, A + 0.12, "A = " + PL.fmt(A, 1) + " m", { color: PL.col("text-faint"), size: 9.5 });
      g.vline(t % T_SPAN, { color: "#fff", dash: [4, 3], width: 1 });
      D.text(ctx, "x", bx + bw - 30, by + 14, { color: MC(), size: 11 });
      D.text(ctx, "v÷ω", bx + bw - 30, by + 28, { color: PL.col("accent-2"), size: 11 });
      D.text(ctx, "a÷ω²", bx + bw - 30, by + 42, { color: PL.col("accent-3"), size: 11 });
      PL.ui.caption(cv, "週期 T = " + PL.fmt(T, 1) + " s，這個畫面（10 秒）裝得下 " +
        PL.fmt(T_SPAN / T, 1) + " 個完整週期。" +
        "速度比位移超前 90°（位移過零時速度最大），加速度與位移永遠反相。");
      rX.set(fx(t), 2); rV.set(fv(t), 2); rAcc.set(fa(t), 2);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 簡諧運動的能量 */
  PL.register("shm-energy", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let t = 0;
    const sA = PL.ui.slider(L.controls, { label: "振幅 A", min: 0.5, max: 2, step: 0.1, value: 1.5, unit: "m", digits: 1 });
    const sK = PL.ui.slider(L.controls, { label: "勁度 k", min: 5, max: 40, step: 1, value: 16, unit: "N/m", digits: 0 });
    const rE = PL.ui.readout(L.readouts, { label: "總能 E", unit: "J" });
    const rK = PL.ui.readout(L.readouts, { label: "動能 K", unit: "J" });
    const rU = PL.ui.readout(L.readouts, { label: "位能 U", unit: "J" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const A = sA.get(), k = sK.get(), w = Math.sqrt(k / 1), x = A * Math.cos(w * t);
      const E = 0.5 * k * A * A, U = 0.5 * k * x * x, K = E - U;
      // 振子
      /*
       * sc = (W−120)/(2A) 把比例尺綁在振幅上，於是不管 A 設多少，
       * 振子永遠在同樣寬的範圍內來回，「振幅」這根滑桿看起來毫無作用。
       * 下面的能量圖也一樣（x 軸 ±A、y 軸 E×1.1，兩軸都跟著 A 跑）。
       * 一律改成以滑桿上限為準的固定比例尺。
       */
      const A_MAX = 0.5, K_MAX = 60;
      const midY = 60, sc = (W - 120) / (2 * A_MAX), eqX = W / 2, mx = eqX + x * sc;
      D.line(ctx, eqX, midY - 26, eqX, midY + 26, "rgba(255,255,255,0.15)", 1, [3, 3]);
      D.spring(ctx, 40, midY, mx - 18, midY, 10, 10, MC());
      D.rect(ctx, mx - 18, midY - 18, 36, 36, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 5 });
      // 能量對位置 圖
      const bx = 40, by = 120, bw = W - 80, bh = H - by - 16;
      const E_MAX = 0.5 * K_MAX * A_MAX * A_MAX;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: -A_MAX, x1: A_MAX, y0: 0, y1: E_MAX * 1.05 });
      g.frame({ title: "能量對位置：K=½k(A²−x²)，U=½kx²", xlabel: "x (m)" }); g.grid(4, 4);
      g.fn(xx => 0.5 * k * xx * xx, { color: MC(), width: 2 });                 // U
      g.fn(xx => 0.5 * k * (A * A - xx * xx), { color: PL.col("accent-2"), width: 2 }); // K
      g.hline(E, { color: PL.col("ok"), dash: [4, 3], width: 1.5 });
      g.label(-A + 0.05, E, "總能 E", { color: PL.col("ok"), size: 10, dy: -4 });
      g.dot(x, U, { color: MC(), glow: MC() }); g.dot(x, K, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
      rE.set(E, 1); rK.set(K, 1); rU.set(U, 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 共振 */
  PL.register("resonance", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let t = 0; const w0 = 2 * Math.PI * 1.0; // 自然頻率 f0 = 1 Hz
    const sF = PL.ui.slider(L.controls, { label: "驅動頻率 f", min: 0.2, max: 2, step: 0.02, value: 0.6, unit: "Hz", digits: 2 });
    const sD = PL.ui.slider(L.controls, { label: "阻尼 γ", min: 0.5, max: 8, step: 0.1, value: 2, unit: "", digits: 1 });
    PL.ui.note(L.controls, "當驅動頻率接近自然頻率 f₀＝1 Hz 時，振幅出現尖峰；阻尼越小峰越高。");
    const rAmp = PL.ui.readout(L.readouts, { label: "穩態振幅", unit: "" });
    const rF0 = PL.ui.readout(L.readouts, { label: "自然頻率 f₀", unit: "Hz" });
    const amp = wd => 1 / Math.sqrt((w0 * w0 - wd * wd) ** 2 + (sD.get() * wd) ** 2) * (w0 * w0);
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const wd = TAU * sF.get(), A = amp(wd);
      // 被驅動振子
      const midY = 56, eqX = W / 2, x = A * 26 * Math.sin(wd * t);
      D.rect(ctx, 40, midY - 24, 8, 48, { fill: PL.col("text-faint") });
      D.spring(ctx, 48, midY, eqX + x - 18, midY, 10, 9, MC());
      D.rect(ctx, eqX + x - 18, midY - 16, 36, 32, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 5 });
      // 共振曲線
      const bx = 44, by = 108, bw = W - 80, bh = H - by - 16;
      let amax = 0; for (let f = 0.2; f <= 2; f += 0.02) amax = Math.max(amax, amp(TAU * f));
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0.2, x1: 2, y0: 0, y1: amax * 1.1 });
      g.frame({ title: "振幅對驅動頻率（共振曲線）", xlabel: "f (Hz)", ylabel: "A" }); g.grid(6, 4);
      g.fn(f => amp(TAU * f), { color: MC(), width: 2.4, samples: 180 });
      g.vline(1.0, { color: "rgba(255,255,255,0.25)", dash: [3, 3], width: 1 });
      g.label(1.02, amax, "f₀", { color: PL.col("text-dim"), size: 10 });
      g.dot(sF.get(), A, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
      rAmp.set(A, 2); rF0.set(1.0, 2);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
