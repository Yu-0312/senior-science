/* 模組六 · 簡諧運動 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#4fc3f7");

  /* 彈簧振子 */
  PL.register("spring", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    let t = 0, hist = [], prevX = null, prevCross = null, crossGaps = [];
    const resetHist = () => { hist = []; prevX = null; prevCross = null; crossGaps = []; };
    const sM = PL.ui.slider(L.controls, { label: "質量 m", min: 0.5, max: 6, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: resetHist });
    const sK = PL.ui.slider(L.controls, { label: "勁度 k", min: 5, max: 60, step: 1, value: 20, unit: "N/m", digits: 0, onInput: resetHist });
    const sA = PL.ui.slider(L.controls, { label: "振幅 A", min: 0.5, max: 2.5, step: 0.1, value: 1.6, unit: "m", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    /* 播放／暫停由引擎的傳輸列統一提供（還附單步與速度），實驗不再自備，避免兩個開關互相打架。 */
    const rT = PL.ui.readout(L.readouts, { label: "理論週期 2π√(m/k)", unit: "s" });
    const rTm = PL.ui.readout(L.readouts, { label: "實測週期（過零量測）", unit: "s" });
    const rX = PL.ui.readout(L.readouts, { label: "位移 x", unit: "m" });
    const rV = PL.ui.readout(L.readouts, { label: "速度 v", unit: "m/s" });
    const rA = PL.ui.readout(L.readouts, { label: "加速度 a", unit: "m/s²" });
    const rF = PL.ui.readout(L.readouts, { label: "回復力 F", unit: "N" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m = sM.get(), k = sK.get(), A = sA.get(), w = Math.sqrt(k / m);
      const x = A * Math.cos(w * t), v = -A * w * Math.sin(w * t), a = -w * w * x, F = -k * x;
      const AP = PL.apparatus;
      // 幾何：牆在左，滑軌貫穿全場，平衡點讓最大振幅的滑塊兩端都撞不到牆
      const wallX = 34, cartW = 48, ay = 66, railY = ay + 27;
      const sc = (W - wallX - 74 - cartW) / 5;   // 位移滿檔 5 m
      const eqX = wallX + 62 + cartW / 2 + 2.5 * sc;
      cv.calibrate(sc, "m");      // 尺可直接量振幅與位移
      const mx = eqX + x * sc;

      // 滑軌與牆面固定座
      AP.steel(ctx, wallX - 10, railY, W - wallX - 26, 8, 4);
      AP.steel(ctx, wallX - 14, ay - 26, 14, 66, -20);
      AP.steel(ctx, wallX, ay - 8, 10, 26, 8);   // 彈簧固定座
      // 平衡位置用主題藍強調（liziwuli 同款語彙）；±A 跟著 A 滑桿伸縮
      const dash = [4, 4];
      D.line(ctx, eqX, ay - 52, eqX, railY + 14, "rgba(110,180,255,0.55)", 1.2, dash);
      D.line(ctx, eqX - A * sc, ay - 46, eqX - A * sc, railY + 8, "rgba(255,255,255,0.13)", 1, dash);
      D.line(ctx, eqX + A * sc, ay - 46, eqX + A * sc, railY + 8, "rgba(255,255,255,0.13)", 1, dash);
      D.text(ctx, "−A", eqX - A * sc, ay - 52, { color: PL.theme.pale(0.55), size: 10.5, align: "center" });
      D.text(ctx, "+A", eqX + A * sc, ay - 52, { color: PL.theme.pale(0.55), size: 10.5, align: "center" });
      D.text(ctx, "平衡位置 x = 0", eqX, ay - 54, { color: "rgba(140,196,255,0.9)", size: 10.5, align: "center" });

      // 彈簧與滑塊（掛點在車身側面中心）
      D.spring(ctx, wallX + 8, ay, mx - cartW / 2, ay, 11, 11, MC());
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
        const xn = A * Math.cos(w * t);
        // 週期量測：x 由負轉正的瞬間是「同一相位」，相鄰兩次間隔即實測週期
        if (prevX !== null && prevX < 0 && xn >= 0) {
          if (prevCross !== null) {
            const gap = t - prevCross;
            if (gap > 0.4 * TAU / w) { crossGaps.push(gap); if (crossGaps.length > 4) crossGaps.shift(); }
          }
          prevCross = t;
        }
        prevX = xn;
        hist.push([t, xn, -A * w * Math.sin(w * t), -w * w * xn]);
        if (hist.length > 900) hist.shift();
      }
      draw();
    });
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
      const A = PL.apparatus;
      const px = W / 2, py = 46, Lpx = Math.min((H - 96), (W * 0.42)) * (Lm / 4) + 40;

      /* 鐵架吊起的單擺：擺長是從夾頭量到球心，架子畫出來學生才知道那一段從哪算起 */
      A.benchTop(ctx, W, H, H - 24);
      A.standRod(ctx, px - 118, H - 22, py - 26);
      A.crossArm(ctx, px - 118, py - 16, px);

      // 擺動弧
      D.ring(ctx, px, py, Lpx, PL.theme.pale(0.10), 1);
      const bx = px + Lpx * Math.sin(th), by = py + Lpx * Math.cos(th);
      D.line(ctx, px, py, px, py + Lpx, PL.theme.pale(0.18), 1, [4, 4]);
      A.cord(ctx, px, py, bx, by);
      A.bob(ctx, bx, by, 15);
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
       * sc 以滑桿上限為準的固定比例尺：振幅變大，振子真的跑更遠。
       * 能量圖的座標軸同樣固定，兩根滑桿的作用都看得出來。
       */
      const A_MAX = 0.5, K_MAX = 60;
      const AP = PL.apparatus;
      const midY = 58, sc = (W - 120) / (2 * A_MAX), eqX = W / 2, mx = eqX + x * sc;
      const cartW = 42, railY = midY + 27;
      // 牆、軌道與平衡位置：振子畫成真的彈簧掛車，不是幾何符號
      AP.steel(ctx, 28, railY, W - 52, 8, 4);
      AP.steel(ctx, 24, midY - 24, 12, 62, -20);
      AP.steel(ctx, 36, midY - 6, 9, 22, 8);
      D.line(ctx, eqX, midY - 48, eqX, railY + 12, "rgba(255,255,255,0.22)", 1, [4, 4]);
      D.text(ctx, "x = 0", eqX, midY - 54, { color: PL.theme.pale(0.8), size: 10.5, align: "center" });
      D.line(ctx, eqX - A * sc, midY - 42, eqX - A * sc, railY + 6, "rgba(255,255,255,0.13)", 1, [4, 4]);
      D.line(ctx, eqX + A * sc, midY - 42, eqX + A * sc, railY + 6, "rgba(255,255,255,0.13)", 1, [4, 4]);
      D.spring(ctx, 44, midY, mx - cartW / 2, midY, 10, 10, MC());
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
      // 被驅動的振子：彈簧一端接驅動源（左牆），滑車在軌道上被推著走
      const AP = PL.apparatus;
      const midY = 56, eqX = W / 2, x = A * 26 * Math.sin(wd * t);
      const cartW = 42, railY = midY + 25;
      AP.steel(ctx, 46, railY, W - 72, 8, 4);
      AP.steel(ctx, 36, midY - 22, 12, 58, -20);
      AP.steel(ctx, 48, midY - 6, 9, 20, 8);
      D.line(ctx, eqX, midY - 44, eqX, railY + 12, "rgba(255,255,255,0.22)", 1, [4, 4]);
      D.text(ctx, "x = 0", eqX, midY - 50, { color: PL.theme.pale(0.8), size: 10.5, align: "center" });
      D.spring(ctx, 56, midY, eqX + x - cartW / 2, midY, 10, 9, MC());
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
