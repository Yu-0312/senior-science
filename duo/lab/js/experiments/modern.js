/* 模組十二 · 近代物理與宇宙學 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const AP = () => PL.apparatus || {};
  const MC = () => PL.col("m-color", "#ffb74d");
  const nmColor = nm => { let r = 0, g = 0, b = 0; if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else r = 1; return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`; };

  /* 光電效應 */
  PL.register("photoelectric", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.5, 860);
    let electrons = [], acc = 0, Wf = 2.3;
    PL.ui.section(L.controls, "光源");
    const sF = PL.ui.stepper(L.controls, { label: "入射光頻率 f (×10¹⁴ Hz)", value: 8, min: 3, max: 12, step: 0.5, digits: 1 });
    const sI = PL.ui.stepper(L.controls, { label: "光強度 (%)", value: 60, min: 0, max: 100, step: 10 });
    PL.ui.section(L.controls, "金屬（逸出功 W）");
    PL.ui.chipGroup(L.controls, { value: 2.3, options: [{ value: 2.3, label: "鈉 2.3" }, { value: 2.9, label: "鈣 2.9" }, { value: 4.3, label: "鎢 4.3" }], onChange: v => { Wf = v; electrons = []; } });
    PL.ui.note(L.controls, "頻率須高於底限頻率 f₀ 才有光電子；增加光強只增加電子數、不改變 Kmax。");
    const rK = PL.ui.readout(L.readouts, { label: "最大動能 Kmax", unit: "eV" });
    const rF0 = PL.ui.readout(L.readouts, { label: "底限頻率 f₀", unit: "×10¹⁴" });
    const rVs = PL.ui.readout(L.readouts, { label: "遏止電壓 Vₛ", unit: "V" });
    const rW = PL.ui.readout(L.readouts, { label: "逸出功 W", unit: "eV" });
    const charts = PL.el("div", "sim-charts", root);
    const w1 = PL.el("div", "sim-chart", charts); PL.el("div", "chart-title", w1).textContent = "最大動能 Kmax – 頻率 f";
    const cvK = PL.canvas.create(w1, 0.6); PL.el("div", "cap", w1).textContent = "Kmax = hf − W：直線斜率為 h、與 f 軸交點即底限頻率 f₀，與金屬種類無關（只平移）。";
    const w2 = PL.el("div", "sim-chart", charts); PL.el("div", "chart-title", w2).textContent = "光電流 – 電壓 I–V";
    const cvV = PL.canvas.create(w2, 0.6); PL.el("div", "cap", w2).textContent = "反向電壓達遏止電壓 Vₛ 時電流歸零（eVₛ = Kmax）；飽和電流正比於光強。";
    const Eph = () => 0.414 * sF.get(), Kmax = () => Math.max(0, Eph() - Wf), f0 = () => Wf / 0.414, Isat = () => sI.get() / 100;
    function scene() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cy = H * 0.5, cath = 92, anode = W - 92, emit = Kmax() > 0, col = nmColor(700 - (sF.get() - 3) / 9 * 320);
      const AP = PL.apparatus;
      /* 光電管：真空玻璃管裡一片光陰極、一支陽極，放在實驗桌上照光 */
      AP.benchTop(ctx, W, H, H - 14);
      {
        const gx0 = cath - 40, gx1 = anode + 40, gy0 = cy - 92, gy1 = cy + 92;
        const gg = ctx.createLinearGradient(0, gy0, 0, gy1);
        gg.addColorStop(0, "rgba(226,244,252,0.30)"); gg.addColorStop(0.12, "rgba(255,255,255,0.10)");
        gg.addColorStop(0.88, "rgba(200,224,238,0.08)"); gg.addColorStop(1, "rgba(226,244,252,0.30)");
        AP.rrPath(ctx, gx0, gy0, gx1 - gx0, gy1 - gy0, 60); ctx.fillStyle = gg; ctx.fill();
        ctx.strokeStyle = PL.theme.isLight() ? "rgba(90,130,160,0.6)" : "rgba(206,232,244,0.6)"; ctx.lineWidth = 2; ctx.stroke();
        AP.steel(ctx, (gx0 + gx1) / 2 - 30, gy1, 60, H - 14 - gy1, 8);
        D.text(ctx, "真空光電管", (gx0 + gx1) / 2, gy0 - 8, { color: PL.col("text-dim"), size: 10.5, align: "center", weight: "700" });
      }
      // 紫外/可見光源：燈管本體（石英管）＋燈座，斜向照射
      const lx = 20, ly = cy - 108;
      ctx.save();
      ctx.translate(lx + 40, ly); ctx.rotate(0.5);
      // 燈座
      ctx.fillStyle = "rgb(96,102,118)";
      ctx.fillRect(-14, -10, 18, 20);
      // 燈管：乳白玻璃
      const tg = ctx.createLinearGradient(0, -9, 0, 9);
      tg.addColorStop(0, "rgba(235,240,250,0.95)");
      tg.addColorStop(0.5, "rgba(255,255,255,0.9)");
      tg.addColorStop(1, "rgba(210,218,232,0.95)");
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(4, -9, 66, 18, 8) : ctx.rect(4, -9, 66, 18); ctx.fill();
      ctx.strokeStyle = "rgba(120,130,150,0.7)"; ctx.lineWidth = 1; ctx.stroke();
      // 管內輝光（隨波長變色）
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(10, -5, 54, 10, 5) : ctx.rect(10, -5, 54, 10); ctx.fill();
      ctx.restore();
      // 光錐：從燈管到陰極的半透明扇形
      ctx.save();
      const cone = ctx.createLinearGradient(lx + 30, ly, cath - 8, cy);
      cone.addColorStop(0, col.replace("rgb", "rgba").replace(")", ",0.30)"));
      cone.addColorStop(1, col.replace("rgb", "rgba").replace(")", ",0.04)"));
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(lx + 34, ly + 8);
      ctx.lineTo(cath - 6, cy - 64);
      ctx.lineTo(cath - 6, cy + 64);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      // 光束箭頭（保留原本的粒子感）
      for (let i = 0; i < 4; i++) { const yy = cy - 48 + i * 32; D.arrow(ctx, 34, yy - 22, cath - 16, cy - 30 + i * 20, { color: col, width: 2 }); }
      // 光陰極：鋅板質感（金屬漸層）／陽極集電極
      const zk = ctx.createLinearGradient(cath - 16, 0, cath, 0);
      zk.addColorStop(0, "rgb(148,154,166)"); zk.addColorStop(0.5, "rgb(200,206,218)"); zk.addColorStop(1, "rgb(122,128,142)");
      ctx.fillStyle = zk;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cath - 16, cy - 62, 16, 124, 3) : ctx.rect(cath - 16, cy - 62, 16, 124); ctx.fill();
      ctx.strokeStyle = "rgba(70,76,90,0.6)"; ctx.lineWidth = 1; ctx.stroke();
      D.text(ctx, "光陰極（鋅板）", cath - 8, cy + 78, { color: PL.col("text-dim"), size: 10, align: "center" });
      D.rect(ctx, anode, cy - 62, 16, 124, { fill: "#3a4658", stroke: "rgba(255,255,255,0.3)", r: 3 }); D.text(ctx, "集電極", anode + 8, cy + 78, { color: PL.col("text-dim"), size: 10, align: "center" });
      D.line(ctx, cath, cy + 62, cath, H - 16, PL.col("text-faint"), 2); D.line(ctx, anode + 8, cy + 62, anode + 8, H - 16, PL.col("text-faint"), 2);
      D.disc(ctx, (cath + anode) / 2, H - 16, 3, { fill: PL.col("warn") }); D.text(ctx, "V", (cath + anode) / 2 + 8, H - 12, { color: PL.col("warn"), size: 11 });
      electrons.forEach(e => D.disc(ctx, e.x, e.y, 3, { fill: "#5aa2ff", glow: "#5aa2ff", glowSize: 6 }));
      if (!emit) D.text(ctx, "f < f₀：無光電子", (cath + anode) / 2, cy - 76, { color: PL.col("danger"), size: 12, align: "center" });
      rK.set(Kmax(), 2); rF0.set(f0(), 1); rVs.set(Kmax(), 2); rW.set(Wf, 1);
    }
    function chartK() {
      const { W, H } = cvK; cvK.clear();
      const g = PL.graph(cvK, { x: 34, y: 14, w: W - 46, h: H - 34 }, { x0: 0, x1: 12, y0: -0.5, y1: 4 });
      g.frame({ xlabel: "f (×10¹⁴)", ylabel: "Kmax (eV)" }); g.grid(6, 4);
      [2.3, 2.9, 4.3].forEach(wf => g.fn(f => 0.414 * f - wf, { color: wf === Wf ? MC() : "rgba(255,255,255,0.18)", width: wf === Wf ? 2.2 : 1.2 }));
      g.hline(0, { color: PL.col("text-faint"), width: 1 });
      g.vline(f0(), { color: "rgba(255,255,255,0.25)", dash: [3, 3] }); g.label(f0() + 0.2, 3.5, "f₀", { color: PL.col("text-faint"), size: 10 });
      g.dot(sF.get(), Kmax(), { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    function chartV() {
      const { W, H } = cvV; cvV.clear();
      const g = PL.graph(cvV, { x: 30, y: 14, w: W - 42, h: H - 34 }, { x0: -3, x1: 3, y0: 0, y1: 1.15 });
      g.frame({ xlabel: "V", ylabel: "I" }); g.grid(6, 4);
      const Vs = Kmax(), Is = Isat();
      g.fn(V => V >= 0 ? Is : (V <= -Vs ? 0 : Is * (1 + V / (Vs || 1e-3))), { color: MC(), width: 2.2, samples: 120 });
      if (Vs > 0) { g.vline(-Vs, { color: "rgba(255,255,255,0.25)", dash: [3, 3] }); g.label(-Vs, 1.05, "−Vₛ", { color: PL.col("text-faint"), size: 10, dx: 2 }); }
    }
    function drawAll() { scene(); chartK(); chartV(); }
    cv.onResize(drawAll); cvK.onResize(drawAll); cvV.onResize(drawAll);
    const anim = PL.loop(dt => {
      if (dt) {
        acc += dt; const K = Kmax();
        if (K > 0 && sI.get() > 0 && acc > (0.18 - sI.get() / 100 * 0.15)) { acc = 0; const sp = 40 + Math.sqrt(K) * 70; electrons.push({ x: cv.W * 0.5 * 0 + 96, y: cv.H * 0.5 + (Math.random() * 90 - 45), vx: sp, vy: (Math.random() - 0.5) * 22 }); }
        electrons.forEach(e => { e.x += e.vx * dt; e.y += e.vy * dt; }); electrons = electrons.filter(e => e.x < cv.W - 92);
      }
      drawAll();
    });
    anim.start();
    return { stop() { anim.stop(); cv.destroy(); cvK.destroy(); cvV.destroy(); }, rerender: drawAll };
  }});




  /* 原子核與放射性半衰期 */
  PL.register("halflife", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const N0 = 144; let t = 0, nuclei = [];
    const sT = PL.ui.slider(L.controls, { label: "半衰期 T½", min: 1, max: 6, step: 0.5, value: 3, unit: "s", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "開始衰變", () => { anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rN = PL.ui.readout(L.readouts, { label: "剩餘核數", unit: "" });
    const rHl = PL.ui.readout(L.readouts, { label: "經過半衰期", unit: "個" });
    function reset() { t = 0; nuclei = []; for (let i = 0; i < N0; i++) nuclei.push(1); }
    reset();
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const remain = nuclei.reduce((a, b) => a + b, 0);
      // 核格
      const AP = PL.apparatus;
      /* 教室裡的經典模擬：一盤 144 枚硬幣，每隔一段時間搖一次，翻成反面（灰色）就代表那顆核衰變了 */
      AP.deskTop(ctx, 0, 0, W, H);
      const cols = 12, trayW = W * 0.44, cellW = (trayW - 24) / cols, r = Math.min(cellW * 0.42, 13);
      const rowsN = Math.ceil(N0 / cols), trayH = rowsN * cellW + 24;
      ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(16, 20, trayW, trayH);
      ctx.fillStyle = PL.theme.isLight() ? "#7a4a2a" : "#4a2e1c"; ctx.fillRect(12, 16, trayW, trayH);
      ctx.fillStyle = PL.theme.isLight() ? "#2f6b4a" : "#1f4a34"; ctx.fillRect(22, 26, trayW - 20, trayH - 20);
      PL.theme.note(ctx, "#2a5e42", 22, 26, trayW - 20, trayH - 20);
      nuclei.forEach((alive, i) => {
        const cxp = 24 + (i % cols) * cellW + cellW / 2, cyp = 28 + Math.floor(i / cols) * cellW + cellW / 2;
        const g2 = ctx.createRadialGradient(cxp - r * 0.3, cyp - r * 0.35, 1, cxp, cyp, r);
        if (alive) { g2.addColorStop(0, "rgb(255,236,150)"); g2.addColorStop(0.7, "rgb(214,166,60)"); g2.addColorStop(1, "rgb(150,108,30)"); }
        else { g2.addColorStop(0, "rgb(214,218,224)"); g2.addColorStop(0.7, "rgb(150,156,166)"); g2.addColorStop(1, "rgb(100,106,116)"); }
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cxp, cyp, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = alive ? "rgba(120,84,20,0.7)" : "rgba(70,74,82,0.7)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cxp, cyp, r * 0.72, 0, Math.PI * 2); ctx.stroke();
      });
      D.text(ctx, "金色＝尚未衰變　灰色＝已衰變", 16, trayH + 36, { color: PL.col("text"), size: 10.5, weight: "700" });
      // 衰變曲線
      const bx = W * 0.5, by = 24, bw = W - bx - 20, bh = H - 48, Tm = sT.get() * 5;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: Tm, y0: 0, y1: N0 });
      g.frame({ title: "剩餘核數 – 時間", xlabel: "t (s)", ylabel: "N" }); g.grid(5, 4);
      g.fn(tt => N0 * Math.pow(0.5, tt / sT.get()), { color: MC(), width: 2.2 });
      for (let k = 1; k <= 4; k++) { g.vline(k * sT.get(), { color: "rgba(255,255,255,0.15)", dash: [2, 3], width: 1 }); }
      g.dot(Math.min(t, Tm), remain, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
      rN.set(remain, 0); rHl.set(t / sT.get(), 2);
    }
    const anim = PL.loop(dt => {
      if (dt) { t += dt; const T = sT.get(); const pDecay = 1 - Math.pow(0.5, dt / T); nuclei = nuclei.map(a => a && Math.random() < pDecay ? 0 : a); if (t > T * 5) anim.stop(); }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});


  /* 密立根油滴實驗 */
  PL.register("millikan", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    const e = 1.6e-19, g = 9.8, d = 0.01; let y = 0, n = 3, mass = 3e-15;
    const sV = PL.ui.slider(L.controls, { label: "電壓 V", min: 0, max: 600, step: 5, value: 200, unit: "V", digits: 0 });
    PL.ui.button(PL.ui.buttonRow(L.controls), "換一顆油滴", () => { n = 1 + Math.floor(Math.random() * 5); mass = (2 + Math.random() * 3) * 1e-15; y = 0; }, { primary: true });
    PL.ui.note(L.controls, "調電壓讓油滴懸浮：qE = mg。測得電量都是基本電荷 e 的整數倍。");
    const rQ = PL.ui.readout(L.readouts, { label: "油滴電量 q", unit: "C" });
    const rN = PL.ui.readout(L.readouts, { label: "= 基本電荷", unit: "×e" });
    const rState = PL.ui.readout(L.readouts, { label: "狀態" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q = n * e, E = sV.get() / d, Fnet = q * E - mass * g;
      const topY = 40, botY = H - 40, cx = W / 2;
      const AP = PL.apparatus;
      /* 密立根裝置：兩片黃銅平行板（中間夾透明絕緣環），側面打光，用顯微鏡看油滴 */
      AP.labRoom(ctx, W, H, H - 12, {});
      AP.brass(ctx, cx - 100, topY - 12, 200, 12); AP.brass(ctx, cx - 100, botY, 200, 12);
      ctx.fillStyle = "rgba(210,236,248,0.18)"; ctx.fillRect(cx - 92, topY, 184, botY - topY);
      ctx.strokeStyle = PL.theme.isLight() ? "rgba(90,130,160,0.5)" : "rgba(206,232,244,0.5)"; ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 92, topY, 184, botY - topY);
      AP.steel(ctx, cx - 60, botY + 12, 120, H - 12 - botY - 12, 6);
      // 側光燈與顯微鏡
      AP.lampHouse(ctx, cx - 120, (topY + botY) / 2, 0.7, "rgb(255,248,225)");
      ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = "#fff6d0";
      ctx.beginPath(); ctx.moveTo(cx - 118, (topY + botY) / 2 - 6); ctx.lineTo(cx + 92, (topY + botY) / 2 - 40); ctx.lineTo(cx + 92, (topY + botY) / 2 + 40); ctx.lineTo(cx - 118, (topY + botY) / 2 + 6); ctx.fill(); ctx.restore();
      AP.steel(ctx, cx + 110, (topY + botY) / 2 - 9, 70, 18, 10);
      AP.steel(ctx, cx + 176, (topY + botY) / 2 - 13, 16, 26, -4);
      D.text(ctx, "顯微鏡", cx + 146, (topY + botY) / 2 - 16, { color: PL.col("text-dim"), size: 10, align: "center" });
      D.text(ctx, "＋ " + sV.get() + "V", cx - 100, topY - 18, { color: "#d9463b", size: 11, weight: "700" });
      D.text(ctx, "－", cx - 100, botY + 26, { color: "#2f6fd0", size: 12, weight: "700" });
      const dropY = PL.clamp(botY - 20 - y, topY + 14, botY - 12);
      D.disc(ctx, cx, dropY, 7, { fill: "#ffe08a", glow: "#ffe08a", glowSize: 12 });
      D.arrow(ctx, cx + 22, dropY, cx + 22, dropY + 30, { color: PL.col("warn"), width: 2, label: "mg" });
      if (E > 0) D.arrow(ctx, cx - 22, dropY, cx - 22, dropY - PL.clamp(q * E * 4e13, 6, 40), { color: "#5aa2ff", width: 2, label: "qE" });
      const bal = Math.abs(Fnet) < mass * g * 0.04;
      rQ.set(q, 2); rN.set(Math.round(q / e), 0); rState.set(bal ? "懸浮 ✓" : Fnet > 0 ? "上升" : "下降");
    }
    const anim = PL.loop(dt => { if (dt) { const q = n * e, E = sV.get() / d, Fnet = q * E - mass * g; y += (Fnet / (mass * g)) * dt * 42; y = PL.clamp(y, -(cv.H - 110), cv.H - 110); } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 拉塞福散射（金箔實驗）—— 放大到一顆金原子核附近
   *
   * 舊版的背景是網格底，α 粒子軌跡用半透明白線——淺色主題下幾乎看不見；
   * 粒子一格跑 150 px，軌跡只剩幾個折點；畫面剛打開時也空空的。
   * 現在：
   *   · 主畫面是固定暗色的「放大視窗」（兩種主題一樣），金原子的電子雲只是淡淡一團
   *   · 小步長積分，散射角符合 tan(θ/2) = K/(v²b)（K ∝ Z）：b 越小偏得越多，正對時彈回
   *   · 粒子束均勻鋪滿視窗：多數幾乎直走，極少數被彈回
   *   · 飛出視窗處閃一下（硫化鋅螢光屏的閃光），右下角累計各角度的次數
   *   · 進場先預跑幾秒，一打開就看得到殘影
   */
  PL.register("rutherford", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const V0 = 260, bins = [0, 0, 0, 0];               // 0–10°、10–30°、30–90°、90–180°
    let alphas = [], ghosts = [], flashes = [], hi = null, seed = 7, acc = 0;
    const sZ = PL.ui.slider(L.controls, { label: "原子核電荷 Z", min: 20, max: 90, step: 1, value: 79, unit: "", digits: 0 });
    const sB = PL.ui.slider(L.controls, { label: "瞄準參數 b", min: 0, max: 60, step: 2, value: 20, unit: "", digits: 0, onInput: () => { if (hi) hi.hl = false; hi = spawn(sB.get(), true); alphas.push(hi); } });
    PL.ui.note(L.controls, "多數 α 粒子幾乎直穿；瞄準參數 b 越小、越接近原子核，散射角越大，正對時會被彈回。右下角累計螢光屏上各角度的閃光次數。");
    const rAng = PL.ui.readout(L.readouts, { label: "此粒子散射角", unit: "°" });
    const rBack = PL.ui.readout(L.readouts, { label: "反彈（>90°）比例", unit: "%" });
    const rnd = () => { seed = (seed * 1664525 + 1013904223) | 0; return ((seed >>> 8) & 0xffffff) / 0xffffff; };
    const nucleus = () => ({ x: cv.W * 0.58, y: cv.H / 2 });
    const Kof = () => sZ.get() / 79 * 5.75 * V0 * V0;    // Z = 79、b = 10 時散射角約 60°
    const theta = b => b <= 0 ? 180 : 2 * Math.atan(Kof() / (V0 * V0 * b)) * 180 / Math.PI;
    function spawn(b, highlight) { const N = nucleus(); return { x: -8, y: N.y - b, vx: V0, vy: 0, tr: [-8, N.y - b], hl: highlight }; }
    function step(p, dt) {
      const N = nucleus(), K = Kof(), n = 8, h = dt / n;
      for (let i = 0; i < n; i++) {
        const dx = p.x - N.x, dy = p.y - N.y, r2 = dx * dx + dy * dy + 9, r = Math.sqrt(r2), a = K / r2;
        p.vx += a * dx / r * h; p.vy += a * dy / r * h; p.x += p.vx * h; p.y += p.vy * h;
      }
      p.tr.push(p.x, p.y); if (p.tr.length > 600) p.tr.splice(0, 2);
    }
    function tick(dt) {
      const W = cv.W, H = cv.H;
      acc += dt * 5;
      while (acc >= 1) { acc -= 1; alphas.push(spawn((rnd() * 2 - 1) * H * 0.48, false)); }
      alphas.forEach(p => step(p, dt));
      alphas = alphas.filter(p => {
        if (p.x < W + 10 && p.x > -20 && p.y > -10 && p.y < H + 10) return true;
        const deg = Math.atan2(Math.abs(p.vy), p.vx) * 180 / Math.PI;
        bins[deg < 10 ? 0 : deg < 30 ? 1 : deg < 90 ? 2 : 3]++;
        flashes.push({ x: PL.clamp(p.x, 3, W - 3), y: PL.clamp(p.y, 3, H - 3), age: 0 });
        ghosts.push({ tr: p.tr, age: 0, hl: p.hl }); if (ghosts.length > 24) ghosts.shift();
        return false;
      });
      if (!alphas.includes(hi)) { hi = spawn(sB.get(), true); alphas.push(hi); }
      flashes.forEach(f => f.age += dt / 0.9); flashes = flashes.filter(f => f.age < 1);
      ghosts.forEach(g => g.age += dt); ghosts = ghosts.filter(g => g.age < 6);
    }
    function warm() { for (let i = 0; i < 200; i++) tick(1 / 60); }
    function restart() { alphas = []; ghosts = []; flashes = []; hi = spawn(sB.get(), true); alphas.push(hi); warm(); }
    function trail(ctx, tr, color, w) {
      if (tr.length < 4) return;
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(tr[0], tr[1]);
      for (let i = 2; i < tr.length; i += 2) ctx.lineTo(tr[i], tr[i + 1]);
      ctx.stroke();
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear();
      const AP = PL.apparatus, N = nucleus(), Z = sZ.get(), nr = 4 + 4 * Math.cbrt(Z / 79), b = sB.get();
      // 固定暗色的放大視窗
      const bg = ctx.createRadialGradient(N.x, N.y, 10, N.x, N.y, Math.max(W, H) * 0.8);
      bg.addColorStop(0, "rgb(28,36,56)"); bg.addColorStop(1, "rgb(8,11,20)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      PL.theme.note(ctx, "rgb(14,19,32)", 0, 0, W, H);
      // 金原子的電子雲（原子其實比核大上萬倍，這裡只能示意）
      const R = H * 0.46, eg = ctx.createRadialGradient(N.x, N.y, nr, N.x, N.y, R);
      eg.addColorStop(0, "rgba(120,160,255,0.18)"); eg.addColorStop(0.55, "rgba(120,160,255,0.07)"); eg.addColorStop(1, "rgba(120,160,255,0)");
      ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(N.x, N.y, R, 0, TAU); ctx.fill();
      ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
      ghosts.forEach(g => trail(ctx, g.tr, g.hl ? "rgba(127,231,255," + PL.fmt(0.5 * (1 - g.age / 6), 3) + ")" : "rgba(255,210,110," + PL.fmt(0.3 * (1 - g.age / 6), 3) + ")", g.hl ? 1.6 : 1));
      alphas.forEach(p => { if (!p.hl) trail(ctx, p.tr, "rgba(255,210,110,0.6)", 1.2); });
      if (hi) trail(ctx, hi.tr, "rgba(127,231,255,0.95)", 2.2);
      ctx.restore();
      alphas.forEach(p => D.disc(ctx, p.x, p.y, p.hl ? 5 : 2.8, { fill: p.hl ? "#7fe7ff" : "#ffd66e", glow: p.hl ? "#7fe7ff" : undefined, glowSize: 8 }));
      // 原子核
      D.disc(ctx, N.x, N.y, nr, { fill: "#ff5a4f", glow: "#ff5a4f", glowSize: 16 });
      D.text(ctx, (Z === 79 ? "金原子核" : "原子核") + "（+" + Z + "e）", N.x, N.y - nr - 12, { color: "#ffb4ab", size: 11, align: "center", weight: "700" });
      // 瞄準參數 b：入射線到「正對原子核那條線」的垂直距離
      const hy = N.y - b;
      D.line(ctx, 0, hy, N.x - 50, hy, "rgba(127,231,255,0.4)", 1, [4, 4]);
      D.line(ctx, 0, N.y, N.x - nr - 4, N.y, "rgba(255,255,255,0.2)", 1, [2, 4]);
      if (b >= 6) {
        const bx = N.x - 56;
        D.line(ctx, bx, hy, bx, N.y, "rgba(127,231,255,0.85)", 1.2);
        D.line(ctx, bx - 4, hy, bx + 4, hy, "rgba(127,231,255,0.85)", 1.2); D.line(ctx, bx - 4, N.y, bx + 4, N.y, "rgba(127,231,255,0.85)", 1.2);
        D.text(ctx, "b", bx - 7, (hy + N.y) / 2 + 4, { color: "#7fe7ff", size: 12, align: "right", weight: "800" });
      }
      // 螢光屏上的閃光
      flashes.forEach(f => D.disc(ctx, f.x, f.y, 2.5 + 5 * (1 - f.age), { fill: "rgba(150,255,176," + PL.fmt(1 - f.age, 2) + ")", glow: "rgba(150,255,176,0.9)", glowSize: 10 }));
      // 左上：實驗裝置全貌（鉛盒 α 源 → 金箔 → 硫化鋅螢光屏）；畫面太窄時省略
      if (W >= 520) {
        const ix = 12, iy = 12, iw = 196, ih = 104, cyI = iy + ih / 2 + 6;
        AP.infoCard(ctx, ix, iy, iw, ih);
        ctx.fillStyle = "rgb(70,74,82)"; ctx.fillRect(ix + 12, cyI - 12, 30, 24);
        ctx.fillStyle = "rgb(40,42,48)"; ctx.fillRect(ix + 38, cyI - 3, 6, 6);
        ctx.strokeStyle = "rgba(230,170,40,0.95)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ix + 44, cyI); ctx.lineTo(ix + 100, cyI); ctx.stroke();
        ctx.fillStyle = "rgb(222,182,70)"; ctx.fillRect(ix + 100, cyI - 22, 3, 44);
        ctx.strokeStyle = "rgba(80,190,120,0.95)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ix + 101, cyI, 42, -1.2, 1.2); ctx.stroke();
        ctx.strokeStyle = "rgba(230,170,40,0.8)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ix + 102, cyI); ctx.lineTo(ix + 138, cyI - 24); ctx.moveTo(ix + 102, cyI); ctx.lineTo(ix + 142, cyI + 6); ctx.moveTo(ix + 102, cyI); ctx.lineTo(ix + 72, cyI - 30); ctx.stroke();
        D.text(ctx, "α 源", ix + 27, cyI + 24, { color: PL.col("text-dim"), size: 9, align: "center" });
        D.text(ctx, "金箔", ix + 101, cyI + 34, { color: PL.col("text-dim"), size: 9, align: "center" });
        D.text(ctx, "螢光屏", ix + 166, cyI + 4, { color: PL.col("text-dim"), size: 9, align: "center" });
        D.text(ctx, "實驗裝置（俯視）↘ 放大到一顆原子核", ix + 8, iy + 14, { color: PL.col("text"), size: 9.5, weight: "700" });
      }
      // 右下：螢光屏各角度的累計閃光次數（對數長度，才看得到最稀少的那一格）
      const total = bins[0] + bins[1] + bins[2] + bins[3], pw = 196, ph = 104, px = W - pw - 12, py = H - ph - 12;
      if (W > 460) {
        AP.rrPath(ctx, px, py, pw, ph, 8); ctx.fillStyle = "rgba(6,10,18,0.82)"; ctx.fill(); ctx.strokeStyle = "rgba(150,255,176,0.35)"; ctx.lineWidth = 1; ctx.stroke();
        D.text(ctx, "螢光屏閃光計數（散射角）", px + 10, py + 17, { color: "#d7f7df", size: 10.5, weight: "700" });
        const mx = Math.log10(1 + Math.max(1, ...bins));
        ["0–10°", "10–30°", "30–90°", ">90°"].forEach((lab, i) => {
          const yy = py + 36 + i * 17, bw = (pw - 108) * Math.log10(1 + bins[i]) / mx;
          D.text(ctx, lab, px + 10, yy + 4, { color: "#b9d3c2", size: 9.5 });
          ctx.fillStyle = i === 3 ? "rgba(255,120,110,0.85)" : "rgba(150,255,176,0.75)"; ctx.fillRect(px + 58, yy - 5, Math.max(1, bw), 9);
          D.text(ctx, String(bins[i]), px + pw - 10, yy + 4, { color: "#e8f5ec", size: 9.5, align: "right" });
        });
      }
      D.text(ctx, "示意：原子核約 10⁻¹⁴ m、原子約 10⁻¹⁰ m，實際比例差一萬倍", 12, H - 10, { color: "rgba(200,212,236,0.55)", size: 9.5 });
      rAng.set(theta(b), 1); rBack.set(total ? bins[3] / total * 100 : 0, 2);
    }
    restart();
    const anim = PL.loop(dt => { if (dt) tick(Math.min(dt, 0.04)); draw(); });
    cv.onResize(() => { restart(); draw(); }); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
