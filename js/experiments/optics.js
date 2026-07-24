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

  /* 雙縫干涉 */
  PL.register("double-slit", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    const sD = PL.ui.slider(L.controls, { label: "縫距 d", min: 20, max: 70, step: 2, value: 40, unit: "", digits: 0, onInput: draw });
    const sLam = PL.ui.slider(L.controls, { label: "波長 λ", min: 400, max: 700, step: 10, value: 550, unit: "nm", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "縫距越小、波長越長，條紋間距越大。");
    const rDy = PL.ui.readout(L.readouts, { label: "條紋間距（相對）", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const lam = sLam.get() / 30, d = sD.get(), col = nmColor(sLam.get());
      const sx = 70, cy = H / 2, s1 = { x: sx, y: cy - d / 2 }, s2 = { x: sx, y: cy + d / 2 };
      const k = 2 * Math.PI / lam, step = 5;
      for (let x = sx; x < W - 60; x += step) for (let y = 6; y < H - 6; y += step) {
        const r1 = Math.hypot(x - s1.x, y - s1.y), r2 = Math.hypot(x - s2.x, y - s2.y);
        const I = Math.cos(k * (r1 - r2) / 2) ** 2;
        ctx.globalAlpha = I * 0.8; ctx.fillStyle = col; ctx.fillRect(x, y, step, step);
      }
      ctx.globalAlpha = 1;
      // 屏幕
      const scr = W - 54;
      D.line(ctx, scr, 10, scr, H - 10, PL.col("text-faint"), 2);
      for (let y = 10; y < H - 10; y += 2) { const r1 = Math.hypot(scr - s1.x, y - s1.y), r2 = Math.hypot(scr - s2.x, y - s2.y); const I = Math.cos(k * (r1 - r2) / 2) ** 2; ctx.globalAlpha = I; ctx.fillStyle = col; ctx.fillRect(scr + 4, y, 22, 2); }
      ctx.globalAlpha = 1;
      // 縫
      D.rect(ctx, sx - 3, 10, 6, H - 20, { fill: "rgba(0,0,0,0.5)" });
      D.disc(ctx, s1.x, s1.y, 3, { fill: "#fff" }); D.disc(ctx, s2.x, s2.y, 3, { fill: "#fff" });
      rDy.set(lam * (W - 120) / d / 10, 1);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
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
      ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fill(); ctx.strokeStyle = PL.col("text-faint"); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
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
