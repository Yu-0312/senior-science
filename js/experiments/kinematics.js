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
      /*
       * 理論曲線用主題變數而不是寫死的白色。
       * 舊版寫 rgba(255,255,255,0.18)，淺色主題下白線畫在近白的圖表底板上，
       * x–t 圖看起來整張是空的——而「位置隨時間怎麼變」正是這個實驗要教的。
       * 畫成虛線是為了和實際走過的軌跡（實線）分開：虛線是預測，實線是量到的。
       */
      g1.fn(tt => v0 * tt + 0.5 * a * tt * tt, { color: PL.col("text-faint"), width: 1.6, dash: [5, 4] });
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
    const bP = PL.ui.button(row, "釋放", () => { if (landed) reset(); anim.start(); }, { primary: true, trigger: true });
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

    /*
     * 用 landed 停止、t 一律驅動位置，而不是用 flying 當「要不要推進」的開關。
     *
     * 舊版：發射把 flying 設成 true，迴圈只在 flying 時推進 t，而球的位置本來就是
     * 純用 t 算的。這造成兩個問題：發射鈕沒有 start()，得先按傳輸列的播放才會動
     * （兩個開關）；而且傳輸列的「單步」推進的是迴圈、不是 flying，所以逐格看根本沒反應。
     * 改成 landed 之後，發射＝t 歸零並開跑、落地＝停住，單步也能一格一格把球往前推。
     */
    let t = 0, landed = false, shots = [], flash = 0;

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
    /* trigger: true → 這顆就是唯一的「開始」，按下時引擎會順便啟動迴圈並藏掉傳輸列的播放。 */
    PL.ui.button(row, "發射", () => { t = 0; flash = 0; landed = false; }, { primary: true, trigger: true });
    PL.ui.button(row, "清除落點", () => { shots = []; t = 0; landed = false; flash = 0; anim.stop(); drawAll(); });

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

    function onParam() { t = 0; landed = false; flash = 0; model = simulate(); }

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
        // 只要還沒落地就推進 t——不論是傳輸列的單步，還是發射後的連續播放，走的都是這條路。
        if (!landed) {
          t += dt;
          if (t >= model.time) {
            t = model.time; landed = true; flash = 1;
            anim.stop();                     // 一次性運動，落地即停，不空轉
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
  /* 打點計時器 —— 小車拉著紙帶跑，計時器一點一點打上去
   *
   * 舊版是一張靜態插圖：紙帶上的點一開始就全部畫好了。
   * 那等於直接把答案攤在學生面前，而這個實驗真正要建立的因果是相反方向的——
   * 「因為小車在加速，所以後面的點才會越拉越開」。點先出現，因果就不見了。
   *
   * 所以這一版把實驗做完整：
   *   上半是實驗台，小車在軌道上前進，紙帶被它拉著穿過固定的計時器，
   *   每打一點，打點錘就落下閃一次——點是「當場被打出來的」，不是本來就在那。
   *   下半是同一條紙帶攤平後的樣子，也就是學生真正拿去量的那張紙。
   *
   * 還沒按開始時，紙帶上會有一排淡淡的預測點。
   * 這不是裝飾：實驗課的順序本來就是「先算出你預期看到什麼，再去量」，
   * 而且拉滑桿時看得到預測跟著變，不必先跑一次才知道參數有沒有效。
   */
  PL.register("ticker-tape", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66, 900);

    const N = 13;              // 觀察的打點間隔數
    const SLOW = 0.12;         // 慢動作：真實只有零點幾秒，直接播完全看不清楚
    let t = 0, dots = 0, flash = 0;

    PL.ui.section(L.controls, "小車的運動");
    const sV = PL.ui.slider(L.controls, { label: "初速 v₀", min: 0, max: 8, step: 0.5, value: 2, unit: "m/s", digits: 1, onInput: reset });
    const sA = PL.ui.slider(L.controls, { label: "加速度 a", min: 0, max: 8, step: 0.5, value: 3, unit: "m/s²", digits: 1, onInput: reset });
    PL.ui.section(L.controls, "計時器");
    const sT = PL.ui.slider(L.controls, { label: "打點週期 T", min: 0.02, max: 0.1, step: 0.01, value: 0.05, unit: "s", digits: 2, onInput: reset });

    PL.ui.presets(L.controls, {
      label: "情境",
      options: [
        { label: "等速前進", hint: "沒有加速度時，點距從頭到尾一樣——這是判斷等速的依據",
          apply: () => { sV.set(3); sA.set(0); reset(); } },
        { label: "從靜止加速", hint: "起點附近的點會擠成一團，這正是實驗課要求「捨棄開頭」的原因",
          apply: () => { sV.set(0); sA.set(4); reset(); } },
        { label: "50 Hz 市電計時器", hint: "台灣市電 60 Hz，實驗室常用的計時器多為 50 或 60 Hz",
          apply: () => { sT.set(0.02); reset(); } }
      ]
    });

    const row = PL.ui.buttonRow(L.controls);
    /*
     * 「開始」是單向觸發，不是播放／暫停開關：它把紙帶清空、小車拉回起點、開始跑。
     * 暫停、單步與速度一律由引擎的傳輸列負責；實驗自己再做一個開關的話，
     * 兩個開關必須同時打開才會動，而傳輸列按了沒反應時學生看不出原因。
     */
    PL.ui.button(row, "開始", () => { t = 0; dots = 0; flash = 0; anim.start(); draw(); }, { primary: true, trigger: true });
    PL.ui.button(row, "重設", reset);

    function reset() { t = 0; dots = 0; flash = 0; anim.stop(); draw(); }

    PL.ui.note(L.controls,
      "先按「從靜止加速」再按開始：注意紙帶最前面那幾個點會擠成一團，幾乎分不出來。" +
      "實驗課要求捨棄開頭那段，不是因為它不重要，而是因為那裡的量測誤差比點距本身還大。");

    const T_END = () => N * sT.get();
    const xAt = tt => sV.get() * tt + 0.5 * sA.get() * tt * tt;   // 小車位移（m）
    const xn = k => xAt(k * sT.get());                            // 第 k 點的位置

    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—", meter: true });
    const rV = PL.ui.readout(L.readouts, { label: "第 5 點速度", unit: "m/s" });
    const rA = PL.ui.readout(L.readouts, { label: "量得加速度", unit: "m/s²" });
    const rT = PL.ui.readout(L.readouts, { label: "每格時間", unit: "s" });
    const rN = PL.ui.readout(L.readouts, { label: "已打點數", unit: "點" });

    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "第 5 段點距 x₅", unit: "cm", hint: "第 5 點到第 6 點的距離" },
      { label: "點距差 Δ", unit: "cm", hint: "相鄰兩段點距相減，等加速時是定值" },
      { label: "T²", unit: "s²", hint: "打點週期的平方" },
      { label: "a = Δ / T²", unit: "m/s²", hint: "紙帶求加速度的標準式" }
    ]);

    PL.ui.causality(L.canvasWrap.parentNode, {
      title: "為什麼一條紙帶就能算出加速度",
      rows: [
        { name: "每格時間都一樣", tone: "a", note: "計時器的週期 T 是固定的，所以點距不必再除以時間就能直接比較——點距長短本身就代表速度快慢。" },
        { name: "點距 = 那一格的平均速度 × T", tone: "b", note: "所以量點距等於在量速度。這是整個實驗成立的關鍵一步。" },
        { name: "點距等差增加 → 等加速", tone: "c", note: "每格速度增加同樣多，就是等加速度。相鄰點距的差 Δ 除以 T² 即為 a。" }
      ]
    });

    PL.ui.procedure(L.controls, {
      title: "打點計時器實驗的標準流程",
      steps: [
        "紙帶穿過計時器、一端固定在小車後方。<strong>先按下計時器讓它開始打點，再放開小車</strong>。",
        "小車跑完後取下紙帶，找到開頭那段擠在一起的點，<strong>整段捨棄</strong>，從看得清楚的點開始編號 0、1、2……",
        "把尺的零刻度對準第 0 點，<strong>一次量到每一點</strong>並記下累積距離，再相減得到各段點距。",
        "第 5 點的瞬時速度用 <strong>(x₆ − x₄) / 2T</strong>，加速度用相鄰點距差除以 T²。"
      ],
      rule: "順序錯了整條紙帶就作廢：<strong>先啟動計時器、再放開小車</strong>——反過來的話，前幾個點是小車還沒動時打的，全部疊在同一個位置。" +
            "另外點距一定要<strong>從同一個零點一次量到底</strong>再相減；一段一段量會把每次對準的誤差累積起來。"
      });

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const v0 = sV.get(), a = sA.get(), T = sT.get();
      const total = xn(N) || 1;

      /* ---------- 上半：實驗台 ---------- */
      const trackY = H * 0.40, x0 = 132, x1 = W - 34;
      const sc = (x1 - x0) / total;                 // 每公尺對應的像素
      cv.calibrate(sc, "m");
      const carX = x0 + xAt(t) * sc;

      /*
       * 軌道用 pale 而不是 shade。
       *
       * theme.shade() 的意思是「比面板再凹進去一層的表面」，只有在淺色主題下才是可見的；
       * 深色主題它回傳近黑色，對實驗台底板的對比只有 1.01——等於沒畫。
       * 第一版用 shade 畫軌道又沒有描邊，於是深色主題下小車看起來浮在半空。
       * 要被看見的東西一律用 theme.pale()，它會隨主題翻面。
       */
      D.rect(ctx, x0 - 8, trackY + 12, x1 - x0 + 16, 7,
        { fill: PL.theme.pale(0.16), stroke: PL.theme.pale(0.34), width: 1, r: 3 });
      for (let m = 0; m <= total; m += Math.max(0.1, Math.round(total / 8 * 10) / 10)) {
        const px = x0 + m * sc;
        if (px > x1) break;
        D.line(ctx, px, trackY + 19, px, trackY + 25, PL.col("text-faint"), 1);
        D.text(ctx, PL.fmt(m, 1), px, trackY + 36, { color: PL.col("text-faint"), size: 9, align: "center" });
      }
      D.text(ctx, "位置 (m)", x0, trackY + 52, { color: PL.col("text-faint"), size: 10 });

      // 紙帶：從小車後方拉回來，穿過計時器再露出一小截
      const tapeY = trackY - 26;
      D.rect(ctx, 26, tapeY - 7, carX - 26, 14, { fill: PL.theme.pale(0.10), stroke: PL.theme.pale(0.26), width: 1 });
      // 紙帶上已經打好的點（跟著紙帶一起往右移動）
      for (let k = 0; k < dots; k++) {
        const px = carX - (xAt(t) - xn(k)) * sc;
        if (px > 26 && px < carX - 2) D.disc(ctx, px, tapeY, 2.6, { fill: k === 5 ? MC() : PL.col("text-dim") });
      }

      // 打點計時器本體（固定在桌上，紙帶從它底下通過）
      const tx = 92;
      D.rect(ctx, tx - 34, tapeY - 46, 68, 34, { fill: PL.theme.pale(0.13), stroke: PL.theme.pale(0.42), width: 1.4, r: 5 });
      D.text(ctx, "計時器", tx, tapeY - 25, { color: PL.col("text-dim"), size: 10, align: "center" });
      D.text(ctx, PL.fmt(1 / T, 0) + " Hz", tx, tapeY - 14, { color: PL.col("accent-2"), size: 9, align: "center" });
      // 打點錘：剛打完的那一瞬間落下並發亮
      const hit = flash > 0;
      D.line(ctx, tx, tapeY - 12, tx, tapeY - (hit ? 3 : 7),
        hit ? PL.col("warn") : PL.col("text-faint"), hit ? 3 : 2);
      if (hit) D.disc(ctx, tx, tapeY, 5, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 12 });

      // 小車
      const cw = 34, ch = 18;
      D.rect(ctx, carX - cw / 2, trackY - ch + 12, cw, ch, { fill: MC(), stroke: PL.theme.pale(0.35), r: 3 });
      D.disc(ctx, carX - 10, trackY + 12, 4.5, { fill: PL.col("text-dim") });
      D.disc(ctx, carX + 10, trackY + 12, 4.5, { fill: PL.col("text-dim") });
      // 速度箭頭：長度正比於當前速率，停著的時候不畫
      const vNow = v0 + a * t;
      if (t > 0 && vNow > 0) {
        D.arrow(ctx, carX + cw / 2, trackY + 3, carX + cw / 2 + Math.min(60, vNow * 7), trackY + 3,
          { color: PL.col("accent-2"), width: 2, label: "v = " + PL.fmt(vNow, 1) });
      }

      /* ---------- 下半：攤平的紙帶（拿去量的那一張） ---------- */
      const ty = H * 0.78, tapeX0 = 30, tapeX1 = W - 24;
      const tsc = (tapeX1 - tapeX0) / total;
      D.text(ctx, "取下後攤平的紙帶", tapeX0, ty - 34, { color: PL.col("text-dim"), size: 11 });
      D.rect(ctx, tapeX0 - 6, ty - 22, tapeX1 - tapeX0 + 12, 44,
        { fill: PL.theme.pale(0.07), stroke: PL.col("border"), width: 1, r: 6 });

      // 預測點：還沒打到的位置先用淡點標出來，讓「預期」與「實測」可以對照
      for (let k = 0; k <= N; k++) {
        if (k < dots) continue;
        const px = tapeX0 + xn(k) * tsc;
        if (px <= tapeX1) D.disc(ctx, px, ty, 2.4, { fill: PL.theme.pale(0.30) });
      }
      // 實際打出來的點
      for (let k = 0; k < dots; k++) {
        const px = tapeX0 + xn(k) * tsc;
        if (px <= tapeX1) D.disc(ctx, px, ty, 3.2, { fill: k === 5 ? MC() : PL.col("text"), glow: k === dots - 1 ? PL.col("warn") : null, glowSize: 10 });
      }
      // 點距標註：只標已經打出來的段落，避免預告答案
      for (let k = 0; k < Math.min(5, Math.max(0, dots - 1)); k++) {
        const a1 = tapeX0 + xn(k) * tsc, a2 = tapeX0 + xn(k + 1) * tsc;
        D.line(ctx, a1, ty + 16, a2, ty + 16, PL.col("text-faint"), 1);
        D.line(ctx, a1, ty + 12, a1, ty + 20, PL.col("text-faint"), 1);
        D.line(ctx, a2, ty + 12, a2, ty + 20, PL.col("text-faint"), 1);
        D.text(ctx, PL.fmt((xn(k + 1) - xn(k)) * 100, 1), (a1 + a2) / 2, ty + 31,
          { color: PL.col("text-faint"), size: 9, align: "center" });
      }
      if (dots > 1) D.text(ctx, "點距（cm）", tapeX0, ty + 31, { color: PL.col("text-faint"), size: 9 });

      /* ---------- 讀數 ---------- */
      const T2 = T * T;
      const seg = k => xn(k + 1) - xn(k);
      const delta = seg(5) - seg(4);
      const v5 = (xn(6) - xn(4)) / (2 * T);
      const am = ((xn(6) - xn(5)) - (xn(5) - xn(4))) / T2;
      rV.set(v5, 2); rA.set(am, 2); rT.set(T, 2); rN.set(dots, 0);
      dv.set(0, seg(5) * 100, 2); dv.set(1, delta * 100, 2); dv.set(2, T2, 4); dv.set(3, am, 2);
      dv.tone(3, Math.abs(am - a) < 0.05 ? "good" : "");

      const prog = Math.min(1, dots / (N + 1));
      if (dots === 0) {
        vd.set("紙帶還沒開始打點：淡色的是「你預期會看到的點」，按開始後才會被真的打出來", "info", 0);
      } else if (a === 0) {
        vd.set("點距從頭到尾一樣長 → 等速度運動，紙帶上量到的速度是 " + PL.fmt(v5, 2) + " m/s", "good", prog);
      } else {
        vd.set("點距每一格多出 " + PL.fmt(delta * 100, 2) + " cm → 等加速度運動，由紙帶反推 a = " +
          PL.fmt(am, 2) + " m/s²", "good", prog);
      }
    }

    const anim = PL.loop(dt => {
      if (dt) {
        const T = sT.get();
        if (t >= T_END()) { anim.stop(); }
        else {
          t = Math.min(T_END(), t + dt * SLOW);
          // 補打這段時間內所有應該打的點（速度倍率調高時一格可能跨過好幾個週期）
          while (dots <= N && dots * T <= t + 1e-9) { dots += 1; flash = 0.16; }
        }
        if (flash > 0) flash = Math.max(0, flash - dt);
      }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
