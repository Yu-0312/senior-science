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

  /* 拉塞福散射（金箔實驗） */
  PL.register("rutherford", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    let alphas = [], hi = null;
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sZ = PL.ui.slider(L.controls, { label: "原子核電荷 Z", min: 20, max: 90, step: 5, value: 79, unit: "", digits: 0 });
    const sB = PL.ui.slider(L.controls, { label: "瞄準參數 b", min: 0, max: 60, step: 2, value: 20, unit: "", digits: 0, onInput: () => { hi = spawn(sB.get(), true); alphas.push(hi); } });
    PL.ui.note(L.controls, "多數 α 粒子直穿；瞄準參數越小、越接近核心，散射角越大。");
    const rAng = PL.ui.readout(L.readouts, { label: "此粒子散射角", unit: "°" });
    const nucleus = () => ({ x: cv.W * 0.62, y: cv.H / 2 });
    function spawn(b, highlight) { const N = nucleus(); return { x: -10, y: N.y - b, vx: 150, vy: 0, trail: [], hl: highlight }; }
    function step(p, dt) { const N = nucleus(), K = sZ.get() * 26; for (let i = 0; i < 4; i++) { const dx = p.x - N.x, dy = p.y - N.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2) + 4, f = K / (r2 + 60); p.vx += f * dx / r * dt / 4; p.vy += f * dy / r * dt / 4; p.x += p.vx * dt / 4; p.y += p.vy * dt / 4; } if (p.trail.length < 220) p.trail.push({ x: p.x, y: p.y }); }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const N = nucleus();
      /*
       * 核的大小與標籤跟著 Z 走。
       * 原本半徑固定 10、標籤永遠是「原子核 +」，於是在射出粒子之前
       * 調整 Z 完全看不出任何差別——這支滑桿在靜止畫面上等於不存在。
       * 核半徑取 Z^(1/3)：這正是核物理 R ∝ A^(1/3) 的比例，不是隨便放大。
       */
      const Z = sZ.get(), nr = 6 + 5 * Math.cbrt(Z / 79);
      /* 左上角的小圖：實驗裝置全貌（鉛盒 α 源 → 金箔 → 硫化鋅螢光屏＋顯微鏡）。主畫面是放大到一顆金原子核附近 */
      {
        const AP = PL.apparatus, ix = 12, iy = 12, iw = 190, ih = 104;
        AP.infoCard(ctx, ix, iy, iw, ih);
        const cyI = iy + ih / 2 + 6;
        ctx.fillStyle = "rgb(70,74,82)"; ctx.fillRect(ix + 12, cyI - 12, 30, 24);
        ctx.fillStyle = "rgb(40,42,48)"; ctx.fillRect(ix + 38, cyI - 3, 6, 6);
        ctx.strokeStyle = "rgba(255,200,80,0.9)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ix + 44, cyI); ctx.lineTo(ix + 100, cyI); ctx.stroke();
        ctx.fillStyle = "rgb(222,182,70)"; ctx.fillRect(ix + 100, cyI - 22, 3, 44);
        ctx.strokeStyle = "rgba(120,200,150,0.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ix + 101, cyI, 42, -1.2, 1.2); ctx.stroke();
        ctx.strokeStyle = "rgba(255,200,80,0.7)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ix + 102, cyI); ctx.lineTo(ix + 136, cyI - 26); ctx.moveTo(ix + 102, cyI); ctx.lineTo(ix + 70, cyI - 30); ctx.stroke();
        D.text(ctx, "α 源", ix + 27, cyI + 24, { color: PL.col("text-dim"), size: 9, align: "center" });
        D.text(ctx, "金箔", ix + 101, cyI + 34, { color: PL.col("text-dim"), size: 9, align: "center" });
        D.text(ctx, "螢光屏", ix + 160, cyI + 4, { color: PL.col("text-dim"), size: 9, align: "center" });
        D.text(ctx, "實驗裝置（俯視）↘ 放大到一顆原子核", ix + 8, iy + 14, { color: PL.col("text"), size: 9.5, weight: "700" });
      }
      D.disc(ctx, N.x, N.y, nr, { fill: PL.col("danger"), glow: PL.col("danger"), glowSize: 16 });
      D.text(ctx, "原子核 Z = " + Z, N.x, N.y - nr - 8, { color: PL.col("danger"), size: 11, align: "center" });
      alphas.forEach(p => { ctx.save(); ctx.strokeStyle = p.hl ? MC() : "rgba(255,255,255,0.22)"; ctx.lineWidth = p.hl ? 2 : 1; ctx.beginPath(); p.trail.forEach((q, i) => i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.stroke(); ctx.restore(); D.disc(ctx, p.x, p.y, p.hl ? 5 : 3, { fill: p.hl ? MC() : "#ffe08a" }); });
      if (hi) rAng.set(Math.atan2(-hi.vy, hi.vx) * 180 / Math.PI, 1);
    }
    hi = spawn(sB.get(), true); alphas.push(hi);
    const anim = PL.loop(dt => {
      if (dt) {
        dt = Math.min(dt, 0.03);
        if (Math.random() < 0.25) alphas.push(spawn((Math.random() - 0.5) * 130, false));
        alphas.forEach(p => step(p, dt * 60));
        alphas = alphas.filter(p => p.x < cv.W + 30 && p.x > -40 && p.y > -30 && p.y < cv.H + 30);
        if (!alphas.includes(hi)) { hi = spawn(sB.get(), true); alphas.push(hi); }
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
