/* 第五批互動題型：可由 open-curriculum.js 無上限擴充的資料驅動實驗台。 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const accent = () => PL.col("m-color", "#35e0cf");
  const cfg = (family, a, b, output, unit, calc, status) => ({ family, a, b, output, unit, calc, status });

  const LABS = {
    "u-tube-manometer": cfg("manometer", ["壓力差 ΔP", 100, 18000, 5600, "Pa", 100, 0], ["液體密度 ρ", 700, 13600, 1000, "kg/m³", 100, 0], "液面高度差", "cm", (p, rho) => p / (rho * 9.8) * 100, (a, b, o) => "壓差造成 " + PL.fmt(o, 1) + " cm 液面差"),
    "metal-specific-heat": cfg("calorimetry", ["金屬初溫", 40, 180, 120, "°C", 1, 0], ["水的初溫", 0, 40, 18, "°C", 1, 0], "平衡溫度", "°C", (tm, tw) => (0.35 * 0.45 * tm + 0.25 * 4.18 * tw) / (0.35 * 0.45 + 0.25 * 4.18), (a, b, o) => "混合後趨向 " + PL.fmt(o, 1) + "°C"),
    "heat-conduction": cfg("conduction", ["兩端溫差 ΔT", 5, 180, 70, "°C", 1, 0], ["導熱棒長度 L", 0.1, 2, 0.6, "m", 0.01, 2], "導熱功率", "W", (dt, length) => 205 * 0.00012 * dt / length, (a, b, o) => "銅棒穩定傳熱約 " + PL.fmt(o, 1) + " W"),
    "seismic-triangulation": cfg("seismic", ["P、S 波到時差", 1, 120, 28, "s", 1, 0], ["P 波速度", 4, 9, 6.2, "km/s", 0.1, 1], "測站距離", "km", (dt, vp) => dt / (1 / 3.6 - 1 / vp), (a, b, o) => "單一測站估計震源距離 " + PL.fmt(o, 0) + " km"),
    "string-harmonic-spectrum": cfg("harmonic", ["弦長 L", 0.2, 2.4, 0.8, "m", 0.01, 2], ["張力 T", 5, 240, 80, "N", 1, 0], "基頻 f₁", "Hz", (length, tension) => Math.sqrt(tension / 0.003) / (2 * length), (a, b, o) => "第二、三諧波分別為 " + PL.fmt(o * 2, 1) + "、" + PL.fmt(o * 3, 1) + " Hz"),
    "noise-barrier": cfg("noise", ["距離 r", 5, 160, 35, "m", 1, 0], ["屏障隔音量", 0, 35, 18, "dB", 1, 0], "相對聲強", "%", (r, il) => 10000 / (r * r) * Math.pow(10, -il / 10), (a, b, o) => o < 1 ? "屏障與距離已大幅降低聲強" : "仍需增加距離或隔音量"),
    "lens-combination": cfg("lenses", ["凸透鏡焦距 f₁", 20, 60, 40, "cm", 1, 0], ["凹透鏡焦距 f₂", -180, -80, -120, "cm", 1, 0], "等效焦距", "cm", (f1, f2) => f1 * f2 / (f1 + f2), (a, b, o) => o > 0 ? "組合後仍為會聚系統" : "凹透鏡使系統轉為發散"),
    "photometry-inverse-square": cfg("photometry", ["距離 r", 0.5, 16, 3, "m", 0.1, 1], ["光源強度 I", 100, 2400, 900, "cd", 10, 0], "照度 E", "lx", (r, intensity) => intensity / (r * r), (a, b, o) => "距離加倍時照度約降為四分之一"),
    "prism-spectrometer": cfg("prism", ["稜鏡頂角 A", 30, 75, 60, "°", 1, 0], ["最小偏向角 Dₘ", 10, 65, 38, "°", 1, 0], "折射率 n", "", (a, d) => Math.sin((a + d) * Math.PI / 360) / Math.sin(a * Math.PI / 360), (a, b, o) => "對稱光路下折射率為 " + PL.fmt(o, 3)),
    "voltage-divider": cfg("divider", ["輸入電壓 Vᵢₙ", 1, 24, 12, "V", 0.5, 1], ["下方電阻比例", 0.05, 0.95, 0.42, "", 0.01, 2], "輸出電壓 Vₒᵤₜ", "V", (vin, ratio) => vin * ratio, (a, b, o) => "R₂ 佔總電阻 " + PL.fmt(b * 100, 0) + "%"),
    "rc-timer": cfg("rc", ["時間 t", 0, 10, 2.2, "s", 0.1, 1], ["時間常數 RC", 0.2, 5, 1.5, "s", 0.1, 1], "電容電壓", "V", (t, tau) => 9 * (1 - Math.exp(-t / tau)), (a, b, o) => "經過 " + PL.fmt(a / b, 2) + " 個時間常數"),
    "electrolysis": cfg("electrolysis", ["電流 I", 0.1, 8, 2.4, "A", 0.1, 1], ["通電時間 t", 10, 1800, 420, "s", 10, 0], "析出銅質量", "g", (current, time) => current * time * 63.5 / (2 * 96485) * 1000, (a, b, o) => "通過電量 Q = " + PL.fmt(a * b, 0) + " C"),
    "tangent-galvanometer": cfg("galvanometer", ["線圈電流 I", 0, 5, 1.6, "A", 0.1, 1], ["線圈半徑 r", 0.04, 0.25, 0.1, "m", 0.01, 2], "磁針偏角", "°", (i, r) => Math.atan((4 * Math.PI * 1e-7 * 40 * i / (2 * r)) / 46e-6) * 180 / Math.PI, (a, b, o) => "磁針沿地磁場與線圈磁場的合場方向"),
    "cyclotron-frequency": cfg("cyclotron", ["磁場 B", 0.1, 3, 1.2, "T", 0.1, 1], ["粒子質量比 m/mₚ", 0.2, 4, 1, "", 0.1, 1], "迴旋頻率", "MHz", (b, ratio) => 15.25 * b / ratio, (a, b, o) => "非相對論近似下與軌道半徑無關"),
    "mutual-induction": cfg("mutual", ["電流變化率 ΔI/Δt", 0.1, 80, 18, "A/s", 0.1, 1], ["互感量 M", 0.001, 0.2, 0.04, "H", 0.001, 3], "感應電壓", "V", (rate, mutual) => rate * mutual, (a, b, o) => "改變越快，副線圈感應電壓越大"),
    "geiger-statistics": cfg("geiger", ["平均計數率 R", 0.1, 200, 15, "次/s", 0.1, 1], ["量測時間", 1, 600, 60, "s", 1, 0], "統計標準差 σ", "次", (rate, time) => Math.sqrt(rate * time), (rate, time, o) => "總計數約 " + PL.fmt(rate * time, 0) + " 次；相對誤差約 " + PL.fmt(o / (rate * time) * 100, 1) + "%"),
    "nuclear-energy-release": cfg("nuclear", ["質量虧損 Δm", 0.001, 0.08, 0.018, "u", 0.001, 3], ["反應數（×10²⁰）", 1, 1000, 150, "", 1, 0], "總釋放能量", "GJ", (mass, reactions) => mass * 931.5 * reactions * 1e20 * 1.602e-13 / 1e9, (mass, reactions, o) => "每個反應約釋放 " + PL.fmt(mass * 931.5, 2) + " MeV"),
    "gps-relativity": cfg("gps", ["衛星速度 v", 2, 5, 3.87, "km/s", 0.01, 2], ["軌道高度 h", 10000, 30000, 20200, "km", 100, 0], "每日時間差", "μs/day", (v, h) => ((3.986e14 / (299792458 ** 2)) * (1 / 6371000 - 1 / (6371000 + h * 1000)) - (v * 1000) ** 2 / (2 * 299792458 ** 2)) * 86400 * 1e6, (a, b, o) => o > 0 ? "重力效應大於速度效應，衛星鐘較快" : "速度效應占優勢")
  };

  function drawLabel(ctx, x, y, title, value, color) {
    D.rect(ctx, x, y, 180, 38, { fill: "rgba(5,10,17,0.82)", stroke: color, width: 1, r: 5 });
    D.text(ctx, title, x + 10, y + 14, { color: PL.col("text-faint"), size: 9 });
    D.text(ctx, value, x + 10, y + 29, { color, size: 11, weight: "700" });
  }

  function scene(cv, config, a, b, out, time) {
    const { ctx, W, H } = cv, c = accent(), cx = W / 2, cy = H * 0.52, floor = H - 42;
    cv.clear(); D.bg(cv);
    if (config.family === "manometer") {
      const dh = Math.min(105, out * 2.4), lx = cx - 80, rx = cx + 80;
      D.line(ctx, lx, 50, lx, floor - 25, c, 5); D.line(ctx, rx, 50, rx, floor - 25, c, 5); D.line(ctx, lx, floor - 25, rx, floor - 25, c, 5);
      D.line(ctx, lx + 4, floor - 52 - dh / 2, lx + 4, floor - 28, PL.col("accent-2"), 9); D.line(ctx, rx - 4, floor - 52 + dh / 2, rx - 4, floor - 28, PL.col("accent-2"), 9);
      D.arrow(ctx, lx - 55, 80, lx - 6, 80, { color: PL.col("warn"), width: 2.5, label: "P₁" }); D.arrow(ctx, rx + 55, 80, rx + 6, 80, { color: PL.col("text-dim"), width: 2.5, label: "P₂" });
    } else if (["calorimetry", "conduction"].includes(config.family)) {
      if (config.family === "calorimetry") {
        [[cx - 105, a, PL.col("warn")], [cx + 105, b, c]].forEach(item => { D.rect(ctx, item[0] - 55, cy - 55, 110, 115, { fill: "rgba(255,255,255,0.07)", stroke: item[2], width: 2, r: 8 }); D.rect(ctx, item[0] - 48, cy + 2, 96, 49, { fill: item[2] + "55", r: 4 }); D.text(ctx, PL.fmt(item[1], 0) + "°C", item[0], cy - 22, { color: item[2], size: 15, align: "center", weight: "700" }); }); D.arrow(ctx, cx - 36, cy, cx + 36, cy, { color: PL.col("danger"), width: 3, label: "熱流" });
      } else { const x0 = 75, x1 = W - 75; D.rect(ctx, x0, cy - 22, x1 - x0, 44, { fill: "rgba(255,179,87,0.20)", stroke: c, width: 2, r: 5 }); for (let i = 0; i < 11; i++) D.line(ctx, x0 + i * (x1 - x0) / 10, cy - 18, x0 + i * (x1 - x0) / 10, cy + 18, "rgba(255,255,255,0.17)", 1); D.text(ctx, "熱端", x0, cy - 38, { color: PL.col("warn"), size: 11, align: "center" }); D.text(ctx, "冷端", x1, cy - 38, { color: c, size: 11, align: "center" }); D.arrow(ctx, x0 + 40, cy, x1 - 40, cy, { color: PL.col("warn"), width: 3, label: "P" }); }
    } else if (["seismic", "harmonic", "noise"].includes(config.family)) {
      if (config.family === "seismic") { const sx = 74, sy = floor - 32; D.disc(ctx, sx, sy, 13, { fill: PL.col("danger"), glow: PL.col("danger"), glowSize: 12 }); [0.28, 0.52, 0.78].forEach(f => D.ring(ctx, sx, sy, 32 + time * 18 * f, "rgba(90,162,255,0.25)", 1.4)); D.line(ctx, W - 90, floor - 95, W - 90, floor, c, 3); D.text(ctx, "測站", W - 90, floor + 16, { color: c, size: 10, align: "center" }); }
      else if (config.family === "harmonic") { D.line(ctx, 50, cy, W - 50, cy, "rgba(255,255,255,0.18)", 1); ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); for (let x = 50; x <= W - 50; x += 2) { const y = cy + Math.sin((x - 50) / (W - 100) * Math.PI * 2) * 58 * Math.sin(time * TAU * out / 10); x === 50 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); }
      else { D.line(ctx, 42, floor, W - 42, floor, "rgba(255,255,255,0.35)", 3); D.disc(ctx, 94, cy, 20, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 14 }); D.rect(ctx, cx - 12, cy - 80, 24, 160, { fill: "rgba(90,162,255,0.18)", stroke: c, width: 2, r: 3 }); for (let r = 40; r < 230; r += 35) D.ring(ctx, 94, cy, r, "rgba(255,204,102,0.17)", 1); }
    } else if (["lenses", "photometry", "prism"].includes(config.family)) {
      if (config.family === "lenses") { const x1 = cx - 68, x2 = cx + 68; [x1, x2].forEach((x, i) => { D.line(ctx, x, 52, x, floor - 28, i ? PL.col("accent-2") : c, 4); D.text(ctx, i ? "凹" : "凸", x, 38, { color: i ? PL.col("accent-2") : c, size: 12, align: "center" }); }); D.arrow(ctx, 42, cy, x1 - 8, cy, { color: PL.col("warn"), width: 2.5, label: "光" }); D.arrow(ctx, x2 + 8, cy, W - 40, cy - 28, { color: PL.col("accent-2"), width: 2.5 }); }
      else if (config.family === "photometry") { D.disc(ctx, cx, cy, 20, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 20 }); for (let r = 35; r < Math.min(W, H) * 0.43; r += 28) D.ring(ctx, cx, cy, r, "rgba(255,204,102,0.24)", 1.4); D.rect(ctx, Math.min(W - 65, cx + a * 18), cy - 46, 8, 92, { fill: c }); }
      else { const size = 86; ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy - size); ctx.lineTo(cx - size * 0.88, cy + size * 0.58); ctx.lineTo(cx + size * 0.88, cy + size * 0.58); ctx.closePath(); ctx.fillStyle = "rgba(90,162,255,0.12)"; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); ["#a855f7", "#3b82f6", "#22c55e", "#facc15", "#ef4444"].forEach((color, i) => D.arrow(ctx, cx + 34, cy - 18 + i * 5, W - 72, cy - 72 + i * 35, { color, width: 2 })); }
    } else if (["divider", "rc", "electrolysis"].includes(config.family)) {
      const top = cy - 54, bot = cy + 54, left = 78, right = W - 78; D.line(ctx, left, top, right, top, c, 2.3); D.line(ctx, left, bot, right, bot, c, 2.3); D.line(ctx, left, top, left, bot, c, 2.3); D.line(ctx, right, top, right, bot, c, 2.3);
      if (config.family === "divider") { D.rect(ctx, cx - 110, top - 9, 74, 18, { fill: "rgba(255,204,102,0.25)", stroke: PL.col("warn"), width: 1, r: 3 }); D.rect(ctx, cx + 35, top - 9, 74, 18, { fill: "rgba(90,162,255,0.22)", stroke: c, width: 1, r: 3 }); D.arrow(ctx, cx + 72, top + 18, cx + 72, bot - 18, { color: PL.col("accent-2"), width: 2, label: "Vout" }); }
      else if (config.family === "rc") { D.rect(ctx, cx - 118, top - 9, 86, 18, { fill: "rgba(255,204,102,0.25)", stroke: PL.col("warn"), width: 1, r: 3 }); D.line(ctx, cx + 54, top - 28, cx + 54, top + 28, PL.col("accent-2"), 3); D.line(ctx, cx + 72, top - 28, cx + 72, top + 28, PL.col("accent-2"), 3); D.text(ctx, "C", cx + 63, top - 39, { color: PL.col("accent-2"), size: 13, align: "center" }); }
      else { D.rect(ctx, cx - 88, top + 14, 176, bot - top - 28, { fill: "rgba(90,162,255,0.14)", stroke: c, width: 2, r: 5 }); D.line(ctx, cx - 42, top + 18, cx - 42, bot - 18, PL.col("warn"), 3); D.line(ctx, cx + 42, top + 18, cx + 42, bot - 18, PL.col("accent-2"), 3); for (let i = 0; i < 7; i++) D.disc(ctx, cx + 54 + Math.sin(time + i) * 10, top + 26 + i * 11, 2.5, { fill: PL.col("warn") }); }
    } else if (["galvanometer", "cyclotron", "mutual"].includes(config.family)) {
      if (config.family === "galvanometer") { D.ring(ctx, cx, cy, 92, "rgba(255,255,255,0.42)", 3); const theta = out * Math.PI / 180; D.arrow(ctx, cx, cy, cx + Math.sin(theta) * 70, cy - Math.cos(theta) * 70, { color: PL.col("danger"), width: 4, label: "N" }); }
      else if (config.family === "cyclotron") { const r = 72 + Math.sin(time * 2) * 8; D.ring(ctx, cx, cy, r, c, 2); D.ring(ctx, cx, cy, r * 0.64, PL.col("accent-2"), 2); D.disc(ctx, cx + r, cy, 7, { fill: PL.col("warn") }); D.text(ctx, "B ×", cx, cy + 5, { color: c, size: 15, align: "center" }); }
      else { [cx - 86, cx + 86].forEach((x, i) => { for (let y = cy - 62; y <= cy + 62; y += 18) D.ring(ctx, x, y, 12, i ? PL.col("accent-2") : c, 2); }); D.arrow(ctx, cx - 35, cy, cx + 35, cy, { color: PL.col("warn"), width: 2.5, label: "Φ" }); }
    } else {
      if (config.family === "geiger") { D.rect(ctx, cx - 80, cy - 68, 160, 136, { fill: "rgba(7,11,17,0.60)", stroke: c, width: 2, r: 8 }); for (let i = 0; i < 18; i++) { const x = cx - 62 + (i * 29 % 124), y = cy - 46 + (i * 41 % 92); D.disc(ctx, x, y, 2 + (i % 3), { fill: i % 2 ? c : PL.col("warn") }); } D.text(ctx, "N ± √N", cx, cy + 92, { color: c, size: 14, align: "center", weight: "700" }); }
      else if (config.family === "nuclear") { D.disc(ctx, cx - 66, cy, 36, { fill: "rgba(90,162,255,0.26)", stroke: c, width: 2 }); D.disc(ctx, cx + 66, cy, 30, { fill: "rgba(255,179,87,0.26)", stroke: PL.col("warn"), width: 2 }); D.arrow(ctx, cx - 20, cy, cx + 20, cy, { color: PL.col("danger"), width: 3, label: "E" }); }
      else { D.disc(ctx, cx, cy, 36, { fill: "rgba(90,162,255,0.28)", stroke: c, width: 2 }); D.ring(ctx, cx, cy, 116, "rgba(255,255,255,0.28)", 2); D.text(ctx, "GPS", cx, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" }); D.arrow(ctx, cx - 140, cy - 78, cx - 36, cy - 18, { color: PL.col("accent-2"), width: 2, label: "訊號" }); D.arrow(ctx, cx + 140, cy - 78, cx + 36, cy - 18, { color: PL.col("warn"), width: 2 }); }
    }
    drawLabel(ctx, 20, 18, config.output, PL.fmt(out, Math.abs(out) < 10 ? 3 : 1) + " " + config.unit, c);
    D.text(ctx, config.status(a, b, out), W / 2, H - 18, { color: PL.col("text-faint"), size: 9.5, align: "center" });
  }

  Object.entries(LABS).forEach(([id, config]) => {
    PL.register(id, { build(root) {
      const L = PL.ui.layout(root), cv = PL.canvas.create(L.canvasWrap, 0.58, 920);
      const digits = param => param[6] == null ? 2 : param[6];
      const a = PL.ui.slider(L.controls, { label: config.a[0], min: config.a[1], max: config.a[2], value: config.a[3], step: config.a[5], unit: config.a[4], digits: digits(config.a), onInput: render });
      const b = PL.ui.slider(L.controls, { label: config.b[0], min: config.b[1], max: config.b[2], value: config.b[3], step: config.b[5], unit: config.b[4], digits: digits(config.b), onInput: render });
      PL.ui.note(L.controls, "此題型可持續記錄量測點；資料筆數不設程式上限。調整參數後比對裝置、讀值與關係圖。");
      const records = [];
      const actions = PL.ui.buttonRow(L.controls);
      PL.ui.button(actions, "記錄量測點", () => { records.push({ a: a.get(), b: b.get(), out: config.calc(a.get(), b.get()) }); render(); }, { primary: true });
      PL.ui.button(actions, "清空紀錄", () => { records.length = 0; render(); });
      const readout = PL.ui.readout(L.readouts, { label: config.output, unit: config.unit });
      const aReadout = PL.ui.readout(L.readouts, { label: config.a[0], unit: config.a[4] });
      const bReadout = PL.ui.readout(L.readouts, { label: config.b[0], unit: config.b[4] });
      const nReadout = PL.ui.readout(L.readouts, { label: "量測紀錄", unit: "筆" });
      const chart = PL.ui.chart(PL.ui.charts(root), { title: config.output + "關係圖", cap: "曲線固定第二項參數；亮點是目前設定，空心點是所有已記錄的量測資料。" });
      let elapsed = 0, animation;
      function render() {
        const av = a.get(), bv = b.get(), out = config.calc(av, bv);
        scene(cv, config, av, bv, out, elapsed);
        readout.set(out, Math.abs(out) < 10 ? 3 : 2); aReadout.set(av, digits(config.a)); bReadout.set(bv, digits(config.b)); nReadout.set(records.length, 0);
        chart.clear();
        const points = [], finite = [];
        for (let i = 0; i <= 120; i++) { const x = PL.lerp(config.a[1], config.a[2], i / 120), y = config.calc(x, bv); if (Number.isFinite(y)) { points.push([x, y]); finite.push(y); } }
        const low = Math.min(out, ...finite), high = Math.max(out, ...finite), span = Math.max(1, high - low);
        const graph = PL.graph(chart, { x: 45, y: 18, w: chart.W - 60, h: chart.H - 47 }, { x0: config.a[1], x1: config.a[2], y0: low - span * 0.12, y1: high + span * 0.12 });
        graph.frame({ xlabel: config.a[0], ylabel: config.output }); graph.grid(5, 4); graph.curve(points, { color: accent(), width: 2.3 });
        records.forEach(point => graph.dot(point.a, point.out, { color: PL.col("text-dim"), r: 3 }));
        graph.dot(av, out, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
      }
      animation = PL.loop(dt => { if (dt) elapsed += dt; render(); });
      cv.onResize(render); chart.onResize(render); render(); animation.start();
      return { stop() { animation.stop(); cv.destroy(); chart.destroy(); }, rerender: render };
    }});
  });
})();
