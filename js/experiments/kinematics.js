/* 模組一 · 運動學 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw;
  const MC = () => PL.col("m-color", "#4dd0e1");

  /* 等加速度直線運動 */
  PL.register("uniform-accel", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.7);
    const TMAX = 8;
    let t = 0, hist = [];
    const reset = () => { t = 0; hist = []; };
    const sV = PL.ui.slider(L.controls, { label: "初速 v₀", min: -8, max: 20, step: 0.5, value: 6, unit: "m/s", digits: 1, onInput: reset });
    const sA = PL.ui.slider(L.controls, { label: "加速度 a", min: -6, max: 6, step: 0.5, value: 2, unit: "m/s²", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    const bP = PL.ui.button(row, "暫停", () => { anim.toggle(); bP.textContent = anim.running ? "暫停" : "播放"; }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rT = PL.ui.readout(L.readouts, { label: "時間 t", unit: "s" });
    const rX = PL.ui.readout(L.readouts, { label: "位置 x", unit: "m" });
    const rV = PL.ui.readout(L.readouts, { label: "速度 v", unit: "m/s" });

    const st = tt => ({ x: sV.get() * tt + 0.5 * sA.get() * tt * tt, v: sV.get() + sA.get() * tt });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const v0 = sV.get(), a = sA.get(), m = MC();
      let xs = []; for (let i = 0; i <= 40; i++) { const tt = TMAX * i / 40; xs.push(v0 * tt + 0.5 * a * tt * tt); }
      let xmin = Math.min(0, ...xs), xmax = Math.max(0, ...xs); if (xmax - xmin < 2) xmax = xmin + 2;
      const tX0 = 34, tX1 = W - 20, tY = 42;
      const mapX = x => tX0 + (x - xmin) / (xmax - xmin) * (tX1 - tX0);
      D.line(ctx, tX0, tY, tX1, tY, PL.col("text-faint"), 2);
      for (let gx = Math.ceil(xmin / 5) * 5; gx <= xmax; gx += 5) { const px = mapX(gx); D.line(ctx, px, tY - 4, px, tY + 4, PL.col("text-faint"), 1); D.text(ctx, gx + "", px, tY + 16, { color: PL.col("text-faint"), size: 9, align: "center" }); }
      const s = st(t); D.disc(ctx, mapX(s.x), tY, 9, { fill: m, glow: m, glowSize: 14 });
      D.text(ctx, "位置 (m)", tX0, tY - 14, { color: PL.col("text-dim"), size: 11 });

      const gTop = 78, gH = H - gTop - 24, gap = 16, gW = (W - 44 - gap) / 2, gx1 = 30, gx2 = 30 + gW + gap;
      const vend = v0 + a * TMAX; let vmin = Math.min(0, v0, vend), vmax = Math.max(0, v0, vend); if (vmax - vmin < 2) vmax = vmin + 2;
      const g1 = PL.graph(cv, { x: gx1, y: gTop, w: gW, h: gH }, { x0: 0, x1: TMAX, y0: xmin, y1: xmax });
      g1.frame({ title: "x – t 圖", xlabel: "t (s)" }); g1.grid(4, 4);
      g1.fn(tt => v0 * tt + 0.5 * a * tt * tt, { color: "rgba(255,255,255,0.18)", width: 1.5 });
      if (hist.length > 1) g1.curve(hist.map(h => [h[0], h[1]]), { color: m, width: 2.4 });
      g1.dot(t, s.x, { color: m, glow: m });
      const g2 = PL.graph(cv, { x: gx2, y: gTop, w: gW, h: gH }, { x0: 0, x1: TMAX, y0: vmin, y1: vmax });
      g2.frame({ title: "v – t 圖（斜率=a，面積=位移）", xlabel: "t (s)" }); g2.grid(4, 4);
      if (hist.length > 1) g2.area(hist.map(h => [h[0], h[2]]), { fill: "rgba(90,162,255,0.13)" });
      g2.fn(tt => v0 + a * tt, { color: PL.col("accent-2"), width: 2.4 });
      g2.dot(t, s.v, { color: PL.col("accent-2"), glow: PL.col("accent-2") });

      rT.set(t, 2); rX.set(s.x, 1); rV.set(s.v, 1);
    }
    const anim = PL.loop(dt => { if (dt) { t += dt; if (t > TMAX) reset(); const s = st(t); hist.push([t, s.x, s.v]); } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 自由落體 */
  PL.register("freefall", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let t = 0, landed = false, strobe = [];
    const reset = () => { t = 0; landed = false; strobe = []; };
    const sH = PL.ui.slider(L.controls, { label: "初始高度 h", min: 5, max: 80, step: 1, value: 45, unit: "m", digits: 0, onInput: reset });
    const sG = PL.ui.slider(L.controls, { label: "重力加速度 g", min: 1.6, max: 20, step: 0.1, value: 9.8, unit: "m/s²", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    const bP = PL.ui.button(row, "釋放", () => { if (landed) reset(); anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rT = PL.ui.readout(L.readouts, { label: "落下時間", unit: "s" });
    const rV = PL.ui.readout(L.readouts, { label: "速率 v", unit: "m/s" });
    const rY = PL.ui.readout(L.readouts, { label: "剩餘高度", unit: "m" });

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const h = sH.get(), g = sG.get(), m = MC();
      const tFall = Math.sqrt(2 * h / g);
      const groundY = H - 34, topY = 30, scale = (groundY - topY) / h;
      D.line(ctx, 40, groundY, W - 130, groundY, PL.col("text-faint"), 2);
      const fallen = 0.5 * g * t * t; const y = Math.min(h, fallen);
      const px = 130, py = topY + y * scale;
      // 頻閃殘影（等時間間隔）
      strobe.forEach(sy => D.disc(ctx, px, topY + sy * scale, 6, { fill: "rgba(255,255,255,0.10)" }));
      D.disc(ctx, px, py, 12, { fill: m, glow: m, glowSize: 16 });
      D.arrow(ctx, px, py + 16, px, py + 16 + Math.min(46, g * t * 2.4), { color: PL.col("accent-2"), width: 2, label: "v" });
      // 高度刻度
      for (let hh = 0; hh <= h; hh += Math.max(5, Math.round(h / 8 / 5) * 5)) { const yy = topY + (h - hh) * scale; D.line(ctx, 44, yy, 52, yy, PL.col("text-faint"), 1); D.text(ctx, hh + "", 40, yy + 3, { color: PL.col("text-faint"), size: 9, align: "right" }); }

      // v–t 迷你圖
      const bx = W - 118, by = 40, bw = 96, bh = 150;
      const gg = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: tFall, y0: 0, y1: g * tFall });
      gg.frame({ title: "v – t", xlabel: "t" });
      gg.fn(tt => g * tt, { color: PL.col("accent-2"), width: 2 });
      gg.dot(Math.min(t, tFall), Math.min(g * t, g * tFall), { color: m, glow: m });

      rT.set(Math.min(t, tFall), 2); rV.set(Math.min(g * t, g * tFall), 1); rY.set(Math.max(0, h - fallen), 1);
      if (fallen >= h && !landed) { landed = true; anim.stop(); }
    }
    let acc = 0;
    const anim = PL.loop(dt => {
      if (dt && !landed) { t += dt; acc += dt; if (acc > 0.18) { acc = 0; strobe.push(0.5 * sG.get() * t * t); } }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 拋體運動 */
  PL.register("projectile", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const g = 9.8; let t = 0, flying = false, trail = [];
    const sV = PL.ui.slider(L.controls, { label: "初速 v₀", min: 5, max: 40, step: 1, value: 24, unit: "m/s", digits: 0, onInput: reset });
    const sA = PL.ui.slider(L.controls, { label: "發射角 θ", min: 10, max: 80, step: 1, value: 45, unit: "°", digits: 0, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    const bP = PL.ui.button(row, "發射", () => { reset(); flying = true; anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rR = PL.ui.readout(L.readouts, { label: "射程 R", unit: "m" });
    const rHm = PL.ui.readout(L.readouts, { label: "最大高度", unit: "m" });
    const rTf = PL.ui.readout(L.readouts, { label: "飛行時間", unit: "s" });
    const rS = PL.ui.readout(L.readouts, { label: "當前速率", unit: "m/s" });
    function reset() { t = 0; flying = false; trail = []; }
    function params() { const v = sV.get(), th = sA.get() * Math.PI / 180; return { v, th, R: v * v * Math.sin(2 * th) / g, Hm: v * v * Math.sin(th) ** 2 / (2 * g), Tf: 2 * v * Math.sin(th) / g }; }

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const { v, th, R, Hm, Tf } = params(), m = MC();
      const ox = 46, oy = H - 34, worldMax = Math.max(R, Hm * 1.4, 10);
      const sc = Math.min((W - 80) / (R + 1e-3), (oy - 26) / (Hm + 1e-3));
      D.line(ctx, 30, oy, W - 20, oy, PL.col("text-faint"), 2);
      // 發射角指示
      D.arrow(ctx, ox, oy, ox + 42 * Math.cos(th), oy - 42 * Math.sin(th), { color: PL.col("accent-2"), width: 2, label: "v₀" });
      // 理論軌跡
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const tt = Tf * i / 60, x = v * Math.cos(th) * tt, y = v * Math.sin(th) * tt - 0.5 * g * tt * tt; const px = ox + x * sc, py = oy - y * sc; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.stroke(); ctx.restore();
      // 頂點與落點標記
      D.line(ctx, ox + R * sc, oy - 5, ox + R * sc, oy + 5, m, 2);
      D.text(ctx, "R = " + PL.fmt(R, 1) + " m", ox + R * sc, oy + 18, { color: m, size: 10, align: "center" });
      // 飛行中球
      const tt = Math.min(t, Tf), x = v * Math.cos(th) * tt, y = v * Math.sin(th) * tt - 0.5 * g * tt * tt;
      const vx = v * Math.cos(th), vy = v * Math.sin(th) - g * tt, sp = Math.hypot(vx, vy);
      trail.forEach((p, i) => D.disc(ctx, ox + p[0] * sc, oy - p[1] * sc, 2.5, { fill: "rgba(255,255,255,0.28)" }));
      const bx = ox + x * sc, by = oy - y * sc;
      D.disc(ctx, bx, by, 8, { fill: m, glow: m, glowSize: 14 });
      if (flying) { D.arrow(ctx, bx, by, bx + vx * 1.6, by - vy * 1.6, { color: PL.col("accent-2"), width: 1.8 }); }
      rR.set(R, 1); rHm.set(Hm, 1); rTf.set(Tf, 2); rS.set(sp, 1);
    }
    const anim = PL.loop(dt => {
      if (dt && flying) { t += dt; const { th, v, Tf } = params(); const x = v * Math.cos(th) * t, y = v * Math.sin(th) * t - 0.5 * g * t * t; if (y >= 0) trail.push([x, y]); if (t >= Tf) { flying = false; anim.stop(); } }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 相對運動：過河船 */
  PL.register("relative-motion", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    let t = 0;
    const reset = () => { t = 0; };
    const sB = PL.ui.slider(L.controls, { label: "船速（對水）", min: 1, max: 8, step: 0.5, value: 4, unit: "m/s", digits: 1, onInput: reset });
    const sC = PL.ui.slider(L.controls, { label: "水流速度", min: 0, max: 6, step: 0.5, value: 3, unit: "m/s", digits: 1, onInput: reset });
    const sH = PL.ui.slider(L.controls, { label: "船頭方向（對岸法線）", min: -60, max: 60, step: 1, value: 0, unit: "°", digits: 0, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "重新過河", reset, { primary: true });
    const rSpd = PL.ui.readout(L.readouts, { label: "合速率", unit: "m/s" });
    const rT = PL.ui.readout(L.readouts, { label: "渡河時間", unit: "s" });
    const rD = PL.ui.readout(L.readouts, { label: "下游漂移", unit: "m" });
    const RW = 60; // 河寬 m

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const b = sB.get(), c = sC.get(), th = sH.get() * Math.PI / 180, m = MC();
      const vx = c + b * Math.sin(th), vy = b * Math.cos(th); // x下游, y對岸
      const cross = vy > 0 ? RW / vy : Infinity, drift = vy > 0 ? vx * cross : 0;
      const bankTop = 40, bankBot = H - 40, riverH = bankBot - bankTop;
      D.rect(ctx, 0, bankTop, W, riverH, { fill: "rgba(90,162,255,0.08)" });
      D.line(ctx, 0, bankTop, W, bankTop, PL.col("accent-2"), 2);
      D.line(ctx, 0, bankBot, W, bankBot, PL.col("text-faint"), 2);
      D.text(ctx, "對岸", 8, bankTop - 8, { color: PL.col("accent-2"), size: 11 });
      D.text(ctx, "起點岸", 8, bankBot + 18, { color: PL.col("text-dim"), size: 11 });
      // 水流箭頭
      for (let i = 0; i < 5; i++) { const yy = bankBot - riverH * (i + 0.5) / 5; D.arrow(ctx, 30, yy, 30 + c * 8, yy, { color: "rgba(90,162,255,0.4)", width: 1.5 }); }
      const sc = riverH / RW, ox = 90, oy = bankBot;
      const prog = Math.min(t, isFinite(cross) ? cross : 6);
      const bx = ox + vx * prog * sc, by = oy - vy * prog * sc;
      // 實際路徑
      D.line(ctx, ox, oy, bx, by, "rgba(255,255,255,0.25)", 1.5, [4, 4]);
      D.disc(ctx, bx, by, 9, { fill: m, glow: m, glowSize: 12 });
      // 速度向量
      D.arrow(ctx, bx, by, bx + b * Math.sin(th) * 6, by - b * Math.cos(th) * 6, { color: MC(), width: 2, label: "船" });
      D.arrow(ctx, bx, by, bx + c * 6, by, { color: PL.col("accent-2"), width: 2, label: "水流" });
      D.arrow(ctx, bx, by, bx + vx * 6, by - vy * 6, { color: PL.col("warn"), width: 2.4, label: "合" });
      rSpd.set(Math.hypot(vx, vy), 2); rT.set(cross, 2); rD.set(drift, 1);
    }
    const anim = PL.loop(dt => { if (dt) { const b = sB.get(), th = sH.get() * Math.PI / 180, vy = b * Math.cos(th); const cross = vy > 0 ? RW / vy : 6; t += dt; if (t > cross) t = 0; } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 運動圖形分析 x-t / v-t / a-t */
  PL.register("vt-graph", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.78);
    const TMAX = 6;
    const sV = PL.ui.slider(L.controls, { label: "初速 v₀", min: -6, max: 12, step: 0.5, value: 3, unit: "m/s", digits: 1, onInput: draw });
    const sA = PL.ui.slider(L.controls, { label: "加速度 a", min: -4, max: 4, step: 0.5, value: 1.5, unit: "m/s²", digits: 1, onInput: draw });
    const sT = PL.ui.slider(L.controls, { label: "時間游標 t", min: 0, max: TMAX, step: 0.1, value: 3, unit: "s", digits: 1, onInput: draw });
    PL.ui.note(L.controls, "x–t 的斜率即 v–t 的值；v–t 的斜率即 a；v–t 曲線下的面積即位移。");
    const rX = PL.ui.readout(L.readouts, { label: "x(t)", unit: "m" });
    const rV = PL.ui.readout(L.readouts, { label: "v(t)", unit: "m/s" });
    const rA = PL.ui.readout(L.readouts, { label: "a(t)", unit: "m/s²" });

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const v0 = sV.get(), a = sA.get(), tc = sT.get(), m = MC();
      const fx = tt => v0 * tt + 0.5 * a * tt * tt, fv = tt => v0 + a * tt;
      let xs = []; for (let i = 0; i <= 30; i++) xs.push(fx(TMAX * i / 30));
      let xmin = Math.min(0, ...xs), xmax = Math.max(0, ...xs); if (xmax - xmin < 2) xmax = xmin + 2;
      const vend = fv(TMAX); let vmin = Math.min(0, v0, vend), vmax = Math.max(0, v0, vend); if (vmax - vmin < 2) vmax = vmin + 2;
      const amin = Math.min(0, a) - 1, amax = Math.max(0, a) + 1;
      const pad = 30, gW = W - pad - 16, gH = (H - 40) / 3 - 12;
      const mk = (i, dom, title, fn, col2) => {
        const g = PL.graph(cv, { x: pad, y: 16 + i * (gH + 14), w: gW, h: gH }, dom);
        g.frame({ title, xlabel: "t (s)" }); g.grid(6, 3);
        if (i === 1) g.area([[0, 0]].concat(Array.from({ length: 31 }, (_, k) => { const tt = tc * k / 30; return [tt, fn(tt)]; })), { fill: "rgba(90,162,255,0.14)" });
        g.fn(fn, { color: col2, width: 2.4 });
        g.vline(tc, { color: m, dash: [4, 3], width: 1.5 });
        g.dot(tc, fn(tc), { color: m, glow: m });
        return g;
      };
      mk(0, { x0: 0, x1: TMAX, y0: xmin, y1: xmax }, "x – t 位置", fx, MC());
      mk(1, { x0: 0, x1: TMAX, y0: vmin, y1: vmax }, "v – t 速度（面積=位移）", fv, PL.col("accent-2"));
      mk(2, { x0: 0, x1: TMAX, y0: amin, y1: amax }, "a – t 加速度", () => a, PL.col("accent-3"));
      rX.set(fx(tc), 2); rV.set(fv(tc), 2); rA.set(a, 2);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 打點計時器（測速度與加速度） */
  PL.register("ticker-tape", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    const sV = PL.ui.slider(L.controls, { label: "初速 v₀", min: 0, max: 8, step: 0.5, value: 2, unit: "m/s", digits: 1, onInput: draw });
    const sA = PL.ui.slider(L.controls, { label: "加速度 a", min: 0, max: 8, step: 0.5, value: 3, unit: "m/s²", digits: 1, onInput: draw });
    const sT = PL.ui.slider(L.controls, { label: "打點週期 T", min: 0.02, max: 0.1, step: 0.01, value: 0.05, unit: "s", digits: 2, onInput: draw });
    PL.ui.note(L.controls, "點距等差增加代表等加速；相鄰點距差 ÷ T² 即加速度。");
    const rV = PL.ui.readout(L.readouts, { label: "第 5 點速度", unit: "m/s" });
    const rA = PL.ui.readout(L.readouts, { label: "量得加速度", unit: "m/s²" });
    const rT = PL.ui.readout(L.readouts, { label: "每格時間", unit: "s" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const v0 = sV.get(), a = sA.get(), T = sT.get(), N = 13;
      const xn = k => v0 * (k * T) + 0.5 * a * (k * T) * (k * T);
      const total = xn(N) || 1, sc = (W - 60) / total, ty = H * 0.4;
      D.rect(ctx, 20, ty - 22, W - 40, 44, { fill: "rgba(255,255,255,0.04)", stroke: PL.col("border"), width: 1, r: 6 });
      D.text(ctx, "點距（cm）逐格增加 →", 30, ty - 30, { color: PL.col("text-dim"), size: 11 });
      for (let k = 0; k <= N; k++) { const px = 30 + xn(k) * sc; if (px < W - 24) D.disc(ctx, px, ty, 3, { fill: k === 5 ? MC() : "#e6edf3" }); }
      for (let k = 0; k < 5; k++) { const x1 = 30 + xn(k) * sc, x2 = 30 + xn(k + 1) * sc; D.line(ctx, x1, ty + 16, x2, ty + 16, PL.col("text-faint"), 1); D.text(ctx, PL.fmt((xn(k + 1) - xn(k)) * 100, 1), (x1 + x2) / 2, ty + 30, { color: PL.col("text-faint"), size: 9, align: "center" }); }
      const v5 = (xn(6) - xn(4)) / (2 * T), am = ((xn(6) - xn(5)) - (xn(5) - xn(4))) / (T * T);
      rV.set(v5, 2); rA.set(am, 2); rT.set(T, 2);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});
})();
