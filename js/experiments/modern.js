/* 模組十二 · 近代物理與宇宙學 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#ffb74d");
  const nmColor = nm => { let r = 0, g = 0, b = 0; if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else r = 1; return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`; };

  /* 光電效應 */
  PL.register("photoelectric", { build(root) {
    const L = PL.ui.layout(root);
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
      // 入射光束
      for (let i = 0; i < 4; i++) { const yy = cy - 48 + i * 32; D.arrow(ctx, 22, yy - 16, cath - 16, cy - 30 + i * 20, { color: col, width: 2 }); }
      // 光陰極 / 陽極
      D.rect(ctx, cath - 16, cy - 62, 16, 124, { fill: MC(), stroke: "rgba(255,255,255,0.3)", r: 3 }); D.text(ctx, "光陰極", cath - 8, cy + 78, { color: PL.col("text-dim"), size: 10, align: "center" });
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

  /* 波耳原子模型與原子光譜 */
  PL.register("bohr", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let ni = 3, nf = 2, er = 3, photons = [];
    const sNi = PL.ui.slider(L.controls, { label: "初始能階 nᵢ", min: 2, max: 6, step: 1, value: 3, unit: "", digits: 0, onInput: v => { ni = v; } });
    const sNf = PL.ui.slider(L.controls, { label: "終能階 n_f", min: 1, max: 5, step: 1, value: 2, unit: "", digits: 0, onInput: v => { nf = v; } });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "電子躍遷", () => { if (ni > nf) { er = ni; anim.start(); tgt = nf; } }, { primary: true });
    const rE = PL.ui.readout(L.readouts, { label: "放出能量 ΔE", unit: "eV" });
    const rLam = PL.ui.readout(L.readouts, { label: "光波長 λ", unit: "nm" });
    const rSeries = PL.ui.readout(L.readouts, { label: "譜線系" });
    let tgt = 2;
    function En(n) { return -13.6 / (n * n); }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W * 0.32, cy = H / 2;
      D.disc(ctx, cx, cy, 8, { fill: NPcol(), glow: MC(), glowSize: 12 });
      for (let n = 1; n <= 6; n++) D.ring(ctx, cx, cy, 14 + n * 14, "rgba(255,255,255,0.12)", 1);
      const R = 14 + er * 14, ea = Date.now() / 300;
      D.disc(ctx, cx + R * Math.cos(ea), cy + R * Math.sin(ea), 5, { fill: "#5aa2ff", glow: "#5aa2ff", glowSize: 8 });
      const dE = En(nf) - En(ni), lam = 1240 / Math.abs(dE);
      photons.forEach(p => { D.line(ctx, p.x - 8, p.y, p.x, p.y, nmColor(PL.clamp(lam, 380, 720)), 2); });
      // 能階圖
      const bx = W * 0.62, top = 30, bot = H - 30;
      for (let n = 1; n <= 6; n++) { const y = PL.lerp(bot, top, (En(n) + 13.6) / 13.6); D.line(ctx, bx, y, W - 24, y, "rgba(255,255,255,0.2)", 1.4); D.text(ctx, "n=" + n, bx - 6, y + 4, { color: PL.col("text-faint"), size: 10, align: "right" }); }
      const yi = PL.lerp(bot, top, (En(ni) + 13.6) / 13.6), yf = PL.lerp(bot, top, (En(nf) + 13.6) / 13.6);
      if (ni > nf) D.arrow(ctx, bx + 40, yi, bx + 40, yf, { color: nmColor(PL.clamp(lam, 380, 720)), width: 2, label: "ΔE" });
      const series = nf === 1 ? "萊曼系（紫外）" : nf === 2 ? "巴耳末系（可見）" : "帕申系（紅外）";
      rE.set(Math.abs(dE), 2); rLam.set(lam, 0); rSeries.set(series);
    }
    function NPcol() { return MC(); }
    const anim = PL.loop(dt => { if (dt) { if (er > tgt + 0.02) { er += (tgt - er) * Math.min(1, dt * 4); if (er <= tgt + 0.05) { photons.push({ x: cv.W * 0.32 + 60, y: cv.H / 2 }); } } photons.forEach(p => p.x += 120 * dt); photons = photons.filter(p => p.x < cv.W); if (er <= tgt + 0.05 && photons.length === 0) anim.stop(); } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 物質波（德布羅意） */
  PL.register("matter-wave", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    let t = 0;
    const sV = PL.ui.slider(L.controls, { label: "速度 v", min: 1, max: 10, step: 0.5, value: 4, unit: "×10⁶ m/s", digits: 1 });
    const sM = PL.ui.select(L.controls, { label: "粒子", value: "1", options: [{ value: "1", label: "電子" }, { value: "1836", label: "質子（重 1836 倍）" }] });
    PL.ui.note(L.controls, "λ = h / (mv)：動量越大，物質波波長越短，波動性越不明顯。");
    const rLam = PL.ui.readout(L.readouts, { label: "德布羅意波長 λ", unit: "（相對）" });
    const rP = PL.ui.readout(L.readouts, { label: "動量 p", unit: "（相對）" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m = +sM.get(), v = sV.get(), p = m * v, lamPx = PL.clamp(4000 / p, 8, 220), cy = H / 2;
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2.2; ctx.beginPath();
      for (let x = 20; x < W - 20; x += 2) { const u = (x - W / 2) / (W * 0.28); const env = Math.exp(-(u * u)); const y = cy - 34 * env * Math.sin(TAU * (x - 20) / lamPx - t * 6); x === 20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      D.disc(ctx, W / 2, cy, 9, { fill: "#5aa2ff", glow: "#5aa2ff", glowSize: 10 });
      D.arrow(ctx, W / 2, cy, W / 2 + v * 6, cy, { color: "#fff", width: 2, label: "v" });
      // 波長標示
      D.line(ctx, W / 2 - lamPx / 2, cy + 44, W / 2 + lamPx / 2, cy + 44, MC(), 1.5);
      D.text(ctx, "λ", W / 2, cy + 40, { color: MC(), size: 12, align: "center" });
      rLam.set(4000 / p, 1); rP.set(p, 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 狹義相對論（時間膨脹光鐘） */
  PL.register("relativity", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let t = 0;
    const sV = PL.ui.slider(L.controls, { label: "速度 v", min: 0, max: 0.99, step: 0.01, value: 0.6, unit: "c", digits: 2, onInput: draw });
    PL.ui.note(L.controls, "運動時鐘走得較慢：光在移動光鐘中走斜線、路徑較長，故一次滴答耗時較久。");
    const rG = PL.ui.readout(L.readouts, { label: "時間膨脹因子 γ", unit: "" });
    const rT = PL.ui.readout(L.readouts, { label: "運動時鐘 1 秒 = 靜止", unit: "s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const v = sV.get(), gamma = 1 / Math.sqrt(1 - v * v);
      // 靜止光鐘
      const c1x = W * 0.22, top = 46, bot = H - 80, ph = (t % 1);
      D.text(ctx, "靜止光鐘", c1x, top - 14, { color: PL.col("accent-2"), size: 11, align: "center" });
      D.line(ctx, c1x - 24, top, c1x + 24, top, PL.col("text-faint"), 3); D.line(ctx, c1x - 24, bot, c1x + 24, bot, PL.col("text-faint"), 3);
      const y1 = ph < 0.5 ? PL.lerp(top, bot, ph * 2) : PL.lerp(bot, top, (ph - 0.5) * 2);
      D.disc(ctx, c1x, y1, 5, { fill: "#ffe08a", glow: "#ffe08a", glowSize: 8 });
      // 運動光鐘（光走斜線）
      const c2x = W * 0.62, drift = 90;
      D.text(ctx, "運動光鐘（v=" + PL.fmt(v, 2) + "c）", c2x + drift / 2, top - 14, { color: MC(), size: 11, align: "center" });
      const php = (t / gamma) % 1;
      const x2 = c2x + php * drift, xr = c2x + (php < 0.5 ? php : (1 - php)) * drift * 2 * 0 + php * drift;
      D.line(ctx, c2x - 24, top, c2x + 24, top, PL.col("text-faint"), 3); D.line(ctx, c2x - 24 + drift, bot, c2x + 24 + drift, bot, PL.col("text-faint"), 3);
      const y2 = php < 0.5 ? PL.lerp(top, bot, php * 2) : PL.lerp(bot, top, (php - 0.5) * 2);
      const mx = c2x + php * drift;
      D.disc(ctx, mx, y2, 5, { fill: MC(), glow: MC(), glowSize: 8 });
      D.line(ctx, c2x, top, mx, y2, "rgba(255,183,77,0.3)", 1, [3, 3]);
      // γ 曲線
      const bx = 30, by = H - 60, bw = W - 60, bh = 44;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: 1, y0: 1, y1: 7 });
      g.frame({ xlabel: "v/c", ylabel: "γ" });
      g.fn(vv => 1 / Math.sqrt(1 - Math.min(0.999, vv) ** 2), { color: MC(), width: 2, samples: 120 });
      g.dot(v, Math.min(7, gamma), { color: PL.col("accent-2"), glow: PL.col("accent-2") });
      rG.set(gamma, 3); rT.set(gamma, 3);
    }
    const anim = PL.loop(dt => { if (dt) t += dt * 0.6; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 原子核與放射性半衰期 */
  PL.register("halflife", { build(root) {
    const L = PL.ui.layout(root);
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
      const cols = 18, cellW = (W * 0.42 - 20) / cols, r = Math.min(cellW, 9) * 0.42;
      nuclei.forEach((alive, i) => { const cxp = 20 + (i % cols) * cellW + cellW / 2, cyp = 30 + Math.floor(i / cols) * cellW + cellW / 2; D.disc(ctx, cxp, cyp, r, { fill: alive ? MC() : "rgba(255,255,255,0.12)" }); });
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

  /* 大霹靂與哈伯定律 */
  PL.register("hubble", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.68, 920);
    const distances = [12, 28, 47, 76, 108, 145, 190, 248, 312];
    let galaxies = [];
    const sH = PL.ui.slider(L.controls, { label: "假設的哈伯常數 H₀", min: 55, max: 85, step: 1, value: 70, unit: "km/s/Mpc", digits: 0, onInput: draw });
    const sNoise = PL.ui.slider(L.controls, { label: "觀測雜訊 σ", min: 0, max: 280, step: 10, value: 120, unit: "km/s", digits: 0, onInput: draw });
    const sGalaxy = PL.ui.select(L.controls, { label: "觀測星系", value: "4", options: distances.map((distance, index) => ({ value: String(index), label: "星系 " + (index + 1) + " · " + distance + " Mpc" })), onChange: draw });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "重新觀測樣本", () => { makeGalaxies(); draw(); }, { primary: true });
    PL.ui.note(L.controls, "先選一個星系，讀出譜線向紅端位移的紅移 z；再看下方所有星系的距離—退行速度散點圖。最佳擬合線的斜率就是 H₀。單一資料點有雜訊，趨勢要用一組資料判讀。");
    const rD = PL.ui.readout(L.readouts, { label: "選取星系距離 d", unit: "Mpc" });
    const rV = PL.ui.readout(L.readouts, { label: "量得退行速度 v", unit: "km/s" });
    const rZ = PL.ui.readout(L.readouts, { label: "紅移 z", unit: "×10⁻³" });
    const rFit = PL.ui.readout(L.readouts, { label: "資料擬合 H₀", unit: "km/s/Mpc" });
    function normal() {
      const u = Math.max(1e-8, Math.random()), v = Math.max(1e-8, Math.random());
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
    }
    function makeGalaxies() { galaxies = distances.map(d => ({ d, residual: normal() })); }
    function velocity(galaxy) { return Math.max(0, sH.get() * galaxy.d + galaxy.residual * sNoise.get()); }
    function fittedH0() {
      let sumDV = 0, sumD2 = 0;
      galaxies.forEach(galaxy => { const v = velocity(galaxy); sumDV += galaxy.d * v; sumD2 += galaxy.d * galaxy.d; });
      return sumDV / sumD2;
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const selected = galaxies[PL.clamp(+sGalaxy.get(), 0, galaxies.length - 1)], v = velocity(selected), z = v / 300000, fit = fittedH0();
      const sx = 36, sy = 38, sw = W - 72, sh = H * 0.31;
      D.rect(ctx, sx, sy, sw, sh, { fill: "rgba(5,10,18,0.5)", stroke: "rgba(255,255,255,0.18)", width: 1, r: 7 });
      D.text(ctx, "光譜儀：以吸收譜線的位移量測紅移", sx + 16, sy + 20, { color: PL.col("text"), size: 12, weight: "700" });
      D.text(ctx, "示意比例放大", sx + sw - 16, sy + 20, { color: PL.col("text-faint"), size: 9, align: "right" });
      const start = sx + 66, end = sx + sw - 34, spectrumY = sy + sh * 0.53;
      const wavelengthToX = wavelength => start + (wavelength - 400) / 320 * (end - start);
      const shift = Math.min(sw * 0.25, z * sw * 3.4);
      D.line(ctx, start, spectrumY - 21, end, spectrumY - 21, "rgba(210,222,240,0.58)", 6);
      D.line(ctx, start, spectrumY + 29, end, spectrumY + 29, "rgba(255,110,112,0.55)", 6);
      [430, 486, 517, 656].forEach(wavelength => {
        const x = wavelengthToX(wavelength);
        D.line(ctx, x, spectrumY - 30, x, spectrumY - 12, "#111827", 3);
        D.line(ctx, x + shift, spectrumY + 20, x + shift, spectrumY + 38, "#111827", 3);
      });
      D.text(ctx, "實驗室參考譜線 λ₀", sx + 18, spectrumY - 15, { color: PL.col("text-faint"), size: 9 });
      D.text(ctx, "星系 " + (+sGalaxy.get() + 1) + " 觀測譜線 λ", sx + 18, spectrumY + 35, { color: PL.col("danger"), size: 9 });
      D.arrow(ctx, wavelengthToX(517), spectrumY + 53, wavelengthToX(517) + shift, spectrumY + 53, { color: MC(), width: 1.8, label: "Δλ" });
      D.text(ctx, "z = Δλ / λ₀ = " + PL.fmt(z * 1000, 2) + " ×10⁻³", sx + sw * 0.7, sy + sh - 15, { color: MC(), size: 10.5, align: "center", weight: "700" });

      const bx = 50, by = H * 0.49, bw = W - 100, bh = H * 0.41;
      const ymax = Math.max(500, ...galaxies.map(velocity)) * 1.16;
      const graph = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: 350, y0: 0, y1: ymax });
      graph.frame({ title: "星系觀測資料：v–d 散點圖", xlabel: "距離 d (Mpc)", ylabel: "退行速度 v (km/s)" }); graph.grid(7, 5);
      graph.fn(distance => fit * distance, { color: MC(), width: 2.4 });
      galaxies.forEach((galaxy, index) => graph.dot(galaxy.d, velocity(galaxy), { color: index === +sGalaxy.get() ? PL.col("warn") : PL.col("accent-2"), glow: index === +sGalaxy.get() ? PL.col("warn") : undefined, r: index === +sGalaxy.get() ? 5 : 3.8 }));
      graph.label(205, fit * 205 + ymax * 0.05, "最佳擬合斜率 = " + PL.fmt(fit, 1) + " km/s/Mpc", { color: MC(), size: 10 });
      rD.set(selected.d, 0); rV.set(v, 0); rZ.set(z * 1000, 2); rFit.set(fit, 1);
    }
    makeGalaxies(); cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 密立根油滴實驗 */
  PL.register("millikan", { build(root) {
    const L = PL.ui.layout(root);
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
      D.rect(ctx, cx - 90, topY - 8, 180, 8, { fill: "#ff6b6b" }); D.text(ctx, "＋ " + sV.get() + "V", cx - 90, topY - 14, { color: "#ff6b6b", size: 11 });
      D.rect(ctx, cx - 90, botY, 180, 8, { fill: "#5aa2ff" }); D.text(ctx, "－", cx - 90, botY + 16, { color: "#5aa2ff", size: 11 });
      const dropY = PL.clamp(botY - 20 - y, topY + 14, botY - 12);
      D.disc(ctx, cx, dropY, 8, { fill: "#ffe08a", glow: "#ffe08a", glowSize: 10 });
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
    const L = PL.ui.layout(root);
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
      D.disc(ctx, N.x, N.y, 10, { fill: PL.col("danger"), glow: PL.col("danger"), glowSize: 16 }); D.text(ctx, "原子核 +", N.x, N.y - 18, { color: PL.col("danger"), size: 11, align: "center" });
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
