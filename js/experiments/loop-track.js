/* 力學能守恆與圓環軌道 —— 過山車能不能過得了圓環
 *
 * 這一題的答案 h ≥ 2.5R 幾乎每個學生都背得出來，但問「為什麼不是 2R」
 * 就答不上來。差的那 0.5R 來自一個完全不同的條件：
 *
 *   2R  是「爬得上去」——能量夠把物體舉到環頂
 *   2.5R 是「過得去」——到了環頂還要有足夠的速率維持圓周運動，
 *        否則軌道給不出向下的力，物體會在環頂之前就脫離軌道
 *
 * 所以這個模擬的重點不是把球畫得會轉，而是：
 *   · 能量夠不夠爬上去，和夠不夠轉過去，是兩個要分開看的判準
 *   · h < 2.5R 時必須真的脫軌（在 N = 0 的位置），而不是硬讓它滑過去
 *   · 動能裕度 ΔEk = mg(h − 2.5R) 要能直接讀到，正負一目了然
 *
 * 依 PhET 的原則：把參數推到極端時，模擬要以「有意義的方式壞掉」。
 * 這裡壞掉的方式就是脫軌，而且脫軌點會隨 h 改變。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#81c784");
  const KE_C = "#5aa2ff";        // 動能
  const PE_C = "#81c784";        // 位能

  PL.register("loop-track", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.52, 900);

    let s = 0;                   // 沿軌道走過的弧長（m）
    let detached = null;         // 脫軌時的狀態 {x, y, vx, vy}
    let flightT = 0;

    /* ---------------- 控制項 ---------------- */
    PL.ui.section(L.controls, "參數調節");
    const sM = PL.ui.stepper(L.controls, { label: "質量 m", value: 0.5, min: 0.1, max: 3, step: 0.1, unit: "kg", digits: 1, onChange: reset });
    const sR = PL.ui.stepper(L.controls, { label: "環半徑 R", value: 0.4, min: 0.2, max: 1.2, step: 0.05, unit: "m", digits: 2, onChange: reset });
    const sG = PL.ui.stepper(L.controls, { label: "重力加速度 g", value: 9.8, min: 1.6, max: 20, step: 0.1, unit: "m/s²", digits: 1, onChange: reset });
    const sH = PL.ui.slider(L.controls, { label: "釋放高度 h", min: 0, max: 3, step: 0.01, value: 1.2, unit: "m", digits: 2, onInput: reset });

    PL.ui.presets(L.controls, {
      label: "關鍵位置",
      options: [
        { label: "設為臨界 h_min", hint: "剛好能過環的最小高度 2.5R",
          apply: () => { sH.set(hMin()); reset(); } },
        { label: "只夠爬到環頂 2R", hint: "能量剛好把物體舉到環頂，但速率為零——過不去",
          apply: () => { sH.set(2 * sR.get()); reset(); } },
        { label: "裕度充足 3R", hint: "明顯高於臨界值，順利通過",
          apply: () => { sH.set(Math.min(3, 3 * sR.get())); reset(); } }
      ]
    });

    const row = PL.ui.buttonRow(L.controls);
    /*
     * 「釋放」是單向觸發：回到起點並開始跑，不是播放／暫停開關。
     *
     * 第一版把它做成 running 的 toggle，等於在引擎的傳輸列之外又多一個播放鍵——
     * 兩個開關必須同時打開才會動，而傳輸列按了沒反應時學生完全看不出原因。
     * 播放、暫停、單步、速度一律交給傳輸列，實驗只負責「開始這一次實驗」。
     */
    PL.ui.button(row, "釋放", () => {
      s = 0; detached = null; flightT = 0;
      anim.start();
      update();
    }, { primary: true });
    PL.ui.button(row, "重置", reset);

    function reset() { s = 0; detached = null; flightT = 0; anim.stop(); update(); }

    PL.ui.note(L.controls,
      "先把釋放高度拉到剛好 2R：能量足夠把小球舉到環頂，但到了那裡速率是零——它過不去。" +
      "再按「設為臨界 h_min」，高度只多了 0.5R，小球就過得去了。" +
      "那 0.5R 買到的不是高度，是環頂維持圓周運動所需的最小速率 √(gR)。");

    /* ---------------- 幾何與物理 ----------------
     * 軌道由三段組成，全部以「弧長 s」為參數：
     *   ① 斜坡：從釋放高度平滑降到地面
     *   ② 平直段
     *   ③ 圓環：半徑 R，最低點與地面相切
     * 高度 y(s) 決定速率：v = √(2g(h − y))，這就是力學能守恆。
     */
    const hMin = () => 2.5 * sR.get();
    const RAMP_LEN = () => Math.max(0.8, sH.get() * 2.2);     // 斜坡水平長度
    const FLAT_LEN = 0.6;

    function rampY(u) {                       // u: 0..1，平滑的下坡
      return sH.get() * (1 - u) * (1 - u * 0.35);
    }
    function rampArc() {
      // 數值積分斜坡弧長
      let len = 0, prev = { x: 0, y: rampY(0) };
      for (let i = 1; i <= 60; i++) {
        const u = i / 60, p = { x: RAMP_LEN() * u, y: rampY(u) };
        len += Math.hypot(p.x - prev.x, p.y - prev.y);
        prev = p;
      }
      return len;
    }

    /* 由弧長取得位置、高度與軌道類型 */
    function pointAt(arc) {
      const ra = rampArc(), R = sR.get();
      if (arc <= ra) {
        // 反解斜坡上的 u（線性搜尋足夠，段數不多）
        let len = 0, prev = { x: 0, y: rampY(0) };
        for (let i = 1; i <= 120; i++) {
          const u = i / 120, p = { x: RAMP_LEN() * u, y: rampY(u) };
          const d = Math.hypot(p.x - prev.x, p.y - prev.y);
          if (len + d >= arc) {
            const f = (arc - len) / (d || 1);
            return { x: prev.x + (p.x - prev.x) * f, y: prev.y + (p.y - prev.y) * f, part: "ramp", theta: 0 };
          }
          len += d; prev = p;
        }
        return { x: RAMP_LEN(), y: 0, part: "ramp", theta: 0 };
      }
      if (arc <= ra + FLAT_LEN) {
        return { x: RAMP_LEN() + (arc - ra), y: 0, part: "flat", theta: 0 };
      }
      // 圓環：從最低點起算，φ 為繞行角
      const phi = (arc - ra - FLAT_LEN) / R;
      const cx = RAMP_LEN() + FLAT_LEN, cy = R;
      return {
        x: cx + R * Math.sin(phi),
        y: cy - R * Math.cos(phi),
        part: "loop",
        phi,
        // θ 定義為「距離環頂的角度」，環頂 θ=0
        theta: Math.abs(Math.PI - phi)
      };
    }
    const loopStart = () => rampArc() + FLAT_LEN;
    const loopEnd = () => loopStart() + TAU * sR.get();

    /* 力學能守恆：v² = 2g(h − y) */
    function speedAt(y) {
      const v2 = 2 * sG.get() * (sH.get() - y);
      return v2 > 0 ? Math.sqrt(v2) : 0;
    }

    /*
     * 圓環內側的軌道正向力：N = m v²/R − m g cosθ（θ 為距環頂的角度）
     * N < 0 代表軌道必須「拉」住物體才行，但軌道只能推不能拉 → 脫軌。
     */
    function normalForce(p) {
      if (p.part !== "loop") return Infinity;
      const v = speedAt(p.y), R = sR.get(), m = sM.get(), g = sG.get();
      return m * v * v / R - m * g * Math.cos(p.theta);
    }

    /* 關鍵能量（都以地面為位能零點） */
    function energies() {
      const m = sM.get(), g = sG.get(), R = sR.get(), h = sH.get();
      const total = m * g * h;
      const topKE = Math.max(0, m * g * (h - 2 * R));       // 到環頂還剩多少動能
      const critKE = 0.5 * m * g * R;                        // 環頂維持圓周所需的最小動能
      return { total, topKE, critKE, margin: topKE - critKE, m, g, R, h };
    }

    /* ---------------- 讀數 ---------------- */
    const vd = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—", meter: true });
    const rE = PL.ui.readout(L.readouts, { label: "總力學能 E", unit: "J" });
    const rVb = PL.ui.readout(L.readouts, { label: "底部速度 v底", unit: "m/s" });
    const rVt = PL.ui.readout(L.readouts, { label: "最高點速度 v頂", unit: "m/s" });
    const rVc = PL.ui.readout(L.readouts, { label: "臨界速度 v頂,min", unit: "m/s" });
    const rHm = PL.ui.readout(L.readouts, { label: "最小高度 h_min", unit: "m" });
    const rRatio = PL.ui.readout(L.readouts, { label: "高度比 h/h_min" });

    const dv = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "環頂動能 E<sub>k,頂</sub>", unit: "J", hint: "= mg(h − 2R)" },
      { label: "臨界動能 ½mgR", unit: "J", hint: "維持圓周運動所需" },
      { label: "動能裕度 ΔE<sub>k</sub>", unit: "J", hint: "= mg(h − 2.5R)，負值就過不去" }
    ]);

    PL.ui.causality(L.canvasWrap.parentNode, {
      title: "兩個條件要分開看",
      rows: [
        { name: "爬得上去", tone: "a", note: "能量足以把物體舉到環頂高度 2R。這只保證「到得了」，不保證「過得去」。" },
        { name: "過得去", tone: "b", note: "到了環頂還要有速率 √(gR)，否則軌道給不出向下的力。兩者相加才是 h ≥ 2.5R。" },
        { name: "與質量無關", tone: "c", note: "m 在不等式兩邊同時出現而消掉——換更重的車，臨界高度完全一樣。" }
      ]
    });

    PL.ui.procedure(L.controls, {
      title: "為什麼是 2.5R 而不是 2R",
      steps: [
        "把 h 設成 <strong>2R</strong>：能量剛好把小球舉到環頂，但 v頂 = 0，它在環頂之前就掉下來了。",
        "環頂要維持圓周運動，向心力至少要等於重力：<strong>mv²/R ≥ mg</strong>，也就是 v頂 ≥ √(gR)。",
        "把這份動能換算成高度：½mv² = ½mgR，相當於再多 <strong>0.5R</strong>。兩者相加得 h ≥ 2.5R。"
      ],
      rule: "「爬得上去」和「過得去」是兩個不同的條件。只算能量夠不夠爬到 2R，是這一題最常見的失分點。"
    });

    /* ---------------- 主畫面 ---------------- */
    function draw() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const R = sR.get();
      const worldW = RAMP_LEN() + FLAT_LEN + 2 * R + 0.6;
      const worldH = Math.max(sH.get(), 2 * R) + 0.5;
      const pad = 46;
      const sc = Math.min((W - pad * 2) / worldW, (H - pad * 1.7) / worldH);
      const ox = pad, oy = H - pad * 0.9;
      const PX = x => ox + x * sc;
      const PY = y => oy - y * sc;
      cv.calibrate(sc, "m");

      // 地面
      D.rect(ctx, 20, PY(0), W - 40, H - PY(0) - 6, { fill: PL.theme.shade(0.30), r: 3 });
      D.line(ctx, 20, PY(0), W - 20, PY(0), PL.theme.pale(0.35), 2);
      D.text(ctx, "y = 0 基準面", W - 26, PY(0) + 16,
        { color: PL.col("text-faint"), size: 9.5, align: "right" });

      // 高度座標
      for (let y = 0; y <= worldH; y += 0.5) {
        D.line(ctx, 26, PY(y), 34, PY(y), PL.theme.pale(0.25), 1);
        D.text(ctx, PL.fmt(y, 1), 24, PY(y) + 3,
          { color: PL.col("text-faint"), size: 8.5, align: "right" });
      }
      D.text(ctx, "高度 / m", 26, PY(worldH) - 8, { color: PL.col("text-faint"), size: 9 });

      // 軌道：斜坡＋平段＋圓環，畫成有枕木的雙軌
      ctx.save();
      ctx.strokeStyle = PL.theme.pale(0.5); ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath();
      const total = loopEnd();
      for (let i = 0; i <= 300; i++) {
        const p = pointAt(total * i / 300);
        i ? ctx.lineTo(PX(p.x), PY(p.y)) : ctx.moveTo(PX(p.x), PY(p.y));
      }
      ctx.stroke();
      ctx.restore();
      // 枕木
      for (let i = 0; i <= 60; i++) {
        const a = total * i / 60, p = pointAt(a), q = pointAt(Math.min(total, a + total / 300));
        const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len * 0.05, ny = dx / len * 0.05;
        D.line(ctx, PX(p.x - nx), PY(p.y - ny), PX(p.x + nx), PY(p.y + ny),
          PL.theme.pale(0.22), 1.4);
      }

      // 釋放高度線與 h_min 線
      D.line(ctx, PX(0) - 10, PY(sH.get()), PX(RAMP_LEN() * 0.5), PY(sH.get()),
        MC(), 1.4, [6, 5]);
      D.text(ctx, "釋放高度 h = " + PL.fmt(sH.get(), 2) + " m", PX(0) - 8, PY(sH.get()) - 8,
        { color: MC(), size: 10.5, weight: "700" });
      const hm = hMin();
      D.line(ctx, PX(RAMP_LEN() + FLAT_LEN - 0.3), PY(hm), PX(RAMP_LEN() + FLAT_LEN + 2 * sR.get() + 0.3), PY(hm),
        PL.col("warn"), 1.4, [4, 4]);
      D.text(ctx, "h_min = 2.5R = " + PL.fmt(hm, 2) + " m",
        PX(RAMP_LEN() + FLAT_LEN + 2 * sR.get() + 0.32), PY(hm) + 4,
        { color: PL.col("warn"), size: 10 });
      // 環頂 2R
      const topY = 2 * sR.get();
      D.text(ctx, "環頂 2R", PX(RAMP_LEN() + FLAT_LEN) , PY(topY) - 10,
        { color: PL.col("text-faint"), size: 9.5, align: "center" });

      // 小球
      let bx, by, v;
      if (detached) {
        bx = detached.x; by = detached.y; v = Math.hypot(detached.vx, detached.vy);
      } else {
        const p = pointAt(Math.min(s, total));
        bx = p.x; by = p.y; v = speedAt(p.y);
      }
      const E = energies();
      const ke = 0.5 * sM.get() * v * v;
      const pe = sM.get() * sG.get() * by;
      const totalE = Math.max(1e-9, ke + pe);

      // 球外圈的能量環：動能與位能各佔一段弧，兩者相加永遠是整圈
      /*
       * 球的半徑隨質量改變。
       * 臨界高度 2.5R 確實與質量無關——那正是要教的結論——
       * 但如果畫面上完全看不出「這顆比較重」，學生只會覺得滑桿壞了。
       * 讓球變大、同時保持軌道與臨界線紋風不動，結論才有說服力。
       */
      const r0 = 7 + sM.get() * 3.2;
      ctx.save();
      ctx.lineWidth = 4; ctx.lineCap = "butt";
      const keFrac = ke / totalE;
      ctx.strokeStyle = KE_C;
      ctx.beginPath(); ctx.arc(PX(bx), PY(by), r0 + 5, -Math.PI / 2, -Math.PI / 2 + TAU * keFrac); ctx.stroke();
      ctx.strokeStyle = PE_C;
      ctx.beginPath(); ctx.arc(PX(bx), PY(by), r0 + 5, -Math.PI / 2 + TAU * keFrac, -Math.PI / 2 + TAU); ctx.stroke();
      ctx.restore();
      D.disc(ctx, PX(bx), PY(by), r0, { fill: MC(), stroke: PL.theme.pale(0.5), width: 1.5, glow: MC(), glowSize: 10 });

      D.text(ctx, "小球外圈：", 40, 24, { color: PL.col("text-faint"), size: 9.5 });
      D.disc(ctx, 104, 21, 4, { fill: KE_C });
      D.text(ctx, "動能 Ek", 112, 24, { color: KE_C, size: 9.5 });
      D.disc(ctx, 168, 21, 4, { fill: PE_C });
      D.text(ctx, "位能 Ep", 176, 24, { color: PE_C, size: 9.5 });
      D.text(ctx, "二者之和（總機械能）始終不變", 232, 24, { color: PL.col("text-faint"), size: 9.5 });

      /*
       * 底部速度指示。
       * 重力加速度只改變速率、不改變軌道形狀與臨界高度，
       * 因此在靜止畫面上原本完全看不出 g 有沒有變。
       * 這裡把 v底 = √(2gh) 畫成一支箭頭：換到月球重力，箭頭就明顯變短。
       */
      const vBottom = speedAt(0);
      const bxBottom = RAMP_LEN() + FLAT_LEN * 0.5;
      D.arrow(ctx, PX(bxBottom - 0.05), PY(0) - 16, PX(bxBottom - 0.05) + vBottom * sc * 0.10, PY(0) - 16,
        { color: KE_C, width: 2.2, head: 7 });
      D.text(ctx, "v底 = " + PL.fmt(vBottom, 2) + " m/s（= √(2gh)，隨 g 與 h 改變）",
        PX(bxBottom - 0.05), PY(0) - 24, { color: KE_C, size: 10 });

      // 脫軌點標記
      if (detached) {
        D.disc(ctx, PX(detached.x0), PY(detached.y0), 4, { fill: PL.col("danger") });
        D.text(ctx, "在這裡脫軌（N = 0）", PX(detached.x0) + 8, PY(detached.y0) - 6,
          { color: PL.col("danger"), size: 10, weight: "700" });
      }

      PL.ui.caption(cv, E.margin >= -Math.max(1e-9, E.total * 1e-9)
        ? "小球下降時重力位能轉化為動能，總機械能 E = mgh 保持不變；環頂動能不低於 ½mgR，因此通得過。"
        : "能量不足：環頂動能比 ½mgR 少了 " + PL.fmt(-E.margin, 3) + " J，" +
          "軌道無法提供向下的力，小球會在環頂之前脫離軌道。");
    }

    /* ---------------- 能量–高度圖 ---------------- */
    const chart = PL.ui.chart(PL.ui.charts(root), {
      title: "能量–高度圖像（Ep + Ek = E）",
      cap: "小球下降時重力位能轉化為動能，總機械能保持不變；環頂動能須不小於 ½mgR 才能通過，對應 h_min = 2.5R。"
    });

    function drawChart() {
      chart.clear();
      const E = energies();
      const yMax = Math.max(sH.get(), 2 * sR.get()) * 1.12 + 0.05;
      const eMax = Math.max(E.total, 1e-6) * 1.15;
      const g = PL.graph(chart, { x: 52, y: 18, w: chart.W - 70, h: chart.H - 46 },
        { x0: 0, x1: yMax, y0: 0, y1: eMax });
      g.frame({ xlabel: "高度 y (m)", ylabel: "E / J" });
      g.grid(5, 4);
      // 位能隨高度線性上升、動能線性下降、總和是水平線
      g.fn(y => E.m * E.g * y, { color: PE_C, width: 2.4 });
      g.fn(y => Math.max(0, E.total - E.m * E.g * y), { color: KE_C, width: 2.4 });
      g.hline(E.total, { color: PL.col("text-dim"), dash: [6, 5], width: 1.6 });
      g.label(0.05, E.total + eMax * 0.03, "總機械能 E = mgh（水平 → 守恆）",
        { color: PL.col("text-dim"), size: 9.5 });
      // 環頂位置與臨界動能
      const topY = 2 * sR.get();
      if (topY <= yMax) {
        g.vline(topY, { color: PL.col("warn"), dash: [5, 4], width: 1.5 });
        g.label(topY, eMax * 0.94, "環頂 2R", { color: PL.col("warn"), size: 9.5 });
        g.dot(topY, Math.max(0, E.total - E.m * E.g * topY),
          { color: KE_C, glow: KE_C, r: 5 });
        g.dot(topY, E.critKE, { color: PL.col("danger"), r: 4 });
        g.label(topY + yMax * 0.02, E.critKE, "½mgR", { color: PL.col("danger"), size: 9.5 });
      }
    }

    /* ---------------- 更新 ---------------- */
    function update() {
      const E = energies();
      draw();
      drawChart();

      const vTop = speedAt(2 * sR.get());
      const vCrit = Math.sqrt(sG.get() * sR.get());
      rE.set(E.total, 2);
      rVb.set(speedAt(0), 2);
      rVt.set(vTop, 2);
      rVc.set(vCrit, 2);
      rHm.set(hMin(), 2);
      rRatio.set(hMin() > 0 ? sH.get() / hMin() : 0, 2);

      dv.set(0, E.topKE, 2); dv.tone(0, "");
      dv.set(1, E.critKE, 2); dv.tone(1, "");
      dv.set(2, E.margin, 2); dv.tone(2, E.margin >= 0 ? "ok" : "bad");

      /*
       * 臨界值要用容差判斷，而且要有自己的判定。
       * h 剛好等於 2.5R 時，mg(h−2.5R) 在浮點運算下會算出 −2.22e-16，
       * 用 margin >= 0 判斷會掉到「過不去」那一邊——明明是課本的標準答案。
       * 而且「剛好臨界」本來就是這一題最值得標出來的狀態：
       * 環頂速率恰好等於 √(gR)，軌道正向力恰好為零。
       */
      const tol = Math.max(1e-9, E.total * 1e-9);
      if (Math.abs(E.margin) <= tol) {
        vd.set("剛好臨界：環頂速率恰好 √(gR)，軌道正向力為零", "warn", 1);
      } else if (E.margin > 0) {
        vd.set("順利通過圓環（裕度 " + PL.fmt(E.margin, 2) + " J）", "ok",
          Math.min(1, sH.get() / Math.max(1e-9, hMin())));
      } else if (sH.get() >= 2 * sR.get()) {
        vd.set("爬得上去，但過不去——環頂速率不足 √(gR)", "warn",
          Math.min(1, sH.get() / Math.max(1e-9, hMin())));
      } else {
        vd.set("能量不足以爬到環頂 2R", "bad",
          Math.min(1, sH.get() / Math.max(1e-9, hMin())));
      }
    }

    const anim = PL.loop(dt => {
      if (dt) {
        const total = loopEnd();
        if (detached) {
          // 脫軌後的拋體運動
          flightT += dt;
          detached.vy -= sG.get() * dt;
          detached.x += detached.vx * dt;
          detached.y += detached.vy * dt;
          if (detached.y <= 0) { detached.y = 0; anim.stop(); }
        } else {
          const p = pointAt(Math.min(s, total));
          const v = speedAt(p.y);
          if (v <= 1e-6 && p.part === "loop") {
            // 速度歸零：能量連爬到這裡都不夠，往回滑
            anim.stop();
          } else {
            s += v * dt;
          }
          const q = pointAt(Math.min(s, total));
          // 脫軌判斷同樣要容差：臨界狀態下 N 理論上恰為零，
          // 浮點誤差會讓它變成 −1e-16 而誤判成脫軌。
          if (q.part === "loop" && normalForce(q) < -1e-9 * sM.get() * sG.get()) {
            const vv = speedAt(q.y);
            // 脫軌瞬間的速度方向 = 軌道切線
            const tang = q.phi;
            detached = {
              x: q.x, y: q.y, x0: q.x, y0: q.y,
              vx: vv * Math.cos(tang), vy: vv * Math.sin(tang)
            };
            flightT = 0;
          }
          if (s >= total) { s = total; anim.stop(); }
        }
      }
      update();
    }, 50);

    cv.onResize(update); chart.onResize(update);
    update();

    return {
      stop() { anim.stop(); cv.destroy(); chart.destroy(); },
      rerender: update
    };
  }});
})();
