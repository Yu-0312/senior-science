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
  /* 雙狹縫干涉 —— 旗艦改版
   *
   * 這個實驗的重點不是把條紋畫得漂亮，而是三件課本只寫一句話的事：
   *
   *   1. 一次只發射一顆光子，前幾顆看起來完全隨機，
   *      累積到幾百顆之後條紋卻自己浮現——單一光子也會干涉。
   *   2. 兩條單縫圖樣相加，不等於雙縫圖樣。差別就是干涉。
   *   3. 只要在縫上裝偵測器去看光子走哪一條，條紋立刻消失。
   *
   * 依 PhET《Look and Feel》：學生會刻意測試極端狀況，
   * 因此「把光子速率降到 1」與「打開偵測器」都必須有立即、明確的反應。
   */
  PL.register("double-slit", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56, 880);

    let hits = [];            // 螢幕上累積的光子落點（單位：mm，以中心為 0）
    let flying = [];          // 飛行中的光子，用來呈現「一顆一顆」
    let emitTimer = 0;
    let paused = false;

    PL.ui.section(L.controls, "光源與幾何");
    const sLam = PL.ui.slider(L.controls, { label: "波長 λ", min: 400, max: 700, step: 10, value: 550, unit: "nm", digits: 0, onInput: clear });
    const sD = PL.ui.slider(L.controls, { label: "縫間距 d", min: 0.10, max: 0.60, step: 0.02, value: 0.24, unit: "mm", digits: 2, onInput: clear });
    const sW = PL.ui.slider(L.controls, { label: "單縫寬 a", min: 0.02, max: 0.14, step: 0.01, value: 0.06, unit: "mm", digits: 2, onInput: clear });
    const sL = PL.ui.slider(L.controls, { label: "屏距 L", min: 0.5, max: 3.0, step: 0.1, value: 1.5, unit: "m", digits: 1, onInput: clear });

    PL.ui.section(L.controls, "狹縫");
    let mode = "double";
    PL.ui.chipGroup(L.controls, {
      value: "double",
      options: [
        { value: "double", label: "雙縫" },
        { value: "single", label: "單縫" },
        { value: "sum", label: "兩單縫相加" }
      ],
      onChange: v => { mode = v; clear(); }
    });

    PL.ui.section(L.controls, "發射方式");
    const sRate = PL.ui.slider(L.controls, { label: "每秒光子數", min: 1, max: 400, step: 1, value: 1, unit: "顆/s", digits: 0 });
    const cDetect = PL.ui.checkbox(L.controls, { label: "在縫上裝偵測器（測量走哪條縫）", checked: false, onChange: clear });

    const row = PL.ui.buttonRow(L.controls);
    const bPause = PL.ui.button(row, "暫停發射", () => { paused = !paused; bPause.textContent = paused ? "繼續發射" : "暫停發射"; }, { primary: true });
    PL.ui.button(row, "清除螢幕", clear);
    PL.ui.button(row, "一次打 500 顆", () => { for (let i = 0; i < 500; i += 1) land(); });

    PL.ui.note(L.controls,
      "把「每秒光子數」設成 1，耐心看前 20 顆——完全看不出規律。" +
      "接著按「一次打 500 顆」，條紋會自己長出來：干涉不是光子之間互相作用，單一光子就會。" +
      "然後打開偵測器，條紋立刻消失；關掉又回來。最後比較「雙縫」與「兩單縫相加」，差的就是干涉項。");

    const rDx = PL.ui.readout(L.readouts, { label: "條紋間距 Δx", unit: "mm" });
    const rCount = PL.ui.readout(L.readouts, { label: "累積光子", unit: "顆" });
    const rVis = PL.ui.readout(L.readouts, { label: "條紋對比度", unit: "" });
    const rMode = PL.ui.readout(L.readouts, { label: "干涉狀態" });

    const cc = PL.ui.chart(PL.ui.charts(root), {
      title: "螢幕上的光強分布",
      cap: "曲線是理論強度，長條是實際累積到的光子數。光子越多，長條越貼近曲線——機率分布是這樣被「打」出來的。"
    });

    function clear() { hits = []; flying = []; }

    /* 螢幕的半寬（mm）：讓主要條紋大致填滿畫面 */
    function halfWidth() {
      const dx = fringeSpacing();
      return Math.max(6, dx * 6);
    }
    function fringeSpacing() {
      // Δx = λL/d，λ 由 nm 轉 m、d 由 mm 轉 m，結果再轉回 mm
      return (sLam.get() * 1e-9) * sL.get() / (sD.get() * 1e-3) * 1000;
    }

    /*
     * 螢幕位置 y（mm）處的相對強度
     *   單縫繞射包絡： sinc²(πa sinθ/λ)
     *   雙縫干涉條紋： cos²(πd sinθ/λ)
     * 裝了偵測器（知道走哪條縫）時，干涉項消失，只剩兩個單縫圖樣相加。
     */
    function intensity(yMm) {
      const lam = sLam.get() * 1e-9;
      const d = sD.get() * 1e-3;
      const a = sW.get() * 1e-3;
      const Lm = sL.get();
      const sinT = (yMm * 1e-3) / Math.sqrt(Lm * Lm + Math.pow(yMm * 1e-3, 2));

      const beta = Math.PI * a * sinT / lam;
      const env = beta === 0 ? 1 : Math.pow(Math.sin(beta) / beta, 2);

      if (mode === "single") return env;
      if (mode === "sum" || cDetect.get()) {
        // 沒有干涉：兩條縫各自的繞射圖樣直接相加（強度相加，不是振幅相加）
        return 2 * env;
      }
      const alpha = Math.PI * d * sinT / lam;
      return env * 4 * Math.pow(Math.cos(alpha), 2);
    }

    /* 以拒絕採樣從強度分布抽出一顆光子的落點 */
    function sampleY() {
      const half = halfWidth();
      const peak = mode === "single" ? 1 : 4;
      for (let i = 0; i < 200; i += 1) {
        const y = (Math.random() * 2 - 1) * half;
        if (Math.random() * peak <= intensity(y)) return y;
      }
      return (Math.random() * 2 - 1) * half * 0.2;
    }

    function land() {
      hits.push(sampleY());
      if (hits.length > 20000) hits.shift();
    }

    /*
     * 條紋對比度 (Imax − Imin)/(Imax + Imin)
     *
     * 取樣範圍必須只涵蓋「一個條紋間距」的一半，不能掃過整個螢幕。
     * 因為單縫繞射的包絡本身就會由中央往外遞減，掃太寬的話，
     * 即使完全沒有干涉也會量到 0.46 的假對比度——那是包絡的起伏，
     * 不是條紋。限制在 ±Δx/2 之內，包絡幾乎是平的，量到的才是干涉條紋本身。
     */
    function visibility() {
      const window = fringeSpacing() / 2;
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= 200; i += 1) {
        const y = -window + (2 * window) * i / 200;
        const v = intensity(y);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      return hi + lo > 0 ? (hi - lo) / (hi + lo) : 0;
    }

    function scene() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const m = MC();
      const laserX = 46, slitX = W * 0.42, screenX = W - 74;
      const cy = H / 2;
      const half = halfWidth();
      const mmToPx = (H - 70) / (2 * half);
      const py = yMm => cy - yMm * mmToPx;

      // 光具座
      D.rect(ctx, 24, H - 30, W - 48, 5, { fill: PL.theme.pale(0.14), r: 2 });

      // 雷射
      const lamColor = wavelengthColor(sLam.get());
      D.rect(ctx, laserX - 24, cy - 13, 44, 26, { fill: PL.theme.shade(0.35), stroke: PL.theme.pale(0.3), r: 4 });
      D.disc(ctx, laserX + 22, cy, 5, { fill: lamColor, glow: lamColor, glowSize: 12 });
      D.text(ctx, sLam.get() + " nm", laserX - 2, cy + 30, { color: lamColor, size: 11, align: "center", weight: "700" });

      // 光束（速率高時像連續光束，速率低時只剩一顆一顆）
      const beamAlpha = Math.min(0.5, sRate.get() / 400 * 0.5);
      if (beamAlpha > 0.02) {
        ctx.save(); ctx.globalAlpha = beamAlpha;
        D.line(ctx, laserX + 26, cy, slitX - 6, cy, lamColor, 3);
        ctx.restore();
      }

      // 狹縫板
      const slitHalf = (sD.get() / 2) * mmToPx * 6;   // 視覺放大，否則看不見
      D.rect(ctx, slitX - 5, 24, 10, H - 78, { fill: PL.theme.pale(0.3) });
      const openings = mode === "single" ? [0] : [-slitHalf, slitHalf];
      openings.forEach(off => {
        D.rect(ctx, slitX - 5, cy + off - 5, 10, 10, { fill: PL.theme.shade(0.85) });
      });
      D.text(ctx, mode === "single" ? "單縫" : "雙縫 d=" + sD.get().toFixed(2) + "mm",
        slitX, H - 40, { color: PL.col("text-dim"), size: 11, align: "center" });

      // 偵測器：裝上去就看得到，關聯「知道路徑」與「條紋消失」
      if (cDetect.get() && mode !== "single") {
        openings.forEach(off => {
          D.disc(ctx, slitX - 18, cy + off, 6, { fill: PL.col("danger") });
        });
        D.text(ctx, "偵測器啟用", slitX - 26, cy - slitHalf - 18,
          { color: PL.col("danger"), size: 10.5, align: "right", weight: "700" });
      }

      // 飛行中的光子
      flying.forEach(p => {
        const x = laserX + 26 + p.progress * (screenX - laserX - 26);
        let y = cy;
        if (x > slitX) {
          const f = (x - slitX) / (screenX - slitX);
          y = cy + (py(p.y) - cy) * f;
        }
        D.disc(ctx, x, y, 2.6, { fill: lamColor, glow: lamColor, glowSize: 8 });
      });

      // 螢幕與累積的光點
      D.rect(ctx, screenX, 24, 10, H - 78, { fill: PL.theme.pale(0.10), stroke: PL.theme.pale(0.25) });
      hits.forEach(y => {
        const Y = py(y);
        if (Y < 24 || Y > H - 54) return;
        ctx.save();
        ctx.globalAlpha = 0.55;
        D.disc(ctx, screenX + 5 + (Math.random() - 0.5) * 4, Y, 1.5, { fill: lamColor });
        ctx.restore();
      });

      // 條紋位置標記
      const dx = fringeSpacing();
      if (mode === "double" && !cDetect.get()) {
        for (let n = -4; n <= 4; n += 1) {
          const Y = py(n * dx);
          if (Y < 30 || Y > H - 56) continue;
          D.line(ctx, screenX + 14, Y, screenX + 22, Y, m, 1.4);
        }
        D.text(ctx, "Δx=" + dx.toFixed(2) + "mm", screenX + 24, py(0) - 6,
          { color: m, size: 10 });
      }

      const vis = visibility();
      PL.ui.caption(cv, cDetect.get() && mode === "double"
        ? "偵測器開啟：一旦知道光子走哪一條縫，干涉項消失，螢幕上只剩兩個單縫圖樣相加。"
        : mode === "sum"
          ? "這是兩條單縫各自圖樣的「相加」——沒有干涉。把它和雙縫比較，差的那一項就是干涉。"
          : mode === "single"
            ? "單縫只有繞射包絡，沒有細條紋。"
            : "每一顆光子落在哪裡是隨機的，但累積起來就是干涉圖樣。");

      rDx.set(dx, 3);
      rCount.set(hits.length, 0);
      rVis.set(vis, 2);
      rMode.set(mode === "double" && !cDetect.get() ? "有干涉" : "無干涉");
    }

    /* 可見光波長轉近似顏色，讓「換波長」在畫面上看得出來 */
    function wavelengthColor(nm) {
      let r = 0, g = 0, b = 0;
      if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
      else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
      else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
      else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
      else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
      else { r = 1; }
      const f = nm > 700 ? 0.4 : nm < 420 ? 0.4 : 1;
      return "rgb(" + Math.round(255 * r * f) + "," + Math.round(255 * g * f) + "," + Math.round(255 * b * f) + ")";
    }

    function chart() {
      cc.clear();
      const half = halfWidth();
      const peak = mode === "single" ? 1 : 4;
      const gph = PL.graph(cc, { x: 44, y: 14, w: cc.W - 58, h: cc.H - 36 },
        { x0: -half, x1: half, y0: 0, y1: 1.15 });
      gph.frame({ xlabel: "螢幕位置 (mm)", ylabel: "相對強度" });
      gph.grid(6, 4);

      // 實際落點的直方圖：光子越多越貼近理論曲線
      const bins = 60;
      const counts = new Array(bins).fill(0);
      hits.forEach(y => {
        const i = Math.floor((y + half) / (2 * half) * bins);
        if (i >= 0 && i < bins) counts[i] += 1;
      });
      const maxCount = Math.max(1, ...counts);
      counts.forEach((n, i) => {
        if (!n) return;
        const y0 = -half + (2 * half) * i / bins;
        const y1 = -half + (2 * half) * (i + 1) / bins;
        const h = n / maxCount;
        const x0 = gph.X(y0), x1 = gph.X(y1);
        D.rect(cc.ctx, x0, gph.Y(h), Math.max(1, x1 - x0 - 1), gph.Y(0) - gph.Y(h),
          { fill: "rgba(140,190,230,0.35)" });
      });

      gph.fn(y => intensity(y) / peak, { color: MC(), width: 2.2, samples: 320 });
    }

    function drawAll() { scene(); chart(); }

    const anim = PL.loop(dt => {
      if (dt && !paused) {
        // 依速率發射光子；速率低時真的就是一顆一顆
        emitTimer += dt * sRate.get();
        while (emitTimer >= 1) {
          emitTimer -= 1;
          flying.push({ progress: 0, y: sampleY() });
        }
        flying.forEach(p => { p.progress += dt * 1.4; });
        // 抵達螢幕就變成一個永久的光點
        const arrived = flying.filter(p => p.progress >= 1);
        arrived.forEach(p => hits.push(p.y));
        if (hits.length > 20000) hits.splice(0, hits.length - 20000);
        flying = flying.filter(p => p.progress < 1);
      }
      drawAll();
    }, 45);

    cv.onResize(scene); cc.onResize(chart);
    drawAll(); anim.start();
    return {
      stop() { anim.stop(); cv.destroy(); cc.destroy(); },
      rerender: drawAll
    };
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
