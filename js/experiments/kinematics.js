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
    /* 播放／暫停由引擎的傳輸列統一提供（還附單步與速度），實驗不再自備，避免兩個開關互相打架。 */
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
      cv.calibrate(scale, "m");   // 讓可拖曳的尺能直接量落下高度
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
  /* 拋體運動 —— 旗艦改版
   *
   * PhET 的《Look and Feel》在「鼓勵探索」一節指出幾件事，這一版照著做：
   *   · 用生活中認得出來的物件，卡通化但不誤導
   *   · 學生會刻意把參數推到極端，測試模擬會不會有合理的反應
   *   · 小謎題會讓學生自己去玩到弄懂為止
   *   · 模擬要好玩，學生才願意一直操作
   *
   * 因此這裡不是「一條拋物線加兩個讀數」，而是一座可以瞄準的大砲：
   *   - 可以選擇發射物（保齡球到氣球，質量差 140 倍）
   *   - 有靶，打中會有明確回饋，落點會留下痕跡
   *   - 可以開空氣阻力。開了以後軌跡不再對稱，45° 也不再是最遠角度——
   *     而且此時「質量」突然變得有影響，這是真空版本永遠看不到的事。
   */
  PL.register("projectile", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.52, 860);
    const g = 9.8;

    /* 發射物：質量差距刻意拉大，才看得出空氣阻力對輕重物體的差別 */
    const AMMO = {
      bowling: { label: "保齡球", mass: 7.0, radius: 0.11, drag: 0.47, color: "#4a5568", accent: "#151b24" },
      basket: { label: "籃球", mass: 0.62, radius: 0.12, drag: 0.47, color: "#dd7b3b", accent: "#7a3a12" },
      melon: { label: "西瓜", mass: 4.0, radius: 0.14, drag: 0.50, color: "#4f9d5a", accent: "#24512b" },
      balloon: { label: "氣球", mass: 0.05, radius: 0.15, drag: 0.55, color: "#d9598f", accent: "#7d264c" }
    };
    let ammoKey = "basket";

    let t = 0, flying = false, shots = [], flash = 0;

    PL.ui.section(L.controls, "發射參數");
    const sV = PL.ui.stepper(L.controls, { label: "初速 v₀ (m/s)", value: 24, min: 5, max: 45, step: 1, onInput: onParam });
    const sA = PL.ui.stepper(L.controls, { label: "發射角 θ (°)", value: 45, min: 5, max: 85, step: 1, onInput: onParam });
    const sH = PL.ui.slider(L.controls, { label: "砲台高度 h₀", min: 0, max: 15, step: 0.5, value: 0, unit: "m", digits: 1, onInput: onParam });

    PL.ui.section(L.controls, "發射物");
    PL.ui.chipGroup(L.controls, {
      value: ammoKey,
      options: Object.keys(AMMO).map(k => ({ value: k, label: AMMO[k].label })),
      onChange: v => { ammoKey = v; onParam(); }
    });

    PL.ui.section(L.controls, "條件");
    const cDrag = PL.ui.checkbox(L.controls, { label: "加入空氣阻力", checked: false, onChange: onParam });
    const sTarget = PL.ui.slider(L.controls, { label: "靶的距離", min: 10, max: 120, step: 1, value: 55, unit: "m", digits: 0, onInput: onParam });

    PL.ui.section(L.controls, "顯示");
    const layers = PL.ui.chipGroup(L.controls, {
      multi: true, value: ["traj", "vcomp", "marks", "shots"],
      options: [
        { value: "traj", label: "預測軌跡" }, { value: "vcomp", label: "速度分量" },
        { value: "marks", label: "頂點/射程" }, { value: "shots", label: "歷次落點" }
      ]
    });

    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "發射", () => { t = 0; flash = 0; flying = true; }, { primary: true });
    PL.ui.button(row, "清除落點", () => { shots = []; t = 0; flying = false; flash = 0; drawAll(); });

    PL.ui.note(L.controls,
      "先在真空下找出射程最遠的角度，再打開空氣阻力重找一次——最佳角度會往下移。" +
      "接著換成氣球和保齡球各射一次：真空時兩者軌跡完全相同，有空氣阻力時差距會大到你以為程式壞了。");

    const rR = PL.ui.readout(L.readouts, { label: "射程 R", unit: "m" });
    const rHm = PL.ui.readout(L.readouts, { label: "最大高度", unit: "m" });
    const rTf = PL.ui.readout(L.readouts, { label: "飛行時間", unit: "s" });
    const rS = PL.ui.readout(L.readouts, { label: "當前速率", unit: "m/s" });
    const rHit = PL.ui.readout(L.readouts, { label: "距靶心", unit: "m" });

    const charts = PL.el("div", "sim-charts", root);
    const w1 = PL.el("div", "sim-chart", charts);
    PL.el("div", "chart-title", w1).textContent = "射程 R 對 發射角 θ";
    const cvR = PL.canvas.create(w1, 0.58);
    PL.el("div", "cap", w1).textContent =
      "真空時 R = v₀²sin2θ/g，45° 最遠、互餘角射程相同。加入空氣阻力後曲線會左傾，最佳角度降到 40° 以下，對稱性也不見了。";

    /*
     * 數值積分求軌跡
     * 有空氣阻力時沒有簡潔的解析解，因此一律用數值積分，
     * 讀數也從模擬出來的路徑取值，確保「畫面」與「數字」永遠一致。
     * 阻力用 F = ½ρC_dA·v²，方向與速度相反。
     */
    function simulate() {
      const ammo = AMMO[ammoKey];
      const v0 = sV.get(), th = sA.get() * Math.PI / 180, h0 = sH.get();
      const area = Math.PI * ammo.radius * ammo.radius;
      const k = cDrag.get() ? 0.5 * 1.225 * ammo.drag * area / ammo.mass : 0;

      const dt = 0.004;
      let x = 0, y = h0, vx = v0 * Math.cos(th), vy = v0 * Math.sin(th);
      const path = [[0, h0, Math.hypot(vx, vy)]];
      let peak = h0, time = 0;

      // 上限保護：極端參數下不要讓迴圈失控
      for (let step = 0; step < 12000; step += 1) {
        const speed = Math.hypot(vx, vy);
        vx += -k * speed * vx * dt;
        vy += (-g - k * speed * vy) * dt;
        const prevX = x, prevY = y;
        x += vx * dt; y += vy * dt;
        time += dt;
        if (y > peak) peak = y;
        if (y <= 0) {
          // 線性內插回到 y = 0 的那一刻，射程才不會受步長影響
          const frac = prevY / (prevY - y || 1);
          x = prevX + (x - prevX) * frac;
          time -= dt * (1 - frac);
          path.push([x, 0, Math.hypot(vx, vy)]);
          break;
        }
        if (step % 3 === 0) path.push([x, y, speed]);
      }
      return { path, range: x, peak, time, ammo, v0, th, h0 };
    }

    let model = simulate();

    function onParam() { t = 0; flying = false; flash = 0; model = simulate(); }

    /* 射程對角度：有阻力時要逐點積分，才看得到最佳角度的移動 */
    function rangeAt(angleDeg) {
      const ammo = AMMO[ammoKey];
      const v0 = sV.get(), h0 = sH.get(), th = angleDeg * Math.PI / 180;
      const area = Math.PI * ammo.radius * ammo.radius;
      const k = cDrag.get() ? 0.5 * 1.225 * ammo.drag * area / ammo.mass : 0;
      const dt = 0.01;
      let x = 0, y = h0, vx = v0 * Math.cos(th), vy = v0 * Math.sin(th);
      for (let i = 0; i < 4000; i += 1) {
        const speed = Math.hypot(vx, vy);
        vx += -k * speed * vx * dt;
        vy += (-g - k * speed * vy) * dt;
        x += vx * dt; y += vy * dt;
        if (y <= 0) break;
      }
      return Math.max(0, x);
    }

    function scene() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const m = MC();
      const path = model.path, range = model.range, peak = model.peak, time = model.time;
      const ammo = model.ammo, th = model.th, h0 = model.h0;
      const target = sTarget.get();

      const ox = 62, oy = H - 46;
      const spanX = Math.max(range, target) * 1.18 + 6;
      const spanY = Math.max(peak, h0) * 1.35 + 4;
      const sc = Math.min((W - ox - 40) / spanX, (oy - 26) / spanY);
      const px = xm => ox + xm * sc;
      const py = ym => oy - ym * sc;
      cv.calibrate(sc, "m");

      // 地面與距離刻度
      D.rect(ctx, 20, oy, W - 40, 5, { fill: PL.theme.pale(0.16), r: 2 });
      D.line(ctx, 20, oy, W - 20, oy, PL.col("text-faint"), 1.5);
      const gridStep = spanX > 90 ? 20 : 10;
      for (let d = gridStep; d < spanX; d += gridStep) {
        if (px(d) > W - 24) break;
        D.line(ctx, px(d), oy, px(d), oy + 5, PL.theme.pale(0.22), 1);
        D.text(ctx, String(d), px(d), oy + 17, { color: PL.col("text-faint"), size: 9, align: "center" });
      }

      // 砲台與砲管：角度看得見，就不用一直回頭確認滑桿
      const baseY = py(h0);
      if (h0 > 0.05) {
        D.rect(ctx, ox - 18, baseY, 32, oy - baseY, { fill: PL.theme.pale(0.14), stroke: PL.theme.pale(0.28), r: 2 });
      }
      ctx.save();
      ctx.translate(ox, baseY);
      ctx.rotate(-th);
      D.rect(ctx, -6, -9, 46, 18, { fill: m, stroke: PL.theme.pale(0.35), width: 1.5, r: 4 });
      ctx.restore();
      D.disc(ctx, ox, baseY, 13, { fill: PL.theme.pale(0.22), stroke: PL.theme.pale(0.4) });
      D.text(ctx, sA.get() + "°", ox - 24, baseY - 16, { color: PL.col("accent-2"), size: 12, weight: "700", align: "right" });

      // 靶：打中與否要一眼看得出來
      const tx = px(target);
      const hitDistance = Math.abs(range - target);
      const isHit = hitDistance <= 1.5;
      if (tx < W - 16) {
        const tc = isHit ? PL.col("ok") : PL.col("danger");
        D.rect(ctx, tx - 2, oy - 16, 4, 16, { fill: PL.theme.pale(0.3) });
        [13, 8, 4].forEach((r, i) => {
          D.disc(ctx, tx, oy - 22, r, { fill: i === 1 ? "#f2f4f7" : tc });
        });
        D.text(ctx, target + " m", tx, oy + 30, { color: tc, size: 10, align: "center", weight: "700" });
      }

      // 歷次落點：換條件重射時，差異會自己浮現
      if (layers.has("shots")) {
        shots.forEach(s => {
          D.disc(ctx, px(s.x), oy - 3, 3, { fill: PL.theme.pale(0.34) });
          D.text(ctx, s.label, px(s.x), oy - 11, { color: PL.col("text-faint"), size: 8.5, align: "center" });
        });
      }

      // 預測軌跡
      if (layers.has("traj") && path.length > 1) {
        ctx.save();
        ctx.strokeStyle = "rgba(120,190,220,0.42)"; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
        ctx.beginPath();
        path.forEach((p, i) => (i ? ctx.lineTo(px(p[0]), py(p[1])) : ctx.moveTo(px(p[0]), py(p[1]))));
        ctx.stroke(); ctx.restore();
      }

      if (layers.has("marks")) {
        D.line(ctx, px(range), oy - 7, px(range), oy + 7, m, 2);
        D.text(ctx, "R=" + PL.fmt(range, 1) + "m", px(range), oy - 13, { color: m, size: 10, align: "center" });
        const apex = path.reduce((best, p) => (p[1] > best[1] ? p : best), path[0]);
        D.line(ctx, px(apex[0]), py(apex[1]), px(apex[0]), oy, PL.theme.pale(0.16), 1, [3, 3]);
        D.text(ctx, "H=" + PL.fmt(peak, 1) + "m", px(apex[0]) + 5, py(apex[1]) - 5, { color: PL.col("text-dim"), size: 10 });
      }

      // 飛行中的發射物
      const frac = time > 0 ? Math.min(1, t / time) : 0;
      const idx = Math.min(path.length - 1, Math.max(0, Math.floor(frac * (path.length - 1))));
      const now = path[idx];
      const bx = px(now[0]), by = py(now[1]);
      const rpx = Math.max(5, ammo.radius * sc * 2.2);
      D.disc(ctx, bx, by, rpx, { fill: ammo.color, stroke: ammo.accent, width: 2 });
      if (ammoKey === "basket") {
        D.line(ctx, bx - rpx, by, bx + rpx, by, ammo.accent, 1.2);
        D.ring(ctx, bx, by, rpx * 0.6, ammo.accent, 1.2);
      }
      if (ammoKey === "balloon") {
        D.line(ctx, bx, by + rpx, bx, by + rpx + 7, ammo.accent, 1.2);
      }

      if (layers.has("vcomp") && path.length > 1) {
        const nxt = path[Math.min(path.length - 1, idx + 1)];
        const dx = nxt[0] - now[0], dy = nxt[1] - now[1];
        const norm = Math.hypot(dx, dy) || 1;
        const len = 34;
        D.arrow(ctx, bx, by, bx + dx / norm * len, by, { color: PL.col("accent-2"), width: 2, head: 7, label: "vₓ" });
        D.arrow(ctx, bx, by, bx, by - dy / norm * len, { color: PL.col("warn"), width: 2, head: 7, label: "v_y" });
      }

      // 落地瞬間給明確回饋——學生要知道自己有沒有打中
      if (flash > 0) {
        const ring = (1 - flash) * 40 + 8;
        ctx.save(); ctx.globalAlpha = flash;
        D.ring(ctx, px(range), oy - 12, ring, isHit ? PL.col("ok") : PL.col("danger"), 3);
        ctx.restore();
        D.text(ctx, isHit ? "命中！" : (range > target ? "太遠了" : "距離不夠"),
          px(range), oy - 46, { color: isHit ? PL.col("ok") : PL.col("danger"), size: 15, align: "center", weight: "700" });
      }

      PL.ui.caption(cv, cDrag.get()
        ? "空氣阻力已開啟：軌跡上升與下降不再對稱，質量越小受影響越大。"
        : "目前為真空狀態：軌跡完全對稱，換任何發射物結果都一樣。");

      rR.set(range, 1); rHm.set(peak, 1); rTf.set(time, 2);
      rS.set(now[2], 1); rHit.set(hitDistance, 1);
    }

    function chart() {
      cvR.clear();
      const samples = [];
      for (let a = 5; a <= 85; a += 5) samples.push([a, rangeAt(a)]);
      const maxR = Math.max.apply(null, samples.map(s => s[1]).concat([1]));
      const gph = PL.graph(cvR, { x: 42, y: 14, w: cvR.W - 56, h: cvR.H - 36 }, { x0: 0, x1: 90, y0: 0, y1: maxR * 1.12 });
      gph.frame({ xlabel: "θ (°)", ylabel: "R (m)" });
      gph.grid(6, 4);
      gph.curve(samples, { color: MC(), width: 2.2 });
      // 標出最佳角度：有阻力時它會明顯離開 45°
      const best = samples.reduce((a, b) => (b[1] > a[1] ? b : a), samples[0]);
      gph.vline(best[0], { color: PL.col("warn"), dash: [4, 3], width: 1.4 });
      gph.label(best[0] + 2, maxR * 0.92, "最遠 " + best[0] + "°", { color: PL.col("warn"), size: 10 });
      gph.dot(sA.get(), rangeAt(sA.get()), { r: 4.5, color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }

    function drawAll() { scene(); chart(); }

    const anim = PL.loop(dt => {
      if (dt) {
        if (flying) {
          t += dt;
          if (t >= model.time) {
            t = model.time; flying = false; flash = 1;
            shots.push({ x: model.range, label: AMMO[ammoKey].label + (cDrag.get() ? "·阻力" : "") });
            if (shots.length > 6) shots.shift();
          }
        }
        if (flash > 0) flash = Math.max(0, flash - dt * 1.2);
      }
      scene();
    }, 50);

    cv.onResize(scene); cvR.onResize(chart);
    drawAll(); anim.start();
    return {
      stop() { anim.stop(); cv.destroy(); cvR.destroy(); },
      rerender() { model = simulate(); drawAll(); }
    };
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
