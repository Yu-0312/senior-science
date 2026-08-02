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
    PL.ui.section(L.controls, "粒子與磁場");
    const sV = PL.ui.slider(L.controls, { label: "速率 v", min: 1, max: 6, step: 0.5, value: 3, unit: "", digits: 1 });
    const sB = PL.ui.slider(L.controls, { label: "磁場 B", min: 1, max: 6, step: 0.5, value: 3, unit: "", digits: 1 });
    const sQ = PL.ui.select(L.controls, { label: "電荷", value: "pos", options: [{ value: "pos", label: "正電荷 +" }, { value: "neg", label: "負電荷 −" }], onChange: () => ang = 0 });
    PL.ui.note(L.controls, "磁力恆垂直於速度，使帶電粒子作等速率圓周運動；半徑 r = mv/qB。");
    const rR = PL.ui.readout(L.readouts, { label: "迴轉半徑 r", unit: "px" });
    const rT = PL.ui.readout(L.readouts, { label: "週期 T（相對）", unit: "" });
    const cc = PL.ui.chart(PL.ui.charts(root), { title: "迴轉半徑 r – 速率 v", cap: "r = mv/qB：定磁場下半徑與速率成正比（直線過原點）；磁場越強、半徑越小。" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      // B 進入頁面（叉叉背景）
      ctx.save(); ctx.strokeStyle = PL.theme.pale(0.1); ctx.lineWidth = 1;
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
      // r–v 圖
      cc.clear();
      const B = sB.get(), gg = PL.graph(cc, { x: 36, y: 14, w: cc.W - 48, h: cc.H - 34 }, { x0: 0, x1: 6, y0: 0, y1: 210 });
      gg.frame({ xlabel: "v", ylabel: "r (px)" }); gg.grid(6, 4);
      gg.fn(vv => 20 + vv / B * 30, { color: MC(), width: 2.2 });
      gg.dot(sV.get(), r, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    const anim = PL.loop(dt => { if (dt) ang += sB.get() * dt * 0.6; draw(); });
    cv.onResize(draw); cc.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); cc.destroy(); }, rerender: draw };
  }});

  /* 電磁感應（法拉第定律） */
  /* 電磁感應（法拉第定律） —— 旗艦改版
   *
   * 這個主題最常見的誤解是「磁鐵放在線圈裡就會發電」。
   * 因此這一版把重點放在「變化率」上：
   *
   *   · 磁鐵停在線圈正中央——磁通量最大，但感應電動勢是零
   *   · 推得越快電動勢越大，磁通量的最大值卻完全沒變
   *   · 電流方向永遠反抗磁通量的改變（楞次定律），進去和出來反向
   *
   * 依 PhET 的原則，用認得出來的器材（磁鐵、線圈、檢流計指針），
   * 並且讓「停住就沒電」這件事立刻看得到。
   */
  PL.register("induction", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56, 860);

    let x = -1.2, v = 0, t = 0, mode = "manual", auto = 1;
    let history = [];

    PL.ui.section(L.controls, "磁鐵");
    const sPos = PL.ui.slider(L.controls, { label: "磁鐵位置", min: -1.5, max: 1.5, step: 0.01, value: -1.2, unit: "", digits: 2 });
    const sStrength = PL.ui.slider(L.controls, { label: "磁鐵強度", min: 0.4, max: 2.5, step: 0.1, value: 1.2, unit: "", digits: 1 });
    const sTurns = PL.ui.stepper(L.controls, { label: "線圈匝數 N", value: 20, min: 5, max: 60, step: 5 });

    PL.ui.section(L.controls, "推動方式");
    PL.ui.chipGroup(L.controls, {
      value: "manual",
      options: [
        { value: "manual", label: "自己拉滑桿" },
        { value: "slow", label: "自動·慢" },
        { value: "fast", label: "自動·快" }
      ],
      onChange: v2 => {
        mode = v2;
        auto = v2 === "fast" ? 1.6 : 0.55;
        if (v2 !== "manual") { x = -1.5; history = []; }
      }
    });

    PL.ui.note(L.controls,
      "把磁鐵慢慢推到線圈正中央再停住：磁通量此時最大，但指針會回到零——" +
      "產生電動勢的是「磁通量的變化」，不是磁通量本身。" +
      "接著比較自動慢與自動快：磁通量的最高點完全一樣，電動勢卻差很多。");

    const rFlux = PL.ui.readout(L.readouts, { label: "磁通量 Φ", unit: "" });
    const rEmf = PL.ui.readout(L.readouts, { label: "感應電動勢 ε", unit: "" });
    const rDir = PL.ui.readout(L.readouts, { label: "電流方向" });
    const rSpeed = PL.ui.readout(L.readouts, { label: "磁鐵速度", unit: "" });

    const charts = PL.el("div", "sim-charts", root);
    const w1 = PL.el("div", "sim-chart", charts);
    PL.el("div", "chart-title", w1).textContent = "磁通量 Φ 與感應電動勢 ε";
    const cvG = PL.canvas.create(w1, 0.5);
    PL.el("div", "cap", w1).textContent =
      "ε = −N·dΦ/dt。Φ 的最高點正好是 ε 的零點——山頂的斜率是零，這就是「最大值處沒有電動勢」的原因。";

    /*
     * 磁通量模型
     * 用高斯函數近似「磁鐵靠近線圈時穿過的磁通量」：中心最大、兩側衰減。
     * 這是教學用的簡化，重點是形狀對，微分之後才會出現正確的雙峰電動勢。
     */
    function flux(pos) {
      return sStrength.get() * Math.exp(-Math.pow(pos / 0.42, 2));
    }
    /* ε = −N dΦ/dt = −N (dΦ/dx)(dx/dt)，dΦ/dx 用中央差分 */
    function emf(pos, speed) {
      const dPhidx = (flux(pos + 0.005) - flux(pos - 0.005)) / 0.01;
      return -sTurns.get() * dPhidx * speed * 0.35;
    }

    function scene() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const m = MC();
      const cx = W * 0.46, cy = H * 0.44;
      const scale = W * 0.24;                       // 位置 1.0 對應的像素

      // 線圈：一圈一圈畫出來，匝數改變看得見
      const turns = Math.min(18, Math.round(sTurns.get() / 3));
      const coilW = 96, coilH = 74;
      for (let i = 0; i < turns; i += 1) {
        const off = (i - (turns - 1) / 2) * (coilW / Math.max(1, turns));
        ctx.save();
        ctx.strokeStyle = "#c98a4b"; ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.ellipse(cx + off, cy, 9, coilH / 2, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      D.text(ctx, "N = " + sTurns.get() + " 匝", cx, cy + coilH / 2 + 24,
        { color: "#c98a4b", size: 11, align: "center", weight: "700" });

      // 磁鐵：南北極用顏色與字標示
      const mx = cx + x * scale;
      /*
       * 「磁鐵強度」原本只進到磁通量公式裡，磁鐵本身永遠畫成同樣大小，
       * 學生拉這根滑桿時畫面上找不到任何線索。
       * 改成磁鐵尺寸與周圍磁力線的密度都隨強度改變。
       */
      const strength = sStrength.get();
      const magW = 24 + strength * 8, magH = 18 + strength * 6;
      // 磁力線：強度越大畫得越多
      const lines = Math.round(2 + strength * 2);
      for (let i = 1; i <= lines; i += 1) {
        const rr = magH * 0.7 + i * 9;
        D.ring(ctx, mx, cy, rr, "rgba(209,73,91,0.16)", 1);
      }
      D.rect(ctx, mx - magW, cy - magH / 2, magW, magH, { fill: "#d1495b", r: 2 });
      D.rect(ctx, mx, cy - magH / 2, magW, magH, { fill: "#4a6fa5", r: 2 });
      D.text(ctx, "N", mx - magW / 2, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" });
      D.text(ctx, "S", mx + magW / 2, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" });

      const phi = flux(x);
      const e = emf(x, v);

      // 導線與檢流計
      const gx = W * 0.83, gy = cy;
      D.line(ctx, cx + coilW / 2, cy - coilH / 2 + 6, gx - 34, gy - 26, PL.theme.pale(0.4), 2);
      D.line(ctx, cx + coilW / 2, cy + coilH / 2 - 6, gx - 34, gy + 26, PL.theme.pale(0.4), 2);
      D.rect(ctx, gx - 34, gy - 30, 68, 60, { fill: PL.theme.shade(0.4), stroke: PL.theme.pale(0.3), r: 6 });
      D.text(ctx, "檢流計", gx, gy + 44, { color: PL.col("text-faint"), size: 10, align: "center" });
      // 指針：偏轉角正比於電動勢，方向就是電流方向
      const maxE = 3.2;
      const ang = Math.max(-1, Math.min(1, e / maxE)) * 0.85;
      D.ring(ctx, gx, gy + 14, 30, PL.theme.pale(0.22), 1);
      D.line(ctx, gx, gy + 14, gx + Math.sin(ang) * 26, gy + 14 - Math.cos(ang) * 26,
        Math.abs(e) > 0.05 ? PL.col("danger") : PL.col("text-faint"), 2.4);
      D.disc(ctx, gx, gy + 14, 3, { fill: PL.theme.pale(0.5) });
      D.text(ctx, "0", gx, gy - 18, { color: PL.col("text-faint"), size: 9, align: "center" });

      // 感應電流的方向：楞次定律
      if (Math.abs(e) > 0.05) {
        const dirText = e > 0 ? "順時針（由右看）" : "逆時針（由右看）";
        D.text(ctx, dirText, cx, cy - coilH / 2 - 26,
          { color: PL.col("accent-2"), size: 11.5, align: "center", weight: "700" });
        // 線圈上的電流箭頭
        const flow = e > 0 ? 1 : -1;
        for (let i = 0; i < 3; i += 1) {
          const ax = cx - 30 + i * 30;
          D.arrow(ctx, ax, cy - coilH / 2 - 8, ax + flow * 18, cy - coilH / 2 - 8,
            { color: PL.col("accent-2"), width: 2, head: 6 });
        }
      } else {
        D.text(ctx, "沒有電流", cx, cy - coilH / 2 - 26,
          { color: PL.col("text-faint"), size: 11.5, align: "center" });
      }

      rFlux.set(phi, 3);
      rEmf.set(e, 3);
      rSpeed.set(Math.abs(v), 2);
      rDir.set(Math.abs(e) <= 0.05 ? "無" : (e > 0 ? "順時針" : "逆時針"));

      PL.ui.caption(cv, Math.abs(v) < 0.02 && Math.abs(x) < 0.15
        ? "磁鐵停在線圈正中央：磁通量此刻最大，但它沒有在變化，所以電動勢是零。"
        : Math.abs(v) < 0.02
          ? "磁鐵靜止：不管放在哪裡、磁鐵多強，只要磁通量不變，就沒有感應電動勢。"
          : "感應電動勢正比於磁通量的變化率，不是磁通量本身；方向永遠反抗這個變化。");
    }

    function chart() {
      cvG.clear();
      const span = 6;
      const recent = history.filter(p => p[0] > t - span);
      const gph = PL.graph(cvG, { x: 46, y: 14, w: cvG.W - 60, h: cvG.H - 34 },
        { x0: Math.max(0, t - span), x1: Math.max(span, t), y0: -3.4, y1: 3.4 });
      gph.frame({ xlabel: "t (s)" });
      gph.grid(6, 4);
      gph.hline(0, { color: PL.theme.pale(0.3), width: 1 });
      if (recent.length > 1) {
        gph.curve(recent.map(p => [p[0], p[1]]), { color: MC(), width: 2.2 });          // Φ
        gph.curve(recent.map(p => [p[0], p[2]]), { color: PL.col("accent-2"), width: 2.2 }); // ε
      }
      gph.label(Math.max(0, t - span) + 0.15, 3.0, "Φ 磁通量", { color: MC(), size: 10 });
      gph.label(Math.max(0, t - span) + 0.15, 2.4, "ε 電動勢", { color: PL.col("accent-2"), size: 10 });
    }

    function drawAll() { scene(); chart(); }

    const anim = PL.loop(dt => {
      if (dt) {
        t += dt;
        if (mode === "manual") {
          /*
           * 拖曳滑桿時，input 事件不是每個影格都來，因此逐格算出來的
           * 瞬時速度會在「有動」與「完全沒動」之間跳，指針閃個不停。
           * 這裡做指數平滑：拖的時候讀數穩定，放手後幾個影格內衰減到零，
           * 「停住就沒有電動勢」這個結論仍然成立。
           */
          const target = sPos.get();
          const instant = Math.max(-6, Math.min(6, (target - x) / Math.max(dt, 1e-3)));
          v = v * 0.55 + instant * 0.45;
          if (Math.abs(v) < 0.02) v = 0;
          x = target;
        } else {
          x += auto * dt;
          v = auto;
          if (x > 1.5) { x = -1.5; }
          sPos.set(Math.max(-1.5, Math.min(1.5, x)));
        }
        history.push([t, flux(x), emf(x, v)]);
        if (history.length > 700) history.shift();
      }
      drawAll();
    }, 50);

    cv.onResize(scene); cvG.onResize(chart);
    drawAll(); anim.start();
    return {
      stop() { anim.stop(); cv.destroy(); cvG.destroy(); },
      rerender: drawAll
    };
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

  /* 電磁波與電磁波譜 */
  PL.register("em-wave", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    let t = 0; const c = 3e8;
    const sP = PL.ui.slider(L.controls, { label: "波長 λ（10ˣ 公尺）", min: -13, max: 3, step: 0.1, value: -6.3, unit: "", digits: 1 });
    PL.ui.note(L.controls, "電場 E 與磁場 B 互相垂直、也垂直於前進方向；真空中都以光速前進。");
    const rLam = PL.ui.readout(L.readouts, { label: "波長 λ", unit: "m" });
    const rF = PL.ui.readout(L.readouts, { label: "頻率 f", unit: "Hz" });
    const rBand = PL.ui.readout(L.readouts, { label: "波段" });
    const band = lam => lam > 0.1 ? "無線電波" : lam > 1e-3 ? "微波" : lam > 7e-7 ? "紅外線" : lam > 4e-7 ? "可見光" : lam > 1e-8 ? "紫外線" : lam > 1e-11 ? "X 射線" : "γ 射線";
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const p = sP.get(), lam = Math.pow(10, p), f = c / lam;
      const swl = 18 + (p + 13) / 16 * 150, x0 = 30, x1 = W - 30, A = 30;
      const eY = H * 0.3, bY = H * 0.56;
      D.line(ctx, x0, eY, x1, eY, "rgba(255,255,255,0.14)", 1);
      ctx.save(); ctx.strokeStyle = "#ff6b6b"; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) { const y = eY - A * Math.sin(PL.TAU * (x - x0) / swl - t * 4); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      D.text(ctx, "E 電場", x0, eY - A - 6, { color: "#ff6b6b", size: 11 });
      D.line(ctx, x0, bY, x1, bY, "rgba(255,255,255,0.14)", 1);
      ctx.save(); ctx.strokeStyle = "#5aa2ff"; ctx.lineWidth = 2.2; ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) { const y = bY - A * Math.sin(PL.TAU * (x - x0) / swl - t * 4); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      D.text(ctx, "B 磁場（⊥ E）", x0, bY - A - 6, { color: "#5aa2ff", size: 11 });
      D.arrow(ctx, x1 - 44, (eY + bY) / 2, x1 - 8, (eY + bY) / 2, { color: "#fff", width: 2, label: "c" });
      const bands = [["無線電", "#6b7cff"], ["微波", "#4db6ac"], ["紅外", "#ff8a65"], ["可見", "#7bd47b"], ["紫外", "#b98bff"], ["X", "#5aa2ff"], ["γ", "#ff6b6b"]];
      const by = H - 28, bw = (W - 60) / bands.length;
      bands.forEach((b, i) => { D.rect(ctx, 30 + i * bw, by, bw - 2, 14, { fill: b[1] }); D.text(ctx, b[0], 30 + i * bw + bw / 2, by + 26, { color: PL.col("text-faint"), size: 9, align: "center" }); });
      const mx = 30 + PL.clamp((3 - p) / 16, 0, 1) * (W - 62);
      D.line(ctx, mx, by - 6, mx, by + 16, "#fff", 2);
      rLam.set(lam, 2); rF.set(f, 2); rBand.set(band(lam));
    }
    const anim = PL.loop(dt => { if (dt) t += dt; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 質譜儀（速度選擇器） */
  PL.register("mass-spec", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.7);
    let x = 0, ang = 0, phase = "sel";
    const sE = PL.ui.slider(L.controls, { label: "選擇器電場 E", min: 1, max: 8, step: 0.5, value: 4, unit: "", digits: 1, onInput: reset });
    const sB = PL.ui.slider(L.controls, { label: "磁場 B", min: 1, max: 6, step: 0.5, value: 3, unit: "", digits: 1, onInput: reset });
    const sM = PL.ui.slider(L.controls, { label: "離子質量 m", min: 1, max: 6, step: 0.5, value: 3, unit: "", digits: 1, onInput: reset });
    PL.ui.button(PL.ui.buttonRow(L.controls), "射入離子", () => { reset(); anim.start(); }, { primary: true });
    const rV = PL.ui.readout(L.readouts, { label: "選擇速率 v=E/B", unit: "" });
    const rR = PL.ui.readout(L.readouts, { label: "迴轉半徑 r", unit: "" });
    const rLand = PL.ui.readout(L.readouts, { label: "落點 ∝ m" });
    function reset() { x = 0; ang = 0; phase = "sel"; }
    reset();
    function radius() { const v = sE.get() / sB.get(); return PL.clamp(sM.get() * v / sB.get() * 8, 12, (cv.H - 60) / 2); }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const v = sE.get() / sB.get(), r = radius(), selY = H * 0.28, selX0 = 30, selX1 = W * 0.44, entryX = selX1;
      D.rect(ctx, selX0, selY - 22, selX1 - selX0, 44, { stroke: PL.col("text-faint"), width: 1.5, r: 4 });
      D.text(ctx, "速度選擇器 (E⊥B)", selX0, selY - 30, { color: PL.col("text-dim"), size: 10 });
      D.text(ctx, "磁場分析區 ⊗", entryX + 10, 18, { color: PL.col("text-faint"), size: 10 });
      ctx.save(); ctx.strokeStyle = "rgba(149,117,205,0.3)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(entryX, selY + r, r, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.restore();
      D.line(ctx, entryX, selY, entryX, H - 18, PL.col("text-faint"), 2);
      D.disc(ctx, entryX, selY + 2 * r, 5, { fill: MC(), glow: MC() }); D.text(ctx, "落點", entryX + 10, selY + 2 * r + 4, { color: MC(), size: 10 });
      let ix, iy; if (phase === "sel") { ix = selX0 + x; iy = selY; } else { ix = entryX + r * Math.sin(ang); iy = selY + r - r * Math.cos(ang); }
      D.disc(ctx, ix, iy, 6, { fill: "#5aa2ff", glow: "#5aa2ff", glowSize: 8 });
      rV.set(v, 2); rR.set(r / 8, 2); rLand.set(PL.fmt(2 * r / 8, 1));
    }
    const anim = PL.loop(dt => { if (dt) { if (phase === "sel") { x += 130 * dt; if (30 + x >= cv.W * 0.44) { phase = "arc"; ang = 0; } } else if (phase === "arc") { ang += 1.4 * dt; if (ang >= Math.PI) anim.stop(); } } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
