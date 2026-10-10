/* 模組六 · 簡諧運動 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#4fc3f7");

  /* 彈簧振子 */
  PL.register("spring", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet", instrument: false });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    // ph 是累加的相位（ω 每格積分）：播放中改 m 或 k，振子從當下的相位接著振，不會瞬間跳位置
    let t = 0, ph = 0, hist = [], prevX = null, prevCross = null, crossGaps = [];
    const resetHist = () => { hist = []; prevX = null; prevCross = null; crossGaps = []; };
    const sM = PL.ui.slider(L.controls, { label: "質量 m", min: 0.5, max: 6, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: resetHist });
    const sK = PL.ui.slider(L.controls, { label: "勁度 k", min: 5, max: 60, step: 1, value: 20, unit: "N/m", digits: 0, onInput: resetHist });
    const sA = PL.ui.slider(L.controls, { label: "振幅 A", min: 0.5, max: 2.5, step: 0.1, value: 1.6, unit: "m", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    /* 播放／暫停由引擎的傳輸列統一提供（還附單步與速度），實驗不再自備，避免兩個開關互相打架。 */
    const rT = PL.ui.readout(L.readouts, { label: "週期 T", unit: "s" });
    const rTm = PL.ui.readout(L.readouts, { label: "實測週期（過零量測）", unit: "s" });
    const rX = PL.ui.readout(L.readouts, { label: "位移 x", unit: "m" });
    const rV = PL.ui.readout(L.readouts, { label: "速度 v", unit: "m/s" });
    const rA = PL.ui.readout(L.readouts, { label: "加速度 a", unit: "m/s²" });
    const rF = PL.ui.readout(L.readouts, { label: "回復力 F", unit: "N" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m = sM.get(), k = sK.get(), A = sA.get(), w = Math.sqrt(k / m);
      const x = A * Math.cos(ph), v = -A * w * Math.sin(ph), a = -w * w * x, F = -k * x;
      const AP = PL.apparatus;
      // 幾何：牆在左，滑軌貫穿全場，平衡點讓最大振幅的滑塊兩端都撞不到牆
      const wallX = 34, cartW = 48, ay = 66, railY = ay + 27;
      const sc = (W - wallX - 74 - cartW) / 5;   // 位移滿檔 5 m
      const eqX = wallX + 62 + cartW / 2 + 2.5 * sc;
      cv.calibrate(sc, "m");      // 尺可直接量振幅與位移
      const mx = eqX + x * sc;

      // 場景：上半是實驗桌上的彈簧振子，下半是圖表
      AP.labStrip(ctx, W, 150, railY + 8, {});
      // 滑軌與牆面固定柱（含掛簧螺栓座）
      AP.steel(ctx, wallX - 10, railY, W - wallX - 26, 8, 4);
      const post = AP.wallPost(ctx, wallX - 4, railY - 1, ay - 32, ay);
      // 平衡位置用主題藍強調（liziwuli 同款語彙）；±A 跟著 A 滑桿伸縮
      const dash = [4, 4];
      D.line(ctx, eqX, ay - 52, eqX, railY + 14, "rgba(110,180,255,0.55)", 1.2, dash);
      D.line(ctx, eqX - A * sc, ay - 46, eqX - A * sc, railY + 8, "rgba(255,255,255,0.13)", 1, dash);
      D.line(ctx, eqX + A * sc, ay - 46, eqX + A * sc, railY + 8, "rgba(255,255,255,0.13)", 1, dash);
      D.text(ctx, "−A", eqX - A * sc, ay - 52, { color: PL.theme.pale(0.55), size: 10.5, align: "center" });
      D.text(ctx, "+A", eqX + A * sc, ay - 52, { color: PL.theme.pale(0.55), size: 10.5, align: "center" });
      D.text(ctx, "平衡位置 x = 0", eqX, ay - 54, { color: "rgba(140,196,255,0.9)", size: 10.5, align: "center" });

      // 彈簧（端圈套進牆上螺栓、勾進車側眼環）與滑塊
      D.spring(ctx, post.x, ay, mx - cartW / 2 - 1, ay, 11, 11, MC());
      AP.cart(ctx, mx, railY, cartW, 34);

      // 力與速度箭頭：以「目前設定的最大值」歸一，長度在情況之間可比較
      const fLen = A > 0 ? (F / (k * A)) * 62 : 0, vLen = A * w > 0 ? (v / (A * w)) * 62 : 0;
      if (Math.abs(fLen) > 3) D.arrow(ctx, mx, ay - 30, mx + fLen, ay - 30, { color: PL.col("ok"), width: 2.4, label: "F", lsize: 11 });
      if (Math.abs(vLen) > 3) D.arrow(ctx, mx, railY + 16, mx + vLen, railY + 16, { color: PL.col("accent-3"), width: 2.4, label: "v", lsize: 11 });
      // 位移標註：從平衡位置量到現在位置
      if (Math.abs(mx - eqX) > 5) {
        const by2 = railY + 30;
        D.line(ctx, eqX, by2, mx, by2, PL.theme.pale(0.4), 1.2);
        D.line(ctx, eqX, by2 - 4, eqX, by2 + 4, PL.theme.pale(0.4), 1.2);
        D.line(ctx, mx, by2 - 4, mx, by2 + 4, PL.theme.pale(0.4), 1.2);
        D.text(ctx, "x = " + PL.fmt(x, 2) + " m", (eqX + mx) / 2, by2 + 14, { color: PL.theme.pale(0.75), size: 10.5, align: "center" });
      }

      // x–t、v÷ω–t、a÷ω²–t 三線同軸：除以 ω、ω² 後三條振幅都是 A，相位關係直接可讀
      const bx = 40, by = 158, bw = W - 80, bh = H - by - 14, Tw = TAU / w;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: Tw, y0: -A * 1.15, y1: A * 1.15 });
      g.frame({ title: "x（藍）・v÷ω（紫，超前 90°）・a÷ω²（橙，反相）", xlabel: "t (s)" }); g.grid(4, 2);
      const win = hist.filter(h => h[0] > t - Tw);
      const xs = win.map(h => [h[0] - (t - Tw), h[1]]);
      const vs = win.map(h => [h[0] - (t - Tw), h[2] / w]);
      const as = win.map(h => [h[0] - (t - Tw), h[3] / (w * w)]);
      if (xs.length > 1) g.curve(as, { color: PL.col("warn"), width: 1.4, dash: [5, 4] });
      if (xs.length > 1) g.curve(vs, { color: PL.col("accent-3"), width: 1.6 });
      if (xs.length > 1) g.curve(xs, { color: MC(), width: 2.2 });
      g.dot(Tw, x, { color: MC(), glow: MC() });
      rT.set(TAU / w, 2); rX.set(x, 2); rV.set(v, 2); rA.set(a, 2); rF.set(F, 2);
      // 實測週期：往上過零的間隔平均；至少兩個間隔才顯示，避免開場誤導
      if (crossGaps.length >= 2) {
        const avg = crossGaps.reduce((s, gap) => s + gap, 0) / crossGaps.length;
        rTm.set(avg, 2);
      } else rTm.set("測量中…");
    }
    const anim = PL.loop(dt => {
      if (dt) {
        t += dt;
        const m = sM.get(), k = sK.get(), A = sA.get(), w = Math.sqrt(k / m);
        ph += w * dt;
        const xn = A * Math.cos(ph);
        // 週期量測：x 由負轉正的瞬間是「同一相位」，相鄰兩次間隔即實測週期
        if (prevX !== null && prevX < 0 && xn >= 0) {
          if (prevCross !== null) {
            const gap = t - prevCross;
            if (gap > 0.4 * TAU / w) { crossGaps.push(gap); if (crossGaps.length > 4) crossGaps.shift(); }
          }
          prevCross = t;
        }
        prevX = xn;
        hist.push([t, xn, -A * w * Math.sin(ph), -w * w * xn]);
        if (hist.length > 900) hist.shift();
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 單擺 */
  PL.register("pendulum", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet", instrument: false });
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
      const A = PL.apparatus;
      const px = W / 2, py = 46, Lpx = Math.min((H - 96), (W * 0.42)) * (Lm / 4) + 40;

      /* 鐵架吊起的單擺：擺長是從夾頭量到球心，架子畫出來學生才知道那一段從哪算起 */
      A.benchTop(ctx, W, H, H - 24, { window: { x: W * 0.72, w: Math.min(150, W * 0.18), h: H * 0.34 } });
      A.standRod(ctx, px - 118, H - 22, py - 26);
      A.crossArm(ctx, px - 118, py - 16, px);

      // 擺動弧
      D.ring(ctx, px, py, Lpx, PL.theme.pale(0.10), 1);
      const bx = px + Lpx * Math.sin(th), by = py + Lpx * Math.cos(th);
      D.line(ctx, px, py, px, py + Lpx, PL.theme.pale(0.18), 1, [4, 4]);
      A.cord(ctx, px, py, bx, by);
      A.bob(ctx, bx, by, 17);
      /* 重力箭頭長度 ∝ g：月球、地球、木星上同一個擺，拉的力不一樣 */
      D.arrow(ctx, bx, by + 18, bx, by + 18 + g * 3.2, { color: PL.col("danger"), width: 2.2, label: "mg" });
      D.text(ctx, g < 2.5 ? "像在月球上" : g < 5 ? "像在火星上" : g < 11 ? "地球表面" : "像在木星附近", W - 20, 34, { color: PL.col("text"), size: 12, align: "right", weight: "700" });
      rT.set(TAU / w, 2); rTh.set(th * 180 / Math.PI, 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});


  /* 簡諧運動的能量 */
  PL.register("shm-energy", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
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
       * sc 以滑桿上限為準的固定比例尺：振幅變大，振子真的跑更遠。
       * 能量圖的座標軸同樣固定，兩根滑桿的作用都看得出來。
       */
      const A_MAX = 0.5, K_MAX = 60;
      const AP = PL.apparatus;
      const midY = 58, sc = (W - 120) / (2 * A_MAX), eqX = W / 2, mx = eqX + x * sc;
      const cartW = 42, railY = midY + 27;
      // 牆柱、軌道與平衡位置：振子畫成真的彈簧掛車，不是幾何符號
      AP.labStrip(ctx, W, 112, railY + 8, {});
      AP.steel(ctx, 28, railY, W - 52, 8, 4);
      const postE = AP.wallPost(ctx, 30, railY - 1, midY - 30, midY);
      D.line(ctx, eqX, midY - 48, eqX, railY + 12, "rgba(255,255,255,0.22)", 1, [4, 4]);
      D.text(ctx, "x = 0", eqX, midY - 54, { color: PL.theme.pale(0.8), size: 10.5, align: "center" });
      D.line(ctx, eqX - A * sc, midY - 42, eqX - A * sc, railY + 6, "rgba(255,255,255,0.13)", 1, [4, 4]);
      D.line(ctx, eqX + A * sc, midY - 42, eqX + A * sc, railY + 6, "rgba(255,255,255,0.13)", 1, [4, 4]);
      D.spring(ctx, postE.x, midY, mx - cartW / 2 - 1, midY, 10, 10, MC());
      AP.cart(ctx, mx, railY, cartW, 32);
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
    const L = PL.ui.layout(root, { chrome: "quiet" });
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
      // 被驅動的振子：彈簧一端接驅動源（左牆），滑車在軌道上被推著走
      const AP = PL.apparatus;
      const midY = 56, eqX = W / 2, x = A * 26 * Math.sin(wd * t);
      const cartW = 42, railY = midY + 25;
      AP.labStrip(ctx, W, 100, railY + 8, {});
      AP.steel(ctx, 46, railY, W - 72, 8, 4);
      // 驅動器：馬達帶動偏心輪，把彈簧左端以頻率 f 來回推——「驅動頻率」看得見
      const crank = wd * t, drvX = 34 + 4 * Math.cos(crank);
      AP.steel(ctx, 8, midY - 22, 30, 44, -10);
      AP.brassDisc(ctx, 23, midY, 11);
      AP.brassDisc(ctx, 23 + 7 * Math.cos(crank), midY + 7 * Math.sin(crank), 2.6);
      AP.steel(ctx, drvX + 4, midY - 3, 12, 6, 8);
      const postR = { x: drvX + 16, y: midY };
      D.line(ctx, eqX, midY - 44, eqX, railY + 12, "rgba(255,255,255,0.22)", 1, [4, 4]);
      D.text(ctx, "x = 0", eqX, midY - 50, { color: PL.theme.pale(0.8), size: 10.5, align: "center" });
      D.spring(ctx, postR.x, midY, eqX + x - cartW / 2 - 1, midY, 10, 9, MC());
      AP.cart(ctx, eqX + x, railY, cartW, 30);
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
