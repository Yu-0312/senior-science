/* 模組九 · 光學 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw;
  const MC = () => PL.col("m-color", "#f06292");
  function intersect(p1, d1, p2, d2) {
    const den = d1.x * d2.y - d1.y * d2.x; if (Math.abs(den) < 1e-6) return null;
    const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / den;
    return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
  }
  const nmColor = nm => {
    let r = 0, g = 0, b = 0;
    if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else { r = 1; }
    return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
  };

  /* 反射與折射（司乃耳定律） */
  PL.register("snell", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sTh = PL.ui.slider(L.controls, { label: "入射角 θ₁", min: 0, max: 89, step: 1, value: 35, unit: "°", digits: 0, onInput: draw });
    const sN1 = PL.ui.slider(L.controls, { label: "介質1 折射率 n₁", min: 1, max: 2.4, step: 0.05, value: 1, unit: "", digits: 2, onInput: draw });
    const sN2 = PL.ui.slider(L.controls, { label: "介質2 折射率 n₂", min: 1, max: 2.4, step: 0.05, value: 1.5, unit: "", digits: 2, onInput: draw });
    const rTh2 = PL.ui.readout(L.readouts, { label: "折射角 θ₂", unit: "°" });
    const rTIR = PL.ui.readout(L.readouts, { label: "臨界角 θc", unit: "°" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H / 2, Ln = Math.min(W, H) * 0.4, th1 = sTh.get() * Math.PI / 180, n1 = sN1.get(), n2 = sN2.get();
      D.rect(ctx, 0, 0, W, cy, { fill: "rgba(90,162,255,0.06)" });
      D.rect(ctx, 0, cy, W, H - cy, { fill: "rgba(240,98,146,0.08)" });
      D.line(ctx, 0, cy, W, cy, PL.col("text-faint"), 2);
      D.line(ctx, cx, 20, cx, H - 20, "rgba(255,255,255,0.2)", 1, [4, 4]);
      D.text(ctx, "n₁ = " + PL.fmt(n1, 2), 14, cy - 12, { color: PL.col("accent-2"), size: 12 });
      D.text(ctx, "n₂ = " + PL.fmt(n2, 2), 14, cy + 20, { color: MC(), size: 12 });
      // 入射
      D.arrow(ctx, cx - Ln * Math.sin(th1), cy - Ln * Math.cos(th1), cx, cy, { color: "#ffe08a", width: 2.4, label: "入射" });
      // 反射
      D.arrow(ctx, cx, cy, cx + Ln * Math.sin(th1), cy - Ln * Math.cos(th1), { color: "rgba(255,224,138,0.6)", width: 2, label: "反射" });
      const sinth2 = n1 * Math.sin(th1) / n2;
      if (sinth2 <= 1) { const th2 = Math.asin(sinth2); D.arrow(ctx, cx, cy, cx + Ln * Math.sin(th2), cy + Ln * Math.cos(th2), { color: MC(), width: 2.4, label: "折射" }); rTh2.set(th2 * 180 / Math.PI, 1); }
      else { D.text(ctx, "全反射！", cx + 10, cy + 30, { color: PL.col("danger"), size: 13 }); rTh2.set("全反射"); }
      rTIR.set(n1 > n2 ? Math.asin(n2 / n1) * 180 / Math.PI : "不適用");
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 透鏡成像 */
  PL.register("lens", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const sType = PL.ui.select(L.controls, { label: "透鏡", value: "conv", options: [{ value: "conv", label: "凸透鏡（會聚）" }, { value: "div", label: "凹透鏡（發散）" }], onChange: draw });
    const sF = PL.ui.slider(L.controls, { label: "焦距 |f|", min: 40, max: 150, step: 5, value: 90, unit: "px", digits: 0, onInput: draw });
    const sP = PL.ui.slider(L.controls, { label: "物距 p", min: 40, max: 320, step: 5, value: 200, unit: "px", digits: 0, onInput: draw });
    const rQ = PL.ui.readout(L.readouts, { label: "像距 q", unit: "px" });
    const rM = PL.ui.readout(L.readouts, { label: "放大率 m", unit: "" });
    const rType = PL.ui.readout(L.readouts, { label: "成像" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const conv = sType.get() === "conv", f = sF.get() * (conv ? 1 : -1);
      const xL = W * 0.5, cy = H / 2, p = sP.get(), ho = -46;
      D.line(ctx, 20, cy, W - 20, cy, PL.col("text-faint"), 1.5);
      // 透鏡
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(xL, cy - 60); ctx.lineTo(xL, cy + 60); ctx.stroke();
      if (conv) { D.arrow(ctx, xL, cy - 60, xL - 8, cy - 52, { color: MC(), width: 2 }); D.arrow(ctx, xL, cy - 60, xL + 8, cy - 52, { color: MC(), width: 2 }); D.arrow(ctx, xL, cy + 60, xL - 8, cy + 52, { color: MC(), width: 2 }); D.arrow(ctx, xL, cy + 60, xL + 8, cy + 52, { color: MC(), width: 2 }); }
      ctx.restore();
      [[-1, "F"], [1, "F'"]].forEach(([s, lab]) => { const fx = xL + s * Math.abs(f); D.disc(ctx, fx, cy, 3, { fill: PL.col("text-dim") }); D.text(ctx, lab, fx, cy + 16, { color: PL.col("text-faint"), size: 10, align: "center" }); });
      // 物
      const xo = xL - p, top = { x: xo, y: cy + ho };
      D.arrow(ctx, xo, cy, xo, cy + ho, { color: PL.col("accent-2"), width: 2.4, label: "物" });
      // 兩條主要光線
      const A = { x: xL, y: cy + ho };
      const Fp = { x: xL + f, y: cy };
      const d1 = conv ? { x: Fp.x - A.x, y: Fp.y - A.y } : { x: A.x - Fp.x, y: A.y - Fp.y };
      const center = { x: xL, y: cy };
      const d2 = { x: center.x - top.x, y: center.y - top.y };
      const img = intersect(A, d1, top, d2);
      // 畫光線
      D.line(ctx, xo, cy + ho, A.x, A.y, "#ffe08a", 1.6);
      D.line(ctx, xo, cy + ho, center.x, center.y, "#ffe08a", 1.6);
      const far = 1000;
      D.line(ctx, A.x, A.y, A.x + d1.x / Math.hypot(d1.x, d1.y) * far, A.y + d1.y / Math.hypot(d1.x, d1.y) * far, "#ffe08a", 1.6);
      D.line(ctx, center.x, center.y, center.x + d2.x / Math.hypot(d2.x, d2.y) * far, center.y + d2.y / Math.hypot(d2.x, d2.y) * far, "#ffe08a", 1.6);
      if (img) {
        const virtual = img.x < xL;
        D.arrow(ctx, img.x, cy, img.x, img.y, { color: MC(), width: 2.4, label: virtual ? "虛像" : "實像", dash: virtual ? [4, 3] : null });
        const qq = img.x - xL, m = (img.y - cy) / ho;
        rQ.set(qq, 0); rM.set(m, 2); rType.set(virtual ? "正立虛像" : "倒立實像");
      }
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 面鏡成像 */
  PL.register("mirror", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const sType = PL.ui.select(L.controls, { label: "面鏡", value: "concave", options: [{ value: "concave", label: "凹面鏡（會聚）" }, { value: "convex", label: "凸面鏡（發散）" }], onChange: draw });
    const sF = PL.ui.slider(L.controls, { label: "焦距 |f|", min: 40, max: 150, step: 5, value: 90, unit: "px", digits: 0, onInput: draw });
    const sP = PL.ui.slider(L.controls, { label: "物距 p", min: 40, max: 300, step: 5, value: 180, unit: "px", digits: 0, onInput: draw });
    const rQ = PL.ui.readout(L.readouts, { label: "像距 q", unit: "px" });
    const rType = PL.ui.readout(L.readouts, { label: "成像" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const concave = sType.get() === "concave", f = sF.get() * (concave ? 1 : -1);
      const xm = W * 0.72, cy = H / 2, p = sP.get(), ho = -46;
      D.line(ctx, 20, cy, xm, cy, PL.col("text-faint"), 1.5);
      // 面鏡弧
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2.6; ctx.beginPath();
      const R = Math.abs(f) * 2, sgn = concave ? -1 : 1;
      for (let a = -60; a <= 60; a += 3) { const yy = cy + a; const xx = xm + sgn * (R - Math.sqrt(Math.max(0, R * R - a * a))); a === -60 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); } ctx.stroke(); ctx.restore();
      const F = { x: xm - f, y: cy };
      D.disc(ctx, F.x, cy, 3, { fill: PL.col("text-dim") }); D.text(ctx, "F", F.x, cy + 16, { color: PL.col("text-faint"), size: 10, align: "center" });
      const xo = xm - p, top = { x: xo, y: cy + ho }, A = { x: xm, y: cy + ho }, V = { x: xm, y: cy };
      // ray1: 平行入射 → 反射過 F（凹）或看似來自 F（凸）
      const d1 = concave ? { x: F.x - A.x, y: F.y - A.y } : { x: A.x - F.x, y: A.y - F.y };
      // ray2: 射向頂點 → 對主軸反射
      const din = { x: V.x - top.x, y: V.y - top.y }; const d2 = { x: -din.x, y: din.y };
      const img = intersect(A, d1, V, d2);
      D.line(ctx, xo, cy + ho, A.x, A.y, "#ffe08a", 1.6);
      D.line(ctx, xo, cy + ho, V.x, V.y, "#ffe08a", 1.6);
      const far = 900, n1 = Math.hypot(d1.x, d1.y), n2 = Math.hypot(d2.x, d2.y);
      D.line(ctx, A.x, A.y, A.x + d1.x / n1 * far, A.y + d1.y / n1 * far, "#ffe08a", 1.6);
      D.line(ctx, V.x, V.y, V.x + d2.x / n2 * far, V.y + d2.y / n2 * far, "#ffe08a", 1.6);
      D.arrow(ctx, xo, cy, xo, cy + ho, { color: PL.col("accent-2"), width: 2.4, label: "物" });
      if (img) { const virtual = img.x > xm; D.arrow(ctx, img.x, cy, img.x, img.y, { color: MC(), width: 2.4, label: virtual ? "虛像" : "實像", dash: virtual ? [4, 3] : null }); rQ.set(xm - img.x, 0); rType.set(virtual ? "正立虛像" : "倒立實像"); }
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 凸透鏡位移法：固定物屏距，找出兩個清晰成像位置 */
  PL.register("lens-displacement", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    let recorded = [], feedback = "將透鏡移到光屏成像最清晰的位置，再記錄位置。";
    PL.ui.section(L.controls, "物屏與透鏡");
    const sD = PL.ui.slider(L.controls, { label: "物體到光屏距離 D", min: 160, max: 320, step: 10, value: 240, unit: "cm", digits: 0, onInput: () => { recorded = []; feedback = "物屏距已改變，請重新尋找兩個清晰像。"; draw(); } });
    const sF = PL.ui.slider(L.controls, { label: "實際焦距 f", min: 20, max: 55, step: 1, value: 40, unit: "cm", digits: 0, onInput: () => { recorded = []; feedback = "透鏡已更換，請重新量測。"; draw(); } });
    const sX = PL.ui.slider(L.controls, { label: "透鏡位置 x/D", min: 0.05, max: 0.95, step: 0.005, value: 0.28, unit: "", digits: 3, onInput: draw });
    const posRow = PL.ui.buttonRow(L.controls);
    PL.ui.button(posRow, "定位近端像", () => setToSolution(0));
    PL.ui.button(posRow, "定位遠端像", () => setToSolution(1));
    const actionRow = PL.ui.buttonRow(L.controls);
    PL.ui.button(actionRow, "記錄清晰像位置", () => {
      const s = state();
      if (!s.valid) { feedback = "此物屏距未滿足 D > 4f，無法取得兩個清晰像。"; draw(); return; }
      if (s.blur > 0.05) { feedback = "目前光屏上的像仍不夠清晰，請繼續調整透鏡位置。"; draw(); return; }
      if (recorded.some(v => Math.abs(v - s.x) < 0.5)) { feedback = "這個位置已記錄。請移到另一個清晰像位置。"; draw(); return; }
      recorded.push(s.x); recorded.sort((a, b) => a - b);
      feedback = "已記錄 x=" + PL.fmt(s.x, 1) + " cm。";
      draw();
    }, { primary: true });
    PL.ui.button(actionRow, "清除紀錄", () => { recorded = []; feedback = "量測紀錄已清除。"; draw(); });
    const rX = PL.ui.readout(L.readouts, { label: "目前透鏡位置 x", unit: "cm" });
    const rFocus = PL.ui.readout(L.readouts, { label: "光屏成像", unit: "" });
    const rD = PL.ui.readout(L.readouts, { label: "兩位置距離 d", unit: "cm" });
    const rF = PL.ui.readout(L.readouts, { label: "位移法測得 f", unit: "cm" });
    const rN = PL.ui.readout(L.readouts, { label: "已記錄位置", unit: "個" });
    const note = PL.ui.note(L.controls, feedback);
    const chart = PL.ui.chart(PL.ui.charts(root), { title: "光屏清晰度與透鏡位置", cap: "當透鏡位於兩個共軛位置時，像剛好落在光屏上；兩個低谷的位置可用來量焦距。" });
    function state() {
      const Dcm = sD.get(), f = sF.get(), x = sX.get() * Dcm, valid = Dcm > 4 * f;
      const q = x > f ? f * x / (x - f) : -999;
      const blur = valid && q > 0 ? Math.abs(Dcm - x - q) / Dcm : 1;
      const gap = valid ? Math.sqrt(Dcm * Dcm - 4 * Dcm * f) : 0;
      return { Dcm, f, x, valid, q, blur, solutions: valid ? [(Dcm - gap) / 2, (Dcm + gap) / 2] : [] };
    }
    function setToSolution(n) {
      const s = state();
      if (!s.valid) { feedback = "請先將 D 調整為大於 4f。"; draw(); return; }
      sX.set(s.solutions[n] / s.Dcm); feedback = "已定位到" + (n === 0 ? "近端" : "遠端") + "清晰像，可記錄讀值。"; draw();
    }
    function draw() {
      const { ctx, W, H } = cv, s = state(); cv.clear(); D.bg(cv);
      const objectX = 58, screenX = W - 54, baseY = H - 38, cy = H * 0.5, span = screenX - objectX;
      const lensX = objectX + s.x / s.Dcm * span, focalPx = s.f / s.Dcm * span;
      D.line(ctx, objectX, baseY, screenX, baseY, PL.col("text-faint"), 2);
      for (let i = 0; i <= 6; i++) { const xx = objectX + span * i / 6; D.line(ctx, xx, baseY - 4, xx, baseY + 4, PL.col("text-faint"), 1); }
      D.arrow(ctx, objectX, cy + 48, objectX, cy - 35, { color: PL.col("warn"), width: 3, label: "物體" });
      D.line(ctx, screenX, 24, screenX, baseY, PL.col("accent-2"), 3); D.text(ctx, "光屏", screenX, 20, { color: PL.col("accent-2"), size: 11, align: "center" });
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(lensX, 38); ctx.quadraticCurveTo(lensX - 14, cy, lensX, H - 56); ctx.quadraticCurveTo(lensX + 14, cy, lensX, 38); ctx.stroke(); ctx.restore();
      [lensX - focalPx, lensX + focalPx].forEach(xx => { if (xx > objectX && xx < screenX) { D.line(ctx, xx, cy - 5, xx, cy + 5, MC(), 1); D.text(ctx, "F", xx, cy + 20, { color: MC(), size: 10, align: "center" }); } });
      if (s.valid && s.x > s.f) {
        const imageX = lensX + s.q / s.Dcm * span, imageH = -70 * s.q / s.x;
        const rayY = cy - 35;
        D.line(ctx, objectX, rayY, lensX, rayY, "rgba(255,224,138,0.75)", 1.8); D.line(ctx, lensX, rayY, imageX, cy, "rgba(255,224,138,0.75)", 1.8);
        D.line(ctx, objectX, rayY, lensX, cy, "rgba(255,255,255,0.35)", 1.4); D.line(ctx, lensX, cy, imageX, cy - imageH, "rgba(255,255,255,0.35)", 1.4);
        const clarity = PL.clamp(1 - s.blur * 18, 0, 1), displayH = imageH * clarity;
        D.arrow(ctx, screenX, cy, screenX, cy - displayH, { color: clarity > 0.85 ? MC() : PL.col("text-faint"), width: 2.5, label: clarity > 0.85 ? "清晰像" : "模糊像" });
        if (s.blur > 0.05) D.ring(ctx, screenX, cy - displayH, 7 + s.blur * 80, "rgba(240,98,146,0.45)", 1.5);
      }
      D.text(ctx, "D=" + s.Dcm + " cm", (objectX + screenX) / 2, baseY + 23, { color: PL.col("text-dim"), size: 11, align: "center" });
      rX.set(s.x, 1); rFocus.set(s.valid ? (s.blur <= 0.05 ? "清晰" : "尚未清晰") : "D ≤ 4f"); rN.set(recorded.length, 0); note.textContent = feedback;
      const separation = recorded.length === 2 ? Math.abs(recorded[1] - recorded[0]) : 0;
      const measured = recorded.length === 2 ? (s.Dcm * s.Dcm - separation * separation) / (4 * s.Dcm) : 0;
      rD.set(recorded.length === 2 ? separation : "待記錄", recorded.length === 2 ? 1 : undefined);
      rF.set(recorded.length === 2 ? measured : "待量測", recorded.length === 2 ? 1 : undefined);
      chart.clear();
      const g = PL.graph(chart, { x: 42, y: 16, w: chart.W - 58, h: chart.H - 40 }, { x0: 0, x1: s.Dcm, y0: 0, y1: 1 });
      g.frame({ xlabel: "透鏡位置 x (cm)", ylabel: "模糊程度" }); g.grid(6, 4);
      if (s.valid) g.fn(x => { const q = x > s.f ? s.f * x / (x - s.f) : -999; return q > 0 ? PL.clamp(Math.abs(s.Dcm - x - q) / s.Dcm, 0, 1) : 1; }, { color: MC(), width: 2.1 });
      recorded.forEach(x => g.dot(x, 0, { color: PL.col("accent-2"), glow: PL.col("accent-2") }));
      g.dot(s.x, PL.clamp(s.blur, 0, 1), { color: PL.col("warn"), glow: PL.col("warn") });
    }
    cv.onResize(draw); chart.onResize(draw); draw();
    return { stop() { cv.destroy(); chart.destroy(); }, rerender: draw };
  }});

  /* 雙縫干涉 — 光具座 · 單光子累積 */
  PL.register("double-slit", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.54, 900);
    // 控制項
    PL.ui.section(L.controls, "光源與幾何");
    const stLam = PL.ui.stepper(L.controls, { label: "波長 λ (nm)", value: 600, min: 400, max: 700, step: 10, onInput: reset });
    const stD = PL.ui.stepper(L.controls, { label: "縫間距 d (mm)", value: 0.2, min: 0.1, max: 0.6, step: 0.05, digits: 2, onInput: reset });
    const stL = PL.ui.stepper(L.controls, { label: "屏距 L (m)", value: 1, min: 0.5, max: 2.5, step: 0.1, digits: 1, onInput: reset });
    const stN = PL.ui.stepper(L.controls, { label: "測量跨度 ±N 條", value: 5, min: 2, max: 8, step: 1, onInput: reset });
    PL.ui.section(L.controls, "快捷波長 · nm");
    const preset = PL.ui.chipGroup(L.controls, { value: 0, options: [
      { value: 650, label: '<span class="dotc"></span>紅 650', color: "#ff5b5b" },
      { value: 532, label: '<span class="dotc"></span>綠 532', color: "#54d15a" },
      { value: 450, label: '<span class="dotc"></span>藍 450', color: "#5b8dff" }
    ], onChange: v => { stLam.set(v); reset(); } });
    PL.ui.section(L.controls, "顯示與播放");
    const layers = PL.ui.chipGroup(L.controls, { multi: true, value: ["wave", "order", "bracket"], options: [
      { value: "wave", label: "波前" }, { value: "path", label: "路程差 r₂−r₁" }, { value: "order", label: "條紋級次" }, { value: "bracket", label: "測量括號" }
    ] });
    const row = PL.ui.buttonRow(L.controls);
    const bP = PL.ui.button(row, "暫停", () => { anim.toggle(); bP.textContent = anim.running ? "暫停" : "播放"; }, { primary: true });
    let speed = 1; const bS = PL.ui.button(row, "速率×1", () => { speed = speed >= 4 ? 1 : speed * 2; bS.textContent = "速率×" + speed; });
    const row2 = PL.ui.buttonRow(L.controls);
    PL.ui.button(row2, "清屏", () => { hits = []; photons = []; count = 0; hist.fill(0); });
    PL.ui.button(row2, "重置", () => { stLam.set(600); stD.set(0.2); stL.set(1); stN.set(5); reset(); });
    // 讀數
    const rDx = PL.ui.readout(L.readouts, { label: "條紋間距 Δx=λL/d", unit: "mm" });
    const rLam = PL.ui.readout(L.readouts, { label: "波長 λ", unit: "nm" });
    const rFr = PL.ui.readout(L.readouts, { label: "屏內可見亮紋", unit: "條" });
    const rCnt = PL.ui.readout(L.readouts, { label: "已到達光子", unit: "個" });
    // 附屬圖表
    const charts = PL.el("div", "sim-charts", root);
    const w1 = PL.el("div", "sim-chart", charts); PL.el("div", "chart-title", w1).textContent = "光強分布 I(y)";
    const cvI = PL.canvas.create(w1, 0.6); PL.el("div", "cap", w1).textContent = "各級亮紋等間距、亮度相同：相鄰亮紋間距 Δx=λL/d，亮紋處 I=I₀、暗紋處為 0。";
    const w2 = PL.el("div", "sim-chart", charts); PL.el("div", "chart-title", w2).textContent = "單光子累積直方圖";
    const cvH = PL.canvas.create(w2, 0.6); PL.el("div", "cap", w2).textContent = "光子逐個隨機到達（落點機率 ∝ 光強），少量時看似雜亂，累積越多越逼近 cos² 條紋——波粒二象性。";

    const BINS = 141; let hist = new Array(BINS).fill(0), photons = [], hits = [], count = 0, phase = 0;
    const dxMM = () => stLam.get() * 1e-3 * stL.get() / stD.get();
    const Mrange = () => stN.get() + 2.4;
    const yMaxMM = () => Mrange() * dxMM();
    const Iy = yMM => Math.cos(Math.PI * yMM / dxMM()) ** 2;
    function reset() { hits = []; photons = []; count = 0; hist.fill(0); }
    function sampleY() { const ym = yMaxMM(); for (let i = 0; i < 48; i++) { const y = (Math.random() * 2 - 1) * ym; if (Math.random() < Iy(y)) return y; } return 0; }

    function scene() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const col = nmColor(stLam.get()), cy = H * 0.46, benchY = H - 20, laserX = 68, slitX = W * 0.4, scrX = W - 104, half = Math.min(H * 0.37, (H - 56) / 2);
      const yPx = yMM => cy + (yMM / yMaxMM()) * half, gap = 20, s1 = { x: slitX, y: cy - gap / 2 }, s2 = { x: slitX, y: cy + gap / 2 };
      const support = (x, top, wide) => {
        const footW = wide || 26;
        D.rect(ctx, x - footW / 2, benchY - 4, footW, 6, { fill: "#273242", stroke: "rgba(255,255,255,0.18)", width: 1, r: 2 });
        D.line(ctx, x, top + 8, x, benchY - 4, "#59667a", 3);
        D.rect(ctx, x - 7, top, 14, 9, { fill: "#303b4c", stroke: "rgba(255,255,255,0.18)", width: 1, r: 2 });
      };
      // 光學導軌與刻度
      D.rect(ctx, 24, benchY, W - 48, 7, { fill: "#263140", stroke: "rgba(255,255,255,0.18)", width: 1, r: 3 });
      D.line(ctx, 30, benchY + 3.5, W - 30, benchY + 3.5, "rgba(255,255,255,0.14)", 1);
      for (let x = 38; x < W - 34; x += 24) D.line(ctx, x, benchY + 1, x, benchY + (x % 72 === 38 ? 6 : 4), "rgba(255,255,255,0.16)", 1);
      D.text(ctx, "示意 · 非真實比例", 16, 20, { color: PL.col("text-faint"), size: 10.5 });
      D.text(ctx, `λ ${stLam.get()} nm   ·   d ${stD.get().toFixed(2)} mm   ·   L ${stL.get().toFixed(1)} m`, W - 16, 20, { color: PL.col("text-dim"), size: 10, align: "right" });
      // 光束錐
      ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(laserX + 14, cy); ctx.lineTo(slitX, cy - gap * 1.5); ctx.lineTo(slitX, cy + gap * 1.5); ctx.closePath(); ctx.fill(); ctx.restore();
      D.line(ctx, laserX + 12, cy, slitX - 3, cy, col, 1.15);
      // 波前
      if (layers.has("wave")) { ctx.save(); ctx.beginPath(); ctx.rect(slitX, 0, scrX - slitX, H); ctx.clip(); [s1, s2].forEach(s => { for (let n = 0; n < 26; n++) { const r = ((n * 22 + phase * 22) % ((scrX - slitX) + 22)); ctx.strokeStyle = col; ctx.globalAlpha = 0.16 * (1 - r / (scrX - slitX)); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(s.x, s.y, r, -1.2, 1.2); ctx.stroke(); } }); ctx.restore(); }
      // 雷射光源與固定座
      support(laserX - 4, cy + 13, 30);
      D.rect(ctx, laserX - 35, cy - 13, 46, 26, { fill: "#293545", stroke: "rgba(255,255,255,0.27)", width: 1, r: 4 });
      D.rect(ctx, laserX - 31, cy - 9, 10, 18, { fill: "#1a222e", stroke: "rgba(255,255,255,0.15)", width: 1, r: 2 });
      D.rect(ctx, laserX + 7, cy - 6, 11, 12, { fill: "#435165", stroke: "rgba(255,255,255,0.2)", width: 1, r: 2 });
      D.disc(ctx, laserX + 18, cy, 4.5, { fill: col, glow: col, glowSize: 15 });
      D.text(ctx, "LASER", laserX - 10, cy + 3, { color: PL.col("text-faint"), size: 7.5, align: "center" });
      // 雙縫屏障
      const barW = 12;
      support(slitX, cy + half + 14, 30);
      const seg = (y0, y1) => D.rect(ctx, slitX - barW / 2, y0, barW, y1 - y0, { fill: "#161d29", stroke: "rgba(255,255,255,0.18)", width: 1, r: 3 });
      seg(cy - half - 14, s1.y - 5); seg(s1.y + 5, s2.y - 5); seg(s2.y + 5, cy + half + 14);
      D.disc(ctx, s1.x, s1.y, 2.5, { fill: "#fff" }); D.disc(ctx, s2.x, s2.y, 2.5, { fill: "#fff" });
      D.text(ctx, "雙縫", slitX, cy - half - 23, { color: PL.col("text-dim"), size: 9, align: "center" });
      // 路程差
      if (layers.has("path")) { const fy = yPx(dxMM()); D.line(ctx, s1.x, s1.y, scrX, fy, "rgba(255,255,255,0.4)", 1, [4, 3]); D.line(ctx, s2.x, s2.y, scrX, fy, "rgba(255,255,255,0.4)", 1, [4, 3]); D.text(ctx, "r₂−r₁ = λ", (slitX + scrX) / 2 - 20, cy - 6, { color: PL.col("text-dim"), size: 11 }); }
      // 光屏上的理論條紋與單光子累積
      support(scrX + 10, cy + half + 14, 32);
      D.rect(ctx, scrX, cy - half - 14, 20, 2 * half + 28, { fill: "#0a0e15", stroke: "rgba(255,255,255,0.24)", width: 1.5, r: 3 });
      ctx.save(); ctx.beginPath(); ctx.rect(scrX + 4, cy - half - 10, 12, 2 * half + 20); ctx.clip();
      for (let y = cy - half - 10; y <= cy + half + 10; y += 1.5) {
        const intensity = Iy((y - cy) / half * yMaxMM());
        ctx.globalAlpha = 0.05 + intensity * 0.36; ctx.fillStyle = col; ctx.fillRect(scrX + 4, y, 12, 1.5);
      }
      ctx.restore(); ctx.globalAlpha = 1;
      D.text(ctx, "探測屏", scrX + 10, cy - half - 24, { color: PL.col("text-dim"), size: 9, align: "center" });
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      hits.forEach(h => { ctx.fillStyle = col; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(scrX + 4 + (h.x % 12), yPx(h.y), 1.8, 0, PL.TAU); ctx.fill(); });
      ctx.restore(); ctx.globalAlpha = 1;
      // 括號
      if (layers.has("bracket")) { const N = stN.get(), y0 = yPx(N * dxMM()), y1 = yPx(-N * dxMM()), bxx = scrX - 14; ctx.strokeStyle = "#f0a24a"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bxx + 6, y0); ctx.lineTo(bxx, y0); ctx.lineTo(bxx, y1); ctx.lineTo(bxx + 6, y1); ctx.stroke(); D.text(ctx, (2 * N) + " Δx", bxx - 4, cy + 4, { color: "#f0a24a", size: 10, align: "right" }); }
      // 級次刻度
      if (layers.has("order")) { const Mi = Math.floor(Mrange()); for (let m = -Mi; m <= Mi; m++) { const y = yPx(m * dxMM()); if (y > 8 && y < H - 8) { D.line(ctx, scrX + 20, y, scrX + 26, y, PL.col("text-faint"), 1); D.text(ctx, m === 0 ? "m=0" : (m > 0 ? "+" + m : "" + m), scrX + 30, y + 3, { color: m === 0 ? col : PL.col("text-faint"), size: m === 0 ? 10 : 9 }); } } }
      // 飛行光子
      photons.forEach(p => { const x = p.x0 + (scrX - p.x0) * p.t, y = p.y0 + (yPx(p.ty) - p.y0) * p.t; D.disc(ctx, x, y, 3, { fill: col, glow: col, glowSize: 8 }); });
      // 讀數
      const Mi = Math.floor(Mrange());
      rDx.set(dxMM(), 2); rLam.set(stLam.get(), 0); rFr.set(2 * Mi + 1, 0); rCnt.set(count, 0);
    }

    function chartI() {
      const { W, H } = cvI; cvI.clear();
      const M = Mrange(), g = PL.graph(cvI, { x: 30, y: 14, w: W - 42, h: H - 34 }, { x0: -M, x1: M, y0: 0, y1: 1.06 });
      g.frame({ xlabel: "y / Δx" }); g.grid(Math.min(12, 2 * Math.round(M)), 4);
      const col = nmColor(stLam.get()), pts = []; for (let i = 0; i <= 240; i++) { const x = -M + 2 * M * i / 240; pts.push([x, Math.cos(Math.PI * x) ** 2]); }
      g.area(pts, { fill: col.replace("rgb", "rgba").replace(")", ",0.18)") }); g.curve(pts, { color: col, width: 2 });
      D.text(cvI.ctx, "I / I₀", W - 16, 20, { color: col, size: 10, align: "right" });
    }
    function chartH() {
      const { W, H } = cvH; cvH.clear();
      const M = Mrange(), mx = Math.max(4, ...hist), g = PL.graph(cvH, { x: 30, y: 14, w: W - 42, h: H - 34 }, { x0: -M, x1: M, y0: 0, y1: mx * 1.15 });
      g.frame({ xlabel: "y / Δx" }); g.grid(Math.min(12, 2 * Math.round(M)), 4);
      const col = nmColor(stLam.get()), ym = yMaxMM(), dx = dxMM(), bw = (g.box.w / BINS) * 0.9;
      for (let i = 0; i < BINS; i++) { if (!hist[i]) continue; const yc = -ym + (i + 0.5) * (2 * ym / BINS), xu = yc / dx; const px = g.X(xu), py0 = g.Y(0), py1 = g.Y(hist[i]); cvH.ctx.fillStyle = col; cvH.ctx.globalAlpha = 0.8; cvH.ctx.fillRect(px - bw / 2, py1, bw, py0 - py1); }
      cvH.ctx.globalAlpha = 1;
      g.fn(x => Math.cos(Math.PI * x) ** 2 * mx, { color: "rgba(255,255,255,0.55)", width: 1.5, dash: [4, 3], samples: 200 });
      D.text(cvH.ctx, "計數", 30, 12, { color: PL.col("text-faint"), size: 10 });
    }
    function drawAll() { scene(); chartI(); chartH(); }
    cv.onResize(drawAll); cvI.onResize(drawAll); cvH.onResize(drawAll);

    const anim = PL.loop(dt => {
      if (dt) {
        phase = (phase + dt * 0.6) % 1;
        const nSpawn = Math.min(6, Math.round(speed * 1.6 + 0.3));
        for (let i = 0; i < nSpawn; i++) if (photons.length < 60) { const s = Math.random() < 0.5 ? -1 : 1, cy = cv.H * 0.44; photons.push({ x0: cv.W * 0.4, y0: cy + s * 10, ty: sampleY(), t: 0 }); }
        photons.forEach(p => p.t += dt * 3 * speed);
        photons.filter(p => p.t >= 1).forEach(p => { hits.push({ x: (count * 7) % 12, y: p.ty }); if (hits.length > 2000) hits.shift(); count++; const bi = Math.floor((p.ty + yMaxMM()) / (2 * yMaxMM()) * BINS); if (bi >= 0 && bi < BINS) hist[bi]++; });
        photons = photons.filter(p => p.t < 1);
      }
      drawAll();
    });
    anim.start();
    return { stop() { anim.stop(); cv.destroy(); cvI.destroy(); cvH.destroy(); }, rerender: drawAll };
  }});

  /* 單狹縫繞射 */
  PL.register("diffraction", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const sA = PL.ui.slider(L.controls, { label: "狹縫寬 a", min: 20, max: 120, step: 5, value: 60, unit: "", digits: 0, onInput: draw });
    const sLam = PL.ui.slider(L.controls, { label: "波長 λ", min: 400, max: 700, step: 10, value: 550, unit: "nm", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "狹縫越窄，中央亮紋越寬——繞射越明顯。");
    const rW = PL.ui.readout(L.readouts, { label: "中央亮紋半寬（相對）", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const a = sA.get(), lam = sLam.get() / 40, col = nmColor(sLam.get());
      const sinc = b => Math.abs(b) < 1e-4 ? 1 : (Math.sin(b) / b) ** 2;
      const scr = W - 60, scale = 90;                 // u = (螢幕位置)/scale
      const beta = u => Math.PI * a * u / lam;          // 相位參數
      // 屏上亮度帶
      for (let y = 10; y < H - 10; y += 2) { const I = sinc(beta((y - H / 2) / scale)); ctx.globalAlpha = I; ctx.fillStyle = col; ctx.fillRect(scr, y, 26, 2); }
      ctx.globalAlpha = 1;
      // 強度曲線
      const bx = 44, by = 26, bw = scr - bx - 16, bh = H - 52, um = (H / 2 - 10) / scale;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: -um, x1: um, y0: 0, y1: 1.05 });
      g.frame({ title: "繞射強度分佈 I ∝ sinc²", xlabel: "螢幕位置" }); g.grid(6, 4);
      g.fn(u => sinc(beta(u)), { color: col, width: 2.2, samples: 240 });
      g.vline(lam / a, { color: "rgba(255,255,255,0.25)", dash: [3, 3], width: 1 });
      g.vline(-lam / a, { color: "rgba(255,255,255,0.25)", dash: [3, 3], width: 1 });
      D.line(ctx, scr, 10, scr, H - 10, PL.col("text-faint"), 2);
      rW.set(lam / a, 2);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 偏振 */
  PL.register("polarization", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    const sTh = PL.ui.slider(L.controls, { label: "兩偏振片夾角 θ", min: 0, max: 180, step: 1, value: 45, unit: "°", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "馬呂士定律：通過第二片後強度 I = I₀cos²θ；兩片垂直（90°）時全暗。");
    const rI = PL.ui.readout(L.readouts, { label: "穿透強度 I/I₀", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const th = sTh.get() * Math.PI / 180, cy = H / 2, I = Math.cos(th) ** 2;
      const p1x = W * 0.34, p2x = W * 0.62, r = 40;
      // 光束（亮度分段）
      const beam = (x0, x1, alpha, col) => { ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke(); ctx.restore(); };
      beam(20, p1x, 0.5, "#ffe08a"); beam(p1x, p2x, 0.5, MC()); beam(p2x, W - 20, Math.max(0.04, I * 0.9), MC());
      const disc = (x, ang, lab) => { D.ring(ctx, x, cy, r, "#fff", 2); for (let o = -r + 6; o <= r - 6; o += 8) { const px = x + o; D.line(ctx, px, cy - Math.sqrt(Math.max(0, r * r - o * o)) + 3, px, cy + Math.sqrt(Math.max(0, r * r - o * o)) - 3, "rgba(255,255,255,0.35)", 1); } D.arrow(ctx, x, cy, x + r * Math.sin(ang), cy - r * Math.cos(ang), { color: PL.col("accent-2"), width: 2 }); D.text(ctx, lab, x, cy + r + 16, { color: PL.col("text-dim"), size: 11, align: "center" }); };
      disc(p1x, 0, "偏振片1"); disc(p2x, th, "偏振片2（θ=" + sTh.get() + "°）");
      rI.set(I, 3);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 色散與稜鏡 */
  PL.register("dispersion", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const sTh = PL.ui.slider(L.controls, { label: "入射角", min: 20, max: 70, step: 1, value: 45, unit: "°", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "折射率隨波長不同：紫光偏折最多、紅光最少，白光因此散成光譜。");
    const rSpread = PL.ui.readout(L.readouts, { label: "色散角（紫−紅）", unit: "°" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H / 2, s = 70;
      // 稜鏡三角形
      const A = { x: cx, y: cy - s }, B = { x: cx - s * 0.9, y: cy + s * 0.6 }, C = { x: cx + s * 0.9, y: cy + s * 0.6 };
      ctx.save(); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(C.x, C.y); ctx.closePath();
      ctx.fillStyle = PL.theme.pale(0.06); ctx.fill(); ctx.strokeStyle = PL.col("text-faint"); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      // 入射白光打在左面中點
      const P = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      const th = sTh.get() * Math.PI / 180;
      D.arrow(ctx, P.x - 120 * Math.cos(th), P.y - 120 * Math.sin(th) + 40, P.x, P.y, { color: "#fff", width: 2.4, label: "白光" });
      // 出射彩色扇形（近似）
      const cols = [[400, "#8a2be2"], [450, "#4b6bff"], [500, "#33cc66"], [560, "#e8e83a"], [610, "#ff9a3a"], [660, "#ff3a3a"]];
      const exit = { x: (A.x + C.x) / 2, y: (A.y + C.y) / 2 };
      cols.forEach((c, i) => { const ang = 0.18 + i * 0.05; D.line(ctx, P.x, P.y, exit.x, exit.y, "rgba(255,255,255,0.15)", 1); D.arrow(ctx, exit.x, exit.y, exit.x + 150 * Math.cos(ang), exit.y + 150 * Math.sin(ang), { color: nmColor(c[0]), width: 2.4 }); });
      rSpread.set(( (0.18 + 5 * 0.05) - 0.18) * 180 / Math.PI, 1);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 繞射光柵 */
  PL.register("grating", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const sN = PL.ui.slider(L.controls, { label: "光柵刻線", min: 100, max: 600, step: 20, value: 300, unit: "線/mm", digits: 0, onInput: draw });
    const sLam = PL.ui.slider(L.controls, { label: "波長 λ", min: 400, max: 700, step: 10, value: 550, unit: "nm", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "d sinθ = mλ。刻線越密、波長越長，各級譜線分得越開。");
    const rD = PL.ui.readout(L.readouts, { label: "縫距 d", unit: "nm" });
    const rTh = PL.ui.readout(L.readouts, { label: "第一級角度", unit: "°" });
    const rOrders = PL.ui.readout(L.readouts, { label: "可見級數" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const lines = sN.get(), d = 1e6 / lines, lam = sLam.get(), col = nmColor(lam);
      const gx = 74, cy = H / 2, scr = W - 46;
      for (let y = cy - 42; y <= cy + 42; y += 4) D.line(ctx, gx, y, gx, y + 2, MC(), 2);
      D.text(ctx, "光柵", gx, cy - 52, { color: MC(), size: 11, align: "center" });
      D.line(ctx, scr, 18, scr, H - 18, PL.col("text-faint"), 2);
      for (let mm = -5; mm <= 5; mm++) { const s = mm * lam / d; if (Math.abs(s) <= 1) { const th = Math.asin(s), yy = cy + Math.tan(th) * (scr - gx); if (yy > 14 && yy < H - 14) { D.line(ctx, gx, cy, scr, yy, "rgba(255,255,255,0.1)", 1); D.disc(ctx, scr + 6, yy, mm === 0 ? 6 : 5, { fill: col, glow: col, glowSize: 8 }); D.text(ctx, "m=" + mm, scr - 8, yy + 3, { color: PL.col("text-faint"), size: 9, align: "right" }); } } }
      D.arrow(ctx, 22, cy, gx - 4, cy, { color: "#fff", width: 2 });
      const th1 = Math.asin(PL.clamp(lam / d, -1, 1)) * 180 / Math.PI;
      rD.set(d, 0); rTh.set(th1, 1); rOrders.set("±" + Math.floor(d / lam));
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});
})();
