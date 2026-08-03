/* 模組七 · 流體與熱學 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#e57373");

  /* 浮力與阿基米德原理 */
  PL.register("buoyancy", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    let bob = 0;
    const sObj = PL.ui.slider(L.controls, { label: "物體密度 ρ物", min: 200, max: 2000, step: 50, value: 600, unit: "kg/m³", digits: 0 });
    const sFl = PL.ui.slider(L.controls, { label: "流體密度 ρ流", min: 500, max: 1400, step: 50, value: 1000, unit: "kg/m³", digits: 0 });
    PL.ui.note(L.controls, "水的密度約 1000 kg/m³。沒入比例 = ρ物 / ρ流；比值 ≥ 1 就下沉。");
    const rState = PL.ui.readout(L.readouts, { label: "狀態" });
    const rSub = PL.ui.readout(L.readouts, { label: "沒入比例", unit: "%" });
    const rFb = PL.ui.readout(L.readouts, { label: "浮力 / 重力" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const ro = sObj.get(), rf = sFl.get(), ratio = ro / rf, floats = ratio < 1;
      const surf = 90, tankL = 40, tankR = W - 40, bottom = H - 24;
      D.rect(ctx, tankL, surf, tankR - tankL, bottom - surf, { fill: "rgba(90,162,255,0.14)" });
      D.line(ctx, tankL, surf, tankR, surf, PL.col("accent-2"), 2);
      D.line(ctx, tankL, bottom, tankR, bottom, PL.col("text-faint"), 2);
      D.line(ctx, tankL, surf, tankL, bottom, PL.col("text-faint"), 2); D.line(ctx, tankR, surf, tankR, bottom, PL.col("text-faint"), 2);
      const boxW = 84, boxH = 64, cx = W / 2;
      const sub = floats ? ratio : 1;
      let topY = floats ? surf - boxH * (1 - sub) + bob : surf - 0 + bob;
      if (!floats) topY = bottom - boxH; // 沉底
      D.rect(ctx, cx - boxW / 2, topY, boxW, boxH, { fill: MC(), stroke: "rgba(255,255,255,0.4)", r: 4 });
      D.text(ctx, ro + "", cx, topY + boxH / 2 + 4, { color: "#04121a", size: 12, align: "center", weight: "700" });
      // 力向量
      const midX = cx, wY = topY + boxH / 2;
      D.arrow(ctx, midX - 26, wY, midX - 26, wY + 42, { color: PL.col("warn"), width: 2.4, label: "重力" });
      const fb = floats ? 1 : ratio < 1 ? ratio : 1 / ratio; // 浮力/重力
      D.arrow(ctx, midX + 26, wY, midX + 26, wY - 42 * (floats ? 1 : 1 / ratio), { color: PL.col("accent-2"), width: 2.4, label: "浮力" });
      rState.set(floats ? "漂浮" : "下沉"); rSub.set(sub * 100, 0); rFb.set(floats ? "平衡" : PL.fmt(1 / ratio, 2));
    }
    const anim = PL.loop((dt, t) => { bob = Math.sin(t * 1.6) * 3; draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 彈簧秤示重差量浮力 */
  PL.register("spring-scale-buoyancy", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.62);
    PL.ui.section(L.controls, "浸入量測");
    const sRho = PL.ui.slider(L.controls, { label: "物體密度 ρ物", min: 1200, max: 8000, step: 100, value: 2700, unit: "kg/m³", digits: 0, onInput: draw });
    const sVol = PL.ui.slider(L.controls, { label: "物體體積 V", min: 100, max: 800, step: 25, value: 300, unit: "cm³", digits: 0, onInput: draw });
    const sSub = PL.ui.slider(L.controls, { label: "浸入比例", min: 0, max: 100, step: 5, value: 0, unit: "%", digits: 0, onInput: draw });
    const sFluid = PL.ui.select(L.controls, { label: "液體", value: "1000", options: [{ value: "1000", label: "水（1000 kg/m³）" }, { value: "800", label: "酒精（800 kg/m³）" }, { value: "1260", label: "鹽水（1260 kg/m³）" }], onChange: draw });
    PL.ui.note(L.controls, "先讀取空氣中的示數，再逐漸浸入液體；兩次彈簧秤示數之差就是浮力。");
    const rW = PL.ui.readout(L.readouts, { label: "空氣中重量 W", unit: "N" });
    const rT = PL.ui.readout(L.readouts, { label: "彈簧秤示數 T", unit: "N" });
    const rFb = PL.ui.readout(L.readouts, { label: "示數差／浮力 F_b", unit: "N" });
    const rVd = PL.ui.readout(L.readouts, { label: "排開液體體積", unit: "cm³" });
    const chart = PL.ui.chart(PL.ui.charts(root), { title: "彈簧秤示數與浸入比例", cap: "物體尚未完全浸沒時，排水量增加，浮力增加，彈簧秤示數線性下降；完全浸沒後示數維持不變。" });
    function data() {
      const rho = sRho.get(), volCm = sVol.get(), frac = sSub.get() / 100, rhoL = Number(sFluid.get()), vol = volCm * 1e-6;
      const W = rho * vol * 9.8, Fb = rhoL * vol * frac * 9.8;
      return { rho, volCm, frac, rhoL, W, Fb: Math.min(Fb, W), T: Math.max(0, W - Fb) };
    }
    function drawScale(x, y, tension) {
      const { ctx } = cv;
      D.rect(ctx, x - 28, y - 42, 56, 84, { fill: PL.col("panel-2"), stroke: PL.col("border"), width: 2, r: 5 });
      D.ring(ctx, x, y - 7, 20, MC(), 2);
      const a = Math.PI * (1.1 + 0.8 * PL.clamp(tension / 20, 0, 1));
      D.line(ctx, x, y - 7, x + Math.cos(a) * 16, y - 7 + Math.sin(a) * 16, PL.col("warn"), 2);
      D.text(ctx, "彈簧秤", x, y - 29, { color: PL.col("text-dim"), size: 10, align: "center" });
      D.text(ctx, PL.fmt(tension, 2) + " N", x, y + 34, { color: MC(), size: 11, align: "center", weight: "700" });
    }
    function draw() {
      const { ctx, W, H } = cv, s = data(); cv.clear(); D.bg(cv);
      const tankL = W * 0.45, tankR = W - 36, surface = H * 0.31, floor = H - 28;
      D.rect(ctx, tankL, surface, tankR - tankL, floor - surface, { fill: "rgba(90,162,255,0.15)", stroke: "rgba(90,162,255,0.45)", width: 1.5 });
      D.line(ctx, tankL, surface, tankR, surface, PL.col("accent-2"), 2);
      D.text(ctx, s.rhoL + " kg/m³", tankL + 12, surface + 19, { color: PL.col("accent-2"), size: 11 });
      const sx = W * 0.22, sy = H * 0.25, boxW = 72, boxH = 56;
      drawScale(sx, sy, s.T);
      const top = surface - boxH * (1 - s.frac), cx = W * 0.7;
      D.line(ctx, sx, sy + 42, cx, top - 4, PL.col("text-faint"), 1.4);
      D.rect(ctx, cx - boxW / 2, top, boxW, boxH, { fill: MC(), stroke: "rgba(255,255,255,0.45)", width: 1.4, r: 5 });
      D.text(ctx, "金屬塊", cx, top + 33, { color: "#fff", size: 11, align: "center", weight: "700" });
      const mid = top + boxH / 2;
      D.arrow(ctx, cx - 32, mid, cx - 32, mid + 42, { color: PL.col("warn"), width: 2.2, label: "W" });
      D.arrow(ctx, cx + 32, mid, cx + 32, mid - 42 * (s.Fb / Math.max(s.W, 0.01)), { color: PL.col("accent-2"), width: 2.2, label: "F_b" });
      D.arrow(ctx, cx, top, cx, top - 34 * (s.T / Math.max(s.W, 0.01)), { color: MC(), width: 2, label: "T" });
      D.text(ctx, "浸入 " + PL.fmt(s.frac * 100, 0) + "%", cx, floor - 9, { color: PL.col("text-dim"), size: 11, align: "center" });
      rW.set(s.W, 2); rT.set(s.T, 2); rFb.set(s.Fb, 2); rVd.set(s.volCm * s.frac, 0);
      chart.clear();
      const g = PL.graph(chart, { x: 42, y: 16, w: chart.W - 58, h: chart.H - 40 }, { x0: 0, x1: 100, y0: 0, y1: Math.max(1, s.W * 1.15) });
      g.frame({ xlabel: "浸入比例 (%)", ylabel: "T (N)" }); g.grid(5, 4);
      g.fn(p => Math.max(0, s.W - s.rhoL * s.volCm * 1e-6 * 9.8 * p / 100), { color: MC(), width: 2.1 });
      g.dot(s.frac * 100, s.T, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
    }
    cv.onResize(draw); chart.onResize(draw); draw();
    return { stop() { cv.destroy(); chart.destroy(); }, rerender: draw };
  }});

  /* 白努利原理 */
  PL.register("bernoulli", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6);
    const rho = 1000; let parts = [];
    const sV = PL.ui.slider(L.controls, { label: "入口流速 v₁", min: 1, max: 6, step: 0.5, value: 3, unit: "m/s", digits: 1 });
    const sN = PL.ui.slider(L.controls, { label: "窄管收縮比", min: 1.5, max: 4, step: 0.1, value: 2.5, unit: "×", digits: 1 });
    const rV2 = PL.ui.readout(L.readouts, { label: "窄管流速 v₂", unit: "m/s" });
    const rDp = PL.ui.readout(L.readouts, { label: "壓力差 P₁−P₂", unit: "Pa" });
    function shape(x, W) { const wide = 46, t = x / W; // 中段收縮
      const narrow = wide / sN.get();
      const c = 0.5, band = 0.16;
      let f = 1; if (t > c - band && t < c + band) { const u = (t - (c - band)) / (2 * band); f = 1 - (1 - narrow / wide) * Math.sin(Math.PI * u); }
      return wide * f;
    }
    for (let i = 0; i < 70; i++) parts.push({ x: Math.random(), y: Math.random() * 2 - 1 });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const midY = H * 0.42, x0 = 30, x1 = W - 30, PW = x1 - x0;
      ctx.save(); ctx.strokeStyle = PL.col("text-faint"); ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const x = x0 + PW * i / 100, h = shape(PW * i / 100, PW); i ? ctx.lineTo(x, midY - h) : ctx.moveTo(x, midY - h); } ctx.stroke();
      ctx.beginPath(); for (let i = 0; i <= 100; i++) { const x = x0 + PW * i / 100, h = shape(PW * i / 100, PW); i ? ctx.lineTo(x, midY + h) : ctx.moveTo(x, midY + h); } ctx.stroke(); ctx.restore();
      // 粒子
      const v1 = sV.get(), A1 = 46;
      parts.forEach(p => {
        const h = shape(p.x * PW, PW), v = v1 * A1 / h;
        D.disc(ctx, x0 + p.x * PW, midY + p.y * (h - 6), 2.2, { fill: MC() });
      });
      // 壓力管（越窄壓力越低）
      const gauge = (t, label) => { const x = x0 + PW * t, h = shape(PW * t, PW), v = v1 * A1 / h; const P = 0.5 * rho * (v1 * v1 - v * v); const col = "rgba(90,162,255,0.5)"; const gh = 50 - P / 40; D.rect(ctx, x - 6, midY - h - Math.max(8, gh), 12, Math.max(8, gh), { fill: col }); D.text(ctx, label, x, midY - h - Math.max(8, gh) - 6, { color: PL.col("text-dim"), size: 10, align: "center" }); };
      gauge(0.12, "P₁ 高"); gauge(0.5, "P₂ 低"); gauge(0.88, "P₃");
      const v2 = v1 * A1 / shape(PW * 0.5, PW);
      rV2.set(v2, 2); rDp.set(0.5 * rho * (v2 * v2 - v1 * v1), 0);
    }
    const anim = PL.loop(dt => { if (dt) { const v1 = sV.get(); parts.forEach(p => { const PW = cv.W - 60; const h = shape(p.x * PW, PW); p.x += (v1 * 46 / h) * dt * 0.08; if (p.x > 1) { p.x = 0; p.y = Math.random() * 2 - 1; } }); } draw(); });
    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 理想氣體與分子動能論 */
  /* 理想氣體與分子動能論 —— 旗艦改版
   *
   * 課本說「壓力來自分子碰撞器壁」，但學生看到的通常只是 PV = nRT 這條公式。
   * 這一版讓壓力真的「被撞出來」：
   *
   *   · 畫面裡是真的在運動與碰撞的分子，壓力由實際撞擊器壁的動量變化統計而來，
   *     不是用公式算出來再顯示
   *   · 推動活塞改變體積，壓力跟著變，PV 乘積維持不變（等溫）
   *   · 升溫時分子明顯變快，速率分布往右移，並自己長成馬克士威分布
   *
   * 依 PhET 的原則，把活塞推到極端會有合理反應：體積被壓到很小時，
   * 壓力急遽上升並顯示警示。
   */
  PL.register("gas", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.6, 840);

    const BOX_W = 1.0, BOX_H = 0.62;      // 容器的模型尺寸（無單位，僅作幾何用）
    let particles = [];
    let pistonX = 0.78;                    // 活塞位置（0～1，佔容器寬的比例）
    let impulseAcc = 0, sampleTime = 0, pressure = 0;
    let speedHist = new Array(28).fill(0);

    PL.ui.section(L.controls, "氣體狀態");
    const sN = PL.ui.slider(L.controls, { label: "分子數 N", min: 20, max: 240, step: 10, value: 90, unit: "顆", digits: 0, onInput: rebuild });
    const sT = PL.ui.slider(L.controls, { label: "溫度 T", min: 100, max: 900, step: 25, value: 300, unit: "K", digits: 0, onInput: retemp });
    /* 活塞位置原本只在 stepPhysics 裡讀取，暫停時推活塞畫面完全不動——
       而「把體積壓小」正是波以耳定律要學生親手做的那個動作。 */
    const sPiston = PL.ui.slider(L.controls, { label: "活塞位置（體積）", min: 0.25, max: 0.98, step: 0.01, value: 0.78, unit: "", digits: 2,
      onInput: v => { pistonX = v; } });

    PL.ui.section(L.controls, "顯示");
    const layers = PL.ui.chipGroup(L.controls, {
      multi: true, value: ["trails", "hist"],
      options: [
        { value: "trails", label: "碰撞閃光" },
        { value: "hist", label: "速率分布" }
      ]
    });

    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "重新灑點", rebuild, { primary: true });

    PL.ui.note(L.controls,
      "壓力讀數不是用 PV=nRT 算出來的，而是統計分子真的撞在右側活塞上的動量變化。" +
      "固定溫度、慢慢把活塞往左推：體積變小、壓力變大，但 P×V 幾乎不變（波以耳定律）。" +
      "接著把溫度從 100 K 拉到 900 K，看分子變快、速率分布整個往右移。");

    const rP = PL.ui.readout(L.readouts, { label: "壓力（量測）", unit: "" });
    const rV = PL.ui.readout(L.readouts, { label: "體積 V", unit: "" });
    const rPV = PL.ui.readout(L.readouts, { label: "P × V", unit: "" });
    const rVrms = PL.ui.readout(L.readouts, { label: "方均根速率", unit: "" });
    const rKE = PL.ui.readout(L.readouts, { label: "平均動能", unit: "" });

    const cc = PL.ui.chart(PL.ui.charts(root), {
      title: "分子速率分布",
      cap: "長條是實際統計到的分子速率，曲線是理論的馬克士威分布。溫度越高整條分布往右移、也變得更寬。"
    });

    /* 由溫度決定的特徵速率；係數只是為了讓畫面上的速度好看 */
    const speedScale = () => Math.sqrt(sT.get() / 300) * 0.42;

    function rebuild() {
      const n = sN.get();
      particles = [];
      for (let i = 0; i < n; i += 1) {
        const sp = speedScale() * (0.5 + Math.random() * 1.1);
        const a = Math.random() * TAU;
        particles.push({
          x: Math.random() * pistonX * BOX_W * 0.94 + 0.02,
          y: Math.random() * BOX_H * 0.94 + 0.02,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          flash: 0
        });
      }
      impulseAcc = 0; sampleTime = 0; pressure = 0;
    }

    /* 改溫度時不重灑，而是等比例縮放速度——這樣看得出「同一群分子變快了」 */
    function retemp() {
      const target = speedScale();
      const current = Math.sqrt(particles.reduce((s, p) => s + p.vx * p.vx + p.vy * p.vy, 0) /
        Math.max(1, particles.length)) || 1e-6;
      const k = target * 1.15 / current;
      particles.forEach(p => { p.vx *= k; p.vy *= k; });
      impulseAcc = 0; sampleTime = 0;
    }
    rebuild();

    function stepPhysics(dt) {
      pistonX = sPiston.get();
      const right = pistonX * BOX_W;
      const sub = 2, h = dt / sub;
      for (let k = 0; k < sub; k += 1) {
        particles.forEach(p => {
          p.x += p.vx * h; p.y += p.vy * h;
          if (p.flash > 0) p.flash -= h * 4;

          if (p.x < 0) { p.x = -p.x; p.vx = -p.vx; }
          if (p.y < 0) { p.y = -p.y; p.vy = -p.vy; }
          if (p.y > BOX_H) { p.y = 2 * BOX_H - p.y; p.vy = -p.vy; }
          if (p.x > right) {
            p.x = 2 * right - p.x;
            p.vx = -p.vx;
            /*
             * 壓力就在這裡產生：每一次撞擊活塞，動量改變 2m|vx|。
             * 把一段時間內的總動量變化除以（時間 × 受力面積），就是壓力。
             * 這是「壓力來自碰撞」的字面實作，不是套公式。
             */
            impulseAcc += 2 * Math.abs(p.vx);
            p.flash = 1;
          }
        });
      }
      /*
       * 壓力要取平均，不能只看最近一次的取樣窗。
       * 200 顆分子在 0.25 秒內大約只撞到活塞 25 次，單一窗口的
       * 卜瓦松雜訊可以讓讀數在 12 到 100 之間亂跳，波以耳定律
       * 完全看不出來。實際的壓力計也是在做時間平均。
       */
      sampleTime += dt;
      if (sampleTime >= 0.5) {
        const instant = impulseAcc / (sampleTime * BOX_H);
        pressure = pressure > 0 ? pressure * 0.7 + instant * 0.3 : instant;
        impulseAcc = 0; sampleTime = 0;
      }
    }

    function stats() {
      const n = Math.max(1, particles.length);
      const sumSq = particles.reduce((s, p) => s + p.vx * p.vx + p.vy * p.vy, 0);
      const vrms = Math.sqrt(sumSq / n);
      return { vrms, ke: 0.5 * sumSq / n, volume: pistonX * BOX_H };
    }

    function scene() {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const m = MC();
      const pad = 42;
      const boxW = W - pad * 2 - 90, boxH = H - pad * 2 - 26;
      const ox = pad, oy = pad;
      const px = xm => ox + xm / BOX_W * boxW;
      const py = ym => oy + ym / BOX_H * boxH;

      // 容器
      D.rect(ctx, ox, oy, boxW, boxH, { fill: PL.theme.shade(0.28), stroke: PL.theme.pale(0.35), width: 2 });

      // 活塞
      const pistonPx = px(pistonX * BOX_W);
      D.rect(ctx, pistonPx, oy, 14, boxH, { fill: "#8d97a6", stroke: PL.theme.pale(0.45), width: 1.5 });
      D.rect(ctx, pistonPx + 14, oy + boxH / 2 - 5, W - pad - (pistonPx + 14), 10,
        { fill: PL.theme.pale(0.28), r: 3 });
      D.text(ctx, "活塞", pistonPx + 7, oy - 10, { color: PL.col("text-dim"), size: 10.5, align: "center" });

      // 分子
      particles.forEach(p => {
        const X = px(p.x), Y = py(p.y);
        if (layers.has("trails") && p.flash > 0) {
          ctx.save(); ctx.globalAlpha = p.flash * 0.6;
          D.disc(ctx, pistonPx, Y, 7, { fill: PL.col("warn") });
          ctx.restore();
        }
        D.disc(ctx, X, Y, 3, { fill: m });
      });

      // 溫度計式的側邊指示
      const s = stats();
      const barX = W - 62;
      D.text(ctx, sT.get() + " K", barX + 16, oy + 12, { color: PL.col("danger"), size: 12, align: "center", weight: "700" });
      const warm = Math.min(1, (sT.get() - 100) / 800);
      D.rect(ctx, barX + 8, oy + 22, 16, boxH - 30, { fill: PL.theme.pale(0.12), r: 8 });
      D.rect(ctx, barX + 10, oy + 22 + (boxH - 34) * (1 - warm), 12, (boxH - 34) * warm,
        { fill: PL.col("danger"), r: 6 });

      // 壓力過高的警示：把活塞推到極端時該有的反應
      const volume = pistonX;
      if (volume < 0.32) {
        D.text(ctx, "體積接近極限，壓力急遽上升", W / 2, oy + boxH + 18,
          { color: PL.col("danger"), size: 12, align: "center", weight: "700" });
      }

      rP.set(pressure, 3);
      rV.set(s.volume, 3);
      rPV.set(pressure * s.volume, 3);
      rVrms.set(s.vrms, 3);
      rKE.set(s.ke, 4);

      PL.ui.caption(cv,
        "壓力讀數由分子實際撞擊活塞的動量變化統計而來——把活塞往左推，撞擊變頻繁，壓力就上升。");
    }

    function chart() {
      cc.clear();
      // 統計速率直方圖
      speedHist.fill(0);
      const vmax = Math.max(0.3, speedScale() * 3.2);
      particles.forEach(p => {
        const sp = Math.hypot(p.vx, p.vy);
        const i = Math.floor(sp / vmax * speedHist.length);
        if (i >= 0 && i < speedHist.length) speedHist[i] += 1;
      });
      const maxN = Math.max(1, ...speedHist);
      const gph = PL.graph(cc, { x: 46, y: 14, w: cc.W - 60, h: cc.H - 36 },
        { x0: 0, x1: vmax, y0: 0, y1: 1.18 });
      gph.frame({ xlabel: "速率", ylabel: "相對數量" });
      gph.grid(5, 4);
      speedHist.forEach((n, i) => {
        if (!n) return;
        const a = vmax * i / speedHist.length, b = vmax * (i + 1) / speedHist.length;
        const x0 = gph.X(a), x1 = gph.X(b), h = n / maxN;
        D.rect(cc.ctx, x0, gph.Y(h), Math.max(1, x1 - x0 - 1), gph.Y(0) - gph.Y(h),
          { fill: "rgba(150,190,230,0.38)" });
      });
      /* 二維的馬克士威分布：f(v) ∝ v·exp(−v²/2σ²) */
      const sigma = speedScale() * 0.82;
      const peak = sigma * Math.exp(-0.5);
      gph.fn(v => (v * Math.exp(-v * v / (2 * sigma * sigma))) / (peak || 1), { color: MC(), width: 2.2, samples: 200 });
    }

    function drawAll() { scene(); chart(); }

    const anim = PL.loop(dt => {
      if (dt) stepPhysics(Math.min(dt, 0.05));
      drawAll();
    }, 50);

    cv.onResize(scene); cc.onResize(chart);
    drawAll(); anim.start();
    return {
      stop() { anim.stop(); cv.destroy(); cc.destroy(); },
      rerender: drawAll
    };
  }});

  /* 氣體定律（波以耳 / 查理） */
  PL.register("gas-laws", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.66);
    const sProc = PL.ui.select(L.controls, { label: "過程", value: "iso", options: [{ value: "iso", label: "等溫（波以耳）" }, { value: "isobar", label: "等壓（查理）" }], onChange: draw });
    const sDrive = PL.ui.slider(L.controls, { label: "調整", min: 0.4, max: 1.6, step: 0.02, value: 1, unit: "×", digits: 2, onInput: draw });
    const rP = PL.ui.readout(L.readouts, { label: "壓力 P", unit: "kPa" });
    const rV = PL.ui.readout(L.readouts, { label: "體積 V", unit: "L" });
    const rT = PL.ui.readout(L.readouts, { label: "溫度 T", unit: "K" });
    function state() {
      const d = sDrive.get();
      if (sProc.get() === "iso") { const V = 2 * d, T = 300, P = 300 * 2 / V; return { V, T, P }; }
      const T = 300 * d, V = 2 * d, P = 300; return { V, T, P };
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const s = state();
      // 汽缸
      const cylX = 40, cylW = 80, cylTop = 30, cylBot = H - 30, fullH = cylBot - cylTop;
      const gasH = fullH * PL.clamp(s.V / 3.2, 0.1, 1);
      D.rect(ctx, cylX, cylTop, cylW, fullH, { stroke: PL.col("text-faint"), width: 2, r: 3 });
      D.rect(ctx, cylX, cylBot - gasH, cylW, gasH, { fill: "rgba(229,115,115,0.2)" });
      D.rect(ctx, cylX - 4, cylBot - gasH - 10, cylW + 8, 10, { fill: PL.col("text-faint"), r: 2 }); // 活塞
      D.text(ctx, "氣體", cylX + cylW / 2, cylBot - gasH / 2, { color: MC(), size: 12, align: "center" });
      // P–V 圖
      const bx = cylX + cylW + 40, by = 40, bw = W - bx - 20, bh = H - 70;
      const g = PL.graph(cv, { x: bx, y: by, w: bw, h: bh }, { x0: 0, x1: 3.4, y0: 0, y1: 700 });
      g.frame({ title: "P – V 圖", xlabel: "V (L)", ylabel: "P (kPa)" }); g.grid(4, 4);
      if (sProc.get() === "iso") g.fn(V => 300 * 2 / V, { color: MC(), width: 2.2, samples: 120 });
      else g.curve([[0.8, 300], [3.2, 300]], { color: MC(), width: 2.2 });
      g.dot(s.V, s.P, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
      rP.set(s.P, 0); rV.set(s.V, 2); rT.set(s.T, 0);
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 熱平衡與比熱 */
  PL.register("heat", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let T1, T2, running = false;
    const s1 = PL.ui.slider(L.controls, { label: "物體1 溫度", min: 0, max: 100, step: 1, value: 80, unit: "°C", digits: 0, onInput: reset });
    const sm1 = PL.ui.slider(L.controls, { label: "物體1 質量", min: 0.5, max: 4, step: 0.5, value: 2, unit: "kg", digits: 1, onInput: reset });
    const s2 = PL.ui.slider(L.controls, { label: "物體2 溫度", min: 0, max: 100, step: 1, value: 20, unit: "°C", digits: 0, onInput: reset });
    const sm2 = PL.ui.slider(L.controls, { label: "物體2 質量", min: 0.5, max: 4, step: 0.5, value: 1, unit: "kg", digits: 1, onInput: reset });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "接觸", () => { running = true; anim.start(); }, { primary: true });
    PL.ui.button(row, "重設", reset);
    const rTf = PL.ui.readout(L.readouts, { label: "熱平衡溫度", unit: "°C" });
    const rT1 = PL.ui.readout(L.readouts, { label: "物體1", unit: "°C" });
    const rT2 = PL.ui.readout(L.readouts, { label: "物體2", unit: "°C" });
    function reset() { T1 = s1.get(); T2 = s2.get(); running = false; }
    reset();
    const tcol = T => { const t = PL.clamp(T / 100, 0, 1); return `rgb(${Math.round(60 + 195 * t)},${Math.round(120 - 60 * t)},${Math.round(220 - 200 * t)})`; };
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const Tf = (sm1.get() * T1 + sm2.get() * T2) / (sm1.get() + sm2.get());
      const cy = H / 2, w1 = 60 + sm1.get() * 14, w2 = 60 + sm2.get() * 14;
      D.rect(ctx, W / 2 - w1 - 6, cy - 40, w1, 80, { fill: tcol(T1), stroke: "rgba(255,255,255,0.3)", r: 6 });
      D.rect(ctx, W / 2 + 6, cy - 40, w2, 80, { fill: tcol(T2), stroke: "rgba(255,255,255,0.3)", r: 6 });
      D.text(ctx, PL.fmt(T1, 0) + "°C", W / 2 - w1 / 2 - 6, cy + 4, { color: "#fff", size: 14, align: "center", weight: "700" });
      D.text(ctx, PL.fmt(T2, 0) + "°C", W / 2 + w2 / 2 + 6, cy + 4, { color: "#fff", size: 14, align: "center", weight: "700" });

      /*
       * 溫度原本只改變方塊的顏色。顏色沒有刻度，學生無法從畫面判讀溫度高低，
       * 更看不出「兩者往中間靠攏」的過程——量化檢查也證實這兩根滑桿
       * 對畫面的幾何完全沒有作用。
       *
       * 補上兩支溫度計：水銀柱高度正比於溫度，並畫出混合後的終溫虛線。
       * 終溫偏向質量大的那一邊，是這個實驗真正要教的事，
       * 現在用兩支柱子與一條虛線就看得出來。
       */
      const thX = 46, thW = 22, thTop = cy - 92, thH = 168;
      const tempY = T => thTop + thH * (1 - PL.clamp(T, 0, 100) / 100);
      [[thX, T1, "物體1", MC()], [W - thX - thW, T2, "物體2", PL.col("accent-2")]].forEach(([x, T, lab, c]) => {
        D.rect(ctx, x, thTop, thW, thH, { fill: PL.theme.shade(0.35), stroke: PL.theme.pale(0.25), r: 11 });
        D.rect(ctx, x + 3, tempY(T), thW - 6, thTop + thH - tempY(T) - 3,
          { fill: tcol(T), r: 8 });
        for (let v = 0; v <= 100; v += 20) {
          D.line(ctx, x + thW, tempY(v), x + thW + 5, tempY(v), PL.col("text-faint"), 1);
          D.text(ctx, String(v), x + thW + 8, tempY(v) + 3, { color: PL.col("text-faint"), size: 8 });
        }
        D.text(ctx, lab, x + thW / 2, thTop - 8, { color: c, size: 10, align: "center", weight: "700" });
      });
      // 終溫：兩支溫度計最後都會停在這條線上
      D.line(ctx, thX, tempY(Tf), W - thX, tempY(Tf), PL.col("warn"), 1.4, [6, 5]);
      D.text(ctx, "終溫 " + PL.fmt(Tf, 1) + " °C", W / 2, tempY(Tf) - 7,
        { color: PL.col("warn"), size: 10.5, align: "center", weight: "700" });

      D.text(ctx, "熱量由高溫流向低溫 →", W / 2, cy - 56, { color: PL.col("text-dim"), size: 11, align: "center" });
      PL.ui.caption(cv, "終溫那條虛線不會落在正中間，而是偏向質量大的那一邊。" +
        "把兩個質量調成一樣，虛線才會剛好落在兩個溫度的中點。");
      rTf.set(Tf, 1); rT1.set(T1, 1); rT2.set(T2, 1);
    }
    const anim = PL.loop(dt => {
      if (dt && running) { const Tf = (sm1.get() * T1 + sm2.get() * T2) / (sm1.get() + sm2.get()); const r = 1 - Math.exp(-dt * 1.5); T1 += (Tf - T1) * r; T2 += (Tf - T2) * r; if (Math.abs(T1 - T2) < 0.1) running = false; }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 熱力學第一定律 */
  PL.register("thermo1", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    const sQ = PL.ui.slider(L.controls, { label: "吸收熱量 Q", min: -50, max: 100, step: 5, value: 60, unit: "J", digits: 0, onInput: draw });
    const sW = PL.ui.slider(L.controls, { label: "對外作功 W", min: -50, max: 100, step: 5, value: 40, unit: "J", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "ΔU = Q − W。等溫 ΔU=0；等容 W=0（ΔU=Q）；絕熱 Q=0（ΔU=−W）。");
    const rU = PL.ui.readout(L.readouts, { label: "內能變化 ΔU", unit: "J" });
    const rTrend = PL.ui.readout(L.readouts, { label: "溫度趨勢" });
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const Q = sQ.get(), Wk = sW.get(), dU = Q - Wk;
      // 汽缸示意
      const cylX = 34, cylW = 78, cylBot = H - 30, gasH = 90 + Wk * 0.4;
      D.rect(ctx, cylX, cylBot - gasH, cylW, gasH, { fill: "rgba(229,115,115,0.16)", stroke: PL.col("text-faint"), width: 2 });
      D.rect(ctx, cylX - 4, cylBot - gasH - 10, cylW + 8, 10, { fill: PL.col("text-faint"), r: 2 });
      if (Q !== 0) D.arrow(ctx, cylX + cylW / 2, cylBot + 16, cylX + cylW / 2, cylBot - 6, { color: PL.col("danger"), width: 2, label: Q > 0 ? "Q 入" : "Q 出" });
      // 能量條
      const bx = cylX + cylW + 46, bw = W - bx - 24; let y = 46;
      const bar = (lab, val, c) => { D.text(ctx, lab, bx, y - 4, { color: PL.col("text-dim"), size: 12 }); D.rect(ctx, bx + 40, y - 14, bw - 40, 16, { fill: "rgba(255,255,255,0.05)", r: 4 }); const mid = (bw - 40) / 2; D.rect(ctx, bx + 40 + mid, y - 14, mid * PL.clamp(val / 100, -1, 1), 16, { fill: c, r: 2 }); D.text(ctx, PL.fmt(val, 0) + " J", bx + bw + 4, y, { color: c, size: 11, align: "right" }); y += 40; };
      D.text(ctx, "ΔU = Q − W", bx, 24, { color: PL.col("text-dim"), size: 12 });
      bar("Q", Q, PL.col("danger")); bar("W", Wk, PL.col("accent-2")); bar("ΔU", dU, MC());
      rU.set(dU, 0); rTrend.set(dU > 0 ? "升溫" : dU < 0 ? "降溫" : "不變");
    }
    cv.onResize(draw); draw();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});
})();
