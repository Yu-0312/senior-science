/* 模組十一 · 磁場與電磁感應 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#9575cd");
  const NP = "#ff6b6b", SP = "#5aa2ff";

  /* 載流導線的磁場 */
  PL.register("current-field", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let t = 0;
    const sI = PL.ui.slider(L.controls, { label: "電流 I", min: 1, max: 10, step: 0.5, value: 5, unit: "A", digits: 1 });
    const sDir = PL.ui.select(L.controls, { label: "電流方向", value: "out", options: [{ value: "out", label: "流出頁面 ⊙" }, { value: "in", label: "流入頁面 ⊗" }] });
    PL.ui.note(L.controls, "安培右手定則：大拇指指電流方向，四指環繞方向即磁場方向。B 與距離成反比。");
    const rB = PL.ui.readout(L.readouts, { label: "近處磁場（相對）", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H / 2, out = sDir.get() === "out", ccw = out ? 1 : -1, I = sI.get();
      // 導線截面
      D.disc(ctx, cx, cy, 12, { fill: MC(), glow: MC(), glowSize: 12 });
      if (out) D.disc(ctx, cx, cy, 4, { fill: "#fff" });
      else { D.line(ctx, cx - 6, cy - 6, cx + 6, cy + 6, "#fff", 2); D.line(ctx, cx - 6, cy + 6, cx + 6, cy - 6, "#fff", 2); }
      // 場圈
      for (let ri = 1; ri <= 5; ri++) { const R = 28 + ri * 26; D.ring(ctx, cx, cy, R, "rgba(149,117,205,0.4)", 1.3); const a = ccw * (t * 0.6) + ri; const ax = cx + R * Math.cos(a), ay = cy + R * Math.sin(a); const ta = a + ccw * Math.PI / 2; D.arrow(ctx, ax - Math.cos(ta) * 6, ay - Math.sin(ta) * 6, ax + Math.cos(ta) * 6, ay + Math.sin(ta) * 6, { color: MC(), width: 1.6, head: 6 }); }
      rB.set(I, 1);
    }
    const anim = PL.loop(dt => { if (dt) t += dt * sI.get(); draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 磁場與勞侖茲力 */
  PL.register("lorentz", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let ang = 0;
    const sV = PL.ui.slider(L.controls, { label: "速率 v", min: 1, max: 6, step: 0.5, value: 3, unit: "", digits: 1 });
    const sB = PL.ui.slider(L.controls, { label: "磁場 B", min: 1, max: 6, step: 0.5, value: 3, unit: "", digits: 1 });
    const sQ = PL.ui.select(L.controls, { label: "電荷", value: "pos", options: [{ value: "pos", label: "正電荷 +" }, { value: "neg", label: "負電荷 −" }], onChange: () => ang = 0 });
    PL.ui.note(L.controls, "磁力恆垂直於速度，使帶電粒子作等速率圓周運動；半徑 r = mv/qB。");
    const rR = PL.ui.readout(L.readouts, { label: "迴轉半徑 r", unit: "px" });
    const rT = PL.ui.readout(L.readouts, { label: "週期 T（相對）", unit: "" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      // B 進入頁面（叉叉背景）
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1;
      for (let x = 30; x < W - 20; x += 40) for (let y = 30; y < H - 20; y += 40) { ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3); ctx.moveTo(x - 3, y + 3); ctx.lineTo(x + 3, y - 3); ctx.stroke(); } ctx.restore();
      D.text(ctx, "B 進入頁面 ⊗", W - 24, 22, { color: PL.col("text-faint"), size: 11, align: "right" });
      const pos = sQ.get() === "pos", sgn = pos ? 1 : -1;
      const r = 20 + sV.get() / sB.get() * 30, cx = W / 2, cy = H / 2;
      const px = cx + r * Math.cos(ang), py = cy + r * Math.sin(ang) * sgn;
      D.ring(ctx, cx, cy, r, "rgba(149,117,205,0.3)", 1.2, [4, 4]);
      D.disc(ctx, px, py, 9, { fill: pos ? NP : SP, glow: pos ? NP : SP, glowSize: 10 });
      // 速度切線、力向心
      const vx = -Math.sin(ang) * sgn, vy = Math.cos(ang);
      D.arrow(ctx, px, py, px + vx * 34, py + vy * 34 * sgn, { color: "#fff", width: 2, label: "v" });
      D.arrow(ctx, px, py, px + (cx - px) * 0.4, py + (cy - py) * 0.4, { color: PL.col("warn"), width: 2, label: "F" });
      rR.set(r, 0); rT.set(6.28 / sB.get(), 2);
    }
    const anim = PL.loop(dt => { if (dt) ang += sB.get() * dt * 0.6; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 電磁感應（法拉第定律） */
  PL.register("induction", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    let t = 0, phiPrev = null, emf = 0;
    const sSpd = PL.ui.slider(L.controls, { label: "磁鐵移動速率", min: 0.3, max: 2.5, step: 0.1, value: 1.2, unit: "", digits: 1 });
    PL.ui.note(L.controls, "磁通量改變才會感應電流；磁鐵移動越快，感應電動勢越大。");
    const rEmf = PL.ui.readout(L.readouts, { label: "感應電動勢 ε", unit: "（相對）" });
    const rDir = PL.ui.readout(L.readouts, { label: "感應電流" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cy = H / 2, coilX = W * 0.62, mx = coilX - 150 + 90 * Math.sin(t);
      // 線圈
      for (let i = 0; i < 5; i++) D.ring(ctx, coilX + i * 12, cy, 34, MC(), 2.4);
      // 導線到檢流計
      D.line(ctx, coilX + 48, cy + 34, coilX + 90, cy + 60, "#c9d3e0", 2); D.line(ctx, coilX, cy + 34, coilX + 40, cy + 60, "#c9d3e0", 2);
      // 磁鐵
      D.rect(ctx, mx - 34, cy - 12, 34, 24, { fill: NP, r: 3 }); D.text(ctx, "N", mx - 17, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" });
      D.rect(ctx, mx, cy - 12, 34, 24, { fill: SP, r: 3 }); D.text(ctx, "S", mx + 17, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" });
      D.arrow(ctx, mx + 17, cy - 22, mx + 17 + Math.cos(t) * 30, cy - 22, { color: "#fff", width: 1.6 });
      // 檢流計
      const gx = coilX + 65, gy = cy + 74; D.ring(ctx, gx, gy, 20, PL.col("text-faint"), 2);
      const needle = PL.clamp(emf * 0.5, -1, 1) * Math.PI / 3;
      D.line(ctx, gx, gy, gx + 16 * Math.sin(needle), gy - 16 * Math.cos(needle), PL.col("danger"), 2);
      D.text(ctx, "檢流計", gx, gy + 34, { color: PL.col("text-dim"), size: 10, align: "center" });
      rEmf.set(Math.abs(emf), 2); rDir.set(emf > 0.05 ? "順時針" : emf < -0.05 ? "逆時針" : "無");
    }
    const anim = PL.loop(dt => {
      if (dt) { t += dt * sSpd.get(); const coilX = cv.W * 0.62, mx = coilX - 150 + 90 * Math.sin(t); const d = (mx + 17) - coilX; const phi = 1 / (1 + (d / 60) ** 2); if (phiPrev != null) emf = -(phi - phiPrev) / dt * 0.1; phiPrev = phi; }
      draw();
    });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 楞次定律 */
  PL.register("lenz", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let t = 0;
    const sMode = PL.ui.select(L.controls, { label: "磁鐵動作", value: "approach", options: [{ value: "approach", label: "N 極接近線圈" }, { value: "leave", label: "N 極遠離線圈" }] });
    PL.ui.note(L.controls, "感應電流的磁場總是反抗磁通量的變化：接近時排斥、遠離時吸引。");
    const rFace = PL.ui.readout(L.readouts, { label: "線圈近端感應極" });
    const rForce = PL.ui.readout(L.readouts, { label: "磁鐵與線圈" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cy = H / 2, coilX = W * 0.6, approach = sMode.get() === "approach";
      const osc = (Math.sin(t) * 0.5 + 0.5), mx = approach ? coilX - 180 + osc * 90 : coilX - 90 - osc * 90;
      for (let i = 0; i < 5; i++) D.ring(ctx, coilX + i * 12, cy, 36, MC(), 2.4);
      const nearPole = approach ? "N" : "S";
      D.text(ctx, nearPole, coilX - 6, cy - 44, { color: approach ? NP : SP, size: 15, align: "center", weight: "700" });
      D.text(ctx, "感應近端：" + nearPole + " 極", coilX + 20, cy - 44, { color: PL.col("text-dim"), size: 10 });
      D.rect(ctx, mx - 34, cy - 12, 34, 24, { fill: NP, r: 3 }); D.text(ctx, "N", mx - 17, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" });
      D.rect(ctx, mx, cy - 12, 34, 24, { fill: SP, r: 3 }); D.text(ctx, "S", mx + 17, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" });
      D.arrow(ctx, mx + 17, cy + 30, mx + 17 + (approach ? 34 : -34), cy + 30, { color: "#fff", width: 1.8, label: approach ? "接近" : "遠離" });
      rFace.set(approach ? "N（排斥）" : "S（吸引）"); rForce.set(approach ? "互相排斥" : "互相吸引");
    }
    const anim = PL.loop(dt => { if (dt) t += dt * 1.2; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 交流發電機 */
  PL.register("ac-generator", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    let t = 0, hist = [];
    const sW = PL.ui.slider(L.controls, { label: "轉速 ω", min: 0.5, max: 4, step: 0.1, value: 1.6, unit: "rad/s", digits: 1 });
    PL.ui.note(L.controls, "線圈在磁場中轉動使磁通量週期變化，感應出正弦式交流電動勢 ε = ε₀ sin(ωt)。");
    const rEmf = PL.ui.readout(L.readouts, { label: "瞬時電動勢", unit: "×ε₀" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W * 0.26, cy = H * 0.42, R = 52;
      // 磁極
      D.rect(ctx, cx - 90, cy - 30, 20, 60, { fill: NP, r: 3 }); D.text(ctx, "N", cx - 80, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" });
      D.rect(ctx, cx + 70, cy - 30, 20, 60, { fill: SP, r: 3 }); D.text(ctx, "S", cx + 80, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" });
      // 轉動線圈（以橢圓投影表示）
      const a = t, w = R * Math.cos(a);
      ctx.save(); ctx.strokeStyle = MC(); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(w) + 2, R, 0, 0, TAU); ctx.stroke(); ctx.restore();
      D.disc(ctx, cx + w, cy - R, 5, { fill: PL.col("accent-2") }); D.disc(ctx, cx - w, cy + R, 5, { fill: PL.col("warn") });
      // EMF 圖
      const bx = W * 0.52, by = 24, bw = W - bx - 20, bh = H - 48;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: 4 * Math.PI / sW.get(), y0: -1.1, y1: 1.1 });
      g.frame({ title: "感應電動勢 ε – t", xlabel: "t" }); g.grid(4, 2);
      const emf = Math.sin(sW.get() * t);
      const Tw = 4 * Math.PI / sW.get();
      const pts = hist.filter(h => h[0] > t - Tw).map(h => [h[0] - (t - Tw), h[1]]);
      if (pts.length > 1) g.curve(pts, { color: MC(), width: 2.2 });
      g.dot(Tw, emf, { color: MC(), glow: MC() });
      rEmf.set(emf, 2);
    }
    const anim = PL.loop(dt => { if (dt) { t += dt; hist.push([t, Math.sin(sW.get() * t)]); if (hist.length > 900) hist.shift(); } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 變壓器 */
  PL.register("transformer", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    let t = 0;
    const sNp = PL.ui.slider(L.controls, { label: "主線圈匝數 Nₚ", min: 20, max: 200, step: 10, value: 100, unit: "匝", digits: 0 });
    const sNs = PL.ui.slider(L.controls, { label: "副線圈匝數 Nₛ", min: 20, max: 400, step: 10, value: 200, unit: "匝", digits: 0 });
    const sVp = PL.ui.slider(L.controls, { label: "主線圈電壓 Vₚ", min: 10, max: 220, step: 10, value: 110, unit: "V", digits: 0 });
    const rVs = PL.ui.readout(L.readouts, { label: "副線圈電壓 Vₛ", unit: "V" });
    const rType = PL.ui.readout(L.readouts, { label: "類型" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const Np = sNp.get(), Ns = sNs.get(), Vp = sVp.get(), Vs = Vp * Ns / Np;
      const cx = W / 2, cy = H * 0.4;
      // 鐵芯
      D.rect(ctx, cx - 18, cy - 60, 36, 120, { stroke: PL.col("text-faint"), width: 3, r: 4 });
      // 主副線圈
      const coil = (x, n, c) => { const turns = Math.min(10, Math.round(n / 20)); for (let i = 0; i < turns; i++) D.ring(ctx, x, cy - 44 + i * (88 / turns), 14, c, 2); };
      coil(cx - 32, Np, PL.col("accent-2")); coil(cx + 32, Ns, MC());
      D.text(ctx, "主 Nₚ=" + Np, cx - 60, cy + 74, { color: PL.col("accent-2"), size: 11, align: "center" });
      D.text(ctx, "副 Nₛ=" + Ns, cx + 60, cy + 74, { color: MC(), size: 11, align: "center" });
      // 波形
      const by = H - 46, amp = 22;
      ctx.save(); ctx.strokeStyle = PL.col("accent-2"); ctx.lineWidth = 1.8; ctx.beginPath(); for (let x = 20; x < cx - 40; x += 2) ctx.lineTo(x, by - amp * (Vp / 220) * Math.sin((x - 20) * 0.1 - t * 4)); ctx.stroke();
      ctx.strokeStyle = MC(); ctx.beginPath(); for (let x = cx + 40; x < W - 20; x += 2) ctx.lineTo(x, by - amp * PL.clamp(Vs / 220, -1.4, 1.4) * Math.sin((x - cx - 40) * 0.1 - t * 4)); ctx.stroke(); ctx.restore();
      rVs.set(Vs, 0); rType.set(Ns > Np ? "升壓變壓器" : Ns < Np ? "降壓變壓器" : "1:1");
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
