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
    "electrolysis": cfg("electrolysis", ["電流 I", 0.1, 8, 2.4, "A", 0.1, 1], ["通電時間 t", 10, 1800, 420, "s", 10, 0], "析出銅質量", "mg", (current, time) => current * time * 63.5 / (2 * 96485) * 1000, (a, b, o) => "通過電量 Q = " + PL.fmt(a * b, 0) + " C"),
    "tangent-galvanometer": cfg("galvanometer", ["線圈電流 I", 0, 5, 1.6, "A", 0.1, 1], ["線圈半徑 r", 0.04, 0.25, 0.1, "m", 0.01, 2], "磁針偏角", "°", (i, r) => Math.atan((4 * Math.PI * 1e-7 * 40 * i / (2 * r)) / 46e-6) * 180 / Math.PI, (a, b, o) => "磁針沿地磁場與線圈磁場的合場方向"),
    "cyclotron-frequency": cfg("cyclotron", ["磁場 B", 0.1, 3, 1.2, "T", 0.1, 1], ["粒子質量比 m/mₚ", 0.2, 4, 1, "", 0.1, 1], "迴旋頻率", "MHz", (b, ratio) => 15.25 * b / ratio, (a, b, o) => "非相對論近似下與軌道半徑無關"),
    "mutual-induction": cfg("mutual", ["電流變化率 ΔI/Δt", 0.1, 80, 18, "A/s", 0.1, 1], ["互感量 M", 0.001, 0.2, 0.04, "H", 0.001, 3], "感應電壓", "V", (rate, mutual) => rate * mutual, (a, b, o) => "改變越快，副線圈感應電壓越大"),
    "geiger-statistics": cfg("geiger", ["平均計數率 R", 0.1, 200, 15, "次/s", 0.1, 1], ["量測時間", 1, 600, 60, "s", 1, 0], "統計標準差 σ", "次", (rate, time) => Math.sqrt(rate * time), (rate, time, o) => "總計數約 " + PL.fmt(rate * time, 0) + " 次；相對誤差約 " + PL.fmt(o / (rate * time) * 100, 1) + "%"),
    "fresnel-diffraction": cfg("fresnel", ["孔徑半徑 a", 0.1, 2.4, 0.8, "mm", 0.1, 1], ["傳播距離 z", 0.2, 6, 1.5, "m", 0.1, 1], "菲涅耳數 Nᶠ", "", (radius, distance) => (radius * 1e-3) ** 2 / (532e-9 * distance), (a, b, o) => o > 1 ? "近場繞射明顯，需考慮菲涅耳區" : "已逐漸接近遠場繞射的條件"),
    "bode-low-pass": cfg("bode", ["訊號頻率 f", 10, 20000, 1000, "Hz", 10, 0], ["截止頻率 f𝚌", 100, 10000, 1800, "Hz", 100, 0], "電壓增益", "dB", (frequency, cutoff) => 20 * Math.log10(1 / Math.sqrt(1 + (frequency / cutoff) ** 2)), (a, b, o) => "f=f𝚌 時增益為 -3 dB；高頻訊號被逐漸濾除"),
    "biot-savart-axis": cfg("biot", ["軸向距離 z", 0, 0.35, 0.08, "m", 0.01, 2], ["線圈半徑 R", 0.03, 0.2, 0.09, "m", 0.01, 2], "軸線磁場 B", "μT", (z, radius) => 4 * Math.PI * 1e-7 * 50 * 0.8 * radius ** 2 / (2 * (radius ** 2 + z ** 2) ** 1.5) * 1e6, (a, b, o) => "線圈中心磁場最大；沿軸向離開後快速衰減")};

  function label(ctx, x, y, title, value, color) {
    D.rect(ctx, x, y, 180, 38, { fill: PL.theme.shade(0.82), stroke: color, width: 1, r: 5 });
    D.text(ctx, title, x + 10, y + 14, { color: PL.col("text-faint"), size: 9 });
    D.text(ctx, value, x + 10, y + 29, { color, size: 11, weight: "700" });
  }

  /* ---------- 場景共用小工具 ---------- */
  const AP = PL.apparatus;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fr = (v, r) => clamp((v - r[1]) / Math.max(1e-9, r[2] - r[1]), 0, 1);
  const isL = () => PL.theme.isLight();
  const noteC = (ctx, col, x, y, w, h) => PL.theme.note(ctx, col, x, y, w, h);
  const TX = (ctx, str, x, y, size, align, color, w) => D.text(ctx, str, x, y, { color: color || PL.col("text"), size: size || 11, align: align || "left", weight: w === 0 ? "400" : "700" });
  const RT = (ctx, str, x, y, size, color, align, w) => { ctx.save(); ctx.fillStyle = color; ctx.font = (w === 0 ? "" : "700 ") + size + "px 'Segoe UI','PingFang TC','Microsoft JhengHei',system-ui,sans-serif"; ctx.textAlign = align || "center"; ctx.textBaseline = "alphabetic"; ctx.fillText(str, x, y); ctx.restore(); };
  const niceCeil = x => { if (!(x > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
  const SC = {};


  /* U 形管壓力計：捏橡皮球加壓，左管液面被壓低、右管升高；高度差 h = ΔP / ρg */
  SC["u-tube-manometer"] = k => {
    const { ctx, W, H, a: dP, b: rho, t, s, c, v: h, cfg } = k;
    const L = isL(), benchY = H * 0.9;
    AP.labRoom(ctx, W, H, benchY, {});
    const lx = W * 0.42, rx = W * 0.58, tTop = 46 * s, tBot = benchY - 46 * s, tw = 22 * s;
    const liq = rho > 10000 ? ["水銀", "rgba(186,192,204,0.97)"] : rho > 1100 ? ["濃鹽水", "rgba(70,140,215,0.72)"] : rho >= 950 ? ["水", "rgba(80,160,230,0.62)"] : ["酒精", "rgba(236,196,90,0.72)"];
    const R = Math.max(2, niceCeil(h * 1.3)), span = (tBot - tTop) * 0.74, mid = (tTop + tBot) / 2 + 10 * s, half = h / R * span / 2, yL = mid + half, yR = mid - half;
    AP.standRod(ctx, W * 0.72, benchY, tTop - 6 * s);
    AP.crossArm(ctx, W * 0.72, tTop + 30 * s, rx + tw / 2);
    ctx.fillStyle = liq[1]; ctx.fillRect(lx - tw / 2 + 2, yL, tw - 4, tBot - yL); ctx.fillRect(rx - tw / 2 + 2, yR, tw - 4, tBot - yR);
    ctx.fillRect(lx - tw / 2 + 2, tBot, rx - lx + tw - 4, 18 * s);
    ctx.strokeStyle = L ? "rgba(84,124,152,0.85)" : "rgba(206,232,244,0.85)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(lx - tw / 2, tTop); ctx.lineTo(lx - tw / 2, tBot + 20 * s); ctx.lineTo(rx + tw / 2, tBot + 20 * s); ctx.lineTo(rx + tw / 2, tTop);
    ctx.moveTo(lx + tw / 2, tTop); ctx.lineTo(lx + tw / 2, tBot); ctx.lineTo(rx - tw / 2, tBot); ctx.lineTo(rx - tw / 2, tTop); ctx.stroke();
    [[lx, yL], [rx, yR]].forEach(p => { ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.4; ctx.beginPath(); if (rho > 10000) ctx.arc(p[0], p[1] + 4 * s, tw / 2 - 3, Math.PI * 1.15, Math.PI * 1.85); else ctx.arc(p[0], p[1] - 4 * s, tw / 2 - 3, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); });
    const sx = (lx + rx) / 2, pxc = span / R;
    ctx.fillStyle = "rgb(250,244,214)"; ctx.fillRect(sx - 12 * s, mid - span / 2 - 6 * s, 24 * s, span + 12 * s); noteC(ctx, "rgb(250,244,214)", sx - 12 * s, mid - span / 2 - 6 * s, 24 * s, span + 12 * s);
    const step = R / 10;
    for (let i = -5; i <= 5; i++) { const y = mid - i * step * pxc; ctx.fillStyle = "rgba(60,52,32,0.85)"; ctx.fillRect(sx - 12 * s, y - 0.5, i % 5 ? 6 * s : 11 * s, 1); if (i % 5 === 0) RT(ctx, PL.fmt(i * step, step < 1 ? 1 : 0), sx + 6 * s, y + 3 * s, 8 * s, "rgba(60,52,32,0.95)", "center", 0); }
    D.line(ctx, lx, yL, rx + tw, yL, "rgba(224,71,60,0.7)", 1, [3, 3]); D.line(ctx, rx - tw, yR, rx + tw + 16 * s, yR, "rgba(224,71,60,0.7)", 1, [3, 3]);
    if (yL - yR > 8 * s) { D.arrow(ctx, rx + tw + 10 * s, yL, rx + tw + 10 * s, yR, { color: "#e0473c", width: 2, head: 6 }); D.arrow(ctx, rx + tw + 10 * s, yR, rx + tw + 10 * s, yL, { color: "#e0473c", width: 2, head: 6 }); }
    TX(ctx, "h = " + PL.fmt(h, h < 10 ? 2 : 1) + " cm", rx + tw + 18 * s, (yL + yR) / 2 + 4, 12, "left", "#e0473c");
    TX(ctx, "尺上單位 cm", sx, mid + span / 2 + 22 * s, 9.5, "center", PL.col("text-dim"), 0);
    const bxl = W * 0.14, byl = H * 0.46, sq = 1 - 0.32 * fr(dP, cfg.a);
    ctx.save(); ctx.strokeStyle = "rgb(60,40,34)"; ctx.lineWidth = 6 * s; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(bxl + 30 * s, byl); ctx.quadraticCurveTo(lx - 40 * s, byl - 10 * s, lx - 20 * s, tTop - 20 * s); ctx.quadraticCurveTo(lx, tTop - 34 * s, lx, tTop); ctx.stroke(); ctx.restore();
    const bg = ctx.createRadialGradient(bxl - 8 * s, byl - 10 * s, 4 * s, bxl, byl, 40 * s); bg.addColorStop(0, "rgb(214,80,70)"); bg.addColorStop(1, "rgb(120,28,24)");
    ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(bxl, byl, 34 * s * sq, 26 * s / Math.sqrt(sq), 0, 0, PL.TAU); ctx.fill();
    AP.hand(ctx, bxl - 6 * s, byl + 4 * s, 1, 0.8 * s, { pull: true, sleeve: "#3f7fcf" });
    TX(ctx, "捏橡皮球加壓 ΔP = " + PL.fmt(dP, 0) + " Pa", bxl, byl + 60 * s, 11, "center");
    TX(ctx, "右管通大氣", rx, tTop - 10 * s, 10, "center", PL.col("text-dim"), 0);
    TX(ctx, "管內液體：" + liq[0] + "（ρ = " + PL.fmt(rho, 0) + " kg/m³）", W - 16 * s, 42 * s, 11, "right");
    TX(ctx, "ΔP = ρ g h", W - 16 * s, 62 * s, 12.5, "right");
    label(ctx, 20, 18, "液面高度差", PL.fmt(h, h < 10 ? 2 : 1) + " cm", c);
  };

  /* 金屬比熱：把沸水中加熱過的金屬塊放進熱量計，看水溫升到多少 */
  SC["metal-specific-heat"] = k => {
    const { ctx, W, H, a: Tm, b: Tw, t, s, c, v: Te } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const hx = W * 0.14, kx = W * 0.42, bw = 70 * s, bh = 80 * s;
    const hp = AP.hotPlate(ctx, hx, benchY, 100 * s, (Tm - 30) / 150);
    AP.beaker(ctx, hx, hp, bw, bh, 0.72, Tm > 100 ? "#e0b060" : "#e8785a");
    AP.bubbles(ctx, hx - bw / 2 + 4 * s, hp - bh * 0.7, bw - 8 * s, bh * 0.68, t, Tm >= 95 ? 10 : 2, { speed: 40 });
    AP.calorimeter(ctx, kx, benchY, 76 * s, 86 * s, 0.8, "#6fb7e0", Te / 100);
    const cyc = 7, u = clamp((t % cyc - 1) / 2.2, 0, 1), ex = hx + (kx - hx) * u, ey = hp - bh * 0.38 - Math.sin(u * Math.PI) * 120 * s + u * (benchY - 86 * s * 0.4 - hp + bh * 0.38);
    AP.cord(ctx, ex, ey - 60 * s - Math.sin(u * Math.PI) * 10 * s, ex, ey - 12 * s);
    ctx.fillStyle = "rgb(150,156,166)"; AP.rrPath(ctx, ex - 13 * s, ey - 12 * s, 26 * s, 22 * s, 3 * s); ctx.fill(); ctx.strokeStyle = "rgba(40,44,52,0.6)"; ctx.lineWidth = 1; ctx.stroke();
    AP.heatWaves(ctx, ex - 14 * s, ey - 16 * s, 28 * s, 40 * s, t, u < 0.95 ? (Tm - 40) / 140 : 0);
    TX(ctx, "金屬塊 0.35 kg（" + PL.fmt(Tm, 0) + "°C）", hx, hp - bh - 60 * s, 11, "center", "#d0553a");
    TX(ctx, "水 0.25 kg（" + PL.fmt(Tw, 0) + "°C）", kx, benchY - 180 * s, 11, "center", "#2f7fd8");
    const x0 = W * 0.6, cw = W - x0 - 16 * s, y0 = 60 * s, ch = benchY - y0 - 30 * s;
    AP.infoCard(ctx, x0, y0, cw, ch);
    TX(ctx, "溫度比較（0–200°C）", x0 + 12 * s, y0 + 18 * s, 10.5);
    const gy0 = y0 + 36 * s, gy1 = y0 + ch - 34 * s, Y = T => gy1 - T / 200 * (gy1 - gy0);
    [[Tm, "金屬初溫", "#e0473c"], [Tw, "水初溫", "#2f7fd8"], [Te, "平衡溫度", "#46a36b"]].forEach((p, i) => {
      const x = x0 + cw * (0.2 + i * 0.3); AP.thermometer(ctx, x, gy0, gy1 + 10 * s, 12 * s, p[0] / 200);
      TX(ctx, PL.fmt(p[0], 1) + "°C", x, gy1 + 26 * s, 11, "center", p[2]); TX(ctx, p[1], x + 14 * s, Y(p[0]) + 4, 9.5, "left", null, 0);
    });
    TX(ctx, "金屬放熱 = 水吸熱：m金 c金 (T金 − T) = m水 c水 (T − T水)", W / 2, H - 12 * s, 11, "center");
    label(ctx, 20, 18, "平衡溫度", PL.fmt(Te, 1) + " °C", c);
  };

  /* 熱傳導：銅棒一端加熱，棒上用蠟黏的圖釘由熱端開始一顆顆掉落；溫差越大、棒越短，傳熱越快 */
  SC["heat-conduction"] = k => {
    const { ctx, W, H, a: dT, b: Lr, t, s, c, v: P, cfg } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const x0 = W * 0.18, rl = (130 + 440 * fr(Lr, cfg.b)) * s, x1 = x0 + rl, ry = benchY - 96 * s, rh = 12 * s;
    AP.standRod(ctx, x0 + rl * 0.5, benchY, ry - 10 * s); AP.clampHead(ctx, x0 + rl * 0.5, ry, 12 * s, Math.PI / 2);
    const Th = 20 + dT, col = T => { const q = clamp((T - 20) / 180, 0, 1); return "rgb(" + Math.round(190 + 60 * q) + "," + Math.round(120 - 50 * q) + "," + Math.round(70 - 30 * q) + ")"; };
    const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, col(Th)); g.addColorStop(1, col(20));
    ctx.fillStyle = g; AP.rrPath(ctx, x0, ry - rh / 2, rl, rh, rh / 2); ctx.fill(); ctx.strokeStyle = "rgba(90,50,20,0.6)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(x0 + 4, ry - rh / 2 + 2, rl - 8, 2);
    ctx.fillStyle = isL() ? "rgb(176,132,84)" : "rgb(112,84,54)"; ctx.fillRect(x0 - 16 * s, benchY - 14 * s, 52 * s, 14 * s);
    AP.alcoholLamp(ctx, x0 + 10 * s, benchY - 14 * s, 1.1 * s, 0.35 + 0.65 * fr(dT, cfg.a));
    const fss = clamp(1 - 35 / dT, 0, 1), tau = 0.6 + 3 * Math.pow(Lr / 2, 1.2), xm = fss * (1 - Math.exp(-(t % 12) / tau)), n = 7;
    for (let i = 0; i < n; i++) {
      const q = (i + 0.6) / (n + 0.2), x = x0 + q * rl, fallen = q < xm, drop = fallen ? Math.min(1, (xm - q) * 8) : 0;
      ctx.fillStyle = "rgba(250,244,220,0.95)"; ctx.beginPath(); ctx.ellipse(x, ry + rh / 2 + 2 * s, 5 * s, (fallen ? 1.5 : 4) * s, 0, 0, PL.TAU); ctx.fill();
      const ty = ry + rh / 2 + 8 * s + drop * (benchY - ry - 20 * s);
      ctx.fillStyle = "rgb(200,60,50)"; ctx.beginPath(); ctx.arc(x, ty, 4 * s, 0, PL.TAU); ctx.fill(); ctx.fillStyle = "rgb(170,176,186)"; ctx.fillRect(x - 0.8 * s, ty - 10 * s, 1.6 * s, 8 * s);
    }
    AP.flowDots(ctx, [{ x: x0 + 20 * s, y: ry }, { x: x1 - 6 * s, y: ry }], t, 10 + 90 * clamp(P / 10, 0, 1), { color: "rgba(255,230,140,0.95)", gap: 26 * s, r: 2.4 * s });
    AP.thermometer(ctx, x0 + 26 * s, ry - 80 * s, ry - 8 * s, 8 * s, Th / 200); AP.thermometer(ctx, x1 - 16 * s, ry - 80 * s, ry - 8 * s, 8 * s, 20 / 200);
    TX(ctx, PL.fmt(Th, 0) + "°C", x0 + 38 * s, ry - 70 * s, 11, "left", "#d0553a"); TX(ctx, "20°C", x1 - 4 * s, ry - 70 * s, 11, "left", "#2f7fd8");
    const yd = ry - 30 * s;
    D.arrow(ctx, x0, yd, x1, yd, { color: PL.col("text-dim"), width: 1.3, head: 5 }); D.arrow(ctx, x1, yd, x0, yd, { color: PL.col("text-dim"), width: 1.3, head: 5 });
    TX(ctx, "銅棒長 L = " + PL.fmt(Lr, 2) + " m", (x0 + x1) / 2, yd - 8 * s, 11, "center");
    TX(ctx, "蠟融化，圖釘由熱端開始掉落", W - 16 * s, benchY + 22 * s, 10.5, "right", PL.col("text-dim"), 0);
    TX(ctx, "P = kAΔT / L（銅 k = 205 W/m·K）", W - 16 * s, 42 * s, 11.5, "right");
    label(ctx, 20, 18, "導熱功率", PL.fmt(P, 2) + " W", c);
  };

  /* 地震定位：測站記錄到 P 波與 S 波的時間差，換算震源距離；三個測站的圓交於一點就是震央 */
  SC["seismic-triangulation"] = k => {
    const { ctx, W, H, a: dt, b: vp, t, s, c, v: d } = k;
    const L = isL(), mx0 = 16 * s, my0 = 78 * s, mw = W * 0.48, mh = H - my0 - 16 * s;
    AP.labRoom(ctx, W, H, H * 0.94, { bench: "none" });
    ctx.fillStyle = L ? "#bfe0f2" : "#16324a"; AP.rrPath(ctx, mx0, my0, mw, mh, 8 * s); ctx.fill(); noteC(ctx, L ? "#bfe0f2" : "#16324a", mx0, my0, mw, mh);
    ctx.save(); AP.rrPath(ctx, mx0, my0, mw, mh, 8 * s); ctx.clip();
    ctx.fillStyle = L ? "#cfe3b4" : "#2c4230"; ctx.beginPath(); ctx.moveTo(mx0 + mw * 0.25, my0); ctx.bezierCurveTo(mx0 + mw * 0.1, my0 + mh * 0.3, mx0 + mw * 0.3, my0 + mh * 0.6, mx0 + mw * 0.2, my0 + mh); ctx.lineTo(mx0 + mw, my0 + mh); ctx.lineTo(mx0 + mw, my0); ctx.closePath(); ctx.fill();
    const Rk = niceCeil(d * 1.5), ppk = Math.min(mw, mh) * 0.46 / Rk, ax = mx0 + mw * 0.62, ay = my0 + mh * 0.42;
    const P = (x, y) => ({ x: ax + x * ppk, y: ay + y * ppk }), E = P(-d * Math.cos(0.55), d * Math.sin(0.55)), B = P(0.55 * Rk, 0.75 * Rk), C = P(0.5 * Rk, -0.8 * Rk), A = P(0, 0);
    [[A, "#e0473c", "A"], [B, "#2f7fd8", "B"], [C, "#46a36b", "C"]].forEach(q => { const r = Math.hypot(E.x - q[0].x, E.y - q[0].y); ctx.strokeStyle = q[1]; ctx.lineWidth = q[2] === "A" ? 2.4 : 1.4; ctx.setLineDash(q[2] === "A" ? [] : [5, 4]); ctx.beginPath(); ctx.arc(q[0].x, q[0].y, r, 0, PL.TAU); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = q[1]; ctx.beginPath(); ctx.moveTo(q[0].x, q[0].y - 7 * s); ctx.lineTo(q[0].x - 6 * s, q[0].y + 4 * s); ctx.lineTo(q[0].x + 6 * s, q[0].y + 4 * s); ctx.closePath(); ctx.fill(); TX(ctx, "測站 " + q[2], q[0].x + 8 * s, q[0].y - 6 * s, 10.5, "left", q[1]); });
    const pul = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.fillStyle = "rgba(224,71,60," + (0.25 + 0.4 * pul).toFixed(2) + ")"; ctx.beginPath(); ctx.arc(E.x, E.y, (6 + 6 * pul) * s, 0, PL.TAU); ctx.fill();
    TX(ctx, "✶ 震央", E.x, E.y + 22 * s, 11, "center", "#c0392b");
    ctx.restore();
    ctx.fillStyle = PL.col("text"); const sb = Rk / 2, sbx = mx0 + 14 * s, sby = my0 + mh - 16 * s; ctx.fillRect(sbx, sby, sb * ppk, 3 * s);
    TX(ctx, PL.fmt(sb, 0) + " km", sbx + sb * ppk + 6 * s, sby + 5 * s, 10, "left");
    TX(ctx, "測站 A 的圓：半徑 = 震源距離 " + PL.fmt(d, 0) + " km", mx0 + mw / 2, my0 - 10 * s, 11, "center");
    const dx0 = W * 0.54, dw = W - dx0 - 16 * s, dy0 = 90 * s, dh = H * 0.5;
    AP.infoCard(ctx, dx0, dy0, dw, dh);
    const Tm = niceCeil(dt * 1.8 + 10), X = tm => dx0 + 14 * s + tm / Tm * (dw - 28 * s), cyM = dy0 + dh * 0.5, tP = Tm * 0.15, now = (t * Tm / 6) % (Tm * 1.1);
    ctx.save(); ctx.strokeStyle = PL.col("text"); ctx.lineWidth = 1.3; ctx.beginPath();
    for (let i = 0; i <= 420; i++) { const tm = Tm * i / 420; if (tm > now) break; let y = Math.sin(tm * 37) * 1.2 * s; if (tm > tP) y += Math.sin((tm - tP) * 9) * 10 * s * Math.exp(-(tm - tP) / 12); if (tm > tP + dt) y += Math.sin((tm - tP - dt) * 5) * 30 * s * Math.exp(-(tm - tP - dt) / 18); i ? ctx.lineTo(X(tm), cyM + y) : ctx.moveTo(X(tm), cyM + y); }
    ctx.stroke(); ctx.restore();
    D.line(ctx, X(tP), dy0 + 20 * s, X(tP), dy0 + dh - 20 * s, "#2f7fd8", 1.2, [4, 3]); D.line(ctx, X(tP + dt), dy0 + 20 * s, X(tP + dt), dy0 + dh - 20 * s, "#e0473c", 1.2, [4, 3]);
    TX(ctx, "P 波到", X(tP) + 4 * s, dy0 + 30 * s, 10, "left", "#2f7fd8"); TX(ctx, "S 波到", X(tP + dt) + 4 * s, dy0 + 30 * s, 10, "left", "#e0473c");
    D.arrow(ctx, X(tP), dy0 + dh - 26 * s, X(tP + dt), dy0 + dh - 26 * s, { color: PL.col("text-dim"), width: 1.4, head: 5 });
    TX(ctx, "到時差 " + PL.fmt(dt, 0) + " s", (X(tP) + X(tP + dt)) / 2, dy0 + dh - 32 * s, 10.5, "center");
    TX(ctx, "測站 A 的地震儀紀錄（時間軸 0–" + Tm + " s）", dx0 + dw / 2, dy0 - 10 * s, 11, "center");
    TX(ctx, "d = Δt ÷ (1/vₛ − 1/vₚ)，vₛ = 3.6 km/s", W - 16 * s, dy0 + dh + 26 * s, 11, "right");
    TX(ctx, "P 波速度 vₚ = " + PL.fmt(vp, 1) + " km/s", W - 16 * s, dy0 + dh + 46 * s, 11, "right", PL.col("text-dim"), 0);
    label(ctx, 20, 12, "測站距離", PL.fmt(d, 0) + " km", c);
  };

  /* 弦的諧波：弦音計上的弦同時以基頻與倍頻振動，頻譜儀看到一排整數倍的峰 */
  const NOTE = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
  SC["string-harmonic-spectrum"] = k => {
    const { ctx, W, H, a: Ls, b: T, t, s, c, v: f1, cfg } = k;
    const benchY = H * 0.5;
    AP.labRoom(ctx, W, H, benchY + 60 * s, {});
    const bx0 = W * 0.05, bx1 = W * 0.82, ppm = (bx1 - bx0 - 60 * s) / 2.5, xa = bx0 + 30 * s, xb = xa + Ls * ppm, sy = benchY - 20 * s;
    const bg = ctx.createLinearGradient(0, benchY - 6 * s, 0, benchY + 50 * s); bg.addColorStop(0, "rgb(214,164,100)"); bg.addColorStop(1, "rgb(150,100,52)");
    ctx.fillStyle = bg; ctx.fillRect(bx0, benchY - 6 * s, bx1 - bx0, 56 * s); ctx.strokeStyle = "rgba(90,56,24,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(bx0, benchY - 6 * s, bx1 - bx0, 56 * s);
    ctx.fillStyle = "rgba(60,36,14,0.8)"; ctx.beginPath(); ctx.ellipse((bx0 + bx1) / 2, benchY + 22 * s, 16 * s, 10 * s, 0, 0, PL.TAU); ctx.fill();
    for (let m = 0; m <= 2.5; m += 0.1) { const x = xa + m * ppm, mj = Math.abs(m - Math.round(m * 2) / 2) < 0.01; ctx.fillStyle = "rgba(60,36,14,0.8)"; ctx.fillRect(x - 0.5, benchY - 6 * s, 1, mj ? 8 * s : 4 * s); if (Math.abs(m - Math.round(m)) < 0.01) RT(ctx, Math.round(m) + " m", x, benchY + 12 * s, 9 * s, "rgba(50,30,10,0.9)", "center", 0); }
    [[xa, "固定"], [xb, "可動琴橋"]].forEach(q => { ctx.fillStyle = "rgb(236,230,214)"; AP.poly(ctx, [{ x: q[0] - 6 * s, y: benchY - 6 * s }, { x: q[0], y: sy }, { x: q[0] + 6 * s, y: benchY - 6 * s }], "rgb(236,230,214)", "rgba(80,60,30,0.6)"); });
    TX(ctx, "可動琴橋", xb, sy - 34 * s, 10, "center", PL.col("text-dim"), 0);
    const pr = 12 * s, px = bx1 + 4 * s, py = sy + pr;
    AP.pulley(ctx, px, py, pr);
    ctx.strokeStyle = "rgb(214,200,160)"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(xb, sy); ctx.lineTo(px, sy); ctx.stroke();
    const nd = clamp(Math.round(T / 20), 1, 12);
    AP.cord(ctx, px + pr, py, px + pr, benchY + 60 * s);
    for (let i = 0; i < nd; i++) AP.weight(ctx, px + pr, benchY + 64 * s + i * 6 * s, 30 * s, 5.5 * s, null);
    TX(ctx, "張力 T = " + PL.fmt(T, 0) + " N", px - 10 * s, benchY + 80 * s, 10.5, "right");
    const fv = 1.2, A = [18, 8, 5, 3.4].map(q => q * s);
    ctx.save(); ctx.strokeStyle = "rgb(226,214,176)"; ctx.lineWidth = 2; ctx.shadowColor = "rgba(255,240,200,0.4)"; ctx.shadowBlur = 4; ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const u = i / 120, x = xa + u * (xb - xa); let y = 0; for (let n = 1; n <= 4; n++) y += A[n - 1] * Math.sin(n * Math.PI * u) * Math.cos(PL.TAU * fv * n * t * 0.5 + n); i ? ctx.lineTo(x, sy + y) : ctx.moveTo(x, sy + y); }
    ctx.stroke(); ctx.restore();
    const cx0 = W * 0.08, cy0 = benchY + 110 * s, cw = W * 0.6, ch = H - cy0 - 14 * s;
    ctx.fillStyle = "rgb(16,22,32)"; AP.rrPath(ctx, cx0, cy0, cw, ch, 8 * s); ctx.fill(); noteC(ctx, "rgb(16,22,32)", cx0, cy0, cw, ch);
    const Fm = niceCeil(f1 * 4.6), X = f => cx0 + 20 * s + f / Fm * (cw - 40 * s), yb = cy0 + ch - 22 * s, hb = ch - 50 * s;
    ctx.strokeStyle = "rgba(190,205,225,0.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx0 + 20 * s, yb); ctx.lineTo(cx0 + cw - 20 * s, yb); ctx.stroke();
    for (let n = 1; n <= 4; n++) { const x = X(n * f1), hh = hb / n; ctx.fillStyle = n === 1 ? "rgb(255,196,90)" : "rgb(110,200,255)"; ctx.fillRect(x - 4 * s, yb - hh, 8 * s, hh); D.text(ctx, n === 1 ? "f₁" : n + "f₁", x, yb - hh - 6 * s, { color: "rgba(220,230,244,0.9)", size: 10, align: "center", weight: "700" }); D.text(ctx, PL.fmt(n * f1, 0), x, yb + 14 * s, { color: "rgba(190,205,225,0.8)", size: 9, align: "center" }); }
    D.text(ctx, "頻譜（Hz）", cx0 + 12 * s, cy0 + 16 * s, { color: "rgba(214,224,240,0.9)", size: 10.5, weight: "700" });
    const nn = Math.round(12 * Math.log2(f1 / 440)) + 57, pc = ((nn % 12) + 12) % 12;
    TX(ctx, "基頻 f₁ = √(T/μ) / 2L", W - 16 * s, 42 * s, 12, "right");
    TX(ctx, "音高約 " + NOTE[pc] + Math.floor(nn / 12), W - 16 * s, cy0 + 20 * s, 12, "right");
    TX(ctx, "弦長 L = " + PL.fmt(Ls, 2) + " m", W - 16 * s, cy0 + 42 * s, 11, "right", PL.col("text-dim"), 0);
    label(ctx, 20, 18, "基頻 f₁", PL.fmt(f1, 1) + " Hz", c);
  };

  /* 噪音屏障：公路噪音向外擴散，距離越遠越小；隔音牆再擋掉一部分 */
  SC["noise-barrier"] = k => {
    const { ctx, W, H, a: r, b: IL, t, s, c, v: I, cfg } = k;
    const L = isL(), gy = H * 0.78;
    AP.outdoor(ctx, W, H, gy, { t, hills: true, sunX: W * 0.7 });
    AP.road(ctx, 0, W * 0.24, gy - 2, 18 * s, { laneAt: 0.5, offset: t * 80 });
    const cx = ((t * 90 * s) % (W * 0.3)) - 30 * s;
    AP.car(ctx, cx, gy + 4 * s, 70 * s, { color: "#e0843a", facing: 1, roll: t * 8, kind: "truck" });
    const wx = W * 0.28, wh = (8 + 104 * fr(IL, cfg.b)) * s, sx = W * 0.12, sy = gy - 20 * s;
    const hx = wx + 40 * s + (W - wx - 110 * s) * Math.log10(r / 5) / Math.log10(32), hwid = 58 * s;
    ctx.save(); ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const rr = ((t * 90 * s + i * 50 * s) % (W * 0.9)); const a0 = rr / (W * 0.9); ctx.strokeStyle = `rgba(224,110,60,${(0.55 * (1 - a0)).toFixed(2)})`; ctx.beginPath(); ctx.arc(sx, sy, rr, -0.95, 0); ctx.stroke();
      if (rr > wx - sx && IL > 1) { const r2 = rr - (wx - sx); ctx.strokeStyle = `rgba(224,110,60,${(0.55 * (1 - a0) * Math.pow(10, -IL / 20)).toFixed(3)})`; ctx.beginPath(); ctx.arc(wx, gy - wh, r2, -1.2, 1.1); ctx.stroke(); } }
    ctx.restore();
    if (IL > 0.5) { const wg = ctx.createLinearGradient(wx, 0, wx + 12 * s, 0); wg.addColorStop(0, "rgb(150,160,170)"); wg.addColorStop(1, "rgb(110,118,128)"); ctx.fillStyle = wg; ctx.fillRect(wx, gy - wh, 12 * s, wh); ctx.strokeStyle = "rgba(40,44,52,0.5)"; ctx.lineWidth = 1; for (let y = gy - wh + 10 * s; y < gy; y += 12 * s) { ctx.beginPath(); ctx.moveTo(wx, y); ctx.lineTo(wx + 12 * s, y); ctx.stroke(); } noteC(ctx, "rgb(130,140,150)", wx, gy - wh, 12 * s, wh); }
    ctx.fillStyle = L ? "#f1e6d2" : "#3d3a36"; ctx.fillRect(hx, gy - 44 * s, hwid, 44 * s);
    AP.poly(ctx, [{ x: hx - 6 * s, y: gy - 44 * s }, { x: hx + hwid / 2, y: gy - 70 * s }, { x: hx + hwid + 6 * s, y: gy - 44 * s }], L ? "#b05a3e" : "#6a3024");
    ctx.fillStyle = L ? "rgb(120,160,200)" : "rgb(255,210,120)"; ctx.fillRect(hx + 8 * s, gy - 34 * s, 14 * s, 12 * s); ctx.fillRect(hx + hwid - 22 * s, gy - 34 * s, 14 * s, 12 * s);
    AP.lcd(ctx, hx - 6 * s, gy - 104 * s, 80 * s, 22 * s, PL.fmt(I, I < 1 ? 3 : 1) + "%", { color: "rgb(255,190,110)" });
    TX(ctx, "聲強計", hx - 12 * s, gy - 88 * s, 10.5, "right");
    D.arrow(ctx, sx, gy + 30 * s, hx + hwid / 2, gy + 30 * s, { color: PL.col("text-dim"), width: 1.3, head: 5 });
    TX(ctx, "距離 r = " + PL.fmt(r, 0) + " m（對數刻度）", (sx + hx) / 2, gy + 48 * s, 11, "center");
    if (IL > 0.5) TX(ctx, "隔音牆 −" + PL.fmt(IL, 0) + " dB", wx + 6 * s, gy - wh - 10 * s, 10.5, "center");
    TX(ctx, "比 1 m 處小約 " + PL.fmt(-10 * Math.log10(Math.max(I, 1e-9) / 100), 0) + " dB", W - 16 * s, 62 * s, 11, "right");
    TX(ctx, "聲強 ∝ 1/r²，再乘上屏障的衰減", W - 16 * s, 42 * s, 11.5, "right");
    label(ctx, 20, 18, "相對聲強", PL.fmt(I, I < 1 ? 3 : 2) + " %", c);
  };

  /* 透鏡組合：凸透鏡與凹透鏡貼在一起，平行光匯聚到新的焦點；虛線是只用凸透鏡時的焦點 */
  SC["lens-combination"] = k => {
    const { ctx, W, H, a: f1, b: f2, t, s, c, v: fe } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const ay = H * 0.44, lbx = W * 0.14, xl = W * 0.3, ppc = (W - xl - 24 * s) / 250, xf1 = xl + f1 * ppc, xfe = xl + fe * ppc;
    AP.bench(ctx, 30 * s, W - 20 * s, benchY - 30 * s, { pxPerCm: ppc, cm0: 0, h: 22 * s });
    AP.lampHouse(ctx, lbx, ay, 1.2 * s);
    const hs = [-0.8, -0.4, 0, 0.4, 0.8].map(q => q * 50 * s);
    ctx.save(); ctx.lineWidth = 1.6;
    hs.forEach(h => {
      ctx.strokeStyle = "rgba(255,210,90,0.9)"; ctx.beginPath(); ctx.moveTo(lbx + 4 * s, ay + h); ctx.lineTo(xl, ay + h); ctx.stroke();
      ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(255,210,90,0.35)"; ctx.beginPath(); ctx.moveTo(xl, ay + h); ctx.lineTo(xf1, ay); ctx.stroke(); ctx.setLineDash([]);
      const ex = W - 20 * s, ey = ay + h + (ay - (ay + h)) * (ex - xl) / (xfe - xl);
      ctx.strokeStyle = "rgba(255,190,60,0.95)"; ctx.beginPath(); ctx.moveTo(xl + 8 * s, ay + h); ctx.lineTo(ex, ey); ctx.stroke();
    });
    ctx.restore();
    AP.lens(ctx, xl, ay, 64 * s, true); AP.lens(ctx, xl + 12 * s, ay, 64 * s, false);
    [xl, xl + 12 * s].forEach(x => AP.steel(ctx, x - 2 * s, ay + 66 * s, 4 * s, benchY - 30 * s - ay - 66 * s, 10));
    ctx.fillStyle = "rgb(255,240,160)"; ctx.shadowColor = "rgba(255,220,100,0.9)"; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(xfe, ay, 4 * s, 0, PL.TAU); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,210,90,0.6)"; ctx.beginPath(); ctx.arc(xf1, ay, 3 * s, 0, PL.TAU); ctx.fill();
    TX(ctx, "組合焦點 F", xfe, ay - 14 * s, 11, "center", "#e0843a");
    TX(ctx, "只有凸透鏡：" + PL.fmt(f1, 0) + " cm", xf1, ay + 76 * s, 10, "center", PL.col("text-dim"), 0);
    TX(ctx, "凸 f₁ = " + PL.fmt(f1, 0) + " cm　凹 f₂ = " + PL.fmt(f2, 0) + " cm", xl, ay - 80 * s, 11, "center");
    D.arrow(ctx, xl, ay + 94 * s, xfe, ay + 94 * s, { color: "#e0843a", width: 1.6, head: 6 });
    TX(ctx, "等效焦距 " + PL.fmt(fe, 1) + " cm", (xl + xfe) / 2, ay + 110 * s, 11, "center", "#e0843a");
    TX(ctx, "1/f = 1/f₁ + 1/f₂（兩片貼近）", W - 16 * s, 42 * s, 12, "right");
    label(ctx, 20, 18, "等效焦距", PL.fmt(fe, 1) + " cm", c);
  };

  /* 照度反平方：同樣的光落在越遠的面上，面積按 r² 放大，照度按 1/r² 變小 */
  SC["photometry-inverse-square"] = k => {
    const { ctx, W, H, a: r, b: Iv, t, s, c, v: E, cfg } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const bx = W * 0.08, by = H * 0.44, br = fr(Iv, cfg.b), X = rr => rr <= 4 ? bx + rr * W * 0.13 : bx + W * 0.52 + (rr - 4) / 12 * W * 0.34, ppm = W * 0.13;
    AP.steel(ctx, bx - 3 * s, by + 14 * s, 6 * s, benchY - by - 14 * s, 10);
    AP.bulb(ctx, bx, by, 14 * s, 0.3 + 0.7 * br);
    const u = 40 * s, frame = m => { const x = bx + m * ppm, hh = u * m, ww = hh * 0.22, sk = hh * 0.16; return (qi, qj) => ({ x: x + ww * qj / m, y: by - hh / 2 + hh * qi / m + sk * (qj / m - 0.5) }); };
    [1, 2, 3].forEach(m => {
      const P = frame(m), a = (0.12 + 0.55 * br) / (m * m);
      for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) AP.poly(ctx, [P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j)], `rgba(255,236,150,${a.toFixed(3)})`, "rgba(190,150,60,0.6)");
      TX(ctx, m + " m：" + (m * m) + " 格", bx + m * ppm + 6 * s, by + u * m / 2 + 22 * s, 10, "center", PL.col("text-dim"), 0);
    });
    const P3 = frame(3);
    ctx.save(); ctx.strokeStyle = "rgba(230,190,80,0.55)"; ctx.lineWidth = 1; [P3(0, 0), P3(0, 3), P3(3, 0), P3(3, 3)].forEach(q => { ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(q.x, q.y); ctx.stroke(); }); ctx.restore();
    const mx = X(clamp(r, 0.5, 16));
    ctx.fillStyle = "rgb(40,44,52)"; AP.rrPath(ctx, mx - 8 * s, by - 20 * s, 16 * s, 40 * s, 3 * s); ctx.fill();
    ctx.fillStyle = "rgb(236,240,246)"; ctx.beginPath(); ctx.arc(mx - 8 * s, by, 7 * s, Math.PI / 2, Math.PI * 1.5); ctx.fill();
    AP.steel(ctx, mx - 2 * s, by + 20 * s, 4 * s, benchY - by - 20 * s, 10);
    AP.cable(ctx, [{ x: mx + 8 * s, y: by + 10 * s }, { x: mx + 30 * s, y: benchY - 30 * s }], "rgb(40,44,52)", 2 * s, 4);
    AP.lcd(ctx, Math.min(mx + 14 * s, W - 120 * s), benchY - 52 * s, 104 * s, 24 * s, PL.fmt(E, E < 10 ? 2 : 0) + " lx", { color: "rgb(255,220,110)" });
    [0, 1, 2, 3, 4, 8, 12, 16].forEach(m => { const x = X(m); ctx.fillStyle = PL.col("text-dim"); ctx.fillRect(x - 0.5, benchY + 4 * s, 1, 8 * s); TX(ctx, m + (m === 16 ? " m" : ""), x, benchY + 24 * s, 9.5, "center", PL.col("text-dim"), 0); });
    TX(ctx, "≈", X(4) + 18 * s, benchY + 24 * s, 12, "center", PL.col("text-dim"), 0);
    TX(ctx, "照度計在 r = " + PL.fmt(r, 1) + " m", mx, by - 30 * s, 11, "center");
    TX(ctx, "E = I / r²（光源 " + PL.fmt(Iv, 0) + " cd）", W - 16 * s, 42 * s, 12, "right");
    TX(ctx, "距離 ×2 → 光攤在 4 倍面積上 → 照度 ÷4", W - 16 * s, 62 * s, 10.5, "right", PL.col("text-dim"), 0);
    label(ctx, 20, 18, "照度 E", PL.fmt(E, E < 10 ? 2 : 1) + " lx", c);
  };

  /* 分光計量折射率：光對稱穿過稜鏡時偏向角最小；由頂角 A 與最小偏向角 Dₘ 算 n */
  SC["prism-spectrometer"] = k => {
    const { ctx, W, H, a: A, b: Dm, t, s, c, v: n } = k;
    AP.deskTop(ctx, 0, 0, W, H);
    const cx = W * 0.4, cy = H * 0.56, Rt = Math.min(H * 0.4, 170 * s), ra = A * Math.PI / 180, rd = Dm * Math.PI / 180;
    ctx.fillStyle = "rgb(58,62,70)"; ctx.beginPath(); ctx.arc(cx, cy, Rt, 0, PL.TAU); ctx.fill();
    ctx.strokeStyle = "rgb(200,206,214)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, Rt - 4 * s, 0, PL.TAU); ctx.stroke();
    noteC(ctx, "rgb(58,62,70)", cx - Rt * 0.7, cy - Rt * 0.7, Rt * 1.4, Rt * 1.4);
    for (let d = 0; d < 360; d += 5) { const a = d * Math.PI / 180, r1 = Rt - (d % 30 ? 10 : 18) * s; ctx.strokeStyle = "rgba(230,236,244,0.7)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * (Rt - 5 * s), cy + Math.sin(a) * (Rt - 5 * s)); ctx.stroke(); }
    const Lp = 120 * s, P0 = { x: cx, y: cy - Lp * 0.55 }, B1 = { x: P0.x - Lp * Math.sin(ra / 2), y: P0.y + Lp * Math.cos(ra / 2) }, B2 = { x: P0.x + Lp * Math.sin(ra / 2), y: B1.y };
    const yi = P0.y + (B1.y - P0.y) * 0.55, fx = y => P0.x - (y - P0.y) * Math.tan(ra / 2), pin = { x: fx(yi), y: yi }, pout = { x: 2 * cx - pin.x, y: yi };
    const din = { x: Math.cos(rd / 2), y: -Math.sin(rd / 2) }, dout = { x: Math.cos(rd / 2), y: Math.sin(rd / 2) }, Lr = Rt * 1.25;
    const src = { x: pin.x - din.x * Lr, y: pin.y - din.y * Lr };
    ctx.save(); ctx.lineWidth = 3 * s; ctx.strokeStyle = "rgba(255,250,230,0.95)"; ctx.shadowColor = "rgba(255,250,220,0.8)"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(src.x, src.y); ctx.lineTo(pin.x, pin.y); ctx.lineTo(pout.x, pout.y); ctx.stroke(); ctx.restore();
    ["#ff4a3a", "#ffa030", "#ffe040", "#40d060", "#4080ff", "#9050ff"].forEach((col, i) => { const da = (i - 2.5) * 0.012, ang = rd / 2 + da; ctx.strokeStyle = col; ctx.lineWidth = 2 * s; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(pout.x, pout.y); ctx.lineTo(pout.x + Math.cos(ang) * Lr, pout.y + Math.sin(ang) * Lr); ctx.stroke(); ctx.globalAlpha = 1; });
    AP.prismGlass(ctx, P0, B1, B2);
    const tube = (p, d, len, lab) => { const ang = Math.atan2(d.y, d.x); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang); AP.steel(ctx, 0, -9 * s, len, 18 * s, 8); AP.brass(ctx, len - 8 * s, -11 * s, 10 * s, 22 * s); ctx.restore(); TX(ctx, lab, p.x + d.x * len * 0.5, p.y + d.y * len * 0.5 - 18 * s, 10.5, "center"); };
    tube({ x: pin.x - din.x * Rt * 1.28, y: pin.y - din.y * Rt * 1.28 }, din, Rt * 0.55, "平行光管");
    tube({ x: pout.x + dout.x * Rt * 0.75, y: pout.y + dout.y * Rt * 0.75 }, dout, Rt * 0.6, "望遠鏡");
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(pin.x, pin.y); ctx.lineTo(pin.x + din.x * Lr * 0.8, pin.y + din.y * Lr * 0.8); ctx.stroke(); ctx.restore();
    const X0 = (pin.x + pout.x) / 2, vy = yi - (X0 - pin.x) * Math.tan(rd / 2), rr = Rt * 0.75;
    ctx.strokeStyle = "#ffcf5a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X0, vy, rr * 0.5, -rd / 2, rd / 2); ctx.stroke();
    D.text(ctx, "Dₘ = " + PL.fmt(Dm, 0) + "°", X0 + rr * 0.54, vy + 4, { color: "#ffcf5a", size: 11.5, weight: "700" });
    ctx.strokeStyle = "#8fd0ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P0.x, P0.y, 22 * s, Math.PI / 2 - ra / 2, Math.PI / 2 + ra / 2); ctx.stroke();
    TX(ctx, "A = " + PL.fmt(A, 0) + "°", P0.x, P0.y - 10 * s, 11, "center", "#1c7fc0");
    TX(ctx, "n = sin[(A + Dₘ)/2] ÷ sin(A/2)", W - 16 * s, 42 * s, 12, "right");
    TX(ctx, n < 1.4 ? "像水" : n < 1.55 ? "像一般玻璃" : n < 1.8 ? "像重火石玻璃" : "折射率很大（像鑽石）", W - 16 * s, 62 * s, 11, "right", PL.col("text-dim"), 0);
    label(ctx, 20, 18, "折射率 n", PL.fmt(n, 3), c);
  };


  /* 分壓器：滑動變阻器接在電源兩端，滑片與接地端之間取出的電壓 = Vᵢₙ × R₂/(R₁+R₂) */
  SC["voltage-divider"] = k => {
    const { ctx, W, H, a: Vin, b: q, t, s, c, v: Vo, cfg } = k;
    const benchY = H * 0.8;
    AP.labRoom(ctx, W, H, benchY, {});
    const ps = AP.powerSupply(ctx, 20 * s, benchY - 74 * s, 140 * s, 72 * s, PL.fmt(Vin, 1) + " V", { label: "電源 Vᵢₙ", knob: fr(Vin, cfg.a) });
    const rx = W * 0.44, rw = 250 * s, rh = AP.rheostat(ctx, rx, benchY, rw, q), p = rh.posts;
    const dl = AP.dial(ctx, W * 0.8, benchY - 150 * s, 48 * s, Vo / 24, { max: 24, unit: "V", majors: 4 });
    AP.cable(ctx, [ps.red, { x: ps.red.x, y: benchY + 16 * s }, { x: p.tubeR.x, y: benchY + 16 * s }, p.tubeR], "rgb(186,54,48)", 2.6 * s, 3);
    AP.cable(ctx, [ps.black, { x: ps.black.x, y: benchY + 28 * s }, { x: p.tubeL.x - 20 * s, y: benchY + 28 * s }, p.tubeL], "rgb(40,44,52)", 2.6 * s, 3);
    AP.cable(ctx, [p.rodR, { x: dl.red.x, y: p.rodR.y - 30 * s }, dl.red], "rgb(186,54,48)", 2.4 * s, 4);
    AP.cable(ctx, [p.tubeL, { x: p.tubeL.x - 14 * s, y: benchY - 92 * s }, { x: dl.black.x, y: benchY - 92 * s }, dl.black], "rgb(40,44,52)", 2.4 * s, 4);
    const bxl = W * 0.8, byl = benchY - 40 * s;
    AP.cable(ctx, [dl.red, { x: dl.red.x, y: byl + 16 * s }, { x: bxl + 8 * s, y: byl + 16 * s }], "rgb(186,54,48)", 2 * s, 2); AP.cable(ctx, [{ x: dl.black.x, y: benchY - 92 * s }, { x: bxl - 8 * s, y: byl + 16 * s }], "rgb(40,44,52)", 2 * s, 2);
    AP.bulb(ctx, bxl, byl, 14 * s, clamp(Vo / 12, 0, 1));
    TX(ctx, "小燈泡接在輸出", bxl, byl + 36 * s, 10, "center", PL.col("text-dim"), 0);
    const ya = benchY - 64 * s, xs = rh.slider.x, xl = rx - rw / 2 + 8 * s, xr = rx + rw / 2 - 8 * s;
    [[xl, xs, "R₂（輸出這段）", "#2f7fd8"], [xs, xr, "R₁", "#d0553a"]].forEach(r => { if (r[1] - r[0] > 16 * s) { D.line(ctx, r[0], ya, r[1], ya, r[3], 2); D.line(ctx, r[0], ya - 5 * s, r[0], ya + 5 * s, r[3], 2); D.line(ctx, r[1], ya - 5 * s, r[1], ya + 5 * s, r[3], 2); } TX(ctx, r[2], (r[0] + r[1]) / 2, ya - 8 * s, 10.5, "center", r[3]); });
    TX(ctx, "Vₒᵤₜ = Vᵢₙ × R₂/(R₁+R₂) = " + PL.fmt(Vo, 2) + " V", W - 16 * s, 42 * s, 12, "right");
    TX(ctx, "音量旋鈕、光感測器都用分壓原理", W - 16 * s, 62 * s, 10.5, "right", PL.col("text-dim"), 0);
    label(ctx, 20, 18, "輸出電壓 Vₒᵤₜ", PL.fmt(Vo, 2) + " V", c);
  };

  /* RC 延時電路：電容經電阻慢慢充電，電壓超過 6 V 時 LED 亮起 */
  SC["rc-timer"] = k => {
    const { ctx, W, H, a: tm, b: tau, t, s, c, v: Vc } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const bx = 20 * s, bw = W * 0.44, by = benchY - 170 * s, bh = 160 * s;
    ctx.fillStyle = "rgb(246,246,240)"; AP.rrPath(ctx, bx, by, bw, bh, 6 * s); ctx.fill(); noteC(ctx, "rgb(246,246,240)", bx, by, bw, bh);
    ctx.fillStyle = "rgba(120,120,110,0.45)"; for (let yy = by + 12 * s; yy < by + bh - 6 * s; yy += 9 * s) for (let xx = bx + 10 * s; xx < bx + bw - 6 * s; xx += 9 * s) ctx.fillRect(xx, yy, 2 * s, 2 * s);
    const on = Vc >= 6, T = by + 38 * s, B = by + bh - 30 * s, x1 = bx + 40 * s, x2 = bx + bw * 0.5, x3 = bx + bw - 40 * s;
    AP.wire(ctx, [{ x: x1, y: B }, { x: x1, y: T }, { x: x3, y: T }, { x: x3, y: B }, { x: x1, y: B }], "rgb(186,54,48)", 2.4 * s);
    ctx.save(); ctx.translate(x1, (T + B) / 2); ctx.rotate(-Math.PI / 2); AP.battery(ctx, -26 * s, -16 * s, 52 * s, 32 * s); ctx.restore();
    AP.resistorBox(ctx, x2, T, 50 * s, null, false);
    ctx.fillStyle = "rgb(40,60,120)"; AP.rrPath(ctx, x3 - 12 * s, (T + B) / 2 - 22 * s, 24 * s, 44 * s, 6 * s); ctx.fill(); ctx.fillStyle = "rgb(200,206,214)"; ctx.fillRect(x3 - 12 * s, (T + B) / 2 - 22 * s, 24 * s, 5 * s);
    ctx.save(); if (on) { ctx.shadowColor = "rgba(255,70,50,0.95)"; ctx.shadowBlur = 16; } ctx.fillStyle = on ? "rgb(255,80,60)" : "rgb(120,40,36)"; ctx.beginPath(); ctx.arc(x2, B, 8 * s, Math.PI, 0); ctx.lineTo(x2 + 8 * s, B + 6 * s); ctx.lineTo(x2 - 8 * s, B + 6 * s); ctx.closePath(); ctx.fill(); ctx.restore();
    TX(ctx, "9 V", x1 - 22 * s, (T + B) / 2 + 4, 10, "right"); TX(ctx, "R", x2, T - 14 * s, 10.5, "center"); TX(ctx, "C", x3 + 18 * s, (T + B) / 2 + 4, 10.5, "left"); TX(ctx, on ? "LED 亮！" : "LED（6 V 才亮）", x2, B + 22 * s, 10, "center", on ? "#e0473c" : null);
    const dl = AP.dial(ctx, bx + bw * 0.5, by - 56 * s, 36 * s, Vc / 9, { max: 9, unit: "V", majors: 3 });
    TX(ctx, "電容電壓", bx + bw * 0.5, by - 100 * s, 10.5, "center"); void dl;
    const lw = Math.min(W * 0.46, 380 * s), lh = Math.min(H * 0.62, 270 * s), scr = AP.laptop(ctx, W - lw - 16 * s, benchY - lh - 2, lw, lh);
    const gx0 = scr.x + 28 * s, gx1 = scr.x + scr.w - 12 * s, gy0 = scr.y + 24 * s, gy1 = scr.y + scr.h - 22 * s, X = u => gx0 + u / 10 * (gx1 - gx0), Y = v => gy1 - v / 9 * (gy1 - gy0);
    ctx.save(); ctx.strokeStyle = "rgba(190,205,225,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 4); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(255,120,100,0.6)"; ctx.beginPath(); ctx.moveTo(gx0, Y(6)); ctx.lineTo(gx1, Y(6)); ctx.stroke();
    ctx.strokeStyle = "rgba(190,205,225,0.3)"; for (let n = 1; n * tau <= 10; n++) { ctx.beginPath(); ctx.moveTo(X(n * tau), gy0); ctx.lineTo(X(n * tau), gy1); ctx.stroke(); } ctx.setLineDash([]);
    ctx.strokeStyle = "rgb(110,226,255)"; ctx.lineWidth = 2.2; ctx.beginPath(); for (let i = 0; i <= 100; i++) { const u = i / 10; i ? ctx.lineTo(X(u), Y(9 * (1 - Math.exp(-u / tau)))) : ctx.moveTo(X(u), Y(0)); } ctx.stroke();
    ctx.fillStyle = "rgb(255,220,110)"; ctx.beginPath(); ctx.arc(X(tm), Y(Vc), 5, 0, PL.TAU); ctx.fill(); ctx.restore();
    D.text(ctx, "Vc（V）", scr.x + 8 * s, scr.y + 16 * s, { color: "rgba(210,220,236,0.9)", size: 10 });
    D.text(ctx, "LED 亮起門檻 6 V", gx1, Y(6) - 5, { color: "rgba(255,150,130,0.9)", size: 9.5, align: "right" });
    D.text(ctx, "t = " + PL.fmt(tm, 1) + " s（虛線間隔 τ）", gx1, gy1 + 16 * s, { color: "rgba(210,220,236,0.9)", size: 9.5, align: "right" });
    const ton = -tau * Math.log(1 - 6 / 9);
    TX(ctx, "約 " + PL.fmt(ton, 1) + " s 後 LED 才會亮（= 1.1τ）", W - 16 * s, 42 * s, 11.5, "right");
    label(ctx, 20, 18, "電容電壓", PL.fmt(Vc, 2) + " V", c);
  };

  /* 電鍍銅：硫酸銅溶液中，銅離子往負極移動，在鑰匙上鍍出一層銅；析出量 ∝ 電量 It */
  SC["electrolysis"] = k => {
    const { ctx, W, H, a: I, b: tt, t, s, c, v: m, cfg } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const bx = W * 0.36, bw = 220 * s, bh = 170 * s, top = benchY - bh, wy = top + 28 * s, cov = clamp(Math.sqrt(m / 4700), 0, 1);
    AP.beaker(ctx, bx, benchY, bw, bh, 0.84, "#3a8fd8");
    AP.steel(ctx, bx - bw / 2 - 20 * s, top - 16 * s, bw + 40 * s, 7 * s, 8);
    const ax = bx - bw * 0.28, cx = bx + bw * 0.28, pw = (16 - 8 * cov) * s;
    ctx.fillStyle = "rgb(200,120,70)"; ctx.fillRect(ax - pw / 2, top - 10 * s, pw, bh - 30 * s); ctx.strokeStyle = "rgba(90,50,20,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(ax - pw / 2, top - 10 * s, pw, bh - 30 * s);
    AP.cord(ctx, cx, top - 10 * s, cx, top + 40 * s);
    const kc = "rgb(" + Math.round(196 + (204 - 196) * cov) + "," + Math.round(200 - 80 * cov) + "," + Math.round(206 - 136 * cov) + ")";
    ctx.save(); ctx.translate(cx, top + 70 * s); ctx.fillStyle = kc; ctx.beginPath(); ctx.arc(0, -18 * s, 16 * s, 0, PL.TAU); ctx.arc(0, -18 * s, 6 * s, 0, PL.TAU, true); ctx.fill("evenodd");
    ctx.fillRect(-4 * s, -4 * s, 8 * s, 58 * s); ctx.fillRect(4 * s, 30 * s, 8 * s, 6 * s); ctx.fillRect(4 * s, 42 * s, 10 * s, 6 * s); ctx.restore();
    const ps = AP.powerSupply(ctx, W * 0.7, benchY - 74 * s, 150 * s, 72 * s, PL.fmt(I, 1) + " A", { label: "直流電源", knob: fr(I, cfg.a) });
    AP.cable(ctx, [ps.red, { x: ps.red.x, y: top - 60 * s }, { x: ax, y: top - 60 * s }, { x: ax, y: top - 10 * s }], "rgb(186,54,48)", 2.6 * s, 4);
    AP.cable(ctx, [ps.black, { x: ps.black.x, y: top - 40 * s }, { x: cx, y: top - 40 * s }, { x: cx, y: top - 12 * s }], "rgb(40,44,52)", 2.6 * s, 4);
    AP.flowDots(ctx, [{ x: ax + 10 * s, y: wy + 40 * s }, { x: cx - 18 * s, y: wy + 40 * s }], t, 10 + 10 * I, { color: "rgba(40,110,220,0.95)", gap: 22 * s, r: 3 * s, glow: false });
    AP.flowDots(ctx, [{ x: ax + 10 * s, y: wy + 90 * s }, { x: cx - 18 * s, y: wy + 90 * s }], t + 0.4, 10 + 10 * I, { color: "rgba(40,110,220,0.95)", gap: 22 * s, r: 3 * s, glow: false });
    TX(ctx, "Cu²⁺ →", bx, wy + 30 * s, 10.5, "center", "#1f5fb0");
    TX(ctx, "正極：銅片（變薄）", ax, top - 70 * s, 10.5, "center", "#d0553a"); TX(ctx, "負極：鑰匙（鍍上銅）", cx + 30 * s, top - 50 * s, 10.5, "center");
    AP.lcd(ctx, W * 0.54, benchY - 32 * s, 100 * s, 24 * s, "t = " + PL.fmt(tt, 0) + " s", { color: "rgb(130,240,170)" });
    TX(ctx, "電量 Q = It = " + PL.fmt(I * tt, 0) + " C", W - 16 * s, 42 * s, 12, "right");
    TX(ctx, "m = QM / (2F)，M = 63.5 g/mol", W - 16 * s, 62 * s, 10.5, "right", PL.col("text-dim"), 0);
    label(ctx, 20, 18, "析出銅質量", PL.fmt(m, 1) + " mg", c);
  };

  /* 正切電流計：線圈立在南北方向，中心放羅盤；通電後線圈磁場（東西向）和地磁合成，磁針偏轉 θ */
  SC["tangent-galvanometer"] = k => {
    const { ctx, W, H, a: I, b: r, t, s, c, v: th, cfg } = k;
    const benchY = H * 0.88;
    AP.labRoom(ctx, W, H, benchY, {});
    const cx = W * 0.34, Rc = (56 + 100 * fr(r, cfg.b)) * s, cy = benchY - 30 * s - Rc, ra = th * Math.PI / 180;
    AP.steel(ctx, cx - 50 * s, benchY - 10 * s, 100 * s, 10 * s, -8); AP.steel(ctx, cx - 5 * s, cy + Rc, 10 * s, benchY - cy - Rc - 10 * s, 10);
    AP.ringCoil(ctx, cx, cy, Rc * 0.32, Rc, { part: "back", turns: 5, depth: 10 * s, w: 3 * s });
    ctx.fillStyle = "rgb(190,160,110)"; ctx.fillRect(cx - 34 * s, cy - 3 * s, 68 * s, 6 * s);
    ctx.fillStyle = "rgb(248,248,244)"; ctx.beginPath(); ctx.ellipse(cx, cy - 4 * s, 26 * s, 10 * s, 0, 0, PL.TAU); ctx.fill(); ctx.strokeStyle = "rgb(190,150,70)"; ctx.lineWidth = 2; ctx.stroke();
    const nx = Math.sin(ra) * 22 * s, ny = -Math.cos(ra) * 8 * s;
    ctx.lineWidth = 3 * s; ctx.strokeStyle = "rgb(214,52,44)"; ctx.beginPath(); ctx.moveTo(cx, cy - 4 * s); ctx.lineTo(cx + nx, cy - 4 * s + ny); ctx.stroke();
    ctx.strokeStyle = "rgb(52,98,178)"; ctx.beginPath(); ctx.moveTo(cx, cy - 4 * s); ctx.lineTo(cx - nx, cy - 4 * s - ny); ctx.stroke();
    AP.ringCoil(ctx, cx, cy, Rc * 0.32, Rc, { part: "front", turns: 5, depth: 10 * s, w: 3 * s });
    const ps = AP.powerSupply(ctx, W * 0.56, benchY - 70 * s, 140 * s, 68 * s, PL.fmt(I, 1) + " A", { label: "電流", knob: fr(I, cfg.a) });
    AP.cable(ctx, [{ x: cx - 12 * s, y: benchY - 12 * s }, { x: cx + 40 * s, y: benchY - 3 * s }, { x: ps.red.x, y: benchY - 3 * s }, ps.red], "rgb(186,54,48)", 2.4 * s, 2);
    AP.cable(ctx, [{ x: cx + 12 * s, y: benchY - 12 * s }, { x: cx + 50 * s, y: benchY - 6 * s }, { x: ps.black.x, y: benchY - 6 * s }, ps.black], "rgb(40,44,52)", 2.4 * s, 2);
    const ix = W * 0.8, iy = H * 0.3, ir = 62 * s;
    AP.compass(ctx, ix, iy, ir, -Math.PI / 2 + ra);
    const bE = 46, bC = Math.tan(ra) * bE, sc = 1.2 * s;
    D.arrow(ctx, ix, iy + ir + 80 * s, ix, iy + ir + 80 * s - bE * sc, { color: "#2f9a5a", width: 2.6, head: 7 });
    D.arrow(ctx, ix, iy + ir + 80 * s, ix + Math.min(bC, 120) * sc, iy + ir + 80 * s, { color: "#e0843a", width: 2.6, head: 7 });
    D.arrow(ctx, ix, iy + ir + 80 * s, ix + Math.min(bC, 120) * sc, iy + ir + 80 * s - bE * sc, { color: "#e0473c", width: 3, head: 8 });
    TX(ctx, "地磁", ix - 6 * s, iy + ir + 60 * s, 10, "right", "#2f9a5a"); TX(ctx, "線圈磁場", ix + 6 * s, iy + ir + 96 * s, 10, "left", "#e0843a");
    TX(ctx, "俯視：磁針偏 " + PL.fmt(th, 1) + "°", ix, iy - ir - 12 * s, 11, "center");
    TX(ctx, "線圈半徑 " + PL.fmt(r * 100, 0) + " cm、40 匝", cx, cy - Rc - 12 * s, 10.5, "center");
    TX(ctx, "tan θ = B線圈 / B地磁", W - 16 * s, 42 * s, 12, "right");
    label(ctx, 20, 18, "磁針偏角", PL.fmt(th, 1) + "°", c);
  };

  /* 迴旋加速器：兩個 D 形電極放在強磁場中，粒子每半圈被電場加速一次，沿螺旋向外 */
  SC["cyclotron-frequency"] = k => {
    const { ctx, W, H, a: B, b: mr, t, s, c, v: f, cfg } = k;
    const L = isL(), fy = H * 0.94;
    AP.labRoom(ctx, W, H, fy, { bench: "none" });
    const cx = W * 0.38, cy = H * 0.52, Rm = Math.min(H * 0.42, 190 * s), gap = 8 * s;
    const pg = ctx.createRadialGradient(cx - Rm * 0.3, cy - Rm * 0.3, Rm * 0.1, cx, cy, Rm * 1.1);
    pg.addColorStop(0, "rgb(96,104,118)"); pg.addColorStop(1, "rgb(44,48,58)");
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, Rm * 1.08, 0, PL.TAU); ctx.fill(); noteC(ctx, "rgb(64,70,82)", cx - Rm * 0.7, cy - Rm * 0.7, Rm * 1.4, Rm * 1.4);
    const nb = Math.round(3 + 5 * fr(B, cfg.a)), stp = Rm * 2 / nb;
    ctx.fillStyle = "rgba(200,210,226,0.35)"; ctx.strokeStyle = "rgba(200,210,226,0.35)"; ctx.lineWidth = 1;
    for (let i = 0; i < nb; i++) for (let j = 0; j < nb; j++) { const x = cx - Rm + stp * (i + 0.5), y = cy - Rm + stp * (j + 0.5); if (Math.hypot(x - cx, y - cy) > Rm) continue; ctx.beginPath(); ctx.arc(x, y, 5 * s, 0, PL.TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 3 * s, y - 3 * s); ctx.lineTo(x + 3 * s, y + 3 * s); ctx.moveTo(x + 3 * s, y - 3 * s); ctx.lineTo(x - 3 * s, y + 3 * s); ctx.stroke(); }
    const N = 8, r0 = Rm * 0.9 / Math.sqrt(N), wv = Math.min(f / 8, 3) + 0.6, tot = N * Math.PI, pos = (t * wv * 2) % (tot + 2), kk = Math.min(N - 1, Math.floor(pos / Math.PI)), ph = pos - kk * Math.PI;
    const polPlus = kk % 2 === 0;
    [[-1, "左"], [1, "右"]].forEach(q => { const g2 = ctx.createLinearGradient(cx + q[0] * Rm, 0, cx, 0); g2.addColorStop(0, "rgba(214,150,90,0.55)"); g2.addColorStop(1, "rgba(240,190,130,0.35)"); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx + q[0] * gap / 2, cy, Rm * 0.94, q[0] < 0 ? Math.PI / 2 : -Math.PI / 2, q[0] < 0 ? Math.PI * 1.5 : Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "rgba(255,210,160,0.8)"; ctx.lineWidth = 1.5; ctx.stroke();
      D.text(ctx, ((q[0] < 0) === polPlus ? "+" : "−"), cx + q[0] * Rm * 0.7, cy - Rm * 0.55, { color: "rgb(255,230,190)", size: 20, align: "center", weight: "700" }); });
    ctx.save(); ctx.strokeStyle = "rgba(120,240,255,0.55)"; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i < N; i++) { const ri = r0 * Math.sqrt(i + 1), a0 = i % 2 ? Math.PI / 2 : -Math.PI / 2; ctx.moveTo(cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri); ctx.arc(cx, cy, ri, a0, a0 + Math.PI, false); }
    ctx.stroke(); ctx.restore();
    if (pos < tot) { const ri = r0 * Math.sqrt(kk + 1), a = (kk % 2 ? Math.PI / 2 : -Math.PI / 2) + ph, pr = (3 + 3 * Math.sqrt(mr)) * s; ctx.save(); ctx.shadowColor = "rgba(120,240,255,0.95)"; ctx.shadowBlur = 12; ctx.fillStyle = "rgb(180,250,255)"; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri, pr, 0, PL.TAU); ctx.fill(); ctx.restore(); }
    else D.arrow(ctx, cx - gap, cy + Rm * 0.9, cx + Rm * 1.25, cy + Rm * 0.9, { color: "rgb(120,240,255)", width: 3, head: 9 });
    const ps = AP.powerSupply(ctx, W * 0.72, H * 0.2, W * 0.24, 70 * s, PL.fmt(f, 1) + " MHz", { label: "高頻交流電源", color: "rgb(130,230,255)", knob: fr(f, [0, 0, 230]) });
    AP.cable(ctx, [ps.red, { x: ps.red.x, y: cy - Rm * 1.08 - 8 * s }, { x: cx + Rm * 0.4, y: cy - Rm * 1.08 - 8 * s }, { x: cx + Rm * 0.4, y: cy - Rm * 0.7 }], "rgb(186,54,48)", 2.4 * s, 2);
    AP.cable(ctx, [ps.black, { x: ps.black.x, y: cy - Rm * 1.08 - 16 * s }, { x: cx - Rm * 0.4, y: cy - Rm * 1.08 - 16 * s }, { x: cx - Rm * 0.4, y: cy - Rm * 0.7 }], "rgb(40,44,52)", 2.4 * s, 2);
    TX(ctx, "磁場 B = " + PL.fmt(B, 1) + " T（垂直穿入紙面 ⊗）", W - 16 * s, H * 0.2 + 100 * s, 11, "right");
    TX(ctx, "粒子質量 = " + PL.fmt(mr, 1) + " 倍質子", W - 16 * s, H * 0.2 + 120 * s, 11, "right");
    TX(ctx, "f = qB / (2πm)：與半徑無關", W - 16 * s, H * 0.2 + 146 * s, 12, "right");
    label(ctx, 20, 18, "迴旋頻率", PL.fmt(f, 2) + " MHz", c);
  };

  /* 互感：推動變阻器讓一次線圈電流變化，二次線圈的檢流計就偏轉；靠得越近（M 越大）偏得越多 */
  SC["mutual-induction"] = k => {
    const { ctx, W, H, a: dI, b: M, t, s, c, v: emf, cfg } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const cy = benchY - 110 * s, x1 = W * 0.26, gp = (14 + 150 * (1 - fr(M, cfg.b))) * s, x2 = x1 + 120 * s + gp;
    AP.ironCore(ctx, x1 - 80 * s, cy - 12 * s, x2 - x1 + 170 * s, 24 * s, 12 * s);
    AP.steel(ctx, x1 - 10 * s, cy + 12 * s, 8 * s, benchY - cy - 12 * s, 10); AP.steel(ctx, x2 + 50 * s, cy + 12 * s, 8 * s, benchY - cy - 12 * s, 10);
    AP.coilWinding(ctx, x1, cy, 90 * s, 30 * s, 9); AP.coilWinding(ctx, x2, cy, 70 * s, 30 * s, 7);
    const sp = (0.3 + 1.4 * fr(dI, cfg.a)), ph = Math.sin(t * sp * 2), dir = Math.cos(t * sp * 2) >= 0 ? 1 : -1;
    const rh = AP.rheostat(ctx, x1 - 40 * s, benchY, 150 * s, 0.5 + 0.42 * ph);
    const ps = AP.powerSupply(ctx, 16 * s, benchY - 170 * s, 120 * s, 64 * s, "6.0 V", { label: "一次電路" });
    AP.cable(ctx, [ps.red, { x: ps.red.x, y: cy - 60 * s }, { x: x1 - 40 * s, y: cy - 44 * s }], "rgb(186,54,48)", 2.2 * s, 4);
    AP.cable(ctx, [{ x: x1 + 40 * s, y: cy - 34 * s }, { x: x1 + 50 * s, y: benchY - 60 * s }, rh.posts.rodR], "rgb(186,54,48)", 2.2 * s, 4);
    AP.cable(ctx, [rh.posts.tubeL, { x: ps.black.x, y: benchY + 10 * s }, ps.black], "rgb(40,44,52)", 2.2 * s, 3);
    const lg = Math.log10(Math.max(emf, 1e-4) / 1e-4) / Math.log10(16 / 1e-4), dl = AP.dial(ctx, W * 0.82, cy - 30 * s, 50 * s, 0.5 + 0.46 * lg * dir, { unit: "檢流計", majors: 4 });
    AP.cable(ctx, [{ x: x2 - 24 * s, y: cy + 30 * s }, { x: x2 - 24 * s, y: cy + 58 * s }, { x: dl.black.x, y: cy + 58 * s }, dl.black], "rgb(40,44,52)", 2.2 * s, 2);
    AP.cable(ctx, [{ x: x2 + 24 * s, y: cy + 30 * s }, { x: x2 + 24 * s, y: cy + 70 * s }, { x: dl.red.x, y: cy + 70 * s }, dl.red], "rgb(186,54,48)", 2.2 * s, 2);
    ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = PL.theme.isLight() ? "rgba(90,70,160,0.5)" : "rgba(190,170,255,0.5)"; ctx.lineWidth = 1.3;
    const nl = Math.round(1 + 3 * fr(M, cfg.b));
    for (let i = 1; i <= nl; i++) { ctx.beginPath(); ctx.ellipse((x1 + x2) / 2, cy, (x2 - x1) / 2 + 30 * s, 20 * s + i * 12 * s, 0, 0, PL.TAU); ctx.stroke(); }
    ctx.restore();
    TX(ctx, "一次線圈", x1, cy + 50 * s, 10.5, "center"); TX(ctx, "二次線圈", x2, cy + 50 * s, 10.5, "center");
    TX(ctx, "推動滑片：電流變化 " + PL.fmt(dI, 1) + " A/s", x1 - 40 * s, benchY + 22 * s, 10.5, "center");
    TX(ctx, "兩線圈越靠近 → 互感 M 越大（" + PL.fmt(M, 3) + " H）", W - 16 * s, 62 * s, 10.5, "right", PL.col("text-dim"), 0);
    TX(ctx, "ε = M × ΔI/Δt", W - 16 * s, 42 * s, 12.5, "right");
    label(ctx, 20, 18, "感應電壓", PL.fmt(emf, emf < 1 ? 4 : 2) + " V", c);
  };

  /* 菲涅耳繞射：綠光雷射照過小圓孔，光屏上出現同心亮暗環；中心是亮是暗由菲涅耳數決定 */
  SC["fresnel-diffraction"] = k => {
    const { ctx, W, H, a: ar, b: z, t, s, c, v: NF, cfg } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const ay = benchY - 90 * s, lx = W * 0.1, px = W * 0.26, sx = px + 30 * s + z / 6 * (W * 0.34);
    AP.laser(ctx, lx, ay, 0, { len: 60 * s });
    ctx.save(); ctx.strokeStyle = "rgba(60,255,110,0.85)"; ctx.shadowColor = "rgba(60,255,110,0.8)"; ctx.shadowBlur = 6; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(lx, ay); ctx.lineTo(px, ay); ctx.stroke(); ctx.restore();
    ctx.fillStyle = "rgba(60,255,110,0.14)"; ctx.beginPath(); ctx.moveTo(px, ay - 2 * s); ctx.lineTo(sx, ay - 40 * s); ctx.lineTo(sx, ay + 40 * s); ctx.lineTo(px, ay + 2 * s); ctx.closePath(); ctx.fill();
    AP.steel(ctx, px - 4 * s, ay - 50 * s, 8 * s, 100 * s, -14); ctx.fillStyle = "rgb(60,255,110)"; ctx.fillRect(px - 4 * s, ay - (1 + ar) * s, 8 * s, (2 + 2 * ar) * s);
    AP.steel(ctx, px - 3 * s, ay + 50 * s, 6 * s, benchY - ay - 50 * s, 10);
    AP.steel(ctx, sx - 3 * s, ay - 56 * s, 6 * s, 112 * s, 8); AP.steel(ctx, sx - 2 * s, ay + 56 * s, 4 * s, benchY - ay - 56 * s, 10);
    const yd = benchY - 20 * s;
    D.arrow(ctx, px, yd, sx, yd, { color: PL.col("text-dim"), width: 1.3, head: 5 }); D.arrow(ctx, sx, yd, px, yd, { color: PL.col("text-dim"), width: 1.3, head: 5 });
    TX(ctx, "z = " + PL.fmt(z, 1) + " m", (px + sx) / 2, yd - 8 * s, 10.5, "center");
    TX(ctx, "圓孔 a = " + PL.fmt(ar, 1) + " mm", px, ay - 60 * s, 10.5, "center");
    const ix = W * 0.8, iy = H * 0.42, ir = Math.min(110 * s, H * 0.3);
    ctx.fillStyle = "rgb(6,10,8)"; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, PL.TAU); ctx.fill(); noteC(ctx, "rgb(6,10,8)", ix - ir * 0.7, iy - ir * 0.7, ir * 1.4, ir * 1.4);
    const geo = ir * 0.6 / Math.max(1, Math.sqrt(1 / Math.max(NF, 0.05)) * 0.8), steps = 70;
    for (let i = steps; i >= 1; i--) {
      const u = i / steps, rr = u * ir; let I;
      if (NF >= 1) { const q = rr / (ir * 0.62); I = q < 1 ? Math.pow(Math.sin(Math.PI * NF * (1 - q * q) / 2 + Math.PI / 2 * (1 - 1)), 2) * 0.9 + 0.05 : 0.18 * Math.exp(-(q - 1) * 6) * (0.5 + 0.5 * Math.cos((q - 1) * 30)); }
      else { const x = rr / geo * 3.2 * Math.sqrt(NF + 0.05); I = x < 1e-3 ? 1 : Math.pow(Math.sin(x) / x, 2); }
      ctx.fillStyle = `rgba(80,255,130,${clamp(I, 0, 1).toFixed(3)})`; ctx.beginPath(); ctx.arc(ix, iy, rr, 0, PL.TAU); ctx.fill();
    }
    ctx.strokeStyle = "rgba(160,170,160,0.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, PL.TAU); ctx.stroke();
    const center = NF >= 1 ? (Math.round(NF) % 2 === 1 ? "亮" : "暗") : "亮";
    TX(ctx, "光屏上的圖樣（放大）", ix, iy - ir - 12 * s, 11, "center");
    TX(ctx, "中心" + center + "：約 " + Math.max(1, Math.round(NF)) + " 個菲涅耳帶", ix, iy + ir + 20 * s, 11, "center");
    TX(ctx, "Nꜰ = a² / (λz)，λ = 532 nm", W * 0.42, 42 * s, 12, "center");
    label(ctx, 20, 18, "菲涅耳數 Nꜰ", PL.fmt(NF, NF < 10 ? 2 : 1), c);
  };

  /* 低通濾波器：RC 電路讓低頻通過、擋掉高頻；示波器比較輸入（黃）與輸出（藍）的振幅 */
  SC["bode-low-pass"] = k => {
    const { ctx, W, H, a: f, b: fc, t, s, c, v: gdb, cfg } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const ps = AP.powerSupply(ctx, 16 * s, benchY - 72 * s, 140 * s, 70 * s, f < 1000 ? PL.fmt(f, 0) + " Hz" : PL.fmt(f / 1000, 2) + " kHz", { label: "訊號產生器", color: "rgb(130,230,255)", knob: Math.log10(f / 10) / Math.log10(2000) });
    const bx = W * 0.26, by = benchY - 150 * s, bw = W * 0.2, bh = 100 * s;
    ctx.fillStyle = "rgb(246,246,240)"; AP.rrPath(ctx, bx, by, bw, bh, 6 * s); ctx.fill(); noteC(ctx, "rgb(246,246,240)", bx, by, bw, bh);
    const T = by + 30 * s, B = by + bh - 20 * s, xR = bx + bw * 0.35, xC = bx + bw * 0.72;
    AP.wire(ctx, [{ x: bx + 8 * s, y: T }, { x: bx + bw - 8 * s, y: T }], "rgb(186,54,48)", 2 * s); AP.wire(ctx, [{ x: bx + 8 * s, y: B }, { x: bx + bw - 8 * s, y: B }], "rgb(40,44,52)", 2 * s);
    AP.wire(ctx, [{ x: xC, y: T }, { x: xC, y: B }], "rgb(160,160,160)", 1.6 * s);
    AP.resistorBox(ctx, xR, T, 40 * s, null, false);
    const cs = (8 + 12 * (1 - fr(fc, cfg.b))) * s;
    ctx.fillStyle = "rgb(214,150,60)"; AP.rrPath(ctx, xC - cs * 0.7, (T + B) / 2 - cs, cs * 1.4, cs * 2, cs * 0.4); ctx.fill();
    TX(ctx, "R", xR, T - 14 * s, 10.5, "center"); TX(ctx, "C", xC + cs + 6 * s, (T + B) / 2 + 4, 10.5, "left");
    AP.cable(ctx, [ps.red, { x: ps.red.x, y: T - 30 * s }, { x: bx + 8 * s, y: T }], "rgb(186,54,48)", 2.2 * s, 4);
    AP.cable(ctx, [ps.black, { x: ps.black.x + 8 * s, y: B + 30 * s }, { x: bx + 8 * s, y: B }], "rgb(40,44,52)", 2.2 * s, 4);
    const ox = W * 0.5, ow = W - ox - 16 * s, oh = Math.min(200 * s, benchY - 60 * s), oy = benchY - oh - 2;
    AP.cable(ctx, [{ x: bx + bw - 8 * s, y: T }, { x: ox + 10 * s, y: oy + oh - 30 * s }], "rgb(40,120,200)", 2.2 * s, 4);
    const scr = AP.oscilloscope(ctx, ox, oy, ow, oh, { label: "示波器" });
    const ratio = Math.pow(10, gdb / 20), phi = Math.atan(f / fc), cyc = 2.5, A0 = scr.h * 0.36;
    [[A0, 0, "rgb(255,226,90)"], [A0 * ratio, phi, "rgb(100,210,255)"]].forEach(w => { ctx.save(); ctx.strokeStyle = w[2]; ctx.lineWidth = 2; ctx.shadowColor = w[2]; ctx.shadowBlur = 4; ctx.beginPath(); for (let i = 0; i <= 200; i++) { const q = i / 200, x = scr.x + q * scr.w, y = scr.y + scr.h / 2 - w[0] * Math.sin(PL.TAU * (q * cyc - t * 0.3) - w[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore(); });
    D.text(ctx, "黃：輸入　藍：輸出（×" + PL.fmt(ratio, 2) + "）", scr.x + 6 * s, scr.y + 14 * s, { color: "rgba(200,240,210,0.9)", size: 9.5 });
    const gx0 = W * 0.5 + 16 * s, gx1 = W - 30 * s, gy0 = 96 * s, gy1 = oy - 34 * s;
    AP.infoCard(ctx, gx0 - 12 * s, gy0 - 24 * s, gx1 - gx0 + 24 * s, gy1 - gy0 + 44 * s);
    const X = ff => gx0 + Math.log10(ff / 10) / Math.log10(2000) * (gx1 - gx0), Y = g => gy0 + (-g) / 40 * (gy1 - gy0);
    ctx.strokeStyle = PL.theme.pale(0.4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    ctx.strokeStyle = "#2f7fd8"; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 80; i++) { const ff = 10 * Math.pow(2000, i / 80), g = Math.max(-40, 20 * Math.log10(1 / Math.sqrt(1 + (ff / fc) ** 2))); i ? ctx.lineTo(X(ff), Y(g)) : ctx.moveTo(X(ff), Y(g)); } ctx.stroke();
    ctx.fillStyle = "#e0473c"; ctx.beginPath(); ctx.arc(X(f), Y(Math.max(-40, gdb)), 4 * s, 0, PL.TAU); ctx.fill();
    TX(ctx, "增益（dB）vs 頻率", gx0, gy0 - 8 * s, 10, "left"); TX(ctx, "−3 dB @ f꜀", X(fc) + 4 * s, Y(-3) - 4 * s, 9.5, "left", PL.col("text-dim"), 0);
    TX(ctx, "低音通過、高音被擋：喇叭分頻器就是濾波器", W - 16 * s, 42 * s, 11, "right");
    label(ctx, 20, 18, "電壓增益", PL.fmt(gdb, 2) + " dB", c);
  };

  /* 圓形線圈軸線上的磁場：霍爾探棒沿軸線移動，離線圈越遠磁場越弱 */
  SC["biot-savart-axis"] = k => {
    const { ctx, W, H, a: z, b: R, t, s, c, v: Bz, cfg } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const cx = W * 0.2, Rc = (40 + 90 * fr(R, cfg.b)) * s, cy = benchY - 36 * s - Rc, ppm = (W * 0.5) / 0.35;
    AP.steel(ctx, cx - 50 * s, benchY - 10 * s, 100 * s, 10 * s, -8); AP.steel(ctx, cx - 5 * s, cy + Rc, 10 * s, benchY - cy - Rc - 10 * s, 10);
    D.line(ctx, cx - 60 * s, cy, W * 0.78, cy, PL.col("text-dim"), 1, [5, 5]);
    ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = PL.theme.isLight() ? "rgba(90,70,160,0.45)" : "rgba(190,170,255,0.45)"; ctx.lineWidth = 1.2;
    for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.ellipse(cx + i * 22 * s, cy, i * 34 * s + Rc * 0.3, Rc * (0.4 + 0.25 * i), 0, 0, PL.TAU); ctx.stroke(); }
    ctx.restore();
    AP.ringCoil(ctx, cx, cy, Rc * 0.3, Rc, { part: "back", turns: 5, depth: 10 * s, w: 3 * s });
    AP.ringCoil(ctx, cx, cy, Rc * 0.3, Rc, { part: "front", turns: 5, depth: 10 * s, w: 3 * s });
    const px = cx + z * ppm;
    AP.steel(ctx, px, cy - 3 * s, W * 0.82 - px, 6 * s, 8); ctx.fillStyle = "rgb(60,64,72)"; ctx.fillRect(px - 4 * s, cy - 5 * s, 8 * s, 10 * s);
    AP.steel(ctx, W * 0.82 - 4 * s, cy, 8 * s, benchY - cy, 10);
    const tm = AP.multimeter(ctx, W * 0.84, benchY - 130 * s, 110 * s, 128 * s, PL.fmt(Bz, 1), { unit: "μT" }); void tm;
    AP.cable(ctx, [{ x: W * 0.82, y: cy }, { x: W * 0.86, y: cy - 40 * s }, { x: W * 0.87, y: benchY - 130 * s }], "rgb(40,44,52)", 2 * s, 3);
    const yd = benchY + 14 * s;
    D.line(ctx, px, cy + 6 * s, px, yd, "rgba(224,132,58,0.6)", 1, [3, 3]);
    if (z > 0.005) { D.arrow(ctx, cx, yd, px, yd, { color: "#e0843a", width: 1.6, head: 6 }); }
    TX(ctx, "z = " + PL.fmt(z * 100, 0) + " cm", Math.max(cx + 30 * s, (cx + px) / 2), yd + 18 * s, 10.5, "center", "#e0843a");
    TX(ctx, "霍爾探棒", px + 24 * s, cy - 12 * s, 10, "left", PL.col("text-dim"), 0);
    const gx0 = W * 0.42, gx1 = W - 30 * s, gy0 = 92 * s, gy1 = cy - Rc * 0.3 - 30 * s, Bmax = 4 * Math.PI * 1e-7 * 40 / (2 * 0.03) * 1e6;
    if (gy1 - gy0 > 50 * s) {
      AP.infoCard(ctx, gx0 - 12 * s, gy0 - 24 * s, gx1 - gx0 + 24 * s, gy1 - gy0 + 44 * s);
      const X = zz => gx0 + zz / 0.35 * (gx1 - gx0), Y = b => gy1 - Math.sqrt(b / Bmax) * (gy1 - gy0);
      ctx.strokeStyle = PL.theme.pale(0.4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
      ctx.strokeStyle = "#2f7fd8"; ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i <= 70; i++) { const zz = 0.35 * i / 70, b = 4 * Math.PI * 1e-7 * 40 * R * R / (2 * Math.pow(R * R + zz * zz, 1.5)) * 1e6; i ? ctx.lineTo(X(zz), Y(b)) : ctx.moveTo(X(zz), Y(b)); } ctx.stroke();
      ctx.fillStyle = "#e0473c"; ctx.beginPath(); ctx.arc(X(z), Y(Bz), 4 * s, 0, PL.TAU); ctx.fill();
      TX(ctx, "B 沿軸線（縱軸開根號刻度）", gx0, gy0 - 8 * s, 10, "left");
    }
    TX(ctx, "B = μ₀NIR² / 2(R² + z²)^(3/2)", W - 16 * s, 42 * s, 11, "right");
    label(ctx, 20, 18, "軸線磁場 B", PL.fmt(Bz, 1) + " μT", c);
  };

  const CAP = {
    "u-tube-manometer": "U 形管兩側液面的高度差反映壓力差：ΔP = ρgh，液體密度越大，高度差越小",
    "metal-specific-heat": "加熱過的金屬放進水中，金屬放出的熱等於水吸收的熱，由平衡溫度可以反推金屬的比熱",
    "heat-conduction": "熱從高溫端沿銅棒傳向低溫端：溫差越大、棒越短，傳熱越快（P = kAΔT/L）",
    "seismic-triangulation": "P 波比 S 波快，到時差越大代表震源越遠；三個測站畫出的圓交於一點就是震央",
    "string-harmonic-spectrum": "兩端固定的弦同時以基頻與整數倍的泛音振動；弦越短、張力越大，音越高",
    "noise-barrier": "聲音向外擴散，聲強與距離平方成反比；隔音牆再擋掉一部分，住家聽到的就更小聲",
    "lens-combination": "兩片薄透鏡貼在一起時，會聚能力相加：1/f = 1/f₁ + 1/f₂，凹透鏡讓焦點變遠",
    "photometry-inverse-square": "點光源的光攤在越來越大的面積上：距離加倍，面積變 4 倍，照度變成 1/4",
    "prism-spectrometer": "光對稱穿過稜鏡時偏向角最小；量出頂角 A 與最小偏向角 Dₘ 就能算出折射率",
    "voltage-divider": "兩段電阻串聯分配電源電壓：滑片越靠近接地端，取出的輸出電壓越小",
    "rc-timer": "電容經電阻充電，電壓按指數曲線上升；時間常數 τ = RC 越大，要等越久 LED 才亮",
    "electrolysis": "電流通過硫酸銅溶液，銅在負極析出：通過的電量 It 越多，鍍上的銅越多（法拉第定律）",
    "tangent-galvanometer": "線圈磁場與地磁場互相垂直，磁針停在合磁場方向：tan θ = B線圈 / B地磁",
    "cyclotron-frequency": "帶電粒子在磁場中繞圈的頻率 f = qB/(2πm) 和半徑無關，所以電場可以固定頻率一直加速它",
    "mutual-induction": "一次線圈電流改變，穿過二次線圈的磁通量跟著改變，就感應出電壓：ε = M·ΔI/Δt",
    "fresnel-diffraction": "光通過小圓孔後在光屏上形成同心亮暗環；菲涅耳數決定中心是亮是暗",
    "bode-low-pass": "RC 低通濾波器讓低頻通過、擋掉高頻；頻率等於截止頻率時，輸出降到 −3 dB",
    "biot-savart-axis": "圓形線圈中心的磁場最強，沿軸線離開線圈後磁場快速變弱"
  };


  /* 沒有專屬場景的新題目（open-curriculum 可以持續追加）：先放在實驗桌上顯示讀數 */
  function fallback(k) {
    const { ctx, W, H, cfg, v, c } = k;
    AP.labRoom(ctx, W, H, H * 0.86, {});
    AP.lcd(ctx, W / 2 - 110, H * 0.4, 220, 44, PL.fmt(v, Math.abs(v) < 10 ? 3 : 1) + " " + cfg.unit, { color: "rgb(130,240,170)" });
    label(ctx, 20, 18, cfg.output, PL.fmt(v, Math.abs(v) < 10 ? 3 : 1) + " " + cfg.unit, c);
  }
  function scene(cv, config, a, b, out, time) {
    const { ctx, W, H } = cv;
    cv.clear(); D.bg(cv);
    (SC[config.id] || fallback)({ cv, ctx, W, H, cfg: config, a, b, t: time, v: out, c: accent(), s: clamp(Math.min(W / 800, H / 464), 0.5, 1.7) });
  }

  Object.keys(LABS).forEach(id => { LABS[id].id = id; });

  Object.entries(LABS).forEach(([id, config]) => {
    // 蓋革統計改為下方專屬實作：一秒一秒計數，σ≈√N 要自己跑出來
    if (id === "geiger-statistics") return;
    PL.register(id, { build(root) {
      const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" }), cv = PL.canvas.create(L.canvasWrap, 0.58, 920);
      PL.ui.caption(cv, CAP[id] || "");
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
      const conclusion = PL.ui.readout(L.readouts, { label: "模型判讀" });
      const chart = PL.ui.chart(PL.ui.charts(root), { title: config.output + "關係圖", cap: "曲線固定第二項參數；亮點是目前設定，空心點是所有已記錄的量測資料。" });
      let elapsed = 0, animation;
      function render() {
        const av = a.get(), bv = b.get(), out = config.calc(av, bv);
        scene(cv, config, av, bv, out, elapsed);
        readout.set(out, Math.abs(out) < 10 ? 3 : 2); aReadout.set(av, digits(config.a)); bReadout.set(bv, digits(config.b)); nReadout.set(records.length, 0); conclusion.set(config.status(av, bv, out));
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

  /*
   * 蓋革統計：一秒一秒計數
   * σ≈√N 這種統計關係，滑桿算公式學生不會有感；
   * 按「計數 10 秒」累積多次，相對誤差自己會縮小。
   */
  PL.register("geiger-statistics", { build(root) {
    const L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" });
    const cv = PL.canvas.create(L.canvasWrap, 0.62, 820);
    let rate = 15;                 // 次/s
    let windowSec = 10;            // 每次量測的時間窗（s）
    let trials = [];               // 每次量測的總計數
    let seed = 20260810;

    function rng() {
      seed = (seed + 0x9e3779b9) | 0;
      let t = seed ^ (seed >>> 16); t = Math.imul(t, 0x21f0aaad);
      t = t ^ (t >>> 15); t = Math.imul(t, 0x735a2d97);
      return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
    }
    function poisson(lambda) {
      // Knuth：λ 不大時夠用
      const Llim = Math.exp(-lambda);
      let k = 0, p = 1;
      do { k += 1; p *= rng(); } while (p > Llim);
      return k - 1;
    }

    PL.ui.section(L.controls, "量測條件");
    const sRate = PL.ui.slider(L.controls, { label: "平均計數率 R", min: 0.5, max: 50, step: 0.5, value: 15, unit: "次/s", digits: 1, onInput: () => clearTrials() });
    const sWin = PL.ui.slider(L.controls, { label: "每次量測時間窗", min: 1, max: 60, step: 1, value: 10, unit: "s", digits: 0, onInput: () => clearTrials() });
    const row = PL.ui.buttonRow(L.controls);
    const bCount = PL.ui.button(row, "計數一次", () => countOnce(), { primary: true });
    PL.ui.button(row, "連續計數 8 次", () => {
      for (let i = 0; i < 8; i++) countOnce(true);
      draw();
    });
    PL.ui.button(row, "清除紀錄", () => clearTrials());
    PL.ui.note(L.controls,
      "每一次「計數一次」都是一段真實時間窗內的隨機衰變。" +
      "次數越多，相對標準差 ≈ 1/√N 越小——這是統計漲落，不是儀器壞掉。");

    const rN = PL.ui.readout(L.readouts, { label: "本次計數 N", unit: "次" });
    const rMean = PL.ui.readout(L.readouts, { label: "多次平均 N̄", unit: "次" });
    const rS = PL.ui.readout(L.readouts, { label: "實測標準差 s", unit: "次" });
    const rTheory = PL.ui.readout(L.readouts, { label: "理論 √N̄", unit: "次" });
    const rRel = PL.ui.readout(L.readouts, { label: "相對標準差 s/N̄", unit: "%" });
    const rTask = PL.ui.readout(L.readouts, { label: "任務進度" });

    const chart = PL.ui.chart(PL.ui.charts(root), {
      title: "各次計數與 √N 誤差棒",
      cap: "每次量測的計數會上下跳動；跳動幅度大約是 √N。量測時間越長，N 越大，相對誤差越小。"
    });

    function clearTrials() {
      rate = sRate.get();
      windowSec = sWin.get();
      trials = [];
      draw();
    }
    function countOnce(silent) {
      rate = sRate.get();
      windowSec = sWin.get();
      trials.push(poisson(rate * windowSec));
      if (!silent) draw();
    }
    function stats() {
      if (!trials.length) return null;
      const mean = trials.reduce((s, v) => s + v, 0) / trials.length;
      const s2 = trials.length > 1
        ? trials.reduce((s, v) => s + (v - mean) ** 2, 0) / (trials.length - 1) : 0;
      const s = Math.sqrt(s2);
      return { mean, s, theory: Math.sqrt(Math.max(mean, 0)), last: trials[trials.length - 1] };
    }

    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const st = stats();
      rate = sRate.get(); windowSec = sWin.get();

      // 蓋革計數器（實物外觀）：黃色機身 + 數字窗 + 喇叭孔；下方的探管對著放射源
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.16)"; AP.rrPath(ctx, 23, 40, 176, 72, 10); ctx.fill();
      ctx.fillStyle = "rgb(236,186,40)"; AP.rrPath(ctx, 20, 36, 176, 72, 10); ctx.fill();
      ctx.fillStyle = "rgb(44,48,56)"; AP.rrPath(ctx, 27, 43, 162, 58, 7); ctx.fill();
      ctx.fillStyle = "rgba(200,206,214,0.55)";
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(154 + i * 8, 54 + j * 9, 2, 0, TAU); ctx.fill(); }
      ctx.restore();
      AP.lcd(ctx, 34, 50, 108, 28, st ? "N=" + st.last : "N=—", { color: "rgb(130,240,170)" });
      PL.theme.note(ctx, "rgb(44,48,56)", 27, 82, 120, 18);
      D.text(ctx, "蓋革計數器", 88, 96, { color: "rgba(230,236,244,0.9)", size: 10, align: "center", weight: "700" });
      AP.cable(ctx, [{ x: 24, y: 96 }, { x: 14, y: 118 }, { x: 34, y: 128 }], "rgb(40,44,52)", 3, 4);
      AP.steel(ctx, 34, 120, 92, 16, 8);
      ctx.fillStyle = "rgb(30,32,38)"; ctx.beginPath(); ctx.ellipse(127, 128, 3, 8, 0, 0, TAU); ctx.fill();
      AP.brassDisc(ctx, 168, 128, 13);
      ctx.fillStyle = "rgb(30,30,30)";
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; ctx.beginPath(); ctx.moveTo(168, 128); ctx.arc(168, 128, 10, a - 0.5, a + 0.5); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = "rgb(236,186,40)"; ctx.beginPath(); ctx.arc(168, 128, 3, 0, TAU); ctx.fill();
      ctx.save(); ctx.strokeStyle = "rgba(255,120,80,0.85)"; ctx.lineWidth = 1.4;
      const nTr = Math.max(1, Math.min(10, Math.round(sRate.get() / 5))), rs = trials.length * 7 + 3;
      for (let i = 0; i < nTr; i++) { const q = Math.sin(rs + i * 12.9898) * 43758.5453, u = q - Math.floor(q), y0 = 122 + u * 12; ctx.beginPath(); ctx.moveTo(154, 128 + (u - 0.5) * 8); ctx.lineTo(131 + u * 4, y0); ctx.stroke(); }
      ctx.restore();
      const tubeX = 24, tubeY = 122, tubeH = 34;
      D.text(ctx, "R = " + PL.fmt(rate, 1) + " 次/s · 窗 " + windowSec + " s", tubeX, 158,
        { color: PL.col("text-faint"), size: 10 });

      /*
       * 預期計數量尺：滑桿一動就必須看見圖形變化。
       * meaning-audit 只比圖形不算文字——若 R／時間窗只改讀數字串，
       * 畫面雜湊不變，這兩根滑桿就等於擺設。
       * 幾何量：量尺長度 ∝ √(N̄)，誤差帶高度 ∝ σ=√N̄，
       * 刻度密度跟著 R 走。三者都由滑桿直接決定。
       */
      const nExp = Math.max(0, rate * windowSec);
      const sigmaExp = Math.sqrt(nExp);
      const scaleMax = Math.sqrt(50 * 60); // 滑桿上界 R×窗 的量級
      const railX = tubeX, railY = tubeY + tubeH + 32, railW = Math.min(200, W * 0.28), railH = 16;
      const fillRatio = PL.clamp(Math.sqrt(nExp) / scaleMax, 0.02, 1);
      D.text(ctx, "預期 N̄ = R × 窗", railX, railY - 6, { color: PL.col("text-faint"), size: 9 });
      D.rect(ctx, railX, railY, railW, railH, { fill: PL.theme.shade(0.45), stroke: PL.theme.pale(0.22), width: 1, r: 3 });
      D.rect(ctx, railX + 1, railY + 1, Math.max(2, (railW - 2) * fillRatio), railH - 2,
        { fill: accent(), r: 2 });
      // σ 誤差帶：在量尺末端畫豎向鬚線，高度 ∝ √N̄
      const capX = railX + (railW - 2) * fillRatio + 1;
      const whisker = PL.clamp(sigmaExp / scaleMax * 48, 2, 28);
      D.line(ctx, capX, railY + railH / 2 - whisker, capX, railY + railH / 2 + whisker, PL.col("warn"), 2);
      // 計數率刻度：每秒一格，R 越大刻度越密
      const tickN = Math.round(rate);
      const tickTop = railY + railH + 6;
      D.line(ctx, railX, tickTop + 8, railX + railW, tickTop + 8, PL.theme.pale(0.2), 1);
      for (let i = 0; i < tickN; i++) {
        const tx = railX + railW * (i + 0.5) / tickN;
        D.line(ctx, tx, tickTop + 2, tx, tickTop + 8, PL.col("accent-2"), 1.2);
      }
      D.text(ctx, "σ ≈ " + PL.fmt(sigmaExp, 1) + "（√N̄）", railX, tickTop + 20,
        { color: PL.col("warn"), size: 9.5 });

      if (!trials.length) {
        D.text(ctx, "放射性衰變是隨機的：同一條件每次計數都會不一樣", W / 2, H * 0.52,
          { color: PL.col("text"), size: 13, align: "center", weight: "700" });
        D.text(ctx, "拉動 R 或時間窗，預期量尺會立刻變長／變短；再按「計數一次」驗證", W / 2, H * 0.52 + 24,
          { color: PL.col("text-faint"), size: 11, align: "center" });
        rN.set("—"); rMean.set("—"); rS.set("—"); rTheory.set("—"); rRel.set("—");
        rTask.set("尚未計數：按「計數一次」開始");
        return;
      }

      const box = { x: 220, y: 40, w: W - 250, h: H - 90 };
      const maxN = Math.max(10, ...trials.map(v => v * 1.25));
      const g = PL.graph(cv, box, { x0: 0, x1: Math.max(8, trials.length + 1), y0: 0, y1: maxN });
      g.frame({ xlabel: "第幾次量測", ylabel: "計數 N" });
      g.grid(Math.min(8, trials.length), 4);
      if (st) {
        g.hline(st.mean, { color: accent(), width: 2 });
        g.hline(st.mean + st.s, { color: PL.col("warn"), width: 1.4, dash: [5, 4] });
        g.hline(Math.max(0, st.mean - st.s), { color: PL.col("warn"), width: 1.4, dash: [5, 4] });
        D.text(ctx, "平均 N̄ = " + PL.fmt(st.mean, 1) + "，誤差棒 ≈ ±s", box.x + 8, box.y + 16,
          { color: accent(), size: 10 });
      }
      trials.forEach((v, i) => g.dot(i + 1, v, { color: PL.col("accent-2"), r: 4 }));

      chart.clear();
      const cg = PL.graph(chart, { x: 46, y: 16, w: chart.W - 62, h: chart.H - 40 },
        { x0: 0, x1: Math.max(8, trials.length + 1), y0: 0, y1: maxN });
      cg.frame({ xlabel: "次序", ylabel: "N" });
      cg.grid(5, 4);
      trials.forEach((v, i) => cg.dot(i + 1, v, { color: PL.col("accent-2"), r: 4 }));
      if (st) {
        cg.hline(st.mean, { color: accent(), width: 2 });
        cg.curve([[0.5, st.mean + st.s], [trials.length + 0.5, st.mean + st.s]],
          { color: PL.col("warn"), width: 1.3, dash: [5, 4] });
        cg.curve([[0.5, Math.max(0, st.mean - st.s)], [trials.length + 0.5, Math.max(0, st.mean - st.s)]],
          { color: PL.col("warn"), width: 1.3, dash: [5, 4] });
      }

      rN.set(st.last, 0);
      rMean.set(st.mean, 1);
      rS.set(st.s, 2);
      rTheory.set(st.theory, 2);
      rRel.set(st.mean > 0 ? st.s / st.mean * 100 : 0, 1);
      rTask.set(trials.length < 4
        ? "已計數 " + trials.length + " 次，再多做幾次比較 s 與 √N"
        : "s ≈ " + PL.fmt(st.s, 1) + "，√N̄ ≈ " + PL.fmt(st.theory, 1) + "——統計漲落的量級");
    }

    cv.onResize(draw); chart.onResize(draw); draw();
    return { stop() { cv.destroy(); chart.destroy(); }, rerender: draw };
  }});
})();
