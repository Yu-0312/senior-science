/* 模組七 · 流體與熱學 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const MC = () => PL.col("m-color", "#e57373");

  /* 浮力與阿基米德原理 */
  PL.register("buoyancy", { build(root) {
    const L = PL.ui.layout(root, { chrome: "quiet" });
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
      const AP = PL.apparatus;
      const surf = 96, tankL = Math.round(W * 0.21), tankR = Math.round(W * 0.79), bottom = H - 30;
      // 玻璃水槽：水面、杯壁與刻度都畫出來，「沒入多少」才量得出來
      AP.benchTop(ctx, W, H, bottom - 2);
      AP.beaker(ctx, (tankL + tankR) / 2, bottom, tankR - tankL, bottom - surf + 26,
        (bottom - surf) / (bottom - surf + 26));
      const boxW = 84, boxH = 64, cx = W / 2;
      const sub = floats ? ratio : 1;
      let topY = floats ? surf - boxH * (1 - sub) + bob : surf - 0 + bob;
      if (!floats) topY = bottom - boxH; // 沉底
      AP.woodBlock(ctx, cx, topY + boxH, boxW, boxH, 0);
      D.text(ctx, ro + "", cx, topY + boxH / 2 + 4, { color: "#2b1f10", size: 12, align: "center", weight: "700" });
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
    const L = PL.ui.layout(root, { chrome: "quiet" });
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
      PL.apparatus.meter(ctx, x, y - 14, 24, PL.clamp(tension / 20, 0, 1), null);
      D.text(ctx, "彈簧秤", x, y - 46, { color: PL.col("text-dim"), size: 10, align: "center" });
      D.text(ctx, PL.fmt(tension, 2) + " N", x, y + 34, { color: MC(), size: 11, align: "center", weight: "700" });
    }
    function draw() {
      const { ctx, W, H } = cv, s = data(); cv.clear(); D.bg(cv);
      const AP = PL.apparatus;
      /* 矮畫面時整組縮小、水面往下移，彈簧秤才掛得在鐵架橫桿底下 */
      const k = PL.clamp(H / 400, 0.6, 1), boxW = 72 * k, boxH = 56 * k;
      const tankL = W * 0.45, tankR = W - 36, surface = Math.max(H * 0.5, 113 + boxH), floor = H - 28;
      AP.benchTop(ctx, W, H, floor - 2);
      AP.beaker(ctx, (tankL + tankR) / 2, floor, tankR - tankL, floor - surface + 26,
        (floor - surface) / (floor - surface + 26));
      D.text(ctx, s.rhoL + " kg/m³", tankL + 12, surface + 19, { color: PL.col("accent-2"), size: 11 });
      const top = surface - boxH * (1 - s.frac), cx = (tankL + tankR) / 2;
      /* 鐵架吊著彈簧秤，彈簧秤下掛金屬塊：浸得越深，整組跟著放低 */
      const len = PL.clamp(surface - boxH - 83, 30, Math.max(60, H * 0.16)), scaleTop = top - 18 - 21 - len;
      AP.standRod(ctx, tankL - 40, floor, 14);
      AP.crossArm(ctx, tankL - 40, 24, cx);
      AP.cord(ctx, cx, 33, cx, scaleTop - 11);
      const hook = AP.springScaleV(ctx, cx, scaleTop, len, PL.clamp(s.T / 20, 0, 1), PL.fmt(s.T, 2) + " N");
      AP.cord(ctx, cx, hook.y, cx, top);
      AP.massBlock(ctx, cx, top + boxH, boxW, boxH, { color: "#8d97a6", label: "金屬塊", noShadow: true });
      const mid = top + boxH / 2;
      D.arrow(ctx, cx - boxW * 0.44, mid, cx - boxW * 0.44, mid + 42, { color: PL.col("warn"), width: 2.2, label: "W" });
      D.arrow(ctx, cx + boxW * 0.44, mid, cx + boxW * 0.44, mid - 42 * (s.Fb / Math.max(s.W, 0.01)), { color: PL.col("accent-2"), width: 2.2, label: "F_b" });
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
    const L = PL.ui.layout(root, { chrome: "quiet" });
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
      const midY = H * 0.5, x0 = 30, x1 = W - 30, PW = x1 - x0;
      const AP = PL.apparatus;
      /* 文氏管：透明玻璃管裡流著水，上面接三支壓力計玻璃管 */
      AP.benchTop(ctx, W, H, H - 24);
      [0.12, 0.88].forEach(t => { AP.steel(ctx, x0 + PW * t - 4, midY + 46, 8, H - 24 - midY - 46, 8); AP.steel(ctx, x0 + PW * t - 18, H - 30, 36, 7, -6); });
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) { const x = x0 + PW * i / 100, h = shape(PW * i / 100, PW); i ? ctx.lineTo(x, midY - h) : ctx.moveTo(x, midY - h); }
      for (let i = 100; i >= 0; i--) { const x = x0 + PW * i / 100, h = shape(PW * i / 100, PW); ctx.lineTo(x, midY + h); }
      ctx.closePath();
      const wg = ctx.createLinearGradient(0, midY - 46, 0, midY + 46);
      wg.addColorStop(0, "rgba(120,196,230,0.55)"); wg.addColorStop(0.5, "rgba(80,160,210,0.45)"); wg.addColorStop(1, "rgba(60,130,190,0.6)");
      ctx.fillStyle = wg; ctx.fill();
      ctx.strokeStyle = PL.theme.isLight() ? "rgba(70,110,140,0.85)" : "rgba(200,230,245,0.85)"; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.restore();
      PL.theme.note(ctx, "#4f93c4", x0, midY - 46, PW, 92);
      // 粒子
      const v1 = sV.get(), A1 = 46;
      parts.forEach(p => {
        const h = shape(p.x * PW, PW), v = v1 * A1 / h;
        D.disc(ctx, x0 + p.x * PW, midY + p.y * (h - 6), 2.2, { fill: "rgba(235,248,255,0.9)" });
      });
      // 壓力管（越窄壓力越低）
      const gauge = (t, label) => {
        const x = x0 + PW * t, h = shape(PW * t, PW), v = v1 * A1 / h; const P = 0.5 * rho * (v1 * v1 - v * v);
        const gh = Math.max(8, 50 - P / 40), tubeTop = Math.max(26, midY - 170);
        AP.glassTube(ctx, x, tubeTop, midY - h + 2, 12, midY - h - gh);
        D.text(ctx, label, x, tubeTop - 8, { color: PL.col("text-dim"), size: 10, align: "center", weight: "700" });
      };
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
    const L = PL.ui.layout(root, { chrome: "quiet" });
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

      const AP = PL.apparatus;
      AP.labRoom(ctx, W, H, oy + boxH + 36, { bench: "wood" });
      // 汽缸架在支腳上，底下的電熱板溫度越高越紅
      [ox + 20, ox + boxW - 30].forEach(lx => AP.steel(ctx, lx, oy + boxH, 8, 36, 8));
      AP.hotPlate(ctx, ox + boxW * 0.45, oy + boxH + 36, 120, (sT.get() - 100) / 800);
      // 容器：厚壁玻璃汽缸，看得出來是一個「裝著氣體的東西」
      D.rect(ctx, ox, oy, boxW, boxH, { fill: PL.theme.shade(0.28), stroke: PL.theme.pale(0.35), width: 2 });
      ctx.save();
      const cg = ctx.createLinearGradient(0, oy, 0, oy + boxH);
      cg.addColorStop(0.00, "rgba(226,244,252,0.16)");
      cg.addColorStop(0.12, "rgba(255,255,255,0.07)");
      cg.addColorStop(1.00, "rgba(180,206,222,0.05)");
      ctx.fillStyle = cg; ctx.fillRect(ox, oy, boxW, boxH);
      ctx.strokeStyle = "rgba(206,232,244,0.55)"; ctx.lineWidth = 2;
      ctx.strokeRect(ox, oy, boxW, boxH);
      ctx.restore();

      // 活塞：金屬盤 + 推桿
      const pistonPx = px(pistonX * BOX_W);
      AP.steel(ctx, pistonPx, oy + 2, 15, boxH - 4, -10);
      ctx.strokeStyle = "rgba(28,34,44,0.6)"; ctx.lineWidth = 1;
      ctx.strokeRect(pistonPx + 0.5, oy + 2.5, 14, boxH - 5);
      AP.steel(ctx, pistonPx + 15, oy + boxH / 2 - 5, W - pad - (pistonPx + 15), 10, 8);
      // 推桿末端的握把
      AP.brassDisc(ctx, W - pad, oy + boxH / 2, 8);
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
      AP.thermometer(ctx, barX + 16, oy + 22, oy + boxH, 16, 0.08 + 0.9 * warm);

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
    const L = PL.ui.layout(root, { chrome: "quiet" });
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
      const AP = PL.apparatus;
      const cylX = 40, cylW = 80, cylTop = 70, cylBot = H - 56, fullH = cylBot - cylTop;
      const gasH = fullH * PL.clamp(s.V / 3.2, 0.1, 1);
      AP.benchTop(ctx, W, H, H - 30);
      /* 等溫：壓力靠活塞上的砝碼決定（砝碼越多壓力越大）；等壓：砝碼不變、底下加熱 */
      const iso = sProc.get() === "iso";
      AP.hotPlate(ctx, cylX + cylW / 2, H - 30, cylW + 30, iso ? 0 : (s.T - 120) / 360);
      const hue = PL.clamp((s.T - 120) / 360, 0, 1);
      AP.cylinderPiston(ctx, cylX, cylTop, cylW, fullH, cylBot - gasH, {
        gas: "rgb(" + Math.round(120 + 110 * hue) + "," + Math.round(150 - 60 * hue) + "," + Math.round(220 - 150 * hue) + ")",
        weights: Math.max(1, Math.round(s.P / 110)), rod: 16
      });
      D.text(ctx, "氣體", cylX + cylW / 2, cylBot - gasH / 2, { color: PL.col("text"), size: 12, align: "center", weight: "700" });
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
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    let T1, T2, running = false, tRun = 0;
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
    function reset() { T1 = s1.get(); T2 = s2.get(); running = false; tRun = 0; }
    reset();
    const tcol = T => { const t = PL.clamp(T / 100, 0, 1); return `rgb(${Math.round(60 + 195 * t)},${Math.round(120 - 60 * t)},${Math.round(220 - 200 * t)})`; };
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const m1 = sm1.get(), m2 = sm2.get(), Tf = (m1 * T1 + m2 * T2) / (m1 + m2);
      const AP = PL.apparatus;
      /* 左半：兩杯水靠在一起（中間夾一片銅板），溫度計插在水裡；右半：溫度–時間曲線 */
      const benchY = Math.round(H * 0.8), sceneW = W * 0.5, bh = Math.min(120, benchY * 0.42);
      AP.labRoom(ctx, W, H, benchY, {});
      const w1 = 56 + m1 * 13, w2 = 56 + m2 * 13, cx = sceneW * 0.54;
      const b1 = cx - 5 - w1 / 2, b2 = cx + 5 + w2 / 2, wt = benchY - bh * 0.84;
      ctx.fillStyle = tcol(T1); ctx.fillRect(b1 - w1 / 2 + 3, wt, w1 - 6, benchY - wt - 3);
      ctx.fillStyle = tcol(T2); ctx.fillRect(b2 - w2 / 2 + 3, wt, w2 - 6, benchY - wt - 3);
      AP.beaker(ctx, b1, benchY, w1, bh, 0.84);
      AP.beaker(ctx, b2, benchY, w2, bh, 0.84);
      AP.steel(ctx, cx - 4, benchY - bh * 0.9, 8, bh * 0.9 - 2, 30);           // 夾在兩杯之間的銅板
      ctx.fillStyle = "rgba(210,130,60,0.55)"; ctx.fillRect(cx - 4, benchY - bh * 0.9, 8, bh * 0.9 - 2);
      // 溫度計插在水裡
      AP.thermometer(ctx, b1 - w1 * 0.22, benchY - bh - 58, benchY - 16, 11, PL.clamp(T1, 0, 100) / 100);
      AP.thermometer(ctx, b2 + w2 * 0.22, benchY - bh - 58, benchY - 16, 11, PL.clamp(T2, 0, 100) / 100);
      D.text(ctx, PL.fmt(T1, 0) + "°C", b1 + w1 * 0.08, benchY - bh * 0.4, { color: "#fff", size: 14, align: "center", weight: "700" });
      D.text(ctx, PL.fmt(T2, 0) + "°C", b2 - w2 * 0.08, benchY - bh * 0.4, { color: "#fff", size: 14, align: "center", weight: "700" });
      D.text(ctx, "物體1 " + m1 + " kg", b1, benchY + 16, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
      D.text(ctx, "物體2 " + m2 + " kg", b2, benchY + 16, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
      // 接觸後熱量經銅板由高溫流向低溫（箭頭越粗，溫差越大）
      const dT = T1 - T2;
      if (running && Math.abs(dT) > 0.4) {
        const dir = dT > 0 ? 1 : -1, k = PL.clamp(Math.abs(dT) / 60, 0.2, 1);
        [0.35, 0.6].forEach(f => D.arrow(ctx, cx - dir * 18, benchY - bh * f, cx + dir * 18, benchY - bh * f, { color: PL.col("danger"), width: 1.5 + 2.5 * k, head: 7 }));
        D.text(ctx, "熱", cx, benchY - bh * 0.72, { color: PL.col("danger"), size: 11, align: "center", weight: "800" });
      }
      D.text(ctx, "熱量由高溫流向低溫", sceneW * 0.54, 24, { color: PL.col("text-dim"), size: 11, align: "center" });
      // 右半：溫度–時間（兩條線往終溫靠攏）
      const T10 = s1.get(), T20 = s2.get(), Tf0 = (m1 * T10 + m2 * T20) / (m1 + m2);
      const gx = W * 0.54, gy = 26, gw = W - gx - 18, gh = benchY - 44;
      const g = PL.graph(cv, { x: gx, y: gy, w: gw, h: gh }, { x0: 0, x1: 4, y0: 0, y1: 100 });
      g.frame({ title: "溫度–時間", xlabel: "t（示意）", ylabel: "T (°C)" }); g.grid(4, 5);
      g.hline(Tf0, { color: PL.col("warn"), dash: [6, 5], width: 1.4 });
      g.label(0.08, Tf0, "終溫 " + PL.fmt(Tf0, 1) + " °C", { color: PL.col("warn"), size: 10.5, dy: -6 });
      g.fn(t => Tf0 + (T10 - Tf0) * Math.exp(-1.5 * t), { color: "#e5484d", width: 2.2 });
      g.fn(t => Tf0 + (T20 - Tf0) * Math.exp(-1.5 * t), { color: "#3b82f6", width: 2.2 });
      if (tRun > 0) { const tt = Math.min(tRun, 4); g.vline(tt, { color: PL.col("text-faint"), dash: [3, 3], width: 1 }); g.dot(tt, T1, { color: "#e5484d" }); g.dot(tt, T2, { color: "#3b82f6" }); }
      PL.ui.caption(cv, "終溫那條虛線不會落在正中間，而是偏向質量大的那一邊。" +
        "把兩個質量調成一樣，虛線才會剛好落在兩個溫度的中點。");
      rTf.set(Tf, 1); rT1.set(T1, 1); rT2.set(T2, 1);
    }
    const anim = PL.loop(dt => {
      if (dt && running) { tRun += dt; const Tf = (sm1.get() * T1 + sm2.get() * T2) / (sm1.get() + sm2.get()); const r = 1 - Math.exp(-dt * 1.5); T1 += (Tf - T1) * r; T2 += (Tf - T2) * r; if (Math.abs(T1 - T2) < 0.1 || tRun > 4) running = false; }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /* 熱力學第一定律 */
  PL.register("thermo1", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.56);
    const sQ = PL.ui.slider(L.controls, { label: "吸收熱量 Q", min: -50, max: 100, step: 5, value: 60, unit: "J", digits: 0, onInput: draw });
    const sW = PL.ui.slider(L.controls, { label: "對外作功 W", min: -50, max: 100, step: 5, value: 40, unit: "J", digits: 0, onInput: draw });
    PL.ui.note(L.controls, "ΔU = Q − W。等溫 ΔU=0；等容 W=0（ΔU=Q）；絕熱 Q=0（ΔU=−W）。");
    const rU = PL.ui.readout(L.readouts, { label: "內能變化 ΔU", unit: "J" });
    const rTrend = PL.ui.readout(L.readouts, { label: "溫度趨勢" });
    let tt = 0;
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const Q = sQ.get(), Wk = sW.get(), dU = Q - Wk, T = 300 + dU * 1.2;
      /* 汽缸：活塞上壓著砝碼，氣體分子的跑動快慢跟著溫度（內能）走 */
      const AP = PL.apparatus;
      const benchY = H - 30, cylX = 50, cylW = 116, cylH = Math.min(230, H - 110), cylBot = benchY - 26, gasH = cylH * 0.45 + Wk * 0.5;
      AP.labRoom(ctx, W, H, benchY, {});
      // 吸熱時底下的電熱板發紅；放熱時換成一盆冰
      if (Q >= 0) AP.hotPlate(ctx, cylX + cylW / 2, benchY, cylW + 30, Q / 100);
      else {
        ctx.fillStyle = "rgba(170,215,240,0.9)"; ctx.fillRect(cylX - 12, benchY - 22, cylW + 24, 22);
        for (let i = 0; i < 7; i++) { ctx.fillStyle = "rgba(235,248,255,0.95)"; ctx.fillRect(cylX - 8 + i * 17, benchY - 26 + (i % 2) * 3, 13, 10); }
      }
      const hue = PL.clamp(0.5 + dU / 200, 0, 1);
      AP.cylinderPiston(ctx, cylX, cylBot - cylH, cylW, cylH, cylBot - gasH, {
        gas: "#" + [Math.round(120 + 110 * hue), Math.round(150 - 60 * hue), Math.round(220 - 150 * hue)].map(v => v.toString(16).padStart(2, "0")).join(""),
        rod: 18, weights: 2, particles: 34, t: tt * Math.sqrt(T / 300) * 1.6
      });
      // 溫度計貼在汽缸旁：溫度 ∝ 內能
      AP.thermometer(ctx, cylX + cylW + 22, cylBot - cylH + 10, cylBot - 4, 12, PL.clamp((T - 150) / 300, 0, 1));
      D.text(ctx, PL.fmt(T, 0) + " K", cylX + cylW + 22, cylBot - cylH, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
      if (Q !== 0) D.arrow(ctx, cylX + cylW / 2 - 30, benchY + 2, cylX + cylW / 2 - 30, cylBot - 30, { color: PL.col("danger"), width: 2.2, label: Q > 0 ? "Q 入" : "Q 出" });
      if (Wk !== 0) {
        const py = cylBot - gasH - 12 - 18 - 22, up = Wk > 0;
        D.arrow(ctx, cylX + 16, py + (up ? 0 : -36), cylX + 16, py + (up ? -36 : 0), { color: PL.col("accent-2"), width: 2.2, label: up ? "W（對外）" : "W（外界對氣體）" });
      }
      // 能量條
      const bx = cylX + cylW + 80, bw = W - bx - 24; let y = 46;
      AP.infoCard(ctx, bx - 12, 8, bw + 30, 150);
      const bar = (lab, val, c) => { D.text(ctx, lab, bx, y - 4, { color: PL.col("text-dim"), size: 12 }); D.rect(ctx, bx + 40, y - 14, bw - 40, 16, { fill: "rgba(255,255,255,0.05)", r: 4 }); const mid = (bw - 40) / 2; D.rect(ctx, bx + 40 + mid, y - 14, mid * PL.clamp(val / 100, -1, 1), 16, { fill: c, r: 2 }); D.text(ctx, PL.fmt(val, 0) + " J", bx + bw + 4, y, { color: c, size: 11, align: "right" }); y += 40; };
      D.text(ctx, "ΔU = Q − W", bx, 24, { color: PL.col("text-dim"), size: 12 });
      bar("Q", Q, PL.col("danger")); bar("W", Wk, PL.col("accent-2")); bar("ΔU", dU, MC());
      D.text(ctx, dU > 0 ? "內能增加 → 溫度升高，分子跑得更快" : dU < 0 ? "內能減少 → 溫度降低，分子跑得較慢" : "內能不變 → 溫度不變", bx, 186, { color: PL.col("text-dim"), size: 11 });
      const kind = Wk === 0 ? "等容過程：W = 0，吸的熱全部變成內能" : Q === 0 ? "絕熱過程：Q = 0，對外作功全靠內能" : dU === 0 ? "等溫過程：ΔU = 0，吸的熱全部拿去作功" : "";
      if (kind) AP.valueChip(ctx, bx, 200, kind, PL.col("warn"));
      rU.set(dU, 0); rTrend.set(dU > 0 ? "升溫" : dU < 0 ? "降溫" : "不變");
    }
    const anim = PL.loop(dt => { if (dt) tt += dt; draw(); });
    cv.onResize(draw); draw(); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});

  /*
   * 熱機原理：試管噴塞（國中經典演示，教學模型對齊公開國中實驗設計）
   *
   * 不是卡諾效率，而是「受熱氣體膨脹做功 → 內能變機械能」：
   *   酒精燈加熱 → 水汽化、管內壓力升高 → 壓力剛好克服塞子阻力 → 塞子射出
   *   → 氣體對外做功、內能下降 → 管口白霧（水蒸氣遇冷液化，不是蒸氣本身）
   * 台灣 108：國中自然「物質與能量／能源」內能與熱機簡介；
   * 高中必修能量守恆定性 → 選修熱力學 → 本站 heat-engine（效率與卡諾）。
   */
  PL.register("heat-engine-principle", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.72, 920);
    const AP = PL.apparatus;

    /* 0待加熱 1加熱 2壓力升高 3膨脹做功 4白霧消散 —— 一次性，不自動循環 */
    let stage = 0, U = 0, corkX = 0, corkV = 0, fog = 0, bubble = 0, elapsed = 0, heatIn = 0;

    function reset() {
      stage = 0; U = 0; corkX = 0; corkV = 0; fog = 0; bubble = 0; elapsed = 0; heatIn = 0;
      draw();
    }

    PL.ui.section(L.controls, "演示條件");
    const sHeat = PL.ui.slider(L.controls, {
      label: "酒精燈加熱功率", min: 0, max: 100, step: 5, value: 70, unit: "%", digits: 0, onInput: reset
    });
    const sWater = PL.ui.slider(L.controls, {
      label: "試管內水量", min: 5, max: 40, step: 1, value: 15, unit: "mL", digits: 0, onInput: reset
    });
    const sFriction = PL.ui.slider(L.controls, {
      label: "塞子緊度（阻力）", min: 20, max: 90, step: 5, value: 45, unit: "", digits: 0, onInput: reset
    });

    PL.ui.presets(L.controls, {
      label: "演示情境",
      options: [
        { label: "課本標準", hint: "中火、少量水、中等塞子緊度",
          apply: () => { sHeat.set(70); sWater.set(15); sFriction.set(45); reset(); } },
        { label: "弱火慢熱", hint: "加熱慢，更久才升壓噴出",
          apply: () => { sHeat.set(30); sWater.set(20); sFriction.set(45); reset(); } },
        { label: "強火快噴", hint: "火力大，很快超過塞子阻力",
          apply: () => { sHeat.set(95); sWater.set(12); sFriction.set(35); reset(); } },
        { label: "塞子很緊", hint: "阻力大：累積更久，噴出更猛",
          apply: () => { sHeat.set(75); sWater.set(18); sFriction.set(80); reset(); } }
      ]
    });

    PL.ui.note(L.controls,
      "播放後依序觀察：火焰與氣泡 → 壓力條爬升 → 塞子射出 → 管口白霧。" +
      "白霧不是水蒸氣，是液化小液滴。這是一次性演示，不會自己重來。");

    const rStage = PL.ui.readout(L.readouts, { label: "目前階段" });
    const rU = PL.ui.readout(L.readouts, { label: "管氣內能（相對）" });
    const rP = PL.ui.readout(L.readouts, { label: "壓力進度" });
    const rWork = PL.ui.readout(L.readouts, { label: "塞子機械能" });
    const rFog = PL.ui.readout(L.readouts, { label: "白霧強度" });
    PL.ui.button(PL.ui.buttonRow(L.controls), "重設", reset);

    PL.ui.causality(L.canvasWrap.parentNode, {
      title: "熱機原理：能量怎麼走",
      rows: [
        { name: "火焰 → 內能", tone: "a", note: "化學能先變成熱；熱傳遞使水與管氣內能上升——這是吸熱，不是做功。" },
        { name: "內能 → 機械能", tone: "b", note: "壓力剛好克服塞子阻力時，氣體膨脹推塞子：對外做功，自身內能下降。" },
        { name: "白霧 ≠ 水蒸氣", tone: "c", note: "水蒸氣看不見。白霧是做功後溫度下降，水蒸氣遇冷液化成的小液滴。" },
        { name: "不是連續熱機", tone: "d", note: "噴一次就結束；完整熱機需要循環、排熱與持續供熱，這只是做功原理演示。" }
      ]
    });

    PL.ui.procedure(L.controls, {
      title: "觀察步驟（先預測再看）",
      steps: [
        "先看<strong>火焰與水量</strong>，預測：加熱越強、塞子越緊，噴出會更早還是更晚？",
        "盯著<strong>壓力條</strong>：要累積到超過塞子阻力線才會噴，不是瞬間滿。",
        "塞子<strong>射出的同一瞬間</strong>管口出現白霧——內能正在變成機械能。",
        "白霧幾秒內消散：液滴散開／蒸發，不是「蒸氣變回水」一句話能帶過。",
        "按重設換一組參數，比較壓力爬升速度與噴出時機。"
      ],
      rule: "常見迷思：①把白霧當成水蒸氣；②以為內能全部變成塞子動能——" +
        "器壁吸熱、散熱與聲響都會分走能量，轉換效率永遠小於 100%。"
    });

    const verdict = PL.ui.verdict(L.readouts.parentNode || L.readouts, { label: "—", tone: "a" });
    const derived = PL.ui.derived(L.canvasWrap.parentNode, [
      { label: "已輸入熱（化學→內能）", unit: "", hint: "∝ 加熱功率 × 時間" },
      { label: "噴出前壓力進度", unit: "%", hint: "U 相對阻力門檻" },
      { label: "噴出後剩餘內能", unit: "", hint: "做功後下降，不是歸零" }
    ]);

    const thr = () => sFriction.get();
    const stageName = s => ["待加熱", "加熱中：氣泡", "壓力升高", "膨脹做功：塞子射出", "白霧消散"][s] || "—";

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const heat = sHeat.get(), water = sWater.get(), th = thr();
      const pRatio = PL.clamp(U / Math.max(th, 1), 0, 1.2);

      /* 左：實驗台 */
      const baseY = H - 46;
      const tubeW = 58, tubeH = Math.min(240, H * 0.54);
      const tubeX = W * 0.20, tubeBot = baseY - 70, tubeTop = tubeBot - tubeH;
      if (AP && AP.benchTop) AP.benchTop(ctx, W, H, baseY + 6);

      // 鐵架與試管夾
      AP.standRod(ctx, tubeX - 70, baseY + 6, tubeTop + 10);
      AP.clampHead(ctx, tubeX - 70, tubeTop + 50, 40, 0);

      ctx.save();
      ctx.translate(tubeX, tubeBot);
      ctx.rotate(-0.1);
      const waterH = tubeH * (0.16 + water / 40 * 0.40);
      AP.testTube(ctx, tubeW, tubeH, waterH, {});
      if (stage === 1 || stage === 2) {
        const n = Math.round(3 + heat / 18);
        for (let i = 0; i < n; i++) {
          const ph = (bubble + i * 0.37) % 1;
          D.disc(ctx, (i % 2 ? 1 : -1) * (3 + (i * 7) % 12), -waterH + ph * waterH * 0.85,
            2 + (i % 3), { fill: "rgba(230,240,255,0.8)" });
        }
      }
      // 壓力色帶（幾何隨 U 變化）
      const pressH = Math.max(3, (tubeH - waterH - 24) * pRatio * 0.4);
      D.rect(ctx, -tubeW / 2 + 7, -tubeH + 10, tubeW - 14, pressH,
        { fill: "rgba(229,115,115," + (0.12 + pRatio * 0.5) + ")" });

      const corkW = 20 + sFriction.get() * 0.12, corkH = 24;
      let cx0 = 0, cy0 = -tubeH - 2;
      if (stage >= 3) { cx0 = corkX; cy0 = -tubeH - 2 - corkX * 0.4; }
      else if (stage === 2) cx0 = Math.sin(elapsed * 26) * 1.6;
      ctx.save(); ctx.translate(cx0, cy0); ctx.rotate(stage >= 3 ? corkX * 0.02 : 0);
      AP.cork(ctx, corkW, corkH);
      ctx.restore();

      if (fog > 0.02) {
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * TAU + elapsed * 0.8;
          const rr = 12 + (i % 5) * 7 + fog * 30;
          D.disc(ctx, Math.cos(ang) * rr * 0.75, -tubeH - 30 + Math.sin(ang) * rr * 0.4,
            3 + (i % 3), { fill: "rgba(245,248,252," + (0.12 + fog * 0.5) + ")" });
        }
        D.text(ctx, "白霧＝液化小液滴（不是水蒸氣）", tubeW / 2, -tubeH - 78,
          { color: PL.col("text-dim"), size: 10, align: "center" });
      }
      ctx.restore();

      const lampX = tubeX + 14, lampY = baseY - 16;
      // 酒精燈：火焰大小跟著加熱功率
      AP.alcoholLamp(ctx, lampX, baseY + 6, 1.15, heat > 5 && stage < 3 ? heat / 100 : 0);
      D.text(ctx, "酒精燈", lampX, baseY + 24, { color: PL.col("text-faint"), size: 10, align: "center" });
      D.text(ctx, "熱機原理 · 試管噴塞", 18, 22, { color: PL.col("text-dim"), size: 12, weight: "700" });

      /* 右：壓力門檻、能量鏈、階段說明 */
      const px = W * 0.46, pw = W * 0.5;
      D.text(ctx, "壓力進度 vs 塞子阻力", px, 34, { color: PL.col("text-dim"), size: 12, weight: "700" });
      const barY = 48, barH = 24, barW = pw - 16;
      D.rect(ctx, px, barY, barW, barH, { fill: PL.theme.shade(0.45), stroke: PL.theme.pale(0.22), width: 1, r: 5 });
      D.rect(ctx, px + 1, barY + 1, Math.max(2, (barW - 2) * PL.clamp(pRatio / 1.25, 0, 1)), barH - 2,
        { fill: stage >= 3 ? PL.col("accent-2") : PL.col("danger"), r: 4 });
      const thrX = px + barW * (th / (th * 1.25));
      D.line(ctx, thrX, barY - 8, thrX, barY + barH + 8, PL.col("warn"), 2.2);
      D.text(ctx, "阻力門檻", thrX, barY + barH + 20, { color: PL.col("warn"), size: 10, align: "center" });

      const chainY = 110, bw = (pw - 36) / 3, bh = 54;
      const chainBox = (i, title, sub, color, on) => {
        const x = px + i * (bw + 12);
        D.rect(ctx, x, chainY, bw, bh, {
          fill: on ? color : PL.theme.shade(0.4),
          stroke: on ? color : PL.theme.pale(0.22), width: 1.5, r: 8
        });
        const ink = on ? "#141414" : PL.col("text-dim");
        D.text(ctx, title, x + bw / 2, chainY + 20, { color: ink, size: 12, align: "center", weight: "700" });
        D.text(ctx, sub, x + bw / 2, chainY + 40, { color: on ? "#222" : PL.col("text-faint"), size: 9.5, align: "center" });
        if (i < 2) D.text(ctx, "→", x + bw + 6, chainY + bh / 2 + 4, { color: PL.col("text-dim"), size: 14, align: "center" });
      };
      chainBox(0, "化學能", "酒精燈", "#e8c39e", heat > 5 && stage <= 2);
      chainBox(1, "內能", "管氣壓力升高", "#e57373", stage >= 1);
      chainBox(2, "機械能", "塞子獲得動能", "#64b5f6", stage >= 3);

      D.text(ctx, "108 對應", px, chainY + bh + 36, { color: PL.col("text-faint"), size: 10, weight: "700" });
      D.text(ctx, "國中自然 · 物質與能量／能源：內能、熱傳遞與熱機簡介", px, chainY + bh + 54,
        { color: PL.col("text-dim"), size: 10 });
      D.text(ctx, "高中必修能量守恆（定性）→ 選修熱力學 → 本站 heat-engine 效率實驗", px, chainY + bh + 70,
        { color: PL.col("text-dim"), size: 10 });

      const noteY = chainY + bh + 92;
      D.rect(ctx, px, noteY, pw - 16, 78, { fill: PL.theme.shade(0.25), stroke: PL.theme.pale(0.16), width: 1, r: 8 });
      D.text(ctx, stageName(stage), px + 12, noteY + 22, { color: MC(), size: 13, weight: "700" });
      const tip = stage <= 1 ? "熱傳遞增加內能；氣泡表示水接近沸騰、蒸氣變多。"
        : stage === 2 ? "壓力逼近塞子阻力：塞子開始微震，即將噴出。"
        : stage === 3 ? "氣體膨脹對塞子做功：內能 ↓、塞子機械能 ↑，管口出現白霧。"
        : "白霧消散；演示結束——要再看請按重設，這不是連續循環熱機。";
      D.text(ctx, tip, px + 12, noteY + 46, { color: PL.col("text-dim"), size: 10.5 });
      D.text(ctx, "108：國中內能／熱機 → 高中熱力學銜接點", px + 12, noteY + 66,
        { color: PL.col("text-faint"), size: 9.5 });

      rStage.set(stageName(stage));
      rU.set(U, 1);
      rP.set((pRatio * 100).toFixed(0) + "% 門檻 " + th);
      rWork.set(stage >= 3 ? (0.5 * corkV * corkV).toFixed(2) : "0");
      rFog.set(fog > 0.02 ? (fog * 100).toFixed(0) + "%" : "—");
      if (verdict && verdict.set) {
        verdict.set(stageName(stage), stage >= 3 ? "b" : stage >= 1 ? "a" : "c");
      }
      if (derived && derived.set) {
        derived.set(0, heatIn.toFixed(1));
        derived.set(1, (PL.clamp(pRatio, 0, 1) * 100).toFixed(0));
        derived.set(2, stage >= 3 ? U.toFixed(1) : "—");
      }
    }

    const anim = PL.loop(dt => {
      if (dt) {
        elapsed += dt;
        const heat = sHeat.get(), th = thr(), water = sWater.get();
        if (stage <= 2 && heat > 5) {
          // 水越多，要更多熱才能把壓力拉高
          const gain = heat * dt * (0.55 - water * 0.006);
          if (gain > 0) { U += gain; heatIn += gain; }
          bubble += dt * (0.6 + heat / 80);
        }
        if (stage === 0 && U > th * 0.18) stage = 1;
        if (stage === 1 && U > th * 0.72) stage = 2;
        if (stage === 2 && U >= th) {
          stage = 3;
          // 一次性做功：部分內能轉成塞子機械能，其餘留在管氣／散失
          const work = U * 0.45;
          U -= work;
          corkV = Math.sqrt(Math.max(0, work * 2.4));
          fog = 1;
        }
        if (stage === 3) {
          corkX += corkV * dt * 55;
          corkV *= Math.exp(-dt * 0.35);
          fog = Math.max(0, fog - dt * 0.35);
          if (fog <= 0.05) stage = 4;
        } else if (stage === 4) {
          fog = Math.max(0, fog - dt * 0.2);
          U = Math.max(0, U - dt * 2);
        }
      }
      draw();
    });

    cv.onResize(draw); anim.start();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
