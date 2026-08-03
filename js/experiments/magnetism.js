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
      /*
       * 場圈的濃淡與箭頭長度代表磁場強度 B ∝ I / r。
       *
       * 舊版所有圈都畫成同一個 rgba(...,0.4)、箭頭一律 6 px，電流只影響動畫轉速。
       * 於是這個實驗把「B 與距離成反比」寫在說明裡，畫面上卻完全看不出來；
       * 暫停時調整電流更是毫無反應。現在把兩件事都畫進去：
       * 往外一圈比一圈淡（距離反比），拉大電流則整體變濃、箭頭變長。
       */
      const B0 = 28;                                   // 參考半徑，用來把 B 正規化
      for (let ri = 1; ri <= 5; ri++) {
        const R = 28 + ri * 26;
        const B = (I / 5) * (B0 / R);                  // 相對場強：I=5、r=28 時為 1
        D.ring(ctx, cx, cy, R, "rgba(149,117,205," + PL.fmt(Math.min(0.75, 0.12 + B * 0.42), 3) + ")",
          Math.min(3.2, 0.8 + B * 1.5));
        const a = ccw * (t * 0.6) + ri;
        const ax = cx + R * Math.cos(a), ay = cy + R * Math.sin(a), ta = a + ccw * Math.PI / 2;
        const len = Math.min(14, 3 + B * 7);
        D.arrow(ctx, ax - Math.cos(ta) * len, ay - Math.sin(ta) * len,
          ax + Math.cos(ta) * len, ay + Math.sin(ta) * len, { color: MC(), width: 1.6, head: 6 });
      }
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
    /* 磁鐵位置原本只在迴圈裡同步，暫停時拉滑桿磁鐵不會移動——
       而「自己拉滑桿」本來就是這個實驗預設的操作方式。 */
    const sPos = PL.ui.slider(L.controls, { label: "磁鐵位置", min: -1.5, max: 1.5, step: 0.01, value: -1.2, unit: "", digits: 2,
      onInput: v => { if (mode === "manual") x = v; } });
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
  /* 交流發電機 —— 中性面才是重點
   *
   * 學生會背 e = nBAω·sin(ωt)，但問「線圈轉到中性面時電動勢是多少」
   * 常常答「最大」——因為那時磁通量最大。這正好答反了。
   *
   * 中性面（線圈平面垂直於 B）的磁通量是極大值，而極值處的變化率是零，
   * 所以那一刻 e = 0，而且電流正要換向。這是本單元最關鍵、也最反直覺的一點，
   * 因此把「過中性面」做成會亮起來的判定，而不是埋在波形裡讓學生自己看。
   *
   * Φ 與 e 畫在同一張圖上（雙 y 軸），兩條線錯開四分之一週期——
   * Φ 的山頂正好對上 e 的零點，這比任何文字說明都有效。
   */
  PL.register("ac-generator", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56, 900);
    let t = 0, hist = [];

    PL.ui.section(L.controls, "發電機參數");
    const sN = PL.ui.stepper(L.controls, { label: "匝數 n", value: 50, min: 10, max: 200, step: 10, unit: "匝", digits: 0, onChange: reset });
    const sB = PL.ui.stepper(L.controls, { label: "磁感應強度 B", value: 0.5, min: 0.1, max: 2, step: 0.1, unit: "T", digits: 1, onChange: reset });
    const sW = PL.ui.stepper(L.controls, { label: "角速度 ω", value: 3, min: 0.5, max: 8, step: 0.5, unit: "rad/s", digits: 1, onChange: reset });
    const sR = PL.ui.stepper(L.controls, { label: "外電阻 R", value: 10, min: 1, max: 100, step: 1, unit: "Ω", digits: 0, onChange: reset });

    PL.ui.presets(L.controls, {
      label: "快捷轉速",
      options: [
        { label: "慢 1.5", apply: () => { sW.set(1.5); reset(); } },
        { label: "標準 3.0", apply: () => { sW.set(3); reset(); } },
        { label: "快 6.0", apply: () => { sW.set(6); reset(); } }
      ]
    });

    PL.ui.section(L.controls, "疊加層");
    const layers = PL.ui.chipGroup(L.controls, {
      multi: true, value: ["field", "neutral", "flow"],
      options: [
        { value: "field", label: "磁感線" },
        { value: "neutral", label: "中性面" },
        { value: "normal", label: "法線 n̂" },
        { value: "flow", label: "電流流動" }
      ]
    });

    const row = PL.ui.buttonRow(L.controls);
    /* 播放／暫停由引擎的傳輸列統一提供（還附單步與速度），實驗不再自備，避免兩個開關互相打架。 */
    PL.ui.button(row, "回中性面", () => { t = 0; hist = []; update(); });
    PL.ui.button(row, "重置", reset);
    function reset() { t = 0; hist = []; update(); }

    PL.ui.note(L.controls,
      "線圈轉到中性面時，磁通量是最大值——但電動勢恰好是零。" +
      "山頂的斜率是零，這就是「磁通量最大處沒有電動勢」的原因。" +
      "而且電流每經過中性面一次就換向一次。按「回中性面」把線圈轉回那個位置再看一次。");

    const A = 0.02;                 // 線圈面積（m²），固定值
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rE = PL.ui.readout(L.readouts, { label: "瞬時電動勢 e", unit: "V" });
    const rE0 = PL.ui.readout(L.readouts, { label: "峰值 E₀ = nBAω", unit: "V" });
    const rRms = PL.ui.readout(L.readouts, { label: "有效值 E₀/√2", unit: "V" });
    const rT = PL.ui.readout(L.readouts, { label: "週期 T", unit: "s" });
    const rPhi = PL.ui.readout(L.readouts, { label: "磁通量 Φ（單匝）", unit: "Wb" });
    const rAng = PL.ui.readout(L.readouts, { label: "轉角 θ（從中性面起）", unit: "°" });

    /*
     * 從中性面起算轉角 θ = ωt：
     *   Φ = B·A·cos θ        （中性面 θ=0 時最大）
     *   e = n·B·A·ω·sin θ    （中性面時為零，正要換向）
     */
    function model(tt) {
      const n = sN.get(), B = sB.get(), w = sW.get(), R = sR.get();
      const th = w * tt;
      const phi = B * A * Math.cos(th);
      const e = n * B * A * w * Math.sin(th);
      const E0 = n * B * A * w;
      return { n, B, w, R, th, phi, e, E0, rms: E0 / Math.SQRT2, T: TAU / w, i: e / R };
    }

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m = model(t);
      const cx = W * 0.30, cy = H * 0.46, R = Math.min(W * 0.13, H * 0.26);

      // 磁極與磁感線
      D.rect(ctx, cx - R - 46, cy - R * 0.9, 22, R * 1.8, { fill: NP, r: 3 });
      D.text(ctx, "N", cx - R - 35, cy + 5, { color: "#fff", size: 14, align: "center", weight: "700" });
      D.rect(ctx, cx + R + 24, cy - R * 0.9, 22, R * 1.8, { fill: SP, r: 3 });
      D.text(ctx, "S", cx + R + 35, cy + 5, { color: "#fff", size: 14, align: "center", weight: "700" });
      if (layers.has("field")) {
        // 磁感線密度隨 B：這是 B 這根滑桿唯一看得見的地方
        const lines = PL.clamp(Math.round(2 + m.B * 3), 3, 9);
        for (let i = 0; i < lines; i += 1) {
          const y = cy - R * 0.8 + i * (R * 1.6 / Math.max(1, lines - 1));
          D.arrow(ctx, cx - R - 22, y, cx + R + 22, y, { color: "rgba(120,200,180,0.35)", width: 1.2, head: 5 });
        }
        D.text(ctx, "B = " + PL.fmt(m.B, 1) + " T", cx, cy - R - 22,
          { color: "rgba(120,200,180,0.8)", size: 10, align: "center" });
      }

      // 中性面：線圈平面垂直於 B 的位置
      if (layers.has("neutral")) {
        D.line(ctx, cx, cy - R - 10, cx, cy + R + 10, PL.col("ok"), 1.6, [5, 4]);
        D.text(ctx, "中性面", cx, cy - R - 16, { color: PL.col("ok"), size: 10, align: "center" });
      }

      // 轉動的線圈：以橢圓投影呈現，寬度 = R·|cosθ|
      const half = R * Math.cos(m.th);
      ctx.save();
      ctx.strokeStyle = MC(); ctx.lineWidth = 2.8;
      ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(1.5, Math.abs(half)), R, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      D.disc(ctx, cx + half, cy - R, 5, { fill: PL.col("accent-2") });
      D.disc(ctx, cx - half, cy + R, 5, { fill: PL.col("warn") });

      // 法線：直接顯示線圈平面的朝向，與 B 的夾角就是 θ
      if (layers.has("normal")) {
        const nx = Math.cos(m.th), ny = 0, nz = Math.sin(m.th);
        D.arrow(ctx, cx, cy, cx + nx * R * 0.8, cy - Math.abs(nz) * R * 0.35,
          { color: PL.col("accent-3"), width: 2, head: 7, label: "n̂" });
      }

      // 電流流動：方向隨 e 的正負反轉，密度隨電流大小
      if (layers.has("flow") && Math.abs(m.i) > 1e-4) {
        const dir = m.i >= 0 ? 1 : -1;
        const phase = (t * 1.2 * dir) % 1;
        const n = PL.clamp(Math.round(Math.abs(m.i) * 40), 3, 14);
        for (let i = 0; i < n; i += 1) {
          const f = ((i / n) + (phase + 1) % 1) % 1;
          const ang = f * TAU;
          D.disc(ctx, cx + Math.abs(half) * Math.cos(ang), cy + R * Math.sin(ang), 2.6,
            { fill: PL.col("warn") });
        }
      }

      // 轉角與磁通量的即時標示
      D.text(ctx, "轉角 θ = " + PL.fmt(m.th * 180 / Math.PI % 360, 0) + "°", cx, cy + R + 26,
        { color: PL.col("text-dim"), size: 11, align: "center" });

      PL.ui.caption(cv, Math.abs(Math.sin(m.th)) < 0.08
        ? "正在通過中性面：線圈平面垂直於 B，磁通量此刻最大——但變化率是零，所以 e = 0，而且電流正要換向。"
        : "電動勢 e = nBAω·sin θ 與磁通量 Φ = BA·cos θ 錯開四分之一週期：Φ 的極值正好是 e 的零點。");
    }

    /* Φ 與 e 同框（雙尺度）：兩條線錯開四分之一週期是本單元的核心圖像 */
    const chart = PL.ui.chart(PL.ui.charts(root), {
      title: "e − t 與 Φ − t 波形",
      cap: "e 與 Φ 錯開四分之一週期：Φ 過極值（中性面）時 e = 0；波形每次穿過橫軸，電流換向一次。"
    });

    function drawChart() {
      chart.clear();
      const m = model(t);
      const span = Math.max(2, m.T * 2);
      const g = PL.graph(chart, { x: 52, y: 18, w: chart.W - 76, h: chart.H - 46 },
        { x0: Math.max(0, t - span), x1: Math.max(span, t), y0: -m.E0 * 1.25, y1: m.E0 * 1.25 });
      g.frame({ xlabel: "t (s)", ylabel: "e (V)" });
      g.grid(6, 4);
      g.hline(0, { color: PL.col("text-faint"), width: 1.2 });
      g.hline(m.rms, { color: PL.col("ok"), dash: [4, 3], width: 1.2 });
      g.label(Math.max(0, t - span) + span * 0.02, m.rms + m.E0 * 0.06,
        "有效值 " + PL.fmt(m.rms, 2) + " V", { color: PL.col("ok"), size: 9.5 });

      const recent = hist.filter(p => p[0] > t - span);
      if (recent.length > 1) {
        g.curve(recent.map(p => [p[0], p[1]]), { color: MC(), width: 2.4 });
        // Φ 用同一張圖但自行縮放到相同高度，重點是相位差不是絕對值
        const scale = m.E0 / Math.max(1e-9, m.B * A);
        g.curve(recent.map(p => [p[0], p[2] * scale * 0.72]),
          { color: PL.col("warn"), width: 2, dash: [6, 4] });
      }
      g.label(Math.max(0, t - span) + span * 0.02, m.E0 * 1.08, "電動勢 e", { color: MC(), size: 10 });
      g.label(Math.max(0, t - span) + span * 0.02, m.E0 * 0.9, "磁通量 Φ（等比縮放）",
        { color: PL.col("warn"), size: 10 });
    }

    function update() {
      const m = model(t);
      draw(); drawChart();
      rE.set(m.e, 2); rE0.set(m.E0, 2); rRms.set(m.rms, 2);
      rT.set(m.T, 2); rPhi.set(m.phi, 4);
      rAng.set((m.th * 180 / Math.PI) % 360, 0);

      const nearNeutral = Math.abs(Math.sin(m.th)) < 0.08;
      if (nearNeutral) vd.set("過中性面：e = 0，電流換向", "warn");
      else if (m.e > 0) vd.set("電動勢為正（e = " + PL.fmt(m.e, 2) + " V）", "ok");
      else vd.set("電動勢為負（e = " + PL.fmt(m.e, 2) + " V），電流反向", "ok");
    }

    const anim = PL.loop(dt => {
      if (dt) {
        t += dt;
        const m = model(t);
        hist.push([t, m.e, m.phi]);
        if (hist.length > 1200) hist.shift();
      }
      update();
    }, 50);
    cv.onResize(update); chart.onResize(update); update(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); chart.destroy(); }, rerender: update };
  }});

  /* 變壓器 */
  /* 變壓器 —— 理想變壓器與「誰決定誰」
   *
   * 學生都背得出 U₁/U₂ = n₁/n₂，但問「把負載換成更耗電的，原線圈電流會怎麼變」
   * 就答不出來。原因是課本只給了比例式，沒講因果方向，而這一題的因果是分岔的：
   *
   *   電壓：原邊決定副邊   （U₂ 由 U₁ 與匝數比決定）
   *   電流：副邊決定原邊   （I₂ 由負載決定，再回頭決定 I₁）
   *   功率：輸出決定輸入   （負載越重，輸入功率越大）
   *
   * 三個量三個方向，這正是「制約關係」面板要講的事。
   *
   * 另外補上兩個課本會特別強調、但模擬很少做的狀態：
   *   · 直流輸入 → 副邊沒有輸出（磁通量不變就沒有感應）
   *   · 空載 → 電流幾乎為零，但電壓照樣有
   */
  PL.register("transformer", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.52, 880);
    let t = 0;

    PL.ui.section(L.controls, "變壓器參數");
    const sNp = PL.ui.stepper(L.controls, { label: "原線圈匝數 n₁", value: 200, min: 20, max: 800, step: 20, unit: "匝", digits: 0, onChange: draw });
    const sNs = PL.ui.stepper(L.controls, { label: "副線圈匝數 n₂", value: 200, min: 20, max: 800, step: 20, unit: "匝", digits: 0, onChange: draw });
    const sVp = PL.ui.stepper(L.controls, { label: "輸入電壓 U₁", value: 220, min: 10, max: 400, step: 10, unit: "V", digits: 0, onChange: draw });
    const sR = PL.ui.stepper(L.controls, { label: "負載電阻 R", value: 440, min: 10, max: 2000, step: 10, unit: "Ω", digits: 0, onChange: draw });

    PL.ui.presets(L.controls, {
      label: "快捷預設",
      options: [
        { label: "升壓 1:2", hint: "副線圈匝數是原線圈的兩倍，電壓加倍、電流減半",
          apply: () => { sNp.set(200); sNs.set(400); draw(); } },
        { label: "降壓 4:1", hint: "電壓降為四分之一，電流變四倍",
          apply: () => { sNp.set(400); sNs.set(100); draw(); } },
        { label: "隔離 1:1", hint: "電壓不變，但原副邊在電路上完全分開",
          apply: () => { sNp.set(200); sNs.set(200); draw(); } }
      ]
    });

    PL.ui.section(L.controls, "電源與負載");
    const srcChips = PL.ui.chipGroup(L.controls, {
      value: "ac",
      options: [{ value: "ac", label: "交流 ~" }, { value: "dc", label: "直流 =" }],
      onChange: draw
    });
    const loadChips = PL.ui.chipGroup(L.controls, {
      value: "on",
      options: [{ value: "on", label: "接通" }, { value: "off", label: "空載" }],
      onChange: draw
    });
    const layers = PL.ui.chipGroup(L.controls, {
      multi: true, value: ["flux", "current"],
      options: [{ value: "flux", label: "磁通 Φ" }, { value: "current", label: "電流流向" }]
    });

    const row = PL.ui.buttonRow(L.controls);
    /* 播放／暫停由引擎的傳輸列統一提供（還附單步與速度），實驗不再自備，避免兩個開關互相打架。 */
    PL.ui.button(row, "重置", () => { sNp.set(200); sNs.set(200); sVp.set(220); sR.set(440); draw(); });

    PL.ui.note(L.controls,
      "先按「降壓 4:1」：電壓降成四分之一，但電流變成四倍——功率沒有變。" +
      "再把負載電阻調小（負載變重）：副線圈電流變大，原線圈電流跟著變大。" +
      "注意因果方向：電壓是原邊決定副邊，電流卻是副邊決定原邊。" +
      "最後把電源切成直流：磁通量不再變化，副邊完全沒有輸出。");

    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—" });
    const rVs = PL.ui.readout(L.readouts, { label: "副線圈電壓 U₂", unit: "V" });
    const rIs = PL.ui.readout(L.readouts, { label: "副線圈電流 I₂", unit: "A" });
    const rIp = PL.ui.readout(L.readouts, { label: "原線圈電流 I₁", unit: "A" });
    const rP = PL.ui.readout(L.readouts, { label: "功率 P₁ = P₂", unit: "W" });

    const cz = PL.ui.causality(L.canvasWrap.parentNode, {
      title: "制約關係（誰決定誰）",
      rows: [
        { name: "電壓", tone: "a", note: "原 → 副：由原線圈電壓和匝數比決定。副邊接什麼負載都不會改變 U₂。" },
        { name: "電流", tone: "b", note: "副 → 原：I₂ 由負載決定，再依匝數比回頭決定 I₁。這是最常被搞反的一條。" },
        { name: "功率", tone: "c", note: "輸出 → 輸入：負載越重，輸出功率越大，輸入功率跟著變大。理想變壓器 P₁ = P₂。" }
      ]
    });

    /* 理想變壓器：不計損耗，P₁ = P₂ */
    function model() {
      const n1 = sNp.get(), n2 = sNs.get(), U1 = sVp.get(), R = sR.get();
      const ac = srcChips.get() === "ac";
      const loaded = loadChips.get() === "on";
      // 直流輸入：磁通量不變 → 沒有感應電動勢 → 副邊沒有輸出
      const U2 = ac ? U1 * n2 / n1 : 0;
      const I2 = ac && loaded ? U2 / R : 0;
      const I1 = ac && loaded ? I2 * n2 / n1 : 0;
      const P = U2 * I2;
      return { n1, n2, U1, U2, I1, I2, P, R, ac, loaded, ratio: n2 / n1 };
    }

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m = model();
      const cx = W * 0.5, cy = H * 0.46;
      const coreW = 92, coreH = 128;

      // 鐵芯（口字形閉合）
      D.rect(ctx, cx - coreW / 2, cy - coreH / 2, coreW, coreH,
        { fill: PL.theme.shade(0.30), stroke: PL.theme.pale(0.40), width: 2, r: 4 });
      D.rect(ctx, cx - coreW / 2 + 18, cy - coreH / 2 + 18, coreW - 36, coreH - 36,
        { fill: PL.col("sim-bg-1", "#0a0f16"), stroke: PL.theme.pale(0.25), width: 1.5, r: 3 });

      // 磁通：交流時在鐵芯裡循環流動；直流時靜止且畫成灰色，一眼看出「沒有變化」
      if (layers.has("flux")) {
        const phase = m.ac ? (t * 1.4) % 1 : 0;
        const col = m.ac ? PL.col("accent-3") : PL.col("text-faint");
        for (let i = 0; i < 4; i += 1) {
          const f = (i / 4 + phase) % 1;
          const y = cy - coreH / 2 + 9 + f * (coreH - 18);
          D.arrow(ctx, cx - coreW / 2 + 9, y, cx - coreW / 2 + 9, y + 14,
            { color: col, width: 1.6, head: 5 });
          D.arrow(ctx, cx + coreW / 2 - 9, cy + coreH / 2 - 9 - f * (coreH - 18),
            cx + coreW / 2 - 9, cy + coreH / 2 - 23 - f * (coreH - 18),
            { color: col, width: 1.6, head: 5 });
        }
        D.text(ctx, m.ac ? "Φ 變化中" : "Φ 不變（直流）", cx, cy + 4,
          { color: col, size: 11, align: "center", weight: "700" });
      }

      // 線圈：匝數以實際圈數呈現，比例一眼可見
      function coil(x, n, color, side) {
        const turns = PL.clamp(Math.round(n / 40), 3, 14);
        for (let i = 0; i < turns; i += 1) {
          const y = cy - coreH / 2 + 14 + i * ((coreH - 28) / Math.max(1, turns - 1));
          D.ring(ctx, x, y, 11, color, 2.2);
        }
        D.text(ctx, (side === "p" ? "n₁ = " : "n₂ = ") + n + " 匝", x, cy + coreH / 2 + 18,
          { color, size: 11, align: "center", weight: "700" });
      }
      coil(cx - coreW / 2, m.n1, PL.col("accent-2"), "p");
      coil(cx + coreW / 2, m.n2, PL.col("danger"), "s");

      // 原邊迴路
      const lx = 60, rx = W - 60, ty = cy - coreH / 2 - 26, by = cy + coreH / 2 + 42;
      D.line(ctx, lx, ty, cx - coreW / 2, ty, PL.col("accent-2"), 2);
      D.line(ctx, lx, by, cx - coreW / 2, by, PL.col("accent-2"), 2);
      D.line(ctx, lx, ty, lx, by, PL.col("accent-2"), 2);
      D.ring(ctx, lx, cy, 17, PL.col("accent-2"), 2);
      D.text(ctx, m.ac ? "~" : "=", lx, cy + 6, { color: PL.col("accent-2"), size: 17, align: "center", weight: "700" });
      D.text(ctx, "U₁ = " + PL.fmt(m.U1, 0) + " V", lx + 4, ty - 10, { color: PL.col("accent-2"), size: 11, weight: "700" });
      D.text(ctx, "I₁ = " + PL.fmt(m.I1, 2) + " A", lx + 4, by + 16, { color: PL.col("accent-2"), size: 11 });

      // 副邊迴路
      D.line(ctx, cx + coreW / 2, ty, rx, ty, PL.col("danger"), 2);
      D.line(ctx, cx + coreW / 2, by, rx, by, PL.col("danger"), 2);
      if (m.loaded) {
        D.line(ctx, rx, ty, rx, cy - 16, PL.col("danger"), 2);
        D.line(ctx, rx, cy + 16, rx, by, PL.col("danger"), 2);
        // 燈泡：亮度隨功率
        const glow = PL.clamp(m.P / 200, 0, 1);
        D.disc(ctx, rx, cy, 14, {
          fill: m.P > 0.5 ? "rgba(255,214,120," + (0.25 + glow * 0.6) + ")" : PL.theme.shade(0.3),
          stroke: PL.col("warn"), width: 1.8,
          glow: m.P > 0.5 ? PL.col("warn") : null, glowSize: 6 + glow * 22
        });
        D.text(ctx, "R = " + PL.fmt(m.R, 0) + " Ω", rx, cy + 34,
          { color: PL.col("warn"), size: 10.5, align: "center" });
      } else {
        // 空載：把斷口畫出來，「有電壓但沒電流」才看得懂
        D.line(ctx, rx, ty, rx, cy - 22, PL.col("danger"), 2);
        D.line(ctx, rx, cy + 22, rx, by, PL.col("danger"), 2);
        D.disc(ctx, rx, cy - 22, 3, { fill: PL.col("danger") });
        D.disc(ctx, rx, cy + 22, 3, { fill: PL.col("danger") });
        D.text(ctx, "空載（斷路）", rx, cy + 4, { color: PL.col("text-faint"), size: 10, align: "center" });
      }
      D.text(ctx, "U₂ = " + PL.fmt(m.U2, 0) + " V", rx - 4, ty - 10,
        { color: PL.col("danger"), size: 11, align: "right", weight: "700" });
      D.text(ctx, "I₂ = " + PL.fmt(m.I2, 2) + " A", rx - 4, by + 16,
        { color: PL.col("danger"), size: 11, align: "right" });

      // 電流流動的點：密度隨電流大小，兩側可以直接比較
      if (layers.has("current") && m.ac) {
        const flow = (t * 0.6) % 1;
        const dots = (x0, y0, x1, y1, amps, color) => {
          if (amps <= 1e-6) return;
          const len = Math.hypot(x1 - x0, y1 - y0);
          const gap = PL.clamp(40 - amps * 12, 12, 40);
          const n = Math.floor(len / gap);
          for (let i = 0; i < n; i += 1) {
            const f = ((i + flow) / Math.max(1, n)) % 1;
            D.disc(ctx, x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, 2.4, { fill: color });
          }
        };
        dots(lx, ty, cx - coreW / 2, ty, m.I1, PL.col("accent-2"));
        dots(cx + coreW / 2, ty, rx, ty, m.I2, PL.col("danger"));
      }

      PL.ui.caption(cv, !m.ac
        ? "直流輸入：鐵芯裡的磁通量固定不變，沒有變化就沒有感應電動勢——副線圈完全沒有輸出。變壓器只能變交流。"
        : !m.loaded
          ? "空載：副線圈仍然有電壓 U₂，但電路斷開所以沒有電流，輸入功率也接近零。電壓與電流是兩回事。"
          : "匝數比決定電壓比，電壓比又決定電流比（方向相反）。理想變壓器不產生也不消耗功率：P₁ = P₂。");
    }

    function update() {
      const m = model();
      draw();
      rVs.set(m.U2, 1); rIs.set(m.I2, 2); rIp.set(m.I1, 2); rP.set(m.P, 1);

      cz.set(0, "U₁ " + PL.fmt(m.U1, 0) + "V　×" + PL.fmt(m.ratio, 2) + " →　U₂ " + PL.fmt(m.U2, 0) + "V");
      cz.set(1, "I₂ " + PL.fmt(m.I2, 2) + "A　×" + PL.fmt(m.ratio, 2) + " →　I₁ " + PL.fmt(m.I1, 2) + "A");
      cz.set(2, "P₂ " + PL.fmt(m.P, 1) + "W　=　P₁ " + PL.fmt(m.P, 1) + "W");

      if (!m.ac) vd.set("直流：磁通不變，副邊沒有輸出", "bad");
      else if (!m.loaded) vd.set("空載：有電壓、沒有電流", "warn");
      else if (Math.abs(m.ratio - 1) < 1e-9) vd.set("隔離變壓器 1:1（電壓不變，電路分開）", "ok");
      else if (m.ratio > 1) vd.set("升壓 1:" + PL.fmt(m.ratio, 2) + "（電壓升、電流降）", "ok");
      else vd.set("降壓 " + PL.fmt(1 / m.ratio, 2) + ":1（電壓降、電流升）", "ok");
    }

    const anim = PL.loop(dt => { if (dt) t += dt; update(); }, 40);
    cv.onResize(update); update(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: update };
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
