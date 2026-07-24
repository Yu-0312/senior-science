/* 模組二 · 牛頓運動定律與力 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw;
  const MC = () => PL.col("m-color", "#ff8a65");
  const block = (ctx, x, y, w, h, m, label) => {
    D.rect(ctx, x - w / 2, y - h, w, h, { fill: m, stroke: "rgba(255,255,255,0.35)", width: 1.5, r: 5 });
    if (label) D.text(ctx, label, x, y - h / 2 + 4, { color: "#04121a", size: 12, align: "center", weight: "700" });
  };

  /* 慣性與牛頓第一定律 */
  PL.register("inertia", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.52);
    let x = 0, v = 0;
    const sV = PL.ui.slider(L.controls, { label: "推出初速", min: 2, max: 14, step: 0.5, value: 8, unit: "m/s", digits: 1 });
    const sMu = PL.ui.slider(L.controls, { label: "摩擦係數 μ", min: 0, max: 0.4, step: 0.01, value: 0.1, unit: "", digits: 2 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "推一下", () => { x = 0; v = sV.get(); anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", () => { x = 0; v = 0; });
    PL.ui.note(L.controls, "μ = 0 時滑塊永遠等速前進——這就是慣性。");
    const rV = PL.ui.readout(L.readouts, { label: "速度 v", unit: "m/s" });
    const rX = PL.ui.readout(L.readouts, { label: "滑行距離", unit: "m" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const gy = H - 40, sc = (W - 120) / 30;
      D.line(ctx, 20, gy, W - 20, gy, PL.col("text-faint"), 2);
      for (let gx = 0; gx <= 30; gx += 5) { const px = 60 + gx * sc; if (px < W - 20) { D.line(ctx, px, gy, px, gy + 5, PL.col("text-faint"), 1); D.text(ctx, gx + "", px, gy + 17, { color: PL.col("text-faint"), size: 9, align: "center" }); } }
      const px = 60 + (x % 30) * sc;
      block(ctx, px, gy, 40, 28, MC());
      if (v > 0.01) D.arrow(ctx, px + 22, gy - 14, px + 22 + v * 4, gy - 14, { color: PL.col("accent-2"), width: 2, label: "v" });
      if (sMu.get() > 0 && v > 0.01) D.arrow(ctx, px - 22, gy - 14, px - 22 - sMu.get() * 80, gy - 14, { color: PL.col("danger"), width: 2, label: "f" });
      rV.set(v, 2); rX.set(x, 1);
    }
    const anim = PL.loop(dt => {
      if (dt && v > 0) { const a = sMu.get() * 9.8; v = Math.max(0, v - a * dt); x += v * dt; if (sMu.get() === 0) v = sV.get() > 0 ? v || 0 : v; }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 牛頓第二定律 F = ma */
  PL.register("newton2", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.52);
    let x = 0, v = 0, t = 0;
    const reset = () => { x = 0; v = 0; t = 0; };
    const sF = PL.ui.slider(L.controls, { label: "施力 F", min: 0, max: 24, step: 1, value: 10, unit: "N", digits: 0, onInput: reset });
    const sM = PL.ui.slider(L.controls, { label: "質量 m", min: 0.5, max: 10, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    const bP = PL.ui.button(row, "施力", () => { reset(); anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rA = PL.ui.readout(L.readouts, { label: "加速度 a", unit: "m/s²" });
    const rV = PL.ui.readout(L.readouts, { label: "速度 v", unit: "m/s" });
    const rX = PL.ui.readout(L.readouts, { label: "位移 x", unit: "m" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const gy = H - 40, a = sF.get() / sM.get();
      D.line(ctx, 20, gy, W - 20, gy, PL.col("text-faint"), 2);
      const sc = (W - 140) / 24, px = 70 + (x % 24) * sc;
      const w = 30 + sM.get() * 4;
      block(ctx, px, gy, w, 22 + sM.get() * 2, MC(), sM.get() + "kg");
      if (sF.get() > 0) D.arrow(ctx, px + w / 2, gy - 16, px + w / 2 + sF.get() * 5, gy - 16, { color: PL.col("accent-2"), width: 2.5, label: "F = " + sF.get() + " N" });
      // a 長條
      D.text(ctx, "a = F / m = " + PL.fmt(a, 2) + " m/s²", 24, 28, { color: MC(), size: 13 });
      rA.set(a, 2); rV.set(v, 2); rX.set(x, 1);
    }
    const anim = PL.loop(dt => { if (dt) { const a = sF.get() / sM.get(); v += a * dt; x += v * dt; t += dt; if (x > 48) reset(); } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 斜面受力 */
  PL.register("incline", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    let s = 0, v = 0;
    const reset = () => { s = 0; v = 0; };
    PL.ui.section(L.controls, "斜面參數");
    const sTh = PL.ui.slider(L.controls, { label: "傾角 θ", min: 5, max: 60, step: 1, value: 30, unit: "°", digits: 0, onInput: reset });
    const sMu = PL.ui.slider(L.controls, { label: "摩擦係數 μ", min: 0, max: 1, step: 0.02, value: 0.2, unit: "", digits: 2, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "釋放", () => { reset(); anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rA = PL.ui.readout(L.readouts, { label: "加速度 a", unit: "m/s²" });
    const rN = PL.ui.readout(L.readouts, { label: "正向力 N", unit: "×mg" });
    const rState = PL.ui.readout(L.readouts, { label: "狀態" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "加速度 a 對 傾角 θ", cap: "a = g(sinθ − μcosθ)；當 θ ≤ 臨界角 θc = tan⁻¹μ 時物體靜止（a = 0）。" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const th = sTh.get() * Math.PI / 180, mu = sMu.get(), m = MC();
      const A = { x: 50, y: H - 40 }; const Lpx = Math.min((W - 120) / Math.cos(th), (H - 90) / Math.sin(th));
      const apex = { x: A.x + Lpx * Math.cos(th), y: A.y - Lpx * Math.sin(th) };
      const foot = { x: apex.x, y: A.y };
      ctx.save(); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(apex.x, apex.y); ctx.lineTo(foot.x, foot.y); ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fill(); ctx.strokeStyle = PL.col("text-faint"); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      D.text(ctx, sTh.get() + "°", A.x + 30, A.y - 6, { color: PL.col("text-dim"), size: 12 });
      const u = { x: -Math.cos(th), y: Math.sin(th) }; // 下坡方向
      const n = { x: -Math.sin(th), y: -Math.cos(th) }; // 外法線
      const bs = Math.min(s, Lpx - 30);
      const bx = apex.x + u.x * (bs + 24), by = apex.y + u.y * (bs + 24);
      ctx.save(); ctx.translate(bx, by); ctx.rotate(-th);
      D.rect(ctx, -18, -30, 36, 24, { fill: m, stroke: "rgba(255,255,255,0.4)", width: 1.5, r: 4 });
      ctx.restore();
      const cx = bx + n.x * 18, cy = by + n.y * 18; const FS = 26;
      D.arrow(ctx, cx, cy, cx, cy + FS * 1.4, { color: PL.col("warn"), width: 2, label: "mg" });
      D.arrow(ctx, cx, cy, cx + n.x * FS * Math.cos(th), cy + n.y * FS * Math.cos(th), { color: PL.col("accent-2"), width: 2, label: "N" });
      D.arrow(ctx, cx, cy, cx + u.x * FS * Math.sin(th), cy + u.y * FS * Math.sin(th), { color: "#7ee0c0", width: 2, label: "mg sinθ", dash: [3, 3] });
      const tan = Math.tan(th), moving = tan > mu + 1e-6;
      const a = moving ? 9.8 * (Math.sin(th) - mu * Math.cos(th)) : 0;
      if (moving) D.arrow(ctx, cx, cy, cx - u.x * FS * mu * Math.cos(th), cy - u.y * FS * mu * Math.cos(th), { color: PL.col("danger"), width: 2, label: "f" });
      rA.set(a, 2); rN.set(Math.cos(th), 2); rState.set(moving ? "下滑" : "靜止");
      // a–θ 圖
      cc.clear();
      const gg = PL.graph(cc, { x: 36, y: 14, w: cc.W - 48, h: cc.H - 34 }, { x0: 0, x1: 60, y0: 0, y1: 10 });
      gg.frame({ xlabel: "θ (°)", ylabel: "a (m/s²)" }); gg.grid(6, 5);
      gg.fn(deg => { const r = deg * Math.PI / 180; return Math.tan(r) > mu ? 9.8 * (Math.sin(r) - mu * Math.cos(r)) : 0; }, { color: MC(), width: 2.2, samples: 90 });
      const thc = Math.atan(mu) * 180 / Math.PI; gg.vline(thc, { color: "rgba(255,255,255,0.25)", dash: [3, 3] }); gg.label(thc + 1, 9.2, "θc", { color: PL.col("text-faint"), size: 10 });
      gg.dot(sTh.get(), a, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    const anim = PL.loop(dt => {
      if (dt) { const th = sTh.get() * Math.PI / 180, mu = sMu.get(); const a = Math.tan(th) > mu ? 9.8 * (Math.sin(th) - mu * Math.cos(th)) : 0; v += a * dt * 8; s += v * dt; const Lpx = Math.min((cv.W - 120) / Math.cos(th), (cv.H - 90) / Math.sin(th)); if (s > Lpx - 54) { s = 0; v = 0; } }
      draw();
    });
    cv.onResize(draw); cc.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 靜摩擦與動摩擦 */
  PL.register("friction", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    let x = 0, v = 0;
    const sF = PL.ui.slider(L.controls, { label: "施力 F", min: 0, max: 30, step: 0.5, value: 6, unit: "N", digits: 1, onInput: draw });
    const sMs = PL.ui.slider(L.controls, { label: "靜摩擦係數 μₛ", min: 0.1, max: 0.9, step: 0.02, value: 0.5, unit: "", digits: 2, onInput: draw });
    const sMk = PL.ui.slider(L.controls, { label: "動摩擦係數 μₖ", min: 0.05, max: 0.8, step: 0.02, value: 0.3, unit: "", digits: 2, onInput: draw });
    const mass = 2, N = mass * 9.8;
    const rF = PL.ui.readout(L.readouts, { label: "摩擦力 f", unit: "N" });
    const rState = PL.ui.readout(L.readouts, { label: "狀態" });
    const rA = PL.ui.readout(L.readouts, { label: "加速度 a", unit: "m/s²" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const F = sF.get(), fsMax = sMs.get() * N, fk = sMk.get() * N, moving = F > fsMax;
      const f = moving ? fk : F, a = moving ? (F - fk) / mass : 0;
      const gy = 130;
      D.line(ctx, 20, gy, W - 20, gy, PL.col("text-faint"), 2);
      const px = 90 + (moving ? (x % 20) * 6 : 0);
      block(ctx, px, gy, 46, 30, MC(), mass + "kg");
      D.arrow(ctx, px + 23, gy - 15, px + 23 + F * 5, gy - 15, { color: PL.col("accent-2"), width: 2.4, label: "F=" + PL.fmt(F, 1) });
      D.arrow(ctx, px - 23, gy - 15, px - 23 - f * 5, gy - 15, { color: PL.col("danger"), width: 2.4, label: "f=" + PL.fmt(f, 1) });
      // 摩擦力 vs 施力 圖
      const bx = 40, by = gy + 34, bw = W - 80, bh = H - by - 20;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: 30, y0: 0, y1: Math.max(fsMax, fk) * 1.3 + 1 });
      g.frame({ title: "摩擦力 f 對 施力 F", xlabel: "F (N)", ylabel: "f (N)" }); g.grid(6, 4);
      g.curve([[0, 0], [fsMax, fsMax]], { color: PL.col("warn"), width: 2 });        // 靜摩擦：f=F
      g.curve([[fsMax, fsMax], [fsMax, fk]], { color: PL.col("danger"), width: 2, dash: [3, 3] }); // 掉落
      g.curve([[fsMax, fk], [30, fk]], { color: PL.col("danger"), width: 2 });         // 動摩擦：定值
      g.hline(fsMax, { color: "rgba(255,204,102,0.4)", dash: [2, 3], width: 1 });
      g.label(1, fsMax, "最大靜摩擦", { color: PL.col("warn"), size: 9, dy: -4 });
      g.dot(F, f, { color: MC(), glow: MC() });
      rF.set(f, 1); rState.set(moving ? "滑動" : "靜止"); rA.set(a, 2);
    }
    const anim = PL.loop(dt => { if (dt) { const F = sF.get(), moving = F > sMs.get() * N; if (moving) { v += (F - sMk.get() * N) / mass * dt; x += v * dt; } else v = 0; } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 連接體與張力（阿特午機） */
  PL.register("atwood", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    let y = 0, v = 0;
    const reset = () => { y = 0; v = 0; };
    const s1 = PL.ui.slider(L.controls, { label: "左質量 m₁", min: 0.5, max: 8, step: 0.5, value: 3, unit: "kg", digits: 1, onInput: reset });
    const s2 = PL.ui.slider(L.controls, { label: "右質量 m₂", min: 0.5, max: 8, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "釋放", () => { reset(); anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rA = PL.ui.readout(L.readouts, { label: "加速度 a", unit: "m/s²" });
    const rT = PL.ui.readout(L.readouts, { label: "繩張力 T", unit: "N" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m1 = s1.get(), m2 = s2.get(), m = MC();
      const a = (m1 - m2) * 9.8 / (m1 + m2), T = 2 * m1 * m2 * 9.8 / (m1 + m2);
      const cx = W / 2, py = 44, pr = 22;
      D.ring(ctx, cx, py, pr, PL.col("text-faint"), 3);
      D.disc(ctx, cx, py, 4, { fill: PL.col("text-faint") });
      const lx = cx - pr, rx = cx + pr;
      const mid = (H - 90) / 2, y1 = 70 + mid + y, y2 = 70 + mid - y;
      D.line(ctx, lx, py, lx, y1, "#c9d3e0", 2); D.line(ctx, rx, py, rx, y2, "#c9d3e0", 2);
      const bw1 = 30 + m1 * 4, bw2 = 30 + m2 * 4;
      D.rect(ctx, lx - bw1 / 2, y1, bw1, 26, { fill: m, stroke: "rgba(255,255,255,0.4)", r: 4 }); D.text(ctx, m1 + "kg", lx, y1 + 17, { color: "#04121a", size: 11, align: "center", weight: "700" });
      D.rect(ctx, rx - bw2 / 2, y2, bw2, 26, { fill: "#ffab80", stroke: "rgba(255,255,255,0.4)", r: 4 }); D.text(ctx, m2 + "kg", rx, y2 + 17, { color: "#04121a", size: 11, align: "center", weight: "700" });
      const dir = a > 0.01 ? "m₁ 下降" : a < -0.01 ? "m₂ 下降" : "平衡靜止";
      D.text(ctx, dir, cx, H - 16, { color: PL.col("text-dim"), size: 12, align: "center" });
      rA.set(Math.abs(a), 2); rT.set(T, 1);
    }
    const anim = PL.loop(dt => { if (dt) { const m1 = s1.get(), m2 = s2.get(); const a = (m1 - m2) * 9.8 / (m1 + m2); v += a * dt * 6; y += v * dt; const lim = (cv.H - 90) / 2 - 14; if (y > lim || y < -lim) { v = 0; } y = PL.clamp(y, -lim, lim); } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 牛頓第三定律 */
  PL.register("newton3", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    let phase = "idle", x1 = 0, x2 = 0, v1 = 0, v2 = 0, pt = 0;
    const sF = PL.ui.slider(L.controls, { label: "互推力 F", min: 4, max: 24, step: 1, value: 12, unit: "N", digits: 0 });
    const sm1 = PL.ui.slider(L.controls, { label: "左車質量 m₁", min: 1, max: 8, step: 0.5, value: 2, unit: "kg", digits: 1 });
    const sm2 = PL.ui.slider(L.controls, { label: "右車質量 m₂", min: 1, max: 8, step: 0.5, value: 4, unit: "kg", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "互推", () => { x1 = 0; x2 = 0; v1 = 0; v2 = 0; pt = 0; phase = "push"; anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", () => { phase = "idle"; x1 = x2 = v1 = v2 = 0; });
    PL.ui.note(L.controls, "兩車受力大小相等、方向相反；質量小的車獲得較大加速度。");
    const rA1 = PL.ui.readout(L.readouts, { label: "左車 a₁", unit: "m/s²" });
    const rA2 = PL.ui.readout(L.readouts, { label: "右車 a₂", unit: "m/s²" });
    const rF = PL.ui.readout(L.readouts, { label: "受力大小", unit: "N" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const gy = H - 46, cx = W / 2, F = sF.get();
      D.line(ctx, 20, gy, W - 20, gy, PL.col("text-faint"), 2);
      const bx1 = cx - 34 - x1 * 30, bx2 = cx + 34 + x2 * 30;
      block(ctx, bx1, gy, 44, 30, MC(), sm1.get() + "kg");
      block(ctx, bx2, gy, 44, 30, "#ffab80", sm2.get() + "kg");
      if (phase === "push") {
        D.arrow(ctx, bx1 - 22, gy - 15, bx1 - 22 - F * 4, gy - 15, { color: PL.col("danger"), width: 2.4, label: "F" });
        D.arrow(ctx, bx2 + 22, gy - 15, bx2 + 22 + F * 4, gy - 15, { color: PL.col("accent-2"), width: 2.4, label: "F" });
      }
      rA1.set(F / sm1.get(), 2); rA2.set(F / sm2.get(), 2); rF.set(F, 0);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        if (phase === "push") { const F = sF.get(); v1 += F / sm1.get() * dt; v2 += F / sm2.get() * dt; pt += dt; if (pt > 0.35) phase = "glide"; }
        if (phase !== "idle") { x1 += v1 * dt; x2 += v2 * dt; if (cv.W / 2 + 34 + x2 * 30 > cv.W - 30 || cv.W / 2 - 34 - x1 * 30 < 30) phase = "idle"; }
      }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 力矩與靜力平衡 */
  PL.register("torque-equilibrium", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let ang = 0;
    const sM1 = PL.ui.slider(L.controls, { label: "左側質量 m₁", min: 1, max: 8, step: 0.5, value: 3, unit: "kg", digits: 1 });
    const sD1 = PL.ui.slider(L.controls, { label: "左側力臂 d₁", min: 1, max: 5, step: 0.5, value: 3, unit: "m", digits: 1 });
    const sM2 = PL.ui.slider(L.controls, { label: "右側質量 m₂", min: 1, max: 8, step: 0.5, value: 2, unit: "kg", digits: 1 });
    const sD2 = PL.ui.slider(L.controls, { label: "右側力臂 d₂", min: 1, max: 5, step: 0.5, value: 4, unit: "m", digits: 1 });
    PL.ui.note(L.controls, "當 m₁d₁ = m₂d₂ 時左右力矩相等，橫桿保持水平平衡。");
    const rL = PL.ui.readout(L.readouts, { label: "左力矩 τ₁", unit: "" });
    const rR = PL.ui.readout(L.readouts, { label: "右力矩 τ₂", unit: "" });
    const rS = PL.ui.readout(L.readouts, { label: "狀態" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m1 = sM1.get(), d1 = sD1.get(), m2 = sM2.get(), d2 = sD2.get(), tauL = m1 * d1, tauR = m2 * d2;
      const cx = W / 2, cy = H * 0.42, half = Math.min(W * 0.4, 180), sc = half / 5, c = Math.cos(ang), s = Math.sin(ang);
      D.line(ctx, cx, cy, cx - 24, cy + 48, PL.col("text-faint"), 2); D.line(ctx, cx, cy, cx + 24, cy + 48, PL.col("text-faint"), 2); D.line(ctx, cx - 34, cy + 48, cx + 34, cy + 48, PL.col("text-faint"), 2);
      D.line(ctx, cx - half * c, cy - half * s, cx + half * c, cy + half * s, MC(), 6);
      D.disc(ctx, cx, cy, 5, { fill: "#fff" });
      const hang = (dist, m, side) => { const ax = cx + side * dist * sc * c, ay = cy + side * dist * sc * s, bw = 20 + m * 4; D.line(ctx, ax, ay, ax, ay + 24, "#c9d3e0", 1.5); D.rect(ctx, ax - bw / 2, ay + 24, bw, 18 + m * 2, { fill: side < 0 ? MC() : "#ffab80", stroke: "rgba(255,255,255,0.4)", r: 4 }); D.text(ctx, m + "", ax, ay + 38, { color: "#04121a", size: 11, align: "center", weight: "700" }); };
      hang(d1, m1, -1); hang(d2, m2, 1);
      rL.set(tauL, 1); rR.set(tauR, 1); rS.set(Math.abs(tauL - tauR) < 0.1 ? "平衡" : tauL > tauR ? "左傾" : "右傾");
    }
    const anim = PL.loop(dt => { if (dt) { const net = sM2.get() * sD2.get() - sM1.get() * sD1.get(); ang += (PL.clamp(net * 0.02, -0.3, 0.3) - ang) * Math.min(1, dt * 3); } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 力的合成與分解（力桌） */
  PL.register("force-table", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    const sF1 = PL.ui.slider(L.controls, { label: "F₁ 大小", min: 1, max: 8, step: 0.5, value: 5, unit: "N", digits: 1, onInput: draw });
    const sA1 = PL.ui.slider(L.controls, { label: "F₁ 方向", min: 0, max: 360, step: 5, value: 30, unit: "°", digits: 0, onInput: draw });
    const sF2 = PL.ui.slider(L.controls, { label: "F₂ 大小", min: 1, max: 8, step: 0.5, value: 4, unit: "N", digits: 1, onInput: draw });
    const sA2 = PL.ui.slider(L.controls, { label: "F₂ 方向", min: 0, max: 360, step: 5, value: 120, unit: "°", digits: 0, onInput: draw });
    const rMag = PL.ui.readout(L.readouts, { label: "合力大小", unit: "N" });
    const rAng = PL.ui.readout(L.readouts, { label: "合力方向", unit: "°" });
    const rEq = PL.ui.readout(L.readouts, { label: "平衡力方向", unit: "°" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H / 2, S = 15;
      D.ring(ctx, cx, cy, Math.min(W, H) * 0.4, "rgba(255,255,255,0.12)", 1.5);
      D.disc(ctx, cx, cy, 5, { fill: "#fff" });
      const f1 = sF1.get(), a1 = sA1.get() * Math.PI / 180, f2 = sF2.get(), a2 = sA2.get() * Math.PI / 180;
      const v1 = { x: f1 * Math.cos(a1), y: -f1 * Math.sin(a1) }, v2 = { x: f2 * Math.cos(a2), y: -f2 * Math.sin(a2) }, rs = { x: v1.x + v2.x, y: v1.y + v2.y };
      D.line(ctx, cx + v1.x * S, cy + v1.y * S, cx + rs.x * S, cy + rs.y * S, "rgba(255,255,255,0.2)", 1, [4, 4]);
      D.line(ctx, cx + v2.x * S, cy + v2.y * S, cx + rs.x * S, cy + rs.y * S, "rgba(255,255,255,0.2)", 1, [4, 4]);
      D.arrow(ctx, cx, cy, cx + v1.x * S, cy + v1.y * S, { color: PL.col("accent-2"), width: 2.4, label: "F₁" });
      D.arrow(ctx, cx, cy, cx + v2.x * S, cy + v2.y * S, { color: PL.col("accent-3"), width: 2.4, label: "F₂" });
      D.arrow(ctx, cx, cy, cx + rs.x * S, cy + rs.y * S, { color: MC(), width: 3, label: "合力" });
      D.arrow(ctx, cx, cy, cx - rs.x * S, cy - rs.y * S, { color: PL.col("warn"), width: 2, label: "平衡力", dash: [5, 4] });
      const mag = Math.hypot(rs.x, rs.y), ang = (Math.atan2(-rs.y, rs.x) * 180 / Math.PI + 360) % 360;
      rMag.set(mag, 2); rAng.set(ang, 0); rEq.set((ang + 180) % 360, 0);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 虎克定律與彈簧 */
  PL.register("hookes-law", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    const sM = PL.ui.slider(L.controls, { label: "懸掛質量 m", min: 0, max: 5, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: draw });
    const sK = PL.ui.slider(L.controls, { label: "彈簧勁度 k", min: 20, max: 200, step: 10, value: 100, unit: "N/m", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "伸長量 x = mg/k；F–x 圖為過原點的直線，斜率就是 k。");
    const rX = PL.ui.readout(L.readouts, { label: "伸長量 x", unit: "cm" });
    const rF = PL.ui.readout(L.readouts, { label: "拉力 F=mg", unit: "N" });
    const rK = PL.ui.readout(L.readouts, { label: "勁度 k", unit: "N/m" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m = sM.get(), k = sK.get(), F = m * 9.8, x = F / k;
      const topY = 34, cx = W * 0.26, natural = 66, ext = PL.clamp(x * 320, 0, H - 150);
      D.rect(ctx, cx - 40, topY - 8, 80, 8, { fill: PL.col("text-faint") });
      D.spring(ctx, cx, topY, cx, topY + natural + ext, 10, 11, MC());
      D.rect(ctx, cx - 24, topY + natural + ext, 48, 34, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 5 });
      D.text(ctx, m + "kg", cx, topY + natural + ext + 22, { color: "#04121a", size: 11, align: "center", weight: "700" });
      D.line(ctx, cx + 58, topY + natural, cx + 58, topY + natural + ext, PL.col("accent-2"), 2);
      D.text(ctx, "x", cx + 66, topY + natural + ext / 2, { color: PL.col("accent-2"), size: 12 });
      const bx = W * 0.52, by = 30, bw = W - bx - 20, bh = H - 60;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: 0.6, y0: 0, y1: 60 });
      g.frame({ title: "F – x（斜率 = k）", xlabel: "x (m)", ylabel: "F (N)" }); g.grid(4, 4);
      g.fn(xx => k * xx, { color: MC(), width: 2.2 });
      g.dot(Math.min(x, 0.6), F, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
      rX.set(x * 100, 1); rF.set(F, 1); rK.set(k, 0);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});
})();
