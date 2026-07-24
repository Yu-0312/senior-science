/* 模組七 · 流體與熱學 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#e57373");

  /* 浮力與阿基米德原理 */
  PL.register("buoyancy", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let bob = 0;
    const sObj = PL.ui.slider(L.controls, { label: "物體密度 ρ物", min: 200, max: 2000, step: 50, value: 600, unit: "kg/m³", digits: 0 });
    const sFl = PL.ui.slider(L.controls, { label: "流體密度 ρ流", min: 500, max: 1400, step: 50, value: 1000, unit: "kg/m³", digits: 0 });
    PL.ui.note(L.controls, "水的密度約 1000 kg/m³。沒入比例 = ρ物 / ρ流；比值 ≥ 1 就下沉。");
    const rState = PL.ui.readout(L.readouts, { label: "狀態" });
    const rSub = PL.ui.readout(L.readouts, { label: "沒入比例", unit: "%" });
    const rFb = PL.ui.readout(L.readouts, { label: "浮力 / 重力" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const ro = sObj.get(), rf = sFl.get(), ratio = ro / rf, floats = ratio < 1;
      const surf = 90, tankL = 40, tankR = W - 40, bottom = H - 24;
      D.rect(ctx, tankL, surf, tankR - tankL, bottom - surf, { fill: "rgba(90,162,255,0.14)" });
      D.line(ctx, tankL, surf, tankR, surf, PL.col("accent-2"), 2);
      D.line(ctx, tankL, bottom, tankR, bottom, PL.col("text-faint"), 2);
      D.line(ctx, tankL, surf, tankL, bottom, PL.col("text-faint"), 2); D.line(ctx, tankR, surf, tankR, bottom, PL.col("text-faint"), 2);
      const boxW = 84, boxH = 64, cx = W / 2;
      const sub = floats ? ratio : 1;
      let topY = floats ? surf - boxH * (1 - sub) + bob : surf - 0 + bob;
      if (!floats) topY = bottom - boxH; // 沉底
      D.rect(ctx, cx - boxW / 2, topY, boxW, boxH, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 4 });
      D.text(ctx, ro + "", cx, topY + boxH / 2 + 4, { color: "#04121a", size: 12, align: "center", weight: "700" });
      // 力向量
      const midX = cx, wY = topY + boxH / 2;
      D.arrow(ctx, midX - 26, wY, midX - 26, wY + 42, { color: PL.col("warn"), width: 2.4, label: "重力" });
      const fb = floats ? 1 : ratio < 1 ? ratio : 1 / ratio; // 浮力/重力
      D.arrow(ctx, midX + 26, wY, midX + 26, wY - 42 * (floats ? 1 : 1 / ratio), { color: PL.col("accent-2"), width: 2.4, label: "浮力" });
      rState.set(floats ? "漂浮" : "下沉"); rSub.set(sub * 100, 0); rFb.set(floats ? "平衡" : PL.fmt(1 / ratio, 2));
    }
    const anim = PL.loop((dt, t) => { bob = Math.sin(t * 1.6) * 3; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 白努利原理 */
  PL.register("bernoulli", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const rho = 1000; let parts = [];
    const sV = PL.ui.slider(L.controls, { label: "入口流速 v₁", min: 1, max: 6, step: 0.5, value: 3, unit: "m/s", digits: 1 });
    const sN = PL.ui.slider(L.controls, { label: "窄管收縮比", min: 1.5, max: 4, step: 0.1, value: 2.5, unit: "×", digits: 1 });
    const rV2 = PL.ui.readout(L.readouts, { label: "窄管流速 v₂", unit: "m/s" });
    const rDp = PL.ui.readout(L.readouts, { label: "壓力差 P₁−P₂", unit: "Pa" });
    function shape(x, W) { const wide = 46, t = x / W; // 中段收縮
      const narrow = wide / sN.get();
      const c = 0.5, band = 0.16;
      let f = 1; if (t > c - band && t < c + band) { const u = (t - (c - band)) / (2 * band); f = 1 - (1 - narrow / wide) * Math.sin(Math.PI * u); }
      return wide * f;
    }
    for (let i = 0; i < 70; i++) parts.push({ x: Math.random(), y: Math.random() * 2 - 1 });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const midY = H * 0.42, x0 = 30, x1 = W - 30, PW = x1 - x0;
      ctx.save(); ctx.strokeStyle = PL.col("text-faint"); ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const x = x0 + PW * i / 100, h = shape(PW * i / 100, PW); i ? ctx.lineTo(x, midY - h) : ctx.moveTo(x, midY - h); } ctx.stroke();
      ctx.beginPath(); for (let i = 0; i <= 100; i++) { const x = x0 + PW * i / 100, h = shape(PW * i / 100, PW); i ? ctx.lineTo(x, midY + h) : ctx.moveTo(x, midY + h); } ctx.stroke(); ctx.restore();
      // 粒子
      const v1 = sV.get(), A1 = 46;
      parts.forEach(p => {
        const h = shape(p.x * PW, PW), v = v1 * A1 / h;
        D.disc(ctx, x0 + p.x * PW, midY + p.y * (h - 6), 2.2, { fill: MC() });
      });
      // 壓力管（越窄壓力越低）
      const gauge = (t, label) => { const x = x0 + PW * t, h = shape(PW * t, PW), v = v1 * A1 / h; const P = 0.5 * rho * (v1 * v1 - v * v); const col = "rgba(90,162,255,0.5)"; const gh = 50 - P / 40; D.rect(ctx, x - 6, midY - h - Math.max(8, gh), 12, Math.max(8, gh), { fill: col }); D.text(ctx, label, x, midY - h - Math.max(8, gh) - 6, { color: PL.col("text-dim"), size: 10, align: "center" }); };
      gauge(0.12, "P₁ 高"); gauge(0.5, "P₂ 低"); gauge(0.88, "P₃");
      const v2 = v1 * A1 / shape(PW * 0.5, PW);
      rV2.set(v2, 2); rDp.set(0.5 * rho * (v2 * v2 - v1 * v1), 0);
    }
    const anim = PL.loop(dt => { if (dt) { const v1 = sV.get(); parts.forEach(p => { const PW = cv.W - 60; const h = shape(p.x * PW, PW); p.x += (v1 * 46 / h) * dt * 0.08; if (p.x > 1) { p.x = 0; p.y = Math.random() * 2 - 1; } }); } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 理想氣體與分子動能論 */
  PL.register("gas", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const N = 44; let parts = [], Tprev = 300;
    const sT = PL.ui.slider(L.controls, { label: "溫度 T", min: 100, max: 600, step: 10, value: 300, unit: "K", digits: 0 });
    const sV = PL.ui.slider(L.controls, { label: "體積 V（箱寬）", min: 0.5, max: 1, step: 0.02, value: 1, unit: "×", digits: 2 });
    const rP = PL.ui.readout(L.readouts, { label: "壓力 P", unit: "kPa" });
    const rVrms = PL.ui.readout(L.readouts, { label: "分子均方根速率", unit: "" });
    function initP() { parts = []; for (let i = 0; i < N; i++) { const a = Math.random() * TAU, s = 60; parts.push({ x: Math.random(), y: Math.random(), vx: Math.cos(a) * s, vy: Math.sin(a) * s }); } }
    initP();
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const boxL = 34, boxT = 30, boxR = 34 + (W - 130) * sV.get(), boxB = H - 34;
      D.rect(ctx, boxL, boxT, boxR - boxL, boxB - boxT, { stroke: PL.col("text-faint"), width: 2, r: 4 });
      parts.forEach(p => { D.disc(ctx, boxL + p.x * (boxR - boxL), boxT + p.y * (boxB - boxT), 3.5, { fill: MC(), glow: MC(), glowSize: 6 }); });
      const T = sT.get(), Vr = sV.get(), P = 8.314 * (N / 6.02e23 * 1e23) * T / (Vr * 30) * 0.4; // 相對壓力
      const Ppl = 300 * T / 300 / (Vr) * (1 / 30) * 0.9;
      rP.set(101 * (T / 300) / Vr, 0); rVrms.set(Math.sqrt(T) * 2, 0);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        const T = sT.get(), Vr = sV.get(); const ratio = Math.sqrt(T / Tprev); if (Math.abs(ratio - 1) > 1e-3) { parts.forEach(p => { p.vx *= ratio; p.vy *= ratio; }); Tprev = T; }
        const boxW = (cv.W - 130) * Vr, boxH = cv.H - 64;
        parts.forEach(p => { p.x += p.vx * dt / boxW; p.y += p.vy * dt / boxH; if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); } if (p.x > 1) { p.x = 1; p.vx = -Math.abs(p.vx); } if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); } if (p.y > 1) { p.y = 1; p.vy = -Math.abs(p.vy); } });
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 氣體定律（波以耳 / 查理） */
  PL.register("gas-laws", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sProc = PL.ui.select(L.controls, { label: "過程", value: "iso", options: [{ value: "iso", label: "等溫（波以耳）" }, { value: "isobar", label: "等壓（查理）" }], onChange: draw });
    const sDrive = PL.ui.slider(L.controls, { label: "調整", min: 0.4, max: 1.6, step: 0.02, value: 1, unit: "×", digits: 2, onInput: draw });
    const rP = PL.ui.readout(L.readouts, { label: "壓力 P", unit: "kPa" });
    const rV = PL.ui.readout(L.readouts, { label: "體積 V", unit: "L" });
    const rT = PL.ui.readout(L.readouts, { label: "溫度 T", unit: "K" });
    function state() {
      const d = sDrive.get();
      if (sProc.get() === "iso") { const V = 2 * d, T = 300, P = 300 * 2 / V; return { V, T, P }; }
      const T = 300 * d, V = 2 * d, P = 300; return { V, T, P };
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const s = state();
      // 汽缸
      const cylX = 40, cylW = 80, cylTop = 30, cylBot = H - 30, fullH = cylBot - cylTop;
      const gasH = fullH * PL.clamp(s.V / 3.2, 0.1, 1);
      D.rect(ctx, cylX, cylTop, cylW, fullH, { stroke: PL.col("text-faint"), width: 2, r: 3 });
      D.rect(ctx, cylX, cylBot - gasH, cylW, gasH, { fill: "rgba(229,115,115,0.2)" });
      D.rect(ctx, cylX - 4, cylBot - gasH - 10, cylW + 8, 10, { fill: PL.col("text-faint"), r: 2 }); // 活塞
      D.text(ctx, "氣體", cylX + cylW / 2, cylBot - gasH / 2, { color: MC(), size: 12, align: "center" });
      // P–V 圖
      const bx = cylX + cylW + 40, by = 40, bw = W - bx - 20, bh = H - 70;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: 3.4, y0: 0, y1: 700 });
      g.frame({ title: "P – V 圖", xlabel: "V (L)", ylabel: "P (kPa)" }); g.grid(4, 4);
      if (sProc.get() === "iso") g.fn(V => 300 * 2 / V, { color: MC(), width: 2.2, samples: 120 });
      else g.curve([[0.8, 300], [3.2, 300]], { color: MC(), width: 2.2 });
      g.dot(s.V, s.P, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
      rP.set(s.P, 0); rV.set(s.V, 2); rT.set(s.T, 0);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 熱平衡與比熱 */
  PL.register("heat", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let T1, T2, running = false;
    const s1 = PL.ui.slider(L.controls, { label: "物體1 溫度", min: 0, max: 100, step: 1, value: 80, unit: "°C", digits: 0, onInput: reset });
    const sm1 = PL.ui.slider(L.controls, { label: "物體1 質量", min: 0.5, max: 4, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const s2 = PL.ui.slider(L.controls, { label: "物體2 溫度", min: 0, max: 100, step: 1, value: 20, unit: "°C", digits: 0, onInput: reset });
    const sm2 = PL.ui.slider(L.controls, { label: "物體2 質量", min: 0.5, max: 4, step: 0.5, value: 1, unit: "kg", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "接觸", () => { running = true; anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rTf = PL.ui.readout(L.readouts, { label: "熱平衡溫度", unit: "°C" });
    const rT1 = PL.ui.readout(L.readouts, { label: "物體1", unit: "°C" });
    const rT2 = PL.ui.readout(L.readouts, { label: "物體2", unit: "°C" });
    function reset() { T1 = s1.get(); T2 = s2.get(); running = false; }
    reset();
    const tcol = T => { const t = PL.clamp(T / 100, 0, 1); return `rgb(${Math.round(60 + 195 * t)},${Math.round(120 - 60 * t)},${Math.round(220 - 200 * t)})`; };
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const Tf = (sm1.get() * T1 + sm2.get() * T2) / (sm1.get() + sm2.get());
      const cy = H / 2, w1 = 60 + sm1.get() * 14, w2 = 60 + sm2.get() * 14;
      D.rect(ctx, W / 2 - w1 - 6, cy - 40, w1, 80, { fill: tcol(T1), stroke: "rgba(255,255,255,0.3)", r: 6 });
      D.rect(ctx, W / 2 + 6, cy - 40, w2, 80, { fill: tcol(T2), stroke: "rgba(255,255,255,0.3)", r: 6 });
      D.text(ctx, PL.fmt(T1, 0) + "°C", W / 2 - w1 / 2 - 6, cy + 4, { color: "#fff", size: 14, align: "center", weight: "700" });
      D.text(ctx, PL.fmt(T2, 0) + "°C", W / 2 + w2 / 2 + 6, cy + 4, { color: "#fff", size: 14, align: "center", weight: "700" });
      D.text(ctx, "熱量由高溫流向低溫 →", W / 2, cy - 56, { color: PL.col("text-dim"), size: 11, align: "center" });
      rTf.set(Tf, 1); rT1.set(T1, 1); rT2.set(T2, 1);
    }
    const anim = PL.loop(dt => {
      if (dt && running) { const Tf = (sm1.get() * T1 + sm2.get() * T2) / (sm1.get() + sm2.get()); const r = 1 - Math.exp(-dt * 1.5); T1 += (Tf - T1) * r; T2 += (Tf - T2) * r; if (Math.abs(T1 - T2) < 0.1) running = false; }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 熱力學第一定律 */
  PL.register("thermo1", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    const sQ = PL.ui.slider(L.controls, { label: "吸收熱量 Q", min: -50, max: 100, step: 5, value: 60, unit: "J", digits: 0, onInput: draw });
    const sW = PL.ui.slider(L.controls, { label: "對外作功 W", min: -50, max: 100, step: 5, value: 40, unit: "J", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "ΔU = Q − W。等溫 ΔU=0；等容 W=0（ΔU=Q）；絕熱 Q=0（ΔU=−W）。");
    const rU = PL.ui.readout(L.readouts, { label: "內能變化 ΔU", unit: "J" });
    const rTrend = PL.ui.readout(L.readouts, { label: "溫度趨勢" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const Q = sQ.get(), Wk = sW.get(), dU = Q - Wk;
      // 汽缸示意
      const cylX = 34, cylW = 78, cylBot = H - 30, gasH = 90 + Wk * 0.4;
      D.rect(ctx, cylX, cylBot - gasH, cylW, gasH, { fill: "rgba(229,115,115,0.16)", stroke: PL.col("text-faint"), width: 2 });
      D.rect(ctx, cylX - 4, cylBot - gasH - 10, cylW + 8, 10, { fill: PL.col("text-faint"), r: 2 });
      if (Q !== 0) D.arrow(ctx, cylX + cylW / 2, cylBot + 16, cylX + cylW / 2, cylBot - 6, { color: PL.col("danger"), width: 2, label: Q > 0 ? "Q 入" : "Q 出" });
      // 能量條
      const bx = cylX + cylW + 46, bw = W - bx - 24; let y = 46;
      const bar = (lab, val, c) => { D.text(ctx, lab, bx, y - 4, { color: PL.col("text-dim"), size: 12 }); D.rect(ctx, bx + 40, y - 14, bw - 40, 16, { fill: "rgba(255,255,255,0.05)", r: 4 }); const mid = (bw - 40) / 2; D.rect(ctx, bx + 40 + mid, y - 14, mid * PL.clamp(val / 100, -1, 1), 16, { fill: c, r: 2 }); D.text(ctx, PL.fmt(val, 0) + " J", bx + bw + 4, y, { color: c, size: 11, align: "right" }); y += 40; };
      D.text(ctx, "ΔU = Q − W", bx, 24, { color: PL.col("text-dim"), size: 12 });
      bar("Q", Q, PL.col("danger")); bar("W", Wk, PL.col("accent-2")); bar("ΔU", dU, MC());
      rU.set(dU, 0); rTrend.set(dU > 0 ? "升溫" : dU < 0 ? "降溫" : "不變");
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});
})();
