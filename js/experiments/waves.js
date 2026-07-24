/* 模組八 · 波動與聲音 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#7986cb");

  /* 橫波與縱波 */
  PL.register("wave-types", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    let t = 0;
    const sType = PL.ui.select(L.controls, { label: "波的種類", value: "trans", options: [{ value: "trans", label: "橫波（如繩波）" }, { value: "long", label: "縱波（如聲波）" }] });
    const sF = PL.ui.slider(L.controls, { label: "頻率 f", min: 0.3, max: 1.5, step: 0.1, value: 0.7, unit: "Hz", digits: 1 });
    const sA = PL.ui.slider(L.controls, { label: "振幅 A", min: 6, max: 26, step: 1, value: 18, unit: "", digits: 0 });
    PL.ui.note(L.controls, "紅色質點只在原地振動，波形卻向右傳遞——傳遞的是能量而非介質。");
    const rV = PL.ui.readout(L.readouts, { label: "波速 v=fλ", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const midY = H / 2, k = TAU / (W * 0.34), w = TAU * sF.get(), A = sA.get();
      if (sType.get() === "trans") {
        ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2.4; ctx.beginPath();
        for (let x = 30; x <= W - 30; x += 3) { const y = midY + A * Math.sin(k * x - w * t); x === 30 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
        for (let i = 0; i < 14; i++) { const x = 40 + i * (W - 80) / 13; const y = midY + A * Math.sin(k * x - w * t); D.disc(ctx, x, y, i === 4 ? 6 : 3.5, { fill: i === 4 ? PL.col("danger") : "rgba(255,255,255,0.4)" }); if (i === 4) D.line(ctx, x, midY - A - 6, x, midY + A + 6, "rgba(255,107,107,0.3)", 1, [3, 3]); }
      } else {
        for (let i = 0; i < 60; i++) { const x0 = 34 + i * (W - 68) / 59; const dx = A * 0.7 * Math.sin(k * x0 - w * t); const dens = 1 - Math.cos(k * x0 - w * t) * 0.5; D.disc(ctx, x0 + dx, midY, 3, { fill: i === 20 ? PL.col("danger") : `rgba(121,134,203,${0.4 + dens * 0.4})` }); }
        D.text(ctx, "疏部", 34 + (W - 68) * 0.25, midY - 30, { color: PL.col("text-faint"), size: 10, align: "center" });
        D.text(ctx, "密部", 34 + (W - 68) * 0.5, midY - 30, { color: PL.col("text-dim"), size: 10, align: "center" });
      }
      rV.set(sF.get() * (W * 0.34) / 30, 2);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 波的疊加與干涉 */
  PL.register("superposition", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.7);
    let t = 0;
    const sA1 = PL.ui.slider(L.controls, { label: "波1 振幅", min: 5, max: 25, step: 1, value: 16, unit: "", digits: 0 });
    const sA2 = PL.ui.slider(L.controls, { label: "波2 振幅", min: 5, max: 25, step: 1, value: 16, unit: "", digits: 0 });
    const sPh = PL.ui.slider(L.controls, { label: "相位差 Δφ", min: 0, max: 360, step: 5, value: 0, unit: "°", digits: 0 });
    const rState = PL.ui.readout(L.readouts, { label: "干涉結果" });
    const rSum = PL.ui.readout(L.readouts, { label: "合成振幅", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const k = TAU / (W * 0.32), w = 2.2, A1 = sA1.get(), A2 = sA2.get(), ph = sPh.get() * Math.PI / 180;
      const rows = [H * 0.22, H * 0.5, H * 0.78];
      const wave = (y0, f, col, wid) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = wid; ctx.beginPath(); for (let x = 30; x <= W - 30; x += 2) { const y = y0 - f(x); x === 30 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); D.line(ctx, 30, y0, W - 30, y0, "rgba(255,255,255,0.08)", 1); };
      wave(rows[0], x => A1 * Math.sin(k * x - w * t), PL.col("accent-2"), 1.8);
      wave(rows[1], x => A2 * Math.sin(k * x - w * t + ph), PL.col("accent-3"), 1.8);
      wave(rows[2], x => A1 * Math.sin(k * x - w * t) + A2 * Math.sin(k * x - w * t + ph), MC(), 2.6);
      D.text(ctx, "波 1", 34, rows[0] - 34, { color: PL.col("accent-2"), size: 11 });
      D.text(ctx, "波 2", 34, rows[1] - 34, { color: PL.col("accent-3"), size: 11 });
      D.text(ctx, "合成波", 34, rows[2] - 34, { color: MC(), size: 11 });
      const sum = Math.sqrt(A1 * A1 + A2 * A2 + 2 * A1 * A2 * Math.cos(ph));
      rState.set(sPh.get() < 30 || sPh.get() > 330 ? "相長干涉" : Math.abs(sPh.get() - 180) < 30 ? "相消干涉" : "部分干涉");
      rSum.set(sum, 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 弦上的駐波 */
  PL.register("standing-wave", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let t = 0;
    const sN = PL.ui.slider(L.controls, { label: "諧波 n", min: 1, max: 6, step: 1, value: 3, unit: "", digits: 0 });
    const sV = PL.ui.slider(L.controls, { label: "波速 v", min: 40, max: 200, step: 10, value: 120, unit: "m/s", digits: 0 });
    PL.ui.note(L.controls, "兩端固定，只有特定頻率能形成駐波：波節不動、波腹振幅最大。");
    const rF = PL.ui.readout(L.readouts, { label: "頻率 fₙ", unit: "Hz" });
    const rNodes = PL.ui.readout(L.readouts, { label: "波節數" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const n = sN.get(), x0 = 40, x1 = W - 40, Ls = x1 - x0, midY = H / 2, A = H * 0.3;
      const k = n * Math.PI / Ls, w = 4;
      // 包絡
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); for (let x = x0; x <= x1; x += 2) ctx.lineTo(x, midY - A * Math.abs(Math.sin(k * (x - x0)))); ctx.stroke();
      ctx.beginPath(); for (let x = x0; x <= x1; x += 2) ctx.lineTo(x, midY + A * Math.abs(Math.sin(k * (x - x0)))); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2.6; ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) { const y = midY - 2 * A * 0.5 * Math.sin(k * (x - x0)) * Math.cos(w * t); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      // 波節
      for (let i = 0; i <= n; i++) { const x = x0 + Ls * i / n; D.disc(ctx, x, midY, 4, { fill: PL.col("danger") }); }
      D.line(ctx, x0, midY - A - 10, x0, midY + A + 10, PL.col("text-faint"), 3); D.line(ctx, x1, midY - A - 10, x1, midY + A + 10, PL.col("text-faint"), 3);
      const f = n * sV.get() / (2 * 4); // fₙ = n v /2L（L 以相對單位）
      rF.set(sN.get() * sV.get() / 8, 1); rNodes.set(n + 1, 0);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 都卜勒效應 */
  PL.register("doppler", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const c = 90, f0 = 1.2; let t = 0, fronts = [], sx = 0, emitAcc = 0;
    PL.ui.section(L.controls, "波源");
    const sVs = PL.ui.slider(L.controls, { label: "波源速度 vₛ", min: -60, max: 60, step: 2, value: 40, unit: "px/s", digits: 0 });
    PL.ui.note(L.controls, "波源前方波前被壓縮（頻率變高），後方被拉開（頻率變低）。");
    const rFront = PL.ui.readout(L.readouts, { label: "前方觀測 f′", unit: "×f" });
    const rBack = PL.ui.readout(L.readouts, { label: "後方觀測 f′", unit: "×f" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "觀測頻率 f′/f – 波源速度", cap: "接近時 f′>f（藍移/變高）、遠離時 f′<f（紅移/變低）；速度越快偏移越大。" });
    function reset() { sx = -0; fronts = []; }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cy = H / 2, cx = W / 2 + sx;
      fronts.forEach(f => { const r = c * (t - f.t0); if (r > 0 && r < W) D.ring(ctx, W / 2 + f.x0, cy, r, "rgba(121,134,203,0.5)", 1.5); });
      D.disc(ctx, cx, cy, 8, { fill: MC(), glow: MC(), glowSize: 12 });
      if (sVs.get() !== 0) D.arrow(ctx, cx, cy, cx + Math.sign(sVs.get()) * 30, cy, { color: "#fff", width: 2 });
      // 觀察者
      D.disc(ctx, W - 30, cy, 6, { fill: PL.col("accent-2") }); D.text(ctx, "觀察者", W - 30, cy - 14, { color: PL.col("accent-2"), size: 10, align: "center" });
      const vs = sVs.get();
      rFront.set(c / (c - vs), 2); rBack.set(c / (c + vs), 2);
      // f′/f – vₛ 圖
      cc.clear();
      const g = PL.graph(cc, { x: 36, y: 14, w: cc.W - 48, h: cc.H - 34 }, { x0: -60, x1: 60, y0: 0.4, y1: 3 });
      g.frame({ xlabel: "vₛ (px/s)", ylabel: "f′/f" }); g.grid(6, 5); g.hline(1, { color: PL.col("text-faint"), width: 1 });
      g.fn(v => PL.clamp(c / (c - v), 0, 3), { color: MC(), width: 2 });
      g.fn(v => PL.clamp(c / (c + v), 0, 3), { color: PL.col("accent-2"), width: 2, dash: [4, 3] });
      g.dot(vs, PL.clamp(c / (c - vs), 0, 3), { color: MC(), glow: MC() });
      D.text(cc.ctx, "前方", cc.W - 46, 22, { color: MC(), size: 10 }); D.text(cc.ctx, "後方", cc.W - 46, 36, { color: PL.col("accent-2"), size: 10 });
    }
    const anim = PL.loop(dt => {
      if (dt) { t += dt; sx += sVs.get() * dt; emitAcc += dt; if (emitAcc > 1 / f0) { emitAcc = 0; fronts.push({ x0: sx, t0: t }); } fronts = fronts.filter(f => c * (t - f.t0) < cv.W); if (Math.abs(sx) > cv.W / 2 - 30) { sx = -Math.sign(sVs.get()) * (cv.W / 2 - 40); fronts = []; } }
      draw();
    });
    cv.onResize(draw); cc.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 拍 */
  PL.register("beats", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let t = 0;
    const sF1 = PL.ui.slider(L.controls, { label: "頻率 f₁", min: 4, max: 12, step: 0.1, value: 8, unit: "Hz", digits: 1 });
    const sF2 = PL.ui.slider(L.controls, { label: "頻率 f₂", min: 4, max: 12, step: 0.1, value: 9, unit: "Hz", digits: 1 });
    PL.ui.note(L.controls, "兩個頻率相近的聲音疊加，響度週期性強弱起伏，這就是「拍」。");
    const rBeat = PL.ui.readout(L.readouts, { label: "拍頻 |f₁−f₂|", unit: "Hz" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const f1 = sF1.get(), f2 = sF2.get(), midY = H / 2, A = H * 0.3, x0 = 30, span = W - 60;
      // 包絡
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); for (let i = 0; i <= span; i += 2) { const x = x0 + i, tt = i / span * 2 + t; const env = 2 * A * Math.abs(Math.cos(Math.PI * (f1 - f2) * tt)); ctx.lineTo(x, midY - env); } ctx.stroke();
      ctx.beginPath(); for (let i = 0; i <= span; i += 2) { const x = x0 + i, tt = i / span * 2 + t; const env = 2 * A * Math.abs(Math.cos(Math.PI * (f1 - f2) * tt)); ctx.lineTo(x, midY + env); } ctx.stroke(); ctx.restore();
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= span; i += 1) { const x = x0 + i, tt = i / span * 2 + t; const y = midY - A * (Math.sin(TAU * f1 * tt) + Math.sin(TAU * f2 * tt)); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      rBeat.set(Math.abs(f1 - f2), 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt * 0.4; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 聲音的共鳴（共鳴管） */
  PL.register("resonance-tube", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    let t = 0; const v = 343;
    const sType = PL.ui.select(L.controls, { label: "管型", value: "closed", options: [{ value: "closed", label: "閉管（一端封閉）" }, { value: "open", label: "開管（兩端開口）" }] });
    const sN = PL.ui.slider(L.controls, { label: "諧波 n", min: 1, max: 5, step: 1, value: 1, unit: "", digits: 0 });
    const sL = PL.ui.slider(L.controls, { label: "管長 L", min: 0.2, max: 1, step: 0.05, value: 0.5, unit: "m", digits: 2 });
    const rLam = PL.ui.readout(L.readouts, { label: "波長 λ", unit: "m" });
    const rF = PL.ui.readout(L.readouts, { label: "共鳴頻率", unit: "Hz" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const closed = sType.get() === "closed", n = sN.get(), Lm = sL.get();
      const x0 = 50, x1 = W - 40, span = x1 - x0, midY = H / 2, A = H * 0.28;
      // 管壁
      D.line(ctx, x0, midY - 46, x1, midY - 46, PL.col("text-faint"), 2); D.line(ctx, x0, midY + 46, x1, midY + 46, PL.col("text-faint"), 2);
      if (closed) D.line(ctx, x0, midY - 46, x0, midY + 46, PL.col("m-color", "#7986cb"), 4); // 封閉端
      // 位移駐波：閉管封閉端為節、開口端為腹
      const shape = xx => { const u = (xx - x0) / span; // 0..1
        if (closed) return Math.sin((2 * n - 1) * Math.PI / 2 * u);
        return Math.sin(n * Math.PI * u);
      };
      [1, -1].forEach(sgn => { ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.14)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]); ctx.beginPath(); for (let x = x0; x <= x1; x += 2) ctx.lineTo(x, midY + sgn * A * Math.abs(shape(x))); ctx.stroke(); ctx.restore(); });
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2.6; ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) { const y = midY - A * shape(x) * Math.cos(4 * t); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      const lam = closed ? 4 * Lm / (2 * n - 1) : 2 * Lm / n;
      rLam.set(lam, 2); rF.set(v / lam, 0);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
