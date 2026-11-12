/* 模組二 · 牛頓運動定律與力 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw;
  const MC = () => PL.col("m-color", "#ff8a65");
  /* 質量塊：烤漆金屬塊（保留用顏色區分兩個物體的教學約定） */
  const block = (ctx, x, y, w, h, m, label, ang) => {
    const AP = PL.apparatus;
    if (AP && AP.massBlock) { AP.massBlock(ctx, x, y, w, h, { color: m, label, ang }); return; }
    D.rect(ctx, x - w / 2, y - h, w, h, { fill: m, stroke: "rgba(255,255,255,0.35)", width: 1.5, r: 5 });
    if (label) D.text(ctx, label, x, y - h / 2 + 4, { color: "#04121a", size: 12, align: "center", weight: "700" });
  };

  /* 慣性與牛頓第一定律 */
  PL.register("inertia", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.52);
    let x = 0, v = 0, rp = null;
    const sV = PL.ui.slider(L.controls, { label: "押し出す初速度", min: 2, max: 14, step: 0.5, value: 8, unit: "m/s", digits: 1 });
    const sMu = PL.ui.slider(L.controls, { label: "摩擦係数 μ", min: 0, max: 0.4, step: 0.01, value: 0.1, unit: "", digits: 2 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "押す", () => { x = 0; v = sV.get(); if (rp) rp.clear(); anim.start(); }, { primary: true });
    PL.ui.button(row, "リセット", () => { x = 0; v = 0; if (rp) rp.clear(); draw(); });
    PL.ui.note(L.controls, "μ = 0 なら物体はずっと等速で進みます。これが慣性です。");
    const rV = PL.ui.readout(L.readouts, { label: "速さ v", unit: "m/s" });
    const rX = PL.ui.readout(L.readouts, { label: "すべる距離", unit: "m" });
    // 推之前可以直接拖初速箭頭的尖端（4 px 代表 1 m/s）；滑行中箭頭是實際速度，就把把手收起來
    let arrowX0 = 0;
    const grip = PL.ui.handle(cv, { slider: sV, label: "押し出す初速度 v₀（矢印をドラッグ）", toValue: px => (px - arrowX0) / 4 });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const gy = H - 40, sc = (W - 120) / 30;
      const AP = PL.apparatus, mu0 = sMu.get();
      /* 場景：室內長走道。μ 越小地面越像冰面——μ = 0 時就是一片光滑的冰 */
      AP.labRoom(ctx, W, H, gy, { bench: mu0 < 0.02 ? "steel" : "wood", window: { x: W * 0.62, w: Math.min(170, W * 0.2), h: (gy) * 0.42 } });
      if (mu0 < 0.05) {
        ctx.fillStyle = "rgba(200,235,255," + (0.55 - mu0 * 8) + ")"; ctx.fillRect(0, gy, W, H - gy);
        D.text(ctx, "氷の面", W - 60, gy + 30, { color: PL.col("text-dim"), size: 10, weight: "700" });
      }
      for (let gx = 0; gx <= 30; gx += 5) { const px = 60 + gx * sc; if (px < W - 20) { D.line(ctx, px, gy, px, gy + 6, PL.col("text"), 1.2); D.text(ctx, gx + " m", px, gy + 19, { color: PL.col("text"), size: 9, align: "center" }); } }
      const px = 60 + Math.min(x, 30) * sc;
      AP.crate(ctx, px, gy, 62, 50, {});
      if (rp) rp.mark(px, gy - 25);
      if (v < 0.01 && x === 0) AP.hand(ctx, px - 32, gy - 25, 1, 1.15);

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
      D.arrow(ctx, px + 32, gy - 60, px + 32 + showV * 4, gy - 60,
        { color: PL.col("accent-2"), width: 2, label: "v = " + PL.fmt(showV, 1) });
      arrowX0 = px + 32;
      if (moving) grip.hide(); else grip.place(px + 32 + v0 * 4, gy - 60);
      if (mu > 0) {
        D.arrow(ctx, px - 32, gy - 6, px - 32 - mu * 160, gy - 6,
          { color: PL.col("danger"), width: 2, label: "f（μ=" + PL.fmt(mu, 2) + "）" });
      }
      if (!moving) {
        if (mu <= 0) {
          D.text(ctx, "μ = 0：摩擦力がないので、物体はずっと等速で進み、いつまでも止まらない",
            W / 2, 30, { color: PL.col("warn"), size: 12, align: "center", weight: "700" });
        } else {
          // 停止距離 d = v² / (2μg)
          const d = v0 * v0 / (2 * mu * 9.8);
          const mx = 60 + Math.min(30, d) * sc;
          D.line(ctx, mx, gy - 56, mx, gy + 10, PL.col("warn"), 1.4, [6, 5]);
          D.text(ctx, d > 30 ? "すべる距離の予想 " + PL.fmt(d, 1) + " m（画面の外）" : "止まる位置の予想 " + PL.fmt(d, 1) + " m",
            mx + 6, gy - 60, { color: PL.col("warn"), size: 10.5 });
        }
      }
      PL.ui.caption(cv, mu <= 0
        ? "摩擦係数を 0 にします。物体は力がなくても等速のままで、もともとの運動の状態を続けます。"
        : "摩擦力の矢印と点線の印は、2 本のスライダーに合わせて変わります。まずどこで止まるか予想してから、「押す」で確かめます。");
      rV.set(v, 2); rX.set(x, 1);
    }
    const anim = PL.loop(dt => {
      if (dt && v > 0) { const a = sMu.get() * 9.8; v = Math.max(0, v - a * dt); x += v * dt; if (sMu.get() === 0) v = sV.get() > 0 ? v || 0 : v; }
      // 停下來或滑出 30 m 地板就結束（μ = 0 時不再繞回原點無限重跑）
      if (dt && (x >= 30 || (v <= 0 && x > 0))) { x = Math.min(x, 30); v = x >= 30 ? v : 0; rp.end(); }
      draw();
    });
    rp = PL.motion.replay(cv, { loop: anim, label: "木箱（始点にもどすと、もう一度押せる）",
      snapshot: () => ({ x, v }), restore: q => { x = q.x; v = q.v; },
      reset: () => { x = 0; v = sV.get(); }, redraw: draw });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 牛頓第二定律 F = ma —— 手拉彈簧秤＋打點計時器
   *
   * 舊版只有一台小車和一支箭頭。現在照課本的實驗：手透過彈簧秤以固定的力拉小車
   * （秤的指針就是 F），小車尾巴拖著一條紙帶穿過打點計時器，每隔固定時間打一個點——
   * 點距越來越大，「等加速度」就留在紙帶上看得見。
   */
  PL.register("newton2", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.52);
    let x = 0, v = 0, t = 0, dots = [], nextDot = 0, rp = null;
    const DT_DOT = 0.1;                                // 每 0.1 s 打一點
    const reset = () => { x = 0; v = 0; t = 0; dots = []; nextDot = 0; if (rp) rp.clear(); };
    const sF = PL.ui.slider(L.controls, { label: "加える力 F", min: 0, max: 24, step: 1, value: 10, unit: "N", digits: 0, onInput: () => draw(), onReset: reset });
    const sM = PL.ui.slider(L.controls, { label: "質量 m", min: 0.5, max: 10, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: () => draw(), onReset: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "加える力", () => { reset(); anim.start(); }, { primary: true });
    PL.ui.button(row, "リセット", reset);
    const rA = PL.ui.readout(L.readouts, { label: "加速度 a", unit: "m/s²" });
    const rV = PL.ui.readout(L.readouts, { label: "速さ v", unit: "m/s" });
    const rX = PL.ui.readout(L.readouts, { label: "変位 x", unit: "m" });
    // 手拉彈簧秤：拖拉力箭頭的尖端改 F（4 px/N），小車跑動中也即時生效
    let fX0 = 0;
    const grip = PL.ui.handle(cv, { slider: sF, label: "手の引く力 F（矢印をドラッグ）", toValue: x => (x - fX0) / 4 });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const AP = PL.apparatus;
      const gy = H - 40, F = sF.get(), a = F / sM.get();
      AP.benchTop(ctx, W, H, gy + 6);
      AP.steel(ctx, 18, gy, W - 36, 7, -6);
      const x0 = 176, sc = (W - 340) / 24;               // 0–24 m 的行程
      const w = 56 + sM.get() * 6, ch = 30 + sM.get() * 1.5, px = x0 + Math.min(x, 24) * sc;
      // 打點計時器與紙帶：點是在計時器底下打的，之後跟著紙帶一起被拉走
      const tx = 70, tapeY = gy - 16;
      AP.paperTape(ctx, tx - 58, px - w / 2, tapeY, 12);
      dots.forEach(xk => { const dx = tx + (x - xk) * sc; if (dx < px - w / 2 - 2 && dx > tx - 56) D.disc(ctx, dx, tapeY, 1.8, { fill: "#26262c" }); });
      AP.tickerTimer(ctx, tx, tapeY, 10, v > 0.01);
      AP.cart(ctx, px, gy, w, ch, {});
      if (rp) rp.mark(px, gy - ch * 0.5);
      // 車上疊的砝碼越多，車越重：質量是看得見的
      const nW = Math.max(1, Math.min(8, Math.round(sM.get())));
      const bodyTop = gy - Math.max(4, Math.min(9, ch * 0.26)) * 1.1 - ch;
      for (let i = 0; i < nW; i++) {
        const col = i % 4, rowI = Math.floor(i / 4);
        AP.weight(ctx, px - 21 + col * 14, bodyTop - 16 - rowI * 17, 12, 16, null);
      }
      D.text(ctx, sM.get() + " kg", px, bodyTop - 20 - Math.ceil(nW / 4) * 17, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
      // 手透過彈簧秤拉車：指針位置就是施力 F
      const hy = gy - ch / 2 - 8, hx = px + w / 2 + 6;
      AP.springScale(ctx, hx, hy, 70, F / 24);
      AP.hand(ctx, hx + 86, hy, -1, 0.85, { pull: true });
      if (F > 0) D.arrow(ctx, hx + 4, hy - 24, hx + 4 + F * 4, hy - 24, { color: PL.col("accent-2"), width: 2.5, label: "F = " + F + " N" });
      fX0 = hx + 4; grip.place(hx + 4 + F * 4, hy - 24);
      D.text(ctx, "a = F / m = " + PL.fmt(a, 2) + " m/s²", 24, 28, { color: MC(), size: 13 });
      D.text(ctx, "テープには 0.1 s ごとに点が打たれる：間隔がどんどん広がる → 等加速度", 24, 48, { color: PL.col("text-dim"), size: 10.5 });
      rA.set(a, 2); rV.set(v, 2); rX.set(x, 1);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        const a = sF.get() / sM.get(); v += a * dt; x += v * dt; t += dt;
        while (t >= nextDot) { dots.push(x); nextDot += DT_DOT; }
        if (x >= 24) { x = 24; rp.end(); }           // 跑到軌道盡頭就停（不自己重跑）
      }
      draw();
    });
    rp = PL.motion.replay(cv, { loop: anim, label: "台車（始点までもどすとやり直し）",
      snapshot: () => ({ x, v, t, nextDot, d: dots, n: dots.length }),
      restore: q => { x = q.x; v = q.v; t = q.t; nextDot = q.nextDot; dots = q.d.slice(0, q.n); },
      reset: () => { x = 0; v = 0; t = 0; dots = []; nextDot = 0; }, redraw: draw });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 斜面受力 */
  PL.register("incline", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    let s = 0, v = 0, rp = null;
    const reset = () => { s = 0; v = 0; if (rp) rp.clear(); };
    PL.ui.section(L.controls, "斜面のパラメータ");
    const sTh = PL.ui.slider(L.controls, { label: "傾きの角 θ", min: 5, max: 60, step: 1, value: 30, unit: "°", digits: 0, onInput: () => draw(), onReset: reset });
    const sMu = PL.ui.slider(L.controls, { label: "摩擦係数 μ", min: 0, max: 1, step: 0.02, value: 0.2, unit: "", digits: 2, onInput: () => draw(), onReset: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "はなす", () => { reset(); anim.start(); }, { primary: true, trigger: true });
    PL.ui.button(row, "リセット", reset);
    const rA = PL.ui.readout(L.readouts, { label: "加速度 a", unit: "m/s²" });
    const rN = PL.ui.readout(L.readouts, { label: "垂直抗力 N", unit: "×mg" });
    const rState = PL.ui.readout(L.readouts, { label: "状態" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "加速度 a と傾きの角 θ", cap: "a = g(sinθ − μcosθ)。θ ≤ 摩擦角 θc = tan⁻¹μ のとき物体は静止します（a = 0）。" });
    // 抓斜面頂端繞底角轉：抬高就是加大傾角（底角固定在 (50, H−40)）
    const grip = PL.ui.handle(cv, { slider: sTh, label: "斜面のてっぺん（下の角のまわりに回して傾きの角 θ を変える）", toValue: (x, y) => Math.atan2(cv.H - 40 - y, x - 50) * 180 / Math.PI });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const th = sTh.get() * Math.PI / 180, mu = sMu.get(), m = MC();
      const A = { x: 50, y: H - 40 }; const Lpx = Math.min((W - 120) / Math.cos(th), (H - 90) / Math.sin(th));
      const apex = { x: A.x + Lpx * Math.cos(th), y: A.y - Lpx * Math.sin(th) };
      const foot = { x: apex.x, y: A.y };
      /* 斜面畫成實物斜面板（有厚度、有支撐面），不是一個三角形線框 */
      const AP = PL.apparatus;
      AP.benchTop(ctx, W, H, A.y + 4);
      AP.ramp(ctx, A.x, A.y, Lpx, th);
      grip.place(A.x + (Lpx - 10) * Math.cos(th), A.y - (Lpx - 10) * Math.sin(th));
      const u = { x: -Math.cos(th), y: Math.sin(th) }; // 下坡方向
      const n = { x: -Math.sin(th), y: -Math.cos(th) }; // 外法線
      // 斜面上貼的刻度尺（每一格代表斜面長的十分之一）
      ctx.save(); ctx.strokeStyle = PL.theme.isLight() ? "rgba(60,50,30,0.55)" : "rgba(230,220,200,0.5)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 1; k < 20; k++) {
        const d = Lpx * k / 20, px = A.x + Math.cos(th) * d, py = A.y - Math.sin(th) * d, l = k % 2 ? 4 : 8;
        ctx.moveTo(px + n.x * 2, py + n.y * 2); ctx.lineTo(px + n.x * (2 + l), py + n.y * (2 + l));
      }
      ctx.stroke(); ctx.restore();
      // 底角的量角器弧
      ctx.save(); ctx.strokeStyle = PL.col("text-dim"); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(A.x, A.y, 52, -th, 0); ctx.stroke();
      ctx.lineWidth = 1; ctx.beginPath();
      for (let dg = 0; dg <= sTh.get(); dg += 5) { const r0 = dg % 10 === 0 ? 45 : 48, aa = -dg * Math.PI / 180; ctx.moveTo(A.x + Math.cos(aa) * r0, A.y + Math.sin(aa) * r0); ctx.lineTo(A.x + Math.cos(aa) * 52, A.y + Math.sin(aa) * 52); }
      ctx.stroke(); ctx.restore();
      D.text(ctx, "θ = " + sTh.get() + "°", A.x + 60, A.y - 10, { color: PL.col("text"), size: 12, weight: "700" });
      const s0 = Lpx * 0.24, bs = Math.min(s, Lpx - s0 - 40);      // 木塊從斜面上段放手，力的箭頭才有空間
      const bx = apex.x + u.x * (bs + s0), by = apex.y + u.y * (bs + s0);
      AP.woodBlock(ctx, bx, by - 6, 54, 34, -th);
      if (rp) rp.mark(bx, by - 6);
      const cx = bx + n.x * 23, cy = by + n.y * 23; const FS = 72;
      D.arrow(ctx, cx, cy, cx, cy + FS * 1.4, { color: PL.col("warn"), width: 2, label: "mg" });
      D.arrow(ctx, cx, cy, cx + n.x * FS * Math.cos(th), cy + n.y * FS * Math.cos(th), { color: PL.col("accent-2"), width: 2, label: "N" });
      D.arrow(ctx, cx, cy, cx + u.x * FS * Math.sin(th), cy + u.y * FS * Math.sin(th), { color: "#7ee0c0", width: 2, label: "mg sinθ", dash: [3, 3] });
      const tan = Math.tan(th), moving = tan > mu + 1e-6;
      const a = moving ? 9.8 * (Math.sin(th) - mu * Math.cos(th)) : 0;
      if (moving) D.arrow(ctx, cx, cy, cx - u.x * FS * mu * Math.cos(th), cy - u.y * FS * mu * Math.cos(th), { color: PL.col("danger"), width: 2, label: "f" });
      rA.set(a, 2); rN.set(Math.cos(th), 2); rState.set(moving ? "すべり下りる" : "静止");
      // a–θ 圖
      cc.clear();
      const gg = PL.graph(cc, { x: 36, y: 14, w: cc.W - 48, h: cc.H - 34 }, { x0: 0, x1: 60, y0: 0, y1: 10 });
      gg.frame({ xlabel: "θ (°)", ylabel: "a (m/s²)" }); gg.grid(6, 5);
      gg.fn(deg => { const r = deg * Math.PI / 180; return Math.tan(r) > mu ? 9.8 * (Math.sin(r) - mu * Math.cos(r)) : 0; }, { color: MC(), width: 2.2, samples: 90 });
      const thc = Math.atan(mu) * 180 / Math.PI; gg.vline(thc, { color: "rgba(255,255,255,0.25)", dash: [3, 3] }); gg.label(thc + 1, 9.2, "θc", { color: PL.col("text-faint"), size: 10 });
      gg.dot(sTh.get(), a, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    const anim = PL.loop(dt => {
      if (dt) { const th = sTh.get() * Math.PI / 180, mu = sMu.get(); const a = Math.tan(th) > mu ? 9.8 * (Math.sin(th) - mu * Math.cos(th)) : 0; v += a * dt * 8; s += v * dt; const Lpx = Math.min((cv.W - 120) / Math.cos(th), (cv.H - 90) / Math.sin(th)); if (s > Lpx * 0.76 - 44) { s = Lpx * 0.76 - 44; v = 0; rp.end(); } else if (a === 0) rp.end(); }
      draw();
    });
    rp = PL.motion.replay(cv, { loop: anim, label: "木片（斜面の上にもどすとやり直し）",
      snapshot: () => ({ s, v }), restore: q => { s = q.s; v = q.v; },
      reset: () => { s = 0; v = 0; }, redraw: draw });
    cv.onResize(draw); cc.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 靜摩擦與動摩擦
   *
   * 舊版木塊位置是 (x % 20) 換算的，滑動時每 20 m 就瞬移回原點；預設 F 又小於最大靜摩擦，
   * 按播放後畫面完全不動。這一版預設 F 略大於最大靜摩擦，讓木塊真的沿桌面滑出去：F 超過 μₛN 才起動，
   * 起動後摩擦掉到 μₖN，木塊照 a = (F − μₖN)/m 越滑越快，滑到桌面盡頭才放回起點重拉。
   * F 不夠時木塊不動，但拖曳拉力時靜摩擦箭頭會跟著一起變長——靜摩擦是「被動」的，F 多大它就多大。
   */
  PL.register("friction", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    let x = 0, v = 0, geo = { x0: 142 }, rp = null;
    const sF = PL.ui.slider(L.controls, { label: "加える力 F", min: 0, max: 30, step: 0.5, value: 12, unit: "N", digits: 1, onInput: () => draw() });
    const sMs = PL.ui.slider(L.controls, { label: "静止摩擦係数 μₛ", min: 0.1, max: 0.9, step: 0.02, value: 0.5, unit: "", digits: 2, onInput: () => draw() });
    const sMk = PL.ui.slider(L.controls, { label: "動摩擦係数 μₖ", min: 0.05, max: 0.8, step: 0.02, value: 0.3, unit: "", digits: 2, onInput: () => draw() });
    const mass = 2, N = mass * 9.8;
    const PX_PER_M = 40;
    PL.ui.note(L.controls, "引く力をゆっくり大きくします。F が最大摩擦力をこえるまでは木片は動かず、静止摩擦力 f = F です。こえたとたんに急にすべり出し、摩擦力は μₖN に下がります。引く力の矢印の先をそのままドラッグできます。");
    const rF = PL.ui.readout(L.readouts, { label: "摩擦力 f", unit: "N" });
    const rState = PL.ui.readout(L.readouts, { label: "状態" });
    const rA = PL.ui.readout(L.readouts, { label: "加速度 a", unit: "m/s²" });
    // 把手抓住拉力箭頭的尖端：往右拉越長，施力越大（箭頭 5 px/N）
    const grip = PL.ui.handle(cv, { slider: sF, label: "引く力 F（矢印をドラッグ）", toValue: px => (px - geo.x0) / 5 });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const F = sF.get(), fsMax = sMs.get() * N, fk = sMk.get() * N, moving = F > fsMax;
      const f = moving ? fk : F, a = moving ? (F - fk) / mass : 0;
      const AP = PL.apparatus;
      const gy = 124;
      /* 桌面：摩擦力發生在木塊與桌面之間，那個接觸面要看得見。
         只鋪一條窄帶，不能鋪到畫布底部——下面還有 f–F 圖。 */
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, gy + 20); ctx.clip();
      AP.labRoom(ctx, W, gy + 20, gy, { bench: "wood" });
      ctx.restore();
      D.line(ctx, 0, gy + 20, W, gy + 20, PL.col("border"), 1);

      const px = 120 + x * PX_PER_M;
      AP.woodBlock(ctx, px, gy, 52, 32, 0);
      if (rp) rp.mark(px, gy - 16);
      D.text(ctx, mass + " kg", px, gy - 12, { color: "#2b1f10", size: 11, align: "center", weight: "700" });
      AP.hand(ctx, px + 28 + 62 + 16, gy - 16, -1, 0.85, { pull: true });
      // 拉力用彈簧秤施加，指針位置就是施力大小
      AP.springScale(ctx, px + 28, gy - 16, 62, F / 30);
      // 力向量畫在木塊上方，避開彈簧秤
      D.arrow(ctx, px + 22, gy - 46, px + 22 + F * 5, gy - 46, { color: PL.col("accent-2"), width: 2.4, label: "F=" + PL.fmt(F, 1) });
      D.arrow(ctx, px - 22, gy - 46, px - 22 - f * 5, gy - 46, { color: PL.col("danger"), width: 2.4, label: (moving ? "fₖ=" : "fₛ=") + PL.fmt(f, 1), lx: -8, ly: -8 });
      geo = { x0: px + 22 };
      grip.place(px + 22 + F * 5, gy - 46);
      // 窄螢幕只留前半句，免得超出畫布
      D.text(ctx, (moving ? "F > 最大摩擦力 " + PL.fmt(fsMax, 1) + " N" + (W < 560 ? "：すべる" : "：木片がすべり、摩擦力は動摩擦力になる")
                          : "F ≤ 最大摩擦力 " + PL.fmt(fsMax, 1) + " N" + (W < 560 ? "：動かない" : "：木片は動かず、静止摩擦力 = F")),
        16, 22, { color: PL.col(moving ? "danger" : "text"), size: 12, weight: "700" });
      // 摩擦力 vs 施力 圖
      const bx = 40, by = gy + 32, bw = W - 80, bh = H - by - 20;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: 30, y0: 0, y1: Math.max(fsMax, fk) * 1.3 + 1 });
      g.frame({ title: "摩擦力 f と加える力 F", xlabel: "F (N)", ylabel: "f (N)" }); g.grid(6, 4);
      g.curve([[0, 0], [fsMax, fsMax]], { color: PL.col("warn"), width: 2 });        // 靜摩擦：f=F
      g.curve([[fsMax, fsMax], [fsMax, fk]], { color: PL.col("danger"), width: 2, dash: [3, 3] }); // 掉落
      g.curve([[fsMax, fk], [30, fk]], { color: PL.col("danger"), width: 2 });         // 動摩擦：定值
      g.hline(fsMax, { color: "rgba(255,204,102,0.4)", dash: [2, 3], width: 1 });
      g.label(1, fsMax, "最大摩擦力", { color: PL.col("warn"), size: 9, dy: -4 });
      g.dot(F, f, { color: MC(), glow: MC() });
      rF.set(f, 1); rState.set(moving ? "すべる" : "静止"); rA.set(a, 2);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        const F = sF.get(), moving = F > sMs.get() * N;
        if (moving) {
          v += (F - sMk.get() * N) / mass * dt; x += v * dt;
          // 滑到桌面盡頭就停；把木塊拖回起點（或再按播放）重新拉一次
          if (120 + x * PX_PER_M > cv.W - 150) { x = (cv.W - 270) / PX_PER_M; v = 0; rp.end(); }
        } else v = 0;
      }
      draw();
    });
    rp = PL.motion.replay(cv, { loop: anim, label: "木片（始点にもどすと、もう一度引ける）",
      snapshot: () => ({ x, v }), restore: q => { x = q.x; v = q.v; },
      reset: () => { x = 0; v = 0; }, redraw: () => draw() });
    cv.onResize(() => draw()); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* 連接體與張力（阿特午機） */
  PL.register("atwood", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    /* y0：用手把砝碼拉到的起始高度差（預設 0＝兩邊等高），「釋放」從這裡開始；「重設」才歸零 */
    let y = 0, v = 0, y0 = 0, held = false;
    const reset = () => { y = y0; v = 0; }, clear = () => { y0 = 0; reset(); };
    const s1 = PL.ui.slider(L.controls, { label: "左の質量 m₁", min: 0.5, max: 8, step: 0.5, value: 3, unit: "kg", digits: 1, onInput: () => draw(), onReset: clear });
    const s2 = PL.ui.slider(L.controls, { label: "右の質量 m₂", min: 0.5, max: 8, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: () => draw(), onReset: clear });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "はなす", () => { reset(); anim.start(); }, { primary: true, trigger: true });
    PL.ui.button(row, "リセット", clear);
    // 用手抓住任一邊砝碼上下移（另一邊跟著反向）；抓著時不受力，放手後若在播放就從這裡接著動
    const lim = () => (cv.H - 90) / 2 - 14;
    const hold = sgn => PL.ui.handle(cv, { label: (sgn > 0 ? "左" : "右") + "おもり（上下に引いて、はじめの位置を決める）",
      onGrab: () => { held = true; }, onRelease: () => { held = false; },
      onDrag: (x, py) => { y0 = y = PL.clamp(sgn * (py - 14 - (cv.H - 108) / 2 - 82), -lim(), lim()); v = 0; draw(); } });
    const g1 = hold(1), g2 = hold(-1);
    const rA = PL.ui.readout(L.readouts, { label: "加速度 a", unit: "m/s²" });
    const rT = PL.ui.readout(L.readouts, { label: "糸の張力 T", unit: "N" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m1 = s1.get(), m2 = s2.get(), m = MC();
      const a = (m1 - m2) * 9.8 / (m1 + m2), T = 2 * m1 * m2 * 9.8 / (m1 + m2);
      const A = PL.apparatus;
      const cx = W / 2, py = 52, pr = 24;
      A.benchTop(ctx, W, H, H - 22);
      A.standRod(ctx, cx - 132, H - 20, py - 30);
      A.crossArm(ctx, cx - 132, py - 20, cx);
      A.pulley(ctx, cx, py, pr);
      const lx = cx - pr, rx = cx + pr;
      const mid = (H - 108) / 2, y1 = 82 + mid + y, y2 = 82 + mid - y;
      A.cord(ctx, lx, py, lx, y1); A.cord(ctx, rx, py, rx, y2);
      const bw1 = 26 + m1 * 3.4, bw2 = 26 + m2 * 3.4;
      A.weight(ctx, lx, y1, bw1, 28, m1 + " kg");
      A.weight(ctx, rx, y2, bw2, 28, m2 + " kg");
      g1.place(lx - 6, y1 + 14); g2.place(rx + 6, y2 + 14);
      const dir = a > 0.01 ? "m₁ が下がる" : a < -0.01 ? "m₂ が下がる" : "つり合って静止";
      D.text(ctx, dir, cx, H - 16, { color: PL.col("text-dim"), size: 12, align: "center" });
      rA.set(Math.abs(a), 2); rT.set(T, 1);
    }
    const anim = PL.loop(dt => { if (dt && !held) { const m1 = s1.get(), m2 = s2.get(); const a = (m1 - m2) * 9.8 / (m1 + m2); v += a * dt * 6; y += v * dt; const lim = (cv.H - 90) / 2 - 14; if (y > lim || y < -lim) { v = 0; } y = PL.clamp(y, -lim, lim); } draw(); });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 牛頓第三定律 */
  PL.register("newton3", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.5);
    let phase = "idle", x1 = 0, x2 = 0, v1 = 0, v2 = 0, pt = 0, tt = -1;
    const sF = PL.ui.slider(L.controls, { label: "押し合う力 F", min: 4, max: 24, step: 1, value: 12, unit: "N", digits: 0 });
    const sm1 = PL.ui.slider(L.controls, { label: "左の台車の質量 m₁", min: 1, max: 8, step: 0.5, value: 2, unit: "kg", digits: 1 });
    const sm2 = PL.ui.slider(L.controls, { label: "右の台車の質量 m₂", min: 1, max: 8, step: 0.5, value: 4, unit: "kg", digits: 1 });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "押し合う", () => { x1 = 0; x2 = 0; v1 = 0; v2 = 0; pt = 0; tt = 0; phase = "push"; anim.start(); }, { primary: true });
    PL.ui.button(row, "リセット", () => { phase = "idle"; x1 = x2 = v1 = v2 = 0; tt = -1; });
    PL.ui.note(L.controls, "2 台の台車が受ける力は大きさが等しく向きが逆です。質量の小さい台車のほうが加速度は大きくなります。");
    const rA1 = PL.ui.readout(L.readouts, { label: "左の台車 a₁", unit: "m/s²" });
    const rA2 = PL.ui.readout(L.readouts, { label: "右の台車 a₂", unit: "m/s²" });
    const rF = PL.ui.readout(L.readouts, { label: "力の大きさ", unit: "N" });
    // 互推力把手：抓右車受力箭頭的尖端（4 px/N）。左車的箭頭跟著等長變化——第三定律就在手上
    let fX0 = 0;
    const grip = PL.ui.handle(cv, { slider: sF, label: "押し合う力 F（矢印をドラッグ）", toValue: px => (px - fX0) / 4 });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const gy = H - 46, cx = W / 2, F = sF.get();
      const AP = PL.apparatus;
      AP.benchTop(ctx, W, H, gy);
      AP.steel(ctx, 18, gy - 6, W - 36, 6, -6);
      /*
       * 原本車子固定 44×30、力箭頭只在「互推中」才畫，
       * 於是三根滑桿在按下互推之前完全不影響畫面——學生拉半天像在看靜態插圖。
       *
       * 改成：車身寬度隨質量、力箭頭一直都在（作用力與反作用力本來就成對存在），
       * 並且畫出兩支長度不同的加速度箭頭。這樣「同樣的 F、質量小的加速度大」
       * 在按下按鈕之前就已經看得出來了。
       */
      const m1 = sm1.get(), m2 = sm2.get();
      const w1 = 48 + m1 * 7, w2 = 48 + m2 * 7;     // 1kg→55px，8kg→104px
      const bx1 = cx - 12 - w1 / 2 - x1 * 30, bx2 = cx + 12 + w2 / 2 + x2 * 30;
      // 兩台力學車：中間的彈簧撞針就是「互推」的來源
      AP.cart(ctx, bx1, gy - 6, w1, 30, {});
      AP.cart(ctx, bx2, gy - 6, w2, 30, {});
      if (phase !== "glide" && x1 + x2 < 0.05) {
        D.spring(ctx, bx1 + w1 / 2 + 2, gy - 30, bx2 - w2 / 2 - 2, gy - 30, 5, 6, "#9aa8b8");
      }
      D.text(ctx, PL.fmt(m1, 1) + " kg", bx1, gy - 40, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
      D.text(ctx, PL.fmt(m2, 1) + " kg", bx2, gy - 40, { color: PL.col("text"), size: 11, align: "center", weight: "700" });

      // 互推的一對力：大小永遠相等、方向相反，這是第三定律的重點
      const fLen = F * 4;
      D.arrow(ctx, bx1 + w1 / 2, gy - 58, bx1 + w1 / 2 - fLen, gy - 58,
        { color: PL.col("danger"), width: 2.4, label: "F = " + F + " N" });
      D.arrow(ctx, bx2 - w2 / 2, gy - 58, bx2 - w2 / 2 + fLen, gy - 58,
        { color: PL.col("accent-2"), width: 2.4, label: "F = " + F + " N" });
      fX0 = bx2 - w2 / 2; grip.place(fX0 + fLen, gy - 58);

      // 加速度箭頭：同樣的力，質量小的箭頭明顯比較長
      const a1 = F / m1, a2 = F / m2, aScale = 90 / Math.max(a1, a2);
      D.arrow(ctx, bx1, gy - 84, bx1 - a1 * aScale, gy - 84,
        { color: PL.col("warn"), width: 2, head: 7, label: "a₁=" + PL.fmt(a1, 1) });
      D.arrow(ctx, bx2, gy - 84, bx2 + a2 * aScale, gy - 84,
        { color: PL.col("warn"), width: 2, head: 7, label: "a₂=" + PL.fmt(a2, 1) });

      /* 兩支力感測器接到資料擷取器：互推期間一條 +F、一條 −F，互為鏡像——作用力與反作用力同時出現、同時消失 */
      if (W >= 520) {
        const lw = Math.min(260, W * 0.34), lh = lw * 0.62, lx = W - lw - 16, ly = 12;
        const scr = AP.laptop(ctx, lx, ly, lw, lh);
        const T0 = -0.08, T1 = 0.72, X = t => scr.x + 8 + (scr.w - 16) * (t - T0) / (T1 - T0), Y = f => scr.y + scr.h / 2 - f / 26 * (scr.h / 2 - 12);
        ctx.save(); ctx.strokeStyle = "rgba(160,190,220,0.35)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(scr.x + 6, Y(0)); ctx.lineTo(scr.x + scr.w - 6, Y(0)); ctx.stroke(); ctx.restore();
        const pulse = (t, sg) => (t >= 0 && t < 0.35) ? sg * F : 0;
        const plot = (sg, col, upto, dash) => {
          ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.8; if (dash) ctx.setLineDash([4, 3]);
          ctx.beginPath(); for (let t = T0; t <= upto + 1e-9; t += 0.004) { const x = X(t), y = Y(pulse(t, sg)); t === T0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
        };
        const rec = tt < 0 ? T0 : Math.min(T1, tt);
        if (rec < T1) { plot(-1, "rgba(255,120,110,0.4)", T1, true); plot(1, "rgba(110,170,255,0.4)", T1, true); }
        if (rec > T0) { plot(-1, "#ff7b6e", rec, false); plot(1, "#6fb0ff", rec, false); }
        ctx.save(); ctx.font = "700 9.5px system-ui,sans-serif"; ctx.textAlign = "left";
        ctx.fillStyle = "#6fb0ff"; ctx.fillText("右の台車が受ける力 +" + F + " N", scr.x + 8, scr.y + 13);
        ctx.fillStyle = "#ff7b6e"; ctx.fillText("左の台車が受ける力 −" + F + " N", scr.x + 8, scr.y + scr.h - 6);
        ctx.fillStyle = "rgba(210,222,238,0.8)"; ctx.textAlign = "right"; ctx.fillText("力センサー F–t", scr.x + scr.w - 6, scr.y + 13);
        ctx.restore();
      }
      PL.ui.caption(cv, Math.abs(m1 - m2) < 0.05
        ? "2 台の質量が同じ：受ける力も加速度も等しく、画面は完全に左右対称です。"
        : "赤と青の 2 本の矢印は同じ長さです。作用と反作用の大きさは必ず等しくなります。" +
          "でも上の 2 本の加速度の矢印は長さが違います。" + (m1 < m2 ? "左" : "右") + "の台車のほうが軽いので、加速度が大きくなります。");
      rA1.set(a1, 2); rA2.set(a2, 2); rF.set(F, 0);
    }
    const anim = PL.loop(dt => {
      if (dt) {
        if (tt >= 0 && tt < 5) tt += dt;
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
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    const G = 9.8;
    let ang = 0;

    PL.ui.section(L.controls, "左側（荷物の側）");
    const sM1 = PL.ui.slider(L.controls, { label: "左側の質量 m₁", min: 1, max: 8, step: 0.5, value: 3, unit: "kg", digits: 1 });
    const sD1 = PL.ui.slider(L.controls, { label: "左側のうでの長さ d₁", min: 1, max: 5, step: 0.5, value: 3, unit: "m", digits: 1 });
    PL.ui.section(L.controls, "右側（力を加える側）");
    const sM2 = PL.ui.slider(L.controls, { label: "右側の質量 m₂", min: 1, max: 8, step: 0.5, value: 2, unit: "kg", digits: 1 });
    const sD2 = PL.ui.slider(L.controls, { label: "右側のうでの長さ d₂", min: 1, max: 5, step: 0.5, value: 4, unit: "m", digits: 1 });

    const tau1 = () => sM1.get() * G * sD1.get();
    const tau2 = () => sM2.get() * G * sD2.get();

    PL.ui.presets(L.controls, {
      label: "よく使う設定",
      options: [
        { label: "ちょうどつり合わせる", hint: "いまの m₁、d₁、m₂ のまま、d₂ をつり合う位置に動かす",
          apply: () => {
            const need = sM1.get() * sD1.get() / sM2.get();
            sD2.set(PL.clamp(Math.round(need * 2) / 2, 1, 5));
            settle();
          } },
        { label: "小さな力ですむてこ", hint: "力を加える側のうでが荷物の側より長いので、小さな力で持ち上げられる。そのかわり長い距離を動かす必要がある",
          apply: () => { sM1.set(6); sD1.set(1.5); sM2.set(2); sD2.set(4.5); settle(); } },
        { label: "うでの長さが等しいてんびん", hint: "両側のうでの長さが同じなので、つり合えば両側の重さが同じ。てんびんはこうして質量を量る",
          apply: () => { sD1.set(3); sD2.set(3); sM1.set(4); sM2.set(4); settle(); } }
      ]
    });

    PL.ui.note(L.controls,
      "力のモーメント τ = 力 × うでの長さ。うでの長さは、支点から力の作用線までの垂直距離です。左右の力のモーメントが等しいとき、横棒は水平のままです。" +
      "まず「小さな力ですむてこ」を押します。右に 2 kg しかつるしていないのに、左の 6 kg を持ち上げられます。増えたのは力ではなく、うでの長さです。");

    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—", meter: true });
    const rL = PL.ui.readout(L.readouts, { label: "左の力のモーメント τ₁", unit: "N·m" });
    const rR = PL.ui.readout(L.readouts, { label: "右の力のモーメント τ₂", unit: "N·m" });
    const rS = PL.ui.readout(L.readouts, { label: "状態" });

    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "左側の重さ W₁", unit: "N", hint: "= m₁g。これが力で、質量ではない" },
      { label: "右側の重さ W₂", unit: "N", hint: "= m₂g" },
      { label: "力のモーメントの合計 τ₂ − τ₁", unit: "N·m", hint: "0 のときだけつり合う" },
      { label: "つり合いに必要な d₂", unit: "m", hint: "= m₁d₁ / m₂" }
    ]);

    PL.ui.causality(L.canvasWrap.parentNode, {
      title: "回るかどうかは、力ではなく力のモーメントで決まる",
      rows: [
        { name: "力 × うでの長さ", tone: "a", note: "同じ力でも、支点から遠いほど回すはたらきは大きくなります。だからスパナは端をにぎり、ドアの取っ手はちょうつがいからいちばん遠い側についています。" },
        { name: "うでの長さは支点から測る", tone: "b", note: "支点から「作用線」までの垂直距離で、物体までの距離ではありません。力の向きが斜めになると、うでの長さは見た目より短くなります。" },
        { name: "力は小さくなっても仕事は小さくならない", tone: "c", note: "うでの長さを 2 倍にすると力は半分ですみますが、力を加える側は 2 倍の距離を動かす必要があります。W = Fd で両側をかけ算すると、まったく同じです。" }
      ]
    });

    PL.ui.procedure(L.controls, {
      title: "てこの原理の実験のふつうの手順",
      steps: [
        "まず<strong>何もつるさずに水平に調節</strong>する：おもりをつるしていないとき、横棒は水平でなければならない。調節せずにつるしはじめると、棒自身の重さがどちらかの側の力のモーメントにこっそり加わる。",
        "左側の決まった位置に、質量のわかっているおもりをつるし、m₁ と d₁ を記録する。",
        "右側には質量の違うおもりをつるし、そのたびに横棒が水平にもどるまで位置を動かして、そのときの m₂ と d₂ を記録する。",
        "少なくとも 5 組とり、m₂ を 1/d₂ に対してグラフにする。原点を通る直線になれば、τ₁ = τ₂ が確かめられる。"
      ],
      rule: "うでの長さは<strong>支点</strong>から<strong>つるした点</strong>まで測り、おもりのふちまでではない。また横棒には自分の重さがあるので、" +
            "先に何もつるさずに水平に調節しないと、どの組のデータも同じ側にかたよる。この誤差は何回やっても消えない。"
    });

    /* 抓砝碼沿橫桿左右滑：位置就是力臂（只看水平投影，桿子傾斜時一樣準） */
    let tg = { cx: 0, k: 1 };
    const gD1 = PL.ui.handle(cv, { slider: sD1, label: "左側のおもり（棒にそってすべらせてうでの長さ d₁ を変える）", toValue: x => (tg.cx - x) / tg.k });
    const gD2 = PL.ui.handle(cv, { slider: sD2, label: "右側のおもり（棒にそってすべらせてうでの長さ d₂ を変える）", toValue: x => (x - tg.cx) / tg.k });

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

      // 支架與支點：三角刀口座立在檯面上
      const AP = PL.apparatus;
      // 桌面放低，槓桿架在一根立柱上：砝碼才有空間往下掛
      const benchY = H - 88;
      AP.benchTop(ctx, W, H, benchY);
      AP.steel(ctx, cx - 5, cy + 48, 10, benchY - cy - 48, 8);
      AP.steel(ctx, cx - 40, benchY - 7, 80, 8, -6);
      AP.knifeEdge(ctx, cx, cy + 2, 44, 50);
      // 水平參考線：桿子傾斜時才看得出來偏了多少
      D.line(ctx, cx - half, cy, cx + half, cy, PL.col("text-faint"), 1, [4, 5]);
      ctx.save();
      const bg = ctx.createLinearGradient(0, cy - 4, 0, cy + 4);
      bg.addColorStop(0, "rgb(206,214,226)"); bg.addColorStop(0.45, "rgb(140,150,166)"); bg.addColorStop(1, "rgb(80,88,102)");
      ctx.strokeStyle = bg; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - half * c, cy - half * s); ctx.lineTo(cx + half * c, cy + half * s);
      ctx.stroke();
      ctx.restore();
      D.disc(ctx, cx, cy, 5, { fill: PL.col("text-dim") });
      D.text(ctx, "支点", cx, cy + 68, { color: PL.col("text-faint"), size: 10, align: "center" });

      /* 一側的砝碼、重量箭頭與力臂標註 */
      function side(dist, m, weight, sign, name, tone, gp) {
        const ax = cx + sign * dist * sc * c, ay = cy + sign * dist * sc * s;
        const bw = 20 + m * 4, bh = 16 + m * 2;
        gp.place(ax, ay + 22 + bh / 2);
        AP.cord(ctx, ax, ay, ax, ay + 18);
        AP.massBlock(ctx, ax, ay + 22 + bh, bw, bh, { color: tone, label: PL.fmt(m, 1) + " kg", hook: true, noShadow: true });
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
      tg = { cx, k: sc * c };
      side(d1, m1, W1, -1, "W₁", MC(), gD1);
      side(d2, m2, W2, 1, "W₂", "#ffab80", gD2);

      /* 力矩長條比較：把「誰比較大」變成長度而不是兩個數字 */
      const barY = H - 46, barX = 56, barW = W - 112 - 110, tMax = Math.max(t1, t2, 1);
      AP.infoCard(ctx, barX - 14, barY - 30, W - 84, 64);
      D.text(ctx, "力のモーメントの比較 τ = W × d", barX, barY - 12, { color: PL.col("text-dim"), size: 11 });
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
      rS.set(balanced ? "つり合い" : net < 0 ? "左にかたむく" : "右にかたむく");
      if (balanced) {
        vd.set("つり合い：両側の力のモーメントが等しく、合計は 0", "good", 1);
      } else {
        const heavier = net < 0 ? "左" : "右";
        const move = PL.fmt(Math.abs(need - d2), 2);
        vd.set(heavier + "側の力のモーメントが大きく、棒は" + heavier + "にかたむく。d₂ を " + PL.fmt(need, 2) +
          " m（あと " + move + " m）に動かすとつり合う", "warn",
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

  /* 力的合成與分解（力桌）
   *
   * 舊版只畫一張受力圖：第三個砝碼標著「?」，放在算好的平衡方向上，中心環永遠乖乖待在中央。
   * 可是力桌實驗的重點正是「找」平衡力：學生自己調第三個砝碼的大小與方向，
   * 看中心環有沒有被拉向一側、靠在中心銷上——環不碰銷、停在正中央，才代表三力平衡。
   *
   * 因此這一版讓中心環真的受三條繩的拉力運動：每條繩的拉力大小是砝碼重量，
   * 方向從環指向各自的滑輪。環移動時三條繩的方向跟著微微改變，
   * 這正是力桌在平衡點附近有恢復力的原因（環被推開一點會自己回來）。
   * 合力不為零時環會一路滑到碰到中心銷，並停在合力的方向上。
   */
  PL.register("force-table", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    const sF1 = PL.ui.slider(L.controls, { label: "F₁ の大きさ", min: 1, max: 8, step: 0.5, value: 5, unit: "N", digits: 1, onInput: () => draw() });
    const sA1 = PL.ui.slider(L.controls, { label: "F₁ の向き", min: 0, max: 360, step: 5, value: 30, unit: "°", digits: 0, onInput: () => draw() });
    const sF2 = PL.ui.slider(L.controls, { label: "F₂ の大きさ", min: 1, max: 8, step: 0.5, value: 4, unit: "N", digits: 1, onInput: () => draw() });
    const sA2 = PL.ui.slider(L.controls, { label: "F₂ の向き", min: 0, max: 360, step: 5, value: 120, unit: "°", digits: 0, onInput: () => draw() });
    PL.ui.section(L.controls, "3 つ目のおもり（つり合いは自分で探す）");
    const sF3 = PL.ui.slider(L.controls, { label: "F₃ の大きさ", min: 1, max: 16, step: 0.5, value: 6, unit: "N", digits: 1, onInput: () => draw() });
    const sA3 = PL.ui.slider(L.controls, { label: "F₃ の向き", min: 0, max: 360, step: 5, value: 240, unit: "°", digits: 0, onInput: () => draw() });
    PL.ui.note(L.controls, "再生を押すと中心の輪をはなします。3 力がつり合っていないと、輪は合力の向きに引かれて中心のピンに当たります。F₃ を調節して（または台のふちの滑車をそのままドラッグして）、輪がピンにふれずにまん中で止まるようにします。このときの F₃ が、F₁ と F₂ の合力とつり合う力です。");
    const rMag = PL.ui.readout(L.readouts, { label: "合力の大きさ", unit: "N" });
    const rAng = PL.ui.readout(L.readouts, { label: "合力の向き", unit: "°" });
    const rEq = PL.ui.readout(L.readouts, { label: "つり合わせる力の向き", unit: "°" });
    const rNet = PL.ui.readout(L.readouts, { label: "3 力の合力 ΣF", unit: "N" });

    /*
     * 中心環的狀態：p 是環心相對盤心的位移（px），vel 為速度（px/s）。
     * 盤面半徑當作 15 cm，用來把 N/kg 的加速度換成 px/s²。
     * 中心銷讓環最多只能偏 CLR px——真實力桌上環就是這樣被銷子擋住的。
     */
    const RING = 15, PIN = 4, CLR = RING - PIN;
    let p = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, geo = null;
    const forces = () => [[sF1.get(), sA1.get()], [sF2.get(), sA2.get()], [sF3.get(), sA3.get()]];
    /* 環在位置 q 時三條繩的合力（N，畫布座標：y 向下） */
    function netAt(q) {
      const R = geo.R + 6;
      let fx = 0, fy = 0;
      forces().forEach(([f, deg]) => {
        const a = deg * Math.PI / 180, dx = Math.cos(a) * R - q.x, dy = -Math.sin(a) * R - q.y, d = Math.hypot(dx, dy) || 1;
        fx += f * dx / d; fy += f * dy / d;
      });
      return { x: fx, y: fy };
    }
    /* 中心銷擋住環：超出間隙就推回來，並吃掉往外的速度（輕微反彈） */
    function pinContact(q, w) {
      const d = Math.hypot(q.x, q.y);
      if (d <= CLR) return false;
      const nx = q.x / d, ny = q.y / d;
      q.x = nx * CLR; q.y = ny * CLR;
      if (w) { const vr = w.x * nx + w.y * ny; if (vr > 0) { w.x -= 1.3 * vr * nx; w.y -= 1.3 * vr * ny; } }
      return true;
    }
    function step(dt) {
      if (!geo || !(dt > 0)) return;
      const M = forces().reduce((s, f) => s + f[0], 0) / 9.8 + 0.01;   // 環＋三組砝碼一起被拉動
      const pxPerM = geo.R / 0.15;
      let left = Math.min(dt, 0.1);
      while (left > 1e-6) {
        const h = Math.min(left, 1 / 240), F = netAt(p);
        vel.x += (F.x / M * pxPerM - 3 * vel.x) * h; vel.y += (F.y / M * pxPerM - 3 * vel.y) * h;
        p.x += vel.x * h; p.y += vel.y * h;
        pinContact(p, vel);
        left -= h;
      }
    }
    /* 暫停時時間不走：直接求出環最後會停的位置（沿合力方向鬆弛，並受中心銷限制） */
    function settle() {
      const q = { x: 0, y: 0 };
      for (let i = 0; i < 400; i++) { const F = netAt(q); q.x += F.x * 1.5; q.y += F.y * 1.5; pinContact(q); }
      p = q; vel = { x: 0, y: 0 };
    }
    const clock = PL.motion.clock(dt => { step(dt); draw(); });
    const angOf = (x, y) => ((Math.atan2(-(y - geo.cy), x - geo.cx) * 180 / Math.PI) + 360) % 360;
    const grips = [[sA1, "F₁ の滑車（ドラッグして向きを変える）"], [sA2, "F₂ の滑車（ドラッグして向きを変える）"], [sA3, "F₃ の滑車（ドラッグしてつり合う向きを探す）"]]
      .map(([sl, label]) => PL.ui.handle(cv, { slider: sl, label, toValue: (x, y) => angOf(x, y) }));

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const cx = W / 2, cy = H / 2;
      const AP = PL.apparatus;
      /* 真實的力桌（俯視）：盤緣夾滑輪，繩子吊砝碼。砝碼的重量就是那一條繩的拉力 */
      const deskG = ctx.createLinearGradient(0, 0, 0, H);
      deskG.addColorStop(0, PL.theme.isLight() ? "#d9b88a" : "#4f3a26"); deskG.addColorStop(1, PL.theme.isLight() ? "#c9a26d" : "#3f2e1e");
      ctx.fillStyle = deskG; ctx.fillRect(0, 0, W, H);
      PL.theme.note(ctx, PL.theme.isLight() ? "#d2ae7c" : "#473422", 0, 0, W, H);
      const f1 = sF1.get(), a1 = sA1.get() * Math.PI / 180, f2 = sF2.get(), a2 = sA2.get() * Math.PI / 180, f3 = sF3.get(), a3 = sA3.get() * Math.PI / 180;
      const R = Math.min(W, H) * 0.36, S = Math.min(15, R / 9);
      geo = { cx, cy, R };
      // 還沒開始：手指按住中心環在正中央，按播放才放手；跑過之後暫停，就直接顯示最後停的位置
      const fresh = clock.t === 0 && !clock.running;
      if (fresh) { p = { x: 0, y: 0 }; vel = { x: 0, y: 0 }; } else if (!clock.running) settle();
      const rx = cx + p.x, ry = cy + p.y;
      const pulleyAt = AP.forceTableTop(ctx, cx, cy, R);
      // 三條繩從「環」拉到滑輪（環偏離中心時繩的方向跟著變，這就是恢復力的來源）
      const ropes = [[sA1.get(), f1, "#2f6fd0"], [sA2.get(), f2, "#7a4fd0"], [sA3.get(), f3, "#b0801e"]];
      ropes.forEach(([deg]) => {
        const a = -deg * Math.PI / 180, px = cx + Math.cos(a) * (R + 6), py = cy + Math.sin(a) * (R + 6);
        const d = Math.hypot(px - rx, py - ry) || 1;
        ctx.strokeStyle = "rgba(90,70,40,0.9)"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(rx + (px - rx) / d * RING, ry + (py - ry) / d * RING); ctx.lineTo(px, py); ctx.stroke();
      });
      // 器材函式會從盤心畫一段繩到滑輪；盤面內那段改由上面從環畫出，所以把它裁掉
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(cx, cy, R - 5, 0, Math.PI * 2, true); ctx.clip("evenodd");
      ropes.forEach(([deg, f, tint]) => pulleyAt(deg, PL.fmt(f / 9.8 * 1000, 0) + "g", tint));
      ctx.restore();
      ropes.forEach(([deg], i) => { const a = -deg * Math.PI / 180; grips[i].place(cx + Math.cos(a) * (R + 6), cy + Math.sin(a) * (R + 6)); });
      // 中心銷與中心環
      D.disc(ctx, cx, cy, PIN, { fill: "rgb(60,66,78)" });
      ctx.strokeStyle = "rgb(150,160,176)"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(rx, ry, RING, 0, Math.PI * 2); ctx.stroke();

      const v1 = { x: f1 * Math.cos(a1), y: -f1 * Math.sin(a1) }, v2 = { x: f2 * Math.cos(a2), y: -f2 * Math.sin(a2) }, rs = { x: v1.x + v2.x, y: v1.y + v2.y };
      const v3 = { x: f3 * Math.cos(a3), y: -f3 * Math.sin(a3) };
      // 盤面是淺色鋁盤（深色主題也一樣），輔助線一律用深色才看得到
      const pale = "rgba(40,50,64,0.38)";
      D.line(ctx, rx + v1.x * S, ry + v1.y * S, rx + rs.x * S, ry + rs.y * S, pale, 1, [4, 4]);
      D.line(ctx, rx + v2.x * S, ry + v2.y * S, rx + rs.x * S, ry + rs.y * S, pale, 1, [4, 4]);
      D.arrow(ctx, rx, ry, rx + v1.x * S, ry + v1.y * S, { color: PL.col("accent-2"), width: 2.4, label: "F₁" });
      D.arrow(ctx, rx, ry, rx + v2.x * S, ry + v2.y * S, { color: PL.col("accent-3"), width: 2.4, label: "F₂" });
      D.arrow(ctx, rx, ry, rx + rs.x * S, ry + rs.y * S, { color: MC(), width: 3, label: "合力" });
      D.arrow(ctx, rx, ry, rx - rs.x * S, ry - rs.y * S, { color: PL.col("warn"), width: 2, label: "必要なつり合わせる力", dash: [5, 4] });
      D.arrow(ctx, rx, ry, rx + v3.x * S, ry + v3.y * S, { color: "#c98a1c", width: 2.6, label: "F₃", lx: -24, ly: 14 });
      const mag = Math.hypot(rs.x, rs.y), ang = (Math.atan2(-rs.y, rs.x) * 180 / Math.PI + 360) % 360;
      const net = Math.hypot(rs.x + v3.x, rs.y + v3.y), netAng = (Math.atan2(-(rs.y + v3.y), rs.x + v3.x) * 180 / Math.PI + 360) % 360;
      // 判讀看的是環本身：碰到中心銷＝三力不平衡（實驗上就是這樣判斷的）
      const touching = Math.hypot(p.x, p.y) > CLR - 0.6;
      const msg = fresh ? "指で中心の輪をおさえている · 再生を押すとはなす"
        : touching ? (W < 560 ? "3 力がつり合っていない：輪が中心のピンに当たっている" : "輪は " + PL.fmt(netAng, 0) + "° の向きに引かれて中心のピンに当たっている：3 力はつり合っていない（ΣF = " + PL.fmt(net, 2) + " N）")
        : "輪はピンにふれずにまん中で止まっている：3 力はつり合っている";
      D.text(ctx, msg, 16, 24, { color: PL.col(touching && !fresh ? "danger" : "text"), size: 12, weight: "700" });
      rMag.set(mag, 2); rAng.set(ang, 0); rEq.set((ang + 180) % 360, 0); rNet.set(net, 2);
    }
    cv.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: () => draw() };
  }});

  /* 虎克定律與彈簧 */
  PL.register("hookes-law", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.72);
    const sM = PL.ui.slider(L.controls, { label: "つるす質量 m", min: 0, max: 5, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: () => draw() });
    const sK = PL.ui.slider(L.controls, { label: "ばね定数 k", min: 20, max: 200, step: 10, value: 100, unit: "N/m", digits: 0, onInput: () => draw() });
    PL.ui.note(L.controls, "のび x = mg/k。F–x グラフは原点を通る直線で、傾きが k です。再生中におもりを変えると、ばねは上下に振動してから新しいつり合いの位置で止まります。おもりを直接下に引いてはなすこともできます。");
    const rX = PL.ui.readout(L.readouts, { label: "のび x", unit: "cm" });
    const rF = PL.ui.readout(L.readouts, { label: "引く力 F=mg", unit: "N" });
    const rK = PL.ui.readout(L.readouts, { label: "ばね定数 k", unit: "N/m" });
    /*
     * 砝碼的實際伸長量 y 照 m·y'' = mg − k·y − b·y' 演化（b 為空氣與彈簧內摩擦）。
     * 平衡位置 mg/k 是讀數；畫面上的砝碼要先振盪一陣子才停在那裡——
     * 「平衡」是運動停下來的結果，不是一開始就在那裡。
     */
    let y = 2 * 9.8 / 100, vy = 0, grabbed = false, geo = { topY: 44, natural: 66, cx: 0 };
    const PX_PER_M = 320;
    const clock = PL.motion.clock(dt => { step(dt); draw(); });
    function step(dt) {
      const m = Math.max(sM.get(), 0.05), k = sK.get(), eq = sM.get() * 9.8 / k;
      if (grabbed || !dt) return;
      let left = Math.min(dt, 0.1);
      while (left > 1e-6) {
        const h = Math.min(left, 1 / 240);
        const acc = (m * 9.8 - k * y) / m - 0.9 * vy;
        vy += acc * h; y += vy * h; left -= h;
      }
      if (sM.get() === 0 && Math.abs(y) < 1e-4) { y = eq; vy = 0; }
    }
    const grip = PL.ui.handle(cv, { label: "おもり（下に引いてからはなす）",
      onDrag: (x, py) => {
        grabbed = true; vy = 0;
        y = PL.clamp((py - geo.topY - geo.natural) / PX_PER_M, 0, (cv.H - 170) / PX_PER_M);
        draw();
      },
      onRelease: () => { grabbed = false; if (!clock.running) clock.start(); } });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const A = PL.apparatus;
      const m = sM.get(), k = sK.get(), F = m * 9.8, x = F / k;
      // 還沒開始（t = 0）：手托著砝碼停在彈簧原長，按播放才放手。
      // 跑過之後再暫停：時間不走，換參數直接顯示新的平衡狀態。
      const fresh = clock.t === 0 && !clock.running;
      if (!clock.running && !grabbed) { y = fresh ? 0 : x; vy = 0; }
      const topY = 44, cx = W * 0.28, natural = 66, ext = PL.clamp(y * PX_PER_M, 0, H - 170);
      geo = { topY, natural, cx };
      const baseY = H - 26;

      /* 鐵架 + 橫桿：彈簧是掛在實驗架上的，不是憑空吊著 */
      A.benchTop(ctx, W, H, baseY - 6);
      A.standRod(ctx, cx - 78, baseY, topY - 24);
      A.crossArm(ctx, cx - 78, topY - 14, cx);

      // 對照用的刻度尺，讓「伸長量」是量出來的
      const pxPerCm = PX_PER_M / 100;
      A.ruler(ctx, cx + 52, topY + natural - 4, baseY - 12, pxPerCm);

      // 平衡位置的虛線：砝碼最後會停在這裡
      const eqY = topY + natural + PL.clamp(x * PX_PER_M, 0, H - 170);
      D.line(ctx, cx - 40, eqY, cx + 50, eqY, PL.theme.pale(0.45), 1, [4, 4]);
      D.text(ctx, "つり合い", cx - 44, eqY + 4, { color: PL.col("text-faint"), size: 10, align: "right" });

      D.spring(ctx, cx, topY, cx, topY + natural + ext, 10, 11, MC());
      A.weight(ctx, cx, topY + natural + ext, 44, 36, m + " kg");
      grip.place(cx, topY + natural + ext + 18);
      if (fresh && m > 0) D.text(ctx, "手でおもりを支えている · 再生を押すと手をはなす", cx + 30, topY + natural + 20, { color: PL.col("text-dim"), size: 11 });

      // 伸長量標註
      D.line(ctx, cx + 34, topY + natural, cx + 34, topY + natural + ext, PL.col("accent-2"), 2);
      D.line(ctx, cx + 28, topY + natural, cx + 40, topY + natural, PL.col("accent-2"), 1.4);
      D.line(ctx, cx + 28, topY + natural + ext, cx + 40, topY + natural + ext, PL.col("accent-2"), 1.4);
      D.text(ctx, "x", cx + 44, topY + natural + ext / 2, { color: PL.col("accent-2"), size: 12, weight: "700" });
      const bx = W * 0.52, by = 30, bw = W - bx - 20, bh = H - 60;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: 0.6, y0: 0, y1: 60 });
      g.frame({ title: "F – x（傾き = k）", xlabel: "x (m)", ylabel: "F (N)" }); g.grid(4, 4);
      g.fn(xx => k * xx, { color: MC(), width: 2.2 });
      // 彈力 k·y 隨振盪在直線上來回滑動；停下來時落在 F = mg 那一點
      g.dot(Math.min(y, 0.6), Math.min(k * y, 60), { color: PL.col("accent-2"), glow: PL.col("accent-2") });
      rX.set(x * 100, 1); rF.set(F, 1); rK.set(k, 0);
    }
    cv.onResize(draw); draw();
    return { stop() { clock.stop(); cv.destroy(); }, rerender: draw };
  }});
  /* 題型：水平推力壓住鉛直牆面的摩擦力 */
  PL.register("wall-friction", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    let y = 0, v = 0, released = false;
    PL.ui.section(L.controls, "よくある場面");
    const sM = PL.ui.slider(L.controls, { label: "物体の質量 m", min: 0.5, max: 4, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: () => draw(), onReset: reset });
    const sF = PL.ui.slider(L.controls, { label: "水平に押す力 F", min: 5, max: 200, step: 1, value: 60, unit: "N", digits: 0, onInput: () => draw(), onReset: reset });
    const sMs = PL.ui.slider(L.controls, { label: "静止摩擦係数 μₛ", min: 0.2, max: 0.9, step: 0.02, value: 0.4, unit: "", digits: 2, onInput: () => draw(), onReset: reset });
    const sMk = PL.ui.slider(L.controls, { label: "動摩擦係数 μₖ", min: 0.1, max: 0.7, step: 0.02, value: 0.3, unit: "", digits: 2, onInput: () => draw(), onReset: reset });
    const presets = PL.ui.chipGroup(L.controls, { value: "hold", options: [
      { value: "hold", label: "しっかり静止" }, { value: "critical", label: "ぎりぎりすべり落ちない" }, { value: "slip", label: "摩擦が足りない" }
    ], onChange: value => {
      if (value === "hold") { sM.set(2); sMs.set(0.4); sMk.set(0.3); sF.set(60); }
      if (value === "critical") { sM.set(2); sMs.set(0.4); sMk.set(0.3); sF.set(49); }
      if (value === "slip") { sM.set(2); sMs.set(0.4); sMk.set(0.3); sF.set(32); }
      reset();
    }});
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "物体をはなす", () => { reset(); released = true; if (model().sliding) anim.start(); else draw(); }, { primary: true });
    PL.ui.button(row, "リセット", reset);
    PL.ui.note(L.controls, "静止しているとき、摩擦力は重力とつり合うだけでよいので <b>fₛ = mg</b> です。押す力を大きくしても、N と最大摩擦力が大きくなるだけです。 ");
    const rN = PL.ui.readout(L.readouts, { label: "垂直抗力 N", unit: "N" });
    const rFriction = PL.ui.readout(L.readouts, { label: "実際の摩擦力 f", unit: "N" });
    const rLimit = PL.ui.readout(L.readouts, { label: "最大摩擦力", unit: "N" });
    const rState = PL.ui.readout(L.readouts, { label: "判断の結果" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "押す力と最大摩擦力", cap: "緑の線は最大摩擦力 μₛF です。これが mg より大きければ、実際の静止摩擦力は mg のままです。" });
    function model() {
      const m = sM.get(), F = sF.get(), mg = m * 9.8, fsMax = sMs.get() * F;
      const sliding = fsMax + 1e-9 < mg;
      const muK = Math.min(sMk.get(), sMs.get());
      const f = sliding ? muK * F : mg;
      return { m, F, mg, fsMax, sliding, f, a: sliding ? (mg - f) / m : 0 };
    }
    let rp = null;
    function reset() { y = 0; v = 0; released = false; if (rp) rp.clear(); draw(); }
    let pushX0 = 0;
    const grip = PL.ui.handle(cv, { slider: sF, label: "水平に押す力 F（矢印の根元をドラッグ）", toValue: px => (pushX0 - px) / 0.47 });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q = model(), wallX = W * 0.72, bw = Math.min(68, 42 + q.m * 7), bh = 38 + q.m * 4;
      const minY = 46, maxY = H - bh - 30, by = PL.clamp(H * 0.40 + y, minY, maxY), bx = wallX - bw - 12;
      const AP = PL.apparatus;
      AP.labRoom(ctx, W, H, H - 22, { bench: "wood" });
      AP.wallBlock(ctx, wallX, 0, H - 22, W - wallX, { dir: 1 });
      AP.massBlock(ctx, bx + bw / 2, by + bh, bw, bh, { color: MC(), label: q.m + " kg", noShadow: true });
      if (rp) rp.mark(bx + bw / 2, by + bh / 2);
      // 手把物體壓在牆上：推力的來源
      AP.hand(ctx, bx - 2, by + bh / 2, 1, 1.05);
      const cy = by + bh / 2, forceScale = 0.55;
      // 推力箭頭改成不封頂（0.47 px/N，200 N 時 94 px），尾端就能當把手：往左拉越長、推得越用力
      const pushLen = q.F * 0.47;
      D.arrow(ctx, bx - 70 - pushLen, cy - 26, bx - 70, cy - 26, { color: PL.col("accent-2"), width: 2.6, label: "押す力 F" });
      pushX0 = bx - 70; grip.place(bx - 70 - pushLen, cy - 26);
      D.arrow(ctx, bx + bw - 4, cy - 17, bx + bw - 4 - Math.min(84, q.F * forceScale), cy - 17, { color: "#8db7ff", width: 2.3, label: "N" });
      D.arrow(ctx, bx + bw / 2, by + bh / 2, bx + bw / 2, by + bh / 2 + 48, { color: PL.col("warn"), width: 2.3, label: "mg" });
      const fLen = Math.min(60, q.f * 2.1);
      D.arrow(ctx, bx + bw / 2 - 8, by + bh / 2, bx + bw / 2 - 8, by + bh / 2 - fLen, { color: q.sliding ? PL.col("danger") : "#7ee0c0", width: 2.4, label: q.sliding ? "fₖ" : "fₛ" });
      D.text(ctx, released ? (q.sliding ? "摩擦が足りない：物体がすべり落ちる" : "力がつり合っている：静止したまま") : "先にパラメータを調節してから「物体をはなす」を押す", 24, 30, { color: q.sliding ? PL.col("danger") : "#7ee0c0", size: 12 });
      /*
       * 「動摩擦係數 μₖ」原本只在物體真的開始下滑之後才影響畫面。
       * 物理上沒錯，但學生在靜止狀態拉這根滑桿會以為它壞了，
       * 也就學不到「一旦滑動，摩擦力會掉到比最大靜摩擦更小」這個重點。
       *
       * 改成兩條並排的對照棒：上面是最大靜摩擦 μₛN，下面是動摩擦 μₖN，
       * 再畫一條重力的參考線。μₖ 的棒子隨滑桿即時變化，
       * 而「動摩擦棒比靜摩擦棒短」這件事一眼就看得到。
       */
      const sx = 28, sy = H - 76, sw = Math.min(200, W * 0.42);
      AP.infoCard(ctx, sx - 12, sy - 26, sw + 170, 66);
      const ratioS = Math.min(1, q.fsMax / q.mg);
      // 靠牆的情形，正向力就是水平推力本身（模型裡叫 q.F，不是 q.N）。
      // 第一版誤用 q.N，算出 NaN，長條完全沒畫出來——量化稽核抓到了這個錯。
      const ratioK = Math.min(1, (sMk.get() * q.F) / q.mg);
      D.text(ctx, "最大摩擦力 ÷ 重力", sx, sy - 10, { color: PL.col("text-dim"), size: 11 });
      [[0, ratioS, "最大摩擦力 μₛN", q.sliding ? PL.col("danger") : "#4dd0a0"],
       [16, ratioK, "動摩擦力 μₖN", PL.col("warn")]].forEach(([dy, ratio, lab, cc2]) => {
        D.rect(ctx, sx, sy + dy, sw, 10, { fill: PL.theme.pale(0.10), r: 5 });
        D.rect(ctx, sx, sy + dy, sw * ratio, 10, { fill: cc2, r: 5 });
        D.text(ctx, lab + " = " + PL.fmt(ratio, 2), sx + sw + 8, sy + dy + 9,
          { color: cc2, size: 9.5 });
      });
      // 重力那條線：摩擦棒超過它就撐得住，沒超過就會滑
      D.line(ctx, sx + sw, sy - 4, sx + sw, sy + 30, PL.col("text-faint"), 1.4, [3, 3]);
      D.text(ctx, "支えるのに必要な力", sx + sw - 2, sy - 8, { color: PL.col("text-faint"), size: 8.5, align: "right" });
      rN.set(q.F, 1); rFriction.set(q.f, 1); rLimit.set(q.fsMax, 1); rState.set(q.sliding ? "すべり落ちる" : "静止");
      cc.clear();
      const ymax = Math.max(q.mg * 1.35, sMs.get() * 200 * 1.05, 10);
      const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 0, x1: 200, y0: 0, y1: ymax });
      g.frame({ xlabel: "押す力 F (N)", ylabel: "力 (N)" }); g.grid(5, 4);
      g.fn(x => sMs.get() * x, { color: "#4dd0a0", width: 2.2 });
      g.hline(q.mg, { color: PL.col("warn"), dash: [4, 3], width: 1.4 });
      g.label(4, q.mg, "必要な fₛ = mg", { color: PL.col("warn"), size: 10, dy: -5 });
      g.dot(q.F, q.fsMax, { color: MC(), glow: MC() });
    }
    const anim = PL.loop(dt => {
      if (dt && released) {
        const q = model();
        if (q.sliding) { v += q.a * dt; y += v * dt * 34; if (y > cv.H * 0.42) { y = cv.H * 0.42; v = 0; rp.end(); } }
      }
      draw();
    });
    rp = PL.motion.replay(cv, { loop: anim, label: "物体（元の位置にもどすと、またはなせる）",
      snapshot: () => ({ y, v }), restore: q => { y = q.y; v = q.v; },
      reset: () => { y = 0; v = 0; released = true; }, redraw: draw });
    cv.onResize(draw); cc.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 題型：推動下方物體時，上方物體受靜摩擦帶動 */
  PL.register("stacked-block-friction", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    let xTop = 0, xBottom = 0, vTop = 0, vBottom = 0, released = false;
    PL.ui.section(L.controls, "重ねた物体のパラメータ");
    const sTop = PL.ui.slider(L.controls, { label: "上の質量 m₁", min: 0.5, max: 4, step: 0.5, value: 1, unit: "kg", digits: 1, onInput: () => draw(), onReset: reset });
    const sBottom = PL.ui.slider(L.controls, { label: "下の質量 m₂", min: 0.5, max: 6, step: 0.5, value: 3, unit: "kg", digits: 1, onInput: () => draw(), onReset: reset });
    const sF = PL.ui.slider(L.controls, { label: "下の物体を押す力 F", min: 0, max: 100, step: 1, value: 20, unit: "N", digits: 0, onInput: () => draw(), onReset: reset });
    const sMs = PL.ui.slider(L.controls, { label: "静止摩擦係数 μₛ", min: 0.05, max: 0.9, step: 0.02, value: 0.5, unit: "", digits: 2, onInput: () => draw(), onReset: reset });
    const sMk = PL.ui.slider(L.controls, { label: "動摩擦係数 μₖ", min: 0.05, max: 0.7, step: 0.02, value: 0.35, unit: "", digits: 2, onInput: () => draw(), onReset: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "押す", () => { reset(); released = true; anim.start(); }, { primary: true });
    PL.ui.button(row, "リセット", reset);
    PL.ui.note(L.controls, "下の物体が右に押されると、上の物体は下の物体に対して<b>左にすべろう</b>とするので、上の物体が受ける摩擦力は右向きです。 ");
    const rNeed = PL.ui.readout(L.readouts, { label: "必要な摩擦力", unit: "N" });
    const rMax = PL.ui.readout(L.readouts, { label: "最大摩擦力", unit: "N" });
    const rA = PL.ui.readout(L.readouts, { label: "上の物体の加速度", unit: "m/s²" });
    const rState = PL.ui.readout(L.readouts, { label: "判断の結果" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "必要な摩擦力と最大摩擦力", cap: "まず 2 つの物体をひとまとめにして a を求め、f = m₁a で静止摩擦力が足りるか確かめます。" });
    function model() {
      const m1 = sTop.get(), m2 = sBottom.get(), F = sF.get(), fNeed = m1 * F / (m1 + m2), fMax = sMs.get() * m1 * 9.8;
      const grip = fNeed <= fMax + 1e-9;
      const muK = Math.min(sMk.get(), sMs.get());
      const f = grip ? fNeed : muK * m1 * 9.8;
      return { m1, m2, F, fNeed, fMax, grip, f, aTop: f / m1, aBottom: grip ? F / (m1 + m2) : (F - f) / m2 };
    }
    let rp = null;
    function reset() { xTop = xBottom = vTop = vBottom = 0; released = false; if (rp) rp.clear(); draw(); }
    let pushX0 = 0;
    const grip = PL.ui.handle(cv, { slider: sF, label: "下の物体を押す力 F（矢印をドラッグ）", toValue: px => (px - pushX0) / 0.86 });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q = model(), gy = H * 0.72, cx = W * 0.28, shiftTop = xTop * 8, shiftBottom = xBottom * 8;
      const AP = PL.apparatus;
      AP.labRoom(ctx, W, H, gy, { bench: "wood" });
      const lowerW = Math.min(160, 92 + q.m2 * 11), lowerH = 48, upperW = Math.min(112, 60 + q.m1 * 12), upperH = 40;
      const lowerX = cx + shiftBottom, upperX = cx + shiftTop;
      AP.massBlock(ctx, lowerX, gy, lowerW, lowerH, { color: "#ffab80", label: "m₂" });
      if (rp) rp.mark(lowerX, gy - lowerH / 2);
      AP.massBlock(ctx, upperX, gy - lowerH, upperW, upperH, { color: MC(), label: "m₁", noShadow: true });
      if (!released || xBottom < 0.3) AP.hand(ctx, lowerX - lowerW / 2 - 1, gy - lowerH / 2, 1, 1.15);
      // 推力箭頭 0.86 px/N（100 N 時 86 px），不再封頂，尖端就是把手
      D.arrow(ctx, lowerX + lowerW / 2, gy - 18, lowerX + lowerW / 2 + q.F * 0.86, gy - 18, { color: PL.col("accent-2"), width: 2.6, label: "F" });
      pushX0 = lowerX + lowerW / 2; grip.place(pushX0 + q.F * 0.86, gy - 18);
      const upperY = gy - lowerH - upperH / 2;
      D.arrow(ctx, upperX, upperY, upperX + Math.min(60, q.f * 3), upperY, { color: "#7ee0c0", width: 2.2, label: "上が受ける f" });
      D.arrow(ctx, lowerX, gy - lowerH + 6, lowerX - Math.min(60, q.f * 3), gy - lowerH + 6, { color: PL.col("danger"), width: 2.2, label: "下が受ける f" });
      D.text(ctx, q.grip ? "静止摩擦力が足りている：2 つの物体がいっしょに加速する" : "静止摩擦力が足りない：上の物体が下の物体に対して後ろへすべる", 24, 30, { color: q.grip ? "#7ee0c0" : PL.col("danger"), size: 12 });
      rNeed.set(q.fNeed, 2); rMax.set(q.fMax, 2); rA.set(q.aTop, 2); rState.set(q.grip ? "物体のあいだですべらない" : "物体のあいだですべる");
      cc.clear();
      const ymax = Math.max(q.fMax * 1.3, sTop.get() * 100 / (sTop.get() + sBottom.get()) * 1.1, 5);
      const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 0, x1: 100, y0: 0, y1: ymax });
      g.frame({ xlabel: "押す力 F (N)", ylabel: "摩擦力 (N)" }); g.grid(5, 4);
      g.fn(x => q.m1 * x / (q.m1 + q.m2), { color: MC(), width: 2.2 });
      g.hline(q.fMax, { color: PL.col("warn"), dash: [4, 3], width: 1.4 });
      g.label(2, q.fMax, "最大摩擦力", { color: PL.col("warn"), size: 10, dy: -5 });
      g.dot(q.F, q.fNeed, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    const anim = PL.loop(dt => {
      if (dt && released) {
        const q = model(); vTop += q.aTop * dt; vBottom += q.aBottom * dt; xTop += vTop * dt; xBottom += vBottom * dt;
        if (xBottom > 26 || xTop > 26) rp.end();      // 推到桌邊就停；拖回起點（或再按播放）重來
      }
      draw();
    });
    rp = PL.motion.replay(cv, { loop: anim, label: "下の木片（始点にもどすと、もう一度押せる）",
      snapshot: () => ({ xTop, xBottom, vTop, vBottom }),
      restore: q => { ({ xTop, xBottom, vTop, vBottom } = q); },
      reset: () => { xTop = xBottom = vTop = vBottom = 0; released = true; }, redraw: draw });
    cv.onResize(draw); cc.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 題型：兩條繩子共同懸掛重物
   *
   * 舊版是一張定格的受力圖。真實的繩子會微微伸長：手托住重物再放開，重物會往下掉、
   * 被兩條繩拉住後上下（拉偏的話還會左右）擺盪，最後停在兩繩張力與重力平衡的位置。
   * 這裡把兩條繩當成很硬的彈性繩，剛好在平衡點時伸長量給出公式算出的 Tₗ、Tᵣ；
   * 張力箭頭跟著實際伸長量變化，晃動停下後就落在讀數的值上。
   */
  PL.register("two-rope-equilibrium", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    PL.ui.section(L.controls, "つるし方の条件");
    const sM = PL.ui.slider(L.controls, { label: "おもりの質量 m", min: 0.5, max: 12, step: 0.5, value: 4, unit: "kg", digits: 1, onInput: () => draw() });
    const sL = PL.ui.slider(L.controls, { label: "左の糸と水平のなす角 θₗ", min: 12, max: 78, step: 1, value: 45, unit: "°", digits: 0, onInput: () => draw() });
    const sR = PL.ui.slider(L.controls, { label: "右の糸と水平のなす角 θᵣ", min: 12, max: 78, step: 1, value: 45, unit: "°", digits: 0, onInput: () => draw() });
    const presets = PL.ui.chipGroup(L.controls, { value: "symmetric", options: [
      { value: "symmetric", label: "左右対称につるす" }, { value: "uneven", label: "角度が違う" }, { value: "flat", label: "糸が水平に近い" }
    ], onChange: value => {
      if (value === "symmetric") { sL.set(45); sR.set(45); }
      if (value === "uneven") { sL.set(30); sR.set(60); }
      if (value === "flat") { sL.set(18); sR.set(18); }
      draw();
    }});
    PL.ui.note(L.controls, "2 本の糸が水平に近いほど、同じ上向きの成分を出すために張力が急に大きくなります。再生を押すとおもりをはなし、ゆれてからつり合いの位置で止まるのが見られます。おもりを引いてはなしたり、2 本の柱のてっぺんの輪をドラッグして糸の角度を変えたりもできます。 ");
    const rTL = PL.ui.readout(L.readouts, { label: "左の糸の張力 Tₗ", unit: "N" });
    const rTR = PL.ui.readout(L.readouts, { label: "右の糸の張力 Tᵣ", unit: "N" });
    const rV = PL.ui.readout(L.readouts, { label: "鉛直成分の合計", unit: "N" });
    const rState = PL.ui.readout(L.readouts, { label: "つり合いの判断" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "左の糸の角度と張力", cap: "右の糸の角度を固定すると、左の糸が水平に近いほど 2 本の糸の張力は大きくなります。" });
    function model(leftDeg, rightDeg) {
      const m = sM.get(), l = (leftDeg == null ? sL.get() : leftDeg) * Math.PI / 180, r = (rightDeg == null ? sR.get() : rightDeg) * Math.PI / 180;
      const mg = m * 9.8, denom = Math.sin(l + r);
      return { m, l, r, mg, tl: mg * Math.cos(r) / denom, tr: mg * Math.cos(l) / denom };
    }
    /*
     * 繩結（與重物）的位移 p（px，相對平衡點）與速度 vel（px/s）。
     * 繩子的勁度取「受力較大的那條在平衡時伸長 STRETCH px」，所以不論多重都只晃幾個像素到十幾個像素；
     * 畫面上 1 m 當作 PX_PER_M px，用來把 N/kg 換成 px/s²。
     */
    const STRETCH = 9, PX_PER_M = 100;
    // 手要把重物托高多少，兩條繩才都鬆掉：繩越平，往上抬造成的縮短越少，要抬得越高
    const hold = () => Math.min(50, STRETCH / Math.sin(Math.min(sL.get(), sR.get()) * Math.PI / 180) + 3);
    let p = { x: 0, y: -hold() }, vel = { x: 0, y: 0 }, grabbed = false, geo = null;
    function ropes(q) {
      const k = Math.max(q.tl, q.tr) / STRETCH;
      return [
        { ax: geo.lx, ay: geo.ly, rest: geo.len - q.tl / k, k },
        { ax: geo.rx, ay: geo.ry, rest: geo.len - q.tr / k, k }
      ];
    }
    /* 繩結在 (x, y) 時兩條繩的張力（只拉不推：繩子鬆了張力就是 0） */
    function tensions(q, x, y) {
      return ropes(q).map(r => {
        const dx = r.ax - x, dy = r.ay - y, d = Math.hypot(dx, dy) || 1, ext = d - r.rest;
        return { T: ext > 0 ? r.k * ext : 0, ux: dx / d, uy: dy / d, slack: ext <= 0, d, rest: r.rest };
      });
    }
    function step(dt) {
      if (!geo || grabbed || !(dt > 0)) return;
      const q = model();
      let left = Math.min(dt, 0.1);
      while (left > 1e-6) {
        const h = Math.min(left, 1 / 480);
        const ts = tensions(q, geo.cx + p.x, geo.cy + p.y);
        const fx = ts[0].T * ts[0].ux + ts[1].T * ts[1].ux, fy = ts[0].T * ts[0].uy + ts[1].T * ts[1].uy + q.mg;
        vel.x += (fx / q.m * PX_PER_M - 1.6 * vel.x) * h; vel.y += (fy / q.m * PX_PER_M - 1.6 * vel.y) * h;
        p.x += vel.x * h; p.y += vel.y * h; left -= h;
      }
    }
    const clock = PL.motion.clock(dt => { step(dt); draw(); });
    const grip = PL.ui.handle(cv, { label: "おもり（引いてからはなす）",
      onDrag: (x, y) => {
        if (!geo) return;
        grabbed = true; vel = { x: 0, y: 0 };
        const dx = x - geo.cx, dy = y - geo.blockMid - geo.cy, d = Math.hypot(dx, dy), lim = 46;
        p = d > lim ? { x: dx / d * lim, y: dy / d * lim } : { x: dx, y: dy };
        draw();
      },
      onRelease: () => { grabbed = false; if (!clock.running) clock.start(); } });
    // 吊環：沿著以繩結為圓心的圓弧拖，就是改繩子的仰角
    const ringL = PL.ui.handle(cv, { slider: sL, label: "左の輪（ドラッグして θₗ を変える）", toValue: (x, y) => Math.atan2(geo.cy - y, geo.cx - x) * 180 / Math.PI });
    const ringR = PL.ui.handle(cv, { slider: sR, label: "右の輪（ドラッグして θᵣ を変える）", toValue: (x, y) => Math.atan2(geo.cy - y, x - geo.cx) * 180 / Math.PI });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q = model(), cx = W * 0.5, cy = H * 0.48, len = Math.min(W * 0.27, H * 0.55);
      const lx = cx - len * Math.cos(q.l), ly = cy - len * Math.sin(q.l), rx = cx + len * Math.cos(q.r), ry = cy - len * Math.sin(q.r);
      geo = { cx, cy, len, lx, ly, rx, ry, blockMid: 76 };  // 把手放在重物底緣，不蓋住質量標示
      // t = 0：手托著重物、繩子還鬆著；按播放才放手。跑過之後暫停：時間不走，直接停在平衡點。
      const fresh = clock.t === 0 && !clock.running;
      if (!clock.running && !grabbed) { p = fresh ? { x: 0, y: -hold() } : { x: 0, y: 0 }; vel = { x: 0, y: 0 }; }
      const kx = cx + p.x, ky = cy + p.y;
      const ts = tensions(q, kx, ky);
      const AP = PL.apparatus;
      AP.labRoom(ctx, W, H, H - 20, { bench: "wood" });
      // 兩條繩各綁在一根立柱頂的吊環上
      [[lx, ly], [rx, ry]].forEach(pt => {
        AP.steel(ctx, pt[0] - 4, pt[1], 8, H - 20 - pt[1], 8);
        AP.steel(ctx, pt[0] - 16, H - 26, 32, 7, -6);
        AP.brassDisc(ctx, pt[0], pt[1], 5);
      });
      // 繩子：拉緊時是直線；鬆的時候往下垂成一條弧
      [[lx, ly, ts[0]], [rx, ry, ts[1]]].forEach(([ax, ay, t]) => {
        if (!t.slack) { AP.rope(ctx, ax, ay, kx, ky, 3, "#c8a46a"); return; }
        const sag = Math.sqrt(Math.max(0, t.rest * t.rest - t.d * t.d)) * 0.5;
        ctx.save(); ctx.strokeStyle = "#c8a46a"; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + kx) / 2, (ay + ky) / 2 + sag, kx, ky); ctx.stroke(); ctx.restore();
      });
      ctx.strokeStyle = "rgb(150,160,176)"; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.arc(kx, ky, 6, 0, Math.PI * 2); ctx.stroke();
      AP.rope(ctx, kx, ky + 6, kx, ky + 40, 2.4, "#c8a46a");
      AP.massBlock(ctx, kx, ky + 78, 56, 34, { color: MC(), label: q.m + " kg", hook: true, noShadow: true });
      if (fresh) AP.hand(ctx, kx, ky + 80, 1, 0.9, { ang: -Math.PI / 2 });
      grip.place(kx, ky + geo.blockMid);
      ringL.place(lx, ly); ringR.place(rx, ry);
      // 張力箭頭用「此刻」的張力：晃動時忽長忽短，停下來就是讀數的值
      const tl = ts[0].T, tr = ts[1].T;
      if (tl > 0.05) D.arrow(ctx, kx, ky, kx + ts[0].ux * Math.min(72, tl * 1.2), ky + ts[0].uy * Math.min(72, tl * 1.2), { color: "#8db7ff", width: 2.4, label: "Tₗ" });
      if (tr > 0.05) D.arrow(ctx, kx, ky, kx + ts[1].ux * Math.min(72, tr * 1.2), ky + ts[1].uy * Math.min(72, tr * 1.2), { color: "#7ee0c0", width: 2.4, label: "Tᵣ" });
      D.arrow(ctx, kx, ky, kx, ky + 58, { color: PL.col("warn"), width: 2.4, label: "mg" });
      D.text(ctx, "θₗ = " + sL.get() + "°", lx + 8, ly + 34, { color: "#8db7ff", size: 11 });
      D.text(ctx, "θᵣ = " + sR.get() + "°", rx - 8, ry + 34, { color: "#7ee0c0", size: 11, align: "right" });
      const swing = Math.hypot(p.x, p.y) > 0.4 || Math.hypot(vel.x, vel.y) > 2;
      // 窄螢幕上兩個吊環把手就在最上面，狀態文字會被蓋住，乾脆不畫
      if (W >= 480) D.text(ctx, fresh ? "手でおもりを支えていて、糸はまだ張っていない · 再生を押すとはなす"
        : swing ? "いまの Tₗ = " + PL.fmt(tl, 1) + " N、Tᵣ = " + PL.fmt(tr, 1) + " N" + (W < 560 ? "" : "（ゆれていて、張力が大きくなったり小さくなったりする）")
        : "静止：Tₗ、Tᵣ、mg の 3 力がつり合っている",
        16, 24, { color: PL.col("text"), size: 12, weight: "700" });
      rTL.set(q.tl, 1); rTR.set(q.tr, 1); rV.set(q.tl * Math.sin(q.l) + q.tr * Math.sin(q.r), 1); rState.set("ΣFₓ = 0，ΣFᵧ = 0");
      cc.clear();
      let yMax = 0;
      for (let a = 12; a <= 78; a += 1) { const pp = model(a, sR.get()); yMax = Math.max(yMax, pp.tl, pp.tr); }
      const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 12, x1: 78, y0: 0, y1: yMax * 1.1 });
      g.frame({ xlabel: "左の糸の角度 θₗ (°)", ylabel: "張力 (N)" }); g.grid(6, 4);
      g.fn(a => model(a, sR.get()).tl, { color: "#8db7ff", width: 2.2 });
      g.fn(a => model(a, sR.get()).tr, { color: "#7ee0c0", width: 2.2 });
      g.dot(sL.get(), q.tl, { color: "#8db7ff", glow: "#8db7ff" }); g.dot(sL.get(), q.tr, { color: "#7ee0c0", glow: "#7ee0c0" });
    }
    cv.onResize(() => draw()); cc.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); cc.destroy(); }, rerender: () => draw() };
  }});

  /* 題型：輸送帶與物體的相對滑動 */
  PL.register("conveyor-friction", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.58);
    let v = 0, t = 0, x = 0, running = false;
    PL.ui.section(L.controls, "ベルトコンベアと物体");
    const sBelt = PL.ui.slider(L.controls, { label: "ベルトの速さ u", min: -6, max: 6, step: 0.5, value: 3, unit: "m/s", digits: 1, onInput: () => draw(), onReset: reset });
    const sV0 = PL.ui.slider(L.controls, { label: "物体の初速度 v₀", min: -8, max: 8, step: 0.5, value: 0, unit: "m/s", digits: 1, onInput: reset });
    const sM = PL.ui.slider(L.controls, { label: "物体の質量 m", min: 0.5, max: 6, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: () => draw(), onReset: reset });
    const sMu = PL.ui.slider(L.controls, { label: "動摩擦係数 μₖ", min: 0.05, max: 0.8, step: 0.05, value: 0.3, unit: "", digits: 2, onInput: () => draw(), onReset: reset });
    const presets = PL.ui.chipGroup(L.controls, { value: "catch", options: [
      { value: "catch", label: "ベルトが物体を引っぱる" }, { value: "brake", label: "物体のほうが速い" }, { value: "opposite", label: "逆向きに出会う" }
    ], onChange: value => {
      if (value === "catch") { sBelt.set(3); sV0.set(0); sMu.set(0.3); }
      if (value === "brake") { sBelt.set(2); sV0.set(6); sMu.set(0.3); }
      if (value === "opposite") { sBelt.set(3); sV0.set(-4); sMu.set(0.3); }
      reset();
    }});
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "ベルトにのせる", () => { reset(); running = true; anim.start(); }, { primary: true });
    PL.ui.button(row, "リセット", reset);
    PL.ui.note(L.controls, "摩擦力の向きは、<b>物体がベルトに対して</b>すべろうとする向きで決まります。物体がベルトより遅ければ摩擦力はベルトの進む向き、速ければその逆です。");
    const rF = PL.ui.readout(L.readouts, { label: "摩擦力の大きさ", unit: "N" });
    const rA = PL.ui.readout(L.readouts, { label: "物体の加速度", unit: "m/s²" });
    const rV = PL.ui.readout(L.readouts, { label: "いまの物体の速さ", unit: "m/s" });
    const rMatch = PL.ui.readout(L.readouts, { label: "同じ速さになるまでの時間の予想", unit: "s" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "物体の速さとベルトの速さ", cap: "物体とベルトが同じ速さになると、もう相対的なすべりはなく、動摩擦力はなくなります。" });
    function model(speed) {
      const u = sBelt.get(), current = speed == null ? v : speed, delta = u - current, direction = Math.abs(delta) < 0.02 ? 0 : Math.sign(delta);
      const f = direction * sMu.get() * sM.get() * 9.8, a = f / sM.get();
      const tMatch = Math.abs(u - sV0.get()) / Math.max(0.0001, sMu.get() * 9.8);
      return { u, current, direction, f, a, tMatch };
    }
    let rp = null;
    function reset() { v = sV0.get(); t = 0; x = 0; running = false; if (rp) rp.clear(); draw(); }
    // 放上輸送帶前，直接拖物體上方的速度箭頭決定初速（9 px 代表 1 m/s，可往左拖成負值）
    let vX0 = 0;
    const grip = PL.ui.handle(cv, { slider: sV0, label: "物体の初速度 v₀（矢印をドラッグ）", toValue: px => (px - vX0) / 9 });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q = model(), beltY = H * 0.64, beltX = 32, beltW = W - 64, beltH = 38;
      const AP = PL.apparatus;
      AP.labRoom(ctx, W, H, beltY + beltH + 46, { bench: "wood" });
      AP.conveyor(ctx, beltX, beltX + beltW, beltY, beltH, t * q.u * 28);
      // 帶面運動方向
      for (let px = beltX + 40; px < beltX + beltW - 30; px += 90) D.arrow(ctx, px, beltY + beltH / 2, px + 18 * Math.sign(q.u || 1), beltY + beltH / 2, { color: "#e8eef5", width: 1.6, head: 5 });
      const bx = W * 0.5 + PL.clamp(x * 22, -W * 0.24, W * 0.24), bw = 80, bh = 54, by = beltY - bh;
      AP.crate(ctx, bx, beltY, bw, bh, { label: sM.get() + " kg" });
      if (rp) rp.mark(bx, beltY - bh / 2);
      if (q.direction) D.arrow(ctx, bx, by - 14, bx + q.direction * Math.min(72, Math.abs(q.f) * 7), by - 14, { color: q.direction > 0 ? "#7ee0c0" : PL.col("danger"), width: 2.5, label: "fₖ" });
      // 物體速度（相對地面）：和帶速比較，就知道摩擦力往哪邊
      D.arrow(ctx, bx, by - 44, bx + q.current * 9, by - 44, { color: PL.col("accent-2"), width: 2.2, head: 7, label: "v = " + PL.fmt(q.current, 1) });
      vX0 = bx; if (running) grip.hide(); else grip.place(bx + q.current * 9, by - 44);
      D.text(ctx, "ベルト u = " + PL.fmt(q.u, 1) + " m/s", beltX, beltY - 12, { color: PL.col("text-dim"), size: 12 });
      const state = q.direction === 0 ? "同じ速さ：相対的なすべりなし" : q.direction > 0 ? "物体がベルトより遅い：摩擦力は右向き" : "物体がベルトより速い：摩擦力は左向き";
      D.text(ctx, state, 24, 30, { color: q.direction === 0 ? "#7ee0c0" : PL.col("text-dim"), size: 12 });
      rF.set(Math.abs(q.f), 2); rA.set(q.a, 2); rV.set(q.current, 2); rMatch.set(q.tMatch, 2);
      cc.clear();
      const span = Math.max(1, q.tMatch * 1.3), vMin = Math.min(q.u, sV0.get(), 0) - 1, vMax = Math.max(q.u, sV0.get(), 0) + 1;
      const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 0, x1: span, y0: vMin, y1: vMax });
      g.frame({ xlabel: "時刻 t (s)", ylabel: "速さ (m/s)" }); g.grid(5, 4);
      g.hline(q.u, { color: "#8db7ff", dash: [4, 3], width: 1.5 });
      g.fn(tt => { const p = model(sV0.get()); const vv = sV0.get() + p.a * tt; return p.direction > 0 ? Math.min(vv, p.u) : p.direction < 0 ? Math.max(vv, p.u) : p.u; }, { color: MC(), width: 2.4 });
      g.dot(Math.min(t, span), q.current, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    const anim = PL.loop(dt => {
      if (dt && running) {
        const q = model();
        if (q.direction === 0) { v = q.u; running = false; rp.end(); }
        else { v += q.a * dt; x += v * dt; t += dt; if ((q.direction > 0 && v >= q.u) || (q.direction < 0 && v <= q.u)) { v = q.u; running = false; rp.end(); } }
      }
      draw();
    });
    rp = PL.motion.replay(cv, { loop: anim, label: "物体（始点にもどすと、またベルトにのせられる）",
      snapshot: () => ({ v, t, x, running }), restore: q => { ({ v, t, x, running } = q); },
      reset: () => { v = sV0.get(); t = 0; x = 0; running = true; }, redraw: draw });
    cv.onResize(draw); cc.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});
  /* 段考題型：沿斜面外力改變時的摩擦力方向
   *
   * 舊版是一張靜態受力圖。這一版讓木塊真的照受力運動：靜摩擦撐得住就不動；
   * 撐不住就往「驅動力」的方向滑（可能往上、也可能往下），滑動後摩擦力換成 μₖN、
   * 方向永遠與速度相反。滑到斜面一端後放回中間重來。讀數仍是起動瞬間的受力分析。
   * 預設外力 22 N 向上拉，超過最大靜摩擦：物體往上滑，摩擦力朝「下」——最常考錯的那一種。
   */
  PL.register("incline-applied-force", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" }), cv = PL.canvas.create(L.canvasWrap, 0.61);
    let forceDirection = "up";
    PL.ui.section(L.controls, "斜面と外力");
    const sM = PL.ui.slider(L.controls, { label: "物体の質量 m", min: 0.5, max: 5, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: () => draw() });
    const sAngle = PL.ui.slider(L.controls, { label: "斜面の角度 θ", min: 5, max: 55, step: 1, value: 30, unit: "°", digits: 0, onInput: () => draw() });
    const sForce = PL.ui.slider(L.controls, { label: "斜面方向の外力 F", min: 0, max: 55, step: 1, value: 22, unit: "N", digits: 0, onInput: () => draw() });
    const sMs = PL.ui.slider(L.controls, { label: "静止摩擦係数 μₛ", min: 0.1, max: 0.9, step: 0.02, value: 0.5, unit: "", digits: 2, onInput: () => draw() });
    const sMk = PL.ui.slider(L.controls, { label: "動摩擦係数 μₖ", min: 0.05, max: 0.7, step: 0.02, value: 0.35, unit: "", digits: 2, onInput: () => draw() });
    PL.ui.section(L.controls, "外力の向き");
    PL.ui.chipGroup(L.controls, { value: forceDirection, options: [{ value: "up", label: "斜面にそって上へ引く" }, { value: "down", label: "斜面にそって下へ押す" }], onChange: value => { forceDirection = value; draw(); } });
    PL.ui.note(L.controls, "まず、摩擦がないとしたら物体がどちらへすべろうとするかを判断します。静止摩擦力は必ずその<b>逆向き</b>です。再生を押して、物体が動くか、どちらへ動くかを見ます。F の矢印の先をそのままドラッグして外力を変えることもできます。 ");
    const rN = PL.ui.readout(L.readouts, { label: "垂直抗力 N", unit: "N" });
    const rF = PL.ui.readout(L.readouts, { label: "実際の摩擦力", unit: "N" });
    const rMax = PL.ui.readout(L.readouts, { label: "最大摩擦力", unit: "N" });
    const rState = PL.ui.readout(L.readouts, { label: "力の判断" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "外力と、斜面にそってすべろうとする傾向", cap: "正の値はすべり下りようとする傾向、負の値はすべり上がろうとする傾向です。2 本の点線のあいだなら、静止摩擦力で静止を保てます。" });
    function model(force) {
      const m = sM.get(), th = sAngle.get() * Math.PI / 180, F = force == null ? sForce.get() : force, N = m * 9.8 * Math.cos(th);
      const drive = m * 9.8 * Math.sin(th) + (forceDirection === "down" ? F : -F), fsMax = sMs.get() * N;
      const staticHold = Math.abs(drive) <= fsMax + 1e-9, muK = Math.min(sMs.get(), sMk.get());
      const friction = staticHold ? -drive : -Math.sign(drive || 1) * muK * N;
      const acceleration = staticHold ? 0 : (drive + friction) / m;
      return { m, th, F, N, drive, fsMax, staticHold, friction, acceleration, muK };
    }
    /*
     * 運動狀態：s 是木塊沿斜面離中點的距離（px，正值＝往下坡），v 為速度（m/s，正值＝往下坡）。
     * 斜面畫面上約 1 m = 60 px。滑動中的摩擦力看「速度」方向，不是看驅動力方向——
     * 例如往上拉得太猛又突然放鬆，木塊會先減速、停下，再由靜摩擦決定要不要倒滑回來。
     */
    const PX_PER_M = 60;
    let s = 0, v = 0, geo = { c: { x: 0, y: 0 }, dir: { x: 1, y: 0 }, half: 100 }, rp = null;
    function step(dt) {
      if (!(dt > 0)) return;
      const q = model();
      let left = Math.min(dt, 0.1);
      while (left > 1e-6) {
        const h = Math.min(left, 1 / 240);
        if (Math.abs(v) < 1e-6) {
          if (q.staticHold) { v = 0; break; }
          v += q.acceleration * h;
        } else {
          const nv = v + (q.drive - Math.sign(v) * q.muK * q.N) / q.m * h;
          // 速度過零：先停下來，再交給靜摩擦判斷
          v = Math.sign(nv) !== Math.sign(v) ? 0 : nv;
        }
        s += v * PX_PER_M * h; left -= h;
      }
      // 滑到斜面一端就停；把木塊拖回中間（或再按播放）重來
      if (Math.abs(s) > geo.half) { s = Math.sign(s) * geo.half; v = 0; rp.end(); }
    }
    const clock = PL.motion.clock(dt => { step(dt); draw(); });
    rp = PL.motion.replay(cv, { loop: clock, label: "木片（斜面のまん中にもどすとやり直し）",
      snapshot: () => ({ s, v }), restore: q => { s = q.s; v = q.v; },
      reset: () => { s = 0; v = 0; }, redraw: () => draw() });
    // 把手抓 F 箭頭的尖端：沿斜面拖離木塊越遠，外力越大（箭頭長 30 + 1.4F px）
    const grip = PL.ui.handle(cv, { slider: sForce, label: "斜面方向の外力 F（矢印をドラッグ）",
      toValue: (x, y) => ((x - geo.c.x) * geo.dir.x + (y - geo.c.y) * geo.dir.y - 30) / 1.4 });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const q = model(), floorY = H - 42, baseX = 42, slopeLength = Math.min(W * 0.63, H * 1.05 / Math.sin(q.th));
      const top = { x: baseX + slopeLength * Math.cos(q.th), y: floorY - slopeLength * Math.sin(q.th) };
      const AP = PL.apparatus;
      AP.benchTop(ctx, W, H, floorY);
      AP.ramp(ctx, baseX, floorY, slopeLength, q.th);
      const down = { x: -Math.cos(q.th), y: Math.sin(q.th) }, normal = { x: -Math.sin(q.th), y: -Math.cos(q.th) };
      const half = slopeLength * 0.36;
      if (clock.t === 0 && !clock.running) { s = 0; v = 0; }
      s = PL.clamp(s, -half, half);
      const d0 = slopeLength * 0.48 + s;
      const point = { x: top.x + down.x * d0, y: top.y + down.y * d0 };
      AP.massBlock(ctx, point.x + normal.x * 1, point.y + normal.y * 1, 50, 28, { color: MC(), label: q.m + " kg", ang: -q.th, noShadow: true });
      if (rp) rp.mark(point.x + normal.x * 14, point.y + normal.y * 14);
      const c = { x: point.x + normal.x * 13, y: point.y + normal.y * 13 }, scale = 3.1;
      const moving = Math.abs(v) > 1e-6;
      D.arrow(ctx, c.x, c.y, c.x, c.y + 50, { color: PL.col("warn"), width: 2.2, label: "mg" });
      D.arrow(ctx, c.x, c.y, c.x + normal.x * 42, c.y + normal.y * 42, { color: "#8db7ff", width: 2.2, label: "N" });
      const appSign = forceDirection === "down" ? 1 : -1, appLen = 30 + q.F * 1.4;
      const fdir = { x: down.x * appSign, y: down.y * appSign };
      if (q.F > 0) D.arrow(ctx, c.x, c.y, c.x + fdir.x * appLen, c.y + fdir.y * appLen, { color: PL.col("accent-2"), width: 2.5, label: "F" });
      geo = { c, dir: fdir, half };
      grip.place(c.x + fdir.x * appLen, c.y + fdir.y * appLen);
      // 滑動中摩擦力與速度反向；靜止時才是讀數裡那個靜摩擦
      const fric = moving ? -Math.sign(v) * q.muK * q.N : q.friction, isStatic = !moving && q.staticHold;
      const fSign = Math.sign(fric || 0), fLen = Math.min(58, Math.abs(fric) * scale);
      if (fLen > 0.5) D.arrow(ctx, c.x, c.y, c.x + down.x * fSign * fLen, c.y + down.y * fSign * fLen, { color: isStatic ? "#7ee0c0" : PL.col("danger"), width: 2.4, label: isStatic ? "fₛ" : "fₖ" });
      // 速度箭頭（畫在斜面下側，避開力的箭頭）：長度正比於速率
      if (moving) {
        const vb = { x: point.x - normal.x * 26, y: point.y - normal.y * 26 }, vl = Math.min(80, Math.abs(v) * 30) * Math.sign(v);
        D.arrow(ctx, vb.x, vb.y, vb.x + down.x * vl, vb.y + down.y * vl, { color: PL.col("accent"), width: 2, head: 7, label: "v" });
      }
      /*
       * μₖ 在物體靜止時同樣無法從畫面判讀。加一組對照棒：
       * 最大靜摩擦 μₛN 與動摩擦 μₖN 並排，並標出目前的驅動力。
       * 驅動力超過上面那條就會開始滑，滑動之後摩擦力掉到下面那條——
       * 這是斜面題最常考、也最常被搞混的一步。
       */
      const gx = W - 186, gy2 = 34, gw = 150;
      AP.infoCard(ctx, gx - 12, gy2 - 24, gw + 26, 88);
      const gMax = Math.max(q.fsMax, sMk.get() * q.N, Math.abs(q.drive), 1) * 1.15;
      D.text(ctx, "斜面方向の力の比較（N）", gx, gy2 - 8, { color: PL.col("text-dim"), size: 10 });
      [["最大摩擦力 μₛN", q.fsMax, "#7ee0c0"],
       ["動摩擦力 μₖN", sMk.get() * q.N, PL.col("warn")],
       ["動かそうとする力（重力の成分＋F）", Math.abs(q.drive), PL.col("accent-2")]].forEach((row, i) => {
        const yy = gy2 + i * 22;
        D.rect(ctx, gx, yy, gw, 11, { fill: PL.theme.pale(0.10), r: 5 });
        D.rect(ctx, gx, yy, gw * Math.min(1, row[1] / gMax), 11, { fill: row[2], r: 5 });
        D.text(ctx, row[0] + " " + PL.fmt(row[1], 1), gx, yy + 21,
          { color: row[2], size: 9 });
      });

      const trend = q.drive > 0 ? "摩擦がなければ、物体はすべり下りようとする" : q.drive < 0 ? "摩擦がなければ、物体はすべり上がろうとする" : "外力と重力の成分がちょうどつり合っている";
      D.text(ctx, trend, 24, 30, { color: q.staticHold ? "#7ee0c0" : PL.col("danger"), size: 12 });
      D.text(ctx, q.staticHold ? "静止摩擦力が足りていて、物体は静止" : "最大摩擦力をこえて、" + (q.acceleration > 0 ? "すべり下りる" : "すべり上がる"), 24, 50, { color: PL.col("text-dim"), size: 11 });
      rN.set(q.N, 2); rF.set(Math.abs(q.friction), 2); rMax.set(q.fsMax, 2); rState.set(q.staticHold ? "静止" : q.acceleration > 0 ? "すべり落ちる" : "上へすべる");
      cc.clear();
      const forceLimit = 55, range = Math.max(20, Math.abs(model(0).drive) + q.fsMax + 10);
      const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 0, x1: forceLimit, y0: -range, y1: range });
      g.frame({ xlabel: "外力 F (N)", ylabel: "斜面方向の傾向 (N)" }); g.grid(5, 4);
      g.fn(F => model(F).drive, { color: MC(), width: 2.2 });
      g.hline(q.fsMax, { color: "rgba(126,224,192,0.65)", dash: [4, 3], width: 1.2 }); g.hline(-q.fsMax, { color: "rgba(126,224,192,0.65)", dash: [4, 3], width: 1.2 });
      g.dot(q.F, q.drive, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    cv.onResize(() => draw()); cc.onResize(() => draw()); draw();
    return { stop() { clock.stop(); cv.destroy(); cc.destroy(); }, rerender: () => draw() };
  }});

  /* 段考題型：桌面物體與懸掛物的連接體 */
  PL.register("table-hanger", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" }), cv = PL.canvas.create(L.canvasWrap, 0.62);
    let y = 0, v = 0, released = false;
    PL.ui.section(L.controls, "連結した物体のパラメータ");
    const sTable = PL.ui.slider(L.controls, { label: "机の上の物体 mₜ", min: 0.5, max: 6, step: 0.5, value: 3, unit: "kg", digits: 1, onInput: () => draw(), onReset: reset });
    const sHang = PL.ui.slider(L.controls, { label: "つるしたおもり mₕ", min: 0.5, max: 5, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: () => draw(), onReset: reset });
    const sMs = PL.ui.slider(L.controls, { label: "静止摩擦係数 μₛ", min: 0.05, max: 0.8, step: 0.02, value: 0.35, unit: "", digits: 2, onInput: () => draw(), onReset: reset });
    const sMk = PL.ui.slider(L.controls, { label: "動摩擦係数 μₖ", min: 0.05, max: 0.7, step: 0.02, value: 0.25, unit: "", digits: 2, onInput: () => draw(), onReset: reset });
    const row = PL.ui.buttonRow(L.controls); PL.ui.button(row, "はなす", () => { reset(); released = true; if (!model().staticHold) anim.start(); else draw(); }, { primary: true, trigger: true }); PL.ui.button(row, "リセット", reset);
    PL.ui.note(L.controls, "おもりの重さは、まず机の上の物体の最大摩擦力に勝つ必要があります。動き出したら、動摩擦力で加速度を計算します。 ");
    const rA = PL.ui.readout(L.readouts, { label: "全体の加速度 a", unit: "m/s²" });
    const rT = PL.ui.readout(L.readouts, { label: "糸の張力 T", unit: "N" });
    const rF = PL.ui.readout(L.readouts, { label: "机の面の摩擦力", unit: "N" });
    const rState = PL.ui.readout(L.readouts, { label: "動きの判断" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "つるす質量と全体の加速度", cap: "ぎりぎりの値までは加速度は 0 です。最大摩擦力をこえたら、動摩擦力で加速度を計算します。" });
    function model(hangMass) {
      const mt = sTable.get(), mh = hangMass == null ? sHang.get() : hangMass, fsMax = sMs.get() * mt * 9.8, pull = mh * 9.8, staticHold = pull <= fsMax + 1e-9;
      const fk = Math.min(sMk.get(), sMs.get()) * mt * 9.8, a = staticHold ? 0 : Math.max(0, (pull - fk) / (mt + mh));
      const f = staticHold ? pull : fk, T = staticHold ? pull : mt * a + fk;
      return { mt, mh, fsMax, pull, staticHold, f, a, T };
    }
    function reset() { y = 0; v = 0; released = false; draw(); }
    /*
     * 把手抓懸掛物：手拉著它上下移動（整個系統跟著動），放手就是「釋放」。
     * 靜摩擦撐得住時放手後系統停在原地——這也是答案的一部分。
     */
    let hangTop = 0;
    const grip = PL.ui.handle(cv, { label: "つるしたおもり（引いて動かし、はなすと動き出す）",
      onDrag: (px, py) => { released = false; v = 0; y = PL.clamp((py - 20 - hangTop) / 18, 0, 9); draw(); },
      onRelease: () => { released = true; if (!model().staticHold) anim.start(); else draw(); } });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv); const q = model(), tableY = H * 0.43, edge = W * 0.70, blockX = edge - 105 + y * 12, ropeY = tableY - 15;
      const AP = PL.apparatus;
      AP.labRoom(ctx, W, H, H - 18, { bench: "none" });
      AP.table(ctx, 20, edge, tableY, H - 18, { thick: 16 });
      AP.ground(ctx, 0, W, H - 18, 18, "field");
      // 桌緣滑輪（夾具固定），繩子從輪頂水平拉向物體、從輪外緣垂下
      AP.steel(ctx, edge - 16, ropeY - 3, 22, 6, 6);
      AP.pulley(ctx, edge + 2, ropeY + 18, 18);
      AP.cord(ctx, blockX + 30, ropeY, edge + 2, ropeY); AP.cord(ctx, edge + 20, ropeY + 18, edge + 20, ropeY + 64 + y * 18);
      AP.massBlock(ctx, blockX, tableY, 64, 30, { color: MC(), label: "mₜ" });
      const hy = ropeY + 64 + y * 18;
      AP.massBlock(ctx, edge + 20, hy + 40, 58, 40, { color: "#ffab80", label: "mₕ", hook: true, noShadow: true });
      hangTop = ropeY + 64; grip.place(edge + 20, hy + 34);
      D.arrow(ctx, blockX, tableY - 45, blockX + Math.min(60, q.T * 2.2), tableY - 45, { color: PL.col("accent-2"), width: 2.4, label: "T" }); if (q.f) D.arrow(ctx, blockX, tableY - 56, blockX - Math.min(58, q.f * 1.3), tableY - 56, { color: q.staticHold ? "#7ee0c0" : PL.col("danger"), width: 2.2, label: "f" });
      D.arrow(ctx, edge + 52, hy + 14, edge + 52, hy + 58, { color: PL.col("warn"), width: 2.3, label: "mₕg" }); D.text(ctx, q.staticHold ? "最大摩擦力が足りている：全体は静止" : "おもりが下がり、2 つの物体がいっしょに加速する", 24, 30, { color: q.staticHold ? "#7ee0c0" : PL.col("danger"), size: 12 });
      rA.set(q.a, 2); rT.set(q.T, 2); rF.set(q.f, 2); rState.set(q.staticHold ? "静止したまま" : "mₕ が下に動く");
      cc.clear(); const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 0.5, x1: 5, y0: 0, y1: 9 }); g.frame({ xlabel: "つるす質量 mₕ (kg)", ylabel: "a (m/s²)" }); g.grid(5, 4); g.fn(mh => model(mh).a, { color: MC(), width: 2.3 }); g.dot(q.mh, q.a, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    const anim = PL.loop(dt => { if (dt && released) { const q = model(); if (!q.staticHold) { v += q.a * dt; y += v * dt; if (y > 9) { y = 9; v = 0; anim.stop(); } } } draw(); });
    cv.onResize(draw); cc.onResize(draw); draw(); return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 段考題型：均勻繩跨過光滑桌邊 */
  PL.register("rope-over-edge", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" }), cv = PL.canvas.create(L.canvasWrap, 0.60);
    let portion = 0.25, v = 0, elapsed = 0, released = false;
    PL.ui.section(L.controls, "一様な鎖の条件");
    const sPortion = PL.ui.slider(L.controls, { label: "はじめに垂れている割合 x / L", min: 0.05, max: 0.85, step: 0.01, value: 0.25, unit: "", digits: 2, onInput: reset });
    const sLength = PL.ui.slider(L.controls, { label: "鎖全体の長さ L", min: 1, max: 10, step: 0.5, value: 5, unit: "m", digits: 1, onInput: () => draw(), onReset: reset });
    const row = PL.ui.buttonRow(L.controls); PL.ui.button(row, "鎖をはなす", () => { reset(); released = true; anim.start(); }, { primary: true }); PL.ui.button(row, "リセット", reset);
    PL.ui.note(L.controls, "動かすのは垂れた部分の重さだけですが、鎖全体がいっしょに加速するので <b>a = (x/L)g</b> です。 ");
    const rA = PL.ui.readout(L.readouts, { label: "瞬間の加速度 a", unit: "m/s²" }); const rX = PL.ui.readout(L.readouts, { label: "垂れている長さ x", unit: "m" }); const rV = PL.ui.readout(L.readouts, { label: "鎖の速さ v", unit: "m/s" }); const rState = PL.ui.readout(L.readouts, { label: "力の判断" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "垂れている割合と加速度", cap: "なめらかな机の上では、鎖全体の長さと質量は消えます。加速度は、その瞬間に垂れている割合だけで決まります。" });
    function reset() { portion = sPortion.get(); v = 0; elapsed = 0; released = false; draw(); }
    /*
     * 把手抓垂下來的繩端：往下拉就是讓更多繩子垂出桌邊（初始垂落比例），
     * 放手就是釋放——這正是做這個實驗時手在做的事。
     */
    let ropeGeo = { tableY: 0, ropePx: 1 };
    const grip = PL.ui.handle(cv, { slider: sPortion, label: "垂れた鎖の端（下に引き、はなすと動き出す）",
      toValue: (px, py) => (py - ropeGeo.tableY) / ropeGeo.ropePx,
      onRelease: () => { reset(); released = true; anim.start(); } });
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
      const AP = PL.apparatus;
      AP.labRoom(ctx, W, H, H - 16, { bench: "none" });
      AP.table(ctx, 20, edge, tableY, H - 16, { thick: 16 });
      AP.ground(ctx, 0, W, H - 16, 16, "field");
      // 光滑桌邊（圓角）＋一條均勻的粗繩
      ctx.fillStyle = "rgb(190,198,210)"; ctx.beginPath(); ctx.arc(edge, tableY + 8, 8, -Math.PI / 2, Math.PI / 2); ctx.fill();
      AP.rope(ctx, edge - topLength, tableY - 3.5, edge, tableY - 3.5, 7, "#d09a4a");
      ctx.strokeStyle = "#d09a4a"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(edge, tableY + 8, 11.5, -Math.PI / 2, 0); ctx.stroke();
      AP.rope(ctx, edge + 11.5, tableY + 8, edge + 11.5, tableY + hangLength, 7, "#d09a4a");
      ropeGeo = { tableY, ropePx };
      if (released) grip.hide(); else grip.place(edge + 11.5, tableY + hangLength);
      D.arrow(ctx, edge + 32, tableY + hangLength * 0.48, edge + 32, tableY + hangLength * 0.48 + Math.min(50, portion * 70), { color: PL.col("danger"), width: 2.3, label: "垂れた部分の重さ" }); D.arrow(ctx, edge - topLength * 0.52, tableY - 32, edge - topLength * 0.52 + Math.min(50, v * 6), tableY - 32, { color: PL.col("accent-2"), width: 2.2, label: "v" });
      D.text(ctx, "垂れている割合 x/L = " + PL.fmt(portion, 2), 24, 30, { color: PL.col("text-dim"), size: 12 }); D.text(ctx, released ? "垂れている部分が多いほど、引く力も加速度も大きい" : "はじめに垂れている割合を決めてから、鎖をはなす", 24, 50, { color: PL.col("text-faint"), size: 11 });
      rA.set(a, 2); rX.set(portion * length, 2); rV.set(v, 2); rState.set("鎖全体がいっしょに加速する");
      cc.clear(); const g = PL.graph(cc, { x: 42, y: 16, w: cc.W - 56, h: cc.H - 40 }, { x0: 0, x1: 1, y0: 0, y1: 9.8 }); g.frame({ xlabel: "垂れている割合 x / L", ylabel: "a (m/s²)" }); g.grid(5, 4); g.fn(p => p * 9.8, { color: MC(), width: 2.3 }); g.dot(portion, a, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    const anim = PL.loop(dt => { if (dt && released) { const a = portion * 9.8; v += a * dt; portion += (v / Math.max(1, sLength.get())) * dt; elapsed += dt; if (portion >= 0.93) { portion = 0.93; v = 0; anim.stop(); } } draw(); });
    cv.onResize(draw); cc.onResize(draw); draw(); return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});
})();
