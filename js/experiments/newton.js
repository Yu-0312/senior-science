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
  /* 題型：水平推力壓住鉛直牆面的摩擦力 */
  PL.register("wall-friction", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    let y = 0, v = 0, released = false;
    PL.ui.section(L.controls, "典型情境");
    const sM = PL.ui.slider(L.controls, { label: "物體質量 m", min: 0.5, max: 4, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const sF = PL.ui.slider(L.controls, { label: "水平推力 F", min: 5, max: 200, step: 1, value: 60, unit: "N", digits: 0, onInput: reset });
    const sMs = PL.ui.slider(L.controls, { label: "靜摩擦係數 μₛ", min: 0.2, max: 0.9, step: 0.02, value: 0.4, unit: "", digits: 2, onInput: reset });
    const sMk = PL.ui.slider(L.controls, { label: "動摩擦係數 μₖ", min: 0.1, max: 0.7, step: 0.02, value: 0.3, unit: "", digits: 2, onInput: reset });
    const presets = PL.ui.chipGroup(L.controls, { value: "hold", options: [
      { value: "hold", label: "穩定靜止" }, { value: "critical", label: "剛好不下滑" }, { value: "slip", label: "摩擦不足" }
    ], onChange: value => {
      if (value === "hold") { sM.set(2); sMs.set(0.4); sMk.set(0.3); sF.set(60); }
      if (value === "critical") { sM.set(2); sMs.set(0.4); sMk.set(0.3); sF.set(49); }
      if (value === "slip") { sM.set(2); sMs.set(0.4); sMk.set(0.3); sF.set(32); }
      reset();
    }});
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "釋放物體", () => { reset(); released = true; if (model().sliding) anim.start(); else draw(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    PL.ui.note(L.controls, "靜止時摩擦力只要平衡重力：<b>fₛ = mg</b>。增加推力只會提高 N 與最大靜摩擦力。 ");
    const rN = PL.ui.readout(L.readouts, { label: "正向力 N", unit: "N" });
    const rFriction = PL.ui.readout(L.readouts, { label: "實際摩擦力 f", unit: "N" });
    const rLimit = PL.ui.readout(L.readouts, { label: "最大靜摩擦", unit: "N" });
    const rState = PL.ui.readout(L.readouts, { label: "判讀結果" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "推力與靜摩擦上限", cap: "綠線是最大靜摩擦力 μₛF；只要它高於 mg，實際靜摩擦力仍維持 mg。" });
    function model() {
      const m = sM.get(), F = sF.get(), mg = m * 9.8, fsMax = sMs.get() * F;
      const sliding = fsMax + 1e-9 < mg;
      const muK = Math.min(sMk.get(), sMs.get());
      const f = sliding ? muK * F : mg;
      return { m, F, mg, fsMax, sliding, f, a: sliding ? (mg - f) / m : 0 };
    }
    function reset() { y = 0; v = 0; released = false; draw(); }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q = model(), wallX = W * 0.72, bw = Math.min(68, 42 + q.m * 7), bh = 38 + q.m * 4;
      const minY = 46, maxY = H - bh - 30, by = PL.clamp(H * 0.40 + y, minY, maxY), bx = wallX - bw - 12;
      D.rect(ctx, wallX, 24, 26, H - 48, { fill: "rgba(135,157,180,0.20)", stroke: PL.col("text-faint"), width: 1.5, r: 4 });
      for (let gy = 36; gy < H - 30; gy += 16) D.line(ctx, wallX + 2, gy, wallX + 24, gy - 12, "rgba(255,255,255,0.10)", 1);
      D.rect(ctx, bx, by, bw, bh, { fill: MC(), stroke: "rgba(255,255,255,0.48)", width: 1.5, r: 5 });
      D.text(ctx, q.m + " kg", bx + bw / 2, by + bh / 2 + 4, { color: "#04121a", size: 12, align: "center", weight: "700" });
      const cy = by + bh / 2, forceScale = 0.55;
      D.arrow(ctx, bx - Math.min(94, q.F * forceScale), cy, bx - 8, cy, { color: PL.col("accent-2"), width: 2.6, label: "推力 F" });
      D.arrow(ctx, bx + bw - 4, cy - 17, bx + bw - 4 - Math.min(84, q.F * forceScale), cy - 17, { color: "#8db7ff", width: 2.3, label: "N" });
      D.arrow(ctx, bx + bw / 2, by + bh / 2, bx + bw / 2, by + bh / 2 + 48, { color: PL.col("warn"), width: 2.3, label: "mg" });
      const fLen = Math.min(60, q.f * 2.1);
      D.arrow(ctx, bx + bw / 2 - 8, by + bh / 2, bx + bw / 2 - 8, by + bh / 2 - fLen, { color: q.sliding ? PL.col("danger") : "#7ee0c0", width: 2.4, label: q.sliding ? "fₖ" : "fₛ" });
      D.text(ctx, released ? (q.sliding ? "摩擦不足：物體下滑" : "受力平衡：保持靜止") : "先調整參數，再按「釋放物體」", 24, 30, { color: q.sliding ? PL.col("danger") : "#7ee0c0", size: 12 });
      const sx = 28, sy = H - 56, sw = Math.min(200, W * 0.42), ratio = Math.min(1, q.fsMax / q.mg);
      D.rect(ctx, sx, sy, sw, 10, { fill: "rgba(255,255,255,0.12)", r: 5 });
      D.rect(ctx, sx, sy, sw * ratio, 10, { fill: q.sliding ? PL.col("danger") : "#4dd0a0", r: 5 });
      D.text(ctx, "最大靜摩擦 / 重力 = " + PL.fmt(ratio, 2), sx, sy - 8, { color: PL.col("text-dim"), size: 11 });
      rN.set(q.F, 1); rFriction.set(q.f, 1); rLimit.set(q.fsMax, 1); rState.set(q.sliding ? "向下滑動" : "靜止");
      cc.clear();
      const ymax = Math.max(q.mg * 1.35, sMs.get() * 200 * 1.05, 10);
      const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 0, x1: 200, y0: 0, y1: ymax });
      g.frame({ xlabel: "推力 F (N)", ylabel: "力 (N)" }); g.grid(5, 4);
      g.fn(x => sMs.get() * x, { color: "#4dd0a0", width: 2.2 });
      g.hline(q.mg, { color: PL.col("warn"), dash: [4, 3], width: 1.4 });
      g.label(4, q.mg, "需要的 fₛ = mg", { color: PL.col("warn"), size: 10, dy: -5 });
      g.dot(q.F, q.fsMax, { color: MC(), glow: MC() });
    }
    const anim = PL.loop(dt => {
      if (dt && released) {
        const q = model();
        if (q.sliding) { v += q.a * dt; y += v * dt * 34; if (y > cv.H * 0.42) { y = cv.H * 0.42; v = 0; anim.stop(); } }
      }
      draw();
    });
    cv.onResize(draw); cc.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 題型：推動下方物體時，上方物體受靜摩擦帶動 */
  PL.register("stacked-block-friction", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    let xTop = 0, xBottom = 0, vTop = 0, vBottom = 0, released = false;
    PL.ui.section(L.controls, "疊放物體參數");
    const sTop = PL.ui.slider(L.controls, { label: "上方質量 m₁", min: 0.5, max: 4, step: 0.5, value: 1, unit: "kg", digits: 1, onInput: reset });
    const sBottom = PL.ui.slider(L.controls, { label: "下方質量 m₂", min: 0.5, max: 6, step: 0.5, value: 3, unit: "kg", digits: 1, onInput: reset });
    const sF = PL.ui.slider(L.controls, { label: "推動下方的力 F", min: 0, max: 100, step: 1, value: 20, unit: "N", digits: 0, onInput: reset });
    const sMs = PL.ui.slider(L.controls, { label: "靜摩擦係數 μₛ", min: 0.05, max: 0.9, step: 0.02, value: 0.5, unit: "", digits: 2, onInput: reset });
    const sMk = PL.ui.slider(L.controls, { label: "動摩擦係數 μₖ", min: 0.05, max: 0.7, step: 0.02, value: 0.35, unit: "", digits: 2, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "推動", () => { reset(); released = true; anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    PL.ui.note(L.controls, "下方物體被向右推時，上方物體相對下方有<b>向左滑</b>的趨勢，因此上方所受摩擦力向右。 ");
    const rNeed = PL.ui.readout(L.readouts, { label: "所需摩擦力", unit: "N" });
    const rMax = PL.ui.readout(L.readouts, { label: "最大靜摩擦", unit: "N" });
    const rA = PL.ui.readout(L.readouts, { label: "上方加速度", unit: "m/s²" });
    const rState = PL.ui.readout(L.readouts, { label: "判讀結果" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "需要的摩擦力與最大靜摩擦", cap: "先把兩物體視為整體求 a，再以 f = m₁a 檢查靜摩擦是否足夠。" });
    function model() {
      const m1 = sTop.get(), m2 = sBottom.get(), F = sF.get(), fNeed = m1 * F / (m1 + m2), fMax = sMs.get() * m1 * 9.8;
      const grip = fNeed <= fMax + 1e-9;
      const muK = Math.min(sMk.get(), sMs.get());
      const f = grip ? fNeed : muK * m1 * 9.8;
      return { m1, m2, F, fNeed, fMax, grip, f, aTop: f / m1, aBottom: grip ? F / (m1 + m2) : (F - f) / m2 };
    }
    function reset() { xTop = xBottom = vTop = vBottom = 0; released = false; draw(); }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q = model(), gy = H * 0.72, cx = W * 0.28, shiftTop = xTop * 8, shiftBottom = xBottom * 8;
      D.line(ctx, 22, gy, W - 22, gy, PL.col("text-faint"), 2);
      for (let gx = 38; gx < W - 18; gx += 22) D.line(ctx, gx, gy, gx + 8, gy + 7, "rgba(255,255,255,0.10)", 1);
      const lowerW = Math.min(115, 66 + q.m2 * 8), lowerH = 35, upperW = Math.min(78, 42 + q.m1 * 9), upperH = 30;
      const lowerX = cx + shiftBottom, upperX = cx + shiftTop;
      D.rect(ctx, lowerX - lowerW / 2, gy - lowerH, lowerW, lowerH, { fill: "#ffab80", stroke: "rgba(255,255,255,0.45)", width: 1.5, r: 5 });
      D.rect(ctx, upperX - upperW / 2, gy - lowerH - upperH, upperW, upperH, { fill: MC(), stroke: "rgba(255,255,255,0.45)", width: 1.5, r: 5 });
      D.text(ctx, "m₂", lowerX, gy - 13, { color: "#24110a", size: 12, align: "center", weight: "700" });
      D.text(ctx, "m₁", upperX, gy - lowerH - 10, { color: "#04121a", size: 12, align: "center", weight: "700" });
      D.arrow(ctx, lowerX + lowerW / 2, gy - 18, lowerX + lowerW / 2 + Math.min(86, q.F * 1.1), gy - 18, { color: PL.col("accent-2"), width: 2.6, label: "F" });
      const upperY = gy - lowerH - upperH / 2;
      D.arrow(ctx, upperX, upperY, upperX + Math.min(60, q.f * 3), upperY, { color: "#7ee0c0", width: 2.2, label: "上方受 f" });
      D.arrow(ctx, lowerX, gy - lowerH + 6, lowerX - Math.min(60, q.f * 3), gy - lowerH + 6, { color: PL.col("danger"), width: 2.2, label: "下方受 f" });
      D.text(ctx, q.grip ? "靜摩擦足夠：兩物體共同加速" : "靜摩擦不足：上方相對下方往後滑", 24, 30, { color: q.grip ? "#7ee0c0" : PL.col("danger"), size: 12 });
      rNeed.set(q.fNeed, 2); rMax.set(q.fMax, 2); rA.set(q.aTop, 2); rState.set(q.grip ? "不相對滑動" : "發生相對滑動");
      cc.clear();
      const ymax = Math.max(q.fMax * 1.3, sTop.get() * 100 / (sTop.get() + sBottom.get()) * 1.1, 5);
      const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 0, x1: 100, y0: 0, y1: ymax });
      g.frame({ xlabel: "推力 F (N)", ylabel: "摩擦力 (N)" }); g.grid(5, 4);
      g.fn(x => q.m1 * x / (q.m1 + q.m2), { color: MC(), width: 2.2 });
      g.hline(q.fMax, { color: PL.col("warn"), dash: [4, 3], width: 1.4 });
      g.label(2, q.fMax, "最大靜摩擦", { color: PL.col("warn"), size: 10, dy: -5 });
      g.dot(q.F, q.fNeed, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    const anim = PL.loop(dt => {
      if (dt && released) {
        const q = model(); vTop += q.aTop * dt; vBottom += q.aBottom * dt; xTop += vTop * dt; xBottom += vBottom * dt;
        if (xBottom > 26 || xTop > 26) { released = false; anim.stop(); }
      }
      draw();
    });
    cv.onResize(draw); cc.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 題型：兩條繩子共同懸掛重物 */
  PL.register("two-rope-equilibrium", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    PL.ui.section(L.controls, "懸掛條件");
    const sM = PL.ui.slider(L.controls, { label: "重物質量 m", min: 0.5, max: 12, step: 0.5, value: 4, unit: "kg", digits: 1, onInput: draw });
    const sL = PL.ui.slider(L.controls, { label: "左繩與水平夾角 θₗ", min: 12, max: 78, step: 1, value: 45, unit: "°", digits: 0, onInput: draw });
    const sR = PL.ui.slider(L.controls, { label: "右繩與水平夾角 θᵣ", min: 12, max: 78, step: 1, value: 45, unit: "°", digits: 0, onInput: draw });
    const presets = PL.ui.chipGroup(L.controls, { value: "symmetric", options: [
      { value: "symmetric", label: "對稱懸掛" }, { value: "uneven", label: "角度不等" }, { value: "flat", label: "繩子較平" }
    ], onChange: value => {
      if (value === "symmetric") { sL.set(45); sR.set(45); }
      if (value === "uneven") { sL.set(30); sR.set(60); }
      if (value === "flat") { sL.set(18); sR.set(18); }
      draw();
    }});
    PL.ui.note(L.controls, "兩條繩子越接近水平，為了提供同樣的向上分量，張力會迅速變大。 ");
    const rTL = PL.ui.readout(L.readouts, { label: "左繩張力 Tₗ", unit: "N" });
    const rTR = PL.ui.readout(L.readouts, { label: "右繩張力 Tᵣ", unit: "N" });
    const rV = PL.ui.readout(L.readouts, { label: "鉛直分量合計", unit: "N" });
    const rState = PL.ui.readout(L.readouts, { label: "平衡判讀" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "左繩角度對張力的影響", cap: "固定右繩角度，左繩越接近水平，兩繩張力越大。" });
    function model(leftDeg, rightDeg) {
      const m = sM.get(), l = (leftDeg == null ? sL.get() : leftDeg) * Math.PI / 180, r = (rightDeg == null ? sR.get() : rightDeg) * Math.PI / 180;
      const mg = m * 9.8, denom = Math.sin(l + r);
      return { m, l, r, mg, tl: mg * Math.cos(r) / denom, tr: mg * Math.cos(l) / denom };
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q = model(), cx = W * 0.5, cy = H * 0.48, len = Math.min(W * 0.27, H * 0.55);
      const lx = cx - len * Math.cos(q.l), ly = cy - len * Math.sin(q.l), rx = cx + len * Math.cos(q.r), ry = cy - len * Math.sin(q.r);
      D.line(ctx, lx, ly, cx, cy, "rgba(255,255,255,0.62)", 3); D.line(ctx, rx, ry, cx, cy, "rgba(255,255,255,0.62)", 3);
      D.rect(ctx, lx - 15, ly - 8, 30, 9, { fill: PL.col("text-faint"), r: 3 }); D.rect(ctx, rx - 15, ry - 8, 30, 9, { fill: PL.col("text-faint"), r: 3 });
      D.disc(ctx, cx, cy, 7, { fill: "#e7edf5", stroke: MC(), width: 2, glow: MC() });
      D.line(ctx, cx, cy, cx, cy + 42, "#c9d3e0", 2);
      D.rect(ctx, cx - 28, cy + 42, 56, 34, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 5 });
      D.text(ctx, q.m + " kg", cx, cy + 64, { color: "#04121a", size: 12, align: "center", weight: "700" });
      D.arrow(ctx, cx, cy, cx - Math.cos(q.l) * Math.min(72, q.tl * 1.2), cy - Math.sin(q.l) * Math.min(72, q.tl * 1.2), { color: "#8db7ff", width: 2.4, label: "Tₗ" });
      D.arrow(ctx, cx, cy, cx + Math.cos(q.r) * Math.min(72, q.tr * 1.2), cy - Math.sin(q.r) * Math.min(72, q.tr * 1.2), { color: "#7ee0c0", width: 2.4, label: "Tᵣ" });
      D.arrow(ctx, cx, cy, cx, cy + 58, { color: PL.col("warn"), width: 2.4, label: "mg" });
      D.text(ctx, "θₗ = " + sL.get() + "°", lx + 4, ly + 22, { color: "#8db7ff", size: 11 });
      D.text(ctx, "θᵣ = " + sR.get() + "°", rx - 4, ry + 22, { color: "#7ee0c0", size: 11, align: "right" });
      rTL.set(q.tl, 1); rTR.set(q.tr, 1); rV.set(q.tl * Math.sin(q.l) + q.tr * Math.sin(q.r), 1); rState.set("ΣFₓ = 0，ΣFᵧ = 0");
      cc.clear();
      let yMax = 0;
      for (let a = 12; a <= 78; a += 1) { const p = model(a, sR.get()); yMax = Math.max(yMax, p.tl, p.tr); }
      const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 12, x1: 78, y0: 0, y1: yMax * 1.1 });
      g.frame({ xlabel: "左繩角度 θₗ (°)", ylabel: "張力 (N)" }); g.grid(6, 4);
      g.fn(a => model(a, sR.get()).tl, { color: "#8db7ff", width: 2.2 });
      g.fn(a => model(a, sR.get()).tr, { color: "#7ee0c0", width: 2.2 });
      g.dot(sL.get(), q.tl, { color: "#8db7ff", glow: "#8db7ff" }); g.dot(sL.get(), q.tr, { color: "#7ee0c0", glow: "#7ee0c0" });
    }
    cv.onResize(draw); cc.onResize(draw); draw();
    return { stop() { cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 題型：輸送帶與物體的相對滑動 */
  PL.register("conveyor-friction", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    let v = 0, t = 0, x = 0, running = false;
    PL.ui.section(L.controls, "輸送帶與物體");
    const sBelt = PL.ui.slider(L.controls, { label: "輸送帶速度 u", min: -6, max: 6, step: 0.5, value: 3, unit: "m/s", digits: 1, onInput: reset });
    const sV0 = PL.ui.slider(L.controls, { label: "物體初速 v₀", min: -8, max: 8, step: 0.5, value: 0, unit: "m/s", digits: 1, onInput: reset });
    const sM = PL.ui.slider(L.controls, { label: "物體質量 m", min: 0.5, max: 6, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const sMu = PL.ui.slider(L.controls, { label: "動摩擦係數 μₖ", min: 0.05, max: 0.8, step: 0.05, value: 0.3, unit: "", digits: 2, onInput: reset });
    const presets = PL.ui.chipGroup(L.controls, { value: "catch", options: [
      { value: "catch", label: "帶子帶動物體" }, { value: "brake", label: "物體跑得較快" }, { value: "opposite", label: "反向相遇" }
    ], onChange: value => {
      if (value === "catch") { sBelt.set(3); sV0.set(0); sMu.set(0.3); }
      if (value === "brake") { sBelt.set(2); sV0.set(6); sMu.set(0.3); }
      if (value === "opposite") { sBelt.set(3); sV0.set(-4); sMu.set(0.3); }
      reset();
    }});
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "放上輸送帶", () => { reset(); running = true; anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    PL.ui.note(L.controls, "摩擦力方向看<b>物體相對輸送帶</b>的滑動趨勢：物體比帶慢，摩擦力向帶子方向；物體比帶快，方向相反。 ");
    const rF = PL.ui.readout(L.readouts, { label: "摩擦力大小", unit: "N" });
    const rA = PL.ui.readout(L.readouts, { label: "物體加速度", unit: "m/s²" });
    const rV = PL.ui.readout(L.readouts, { label: "目前物體速度", unit: "m/s" });
    const rMatch = PL.ui.readout(L.readouts, { label: "預計同速時間", unit: "s" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "物體速度與輸送帶速度", cap: "物體與輸送帶同速後，不再有相對滑動，動摩擦力消失。" });
    function model(speed) {
      const u = sBelt.get(), current = speed == null ? v : speed, delta = u - current, direction = Math.abs(delta) < 0.02 ? 0 : Math.sign(delta);
      const f = direction * sMu.get() * sM.get() * 9.8, a = f / sM.get();
      const tMatch = Math.abs(u - sV0.get()) / Math.max(0.0001, sMu.get() * 9.8);
      return { u, current, direction, f, a, tMatch };
    }
    function reset() { v = sV0.get(); t = 0; x = 0; running = false; draw(); }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q = model(), beltY = H * 0.64, beltX = 32, beltW = W - 64, beltH = 38;
      D.rect(ctx, beltX, beltY, beltW, beltH, { fill: "rgba(95,138,176,0.25)", stroke: PL.col("text-faint"), width: 2, r: 18 });
      const step = 28, offset = ((t * q.u * 28) % step + step) % step;
      for (let px = beltX + 16 - offset; px < beltX + beltW - 10; px += step) D.arrow(ctx, px, beltY + beltH / 2, px + 12 * Math.sign(q.u || 1), beltY + beltH / 2, { color: "rgba(180,211,239,0.70)", width: 1.5, head: 5 });
      const bx = W * 0.5 + PL.clamp(x * 22, -W * 0.24, W * 0.24), bw = 64, bh = 35, by = beltY - bh + 3;
      D.rect(ctx, bx - bw / 2, by, bw, bh, { fill: MC(), stroke: "rgba(255,255,255,0.48)", width: 1.5, r: 5 });
      D.text(ctx, sM.get() + " kg", bx, by + 22, { color: "#04121a", size: 12, align: "center", weight: "700" });
      if (q.direction) D.arrow(ctx, bx, by - 14, bx + q.direction * Math.min(72, Math.abs(q.f) * 7), by - 14, { color: q.direction > 0 ? "#7ee0c0" : PL.col("danger"), width: 2.5, label: "fₖ" });
      D.text(ctx, "輸送帶 u = " + PL.fmt(q.u, 1) + " m/s", beltX, beltY - 12, { color: PL.col("text-dim"), size: 12 });
      const state = q.direction === 0 ? "已同速：無相對滑動" : q.direction > 0 ? "物體比帶慢，摩擦力向右" : "物體比帶快，摩擦力向左";
      D.text(ctx, state, 24, 30, { color: q.direction === 0 ? "#7ee0c0" : PL.col("text-dim"), size: 12 });
      rF.set(Math.abs(q.f), 2); rA.set(q.a, 2); rV.set(q.current, 2); rMatch.set(q.tMatch, 2);
      cc.clear();
      const span = Math.max(1, q.tMatch * 1.3), vMin = Math.min(q.u, sV0.get(), 0) - 1, vMax = Math.max(q.u, sV0.get(), 0) + 1;
      const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 0, x1: span, y0: vMin, y1: vMax });
      g.frame({ xlabel: "時間 t (s)", ylabel: "速度 (m/s)" }); g.grid(5, 4);
      g.hline(q.u, { color: "#8db7ff", dash: [4, 3], width: 1.5 });
      g.fn(tt => { const p = model(sV0.get()); const vv = sV0.get() + p.a * tt; return p.direction > 0 ? Math.min(vv, p.u) : p.direction < 0 ? Math.max(vv, p.u) : p.u; }, { color: MC(), width: 2.4 });
      g.dot(Math.min(t, span), q.current, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    const anim = PL.loop(dt => {
      if (dt && running) {
        const q = model();
        if (q.direction === 0) { v = q.u; running = false; anim.stop(); }
        else { v += q.a * dt; x += v * dt; t += dt; if ((q.direction > 0 && v >= q.u) || (q.direction < 0 && v <= q.u)) { v = q.u; running = false; anim.stop(); } }
      }
      draw();
    });
    cv.onResize(draw); cc.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});
  /* 段考題型：沿斜面外力改變時的摩擦力方向 */
  PL.register("incline-applied-force", { build(root) {
    const L = PL.ui.layout(root), cv = PL.canvas.create(L.canvasWrap, 0.61);
    let forceDirection = "up";
    PL.ui.section(L.controls, "斜面與外力");
    const sM = PL.ui.slider(L.controls, { label: "物體質量 m", min: 0.5, max: 5, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: draw });
    const sAngle = PL.ui.slider(L.controls, { label: "斜面角度 θ", min: 5, max: 55, step: 1, value: 30, unit: "°", digits: 0, onInput: draw });
    const sForce = PL.ui.slider(L.controls, { label: "沿斜面外力 F", min: 0, max: 55, step: 1, value: 12, unit: "N", digits: 0, onInput: draw });
    const sMs = PL.ui.slider(L.controls, { label: "靜摩擦係數 μₛ", min: 0.1, max: 0.9, step: 0.02, value: 0.5, unit: "", digits: 2, onInput: draw });
    const sMk = PL.ui.slider(L.controls, { label: "動摩擦係數 μₖ", min: 0.05, max: 0.7, step: 0.02, value: 0.35, unit: "", digits: 2, onInput: draw });
    PL.ui.section(L.controls, "外力方向");
    PL.ui.chipGroup(L.controls, { value: forceDirection, options: [{ value: "up", label: "沿斜面向上拉" }, { value: "down", label: "沿斜面向下推" }], onChange: value => { forceDirection = value; draw(); } });
    PL.ui.note(L.controls, "先判斷若沒有摩擦時物體想往哪裡滑；靜摩擦力必定朝<b>相反方向</b>。 ");
    const rN = PL.ui.readout(L.readouts, { label: "正向力 N", unit: "N" });
    const rF = PL.ui.readout(L.readouts, { label: "實際摩擦力", unit: "N" });
    const rMax = PL.ui.readout(L.readouts, { label: "最大靜摩擦", unit: "N" });
    const rState = PL.ui.readout(L.readouts, { label: "受力判讀" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "外力與沿斜面滑動趨勢", cap: "正值代表物體傾向下滑、負值代表傾向上滑；兩條虛線之間可由靜摩擦力維持靜止。" });
    function model(force) {
      const m = sM.get(), th = sAngle.get() * Math.PI / 180, F = force == null ? sForce.get() : force, N = m * 9.8 * Math.cos(th);
      const drive = m * 9.8 * Math.sin(th) + (forceDirection === "down" ? F : -F), fsMax = sMs.get() * N;
      const staticHold = Math.abs(drive) <= fsMax + 1e-9, muK = Math.min(sMs.get(), sMk.get());
      const friction = staticHold ? -drive : -Math.sign(drive || 1) * muK * N;
      const acceleration = staticHold ? 0 : (drive + friction) / m;
      return { m, th, F, N, drive, fsMax, staticHold, friction, acceleration };
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q = model(), floorY = H - 42, baseX = 42, slopeLength = Math.min(W * 0.63, H * 1.05 / Math.sin(q.th));
      const top = { x: baseX + slopeLength * Math.cos(q.th), y: floorY - slopeLength * Math.sin(q.th) };
      ctx.save(); ctx.beginPath(); ctx.moveTo(baseX, floorY); ctx.lineTo(top.x, top.y); ctx.lineTo(top.x, floorY); ctx.closePath(); ctx.fillStyle = "rgba(90,162,255,0.08)"; ctx.fill(); ctx.strokeStyle = PL.col("text-faint"); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      const down = { x: -Math.cos(q.th), y: Math.sin(q.th) }, normal = { x: -Math.sin(q.th), y: -Math.cos(q.th) };
      const point = { x: top.x + down.x * slopeLength * 0.48, y: top.y + down.y * slopeLength * 0.48 };
      ctx.save(); ctx.translate(point.x, point.y); ctx.rotate(-q.th); D.rect(ctx, -25, -32, 50, 28, { fill: MC(), stroke: "rgba(255,255,255,0.46)", width: 1.5, r: 5 }); ctx.restore();
      const c = { x: point.x + normal.x * 13, y: point.y + normal.y * 13 }, scale = 3.1;
      D.arrow(ctx, c.x, c.y, c.x, c.y + 50, { color: PL.col("warn"), width: 2.2, label: "mg" });
      D.arrow(ctx, c.x, c.y, c.x + normal.x * 42, c.y + normal.y * 42, { color: "#8db7ff", width: 2.2, label: "N" });
      const appSign = forceDirection === "down" ? 1 : -1, appLen = Math.min(62, q.F * scale);
      D.arrow(ctx, c.x, c.y, c.x + down.x * appSign * appLen, c.y + down.y * appSign * appLen, { color: PL.col("accent-2"), width: 2.5, label: "F" });
      const fSign = Math.sign(q.friction || 0), fLen = Math.min(58, Math.abs(q.friction) * scale);
      if (fLen > 0.5) D.arrow(ctx, c.x, c.y, c.x + down.x * fSign * fLen, c.y + down.y * fSign * fLen, { color: q.staticHold ? "#7ee0c0" : PL.col("danger"), width: 2.4, label: q.staticHold ? "fₛ" : "fₖ" });
      const trend = q.drive > 0 ? "若無摩擦，物體傾向下滑" : q.drive < 0 ? "若無摩擦，物體傾向上滑" : "外力與重力分量剛好平衡";
      D.text(ctx, trend, 24, 30, { color: q.staticHold ? "#7ee0c0" : PL.col("danger"), size: 12 });
      D.text(ctx, q.staticHold ? "靜摩擦足夠，物體靜止" : "超過最大靜摩擦，開始" + (q.acceleration > 0 ? "下滑" : "上滑"), 24, 50, { color: PL.col("text-dim"), size: 11 });
      rN.set(q.N, 2); rF.set(Math.abs(q.friction), 2); rMax.set(q.fsMax, 2); rState.set(q.staticHold ? "靜止" : q.acceleration > 0 ? "向下滑動" : "向上滑動");
      cc.clear();
      const forceLimit = 55, range = Math.max(20, Math.abs(model(0).drive) + q.fsMax + 10);
      const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 0, x1: forceLimit, y0: -range, y1: range });
      g.frame({ xlabel: "外力 F (N)", ylabel: "沿斜面趨勢 (N)" }); g.grid(5, 4);
      g.fn(F => model(F).drive, { color: MC(), width: 2.2 });
      g.hline(q.fsMax, { color: "rgba(126,224,192,0.65)", dash: [4, 3], width: 1.2 }); g.hline(-q.fsMax, { color: "rgba(126,224,192,0.65)", dash: [4, 3], width: 1.2 });
      g.dot(q.F, q.drive, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    cv.onResize(draw); cc.onResize(draw); draw();
    return { stop() { cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 段考題型：桌面物體與懸掛物的連接體 */
  PL.register("table-hanger", { build(root) {
    const L = PL.ui.layout(root), cv = PL.canvas.create(L.canvasWrap, 0.62);
    let y = 0, v = 0, released = false;
    PL.ui.section(L.controls, "連接體參數");
    const sTable = PL.ui.slider(L.controls, { label: "桌上物體 mₜ", min: 0.5, max: 6, step: 0.5, value: 3, unit: "kg", digits: 1, onInput: reset });
    const sHang = PL.ui.slider(L.controls, { label: "懸掛物 mₕ", min: 0.5, max: 5, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const sMs = PL.ui.slider(L.controls, { label: "靜摩擦係數 μₛ", min: 0.05, max: 0.8, step: 0.02, value: 0.35, unit: "", digits: 2, onInput: reset });
    const sMk = PL.ui.slider(L.controls, { label: "動摩擦係數 μₖ", min: 0.05, max: 0.7, step: 0.02, value: 0.25, unit: "", digits: 2, onInput: reset });
    const row = PL.ui.buttonRow(L.controls); PL.ui.button(row, "釋放", () => { reset(); released = true; if (!model().staticHold) anim.start(); else draw(); }, { primary: true }); PL.ui.button(row, "重設", reset);
    PL.ui.note(L.controls, "懸掛物的重力要先克服桌上物體的最大靜摩擦力；運動後再換成動摩擦力計算加速度。 ");
    const rA = PL.ui.readout(L.readouts, { label: "系統加速度 a", unit: "m/s²" });
    const rT = PL.ui.readout(L.readouts, { label: "繩張力 T", unit: "N" });
    const rF = PL.ui.readout(L.readouts, { label: "桌面摩擦力", unit: "N" });
    const rState = PL.ui.readout(L.readouts, { label: "運動判讀" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "懸掛質量與系統加速度", cap: "臨界前加速度為零；超過最大靜摩擦後，以動摩擦力計算加速度。" });
    function model(hangMass) {
      const mt = sTable.get(), mh = hangMass == null ? sHang.get() : hangMass, fsMax = sMs.get() * mt * 9.8, pull = mh * 9.8, staticHold = pull <= fsMax + 1e-9;
      const fk = Math.min(sMk.get(), sMs.get()) * mt * 9.8, a = staticHold ? 0 : Math.max(0, (pull - fk) / (mt + mh));
      const f = staticHold ? pull : fk, T = staticHold ? pull : mt * a + fk;
      return { mt, mh, fsMax, pull, staticHold, f, a, T };
    }
    function reset() { y = 0; v = 0; released = false; draw(); }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv); const q = model(), tableY = H * 0.43, edge = W * 0.70, blockX = edge - 105 + y * 12, ropeY = tableY - 26;
      D.rect(ctx, 30, tableY, edge - 30, 16, { fill: "rgba(150,174,201,0.24)", stroke: PL.col("text-faint"), width: 1.5, r: 4 }); D.line(ctx, edge, tableY, edge, H - 32, PL.col("text-faint"), 4);
      D.ring(ctx, edge, ropeY, 18, "rgba(255,255,255,0.58)", 3); D.line(ctx, blockX + 26, ropeY, edge, ropeY, "#c9d3e0", 2); D.line(ctx, edge + 18, ropeY, edge + 18, ropeY + 64 + y * 18, "#c9d3e0", 2);
      D.rect(ctx, blockX - 30, tableY - 34, 60, 30, { fill: MC(), stroke: "rgba(255,255,255,0.45)", width: 1.5, r: 5 }); D.text(ctx, "mₜ", blockX, tableY - 14, { color: "#04121a", size: 12, align: "center", weight: "700" });
      const hy = ropeY + 64 + y * 18; D.rect(ctx, edge - 8, hy, 52, 31, { fill: "#ffab80", stroke: "rgba(255,255,255,0.45)", width: 1.5, r: 5 }); D.text(ctx, "mₕ", edge + 18, hy + 20, { color: "#24110a", size: 12, align: "center", weight: "700" });
      D.arrow(ctx, blockX, tableY - 45, blockX + Math.min(60, q.T * 2.2), tableY - 45, { color: PL.col("accent-2"), width: 2.4, label: "T" }); if (q.f) D.arrow(ctx, blockX, tableY - 56, blockX - Math.min(58, q.f * 1.3), tableY - 56, { color: q.staticHold ? "#7ee0c0" : PL.col("danger"), width: 2.2, label: "f" });
      D.arrow(ctx, edge + 43, hy + 14, edge + 43, hy + 58, { color: PL.col("warn"), width: 2.3, label: "mₕg" }); D.text(ctx, q.staticHold ? "最大靜摩擦足夠：系統靜止" : "懸掛物下降，兩物體共同加速", 24, 30, { color: q.staticHold ? "#7ee0c0" : PL.col("danger"), size: 12 });
      rA.set(q.a, 2); rT.set(q.T, 2); rF.set(q.f, 2); rState.set(q.staticHold ? "保持靜止" : "mₕ 向下運動");
      cc.clear(); const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 0.5, x1: 5, y0: 0, y1: 9 }); g.frame({ xlabel: "懸掛質量 mₕ (kg)", ylabel: "a (m/s²)" }); g.grid(5, 4); g.fn(mh => model(mh).a, { color: MC(), width: 2.3 }); g.dot(q.mh, q.a, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    const anim = PL.loop(dt => { if (dt && released) { const q = model(); if (!q.staticHold) { v += q.a * dt; y += v * dt; if (y > 9) { y = 9; v = 0; anim.stop(); } } } draw(); });
    cv.onResize(draw); cc.onResize(draw); draw(); return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 段考題型：均勻繩跨過光滑桌邊 */
  PL.register("rope-over-edge", { build(root) {
    const L = PL.ui.layout(root), cv = PL.canvas.create(L.canvasWrap, 0.60);
    let portion = 0.25, v = 0, elapsed = 0, released = false;
    PL.ui.section(L.controls, "均勻繩條件");
    const sPortion = PL.ui.slider(L.controls, { label: "初始垂落比例 x / L", min: 0.05, max: 0.85, step: 0.01, value: 0.25, unit: "", digits: 2, onInput: reset });
    const sLength = PL.ui.slider(L.controls, { label: "繩總長 L", min: 1, max: 10, step: 0.5, value: 5, unit: "m", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls); PL.ui.button(row, "釋放繩子", () => { reset(); released = true; anim.start(); }, { primary: true }); PL.ui.button(row, "重設", reset);
    PL.ui.note(L.controls, "只有垂落部分的重量拉動系統，但整條繩都要一起加速，因此 <b>a = (x/L)g</b>。 ");
    const rA = PL.ui.readout(L.readouts, { label: "瞬時加速度 a", unit: "m/s²" }); const rX = PL.ui.readout(L.readouts, { label: "垂落長度 x", unit: "m" }); const rV = PL.ui.readout(L.readouts, { label: "繩速率 v", unit: "m/s" }); const rState = PL.ui.readout(L.readouts, { label: "受力判讀" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "垂落比例與加速度", cap: "在光滑桌面上，繩子的總長與總質量會約掉；加速度只由當下垂落比例決定。" });
    function reset() { portion = sPortion.get(); v = 0; elapsed = 0; released = false; draw(); }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv); const length = sLength.get(), a = portion * 9.8, tableY = H * 0.43, edge = W * 0.70, ropeTopStart = 56, topLength = Math.max(80, (1 - portion) * (edge - ropeTopStart)); const hangLength = Math.max(34, portion * (H - tableY - 54));
      D.rect(ctx, 30, tableY, edge - 30, 16, { fill: "rgba(150,174,201,0.24)", stroke: PL.col("text-faint"), width: 1.5, r: 4 }); D.line(ctx, edge, tableY, edge, H - 30, PL.col("text-faint"), 4);
      D.line(ctx, edge - topLength, tableY - 10, edge, tableY - 10, PL.col("warn"), 7); D.ring(ctx, edge, tableY - 2, 12, PL.col("warn"), 5); D.line(ctx, edge + 11, tableY - 2, edge + 11, tableY + hangLength, PL.col("warn"), 7);
      D.arrow(ctx, edge + 32, tableY + hangLength * 0.48, edge + 32, tableY + hangLength * 0.48 + Math.min(50, portion * 70), { color: PL.col("danger"), width: 2.3, label: "垂落部分重力" }); D.arrow(ctx, edge - topLength * 0.52, tableY - 32, edge - topLength * 0.52 + Math.min(50, v * 6), tableY - 32, { color: PL.col("accent-2"), width: 2.2, label: "v" });
      D.text(ctx, "垂落比例 x/L = " + PL.fmt(portion, 2), 24, 30, { color: PL.col("text-dim"), size: 12 }); D.text(ctx, released ? "垂落越多，拉力與加速度越大" : "設定初始垂落比例後釋放繩子", 24, 50, { color: PL.col("text-faint"), size: 11 });
      rA.set(a, 2); rX.set(portion * length, 2); rV.set(v, 2); rState.set("整條繩共同加速");
      cc.clear(); const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 0, x1: 1, y0: 0, y1: 9.8 }); g.frame({ xlabel: "垂落比例 x / L", ylabel: "a (m/s²)" }); g.grid(5, 4); g.fn(p => p * 9.8, { color: MC(), width: 2.3 }); g.dot(portion, a, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    const anim = PL.loop(dt => { if (dt && released) { const a = portion * 9.8; v += a * dt; portion += (v / Math.max(1, sLength.get())) * dt; elapsed += dt; if (portion >= 0.93) { portion = 0.93; v = 0; anim.stop(); } } draw(); });
    cv.onResize(draw); cc.onResize(draw); draw(); return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});
})();
