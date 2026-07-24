/* 模組十 · 電場與電路 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#4db6ac");
  const POS = "#ff6b6b", NEG = "#5aa2ff";

  /* 庫侖定律 */
  PL.register("coulomb", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const sQ1 = PL.ui.slider(L.controls, { label: "電荷 q₁", min: -5, max: 5, step: 0.5, value: 3, unit: "μC", digits: 1, onInput: draw });
    const sQ2 = PL.ui.slider(L.controls, { label: "電荷 q₂", min: -5, max: 5, step: 0.5, value: -2, unit: "μC", digits: 1, onInput: draw });
    const sR = PL.ui.slider(L.controls, { label: "距離 r", min: 2, max: 10, step: 0.5, value: 5, unit: "cm", digits: 1, onInput: draw });
    const rF = PL.ui.readout(L.readouts, { label: "靜電力 F", unit: "（相對）" });
    const rDir = PL.ui.readout(L.readouts, { label: "方向" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q1 = sQ1.get(), q2 = sQ2.get(), r = sR.get(), F = 9 * q1 * q2 / (r * r);
      const attract = q1 * q2 < 0, cy = 96, ox = 70, sc = (W - 140) / 10, x1 = ox, x2 = ox + r * sc;
      const drawQ = (x, q) => { D.disc(ctx, x, cy, 10 + Math.abs(q) * 2, { fill: q >= 0 ? POS : NEG, glow: q >= 0 ? POS : NEG, glowSize: 10 }); D.text(ctx, (q >= 0 ? "+" : "−") + Math.abs(q), x, cy + 4, { color: "#fff", size: 12, align: "center", weight: "700" }); };
      drawQ(x1, q1); drawQ(x2, q2);
      const fl = PL.clamp(Math.abs(F) * 3, 6, 70), dir = attract ? -1 : 1;
      D.arrow(ctx, x1, cy - 26, x1 + dir * fl, cy - 26, { color: PL.col("warn"), width: 2.4 });
      D.arrow(ctx, x2, cy - 26, x2 - dir * fl, cy - 26, { color: PL.col("warn"), width: 2.4 });
      D.line(ctx, x1, cy + 26, x2, cy + 26, PL.col("text-faint"), 1, [3, 3]); D.text(ctx, "r = " + r + " cm", (x1 + x2) / 2, cy + 40, { color: PL.col("text-dim"), size: 11, align: "center" });
      const bx = 44, by = 150, bw = W - 80, bh = H - by - 16;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 2, x1: 10, y0: 0, y1: 9 * Math.abs(q1 * q2) / 4 * 1.1 + 1 });
      g.frame({ title: "靜電力大小對距離（平方反比）", xlabel: "r", ylabel: "|F|" }); g.grid(4, 4);
      g.fn(rr => 9 * Math.abs(q1 * q2) / (rr * rr), { color: MC(), width: 2.2 });
      g.dot(r, Math.abs(F), { color: PL.col("warn"), glow: PL.col("warn") });
      rF.set(Math.abs(F), 2); rDir.set(attract ? "相吸" : "相斥");
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 電場線與等勢面 */
  PL.register("efield", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sQ1 = PL.ui.slider(L.controls, { label: "左電荷 q₁", min: -3, max: 3, step: 1, value: 2, unit: "", digits: 0, onInput: draw });
    const sQ2 = PL.ui.slider(L.controls, { label: "右電荷 q₂", min: -3, max: 3, step: 1, value: -2, unit: "", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "電場線由正電荷發出、進入負電荷；線越密處電場越強。");
    const rNote = PL.ui.readout(L.readouts, { label: "組態" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cy = H / 2, q1 = sQ1.get(), q2 = sQ2.get();
      const charges = [{ x: W * 0.36, y: cy, q: q1 }, { x: W * 0.64, y: cy, q: q2 }].filter(c => c.q !== 0);
      const E = (x, y) => { let ex = 0, ey = 0; charges.forEach(c => { const dx = x - c.x, dy = y - c.y, r2 = dx * dx + dy * dy, r = Math.sqrt(r2) + 1e-3; const e = c.q / r2; ex += e * dx / r; ey += e * dy / r; }); return { ex, ey }; };
      // 場線
      charges.forEach(c => {
        if (c.q === 0) return; const n = 8 + Math.abs(c.q) * 4, sgn = c.q > 0 ? 1 : -1;
        for (let i = 0; i < n; i++) {
          const a = TAU * i / n; let x = c.x + Math.cos(a) * 12, y = c.y + Math.sin(a) * 12;
          ctx.save(); ctx.strokeStyle = "rgba(77,182,170,0.55)"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x, y);
          for (let s = 0; s < 260; s++) { const f = E(x, y); const m = Math.hypot(f.ex, f.ey) + 1e-6; x += sgn * f.ex / m * 4; y += sgn * f.ey / m * 4; if (x < 0 || x > W || y < 0 || y > H) break; let hit = false; charges.forEach(o => { if (o.q * c.q < 0 && Math.hypot(x - o.x, y - o.y) < 12) hit = true; }); ctx.lineTo(x, y); if (hit) break; }
          ctx.stroke(); ctx.restore();
        }
      });
      charges.forEach(c => { D.disc(ctx, c.x, c.y, 13, { fill: c.q > 0 ? POS : NEG, glow: c.q > 0 ? POS : NEG, glowSize: 12 }); D.text(ctx, c.q > 0 ? "+" : "−", c.x, c.y + 5, { color: "#fff", size: 16, align: "center", weight: "700" }); });
      rNote.set(q1 * q2 < 0 ? "電偶極" : q1 === 0 || q2 === 0 ? "單電荷" : "同號電荷");
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 電位與電位能（平行板均勻電場） */
  PL.register("potential-e", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    let tp = 0.5;
    const sV = PL.ui.slider(L.controls, { label: "電壓 V", min: 20, max: 200, step: 10, value: 100, unit: "V", digits: 0, onInput: draw });
    const sD = PL.ui.slider(L.controls, { label: "板間距 d", min: 2, max: 8, step: 0.5, value: 4, unit: "cm", digits: 1, onInput: draw });
    const sPos = PL.ui.slider(L.controls, { label: "試驗電荷位置", min: 0, max: 1, step: 0.02, value: 0.5, unit: "", digits: 2, onInput: v => { tp = v; draw(); } });
    const rE = PL.ui.readout(L.readouts, { label: "電場 E=V/d", unit: "V/cm" });
    const rV = PL.ui.readout(L.readouts, { label: "該處電位", unit: "V" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const V = sV.get(), d = sD.get(), topY = 40, botY = H - 40, plateL = 60, plateR = W - 60;
      D.rect(ctx, plateL, topY - 8, plateR - plateL, 8, { fill: POS }); D.text(ctx, "+" + V + "V", plateL - 6, topY - 2, { color: POS, size: 11, align: "right" });
      D.rect(ctx, plateL, botY, plateR - plateL, 8, { fill: NEG }); D.text(ctx, "0 V", plateL - 6, botY + 8, { color: NEG, size: 11, align: "right" });
      // 均勻電場線（向下）
      for (let x = plateL + 20; x < plateR; x += 44) D.arrow(ctx, x, topY, x, botY, { color: "rgba(77,182,170,0.4)", width: 1.5 });
      // 等勢線
      for (let i = 1; i < 5; i++) { const y = PL.lerp(topY, botY, i / 5); D.line(ctx, plateL, y, plateR, y, "rgba(255,255,255,0.12)", 1, [4, 4]); D.text(ctx, PL.fmt(V * (1 - i / 5), 0) + "V", plateR + 4, y + 3, { color: PL.col("text-faint"), size: 9 }); }
      // 試驗電荷
      const cyq = PL.lerp(topY, botY, tp), cx = W / 2;
      D.disc(ctx, cx, cyq, 9, { fill: POS, glow: POS, glowSize: 8 });
      D.arrow(ctx, cx, cyq, cx, cyq + 34, { color: PL.col("warn"), width: 2.2, label: "qE" });
      rE.set(V / d, 1); rV.set(V * (1 - tp), 0);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 歐姆定律與電路 */
  PL.register("ohms", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let t = 0;
    const sV = PL.ui.slider(L.controls, { label: "電壓 V", min: 1, max: 12, step: 0.5, value: 6, unit: "V", digits: 1 });
    const sR = PL.ui.slider(L.controls, { label: "電阻 R", min: 1, max: 20, step: 1, value: 4, unit: "Ω", digits: 0 });
    const rI = PL.ui.readout(L.readouts, { label: "電流 I=V/R", unit: "A" });
    const rP = PL.ui.readout(L.readouts, { label: "功率 P=IV", unit: "W" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const V = sV.get(), R = sR.get(), I = V / R;
      const x0 = 50, x1 = W - 50, y0 = 46, y1 = H - 46;
      ctx.save(); ctx.strokeStyle = PL.col("text-faint"); ctx.lineWidth = 2; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); ctx.restore();
      // 電池
      D.line(ctx, x0, (y0 + y1) / 2 - 12, x0, (y0 + y1) / 2 + 12, "#fff", 4); D.line(ctx, x0 - 6, (y0 + y1) / 2 - 6, x0 - 6, (y0 + y1) / 2 + 6, "#fff", 2);
      D.text(ctx, V + "V", x0 - 10, (y0 + y1) / 2 + 4, { color: PL.col("text-dim"), size: 11, align: "right" });
      // 電阻（鋸齒）
      const rx = (x0 + x1) / 2 - 30;
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(rx, y0); for (let i = 0; i < 6; i++) ctx.lineTo(rx + 5 + i * 10, y0 + (i % 2 ? 8 : -8)); ctx.lineTo(rx + 60, y0); ctx.stroke(); ctx.restore();
      D.text(ctx, R + "Ω", (x0 + x1) / 2, y0 - 8, { color: MC(), size: 12, align: "center" });
      // 電流動畫（電子）
      const peri = 2 * ((x1 - x0) + (y1 - y0)); const nd = 16;
      for (let i = 0; i < nd; i++) { let d = ((t * I * 30 + i * peri / nd) % peri + peri) % peri; let px, py; if (d < x1 - x0) { px = x0 + d; py = y0; } else if (d < (x1 - x0) + (y1 - y0)) { px = x1; py = y0 + (d - (x1 - x0)); } else if (d < 2 * (x1 - x0) + (y1 - y0)) { px = x1 - (d - (x1 - x0) - (y1 - y0)); py = y1; } else { px = x0; py = y1 - (d - 2 * (x1 - x0) - (y1 - y0)); } D.disc(ctx, px, py, 3, { fill: NEG }); }
      rI.set(I, 2); rP.set(I * V, 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 電阻串並聯 */
  PL.register("resistors", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    const sCfg = PL.ui.select(L.controls, { label: "接法", value: "series", options: [{ value: "series", label: "串聯" }, { value: "parallel", label: "並聯" }], onChange: draw });
    const sR1 = PL.ui.slider(L.controls, { label: "電阻 R₁", min: 1, max: 20, step: 1, value: 6, unit: "Ω", digits: 0, onInput: draw });
    const sR2 = PL.ui.slider(L.controls, { label: "電阻 R₂", min: 1, max: 20, step: 1, value: 3, unit: "Ω", digits: 0, onInput: draw });
    const sV = PL.ui.slider(L.controls, { label: "電壓 V", min: 1, max: 24, step: 1, value: 12, unit: "V", digits: 0, onInput: draw });
    const rReq = PL.ui.readout(L.readouts, { label: "等效電阻", unit: "Ω" });
    const rItot = PL.ui.readout(L.readouts, { label: "總電流", unit: "A" });
    const rBranch = PL.ui.readout(L.readouts, { label: "支路電流", unit: "A" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const R1 = sR1.get(), R2 = sR2.get(), V = sV.get(), series = sCfg.get() === "series";
      const Req = series ? R1 + R2 : R1 * R2 / (R1 + R2), Itot = V / Req;
      const resBox = (x, y, r, lab, c) => { D.rect(ctx, x, y - 12, 56, 24, { fill: "rgba(77,182,170,0.15)", stroke: MC(), width: 1.5, r: 4 }); D.text(ctx, lab + "=" + r + "Ω", x + 28, y + 4, { color: c || MC(), size: 11, align: "center" }); };
      const x0 = 50, x1 = W - 50, cy = H / 2;
      D.line(ctx, x0, cy, x0, cy - 40, "#fff", 2); D.text(ctx, V + "V", x0 - 8, cy - 20, { color: PL.col("text-dim"), size: 11, align: "right" });
      if (series) {
        D.line(ctx, x0, cy - 40, W / 2 - 70, cy - 40, PL.col("text-faint"), 2);
        resBox(W / 2 - 70, cy - 40, R1, "R₁"); D.line(ctx, W / 2 - 14, cy - 40, W / 2 + 20, cy - 40, PL.col("text-faint"), 2);
        resBox(W / 2 + 20, cy - 40, R2, "R₂"); D.line(ctx, W / 2 + 76, cy - 40, x1, cy - 40, PL.col("text-faint"), 2);
        D.line(ctx, x1, cy - 40, x1, cy, PL.col("text-faint"), 2); D.line(ctx, x0, cy, x1, cy, PL.col("text-faint"), 2);
        rBranch.set(Itot, 2);
      } else {
        D.line(ctx, x0, cy - 40, W / 2 - 40, cy - 40, PL.col("text-faint"), 2);
        // 兩並聯支路
        D.line(ctx, W / 2 - 40, cy - 40, W / 2 - 40, cy - 66, PL.col("text-faint"), 2); resBox(W / 2 - 28, cy - 66, R1, "R₁"); D.line(ctx, W / 2 + 28, cy - 66, W / 2 + 40, cy - 66, PL.col("text-faint"), 2); D.line(ctx, W / 2 + 40, cy - 66, W / 2 + 40, cy - 40, PL.col("text-faint"), 2);
        D.line(ctx, W / 2 - 40, cy - 40, W / 2 - 40, cy - 14, PL.col("text-faint"), 2); resBox(W / 2 - 28, cy - 14, R2, "R₂"); D.line(ctx, W / 2 + 28, cy - 14, W / 2 + 40, cy - 14, PL.col("text-faint"), 2); D.line(ctx, W / 2 + 40, cy - 14, W / 2 + 40, cy - 40, PL.col("text-faint"), 2);
        D.line(ctx, W / 2 + 40, cy - 40, x1, cy - 40, PL.col("text-faint"), 2);
        D.line(ctx, x1, cy - 40, x1, cy, PL.col("text-faint"), 2); D.line(ctx, x0, cy, x1, cy, PL.col("text-faint"), 2);
        rBranch.set(V / R1, 2);
      }
      rReq.set(Req, 2); rItot.set(Itot, 2);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 電容器充放電 */
  PL.register("capacitor", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let t = 0, mode = "charge";
    const sR = PL.ui.slider(L.controls, { label: "電阻 R", min: 1, max: 10, step: 0.5, value: 4, unit: "kΩ", digits: 1, onInput: () => t = 0 });
    const sC = PL.ui.slider(L.controls, { label: "電容 C", min: 20, max: 200, step: 10, value: 100, unit: "μF", digits: 0, onInput: () => t = 0 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "充電", () => { mode = "charge"; t = 0; anim.start(); }, { primary: true });
    PL.ui.button(row, "放電", () => { mode = "discharge"; t = 0; anim.start(); });
    const rTau = PL.ui.readout(L.readouts, { label: "時間常數 τ=RC", unit: "s" });
    const rV = PL.ui.readout(L.readouts, { label: "電容電壓", unit: "×V₀" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const tau = sR.get() * sC.get() / 1000, V0 = 1;
      const V = mode === "charge" ? V0 * (1 - Math.exp(-t / tau)) : V0 * Math.exp(-t / tau);
      // 電容器示意
      const cx = 74, cyc = 70, gap = 22 * (0.3 + V * 0.7);
      D.line(ctx, cx - 26, cyc - gap, cx + 26, cyc - gap, POS, 4); D.line(ctx, cx - 26, cyc + gap, cx + 26, cyc + gap, NEG, 4);
      for (let i = 0; i < Math.round(V * 6); i++) { D.text(ctx, "+", cx - 20 + i * 8, cyc - gap - 4, { color: POS, size: 12 }); D.text(ctx, "−", cx - 20 + i * 8, cyc + gap + 12, { color: NEG, size: 12 }); }
      D.text(ctx, "電容器", cx, cyc + 40, { color: PL.col("text-dim"), size: 11, align: "center" });
      // V–t 與 I–t
      const bx = 150, by = 24, bw = W - bx - 20, bh = H - 48;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: 5 * tau, y0: 0, y1: 1.05 });
      g.frame({ title: mode === "charge" ? "充電：電壓上升、電流衰減" : "放電：兩者皆指數衰減", xlabel: "t (s)" }); g.grid(5, 4);
      g.fn(tt => mode === "charge" ? 1 - Math.exp(-tt / tau) : Math.exp(-tt / tau), { color: MC(), width: 2.2 });
      g.fn(tt => Math.exp(-tt / tau), { color: PL.col("accent-2"), width: 2, dash: [4, 3] });
      g.vline(Math.min(t, 5 * tau), { color: "#fff", dash: [3, 3], width: 1 });
      g.dot(Math.min(t, 5 * tau), V, { color: MC(), glow: MC() });
      D.text(ctx, "V", bx + bw - 20, by + 14, { color: MC(), size: 11 }); D.text(ctx, "I", bx + bw - 20, by + 28, { color: PL.col("accent-2"), size: 11 });
      rTau.set(tau, 2); rV.set(V, 3);
    }
    const anim = PL.loop(dt => { if (dt) { t += dt; if (t > 5 * (sR.get() * sC.get() / 1000)) anim.stop(); } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 惠斯登電橋 */
  PL.register("wheatstone", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sR1 = PL.ui.slider(L.controls, { label: "R₁", min: 1, max: 20, step: 1, value: 6, unit: "Ω", digits: 0, onInput: draw });
    const sR2 = PL.ui.slider(L.controls, { label: "R₂", min: 1, max: 20, step: 1, value: 4, unit: "Ω", digits: 0, onInput: draw });
    const sR3 = PL.ui.slider(L.controls, { label: "R₃", min: 1, max: 20, step: 1, value: 9, unit: "Ω", digits: 0, onInput: draw });
    const sRx = PL.ui.slider(L.controls, { label: "Rₓ（未知）", min: 1, max: 20, step: 1, value: 6, unit: "Ω", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "調到檢流計歸零即平衡：R₁Rₓ = R₂R₃。");
    const rG = PL.ui.readout(L.readouts, { label: "檢流計", unit: "" });
    const rBal = PL.ui.readout(L.readouts, { label: "狀態" });
    const rRx = PL.ui.readout(L.readouts, { label: "平衡時 Rₓ", unit: "Ω" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const R1 = sR1.get(), R2 = sR2.get(), R3 = sR3.get(), Rx = sRx.get();
      const cx = W / 2, cy = H / 2, s = Math.min(W, H) * 0.34;
      const T = { x: cx, y: cy - s }, B = { x: cx, y: cy + s }, Ln = { x: cx - s, y: cy }, Rn = { x: cx + s, y: cy };
      const arm = (a, b, lab, c) => { D.line(ctx, a.x, a.y, b.x, b.y, c, 2); D.text(ctx, lab, (a.x + b.x) / 2 + 12, (a.y + b.y) / 2 - 4, { color: c, size: 11, align: "center" }); };
      arm(T, Ln, "R₁=" + R1, PL.col("accent-2")); arm(T, Rn, "R₂=" + R2, PL.col("accent-2"));
      arm(Ln, B, "R₃=" + R3, MC()); arm(Rn, B, "Rₓ=" + Rx, MC());
      D.disc(ctx, T.x, T.y, 4, { fill: "#fff" }); D.disc(ctx, B.x, B.y, 4, { fill: "#fff" });
      D.text(ctx, "＋電池－", T.x, T.y - 12, { color: PL.col("warn"), size: 11, align: "center" });
      D.line(ctx, Ln.x, Ln.y, Rn.x, Rn.y, PL.col("text-faint"), 1.5);
      const gm = { x: cx, y: cy }; D.disc(ctx, gm.x, gm.y, 16, { fill: PL.col("panel-2"), stroke: PL.col("text-faint"), width: 2 });
      const VL = R3 / (R1 + R3), VR = Rx / (R2 + Rx), diff = VL - VR, needle = PL.clamp(diff * 4, -1, 1) * Math.PI / 3;
      D.line(ctx, gm.x, gm.y, gm.x + 13 * Math.sin(needle), gm.y - 13 * Math.cos(needle), PL.col("danger"), 2);
      D.text(ctx, "G", gm.x, gm.y + 30, { color: PL.col("text-dim"), size: 11, align: "center" });
      const balanced = Math.abs(R1 * Rx - R2 * R3) < 0.5;
      rG.set(diff * 100, 1); rBal.set(balanced ? "平衡 ✓" : "不平衡"); rRx.set(R2 * R3 / R1, 2);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 帶電粒子在電場中的偏轉 */
  PL.register("e-deflection", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let t = 0;
    const sV = PL.ui.slider(L.controls, { label: "入射速度 v", min: 2, max: 10, step: 0.5, value: 6, unit: "", digits: 1 });
    const sE = PL.ui.slider(L.controls, { label: "偏轉電壓 V", min: -10, max: 10, step: 0.5, value: 6, unit: "", digits: 1 });
    PL.ui.note(L.controls, "板內水平等速、鉛直等加速，軌跡為拋物線——與拋體運動一模一樣。");
    const rY = PL.ui.readout(L.readouts, { label: "板內偏轉量", unit: "" });
    const rAng = PL.ui.readout(L.readouts, { label: "出射角", unit: "°" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cy = H / 2, plateL = 90, plateR = W * 0.62, gap = 74, v = sV.get(), E = sE.get(), K = E / (v * v) * 0.9;
      D.rect(ctx, plateL, cy - gap / 2 - 8, plateR - plateL, 8, { fill: POS }); D.text(ctx, "＋", plateL - 14, cy - gap / 2, { color: POS, size: 13 });
      D.rect(ctx, plateL, cy + gap / 2, plateR - plateL, 8, { fill: NEG }); D.text(ctx, "－", plateL - 14, cy + gap / 2 + 12, { color: NEG, size: 13 });
      for (let x = plateL + 20; x < plateR; x += 40) D.arrow(ctx, x, cy - gap / 2, x, cy + gap / 2, { color: "rgba(77,182,170,0.28)", width: 1 });
      const yR = K * (plateR - plateL) * (plateR - plateL), slope = 2 * K * (plateR - plateL);
      ctx.save(); ctx.strokeStyle = "#ffe08a"; ctx.lineWidth = 2; ctx.beginPath();
      for (let x = plateL; x <= W - 20; x += 2) { let y = x <= plateR ? cy + K * (x - plateL) * (x - plateL) : cy + yR + slope * (x - plateR); if (y > cy + gap / 2 && x < plateR) { y = cy + gap / 2; } x === plateL ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      D.arrow(ctx, 20, cy, plateL - 4, cy, { color: "#fff", width: 2, label: "v" });
      const tt = (t * v * 26) % (W - plateL - 20), xp = plateL + tt;
      const yp = xp <= plateR ? cy + K * (xp - plateL) * (xp - plateL) : cy + yR + slope * (xp - plateR);
      if (Math.abs(yp - cy) < gap / 2 || xp > plateR) D.disc(ctx, xp, yp, 6, { fill: "#5aa2ff", glow: "#5aa2ff", glowSize: 8 });
      rY.set(Math.abs(yR), 1); rAng.set(Math.atan(slope) * 180 / Math.PI, 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
