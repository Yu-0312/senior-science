/* 模組五 · 圓周運動與萬有引力 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#ffd54f");

  /* 等速圓周運動 */
  PL.register("circular", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let ang = 0;
    const sR = PL.ui.slider(L.controls, { label: "半徑 r", min: 1, max: 5, step: 0.5, value: 3, unit: "m", digits: 1 });
    const sW = PL.ui.slider(L.controls, { label: "角速度 ω", min: 0.5, max: 4, step: 0.1, value: 1.6, unit: "rad/s", digits: 1 });
    PL.ui.note(L.controls, "速率不變，但速度方向持續改變，因此有指向圓心的向心加速度。");
    const rV = PL.ui.readout(L.readouts, { label: "線速率 v=ωr", unit: "m/s" });
    const rA = PL.ui.readout(L.readouts, { label: "向心加速度", unit: "m/s²" });
    const rT = PL.ui.readout(L.readouts, { label: "週期 T", unit: "s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H / 2, r = sR.get(), w = sW.get(), R = Math.min(W, H) * 0.34 * (r / 5) + 40;
      D.ring(ctx, cx, cy, R, "rgba(255,255,255,0.15)", 1.5, [4, 4]);
      D.disc(ctx, cx, cy, 4, { fill: PL.col("text-faint") });
      const bx = cx + R * Math.cos(ang), by = cy + R * Math.sin(ang);
      // 半徑
      D.line(ctx, cx, cy, bx, by, "rgba(255,255,255,0.2)", 1.5);
      // 速度（切線）與加速度（向心）
      D.arrow(ctx, bx, by, bx - 46 * Math.sin(ang), by + 46 * Math.cos(ang), { color: PL.col("accent-2"), width: 2.4, label: "v" });
      D.arrow(ctx, bx, by, bx + (cx - bx) * 0.34, by + (cy - by) * 0.34, { color: PL.col("danger"), width: 2.4, label: "a_c" });
      D.disc(ctx, bx, by, 11, { fill: MC(), glow: MC(), glowSize: 14 });
      rV.set(w * r, 2); rA.set(w * w * r, 2); rT.set(TAU / w, 2);
    }
    const anim = PL.loop(dt => { if (dt) ang += sW.get() * dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 向心力（繩繫小球，可斷繩） */
  PL.register("centripetal", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let ang = 0, broken = false, fx = 0, fy = 0, bx = 0, by = 0;
    const sM = PL.ui.slider(L.controls, { label: "質量 m", min: 0.2, max: 3, step: 0.1, value: 1, unit: "kg", digits: 1 });
    const sR = PL.ui.slider(L.controls, { label: "半徑 r", min: 1, max: 4, step: 0.5, value: 2.5, unit: "m", digits: 1 });
    const sW = PL.ui.slider(L.controls, { label: "角速度 ω", min: 0.8, max: 5, step: 0.1, value: 2.2, unit: "rad/s", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "斷繩！", () => { if (!broken) { broken = true; } }, { primary: true });
    PL.ui.button(row, "重新旋轉", () => { broken = false; ang = 0; });
    const rF = PL.ui.readout(L.readouts, { label: "向心力 F_c", unit: "N" });
    const rV = PL.ui.readout(L.readouts, { label: "線速率 v", unit: "m/s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H / 2, r = sR.get(), w = sW.get(), R = Math.min(W, H) * 0.3 * (r / 4) + 40;
      D.ring(ctx, cx, cy, R, "rgba(255,255,255,0.12)", 1.5, [4, 4]);
      D.disc(ctx, cx, cy, 5, { fill: PL.col("text-faint") });
      if (!broken) {
        bx = cx + R * Math.cos(ang); by = cy + R * Math.sin(ang);
        D.line(ctx, cx, cy, bx, by, MC(), 2);
        D.arrow(ctx, bx, by, bx + (cx - bx) * 0.4, by + (cy - by) * 0.4, { color: PL.col("danger"), width: 2.4, label: "F_c" });
        D.arrow(ctx, bx, by, bx - 40 * Math.sin(ang), by + 40 * Math.cos(ang), { color: PL.col("accent-2"), width: 2, label: "v" });
      } else {
        D.arrow(ctx, bx, by, bx + fx * 0.4, by + fy * 0.4, { color: PL.col("accent-2"), width: 2, label: "沿切線飛出" });
      }
      D.disc(ctx, bx, by, 10, { fill: MC(), glow: MC(), glowSize: 12 });
      rF.set(sM.get() * w * w * r, 2); rV.set(w * r, 2);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        if (!broken) { ang += sW.get() * dt; }
        else {
          const R = Math.min(cv.W, cv.H) * 0.3 * (sR.get() / 4) + 40;
          if (fx === 0 && fy === 0) { fx = -R * sW.get() * Math.sin(ang); fy = R * sW.get() * Math.cos(ang); }
          bx += fx * dt; by += fy * dt;
          if (bx < 0 || bx > cv.W || by < 0 || by > cv.H) { fx = 0; fy = 0; broken = false; ang = 0; }
        }
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 萬有引力定律 */
  PL.register("gravitation", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const sM1 = PL.ui.slider(L.controls, { label: "質量 m₁", min: 1, max: 10, step: 0.5, value: 5, unit: "", digits: 1, onInput: draw });
    const sM2 = PL.ui.slider(L.controls, { label: "質量 m₂", min: 1, max: 10, step: 0.5, value: 3, unit: "", digits: 1, onInput: draw });
    const sR = PL.ui.slider(L.controls, { label: "距離 r", min: 2, max: 10, step: 0.5, value: 5, unit: "", digits: 1, onInput: draw });
    PL.ui.note(L.controls, "引力與質量乘積成正比、與距離平方成反比。此處力為相對單位。");
    const rF = PL.ui.readout(L.readouts, { label: "引力 F", unit: "" });
    const rNote = PL.ui.readout(L.readouts, { label: "距離加倍則" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m1 = sM1.get(), m2 = sM2.get(), r = sR.get(), F = m1 * m2 / (r * r);
      const cy = 92, ox = 60, sc = (W - 120) / 10;
      const x1 = ox, x2 = ox + r * sc;
      D.disc(ctx, x1, cy, 8 + m1 * 1.6, { fill: MC(), glow: MC(), glowSize: 10 }); D.text(ctx, "m₁", x1, cy - 20 - m1, { color: MC(), size: 12, align: "center" });
      D.disc(ctx, x2, cy, 8 + m2 * 1.6, { fill: PL.col("accent-2"), glow: PL.col("accent-2"), glowSize: 10 }); D.text(ctx, "m₂", x2, cy - 20 - m2, { color: PL.col("accent-2"), size: 12, align: "center" });
      const fl = PL.clamp(F * 8, 8, 80);
      D.arrow(ctx, x1 + 16, cy, x1 + 16 + fl, cy, { color: PL.col("danger"), width: 2.4 });
      D.arrow(ctx, x2 - 16, cy, x2 - 16 - fl, cy, { color: PL.col("danger"), width: 2.4 });
      D.line(ctx, x1, cy + 30, x2, cy + 30, PL.col("text-faint"), 1, [3, 3]); D.text(ctx, "r = " + r, (x1 + x2) / 2, cy + 44, { color: PL.col("text-dim"), size: 11, align: "center" });
      // F–r 曲線
      const bx = 44, by = 150, bw = W - 80, bh = H - by - 16;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 2, x1: 10, y0: 0, y1: m1 * m2 / 4 * 1.1 });
      g.frame({ title: "引力 F 對 距離 r（平方反比）", xlabel: "r", ylabel: "F" }); g.grid(4, 4);
      g.fn(rr => m1 * m2 / (rr * rr), { color: MC(), width: 2.4 });
      g.dot(r, F, { color: PL.col("danger"), glow: PL.col("danger") });
      rF.set(F, 3); rNote.set("F → " + PL.fmt(F / 4, 3));
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 行星軌道與克卜勒定律 */
  PL.register("orbit", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    const GM = 972000, r0 = 120; const vc = Math.sqrt(GM / r0);
    let p, v, trail;
    const sF = PL.ui.slider(L.controls, { label: "發射速率（×圓軌道速率）", min: 0.5, max: 1.45, step: 0.01, value: 1, unit: "", digits: 2, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "重新發射", reset, { primary: true });
    PL.ui.note(L.controls, "＝1 圓形；<1 或介於 1~√2 為橢圓；≥√2 (≈1.41) 脫離。近星點速度最快。");
    const rR = PL.ui.readout(L.readouts, { label: "距中心 r", unit: "px" });
    const rV = PL.ui.readout(L.readouts, { label: "速率 v", unit: "px/s" });
    const rType = PL.ui.readout(L.readouts, { label: "軌道類型" });
    function reset() { p = { x: r0, y: 0 }; v = { x: 0, y: vc * sF.get() }; trail = []; }
    reset();
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H / 2;
      // 星
      D.disc(ctx, cx, cy, 15, { fill: MC(), glow: MC(), glowSize: 26 });
      ctx.save(); ctx.strokeStyle = "rgba(255,213,79,0.5)"; ctx.lineWidth = 1.5; ctx.beginPath();
      trail.forEach((t, i) => { const px = cx + t.x, py = cy + t.y; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); ctx.restore();
      D.disc(ctx, cx + p.x, cy + p.y, 7, { fill: PL.col("accent-2"), glow: PL.col("accent-2"), glowSize: 10 });
      D.arrow(ctx, cx + p.x, cy + p.y, cx + p.x + v.x * 0.28, cy + p.y + v.y * 0.28, { color: "#fff", width: 1.8 });
      const r = Math.hypot(p.x, p.y), sp = Math.hypot(v.x, v.y);
      rR.set(r, 0); rV.set(sp, 0);
      rType.set(sF.get() >= 1.41 ? "脫離/雙曲線" : Math.abs(sF.get() - 1) < 0.02 ? "圓形" : "橢圓");
    }
    const anim = PL.loop(dt => {
      if (dt) {
        dt = Math.min(dt, 0.03);
        for (let k = 0; k < 6; k++) {
          const r = Math.hypot(p.x, p.y); if (r < 16) { reset(); return; }
          const a = -GM / (r * r * r); v.x += a * p.x * dt / 6; v.y += a * p.y * dt / 6; p.x += v.x * dt / 6; p.y += v.y * dt / 6;
        }
        trail.push({ x: p.x, y: p.y }); if (trail.length > 420) trail.shift();
        if (Math.abs(p.x) > cv.W || Math.abs(p.y) > cv.H) { if (sF.get() < 1.41) reset(); }
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 人造衛星與脫離速度 */
  PL.register("satellite", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    const GM = 640000, Rp = 46; const vcs = Math.sqrt(GM / Rp), vesc = Math.sqrt(2) * vcs;
    let p, v, trail, state;
    const sF = PL.ui.slider(L.controls, { label: "水平發射速率（×近地圓速）", min: 0.4, max: 1.5, step: 0.01, value: 1, unit: "", digits: 2, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "發射", reset, { primary: true });
    PL.ui.note(L.controls, "太慢會墜回地面；恰當則進入軌道；≥√2 倍圓速即可脫離。");
    const rV = PL.ui.readout(L.readouts, { label: "發射速率", unit: "×圓速" });
    const rState = PL.ui.readout(L.readouts, { label: "結果" });
    function reset() { p = { x: 0, y: -Rp - 4 }; v = { x: vcs * sF.get(), y: 0 }; trail = []; state = "flight"; }
    reset();
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H / 2;
      D.disc(ctx, cx, cy, Rp, { fill: "rgba(90,162,255,0.25)", stroke: PL.col("accent-2"), width: 2 });
      D.disc(ctx, cx, cy, Rp * 0.6, { fill: "rgba(90,162,255,0.15)" });
      D.text(ctx, "地球", cx, cy + 4, { color: PL.col("accent-2"), size: 12, align: "center" });
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 1.5; ctx.beginPath();
      trail.forEach((t, i) => { const px = cx + t.x, py = cy + t.y; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); ctx.restore();
      if (state !== "crash") { D.disc(ctx, cx + p.x, cy + p.y, 6, { fill: MC(), glow: MC(), glowSize: 10 }); D.arrow(ctx, cx + p.x, cy + p.y, cx + p.x + v.x * 0.2, cy + p.y + v.y * 0.2, { color: "#fff", width: 1.6 }); }
      rV.set(sF.get(), 2); rState.set(state === "crash" ? "墜落地表" : state === "escape" ? "脫離軌道" : "繞行中");
    }
    const anim = PL.loop(dt => {
      if (dt && state === "flight") {
        dt = Math.min(dt, 0.03);
        for (let k = 0; k < 6; k++) {
          const r = Math.hypot(p.x, p.y);
          if (r < Rp) { state = "crash"; break; }
          const a = -GM / (r * r * r); v.x += a * p.x * dt / 6; v.y += a * p.y * dt / 6; p.x += v.x * dt / 6; p.y += v.y * dt / 6;
        }
        trail.push({ x: p.x, y: p.y }); if (trail.length > 500) trail.shift();
        if (sF.get() >= 1.41 && Math.hypot(p.x, p.y) > Math.max(cv.W, cv.H)) state = "escape";
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 角動量守恆 */
  PL.register("angular-momentum", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const m = 1, Lmom = 1 * 3 * 2; // L = m v r（固定）
    let ang = 0;
    const sR = PL.ui.slider(L.controls, { label: "半徑 r（拉繩調整）", min: 0.8, max: 3.2, step: 0.1, value: 3, unit: "m", digits: 1 });
    PL.ui.note(L.controls, "外力沿繩指向圓心、不產生力矩，故角動量 L 守恆：半徑縮小，轉速就變快。");
    const rL = PL.ui.readout(L.readouts, { label: "角動量 L", unit: "（守恆）" });
    const rW = PL.ui.readout(L.readouts, { label: "角速度 ω", unit: "rad/s" });
    const rV = PL.ui.readout(L.readouts, { label: "線速率 v", unit: "m/s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H / 2, r = sR.get(), R = 30 + r * 42;
      const w = Lmom / (m * r * r), v = w * r;
      D.ring(ctx, cx, cy, R, "rgba(255,255,255,0.12)", 1.5, [4, 4]);
      D.disc(ctx, cx, cy, 6, { fill: PL.col("text-faint") });
      const bx = cx + R * Math.cos(ang), by = cy + R * Math.sin(ang);
      D.line(ctx, cx, cy, bx, by, MC(), 2);
      D.arrow(ctx, cx, cy, cx + (bx - cx) * 0.4, cy + (by - cy) * 0.4, { color: PL.col("danger"), width: 2, label: "拉力" });
      const va = 18 + v * 6; D.arrow(ctx, bx, by, bx - va * Math.sin(ang), by + va * Math.cos(ang), { color: PL.col("accent-2"), width: 2, label: "v" });
      D.disc(ctx, bx, by, 11, { fill: MC(), glow: MC(), glowSize: 12 });
      rL.set(Lmom, 1); rW.set(w, 2); rV.set(v, 2);
    }
    const anim = PL.loop(dt => { if (dt) { const r = sR.get(); ang += (Lmom / (m * r * r)) * dt; } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 剛體轉動與轉動慣量 */
  PL.register("rotation", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let w = 0, ang = 0;
    const sTau = PL.ui.slider(L.controls, { label: "外加力矩 τ", min: 0, max: 12, step: 0.5, value: 6, unit: "N·m", digits: 1 });
    const sI = PL.ui.slider(L.controls, { label: "轉動慣量 I", min: 1, max: 10, step: 0.5, value: 4, unit: "kg·m²", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "施加力矩", () => { anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", () => { w = 0; ang = 0; });
    PL.ui.note(L.controls, "τ = Iα 是轉動版的牛頓第二定律；轉動慣量越大越難改變轉動狀態。");
    const rI = PL.ui.readout(L.readouts, { label: "轉動慣量 I", unit: "kg·m²" });
    const rA = PL.ui.readout(L.readouts, { label: "角加速度 α", unit: "rad/s²" });
    const rW = PL.ui.readout(L.readouts, { label: "角速度 ω", unit: "rad/s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.32;
      D.disc(ctx, cx, cy, R, { fill: "rgba(255,213,79,0.08)", stroke: MC(), width: 2 });
      for (let k = 0; k < 6; k++) { const a = ang + k * Math.PI / 3; D.line(ctx, cx, cy, cx + R * Math.cos(a), cy + R * Math.sin(a), k === 0 ? MC() : "rgba(255,255,255,0.16)", k === 0 ? 3 : 1.5); }
      D.disc(ctx, cx + R * Math.cos(ang), cy + R * Math.sin(ang), 7, { fill: MC(), glow: MC(), glowSize: 10 });
      D.disc(ctx, cx, cy, 6, { fill: "#fff" });
      ctx.save(); ctx.strokeStyle = PL.col("danger"); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(cx, cy, R + 16, -0.7, 0.7); ctx.stroke(); ctx.restore();
      D.arrow(ctx, cx + (R + 16) * Math.cos(0.7), cy + (R + 16) * Math.sin(0.7), cx + (R + 16) * Math.cos(0.86), cy + (R + 16) * Math.sin(0.86), { color: PL.col("danger"), width: 2.4, label: "τ" });
      rI.set(sI.get(), 1); rA.set(sTau.get() / sI.get(), 2); rW.set(w, 2);
    }
    const anim = PL.loop(dt => { if (dt) { w += (sTau.get() / sI.get()) * dt; ang += w * dt; } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 鉛直圓周運動 */
  PL.register("vertical-circle", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.8);
    const g = 9.8, m = 1; let beta = 0, dir = 1, mode = "circle", px = 0, py = 0, vx = 0, vy = 0;
    const sV = PL.ui.slider(L.controls, { label: "最低點速率 v₀", min: 2, max: 10, step: 0.5, value: 7, unit: "m/s", digits: 1, onInput: reset });
    const sR = PL.ui.slider(L.controls, { label: "半徑 r", min: 1, max: 3, step: 0.5, value: 2, unit: "m", digits: 1, onInput: reset });
    PL.ui.button(PL.ui.buttonRow(L.controls), "重新開始", reset, { primary: true });
    PL.ui.note(L.controls, "要能通過最高點，該處速率至少 √(gr)，否則繩鬆脫、物體脫離圓周。");
    const rTop = PL.ui.readout(L.readouts, { label: "頂點速率", unit: "m/s" });
    const rT = PL.ui.readout(L.readouts, { label: "底點張力", unit: "N" });
    const rMin = PL.ui.readout(L.readouts, { label: "過頂最小速率", unit: "m/s" });
    function reset() { beta = 0; dir = 1; mode = "circle"; }
    reset();
    const speed2 = b => sV.get() * sV.get() - 2 * g * sR.get() * (1 - Math.cos(b));
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const r = sR.get(), cx = W / 2, cy = H * 0.46, R = Math.min(W, H) * 0.3;
      D.ring(ctx, cx, cy, R, "rgba(255,255,255,0.12)", 1.5, [4, 4]);
      D.disc(ctx, cx, cy, 4, { fill: PL.col("text-faint") });
      let ballx, bally;
      if (mode === "circle") {
        ballx = cx + R * Math.sin(beta); bally = cy + R * Math.cos(beta);
        D.line(ctx, cx, cy, ballx, bally, MC(), 2);
        const v2 = Math.max(0, speed2(beta)), T = m * v2 / r + m * g * Math.cos(beta);
        if (T > 0) { const f = PL.clamp(T / 80, 0.12, 0.5); D.arrow(ctx, ballx, bally, ballx + (cx - ballx) * f, bally + (cy - bally) * f, { color: PL.col("danger"), width: 2, label: "T" }); }
      } else { ballx = px; bally = py; D.text(ctx, "繩鬆脫，物體脫離圓周！", cx, H - 14, { color: PL.col("danger"), size: 12, align: "center" }); }
      D.disc(ctx, ballx, bally, 11, { fill: MC(), glow: MC(), glowSize: 12 });
      const vt2 = speed2(Math.PI);
      rTop.set(vt2 > 0 ? Math.sqrt(vt2) : 0, 2); rT.set(m * sV.get() * sV.get() / r + m * g, 1); rMin.set(Math.sqrt(g * r), 2);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        dt = Math.min(dt, 0.02);
        const r = sR.get(), cx = cv.W / 2, cy = cv.H * 0.46, R = Math.min(cv.W, cv.H) * 0.3, scale = R / r;
        if (mode === "circle") {
          const v2 = speed2(beta);
          if (v2 <= 0) { dir = -dir; beta += dir * 0.02; }
          else {
            const T = m * v2 / r + m * g * Math.cos(beta), v = Math.sqrt(v2);
            if (Math.cos(beta) < 0 && T < 0) { px = cx + R * Math.sin(beta); py = cy + R * Math.cos(beta); vx = dir * v * Math.cos(beta); vy = -dir * v * Math.sin(beta); mode = "projectile"; }
            else beta += dir * (v / r) * dt;
          }
        } else { vy += g * dt; px += vx * scale * dt; py += vy * scale * dt; if (py > cv.H + 20) reset(); }
      }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
