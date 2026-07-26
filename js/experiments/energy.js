/* 模組四 · 功與能量 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw;
  const MC = () => PL.col("m-color", "#81c784");
  const KEc = "#5aa2ff", PEc = "#81c784", THc = "#ff6b6b";

  function energyBars(cv, x, y, w, parts, total) {
    const ctx = cv.ctx; let yy = y;
    parts.forEach(p => {
      D.text(ctx, p.label, x, yy + 10, { color: PL.col("text-dim"), size: 11 });
      D.rect(ctx, x + 52, yy, w - 52, 13, { fill: "rgba(255,255,255,0.05)", r: 4 });
      D.rect(ctx, x + 52, yy, (w - 52) * PL.clamp(p.v / total, 0, 1), 13, { fill: p.c, r: 4 });
      D.text(ctx, PL.fmt(p.v, 1) + " J", x + w + 6, yy + 10, { color: p.c, size: 10 });
      yy += 20;
    });
  }

  /* 功與功率 */
  PL.register("work-power", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.52);
    let x = 0, W_ = 0;
    const reset = () => { x = 0; W_ = 0; };
    const sF = PL.ui.slider(L.controls, { label: "施力 F", min: 2, max: 20, step: 1, value: 10, unit: "N", digits: 0, onInput: reset });
    const sTh = PL.ui.slider(L.controls, { label: "施力角 θ", min: 0, max: 80, step: 1, value: 30, unit: "°", digits: 0, onInput: reset });
    const sV = PL.ui.slider(L.controls, { label: "移動速率 v", min: 0.5, max: 4, step: 0.5, value: 2, unit: "m/s", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    const bP = PL.ui.button(row, "暫停", () => { anim.toggle(); bP.textContent = anim.running ? "暫停" : "播放"; }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rW = PL.ui.readout(L.readouts, { label: "累積功 W", unit: "J" });
    const rP = PL.ui.readout(L.readouts, { label: "功率 P", unit: "W" });
    const rFx = PL.ui.readout(L.readouts, { label: "有效分力", unit: "N" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const F = sF.get(), th = sTh.get() * Math.PI / 180, m = MC();
      const gy = H - 50, sc = (W - 120) / 16, px = 70 + (x % 16) * sc;
      D.line(ctx, 20, gy, W - 20, gy, PL.col("text-faint"), 2);
      D.rect(ctx, px - 22, gy - 30, 44, 30, { fill: m, stroke: "rgba(255,255,255,0.4)", r: 5 });
      const fx = F * Math.cos(th), fy = F * Math.sin(th);
      D.arrow(ctx, px, gy - 15, px + fx * 5, gy - 15 - fy * 5, { color: PL.col("accent-2"), width: 2.5, label: "F" });
      D.arrow(ctx, px, gy - 15, px + fx * 5, gy - 15, { color: "#7ee0c0", width: 2, label: "F cosθ", dash: [3, 3] });
      PL.ui.caption(cv, "只有沿移動方向的分力 F cosθ 才做功。");
      rW.set(W_, 1); rP.set(fx * sV.get(), 1); rFx.set(fx, 1);
    }
    const anim = PL.loop(dt => { if (dt) { const F = sF.get(), th = sTh.get() * Math.PI / 180, v = sV.get(); const dx = v * dt; x += dx; W_ += F * Math.cos(th) * dx; if (x > 32) reset(); } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 功能定理 */
  PL.register("work-energy", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let x = 0, v = 0, Wnet = 0;
    const reset = () => { x = 0; v = 0; Wnet = 0; };
    const sF = PL.ui.slider(L.controls, { label: "施力 F", min: 2, max: 20, step: 1, value: 12, unit: "N", digits: 0, onInput: reset });
    const sFr = PL.ui.slider(L.controls, { label: "阻力 f", min: 0, max: 10, step: 0.5, value: 2, unit: "N", digits: 1, onInput: reset });
    const sM = PL.ui.slider(L.controls, { label: "質量 m", min: 1, max: 6, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "施力", () => { reset(); anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rWn = PL.ui.readout(L.readouts, { label: "淨功 W_net", unit: "J" });
    const rK = PL.ui.readout(L.readouts, { label: "動能 K", unit: "J" });
    const rV = PL.ui.readout(L.readouts, { label: "速度 v", unit: "m/s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const gy = 92, sc = (W - 120) / 16, px = 70 + (x % 16) * sc, K = 0.5 * sM.get() * v * v;
      D.line(ctx, 20, gy, W - 20, gy, PL.col("text-faint"), 2);
      D.rect(ctx, px - 20, gy - 26, 40, 26, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 4 });
      D.arrow(ctx, px + 20, gy - 13, px + 20 + sF.get() * 4, gy - 13, { color: KEc, width: 2.2, label: "F" });
      if (sFr.get() > 0) D.arrow(ctx, px - 20, gy - 13, px - 20 - sFr.get() * 4, gy - 13, { color: THc, width: 2, label: "f" });
      energyBars(cv, 40, gy + 40, W - 120, [{ label: "淨功", v: Wnet, c: MC() }, { label: "動能 K", v: K, c: KEc }], Math.max(Wnet, K, 10));
      PL.ui.caption(cv, "淨功 = 動能變化：兩條長條始終等長");
      rWn.set(Wnet, 1); rK.set(K, 1); rV.set(v, 2);
    }
    const anim = PL.loop(dt => { if (dt) { const F = sF.get(), f = sFr.get(), m = sM.get(); const net = F - f; const a = net / m; const dx = Math.max(0, v) * dt + 0.5 * a * dt * dt; v += a * dt; x += Math.max(0, dx); Wnet += net * Math.max(0, dx); if (x > 32) reset(); } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 軌道上的力學能守恆 */
  PL.register("energy-track", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const g = 9.8, m = 1, c = 0.12, xc = 10, Xs = 20;
    let x = 4, vt = 0, thermal = 0, E0 = 0;
    const yf = xx => c * (xx - xc) * (xx - xc);
    const yp = xx => 2 * c * (xx - xc);
    const sH = PL.ui.slider(L.controls, { label: "起始高度", min: 3, max: 12, step: 0.5, value: 10, unit: "m", digits: 1, onInput: reset });
    const sMu = PL.ui.slider(L.controls, { label: "摩擦係數 μ", min: 0, max: 0.15, step: 0.005, value: 0, unit: "", digits: 3, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "釋放", () => { reset(); anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rV = PL.ui.readout(L.readouts, { label: "速率 v", unit: "m/s" });
    const rKE = PL.ui.readout(L.readouts, { label: "動能", unit: "J" });
    const rPE = PL.ui.readout(L.readouts, { label: "位能", unit: "J" });
    function reset() { const h0 = sH.get(); x = xc - Math.sqrt(h0 / c); vt = 0; thermal = 0; E0 = m * g * h0; }
    reset();
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const sx = (W - 60) / Xs, topH = H - 96, sy = (topH - 30) / 13, baseY = topH;
      const PX = xx => 30 + xx * sx, PY = yy => baseY - yy * sy;
      ctx.save(); ctx.strokeStyle = PL.col("text-faint"); ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const xx = Xs * i / 100; const px = PX(xx), py = PY(yf(xx)); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.restore();
      const ke = Math.max(0, E0 - m * g * yf(x) - thermal), v = Math.sqrt(2 * ke / m);
      D.disc(ctx, PX(x), PY(yf(x)) - 8, 9, { fill: MC(), glow: MC(), glowSize: 14 });
      // 能量長條
      energyBars(cv, 34, topH + 16, W - 110, [
        { label: "動能", v: ke, c: KEc }, { label: "位能", v: m * g * yf(x), c: PEc }, { label: "熱能", v: thermal, c: THc }
      ], E0 || 10);
      rV.set(v, 2); rKE.set(ke, 1); rPE.set(m * g * yf(x), 1);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        dt = Math.min(dt, 0.02);
        const yprime = yp(x), denom = Math.sqrt(1 + yprime * yprime);
        const aT = -g * yprime / denom - (sMu.get() * g / denom) * Math.sign(vt || 1);
        const ke = Math.max(0, E0 - m * g * yf(x) - thermal); const spd = Math.sqrt(2 * ke / m);
        vt += aT * dt;
        // 摩擦造成的熱：μ m g cosθ · |ds|
        const ds = Math.abs(vt) * dt; thermal += sMu.get() * m * g / denom * ds;
        x += (vt / denom) * dt;
        if (x < 0.3 || x > Xs - 0.3) { vt = -vt * 0.98; x = PL.clamp(x, 0.3, Xs - 0.3); }
      }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 重力位能與彈性位能 */
  PL.register("potential", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    const g = 9.8; let phase = "ready", y = 0, v = 0, comp = 0;
    const sX = PL.ui.slider(L.controls, { label: "彈簧壓縮量 x", min: 0.1, max: 0.6, step: 0.05, value: 0.4, unit: "m", digits: 2, onInput: r });
    const sK = PL.ui.slider(L.controls, { label: "彈簧勁度 k", min: 100, max: 800, step: 20, value: 400, unit: "N/m", digits: 0, onInput: r });
    const sM = PL.ui.slider(L.controls, { label: "物體質量 m", min: 0.5, max: 4, step: 0.5, value: 1, unit: "kg", digits: 1, onInput: r });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "釋放", () => { r(); comp = sX.get(); phase = "spring"; anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", r);
    const rHmax = PL.ui.readout(L.readouts, { label: "理論最大高度", unit: "m" });
    const rV = PL.ui.readout(L.readouts, { label: "速率 v", unit: "m/s" });
    const rH = PL.ui.readout(L.readouts, { label: "當前高度", unit: "m" });
    function r() { phase = "ready"; y = 0; v = 0; comp = sX.get(); }
    r();
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const k = sK.get(), x0 = sX.get(), m = sM.get(), Hmax = 0.5 * k * x0 * x0 / (m * g);
      const groundY = H - 30, sc = (H - 80) / (Hmax + 0.6), cx = W * 0.34;
      D.line(ctx, cx - 50, groundY, cx + 50, groundY, PL.col("text-faint"), 2);
      const springTop = groundY - (0.6 - comp) * sc * 0.4 - 40;
      D.spring(ctx, cx, groundY, cx, springTop, 9, 10, MC());
      const by = springTop - 14 - y * sc;
      D.rect(ctx, cx - 20, by - 20, 40, 20, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 4 });
      // 能量長條
      const spE = 0.5 * k * comp * comp, ke = 0.5 * m * v * v, pe = m * g * y;
      energyBars(cv, W * 0.5, 50, W * 0.42, [{ label: "彈性能", v: spE, c: MC() }, { label: "動能", v: ke, c: KEc }, { label: "重力能", v: pe, c: PEc }], Math.max(spE, 0.5 * k * x0 * x0, 1));
      rHmax.set(Hmax, 2); rV.set(v, 2); rH.set(y, 2);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        dt = Math.min(dt, 0.02); const k = sK.get(), m = sM.get();
        if (phase === "spring") { const F = k * comp - m * g; v += F / m * dt; comp -= v * dt; if (comp <= 0) { comp = 0; phase = "fly"; } }
        else if (phase === "fly") { v -= g * dt; y += v * dt; if (y <= 0 && v < 0) { y = 0; phase = "ready"; anim.stop(); } }
      }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 保守力與非保守力 */
  PL.register("conservative", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const m = 1, g = 9.8; let s = 0;
    const sPath = PL.ui.select(L.controls, { label: "選擇路徑", value: "diag", options: [{ value: "diag", label: "路徑一：直線" }, { value: "L", label: "路徑二：先下後平" }, { value: "arc", label: "路徑三：繞遠弧線" }], onChange: () => { s = 0; } });
    const sMu = PL.ui.slider(L.controls, { label: "摩擦係數 μ（非保守）", min: 0, max: 0.4, step: 0.02, value: 0.2, unit: "", digits: 2 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "出發", () => { s = 0; anim.start(); }, { primary: true });
    PL.ui.note(L.controls, "重力做功只看起點與終點高度差（與路徑無關）；摩擦做功則與路徑長度有關。");
    const rWg = PL.ui.readout(L.readouts, { label: "重力功 W_g", unit: "J" });
    const rWf = PL.ui.readout(L.readouts, { label: "摩擦功 W_f", unit: "J" });
    const rLen = PL.ui.readout(L.readouts, { label: "路徑長", unit: "m" });
    const A = { x: 2, y: 10 }, B = { x: 18, y: 2 };
    function pathPts() {
      const p = sPath.get();
      if (p === "diag") return [A, B];
      if (p === "L") return [A, { x: A.x, y: B.y }, B];
      const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; const x = PL.lerp(A.x, B.x, t); const y = PL.lerp(A.y, B.y, t) + 5 * Math.sin(Math.PI * t); pts.push({ x, y }); } return pts;
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const sx = (W - 60) / 20, sy = (H - 60) / 12, PX = p => 30 + p.x * sx, PY = p => H - 30 - p.y * sy;
      const pts = pathPts();
      // 高度參考線
      D.line(ctx, 20, PY(A), W - 20, PY(A), "rgba(255,255,255,0.08)", 1, [3, 3]);
      D.line(ctx, 20, PY(B), W - 20, PY(B), "rgba(255,255,255,0.08)", 1, [3, 3]);
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 3; ctx.beginPath();
      pts.forEach((p, i) => { const px = PX(p), py = PY(p); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); ctx.restore();
      D.disc(ctx, PX(A), PY(A), 6, { fill: PL.col("accent-2") }); D.text(ctx, "A", PX(A) - 14, PY(A) + 4, { color: PL.col("accent-2"), size: 13 });
      D.disc(ctx, PX(B), PY(B), 6, { fill: PL.col("warn") }); D.text(ctx, "B", PX(B) + 8, PY(B) + 4, { color: PL.col("warn"), size: 13 });
      // 長度與功
      let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      const Wg = m * g * (A.y - B.y), Wf = -sMu.get() * m * g * len;
      // 移動點
      const idx = Math.min(pts.length - 1, Math.floor(s * (pts.length - 1)));
      D.disc(ctx, PX(pts[idx]), PY(pts[idx]), 8, { fill: MC(), glow: MC(), glowSize: 12 });
      rWg.set(Wg, 1); rWf.set(Wf, 1); rLen.set(len, 1);
    }
    const anim = PL.loop(dt => { if (dt) { s += dt * 0.4; if (s >= 1) { s = 1; anim.stop(); } } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
