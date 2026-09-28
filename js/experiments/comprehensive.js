/* 第四批互動實驗（上）：國中銜接與高中延伸的力學、能量與流體實驗，每個實驗都有自己的實物場景。 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const accent = () => PL.col("m-color", "#35e0cf");
  const rad = degree => degree * Math.PI / 180;

  function lab(kind, a, b, output, unit, calc, status, chart) {
    return { kind, a, b, output, unit, calc, status, chart };
  }

  const LABS = {
    "motion-sensor": lab("sensor", ["移動距離", 0.5, 16, 8, "m", 0.1, 1], ["經過時間", 0.2, 12, 3.2, "s", 0.1, 1], "平均速度", "m/s", (d, t) => d / t, (d, t, v) => "位置—時間圖斜率 = " + PL.fmt(v, 2) + " m/s", (x, t) => x / t),
    "reaction-time": lab("reaction", ["車速", 5, 35, 18, "m/s", 0.1, 1], ["反應時間", 0.1, 2, 0.75, "s", 0.01, 2], "反應距離", "m", (v, t) => v * t, (v, t, d) => "尚未煞車前已前進 " + PL.fmt(d, 1) + " m", (x, t) => x * t),
    "lever-machine": lab("lever", ["負載", 20, 1000, 360, "N", 1, 0], ["施力臂 / 阻力臂", 0.2, 5, 2.4, "", 0.1, 1], "所需施力", "N", (load, ratio) => load / ratio, (load, ratio, force) => "力臂比 " + PL.fmt(ratio, 1) + "；施力約 " + PL.fmt(force, 0) + " N", (x, ratio) => x / ratio),
    "pulley-system": lab("pulley", ["負載重量", 50, 1200, 480, "N", 1, 0], ["支撐繩段", 1, 6, 3, "段", 1, 0], "實際施力", "N", (load, segments) => load / segments / 0.82, (load, segments, force) => "考慮摩擦後效率約 82%；施力 " + PL.fmt(force, 0) + " N", (x, segments) => x / segments / 0.82),
    "contact-pressure": lab("pressure", ["垂直力 F", 80, 1400, 640, "N", 1, 0], ["接觸面積", 2, 500, 80, "cm²", 1, 0], "壓強", "kPa", (force, area) => force / (area * 1e-4) / 1000, (force, area, p) => "面積越小，壓強越大：" + PL.fmt(p, 1) + " kPa", (x, area) => x / (area * 1e-4) / 1000),
    "truss-bridge": lab("truss", ["載重", 100, 3000, 1200, "N", 10, 0], ["橋跨", 2, 20, 8, "m", 0.1, 1], "最大桿件力", "N", (load, span) => load * (1 + span / 16), (load, span, force) => "跨距越大，中央桿件受力越明顯", (x, span) => x * (1 + span / 16)),
    "water-rocket": lab("rocket", ["噴射推力", 10, 900, 260, "N", 1, 0], ["火箭總質量", 0.1, 4, 1.1, "kg", 0.05, 2], "初始加速度", "m/s²", (thrust, mass) => Math.max(0, thrust / mass - 9.8), (thrust, mass, a) => "淨推力使火箭以 " + PL.fmt(a, 1) + " m/s² 向上加速", (x, mass) => Math.max(0, x / mass - 9.8)),
    "crumple-zone": lab("crumple", ["車輛質量", 300, 2200, 1200, "kg", 10, 0], ["停止時間", 0.03, 1.5, 0.32, "s", 0.01, 2], "平均緩衝力", "kN", (mass, time) => mass * 14 / time / 1000, (mass, time, force) => "把停止時間拉長，平均力降為 " + PL.fmt(force, 1) + " kN", (x, time) => x * 14 / time / 1000),
    "skateboard-push": lab("skate", ["推力作用時間", 0.1, 2, 0.7, "s", 0.01, 2], ["對方質量", 25, 120, 65, "kg", 1, 0], "對方速度", "m/s", (time, mass) => 150 * time / mass, (time, mass, v) => "相同衝量下，質量較小者速度較大：" + PL.fmt(v, 2) + " m/s", (x, mass) => 150 * x / mass),
    "energy-forms": lab("energy", ["輸入能量", 100, 5000, 1800, "J", 10, 0], ["轉換效率", 10, 95, 68, "%", 1, 0], "有用輸出", "J", (energy, efficiency) => energy * efficiency / 100, (energy, efficiency, out) => "損耗 " + PL.fmt(energy - out, 0) + " J 多轉為熱或聲音", (x, efficiency) => x * efficiency / 100),
    "simple-machine-efficiency": lab("machine", ["輸入功", 100, 4000, 1200, "J", 10, 0], ["摩擦損耗", 0, 45, 18, "%", 1, 0], "有用輸出功", "J", (work, loss) => work * (1 - loss / 100), (work, loss, out) => "效率 " + PL.fmt(out / work * 100, 1) + "%；能量仍守恆", (x, loss) => x * (1 - loss / 100)),
    "hydroelectric-power": lab("hydro", ["流量 Q", 0.05, 30, 5.5, "m³/s", 0.05, 2], ["落差 h", 2, 180, 42, "m", 1, 0], "理論功率", "kW", (flow, height) => 1000 * 9.8 * flow * height * 0.82 / 1000, (flow, height, power) => "渦輪效率取 82%；輸出約 " + PL.fmt(power, 0) + " kW", (x, height) => 1000 * 9.8 * x * height * 0.82 / 1000),
    "wind-turbine": lab("wind", ["葉片半徑", 0.5, 60, 18, "m", 0.1, 1], ["風速", 2, 28, 10, "m/s", 0.1, 1], "理論功率", "kW", (radius, speed) => 0.5 * 1.2 * Math.PI * radius * radius * Math.pow(speed, 3) * 0.38 / 1000, (radius, speed, power) => "風速三次方影響輸出；約 " + PL.fmt(power, 1) + " kW", (x, speed) => 0.5 * 1.2 * Math.PI * x * x * Math.pow(speed, 3) * 0.38 / 1000),
    "cavendish-balance": lab("cavendish", ["大鉛球質量", 1, 120, 40, "kg", 1, 0], ["球心距離", 0.05, 1.4, 0.32, "m", 0.01, 2], "扭轉角", "μrad", (mass, distance) => 0.8 * mass / (distance * distance), (mass, distance, angle) => "極微弱引力造成約 " + PL.fmt(angle, 2) + " μrad 的偏轉", (x, distance) => 0.8 * x / (distance * distance)),
    "physical-pendulum": lab("pendulum", ["轉動慣量 I", 0.02, 4, 0.72, "kg·m²", 0.01, 2], ["質心距離 d", 0.02, 1.5, 0.42, "m", 0.01, 2], "週期 T", "s", (inertia, distance) => TAU * Math.sqrt(inertia / (2.6 * 9.8 * distance)), (inertia, distance, period) => "轉動慣量越大，週期越長：" + PL.fmt(period, 2) + " s", (x, distance) => TAU * Math.sqrt(x / (2.6 * 9.8 * distance))),
    "torsion-pendulum": lab("torsion", ["轉動慣量 I", 0.01, 3, 0.48, "kg·m²", 0.01, 2], ["扭轉常數 κ", 0.02, 5, 0.74, "N·m/rad", 0.01, 2], "週期 T", "s", (inertia, kappa) => TAU * Math.sqrt(inertia / kappa), (inertia, kappa, period) => "扭絲越硬，擺動越快：" + PL.fmt(period, 2) + " s", (x, kappa) => TAU * Math.sqrt(x / kappa)),
    "resonance-phase-lag": lab("phase", ["驅動頻率 f", 0.1, 6, 1.4, "Hz", 0.01, 2], ["固有頻率 f₀", 0.2, 6, 2.1, "Hz", 0.01, 2], "相位差", "°", (frequency, natural) => Math.abs(Math.atan2(0.35 * frequency * natural, natural * natural - frequency * frequency) * 180 / Math.PI), (frequency, natural, phase) => "接近共振時相位快速跨越；目前 " + PL.fmt(phase, 0) + "°", (x, natural) => Math.abs(Math.atan2(0.35 * x * natural, natural * natural - x * x) * 180 / Math.PI)),
    "density-lab": lab("density", ["物體質量", 10, 2000, 420, "g", 1, 0], ["物體體積", 10, 1800, 520, "cm³", 1, 0], "物體密度", "g/cm³", (mass, volume) => mass / volume, (mass, volume, density) => density < 1 ? "密度小於水，會漂浮" : density > 1 ? "密度大於水，會下沉" : "密度接近水，可懸浮", (x, volume) => x / volume),
    "atmospheric-pressure": lab("atmosphere", ["海拔高度", 0, 5000, 350, "m", 10, 0], ["半球面積", 0.01, 0.24, 0.08, "m²", 0.01, 2], "壓差合力", "kN", (height, area) => 101.3 * Math.exp(-height / 8500) * area, (height, area, force) => "外界大氣壓造成 " + PL.fmt(force, 2) + " kN 合力", (x, area) => 101.3 * Math.exp(-x / 8500) * area),
    "surface-tension": lab("surface", ["毛細管半徑", 0.1, 2.5, 0.45, "mm", 0.01, 2], ["液面張力 γ", 0.02, 0.09, 0.072, "N/m", 0.001, 3], "毛細上升高度", "cm", (radius, gamma) => 2 * gamma * 0.94 / (1000 * 9.8 * radius * 1e-3) * 100, (radius, gamma, height) => "管徑越細，液面上升越高：" + PL.fmt(height, 2) + " cm", (x, gamma) => 2 * gamma * 0.94 / (1000 * 9.8 * x * 1e-3) * 100)
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

  /* 筆電螢幕上的小折線圖（固定深色底）：pts 為 [0..1, 0..1] */
  function screenPlot(ctx, scr, pts, o) {
    o = o || {};
    const x0 = scr.x + 28, x1 = scr.x + scr.w - 10, y0 = scr.y + 20, y1 = scr.y + scr.h - 18;
    ctx.save();
    ctx.strokeStyle = "rgba(190,205,225,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0 - 4); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = "rgba(190,205,225,0.12)";
    for (let i = 1; i < 4; i++) { const y = y1 - (y1 - y0) * i / 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    ctx.strokeStyle = o.color || "rgb(110,226,255)"; ctx.lineWidth = 2.2; ctx.beginPath();
    pts.forEach((p, i) => { const x = x0 + p[0] * (x1 - x0), y = y1 - p[1] * (y1 - y0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    if (o.dot) { ctx.fillStyle = "rgb(255,220,110)"; ctx.beginPath(); ctx.arc(x0 + o.dot[0] * (x1 - x0), y1 - o.dot[1] * (y1 - y0), 4, 0, PL.TAU); ctx.fill(); }
    ctx.fillStyle = "rgba(200,214,232,0.85)"; ctx.font = "9px system-ui,sans-serif";
    if (o.xl) { ctx.textAlign = "right"; ctx.fillText(o.xl, x1, y1 - 4); }
    if (o.yl) { ctx.textAlign = "left"; ctx.fillText(o.yl, scr.x + 4, y0 - 6); }
    ctx.restore();
    return { x0, x1, y0, y1 };
  }

  /* 運動感測器：同學從超音波感測器前走開，筆電即時畫出 x–t 圖 */
  SC["motion-sensor"] = k => {
    const { ctx, W, H, a: d, b: T, t, s, c, v } = k;
    const floorY = H * 0.86;
    AP.labRoom(ctx, W, H, floorY, { bench: "none", window: { x: W * 0.5, y: 64 * s, w: Math.min(220 * s, W * 0.26), h: H * 0.34 } });
    AP.woodFloor(ctx, W, H, floorY);
    const tbX = 16 * s, tbW = Math.min(W * 0.32, 250 * s), tbTop = floorY - 70 * s;
    AP.table(ctx, tbX, tbX + tbW, tbTop, floorY, { thick: 10 * s });
    const lw = tbW - 40 * s, lh = Math.min(H * 0.42, lw * 0.7);
    const scr = AP.laptop(ctx, tbX + 10 * s, tbTop - lh - 2, lw, lh);
    const cyc = T + 1.2, tau = t % cyc, u = clamp(tau / T, 0, 1);
    screenPlot(ctx, scr, [[0, 0], [T / 12, d / 16]], { dot: [u * T / 12, u * d / 16], xl: "t (s)", yl: "x (m)" });
    D.text(ctx, "斜率 = " + PL.fmt(v, 2) + " m/s", scr.x + scr.w - 8, scr.y + 14, { color: "rgb(140,224,255)", size: 10, align: "right", weight: "700" });
    const snX = tbX + tbW - 14 * s, snY = tbTop - 22 * s;
    ctx.fillStyle = "rgb(40,44,52)"; AP.rrPath(ctx, snX - 16 * s, snY - 16 * s, 30 * s, 32 * s, 4 * s); ctx.fill();
    ctx.fillStyle = "rgb(214,180,90)"; ctx.beginPath(); ctx.arc(snX + 10 * s, snY, 11 * s, -Math.PI / 2, Math.PI / 2); ctx.fill();
    AP.cable(ctx, [{ x: snX - 16 * s, y: snY + 8 * s }, { x: scr.x + scr.w + 6 * s, y: tbTop - 6 * s }], "rgb(40,44,52)", 2 * s, 4);
    const x0 = snX + 60 * s, pxPerM = (W - x0 - 40 * s) / 16, px = x0 + u * d * pxPerM;
    for (let i = 0; i < 4; i++) { const rr = ((t * 160 * s + i * 40 * s) % Math.max(40 * s, px - snX)); ctx.strokeStyle = `rgba(255,190,80,${(0.5 * (1 - rr / Math.max(40 * s, px - snX))).toFixed(2)})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(snX + 12 * s, snY, rr, -0.35, 0.35); ctx.stroke(); }
    for (let m = 0; m <= 16; m += 4) { const x = x0 + m * pxPerM; ctx.fillStyle = "rgba(246,200,60,0.9)"; ctx.fillRect(x - 1.5 * s, floorY + 2, 3 * s, 12 * s); D.text(ctx, m + " m", x, floorY + 28 * s, { color: PL.col("text-dim"), size: 9.5, align: "center" }); }
    AP.person(ctx, px, floorY, 96 * s, { pose: u < 1 ? "walk" : "stand", phase: t * 7, shirt: "#e0843a", facing: 1 });
    AP.lcd(ctx, W - 150 * s, 20, 132 * s, 24 * s, "t = " + PL.fmt(u * T, 1) + " s", { color: "rgb(130,240,170)" });
    label(ctx, 20, 18, "平均速度 v = Δx/Δt", PL.fmt(v, 2) + " m/s", c);
  };

  /* 反應距離：看到路上滾出來的球，腳還沒踩下煞車前車子已經開了一段 */
  SC["reaction-time"] = k => {
    const { ctx, W, H, a: vv, b: tr, t, s, c, v: d } = k;
    const gy = H * 0.66;
    AP.outdoor(ctx, W, H, gy, { t, city: true, hills: false, ground: "grass", sunX: W * 0.55 });
    const roadY = gy + 6 * s, roadH = H * 0.24;
    AP.road(ctx, 0, W, roadY, roadH, { laneAt: 0.55 });
    for (let i = 0; i < 6; i++) AP.tree(ctx, 30 * s + i * W / 6, gy + 2, (46 + (i % 3) * 10) * s, 11 + i);
    const pxPerM = (W - 120 * s) / 110, x0 = 40 * s, cl = 64 * s, vpx = vv * pxPerM;
    const tSee = 0.6, tBrake = tSee + tr, brakeT = 1.1, cyc = tBrake + brakeT + 1.2, tau = t % cyc;
    const P1 = x0 + vpx * tSee, P2 = P1 + vpx * tr;
    let x;
    if (tau < tBrake) x = x0 + vpx * tau;
    else { const tb = Math.min(tau - tBrake, brakeT); x = P2 + vpx * (tb - tb * tb / (2 * brakeT)); }
    const carY = roadY + roadH * 0.78;
    ctx.fillStyle = "rgba(246,170,60,0.22)"; ctx.fillRect(P1 + cl / 2, roadY + 4 * s, P2 - P1, roadH - 8 * s);
    AP.dial(ctx, W - 64 * s, 88 * s, 34 * s, vv / 40, { max: 40, unit: "m/s", majors: 4 });
    const bx = P2 + vpx * brakeT / 2 + cl * 0.9, bph = clamp((tau - 0.2) / 0.8, 0, 1);
    if (tau > 0.2) { const by = roadY + roadH * (0.05 + 0.5 * bph) - Math.abs(Math.sin(bph * 9)) * 16 * s * (1 - bph); AP.sportBall(ctx, bx, by, 9 * s, "rubber", tau * 6); }
    AP.car(ctx, x, carY, cl, { color: "#2f7fd8", facing: 1, roll: x / (cl * 0.1), brake: tau >= tBrake });
    if (tau >= tSee) {
      const yb = roadY + roadH + 16 * s;
      D.line(ctx, P1 + cl / 2, roadY + 6, P1 + cl / 2, yb, "rgba(255,255,255,0.8)", 1.2, [4, 3]);
      const xe = Math.min(x, P2) + cl / 2;
      D.arrow(ctx, P1 + cl / 2, yb - 4, xe, yb - 4, { color: "#f6c744", width: 3, head: 8 });
      if (tau >= tBrake) { D.line(ctx, P2 + cl / 2, roadY + 6, P2 + cl / 2, yb, "rgba(255,90,70,0.9)", 1.4, [4, 3]); D.text(ctx, "反應距離 d = v·t = " + PL.fmt(d, 1) + " m", (P1 + P2) / 2 + cl / 2, yb + 16 * s, { color: PL.col("text"), size: 11.5, align: "center", weight: "700" }); }
      if (tau < tBrake) D.text(ctx, "！看到了……（反應中 " + PL.fmt(tau - tSee, 2) + " s）", x, carY - cl * 0.5, { color: "#e0473c", size: 11.5, align: "center", weight: "700" });
      else if (tau < tBrake + 0.6) D.text(ctx, "踩煞車！", x, carY - cl * 0.5, { color: "#e0473c", size: 12, align: "center", weight: "700" });
    }
    AP.lcd(ctx, W - 160 * s, 20, 142 * s, 24 * s, PL.fmt(vv * 3.6, 0) + " km/h", { color: "rgb(255,180,90)" });
    label(ctx, 20, 18, "反應距離", PL.fmt(d, 1) + " m", c);
  };

  /* 槓桿：用長木桿撬大石頭，支點越靠近石頭越省力 */
  SC["lever-machine"] = k => {
    const { ctx, W, H, a: load, b: ratio, t, s, c, v: F, cfg } = k;
    const gy = H * 0.84;
    AP.outdoor(ctx, W, H, gy, { t, hills: true });
    const x0 = W * 0.12, x1 = W * 0.84, Lt = x1 - x0, xf = x0 + Lt / (1 + ratio);
    const ph = 96 * s, beamY = gy - ph * 0.44;
    const rk = 34 * s;
    ctx.fillStyle = isL() ? "rgb(150,140,128)" : "rgb(80,76,70)";
    ctx.beginPath(); ctx.moveTo(xf - rk, gy); ctx.quadraticCurveTo(xf - rk * 0.6, beamY + 2, xf, beamY + 4); ctx.quadraticCurveTo(xf + rk * 0.6, beamY + 2, xf + rk, gy); ctx.closePath(); ctx.fill();
    const br = (18 + 42 * Math.sqrt(fr(load, cfg.a))) * s;
    const g = ctx.createRadialGradient(x0 + br * 0.2 - br * 0.3, beamY - br * 0.9, br * 0.2, x0 + br * 0.2, beamY - br * 0.6, br * 1.1);
    g.addColorStop(0, isL() ? "rgb(190,184,176)" : "rgb(120,116,110)"); g.addColorStop(1, isL() ? "rgb(110,104,96)" : "rgb(60,58,54)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x0 + br * 0.2, beamY - br * 0.62, br * 1.1, br * 0.72, 0, 0, PL.TAU); ctx.fill();
    ctx.fillStyle = isL() ? "rgb(170,120,70)" : "rgb(110,78,46)"; ctx.fillRect(x0 - 16 * s, beamY - 5 * s, Lt + 26 * s, 10 * s);
    ctx.strokeStyle = "rgba(60,36,14,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(x0 - 16 * s, beamY - 5 * s, Lt + 26 * s, 10 * s);
    AP.person(ctx, x1 + 14 * s, gy, ph, { shirt: "#3f7fcf", facing: -1 });
    const fl = clamp(12 + F * 0.12, 12, 110) * s, wl = clamp(12 + load * 0.08, 12, 90) * s;
    D.arrow(ctx, x1, beamY - 40 * s - fl, x1, beamY - 8 * s, { color: "#e0473c", width: 3, label: "F = " + PL.fmt(F, 0) + " N", lsize: 11 });
    D.arrow(ctx, x0 + br * 0.2, beamY + 8 * s, x0 + br * 0.2, beamY + 8 * s + wl, { color: "#2f7fd8", width: 3, label: "負載 " + PL.fmt(load, 0) + " N", lsize: 11 });
    const yb = gy + 18 * s;
    D.arrow(ctx, xf, yb, x0, yb, { color: "#2f7fd8", width: 2, head: 7 }); D.arrow(ctx, xf, yb, x1, yb, { color: "#e0473c", width: 2, head: 7 });
    D.text(ctx, "抗力臂", (x0 + xf) / 2, yb + 16 * s, { color: "#2f7fd8", size: 11, align: "center", weight: "700" });
    D.text(ctx, "施力臂（" + PL.fmt(ratio, 1) + " 倍）", (xf + x1) / 2, yb + 16 * s, { color: "#e0473c", size: 11, align: "center", weight: "700" });
    D.text(ctx, "支點", xf, beamY + 26 * s, { color: "#fff", size: 11, align: "center", weight: "700" });
    D.text(ctx, "F × 施力臂 = 負載 × 抗力臂", W - 18 * s, 44 * s, { color: PL.col("text"), size: 12.5, align: "right", weight: "700" });
    label(ctx, 20, 18, "所需施力", PL.fmt(F, 0) + " N", c);
  };

  /* 滑輪組：天花板吊著動滑輪組，支撐繩段越多越省力 */
  SC["pulley-system"] = k => {
    const { ctx, W, H, a: load, b: seg, t, s, c, v: F, cfg } = k;
    const floorY = H * 0.9;
    AP.labRoom(ctx, W, H, floorY, { bench: "none" });
    AP.concreteFloor(ctx, W, H, floorY);
    const n = Math.max(1, Math.round(seg)), beamY = 34 * s, cx = W * 0.42;
    AP.ceilingBeam(ctx, 0, W, beamY, 26 * s);
    const topN = Math.ceil(n / 2), botN = Math.floor(n / 2), pr = 14 * s, sp = 2 * pr + 6 * s;
    const upY = beamY + 42 * s;
    const lift = ((t % 4) / 4) * 30 * s, cw = (40 + 50 * Math.sqrt(fr(load, cfg.a))) * s;
    const loadTop = floorY - cw * 0.85 - 30 * s - lift, lowY = loadTop - 34 * s;
    AP.hookPlate(ctx, cx, beamY);
    AP.steel(ctx, cx - (topN * sp) / 2 - 4 * s, upY - pr - 8 * s, topN * sp + 8 * s, 6 * s, 10);
    const xs = [];
    for (let i = 0; i < n; i++) xs.push(cx - (n - 1) * (pr) + i * 2 * pr);
    xs.forEach((x, i) => AP.cord(ctx, x, upY, x, lowY));
    for (let i = 0; i < topN; i++) AP.pulley(ctx, cx - (topN - 1) * sp / 2 + i * sp, upY, pr);
    if (botN > 0) {
      AP.steel(ctx, cx - (botN * sp) / 2 - 4 * s, lowY + pr + 2 * s, botN * sp + 8 * s, 6 * s, 10);
      for (let i = 0; i < botN; i++) AP.pulley(ctx, cx - (botN - 1) * sp / 2 + i * sp, lowY, pr);
    } else AP.steel(ctx, cx - 10 * s, lowY - 3 * s, 20 * s, 8 * s, 10);
    AP.cord(ctx, cx, lowY + pr + 8 * s, cx, loadTop);
    AP.crate(ctx, cx, loadTop + cw * 0.85, cw, cw * 0.85, { label: PL.fmt(load, 0) + " N" });
    const freeX = cx + (topN * sp) / 2 + 40 * s, handY = floorY - 110 * s + n * lift * 0.6;
    AP.cord(ctx, cx + (topN - 1) * sp / 2 + pr, upY, freeX, handY);
    AP.person(ctx, freeX + 22 * s, floorY, 100 * s, { shirt: "#46a36b", facing: -1, pose: "arms-up" });
    D.arrow(ctx, freeX - 20 * s, handY - 6 * s, freeX - 20 * s, handY - 6 * s + clamp(20 + F * 0.12, 20, 110) * s, { color: "#e0473c", width: 3, label: "F", lsize: 12 });
    D.text(ctx, n + " 段繩子一起撐住重物", cx - 60 * s, lowY - 40 * s, { color: PL.col("text"), size: 11.5, align: "right", weight: "700" });
    D.text(ctx, "理想 F = 負載 / " + n + "，考慮摩擦效率 82%", W - 18 * s, 80 * s, { color: PL.col("text-dim"), size: 10.5, align: "right" });
    D.text(ctx, "重物上升 1 格，繩端要拉 " + n + " 格", W - 18 * s, 98 * s, { color: PL.col("text-dim"), size: 10.5, align: "right" });
    label(ctx, 20, 60 * s, "實際施力", PL.fmt(F, 0) + " N", c);
  };

  /* 壓力：同一個人穿高跟鞋、雪靴或雪鞋站在雪地上，剖面看得到陷進去多深 */
  SC["contact-pressure"] = k => {
    const { ctx, W, H, a: F, b: A, t, s, c, v: p, cfg } = k;
    const L = isL(), gy = H * 0.6, cx = W * 0.4;
    AP.outdoor(ctx, W, H, gy, { t, hills: true, ground: "none", sunX: W * 0.66 });
    const dep = clamp(3 * Math.log2(Math.max(1, p / 2)), 0, 30), dp = dep * 2.6 * s, fw = (10 + 96 * Math.sqrt(fr(A, cfg.b))) * s;
    const g = ctx.createLinearGradient(0, gy, 0, H);
    g.addColorStop(0, L ? "#fdfeff" : "#cfd8e3"); g.addColorStop(1, L ? "#cfdeec" : "#7e8c9e");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cx - fw / 2 - 12 * s, gy);
    ctx.quadraticCurveTo(cx - fw / 2, gy, cx - fw / 2, gy + dp); ctx.lineTo(cx + fw / 2, gy + dp); ctx.quadraticCurveTo(cx + fw / 2, gy, cx + fw / 2 + 12 * s, gy);
    ctx.lineTo(W, gy); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    noteC(ctx, L ? "#eaf1f8" : "#a4b0bf", 0, gy, W, H - gy);
    ctx.strokeStyle = L ? "rgba(110,140,180,0.22)" : "rgba(40,56,80,0.3)"; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) { const y = gy + i * 18 * s + 20 * s; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cx - fw / 2 - 4, y); ctx.moveTo(cx + fw / 2 + 4, y); ctx.lineTo(W, y); ctx.stroke(); }
    const hg = ctx.createLinearGradient(0, gy, 0, gy + dp + 4 * s); hg.addColorStop(0, L ? "rgba(170,196,226,0.55)" : "rgba(70,90,120,0.6)"); hg.addColorStop(1, L ? "rgba(120,150,190,0.8)" : "rgba(40,56,80,0.8)");
    ctx.fillStyle = hg; ctx.fillRect(cx - fw / 2, gy, fw, dp + 3 * s);
    ctx.fillStyle = L ? "#ffffff" : "#dde4ec";
    [-1, 1].forEach(sd => { ctx.beginPath(); ctx.ellipse(cx + sd * (fw / 2 + 10 * s), gy - 1, 12 * s, 4 * s + dp * 0.08, 0, Math.PI, 0); ctx.fill(); });
    const ph = (96 + 56 * fr(F, cfg.a)) * s, footY = gy + dp;
    AP.person(ctx, cx, footY, ph, { shirt: "#e0473c", facing: 1 });
    if (F > 700) { const bs = (0.18 + 0.16 * fr(F, [0, 700, 1400])) * ph; ctx.fillStyle = "rgb(62,100,150)"; AP.rrPath(ctx, cx - ph * 0.1 - bs * 0.62, footY - ph * 0.78, bs * 0.62, bs, 5); ctx.fill(); }
    const kind = A < 20 ? 0 : A < 150 ? 1 : 2;
    if (kind === 0) { ctx.fillStyle = "rgb(170,30,40)"; ctx.fillRect(cx - fw / 2, footY - 5 * s, fw, 5 * s); ctx.fillRect(cx - fw / 2 - 1, footY - 14 * s, 3 * s, 14 * s); }
    else if (kind === 1) { ctx.fillStyle = "rgb(96,66,40)"; AP.rrPath(ctx, cx - fw / 2, footY - 13 * s, fw, 17 * s, 4 * s); ctx.fill(); }
    else { ctx.strokeStyle = "rgb(60,90,140)"; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.ellipse(cx, footY - 3 * s, fw / 2, 5 * s, 0, 0, PL.TAU); ctx.stroke(); ctx.lineWidth = 1; for (let x = -fw / 2 + 8 * s; x < fw / 2; x += 8 * s) { ctx.beginPath(); ctx.moveTo(cx + x, footY - 7 * s); ctx.lineTo(cx + x, footY + 1 * s); ctx.stroke(); } }
    const ax = cx + fw / 2 + 30 * s;
    if (dp > 6 * s) { D.arrow(ctx, ax, gy, ax, gy + dp, { color: "#2f7fd8", width: 2, head: 6 }); D.arrow(ctx, ax, gy + dp, ax, gy, { color: "#2f7fd8", width: 2, head: 6 }); }
    TX(ctx, "陷入約 " + PL.fmt(dep, 0) + " cm", ax + 8 * s, gy + dp / 2 + 4, 12);
    D.arrow(ctx, cx - ph * 0.5, footY - ph * 1.08, cx - ph * 0.5, footY - ph * 1.08 + clamp(20 + F * 0.05, 20, 90) * s, { color: "#e0473c", width: 3, label: "F = " + PL.fmt(F, 0) + " N", lsize: 11, lx: -64 });
    TX(ctx, "腳下：" + ["高跟鞋", "雪靴", "雪鞋（踩雪板）"][kind] + "，接觸面積 " + PL.fmt(A, 0) + " cm²", W / 2, H - 16 * s, 12, "center");
    TX(ctx, "p = F / A", W - 18 * s, 44 * s, 13, "right");
    label(ctx, 20, 18, "壓強 p", PL.fmt(p, 1) + " kPa", c);
  };

  /* 桁架橋：冰棒棍橋樑架在兩張桌子之間，中央吊重物，受壓紅、受拉藍 */
  SC["truss-bridge"] = k => {
    const { ctx, W, H, a: load, b: span, t, s, c, v: fmax, cfg } = k;
    const floorY = H * 0.94;
    AP.labRoom(ctx, W, H, floorY, { bench: "none" });
    AP.woodFloor(ctx, W, H, floorY);
    const Lb = (160 + (W - 280 * s) * fr(span, cfg.b)), bx0 = W / 2 - Lb / 2, bx1 = W / 2 + Lb / 2;
    const tTop = H * 0.5, n = 6, hT = Math.min(70 * s, Lb / 5);
    AP.table(ctx, bx0 - 120 * s, bx0 + 20 * s, tTop, floorY, { thick: 12 * s });
    AP.table(ctx, bx1 - 20 * s, bx1 + 120 * s, tTop, floorY, { thick: 12 * s });
    const k1 = clamp(fmax / 6000, 0, 1), sag = k1 * 16 * s;
    const bot = i => ({ x: bx0 + Lb * i / n, y: tTop - 2 - sag * Math.sin(Math.PI * i / n) });
    const top = i => ({ x: bx0 + Lb * (i + 0.5) / n, y: tTop - 2 - hT - sag * Math.sin(Math.PI * (i + 0.5) / n) });
    const stick = (p, q, col, w) => { ctx.strokeStyle = "rgb(120,84,40)"; ctx.lineWidth = w + 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); };
    const cm = (a, tint) => `rgb(${Math.round(226 + (tint[0] - 226) * a)},${Math.round(196 + (tint[1] - 196) * a)},${Math.round(140 + (tint[2] - 140) * a)})`;
    for (let i = 0; i < n; i++) {
      const a = k1 * (0.4 + 0.6 * Math.sin(Math.PI * (i + 0.5) / n));
      stick(bot(i), bot(i + 1), cm(a, [60, 110, 220]), 4 * s);
      stick(bot(i), top(i), cm(a * 0.8, i < n / 2 ? [220, 60, 50] : [60, 110, 220]), 3 * s);
      stick(top(i), bot(i + 1), cm(a * 0.8, i < n / 2 ? [60, 110, 220] : [220, 60, 50]), 3 * s);
      if (i < n - 1) stick(top(i), top(i + 1), cm(a, [220, 60, 50]), 4 * s);
    }
    for (let i = 0; i <= n; i++) AP.brassDisc(ctx, bot(i).x, bot(i).y, 2.4 * s);
    const mid = bot(n / 2), ww = (20 + 30 * Math.sqrt(fr(load, cfg.a))) * s;
    AP.cord(ctx, mid.x, mid.y, mid.x, mid.y + 40 * s);
    AP.weight(ctx, mid.x, mid.y + 46 * s, ww, ww * 0.8, PL.fmt(load, 0) + " N");
    D.text(ctx, "紅：受壓　藍：受拉（顏色越深受力越大）", W / 2, 44 * s, { color: PL.col("text"), size: 12, align: "center", weight: "700" });
    D.arrow(ctx, bx0, tTop + 28 * s, bx1, tTop + 28 * s, { color: PL.col("text-dim"), width: 1.4, head: 6 });
    D.arrow(ctx, bx1, tTop + 28 * s, bx0, tTop + 28 * s, { color: PL.col("text-dim"), width: 1.4, head: 6 });
    D.text(ctx, "橋跨 " + PL.fmt(span, 1) + " m", W / 2, tTop + 44 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    label(ctx, 20, 18, "最大桿件力", PL.fmt(fmax, 0) + " N", c);
  };

  /* 水火箭：操場上的寶特瓶火箭，推力大、質量小就飛得猛 */
  SC["water-rocket"] = k => {
    const { ctx, W, H, a: Fth, b: m, t, s, c, v: acc, cfg } = k;
    const gy = H * 0.86;
    AP.outdoor(ctx, W, H, gy, { t, hills: true, ground: "field" });
    const rx = W * 0.44, cyc = 4.2, tau = t % cyc, t0 = 1, burn = 0.35;
    const v1 = Math.min(600, acc * burn * 9) * s;
    let y = 0;
    if (tau > t0) { const tt = tau - t0; y = tt < burn ? 0.5 * (v1 / burn) * tt * tt : 0.5 * v1 * burn + v1 * (tt - burn) - 0.5 * 260 * s * (tt - burn) * (tt - burn); }
    y = Math.max(0, y);
    const base = gy - 20 * s - y, bw = 16 * s, bh = 64 * s;
    AP.steel(ctx, rx - 40 * s, gy - 6 * s, 80 * s, 6 * s, -8);
    ctx.strokeStyle = "rgb(120,128,140)"; ctx.lineWidth = 3 * s;
    [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(rx + sd * 30 * s, gy - 4 * s); ctx.lineTo(rx + sd * 8 * s, gy - 30 * s); ctx.stroke(); });
    AP.cable(ctx, [{ x: rx, y: gy - 10 * s }, { x: rx + 60 * s, y: gy - 4 * s }, { x: rx + 120 * s, y: gy - 30 * s }], "rgb(40,120,70)", 3 * s, 6);
    AP.dial(ctx, rx + 140 * s, gy - 56 * s, 22 * s, fr(Fth, cfg.a), { unit: "壓力" });
    const thrusting = tau > t0 && tau < t0 + burn;
    if (thrusting) { for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? "rgba(140,196,255,0.6)" : "rgba(220,240,255,0.7)"; ctx.beginPath(); ctx.ellipse(rx + (i % 3 - 1) * 3 * s, base + 10 * s + i * 8 * s * (0.6 + fr(Fth, cfg.a)), (3 + i * 2) * s, 5 * s, 0, 0, PL.TAU); ctx.fill(); } }
    const wl = clamp((m - 0.1) / 3.9, 0.08, 0.9) * (tau > t0 + burn ? 0.1 : 1);
    const g = ctx.createLinearGradient(rx - bw, 0, rx + bw, 0);
    g.addColorStop(0, "rgba(160,200,235,0.8)"); g.addColorStop(0.3, "rgba(230,244,252,0.92)"); g.addColorStop(1, "rgba(140,180,215,0.8)");
    ctx.fillStyle = g; AP.rrPath(ctx, rx - bw, base - bh, bw * 2, bh, 10 * s); ctx.fill();
    ctx.fillStyle = "rgba(70,140,230,0.6)"; ctx.fillRect(rx - bw + 2, base - bh * wl, bw * 2 - 4, bh * wl - 2);
    ctx.fillStyle = "rgb(230,70,60)"; ctx.beginPath(); ctx.moveTo(rx - bw + 2, base - bh + 4); ctx.quadraticCurveTo(rx - 8 * s, base - bh - 14 * s, rx, base - bh - 30 * s); ctx.quadraticCurveTo(rx + 8 * s, base - bh - 14 * s, rx + bw - 2, base - bh + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgb(250,150,70)"; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(rx + sd * bw, base - 26 * s); ctx.lineTo(rx + sd * (bw + 14 * s), base + 2 * s); ctx.lineTo(rx + sd * bw, base); ctx.closePath(); ctx.fill(); });
    ctx.fillStyle = "rgb(60,64,72)"; ctx.fillRect(rx - 5 * s, base, 10 * s, 6 * s);
    if (acc <= 0.01) D.text(ctx, "推力 ≤ 重力：飛不起來", rx, gy - 110 * s, { color: "#e0473c", size: 12.5, align: "center", weight: "700" });
    else if (tau < t0) D.text(ctx, "打氣加壓中…", rx, gy - 110 * s, { color: PL.col("text"), size: 11.5, align: "center", weight: "700" });
    D.text(ctx, "a = F/m − g", W - 18 * s, 44 * s, { color: PL.col("text"), size: 13, align: "right", weight: "700" });
    D.text(ctx, "推力 " + PL.fmt(Fth, 0) + " N，總質量 " + PL.fmt(m, 2) + " kg", W - 18 * s, 62 * s, { color: PL.col("text-dim"), size: 10.5, align: "right" });
    label(ctx, 20, 18, "初始加速度", PL.fmt(acc, 1) + " m/s²", c);
  };

  /* 汽車撞擊測試：潰縮區讓停止時間變長，平均撞擊力變小 */
  SC["crumple-zone"] = k => {
    const { ctx, W, H, a: m, b: ts, t, s, c, v: F, cfg } = k;
    const floorY = H * 0.78;
    AP.labRoom(ctx, W, H, floorY, { bench: "none" });
    AP.concreteFloor(ctx, W, H, floorY);
    const wallX = W * 0.74, cl = (m < 700 ? 110 : m < 1500 ? 140 : 160) * s, kind = m < 1500 ? "car" : "truck";
    const vis = 0.3 + 0.9 * fr(ts, cfg.b), cyc = 1.4 + vis + 1.3, tau = t % cyc;
    const crush = (6 + 40 * fr(ts, cfg.b)) * s;
    let front;
    if (tau < 1.4) front = wallX - (1.4 - tau) * 200 * s;
    else if (tau < 1.4 + vis) { const u = (tau - 1.4) / vis; front = wallX + crush * Math.sin(u * Math.PI / 2); }
    else front = wallX + crush;
    const cx = front - cl / 2;
    AP.car(ctx, cx, floorY, cl, { color: "#f0a020", facing: 1, kind, roll: cx / 14 });
    const hit = tau >= 1.4;
    const hx = cx + cl * 0.02 + (hit ? Math.min(1, (tau - 1.4) / vis) * cl * 0.1 : 0);
    ctx.fillStyle = "rgb(250,210,60)"; ctx.beginPath(); ctx.arc(hx, floorY - cl * 0.24, cl * 0.06, 0, PL.TAU); ctx.fill();
    ctx.fillStyle = "rgb(20,20,20)"; ctx.beginPath(); ctx.arc(hx, floorY - cl * 0.24, cl * 0.03, 0, Math.PI); ctx.fill();
    if (hit && tau < 1.4 + vis + 0.8) { ctx.fillStyle = "rgba(250,250,250,0.9)"; ctx.beginPath(); ctx.ellipse(hx + cl * 0.1, floorY - cl * 0.22, cl * 0.07 * Math.min(1, (tau - 1.4) * 6), cl * 0.08, 0, 0, PL.TAU); ctx.fill(); }
    const wg = ctx.createLinearGradient(wallX, 0, wallX + 60 * s, 0);
    wg.addColorStop(0, "rgb(170,172,176)"); wg.addColorStop(1, "rgb(130,132,138)");
    ctx.fillStyle = wg; ctx.fillRect(wallX, floorY - 150 * s, W - wallX, 150 * s);
    for (let y = floorY - 150 * s; y < floorY; y += 20 * s) { ctx.fillStyle = "rgb(250,200,40)"; ctx.fillRect(wallX, y, 10 * s, 10 * s); ctx.fillStyle = "rgb(30,30,34)"; ctx.fillRect(wallX, y + 10 * s, 10 * s, 10 * s); }
    if (hit && tau < 1.4 + vis) { AP.dustKick(ctx, wallX, floorY - 20 * s, (tau - 1.4), 1.4 * s); for (let i = 0; i < 6; i++) { ctx.fillStyle = "rgba(255,210,90,0.9)"; ctx.fillRect(wallX - 6 * s - i * 5 * s, floorY - 50 * s + Math.sin(i * 3 + tau * 20) * 30 * s, 3 * s, 3 * s); } }
    const cw = Math.min(W * 0.34, 250 * s), ch = 96 * s;
    AP.infoCard(ctx, 20 * s, 64 * s, cw, ch);
    const gx0 = 34 * s, gx1 = 20 * s + cw - 12 * s, gy0 = 84 * s, gy1 = 64 * s + ch - 14 * s;
    const Tax = 1.6, hmax = 250, pk = Math.min(1.05, F * Math.PI / 2 / hmax);
    ctx.strokeStyle = PL.theme.pale(0.4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, gy0); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    ctx.strokeStyle = "#e0473c"; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const tt = ts * i / 40, x = gx0 + tt / Tax * (gx1 - gx0), y = gy1 - pk * Math.sin(Math.PI * i / 40) * (gy1 - gy0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    D.text(ctx, "撞擊力 F–t（面積 = 動量變化，固定）", 30 * s, 78 * s, { color: PL.col("text-dim"), size: 9.5 });
    D.text(ctx, (m < 700 ? "小型車 " : m < 1500 ? "轎車 " : "休旅車 ") + PL.fmt(m, 0) + " kg，時速 50 km（14 m/s）", W * 0.36, floorY + 26 * s, { color: PL.col("text"), size: 11.5, align: "center", weight: "700" });
    D.text(ctx, "停止時間 " + PL.fmt(ts, 2) + " s", wallX - 10 * s, floorY - 160 * s, { color: PL.col("text"), size: 11.5, align: "right", weight: "700" });
    label(ctx, 20, 18, "平均撞擊力", PL.fmt(F, 1) + " kN", c);
  };

  /* 溜滑板互推：兩人推開後往反方向滑，質量小的滑得快 */
  SC["skateboard-push"] = k => {
    const { ctx, W, H, a: tp, b: mB, t, s, c, v: vB, cfg } = k;
    const gy = H * 0.8;
    AP.outdoor(ctx, W, H, gy, { t, hills: true, ground: "asphalt", city: true, sunX: W * 0.5 });
    const mA = 60, vA = 150 * tp / mA, pushV = 0.3 + 0.8 * fr(tp, cfg.a), cyc = pushV + 3.2, tau = t % cyc;
    const hA = 88 * s, hB = (68 + 36 * fr(mB, cfg.b)) * s, cx = W / 2;
    const k2 = 40 * s, tt = Math.max(0, tau - pushV), dA = vA * k2 * tt * (1 - tt / 8), dB = vB * k2 * tt * (1 - tt / 8);
    const xA = cx - 22 * s - dA, xB = cx + 22 * s + dB;
    AP.skateboard(ctx, xA, gy, 60 * s, { color: "#e2574c" });
    AP.skateboard(ctx, xB, gy, 60 * s, { color: "#2f7fd8" });
    AP.person(ctx, xA, gy - 11 * s, hA, { shirt: "#e0843a", facing: 1, pose: tau < pushV ? "push" : "stand" });
    AP.person(ctx, xB, gy - 11 * s, hB, { shirt: "#3f7fcf", facing: -1, pose: tau < pushV ? "push" : "stand" });
    if (tau >= pushV) {
      D.arrow(ctx, xA, gy - hA - 30 * s, xA - clamp(vA * 24, 8, 180) * s, gy - hA - 30 * s, { color: "#e0843a", width: 3, label: "v_A = " + PL.fmt(vA, 2) + " m/s", lsize: 10.5, lx: -70 });
      D.arrow(ctx, xB, gy - hB - 30 * s, xB + clamp(vB * 24, 8, 180) * s, gy - hB - 30 * s, { color: "#3f7fcf", width: 3, label: "v_B = " + PL.fmt(vB, 2) + " m/s", lsize: 10.5 });
    } else D.text(ctx, "互推中（" + PL.fmt(tp, 2) + " s）", cx, gy - Math.max(hA, hB) - 30 * s, { color: PL.col("text"), size: 12, align: "center", weight: "700" });
    AP.dial(ctx, W - 64 * s, 96 * s, 32 * s, tp / 2, { max: 2, unit: "推 s", majors: 4 });
    D.text(ctx, "A 60 kg", xA, gy + 20 * s, { color: "#fff", size: 11, align: "center", weight: "700" });
    D.text(ctx, "B " + PL.fmt(mB, 0) + " kg", xB, gy + 20 * s, { color: "#fff", size: 11, align: "center", weight: "700" });
    D.text(ctx, "兩人受到大小相同的衝量：m_A v_A = m_B v_B", W - 18 * s, 44 * s, { color: PL.col("text"), size: 12, align: "right", weight: "700" });
    label(ctx, 20, 18, "B 的速度", PL.fmt(vB, 2) + " m/s", c);
  };

  /* 能量轉換：檯燈把電能變成光和熱，能量流向畫成桑基圖 */
  SC["energy-forms"] = k => {
    const { ctx, W, H, a: E, b: eff, t, s, c, v: out, cfg } = k;
    const benchY = H * 0.84;
    AP.labRoom(ctx, W, H, benchY, {});
    const lx = W * 0.22, useful = out / 5000, loss = (E - out) / 5000;
    ctx.fillStyle = "rgb(60,64,72)"; ctx.beginPath(); ctx.ellipse(lx, benchY - 4 * s, 40 * s, 8 * s, 0, 0, PL.TAU); ctx.fill();
    AP.steel(ctx, lx - 3 * s, benchY - 130 * s, 6 * s, 126 * s, 10);
    ctx.strokeStyle = "rgb(150,158,170)"; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(lx, benchY - 128 * s); ctx.lineTo(lx + 70 * s, benchY - 170 * s); ctx.stroke();
    const hx = lx + 76 * s, hy = benchY - 164 * s;
    const lg = ctx.createRadialGradient(hx, hy + 30 * s, 4, hx, hy + 60 * s, 130 * s);
    lg.addColorStop(0, `rgba(255,240,170,${(0.15 + 0.7 * useful).toFixed(2)})`); lg.addColorStop(1, "rgba(255,240,170,0)");
    ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(hx - 18 * s, hy + 10 * s); ctx.lineTo(hx + 18 * s, hy + 10 * s); ctx.lineTo(hx + 90 * s, benchY); ctx.lineTo(hx - 90 * s, benchY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgb(214,70,60)"; ctx.beginPath(); ctx.moveTo(hx - 10 * s, hy - 14 * s); ctx.lineTo(hx + 10 * s, hy - 14 * s); ctx.lineTo(hx + 30 * s, hy + 12 * s); ctx.lineTo(hx - 30 * s, hy + 12 * s); ctx.closePath(); ctx.fill();
    AP.bulb(ctx, hx, hy + 16 * s, 9 * s, clamp(useful * 1.6 + 0.2, 0, 1));
    AP.heatWaves(ctx, hx - 26 * s, hy - 16 * s, 52 * s, 60 * s, t, clamp(loss * 1.6, 0, 1));
    AP.lcd(ctx, lx - 50 * s, benchY - 40 * s + 10, 100 * s, 22 * s, PL.fmt(E, 0) + " J", { color: "rgb(130,210,255)" });
    const cw = Math.min(W * 0.5, 400 * s), ch = Math.min(H * 0.64, 270 * s), x0 = W - cw - 16 * s, y0 = H * 0.16;
    AP.infoCard(ctx, x0, y0, cw, ch);
    D.text(ctx, "能量流向（寬度 ∝ 能量）", x0 + 12 * s, y0 + 18 * s, { color: PL.col("text"), size: 11, weight: "700" });
    const wIn = (10 + 70 * E / 5000) * s, wU = wIn * eff / 100, wL = wIn - wU, ay = y0 + ch * 0.4;
    const ax0 = x0 + 20 * s, ax1 = x0 + cw * 0.45;
    ctx.fillStyle = "rgba(80,150,230,0.85)"; ctx.fillRect(ax0, ay - wIn / 2, ax1 - ax0, wIn);
    ctx.fillStyle = "rgba(246,200,60,0.9)"; ctx.fillRect(ax1, ay - wIn / 2, cw * 0.4, wU);
    ctx.beginPath(); ctx.moveTo(ax1 + cw * 0.4, ay - wIn / 2 - 6 * s); ctx.lineTo(ax1 + cw * 0.4 + 16 * s, ay - wIn / 2 + wU / 2); ctx.lineTo(ax1 + cw * 0.4, ay - wIn / 2 + wU + 6 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(230,90,60,0.85)"; ctx.beginPath();
    ctx.moveTo(ax1, ay - wIn / 2 + wU); ctx.lineTo(ax1, ay + wIn / 2); ctx.quadraticCurveTo(ax1 + wL + 30 * s, ay + wIn / 2, ax1 + wL + 30 * s, y0 + ch - 34 * s);
    ctx.lineTo(ax1 + 30 * s, y0 + ch - 34 * s); ctx.quadraticCurveTo(ax1 + 30 * s, ay - wIn / 2 + wU, ax1, ay - wIn / 2 + wU); ctx.closePath(); ctx.fill();
    D.text(ctx, "電能 " + PL.fmt(E, 0) + " J", ax0, ay - wIn / 2 - 8 * s, { color: PL.col("text"), size: 10.5, weight: "700" });
    D.text(ctx, "光（有用）" + PL.fmt(out, 0) + " J", ax1 + 8 * s, ay - wIn / 2 - 8 * s, { color: "rgb(170,120,10)", size: 10.5, weight: "700" });
    D.text(ctx, "熱與聲（損耗）" + PL.fmt(E - out, 0) + " J", ax1 + wL + 36 * s, y0 + ch - 22 * s, { color: "rgb(200,70,40)", size: 10.5, weight: "700" });
    D.text(ctx, "效率 " + PL.fmt(eff, 0) + "%：能量不會消失，只是換了形式", x0 + 12 * s, y0 + ch - 8 * s, { color: PL.col("text-dim"), size: 9.5 });
    label(ctx, 20, 18, "有用輸出", PL.fmt(out, 0) + " J", c);
  };


  /* 轆轤提水：輸入功扣掉摩擦生熱，剩下的有用功 = mgh，決定 15 kg 水桶能提多高 */
  SC["simple-machine-efficiency"] = k => {
    const { ctx, W, H, a: Win, b: loss, t, s, c, v: out } = k;
    const L = isL(), gy = H * 0.42, wx = W * 0.34, sw = 46 * s, wY = H - 22 * s, ppm = (wY - gy - 10 * s) / 28;
    AP.outdoor(ctx, W, H, gy, { t, ground: "none", sunX: W * 0.5 });
    let g = ctx.createLinearGradient(0, gy, 0, H);
    g.addColorStop(0, L ? "#b48a60" : "#4a3524"); g.addColorStop(1, L ? "#8d6844" : "#2a1d13");
    ctx.fillStyle = g; ctx.fillRect(0, gy, W, H - gy); noteC(ctx, L ? "#a57d55" : "#3b2a1c", 0, gy, W, H - gy);
    ctx.strokeStyle = L ? "rgba(90,60,30,0.3)" : "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) { ctx.beginPath(); for (let x = 0; x <= W; x += 30) { const y = gy + (H - gy) * i / 6 + Math.sin(x * 0.015 + i * 2) * 4; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    ctx.fillStyle = L ? "#8cc56b" : "#27452b"; ctx.fillRect(0, gy - 3, W, 6);
    g = ctx.createLinearGradient(wx - sw / 2, 0, wx + sw / 2, 0);
    g.addColorStop(0, "rgb(26,22,20)"); g.addColorStop(0.5, "rgb(56,48,40)"); g.addColorStop(1, "rgb(22,18,16)");
    ctx.fillStyle = g; ctx.fillRect(wx - sw / 2, gy, sw, H - gy);
    for (let y = gy, i = 0; y < H; y += 12 * s, i++) [-1, 1].forEach(sd => { ctx.fillStyle = (i + (sd > 0 ? 1 : 0)) % 2 ? "rgb(126,116,104)" : "rgb(100,92,84)"; ctx.fillRect(sd < 0 ? wx - sw / 2 - 8 * s : wx + sw / 2, y, 8 * s, 11 * s); });
    AP.water(ctx, wx - sw / 2, wY, sw, H - wY, t);
    for (let m = 0; m <= 28; m += 4) { const y = wY - m * ppm; ctx.fillStyle = "rgba(250,236,200,0.9)"; ctx.fillRect(wx + sw / 2 + 8 * s, y - 1, 10 * s, 2); TX(ctx, m + " m", wx + sw / 2 + 22 * s, y + 4, 9.5, "left", null, 0); }
    const hOut = out / 147, u = clamp((t % 5) / 3.4, 0, 1), hb = hOut * u * u * (3 - 2 * u) * ppm;
    [-1, 1].forEach(sd => { const x0 = sd < 0 ? wx - sw / 2 - 16 * s : wx + sw / 2; ctx.fillStyle = L ? "rgb(166,156,142)" : "rgb(96,90,84)"; ctx.fillRect(x0, gy - 20 * s, 16 * s, 20 * s); ctx.strokeStyle = "rgba(40,34,28,0.5)"; ctx.strokeRect(x0 + 0.5, gy - 20 * s + 0.5, 16 * s - 1, 20 * s - 1); ctx.beginPath(); ctx.moveTo(x0, gy - 10 * s); ctx.lineTo(x0 + 16 * s, gy - 10 * s); ctx.stroke(); });
    const dR = 13 * s, dx = wx - dR, dy = gy - 78 * s;
    ctx.save(); ctx.strokeStyle = L ? "rgb(128,88,48)" : "rgb(104,72,42)"; ctx.lineWidth = 7 * s; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(dx - 46 * s, gy - 2); ctx.lineTo(dx, dy); ctx.lineTo(dx + 62 * s, gy - 2); ctx.stroke(); ctx.restore();
    const bw = 26 * s, bh = 22 * s, by = wY + 5 * s - hb - bh;
    AP.cord(ctx, wx, dy, wx, by - bw * 0.45);
    ctx.fillStyle = "rgb(150,104,58)"; ctx.beginPath(); ctx.moveTo(wx - bw / 2, by); ctx.lineTo(wx + bw / 2, by); ctx.lineTo(wx + bw * 0.38, by + bh); ctx.lineTo(wx - bw * 0.38, by + bh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgb(66,70,78)"; ctx.fillRect(wx - bw * 0.47, by + 4 * s, bw * 0.94, 2.5 * s); ctx.fillRect(wx - bw * 0.41, by + bh - 6 * s, bw * 0.82, 2.5 * s);
    if (hb > 2) { ctx.fillStyle = "rgba(120,190,235,0.9)"; ctx.beginPath(); ctx.ellipse(wx, by + 1, bw * 0.46, 2.5 * s, 0, 0, PL.TAU); ctx.fill(); }
    ctx.strokeStyle = "rgb(96,98,106)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(wx, by, bw * 0.45, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = "rgb(122,84,46)"; ctx.beginPath(); ctx.arc(dx, dy, dR, 0, PL.TAU); ctx.fill();
    ctx.strokeStyle = "rgb(214,194,150)"; ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(dx, dy, dR * (0.55 + i * 0.16), 0, PL.TAU); ctx.stroke(); }
    const gl = loss / 45, gr = (6 + 22 * gl) * s;
    if (gl > 0.02) { const rg = ctx.createRadialGradient(dx, dy, 1, dx, dy, gr); rg.addColorStop(0, `rgba(255,110,40,${(0.35 + 0.55 * gl).toFixed(2)})`); rg.addColorStop(1, "rgba(255,110,40,0)"); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(dx, dy, gr, 0, PL.TAU); ctx.fill(); }
    AP.brassDisc(ctx, dx, dy, 4 * s);
    AP.heatWaves(ctx, dx - 14 * s, dy - 12 * s, 28 * s, 46 * s, t, gl);
    AP.person(ctx, dx - 60 * s, gy, 100 * s, { shirt: "#3f7fcf", facing: 1, pose: "push" });
    const ca = -hb / dR - 0.6, hx = dx + Math.cos(ca) * 28 * s, hy = dy + Math.sin(ca) * 28 * s;
    ctx.save(); ctx.strokeStyle = "rgb(88,92,100)"; ctx.lineWidth = 4 * s; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(hx, hy); ctx.stroke(); ctx.restore();
    ctx.fillStyle = "rgb(150,104,58)"; ctx.beginPath(); ctx.arc(hx, hy, 4.5 * s, 0, PL.TAU); ctx.fill();
    const yl = wY - hOut * ppm;
    ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = "#3fb86e"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(wx - sw / 2 - 18 * s, yl); ctx.lineTo(wx + sw / 2 + 62 * s, yl); ctx.stroke(); ctx.restore();
    TX(ctx, "有用功能把 15 kg 水桶提高 " + PL.fmt(hOut, 1) + " m", wx + sw / 2 + 66 * s, yl + 4, 11);
    const cw = Math.min(W * 0.42, 310 * s), ch = 84 * s, x0 = W - cw - 14 * s, y0 = 14 * s;
    AP.infoCard(ctx, x0, y0, cw, ch);
    TX(ctx, "能量分配（長度 ∝ 能量，滿格 4000 J）", x0 + 12 * s, y0 + 18 * s, 10.5);
    const bw0 = cw - 24 * s, bL = bw0 * Win / 4000, bU = bL * (1 - loss / 100), yb = y0 + 30 * s;
    ctx.fillStyle = "rgba(70,190,110,0.92)"; ctx.fillRect(x0 + 12 * s, yb, bU, 16 * s);
    ctx.fillStyle = "rgba(230,90,60,0.92)"; ctx.fillRect(x0 + 12 * s + bU, yb, bL - bU, 16 * s);
    ctx.strokeStyle = PL.theme.pale(0.4); ctx.lineWidth = 1; ctx.strokeRect(x0 + 12 * s + 0.5, yb + 0.5, bw0 - 1, 16 * s - 1);
    TX(ctx, "有用功 " + PL.fmt(out, 0) + " J", x0 + 12 * s, yb + 34 * s, 10.5, "left", "#2f9a5a");
    TX(ctx, "摩擦生熱 " + PL.fmt(Win - out, 0) + " J", x0 + cw - 12 * s, yb + 34 * s, 10.5, "right", "#d0553a");
    TX(ctx, "效率 η = 有用功 ÷ 輸入功 = " + PL.fmt(100 - loss, 0) + "%", x0 + cw / 2, y0 + ch + 20 * s, 11.5, "center");
    label(ctx, 20, 18, "有用輸出功", PL.fmt(out, 0) + " J", c);
  };

  /* 水力發電：水庫的水從高處經壓力鋼管衝下，推動渦輪發電，點亮下游的城鎮 */
  SC["hydroelectric-power"] = k => {
    const { ctx, W, H, a: Q, b: h, t, s, c, v: P, cfg } = k;
    const L = isL(), gy = H * 0.84, dX = W * 0.27, dh = (46 + 250 * fr(h, cfg.b)) * s, top = gy - dh, db = 26 * s + dh * 0.5;
    AP.outdoor(ctx, W, H, gy, { t, sunX: W * 0.5 });
    AP.water(ctx, 0, top + 10 * s, dX, gy - top - 4 * s, t);
    AP.poly(ctx, [{ x: 0, y: top + 34 * s }, { x: dX * 0.42, y: gy + 2 }, { x: 0, y: gy + 2 }], L ? "#9c8a70" : "#3c342a");
    const dg = ctx.createLinearGradient(dX, 0, dX + db, 0);
    dg.addColorStop(0, L ? "#dcdad4" : "#6c6e72"); dg.addColorStop(1, L ? "#a6a49f" : "#46484c");
    AP.poly(ctx, [{ x: dX, y: top - 6 * s }, { x: dX + 16 * s, y: top - 6 * s }, { x: dX + db, y: gy }, { x: dX, y: gy }], dg, "rgba(30,34,40,0.5)");
    noteC(ctx, L ? "#c8c6c0" : "#5a5b5f", dX, top, db * 0.5, dh);
    ctx.fillStyle = "rgba(60,64,72,0.8)"; ctx.fillRect(dX - 2, top - 9 * s, 20 * s, 3 * s);
    const phX = dX + db + 14 * s, phW = 86 * s, phH = 54 * s;
    const pw = (6 + 14 * Math.sqrt(fr(Q, cfg.a))) * s, p0 = { x: dX + 6 * s, y: top + dh * 0.42 }, p1 = { x: phX + 22 * s, y: gy - 20 * s };
    ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = "rgb(58,62,70)"; ctx.lineWidth = pw + 5; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    ctx.strokeStyle = "rgb(44,112,172)"; ctx.lineWidth = pw; ctx.stroke(); ctx.restore();
    AP.flowDots(ctx, [p0, p1], t, (30 + 10 * Math.sqrt(h)) * s, { color: "rgba(206,238,255,0.95)", gap: 14 * s, r: Math.max(1.4, pw * 0.2) });
    AP.water(ctx, phX + phW - 4 * s, gy - 2, W - phX - phW + 4 * s, 12 * s, t, { flow: 20 + 40 * fr(Q, cfg.a) });
    ctx.fillStyle = L ? "#ebe0cc" : "#4c4842"; ctx.fillRect(phX, gy - phH, phW, phH);
    ctx.fillStyle = L ? "#b04a36" : "#6e3326"; ctx.fillRect(phX - 5 * s, gy - phH - 8 * s, phW + 10 * s, 9 * s);
    noteC(ctx, L ? "#ebe0cc" : "#4c4842", phX, gy - phH, phW, phH);
    const tcx = phX + 26 * s, tcy = gy - 24 * s, rr = 14 * s, sp = t * (1.5 + 7 * fr(P, [0, 0, 12000]));
    ctx.fillStyle = "rgb(20,28,38)"; ctx.fillRect(tcx - 20 * s, tcy - 20 * s, 40 * s, 40 * s);
    ctx.strokeStyle = "rgb(190,200,212)"; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(tcx, tcy, rr, 0, PL.TAU); ctx.stroke();
    for (let i = 0; i < 7; i++) { const a = sp + i * PL.TAU / 7; ctx.beginPath(); ctx.moveTo(tcx, tcy); ctx.quadraticCurveTo(tcx + Math.cos(a + 0.5) * rr * 0.7, tcy + Math.sin(a + 0.5) * rr * 0.7, tcx + Math.cos(a) * rr, tcy + Math.sin(a) * rr); ctx.stroke(); }
    AP.brassDisc(ctx, tcx, tcy, 3.5 * s);
    AP.lcd(ctx, phX + 50 * s, gy - phH + 10 * s, 30 * s, 16 * s, "⚡", { color: "rgb(255,220,110)", align: "center" });
    const twX = W * 0.64, twT = gy - 118 * s;
    ctx.save(); ctx.strokeStyle = L ? "rgb(110,118,130)" : "rgb(150,158,170)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(twX - 16 * s, gy); ctx.lineTo(twX, twT); ctx.lineTo(twX + 16 * s, gy);
    for (let i = 1; i < 6; i++) { const y = gy - (gy - twT) * i / 6, hw = 16 * s * (1 - i / 6); ctx.moveTo(twX - hw, y); ctx.lineTo(twX + hw, y); }
    ctx.moveTo(twX - 22 * s, twT + 12 * s); ctx.lineTo(twX + 22 * s, twT + 12 * s); ctx.stroke();
    ctx.strokeStyle = L ? "rgba(40,44,52,0.7)" : "rgba(200,206,216,0.6)"; ctx.lineWidth = 1.2;
    [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(phX + phW, gy - phH - 4 * s); ctx.quadraticCurveTo((phX + phW + twX) / 2, twT + 30 * s, twX + sd * 20 * s, twT + 12 * s); ctx.quadraticCurveTo((twX + W) / 2, twT + 40 * s, W, gy - 60 * s + sd * 6 * s); ctx.stroke(); });
    ctx.restore();
    const lit = clamp(Math.log10(1 + P) / Math.log10(45000), 0, 1), nh = 8, on = Math.round(lit * nh);
    for (let i = 0; i < nh; i++) {
      const hx = W * 0.7 + (i % 4) * 54 * s + (i > 3 ? 26 * s : 0), hy = gy - 2 - (i > 3 ? 0 : 26 * s), hw = 34 * s, hh = 22 * s;
      ctx.fillStyle = L ? "#f1e6d2" : "#3d3a36"; ctx.fillRect(hx, hy - hh, hw, hh);
      ctx.fillStyle = L ? "#c0583e" : "#6a3024"; ctx.beginPath(); ctx.moveTo(hx - 4 * s, hy - hh); ctx.lineTo(hx + hw / 2, hy - hh - 14 * s); ctx.lineTo(hx + hw + 4 * s, hy - hh); ctx.closePath(); ctx.fill();
      const onW = i < on;
      ctx.save(); if (onW) { ctx.shadowColor = "rgba(255,210,110,0.9)"; ctx.shadowBlur = 8; }
      ctx.fillStyle = onW ? "rgb(255,214,110)" : (L ? "rgb(120,140,160)" : "rgb(30,36,46)");
      ctx.fillRect(hx + 6 * s, hy - hh + 6 * s, 9 * s, 8 * s); ctx.fillRect(hx + hw - 15 * s, hy - hh + 6 * s, 9 * s, 8 * s); ctx.restore();
    }
    const ax = phX + phW + 24 * s;
    D.line(ctx, dX - 30 * s, top + 10 * s, ax + 8 * s, top + 10 * s, PL.col("text-dim"), 1, [4, 4]);
    D.arrow(ctx, ax, top + 12 * s, ax, gy - 22 * s, { color: "#2f7fd8", width: 2, head: 7 });
    D.arrow(ctx, ax, gy - 22 * s, ax, top + 12 * s, { color: "#2f7fd8", width: 2, head: 7 });
    TX(ctx, "落差 h = " + PL.fmt(h, 0) + " m", ax + 8 * s, (top + gy) / 2, 11.5);
    TX(ctx, "流量 Q = " + PL.fmt(Q, 2) + " m³/s", p0.x + 14 * s, p0.y - 10 * s, 11);
    AP.lcd(ctx, W - 168 * s, 16 * s, 152 * s, 26 * s, PL.fmt(P, 0) + " kW", { color: "rgb(255,210,110)" });
    TX(ctx, "約可供 " + PL.fmt(P, 0) + " 戶家庭用電（每戶平均約 1 kW）", W - 16 * s, 62 * s, 10.5, "right");
    TX(ctx, "P = ρgQh × 效率 82%", W - 16 * s, 80 * s, 11.5, "right");
    label(ctx, 20, 18, "理論功率", PL.fmt(P, 0) + " kW", c);
  };

  /* 風力發電機：葉片越長、風越強，發電越多（P ∝ r²v³）；旁邊的人是比例尺 */
  SC["wind-turbine"] = k => {
    const { ctx, W, H, a: r, b: v, t, s, c, v: P } = k;
    const L = isL(), gy = H * 0.86, bx = W * 0.4;
    AP.outdoor(ctx, W, H, gy, { t: t * v / 3, hills: true, sunX: W * 0.64 });
    const hub = 1.3 * r + 2.5, ppm = (gy - 44 * s) / (hub + r + 0.6), hy = gy - hub * ppm, R = r * ppm;
    ctx.save(); ctx.strokeStyle = L ? "rgba(70,120,170,0.45)" : "rgba(200,220,255,0.3)"; ctx.lineWidth = 1.4;
    for (let i = 0; i < 16; i++) { const y = 20 * s + ((i * 37) % 16) / 16 * (gy - 40 * s), len = (14 + v * 2.4) * s, x = ((i * 173 + t * v * 16 * s) % (W + 120)) - 60; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke(); }
    ctx.restore();
    const bw = Math.max(5 * s, (0.12 + 0.2 * r) * ppm), tw = bw * 0.6;
    const tg = ctx.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0);
    tg.addColorStop(0, "rgb(196,200,206)"); tg.addColorStop(0.4, "rgb(248,249,250)"); tg.addColorStop(1, "rgb(166,172,180)");
    AP.contactShadow(ctx, bx, gy + 2, bw * 1.6);
    AP.poly(ctx, [{ x: bx - bw / 2, y: gy }, { x: bx - tw / 2, y: hy }, { x: bx + tw / 2, y: hy }, { x: bx + bw / 2, y: gy }], tg, "rgba(60,66,76,0.5)");
    const nw = Math.max(8 * s, (0.2 * r + 0.3) * ppm), nh = Math.max(6 * s, (0.14 * r + 0.25) * ppm);
    ctx.fillStyle = "rgb(228,232,236)"; AP.rrPath(ctx, bx - nw / 2, hy - nh / 2, nw, nh, nh * 0.3); ctx.fill(); ctx.strokeStyle = "rgba(60,66,76,0.5)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = L ? "rgba(40,90,150,0.45)" : "rgba(170,210,255,0.4)"; ctx.beginPath(); ctx.arc(bx, hy, R, 0, PL.TAU); ctx.stroke(); ctx.restore();
    const ang = t * Math.min(6 * v / r, 5);
    for (let i = 0; i < 3; i++) {
      ctx.save(); ctx.translate(bx, hy); ctx.rotate(ang + i * PL.TAU / 3);
      ctx.beginPath(); ctx.moveTo(0, -R * 0.05); ctx.quadraticCurveTo(R * 0.25, -R * 0.11, R, -R * 0.014); ctx.lineTo(R, R * 0.014); ctx.quadraticCurveTo(R * 0.3, R * 0.05, 0, R * 0.05); ctx.closePath();
      const bg = ctx.createLinearGradient(0, -R * 0.08, 0, R * 0.06); bg.addColorStop(0, "rgb(252,252,252)"); bg.addColorStop(1, "rgb(190,196,206)");
      ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = "rgba(70,78,90,0.6)"; ctx.lineWidth = 1; ctx.stroke();
      if (R > 50) { ctx.fillStyle = "rgb(222,60,50)"; ctx.fillRect(R * 0.88, -R * 0.022, R * 0.07, R * 0.044); }
      ctx.restore();
    }
    ctx.fillStyle = "rgb(236,238,242)"; ctx.beginPath(); ctx.arc(bx, hy, Math.max(3 * s, R * 0.07), 0, PL.TAU); ctx.fill(); ctx.strokeStyle = "rgba(60,66,76,0.6)"; ctx.stroke();
    const ph = 1.7 * ppm, px = bx + bw / 2 + Math.max(16 * s, ph * 0.5);
    if (ph > 5) AP.person(ctx, px, gy, ph, { shirt: "#e0843a", facing: -1 });
    else { ctx.fillStyle = "#e0843a"; ctx.fillRect(px - 1, gy - Math.max(2, ph), 2, Math.max(2, ph)); }
    TX(ctx, "人 1.7 m", px, gy - Math.max(ph, 4) - 8 * s, 9.5, "center", null, 0);
    const wsX = W - 46 * s, wsY = gy - 62 * s, droop = (1 - clamp(v / 14, 0, 1)) * 1.2;
    ctx.fillStyle = "rgb(120,128,140)"; ctx.fillRect(wsX - 1.5, wsY, 3, gy - wsY);
    ctx.save(); ctx.translate(wsX, wsY + 3 * s); ctx.rotate(droop + Math.sin(t * v) * 0.05);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? "#fff" : "#e8573c"; const x0 = i * 9 * s, h0 = 8 * s - i * 1.4 * s, h1 = 8 * s - (i + 1) * 1.4 * s; AP.poly(ctx, [{ x: x0, y: -h0 }, { x: x0 + 9 * s, y: -h1 }, { x: x0 + 9 * s, y: h1 }, { x: x0, y: h0 }], i % 2 ? "#fff" : "#e8573c"); }
    ctx.restore();
    const bf = v < 5.5 ? "和風" : v < 8 ? "清風" : v < 10.8 ? "強風" : v < 17.2 ? "疾風" : v < 24.5 ? "烈風" : "暴風";
    AP.lcd(ctx, W - 166 * s, 16 * s, 150 * s, 26 * s, PL.fmt(P, P < 10 ? 2 : 0) + " kW", { color: "rgb(130,240,170)" });
    TX(ctx, "風速 " + PL.fmt(v, 1) + " m/s（" + bf + "）", W - 16 * s, 62 * s, 11, "right");
    TX(ctx, "掃掠面積 A = πr² = " + PL.fmt(Math.PI * r * r, 0) + " m²", W - 16 * s, 80 * s, 11, "right");
    TX(ctx, "P ∝ r² v³：風速加倍，功率變 8 倍", W - 16 * s, 98 * s, 10.5, "right", PL.col("text-dim"), 0);
    label(ctx, 20, 18, "理論功率", PL.fmt(P, P < 10 ? 2 : 1) + " kW", c);
  };

  /* 卡文迪西扭秤：大鉛球吸引小鉛球讓細絲扭轉一點點，靠「光槓桿」把偏轉放大來讀 */
  SC["cavendish-balance"] = k => {
    const { ctx, W, H, a: M, b: d, t, s, c, v: th, cfg } = k;
    const L = isL(), benchY = H * 0.84;
    AP.labRoom(ctx, W, H, benchY, {});
    const cx = W * 0.33, rh = 70 * s, rodY = benchY - 74 * s, caseT = rodY - 128 * s;
    const dp = (16 + 128 * Math.sqrt(fr(d, cfg.b))) * s, rB = (5 + 17 * Math.cbrt(M / 120)) * s, x0 = cx - rh - 34 * s, x1 = cx + rh + 34 * s;
    [cx - rh - dp, cx + rh + dp].forEach(x => {
      AP.steel(ctx, x - 3 * s, rodY + rB - 2, 6 * s, benchY - rodY - rB, 10); AP.steel(ctx, x - 16 * s, benchY - 5 * s, 32 * s, 5 * s, -6);
      const g = ctx.createRadialGradient(x - rB * 0.35, rodY - rB * 0.4, rB * 0.1, x, rodY, rB);
      g.addColorStop(0, "rgb(176,182,192)"); g.addColorStop(0.6, "rgb(94,100,110)"); g.addColorStop(1, "rgb(48,52,60)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, rodY, rB, 0, PL.TAU); ctx.fill();
    });
    ctx.fillStyle = "rgba(210,232,244,0.14)"; ctx.fillRect(x0, caseT, x1 - x0, benchY - caseT);
    ctx.strokeStyle = L ? "rgba(80,112,136,0.8)" : "rgba(200,226,240,0.7)"; ctx.lineWidth = 2; ctx.strokeRect(x0, caseT, x1 - x0, benchY - caseT);
    AP.steel(ctx, x0 - 6 * s, benchY - 8 * s, x1 - x0 + 12 * s, 8 * s, -8);
    AP.steel(ctx, cx - 12 * s, caseT - 16 * s, 24 * s, 16 * s, 8);
    ctx.strokeStyle = L ? "rgba(50,60,74,0.85)" : "rgba(220,228,240,0.85)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, caseT); ctx.lineTo(cx, rodY); ctx.stroke();
    const my = rodY - 36 * s;
    ctx.fillStyle = "rgb(220,232,244)"; ctx.fillRect(cx - 5 * s, my - 6 * s, 10 * s, 12 * s); ctx.strokeStyle = "rgba(40,50,60,0.7)"; ctx.strokeRect(cx - 5 * s, my - 6 * s, 10 * s, 12 * s);
    AP.steel(ctx, cx - rh, rodY - 2 * s, rh * 2, 4 * s, 8);
    AP.bob(ctx, cx - rh, rodY, 5 * s); AP.bob(ctx, cx + rh, rodY, 5 * s);
    const al = clamp(4 + 7 * Math.log10(1 + th / 10), 4, 34) * s;
    D.arrow(ctx, cx - rh - 6 * s, rodY - 16 * s, cx - rh - 6 * s - al, rodY - 16 * s, { color: "#e0473c", width: 2, head: 6 });
    D.arrow(ctx, cx + rh + 6 * s, rodY - 16 * s, cx + rh + 6 * s + al, rodY - 16 * s, { color: "#e0473c", width: 2, head: 6 });
    const yd = benchY + 18 * s;
    D.arrow(ctx, cx + rh, yd, cx + rh + dp, yd, { color: PL.col("text-dim"), width: 1.3, head: 5 }); D.arrow(ctx, cx + rh + dp, yd, cx + rh, yd, { color: PL.col("text-dim"), width: 1.3, head: 5 });
    TX(ctx, "d = " + PL.fmt(d, 2) + " m", cx + rh + dp / 2, yd + 16 * s, 10.5, "center");
    const rBm = Math.cbrt(3 * M / (4 * Math.PI * 11340));
    if (d < rBm + 0.012) TX(ctx, "兩球會相碰：d 至少要 " + PL.fmt((rBm + 0.012) * 100, 1) + " cm", cx, caseT - 26 * s, 10.5, "center", "#e0473c");
    TX(ctx, "大鉛球 " + PL.fmt(M, 0) + " kg", cx - rh - dp, rodY - rB - 10 * s, 10.5, "center");
    const lx = W * 0.86, ly = rodY - 30 * s;
    AP.laser(ctx, lx, ly, Math.PI, { len: 50 * s });
    const dx = 0.01 * th, R = niceCeil(dx * 1.25), um = R < 1, un = um ? "μm" : "mm", k2 = um ? 1000 : 1;
    const sx0 = W * 0.64, sw = W * 0.3, sy = caseT - 6 * s, zx = sx0 + sw * 0.12, spp = sw * 0.7 / R;
    const wob = 1 - 0.45 * Math.exp(-(t % 16) / 4) * Math.cos(t % 16 * 1.6), spot = zx + dx * spp * wob;
    ctx.fillStyle = "rgb(250,248,238)"; ctx.fillRect(sx0, sy, sw, 26 * s); ctx.strokeStyle = "rgba(60,60,50,0.6)"; ctx.strokeRect(sx0 + 0.5, sy + 0.5, sw - 1, 26 * s - 1);
    noteC(ctx, "rgb(250,248,238)", sx0, sy, sw, 26 * s);
    for (let i = 0; i <= 10; i++) { const x = zx + R * i / 10 * spp; ctx.fillStyle = "rgba(40,40,40,0.8)"; ctx.fillRect(x - 0.5, sy, 1, i % 5 ? 6 * s : 10 * s); if (i % 5 === 0) { const lv = R * i / 10 * k2; TX(ctx, PL.fmt(lv, Math.abs(lv - Math.round(lv)) > 1e-6 ? 1 : 0), x, sy + 21 * s, 9, "center", "#333", 0); } }
    TX(ctx, un, sx0 + sw - 5 * s, sy + 21 * s, 9, "right", "#333", 1);
    ctx.save(); ctx.strokeStyle = "rgba(255,40,30,0.85)"; ctx.lineWidth = 1.5; ctx.shadowColor = "rgba(255,40,30,0.8)"; ctx.shadowBlur = 5;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(cx + 5 * s, my); ctx.lineTo(spot, sy + 13 * s); ctx.stroke();
    ctx.fillStyle = "rgb(255,60,40)"; ctx.beginPath(); ctx.arc(spot, sy + 13 * s, 3.5 * s, 0, PL.TAU); ctx.fill(); ctx.restore();
    ctx.fillStyle = "rgba(40,160,90,0.9)"; ctx.fillRect(zx + dx * spp - 1, sy - 5 * s, 2, 5 * s);
    TX(ctx, "光點位移 Δx = 2θL = " + PL.fmt(dx * k2, dx * k2 < 10 ? 2 : 1) + " " + un + "（L = 5 m）", sx0 + sw, sy - 12 * s, 10.5, "right");
    TX(ctx, "鏡子", cx + 10 * s, my - 8 * s, 9.5, "left", null, 0);
    TX(ctx, "扭轉角極小，只能靠光槓桿放大讀出", W * 0.79, ly + 26 * s, 10.5, "center", PL.col("text-dim"), 0);
    label(ctx, 20, 18, "扭轉角 θ", PL.fmt(th, 2) + " μrad", c);
  };

  /* 複擺：多孔長木板掛在刀口上擺動；旁邊畫出週期相同的「等效單擺」 */
  SC["physical-pendulum"] = k => {
    const { ctx, W, H, a: I, b: d, t, s, c, v: T, cfg } = k;
    const benchY = H * 0.9;
    AP.labRoom(ctx, W, H, benchY, {});
    const Lp = H * 0.5, px = W * 0.34, py = 24 * s + Lp / 2, dpx = d / 1.5 * Lp * 0.46, th = 0.28 * Math.cos(PL.TAU * t / Math.max(T, 0.45));
    AP.standRod(ctx, px - 112 * s, benchY, py - 34 * s);
    AP.crossArm(ctx, px - 112 * s, py - 4 * s, px + 8 * s);
    ctx.save(); ctx.translate(px, py); ctx.rotate(-th);
    const pw = 32 * s, y0 = dpx - Lp / 2;
    const g = ctx.createLinearGradient(-pw / 2, 0, pw / 2, 0);
    g.addColorStop(0, "rgb(168,118,68)"); g.addColorStop(0.45, "rgb(224,180,122)"); g.addColorStop(1, "rgb(148,102,56)");
    ctx.fillStyle = g; AP.rrPath(ctx, -pw / 2, y0, pw, Lp, 5 * s); ctx.fill(); ctx.strokeStyle = "rgba(90,56,24,0.7)"; ctx.lineWidth = 1; ctx.stroke();
    for (let y = y0 + 12 * s; y < y0 + Lp - 6 * s; y += 18 * s) { ctx.fillStyle = "rgba(60,36,14,0.5)"; ctx.beginPath(); ctx.arc(0, y, 2.6 * s, 0, PL.TAU); ctx.fill(); }
    const mr = (4 + 11 * fr(I, cfg.a)) * s;
    [y0 + mr + 3 * s, y0 + Lp - mr - 3 * s].forEach(y => { AP.brass(ctx, -pw / 2 - mr * 0.7, y - mr, pw + mr * 1.4, mr * 2); ctx.strokeStyle = "rgba(90,60,20,0.7)"; ctx.strokeRect(-pw / 2 - mr * 0.7, y - mr, pw + mr * 1.4, mr * 2); });
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? "#fff" : "#1b1f27"; ctx.beginPath(); ctx.moveTo(0, dpx); ctx.arc(0, dpx, 7 * s, i * Math.PI / 2, (i + 1) * Math.PI / 2); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = "#e0473c"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(pw / 2 + 8 * s, 0); ctx.lineTo(pw / 2 + 8 * s, dpx); ctx.stroke();
    D.text(ctx, "d", pw / 2 + 13 * s, dpx / 2 + 4, { color: "#e0473c", size: 11, weight: "700" });
    ctx.restore();
    AP.brassDisc(ctx, px, py, 4 * s);
    const qx = W * 0.72, qy = 36 * s, Lq = I / (2.6 * d), maxL = benchY - 60 * s - qy, lq = Math.min(Lq * Lp, maxL);
    AP.steel(ctx, qx - 40 * s, qy - 8 * s, 80 * s, 8 * s, 8);
    const bxq = qx + Math.sin(th) * lq, byq = qy + Math.cos(th) * lq;
    ctx.save(); ctx.globalAlpha = 0.85; AP.cord(ctx, qx, qy, bxq, byq); AP.bob(ctx, bxq, byq, 10 * s); ctx.restore();
    if (Lq * Lp > maxL) { const mx = (qx + bxq) / 2, my = (qy + byq) / 2; ctx.fillStyle = PL.theme.isLight() ? "#ede8df" : "#161c26"; ctx.fillRect(mx - 8 * s, my - 5 * s, 16 * s, 10 * s); TX(ctx, "≈", mx, my + 4, 12, "center"); }
    TX(ctx, "等效單擺 L = I/(md) = " + PL.fmt(Lq, Lq < 1 ? 2 : 1) + " m", qx - 48 * s, qy, 11, "right");
    TX(ctx, "（和複擺同週期）", qx - 48 * s, qy + 16 * s, 10, "right", PL.col("text-dim"), 0);
    AP.lcd(ctx, W - 160 * s, H * 0.62, 140 * s, 26 * s, "T = " + PL.fmt(T, 2) + " s", { color: "rgb(130,240,170)" });
    TX(ctx, "T = 2π√(I / mgd)，木板 m = 2.6 kg", W - 16 * s, H * 0.62 + 46 * s, 10.5, "right");
    TX(ctx, "配重越大越靠外 → I 越大", px, benchY + 26 * s, 10.5, "center", PL.col("text-dim"), 0);
    label(ctx, 20, 18, "週期 T", PL.fmt(T, 2) + " s", c);
  };

  /* 扭擺：鋼絲吊著橫桿與兩個配重來回扭轉；配重越外側 I 越大、鋼絲越粗 κ 越大 */
  SC["torsion-pendulum"] = k => {
    const { ctx, W, H, a: I, b: kap, t, s, c, v: T, cfg } = k;
    const benchY = H * 0.9;
    AP.labRoom(ctx, W, H, benchY, {});
    const cx = W * 0.38, topY = 34 * s, rodY = H * 0.52, ph = Math.cos(PL.TAU * t / Math.max(T, 0.5));
    AP.ceilingBeam(ctx, 0, W, topY, topY);
    AP.steel(ctx, cx - 16 * s, topY, 32 * s, 14 * s, 8);
    const wl = (1 + 3.5 * fr(kap, cfg.b)) * s;
    ctx.save(); ctx.strokeStyle = "rgb(120,128,140)"; ctx.lineWidth = wl + 1.5; ctx.beginPath(); ctx.moveTo(cx, topY + 14 * s); ctx.lineTo(cx, rodY - 8 * s); ctx.stroke();
    ctx.strokeStyle = "rgb(214,220,228)"; ctx.lineWidth = Math.max(0.8, wl * 0.5); ctx.stroke(); ctx.restore();
    const RL = 130 * s, ey = 0.26, dyc = 86 * s, dcy = rodY + dyc;
    ctx.fillStyle = PL.theme.isLight() ? "rgba(246,242,230,0.95)" : "rgba(50,56,66,0.95)"; ctx.beginPath(); ctx.ellipse(cx, dcy, RL + 18 * s, (RL + 18 * s) * ey, 0, 0, PL.TAU); ctx.fill();
    ctx.strokeStyle = PL.theme.isLight() ? "rgba(80,70,50,0.6)" : "rgba(220,226,236,0.5)"; ctx.lineWidth = 1; ctx.stroke();
    for (let dg = 0; dg < 360; dg += 15) { const a = dg * Math.PI / 180, r1 = RL + (dg % 45 ? 10 : 4) * s, r2 = RL + 16 * s; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, dcy + Math.sin(a) * r1 * ey); ctx.lineTo(cx + Math.cos(a) * r2, dcy + Math.sin(a) * r2 * ey); ctx.stroke(); }
    const P = (u, y0) => ({ x: cx + Math.cos(ph) * u, y: y0 + Math.sin(ph) * u * ey });
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(224,71,60,0.7)"; ctx.lineWidth = 1.5; const s1 = P(RL, dcy), s2 = P(-RL, dcy); ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke(); ctx.restore();
    const rm = RL * (0.28 + 0.66 * Math.sqrt(fr(I, cfg.a))), near = Math.sin(ph) > 0 ? 1 : -1;
    const mass = u => { const p = P(u, rodY), sc = 1 + 0.1 * Math.sin(ph) * Math.sign(u), mw = 18 * s * sc, mh = 22 * s * sc; AP.brass(ctx, p.x - mw / 2, p.y - mh / 2, mw, mh); ctx.fillStyle = "rgba(255,240,200,0.6)"; ctx.beginPath(); ctx.ellipse(p.x, p.y - mh / 2, mw / 2, mw * 0.18, 0, 0, PL.TAU); ctx.fill(); };
    mass(-rm * near);
    const e1 = P(RL, rodY), e2 = P(-RL, rodY);
    ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = "rgb(70,76,86)"; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(e1.x, e1.y); ctx.lineTo(e2.x, e2.y); ctx.stroke();
    ctx.strokeStyle = "rgb(186,194,206)"; ctx.lineWidth = 3 * s; ctx.stroke(); ctx.restore();
    AP.brassDisc(ctx, cx, rodY, 6 * s);
    mass(rm * near);
    TX(ctx, "鋼絲（κ = " + PL.fmt(kap, 2) + " N·m/rad）", cx + 12 * s, topY + 40 * s, 10.5);
    TX(ctx, "紅虛線：橫桿轉到哪裡", cx, dcy + (RL + 18 * s) * ey + 18 * s, 10, "center", PL.col("text-dim"), 0);
    AP.lcd(ctx, W - 160 * s, 60 * s, 140 * s, 26 * s, "T = " + PL.fmt(T, 2) + " s", { color: "rgb(130,240,170)" });
    TX(ctx, "T = 2π√(I / κ)", W - 16 * s, 110 * s, 12.5, "right");
    TX(ctx, "配重往外移 → I 變大 → 擺得慢", W - 16 * s, 130 * s, 10.5, "right", PL.col("text-dim"), 0);
    TX(ctx, "鋼絲越粗越硬 → κ 變大 → 擺得快", W - 16 * s, 148 * s, 10.5, "right", PL.col("text-dim"), 0);
    label(ctx, 20, 60 * s, "週期 T", PL.fmt(T, 2) + " s", c);
  };

  /* 受迫振動：馬達帶動彈簧上端上下動，資料擷取器同時畫出「驅動」與「物體」兩條曲線 */
  SC["resonance-phase-lag"] = k => {
    const { ctx, W, H, a: f, b: f0, t, s, c, v: pd, cfg } = k;
    const benchY = H * 0.9;
    AP.labRoom(ctx, W, H, benchY, {});
    const r = f / f0, amp = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(0.35 * r, 2)), phi = pd * Math.PI / 180;
    const tt = t * 0.5, wv = PL.TAU * f, th = wv * tt, Ad = 9 * s, mx = W * 0.17, my = 100 * s;
    AP.standRod(ctx, mx - 70 * s, benchY, my - 30 * s);
    AP.crossArm(ctx, mx - 70 * s, my - 20 * s, mx - 20 * s);
    ctx.fillStyle = "rgb(60,66,78)"; AP.rrPath(ctx, mx - 44 * s, my - 18 * s, 30 * s, 36 * s, 4 * s); ctx.fill();
    ctx.fillStyle = "rgb(200,206,216)"; ctx.beginPath(); ctx.arc(mx, my, 16 * s, 0, PL.TAU); ctx.fill(); ctx.strokeStyle = "rgba(40,46,56,0.7)"; ctx.lineWidth = 1; ctx.stroke();
    const pin = { x: mx + Math.cos(th) * Ad, y: my + Math.sin(th) * Ad };
    const ys = my + Math.sin(th) * Ad;
    AP.steel(ctx, mx - 20 * s, ys - 2 * s, 40 * s, 4 * s, 8);
    AP.brassDisc(ctx, pin.x, pin.y, 3.5 * s);
    AP.steel(ctx, mx - 2 * s, ys, 4 * s, 40 * s, 10);
    const yTop = ys + 40 * s, yEq = my + 160 * s, ym = yEq + Math.min(amp, 3) * Ad * Math.sin(th - phi);
    const mw = (22 + 26 * (1 - fr(f0, cfg.b))) * s, mh = mw * 0.72;
    ctx.save(); ctx.strokeStyle = "rgba(40,44,52,0.7)"; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const u = i / 120, y = yTop + (ym - mh / 2 - 4 * s - yTop) * u, x = mx + Math.sin(u * 12 * PL.TAU) * 9 * s; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.strokeStyle = "rgb(190,198,210)"; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    AP.massBlock(ctx, mx, ym + mh / 2, mw, mh, { color: "#e0703a", label: "m", noShadow: true });
    TX(ctx, "← 馬達帶動（f = " + PL.fmt(f, 2) + " Hz）", mx + 22 * s, my + 4, 10);
    TX(ctx, "固有 f₀ = " + PL.fmt(f0, 2) + " Hz", mx + mw / 2 + 12 * s, yEq + 4, 10.5);
    const lw = Math.min(W * 0.56, 440 * s), lh = Math.min(H * 0.66, 300 * s);
    const scr = AP.laptop(ctx, W - lw - 18 * s, benchY - lh - 2, lw, lh);
    const gx0 = scr.x + 12 * s, gx1 = scr.x + scr.w - 12 * s, gc = scr.y + scr.h * 0.55, ga = scr.h * 0.16, span = 2.5 / Math.max(f, 0.4);
    const X = u => gx0 + u * (gx1 - gx0);
    ctx.save(); ctx.strokeStyle = "rgba(190,205,225,0.3)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, gc); ctx.lineTo(gx1, gc); ctx.stroke();
    const curve = (A, lag, col, dash) => { ctx.setLineDash(dash || []); ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); for (let i = 0; i <= 160; i++) { const u = i / 160, tm = tt - span * (1 - u); const y = gc - A * Math.sin(wv * tm - lag); i ? ctx.lineTo(X(u), y) : ctx.moveTo(X(u), y); } ctx.stroke(); };
    curve(ga, 0, "rgba(150,200,255,0.9)", [5, 4]);
    curve(ga * Math.min(amp, 3.2) / 1.2, phi, "rgb(255,150,80)");
    ctx.setLineDash([]); ctx.restore();
    const nPk = Math.floor((wv * tt - Math.PI / 2) / PL.TAU), tPk = (Math.PI / 2 + nPk * PL.TAU) / wv, tPk2 = tPk + phi / wv;
    const ua = 1 - (tt - tPk) / span, ub = 1 - (tt - tPk2) / span;
    if (ua > 0.02 && ub < 0.98 && ub > ua + 0.01) { const yb = scr.y + 30 * s; D.line(ctx, X(ua), yb, X(ua), gc, "rgba(150,200,255,0.8)", 1, [3, 3]); D.line(ctx, X(ub), yb, X(ub), gc, "rgba(255,150,80,0.8)", 1, [3, 3]); ctx.fillStyle = "rgb(255,220,110)"; ctx.fillRect(X(ua), yb - 1, X(ub) - X(ua), 2); D.text(ctx, "落後", (X(ua) + X(ub)) / 2, yb - 6, { color: "rgb(255,220,110)", size: 10, align: "center", weight: "700" }); }
    D.text(ctx, "藍虛線：馬達驅動　橘線：物體位置", scr.x + 12 * s, scr.y + scr.h - 10 * s, { color: "rgba(210,220,236,0.9)", size: 10 });
    D.text(ctx, "φ = " + PL.fmt(pd, 0) + "°", scr.x + scr.w - 12 * s, scr.y + 16 * s, { color: "rgb(255,190,120)", size: 12, align: "right", weight: "700" });
    const zone = r < 0.7 ? "f 遠小於 f₀：幾乎同步" : r < 1.3 ? "f ≈ f₀：落後約 90°、振幅最大（共振）" : "f 遠大於 f₀：接近反相 180°";
    TX(ctx, zone, scr.x + scr.w / 2, scr.y - 12 * s, 11.5, "center");
    D.text(ctx, "慢動作 ×0.5", scr.x + 12 * s, scr.y + 16 * s, { color: "rgba(210,220,236,0.8)", size: 10 });
    label(ctx, 20, 18, "相位差", PL.fmt(pd, 0) + "°", c);
  };

  /* 密度：先用電子秤量質量，再放進水族箱——密度比水小會浮、比水大會沉 */
  SC["density-lab"] = k => {
    const { ctx, W, H, a: m, b: V, t, s, c, v: rho } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const side = Math.cbrt(V) * 7.2 * s, mat = rho < 0.3 ? ["保麗龍", "#f2f2ee"] : rho < 0.8 ? ["木頭", "#c8914f"] : rho < 0.97 ? ["冰或蠟", "#e4f3fa"] : rho < 1.03 ? ["和水差不多", "#8fc9b0"] : rho < 2 ? ["塑膠或橡膠", "#5a8fd8"] : rho < 4 ? ["石頭或鋁", "#a4aab2"] : rho < 9.5 ? ["鐵或銅", "#7c828c"] : ["鉛", "#5a5e66"];
    const cube = (x, yb, sd) => { const g = ctx.createLinearGradient(x - sd / 2, yb - sd, x + sd / 2, yb); g.addColorStop(0, mixRgb(mat[1], "#ffffff", 0.3)); g.addColorStop(1, mixRgb(mat[1], "#000000", 0.28)); ctx.fillStyle = g; ctx.fillRect(x - sd / 2, yb - sd, sd, sd); ctx.strokeStyle = "rgba(20,24,30,0.55)"; ctx.lineWidth = 1; ctx.strokeRect(x - sd / 2 + 0.5, yb - sd + 0.5, sd - 1, sd - 1); };
    const bx = W * 0.19, pan = AP.balance(ctx, bx, benchY, 160 * s, PL.fmt(m, 0) + " g");
    cube(bx, pan, side);
    TX(ctx, "① 秤質量", bx, pan - side - 12 * s, 11.5, "center");
    const tx0 = W * 0.42, tx1 = W - 24 * s, tTop = benchY - 236 * s, wTop = benchY - 196 * s, tb = benchY - 8 * s;
    ctx.fillStyle = PL.theme.isLight() ? "rgba(110,180,225,0.32)" : "rgba(60,130,180,0.4)"; ctx.fillRect(tx0, wTop, tx1 - tx0, tb - wTop);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = ["#b89c78", "#8f7a60", "#d8c4a0"][i % 3]; ctx.beginPath(); ctx.arc(tx0 + 4 * s + ((i * 53) % 97) / 97 * (tx1 - tx0 - 8 * s), tb - 3 * s - (i % 4) * 2 * s, 3 * s, 0, PL.TAU); ctx.fill(); }
    [0.1, 0.86, 0.93].forEach((q, j) => { const px = tx0 + (tx1 - tx0) * q; ctx.strokeStyle = "rgba(60,150,80,0.85)"; ctx.lineWidth = 3 * s; ctx.lineCap = "round"; for (let b = -1; b <= 1; b++) { ctx.beginPath(); ctx.moveTo(px + b * 4 * s, tb - 4 * s); ctx.quadraticCurveTo(px + b * 10 * s + Math.sin(t * 1.5 + j + b) * 6 * s, tb - 50 * s, px + b * 6 * s + Math.sin(t * 1.5 + j + b) * 10 * s, tb - (80 - j * 18 + b * 8) * s); ctx.stroke(); } });
    const ox = (tx0 + tx1) / 2; let top;
    if (rho < 0.97) top = wTop - side * (1 - rho) + Math.sin(t * 2) * 1.5 * s;
    else if (rho < 1.03) top = (wTop + tb) / 2 - side / 2 + Math.sin(t * 1.2) * 3 * s;
    else top = tb - side;
    cube(ox, top + side, side);
    ctx.fillStyle = "rgba(120,196,236,0.3)"; ctx.fillRect(ox - side / 2, Math.max(top, wTop), side, top + side - Math.max(top, wTop));
    ctx.strokeStyle = "rgba(210,240,255,0.9)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx0, wTop); ctx.lineTo(tx1, wTop); ctx.stroke();
    if (rho >= 1.03) AP.bubbles(ctx, ox - side / 2, wTop + 6 * s, side, tb - wTop - side - 6 * s, t, 5, { seed: 7 });
    ctx.fillStyle = "rgba(220,240,250,0.12)"; ctx.fillRect(tx0, tTop, tx1 - tx0, tb - tTop);
    ctx.strokeStyle = PL.theme.isLight() ? "rgba(70,110,140,0.85)" : "rgba(200,226,240,0.8)"; ctx.lineWidth = 2.2; ctx.strokeRect(tx0, tTop, tx1 - tx0, tb - tTop);
    AP.steel(ctx, tx0 - 6 * s, tb, tx1 - tx0 + 12 * s, 8 * s, -8);
    const Wt = m * 9.8e-3, Bf = Math.min(Wt, V * 9.8e-3) * (rho < 1.03 ? 1 : 0) + (rho >= 1.03 ? V * 9.8e-3 : 0), sc = F => (8 + 60 * F / 20) * s, cy = top + side / 2, dn = Math.min(sc(Wt), benchY + 30 * s - cy);
    D.arrow(ctx, ox + side / 2 + 14 * s, cy, ox + side / 2 + 14 * s, cy + dn, { color: "#e0473c", width: 3, label: "重力 " + PL.fmt(Wt, 2) + " N", lsize: 10.5 });
    D.arrow(ctx, ox - side / 2 - 14 * s, cy, ox - side / 2 - 14 * s, cy - sc(Bf), { color: "#2f7fd8", width: 3, label: "浮力 " + PL.fmt(Bf, 2) + " N", lsize: 10.5 });
    TX(ctx, "② 放進水裡", ox, tTop - 14 * s, 11.5, "center");
    const verdict = rho < 0.97 ? "密度比水小 → 浮在水面，沒入 " + PL.fmt(Math.min(1, rho) * 100, 0) + "%" : rho < 1.03 ? "密度和水差不多 → 懸浮" : "密度比水大 → 沉到底";
    TX(ctx, "看起來像：" + mat[0] + "　" + verdict, W / 2, benchY + 26 * s, 12, "center");
    TX(ctx, "ρ = m / V = " + PL.fmt(m, 0) + " g ÷ " + PL.fmt(V, 0) + " cm³", W - 18 * s, 44 * s, 12, "right");
    label(ctx, 20, 18, "物體密度", PL.fmt(rho, 3) + " g/cm³", c);
  };

  /* 馬德堡半球：抽真空的銅球要兩隊馬才拉得開；越往高山，大氣壓越小、越好拉 */
  function horse(ctx, x, gy, L, f, ph) {
    ctx.save(); ctx.translate(x, gy); ctx.scale(f, 1); ctx.lineCap = "round";
    const leg = (x0, a, col) => { ctx.strokeStyle = col; ctx.lineWidth = L * 0.075; ctx.beginPath(); ctx.moveTo(x0, -L * 0.5); ctx.lineTo(x0 + Math.sin(a) * L * 0.2, -L * 0.25); ctx.lineTo(x0 + Math.sin(a) * L * 0.34, 0); ctx.stroke(); };
    leg(-L * 0.3, Math.sin(ph) * 0.35 - 0.35, "rgb(74,46,26)"); leg(L * 0.26, -Math.sin(ph) * 0.35 - 0.35, "rgb(74,46,26)");
    const g = ctx.createLinearGradient(0, -L * 0.78, 0, -L * 0.4); g.addColorStop(0, "rgb(166,112,64)"); g.addColorStop(1, "rgb(104,66,34)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -L * 0.6, L * 0.42, L * 0.17, -0.08, 0, PL.TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(L * 0.22, -L * 0.72); ctx.lineTo(L * 0.5, -L * 0.98); ctx.lineTo(L * 0.62, -L * 0.9); ctx.lineTo(L * 0.4, -L * 0.54); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(L * 0.63, -L * 0.88); ctx.rotate(0.75); ctx.beginPath(); ctx.ellipse(0, 0, L * 0.16, L * 0.07, 0, 0, PL.TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = "rgb(60,38,20)"; ctx.lineWidth = L * 0.05; ctx.beginPath(); ctx.moveTo(L * 0.26, -L * 0.78); ctx.lineTo(L * 0.5, -L * 1.02); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-L * 0.4, -L * 0.66); ctx.quadraticCurveTo(-L * 0.6, -L * 0.56, -L * 0.56, -L * 0.3); ctx.stroke();
    leg(-L * 0.22, -Math.sin(ph) * 0.35 - 0.35, "rgb(120,78,42)"); leg(L * 0.33, Math.sin(ph) * 0.35 - 0.35, "rgb(120,78,42)");
    ctx.strokeStyle = "rgb(40,30,24)"; ctx.lineWidth = L * 0.05; ctx.beginPath(); ctx.moveTo(L * 0.28, -L * 0.8); ctx.lineTo(L * 0.36, -L * 0.52); ctx.stroke();
    ctx.restore();
  }
  SC["atmospheric-pressure"] = k => {
    const { ctx, W, H, a: alt, b: A, t, s, c, v: F, cfg } = k;
    const L = isL(), gy = H * 0.8, p = 101.3 * Math.exp(-alt / 8500);
    AP.outdoor(ctx, W, H, gy, { t, hills: true, ground: alt > 3000 ? "sand" : "grass", sunX: W * 0.6 });
    if (alt > 4200) { ctx.fillStyle = L ? "rgba(250,252,255,0.85)" : "rgba(200,210,226,0.55)"; ctx.fillRect(0, gy, W, H - gy); noteC(ctx, L ? "#f4f7fa" : "#707a88", 0, gy, W, H - gy); }
    const cx = W / 2, R = (14 + 56 * (Math.sqrt(A / Math.PI) - 0.056) / 0.22) * s, cy = gy - 34 * s - R;
    ctx.save(); ctx.strokeStyle = "rgb(120,82,44)"; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(cx - 26 * s, gy); ctx.lineTo(cx, cy + R * 0.7); ctx.lineTo(cx + 26 * s, gy); ctx.stroke(); ctx.restore();
    const need = Math.ceil(F / 0.75), n = Math.min(need, 3), HL = 62 * s, ph = t * 3;
    [-1, 1].forEach(sd => {
      const x0 = cx + sd * (R + 50 * s), far = x0 + sd * ((n - 1) * HL * 1.05 + HL * 0.45);
      AP.cord(ctx, cx + sd * (R + 8 * s), cy, far, gy - HL * 0.62);
      for (let i = n - 1; i >= 0; i--) horse(ctx, x0 + sd * (HL * 0.45 + i * HL * 1.05), gy, HL, sd, ph + i * 1.3 + (sd > 0 ? 0.7 : 0));
      if (need > 3) TX(ctx, "×" + need + " 匹", far + sd * 20 * s, gy - HL - 8 * s, 12, sd < 0 ? "left" : "right");
    });
    for (let i = 0; i < 14; i++) { const a = i * PL.TAU / 14, l = (6 + 22 * p / 101.3) * s, r1 = R + 6 * s + l; D.arrow(ctx, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * (R + 4 * s), cy + Math.sin(a) * (R + 4 * s), { color: "#2f7fd8", width: 1.6, head: 5 }); }
    const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
    g.addColorStop(0, "rgb(250,200,150)"); g.addColorStop(0.55, "rgb(196,118,62)"); g.addColorStop(1, "rgb(120,62,30)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, PL.TAU); ctx.fill();
    AP.brass(ctx, cx - 3 * s, cy - R - 4 * s, 6 * s, R * 2 + 8 * s);
    AP.steel(ctx, cx - 2 * s, cy - R - 16 * s, 4 * s, 12 * s, 8); ctx.fillStyle = "rgb(200,50,40)"; ctx.fillRect(cx - 7 * s, cy - R - 18 * s, 14 * s, 4 * s);
    ctx.strokeStyle = "rgb(150,156,166)"; ctx.lineWidth = 3 * s; [-1, 1].forEach(sd => { ctx.beginPath(); ctx.arc(cx + sd * (R + 5 * s), cy, 5 * s, 0, PL.TAU); ctx.stroke(); });
    TX(ctx, "球內抽成真空", cx, cy - R - 28 * s, 10.5, "center");
    const mx0 = W - 176 * s, my0 = 60 * s, mw = 158 * s, mh = 70 * s;
    AP.infoCard(ctx, mx0, my0, mw, mh);
    AP.poly(ctx, [{ x: mx0 + 10 * s, y: my0 + mh - 8 * s }, { x: mx0 + mw * 0.55, y: my0 + 12 * s }, { x: mx0 + mw - 10 * s, y: my0 + mh - 8 * s }], L ? "#9aa8a0" : "#4a5650");
    AP.poly(ctx, [{ x: mx0 + mw * 0.47, y: my0 + 21 * s }, { x: mx0 + mw * 0.55, y: my0 + 12 * s }, { x: mx0 + mw * 0.63, y: my0 + 21 * s }], "#fff");
    const u = alt / 5000, fx = mx0 + 10 * s + (mw * 0.55 - 10 * s) * u, fy = my0 + mh - 8 * s - (mh - 20 * s) * u;
    ctx.fillStyle = "#e0473c"; ctx.beginPath(); ctx.arc(fx, fy, 4 * s, 0, PL.TAU); ctx.fill();
    TX(ctx, PL.fmt(alt, 0) + " m", fx + 8 * s, fy + 4, 9.5, "left", null);
    TX(ctx, "海拔 " + PL.fmt(alt, 0) + " m：大氣壓 p = " + PL.fmt(p, 1) + " kPa", W - 18 * s, 44 * s, 11.5, "right");
    TX(ctx, "壓力差合力 F = p × A = " + PL.fmt(F, 2) + " kN；每邊約需 " + need + " 匹馬（每匹約 0.75 kN）", W / 2, H - 14 * s, 11.5, "center");
    label(ctx, 20, 18, "壓差合力", PL.fmt(F, 2) + " kN", c);
  };

  /* 毛細現象：粗細不同的玻璃管插在水盆裡，越細的管子水爬得越高；水黽靠表面張力站在水面上 */
  SC["surface-tension"] = k => {
    const { ctx, W, H, a: r, b: gam, t, s, c, v: hh } = k;
    const L = isL(), benchY = H * 0.88;
    AP.labRoom(ctx, W, H, benchY, {});
    const dx0 = W * 0.12, dx1 = W * 0.6, dTop = benchY - 64 * s, wy = benchY - 40 * s, tubeTop = 74 * s, ppc = (wy - tubeTop - 12 * s) / 30;
    ctx.fillStyle = L ? "rgba(110,180,225,0.34)" : "rgba(60,130,180,0.42)"; ctx.fillRect(dx0, wy, dx1 - dx0, benchY - 4 * s - wy);
    const hc = rr => 2 * gam * 0.94 / (9800 * rr * 1e-3) * 100, rs = [r * 2, r, r / 2];
    AP.standRod(ctx, dx0 - 50 * s, benchY, tubeTop + 4 * s);
    AP.steel(ctx, dx0 - 54 * s, tubeTop + 16 * s, dx1 - dx0 + 34 * s, 7 * s, 8);
    rs.forEach((rr, i) => {
      const x = dx0 + (dx1 - dx0) * (0.25 + 0.25 * i), tw = clamp(5 + 9 * rr, 5, 30) * s, h = hc(rr), top = Math.max(tubeTop + 4 * s, wy - h * ppc), sel = i === 1;
      ctx.fillStyle = L ? "rgba(40,120,200,0.8)" : "rgba(90,170,235,0.8)"; ctx.fillRect(x - tw / 2 + 1, top, tw - 2, benchY - 14 * s - top);
      ctx.fillStyle = "rgba(230,248,255,0.9)"; ctx.beginPath(); ctx.moveTo(x - tw / 2 + 1, top - 2); ctx.quadraticCurveTo(x, top + tw * 0.4, x + tw / 2 - 1, top - 2); ctx.lineTo(x + tw / 2 - 1, top + 1); ctx.quadraticCurveTo(x, top + tw * 0.4 + 3, x - tw / 2 + 1, top + 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(220,240,250,0.18)"; ctx.fillRect(x - tw / 2, tubeTop, tw, benchY - 14 * s - tubeTop);
      ctx.strokeStyle = sel ? "#e0843a" : (L ? "rgba(70,110,140,0.85)" : "rgba(200,226,240,0.8)"); ctx.lineWidth = sel ? 2 : 1.2; ctx.strokeRect(x - tw / 2, tubeTop, tw, benchY - 14 * s - tubeTop);
      TX(ctx, PL.fmt(h, h < 10 ? 2 : 1) + " cm", x + tw / 2 + 5 * s, top + 4, sel ? 12 : 10, "left", null, sel ? 1 : 0);
      TX(ctx, (sel ? "這根 " : "") + "r = " + PL.fmt(rr, 2) + " mm", x, benchY + 20 * s, 10, "center", sel ? null : PL.col("text-dim"), sel ? 1 : 0);
      if (h * ppc > wy - tubeTop - 4 * s) TX(ctx, "（超出管長）", x, tubeTop - 4 * s, 9.5, "center", "#e0473c", 0);
    });
    ctx.strokeStyle = "rgba(210,240,255,0.9)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(dx0, wy); ctx.lineTo(dx1, wy); ctx.stroke();
    ctx.fillStyle = "rgba(220,240,250,0.12)"; ctx.fillRect(dx0, dTop, dx1 - dx0, benchY - 4 * s - dTop);
    ctx.strokeStyle = L ? "rgba(70,110,140,0.85)" : "rgba(200,226,240,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dx0, dTop); ctx.lineTo(dx0, benchY - 4 * s); ctx.lineTo(dx1, benchY - 4 * s); ctx.lineTo(dx1, dTop); ctx.stroke();
    const sx = dx1 - 44 * s, sink = gam < 0.035, dip = clamp(0.1 / gam, 1, 5) * s, sy = wy + (sink ? 10 * s : -3 * s);
    ctx.strokeStyle = "rgb(60,50,40)"; ctx.lineWidth = 1.4;
    [-1, 1].forEach(sd => [0.3, 1, 1.6].forEach(q => { ctx.beginPath(); ctx.moveTo(sx + sd * 4 * s, sy); ctx.quadraticCurveTo(sx + sd * 14 * s * q, sy - 8 * s, sx + sd * (8 + 12 * q) * s, wy + (sink ? 6 * s : 0)); ctx.stroke(); if (!sink) { ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(sx + sd * (8 + 12 * q) * s, wy - dip * 0.3, dip, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); ctx.strokeStyle = "rgb(60,50,40)"; } }));
    ctx.fillStyle = "rgb(70,56,40)"; ctx.beginPath(); ctx.ellipse(sx, sy - 2 * s, 9 * s, 3 * s, 0, 0, PL.TAU); ctx.fill();
    if (sink) { AP.bubbles(ctx, sx - 10 * s, wy + 2, 20 * s, 14 * s, t, 3, { seed: 3 }); TX(ctx, "表面張力太小，水黽沉下去了！", sx, dTop - 12 * s, 10.5, "center", "#e0473c"); }
    else TX(ctx, "水黽站在水面上", sx, dTop - 12 * s, 10, "center", PL.col("text-dim"), 0);
    const liq = gam < 0.03 ? "酒精或肥皂水" : gam < 0.06 ? "加了清潔劑的水" : gam < 0.08 ? "清水（約 0.072）" : "表面張力更大的液體";
    const ix = W * 0.8, iy = H * 0.4, ir = 74 * s;
    ctx.save(); ctx.beginPath(); ctx.arc(ix, iy, ir, 0, PL.TAU); ctx.fillStyle = L ? "#f7fbfd" : "#1a2230"; ctx.fill(); ctx.clip();
    noteC(ctx, L ? "#f7fbfd" : "#1a2230", ix - ir * 0.7, iy - ir * 0.7, ir * 1.4, ir * 1.4);
    const iw = ir * 0.9;
    ctx.fillStyle = L ? "rgba(70,150,215,0.55)" : "rgba(90,170,230,0.55)"; ctx.beginPath(); ctx.moveTo(ix - iw / 2, iy - 8 * s); ctx.quadraticCurveTo(ix, iy + 22 * s, ix + iw / 2, iy - 8 * s); ctx.lineTo(ix + iw / 2, iy + ir); ctx.lineTo(ix - iw / 2, iy + ir); ctx.closePath(); ctx.fill();
    ctx.fillStyle = L ? "rgba(150,190,215,0.8)" : "rgba(170,210,235,0.6)"; ctx.fillRect(ix - iw / 2 - 8 * s, iy - ir, 8 * s, ir * 2); ctx.fillRect(ix + iw / 2, iy - ir, 8 * s, ir * 2);
    ctx.restore();
    ctx.strokeStyle = L ? "rgba(70,90,110,0.7)" : "rgba(200,220,240,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, PL.TAU); ctx.stroke();
    const al = (10 + 260 * gam) * s;
    [-1, 1].forEach(sd => D.arrow(ctx, ix + sd * iw / 2, iy - 6 * s, ix + sd * iw / 2, iy - 6 * s - al, { color: "#e0473c", width: 2.2, head: 6 }));
    TX(ctx, "放大：凹液面", ix, iy + ir + 16 * s, 10.5, "center");
    TX(ctx, "表面張力沿管壁往上拉", ix, iy - ir - 10 * s, 10.5, "center", "#e0473c");
    TX(ctx, "液體：" + liq, W - 16 * s, 44 * s, 11, "right");
    TX(ctx, "h = 2γcosθ / (ρgr)：管越細、γ 越大，爬得越高", W / 2, H - 12 * s, 11, "center");
    label(ctx, 20, 18, "毛細上升高度", PL.fmt(hh, 2) + " cm", c);
  };

  const CAP = {
    "motion-sensor": "同學走離超音波感測器，筆電即時畫出位置–時間圖：圖形的斜率就是平均速度 v = Δx/Δt",
    "reaction-time": "從看到危險到踩下煞車需要反應時間，這段時間車子仍以原速前進：反應距離 d = v × t",
    "lever-machine": "槓桿原理：施力 × 施力臂 = 抗力 × 抗力臂，支點越靠近重物越省力",
    "pulley-system": "滑輪組由 n 段繩子一起撐住重物，理想施力只要重量的 1/n，但繩端要多拉 n 倍長",
    "contact-pressure": "同樣的體重，接觸面積越小壓力越大：高跟鞋陷進雪裡，雪鞋卻能浮在雪面上（p = F/A）",
    "truss-bridge": "桁架把載重分散到每根桿件：上弦受壓、下弦受拉，跨距越大桿件受力越大",
    "water-rocket": "水向下噴出，反作用力推動火箭向上；推力要大於重力才飛得起來：a = F/m − g",
    "crumple-zone": "動量變化固定時，潰縮區把撞擊時間拉長，平均撞擊力就變小（FΔt = mΔv）",
    "skateboard-push": "兩人互推時受到大小相等、方向相反的衝量：質量小的一方滑得比較快",
    "energy-forms": "檯燈把電能轉成光和熱：能量不會消失，損耗的部分多半變成熱",
    "simple-machine-efficiency": "轉動轆轤時軸承摩擦會生熱：輸入功 = 有用功（mgh）+ 損耗，效率 = 有用功 ÷ 輸入功",
    "hydroelectric-power": "水從高處流下，重力位能轉成電能：流量越大、落差越高，發電功率越大",
    "wind-turbine": "葉片接住風的動能：發電功率與葉片半徑平方、風速三次方成正比",
    "cavendish-balance": "卡文迪西用扭秤量到兩球之間極微弱的萬有引力，並由此算出重力常數 G",
    "physical-pendulum": "複擺的週期由轉動慣量和支點到質心的距離決定，和長度 L = I/(md) 的單擺週期相同",
    "torsion-pendulum": "扭擺的週期 T = 2π√(I/κ)；「400 天鐘」就是利用扭擺週期很長來計時",
    "resonance-phase-lag": "驅動頻率低時物體跟著動；接近固有頻率時落後 90°、振幅最大；頻率很高時幾乎反相",
    "density-lab": "密度 = 質量 ÷ 體積：比水小的物體浮在水面，比水大的物體沉到底",
    "atmospheric-pressure": "馬德堡半球：球內抽成真空，大氣壓把兩半球緊緊壓住；高山上氣壓較小，比較容易拉開",
    "surface-tension": "表面張力讓水沿著細管往上爬：管徑越細，水面上升越高"
  };


  function scene(cv, config, a, b, time, out) {
    const { ctx, W, H } = cv;
    cv.clear(); D.bg(cv);
    const f = SC[config.id];
    if (f) f({ cv, ctx, W, H, cfg: config, a, b, t: time, v: out, c: accent(), s: clamp(Math.min(W / 800, H / 472), 0.5, 1.7) });
  }

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
