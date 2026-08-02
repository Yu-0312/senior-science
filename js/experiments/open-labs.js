/* 第五、六批互動題型：可由 open-curriculum.js 無上限擴充的資料驅動實驗台。 */
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
    "gps-relativity": cfg("gps", ["衛星速度 v", 2, 5, 3.87, "km/s", 0.01, 2], ["軌道高度 h", 10000, 30000, 20200, "km", 100, 0], "每日時間差", "μs/day", (v, h) => ((3.986e14 / (299792458 ** 2)) * (1 / 6371000 - 1 / (6371000 + h * 1000)) - (v * 1000) ** 2 / (2 * 299792458 ** 2)) * 86400 * 1e6, (a, b, o) => o > 0 ? "重力效應大於速度效應，衛星鐘較快" : "速度效應占優勢"),
    "lagrangian-pendulum": cfg("lagrangian", ["初始擺角 θ₀", 5, 80, 32, "°", 1, 0], ["擺長 L", 0.2, 2.5, 1, "m", 0.1, 1], "初始角加速度", "rad/s²", (theta, length) => 9.8 / length * Math.sin(theta * Math.PI / 180), (a, b, o) => "拉格朗日方程給出與重力矩相同的恢復趨勢"),
    "two-body-barycenter": cfg("barycenter", ["質量比 m₂/m₁", 0.1, 10, 0.6, "", 0.1, 1], ["兩天體距離 d", 0.2, 5, 2.4, "AU", 0.1, 1], "主天體軌道半徑 r₁", "AU", (ratio, distance) => ratio / (1 + ratio) * distance, (a, b, o) => "質量越大的主天體，繞質心的擺動越小"),
    "phase-space-oscillator": cfg("phase", ["振幅 A", 1, 18, 8, "cm", 1, 0], ["頻率 f", 0.2, 4, 1.2, "Hz", 0.1, 1], "最大速率 vₘₐₓ", "m/s", (amplitude, frequency) => amplitude / 100 * 2 * Math.PI * frequency, (a, b, o) => "位置—速度圖形成封閉橢圓；面積對應作用量尺度"),
    "entropy-mixing": cfg("entropy", ["高溫端 Tₕ", 30, 180, 110, "°C", 1, 0], ["低溫端 T𝚌", 0, 30, 18, "°C", 1, 0], "總熵變 ΔS", "J/K", (hot, cold) => { const th = hot + 273.15, tc = cold + 273.15, tf = (th + tc) / 2; return 120 * (2 * Math.log(tf) - Math.log(th) - Math.log(tc)); }, (a, b, o) => "平衡溫度約 " + PL.fmt((a + b) / 2, 1) + "°C，孤立系統熵增加"),
    "fourier-spectrum": cfg("fourier", ["保留諧波數 N", 1, 12, 5, "", 1, 0], ["基頻 f₁", 0.5, 10, 2, "Hz", 0.5, 1], "最高保留頻率", "Hz", (harmonics, fundamental) => Math.round(harmonics) * fundamental, (a, b, o) => "加入更多奇次諧波後，方波邊緣更陡峭"),
    "fresnel-diffraction": cfg("fresnel", ["孔徑半徑 a", 0.1, 2.4, 0.8, "mm", 0.1, 1], ["傳播距離 z", 0.2, 6, 1.5, "m", 0.1, 1], "菲涅耳數 Nᶠ", "", (radius, distance) => (radius * 1e-3) ** 2 / (532e-9 * distance), (a, b, o) => o > 1 ? "近場繞射明顯，需考慮菲涅耳區" : "已逐漸接近遠場繞射的條件"),
    "bode-low-pass": cfg("bode", ["訊號頻率 f", 10, 20000, 1000, "Hz", 10, 0], ["截止頻率 f𝚌", 100, 10000, 1800, "Hz", 100, 0], "電壓增益", "dB", (frequency, cutoff) => 20 * Math.log10(1 / Math.sqrt(1 + (frequency / cutoff) ** 2)), (a, b, o) => "f=f𝚌 時增益為 -3 dB；高頻訊號被逐漸濾除"),
    "biot-savart-axis": cfg("biot", ["軸向距離 z", 0, 0.35, 0.08, "m", 0.01, 2], ["線圈半徑 R", 0.03, 0.2, 0.09, "m", 0.01, 2], "軸線磁場 B", "μT", (z, radius) => 4 * Math.PI * 1e-7 * 50 * 0.8 * radius ** 2 / (2 * (radius ** 2 + z ** 2) ** 1.5) * 1e6, (a, b, o) => "線圈中心磁場最大；沿軸向離開後快速衰減"),
    "infinite-square-well": cfg("quantum-well", ["位阱寬度 L", 0.5, 6, 1.6, "nm", 0.1, 1], ["量子數 n", 1, 6, 2, "", 1, 0], "能階 Eₙ", "eV", (width, level) => 0.376 * level ** 2 / width ** 2, (a, b, o) => "量子數越高，節點越多；位阱越窄，能階間距越大")
  };

  function drawLabel(ctx, x, y, title, value, color) {
    D.rect(ctx, x, y, 180, 38, { fill: PL.theme.shade(0.82), stroke: color, width: 1, r: 5 });
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
    } else if (["lagrangian", "barycenter", "phase", "entropy", "fourier", "fresnel", "bode", "biot", "quantum-well"].includes(config.family)) {
      if (config.family === "lagrangian") {
        const theta = a * Math.PI / 180, pivotX = cx, pivotY = 72, length = 110 + b * 55, bobX = pivotX + Math.sin(theta) * length, bobY = pivotY + Math.cos(theta) * length;
        D.line(ctx, pivotX - 100, pivotY - 24, pivotX + 100, pivotY - 24, "rgba(255,255,255,0.40)", 5); D.disc(ctx, pivotX, pivotY, 7, { fill: PL.col("text-dim") }); D.line(ctx, pivotX, pivotY, bobX, bobY, c, 3); D.disc(ctx, bobX, bobY, 19, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 10 }); D.arrow(ctx, bobX, bobY, bobX - 38 * Math.sin(theta), bobY - 38 * Math.cos(theta), { color: PL.col("danger"), width: 2, label: "mg" }); D.ring(ctx, pivotX, pivotY, length, "rgba(90,162,255,0.14)", 1, [4, 5]);
      } else if (config.family === "barycenter") {
        const span = Math.min(W * 0.64, 95 + b * 62), x1 = cx - span * a / (1 + a), x2 = cx + span / (1 + a), size1 = 22, size2 = Math.max(8, Math.min(34, 14 * Math.cbrt(a)));
        D.line(ctx, cx - span / 2 - 40, cy, cx + span / 2 + 40, cy, "rgba(255,255,255,0.18)", 1, [5, 5]); D.ring(ctx, cx, cy, 11, c, 2); D.text(ctx, "質心", cx, cy - 18, { color: c, size: 11, align: "center" }); D.disc(ctx, x1, cy, size1, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 10 }); D.disc(ctx, x2, cy, size2, { fill: PL.col("accent-2"), glow: PL.col("accent-2"), glowSize: 8 }); D.arrow(ctx, x1, cy + 42, cx, cy + 42, { color: PL.col("warn"), width: 2, label: "r₁" }); D.arrow(ctx, cx, cy + 42, x2, cy + 42, { color: PL.col("accent-2"), width: 2, label: "r₂" });
      } else if (config.family === "phase") {
        const rx = 35 + a * 8, ry = 32 + Math.min(85, out * 140); D.line(ctx, 70, cy, W - 55, cy, "rgba(255,255,255,0.30)", 1.5); D.line(ctx, cx, 48, cx, floor - 20, "rgba(255,255,255,0.30)", 1.5); ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke(); ctx.restore(); const t = time * b * TAU, px = cx + rx * Math.cos(t), py = cy - ry * Math.sin(t); D.disc(ctx, px, py, 7, { fill: PL.col("accent-2"), glow: PL.col("accent-2"), glowSize: 10 }); D.text(ctx, "x", W - 60, cy - 8, { color: PL.col("text-dim"), size: 12 }); D.text(ctx, "v", cx + 10, 58, { color: PL.col("text-dim"), size: 12 });
      } else if (config.family === "entropy") {
        const left = cx - 150, right = cx + 25, y = cy - 64; [[left, a, PL.col("warn")], [right, b, c]].forEach(item => { D.rect(ctx, item[0], y, 125, 132, { fill: item[2] + "20", stroke: item[2], width: 2, r: 8 }); D.text(ctx, PL.fmt(item[1], 0) + "°C", item[0] + 62, y + 46, { color: item[2], size: 17, align: "center", weight: "700" }); D.text(ctx, item[1] > 50 ? "高溫系統" : "低溫系統", item[0] + 62, y + 84, { color: PL.col("text-dim"), size: 10, align: "center" }); }); D.arrow(ctx, left + 130, cy, right - 10, cy, { color: PL.col("danger"), width: 3, label: "熱流" }); D.text(ctx, "ΔS > 0", cx, floor - 16, { color: c, size: 14, align: "center", weight: "700" });
      } else if (config.family === "fourier") {
        D.line(ctx, 42, cy, W - 42, cy, "rgba(255,255,255,0.22)", 1); ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2.7; ctx.beginPath(); const modes = Math.round(a); for (let x = 42; x <= W - 42; x += 2) { const u = (x - 42) / (W - 84) * TAU; let yv = 0; for (let n = 1; n <= modes; n++) yv += Math.sin((2 * n - 1) * u) / (2 * n - 1); const y = cy - yv * 64 * 4 / Math.PI; x === 42 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); D.text(ctx, "N = " + modes + " 個奇次諧波", cx, 50, { color: PL.col("accent-2"), size: 13, align: "center", weight: "700" });
      } else if (config.family === "fresnel") {
        const aperture = 14 + a * 28, screenX = W - 96; D.disc(ctx, 92, cy, 15, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 16 }); D.rect(ctx, cx - 10, cy - aperture, 20, aperture * 2, { fill: PL.theme.shade(0.82), stroke: c, width: 2, r: 3 }); D.line(ctx, 108, cy, cx - 12, cy, PL.col("warn"), 2); D.line(ctx, cx + 12, cy, screenX, cy - 42, PL.col("accent-2"), 1.8); D.line(ctx, cx + 12, cy, screenX, cy + 42, PL.col("accent-2"), 1.8); D.line(ctx, screenX, cy - 85, screenX, cy + 85, "rgba(255,255,255,0.55)", 4); for (let r = 10; r < 75; r += 14) D.ring(ctx, screenX - 18, cy, r, "rgba(90,162,255,0.22)", 1); D.text(ctx, "Nᶠ=" + PL.fmt(out, 2), cx, floor - 16, { color: c, size: 13, align: "center", weight: "700" });
      } else if (config.family === "bode") {
        const top = cy - 50, bottom = cy + 50, amp = Math.max(5, Math.pow(10, out / 20) * 58); D.line(ctx, 65, top, W - 65, top, c, 2); D.line(ctx, 65, bottom, W - 65, bottom, c, 2); D.line(ctx, 65, top, 65, bottom, c, 2); D.line(ctx, W - 65, top, W - 65, bottom, c, 2); D.rect(ctx, cx - 100, top - 8, 76, 16, { fill: "rgba(255,204,102,0.28)", stroke: PL.col("warn"), width: 1, r: 3 }); D.line(ctx, cx + 54, top - 28, cx + 54, top + 28, PL.col("accent-2"), 3); D.line(ctx, cx + 72, top - 28, cx + 72, top + 28, PL.col("accent-2"), 3); D.text(ctx, "RC 低通", cx, top - 42, { color: c, size: 13, align: "center", weight: "700" }); ctx.save(); ctx.strokeStyle = PL.col("accent-2"); ctx.lineWidth = 2.5; ctx.beginPath(); for (let x = 92; x <= W - 92; x += 3) { const y = floor - 44 + Math.sin((x - 92) / 22) * amp; x === 92 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      } else if (config.family === "biot") {
        const r = 42 + b * 170, pointX = cx + a * 360; D.ring(ctx, cx, cy, r, c, 3); D.ring(ctx, cx, cy, r * 0.75, "rgba(90,162,255,0.30)", 1.5); D.line(ctx, 48, cy, W - 48, cy, "rgba(255,255,255,0.20)", 1, [5, 5]); D.disc(ctx, pointX, cy, 7, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 10 }); D.arrow(ctx, cx, cy - r - 28, pointX, cy - r - 28, { color: PL.col("accent-2"), width: 2, label: "z" }); D.text(ctx, "I", cx + r + 14, cy, { color: c, size: 14, weight: "700" });
      } else {
        const x0 = cx - 125, x1 = cx + 125, levelY = floor - 35 - b * 24; D.line(ctx, x0, 55, x0, floor - 22, c, 4); D.line(ctx, x1, 55, x1, floor - 22, c, 4); D.line(ctx, x0, floor - 22, x1, floor - 22, c, 3); D.line(ctx, x0 + 10, levelY, x1 - 10, levelY, PL.col("warn"), 2); ctx.save(); ctx.strokeStyle = PL.col("accent-2"); ctx.lineWidth = 2; ctx.beginPath(); for (let x = x0 + 10; x <= x1 - 10; x += 2) { const t = (x - x0 - 10) / (x1 - x0 - 20); const y = levelY - Math.sin(b * Math.PI * t) * 24; x === x0 + 10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); D.text(ctx, "n = " + Math.round(b), x1 + 22, levelY + 4, { color: PL.col("warn"), size: 12 }); D.text(ctx, "∞", x0 - 18, 58, { color: c, size: 20, align: "center" }); D.text(ctx, "∞", x1 + 18, 58, { color: c, size: 20, align: "center" });
      }
    } else {
      if (config.family === "geiger") { D.rect(ctx, cx - 80, cy - 68, 160, 136, { fill: PL.theme.shade(0.60), stroke: c, width: 2, r: 8 }); for (let i = 0; i < 18; i++) { const x = cx - 62 + (i * 29 % 124), y = cy - 46 + (i * 41 % 92); D.disc(ctx, x, y, 2 + (i % 3), { fill: i % 2 ? c : PL.col("warn") }); } D.text(ctx, "N ± √N", cx, cy + 92, { color: c, size: 14, align: "center", weight: "700" }); }
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
      PL.ui.note(L.controls, PL.templateGuide(id, config));
      PL.ui.note(L.controls, "這一題可以持續記錄量測點，資料筆數不設上限；已記錄的點會以空心點畫在關係圖上。");
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
        chart.setCap(PL.ui.relationChart(chart, {
          a: config.a, b: config.b, av: av, bv: bv,
          calc: config.calc, output: config.output, sweep: config.sweep,
          extra: function (g) { records.forEach(p => g.dot(p.a, p.out, { color: PL.col("text-dim"), r: 3 })); }
        }));
      }
      animation = PL.loop(dt => { if (dt) elapsed += dt; render(); });
      cv.onResize(render); chart.onResize(render); render(); animation.start();
      return { stop() { animation.stop(); cv.destroy(); chart.destroy(); }, rerender: render };
    }});
  });
})();
