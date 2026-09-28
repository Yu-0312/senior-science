/* 第四批互動實驗（下）：熱、波動、光學、電磁與近代物理，每個實驗都有自己的實物場景。
 * 與 comprehensive.js 同一批，因單檔需小於 40 KB（gzip）而拆成兩個檔案。 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const accent = () => PL.col("m-color", "#35e0cf");
  const rad = degree => degree * Math.PI / 180;

  function lab(kind, a, b, output, unit, calc, status, chart) {
    return { kind, a, b, output, unit, calc, status, chart };
  }

  const LABS = {
    "calorimetry-mixing": lab("calorimetry", ["熱水溫度", 35, 98, 82, "°C", 1, 0], ["冷水溫度", 0, 30, 18, "°C", 1, 0], "平衡溫度", "°C", (hot, cold) => (hot * 1.4 + cold) / 2.4, (hot, cold, temp) => "假設熱水質量為冷水 1.4 倍；平衡於 " + PL.fmt(temp, 1) + "°C", (x, cold) => (x * 1.4 + cold) / 2.4),
    "string-wave-speed": lab("string", ["張力 T", 1, 250, 65, "N", 1, 0], ["線密度 μ", 0.2, 12, 2.4, "g/m", 0.1, 1], "波速 v", "m/s", (tension, density) => Math.sqrt(tension / (density / 1000)), (tension, density, speed) => "v = √(T/μ) = " + PL.fmt(speed, 1) + " m/s", (x, density) => Math.sqrt(x / (density / 1000))),
    "sound-properties": lab("sound", ["頻率 f", 80, 2200, 440, "Hz", 1, 0], ["相對振幅", 0.05, 2, 0.8, "", 0.01, 2], "聲級", "dB", (frequency, amplitude) => 55 + 20 * Math.log10(Math.max(0.05, amplitude)), (frequency, amplitude, db) => "頻率 " + PL.fmt(frequency, 0) + " Hz 決定音調；聲級 " + PL.fmt(db, 1) + " dB", (x, amplitude) => 55 + 20 * Math.log10(Math.max(0.05, amplitude))),
    "echo-ultrasound": lab("echo", ["回波時間", 0.001, 0.2, 0.042, "s", 0.001, 3], ["聲速", 300, 360, 343, "m/s", 1, 0], "障礙物距離", "m", (time, speed) => time * speed / 2, (time, speed, distance) => "聲波往返，所以距離 = vt/2 = " + PL.fmt(distance, 2) + " m", (x, speed) => x * speed / 2),
    "seismic-waves": lab("seismic", ["地面振動頻率", 0.2, 8, 2.6, "Hz", 0.01, 2], ["隔震週期", 0.2, 5, 1.8, "s", 0.01, 2], "相對反應", "", (frequency, period) => 1 / Math.sqrt(0.08 + Math.pow(1 - frequency * period, 2)), (frequency, period, response) => response > 2 ? "接近共振，建築反應被放大" : "隔震已降低相對反應", (x, period) => 1 / Math.sqrt(0.08 + Math.pow(1 - x * period, 2))),
    "shadow-pinhole": lab("pinhole", ["物距", 0.2, 8, 2.5, "m", 0.1, 1], ["光屏距離", 0.05, 2, 0.45, "m", 0.01, 2], "像的倍率", "倍", (objectDistance, screenDistance) => screenDistance / objectDistance, (objectDistance, screenDistance, scale) => "針孔像倒立，倍率約 " + PL.fmt(scale, 2) + " 倍", (x, screenDistance) => screenDistance / x),
    "rgb-color-mixing": lab("rgb", ["紅光強度 R", 0, 100, 76, "%", 1, 0], ["綠光強度 G", 0, 100, 54, "%", 1, 0], "感知亮度 Y", "%", (red, green) => 0.2126 * red + 0.7152 * green + 0.0722 * 42, (red, green, light) => "藍光固定 42%；感知亮度 " + PL.fmt(light, 0) + "%（綠光的權重最大）", (x, green) => 0.2126 * x + 0.7152 * green + 0.0722 * 42),
    "fiber-optics": lab("fiber", ["光纖長度", 1, 120, 35, "km", 1, 0], ["彎曲半徑", 1, 80, 24, "mm", 1, 0], "傳輸強度", "%", (length, radius) => 100 * Math.exp(-length * (0.006 + 0.12 / radius)), (length, radius, intensity) => intensity < 50 ? "彎曲或距離造成明顯損耗" : "全反射導光仍維持大部分強度", (x, radius) => 100 * Math.exp(-x * (0.006 + 0.12 / radius))),
    "human-eye": lab("eye", ["物距", 0.1, 8, 0.5, "m", 0.01, 2], ["水晶體焦距", 0.012, 0.08, 0.019, "m", 0.001, 3], "成像距離", "cm", (objectDistance, focal) => 100 / (1 / focal - 1 / objectDistance), (objectDistance, focal, image) => image > 0 && image < 4 ? "影像接近視網膜位置" : "需改變焦距或配鏡才能清楚成像", (x, focal) => 100 / (1 / focal - 1 / x)),
    "camera-exposure": lab("camera", ["光圈數 N", 1.4, 22, 5.6, "", 0.1, 1], ["快門時間", 0.001, 2, 0.08, "s", 0.001, 3], "相對曝光量", "", (fNumber, time) => time * 100 / (fNumber * fNumber), (fNumber, time, exposure) => exposure < 0.3 ? "曝光偏低，畫面可能太暗" : exposure > 1.4 ? "曝光偏高，亮部可能過曝" : "曝光量位於可用範圍", (x, time) => time * 100 / (x * x)),
    "electrostatic-induction": lab("induction", ["帶電棒電量", 0.1, 10, 3.8, "μC", 0.1, 1], ["距離", 1, 30, 8, "cm", 0.1, 1], "葉片張角", "°", (charge, distance) => Math.min(85, 18 * charge / Math.sqrt(distance)), (charge, distance, angle) => "感應使葉片同號互斥，張開 " + PL.fmt(angle, 1) + "°", (x, distance) => Math.min(85, 18 * x / Math.sqrt(distance))),
    "electric-heating": lab("heating", ["電壓 V", 3, 240, 110, "V", 1, 0], ["電阻 R", 1, 200, 44, "Ω", 1, 0], "電熱功率", "W", (voltage, resistance) => voltage * voltage / resistance, (voltage, resistance, power) => "P = V²/R = " + PL.fmt(power, 1) + " W", (x, resistance) => x * x / resistance),
    "household-circuit": lab("house", ["總功率", 100, 9000, 3600, "W", 10, 0], ["斷路器額定電流", 5, 40, 20, "A", 1, 0], "負載率", "%", (power, breaker) => power / (110 * breaker) * 100, (power, breaker, load) => load > 100 ? "超過額定電流，保護裝置應跳脫" : "負載在額定範圍內：" + PL.fmt(load, 0) + "%", (x, breaker) => x / (110 * breaker) * 100),
    "rlc-resonance": lab("rlc", ["電感 L", 1, 200, 35, "mH", 1, 0], ["電容 C", 0.1, 200, 12, "μF", 0.1, 1], "共振頻率", "Hz", (inductance, capacitance) => 1 / (TAU * Math.sqrt(inductance * 1e-3 * capacitance * 1e-6)), (inductance, capacitance, frequency) => "感抗與容抗相等時，共振於 " + PL.fmt(frequency, 1) + " Hz", (x, capacitance) => 1 / (TAU * Math.sqrt(x * 1e-3 * capacitance * 1e-6))),
    "compass-field": lab("compass", ["外加磁場", 0, 120, 48, "μT", 1, 0], ["外場方向", -90, 90, 28, "°", 1, 0], "磁針偏角", "°", (field, angle) => Math.atan2(field * Math.sin(rad(angle)), 48 + field * Math.cos(rad(angle))) * 180 / Math.PI, (field, angle, deflect) => "地磁場與外場疊加，磁針偏轉 " + PL.fmt(deflect, 1) + "°", (x, angle) => Math.atan2(x * Math.sin(rad(angle)), 48 + x * Math.cos(rad(angle))) * 180 / Math.PI),
    "electromagnet": lab("electromagnet", ["線圈匝數 N", 10, 800, 240, "匝", 1, 0], ["電流 I", 0.1, 5, 1.7, "A", 0.1, 1], "相對磁場", "mT", (turns, current) => turns * current * 0.03, (turns, current, field) => "鐵芯可集中磁場；相對強度 " + PL.fmt(field, 1) + " mT", (x, current) => x * current * 0.03),
    "dc-motor": lab("motor", ["線圈電流 I", 0.1, 8, 2.6, "A", 0.1, 1], ["負載力矩", 0, 4, 1.2, "N·m", 0.1, 1], "相對轉速", "rpm", (current, load) => Math.max(0, 520 * current - 260 * load), (current, load, speed) => speed > 0 ? "換向器維持力矩方向；轉速 " + PL.fmt(speed, 0) + " rpm" : "負載超過馬達可提供的力矩", (x, load) => Math.max(0, 520 * x - 260 * load)),
    "cathode-ray-em": lab("cathode", ["加速電壓 V", 20, 450, 180, "V", 1, 0], ["磁場 B", 0.2, 5, 1.4, "mT", 0.1, 1], "估測 e/m", "×10¹¹ C/kg", (voltage, field) => 2 * voltage / Math.pow(field * 1e-3, 2) / Math.pow(0.075, 2) / 1e11, (voltage, field, ratio) => "電子軌跡半徑固定 7.5 cm；e/m 約 " + PL.fmt(ratio, 2) + " ×10¹¹", (x, field) => 2 * x / Math.pow(field * 1e-3, 2) / Math.pow(0.075, 2) / 1e11),
    "spectroscopy": lab("spectrum", ["能階差 ΔE", 1.2, 5.4, 2.4, "eV", 0.01, 2], ["譜線強度", 0.1, 1, 0.68, "", 0.01, 2], "發射波長", "nm", (energy) => 1240 / energy, (energy, intensity, wavelength) => "能階躍遷發出 " + PL.fmt(wavelength, 0) + " nm 譜線", (x) => 1240 / x),
    "solar-cell": lab("solar", ["照度", 100, 1200, 780, "W/m²", 10, 0], ["面板面積", 0.05, 20, 1.8, "m²", 0.05, 2], "電力輸出", "W", (irradiance, area) => irradiance * area * 0.21, (irradiance, area, power) => "光伏效率取 21%；輸出 " + PL.fmt(power, 1) + " W", (x, area) => x * area * 0.21)
  };

  function label(ctx, x, y, title, value, color) {
    D.rect(ctx, x, y, 156, 36, { fill: PL.theme.shade(0.82), stroke: color, width: 1, r: 6 });
    D.text(ctx, title, x + 10, y + 13, { color: PL.col("text-faint"), size: 9 });
    D.text(ctx, value, x + 10, y + 27, { color, size: 11, weight: "700" });
  }

  /* ---------- 場景共用小工具 ---------- */
  const AP = PL.apparatus;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fr = (v, r) => clamp((v - r[1]) / Math.max(1e-9, r[2] - r[1]), 0, 1);
  const isL = () => PL.theme.isLight();
  const noteC = (ctx, col, x, y, w, h) => PL.theme.note(ctx, col, x, y, w, h);
  const TX = (ctx, str, x, y, size, align, color, w) => D.text(ctx, str, x, y, { color: color || PL.col("text"), size: size || 11, align: align || "left", weight: w === 0 ? "400" : "700" });
  const niceCeil = x => { if (!(x > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
  const hexC = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mixRgb = (a, b, u) => { const A = hexC(a), B = hexC(b); return "rgb(" + A.map((q, i) => Math.round(q + (B[i] - q) * u)).join(",") + ")"; };
  const RT = (ctx, str, x, y, size, color, align, w) => { ctx.save(); ctx.fillStyle = color; ctx.font = (w === 0 ? "" : "700 ") + size + "px 'Segoe UI','PingFang TC','Microsoft JhengHei',system-ui,sans-serif"; ctx.textAlign = align || "center"; ctx.textBaseline = "alphabetic"; ctx.fillText(str, x, y); ctx.restore(); };
  const SC = {};


  /* 混合熱水與冷水：熱水放熱、冷水吸熱，最後停在同一個平衡溫度 */
  SC["calorimetry-mixing"] = k => {
    const { ctx, W, H, a: Th, b: Tc, t, s, c, v: Te } = k;
    const benchY = H * 0.84;
    AP.labRoom(ctx, W, H, benchY, {});
    const hx = W * 0.1, cx2 = W * 0.27, kx = W * 0.45, bw = 62 * s, bh = 82 * s;
    const hp = AP.hotPlate(ctx, hx, benchY, 92 * s, (Th - 30) / 70);
    AP.beaker(ctx, hx, hp, bw, bh, 0.74, "#e8785a");
    AP.heatWaves(ctx, hx - bw / 2, hp - bh - 4 * s, bw, 50 * s, t, (Th - 50) / 48);
    AP.thermometer(ctx, hx + bw * 0.28, hp - bh - 44 * s, hp - 10 * s, 8 * s, Th / 100);
    AP.beaker(ctx, cx2, benchY, bw, bh, 0.53, "#6fb7e0");
    if (Tc < 6) for (let i = 0; i < 3; i++) { const ix = cx2 - 20 * s + i * 15 * s, iy = benchY - bh * 0.53 - 3 * s + Math.sin(t * 2 + i) * 1.5; ctx.fillStyle = "rgba(236,248,255,0.92)"; ctx.fillRect(ix - 6 * s, iy - 5 * s, 12 * s, 10 * s); ctx.strokeStyle = "rgba(140,184,220,0.9)"; ctx.lineWidth = 1; ctx.strokeRect(ix - 6 * s, iy - 5 * s, 12 * s, 10 * s); }
    AP.thermometer(ctx, cx2 + bw * 0.28, benchY - bh - 44 * s, benchY - 10 * s, 8 * s, Tc / 100);
    TX(ctx, "熱水 1.4m　" + PL.fmt(Th, 0) + "°C", hx, hp - bh - 56 * s, 11, "center", "#d0553a");
    TX(ctx, "冷水 m　" + PL.fmt(Tc, 0) + "°C", cx2, benchY - bh - 56 * s, 11, "center", "#2f7fd8");
    const u = Te / 100, mixC = "rgb(" + Math.round(111 + 121 * u) + "," + Math.round(183 - 63 * u) + "," + Math.round(224 - 134 * u) + ")";
    AP.calorimeter(ctx, kx, benchY, 72 * s, 84 * s, 0.8, mixC, Te / 100);
    D.arrow(ctx, hx + bw / 2 + 6 * s, hp - bh + 6 * s, kx - 44 * s, benchY - 104 * s, { color: "#d0553a", width: 2, head: 7 });
    D.arrow(ctx, cx2 + bw / 2 + 4 * s, benchY - bh + 10 * s, kx - 42 * s, benchY - 90 * s, { color: "#2f7fd8", width: 2, head: 7 });
    TX(ctx, "倒進保麗龍杯", kx, benchY - 182 * s, 11, "center");
    TX(ctx, PL.fmt(Te, 1) + "°C", kx + 30 * s, benchY - 40 * s, 12, "left");
    const x0 = W * 0.6, y0 = 60 * s, cw = W - x0 - 16 * s, ch = benchY - y0 - 24 * s;
    AP.infoCard(ctx, x0, y0, cw, ch);
    const gx0 = x0 + 36 * s, gx1 = x0 + cw - 14 * s, gy0 = y0 + 30 * s, gy1 = y0 + ch - 28 * s;
    const X = q => gx0 + q * (gx1 - gx0), Y = T => gy1 - T / 100 * (gy1 - gy0), q0 = clamp((t % 9) / 7, 0, 1);
    TX(ctx, "溫度–時間", x0 + 12 * s, y0 + 18 * s, 10.5);
    ctx.strokeStyle = PL.theme.pale(0.45); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 4 * s); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    [0, 50, 100].forEach(T => TX(ctx, T + "°", gx0 - 6 * s, Y(T) + 4, 9, "right", PL.col("text-dim"), 0));
    TX(ctx, "時間 →", gx1, gy1 + 16 * s, 9.5, "right", PL.col("text-dim"), 0);
    D.line(ctx, gx0, Y(Te), gx1, Y(Te), PL.col("text-dim"), 1, [4, 4]);
    [[Th, "#e0473c"], [Tc, "#2f7fd8"]].forEach(p => {
      const T = q => Te + (p[0] - Te) * Math.exp(-q / 0.16);
      ctx.save(); ctx.strokeStyle = p[1]; ctx.globalAlpha = 0.25; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const q = i / 60; i ? ctx.lineTo(X(q), Y(T(q))) : ctx.moveTo(X(q), Y(T(q))); } ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 2.4; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const q = q0 * i / 60; i ? ctx.lineTo(X(q), Y(T(q))) : ctx.moveTo(X(q), Y(T(q))); } ctx.stroke();
      ctx.fillStyle = p[1]; ctx.beginPath(); ctx.arc(X(q0), Y(T(q0)), 4 * s, 0, PL.TAU); ctx.fill(); ctx.restore();
    });
    TX(ctx, "平衡溫度 " + PL.fmt(Te, 1) + "°C", gx1, Y(Te) - 6 * s, 10.5, "right");
    TX(ctx, "放熱 = 吸熱：1.4m·c·(T熱 − T) = m·c·(T − T冷)", W - 16 * s, 42 * s, 11, "right");
    label(ctx, 20, 18, "平衡溫度", PL.fmt(Te, 1) + " °C", c);
  };

  /* 弦上的波：一端掛砝碼拉緊繩子，撥一下產生脈衝；張力越大、線越細，波跑得越快 */
  SC["string-wave-speed"] = k => {
    const { ctx, W, H, a: T, b: mu, t, s, c, v, cfg } = k;
    const benchY = H * 0.72;
    AP.labRoom(ctx, W, H, benchY, {});
    const x0 = W * 0.1, x1 = W * 0.84, sy = benchY - 56 * s, Ls = x1 - x0, pr = 13 * s;
    AP.standRod(ctx, x0 - 14 * s, benchY, sy - 40 * s);
    AP.clampHead(ctx, x0 - 14 * s, sy, 20 * s, 0);
    AP.steel(ctx, x1 - 6 * s, sy + pr, 12 * s, benchY - sy - pr, 10);
    const tv = clamp(2.6 - 1.0 * Math.log10(v / 9), 0.4, 2.6), cyc = tv + 0.8, u = (t % cyc) / tv, xp = x0 + u * Ls;
    const sw = (1.2 + 4 * fr(mu, cfg.b)) * s, col = mu < 1 ? "rgb(238,238,232)" : mu < 5 ? "rgb(220,194,140)" : "rgb(172,122,70)";
    const m = T / 9.8, nd = clamp(Math.round(m / 2), 1, 12), hy = sy + pr, dw = 36 * s;
    const hgTop = benchY + 18 * s;
    AP.cord(ctx, x1 + pr, hy, x1 + pr, hgTop);
    for (let i = 0; i < nd; i++) AP.weight(ctx, x1 + pr, hgTop + 6 * s + i * 7 * s, dw, 6.5 * s, null);
    AP.pulley(ctx, x1, hy, pr);
    ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = "rgba(40,30,20,0.5)"; ctx.lineWidth = sw + 1.5; ctx.beginPath();
    const yAt = x => sy - (u <= 1 ? 18 * s * Math.exp(-Math.pow((x - xp) / (24 * s), 2)) : 0);
    for (let x = x0; x <= x1; x += 3) { const y = yAt(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.lineTo(x1 + pr * 0.2, sy); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = sw; ctx.stroke(); ctx.restore();
    AP.hand(ctx, x0 + 18 * s, sy + 16 * s, 1, 0.75 * s, { ang: -0.5 - (u < 0.08 ? 0.5 : 0) });
    [0.32, 0.78].forEach((q, i) => {
      const gx = x0 + q * Ls, lit = u <= 1 && Math.abs(xp - gx) < 14 * s;
      ctx.fillStyle = "rgb(46,50,58)"; ctx.fillRect(gx - 8 * s, sy - 30 * s, 16 * s, 8 * s); ctx.fillRect(gx - 8 * s, sy + 14 * s, 16 * s, 8 * s); ctx.fillRect(gx - 8 * s, sy - 30 * s, 4 * s, 52 * s);
      ctx.fillStyle = lit ? "rgb(90,240,120)" : "rgb(200,60,50)"; ctx.beginPath(); ctx.arc(gx + 3 * s, sy - 26 * s, 2.5 * s, 0, PL.TAU); ctx.fill();
      AP.steel(ctx, gx - 2 * s, sy + 22 * s, 4 * s, benchY - sy - 22 * s, 10);
      TX(ctx, "光電門 " + (i ? "B" : "A"), gx, sy - 38 * s, 10, "center", null, 0);
    });
    const dt = 1.2 / v * 1000;
    AP.lcd(ctx, x0 + 0.46 * Ls, benchY - 30 * s, 120 * s, 22 * s, "Δt " + PL.fmt(dt, dt < 10 ? 2 : 1) + " ms", { color: "rgb(255,200,110)" });
    TX(ctx, "A→B 相距 1.2 m（動畫已放慢）", x0 + 0.55 * Ls, benchY + 14 * s, 10, "center", PL.col("text-dim"), 0);
    TX(ctx, "張力 T = " + PL.fmt(T, 0) + " N（約掛 " + PL.fmt(m, 1) + " kg）", x1 - 20 * s, benchY + 34 * s, 11, "right");
    TX(ctx, "線密度 μ = " + PL.fmt(mu, 1) + " g/m（" + (mu < 1 ? "釣魚線" : mu < 5 ? "棉線" : "粗繩") + "）", W - 16 * s, 44 * s, 11, "right");
    TX(ctx, "v = √(T/μ) = " + PL.fmt(v, 1) + " m/s", W - 16 * s, 64 * s, 12.5, "right");
    label(ctx, 20, 18, "波速 v", PL.fmt(v, 1) + " m/s", c);
  };

  /* 聲音的三要素：訊號產生器推動喇叭，空氣分子疏密傳到麥克風，示波器看頻率與振幅 */
  const NOTE = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"], SOL = ["do", "do♯", "re", "re♯", "mi", "fa", "fa♯", "sol", "sol♯", "la", "la♯", "si"];
  SC["sound-properties"] = k => {
    const { ctx, W, H, a: f, b: A, t, s, c, v: db, cfg } = k;
    const benchY = H * 0.68;
    AP.labRoom(ctx, W, H, benchY, {});
    const gen = AP.powerSupply(ctx, 16 * s, benchY - 60 * s, 116 * s, 58 * s, PL.fmt(f, 0) + " Hz", { label: "訊號產生器", color: "rgb(130,230,255)", knob: fr(f, cfg.a) });
    const spx = 176 * s, spy = benchY - 44 * s, pa = Math.min(A, 2) / 2;
    AP.cable(ctx, [gen.red, { x: gen.red.x + 10 * s, y: benchY - 4 * s }, { x: spx - 20 * s, y: benchY - 4 * s }], "rgb(186,54,48)", 2.4 * s, 3);
    AP.speaker(ctx, spx, spy, 1.15 * s, Math.sin(t * 14) * pa, 1);
    const mcx = W * 0.54, lam = 343 / f * 90 * s, x0 = spx + 18 * s, gap = 8 * s, amp = pa * 7 * s;
    ctx.fillStyle = PL.theme.isLight() ? "rgba(40,70,110,0.55)" : "rgba(200,220,245,0.55)";
    for (let x = x0; x < mcx - 16 * s; x += gap) for (let j = 0; j < 9; j++) {
      const y = spy - 36 * s + j * 9 * s + ((x * 7 + j * 13) % 5), dx = amp * Math.sin(PL.TAU * ((x - x0) / lam - 1.1 * t));
      ctx.fillRect(x + dx - 1.1, y - 1.1, 2.2, 2.2);
    }
    AP.microphone(ctx, mcx, benchY, 58 * s, -1);
    const ox = W * 0.62, ow = W - ox - 16 * s, oh = Math.min(170 * s, benchY - 40 * s), oy = benchY - oh - 2;
    AP.cable(ctx, [{ x: mcx, y: benchY - 3 * s }, { x: ox + 14 * s, y: benchY - 3 * s }], "rgb(40,44,52)", 2.4 * s, 2);
    const scr = AP.oscilloscope(ctx, ox, oy, ow, oh, { label: "示波器" });
    const cyc = f * 0.005, ya = pa * scr.h * 0.42;
    ctx.save(); ctx.strokeStyle = "rgb(255,226,90)"; ctx.shadowColor = "rgba(255,226,90,0.8)"; ctx.shadowBlur = 5; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 240; i++) { const q = i / 240, x = scr.x + q * scr.w, y = scr.y + scr.h / 2 - ya * Math.sin(PL.TAU * (q * cyc - t * 0.4)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
    D.text(ctx, "5 ms 內有 " + PL.fmt(cyc, 1) + " 個波", scr.x + 6 * s, scr.y + 14 * s, { color: "rgba(180,240,200,0.9)", size: 9.5 });
    AP.lcd(ctx, mcx - 40 * s, benchY - 108 * s, 80 * s, 22 * s, PL.fmt(db, 1) + " dB", { color: "rgb(255,190,110)" });
    TX(ctx, "聲級計", mcx, benchY - 114 * s, 10, "center", null, 0);
    TX(ctx, "疏密波（慢動作）", (x0 + mcx) / 2, spy - 46 * s, 10.5, "center");
    const n = Math.round(12 * Math.log2(f / 440)) + 57, pc = ((n % 12) + 12) % 12, oct = Math.floor(n / 12);
    const kx0 = W * 0.08, ky0 = benchY + 24 * s, kw = 24 * s, kh = 70 * s, wk = [0, 2, 4, 5, 7, 9, 11], bk = [[1, 1], [3, 2], [6, 4], [8, 5], [10, 6]];
    AP.infoCard(ctx, kx0 - 10 * s, ky0 - 10 * s, kw * 7 + 20 * s, kh + 20 * s);
    wk.forEach((p, i) => { ctx.fillStyle = p === pc ? "rgb(255,196,90)" : "rgb(252,252,248)"; ctx.fillRect(kx0 + i * kw, ky0, kw - 1.5, kh); ctx.strokeStyle = "rgba(40,40,40,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(kx0 + i * kw, ky0, kw - 1.5, kh); });
    bk.forEach(b => { ctx.fillStyle = b[0] === pc ? "rgb(255,160,60)" : "rgb(30,30,34)"; ctx.fillRect(kx0 + b[1] * kw - kw * 0.3, ky0, kw * 0.6, kh * 0.6); });
    TX(ctx, "最接近的音：" + NOTE[pc] + oct + "（" + SOL[pc] + "）", kx0 + kw * 7 + 22 * s, ky0 + 22 * s, 12.5);
    TX(ctx, "頻率決定音調高低，振幅決定聲音大小", kx0 + kw * 7 + 22 * s, ky0 + 44 * s, 11, "left", PL.col("text-dim"), 0);
    TX(ctx, "振幅 ×2 → 聲級多 6 dB", kx0 + kw * 7 + 22 * s, ky0 + 64 * s, 11, "left", PL.col("text-dim"), 0);
    label(ctx, 20, 18, "聲級", PL.fmt(db, 1) + " dB", c);
  };

  /* 回聲定位：蝙蝠發出超音波，碰到飛蛾反彈回來；d = vt/2 */
  function bat(ctx, x, y, k, ph) {
    const w = 0.35 + 0.65 * Math.abs(Math.cos(ph));
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = "rgb(62,50,66)";
    [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(-8 * k, 0); ctx.lineTo(-18 * k, sd * 18 * k * w); ctx.quadraticCurveTo(-10 * k, sd * 14 * k * w, -4 * k, sd * 32 * k * w); ctx.quadraticCurveTo(0, sd * 20 * k * w, 6 * k, sd * 26 * k * w); ctx.quadraticCurveTo(6 * k, sd * 10 * k * w, 8 * k, 0); ctx.closePath(); ctx.fill(); });
    ctx.fillStyle = "rgb(84,68,86)"; ctx.beginPath(); ctx.ellipse(0, 0, 12 * k, 6 * k, 0, 0, PL.TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(12 * k, -1 * k, 5.5 * k, 0, PL.TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10 * k, -5 * k); ctx.lineTo(9 * k, -12 * k); ctx.lineTo(13 * k, -6 * k); ctx.moveTo(14 * k, -5 * k); ctx.lineTo(16 * k, -11 * k); ctx.lineTo(17 * k, -4 * k); ctx.fill();
    ctx.fillStyle = "rgb(255,220,120)"; ctx.beginPath(); ctx.arc(14.5 * k, -2 * k, 1.2 * k, 0, PL.TAU); ctx.fill();
    ctx.restore();
  }
  SC["echo-ultrasound"] = k => {
    const { ctx, W, H, a: te, b: vs, t, s, c, v: d } = k;
    const gy = H * 0.88;
    AP.outdoor(ctx, W, H, gy, { t, hills: true, sunX: W * 0.5 });
    for (let i = 0; i < 7; i++) AP.tree(ctx, 20 * s + i * W / 6.5, gy + 2, (70 + (i % 3) * 22) * s, 5 + i);
    const bx = W * 0.1, by = H * 0.42, mx = bx + 50 * s + Math.sqrt(d / 36) * (W * 0.82 - 50 * s), my = by + Math.sin(t * 1.3) * 6 * s, D2 = mx - bx - 16 * s;
    const cyc = clamp(1 + 10 * te, 1, 3), u = (t % cyc) / cyc;
    ctx.save(); ctx.lineWidth = 2;
    for (let j = 0; j < 3; j++) {
      const q = u * 2 - j * 0.06;
      if (q > 0 && q < 1) { ctx.strokeStyle = `rgba(255,170,60,${(0.9 - j * 0.25).toFixed(2)})`; ctx.beginPath(); ctx.arc(bx + 16 * s, by, q * D2, -0.4, 0.4); ctx.stroke(); }
      if (q > 1 && q < 2) { ctx.strokeStyle = `rgba(80,210,255,${(0.9 - j * 0.25).toFixed(2)})`; ctx.beginPath(); ctx.arc(mx, my, (q - 1) * D2, Math.PI - 0.4, Math.PI + 0.4); ctx.stroke(); }
    }
    ctx.restore();
    bat(ctx, bx, by, 1.4 * s, t * 14);
    ctx.save(); ctx.translate(mx, my); const mw = Math.abs(Math.sin(t * 22));
    ctx.fillStyle = "rgb(214,190,150)"; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(-2 * s, sd * 6 * s * mw, 5 * s, 6 * s * mw + 1, sd * 0.4, 0, PL.TAU); ctx.fill(); });
    ctx.fillStyle = "rgb(120,96,70)"; ctx.beginPath(); ctx.ellipse(0, 0, 7 * s, 2.5 * s, 0, 0, PL.TAU); ctx.fill(); ctx.restore();
    const yd = by + 58 * s;
    D.arrow(ctx, bx + 16 * s, yd, mx, yd, { color: PL.col("text-dim"), width: 1.4, head: 6 }); D.arrow(ctx, mx, yd, bx + 16 * s, yd, { color: PL.col("text-dim"), width: 1.4, head: 6 });
    TX(ctx, "d = vt / 2 = " + PL.fmt(d, 2) + " m", (bx + mx) / 2, yd + 18 * s, 12, "center");
    TX(ctx, u < 0.5 ? "發出超音波 →" : "← 回聲", u < 0.5 ? bx + 30 * s : mx - 20 * s, by - 40 * s, 11, u < 0.5 ? "left" : "right", u < 0.5 ? "#e0843a" : "#1c9ad0");
    const cw = Math.min(W * 0.44, 330 * s), x0 = W - cw - 16 * s, y0 = 16 * s, ch = 64 * s;
    AP.infoCard(ctx, x0, y0, cw, ch);
    const tx0 = x0 + 16 * s, tx1 = x0 + cw - 16 * s, ty = y0 + 36 * s;
    ctx.fillStyle = PL.theme.pale(0.25); ctx.fillRect(tx0, ty - 2, tx1 - tx0, 4);
    ctx.fillStyle = "#e0843a"; ctx.fillRect(tx0, ty - 2, (tx1 - tx0) * Math.min(u * 2, 1) / 2, 4);
    ctx.fillStyle = "#1c9ad0"; if (u > 0.5) ctx.fillRect((tx0 + tx1) / 2, ty - 2, (tx1 - tx0) * (u - 0.5), 4);
    ctx.fillStyle = PL.col("text"); ctx.beginPath(); ctx.arc(tx0 + (tx1 - tx0) * u, ty, 4 * s, 0, PL.TAU); ctx.fill();
    TX(ctx, "發出", tx0, ty + 18 * s, 10, "left", null, 0); TX(ctx, "收到回聲：t = " + PL.fmt(te * 1000, 0) + " ms", tx1, ty + 18 * s, 10, "right");
    TX(ctx, "往返一趟", x0 + cw / 2, y0 + 18 * s, 10.5, "center");
    TX(ctx, "聲速 " + PL.fmt(vs, 0) + " m/s（氣溫約 " + PL.fmt((vs - 331) / 0.6, 0) + "°C）", W - 16 * s, y0 + ch + 22 * s, 11, "right");
    label(ctx, 20, 18, "障礙物距離", PL.fmt(d, 2) + " m", c);
  };

  /* 地震與隔震：地面左右搖晃，建築坐在橡膠隔震墊上；地面頻率接近建築的自然頻率就會共振 */
  SC["seismic-waves"] = k => {
    const { ctx, W, H, a: f, b: Tb, t, s, c, v: R, cfg } = k;
    const L = isL(), gy = H * 0.8;
    AP.outdoor(ctx, W, H, gy, { t, city: true, hills: true, sunX: W * 0.6 });
    const fv = Math.min(f, 2.4) * 0.8, ag = 5 * s, ph = PL.TAU * fv * t, xg = ag * Math.sin(ph), Rv = Math.min(R, 3.6), xb = Rv * ag * 1.6 * Math.sin(ph - 0.5);
    const bx = W * 0.34, bw = 150 * s, nF = 8, fh = 26 * s, padH = (8 + 26 * fr(Tb, cfg.b)) * s, fy = gy - 12 * s;
    ctx.fillStyle = L ? "#b9b4aa" : "#55524c"; ctx.fillRect(bx - bw / 2 - 26 * s + xg, fy, bw + 52 * s, 16 * s);
    for (let i = 0; i < 4; i++) {
      const px = bx - bw / 2 + 14 * s + i * (bw - 28 * s) / 3, pw = 22 * s, x0 = px + xg, x1 = px + xb + xg * 0.2;
      AP.poly(ctx, [{ x: x0 - pw / 2, y: fy }, { x: x0 + pw / 2, y: fy }, { x: x1 + pw / 2, y: fy - padH }, { x: x1 - pw / 2, y: fy - padH }], "rgb(52,54,60)");
      ctx.strokeStyle = "rgba(200,204,210,0.6)"; ctx.lineWidth = 1;
      for (let j = 1; j < 4; j++) { const q = j / 4; ctx.beginPath(); ctx.moveTo(x0 - pw / 2 + (x1 - x0) * q, fy - padH * q); ctx.lineTo(x0 + pw / 2 + (x1 - x0) * q, fy - padH * q); ctx.stroke(); }
    }
    const baseY = fy - padH, sway = xb * 0.25;
    for (let i = 0; i < nF; i++) {
      const y1 = baseY - i * fh, off = xb + xg * 0.2 + sway * (i / nF);
      ctx.fillStyle = i % 2 ? (L ? "#dfd6c6" : "#46464e") : (L ? "#e9e1d2" : "#4e4e56"); ctx.fillRect(bx - bw / 2 + off, y1 - fh, bw, fh);
      for (let j = 0; j < 5; j++) { ctx.fillStyle = L ? "rgba(110,160,205,0.85)" : ((i + j) % 3 ? "rgba(40,56,80,0.95)" : "rgba(255,210,120,0.8)"); ctx.fillRect(bx - bw / 2 + off + 10 * s + j * 27 * s, y1 - fh + 7 * s, 16 * s, 12 * s); }
    }
    noteC(ctx, L ? "#e4dccd" : "#4a4a52", bx - bw / 2, baseY - nF * fh, bw, nF * fh);
    ctx.fillStyle = L ? "#8a7f70" : "#2e2e34"; ctx.fillRect(bx - bw / 2 - 4 * s + xb + xg * 0.2 + sway, baseY - nF * fh - 6 * s, bw + 8 * s, 6 * s);
    if (R > 2) { ctx.strokeStyle = "rgba(60,40,30,0.8)"; ctx.lineWidth = 1.5; ctx.beginPath(); const cx0 = bx + xb + 20 * s, cy0 = baseY - 3 * fh; ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 + 8 * s, cy0 + 12 * s); ctx.lineTo(cx0 + 2 * s, cy0 + 22 * s); ctx.lineTo(cx0 + 10 * s, cy0 + 34 * s); ctx.stroke(); }
    ctx.save(); ctx.strokeStyle = L ? "rgba(110,80,50,0.55)" : "rgba(220,200,170,0.4)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { const x = 30 * s + i * W / 5 + xg * 1.5; ctx.beginPath(); ctx.moveTo(x, gy + 10 * s); ctx.quadraticCurveTo(x + 6 * s, gy + 4 * s, x + 12 * s, gy + 10 * s); ctx.quadraticCurveTo(x + 18 * s, gy + 16 * s, x + 24 * s, gy + 10 * s); ctx.stroke(); }
    ctx.restore();
    D.arrow(ctx, bx + xg - 30 * s, gy + 30 * s, bx + xg + 30 * s, gy + 30 * s, { color: "#e0843a", width: 2.4, head: 7 }); D.arrow(ctx, bx + xg + 30 * s, gy + 30 * s, bx + xg - 30 * s, gy + 30 * s, { color: "#e0843a", width: 2.4, head: 7 });
    TX(ctx, "地面左右搖晃 " + PL.fmt(f, 2) + " Hz", bx + 44 * s, gy + 34 * s, 11);
    TX(ctx, "隔震墊（週期 " + PL.fmt(Tb, 2) + " s）", bx + bw / 2 + 36 * s, fy - padH / 2 + 4, 10.5);
    AP.dial(ctx, W - 90 * s, H * 0.4, 48 * s, Rv / 4, { max: 4, unit: "倍", majors: 4 });
    TX(ctx, "建築反應 ÷ 地面搖晃", W - 90 * s, H * 0.4 - 58 * s, 10.5, "center");
    TX(ctx, R > 2 ? "接近共振，搖得特別厲害！" : R < 1 ? "隔震有效：比地面搖得還少" : "反應略大於地面", W - 90 * s, H * 0.4 + 62 * s, 11.5, "center", R > 2 ? "#e0473c" : null);
    TX(ctx, "地面頻率 × 隔震週期 = " + PL.fmt(f * Tb, 2) + "（越接近 1 越危險）", W - 16 * s, 44 * s, 11, "right");
    label(ctx, 20, 18, "相對反應", PL.fmt(R, 2) + " 倍", c);
  };

  /* 針孔成像：燭光穿過紙盒上的小孔，在半透明紙上形成倒立的像；像的大小 = 物高 × 光屏距離 ÷ 物距 */
  SC["shadow-pinhole"] = k => {
    const { ctx, W, H, a: dO, b: dS, t, s, c, v: mag } = k;
    const L = isL(), benchY = H * 0.8;
    AP.labRoom(ctx, W, H, benchY, {});
    const xo = W * 0.08, ppm = W * 0.6 / (dO + dS), xp = xo + dO * ppm, xs = xp + dS * ppm, hC = Math.max(14 * s, 0.2 * ppm);
    const bxh = Math.max(70 * s, 2 * (hC + 30 * s)), ay = benchY - bxh / 2, cb = Math.min(benchY, ay + hC * 0.5 + 12 * s);
    if (cb < benchY - 1) { ctx.fillStyle = PL.theme.isLight() ? "rgb(170,130,84)" : "rgb(110,82,52)"; ctx.fillRect(xo - 20 * s, cb, 40 * s, benchY - cb); }
    const cd = AP.candle(ctx, xo, cb, { h: hC, r: Math.max(4, hC * 0.14) });
    const top = cd.flameY - 4 * s, bot = cb - 6 * s;
    const imgT = ay + (ay - top) * dS / dO, imgB = ay + (ay - bot) * dS / dO;
    ctx.fillStyle = L ? "rgb(196,160,112)" : "rgb(120,96,66)"; ctx.fillRect(xp, ay - bxh / 2, Math.max(4 * s, xs - xp), bxh);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(xp, ay - bxh / 2, Math.max(4 * s, xs - xp), 5 * s);
    ctx.save(); ctx.strokeStyle = "rgba(255,196,90,0.75)"; ctx.lineWidth = 1.4; ctx.shadowColor = "rgba(255,190,80,0.7)"; ctx.shadowBlur = 4;
    [[top, imgT], [bot, imgB]].forEach(p => { ctx.beginPath(); ctx.moveTo(xo, p[0]); ctx.lineTo(xp, ay); ctx.lineTo(xs, p[1]); ctx.stroke(); });
    ctx.restore();
    ctx.fillStyle = "rgba(250,244,226,0.9)"; ctx.fillRect(xs - 2 * s, ay - bxh / 2, 4 * s, bxh);
    ctx.save(); ctx.beginPath(); ctx.rect(xs - 6 * s, ay - bxh / 2, 12 * s, bxh); ctx.clip();
    ctx.strokeStyle = "rgba(255,170,40,0.95)"; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(xs, imgT); ctx.lineTo(xs, imgB); ctx.stroke(); ctx.restore();
    ctx.fillStyle = "rgb(20,20,20)"; ctx.fillRect(xp - 1.5 * s, ay - bxh / 2, 3 * s, bxh); ctx.fillStyle = "rgb(255,236,170)"; ctx.fillRect(xp - 1.5 * s, ay - 1.5 * s, 3 * s, 3 * s);
    const yd = benchY + 20 * s;
    [[xo, xp, "物距 " + PL.fmt(dO, 1) + " m"], [xp, xs, "光屏 " + PL.fmt(dS, 2) + " m"]].forEach(q => { if (q[1] - q[0] > 12 * s) { D.arrow(ctx, q[0], yd, q[1], yd, { color: PL.col("text-dim"), width: 1.3, head: 5 }); D.arrow(ctx, q[1], yd, q[0], yd, { color: PL.col("text-dim"), width: 1.3, head: 5 }); } TX(ctx, q[2], (q[0] + q[1]) / 2, yd + 18 * s, 10.5, "center"); });
    TX(ctx, "針孔", xp, ay - bxh / 2 - 10 * s, 10.5, "center");
    const iw = Math.min(200 * s, W * 0.25), ix = W - iw - 18 * s, iy = 56 * s;
    const pap = AP.paperScreen(ctx, ix + iw / 2, iy + iw / 2, iw, iw);
    const hp = clamp(mag * 260 * s, 3, 900), br = clamp(Math.pow(0.45 / dS, 2), 0.15, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(pap.x, pap.y, pap.w, pap.h); ctx.clip(); ctx.globalAlpha = br;
    ctx.translate(ix + iw / 2, iy + iw / 2 - hp * 0.2); ctx.scale(1 + Math.sin(t * 9) * 0.02, 1);
    AP.projectedFlame(ctx, 0, 0, hp, true, 1);
    ctx.restore();
    TX(ctx, "光屏上看到的像（倒立）", ix + iw / 2, iy - 10 * s, 11, "center");
    TX(ctx, "像的亮度隨光屏變遠而變暗", ix + iw / 2, iy + iw + 26 * s, 10, "center", PL.col("text-dim"), 0);
    TX(ctx, "倍率 = 光屏距離 ÷ 物距", 190 * s, 44 * s, 12);
    label(ctx, 20, 18, "像的倍率", PL.fmt(mag, 2) + " 倍", c);
  };

  /* 色光三原色：紅、綠、藍三盞投射燈打在黑幕上，重疊處相加混色 */
  SC["rgb-color-mixing"] = k => {
    const { ctx, W, H, a: R, b: G, t, s, c, v: Yl } = k;
    const B = 42, fy = H * 0.9;
    AP.labRoom(ctx, W, H, fy, { bench: "none" }); AP.woodFloor(ctx, W, H, fy);
    const bx0 = 18 * s, by0 = 80 * s, bw = W * 0.6, bh = fy - by0 - 6 * s;
    ctx.fillStyle = "rgb(16,16,20)"; ctx.fillRect(bx0, by0, bw, bh); noteC(ctx, "rgb(16,16,20)", bx0, by0, bw, bh);
    ctx.fillStyle = "rgba(255,255,255,0.03)"; for (let x = bx0 + 12 * s; x < bx0 + bw; x += 24 * s) ctx.fillRect(x, by0, 8 * s, bh);
    AP.steel(ctx, bx0 - 6 * s, by0 - 16 * s, bw + 12 * s, 10 * s, 8);
    const cx = bx0 + bw / 2, cy = by0 + bh * 0.56, rr = Math.min(bw, bh) * 0.27, off = rr * 0.62;
    const P = [[cx - off * 0.87, cy - off * 0.5, [255, 0, 0], R], [cx + off * 0.87, cy - off * 0.5, [0, 255, 0], G], [cx, cy + off, [0, 0, 255], B]];
    const lamps = [bx0 + bw * 0.2, bx0 + bw * 0.8, bx0 + bw * 0.5];
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    P.forEach((p, i) => {
      const k2 = p[3] / 100, col = a => `rgba(${p[2][0]},${p[2][1]},${p[2][2]},${(a * k2).toFixed(3)})`;
      const lx = lamps[i], ly = by0 + 6 * s;
      ctx.fillStyle = col(0.12); ctx.beginPath(); ctx.moveTo(lx - 6 * s, ly); ctx.lineTo(p[0] - rr, p[1]); ctx.lineTo(p[0] + rr, p[1]); ctx.lineTo(lx + 6 * s, ly); ctx.closePath(); ctx.fill();
      const g = ctx.createRadialGradient(p[0], p[1], rr * 0.2, p[0], p[1], rr);
      g.addColorStop(0, col(1)); g.addColorStop(0.85, col(0.92)); g.addColorStop(1, col(0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, PL.TAU); ctx.fill();
    });
    ctx.restore();
    lamps.forEach((lx, i) => { ctx.fillStyle = "rgb(40,42,48)"; AP.rrPath(ctx, lx - 12 * s, by0 - 10 * s, 24 * s, 22 * s, 4 * s); ctx.fill(); ctx.fillStyle = ["rgb(255,70,60)", "rgb(80,255,110)", "rgb(90,120,255)"][i]; ctx.beginPath(); ctx.arc(lx, by0 + 10 * s, 6 * s, 0, Math.PI); ctx.fill(); });
    TX(ctx, "紅 " + PL.fmt(R, 0) + "%", P[0][0] - rr * 0.55, P[0][1] - rr * 0.45, 11, "center", "#ffb0a8");
    TX(ctx, "綠 " + PL.fmt(G, 0) + "%", P[1][0] + rr * 0.55, P[1][1] - rr * 0.45, 11, "center", "#b0ffb8");
    TX(ctx, "藍 42%（固定）", P[2][0], P[2][1] + rr * 0.78, 11, "center", "#b8c8ff");
    const r8 = Math.round(R * 2.55), g8 = Math.round(G * 2.55), b8 = Math.round(B * 2.55), hex = "#" + [r8, g8, b8].map(q => q.toString(16).padStart(2, "0")).join("").toUpperCase();
    const px = W * 0.68, pw = W - px - 22 * s, py = by0, ph = Math.min(bh, pw * 1.8);
    ctx.fillStyle = "rgb(30,32,38)"; AP.rrPath(ctx, px, py, pw, ph, 14 * s); ctx.fill();
    const sx = px + 8 * s, sy = py + 14 * s, sw = pw - 16 * s, sh = ph - 28 * s;
    ctx.fillStyle = "rgb(8,8,10)"; ctx.fillRect(sx, sy, sw, sh); noteC(ctx, "rgb(8,8,10)", sx, sy, sw, sh);
    const cell = sw / 3 - 4 * s, cy2 = sy + 34 * s, chh = sh * 0.42;
    [[r8, 0, 0], [0, g8, 0], [0, 0, b8]].forEach((q, i) => { ctx.fillStyle = `rgb(${q[0]},${q[1]},${q[2]})`; ctx.fillRect(sx + 6 * s + i * (cell + 4 * s) - 2 * s, cy2, cell - 4 * s, chh); });
    D.text(ctx, "放大看一個像素", sx + sw / 2, sy + 20 * s, { color: "rgba(220,226,236,0.9)", size: 10, align: "center" });
    ctx.fillStyle = `rgb(${r8},${g8},${b8})`; ctx.fillRect(sx + 10 * s, cy2 + chh + 30 * s, sw - 20 * s, sh - chh - 70 * s);
    D.text(ctx, "混出來：" + hex, sx + sw / 2, cy2 + chh + 20 * s, { color: "rgba(220,226,236,0.95)", size: 10.5, align: "center", weight: "700" });
    TX(ctx, "亮度 Y = 0.21R + 0.72G + 0.07B（綠光最亮）", W - 16 * s, 44 * s, 11, "right");
    label(ctx, 20, 18, "感知亮度 Y", PL.fmt(Yl, 0) + " %", c);
  };

  /* 光纖：雷射光在纖芯裡一路全反射前進；距離越長、彎得越急，損耗越大 */
  SC["fiber-optics"] = k => {
    const { ctx, W, H, a: Lk, b: rb, t, s, c, v: I, cfg } = k;
    const L = isL(), benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const lbx = 26 * s, spx = W * 0.42, spy = benchY - 56 * s, sr = 50 * s, mx = W * 0.8;
    ctx.fillStyle = "rgb(52,58,70)"; AP.rrPath(ctx, lbx, benchY - 46 * s, 92 * s, 46 * s, 6 * s); ctx.fill(); noteC(ctx, "rgb(52,58,70)", lbx, benchY - 46 * s, 92 * s, 46 * s);
    D.text(ctx, "雷射", lbx + 40 * s, benchY - 18 * s, { color: "rgba(230,236,244,0.9)", size: 11, align: "center", weight: "700" });
    ctx.save(); ctx.shadowColor = "rgba(255,60,40,0.9)"; ctx.shadowBlur = 10; ctx.fillStyle = "rgb(255,70,50)"; ctx.beginPath(); ctx.arc(lbx + 92 * s, benchY - 24 * s, 3.5 * s, 0, PL.TAU); ctx.fill(); ctx.restore();
    const wr = (16 + 28 * fr(Lk, cfg.a)) * s;
    AP.cable(ctx, [{ x: lbx + 92 * s, y: benchY - 24 * s }, { x: spx - wr, y: spy }], "rgb(250,200,60)", 3 * s, 8);
    ctx.fillStyle = "rgb(236,196,70)"; ctx.beginPath(); ctx.arc(spx, spy, wr, 0, PL.TAU); ctx.fill();
    ctx.strokeStyle = "rgba(150,110,20,0.6)"; ctx.lineWidth = 1; for (let r = 12 * s; r < wr; r += 3 * s) { ctx.beginPath(); ctx.arc(spx, spy, r, 0, PL.TAU); ctx.stroke(); }
    ctx.strokeStyle = "rgb(70,76,88)"; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.arc(spx, spy, sr, 0, PL.TAU); ctx.stroke(); AP.brassDisc(ctx, spx, spy, 10 * s);
    AP.steel(ctx, spx - 6 * s, spy + sr, 12 * s, benchY - spy - sr, 10);
    TX(ctx, "光纖捲 " + PL.fmt(Lk, 0) + " km", spx, spy - sr - 10 * s, 11, "center");
    AP.cable(ctx, [{ x: spx + wr, y: spy }, { x: mx - 50 * s, y: benchY - 24 * s }], "rgb(250,200,60)", 3 * s, 8);
    const mt = AP.multimeter(ctx, mx - 50 * s, benchY - 118 * s, 100 * s, 116 * s, PL.fmt(I, 1), { unit: "%" });
    ctx.save(); ctx.shadowColor = `rgba(255,60,40,${(I / 100).toFixed(2)})`; ctx.shadowBlur = 14; ctx.fillStyle = `rgba(255,80,60,${(0.15 + 0.85 * I / 100).toFixed(2)})`; ctx.beginPath(); ctx.arc(mx - 52 * s, benchY - 24 * s, 4 * s, 0, PL.TAU); ctx.fill(); ctx.restore();
    TX(ctx, "光功率計", mx, benchY - 126 * s, 10.5, "center");
    const cx0 = 24 * s, cy0 = 60 * s, cw = W - 48 * s, ch = spy - sr - 30 * s - cy0;
    ctx.fillStyle = "rgb(14,18,28)"; AP.rrPath(ctx, cx0, cy0, cw, ch, 10 * s); ctx.fill(); noteC(ctx, "rgb(14,18,28)", cx0, cy0, cw, ch);
    const Rb = (18 + 1.6 * rb) * s, fy = cy0 + ch * 0.36, fx0 = cx0 + 20 * s, fxb = cx0 + cw * 0.62, cl = 22 * s, co = 9 * s;
    const path = () => { ctx.beginPath(); ctx.moveTo(fx0, fy); ctx.lineTo(fxb, fy); ctx.arc(fxb, fy + Rb, Rb, -Math.PI / 2, 0); ctx.lineTo(fxb + Rb, cy0 + ch + 2); };
    ctx.save(); ctx.beginPath(); ctx.rect(cx0, cy0, cw, ch); ctx.clip(); ctx.lineCap = "butt";
    path(); ctx.strokeStyle = "rgba(170,200,230,0.35)"; ctx.lineWidth = cl; ctx.stroke();
    path(); ctx.strokeStyle = "rgba(120,170,230,0.45)"; ctx.lineWidth = co; ctx.stroke();
    ctx.strokeStyle = "rgb(255,90,70)"; ctx.lineWidth = 1.8; ctx.shadowColor = "rgba(255,80,60,0.9)"; ctx.shadowBlur = 6; ctx.beginPath();
    const seg = 34 * s, sh = (t * 60 * s) % (2 * seg);
    for (let x = fx0 - 2 * seg + sh, i = 0; x < fxb; x += seg, i++) { const y = fy + (i % 2 ? 1 : -1) * co / 2; x === fx0 - 2 * seg + sh ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.shadowBlur = 0;
    const nl = clamp(Math.round(0.12 / rb / 0.006 * 1.6), 0, 8);
    for (let i = 0; i < nl; i++) { const a = -Math.PI / 2 + (i + 0.5) / nl * Math.PI / 2, r1 = Rb + co / 2, r2 = Rb + cl / 2 + (18 + 10 * Math.sin(t * 3 + i)) * s; ctx.strokeStyle = `rgba(255,120,70,${(0.35 + 0.5 * nl / 8).toFixed(2)})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(fxb + Math.cos(a) * r1, fy + Rb + Math.sin(a) * r1); ctx.lineTo(fxb + Math.cos(a) * r2, fy + Rb + Math.sin(a) * r2); ctx.stroke(); }
    ctx.restore();
    D.text(ctx, "放大：纖芯（折射率較高）外包披覆層，光在界面一再全反射", cx0 + 14 * s, cy0 + 18 * s, { color: "rgba(214,224,240,0.92)", size: 10.5 });
    D.text(ctx, "彎曲半徑 " + PL.fmt(rb, 0) + " mm", fxb + Rb + 20 * s, fy + Rb * 0.5, { color: "rgba(214,224,240,0.92)", size: 10.5, weight: "700" });
    if (nl > 2) D.text(ctx, "彎太急：入射角變小、不再全反射而漏光", fxb - 10 * s, cy0 + ch - 12 * s, { color: "rgb(255,150,110)", size: 10.5, align: "right", weight: "700" });
    label(ctx, 20, 18, "傳輸強度", PL.fmt(I, 1) + " %", c);
  };

  /* 人眼成像：光線經角膜與水晶體折射，要剛好聚在視網膜上才看得清楚 */
  SC["human-eye"] = k => {
    const { ctx, W, H, a: dO, b: f, t, s, c, v: vi } = k;
    const L = isL(), fy = H * 0.9;
    AP.labRoom(ctx, W, H, fy, { bench: "none" }); AP.woodFloor(ctx, W, H, fy);
    const ppc = 118 * s, ex = W * 0.52, ey = H * 0.46, er = 1.2 * ppc, xl = ex - 0.95 * ppc, xr = xl + 2.0 * ppc;
    const ox = 60 * s + (W * 0.3 - 60 * s) * (1 - Math.log10(dO / 0.1) / Math.log10(80)), oh = clamp(58 * s * (0.5 / dO) ** 0.35, 16 * s, 80 * s);
    ctx.fillStyle = "rgb(250,250,246)"; ctx.fillRect(ox - oh * 0.5, ey - oh, oh, oh); ctx.strokeStyle = "rgba(60,60,60,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(ox - oh * 0.5, ey - oh, oh, oh); noteC(ctx, "rgb(250,250,246)", ox - oh * 0.5, ey - oh, oh, oh);
    D.text(ctx, "E", ox, ey - oh * 0.22, { color: "#1b1f27", size: Math.round(oh * 0.72), align: "center", weight: "700" });
    AP.steel(ctx, ox - 2 * s, ey, 4 * s, fy - ey, 10);
    TX(ctx, "視力表 " + PL.fmt(dO, 2) + " m", ox, ey + 22 * s, 10.5, "center"); TX(ctx, "（距離未依比例）", ox, ey + 38 * s, 9.5, "center", PL.col("text-dim"), 0);
    ctx.save(); ctx.strokeStyle = "rgb(236,206,120)"; ctx.lineWidth = 14 * s; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(ex + er * 0.8, ey + er * 0.2); ctx.quadraticCurveTo(ex + er * 1.25, ey + er * 0.3, ex + er * 1.45, ey + er * 0.62); ctx.stroke(); ctx.restore();
    const g = ctx.createRadialGradient(ex - er * 0.3, ey - er * 0.3, er * 0.2, ex, ey, er);
    g.addColorStop(0, "rgb(255,252,248)"); g.addColorStop(1, "rgb(236,214,206)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, er, 0, PL.TAU); ctx.fill();
    ctx.strokeStyle = "rgb(200,120,110)"; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.arc(ex, ey, er - 3 * s, -1.2, 1.2); ctx.stroke();
    noteC(ctx, "rgb(250,244,238)", ex - er * 0.6, ey - er * 0.6, er * 1.2, er * 1.2);
    ctx.fillStyle = "rgba(190,226,250,0.7)"; ctx.beginPath(); ctx.arc(xl - 0.05 * ppc, ey, 0.55 * ppc, Math.PI * 0.62, Math.PI * 1.38); ctx.fill();
    ctx.fillStyle = "rgb(90,130,170)"; ctx.fillRect(xl - 3 * s, ey - 0.62 * ppc, 5 * s, 0.4 * ppc); ctx.fillRect(xl - 3 * s, ey + 0.22 * ppc, 5 * s, 0.4 * ppc);
    const lt = clamp(0.012 / f, 0.15, 1) * 0.55 * ppc, lh = 0.42 * ppc;
    ctx.fillStyle = "rgba(210,230,250,0.85)"; ctx.beginPath(); ctx.ellipse(xl + lt * 0.3, ey, lt, lh, 0, 0, PL.TAU); ctx.fill(); ctx.strokeStyle = "rgba(90,130,170,0.8)"; ctx.lineWidth = 1.2; ctx.stroke();
    const good = vi > 0 && vi < 10, xi = good ? xl + vi * ppc : xr + 3 * ppc, yT = ey - oh * 0.8, yi = ey + (ey - yT) * (good ? Math.min(0.6, vi / (dO * 100)) : 0.1);
    const hits = [-0.3, 0, 0.3].map(q => ey + q * ppc);
    ctx.save(); ctx.strokeStyle = "rgba(255,190,60,0.85)"; ctx.lineWidth = 1.4;
    hits.forEach(hy => { ctx.beginPath(); ctx.moveTo(ox, yT); ctx.lineTo(xl, hy); const k2 = (xr - xl) / Math.max(1e-6, xi - xl); ctx.lineTo(xr, hy + (yi - hy) * k2); ctx.stroke(); });
    ctx.restore();
    const blur = Math.abs(xi - xr) / ppc;
    ctx.strokeStyle = "rgb(214,70,70)"; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(ex, ey, er - 2 * s, -0.9, 0.9); ctx.stroke();
    if (good && xi < W - 10 * s) { ctx.fillStyle = "rgb(255,210,60)"; ctx.beginPath(); ctx.arc(xi, yi, 3.5 * s, 0, PL.TAU); ctx.fill(); }
    TX(ctx, "視網膜", ex + er + 8 * s, ey + 4, 10.5, "left", "#c0453c");
    TX(ctx, "水晶體", xl + 6 * s, ey - 0.66 * ppc, 10.5, "center");
    const vx = W - 120 * s, vy = 110 * s, vr = 70 * s;
    ctx.save(); ctx.beginPath(); ctx.arc(vx, vy, vr, 0, PL.TAU); ctx.fillStyle = "rgb(246,246,240)"; ctx.fill(); ctx.clip();
    noteC(ctx, "rgb(246,246,240)", vx - vr * 0.7, vy - vr * 0.7, vr * 1.4, vr * 1.4);
    const bp = clamp(blur * 30, 0, 18) * s, n = bp > 0.5 ? 10 : 1;
    ctx.globalAlpha = n > 1 ? 0.18 : 1;
    for (let i = 0; i < n; i++) { const a = i / n * PL.TAU; D.text(ctx, "E", vx + Math.cos(a) * bp, vy + 26 * s + Math.sin(a) * bp, { color: "#1b1f27", size: Math.round(70 * s), align: "center", weight: "700" }); }
    ctx.restore();
    ctx.strokeStyle = "rgba(60,70,80,0.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(vx, vy, vr, 0, PL.TAU); ctx.stroke();
    TX(ctx, "眼睛看到的", vx, vy + vr + 18 * s, 10.5, "center");
    const verdict = !good ? "物體在焦點以內：無法成實像" : xi < xr - 0.1 * ppc ? "成像在視網膜前 → 看起來模糊（像近視）" : xi > xr + 0.1 * ppc ? "成像在視網膜後 → 看起來模糊" : "成像剛好落在視網膜上 → 清楚";
    TX(ctx, verdict, W * 0.5, fy + 26 * s, 12, "center", good && Math.abs(xi - xr) <= 0.1 * ppc ? "#2f9a5a" : "#e0473c");
    TX(ctx, "焦距 " + PL.fmt(f * 100, 1) + " cm：水晶體越厚，焦距越短", W * 0.5, 44 * s, 11, "center");
    label(ctx, 20, 18, "成像距離", PL.fmt(vi, 2) + " cm", c);
  };

  /* 相機曝光：光圈（N 越小開越大）與快門時間一起決定進光量；快門久了，動的東西會拖影 */
  SC["camera-exposure"] = k => {
    const { ctx, W, H, a: N, b: ts, t, s, c, v: ex } = k;
    const L = isL(), fy = H * 0.9;
    AP.labRoom(ctx, W, H, fy, { bench: "none" }); AP.woodFloor(ctx, W, H, fy);
    const cx = W * 0.2, cy = H * 0.46, bw = 190 * s, bh = 130 * s;
    ctx.fillStyle = "rgb(36,38,44)"; AP.rrPath(ctx, cx - bw / 2, cy - bh / 2, bw, bh, 14 * s); ctx.fill();
    ctx.fillStyle = "rgb(56,58,66)"; AP.rrPath(ctx, cx - bw * 0.2, cy - bh / 2 - 22 * s, bw * 0.4, 26 * s, 6 * s); ctx.fill();
    ctx.fillStyle = "rgb(210,60,50)"; ctx.beginPath(); ctx.arc(cx + bw * 0.34, cy - bh / 2 - 4 * s, 7 * s, 0, PL.TAU); ctx.fill();
    const lr = 54 * s;
    ctx.fillStyle = "rgb(20,20,24)"; ctx.beginPath(); ctx.arc(cx, cy, lr, 0, PL.TAU); ctx.fill();
    ctx.strokeStyle = "rgb(90,94,104)"; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.arc(cx, cy, lr - 2 * s, 0, PL.TAU); ctx.stroke();
    const ar = (lr - 10 * s) * 1.4 / N, nb = 7;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, lr - 6 * s, 0, PL.TAU); ctx.clip();
    ctx.fillStyle = "rgb(60,62,70)"; ctx.beginPath(); ctx.arc(cx, cy, lr - 6 * s, 0, PL.TAU);
    for (let i = nb; i >= 0; i--) { const a = i / nb * PL.TAU + 0.3; i === nb ? ctx.moveTo(cx + Math.cos(a) * ar, cy + Math.sin(a) * ar) : ctx.lineTo(cx + Math.cos(a) * ar, cy + Math.sin(a) * ar); }
    ctx.closePath(); ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(20,20,24,0.8)"; ctx.lineWidth = 1;
    for (let i = 0; i < nb; i++) { const a = i / nb * PL.TAU + 0.3; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * ar, cy + Math.sin(a) * ar); ctx.lineTo(cx + Math.cos(a + 0.9) * lr, cy + Math.sin(a + 0.9) * lr); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = "rgba(120,170,230,0.25)"; ctx.beginPath(); ctx.arc(cx, cy, ar, 0, PL.TAU); ctx.fill();
    const shut = ts >= 0.5 ? PL.fmt(ts, 1) + " s" : "1/" + Math.round(1 / ts) + " s";
    TX(ctx, "光圈 f/" + PL.fmt(N, 1) + "　快門 " + shut, cx, cy + bh / 2 + 24 * s, 12, "center");
    TX(ctx, "N 越小，光圈開得越大", cx, cy + bh / 2 + 42 * s, 10, "center", PL.col("text-dim"), 0);
    const px = W * 0.44, pw = W - px - 20 * s, py = 60 * s, ph = Math.min(fy - py - 70 * s, pw * 0.66);
    ctx.fillStyle = "rgb(250,250,248)"; ctx.fillRect(px - 8 * s, py - 8 * s, pw + 16 * s, ph + 16 * s);
    ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    let g = ctx.createLinearGradient(0, py, 0, py + ph); g.addColorStop(0, "#8ec9ee"); g.addColorStop(0.62, "#d6eefa"); g.addColorStop(0.62, "#8cc56b"); g.addColorStop(1, "#5f9e4f");
    ctx.fillStyle = g; ctx.fillRect(px, py, pw, ph);
    const bb = clamp(2.8 / N, 0.1, 2) * 3 * s, nn = bb > 1 ? 6 : 1;
    ctx.globalAlpha = nn > 1 ? 0.3 : 1;
    for (let j = 0; j < nn; j++) { const a = j / nn * PL.TAU, dx = Math.cos(a) * bb, dy = Math.sin(a) * bb; for (let i = 0; i < 5; i++) { const tx = px + (0.1 + i * 0.2) * pw + dx, ty = py + ph * 0.62 + dy; ctx.fillStyle = "#6e4a2c"; ctx.fillRect(tx - 3 * s, ty - 26 * s, 6 * s, 26 * s); ctx.fillStyle = "#3f7d3a"; ctx.beginPath(); ctx.arc(tx, ty - 34 * s, 18 * s, 0, PL.TAU); ctx.fill(); } }
    ctx.globalAlpha = 1;
    const vx = pw * 0.9, blurL = clamp(ts * vx, 0, pw * 0.9), rx0 = px + pw * 0.3 + ((t * 40 * s) % (pw * 0.2)), ry = py + ph * 0.8, gh = Math.max(1, Math.round(clamp(blurL / (6 * s), 1, 14)));
    for (let i = 0; i < gh; i++) { ctx.globalAlpha = gh > 1 ? 1.6 / gh : 1; const x = rx0 + blurL * i / Math.max(1, gh - 1); ctx.fillStyle = "#e0473c"; ctx.fillRect(x - 10 * s, ry - 30 * s, 20 * s, 18 * s); ctx.fillStyle = "#f0c8a0"; ctx.beginPath(); ctx.arc(x, ry - 38 * s, 7 * s, 0, PL.TAU); ctx.fill(); ctx.strokeStyle = "#222"; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x - 12 * s, ry, 9 * s, 0, PL.TAU); ctx.arc(x + 14 * s, ry, 9 * s, 0, PL.TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
    const ev = Math.log2(ex / 0.65);
    if (ev < 0) { ctx.fillStyle = `rgba(0,0,0,${clamp(-ev * 0.28, 0, 0.9).toFixed(2)})`; ctx.fillRect(px, py, pw, ph); }
    else { ctx.fillStyle = `rgba(255,255,255,${clamp(ev * 0.28, 0, 0.92).toFixed(2)})`; ctx.fillRect(px, py, pw, ph); }
    ctx.restore();
    noteC(ctx, ev < -1 ? "rgb(40,50,40)" : "rgb(200,224,210)", px, py, pw, ph);
    TX(ctx, "拍出來的照片", px + pw / 2, py - 16 * s, 11, "center");
    const mx0 = px, mw = pw, my0 = py + ph + 34 * s;
    ctx.fillStyle = PL.theme.pale(0.25); ctx.fillRect(mx0, my0, mw, 4 * s);
    for (let e = -3; e <= 3; e++) { const x = mx0 + (e + 3) / 6 * mw; ctx.fillStyle = PL.col("text-dim"); ctx.fillRect(x - 0.5, my0 - 4 * s, 1, 12 * s); TX(ctx, (e > 0 ? "+" : "") + e, x, my0 + 22 * s, 9.5, "center", PL.col("text-dim"), 0); }
    const pxv = mx0 + (clamp(ev, -3, 3) + 3) / 6 * mw;
    ctx.fillStyle = "#e0843a"; ctx.beginPath(); ctx.moveTo(pxv, my0 - 2 * s); ctx.lineTo(pxv - 6 * s, my0 - 12 * s); ctx.lineTo(pxv + 6 * s, my0 - 12 * s); ctx.closePath(); ctx.fill();
    TX(ctx, ex < 0.3 ? "曝光不足" : ex > 1.4 ? "曝光過度" : "曝光適中", mx0 + mw, my0 - 14 * s, 11, "right", ex < 0.3 || ex > 1.4 ? "#e0473c" : "#2f9a5a");
    label(ctx, 20, 18, "相對曝光量", PL.fmt(ex, 2), c);
  };


  /* 靜電感應：毛皮摩擦過的塑膠棒靠近驗電器（不接觸），金屬球感應出正電、金箔帶負電互相排斥而張開 */
  SC["electrostatic-induction"] = k => {
    const { ctx, W, H, a: q, b: d, t, s, c, v: ang } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const ex = W * 0.34, sc2 = 1.7 * s, sp = ang / 2 * Math.PI / 180;
    const es = AP.electroscope(ctx, ex, benchY, sc2, sp), br = 9 * sc2;
    const ppc = 7 * s, tipX = es.ball.x + br + 6 * s + d * ppc, tipY = es.ball.y, ra = -0.42, rl = 230 * s;
    ctx.save(); ctx.translate(tipX, tipY); ctx.rotate(ra);
    const g = ctx.createLinearGradient(0, -7 * s, 0, 7 * s); g.addColorStop(0, "rgb(120,126,140)"); g.addColorStop(0.4, "rgb(70,76,90)"); g.addColorStop(1, "rgb(36,40,48)");
    ctx.fillStyle = g; AP.rrPath(ctx, 0, -7 * s, rl, 14 * s, 7 * s); ctx.fill();
    const nq = clamp(Math.round(q * 1.2), 1, 12);
    for (let i = 0; i < nq; i++) RT(ctx, "−", 12 * s + (i % 6) * 12 * s, (i < 6 ? 4 : -9) * s, Math.round(15 * s), "#ffffff");
    ctx.restore();
    AP.hand(ctx, tipX + Math.cos(ra) * rl * 0.86, tipY + Math.sin(ra) * rl * 0.86, -1, 0.9 * s, { ang: ra, sleeve: "#3f7fcf" });
    const nb = clamp(Math.round(ang / 9), 0, 9);
    for (let i = 0; i < nb; i++) { const a = -0.3 + (i / Math.max(1, nb - 1)) * 0.6; RT(ctx, "+", es.ball.x + Math.cos(a) * br * 0.75 + 4 * s, es.ball.y + Math.sin(a) * br * 1.2 + 5 * s, Math.round(14 * s), "#e0473c"); }
    [-1, 1].forEach(sd => { for (let i = 0; i < Math.ceil(nb / 2); i++) { const L2 = (12 + i * 6) * sc2 * 0.5 + 6 * s, a = Math.PI / 2 + sd * sp; RT(ctx, "−", es.pivot.x + Math.cos(a) * L2 + sd * 9 * s, es.pivot.y + Math.sin(a) * L2 + 5 * s, Math.round(15 * s), "#2f7fd8"); } });
    const yd = es.ball.y - 30 * s;
    D.arrow(ctx, es.ball.x + br, yd, tipX, yd, { color: PL.col("text-dim"), width: 1.3, head: 5 }); D.arrow(ctx, tipX, yd, es.ball.x + br, yd, { color: PL.col("text-dim"), width: 1.3, head: 5 });
    TX(ctx, "距離 " + PL.fmt(d, 1) + " cm", (es.ball.x + tipX) / 2, yd - 8 * s, 10.5, "center");
    ctx.fillStyle = "rgb(160,120,80)"; AP.rrPath(ctx, W * 0.66, benchY - 10 * s, 90 * s, 12 * s, 6 * s); ctx.fill();
    ctx.strokeStyle = "rgba(90,60,30,0.5)"; ctx.lineWidth = 1; for (let i = 0; i < 14; i++) { const x = W * 0.66 + 6 * s + i * 6 * s; ctx.beginPath(); ctx.moveTo(x, benchY - 9 * s); ctx.lineTo(x + 3 * s, benchY - 2 * s); ctx.stroke(); }
    TX(ctx, "毛皮", W * 0.66 + 45 * s, benchY + 16 * s, 10, "center", PL.col("text-dim"), 0);
    TX(ctx, "塑膠棒帶負電 " + PL.fmt(q, 1) + " μC（和毛皮摩擦過）", W - 18 * s, 44 * s, 11, "right");
    TX(ctx, "近端的球感應出正電，遠端的金箔帶負電 → 同性相斥張開 " + PL.fmt(ang, 1) + "°", W / 2, H - 14 * s, 11, "center");
    label(ctx, 20, 18, "葉片張角", PL.fmt(ang, 1) + "°", c);
  };

  /* 電熱：電源加在電熱絲上，功率 P = V²/R 轉成熱，把水加熱 */
  SC["electric-heating"] = k => {
    const { ctx, W, H, a: V, b: R, t, s, c, v: P, cfg } = k;
    const benchY = H * 0.84;
    AP.labRoom(ctx, W, H, benchY, {});
    const ps = AP.powerSupply(ctx, 22 * s, benchY - 74 * s, 138 * s, 72 * s, PL.fmt(V, 0) + " V", { label: "電源供應器", knob: fr(V, cfg.a) });
    const bx = W * 0.42, bw = 130 * s, bh = 150 * s, lp = Math.log10(Math.max(P, 0.01)), heat = clamp(lp / Math.log10(3000), 0, 1);
    const wy = benchY - bh * 0.72, coilX = bx - 26 * s, coilW = 52 * s, turns = 4 + Math.round(8 * fr(R, cfg.b)), cy2 = benchY - 44 * s;
    AP.cable(ctx, [ps.red, { x: ps.red.x, y: benchY - 100 * s }, { x: coilX, y: benchY - 188 * s }, { x: coilX, y: cy2 - 18 * s }], "rgb(186,54,48)", 3 * s, 6);
    AP.cable(ctx, [ps.black, { x: ps.black.x + 10 * s, y: benchY - 110 * s }, { x: coilX + coilW, y: benchY - 196 * s }, { x: coilX + coilW, y: cy2 - 18 * s }], "rgb(40,44,52)", 3 * s, 6);
    const glow = P < 1 ? "rgb(120,80,60)" : AP.kColor(700 + 1500 * heat);
    ctx.save(); if (heat > 0.3) { ctx.shadowColor = glow; ctx.shadowBlur = 12 * heat; }
    ctx.strokeStyle = glow; ctx.lineWidth = 3 * s; ctx.beginPath();
    for (let i = 0; i <= turns * 16; i++) { const u = i / (turns * 16), x = coilX + coilW * u, y = cy2 + Math.sin(u * turns * PL.TAU) * 12 * s; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
    const T0 = 20 + Math.min(78, ((t % 10) * P) / 60), boil = T0 > 97;
    AP.beaker(ctx, bx, benchY, bw, bh, 0.72, boil ? "#e8a07a" : "#6fb7e0");
    AP.bubbles(ctx, bx - bw / 2 + 6 * s, wy + 4 * s, bw - 12 * s, cy2 - wy, t, Math.round(2 + 16 * heat), { speed: 20 + 60 * heat, seed: 9 });
    AP.heatWaves(ctx, bx - bw / 2, wy - 6 * s, bw, 60 * s, t, boil ? 1 : heat * 0.6);
    AP.thermometer(ctx, bx + bw * 0.34, benchY - bh - 50 * s, benchY - 16 * s, 9 * s, T0 / 100);
    TX(ctx, PL.fmt(T0, 0) + "°C", bx + bw * 0.34 + 12 * s, benchY - bh - 38 * s, 11);
    TX(ctx, "電熱絲 R = " + PL.fmt(R, 0) + " Ω", coilX + coilW / 2, cy2 + 30 * s, 10.5, "center");
    const x0 = W * 0.62, cw = W - x0 - 16 * s, y0 = 60 * s, ch = 150 * s;
    AP.infoCard(ctx, x0, y0, cw, ch);
    TX(ctx, "常見電器功率（對數刻度）", x0 + 12 * s, y0 + 18 * s, 10.5);
    const X = w => x0 + 16 * s + (cw - 32 * s) * clamp(Math.log10(w) / Math.log10(20000) * 1.15 - 0.15, 0, 1), by2 = y0 + 44 * s;
    ctx.fillStyle = PL.theme.pale(0.25); ctx.fillRect(x0 + 16 * s, by2 - 2, cw - 32 * s, 4);
    [[5, "手機充電"], [60, "筆電"], [1200, "吹風機"], [1800, "快煮壺"]].forEach((p, i) => { const x = X(p[0]); ctx.fillStyle = PL.col("text-dim"); ctx.fillRect(x - 1, by2 - 6 * s, 2, 12 * s); TX(ctx, p[1], x, by2 + 22 * s + (i % 2) * 14 * s, 9.5, "center", PL.col("text-dim"), 0); TX(ctx, p[0] + " W", x, by2 + 50 * s + (i % 2) * 14 * s, 9, "center", PL.col("text-dim"), 0); });
    const xm = X(Math.max(P, 0.1));
    ctx.fillStyle = "#e0473c"; ctx.beginPath(); ctx.moveTo(xm, by2 - 4 * s); ctx.lineTo(xm - 7 * s, by2 - 16 * s); ctx.lineTo(xm + 7 * s, by2 - 16 * s); ctx.closePath(); ctx.fill();
    TX(ctx, "這個電熱絲 " + PL.fmt(P, P < 10 ? 2 : 0) + " W", clamp(xm, x0 + 60 * s, x0 + cw - 60 * s), y0 + ch - 12 * s, 11, "center", "#e0473c");
    if (P > 3000) TX(ctx, "功率遠超過一般插座可負荷（約 2 kW）", W - 18 * s, y0 + ch + 22 * s, 10.5, "right", "#e0473c");
    TX(ctx, "P = V² / R", W - 18 * s, 44 * s, 13, "right");
    label(ctx, 20, 18, "電熱功率", PL.fmt(P, P < 10 ? 2 : 1) + " W", c);
  };

  /* 家庭用電：電器一個個打開，總電流 I = P/110 V；超過斷路器額定電流就跳脫斷電 */
  const APPL = [["電燈", 60], ["電視", 150], ["電鍋", 800], ["微波爐", 1100], ["吹風機", 1200], ["電暖器", 1500], ["冷氣", 2000], ["熱水器", 2200]];
  SC["household-circuit"] = k => {
    const { ctx, W, H, a: P, b: Ir, t, s, c, v: load } = k;
    const L = isL(), fy = H * 0.86;
    AP.labRoom(ctx, W, H, fy, { bench: "none" }); AP.woodFloor(ctx, W, H, fy);
    const I = P / 110, over = load > 100, cyc = 5, tt = t % cyc, tripped = over && tt > 1.3, on = !tripped;
    const px = 24 * s, py = 88 * s, pw = 110 * s, ph = 150 * s;
    ctx.fillStyle = L ? "rgb(206,210,216)" : "rgb(70,74,82)"; AP.rrPath(ctx, px, py, pw, ph, 6 * s); ctx.fill(); ctx.strokeStyle = "rgba(30,34,40,0.5)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "rgb(236,238,240)"; ctx.fillRect(px + 22 * s, py + 30 * s, pw - 44 * s, 70 * s); noteC(ctx, L ? "rgb(206,210,216)" : "rgb(70,74,82)", px, py + 104 * s, pw, 30 * s);
    ctx.fillStyle = "rgb(40,44,52)"; ctx.fillRect(px + pw / 2 - 12 * s, py + 44 * s, 24 * s, 42 * s);
    const lvY = tripped ? py + 72 * s : py + 50 * s;
    ctx.fillStyle = tripped ? "rgb(220,60,50)" : "rgb(60,170,90)"; ctx.fillRect(px + pw / 2 - 8 * s, lvY, 16 * s, 12 * s);
    TX(ctx, PL.fmt(Ir, 0) + " A", px + pw / 2, py + 124 * s, 13, "center");
    TX(ctx, "斷路器", px + pw / 2, py - 10 * s, 11, "center");
    if (over && tt > 1.2 && tt < 1.6) AP.muzzleFlash(ctx, px + pw / 2, lvY, Math.PI / 2, tt - 1.2, 0.8 * s);
    const wy = py + 36 * s, wx1 = W - 30 * s, hot = over && !tripped ? clamp(tt / 1.3, 0, 1) : 0;
    ctx.save(); ctx.lineWidth = 4 * s; ctx.lineCap = "round";
    ctx.strokeStyle = hot > 0 ? `rgb(${Math.round(186 + 69 * hot)},${Math.round(54 + 100 * hot)},${Math.round(48)})` : "rgb(186,54,48)";
    if (hot > 0.4) { ctx.shadowColor = "rgba(255,120,40,0.9)"; ctx.shadowBlur = 10 * hot; }
    ctx.beginPath(); ctx.moveTo(px + pw, wy); ctx.lineTo(wx1, wy); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = "rgb(60,110,190)"; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(px + pw, wy + 10 * s); ctx.lineTo(wx1, wy + 10 * s); ctx.stroke();
    if (on) AP.flowDots(ctx, [{ x: px + pw, y: wy }, { x: wx1, y: wy }], t, 20 + I * 4, { gap: 18 * s });
    let sum = 0; const n = APPL.length, cw = (W - px - pw - 40 * s) / n;
    APPL.forEach((ap, i) => {
      sum += ap[1];
      const act = sum <= P + 1 && on, x = px + pw + 30 * s + i * cw + cw / 2, top = fy - 70 * s - (i % 2) * 36 * s;
      ctx.strokeStyle = act ? "rgb(186,54,48)" : "rgba(120,120,120,0.6)"; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(x, wy); ctx.lineTo(x, top); ctx.stroke();
      ctx.fillStyle = act ? "rgb(250,244,220)" : (L ? "rgb(210,210,206)" : "rgb(70,72,78)"); AP.rrPath(ctx, x - cw * 0.4, top, cw * 0.8, 40 * s, 6 * s); ctx.fill();
      ctx.strokeStyle = "rgba(40,44,52,0.5)"; ctx.lineWidth = 1; ctx.stroke(); noteC(ctx, act ? "rgb(250,244,220)" : (L ? "rgb(210,210,206)" : "rgb(70,72,78)"), x - cw * 0.4, top, cw * 0.8, 40 * s);
      if (act) { ctx.save(); ctx.shadowColor = "rgba(255,210,90,0.95)"; ctx.shadowBlur = 10; ctx.fillStyle = "rgb(255,210,90)"; ctx.beginPath(); ctx.arc(x + cw * 0.3, top + 8 * s, 3 * s, 0, PL.TAU); ctx.fill(); ctx.restore(); }
      TX(ctx, ap[0], x, top + 18 * s, 10, "center");
      TX(ctx, ap[1] + " W", x, top + 32 * s, 9, "center", PL.col("text-dim"), 0);
    });
    const nOn = APPL.filter((ap, i) => APPL.slice(0, i + 1).reduce((a, b) => a + b[1], 0) <= P + 1).length;
    AP.dial(ctx, px + pw / 2, py + ph + 66 * s, 44 * s, clamp(load / 150, 0, 1), { max: 150, unit: "%", majors: 3 });
    TX(ctx, "負載率", px + pw / 2, py + ph + 12 * s, 10.5, "center");
    TX(ctx, "總功率 " + PL.fmt(P, 0) + " W → 電流 I = P/V = " + PL.fmt(I, 1) + " A（110 V）", W - 18 * s, 44 * s, 11.5, "right");
    TX(ctx, tripped ? "超過 " + PL.fmt(Ir, 0) + " A → 斷路器跳脫，全部斷電！" : over ? "電流超過額定，電線發熱中…" : "開著 " + nOn + " 件電器，負載 " + PL.fmt(load, 0) + "%", W - 18 * s, 64 * s, 11.5, "right", over ? "#e0473c" : "#2f9a5a");
    label(ctx, 20, 18, "負載率", PL.fmt(load, 0) + " %", c);
  };

  /* RLC 共振：訊號產生器從 10 Hz 掃到 20 kHz，頻率等於 f₀ 時電流最大、燈泡最亮 */
  SC["rlc-resonance"] = k => {
    const { ctx, W, H, a: Lm, b: Cu, t, s, c, v: f0, cfg } = k;
    const benchY = H * 0.86;
    AP.circuitBoard(ctx, W, H, false);
    const fs = 10 * Math.pow(2000, (t % 7) / 7), Q = 4, resp = 1 / Math.sqrt(1 + Q * Q * Math.pow(fs / f0 - f0 / fs, 2));
    const ps = AP.powerSupply(ctx, 24 * s, H * 0.62, 150 * s, 76 * s, fs < 1000 ? PL.fmt(fs, 0) + " Hz" : PL.fmt(fs / 1000, 2) + " kHz", { label: "訊號產生器（掃頻）", color: "rgb(130,230,255)", knob: (t % 7) / 7 });
    const T = H * 0.27, xL = W * 0.1, xR = W * 0.46, ly = T, cxC = xR, cyC = H * 0.5;
    AP.cable(ctx, [ps.red, { x: ps.red.x, y: T }, { x: xR, y: T }, { x: xR, y: cyC - 30 * s }], "rgb(186,54,48)", 3 * s, 3);
    AP.cable(ctx, [{ x: xR, y: cyC + 30 * s }, { x: xR, y: H * 0.9 }, { x: ps.black.x, y: H * 0.9 }, ps.black], "rgb(40,44,52)", 3 * s, 3);
    const turns = clamp(Math.round(4 + 12 * fr(Lm, cfg.a)), 4, 16), lx = (xL + xR) / 2 - 40 * s;
    AP.steel(ctx, lx - 60 * s, ly - 6 * s, 120 * s, 12 * s, -8); AP.coilWinding(ctx, lx, ly, 100 * s, 18 * s, turns, true);
    TX(ctx, "電感 L = " + PL.fmt(Lm, 0) + " mH", lx, ly - 30 * s, 11, "center");
    const cr = (8 + 16 * Math.sqrt(fr(Cu, cfg.b))) * s, ch2 = cr * 2.4;
    ctx.fillStyle = "rgb(40,70,140)"; AP.rrPath(ctx, cxC - cr, cyC - ch2 / 2, cr * 2, ch2, cr * 0.4); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(cxC + cr * 0.4, cyC - ch2 / 2 + 3, cr * 0.25, ch2 - 6);
    ctx.fillStyle = "rgb(190,196,206)"; ctx.fillRect(cxC - cr, cyC - ch2 / 2, cr * 2, 4 * s);
    TX(ctx, "電容 C = " + PL.fmt(Cu, 1) + " μF", cxC - cr - 10 * s, cyC + 4, 11, "right");
    AP.bulb(ctx, (xL + xR) / 2 + 60 * s, T + 30 * s, 16 * s, resp);
    const lw = Math.min(W * 0.38, 320 * s), lh = Math.min(H * 0.56, 230 * s);
    const scr = AP.laptop(ctx, W - lw - 16 * s, H * 0.14, lw, lh);
    const gx0 = scr.x + 26 * s, gx1 = scr.x + scr.w - 10 * s, gy0 = scr.y + 26 * s, gy1 = scr.y + scr.h - 22 * s;
    const X = f => gx0 + (Math.log10(f) - 1) / Math.log10(2000) * (gx1 - gx0), Yr = r => gy1 - r * (gy1 - gy0);
    ctx.save(); ctx.strokeStyle = "rgba(190,205,225,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 6); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    ctx.fillStyle = "rgba(200,214,232,0.85)"; ctx.font = Math.max(7, 8.5 * s) + "px system-ui,sans-serif"; ctx.textAlign = "center";
    [10, 100, 1000, 10000].forEach(f => ctx.fillText(f < 1000 ? f + "" : f / 1000 + "k", X(f), gy1 + 12 * s));
    ctx.strokeStyle = "rgb(110,226,255)"; ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const f = 10 * Math.pow(2000, i / 120), r = 1 / Math.sqrt(1 + Q * Q * Math.pow(f / f0 - f0 / f, 2)); i ? ctx.lineTo(X(f), Yr(r)) : ctx.moveTo(X(f), Yr(r)); }
    ctx.stroke();
    if (f0 >= 10 && f0 <= 20000) { ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(255,220,110,0.7)"; ctx.beginPath(); ctx.moveTo(X(f0), gy0); ctx.lineTo(X(f0), gy1); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = "rgb(255,220,110)"; ctx.beginPath(); ctx.arc(X(fs), Yr(resp), 4.5, 0, PL.TAU); ctx.fill();
    ctx.restore();
    D.text(ctx, "電流大小 vs 頻率（Hz）", scr.x + 10 * s, scr.y + 14 * s, { color: "rgba(210,220,236,0.9)", size: 10 });
    D.text(ctx, "f₀ = " + PL.fmt(f0, 0) + " Hz", clamp(X(f0), gx0 + 30 * s, gx1 - 30 * s), gy0 - 2, { color: "rgb(255,220,110)", size: 10.5, align: "center", weight: "700" });
    TX(ctx, "收音機選台：轉動可變電容改變 f₀，對準電台頻率", W - 16 * s, scr.y + lh + 24 * s, 10.5, "right", PL.col("text-dim"), 0);
    TX(ctx, "f₀ = 1 / (2π√LC)", W - 16 * s, 40 * s, 12.5, "right");
    label(ctx, 20, 18, "共振頻率", PL.fmt(f0, 1) + " Hz", c);
  };

  /* 指南針偏轉：地磁場（向北）和外加磁場合成，磁針指向合磁場方向 */
  SC["compass-field"] = k => {
    const { ctx, W, H, a: B, b: th, t, s, c, v: dfl } = k;
    AP.deskTop(ctx, 0, 0, W, H);
    const cx = W * 0.34, cy = H * 0.52, r = 84 * s, sc = 1.35 * s, a0 = -Math.PI / 2, ar = th * Math.PI / 180;
    ctx.fillStyle = "rgba(255,255,255,0.12)"; ctx.beginPath(); ctx.arc(cx, cy, r * 1.9, 0, PL.TAU); ctx.fill();
    if (B > 1) { const dist = r + (34 + 90 * (1 - Math.min(B, 120) / 120)) * s, mx = cx - Math.sin(ar) * dist, my = cy + Math.cos(ar) * dist; ctx.save(); ctx.translate(mx, my); ctx.rotate(ar + Math.PI / 2); AP.barMagnet(ctx, 0, 0, 34 * s, 16 * s); ctx.restore(); ctx.save(); ctx.translate(mx, my); ctx.rotate(ar + Math.PI / 2); D.text(ctx, "N", -24 * s, 4, { color: "#fff", size: 11, align: "center", weight: "700" }); D.text(ctx, "S", 24 * s, 4, { color: "#fff", size: 11, align: "center", weight: "700" }); ctx.restore(); }
    AP.compass(ctx, cx, cy, r, a0 + dfl * Math.PI / 180);
    for (let dg = 0; dg < 360; dg += 10) { const a = dg * Math.PI / 180; ctx.strokeStyle = "rgba(40,40,40,0.55)"; ctx.lineWidth = dg % 90 ? 1 : 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8); ctx.lineTo(cx + Math.cos(a) * r * (dg % 30 ? 0.74 : 0.68), cy + Math.sin(a) * r * (dg % 30 ? 0.74 : 0.68)); ctx.stroke(); }
    const ox = W * 0.76, oy = H * 0.8, eL = 48 * sc, bx = Math.sin(ar) * B * sc, by = -Math.cos(ar) * B * sc;
    AP.infoCard(ctx, ox - 140 * s, oy - 262 * s, 280 * s, 290 * s);
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = PL.theme.pale(0.45); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ox + bx, oy + by); ctx.lineTo(ox + bx, oy + by - eL); ctx.lineTo(ox, oy - eL); ctx.stroke(); ctx.restore();
    D.arrow(ctx, ox, oy, ox, oy - eL, { color: "#2f9a5a", width: 3, head: 8 });
    if (B > 1) D.arrow(ctx, ox, oy, ox + bx, oy + by, { color: "#e0843a", width: 3, head: 8 });
    D.arrow(ctx, ox, oy, ox + bx, oy + by - eL, { color: "#e0473c", width: 3.4, head: 9 });
    TX(ctx, "地磁 48 μT（向北）", ox - 8 * s, oy - eL - 8 * s, 10.5, "right", "#2f9a5a");
    TX(ctx, "外加 " + PL.fmt(B, 0) + " μT", ox + bx + 6 * s, oy + by + 14 * s, 10.5, "left", "#e0843a");
    TX(ctx, "合磁場（磁針方向）", ox + bx + 6 * s, oy + by - eL - 6 * s, 10.5, "left", "#e0473c");
    TX(ctx, "向量合成（箭頭長度 ∝ 磁場）", ox, oy - 242 * s, 11, "center");
    D.arrow(ctx, 30 * s, 110 * s, 30 * s, 70 * s, { color: "#2f9a5a", width: 3, head: 8 });
    TX(ctx, "北（地磁 N）", 42 * s, 84 * s, 11, "left", "#2f9a5a");
    TX(ctx, "磁針偏轉 " + PL.fmt(dfl, 1) + "°", cx, cy + r + 30 * s, 12.5, "center");
    TX(ctx, "外加磁場方向：偏北 " + PL.fmt(th, 0) + "°", cx, cy + r + 50 * s, 10.5, "center", PL.col("text-dim"), 0);
    label(ctx, 20, 18, "磁針偏角", PL.fmt(dfl, 1) + "°", c);
  };

  /* 電磁鐵：鐵釘繞漆包線通電就能吸迴紋針；匝數越多、電流越大，吸得越多 */
  SC["electromagnet"] = k => {
    const { ctx, W, H, a: N, b: I, t, s, c, v: B, cfg } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const nx = W * 0.44, nTop = H * 0.14, nBot = H * 0.56, nw = 16 * s;
    AP.standRod(ctx, nx - 120 * s, benchY, nTop - 10 * s); AP.crossArm(ctx, nx - 120 * s, nTop + 8 * s, nx - 14 * s);
    AP.steel(ctx, nx - nw / 2, nTop, nw, nBot - nTop, 10);
    ctx.fillStyle = "rgb(150,156,166)"; ctx.fillRect(nx - nw, nTop - 6 * s, nw * 2, 8 * s);
    ctx.beginPath(); ctx.moveTo(nx - nw / 2, nBot); ctx.lineTo(nx + nw / 2, nBot); ctx.lineTo(nx, nBot + 16 * s); ctx.closePath(); ctx.fill();
    const tv = 4 + Math.round(22 * fr(N, cfg.a)), c0 = nTop + 24 * s, c1 = nBot - 20 * s;
    for (let i = 0; i < tv; i++) { const y = c0 + (c1 - c0) * (i + 0.5) / tv; ctx.strokeStyle = "rgb(200,120,60)"; ctx.lineWidth = Math.max(2, (c1 - c0) / tv * 0.8); ctx.beginPath(); ctx.ellipse(nx, y, nw * 0.9, 3 * s, 0, 0, PL.TAU); ctx.stroke(); }
    const ps = AP.powerSupply(ctx, W * 0.66, benchY - 72 * s, 140 * s, 70 * s, PL.fmt(I, 1) + " A", { label: "直流電源", knob: fr(I, cfg.b) });
    const w1 = [{ x: nx + nw, y: c0 }, { x: nx + 70 * s, y: c0 - 20 * s }, { x: ps.red.x, y: benchY - 110 * s }, ps.red], w2 = [{ x: nx + nw, y: c1 }, { x: nx + 80 * s, y: c1 + 10 * s }, { x: ps.black.x, y: benchY - 96 * s }, ps.black];
    AP.cable(ctx, w1, "rgb(186,54,48)", 2.6 * s, 4); AP.cable(ctx, w2, "rgb(40,44,52)", 2.6 * s, 4);
    AP.flowDots(ctx, w1.slice().reverse(), t, 10 + 14 * I, { gap: 16 * s });
    const nl = clamp(Math.round(B / 6), 0, 6);
    ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = PL.theme.isLight() ? "rgba(90,70,160,0.45)" : "rgba(190,170,255,0.45)"; ctx.lineWidth = 1.3;
    for (let i = 1; i <= nl; i++) { const w = (18 + i * 16) * s; ctx.beginPath(); ctx.ellipse(nx, (nTop + nBot) / 2 + 8 * s, w, (nBot - nTop) / 2 + 24 * s + i * 8 * s, 0, 0, PL.TAU); ctx.stroke(); }
    ctx.restore();
    const nc = clamp(Math.round(B / 1.5), 0, 24);
    let y = nBot + 16 * s;
    const clip = (x, yy, a) => { ctx.save(); ctx.translate(x, yy); ctx.rotate(a); ctx.strokeStyle = "rgb(170,178,190)"; ctx.lineWidth = 1.6 * s; AP.rrPath(ctx, -3.5 * s, 0, 7 * s, 16 * s, 3.5 * s); ctx.stroke(); ctx.restore(); };
    for (let i = 0; i < nc; i++) { const col = i % 3, row = Math.floor(i / 3); clip(nx + (col - 1) * 9 * s + Math.sin(t * 2 + i) * 1.2, y + row * 14 * s, (col - 1) * 0.35); }
    for (let i = 0; i < 18; i++) clip(nx - 60 * s + (i % 9) * 14 * s, benchY - 6 * s - Math.floor(i / 9) * 3 * s, 1.4 + (i % 4) * 0.4);
    TX(ctx, "吸起 " + nc + " 根迴紋針", nx + 30 * s, nBot + 30 * s, 12);
    TX(ctx, "線圈 " + PL.fmt(N, 0) + " 匝", nx - nw - 10 * s, (c0 + c1) / 2, 11, "right");
    TX(ctx, "B ∝ N × I（有鐵芯時磁場更強）", W - 18 * s, 44 * s, 12, "right");
    label(ctx, 20, 18, "相對磁場", PL.fmt(B, 1) + " mT", c);
  };

  /* 直流馬達：磁場中的線圈通電受力轉動，換向器每半圈換一次電流方向；帶動絞盤把重物吊起 */
  SC["dc-motor"] = k => {
    const { ctx, W, H, a: I, b: tq, t, s, c, v: rpm, cfg } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const mx = W * 0.34, my = H * 0.44, gap = 150 * s, ang = t * Math.min(rpm / 60 * PL.TAU, 9) * 0.25;
    AP.polePiece(ctx, mx - gap / 2 - 50 * s, my - 60 * s, 50 * s, 120 * s, true);
    AP.polePiece(ctx, mx + gap / 2, my - 60 * s, 50 * s, 120 * s, false);
    noteC(ctx, "rgb(196,64,84)", mx - gap / 2 - 50 * s, my - 60 * s, 50 * s, 120 * s); noteC(ctx, "rgb(66,102,158)", mx + gap / 2, my - 60 * s, 50 * s, 120 * s);
    D.text(ctx, "N", mx - gap / 2 - 25 * s, my + 5, { color: "#fff", size: 16, align: "center", weight: "700" });
    D.text(ctx, "S", mx + gap / 2 + 25 * s, my + 5, { color: "#fff", size: 16, align: "center", weight: "700" });
    ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = "rgba(120,130,150,0.5)"; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(mx - gap / 2, my + i * 22 * s); ctx.lineTo(mx + gap / 2, my + i * 22 * s); ctx.stroke(); } ctx.restore();
    const cw = 54 * s * Math.cos(ang), chh = 50 * s, front = Math.sin(ang) >= 0;
    ctx.save(); ctx.lineWidth = 5 * s; ctx.strokeStyle = front ? "rgb(214,136,64)" : "rgb(160,96,44)"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(mx - cw, my + chh); ctx.lineTo(mx - cw, my - chh); ctx.lineTo(mx + cw, my - chh); ctx.lineTo(mx + cw, my + chh); ctx.stroke(); ctx.restore();
    const ay = my + chh + 14 * s;
    AP.steel(ctx, mx - 3 * s, my - chh - 16 * s, 6 * s, 2 * chh + 60 * s, 10);
    ctx.fillStyle = "rgb(214,168,72)"; ctx.fillRect(mx - 10 * s, ay - 6 * s, 9 * s, 14 * s); ctx.fillRect(mx + 1 * s, ay - 6 * s, 9 * s, 14 * s);
    [-1, 1].forEach(sd => { ctx.fillStyle = "rgb(60,64,72)"; ctx.fillRect(mx + sd * 12 * s - (sd < 0 ? 12 * s : 0), ay - 3 * s, 12 * s, 7 * s); });
    const ps = AP.powerSupply(ctx, 24 * s, benchY - 70 * s, 136 * s, 68 * s, PL.fmt(I, 1) + " A", { label: "直流電源", knob: fr(I, cfg.a) });
    AP.cable(ctx, [ps.red, { x: ps.red.x, y: ay + 40 * s }, { x: mx - 24 * s, y: ay }], "rgb(186,54,48)", 2.6 * s, 4);
    AP.cable(ctx, [ps.black, { x: ps.black.x + 20 * s, y: ay + 56 * s }, { x: mx + 24 * s, y: ay + 30 * s }, { x: mx + 24 * s, y: ay }], "rgb(40,44,52)", 2.6 * s, 4);
    const dx = W * 0.72, dy = my - 134 * s, dR = 22 * s;
    AP.steel(ctx, mx - 3 * s, dy, 6 * s, my - chh - 16 * s - dy, 10);
    ctx.save(); ctx.strokeStyle = isL() ? "rgb(40,40,44)" : "rgb(150,150,160)"; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(mx, dy - 12 * s); ctx.lineTo(dx, dy - dR); ctx.moveTo(mx, dy + 12 * s); ctx.lineTo(dx, dy + dR); ctx.stroke(); ctx.restore();
    ctx.fillStyle = "rgb(150,156,166)"; ctx.beginPath(); ctx.arc(mx, dy, 12 * s, 0, PL.TAU); ctx.fill(); AP.brassDisc(ctx, mx, dy, 3 * s);
    TX(ctx, "皮帶", (mx + dx) / 2, dy - 22 * s, 10, "center", PL.col("text-dim"), 0);
    AP.steel(ctx, dx + dR + 10 * s, dy - 30 * s, 8 * s, benchY - dy + 30 * s, 10);
    ctx.fillStyle = "rgb(150,104,58)"; ctx.beginPath(); ctx.arc(dx, dy, dR, 0, PL.TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,230,190,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + Math.cos(ang * 2) * dR, dy + Math.sin(ang * 2) * dR); ctx.stroke(); AP.brassDisc(ctx, dx, dy, 4 * s);
    const lift = rpm > 0 ? ((t * rpm / 1200) % 1) * 60 * s : 0, ww = (22 + 26 * fr(tq, cfg.b)) * s, wt = benchY - 40 * s - ww * 0.8 - lift;
    AP.cord(ctx, dx + dR, dy, dx + dR, wt);
    AP.weight(ctx, dx + dR, wt, ww, ww * 0.8, null);
    TX(ctx, "負載力矩 " + PL.fmt(tq, 1) + " N·m", dx + dR - ww / 2 - 8 * s, wt + ww * 0.5, 10.5, "right");
    if (rpm <= 0) TX(ctx, "負載太重，馬達轉不動！", mx, my - chh - 40 * s, 12, "center", "#e0473c");
    else { ctx.save(); ctx.strokeStyle = "#e0843a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(mx, my - chh - 12 * s, 36 * s, 8 * s, 0, 0.2, Math.PI * 1.7); ctx.stroke(); ctx.restore(); TX(ctx, PL.fmt(rpm, 0) + " rpm", mx, my - chh - 28 * s, 11.5, "center", "#e0843a"); }
    TX(ctx, "換向器 + 電刷", mx, ay + 26 * s, 10, "center", PL.col("text-dim"), 0);
    TX(ctx, "轉速 ∝ 電流產生的力矩 − 負載力矩", W - 18 * s, 44 * s, 11.5, "right");
    label(ctx, 20, 18, "相對轉速", PL.fmt(rpm, 0) + " rpm", c);
  };

  /* 荷質比 e/m：細束電子管裡的電子被磁場彎成圓圈；圈剛好疊在 7.5 cm 參考環上時，算出的 e/m 才準 */
  SC["cathode-ray-em"] = k => {
    const { ctx, W, H, a: V, b: Bm, t, s, c, v: em } = k;
    const benchY = H * 0.88;
    AP.labRoom(ctx, W, H, benchY, {});
    const ppc = 11 * s, cx = W * 0.38, cy = H * 0.46, Rs = 8.5 * ppc, rT = 0.337 * Math.sqrt(V) / Bm;
    ctx.fillStyle = "rgb(14,16,22)"; ctx.fillRect(cx - Rs * 1.9, 30 * s, Rs * 3.8, benchY - 30 * s); noteC(ctx, "rgb(14,16,22)", cx - Rs * 1.9, 30 * s, Rs * 3.8, benchY - 30 * s);
    const ring = (dx, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(cx + dx, cy, Rs * 1.45, 0, PL.TAU); ctx.stroke(); };
    ring(-6 * s, "rgb(110,66,30)", 12 * s);
    const g = ctx.createRadialGradient(cx - Rs * 0.3, cy - Rs * 0.3, Rs * 0.1, cx, cy, Rs);
    g.addColorStop(0, "rgba(70,90,120,0.35)"); g.addColorStop(1, "rgba(30,40,60,0.55)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Rs, 0, PL.TAU); ctx.fill(); ctx.strokeStyle = "rgba(200,226,240,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
    const gx = cx, gyy = cy + Rs * 0.86, rr = 7.5 * ppc;
    ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = "rgba(255,220,110,0.7)"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(gx, gyy - rr, rr, 0, PL.TAU); ctx.stroke(); ctx.restore();
    const rp = rT * ppc;
    ctx.save(); ctx.strokeStyle = "rgba(90,240,200,0.95)"; ctx.shadowColor = "rgba(90,240,200,0.9)"; ctx.shadowBlur = 10; ctx.lineWidth = 2.6; ctx.beginPath();
    let hit = false;
    for (let i = 0; i <= 200; i++) { const a = i / 200 * PL.TAU, x = gx + Math.sin(a) * rp, y = gyy - rp + Math.cos(a) * rp; if (Math.hypot(x - cx, y - cy) > Rs - 2) { hit = true; break; } i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = "rgb(120,126,140)"; ctx.fillRect(gx - 12 * s, gyy, 24 * s, 10 * s); ctx.fillStyle = "rgb(255,160,80)"; ctx.fillRect(gx + 8 * s, gyy + 2 * s, 4 * s, 4 * s);
    ring(6 * s, "rgb(196,122,56)", 12 * s);
    AP.steel(ctx, cx - 5 * s, cy + Rs * 1.45, 10 * s, benchY - cy - Rs * 1.45, 10);
    D.text(ctx, "7.5 cm 參考環", gx + rr * 0.72, gyy - rr * 1.72, { color: "rgb(255,220,110)", size: 10.5, align: "left", weight: "700" });
    D.text(ctx, hit ? "半徑太大，電子打到管壁" : "電子束半徑 " + PL.fmt(rT, 1) + " cm", cx, cy - Rs - 16 * s, { color: "rgb(140,250,210)", size: 11.5, align: "center", weight: "700" });
    const px = W * 0.72, pw = W - px - 16 * s;
    AP.powerSupply(ctx, px, H * 0.16, pw, 64 * s, PL.fmt(V, 0) + " V", { label: "加速電壓" });
    AP.powerSupply(ctx, px, H * 0.16 + 84 * s, pw, 64 * s, PL.fmt(Bm / 0.78, 2) + " A", { label: "線圈電流（B = " + PL.fmt(Bm, 1) + " mT）", color: "rgb(130,230,255)" });
    const ok = Math.abs(rT - 7.5) < 0.4;
    TX(ctx, ok ? "光圈疊在參考環上 → e/m 算對了！" : "調 V 或 B，讓光圈疊在 7.5 cm 環上", W - 16 * s, H * 0.16 + 176 * s, 11, "right", ok ? "#2f9a5a" : "#e0843a");
    TX(ctx, "真實值 e/m = 1.76 × 10¹¹ C/kg", W - 16 * s, H * 0.16 + 196 * s, 10.5, "right", PL.col("text-dim"), 0);
    TX(ctx, "e/m = 2V / (B² r²)", W - 16 * s, 40 * s, 12.5, "right");
    label(ctx, 20, 18, "估測 e/m（×10¹¹）", PL.fmt(em, 2) + " C/kg", c);
  };

  /* 原子光譜：放電管裡的原子從高能階跳回低能階放出光子，分光鏡看到一條亮線；λ = 1240/ΔE */
  SC["spectroscopy"] = k => {
    const { ctx, W, H, a: dE, b: In, t, s, c, v: lam } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const col = AP.nmColor(lam), gc = col || "rgb(170,160,200)", vis = !!col;
    const tx = 90 * s, ty0 = benchY - 190 * s, ty1 = benchY - 50 * s;
    AP.steel(ctx, tx - 30 * s, ty1 + 8 * s, 60 * s, 8 * s, -8); AP.steel(ctx, tx - 3 * s, ty1, 6 * s, benchY - ty1 - 20 * s, 10);
    AP.steel(ctx, tx - 10 * s, ty0 - 14 * s, 20 * s, 14 * s, 8); AP.steel(ctx, tx - 10 * s, ty1, 20 * s, 12 * s, 8);
    ctx.save(); ctx.shadowColor = vis ? col : "rgba(170,160,200,0.5)"; ctx.shadowBlur = vis ? 24 * In : 6;
    ctx.fillStyle = vis ? AP.nmColor(lam, 0.35 + 0.6 * In) : "rgba(150,140,180,0.25)"; AP.rrPath(ctx, tx - 7 * s, ty0, 14 * s, ty1 - ty0, 7 * s); ctx.fill(); ctx.restore();
    ctx.strokeStyle = "rgba(220,236,248,0.7)"; ctx.lineWidth = 1.2; AP.rrPath(ctx, tx - 7 * s, ty0, 14 * s, ty1 - ty0, 7 * s); ctx.stroke();
    TX(ctx, "氣體放電管", tx, ty0 - 24 * s, 10.5, "center");
    const gx = W * 0.3, gy = (ty0 + ty1) / 2;
    ctx.save(); ctx.strokeStyle = vis ? AP.nmColor(lam, 0.5 * In + 0.2) : "rgba(170,160,200,0.3)"; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.moveTo(tx + 8 * s, gy); ctx.lineTo(gx, gy); ctx.stroke(); ctx.restore();
    AP.gratingSlide(ctx, gx, gy, 60 * s);
    TX(ctx, "光柵", gx, gy - 46 * s, 10.5, "center");
    const x0 = W * 0.38, cw = W - x0 - 16 * s, y0 = H * 0.46, ch = 110 * s;
    AP.infoCard(ctx, x0, y0, cw, ch);
    const X = nm => x0 + 16 * s + (nm - 200) / 900 * (cw - 32 * s), sy = y0 + 30 * s, sh = 40 * s;
    ctx.fillStyle = "rgb(12,12,16)"; ctx.fillRect(X(200), sy, X(1100) - X(200), sh);
    for (let nm = 380; nm < 780; nm += 4) { ctx.fillStyle = AP.nmColor(nm, 0.16); ctx.fillRect(X(nm), sy, X(nm + 4) - X(nm) + 0.5, sh); }
    noteC(ctx, "rgb(12,12,16)", X(200), sy, X(1100) - X(200), sh);
    ctx.save(); const lx = X(clamp(lam, 200, 1100));
    if (vis) { ctx.shadowColor = col; ctx.shadowBlur = 14 * In; ctx.fillStyle = AP.nmColor(lam, 0.4 + 0.6 * In); ctx.fillRect(lx - (1.5 + 3 * In) * s, sy, (3 + 6 * In) * s, sh); }
    else { ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(200,200,220,0.8)"; ctx.lineWidth = 2; ctx.strokeRect(lx - 3 * s, sy + 2, 6 * s, sh - 4); }
    ctx.restore();
    for (let nm = 200; nm <= 1100; nm += 100) { ctx.fillStyle = PL.col("text-dim"); ctx.fillRect(X(nm) - 0.5, sy + sh, 1, 5 * s); TX(ctx, nm + "", X(nm), sy + sh + 16 * s, 9, "center", PL.col("text-dim"), 0); }
    TX(ctx, "紫外", X(290), sy - 6 * s, 10, "center"); TX(ctx, "可見光", X(580), sy - 6 * s, 10, "center"); TX(ctx, "紅外", X(940), sy - 6 * s, 10, "center");
    TX(ctx, vis ? "看到的譜線：" + PL.fmt(lam, 0) + " nm" : "λ = " + PL.fmt(lam, 0) + " nm 眼睛看不見（" + (lam < 380 ? "紫外線" : "紅外線") + "）", x0 + cw / 2, y0 + ch - 10 * s, 11, "center");
    const lx0 = W * 0.44, lyT = 60 * s, lyB = y0 - 34 * s, e2y = lyB - (lyB - lyT) * clamp((dE - 1.2) / 4.2, 0, 1) * 0.85 - 10 * s;
    ctx.strokeStyle = PL.col("text"); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx0, lyB); ctx.lineTo(lx0 + 120 * s, lyB); ctx.moveTo(lx0, e2y); ctx.lineTo(lx0 + 120 * s, e2y); ctx.stroke();
    const u = (t % 2.4) / 2.4, ey = u < 0.5 ? e2y : e2y + (lyB - e2y) * Math.min(1, (u - 0.5) * 4);
    ctx.fillStyle = "#2f7fd8"; ctx.beginPath(); ctx.arc(lx0 + 40 * s, ey, 5 * s, 0, PL.TAU); ctx.fill();
    if (u > 0.6) { const px0 = lx0 + 70 * s + (u - 0.6) * 300 * s, py0 = (e2y + lyB) / 2; ctx.save(); ctx.strokeStyle = gc; ctx.lineWidth = 2.2; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const x = px0 + i * 1.5 * s, y = py0 + Math.sin(i * 0.9) * 5 * s; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore(); }
    TX(ctx, "高能階", lx0 + 126 * s, e2y + 4, 10, "left", null, 0); TX(ctx, "低能階", lx0 + 126 * s, lyB + 4, 10, "left", null, 0);
    TX(ctx, "ΔE = " + PL.fmt(dE, 2) + " eV", lx0 - 8 * s, (e2y + lyB) / 2 + 4, 11, "right");
    TX(ctx, "λ = 1240 / ΔE（nm）", W - 16 * s, 44 * s, 12.5, "right");
    label(ctx, 20, 18, "發射波長", PL.fmt(lam, 0) + " nm", c);
  };

  /* 太陽能發電：屋頂太陽能板把陽光轉成電，照度越強、面積越大，能供應的電器越多 */
  const LOADS = [["LED 燈", 10], ["電風扇", 50], ["電視", 150], ["冰箱", 300], ["冷氣", 1000], ["熱水器", 2000]];
  SC["solar-cell"] = k => {
    const { ctx, W, H, a: G, b: A, t, s, c, v: P } = k;
    const L = isL(), gy = H * 0.86, sunX = W * 0.12, sunY = H * 0.28, cl = 1 - G / 1200;
    AP.outdoor(ctx, W, H, gy, { t, hills: true, sunX, sunY });
    for (let i = 0; i < 3; i++) AP.cloud(ctx, sunX + (i - 1) * 50 * s + Math.sin(t * 0.3 + i) * 10 * s, sunY + (i % 2) * 14 * s, 60 * s, Math.min(1, cl * 1.1));
    const hx = W * 0.3, hw = 300 * s, hh = 120 * s, rt = gy - hh - 116 * s;
    ctx.fillStyle = L ? "#f0e6d4" : "#3e3a36"; ctx.fillRect(hx, gy - hh, hw, hh); noteC(ctx, L ? "#f0e6d4" : "#3e3a36", hx, gy - hh, hw, hh);
    AP.poly(ctx, [{ x: hx - 16 * s, y: gy - hh }, { x: hx + 30 * s, y: rt }, { x: hx + hw - 30 * s, y: rt }, { x: hx + hw + 16 * s, y: gy - hh }], L ? "#9a5a44" : "#5a3428");
    const nT = Math.min(20, Math.ceil(A)), tw = 40 * s, th2 = 20 * s;
    for (let i = 0; i < nT; i++) {
      const cI = i % 5, rI = Math.floor(i / 5), part = i === nT - 1 && A % 1 > 0 ? A % 1 : 1, k2 = Math.sqrt(A < 1 ? A : part);
      ctx.save(); ctx.translate(hx + 45 * s + cI * tw * 1.06 + tw / 2, rt + 16 * s + rI * (th2 + 5 * s) + th2 / 2); ctx.scale(k2, k2);
      ctx.fillStyle = "rgb(30,56,110)"; ctx.fillRect(-tw / 2, -th2 / 2, tw, th2); ctx.strokeStyle = "rgba(200,220,255,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(-tw / 2, -th2 / 2, tw, th2);
      ctx.beginPath(); ctx.moveTo(0, -th2 / 2); ctx.lineTo(0, th2 / 2); ctx.moveTo(-tw / 2, 0); ctx.lineTo(tw / 2, 0); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${(0.08 + 0.25 * G / 1200).toFixed(2)})`; ctx.fillRect(-tw / 2, -th2 / 2, tw * 0.4, th2 * 0.4); ctx.restore();
    }
    ctx.save(); ctx.strokeStyle = `rgba(255,220,110,${(0.15 + 0.5 * G / 1200).toFixed(2)})`; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const tx = hx + hw * (0.25 + i * 0.15), ty = rt + 40 * s; ctx.beginPath(); ctx.moveTo(sunX + 20 * s, sunY + 10 * s); ctx.lineTo(tx, ty); ctx.stroke(); }
    ctx.restore();
    const ix = hx + hw + 14 * s;
    ctx.fillStyle = "rgb(220,224,230)"; AP.rrPath(ctx, ix, gy - hh + 10 * s, 70 * s, 50 * s, 5 * s); ctx.fill();
    AP.lcd(ctx, ix + 6 * s, gy - hh + 18 * s, 58 * s, 18 * s, PL.fmt(P, 0) + "W", { color: "rgb(130,240,170)", size: 11 });
    D.text(ctx, "變流器", ix + 35 * s, gy - hh + 52 * s, { color: "#333", size: 9, align: "center" });
    let sum = 0;
    LOADS.forEach((ld, i) => {
      sum += ld[1]; const on = sum <= P, x = hx + 14 * s + i * (hw - 28 * s) / 6, y = gy - hh + 30 * s, w = (hw - 28 * s) / 6 - 6 * s;
      ctx.fillStyle = on ? "rgb(255,236,170)" : (L ? "rgb(170,182,196)" : "rgb(30,36,46)"); ctx.fillRect(x, y, w, 50 * s); noteC(ctx, on ? "rgb(255,236,170)" : (L ? "rgb(170,182,196)" : "rgb(30,36,46)"), x, y + 20 * s, w, 30 * s);
      if (on) { ctx.save(); ctx.shadowColor = "rgba(255,210,110,0.9)"; ctx.shadowBlur = 10; ctx.fillStyle = "rgb(255,214,110)"; ctx.beginPath(); ctx.arc(x + w / 2, y + 12 * s, 4 * s, 0, PL.TAU); ctx.fill(); ctx.restore(); }
      TX(ctx, ld[0], x + w / 2, y + 32 * s, 9.5, "center");
      TX(ctx, ld[1] + " W", x + w / 2, y + 45 * s, 8.5, "center", null, 0);
    });
    TX(ctx, "太陽能板 " + PL.fmt(A, 2) + " m²（每片約 1 m²）", hx + hw / 2, rt - 12 * s, 11, "center");
    TX(ctx, "照度 " + PL.fmt(G, 0) + " W/m²" + (G < 400 ? "（多雲）" : G > 900 ? "（晴天正午）" : ""), W - 16 * s, 44 * s, 11.5, "right");
    TX(ctx, "P = 照度 × 面積 × 效率 21%", W - 16 * s, 64 * s, 11.5, "right");
    TX(ctx, "亮燈的電器：這些功率可以同時供應（依序累加）", W / 2, H - 12 * s, 10.5, "center", PL.col("text-dim"), 0);
    label(ctx, 20, 18, "電力輸出", PL.fmt(P, 1) + " W", c);
  };

  const CAP = {
    "calorimetry-mixing": "熱水放出的熱量等於冷水吸收的熱量，兩者最後停在同一個平衡溫度",
    "string-wave-speed": "繩上波速 v = √(T/μ)：張力越大、繩子越細（線密度越小），波跑得越快",
    "sound-properties": "頻率決定音調高低，振幅決定聲音大小；振幅加倍，聲級約增加 6 dB",
    "echo-ultrasound": "蝙蝠發出超音波並聽回聲：聲波來回走了兩倍距離，所以 d = vt/2",
    "seismic-waves": "地面搖晃的頻率接近建築的自然頻率時會共振；隔震墊把建築週期拉長，就能避開共振",
    "shadow-pinhole": "光沿直線前進：穿過針孔的光在光屏上形成倒立的像，像高 : 物高 = 光屏距離 : 物距",
    "rgb-color-mixing": "色光三原色相加：紅＋綠＝黃、綠＋藍＝青、紅＋藍＝洋紅，三色全亮就是白光",
    "fiber-optics": "光在纖芯與披覆層的界面一再全反射而前進；彎得太急會破壞全反射而漏光",
    "human-eye": "水晶體改變厚度調整焦距，讓像剛好落在視網膜上；成像落在視網膜前或後都會模糊",
    "camera-exposure": "進光量 ∝ 快門時間 ÷ N²：光圈開大、快門開久都會變亮，但快門太久動的東西會拖影",
    "electrostatic-induction": "帶電棒靠近但不接觸：金屬球感應出異性電，金箔帶同性電互相排斥而張開",
    "electric-heating": "電流通過電熱絲產生熱，電熱功率 P = V²/R：電壓越大、電阻越小，發熱越快",
    "household-circuit": "家用電壓 110 V，總電流 I = P/V；超過斷路器的額定電流就會跳脫，避免電線過熱起火",
    "rlc-resonance": "頻率等於 f₀ = 1/(2π√LC) 時感抗等於容抗，電路電流最大；收音機就是這樣選台",
    "compass-field": "指南針指向地磁場與外加磁場的合磁場方向：外加磁場越強，偏轉越大",
    "electromagnet": "通電線圈像磁鐵，放進鐵芯磁性更強：匝數越多、電流越大，吸起的迴紋針越多",
    "dc-motor": "磁場中的通電線圈受力轉動，換向器每半圈改變電流方向讓它一直轉；負載越大轉得越慢",
    "cathode-ray-em": "電子在磁場中做圓周運動，r = mv/(eB)；量出軌跡半徑就能算出荷質比 e/m",
    "spectroscopy": "電子從高能階跳回低能階放出光子，能量差越大、波長越短：λ(nm) = 1240/ΔE(eV)",
    "solar-cell": "太陽能板把光能轉成電能：照度越強、面積越大，發電功率越大（效率約 21%）"
  };


  function scene(cv, config, a, b, time, out) {
    const { ctx, W, H } = cv;
    cv.clear(); D.bg(cv);
    const f = SC[config.id];
    if (f) f({ cv, ctx, W, H, cfg: config, a, b, t: time, v: out, c: accent(), s: clamp(Math.min(W / 800, H / 472), 0.5, 1.7) });
  }

  /*
   * sound-properties：聲級 dB 由振幅決定，與頻率無關（頻率決定的是音調）。
   * 原本關係圖掃頻率，畫出來是一條水平線。改掃振幅，才看得到 dB 的對數關係。
   */
  if (LABS["sound-properties"]) LABS["sound-properties"].sweep = "b";

  Object.keys(LABS).forEach(id => { LABS[id].id = id; });

  Object.keys(LABS).forEach(id => {
    PL.register(id, { build(root) {
      const config = LABS[id], L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" }), cv = PL.canvas.create(L.canvasWrap, 0.59, 920);
      PL.ui.caption(cv, CAP[id] || "");
      const decimal = param => param[6] == null ? 2 : param[6];
      const step = param => param[5] == null ? (param[2] - param[1]) / 100 : param[5];
      PL.ui.section(L.controls, "操作條件");
      const a = PL.ui.slider(L.controls, { label: config.a[0], min: config.a[1], max: config.a[2], value: config.a[3], step: step(config.a), unit: config.a[4], digits: decimal(config.a), onInput: () => render() });
      const b = PL.ui.slider(L.controls, { label: config.b[0], min: config.b[1], max: config.b[2], value: config.b[3], step: step(config.b), unit: config.b[4], digits: decimal(config.b), onInput: () => render() });
      PL.ui.note(L.controls, PL.templateGuide(id, config));
      const buttons = PL.ui.buttonRow(L.controls); let animation;
      /* 播放／暫停由引擎的傳輸列統一提供，實驗不再自備 */
      PL.ui.button(buttons, "重設", () => { a.set(config.a[3]); b.set(config.b[3]); render(); });
      const reading = PL.ui.readout(L.readouts, { label: config.output, unit: config.unit });
      const parameter = PL.ui.readout(L.readouts, { label: config.b[0], unit: config.b[4] });
      const conclusion = PL.ui.readout(L.readouts, { label: "模型判讀" });
      const chart = PL.ui.chart(PL.ui.charts(root), { title: config.output + "關係圖", cap: "曲線固定第二項參數；亮點顯示目前操作條件。將圖形趨勢與本頁公式、裝置現象連結。" });
      let elapsed = 0;
      function render() {
        const av = a.get(), bv = b.get(), result = config.calc(av, bv);
        scene(cv, config, av, bv, elapsed, result);
        reading.set(result, Math.abs(result) >= 100 ? 1 : 3); parameter.set(bv, decimal(config.b)); conclusion.set(config.status(av, bv, result));
        chart.setCap(PL.ui.relationChart(chart, {
          a: config.a, b: config.b, av: av, bv: bv,
          calc: config.calc, output: config.output, sweep: config.sweep
        }));
      }
      animation = PL.loop(dt => { if (dt) elapsed += dt; render(); });
      cv.onResize(render); chart.onResize(render); render(); animation.start();
      return { stop() { animation.stop(); cv.destroy(); chart.destroy(); }, rerender: render };
    }});
  });
})();
