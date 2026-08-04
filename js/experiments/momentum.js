/* 模組三 · 動量與碰撞 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw;
  const MC = () => PL.col("m-color", "#ba68c8");
  const CB = "#7ec7ff";

  /* 一維碰撞 */
  PL.register("collision", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    const TR = 24; // 軌道長 m
    let x1, x2, v1, v2, collided;
    const sm1 = PL.ui.slider(L.controls, { label: "質量 m₁", min: 1, max: 6, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const sm2 = PL.ui.slider(L.controls, { label: "質量 m₂", min: 1, max: 6, step: 0.5, value: 3, unit: "kg", digits: 1, onInput: reset });
    const su1 = PL.ui.slider(L.controls, { label: "初速 u₁", min: 0, max: 8, step: 0.5, value: 5, unit: "m/s", digits: 1, onInput: reset });
    const su2 = PL.ui.slider(L.controls, { label: "初速 u₂", min: -8, max: 0, step: 0.5, value: -2, unit: "m/s", digits: 1, onInput: reset });
    const se = PL.ui.slider(L.controls, { label: "回復係數 e", min: 0, max: 1, step: 0.05, value: 1, unit: "", digits: 2, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    /* 播放／暫停由引擎的傳輸列統一提供（還附單步與速度），實驗不再自備，避免兩個開關互相打架。 */
    PL.ui.button(row, "重設", reset);
    const rP = PL.ui.readout(L.readouts, { label: "總動量 p", unit: "kg·m/s" });
    const rK = PL.ui.readout(L.readouts, { label: "總動能 K", unit: "J" });
    const rStat = PL.ui.readout(L.readouts, { label: "碰撞類型" });
    function reset() { x1 = 6; x2 = 17; v1 = su1.get(); v2 = su2.get(); collided = false; }
    reset();
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const gy = H - 46, sc = (W - 60) / TR, ox = 30;
      D.line(ctx, ox, gy, W - 30, gy, PL.col("text-faint"), 2);
      const w1 = 26 + sm1.get() * 3, w2 = 26 + sm2.get() * 3;
      const p = sm1.get() * v1 + sm2.get() * v2, K = 0.5 * sm1.get() * v1 * v1 + 0.5 * sm2.get() * v2 * v2;
      D.rect(ctx, ox + x1 * sc - w1 / 2, gy - 30, w1, 30, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 4 }); D.text(ctx, "m₁", ox + x1 * sc, gy - 12, { color: "#04121a", size: 11, align: "center", weight: "700" });
      D.rect(ctx, ox + x2 * sc - w2 / 2, gy - 30, w2, 30, { fill: CB, stroke: "rgba(255,255,255,0.4)", r: 4 }); D.text(ctx, "m₂", ox + x2 * sc, gy - 12, { color: "#04121a", size: 11, align: "center", weight: "700" });
      D.arrow(ctx, ox + x1 * sc, gy - 42, ox + x1 * sc + v1 * 6, gy - 42, { color: "#fff", width: 2, label: PL.fmt(v1, 1) });
      D.arrow(ctx, ox + x2 * sc, gy - 42, ox + x2 * sc + v2 * 6, gy - 42, { color: "#fff", width: 2, label: PL.fmt(v2, 1) });
      rP.set(p, 1); rK.set(K, 1);
      rStat.set(se.get() >= 0.99 ? "彈性碰撞" : se.get() <= 0.01 ? "完全非彈性" : "非彈性碰撞");
    }
    const anim = PL.loop(dt => {
      if (dt) {
        x1 += v1 * dt; x2 += v2 * dt;
        const m1 = sm1.get(), m2 = sm2.get(), e = se.get(), gap = (26 + m1 * 3 + 26 + m2 * 3) / 2 / ((cv.W - 60) / TR);
        if (!collided && x2 - x1 <= gap && (v1 - v2) > 0) {
          const nv1 = (m1 * v1 + m2 * v2 - m2 * e * (v1 - v2)) / (m1 + m2);
          const nv2 = (m1 * v1 + m2 * v2 + m1 * e * (v1 - v2)) / (m1 + m2);
          v1 = nv1; v2 = nv2; collided = true;
        }
        if (x1 < 1 || x2 > TR - 1 || x1 > TR || x2 < 0) reset();
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 動量守恆（動量向量與長條） */
  PL.register("momentum-cons", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const TR = 24; let x1, x2, v1, v2, collided;
    const sm1 = PL.ui.slider(L.controls, { label: "質量 m₁", min: 1, max: 6, step: 0.5, value: 4, unit: "kg", digits: 1, onInput: reset });
    const sm2 = PL.ui.slider(L.controls, { label: "質量 m₂", min: 1, max: 6, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const su1 = PL.ui.slider(L.controls, { label: "初速 u₁", min: 0, max: 8, step: 0.5, value: 4, unit: "m/s", digits: 1, onInput: reset });
    const su2 = PL.ui.slider(L.controls, { label: "初速 u₂", min: -8, max: 0, step: 0.5, value: -3, unit: "m/s", digits: 1, onInput: reset });
    PL.ui.note(L.controls, "此處為完全非彈性碰撞（碰後合體）。注意：總動量不變，但總動能減少。");
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "重設", reset, { primary: true });
    const rP = PL.ui.readout(L.readouts, { label: "總動量 p", unit: "kg·m/s" });
    const rK = PL.ui.readout(L.readouts, { label: "總動能 K", unit: "J" });
    function reset() { x1 = 5; x2 = 18; v1 = su1.get(); v2 = su2.get(); collided = false; }
    reset();
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const gy = 120, sc = (W - 60) / TR, ox = 30;
      D.line(ctx, ox, gy, W - 30, gy, PL.col("text-faint"), 2);
      const m1 = sm1.get(), m2 = sm2.get(), p = m1 * v1 + m2 * v2, K = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
      const w1 = 24 + m1 * 3, w2 = 24 + m2 * 3;
      D.rect(ctx, ox + x1 * sc - w1 / 2, gy - 28, w1, 28, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 4 });
      D.rect(ctx, ox + x2 * sc - w2 / 2, gy - 28, w2, 28, { fill: CB, stroke: "rgba(255,255,255,0.4)", r: 4 });
      D.arrow(ctx, ox + x1 * sc, gy - 40, ox + x1 * sc + m1 * v1 * 3, gy - 40, { color: MC(), width: 3, label: "p₁" });
      D.arrow(ctx, ox + x2 * sc, gy - 40, ox + x2 * sc + m2 * v2 * 3, gy - 40, { color: CB, width: 3, label: "p₂" });
      // 長條：p1, p2, 總p, 總K
      const bx = 40, by = gy + 30, bw = W - 80, bh = H - by - 20;
      D.text(ctx, "總動量 p = " + PL.fmt(p, 1) + " kg·m/s（守恆）", bx, by + 6, { color: MC(), size: 12 });
      D.text(ctx, "總動能 K = " + PL.fmt(K, 1) + " J（碰後下降）", bx, by + 26, { color: PL.col("warn"), size: 12 });
      const drawBar = (label, val, max, y, c) => {
        D.text(ctx, label, bx, y - 3, { color: PL.col("text-dim"), size: 10 });
        D.rect(ctx, bx + 46, y - 12, bw - 60, 12, { fill: "rgba(255,255,255,0.05)", r: 4 });
        D.rect(ctx, bx + 46, y - 12, (bw - 60) * PL.clamp(Math.abs(val) / max, 0, 1), 12, { fill: c, r: 4 });
      };
      drawBar("p₁", m1 * v1, 40, by + 60, MC());
      drawBar("p₂", m2 * v2, 40, by + 84, CB);
      drawBar("Σp", p, 40, by + 108, PL.col("ok"));
      rP.set(p, 1); rK.set(K, 1);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        x1 += v1 * dt; x2 += v2 * dt;
        const m1 = sm1.get(), m2 = sm2.get(), gap = (24 + m1 * 3 + 24 + m2 * 3) / 2 / ((cv.W - 60) / TR);
        if (!collided && x2 - x1 <= gap && (v1 - v2) > 0) { const vf = (m1 * v1 + m2 * v2) / (m1 + m2); v1 = v2 = vf; collided = true; }
        if (x1 < 1 || x2 > TR - 1) reset();
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 衝量與動量定理 */
  PL.register("impulse", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    let t = 0, v = 0, x = 0;
    const reset = () => { t = 0; v = 0; x = 0; };
    const sF = PL.ui.slider(L.controls, { label: "作用力 F", min: 1, max: 20, step: 0.5, value: 8, unit: "N", digits: 1, onInput: reset });
    const sDt = PL.ui.slider(L.controls, { label: "作用時間 Δt", min: 0.2, max: 3, step: 0.1, value: 1.2, unit: "s", digits: 1, onInput: reset });
    const sM = PL.ui.slider(L.controls, { label: "質量 m", min: 0.5, max: 6, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "施加衝量", () => { reset(); anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rJ = PL.ui.readout(L.readouts, { label: "衝量 J=FΔt", unit: "N·s" });
    const rDv = PL.ui.readout(L.readouts, { label: "速度變化 Δv", unit: "m/s" });
    const rV = PL.ui.readout(L.readouts, { label: "當前速度", unit: "m/s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const F = sF.get(), Dt = sDt.get(), m = sM.get(), J = F * Dt;
      const gy = 96;
      D.line(ctx, 20, gy, W - 20, gy, PL.col("text-faint"), 2);
      const sc = (W - 120) / 20, px = 60 + (x % 20) * sc;
      D.rect(ctx, px - 18, gy - 26, 36, 26, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 4 });
      if (t < Dt) D.arrow(ctx, px + 18, gy - 13, px + 18 + F * 5, gy - 13, { color: PL.col("accent-2"), width: 2.4, label: "F" });
      else if (v > 0) D.arrow(ctx, px + 18, gy - 13, px + 18 + v * 5, gy - 13, { color: "#fff", width: 2, label: "v" });
      // F–t 圖，面積=衝量
      const bx = 40, by = gy + 24, bw = W - 80, bh = H - by - 20;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: Math.max(3, sDt.get() + 0.5), y0: 0, y1: 22 });
      g.frame({ title: "F – t（面積＝衝量＝Δp）", xlabel: "t (s)", ylabel: "F (N)" }); g.grid(6, 4);
      g.area([[0, F], [Dt, F]], { fill: "rgba(186,104,204,0.22)" });
      g.curve([[0, 0], [0, F], [Dt, F], [Dt, 0]], { color: MC(), width: 2 });
      g.vline(Math.min(t, g.dom.x1), { color: PL.col("accent-2"), dash: [4, 3] });
      rJ.set(J, 1); rDv.set(J / m, 2); rV.set(v, 2);
    }
    const anim = PL.loop(dt => { if (dt) { const F = sF.get(), Dt = sDt.get(), m = sM.get(); if (t < Dt) v += F / m * dt; t += dt; x += v * dt; if (t > Dt + 3) anim.stop(); } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 二維碰撞 */
  PL.register("collision2d", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let p1, p2, done;
    const sB = PL.ui.slider(L.controls, { label: "瞄準參數 b", min: -1, max: 1, step: 0.05, value: 0.4, unit: "×R", digits: 2, onInput: reset });
    const sMr = PL.ui.slider(L.controls, { label: "質量比 m₂/m₁", min: 0.3, max: 3, step: 0.1, value: 1, unit: "", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "發射", reset, { primary: true, trigger: true });
    PL.ui.note(L.controls, "等質量彈性碰撞時，兩球碰後速度方向恰好夾 90°（撞球檯的規律）。");
    const rA1 = PL.ui.readout(L.readouts, { label: "球1 散射角", unit: "°" });
    const rA2 = PL.ui.readout(L.readouts, { label: "球2 散射角", unit: "°" });
    const rAng = PL.ui.readout(L.readouts, { label: "夾角", unit: "°" });
    const R = 22, m1 = 1;
    /*
     * 球 2 的半徑跟著質量比走：同樣材質下 m ∝ r³，所以 r ∝ m^(1/3)。
     * 原本兩球永遠一樣大，於是「質量比」這支滑桿在發射前完全看不出效果——
     * 學生沒有任何線索知道自己正在改的是哪一顆球。
     * 半徑同時也是碰撞判定用的量，所以改了之後瞄準參數的意義仍然一致。
     */
    function reset() {
      const mr = sMr.get(), b = sB.get() * (R * 2);
      p1 = { x: -200, y: b, vx: 130, vy: 0, m: m1, r: R, c: MC() };
      p2 = { x: 0, y: 0, vx: 0, vy: 0, m: mr, r: R * Math.cbrt(mr), c: CB };
      done = false;
    }
    reset();
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const ox = W * 0.5, oy = H * 0.5;
      D.line(ctx, 0, oy, W, oy, "rgba(255,255,255,0.06)", 1, [4, 4]);
      const S = (o) => D.disc(ctx, ox + o.x, oy + o.y, o.r, { fill: o.c, glow: o.c, glowSize: 10, stroke: "rgba(255,255,255,0.3)" });
      S(p1); S(p2);
      [p1, p2].forEach(o => { const sp = Math.hypot(o.vx, o.vy); if (sp > 1) D.arrow(ctx, ox + o.x, oy + o.y, ox + o.x + o.vx * 0.3, oy + o.y + o.vy * 0.3, { color: "#fff", width: 2 }); });
      const a1 = Math.atan2(-p1.vy, p1.vx) * 180 / Math.PI, a2 = Math.atan2(-p2.vy, p2.vx) * 180 / Math.PI;
      rA1.set(done ? a1 : 0, 1); rA2.set(done ? a2 : 0, 1); rAng.set(done ? Math.abs(a1 - a2) : 0, 1);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (!done && d <= p1.r + p2.r) {
          const nx = (p2.x - p1.x) / d, ny = (p2.y - p1.y) / d;
          const v1n = p1.vx * nx + p1.vy * ny, v2n = p2.vx * nx + p2.vy * ny;
          const M = p1.m + p2.m;
          const v1nA = (v1n * (p1.m - p2.m) + 2 * p2.m * v2n) / M;
          const v2nA = (v2n * (p2.m - p1.m) + 2 * p1.m * v1n) / M;
          p1.vx += (v1nA - v1n) * nx; p1.vy += (v1nA - v1n) * ny;
          p2.vx += (v2nA - v2n) * nx; p2.vy += (v2nA - v2n) * ny;
          done = true;
        }
        p1.x += p1.vx * dt; p1.y += p1.vy * dt; p2.x += p2.vx * dt; p2.y += p2.vy * dt;
        if (Math.abs(p1.x) > cv.W || Math.abs(p2.x) > cv.W) anim.stop();
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 反衝與爆炸 */
  PL.register("recoil", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    let x1, x2, v1, v2, fired;
    const sM1 = PL.ui.slider(L.controls, { label: "砲身質量 M", min: 4, max: 30, step: 1, value: 16, unit: "kg", digits: 0, onInput: reset });
    const sM2 = PL.ui.slider(L.controls, { label: "砲彈質量 m", min: 0.5, max: 6, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const sE = PL.ui.slider(L.controls, { label: "爆炸釋放（砲彈速度）", min: 4, max: 20, step: 1, value: 12, unit: "m/s", digits: 0, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "發射", () => { reset(); fired = true; anim.start(); }, { primary: true, trigger: true });
    PL.ui.button(row, "重設", reset);
    const rV1 = PL.ui.readout(L.readouts, { label: "砲身後座 V", unit: "m/s" });
    const rV2 = PL.ui.readout(L.readouts, { label: "砲彈速度 v", unit: "m/s" });
    const rP = PL.ui.readout(L.readouts, { label: "總動量 p", unit: "kg·m/s" });
    function reset() { x1 = 0; x2 = 0; v1 = 0; v2 = 0; fired = false; }
    reset();
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const gy = H - 46, cx = W / 2;
      D.line(ctx, 20, gy, W - 20, gy, PL.col("text-faint"), 2);
      const M = sM1.get(), m = sM2.get();
      if (fired && v2 === 0) { v2 = sE.get(); v1 = -m * v2 / M; }
      const bw = 30 + M * 1.5;
      D.rect(ctx, cx + x1 * 30 - bw / 2, gy - 30, bw, 30, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 4 }); D.text(ctx, "M", cx + x1 * 30, gy - 12, { color: "#04121a", size: 12, align: "center", weight: "700" });
      D.disc(ctx, cx + 40 + x2 * 30, gy - 15, 8 + m, { fill: CB, glow: CB, glowSize: 8 });
      /*
       * 「爆炸釋放（砲彈速度）」原本只在按下發射之後才影響畫面。
       * 動量守恆的重點是「兩邊的 mv 大小相等、方向相反」，
       * 這件事在發射前就可以先算給學生看，讓他預測再驗證。
       */
      if (!fired) {
        const vp2 = sE.get(), vp1 = -m * vp2 / M;
        D.arrow(ctx, cx, gy - 52, cx + vp1 * 6, gy - 52,
          { color: MC(), width: 2, head: 7, label: "預期後座 " + PL.fmt(Math.abs(vp1), 2) + " m/s" });
        D.arrow(ctx, cx + 40, gy - 52, cx + 40 + vp2 * 6, gy - 52,
          { color: CB, width: 2, head: 7, label: "預期砲彈 " + PL.fmt(vp2, 1) + " m/s" });
        D.text(ctx, "兩邊的動量大小相同：M·v₁ = m·v₂ = " + PL.fmt(m * vp2, 1) + " kg·m/s",
          cx, 28, { color: PL.col("text-dim"), size: 11, align: "center" });
      }
      if (fired) { D.arrow(ctx, cx + x1 * 30, gy - 44, cx + x1 * 30 + v1 * 6, gy - 44, { color: MC(), width: 2, label: "後座" }); D.arrow(ctx, cx + 40 + x2 * 30, gy - 40, cx + 40 + x2 * 30 + v2 * 6, gy - 40, { color: CB, width: 2, label: "砲彈" }); }
      rV1.set(Math.abs(v1), 2); rV2.set(v2, 1); rP.set(M * v1 + m * v2, 2);
    }
    const anim = PL.loop(dt => { if (dt && fired) { x1 += v1 * dt; x2 += v2 * dt; if (cv.W / 2 + 40 + x2 * 30 > cv.W - 20) anim.stop(); } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 彈道擺 */
  PL.register("ballistic-pendulum", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const g = 9.8, Lp = 2; let phase = "ready", bx = 0, th = 0, V = 0, hmax = 0, t = 0;
    const sm = PL.ui.slider(L.controls, { label: "子彈質量 m", min: 0.01, max: 0.2, step: 0.01, value: 0.05, unit: "kg", digits: 2 });
    const sM = PL.ui.slider(L.controls, { label: "木塊質量 M", min: 1, max: 5, step: 0.5, value: 2, unit: "kg", digits: 1 });
    const sv = PL.ui.slider(L.controls, { label: "子彈初速 v", min: 100, max: 500, step: 10, value: 300, unit: "m/s", digits: 0 });
    PL.ui.button(PL.ui.buttonRow(L.controls), "發射", () => { const m = sm.get(), M = sM.get(); V = m * sv.get() / (m + M); hmax = V * V / (2 * g); phase = "fly"; bx = 0; th = 0; t = 0; anim.start(); }, { primary: true, trigger: true });
    const rV = PL.ui.readout(L.readouts, { label: "合體速度 V", unit: "m/s" });
    const rH = PL.ui.readout(L.readouts, { label: "上升高度 h", unit: "m" });
    const rTh = PL.ui.readout(L.readouts, { label: "擺角", unit: "°" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const px = W * 0.6, py = 40, Lpx = Math.min(H - 110, W * 0.4);
      D.rect(ctx, px - 40, py - 8, 80, 8, { fill: PL.col("text-faint") });
      /*
       * 原本木塊固定 44×40、子彈固定半徑 5、而且子彈只在飛行中才畫出來，
       * 於是三根滑桿在按下發射之前對畫面毫無影響。
       *
       * 改成：木塊寬度隨 M、子彈半徑隨 m、待發射時子彈就停在槍口，
       * 並且用一條虛線先標出「這組設定會擺到多高」——
       * 讓學生可以先預測、再發射驗證，而不是盲目按按鈕。
       */
      const m = sm.get(), M = sM.get(), v0 = sv.get();
      const bw = 30 + M * 8, bh = 26 + M * 5;      // 1kg→38×31，5kg→70×51
      const br = 3 + m * 18;                        // 0.01kg→3.2，0.2kg→6.6
      const bxp = px + Lpx * Math.sin(th), byp = py + Lpx * Math.cos(th);
      D.line(ctx, px, py, bxp, byp, "#c9d3e0", 2);
      D.rect(ctx, bxp - bw / 2, byp - bh / 2, bw, bh, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 5 });
      D.text(ctx, "M = " + PL.fmt(M, 1) + " kg", bxp, byp + bh / 2 + 14,
        { color: PL.col("text-dim"), size: 10, align: "center" });

      // 這組設定的預期擺升高度：發射前就畫出來，可以先預測再驗證
      const Vpred = m * v0 / (m + M), hPred = Vpred * Vpred / (2 * g);
      const hPx = Math.min(Lpx * 0.92, hPred / Lp * Lpx);
      if (phase === "ready" && hPx > 1) {
        D.line(ctx, px - Lpx * 0.75, py + Lpx - hPx, px + Lpx * 0.5, py + Lpx - hPx,
          PL.col("warn"), 1.4, [6, 5]);
        D.text(ctx, "預期擺升 " + PL.fmt(hPred, 3) + " m", px - Lpx * 0.75, py + Lpx - hPx - 6,
          { color: PL.col("warn"), size: 10.5 });
      }
      if (phase === "ready") {
        // 待發射的子彈停在槍口，大小隨質量；箭頭長度隨初速
        D.disc(ctx, 40, byp, br, { fill: "#ff6b6b", glow: "#ff6b6b", glowSize: 8 });
        D.arrow(ctx, 40 + br, byp, 40 + br + v0 * 0.12, byp,
          { color: "#ff6b6b", width: 2, head: 7, label: PL.fmt(m, 2) + "kg · " + v0 + "m/s" });
      }
      if (phase === "fly") { const bulletX = 40 + bx; D.disc(ctx, bulletX, byp, 5, { fill: "#ff6b6b", glow: "#ff6b6b" }); D.arrow(ctx, bulletX, byp, bulletX + 26, byp, { color: "#ff6b6b", width: 2 }); }
      D.text(ctx, "h = " + PL.fmt(hmax, 3) + " m", px + 34, py + 18, { color: PL.col("text-dim"), size: 11 });
      rV.set(V, 2); rH.set(hmax, 3); rTh.set(Math.acos(PL.clamp(1 - hmax / Lp, -1, 1)) * 180 / Math.PI, 1);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        if (phase === "fly") { bx += 420 * dt; if (40 + bx >= cv.W * 0.6 - 22) { phase = "swing"; t = 0; } }
        else if (phase === "swing") { t += dt; const thMax = Math.acos(PL.clamp(1 - hmax / Lp, -1, 1)), w = Math.sqrt(g / Lp); th = thMax * Math.sin(w * t) * Math.exp(-0.08 * t); if (t > 14) { phase = "ready"; th = 0; anim.stop(); } }
      }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
