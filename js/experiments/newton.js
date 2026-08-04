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

      /*
       * 原本速度與摩擦力箭頭都只在 v > 0.01（也就是按下「推一下」之後）才畫，
       * 於是兩根滑桿在推之前完全不影響畫面。
       *
       * 改成靜止待推時就先畫出：這一組設定的初速箭頭、摩擦力箭頭，
       * 以及「預計會滑到哪裡」的虛線標記。
       * μ = 0 時預計停止距離是無限遠——標記會直接指出「永遠不會停」，
       * 這正是慣性要教的事，而且在按按鈕之前就看得到。
       */
      const v0 = sV.get(), mu = sMu.get();
      const moving = v > 0.01;
      const showV = moving ? v : v0;
      D.arrow(ctx, px + 22, gy - 14, px + 22 + showV * 4, gy - 14,
        { color: PL.col("accent-2"), width: 2, label: "v = " + PL.fmt(showV, 1) });
      if (mu > 0) {
        D.arrow(ctx, px - 22, gy - 14, px - 22 - mu * 160, gy - 14,
          { color: PL.col("danger"), width: 2, label: "f（μ=" + PL.fmt(mu, 2) + "）" });
      }
      if (!moving) {
        if (mu <= 0) {
          D.text(ctx, "μ = 0：沒有摩擦力，滑塊會一直等速前進，永遠不會停",
            W / 2, 30, { color: PL.col("warn"), size: 12, align: "center", weight: "700" });
        } else {
          // 停止距離 d = v² / (2μg)
          const d = v0 * v0 / (2 * mu * 9.8);
          const mx = 60 + Math.min(30, d) * sc;
          D.line(ctx, mx, gy - 56, mx, gy + 10, PL.col("warn"), 1.4, [6, 5]);
          D.text(ctx, d > 30 ? "預計滑行 " + PL.fmt(d, 1) + " m（超出畫面）" : "預計停在 " + PL.fmt(d, 1) + " m",
            mx + 6, gy - 60, { color: PL.col("warn"), size: 10.5 });
        }
      }
      PL.ui.caption(cv, mu <= 0
        ? "把摩擦係數放在 0：滑塊不需要任何力就保持等速——物體本來就會維持原本的運動狀態。"
        : "摩擦力箭頭與虛線標記會隨兩根滑桿改變。先預測它會停在哪裡，再按「推一下」驗證。");
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
    PL.ui.button(row, "釋放", () => { reset(); anim.start(); }, { primary: true, trigger: true });
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
      ctx.fillStyle = PL.theme.pale(0.05); ctx.fill(); ctx.strokeStyle = PL.col("text-faint"); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
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
    PL.ui.button(row, "釋放", () => { reset(); anim.start(); }, { primary: true, trigger: true });
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
      /*
       * 原本車子固定 44×30、力箭頭只在「互推中」才畫，
       * 於是三根滑桿在按下互推之前完全不影響畫面——學生拉半天像在看靜態插圖。
       *
       * 改成：車身寬度隨質量、力箭頭一直都在（作用力與反作用力本來就成對存在），
       * 並且畫出兩支長度不同的加速度箭頭。這樣「同樣的 F、質量小的加速度大」
       * 在按下按鈕之前就已經看得出來了。
       */
      const m1 = sm1.get(), m2 = sm2.get();
      const w1 = 30 + m1 * 5, w2 = 30 + m2 * 5;     // 1kg→35px，8kg→70px
      const bx1 = cx - 12 - w1 / 2 - x1 * 30, bx2 = cx + 12 + w2 / 2 + x2 * 30;
      block(ctx, bx1, gy, w1, 30, MC(), PL.fmt(m1, 1) + "kg");
      block(ctx, bx2, gy, w2, 30, "#ffab80", PL.fmt(m2, 1) + "kg");

      // 互推的一對力：大小永遠相等、方向相反，這是第三定律的重點
      const fLen = F * 4;
      D.arrow(ctx, bx1 + w1 / 2, gy - 16, bx1 + w1 / 2 - fLen, gy - 16,
        { color: PL.col("danger"), width: 2.4, label: "F = " + F + " N" });
      D.arrow(ctx, bx2 - w2 / 2, gy - 16, bx2 - w2 / 2 + fLen, gy - 16,
        { color: PL.col("accent-2"), width: 2.4, label: "F = " + F + " N" });

      // 加速度箭頭：同樣的力，質量小的箭頭明顯比較長
      const a1 = F / m1, a2 = F / m2, aScale = 90 / Math.max(a1, a2);
      D.arrow(ctx, bx1, gy - 46, bx1 - a1 * aScale, gy - 46,
        { color: PL.col("warn"), width: 2, head: 7, label: "a₁=" + PL.fmt(a1, 1) });
      D.arrow(ctx, bx2, gy - 46, bx2 + a2 * aScale, gy - 46,
        { color: PL.col("warn"), width: 2, head: 7, label: "a₂=" + PL.fmt(a2, 1) });

      PL.ui.caption(cv, Math.abs(m1 - m2) < 0.05
        ? "兩車質量相同：受力相等，加速度也相等，畫面完全對稱。"
        : "兩支紅／藍箭頭一樣長——作用力與反作用力大小永遠相等。" +
          "但上面兩支加速度箭頭不一樣長：" + (m1 < m2 ? "左" : "右") + "車比較輕，所以加速度比較大。");
      rA1.set(a1, 2); rA2.set(a2, 2); rF.set(F, 0);
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

  /* 力矩與靜力平衡 —— 天平式槓桿
   *
   * 這一題學生會背 m₁d₁ = m₂d₂，但畫面上原本看不到「力臂」這個量本身：
   * 兩個砝碼掛在那裡，d 只是隱含在位置裡。於是「力臂是支點到作用線的垂直距離」
   * 這句定義沒有對應的視覺，學生記的是公式而不是概念。
   *
   * 因此這一版把三件看不見的事畫出來：
   *   · 力臂 d₁、d₂ 用標註線從支點量到懸掛點，長度會隨滑桿改變
   *   · 重量 W = mg 用向下箭頭畫在懸掛點，箭頭長度正比於重量
   *   · 兩側力矩用長條並排比較，誰長誰把桿子壓下去，一眼可見
   *
   * 另外把力矩改成真正的 N·m（τ = m g d），不再是沒有單位的 m×d。
   * 單位是實驗課要求的東西，模擬器自己就該做對。
   */
  PL.register("torque-equilibrium", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    const G = 9.8;
    let ang = 0;

    PL.ui.section(L.controls, "左側（阻力端）");
    const sM1 = PL.ui.slider(L.controls, { label: "左側質量 m₁", min: 1, max: 8, step: 0.5, value: 3, unit: "kg", digits: 1 });
    const sD1 = PL.ui.slider(L.controls, { label: "左側力臂 d₁", min: 1, max: 5, step: 0.5, value: 3, unit: "m", digits: 1 });
    PL.ui.section(L.controls, "右側（施力端）");
    const sM2 = PL.ui.slider(L.controls, { label: "右側質量 m₂", min: 1, max: 8, step: 0.5, value: 2, unit: "kg", digits: 1 });
    const sD2 = PL.ui.slider(L.controls, { label: "右側力臂 d₂", min: 1, max: 5, step: 0.5, value: 4, unit: "m", digits: 1 });

    const tau1 = () => sM1.get() * G * sD1.get();
    const tau2 = () => sM2.get() * G * sD2.get();

    PL.ui.presets(L.controls, {
      label: "關鍵設定",
      options: [
        { label: "調到剛好平衡", hint: "在目前的 m₁、d₁、m₂ 之下，把 d₂ 移到合平衡的位置",
          apply: () => {
            const need = sM1.get() * sD1.get() / sM2.get();
            sD2.set(PL.clamp(Math.round(need * 2) / 2, 1, 5));
            settle();
          } },
        { label: "省力槓桿", hint: "施力臂比阻力臂長，用比較小的力就抬得動——代價是要移動比較長的距離",
          apply: () => { sM1.set(6); sD1.set(1.5); sM2.set(2); sD2.set(4.5); settle(); } },
        { label: "等臂天平", hint: "兩邊力臂一樣長，此時平衡等於「兩邊一樣重」——這是天平能量質量的原因",
          apply: () => { sD1.set(3); sD2.set(3); sM1.set(4); sM2.set(4); settle(); } }
      ]
    });

    PL.ui.note(L.controls,
      "力矩 τ = 力 × 力臂，力臂是支點到作用線的垂直距離。左右力矩相等時橫桿保持水平。" +
      "先按「省力槓桿」：右邊只掛 2 kg，卻壓得動左邊的 6 kg——多出來的不是力，是力臂。");

    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—", meter: true });
    const rL = PL.ui.readout(L.readouts, { label: "左力矩 τ₁", unit: "N·m" });
    const rR = PL.ui.readout(L.readouts, { label: "右力矩 τ₂", unit: "N·m" });
    const rS = PL.ui.readout(L.readouts, { label: "狀態" });

    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "左側重量 W₁", unit: "N", hint: "= m₁g，這才是力，不是質量" },
      { label: "右側重量 W₂", unit: "N", hint: "= m₂g" },
      { label: "淨力矩 τ₂ − τ₁", unit: "N·m", hint: "為零才是靜力平衡" },
      { label: "要平衡需要的 d₂", unit: "m", hint: "= m₁d₁ / m₂" }
    ]);

    PL.ui.causality(L.canvasWrap.parentNode, {
      title: "轉不轉，看的是力矩不是力",
      rows: [
        { name: "力 × 力臂", tone: "a", note: "同樣的力，離支點越遠轉動效果越大。所以扳手要握在末端，門把裝在離門軸最遠的那一側。" },
        { name: "力臂從支點量起", tone: "b", note: "是支點到「作用線」的垂直距離，不是到物體的距離。力的方向斜掉時，力臂會比看起來的短。" },
        { name: "省力不省功", tone: "c", note: "力臂拉長到兩倍，施力減半，但施力端要移動兩倍的距離。W = Fd 兩邊相乘後完全一樣。" }
      ]
    });

    PL.ui.procedure(L.controls, {
      title: "槓桿原理實驗的標準流程",
      steps: [
        "先<strong>空桿調平</strong>：不掛任何砝碼時橫桿必須水平。沒調平就開始掛，桿子自身的重量會偷偷加進某一側的力矩。",
        "在左側固定位置掛上已知砝碼，記下 m₁ 與 d₁。",
        "右側改掛不同質量，每次移動位置直到橫桿回到水平，記錄該次的 m₂ 與 d₂。",
        "至少做五組，把 m₂ 對 1/d₂ 作圖。若得到通過原點的直線，就驗證了 τ₁ = τ₂。"
      ],
      rule: "力臂要從<strong>支點</strong>量到<strong>懸掛點</strong>，不是量到砝碼的邊緣；而且橫桿自己有重量，" +
            "沒有先空桿調平的話，每一組數據都會系統性偏向同一邊——這種誤差多做幾次也消不掉。"
    });

    /* 目前的滑桿設定下，桿子最終會停在哪個角度 */
    const targetAng = () => PL.clamp((tau2() - tau1()) / 60, -0.34, 0.34);
    /* 預設值切換後讓桿子直接就位，不必等動畫 */
    function settle() { ang = targetAng(); draw(); }

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m1 = sM1.get(), d1 = sD1.get(), m2 = sM2.get(), d2 = sD2.get();
      const t1 = tau1(), t2 = tau2(), W1 = m1 * G, W2 = m2 * G;
      const cx = W / 2, cy = H * 0.38, half = Math.min(W * 0.38, 180), sc = half / 5;
      const c = Math.cos(ang), s = Math.sin(ang);

      // 支架與支點
      D.line(ctx, cx, cy, cx - 24, cy + 48, PL.col("text-faint"), 2);
      D.line(ctx, cx, cy, cx + 24, cy + 48, PL.col("text-faint"), 2);
      D.line(ctx, cx - 34, cy + 48, cx + 34, cy + 48, PL.col("text-faint"), 2);
      // 水平參考線：桿子傾斜時才看得出來偏了多少
      D.line(ctx, cx - half, cy, cx + half, cy, PL.col("text-faint"), 1, [4, 5]);
      D.line(ctx, cx - half * c, cy - half * s, cx + half * c, cy + half * s, MC(), 6);
      D.disc(ctx, cx, cy, 5, { fill: PL.col("text-dim") });
      D.text(ctx, "支點", cx, cy + 64, { color: PL.col("text-faint"), size: 10, align: "center" });

      /* 一側的砝碼、重量箭頭與力臂標註 */
      function side(dist, m, weight, sign, name, tone) {
        const ax = cx + sign * dist * sc * c, ay = cy + sign * dist * sc * s;
        const bw = 20 + m * 4, bh = 16 + m * 2;
        D.line(ctx, ax, ay, ax, ay + 22, PL.col("text-dim"), 1.5);
        D.rect(ctx, ax - bw / 2, ay + 22, bw, bh, { fill: tone, stroke: PL.theme.pale(0.4), r: 4 });
        D.text(ctx, PL.fmt(m, 1) + " kg", ax, ay + 22 + bh / 2 + 4,
          { color: "#04121a", size: 10, align: "center", weight: "700" });
        // 重量箭頭：長度正比於 W，讓「力」有大小可看
        const aLen = 16 + weight / 78 * 34;
        D.arrow(ctx, ax, ay + 24 + bh, ax, ay + 24 + bh + aLen,
          { color: PL.col("accent-2"), width: 2, label: name + " " + PL.fmt(weight, 0) + " N" });
        // 力臂標註：從支點沿水平量到懸掛點正下方
        const dimY = cy + 96;
        D.line(ctx, cx, dimY, ax, dimY, PL.col("accent"), 1.5);
        D.line(ctx, cx, dimY - 5, cx, dimY + 5, PL.col("accent"), 1.5);
        D.line(ctx, ax, dimY - 5, ax, dimY + 5, PL.col("accent"), 1.5);
        D.text(ctx, (sign < 0 ? "d₁ = " : "d₂ = ") + PL.fmt(dist, 1) + " m", (cx + ax) / 2, dimY - 9,
          { color: PL.col("accent"), size: 10, align: "center" });
      }
      side(d1, m1, W1, -1, "W₁", MC());
      side(d2, m2, W2, 1, "W₂", "#ffab80");

      /* 力矩長條比較：把「誰比較大」變成長度而不是兩個數字 */
      const barY = H - 46, barX = 56, barW = W - 112, tMax = Math.max(t1, t2, 1);
      D.text(ctx, "力矩比較 τ = W × d", barX, barY - 12, { color: PL.col("text-dim"), size: 11 });
      [[t1, MC(), "τ₁"], [t2, "#ffab80", "τ₂"]].forEach((b, i) => {
        const y = barY + i * 15;
        D.rect(ctx, barX, y, barW * (b[0] / tMax), 11, { fill: b[1], r: 3 });
        D.text(ctx, b[2] + " = " + PL.fmt(b[0], 1) + " N·m", barX + barW * (b[0] / tMax) + 6, y + 9,
          { color: PL.col("text-dim"), size: 10 });
      });

      const net = t2 - t1, need = m1 * d1 / m2;
      dv.set(0, W1, 1); dv.set(1, W2, 1); dv.set(2, net, 1); dv.set(3, need, 2);
      dv.tone(2, Math.abs(net) < 0.05 ? "good" : "warn");

      rL.set(t1, 1); rR.set(t2, 1);
      const balanced = Math.abs(net) < 0.05;
      rS.set(balanced ? "平衡" : net < 0 ? "左傾" : "右傾");
      if (balanced) {
        vd.set("平衡：兩側力矩相等，合力矩為零", "good", 1);
      } else {
        const heavier = net < 0 ? "左" : "右";
        const move = PL.fmt(Math.abs(need - d2), 2);
        vd.set(heavier + "側力矩較大，桿子往" + heavier + "傾；把 d₂ 移到 " + PL.fmt(need, 2) +
          " m（差 " + move + " m）就會平衡", "warn",
          1 - Math.min(1, Math.abs(net) / Math.max(t1, t2, 1)));
      }
    }

    const anim = PL.loop(dt => {
      if (dt) ang += (targetAng() - ang) * Math.min(1, dt * 3);
      draw();
    });
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
      /*
       * 「動摩擦係數 μₖ」原本只在物體真的開始下滑之後才影響畫面。
       * 物理上沒錯，但學生在靜止狀態拉這根滑桿會以為它壞了，
       * 也就學不到「一旦滑動，摩擦力會掉到比最大靜摩擦更小」這個重點。
       *
       * 改成兩條並排的對照棒：上面是最大靜摩擦 μₛN，下面是動摩擦 μₖN，
       * 再畫一條重力的參考線。μₖ 的棒子隨滑桿即時變化，
       * 而「動摩擦棒比靜摩擦棒短」這件事一眼就看得到。
       */
      const sx = 28, sy = H - 66, sw = Math.min(200, W * 0.42);
      const ratioS = Math.min(1, q.fsMax / q.mg);
      // 靠牆的情形，正向力就是水平推力本身（模型裡叫 q.F，不是 q.N）。
      // 第一版誤用 q.N，算出 NaN，長條完全沒畫出來——量化稽核抓到了這個錯。
      const ratioK = Math.min(1, (sMk.get() * q.F) / q.mg);
      D.text(ctx, "摩擦力上限 ÷ 重力", sx, sy - 10, { color: PL.col("text-dim"), size: 11 });
      [[0, ratioS, "最大靜摩擦 μₛN", q.sliding ? PL.col("danger") : "#4dd0a0"],
       [16, ratioK, "動摩擦 μₖN", PL.col("warn")]].forEach(([dy, ratio, lab, cc2]) => {
        D.rect(ctx, sx, sy + dy, sw, 10, { fill: PL.theme.pale(0.10), r: 5 });
        D.rect(ctx, sx, sy + dy, sw * ratio, 10, { fill: cc2, r: 5 });
        D.text(ctx, lab + " = " + PL.fmt(ratio, 2), sx + sw + 8, sy + dy + 9,
          { color: cc2, size: 9.5 });
      });
      // 重力那條線：摩擦棒超過它就撐得住，沒超過就會滑
      D.line(ctx, sx + sw, sy - 4, sx + sw, sy + 30, PL.col("text-faint"), 1.4, [3, 3]);
      D.text(ctx, "撐住所需", sx + sw - 2, sy - 8, { color: PL.col("text-faint"), size: 8.5, align: "right" });
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
      /*
       * μₖ 在物體靜止時同樣無法從畫面判讀。加一組對照棒：
       * 最大靜摩擦 μₛN 與動摩擦 μₖN 並排，並標出目前的驅動力。
       * 驅動力超過上面那條就會開始滑，滑動之後摩擦力掉到下面那條——
       * 這是斜面題最常考、也最常被搞混的一步。
       */
      const gx = W - 186, gy2 = 34, gw = 150;
      const gMax = Math.max(q.fsMax, sMk.get() * q.N, Math.abs(q.drive), 1) * 1.15;
      D.text(ctx, "沿斜面方向的力比較（N）", gx, gy2 - 8, { color: PL.col("text-dim"), size: 10 });
      [["最大靜摩擦 μₛN", q.fsMax, "#7ee0c0"],
       ["動摩擦 μₖN", sMk.get() * q.N, PL.col("warn")],
       ["驅動力（重力分量＋F）", Math.abs(q.drive), PL.col("accent-2")]].forEach((row, i) => {
        const yy = gy2 + i * 22;
        D.rect(ctx, gx, yy, gw, 11, { fill: PL.theme.pale(0.10), r: 5 });
        D.rect(ctx, gx, yy, gw * Math.min(1, row[1] / gMax), 11, { fill: row[2], r: 5 });
        D.text(ctx, row[0] + " " + PL.fmt(row[1], 1), gx, yy + 21,
          { color: row[2], size: 9 });
      });

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
    const row = PL.ui.buttonRow(L.controls); PL.ui.button(row, "釋放", () => { reset(); released = true; if (!model().staticHold) anim.start(); else draw(); }, { primary: true, trigger: true }); PL.ui.button(row, "重設", reset);
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
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv); const length = sLength.get(), a = portion * 9.8, tableY = H * 0.43, edge = W * 0.70, ropeTopStart = 56;
      /*
       * length（繩總長 L）原本讀出來卻沒有用在任何幾何上，畫面只跟著垂落比例變，
       * 於是「繩總長」這根滑桿看起來壞掉了。
       * 這一題的物理是 a = (x/L)·g，L 與 x 都是主角，兩者都該看得見：
       * 繩子的實際長度以滑桿上限 10 m 對應可用寬度，
       * 桌面段與垂落段再依比例分配。
       */
      const L_MAX = 10, ropePx = (edge - ropeTopStart) * (0.25 + 0.75 * length / L_MAX);
      const topLength = Math.max(24, ropePx * (1 - portion));
      const hangLength = Math.max(20, Math.min(H - tableY - 54, ropePx * portion));
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
