/* 第二批課程實驗：將細分知識點做成可操作的量測台。 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const AP = PL.apparatus;                    // 器材層（各 kind 場景共用）
  const color = () => PL.col("m-color", "#35e0cf");

  function topic(kind, a, b, output, calc) {
    return { kind, a, b, output, calc };
  }
  const T = {
    "apparent-weight": topic("elevator", ["乘客質量 m", 20, 100, 60, "kg"], ["加速度 a", -8, 8, 2, "m/s²"], "體重計讀數 N", (a, b) => a * (9.8 + b)),
    "spring-series-parallel": topic("spring", ["彈簧 k₁", 10, 80, 35, "N/m"], ["彈簧 k₂", 10, 80, 50, "N/m"], "串聯等效勁度", (a, b) => a * b / (a + b)),
    "center-of-mass": topic("momentum", ["左側質量", 1, 10, 3, "kg"], ["右側質量", 1, 10, 7, "kg"], "質心位置", (a, b) => 10 * b / (a + b)),
    "force-time-profile": topic("impulse", ["衝量 J", 5, 80, 30, "N·s"], ["作用時間 Δt", 0.1, 4, 1, "s"], "平均力", (a, b) => a / b),
    "rocket-equation": topic("rocket", ["噴氣速度 vₑ", 500, 5000, 2400, "m/s"], ["質量比 m₀/m_f", 1.1, 8, 3, ""], "速度改變 Δv", (a, b) => a * Math.log(b)),
    "work-angle": topic("work", ["外力 F", 5, 100, 48, "N"], ["夾角 θ", 0, 180, 35, "°"], "單位位移做功", (a, b) => a * Math.cos(b * Math.PI / 180)),
    "power-lab": topic("power", ["做功 W", 100, 3000, 1200, "J"], ["完成時間 t", 1, 30, 8, "s"], "平均功率", (a, b) => a / b),
    "friction-thermal": topic("energy", ["摩擦係數 μ", 0.05, 1, 0.32, ""], ["滑行距離 d", 1, 20, 8, "m"], "轉化熱量 Q", (a, b) => a * 9.8 * b),
    "banked-curve": topic("orbit", ["彎道半徑 r", 20, 200, 85, "m"], ["傾角 θ", 2, 45, 18, "°"], "設計速率", (a, b) => Math.sqrt(a * 9.8 * Math.tan(b * Math.PI / 180))),
    /*
     * 阻尼 β 的上限原本只有 1 s⁻¹，畫面固定的自然頻率 ω₀ ≈ 2.8 rad/s 根本到不了臨界值，
     * 「比較欠阻尼、臨界阻尼與過阻尼」變成只有講義寫得出來、模擬做不出來。
     * 上限放寬到 6 s⁻¹，β 拉過 2.8 就能親眼看到不振盪的兩種歸位方式。
     */
    "damped-oscillation": topic("oscillation", ["初始振幅 A₀", 1, 12, 7, "cm"], ["阻尼 β", 0.05, 6, 0.3, "s⁻¹"], "5 秒後振幅", (a, b) => a * Math.exp(-5 * b)),
    /*
     * 交換（拍）頻率原寫成 √(κ/m)/2π，那是「耦合彈簧自己的自然頻率」，不是能量
     * 一來一回的節奏。畫面採用牆壁彈簧 k = κ 的對稱裝置，兩個正常模態為
     * ω₁ = √(κ/m)、ω₂ = √(3κ/m)，能量完整轉移一次的頻率是模態差
     * (ω₂ − ω₁)/2π = (√3 − 1)√(κ/m)/2π——讀數與畫面的節奏從此一致。
     */
    "coupled-oscillators": topic("oscillation", ["耦合勁度", 1, 30, 12, "N/m"], ["質量 m", 0.2, 5, 1, "kg"], "交換頻率", (a, b) => (Math.sqrt(3) - 1) * Math.sqrt(a / b) / TAU),
    "hydrostatic-pressure": topic("thermal", ["深度 h", 0, 30, 12, "m"], ["液體密度 ρ", 600, 1400, 1000, "kg/m³"], "表壓", (a, b) => a * b * 9.8 / 1000),
    "phase-change": topic("thermal", ["質量 m", 0.1, 4, 1, "kg"], ["加熱功率", 100, 2000, 800, "W"], "熔化時間", (a, b) => a * 334000 / b),
    "reflection-boundary": topic("wave", ["脈衝振幅", 1, 12, 7, "cm"], ["反射端（0 固定／1 自由）", 0, 1, 0, ""], "反射相位", (a, b) => b < 0.5 ? 180 : 0),
    "sound-intensity": topic("wave", ["距離 r", 1, 30, 8, "m"], ["聲源振幅", 1, 10, 5, ""], "相對聲強", (a, b) => b * b / (a * a)),
    "air-column-resonance": topic("wave", ["空氣柱長度 L", 5, 120, 42, "cm"], ["音叉頻率 f", 100, 800, 440, "Hz"], "基頻聲速", (a, b) => 4 * a / 100 * b),
    "critical-angle": topic("optics", ["介質折射率 n₁", 1.1, 2.4, 1.5, ""], ["入射角 θ", 0, 90, 48, "°"], "臨界角", (a) => Math.asin(1 / a) * 180 / Math.PI),
    "refraction-slab": topic("optics", ["玻璃厚度", 1, 30, 12, "mm"], ["入射角 θ", 0, 75, 42, "°"], "側向位移", (a, b) => { const th = b * Math.PI / 180, r = Math.asin(Math.sin(th) / 1.5); return a * Math.sin(th - r) / Math.cos(r); }),
    "optical-instruments": topic("optics", ["物鏡焦距 fₒ", 100, 1600, 800, "mm"], ["目鏡焦距 fₑ", 5, 80, 25, "mm"], "角放大率", (a, b) => a / b),
    "kirchhoff": topic("circuit", ["電源電壓 V", 1, 24, 12, "V"], ["支路電阻 R", 1, 100, 24, "Ω"], "支路電流", (a, b) => a / b),
    "meter-loading": topic("circuit", ["待測電阻 R", 10, 10000, 1200, "Ω"], ["電壓表內阻", 1000, 100000, 10000, "Ω"], "並聯量測誤差", (a, b) => 100 * a / (a + b)),
    "electrostatic-shield": topic("field", ["外加場強 E", 1, 100, 45, "V/m"], ["屏蔽厚度", 1, 12, 5, "mm"], "殼內場強", () => 0),
    "ampere-force": topic("magnetic", ["電流 I", 0.1, 10, 3, "A"], ["夾角 θ", 0, 180, 90, "°"], "相對安培力", (a, b) => a * Math.sin(b * Math.PI / 180)),
    "motional-emf": topic("magnetic", ["導體速度 v", 0.1, 12, 4, "m/s"], ["磁場 B", 0.05, 2, 0.8, "T"], "相對感應電壓", (a, b) => a * b),
    "coil-torque": topic("magnetic", ["線圈電流 I", 0.1, 8, 3, "A"], ["轉角 θ", 0, 180, 70, "°"], "相對力矩", (a, b) => a * Math.sin(b * Math.PI / 180)),
    "blackbody": topic("cosmos", ["表面溫度 T", 2000, 14000, 5800, "K"], ["半徑比例", 0.2, 8, 1, "R☉"], "峰值波長", (a) => 2898000 / a)
  };

  function fillPill(ctx, x, y, label, value, w, tint) {
    D.rect(ctx, x, y, w, 27, { fill: PL.theme.shade(0.72), stroke: tint, width: 1, r: 6 });
    D.text(ctx, label, x + 9, y + 11, { color: PL.col("text-faint"), size: 8.5 });
    D.text(ctx, value, x + 9, y + 22, { color: tint, size: 10.5, weight: "700" });
  }

  /* ---------- 場景共用小工具 ---------- */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fr = (v, r) => clamp((v - r[1]) / Math.max(1e-9, r[2] - r[1]), 0, 1);
  const rad = d => d * Math.PI / 180;
  const isL = () => PL.theme.isLight();
  const noteC = (ctx, col, x, y, w, h) => PL.theme.note(ctx, col, x, y, w, h);
  const mixRgb = (p, q, u) => p.map((v, i) => Math.round(v + (q[i] - v) * clamp(u, 0, 1)));
  const rgb = (c, a) => a == null ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const niceCeil = v => [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100].find(n => n >= v * 1.02) || 100;
  function poly(ctx, pts, fill, stroke) {
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  /* 斜投影：x 向右、y 往畫面深處（右上）、z 向上。回傳把 (x,y,z) 換成畫面座標的函式 */
  const oblique = (ox, oy, sc) => (x, y, z) => ({ x: ox + (x + y * 0.55) * sc, y: oy - (z + y * 0.38) * sc });
  function obBox(ctx, P, x0, x1, y0, y1, z0, z1, top, front, side) {
    poly(ctx, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], top, "rgba(20,24,30,0.45)");
    poly(ctx, [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)], front, "rgba(20,24,30,0.45)");
    poly(ctx, [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], side, "rgba(20,24,30,0.45)");
  }
  /* 木地板（側視）：floorY 以下 */
  function woodFloor(ctx, W, H, floorY) {
    const L = isL();
    const g = ctx.createLinearGradient(0, floorY, 0, H);
    g.addColorStop(0, L ? "#caa27a" : "#4a3626"); g.addColorStop(1, L ? "#b08558" : "#33251a");
    ctx.fillStyle = g; ctx.fillRect(0, floorY, W, H - floorY);
    noteC(ctx, L ? "#c09670" : "#402e20", 0, floorY, W, H - floorY);
    ctx.strokeStyle = L ? "rgba(110,70,36,0.3)" : "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) { const y = Math.round(floorY + (H - floorY) * i * i / 25) + 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = L ? "rgba(255,244,222,0.5)" : "rgba(255,255,255,0.06)"; ctx.fillRect(0, floorY, W, 1.5);
  }

  const SC = {};

  /* 電梯裡的體重計：車廂固定在畫面中，大樓樓層相對往下／往上捲動 */
  SC["apparent-weight"] = k => {
    const { ctx, W, H, a: m, b: acc, t, s, c, v: N } = k;
    const L = isL();
    const floorH = Math.max(64, 112 * s), pxPerM = floorH / 3.2;
    const tau = t % 3, disp = 0.5 * acc * tau * tau * pxPerM;
    const shaftW = Math.min(W * 0.36, 260 * s), sx = W / 2 - shaftW / 2;
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, L ? "#efe9df" : "#1b2230"); g.addColorStop(1, L ? "#e3dbce" : "#141a24");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    noteC(ctx, L ? "#e9e2d7" : "#18202b", 0, 0, W, H);
    g = ctx.createLinearGradient(sx, 0, sx + shaftW, 0);
    g.addColorStop(0, L ? "#a4a8ae" : "#262b33"); g.addColorStop(0.5, L ? "#c4c7cc" : "#343a44"); g.addColorStop(1, L ? "#9aa0a7" : "#22262d");
    ctx.fillStyle = g; ctx.fillRect(sx, 0, shaftW, H);
    noteC(ctx, L ? "#b4b8bd" : "#2e333c", sx, 0, shaftW, H);
    AP.steel(ctx, sx + 7 * s, 0, 5 * s, H, -12); AP.steel(ctx, sx + shaftW - 12 * s, 0, 5 * s, H, -12);
    const cabY = H * 0.8;
    const q0 = Math.floor((disp - (H - cabY)) / floorH) - 1, q1 = Math.ceil((disp + cabY) / floorH) + 1;
    for (let q = q0; q <= q1; q++) {
      const y = cabY + disp - q * floorH;
      if (y < -floorH || y > H + floorH) continue;
      ctx.fillStyle = L ? "#a39b8f" : "#2d333d";
      ctx.fillRect(0, y, sx, 8 * s); ctx.fillRect(sx + shaftW, y, W - sx - shaftW, 8 * s);
      ctx.fillStyle = L ? "rgba(80,80,86,0.3)" : "rgba(0,0,0,0.35)";
      ctx.fillRect(sx + 14 * s, y, shaftW - 28 * s, 5 * s);
      const dh = Math.min(floorH * 0.66, 84 * s), dw = Math.min(40 * s, sx * 0.4), dx = sx - dw - 10 * s;
      AP.steel(ctx, dx - 3 * s, y - dh - 3 * s, dw + 6 * s, 3 * s, 10);
      g = ctx.createLinearGradient(dx, 0, dx + dw, 0);
      g.addColorStop(0, "rgb(170,178,188)"); g.addColorStop(0.5, "rgb(214,220,228)"); g.addColorStop(1, "rgb(160,168,178)");
      ctx.fillStyle = g; ctx.fillRect(dx, y - dh, dw, dh);
      ctx.fillStyle = "rgba(40,48,60,0.6)"; ctx.fillRect(dx + dw / 2 - 0.5, y - dh, 1, dh);
      D.text(ctx, (q + 12) + "F", sx + shaftW + 12 * s, y - 12 * s, { color: L ? "rgba(70,64,56,0.75)" : "rgba(220,226,236,0.6)", size: 12, weight: "700" });
    }
    const cw = shaftW - 32 * s, ch = Math.min(H * 0.64, 250 * s), cx0 = W / 2 - cw / 2, cy0 = cabY - ch;
    ctx.strokeStyle = L ? "rgba(70,74,82,0.9)" : "rgba(150,158,170,0.8)"; ctx.lineWidth = 1.6;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 6 * s, 0); ctx.lineTo(W / 2 + i * 6 * s, cy0 - 8 * s); ctx.stroke(); }
    AP.steel(ctx, W / 2 - 22 * s, cy0 - 10 * s, 44 * s, 10 * s, 6);
    g = ctx.createLinearGradient(cx0, 0, cx0 + cw, 0);
    g.addColorStop(0, "rgb(146,154,166)"); g.addColorStop(0.5, "rgb(206,212,220)"); g.addColorStop(1, "rgb(136,144,156)");
    ctx.fillStyle = g; ctx.fillRect(cx0, cy0, cw, ch);
    const ix = cx0 + 7 * s, iy = cy0 + 7 * s, iw = cw - 14 * s, ih = ch - 14 * s;
    g = ctx.createLinearGradient(0, iy, 0, iy + ih);
    g.addColorStop(0, "rgb(255,249,230)"); g.addColorStop(1, "rgb(230,220,196)");
    ctx.fillStyle = g; ctx.fillRect(ix, iy, iw, ih);
    noteC(ctx, "rgb(245,237,216)", ix, iy, iw, ih);
    ctx.save(); ctx.shadowColor = "rgba(255,240,190,0.9)"; ctx.shadowBlur = 12;
    ctx.fillStyle = "rgb(255,252,236)"; ctx.fillRect(W / 2 - iw * 0.25, iy + 2, iw * 0.5, 4 * s); ctx.restore();
    AP.steel(ctx, ix + 4 * s, iy + ih * 0.56, iw - 8 * s, 3 * s, 20);
    const fy = cabY - 7 * s;
    ctx.fillStyle = "rgb(120,112,100)"; ctx.fillRect(ix, fy - 3 * s, iw, 3 * s);
    const scW = 58 * s, scH = 7 * s;
    ctx.fillStyle = "rgb(238,241,245)"; AP.rrPath(ctx, W / 2 - scW / 2, fy - 3 * s - scH, scW, scH, 2.5 * s); ctx.fill();
    ctx.strokeStyle = "rgba(60,68,80,0.5)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "rgb(30,44,38)"; ctx.fillRect(W / 2 + scW * 0.1, fy - 3 * s - scH + 1.8 * s, scW * 0.3, scH - 3.6 * s);
    const ph = ih * (0.46 + 0.3 * fr(m, k.cfg.a)), feet = fy - 3 * s - scH;
    AP.person(ctx, W / 2 - 6 * s, feet, ph, { shirt: "#3f7fcf", facing: 1 });
    AP.lcd(ctx, ix + 8 * s, iy + 14 * s, Math.min(iw * 0.5, 96 * s), 20 * s, PL.fmt(N, 0) + " N", { color: "rgb(255,150,90)" });
    const kF = 0.07 * s, axx = W / 2 + ph * 0.16 + 8 * s;
    D.arrow(ctx, axx, feet - 1, axx, feet - 1 - clamp(N * kF, 6, 150 * s), { color: c, width: 2.6, label: "N" });
    const by = feet - ph * 0.5;
    D.arrow(ctx, axx + 18 * s, by, axx + 18 * s, by + clamp(m * 9.8 * kF, 6, 110 * s), { color: PL.col("danger"), width: 2.6, label: "mg" });
    const aX = sx + shaftW + 34 * s, aY = H * 0.5;
    if (Math.abs(acc) > 0.05) D.arrow(ctx, aX, aY, aX, aY - acc * 9 * s, { color: PL.col("warn"), width: 3.2, label: "a" });
    else D.text(ctx, "a = 0", aX, aY, { color: PL.col("warn"), size: 12, align: "center", weight: "700" });
    const up = acc > 0.05, dn = acc < -0.05;
    D.text(ctx, up ? "超重：N > mg" : dn ? "失重：N < mg" : "N = mg", W - 18 * s, 66, { color: up ? PL.col("danger") : dn ? PL.col("accent-2") : c, size: 12.5, align: "right", weight: "700" });
    fillPill(ctx, W - 148, 20, "體重計讀數", PL.fmt(N, 0) + " N", 128, c);
  };

  /* 彈簧串聯與並聯：兩座鐵架各吊同一個 200 g 砝碼 */
  SC["spring-series-parallel"] = k => {
    const { ctx, W, H, a: k1, b: k2, t, s, c, v: kS } = k;
    const benchY = H - 24 * s;
    AP.labRoom(ctx, W, H, benchY, {});
    const F = 2, L0 = 40 * s, topY = 62 * s;
    const pxPerM = Math.max(200 * s, (benchY - 18 * s - topY - 2 * L0 - 6 * s - 32 * s) / 0.4);
    const wob = 1 + 0.025 * Math.sin(t * 3.4);
    const col1 = "#3f86d6", col2 = "#e0843a";
    const R1 = (5 + 4 * fr(k1, k.cfg.a)) * s, R2 = (5 + 4 * fr(k2, k.cfg.b)) * s;
    const xS = W * 0.34, xP = W * 0.72;
    [xS, xP].forEach(x => { AP.standRod(ctx, x - 80 * s, benchY, topY - 28 * s); AP.crossArm(ctx, x - 80 * s, topY - 16 * s, x); });
    const pale = PL.theme.pale(0.7);
    // 串聯
    const e1 = F / k1 * pxPerM * wob, e2 = F / k2 * pxPerM * wob;
    let y = topY - 8 * s;
    D.spring(ctx, xS, y, xS, y + L0 + e1, 9, R1, col1); y += L0 + e1;
    ctx.strokeStyle = "rgb(150,160,176)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(xS, y + 3 * s, 3.5 * s, 0, PL.TAU); ctx.stroke();
    y += 6 * s;
    D.spring(ctx, xS, y, xS, y + L0 + e2, 9, R2, col2); y += L0 + e2;
    AP.weight(ctx, xS, y + 6 * s, 30 * s, 24 * s, "200g");
    const natS = topY - 8 * s + 2 * L0 + 6 * s;
    AP.ruler(ctx, xS + 30 * s, topY - 8 * s, benchY - 14 * s, pxPerM / 100);
    D.line(ctx, xS - 24 * s, natS, xS + 28 * s, natS, pale, 1, [4, 3]);
    D.text(ctx, "原長", xS - 26 * s, natS + 4, { color: pale, size: 9.5, align: "right" });
    D.text(ctx, "x = " + PL.fmt((e1 + e2) / wob / pxPerM * 100, 1) + " cm", xS + 56 * s, y - 4 * s, { color: c, size: 11, weight: "700" });
    D.text(ctx, "k₁", xS - R1 - 14 * s, topY + (L0 + e1) / 2, { color: col1, size: 11, weight: "700" });
    D.text(ctx, "k₂", xS - R2 - 14 * s, topY + L0 + e1 + (L0 + e2) / 2, { color: col2, size: 11, weight: "700" });
    // 並聯
    const eP = F / (k1 + k2) * pxPerM * wob;
    AP.steel(ctx, xP - 28 * s, topY - 6 * s, 56 * s, 6 * s, 8);
    D.spring(ctx, xP - 16 * s, topY, xP - 16 * s, topY + L0 + eP, 9, R1, col1);
    D.spring(ctx, xP + 16 * s, topY, xP + 16 * s, topY + L0 + eP, 9, R2, col2);
    AP.steel(ctx, xP - 26 * s, topY + L0 + eP, 52 * s, 5 * s, 6);
    AP.weight(ctx, xP, topY + L0 + eP + 12 * s, 30 * s, 24 * s, "200g");
    AP.ruler(ctx, xP + 36 * s, topY - 6 * s, Math.min(benchY - 14 * s, topY + L0 + 0.2 * pxPerM + 50 * s), pxPerM / 100);
    D.line(ctx, xP - 30 * s, topY + L0, xP + 34 * s, topY + L0, pale, 1, [4, 3]);
    D.text(ctx, "x = " + PL.fmt(eP / wob / pxPerM * 100, 1) + " cm", xP + 62 * s, topY + L0 + eP + 4 * s, { color: c, size: 11, weight: "700" });
    D.text(ctx, "串聯：k = k₁k₂ / (k₁ + k₂)", xS, 34 * s, { color: PL.col("text"), size: 11.5, align: "center", weight: "700" });
    D.text(ctx, "並聯：k = k₁ + k₂", xP, 34 * s, { color: PL.col("text"), size: 11.5, align: "center", weight: "700" });
    fillPill(ctx, 18, H - 24 * s - 40, "串聯等效勁度", PL.fmt(kS, 2) + " N/m", 124, c);
  };

  /* 質心：把支點放在質心，木尺就會水平平衡 */
  SC["center-of-mass"] = k => {
    const { ctx, W, H, a: m1, b: m2, t, s, c, v: xc } = k;
    const benchY = H * 0.82;
    AP.labRoom(ctx, W, H, benchY, {});
    const Lp = Math.min(W * 0.72, 600 * s), x0 = W / 2 - Lp / 2;
    const kh = 54 * s, plankH = 12 * s, plankY = benchY - 6 - kh - plankH;
    const xf = x0 + xc / 10 * Lp;
    AP.knifeEdge(ctx, xf, benchY - 6 - kh, kh, 46 * s);
    const g = ctx.createLinearGradient(0, plankY, 0, plankY + plankH);
    g.addColorStop(0, "rgb(246,222,150)"); g.addColorStop(1, "rgb(204,168,92)");
    ctx.fillStyle = g; ctx.fillRect(x0 - 10 * s, plankY, Lp + 20 * s, plankH);
    ctx.strokeStyle = "rgba(110,80,30,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(x0 - 10 * s, plankY, Lp + 20 * s, plankH);
    ctx.save(); ctx.font = Math.max(7, 8 * s) + "px system-ui,sans-serif"; ctx.textAlign = "center";
    for (let i = 0; i <= 20; i++) {
      const x = Math.round(x0 + i / 20 * Lp) + 0.5;
      ctx.strokeStyle = "rgba(60,44,16,0.8)"; ctx.beginPath(); ctx.moveTo(x, plankY); ctx.lineTo(x, plankY + (i % 2 ? 3 : 6) * s); ctx.stroke();
      if (i % 2 === 0 && i > 0 && i < 20) { ctx.fillStyle = "rgba(60,44,16,0.9)"; ctx.fillText(String(i / 2), x, plankY + plankH - 1.5 * s); }
    }
    ctx.restore();
    const side = m => (16 + 30 * Math.sqrt(m / 10)) * s;
    AP.massBlock(ctx, x0, plankY, side(m1), side(m1), { color: "#d0643a", label: PL.fmt(m1, 1) + "kg" });
    AP.massBlock(ctx, x0 + Lp, plankY, side(m2), side(m2), { color: "#3f7fcf", label: PL.fmt(m2, 1) + "kg" });
    // 質心記號（黑白象限圓）
    const r = 7 * s, my = plankY + plankH / 2;
    [0, 1, 2, 3].forEach(q => { ctx.fillStyle = q % 2 ? "#1d232c" : "#f4f4f0"; ctx.beginPath(); ctx.moveTo(xf, my); ctx.arc(xf, my, r, q * Math.PI / 2, (q + 1) * Math.PI / 2); ctx.closePath(); ctx.fill(); });
    ctx.strokeStyle = "#1d232c"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(xf, my, r, 0, PL.TAU); ctx.stroke();
    // 重力箭頭與力臂
    D.arrow(ctx, x0, plankY - side(m1) / 2, x0, plankY - side(m1) / 2 + 40 * s + m1 * 5 * s, { color: PL.col("danger"), width: 2.2 });
    D.arrow(ctx, x0 + Lp, plankY - side(m2) / 2, x0 + Lp, plankY - side(m2) / 2 + 40 * s + m2 * 5 * s, { color: PL.col("danger"), width: 2.2 });
    const yb = benchY + 18 * s;
    D.arrow(ctx, xf, yb, x0, yb, { color: "#d0643a", width: 2 });
    D.arrow(ctx, xf, yb, x0 + Lp, yb, { color: "#3f7fcf", width: 2 });
    D.text(ctx, "d₁ = " + PL.fmt(xc, 2) + " m", (x0 + xf) / 2, yb + 16 * s, { color: "#d0643a", size: 11, align: "center", weight: "700" });
    D.text(ctx, "d₂ = " + PL.fmt(10 - xc, 2) + " m", (xf + x0 + Lp) / 2, yb + 16 * s, { color: "#3f7fcf", size: 11, align: "center", weight: "700" });
    D.text(ctx, "質心", xf, plankY - 12 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    D.text(ctx, "m₁d₁ = m₂d₂ → 平衡", W / 2, 40 * s, { color: c, size: 12.5, align: "center", weight: "700" });
    fillPill(ctx, 18, 18, "質心位置（距左端）", PL.fmt(xc, 2) + " m", 132, c);
  };

  /* 力感測器與 F–t 圖：小車撞上感測器前端的緩衝器 */
  SC["force-time-profile"] = k => {
    const { ctx, W, H, a: J, b: dt, t, s, c, v: Favg } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const lw = Math.min(W * 0.44, 370 * s), lh = Math.min(H * 0.6, 260 * s);
    const scr = AP.laptop(ctx, 20 * s, benchY - lh - 2, lw, lh);
    const gx0 = scr.x + 34 * s, gx1 = scr.x + scr.w - 12 * s, gy0 = scr.y + 22 * s, gy1 = scr.y + scr.h - 20 * s;
    const T0 = 4.5, F0 = 200, X = tt => gx0 + tt / T0 * (gx1 - gx0), Y = f => gy1 - Math.min(f, F0 * 1.06) / F0 * (gy1 - gy0);
    ctx.save();
    ctx.strokeStyle = "rgba(190,205,225,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy0 - 6); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    ctx.strokeStyle = "rgba(190,205,225,0.12)";
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(X(i), gy0); ctx.lineTo(X(i), gy1); ctx.stroke(); }
    [100, 200].forEach(f => { ctx.beginPath(); ctx.moveTo(gx0, Y(f)); ctx.lineTo(gx1, Y(f)); ctx.stroke(); });
    ctx.fillStyle = "rgba(200,214,232,0.8)"; ctx.font = Math.max(7, 8.5 * s) + "px system-ui,sans-serif"; ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) ctx.fillText(i + "", X(i), gy1 + 11 * s);
    ctx.textAlign = "right"; [0, 100, 200].forEach(f => ctx.fillText(f + "", gx0 - 4, Y(f) + 3));
    ctx.textAlign = "left"; ctx.fillText("F (N)", scr.x + 6, gy0 - 8 * s); ctx.textAlign = "right"; ctx.fillText("t (s)", gx1, gy1 - 4);
    const cv0 = 0.35 + dt * 0.5, P = 1.2 + cv0 + 1.2 + 0.5, tau = t % P;
    const inC = tau > 1.2 && tau < 1.2 + cv0, done = tau >= 1.2 + cv0;
    const tc = inC ? (tau - 1.2) / cv0 * dt : done ? dt : 0;
    const Fpk = Math.PI * J / (2 * dt);
    if (tc === 0) {
      ctx.strokeStyle = "rgba(110,226,255,0.3)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const tt = dt * i / 60, yy = Y(Fpk * Math.sin(Math.PI * tt / dt)); i ? ctx.lineTo(X(tt), yy) : ctx.moveTo(X(tt), yy); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (tc > 0) {
      ctx.beginPath(); ctx.moveTo(X(0), gy1);
      for (let i = 0; i <= 60; i++) { const tt = tc * i / 60; ctx.lineTo(X(tt), Y(Fpk * Math.sin(Math.PI * tt / dt))); }
      ctx.lineTo(X(tc), gy1); ctx.closePath();
      ctx.fillStyle = "rgba(90,220,255,0.22)"; ctx.fill();
      ctx.strokeStyle = "rgb(110,226,255)"; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const tt = tc * i / 60, yy = Y(Fpk * Math.sin(Math.PI * tt / dt)); i ? ctx.lineTo(X(tt), yy) : ctx.moveTo(X(tt), yy); }
      ctx.stroke();
    }
    if (done) {
      ctx.strokeStyle = "rgb(255,200,90)"; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(X(0), Y(Favg)); ctx.lineTo(X(dt), Y(Favg)); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    if (done) {
      D.text(ctx, "平均力 " + PL.fmt(Favg, 1) + " N", Math.min(X(dt) + 6, gx1 - 70 * s), Math.max(gy0 + 10, Y(Favg) - 5), { color: "rgb(255,210,110)", size: 10 });
      D.text(ctx, "面積 = 衝量 J = " + PL.fmt(J, 0) + " N·s", (gx0 + gx1) / 2 + 20 * s, gy0 + 4 * s, { color: "rgb(130,226,255)", size: 10.5, align: "center", weight: "700" });
      if (Fpk > F0) D.text(ctx, "↑ 峰值 " + PL.fmt(Fpk, 0) + " N", X(dt / 2) + 8, gy0 + 20 * s, { color: "rgb(255,150,120)", size: 10, weight: "700" });
    }
    // 軌道、感測器與小車
    const xT0 = 20 * s + lw + 34 * s, xT1 = W - 18 * s, railY = benchY - 9 * s;
    AP.steel(ctx, xT0, railY, xT1 - xT0, 7 * s, 2);
    const senW = 34 * s, senH = 44 * s, senX = xT1 - senW - 4 * s;
    ctx.fillStyle = "rgb(52,58,68)"; AP.rrPath(ctx, senX, railY - senH, senW, senH, 4 * s); ctx.fill();
    ctx.fillStyle = "rgb(236,186,40)"; ctx.fillRect(senX + 4 * s, railY - senH + 5 * s, senW - 8 * s, 7 * s);
    AP.cable(ctx, [{ x: senX + senW / 2, y: railY - senH }, { x: senX + senW / 2, y: railY - senH - 18 * s }, { x: xT0 + 20 * s, y: railY - senH - 30 * s }, { x: scr.x + scr.w + 12 * s, y: benchY - 12 * s }], "rgb(40,44,52)", 2.4, 6);
    const soft = dt >= 0.5, Ls = soft ? (18 + 40 * fr(dt, k.cfg.b)) * s : 7 * s;
    const comp = inC ? Math.sin(Math.PI * (tau - 1.2) / cv0) * Ls * (soft ? 0.55 : 0.35) : 0;
    const by = railY - 20 * s;
    AP.steel(ctx, senX - 6 * s, by - 6 * s, 6 * s, 12 * s, 10);
    if (soft) D.spring(ctx, senX - 6 * s, by, senX - 6 * s - Ls + comp, by, 7, 7 * s, "#9aa6b6");
    else { ctx.fillStyle = "rgb(36,36,40)"; AP.rrPath(ctx, senX - 6 * s - Ls + comp, by - 7 * s, Ls, 14 * s, 3 * s); ctx.fill(); }
    const cwd = 60 * s, xC = senX - 6 * s - Ls - cwd / 2 - 3 * s, xSt = xT0 + cwd / 2 + 6 * s;
    let x = tau < 1.2 ? xSt + (xC - xSt) * (tau / 1.2) : inC ? xC + comp : xC - (xC - xSt) * clamp((tau - 1.2 - cv0) / 1.2, 0, 1);
    AP.cart(ctx, x, railY, cwd, 24 * s);
    D.text(ctx, soft ? "彈簧緩衝：接觸時間長" : "硬碰硬：接觸時間短", (xT0 + xT1) / 2, railY - senH - 44 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    if (tc === 0) D.text(ctx, "虛線：上一次的紀錄", gx1 - 4, gy0 + 16 * s, { color: "rgba(160,220,240,0.8)", size: 9.5, align: "right" });
    fillPill(ctx, 18, 18, "平均力 F = J/Δt", PL.fmt(Favg, 1) + " N", 124, c);
  };

  /* 火箭方程式：燃料邊燒邊噴，燒完時的速度就是 Δv */
  SC["rocket-equation"] = k => {
    const { ctx, W, H, a: ve, b: ratio, t, s, c, v: dv } = k;
    const cyc = 7.5, tau = t % cyc, t0 = 1, burn = 4;
    const fuel0 = 1 - 1 / ratio, u = clamp((tau - t0) / burn, 0, 1), on = tau > t0 && tau < t0 + burn;
    const vAt = uu => ve * Math.log(1 / (1 - fuel0 * uu));
    let alt = 0;
    for (let i = 0; i < 16; i++) alt += vAt((i + 0.5) / 16 * u) * burn * u / 16;
    if (tau > t0 + burn) alt += vAt(1) * (tau - t0 - burn);
    const vNow = vAt(u);
    const gy = H * 0.88, hr = Math.min(H * 0.5, 230 * s), wr = hr * 0.17, padX = W * 0.5;
    const baseY = gy - 16 * s, rocketBase = baseY - alt * 0.04 * s;
    const shift = Math.max(0, H * 0.42 - (rocketBase - hr * 0.5));
    AP.outdoor(ctx, W, H, gy + shift, { t, hills: true, sunX: W * 0.84 });
    // 發射塔與發射台
    const tx = padX - wr - 34 * s, tTop = gy + shift - hr * 1.12;
    if (tTop < H) {
      AP.steel(ctx, tx - 7 * s, tTop, 14 * s, gy + shift - tTop, -8);
      ctx.strokeStyle = "rgba(90,98,110,0.9)"; ctx.lineWidth = 1.4;
      for (let yy = tTop + 10 * s; yy < gy + shift - 6; yy += 18 * s) { ctx.beginPath(); ctx.moveTo(tx - 7 * s, yy); ctx.lineTo(tx + 7 * s, yy + 12 * s); ctx.stroke(); }
      AP.steel(ctx, tx, tTop + hr * 0.3, padX - wr / 2 - tx, 5 * s, 10);
      ctx.fillStyle = isL() ? "#9a9ea6" : "#3a3e46"; ctx.fillRect(padX - 70 * s, gy + shift - 14 * s, 140 * s, 14 * s);
    }
    if (on && alt * 0.04 * s < 120 * s) AP.smokePuff(ctx, padX, gy + shift - 10 * s, ((tau - t0) % 1.4), { scale: 1.8 * s, dir: Math.PI / 2, seed: 9, life: 1.4 });
    // 火箭
    const ry = rocketBase + shift, bodyTop = ry - hr * 0.8;
    if (on) {
      const fl = (26 + 84 * fr(ve, k.cfg.a)) * s * (0.9 + 0.1 * Math.sin(t * 40));
      const fg = ctx.createLinearGradient(0, ry, 0, ry + fl);
      fg.addColorStop(0, "rgba(255,250,220,0.95)"); fg.addColorStop(0.35, "rgba(255,180,60,0.9)"); fg.addColorStop(1, "rgba(255,90,20,0)");
      ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(padX - wr * 0.34, ry + 4 * s); ctx.quadraticCurveTo(padX, ry + fl * 1.1, padX + wr * 0.34, ry + 4 * s); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = "rgb(60,64,72)"; ctx.beginPath(); ctx.moveTo(padX - wr * 0.3, ry); ctx.lineTo(padX + wr * 0.3, ry); ctx.lineTo(padX + wr * 0.38, ry + 7 * s); ctx.lineTo(padX - wr * 0.38, ry + 7 * s); ctx.closePath(); ctx.fill();
    let g = ctx.createLinearGradient(padX - wr / 2, 0, padX + wr / 2, 0);
    g.addColorStop(0, "rgb(190,196,206)"); g.addColorStop(0.35, "rgb(250,251,252)"); g.addColorStop(1, "rgb(170,176,188)");
    ctx.fillStyle = g; ctx.fillRect(padX - wr / 2, bodyTop, wr, ry - bodyTop);
    ctx.fillStyle = "rgb(214,60,52)";
    ctx.beginPath(); ctx.moveTo(padX - wr / 2, bodyTop); ctx.quadraticCurveTo(padX - wr * 0.45, ry - hr * 0.94, padX, ry - hr); ctx.quadraticCurveTo(padX + wr * 0.45, ry - hr * 0.94, padX + wr / 2, bodyTop); ctx.closePath(); ctx.fill();
    [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(padX + sd * wr / 2, ry - hr * 0.2); ctx.lineTo(padX + sd * wr * 1.05, ry + 2 * s); ctx.lineTo(padX + sd * wr / 2, ry); ctx.closePath(); ctx.fill(); });
    // 剖面窗：看得到燃料量
    const wy0 = bodyTop + hr * 0.1, wy1 = ry - hr * 0.1, ww = wr * 0.42;
    ctx.fillStyle = "rgb(30,36,46)"; ctx.fillRect(padX - ww / 2, wy0, ww, wy1 - wy0);
    const fuel = fuel0 * (1 - u), fh = (wy1 - wy0 - 4) * fuel;
    const fgd = ctx.createLinearGradient(0, wy1 - fh, 0, wy1);
    fgd.addColorStop(0, "rgb(255,196,90)"); fgd.addColorStop(1, "rgb(226,120,40)");
    ctx.fillStyle = fgd; ctx.fillRect(padX - ww / 2 + 2, wy1 - 2 - fh, ww - 4, fh);
    noteC(ctx, "rgb(30,36,46)", padX - ww / 2, wy0, ww, wy1 - wy0 - fh);
    D.text(ctx, "燃料", padX + wr / 2 + 6 * s, (wy0 + wy1) / 2, { color: PL.col("text-dim"), size: 10 });
    AP.lcd(ctx, W - 176 * s, 20, 158 * s, 24 * s, "v = " + PL.fmt(vNow, 0) + " m/s", { color: "rgb(120,236,255)" });
    AP.lcd(ctx, W - 176 * s, 50, 158 * s, 20 * s, "m/m₀ = " + PL.fmt(1 - fuel0 * u, 2), { color: "rgb(255,200,110)", size: 12 * s });
    D.text(ctx, tau < t0 ? "倒數點火…" : on ? "燃燒中：邊噴邊加速" : "燃料用完：速度 = Δv", W - 18 * s, 90 + 4 * s, { color: PL.col("text"), size: 11, align: "right", weight: "700" });
    fillPill(ctx, 18, 18, "燒完時的 Δv", PL.fmt(dv, 0) + " m/s", 124, c);
  };

  /* 拉力做功：木箱前進 1 m，只有沿位移方向的分力做功 */
  SC["work-angle"] = k => {
    const { ctx, W, H, a: F, b: th, t, s, c, v: Wv } = k;
    const floorY = H * 0.74;
    AP.labRoom(ctx, W, H, floorY, { bench: "none" });
    woodFloor(ctx, W, H, floorY);
    const dPx = Math.min(W * 0.34, 250 * s), x0 = W * 0.26, cw = 72 * s, chh = 56 * s;
    [x0, x0 + dPx].forEach((x, i) => {
      ctx.fillStyle = "rgba(246,200,60,0.9)"; ctx.fillRect(x - 2 * s, floorY + 2, 4 * s, 16 * s);
      D.text(ctx, i ? "1 m" : "起點", x, floorY + 32 * s, { color: PL.col("text-dim"), size: 10, align: "center" });
    });
    const tau = t % 3.4, u = clamp(tau / 2.6, 0, 1), bx = x0 + u * dPx;
    AP.crate(ctx, bx, floorY, cw, chh, {});
    const thr = rad(th), front = th <= 90;
    const ax = bx + (front ? cw / 2 : -cw / 2), ay = floorY - chh * 0.6;
    const dxr = Math.cos(thr), dyr = -Math.sin(thr), mg = 22 * s;
    const tX = dxr > 1e-3 ? (W - mg - ax) / dxr : dxr < -1e-3 ? (mg - ax) / dxr : 1e9, tY = dyr < -1e-3 ? (ay - mg) / -dyr : 1e9;
    const Lr = Math.max(90 * s, Math.min(tX, tY)), hx = ax + Lr * dxr, hy = ay + Lr * dyr;
    AP.rope(ctx, ax, ay, hx, hy, 3 * s, "#c8a46a");
    if (front) AP.hand(ctx, hx, hy, -1, 0.85 * s, { pull: true, ang: -thr, sleeve: "#d0643a" });
    else AP.hand(ctx, hx, hy, 1, 0.85 * s, { pull: true, ang: Math.PI - thr, sleeve: "#d0643a" });
    const fl = F * 1.2 * s, fx = fl * Math.cos(thr), fy = fl * Math.sin(thr);
    D.arrow(ctx, ax, ay, ax + fx, ay - fy, { color: PL.col("danger"), width: 3, label: "F" });
    if (Math.abs(fx) > 4) D.arrow(ctx, ax, ay, ax + fx, ay, { color: PL.col("accent-2"), width: 2.4, label: "F cosθ", lsize: 10.5, ly: 14 });
    D.line(ctx, ax + fx, ay, ax + fx, ay - fy, PL.col("warn"), 1.2, [4, 4]);
    ctx.save(); ctx.strokeStyle = PL.col("warn"); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(ax, ay, 26 * s, -thr, 0); ctx.stroke(); ctx.restore();
    D.text(ctx, "θ = " + PL.fmt(th, 0) + "°", ax + 30 * s * Math.cos(thr / 2) + 4, ay - 30 * s * Math.sin(thr / 2), { color: PL.col("warn"), size: 10.5 });
    D.arrow(ctx, x0, floorY + 48 * s, x0 + dPx, floorY + 48 * s, { color: "#1f8a50", width: 2.8, label: "位移 d = 1 m", lsize: 11 });
    const neg = Wv < -0.05;
    D.text(ctx, "W = F cosθ · d = " + PL.fmt(Wv, 1) + " J", W - 18 * s, 44 * s, { color: neg ? PL.col("danger") : c, size: 13, align: "right", weight: "700" });
    if (th > 90.5) D.text(ctx, "拉力有往後的分量：對木箱做負功", W - 18 * s, 64 * s, { color: PL.col("danger"), size: 10.5, align: "right" });
    else if (Math.abs(th - 90) < 0.6) D.text(ctx, "拉力與位移垂直：不做功", W - 18 * s, 64 * s, { color: PL.col("text-dim"), size: 10.5, align: "right" });
    fillPill(ctx, 18, 18, "每公尺做功", PL.fmt(Wv, 1) + " J", 118, c);
  };

  /* 捲揚機吊重物：同樣的功，時間越短功率越大 */
  SC["power-lab"] = k => {
    const { ctx, W, H, a: Wk, b: T, t, s, c, v: P } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const m = Wk / (9.8 * 3);
    const sxr = W * 0.64, topY = H * 0.1, pr = 15 * s;
    AP.standRod(ctx, sxr, benchY, topY);
    AP.crossArm(ctx, sxr, topY + 14 * s, sxr + 84 * s);
    const px = sxr + 84 * s, py = topY + 14 * s + pr + 8 * s;
    AP.cord(ctx, px, topY + 20 * s, px, py);
    const mx = W * 0.3, mw = 108 * s, mh = 62 * s, drX = mx + mw / 2 + 4 * s, drY = benchY - mh * 0.62, drR = 13 * s;
    const bg = ctx.createLinearGradient(0, benchY - mh, 0, benchY);
    bg.addColorStop(0, "rgb(84,120,170)"); bg.addColorStop(1, "rgb(44,70,112)");
    AP.contactShadow(ctx, mx, benchY + 2, mw * 0.6);
    ctx.fillStyle = bg; AP.rrPath(ctx, mx - mw / 2, benchY - mh, mw, mh, 6 * s); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.14)"; for (let i = 0; i < 5; i++) ctx.fillRect(mx - mw / 2 + 8 * s, benchY - mh + 30 * s + i * 5 * s, 30 * s, 2 * s);
    AP.lcd(ctx, mx - mw / 2 + 8 * s, benchY - mh + 7 * s, mw - 16 * s, 18 * s, PL.fmt(P, 0) + " W", { color: "rgb(255,180,90)" });
    const cyc = T + 1.4, tau = t % cyc, u = clamp(tau / T, 0, 1);
    const bw = (24 + 38 * Math.sqrt(m / 102)) * s, bh = bw * 0.78;
    const liftTop = py + pr + 26 * s, liftBot = benchY - 2;
    const loadTop = (liftBot - bh) - ((liftBot - bh) - liftTop) * u;
    // 捲筒（轉動條紋）
    const spin = u * ((liftBot - liftTop) / drR);
    ctx.fillStyle = "rgb(150,158,170)"; ctx.beginPath(); ctx.arc(drX, drY, drR, 0, PL.TAU); ctx.fill();
    ctx.strokeStyle = "rgba(40,46,56,0.8)"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { const a = spin + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(drX, drY); ctx.lineTo(drX + Math.cos(a) * drR, drY + Math.sin(a) * drR); ctx.stroke(); }
    AP.brassDisc(ctx, drX, drY, 4 * s);
    AP.cord(ctx, drX, drY - drR, px - pr, py);
    AP.pulley(ctx, px, py, pr);
    AP.cord(ctx, px + pr, py, px + pr, loadTop - 6 * s);
    AP.weight(ctx, px + pr, loadTop, bw, bh, PL.fmt(m, 0) + " kg");
    const hx = px + pr + bw / 2 + 24 * s;
    D.arrow(ctx, hx, liftBot, hx, liftTop + bh, { color: c, width: 2, label: "h = 3 m", lsize: 10.5 });
    AP.lcd(ctx, W - 132 * s, 20, 114 * s, 24 * s, PL.fmt(Math.min(tau, T), 1) + " s", { color: "rgb(130,240,170)" });
    D.text(ctx, "計時", W - 138 * s, 36, { color: PL.col("text-dim"), size: 10, align: "right" });
    D.text(ctx, "W = mgh = " + PL.fmt(Wk, 0) + " J", mx, benchY - mh - 12 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    fillPill(ctx, 18, 18, "平均功率 P = W/t", PL.fmt(P, 1) + " W", 126, c);
  };

  /* 摩擦生熱：木塊在不同表面上滑行後停下 */
  SC["friction-thermal"] = k => {
    const { ctx, W, H, a: mu, b: d, t, s, c, v: Q } = k;
    const benchY = H * 0.7;
    AP.labRoom(ctx, W, H, benchY, {});
    const x0 = 44 * s, x1 = W - 30 * s, pxPerM = (x1 - x0 - 60 * s) / 20, sy = benchY - 9 * s;
    const mat = mu < 0.15 ? "ice" : mu < 0.45 ? "wood" : mu < 0.75 ? "rubber" : "sand";
    const names = { ice: "打蠟冰面", wood: "木板", rubber: "橡膠墊", sand: "砂紙" };
    const cols = { ice: ["#dff3fb", "#a8d8ee"], wood: ["#d9b27c", "#b88a52"], rubber: ["#555a62", "#34383e"], sand: ["#c89c64", "#9c7442"] };
    const g = ctx.createLinearGradient(0, sy, 0, benchY);
    g.addColorStop(0, cols[mat][0]); g.addColorStop(1, cols[mat][1]);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(x0, benchY - 1, x1 - x0, 2);
    ctx.fillStyle = g; ctx.fillRect(x0, sy, x1 - x0, 9 * s);
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1; ctx.strokeRect(x0 + 0.5, sy + 0.5, x1 - x0 - 1, 9 * s - 1);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, sy, x1 - x0, 9 * s); ctx.clip();
    if (mat === "ice") { ctx.fillStyle = "rgba(255,255,255,0.8)"; for (let x = x0 + 10; x < x1; x += 46 * s) ctx.fillRect(x, sy + 1, 18 * s, 1.2); }
    else if (mat === "sand" || mat === "rubber") { ctx.fillStyle = mat === "sand" ? "rgba(60,40,20,0.45)" : "rgba(255,255,255,0.12)"; for (let i = 0; i < (x1 - x0) / 3; i++) ctx.fillRect(x0 + ((i * 37) % (x1 - x0)), sy + ((i * 7) % 5) * s, 1.4, 1.4); }
    else { ctx.strokeStyle = "rgba(110,70,30,0.4)"; for (let x = x0; x < x1; x += 70 * s) { ctx.beginPath(); ctx.moveTo(x, sy + 3 * s); ctx.lineTo(x + 40 * s, sy + 2.5 * s); ctx.stroke(); } }
    ctx.restore();
    for (let mm = 0; mm <= 20; mm += 5) {
      const x = x0 + 30 * s + mm * pxPerM;
      D.line(ctx, x, benchY + 4 * s, x, benchY + 12 * s, PL.theme.pale(0.6), 1.2);
      D.text(ctx, mm + " m", x, benchY + 24 * s, { color: PL.theme.pale(0.75), size: 9.5, align: "center" });
    }
    const tau = t % 3.6, u = clamp(tau / 2.3, 0, 1), dist = d * (1 - (1 - u) * (1 - u));
    const xs = x0 + 30 * s, bx = xs + dist * pxPerM, bw = 70 * s, bh = 44 * s;
    if (bx > xs + 2) {
      const tg = ctx.createLinearGradient(xs, 0, bx, 0);
      tg.addColorStop(0, `rgba(255,110,30,${(0.08 + 0.25 * mu).toFixed(2)})`); tg.addColorStop(1, `rgba(255,150,50,${(0.3 + 0.65 * mu).toFixed(2)})`);
      ctx.save(); ctx.shadowColor = "rgba(255,120,40,0.8)"; ctx.shadowBlur = 8 * mu;
      ctx.fillStyle = tg; ctx.fillRect(xs, sy - 2 * s, bx - xs, 5 * s); ctx.restore();
    }
    AP.woodBlock(ctx, bx, sy, bw, bh, 0);
    if (u < 0.1) AP.hand(ctx, bx - bw / 2 - 2, sy - bh / 2, 1, 0.8 * s, {});
    AP.heatWaves(ctx, bx - bw / 2, sy - bh, bw, 50 * s, t, mu * (u < 1 ? 1 : 0.35));
    if (u >= 1) {
      D.arrow(ctx, xs, sy - bh - 26 * s, bx, sy - bh - 26 * s, { color: "#1f8a50", width: 2.4, label: "d = " + PL.fmt(d, 1) + " m", lsize: 11 });
    }
    D.text(ctx, "表面：" + names[mat] + "（μ = " + PL.fmt(mu, 2) + "）", x0, sy - 70 * s - 30, { color: PL.col("text"), size: 12.5, weight: "700" });
    AP.lcd(ctx, W - 150 * s, 20, 132 * s, 26 * s, "Q = " + PL.fmt(Q, 1) + " J", { color: "rgb(255,160,90)" });
    D.text(ctx, "摩擦生熱", W - 156 * s, 38, { color: PL.col("text-dim"), size: 10, align: "right" });
    fillPill(ctx, 18, 18, "轉化熱量 Q = μmgd", PL.fmt(Q, 1) + " J", 136, c);
  };

  /* 傾斜彎道：左邊俯視圓形跑道、右邊從車尾看的剖面與受力 */
  SC["banked-curve"] = k => {
    const { ctx, W, H, a: r, b: th, t, s, c, v } = k;
    const gy = H * 0.86;
    AP.outdoor(ctx, W, H, gy, { t, hills: true, sunX: W * 0.94 });
    const ms = Math.min(H - 60 * s, W * 0.44), mx0 = 16 * s, my0 = (H - ms) / 2 + 12 * s;
    const L = isL();
    const gg = ctx.createLinearGradient(mx0, my0, mx0 + ms, my0 + ms);
    gg.addColorStop(0, L ? "#8cc46a" : "#2a4a2e"); gg.addColorStop(1, L ? "#6fae52" : "#1d3822");
    ctx.save(); ctx.fillStyle = "rgba(0,0,0,0.18)"; AP.rrPath(ctx, mx0 + 3, my0 + 4, ms, ms, 10); ctx.fill(); ctx.restore();
    AP.rrPath(ctx, mx0, my0, ms, ms, 10); ctx.fillStyle = gg; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2; ctx.stroke();
    noteC(ctx, L ? "#7eb95e" : "#244228", mx0, my0, ms, ms);
    const cx = mx0 + ms / 2, cy = my0 + ms / 2, R = ms * (0.18 + 0.25 * fr(r, k.cfg.a));
    ctx.strokeStyle = L ? "#6d737c" : "#4b5059"; ctx.lineWidth = 20 * s; ctx.beginPath(); ctx.arc(cx, cy, R, 0, PL.TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.4; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(cx, cy, R, 0, PL.TAU); ctx.stroke(); ctx.setLineDash([]);
    const ph = t * 4 * v / r;
    ctx.save(); ctx.translate(cx + R * Math.cos(ph), cy + R * Math.sin(ph)); ctx.rotate(ph + Math.PI / 2);
    AP.carTop(ctx, 0, 0, 24 * s, "#e0473c"); ctx.restore();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, PL.TAU); ctx.fill();
    D.line(ctx, cx, cy, cx + R * Math.cos(ph), cy + R * Math.sin(ph), "rgba(255,255,255,0.75)", 1, [3, 3]);
    D.text(ctx, "r = " + PL.fmt(r, 0) + " m", cx, cy + 16 * s, { color: "#fff", size: 10.5, align: "center", weight: "700" });
    D.text(ctx, "俯視", mx0 + 10, my0 + 16, { color: "#fff", size: 10, weight: "700" });
    // 剖面
    const thr = rad(th), rl = Math.min(118 * s, W * 0.19), bx = mx0 + ms + (W - mx0 - ms) * 0.52;
    const by = gy - 6 * s - rl * Math.sin(thr);
    const A = { x: bx - rl * Math.cos(thr), y: by + rl * Math.sin(thr) }, B = { x: bx + rl * Math.cos(thr), y: by - rl * Math.sin(thr) };
    const eg = ctx.createLinearGradient(0, B.y, 0, gy);
    eg.addColorStop(0, L ? "#b9a386" : "#4a4034"); eg.addColorStop(1, L ? "#8f7a5f" : "#2c251d");
    poly(ctx, [{ x: A.x - 16 * s, y: gy }, A, B, { x: B.x + 22 * s, y: gy }], eg, null);
    noteC(ctx, L ? "#a79172" : "#3c342a", A.x, B.y, B.x - A.x, gy - B.y);
    ctx.strokeStyle = L ? "#555b63" : "#2a2e34"; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    ctx.save(); ctx.translate(bx, by); ctx.rotate(-thr);
    const cwid = 62 * s;
    ctx.fillStyle = "rgb(24,24,28)"; AP.rrPath(ctx, -cwid * 0.46, -11 * s, 12 * s, 11 * s, 2 * s); ctx.fill(); AP.rrPath(ctx, cwid * 0.46 - 12 * s, -11 * s, 12 * s, 11 * s, 2 * s); ctx.fill();
    const cg = ctx.createLinearGradient(0, -40 * s, 0, -6 * s);
    cg.addColorStop(0, "rgb(240,110,100)"); cg.addColorStop(1, "rgb(170,40,36)");
    ctx.fillStyle = cg; AP.rrPath(ctx, -cwid / 2, -26 * s, cwid, 19 * s, 5 * s); ctx.fill();
    AP.rrPath(ctx, -cwid * 0.34, -40 * s, cwid * 0.68, 17 * s, 6 * s); ctx.fill();
    ctx.fillStyle = "rgba(170,210,235,0.95)"; AP.rrPath(ctx, -cwid * 0.27, -37 * s, cwid * 0.54, 10 * s, 3 * s); ctx.fill();
    ctx.fillStyle = "rgb(255,70,60)"; ctx.fillRect(-cwid / 2 + 3 * s, -21 * s, 9 * s, 5 * s); ctx.fillRect(cwid / 2 - 12 * s, -21 * s, 9 * s, 5 * s);
    ctx.fillStyle = "rgb(236,236,230)"; ctx.fillRect(-8 * s, -15 * s, 16 * s, 5 * s);
    ctx.restore();
    const gx = bx - Math.sin(thr) * 24 * s, gyy = by - Math.cos(thr) * 24 * s, Lg = 58 * s;
    D.arrow(ctx, gx, gyy, gx, gyy + Lg, { color: "#e0473c", width: 2.8, label: "mg" });
    D.arrow(ctx, gx, gyy, gx - Math.sin(thr) * Lg / Math.cos(thr), gyy - Lg, { color: "#2f7fd8", width: 2.8, label: "N" });
    if (thr > 0.02) D.arrow(ctx, gx, gyy, gx - Lg * Math.tan(thr), gyy, { color: "#1f9d55", width: 2.6, dash: [5, 4] });
    D.text(ctx, "合力指向圓心", gx - Lg * Math.tan(thr) - 6, gyy - 6 * s, { color: "#1f9d55", size: 10.5, align: "right", weight: "700" });
    ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(A.x, A.y, 30 * s, -thr, 0); ctx.stroke(); ctx.restore();
    D.text(ctx, "θ", A.x + 36 * s * Math.cos(thr / 2), A.y - 36 * s * Math.sin(thr / 2) + 4, { color: "#fff", size: 11.5, weight: "700" });
    D.text(ctx, "傾角 θ = " + PL.fmt(th, 0) + "°", bx, 34 * s + 48, { color: PL.col("text-dim"), size: 10.5, align: "center" });
    D.text(ctx, "← 圓心方向", A.x - 10 * s, gy - 10 * s, { color: PL.theme.pale(0.8), size: 10, align: "right" });
    D.text(ctx, "剖面（從車尾看）", bx, 34 * s + 30, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    fillPill(ctx, W - 150, 18, "設計速率 v", PL.fmt(v, 1) + " m/s（" + PL.fmt(v * 3.6, 0) + " km/h）", 132, c);
  };

  /*
   * oscillation 家族的共用舞台：上方一條實驗室（牆＋實驗桌），桌上是左牆、滑軌、彈簧掛小車，
   * 下半部留給 x–t 波形條。阻尼與耦合各自用精確解動畫。
   */
  function oscStage(cv) {
    const { ctx, W, H } = cv;
    const wallX = 34, cartW = 52, ay = 100, railY = ay + 30;
    AP.labStrip(ctx, W, 172, railY + 9, {});
    return { ctx, W, H, wallX, cartW, ay, railY };
  }

  // 牆柱、軌道、彈簧與小車；dx 是小車相對平衡位置的水平位移（px）
  // card（0..1）給阻尼實驗在車頂立一片擋風紙板：紙板越大，空氣阻尼越大
  function oscCart(ctx, g, eqX, dx, coils, card) {
    const c = color();
    AP.steel(ctx, g.wallX - 10, g.railY, g.W - g.wallX - 26, 8, 4);
    const post = AP.wallPost(ctx, g.wallX - 4, g.railY - 1, g.ay - 32, g.ay);
    D.line(ctx, eqX, g.ay - 40, eqX, g.railY + 16, "rgba(120,190,255,0.5)", 1, [4, 4]);
    D.text(ctx, "x = 0", eqX, g.railY + 32, { color: PL.theme.pale(0.75), size: 10.5, align: "center" });
    D.spring(ctx, post.x, g.ay, eqX + dx - g.cartW / 2 - 2, g.ay, coils || 11, 11, c);
    AP.cart(ctx, eqX + dx, g.railY, g.cartW, 36, { cargo: true });
    if (card != null) {
      const x = eqX + dx, top = g.railY - 62, cw = 24 + 12 * card, chh = 8 + 34 * card;
      AP.steel(ctx, x - 1.5, top - 6, 3, 7, 10);
      const cg = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0);
      cg.addColorStop(0, "rgb(214,188,140)"); cg.addColorStop(0.5, "rgb(238,216,172)"); cg.addColorStop(1, "rgb(196,168,120)");
      ctx.fillStyle = cg; ctx.fillRect(x - cw / 2, top - 6 - chh, cw, chh);
      ctx.strokeStyle = "rgba(110,84,40,0.7)"; ctx.lineWidth = 1; ctx.strokeRect(x - cw / 2 + 0.5, top - 6 - chh + 0.5, cw - 1, chh - 1);
    }
  }

  // 振幅 ±A 與現在位置的標線；ampPx 為目前的包絡（px）
  function oscMarks(ctx, g, eqX, ampPx, xPx) {
    const dash = [4, 4];
    if (ampPx > 6) {
      D.line(ctx, eqX - ampPx, g.ay - 40, eqX - ampPx, g.railY + 8, "rgba(255,255,255,0.15)", 1, dash);
      D.line(ctx, eqX + ampPx, g.ay - 40, eqX + ampPx, g.railY + 8, "rgba(255,255,255,0.15)", 1, dash);
      if (ampPx > 30) {
        D.text(ctx, "−A", eqX - ampPx, g.railY + 32, { color: PL.theme.pale(0.5), size: 10, align: "center" });
        D.text(ctx, "+A", eqX + ampPx, g.railY + 32, { color: PL.theme.pale(0.5), size: 10, align: "center" });
      }
    }
    const v = xPx - eqX;
    if (Math.abs(v) > 4) {
      const by = g.railY + 18;
      D.line(ctx, eqX, by, xPx, by, PL.theme.pale(0.4), 1.2);
      D.line(ctx, eqX, by - 4, eqX, by + 4, PL.theme.pale(0.4), 1.2);
      D.line(ctx, xPx, by - 4, xPx, by + 4, PL.theme.pale(0.4), 1.2);
    }
  }

  // 下半部的時間波形條：win 秒的滑動窗，series 是 [{pts, color, width, dash}]
  function oscStrip(cv, yTop, win, series, title, marks) {
    const { ctx, W, H } = cv;
    const g = PL.graph(cv, { x: 44, y: yTop, w: W - 88, h: H - yTop - 30 }, { x0: -win, x1: 0, y0: -1.15, y1: 1.15 });
    g.frame({ title, xlabel: marks && marks.xlabel || "" }); g.grid(4, 2);
    (marks && marks.lines || []).forEach(l => g.vline(l.x, { color: l.color || PL.col("text-faint"), dash: [3, 4] }));
    if (marks && marks.winLabel != null) g.label(-win + win * 0.02, 0.94, marks.winLabel, { color: PL.col("text-faint"), size: 9 });
    series.forEach(s => { if (s.pts.length > 1) g.curve(s.pts, { color: s.color, width: s.width || 2, dash: s.dash }); });
  }

  /*
   * 阻尼振動：畫面用固定自然頻率 ω₀，位移取真實的精確解——
   *   欠阻尼   x = A₀e^(−βt)cos(ω′t)，ω′ = √(ω₀²−β²)
   *   臨界阻尼 x = A₀e^(−ω₀t)(1 + ω₀t)
   *   過阻尼   x = A₀e^(−βt)(cosh γt + (β/γ)sinh γt)，γ = √(β²−ω₀²)
   * 每個週期自動重新釋放一次，學生不必手動重設就能反覆觀察。
   * 車頂的擋風紙板隨 β 變大：這就是實驗課增加空氣阻尼的做法。
   */
  SC["damped-oscillation"] = k => {
    const { cv, ctx, a: A0, b: beta, t, c, v: val } = k;
    const g = oscStage(cv);
    const W0 = 2.8, CYCLE = 14, FADE = 0.6;
    const s = t % CYCLE, ramp = Math.min(1, s / FADE);
    let xCm, env;
    if (beta < W0 - 1e-6) {
      const wd = Math.sqrt(W0 * W0 - beta * beta);
      xCm = A0 * Math.exp(-beta * s) * Math.cos(wd * s);
      env = A0 * Math.exp(-beta * s);
    } else if (beta > W0 + 1e-6) {
      const ga = Math.sqrt(beta * beta - W0 * W0);
      xCm = A0 * Math.exp(-beta * s) * (Math.cosh(ga * s) + (beta / ga) * Math.sinh(ga * s));
      env = Math.abs(xCm);
    } else {
      xCm = A0 * Math.exp(-W0 * s) * (1 + W0 * s);
      env = Math.abs(xCm);
    }
    xCm *= ramp;
    const maxHalf = (g.W - g.wallX - 90 - g.cartW) / 2;
    const sc = maxHalf / 12;
    const eqX = g.wallX + 76 + g.cartW / 2 + maxHalf / 2;
    const xPx = eqX + xCm * sc, ampPx = env * sc * ramp;
    oscCart(ctx, g, eqX, xCm * sc, 11, fr(beta, k.cfg.b));
    oscMarks(ctx, g, eqX, ampPx, xPx);
    const regime = beta < W0 - 1e-6 ? ["欠阻尼", "來回振盪，振幅指數衰減"]
      : beta > W0 + 1e-6 ? ["過阻尼", "不振盪，但比臨界阻尼更慢歸位"]
      : ["臨界阻尼", "不振盪，以最短時間回到平衡"];
    D.text(ctx, "β = " + PL.fmt(beta, 2) + " s⁻¹ · " + regime[0] + "（ω₀ = 2.8 s⁻¹）", g.W - 18, 24, { color: c, size: 11, align: "right", weight: "700" });
    D.text(ctx, regime[1] + "；紙板越大阻尼越大", g.W - 18, 40, { color: PL.col("text-faint"), size: 10, align: "right" });
    const pts = [];
    for (let u = 0; u <= s; u += CYCLE / 240) {
      let xv;
      if (beta < W0 - 1e-6) xv = Math.cos(Math.sqrt(W0 * W0 - beta * beta) * u);
      else if (beta > W0 + 1e-6) { const ga = Math.sqrt(beta * beta - W0 * W0); xv = Math.cosh(ga * u) + (beta / ga) * Math.sinh(ga * u); }
      else xv = 1 + W0 * u;
      pts.push([u - s, A0 * Math.exp(-beta * u) * xv * ramp]);
    }
    const envPts = [];
    if (beta < W0 - 1e-6) for (let u = 0; u <= s; u += CYCLE / 120) envPts.push([u - s, A0 * Math.exp(-beta * u)]);
    const norm = p => p.map(q => [q[0], q[1] / Math.max(1e-9, A0)]);
    oscStrip(cv, 184, CYCLE, [{ pts: norm(pts), color: c, width: 2.2 }, { pts: norm(envPts), color: PL.col("warn"), width: 1.4, dash: [5, 4] }],
      "x – t（橘虛線 = 包絡 ±A₀e^(−βt)）", { lines: [{ x: 5 - s, color: PL.col("accent-2") }], winLabel: "釋放 →" });
    fillPill(ctx, 18, 18, "5 秒後振幅", PL.fmt(val, 2) + " cm", 118, c);
  };

  /*
   * 耦合振子：兩台小車夾三條彈簧（牆—κ—車1—κ—車2—κ—牆）。
   * 兩個正常模態 ω₁=√(κ/m)、ω₂=√(3κ/m)，從「只拉開車1」出發：
   *   x₁ = A cos(Δt)cos(ω̄t)、x₂ = A sin(Δt)sin(ω̄t)
   * 能量以模態差 (ω₂−ω₁) 為節奏來回搬運——波形條裡兩條曲線此消彼長。
   */
  SC["coupled-oscillators"] = k => {
    const { cv, ctx, a: kap, b: mm, t, c, v: val } = k;
    const g = oscStage(cv);
    const m = Math.max(1e-6, mm);
    const w1 = Math.sqrt(kap / m), w2 = Math.sqrt(3 * kap / m);
    const wm = (w1 + w2) / 2, dm = (w2 - w1) / 2;
    const Apx = Math.min(44, (g.W - 260) / 4);
    const x1 = Math.cos(dm * t) * Math.cos(wm * t);
    const x2 = Math.sin(dm * t) * Math.sin(wm * t);
    const wallR = g.W - 30;
    const c1eq = g.wallX + 78 + g.cartW / 2, c2eq = wallR - 78 - g.cartW / 2;
    const c1x = c1eq + x1 * Apx, c2x = c2eq + x2 * Apx;
    AP.steel(ctx, g.wallX - 10, g.railY, wallR - g.wallX + 6, 8, 4);
    const postL = AP.wallPost(ctx, g.wallX - 4, g.railY - 1, g.ay - 32, g.ay);
    const postR = AP.wallPost(ctx, wallR + 4, g.railY - 1, g.ay - 32, g.ay);
    D.line(ctx, c1eq, g.ay - 40, c1eq, g.railY + 16, "rgba(120,190,255,0.45)", 1, [4, 4]);
    D.line(ctx, c2eq, g.ay - 40, c2eq, g.railY + 16, "rgba(120,190,255,0.45)", 1, [4, 4]);
    D.spring(ctx, postL.x, g.ay, c1x - g.cartW / 2 - 2, g.ay, 8, 10, c);
    D.spring(ctx, c1x + g.cartW / 2 + 2, g.ay, c2x - g.cartW / 2 - 2, g.ay, Math.max(9, Math.round((c2x - c1x - g.cartW) / 16)), 10, PL.col("accent-3"));
    D.spring(ctx, c2x + g.cartW / 2 + 2, g.ay, postR.x, g.ay, 8, 10, c);
    AP.cart(ctx, c1x, g.railY, g.cartW, 36, { cargo: true });
    AP.cart(ctx, c2x, g.railY, g.cartW, 36, { cargo: true });
    D.text(ctx, "振子一", c1x, g.railY + 32, { color: PL.theme.pale(0.7), size: 10, align: "center" });
    D.text(ctx, "振子二", c2x, g.railY + 32, { color: PL.theme.pale(0.7), size: 10, align: "center" });
    D.text(ctx, "能量沿中間彈簧來回搬運：一台變小時另一台變大", g.W / 2, 30, { color: PL.col("text-faint"), size: 10.5, align: "center" });
    const Tex = Math.PI / Math.max(1e-9, dm);
    const win = Math.min(30, Math.max(Tex * 1.15, 4));
    const pts1 = [], pts2 = [];
    for (let u = win; u >= 0; u -= win / 240) {
      const tt = t - u;
      pts1.push([-u, Math.cos(dm * tt) * Math.cos(wm * tt)]);
      pts2.push([-u, Math.sin(dm * tt) * Math.sin(wm * tt)]);
    }
    oscStrip(cv, 184, win, [{ pts: pts1, color: c, width: 2.1 }, { pts: pts2, color: PL.col("accent-3"), width: 2.1 }],
      "x₁ – t（主色）與 x₂ – t（紫）：此消彼長", { winLabel: "← " + PL.fmt(win, 1) + " s" });
    fillPill(ctx, 18, 18, "交換頻率", PL.fmt(val, 3) + " Hz", 118, c);
  };

  /* 潛水員（胸口在 (x, y)，壓力計量的就是這個深度） */
  function diver(ctx, x, y, sc, t) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    const kick = Math.sin(t * 3) * 5;
    ctx.lineCap = "round";
    ctx.fillStyle = "rgb(240,190,40)"; AP.rrPath(ctx, -21, -30, 11, 40, 5); ctx.fill();
    ctx.strokeStyle = "rgb(28,36,50)"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-3, 12); ctx.lineTo(-5 + kick * 0.3, 40); ctx.moveTo(4, 12); ctx.lineTo(6 - kick * 0.3, 42); ctx.stroke();
    ctx.fillStyle = "rgb(250,200,40)";
    [[-5 + kick * 0.3, 40, -1], [6 - kick * 0.3, 42, 1]].forEach(f => { ctx.beginPath(); ctx.moveTo(f[0] - 5, f[1]); ctx.lineTo(f[0] + 5, f[1]); ctx.lineTo(f[0] + 9 * f[2], f[1] + 14); ctx.lineTo(f[0] - 3 * f[2], f[1] + 14); ctx.closePath(); ctx.fill(); });
    ctx.fillStyle = "rgb(30,40,56)"; AP.rrPath(ctx, -11, -30, 22, 46, 9); ctx.fill();
    ctx.strokeStyle = "rgb(30,40,56)"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(6, -20); ctx.lineTo(22, -8); ctx.stroke();
    ctx.fillStyle = "rgb(30,40,56)"; ctx.beginPath(); ctx.arc(1, -40, 10, 0, PL.TAU); ctx.fill();
    ctx.fillStyle = "rgba(150,210,240,0.95)"; AP.rrPath(ctx, 2, -45, 11, 8, 3); ctx.fill();
    ctx.strokeStyle = "rgb(230,230,230)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = "rgb(20,24,30)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-16, -30); ctx.quadraticCurveTo(-6, -46, 8, -34); ctx.stroke();
    ctx.restore();
  }
  function fish(ctx, x, y, sz, dir, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * sz, sz);
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, 10, 5, 0, 0, PL.TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-15, -5); ctx.lineTo(-15, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(5, -1.5, 1.6, 0, PL.TAU); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(5.4, -1.5, 0.8, 0, PL.TAU); ctx.fill();
    ctx.restore();
  }

  /* 液體壓力：潛水員帶著壓力錶往下潛，液體換了顏色就是換了密度 */
  SC["hydrostatic-pressure"] = k => {
    const { ctx, W, H, a: h, b: rho, t, s, c, v: P } = k;
    const L = isL(), wl = H * 0.2, bed = H - 14 * s;
    AP.outdoor(ctx, W, H, wl, { t, ground: "none", hills: false, sunX: W * 0.84, sunY: wl * 0.42 });
    const oil = [206, 164, 72], fresh = [70, 150, 206], brine = [30, 102, 118];
    const base = rho < 1000 ? mixRgb(oil, fresh, (rho - 600) / 400) : mixRgb(fresh, brine, (rho - 1000) / 400);
    const top = L ? mixRgb(base, [255, 255, 255], 0.2) : mixRgb(base, [0, 0, 0], 0.35);
    const deep = L ? mixRgb(base, [0, 0, 0], 0.35) : mixRgb(base, [0, 0, 0], 0.75);
    const g = ctx.createLinearGradient(0, wl, 0, bed);
    g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(deep));
    ctx.fillStyle = g; ctx.fillRect(0, wl, W, bed - wl);
    noteC(ctx, rgb(mixRgb(top, deep, 0.45)), 0, wl, W, bed - wl);
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = "#fff";
    for (let i = 0; i < 4; i++) { const x = W * (0.2 + i * 0.22) + Math.sin(t * 0.4 + i) * 10; ctx.beginPath(); ctx.moveTo(x, wl); ctx.lineTo(x + 30 * s, wl); ctx.lineTo(x - 40 * s, bed); ctx.lineTo(x - 70 * s, bed); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = 0; x <= W; x += 8) { const y = wl + Math.sin(x * 0.05 + t * 2) * 2; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    AP.ground(ctx, 0, W, bed, H - bed, "sand");
    const pxPerM = (bed - wl - 16 * s) / 30, rx = 22 * s;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? "rgb(240,240,236)" : "rgb(214,60,52)";
      ctx.fillRect(rx, wl + i * 5 * pxPerM, 8 * s, 5 * pxPerM);
    }
    ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1; ctx.strokeRect(rx, wl, 8 * s, 30 * pxPerM);
    for (let mm = 5; mm <= 30; mm += 5) D.text(ctx, mm + " m", rx + 12 * s, wl + mm * pxPerM + 4, { color: "#fff", size: 10, weight: "700" });
    [[0.38, 1, "rgb(255,150,60)"], [0.7, -1, "rgb(250,210,70)"]].forEach((f, i) => {
      const span = W + 60, x = ((t * (26 + i * 12) * s * f[1] + i * 300) % span + span) % span - 30;
      fish(ctx, x, wl + (bed - wl) * f[0], 1.1 * s, f[1], f[2]);
    });
    const dy = wl + h * pxPerM, dx = W * 0.44;
    D.line(ctx, rx + 10 * s, dy, dx - 26 * s, dy, "rgba(255,255,255,0.8)", 1.2, [5, 4]);
    D.text(ctx, "h = " + PL.fmt(h, 1) + " m", dx - 30 * s, dy - 6, { color: "#fff", size: 11, align: "right", weight: "700" });
    AP.bubbles(ctx, dx + 4 * s, wl, 16 * s, Math.max(0, dy - 44 * s - wl), t, Math.round(3 + h / 4), { speed: 40 * s, seed: 5 });
    diver(ctx, dx, dy, 1.05 * s, t);
    const gX = dx + 76 * s;
    AP.dial(ctx, gX, dy, 26 * s, P / 420, { max: 400, unit: "kPa", majors: 4 });
    AP.lcd(ctx, gX - 40 * s, dy + 28 * s, 80 * s, 18 * s, PL.fmt(P, 1) + " kPa", { color: "rgb(130,240,170)" });
    const name = rho < 860 ? "油類液體" : rho < 1012 ? "淡水" : rho < 1100 ? "海水" : "濃鹽水";
    D.text(ctx, name + "（ρ = " + PL.fmt(rho, 0) + " kg/m³）", W - 16 * s, wl + 24 * s, { color: "#fff", size: 11.5, align: "right", weight: "700" });
    D.text(ctx, "P = ρgh", W - 16 * s, wl + 42 * s, { color: "#fff", size: 11, align: "right" });
    fillPill(ctx, 18, 18, "表壓（水面下）", PL.fmt(P, 1) + " kPa", 124, c);
  };

  function iceCube(ctx, x, y, a, i) {
    ctx.save(); ctx.translate(x, y); ctx.rotate((i % 3 - 1) * 0.18);
    const g = ctx.createLinearGradient(-a / 2, -a / 2, a / 2, a / 2);
    g.addColorStop(0, "rgba(250,254,255,0.95)"); g.addColorStop(1, "rgba(176,216,238,0.8)");
    ctx.fillStyle = g; AP.rrPath(ctx, -a / 2, -a / 2, a, a, a * 0.22); ctx.fill();
    ctx.strokeStyle = "rgba(110,160,196,0.85)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(-a * 0.3, -a * 0.34, a * 0.26, a * 0.1);
    ctx.restore();
  }

  /* 冰的熔化：加熱板上的冰水，熔化期間溫度計停在 0 °C */
  SC["phase-change"] = k => {
    const { ctx, W, H, a: m, b: P, t, s, c, v: tm } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const cx = W * 0.4;
    const plateTop = AP.hotPlate(ctx, cx, benchY, 176 * s, P / 2000);
    const Tv = 1.5 + 2.2 * Math.log10(1 + tm / 60), cyc = Tv + 1.8, tau = t % cyc;
    const f = clamp(tau / Tv, 0, 1), temp = f < 1 ? 0 : (tau - Tv) / 1.8 * 12;
    const bw = 136 * s, bh = Math.min(158 * s, plateTop - 46 * s);
    const lvl = 0.14 + 0.5 * Math.sqrt(m / 4) * f;
    const bk = AP.beaker(ctx, cx, plateTop, bw, bh, lvl, "#8fcbe8");
    const n = clamp(Math.round(2 + m * 3), 2, 14), cs = 21 * s * Math.cbrt(Math.max(0.001, 1 - f));
    if (f < 1) for (let i = 0; i < n; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      iceCube(ctx, cx - bw * 0.33 + col * bw * 0.2 + (row % 2) * 7 * s, bk.waterY - cs * 0.3 - row * cs * 0.78, cs, i);
    }
    AP.bubbles(ctx, cx - bw / 2 + 6, bk.waterY, bw - 12, plateTop - bk.waterY - 4, t, Math.round(P / 250), { speed: 22 * s, seed: 3, r: 1.8 * s });
    const thX = cx + bw * 0.36;
    AP.thermometer(ctx, thX, plateTop - bh - 34 * s, plateTop - 12 * s, 11 * s, (temp + 10) / 110);
    D.text(ctx, PL.fmt(temp, 1) + " °C", thX + 12 * s, plateTop - bh - 20 * s, { color: temp > 0.05 ? PL.col("danger") : c, size: 13, weight: "700" });
    const lx = W * 0.66;
    AP.lcd(ctx, lx, H * 0.26, 128 * s, 30 * s, "t = " + PL.fmt(f * tm, 0) + " s", { color: "rgb(255,196,90)" });
    D.text(ctx, "加熱時間", lx, H * 0.26 - 6, { color: PL.col("text-dim"), size: 10 });
    D.text(ctx, f < 1 ? "冰水共存：溫度停在 0 °C" : "冰全部熔化 → 水溫開始上升", lx, H * 0.26 + 30 * s + 22, { color: f < 1 ? c : PL.col("danger"), size: 12, weight: "700" });
    D.text(ctx, "吸收的熱 Q = mL = " + PL.fmt(m * 334, 0) + " kJ", lx, H * 0.26 + 30 * s + 42, { color: PL.col("text-dim"), size: 10.5 });
    fillPill(ctx, 18, 18, "熔化所需時間", PL.fmt(tm, 0) + " s", 118, c);
  };

  /* 波的反射：手甩一下繩子，脈衝跑到端點後反射回來 */
  SC["reflection-boundary"] = k => {
    const { ctx, W, H, a: amp0, b: endB, t, s, c } = k;
    const fixed = endB < 0.5;
    const benchY = H * 0.84;
    AP.labRoom(ctx, W, H, benchY, {});
    const ropeY = H * 0.5, wallX = 66 * s, handX = W - 96 * s;
    if (fixed) AP.wallBlock(ctx, wallX, 0, benchY, wallX, { dir: -1 });
    else {
      AP.steel(ctx, wallX - 3 * s, H * 0.14, 6 * s, benchY - H * 0.14, -4);
      AP.steel(ctx, wallX - 26 * s, benchY - 8 * s, 52 * s, 8 * s, -10);
    }
    const A = (14 + 42 * fr(amp0, k.cfg.a)) * s, sig = 24 * s, v = 190 * s;
    const P = 2 * (handX - wallX) / v + 1.1, tau = t % P;
    const cpos = handX + 2 * sig - v * tau, img = 2 * wallX - cpos, sg = fixed ? -1 : 1;
    const gf = x => A * Math.exp(-(x / sig) * (x / sig));
    const yAt = x => gf(x - cpos) + sg * gf(x - img);
    D.line(ctx, wallX, ropeY, handX, ropeY, PL.theme.pale(0.25), 1, [4, 5]);
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    [["rgb(120,84,40)", 5 * s], ["rgb(206,164,96)", 3.4 * s]].forEach(st => {
      ctx.strokeStyle = st[0]; ctx.lineWidth = st[1]; ctx.beginPath();
      for (let i = 0; i <= 140; i++) { const x = wallX + (handX - wallX) * i / 140, y = ropeY - yAt(x); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    });
    ctx.restore();
    const endY = ropeY - yAt(wallX);
    if (fixed) { ctx.strokeStyle = "rgb(150,160,176)"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(wallX + 4 * s, ropeY, 5 * s, 0, PL.TAU); ctx.stroke(); AP.steel(ctx, wallX, ropeY - 4 * s, 4 * s, 8 * s, 6); }
    else { ctx.strokeStyle = "rgb(198,160,80)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(wallX, endY, 8 * s, 3.5 * s, 0, 0, PL.TAU); ctx.stroke(); }
    AP.hand(ctx, handX + 6 * s, ropeY - yAt(handX), -1, 0.85 * s, { pull: true, sleeve: "#3b82c4" });
    D.text(ctx, fixed ? "固定端：繩子綁在牆上" : "自由端：套環可沿光滑桿上下滑動", W / 2, 36 * s + 10, { color: PL.col("text"), size: 12.5, align: "center", weight: "700" });
    if (img > wallX + sig * 0.5) {
      const lx = clamp(img, wallX + 60 * s, handX - 60 * s);
      D.text(ctx, fixed ? "反射波倒立（相位差 180°）" : "反射波正立（同相）", lx, ropeY + (fixed ? A + 30 * s : -A - 22 * s), { color: fixed ? PL.col("danger") : c, size: 12, align: "center", weight: "700" });
    } else if (cpos < handX - sig) {
      D.text(ctx, "入射脈衝 →", clamp(cpos, wallX + 50 * s, handX - 50 * s), ropeY - A - 18 * s, { color: PL.col("warn"), size: 11, align: "center" });
    }
    fillPill(ctx, 18, 18, "反射相位", fixed ? "180°（反相）" : "0°（同相）", 118, c);
  };

  /* 聲強與距離：操場上的喇叭，同學拿著聲音計往外走 */
  SC["sound-intensity"] = k => {
    const { ctx, W, H, a: r, b: A, t, s, c, v: I } = k;
    const gy = H * 0.82;
    AP.outdoor(ctx, W, H, gy, { t, hills: true, sunX: W * 0.9 });
    const spX = 62 * s, spY = gy - 112 * s, pxPerM = (W - spX - 86 * s) / 31;
    ctx.strokeStyle = "rgb(60,64,72)"; ctx.lineWidth = 3 * s;
    [[-24, 0], [22, 0], [0, 0]].forEach(l => { ctx.beginPath(); ctx.moveTo(spX - 12 * s, spY + 34 * s); ctx.lineTo(spX - 12 * s + l[0] * s, gy); ctx.stroke(); });
    const spacing = 34 * s, ph = (t * 110 * s) % spacing;
    for (let rr = 20 * s + ph; rr < W - spX; rr += spacing) {
      const meters = rr / pxPerM, al = clamp((0.2 + 0.07 * A) * 3 / (meters + 3), 0.03, 0.85);
      ctx.strokeStyle = `rgba(255,186,70,${al.toFixed(3)})`; ctx.lineWidth = (1 + A * 0.25) * s;
      ctx.beginPath(); ctx.arc(spX + 12 * s, spY, rr, -0.62, 0.62); ctx.stroke();
    }
    AP.speaker(ctx, spX, spY, 1.2 * s, 0.5 + 0.5 * Math.sin(t * 24), 1);
    for (let mm = 0; mm <= 30; mm += 5) {
      const x = spX + 12 * s + mm * pxPerM;
      ctx.fillStyle = "rgb(236,236,230)"; ctx.fillRect(x - 1.5 * s, gy - 12 * s, 3 * s, 12 * s);
      D.text(ctx, mm + " m", x, gy + 16 * s, { color: PL.theme.pale(0.8), size: 9.5, align: "center" });
    }
    const px = spX + 12 * s + r * pxPerM;
    D.line(ctx, spX + 12 * s, gy - 22 * s, px, gy - 22 * s, PL.theme.pale(0.6), 1, [4, 4]);
    AP.person(ctx, px + 12 * s, gy, 82 * s, { shirt: "#46a36b", facing: -1 });
    const mx = px - 6 * s, my = gy - 64 * s;
    ctx.fillStyle = "rgb(236,186,40)"; AP.rrPath(ctx, mx - 13 * s, my - 22 * s, 26 * s, 40 * s, 4 * s); ctx.fill();
    ctx.fillStyle = "rgb(60,64,72)"; ctx.beginPath(); ctx.arc(mx, my - 26 * s, 5 * s, 0, PL.TAU); ctx.fill();
    AP.lcd(ctx, mx - 10 * s, my - 16 * s, 20 * s, 11 * s, "", { color: "rgb(120,240,160)" });
    const lx = clamp(px - 43 * s, spX + 60 * s, W - 100 * s);
    AP.lcd(ctx, lx, gy - 132 * s, 86 * s, 22 * s, PL.fmt(I, I < 1 ? 3 : 2), { color: "rgb(120,240,160)" });
    D.text(ctx, "聲音計（相對聲強）", lx + 43 * s, gy - 138 * s, { color: PL.col("text"), size: 10, align: "center" });
    D.text(ctx, "距離加倍 → 聲強剩 1/4", W - 16 * s, 44 * s, { color: PL.col("text"), size: 11.5, align: "right", weight: "700" });
    fillPill(ctx, 18, 18, "相對聲強 I ∝ A²/r²", PL.fmt(I, I < 1 ? 3 : 2), 132, c);
  };

  /* 空氣柱共鳴：玻璃管插在水槽裡，上下移動改變空氣柱長度 */
  SC["air-column-resonance"] = k => {
    const { ctx, W, H, a: Lcm, b: f, t, s, c, v: vs } = k;
    const benchY = H * 0.9;
    AP.labRoom(ctx, W, H, benchY, {});
    const cx = W * 0.4, wY = H * 0.7;
    const p = Math.min((wY - 72 * s) / 122, 2.4 * s);
    const tubeTop = wY - Lcm * p, tubeBot = tubeTop + 128 * p, tw = 28 * s, jw = 74 * s, jTop = wY - 16 * s;
    const L = isL();
    const jg = ctx.createLinearGradient(cx - jw / 2, 0, cx + jw / 2, 0);
    jg.addColorStop(0, "rgba(226,244,252,0.35)"); jg.addColorStop(0.2, "rgba(255,255,255,0.12)"); jg.addColorStop(1, "rgba(226,244,252,0.35)");
    AP.contactShadow(ctx, cx, benchY + 2, jw * 0.7);
    const wg = ctx.createLinearGradient(0, wY, 0, benchY);
    wg.addColorStop(0, "rgba(120,196,226,0.45)"); wg.addColorStop(1, "rgba(58,142,182,0.6)");
    ctx.fillStyle = wg; ctx.fillRect(cx - jw / 2 + 2, wY, jw - 4, benchY - wY - 2);
    AP.glassTube(ctx, cx, tubeTop, Math.min(tubeBot, benchY - 6 * s), tw, wY);
    ctx.fillStyle = jg; ctx.fillRect(cx - jw / 2, jTop, jw, benchY - jTop);
    ctx.strokeStyle = L ? "rgba(84,124,152,0.8)" : "rgba(206,232,244,0.85)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx - jw / 2, jTop); ctx.lineTo(cx - jw / 2, benchY); ctx.lineTo(cx + jw / 2, benchY); ctx.lineTo(cx + jw / 2, jTop); ctx.stroke();
    // 管內空氣柱的駐波（管口腹點、水面節點）
    const Lpx = wY - tubeTop, osc = Math.sin(t * 9);
    if (Lpx > 6) {
      ctx.save(); ctx.strokeStyle = "rgba(255,170,60,0.9)"; ctx.lineWidth = 1.8;
      [1, -1].forEach(sg => {
        ctx.beginPath();
        for (let i = 0; i <= 30; i++) { const d = Lpx * i / 30, amp = tw * 0.36 * Math.cos(Math.PI / 2 * d / Lpx) * osc * sg; i ? ctx.lineTo(cx + amp, tubeTop + d) : ctx.moveTo(cx + amp, tubeTop + d); }
        ctx.stroke();
      });
      ctx.restore();
    }
    // 音叉倒持在管口上方
    const fh = 44 * s * Math.pow(440 / f, 0.35);
    ctx.save(); ctx.translate(cx, tubeTop - 8 * s); ctx.rotate(Math.PI);
    AP.tuningFork(ctx, 0, fh, fh); ctx.restore();
    ctx.strokeStyle = "rgba(255,196,110,0.7)"; ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { const rr = 16 * s + i * 12 * s + (t * 30 * s) % (12 * s); ctx.beginPath(); ctx.arc(cx, tubeTop - 8 * s, rr, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    // 公分刻度
    const rx = cx + jw / 2 + 12 * s;
    AP.steel(ctx, rx, tubeTop, 3 * s, wY - tubeTop, 20);
    for (let cm = 0; cm <= Lcm + 0.01; cm += 5) {
      const y = tubeTop + cm * p, major = cm % 20 === 0;
      D.line(ctx, rx, y, rx + (major ? 10 : 5) * s, y, PL.theme.pale(0.7), 1);
      if (major) D.text(ctx, cm + "", rx + 13 * s, y + 3, { color: PL.theme.pale(0.8), size: 9 });
    }
    D.arrow(ctx, cx - tw / 2 - 8 * s, wY, cx - tw / 2 - 8 * s, tubeTop, { color: c, width: 2 });
    D.text(ctx, "L = " + PL.fmt(Lcm, 0) + " cm", cx - jw / 2 - 8 * s, (tubeTop + wY) / 2 + 4, { color: c, size: 12, align: "right", weight: "700" });
    D.text(ctx, "管口：腹點", cx - jw / 2 - 8 * s, tubeTop + 4 * s, { color: PL.col("warn"), size: 10.5, align: "right", weight: "700" });
    D.text(ctx, "水面：節點", cx - jw / 2 - 8 * s, wY + 14 * s, { color: PL.col("accent-2"), size: 10.5, align: "right", weight: "700" });
    D.text(ctx, PL.fmt(f, 0) + " Hz 音叉", cx + 22 * s, tubeTop - fh * 0.6, { color: PL.col("text"), size: 11, weight: "700" });
    D.text(ctx, "λ = 4L = " + PL.fmt(Lcm * 4, 0) + " cm", W * 0.7, H * 0.36, { color: PL.col("text"), size: 12, weight: "700" });
    D.text(ctx, "v = fλ = 4fL", W * 0.7, H * 0.36 + 20, { color: PL.col("text-dim"), size: 11 });
    fillPill(ctx, 18, 18, "聲速 v = 4fL", PL.fmt(vs, 0) + " m/s", 120, c);
  };

  /* 臨界角：半圓形玻璃磚放在光學圓盤上，雷射沿半徑射向圓心 */
  SC["critical-angle"] = k => {
    const { ctx, W, H, a: n1, b: thDeg, t, s, c, v: thC } = k;
    const benchY = H * 0.93;
    AP.labRoom(ctx, W, H, benchY, {});
    const R = Math.min(H * 0.4, W * 0.27), cx = W * 0.42, cy = H * 0.47;
    AP.steel(ctx, cx - 5 * s, cy + R * 0.6, 10 * s, benchY - cy - R * 0.6, -6);
    AP.steel(ctx, cx - 50 * s, benchY - 8 * s, 100 * s, 8 * s, -10);
    AP.protractor(ctx, cx, cy, R);
    noteC(ctx, "rgb(222,226,232)", cx - R * 0.7, cy - R * 0.7, R * 1.4, R * 1.4);
    const gr = R * 0.66;
    AP.semiCircleGlass(ctx, cx, cy, gr);
    const tn = clamp((n1 - 1.1) / 1.3, 0, 1);
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx - gr, cy); ctx.arc(cx, cy, gr, 0, Math.PI, false); ctx.closePath();
    ctx.fillStyle = `rgba(80,140,220,${(0.05 + 0.32 * tn).toFixed(3)})`; ctx.fill(); ctx.restore();
    D.line(ctx, cx, cy - R * 0.95, cx, cy + R * 0.95, "rgba(40,48,60,0.6)", 1, [5, 4]);
    const th = rad(thDeg), ri = R * 0.9, tc = rad(thC);
    D.line(ctx, cx, cy, cx - ri * Math.sin(tc), cy + ri * Math.cos(tc), "rgba(230,140,30,0.9)", 1.2, [3, 3]);
    D.text(ctx, "θc", cx - ri * 0.86 * Math.sin(tc) + 8 * s, cy + ri * 0.86 * Math.cos(tc) + 4, { color: "rgb(200,110,20)", size: 10.5, weight: "700" });
    const P0 = { x: cx - ri * Math.sin(th), y: cy + ri * Math.cos(th) };
    const beam = (x1, y1, x2, y2, a) => {
      ctx.save(); ctx.strokeStyle = `rgba(255,46,36,${a})`; ctx.lineWidth = 2.4 * s; ctx.shadowColor = "rgba(255,40,30,0.9)"; ctx.shadowBlur = 8 * a;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
    };
    beam(P0.x, P0.y, cx, cy, 0.95);
    const sin2 = n1 * Math.sin(th), tir = sin2 >= 1;
    if (!tir) { const t2 = Math.asin(sin2); beam(cx, cy, cx + ri * Math.sin(t2), cy - ri * Math.cos(t2), 0.9); D.text(ctx, "折射 " + PL.fmt(t2 * 180 / Math.PI, 0) + "°", cx + ri * 0.55 * Math.sin(t2) + 8 * s, cy - ri * 0.55 * Math.cos(t2), { color: "rgb(200,40,30)", size: 10.5, weight: "700" }); }
    beam(cx, cy, cx + ri * Math.sin(th), cy + ri * Math.cos(th), tir ? 0.95 : 0.3);
    AP.laser(ctx, P0.x, P0.y, Math.atan2(cy - P0.y, cx - P0.x), { len: 42 * s });
    D.text(ctx, "入射 " + PL.fmt(thDeg, 0) + "°", cx - ri * 0.72 * Math.sin(th) - 10 * s, cy + ri * 0.72 * Math.cos(th) - 6 * s, { color: "rgb(200,40,30)", size: 10.5, align: "right", weight: "700" });
    D.text(ctx, "空氣", cx + R * 0.46, cy - R * 0.2, { color: "rgba(40,48,60,0.75)", size: 10 });
    const mats = [["水", 1.33], ["玻璃", 1.5], ["鑽石", 2.42]];
    const mt = mats.find(q => Math.abs(q[1] - n1) < 0.04);
    D.text(ctx, (mt ? mt[0] : "透明介質") + "  n = " + PL.fmt(n1, 2), cx + R * 0.34, cy + gr * 0.5, { color: "rgba(30,60,110,0.85)", size: 10.5, align: "center", weight: "700" });
    const tx = W * 0.76;
    D.text(ctx, "臨界角 θc = " + PL.fmt(thC, 1) + "°", tx, H * 0.3, { color: PL.col("text"), size: 13, align: "center", weight: "700" });
    D.text(ctx, "sin θc = 1 / n", tx, H * 0.3 + 20, { color: PL.col("text-dim"), size: 11, align: "center" });
    D.text(ctx, tir ? "全反射！光完全留在玻璃裡" : "還沒超過臨界角：光可以折射出去", tx, H * 0.3 + 46, { color: tir ? PL.col("danger") : c, size: 12, align: "center", weight: "700" });
    fillPill(ctx, 18, 18, "臨界角 θc", PL.fmt(thC, 1) + "°", 110, c);
  };

  /* 平行玻璃磚：插針法描光路（俯視，桌上一張白紙） */
  SC["refraction-slab"] = k => {
    const { ctx, W, H, a: tmm, b: thDeg, s, c, v: dmm } = k;
    AP.circuitBoard(ctx, W, H, true);
    const n = 1.5, th = rad(thDeg), r2 = Math.asin(Math.sin(th) / n);
    const pxmm = Math.min(5.2 * s, (H * 0.44) / 30), T = tmm * pxmm;
    const bw = Math.min(W * 0.62, 470 * s), bx = W * 0.5 - bw / 2, by = H * 0.52 - T / 2;
    const gg = ctx.createLinearGradient(bx, by, bx, by + T);
    gg.addColorStop(0, "rgba(160,214,234,0.6)"); gg.addColorStop(0.5, "rgba(210,238,248,0.45)"); gg.addColorStop(1, "rgba(146,200,224,0.6)");
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(bx + 3, by + 4, bw, T);
    ctx.fillStyle = gg; ctx.fillRect(bx, by, bw, T);
    ctx.strokeStyle = "rgba(50,100,134,0.85)"; ctx.lineWidth = 1.6; ctx.strokeRect(bx, by, bw, T);
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.fillRect(bx + 4, by + 2, bw - 8, 1.4);
    const ex = W * 0.4, Lr = Math.min(H * 0.3, 150 * s);
    const inS = { x: ex - Lr * Math.sin(th), y: by - Lr * Math.cos(th) };
    const exX = ex + T * Math.tan(r2), outE = { x: exX + Lr * Math.sin(th), y: by + T + Lr * Math.cos(th) };
    const ink = "rgba(40,50,64,0.6)";
    [ex, exX].forEach((x, i) => { const y0 = i ? by + T : by; D.line(ctx, x, y0 - 44 * s, x, y0 + 44 * s, ink, 1, [4, 4]); });
    D.line(ctx, ex, by, ex + (T + Lr * 0.8) * Math.tan(th), by + T + Lr * 0.8, "rgba(200,60,50,0.45)", 1.2, [5, 4]);
    const ray = (a, b2) => { ctx.save(); ctx.strokeStyle = "rgba(230,40,32,0.95)"; ctx.lineWidth = 2 * s; ctx.shadowColor = "rgba(255,40,30,0.6)"; ctx.shadowBlur = 5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.stroke(); ctx.restore(); };
    ray(inS, { x: ex, y: by }); ray({ x: ex, y: by }, { x: exX, y: by + T }); ray({ x: exX, y: by + T }, outE);
    AP.laser(ctx, inS.x, inS.y, Math.atan2(Math.cos(th), Math.sin(th)), { len: 38 * s });
    const pin = (x, y, col) => {
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(x + 2, y + 2, 4 * s, 2.5 * s, 0, 0, PL.TAU); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 3.8 * s, 0, PL.TAU); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.arc(x - 1, y - 1, 1.1 * s, 0, PL.TAU); ctx.fill();
    };
    [0.3, 0.72].forEach(u => pin(inS.x + (ex - inS.x) * u, inS.y + (by - inS.y) * u, "rgb(214,60,52)"));
    [0.35, 0.8].forEach(u => pin(exX + (outE.x - exX) * u, by + T + (outE.y - by - T) * u, "rgb(52,110,200)"));
    const ux = Math.sin(th), uy = Math.cos(th), wx = exX - ex, wy = T, pr = wx * ux + wy * uy;
    const foot = { x: ex + pr * ux, y: by + pr * uy };
    if (Math.hypot(foot.x - exX, foot.y - by - T) > 2) {
      ctx.save(); ctx.strokeStyle = "rgb(30,140,90)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(exX, by + T); ctx.lineTo(foot.x, foot.y); ctx.stroke(); ctx.restore();
      D.text(ctx, "d", (exX + foot.x) / 2 + 8, (by + T + foot.y) / 2 + 12, { color: "rgb(30,130,80)", size: 13, weight: "700" });
    }
    ctx.save(); ctx.strokeStyle = "rgba(200,110,20,0.9)"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(ex, by, 24 * s, -Math.PI / 2 - th, -Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(ex, by, 20 * s, Math.PI / 2 - r2, Math.PI / 2); ctx.stroke(); ctx.restore();
    D.text(ctx, "θ", ex - 30 * s * Math.sin(th / 2) - 4, by - 30 * s * Math.cos(th / 2), { color: "rgb(190,100,20)", size: 11, weight: "700" });
    if (T > 18 * s) D.text(ctx, "r", ex + 26 * s * Math.sin(r2 / 2) + 2, by + 26 * s * Math.cos(r2 / 2) + 4, { color: "rgb(190,100,20)", size: 11, weight: "700" });
    D.arrow(ctx, bx + bw + 14 * s, by + T / 2, bx + bw + 14 * s, by, { color: "rgba(40,50,64,0.8)", width: 1.4, head: 6 });
    D.arrow(ctx, bx + bw + 14 * s, by + T / 2, bx + bw + 14 * s, by + T, { color: "rgba(40,50,64,0.8)", width: 1.4, head: 6 });
    D.text(ctx, "t = " + PL.fmt(tmm, 0) + " mm", bx + bw + 20 * s, by + T / 2 + 4, { color: "rgba(30,40,54,0.9)", size: 11, weight: "700" });
    D.text(ctx, "玻璃磚（n = 1.50）", bx + bw - 8, by - 8, { color: "rgba(30,70,100,0.9)", size: 10.5, align: "right" });
    D.text(ctx, "入射光與出射光平行，只側移 d", W - 26 * s, H - 30 * s, { color: "rgba(30,40,54,0.85)", size: 11, align: "right" });
    fillPill(ctx, 20, 20, "側向位移 d", PL.fmt(dmm, 2) + " mm", 118, c);
  };

  /* 折射望遠鏡：腳架上的望遠鏡對準月亮，右邊是目鏡中看到的放大影像 */
  SC["optical-instruments"] = k => {
    const { ctx, W, H, a: fo, b: fe, t, s, c, v: M } = k;
    const gy = H * 0.86, L = isL();
    AP.outdoor(ctx, W, H, gy, { t, sun: false, hills: true, city: true });
    const mX = W * 0.46, mY = H * 0.13, mR = 12 * s;
    AP.moonBall(ctx, mX, mY, mR, L ? [236, 236, 228] : [226, 226, 216]);
    const tx = W * 0.17, headY = gy - 116 * s;
    ctx.strokeStyle = "rgb(58,62,70)"; ctx.lineWidth = 4 * s; ctx.lineCap = "round";
    [[-36, 0], [32, 0], [4, 10]].forEach(l => { ctx.beginPath(); ctx.moveTo(tx, headY + 8 * s); ctx.lineTo(tx + l[0] * s, gy + l[1] * s * 0.2); ctx.stroke(); });
    const elev = Math.atan2(headY - mY, mX - tx);
    const len = clamp(46 + (fo + fe) / 1680 * 300, 60, 340) * s, ro = (8 + 6 * fr(fo, k.cfg.a)) * s;
    ctx.save(); ctx.translate(tx, headY); ctx.rotate(-elev);
    const tg = ctx.createLinearGradient(0, -ro, 0, ro);
    tg.addColorStop(0, "rgb(236,238,242)"); tg.addColorStop(0.45, "rgb(250,250,252)"); tg.addColorStop(1, "rgb(170,176,188)");
    ctx.fillStyle = tg; ctx.fillRect(-len * 0.28, -ro * 0.8, len, ro * 1.6);
    ctx.fillRect(len * 0.62, -ro, len * 0.12, ro * 2);
    ctx.fillStyle = "rgb(40,44,52)"; ctx.fillRect(len * 0.72, -ro * 1.04, 4 * s, ro * 2.08);
    ctx.fillStyle = "rgba(120,180,230,0.8)"; ctx.fillRect(len * 0.72 + 3 * s, -ro * 0.9, 2 * s, ro * 1.8);
    ctx.fillStyle = "rgb(40,44,52)"; ctx.fillRect(-len * 0.28 - 16 * s, -ro * 0.36, 16 * s, ro * 0.72);
    ctx.fillRect(-len * 0.1, ro * 0.8, 10 * s, 5 * s);
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1; ctx.strokeRect(-len * 0.28, -ro * 0.8, len, ro * 1.6);
    ctx.restore();
    AP.steel(ctx, tx - 9 * s, headY - 4 * s, 18 * s, 14 * s, 6);
    D.text(ctx, "物鏡", tx + Math.cos(elev) * len * 0.74, headY - Math.sin(elev) * len * 0.74 - ro - 8 * s, { color: PL.col("text"), size: 10, align: "center" });
    D.text(ctx, "目鏡", tx - Math.cos(elev) * (len * 0.28 + 16 * s) - 10 * s, headY + Math.sin(elev) * (len * 0.28 + 16 * s) + 4, { color: PL.col("text"), size: 10, align: "right" });
    // 目鏡視野
    const vr = Math.min(H * 0.22, W * 0.16), vx = W - vr - 28 * s, vy = 22 * s + vr;
    ctx.save();
    ctx.beginPath(); ctx.arc(vx, vy, vr, 0, PL.TAU); ctx.fillStyle = "rgb(6,10,22)"; ctx.fill();
    noteC(ctx, "rgb(6,10,22)", vx - vr * 0.7, vy - vr * 0.7, vr * 1.4, vr * 1.4);
    ctx.clip();
    const mr = vr * clamp(0.06 * Math.pow(M, 0.6), 0.045, 2.4);
    AP.moonBall(ctx, vx + vr * 0.1, vy - vr * 0.05, mr, [226, 226, 214]);
    ctx.restore();
    ctx.strokeStyle = "rgb(40,44,52)"; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.arc(vx, vy, vr + 3 * s, 0, PL.TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(vx, vy, vr + 6.5 * s, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    D.text(ctx, "目鏡視野（放大 " + PL.fmt(M, 0) + " 倍）", vx, vy + vr * 0.66, { color: "rgb(220,228,240)", size: 10, align: "center", weight: "700" });
    // 光路小卡
    const cw = Math.min(W * 0.5, 380 * s), chh = Math.min(H * 0.25, 118 * s), cx0 = W - cw - 14 * s, cy0 = gy - chh - 8 * s;
    AP.infoCard(ctx, cx0, cy0, cw, chh);
    const ax = cy0 + chh * 0.55, x1 = cx0 + 30 * s, span = cw - 70 * s;
    const foPx = span * fo / (fo + fe), fePx = span - foPx, xF = x1 + foPx, x2 = x1 + span;
    D.line(ctx, cx0 + 10, ax, cx0 + cw - 10, ax, PL.theme.pale(0.4), 1, [3, 3]);
    const al = 0.05, yImg = ax - foPx * Math.tan(al);
    ctx.save(); ctx.strokeStyle = "rgba(230,120,30,0.9)"; ctx.lineWidth = 1.3;
    [-12, 0, 12].forEach(h0 => {
      const y1 = ax + h0 * s, y0 = y1 + 22 * s * Math.tan(al);
      const y2 = yImg + (yImg - y1) / Math.max(1, foPx) * fePx;
      ctx.beginPath(); ctx.moveTo(x1 - 22 * s, y0); ctx.lineTo(x1, y1); ctx.lineTo(xF, yImg); ctx.lineTo(x2, y2);
      const be = Math.atan(Math.min(1.2, Math.tan(al) * M)); ctx.lineTo(x2 + 26 * s, y2 - 26 * s * Math.tan(be)); ctx.stroke();
    });
    ctx.restore();
    [[x1, 24 * s, "#5aa0d8"], [x2, 14 * s, "#5aa0d8"]].forEach(q => { ctx.fillStyle = "rgba(120,190,240,0.55)"; ctx.beginPath(); ctx.ellipse(q[0], ax, 3.5 * s, q[1], 0, 0, PL.TAU); ctx.fill(); ctx.strokeStyle = "rgba(40,100,160,0.8)"; ctx.lineWidth = 1; ctx.stroke(); });
    D.text(ctx, "fₒ", (x1 + xF) / 2, cy0 + chh - 8, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    D.text(ctx, "fₑ", (xF + x2) / 2, cy0 + chh - 8, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    D.line(ctx, xF, ax - 4, xF, ax + 4, PL.col("text"), 1.2);
    D.text(ctx, "光路：M = fₒ / fₑ", cx0 + 10, cy0 + 15, { color: PL.col("text-dim"), size: 10 });
    fillPill(ctx, 18, 18, "角放大率 M", PL.fmt(M, 1) + " 倍", 110, c);
  };

  /* 基爾霍夫電流定律：桌上的並聯電路，三個安培計同時讀 */
  SC["kirchhoff"] = k => {
    const { ctx, W, H, a: V, b: R, t, s, c } = k;
    AP.circuitBoard(ctx, W, H, false);
    const I2 = V / R, I1 = 2 * I2, rng = niceCeil(I1);
    const Lx = W * 0.13, T = H * 0.22, B = H * 0.8, mid = (T + B) / 2, xa = W * 0.55, xb = W * 0.86;
    const red = "rgb(186,54,48)", blk = "rgb(40,44,52)";
    AP.cable(ctx, [{ x: Lx, y: mid - 36 * s }, { x: Lx, y: T }, { x: xa, y: T }], red, 3.2 * s, 3);
    AP.cable(ctx, [{ x: xa, y: T }, { x: xb, y: T }, { x: xb, y: B }, { x: xa, y: B }], red, 3.2 * s, 3);
    AP.cable(ctx, [{ x: xa, y: T }, { x: xa, y: B }], red, 3.2 * s, 0);
    AP.cable(ctx, [{ x: xa, y: B }, { x: Lx, y: B }, { x: Lx, y: mid + 36 * s }], blk, 3.2 * s, 3);
    const sp = I => Math.min(170, 26 * I) * s;
    AP.flowDots(ctx, [{ x: Lx, y: mid - 36 * s }, { x: Lx, y: T }, { x: xa, y: T }], t, sp(I1));
    AP.flowDots(ctx, [{ x: xa, y: T }, { x: xa, y: B }], t, sp(I2));
    AP.flowDots(ctx, [{ x: xa, y: T }, { x: xb, y: T }, { x: xb, y: B }, { x: xa, y: B }], t, sp(I2));
    AP.flowDots(ctx, [{ x: xa, y: B }, { x: Lx, y: B }, { x: Lx, y: mid + 36 * s }], t, sp(I1));
    ctx.save(); ctx.translate(Lx, mid); ctx.rotate(Math.PI / 2); AP.battery(ctx, -34 * s, -22 * s, 68 * s, 44 * s); ctx.restore();
    AP.valueChip(ctx, Lx + 28 * s, mid - 9, PL.fmt(V, 1) + " V", "rgba(120,190,255,0.95)");
    AP.knifeSwitch(ctx, (Lx + xa) / 2, B + 3 * s, 46 * s, 0);
    [[xa, "R"], [xb, "R"]].forEach(q => { AP.resistorBox(ctx, q[0], T + (B - T) * 0.33, 50 * s, null, true); AP.valueChip(ctx, q[0] + 16 * s, T + (B - T) * 0.33 - 8, PL.fmt(R, 0) + " Ω", "rgba(255,200,110,0.95)"); });
    const meters = [[(Lx + xa) / 2, T, I1, "I₁"], [xa, T + (B - T) * 0.7, I2, "I₂"], [xb, T + (B - T) * 0.7, I2, "I₃"]];
    meters.forEach(q => {
      AP.dial(ctx, q[0], q[1], 24 * s, q[2] / rng, { max: rng, unit: "A" });
      AP.valueChip(ctx, q[0] + 30 * s, q[1] - 30 * s, q[3] + " = " + PL.fmt(q[2], 2) + " A", "rgba(126,222,190,0.95)");
    });
    [[xa, T], [xa, B]].forEach(p => AP.brassDisc(ctx, p[0], p[1], 5 * s));
    D.text(ctx, "節點 P", xa + 10 * s, T + 20 * s, { color: PL.col("text"), size: 11, weight: "700" });
    D.text(ctx, "I₁ = I₂ + I₃  →  " + PL.fmt(I1, 2) + " = " + PL.fmt(I2, 2) + " + " + PL.fmt(I2, 2) + "（A）", W / 2, H - 14 * s, { color: PL.col("text"), size: 12, align: "center", weight: "700" });
    fillPill(ctx, 18, 18, "支路電流 I₂ = V/R", PL.fmt(I2, 2) + " A", 130, c);
  };

  /* 電表負載效應：伏特計並聯上去，會分走一部分電流 */
  SC["meter-loading"] = k => {
    const { ctx, W, H, a: R, b: Rv, t, s, c, v: err } = k;
    AP.circuitBoard(ctx, W, H, false);
    const Lx = W * 0.12, T = H * 0.26, B = H * 0.8, mid = (T + B) / 2, xr = W * 0.52, xm = W * 0.78;
    const red = "rgb(186,54,48)", blk = "rgb(40,44,52)", blue = "rgb(58,96,168)";
    AP.cable(ctx, [{ x: Lx, y: mid - 36 * s }, { x: Lx, y: T }, { x: xr, y: T }, { x: xr, y: B }, { x: Lx, y: B }, { x: Lx, y: mid + 36 * s }], red, 3.2 * s, 3);
    const fracV = R / (R + Rv), sp = 60 * s;
    AP.flowDots(ctx, [{ x: Lx, y: mid - 36 * s }, { x: Lx, y: T }, { x: xr, y: T }, { x: xr, y: B }, { x: Lx, y: B }, { x: Lx, y: mid + 36 * s }], t, sp * (1 - fracV * 0.5));
    ctx.save(); ctx.translate(Lx, mid); ctx.rotate(Math.PI / 2); AP.battery(ctx, -34 * s, -22 * s, 68 * s, 44 * s); ctx.restore();
    AP.valueChip(ctx, Lx + 28 * s, mid - 9, "12 V", "rgba(120,190,255,0.95)");
    AP.resistorBox(ctx, (Lx + xr) / 2, T, 56 * s, null, false);
    D.text(ctx, "串聯電阻（同為 R）", (Lx + xr) / 2, T - 16 * s, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    AP.resistorBox(ctx, xr, mid, 56 * s, null, true);
    AP.valueChip(ctx, xr + 16 * s, mid - 8, "待測 R = " + PL.fmt(R, 0) + " Ω", "rgba(255,200,110,0.95)");
    const vTrue = 6, vMeas = vTrue * (1 - err / 100);
    const posts = AP.dial(ctx, xm, mid, 40 * s, vMeas / 10, { max: 10, unit: "V", ghost: vTrue / 10 });
    const rr = 40 * s, ry = mid + rr * 1.25;
    AP.cable(ctx, [{ x: xr, y: T + 20 * s }, { x: xm + rr * 1.5, y: T + 20 * s }, { x: xm + rr * 1.5, y: ry }, { x: posts.red.x, y: ry }, posts.red], red, 2.4 * s, 3);
    AP.cable(ctx, [{ x: xr, y: B - 20 * s }, { x: posts.black.x, y: B - 20 * s }, posts.black], blue, 2.4 * s, 3);
    AP.flowDots(ctx, [{ x: xr, y: T + 20 * s }, { x: xm + rr * 1.5, y: T + 20 * s }, { x: xm + rr * 1.5, y: ry }, { x: posts.red.x, y: ry }, posts.red], t, sp * 1.6 * fracV + 4, { color: "rgba(140,210,255,0.95)" });
    D.text(ctx, "伏特計內阻 " + PL.fmt(Rv / 1000, 1) + " kΩ", xm, mid + rr * 1.25 + 18 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    D.text(ctx, "▲ 綠：真實電壓 " + PL.fmt(vTrue, 2) + " V", xm, mid - rr - 24 * s, { color: "rgb(30,140,80)", size: 10.5, align: "center", weight: "700" });
    D.text(ctx, "指針讀數 " + PL.fmt(vMeas, 2) + " V", xm, mid - rr - 9 * s, { color: "rgb(200,50,40)", size: 10.5, align: "center", weight: "700" });
    D.text(ctx, "內阻越大，分走的電流越少，讀數越接近真實值", W / 2, H - 12 * s, { color: PL.col("text"), size: 11, align: "center" });
    fillPill(ctx, 18, 18, "並聯量測誤差", PL.fmt(err, 2) + " %", 118, c);
  };

  /* 靜電屏蔽：平行帶電板之間放一個金屬籠 */
  SC["electrostatic-shield"] = k => {
    const { ctx, W, H, a: E, b: th, t, s, c } = k;
    const benchY = H * 0.88;
    AP.labRoom(ctx, W, H, benchY, {});
    const pT = H * 0.16, pB = benchY - 34 * s, pL = W * 0.13, pR = W * 0.87, pw = 10 * s;
    [[pL - pw, "+"], [pR, "−"]].forEach(q => {
      AP.steel(ctx, q[0], pT, pw, pB - pT, 6);
      ctx.fillStyle = "rgb(240,238,230)"; ctx.fillRect(q[0] + pw / 2 - 5 * s, pB, 10 * s, benchY - pB);
      ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1; for (let y = pB + 4; y < benchY; y += 6 * s) { ctx.beginPath(); ctx.moveTo(q[0] + pw / 2 - 5 * s, y); ctx.lineTo(q[0] + pw / 2 + 5 * s, y); ctx.stroke(); }
    });
    const nQ = 3 + Math.round(6 * fr(E, k.cfg.a));
    for (let i = 0; i < nQ; i++) {
      const y = pT + 14 * s + (pB - pT - 28 * s) * (i + 0.5) / nQ;
      D.text(ctx, "+", pL + 8 * s, y + 4, { color: "rgb(220,60,50)", size: 13, align: "center", weight: "700" });
      D.text(ctx, "−", pR - 8 * s, y + 4, { color: "rgb(50,100,210)", size: 13, align: "center", weight: "700" });
    }
    const thk = (3 + 16 * fr(th, k.cfg.b)) * s, cL = W * 0.42, cR = W * 0.64, cT = pT + 34 * s, cB = pB - 4 * s;
    const nLines = 3 + Math.round(4 * fr(E, k.cfg.a)), al = 14 * s + 18 * s * fr(E, k.cfg.a);
    for (let i = 0; i < nLines; i++) {
      const y = pT + 18 * s + (pB - pT - 36 * s) * (i + 0.5) / nLines;
      const inside = y > cT && y < cB;
      if (inside) {
        D.arrow(ctx, pL + 18 * s, y, cL - 4 * s, y, { color: PL.col("accent-2"), width: 1.5, head: 7 });
        D.arrow(ctx, cR + 6 * s, y, pR - 18 * s, y, { color: PL.col("accent-2"), width: 1.5, head: 7 });
      } else D.arrow(ctx, pL + 18 * s, y, pR - 18 * s, y, { color: PL.col("accent-2"), width: 1.5, head: 7 });
    }
    // 金屬網籠
    const mesh = (x, y, w, h) => {
      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, "rgb(120,128,140)"); g.addColorStop(0.5, "rgb(186,194,206)"); g.addColorStop(1, "rgb(110,118,130)");
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(40,46,56,0.45)"; ctx.lineWidth = 0.8;
      for (let yy = y + 4; yy < y + h; yy += 6) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
    };
    const L = isL();
    ctx.fillStyle = L ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.04)"; ctx.fillRect(cL, cT, cR - cL, cB - cT);
    mesh(cL, cT, thk, cB - cT); mesh(cR - thk, cT, thk, cB - cT); mesh(cL, cT, cR - cL, thk); mesh(cL, cB - thk, cR - cL, thk);
    for (let i = 0; i < nQ; i++) {
      const y = cT + 14 * s + (cB - cT - 28 * s) * (i + 0.5) / nQ;
      D.text(ctx, "−", cL - 8 * s, y + 4, { color: "rgb(50,100,210)", size: 12, align: "center", weight: "700" });
      D.text(ctx, "+", cR + 8 * s, y + 4, { color: "rgb(220,60,50)", size: 12, align: "center", weight: "700" });
    }
    AP.electroscope(ctx, (cL + cR) / 2, cB - thk, 0.72 * s, 0.03);
    D.text(ctx, "籠內 E = 0", (cL + cR) / 2, cT + thk + 18 * s, { color: PL.col("ok"), size: 12.5, align: "center", weight: "700" });
    D.text(ctx, "金箔不張開", (cL + cR) / 2, cT + thk + 34 * s, { color: PL.col("text-dim"), size: 10, align: "center" });
    // 籠外的紙條被吸過去
    const gx = (pL + cL) / 2, gy0 = cT + 6 * s, ang = 0.08 + 0.7 * fr(E, k.cfg.a) + Math.sin(t * 3) * 0.03;
    AP.steel(ctx, gx - 2 * s, gy0 - 4 * s, 4 * s, 6 * s, 10);
    ctx.save(); ctx.translate(gx, gy0); ctx.rotate(ang);
    ctx.fillStyle = "rgb(250,248,240)"; ctx.fillRect(-4 * s, 0, 8 * s, 48 * s); ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.strokeRect(-4 * s, 0, 8 * s, 48 * s); ctx.restore();
    D.text(ctx, "籠外紙條被吸偏", gx, pB + 16 * s, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    D.text(ctx, "殼厚 " + PL.fmt(th, 1) + " mm", cR - 2, cB + 16 * s, { color: PL.col("text-dim"), size: 10, align: "right" });
    AP.lcd(ctx, W / 2 - 64 * s, 12, 128 * s, 22 * s, "E外 = " + PL.fmt(E, 0) + " V/m", { color: "rgb(130,210,255)", size: 12 * s });
    fillPill(ctx, 18, 18, "殼內場強", "0 V/m", 104, c);
  };

  /* 安培力（斜視圖）：磁鐵之間的銅棒，和磁場夾角 θ */
  SC["ampere-force"] = k => {
    const { ctx, W, H, a: I, b: th, t, s, c, v: F } = k;
    AP.deskTop(ctx, 0, 0, W, H);
    const sc = Math.min(W / 800, H / 464) * 1.05, P = oblique(W * 0.44, H * 0.72, sc);
    const zR = 48, thr = rad(th);
    obBox(ctx, P, -210, 210, 70, 100, 0, 30, "rgb(150,158,170)", "rgb(116,124,136)", "rgb(96,104,116)");
    obBox(ctx, P, -210, -130, -70, 70, 0, 96, "rgb(236,120,114)", "rgb(206,64,58)", "rgb(170,44,40)");
    const nf = P(-130, 0, 60); D.text(ctx, "N", nf.x + 6, nf.y + 6, { color: "#fff", size: 16, align: "center", weight: "700" });
    for (let yy = -40; yy <= 40; yy += 40) {
      const a = P(-124, yy, zR), b = P(124, yy, zR);
      D.arrow(ctx, a.x, a.y, b.x, b.y, { color: "rgba(160,110,230,0.8)", width: 1.6, head: 8 });
    }
    const bl = P(80, -60, zR); D.text(ctx, "B", bl.x, bl.y - 6, { color: "rgb(150,90,220)", size: 13, weight: "700" });
    const Lr = 80, e1 = { x: -Lr * Math.cos(thr), y: -Lr * Math.sin(thr) }, e2 = { x: Lr * Math.cos(thr), y: Lr * Math.sin(thr) };
    const A1 = P(e1.x, e1.y, zR), A2 = P(e2.x, e2.y, zR), O = P(0, 0, zR);
    const ps = AP.powerSupply(ctx, W - 170 * s, 16 * s, 150 * s, 64 * s, PL.fmt(I, 1) + " A", { label: "DC 電源", knob: fr(I, k.cfg.a) });
    AP.cable(ctx, [A1, { x: A1.x - 30 * s, y: A1.y - 90 * s }, ps.black], "rgb(40,44,52)", 2.4 * s, 10);
    AP.cable(ctx, [A2, { x: A2.x + 20 * s, y: A2.y - 60 * s }, ps.red], "rgb(186,54,48)", 2.4 * s, 10);
    ctx.save(); ctx.lineCap = "round";
    ctx.strokeStyle = "rgb(120,70,30)"; ctx.lineWidth = 9 * sc; ctx.beginPath(); ctx.moveTo(A1.x, A1.y + 1); ctx.lineTo(A2.x, A2.y + 1); ctx.stroke();
    ctx.strokeStyle = "rgb(214,140,70)"; ctx.lineWidth = 7 * sc; ctx.beginPath(); ctx.moveTo(A1.x, A1.y); ctx.lineTo(A2.x, A2.y); ctx.stroke();
    ctx.strokeStyle = "rgba(255,226,180,0.7)"; ctx.lineWidth = 2 * sc; ctx.beginPath(); ctx.moveTo(A1.x, A1.y - 2); ctx.lineTo(A2.x, A2.y - 2); ctx.stroke();
    ctx.restore();
    AP.flowDots(ctx, [A2, A1], t, (14 + 12 * I) * s, { color: "rgba(255,240,150,0.95)", r: 1.8 * s });
    const arc = [];
    for (let i = 0; i <= 16; i++) { const a = thr * i / 16; arc.push(P(34 * Math.cos(a), 34 * Math.sin(a), zR)); }
    ctx.strokeStyle = "rgba(240,160,40,0.95)"; ctx.lineWidth = 1.6; ctx.beginPath(); arc.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    const am = P(44 * Math.cos(thr / 2), 44 * Math.sin(thr / 2), zR);
    D.text(ctx, "θ", am.x + 4, am.y + 4, { color: "rgb(220,130,20)", size: 12, weight: "700" });
    obBox(ctx, P, 130, 210, -70, 70, 0, 96, "rgb(130,164,220)", "rgb(62,100,170)", "rgb(44,78,140)");
    const sf = P(170, -70, 60); D.text(ctx, "S", sf.x, sf.y + 6, { color: "#fff", size: 16, align: "center", weight: "700" });
    const fl = Math.min(118, (18 + 9.5 * I) * Math.abs(Math.sin(thr))) * sc;
    if (fl > 3) D.arrow(ctx, O.x, O.y, O.x, O.y - fl, { color: PL.col("danger"), width: 3.2, label: "F", lsize: 13 });
    else D.text(ctx, "F = 0（導線與磁場平行）", O.x, O.y - 18 * s, { color: PL.col("danger"), size: 11.5, align: "center", weight: "700" });
    D.text(ctx, "F = BIL sinθ，方向垂直於導線與磁場", W * 0.44, H - 16 * s, { color: PL.col("text"), size: 11.5, align: "center", weight: "700" });
    fillPill(ctx, 18, 18, "相對安培力", PL.fmt(F, 2), 110, c);
  };

  /* 動生電動勢（俯視）：推導體棒在磁場中的導軌上滑動，燈泡亮起 */
  SC["motional-emf"] = k => {
    const { ctx, W, H, a: v, b: B, t, s, c, v: emf } = k;
    AP.deskTop(ctx, 0, 0, W, H);
    const fx0 = W * 0.28, fx1 = W * 0.94, fy0 = H * 0.16, fy1 = H * 0.86;
    const pg = ctx.createLinearGradient(fx0, fy0, fx1, fy1);
    pg.addColorStop(0, "rgb(96,104,118)"); pg.addColorStop(1, "rgb(60,66,78)");
    ctx.fillStyle = "rgba(0,0,0,0.2)"; AP.rrPath(ctx, fx0 + 4, fy0 + 5, fx1 - fx0, fy1 - fy0, 12); ctx.fill();
    AP.rrPath(ctx, fx0, fy0, fx1 - fx0, fy1 - fy0, 12); ctx.fillStyle = pg; ctx.fill();
    noteC(ctx, "rgb(78,86,98)", fx0, fy0, fx1 - fx0, fy1 - fy0);
    const nb = fr(B, k.cfg.b), xs = (4 + 5 * nb) * s;
    ctx.strokeStyle = `rgba(210,170,255,${(0.35 + 0.55 * nb).toFixed(2)})`; ctx.lineWidth = 1.2 + nb * 1.3;
    for (let x = fx0 + 22 * s; x < fx1 - 10; x += 34 * s) for (let y = fy0 + 20 * s; y < fy1 - 10; y += 34 * s) {
      ctx.beginPath(); ctx.moveTo(x - xs, y - xs); ctx.lineTo(x + xs, y + xs); ctx.moveTo(x + xs, y - xs); ctx.lineTo(x - xs, y + xs); ctx.stroke();
    }
    D.text(ctx, "磁場 B（× 穿入桌面）= " + PL.fmt(B, 2) + " T", fx1 - 10, fy1 - 10, { color: "rgb(230,210,255)", size: 11, align: "right", weight: "700" });
    const ry1 = H * 0.3, ry2 = H * 0.72, rx0 = W * 0.1, rx1 = W * 0.97;
    [ry1, ry2].forEach(y => {
      const g = ctx.createLinearGradient(0, y - 4 * s, 0, y + 4 * s);
      g.addColorStop(0, "rgb(236,170,110)"); g.addColorStop(0.5, "rgb(200,124,60)"); g.addColorStop(1, "rgb(140,80,34)");
      ctx.fillStyle = g; ctx.fillRect(rx0, y - 4 * s, rx1 - rx0, 8 * s);
    });
    const bxl = rx0, bmid = (ry1 + ry2) / 2;
    AP.cable(ctx, [{ x: rx0, y: ry1 }, { x: rx0 - 26 * s, y: ry1 }, { x: rx0 - 26 * s, y: bmid - 26 * s }], "rgb(186,54,48)", 2.6 * s, 0);
    AP.cable(ctx, [{ x: rx0 - 26 * s, y: bmid + 16 * s }, { x: rx0 - 26 * s, y: ry2 }, { x: rx0, y: ry2 }], "rgb(40,44,52)", 2.6 * s, 0);
    const bright = clamp(emf / 10, 0, 1);
    AP.bulb(ctx, rx0 - 26 * s, bmid - 8 * s, 14 * s, bright);
    const span = rx1 - 40 * s - (fx0 + 30 * s), vpx = (10 + v * 22) * s;
    const Pd = span / vpx + 0.6, tau = t % Pd, xr = fx0 + 30 * s + Math.min(span, vpx * tau);
    const moving = vpx * tau < span;
    if (moving) AP.flowDots(ctx, [{ x: xr, y: ry2 }, { x: xr, y: ry1 }, { x: bxl, y: ry1 }, { x: bxl - 26 * s, y: ry1 }, { x: bxl - 26 * s, y: ry2 }, { x: xr, y: ry2 }], t, 20 * s + 10 * emf * s, { color: "rgba(255,236,140,0.95)", r: 2 * s });
    const rg = ctx.createLinearGradient(xr - 6 * s, 0, xr + 6 * s, 0);
    rg.addColorStop(0, "rgb(120,128,140)"); rg.addColorStop(0.5, "rgb(226,232,240)"); rg.addColorStop(1, "rgb(110,118,130)");
    ctx.fillStyle = rg; AP.rrPath(ctx, xr - 6 * s, ry1 - 16 * s, 12 * s, ry2 - ry1 + 32 * s, 4 * s); ctx.fill();
    ctx.strokeStyle = "rgba(20,24,30,0.5)"; ctx.lineWidth = 1; ctx.stroke();
    if (moving) {
      AP.hand(ctx, xr - 7 * s, bmid, 1, 0.8 * s, { sleeve: "#d0643a" });
      D.arrow(ctx, xr + 14 * s, ry1 - 30 * s, xr + 14 * s + 26 * s + v * 3 * s, ry1 - 30 * s, { color: "rgb(255,200,90)", width: 2.8, label: "v", lsize: 13 });
      D.arrow(ctx, xr + 12 * s, bmid + 30 * s, xr + 12 * s, bmid - 20 * s, { color: "rgb(255,220,90)", width: 2, label: "I", lsize: 11 });
    }
    D.text(ctx, "ε = BLv = " + PL.fmt(emf, 2), rx0 - 26 * s, ry2 + 34 * s, { color: PL.col("text"), size: 12, weight: "700" });
    D.text(ctx, "L", rx1 - 18 * s, bmid + 4, { color: "rgb(255,210,160)", size: 12, weight: "700" });
    fillPill(ctx, 18, 18, "相對感應電壓", PL.fmt(emf, 2), 118, c);
  };

  /* 通電線圈受力矩（斜視圖）：兩磁極之間的線圈可繞鉛直軸轉動 */
  SC["coil-torque"] = k => {
    const { ctx, W, H, a: I, b: th, t, s, c, v: tq } = k;
    AP.deskTop(ctx, 0, 0, W, H);
    const sc = Math.min(W / 800, H / 464) * 0.95, P = oblique(W * 0.44, H * 0.8, sc);
    const phi = rad(th - 90), hw = 72, z0 = 44, z1 = 168, u = { x: Math.cos(phi), y: Math.sin(phi) };
    obBox(ctx, P, -230, -150, -80, 80, 0, 190, "rgb(236,120,114)", "rgb(206,64,58)", "rgb(170,44,40)");
    const nf = P(-150, -10, 110); D.text(ctx, "N", nf.x + 8, nf.y + 6, { color: "#fff", size: 17, align: "center", weight: "700" });
    for (let z = 70; z <= 150; z += 40) { const a = P(-144, -76, z), b = P(144, -76, z); D.arrow(ctx, a.x, a.y, b.x, b.y, { color: "rgba(160,110,230,0.55)", width: 1.3, head: 7 }); }
    obBox(ctx, P, 150, 230, -80, 80, 0, 190, "rgb(130,164,220)", "rgb(62,100,170)", "rgb(44,78,140)");
    const sf = P(190, -80, 110); D.text(ctx, "S", sf.x, sf.y + 6, { color: "#fff", size: 17, align: "center", weight: "700" });
    const ax0 = P(0, 0, 0), ax1 = P(0, 0, 200);
    AP.steel(ctx, ax0.x - 3, ax1.y, 6, ax0.y - ax1.y, 12);
    const cm = P(0, 0, 22); AP.brassDisc(ctx, cm.x, cm.y, 9 * sc);
    ctx.strokeStyle = "rgba(60,40,10,0.8)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cm.x, cm.y - 9 * sc); ctx.lineTo(cm.x, cm.y + 9 * sc); ctx.stroke();
    const corner = (sg, z) => P(sg * hw * u.x, sg * hw * u.y, z);
    const loop = [corner(-1, z0), corner(1, z0), corner(1, z1), corner(-1, z1)];
    ctx.save(); ctx.lineJoin = "round";
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = i === 2 ? "rgb(222,150,80)" : "rgb(170,100,44)"; ctx.lineWidth = 3 * sc;
      ctx.beginPath(); loop.forEach((p, j) => j ? ctx.lineTo(p.x + i * 1.5, p.y - i * 1.5) : ctx.moveTo(p.x + i * 1.5, p.y - i * 1.5)); ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
    AP.flowDots(ctx, [corner(-1, z0), corner(1, z0), corner(1, z1), corner(-1, z1), corner(-1, z0)], t, (12 + 10 * I) * s, { color: "rgba(255,240,150,0.95)", r: 1.8 * s });
    const fL = Math.min(90, 18 + 8.5 * I);
    [[1, 1], [-1, -1]].forEach(q => {
      const m0 = P(q[0] * hw * u.x, q[0] * hw * u.y, (z0 + z1) / 2), m1 = P(q[0] * hw * u.x, q[0] * hw * u.y + q[1] * fL, (z0 + z1) / 2);
      D.arrow(ctx, m0.x, m0.y, m1.x, m1.y, { color: PL.col("danger"), width: 3, label: "F", lsize: 12 });
    });
    const nrm = { x: -Math.sin(phi), y: Math.cos(phi) }, cc = P(0, 0, (z0 + z1) / 2), ce = P(nrm.x * 60, nrm.y * 60, (z0 + z1) / 2);
    D.arrow(ctx, cc.x, cc.y, ce.x, ce.y, { color: PL.col("accent-2"), width: 1.6, dash: [4, 3], label: "法線", lsize: 10 });
    const tt = P(0, 0, 214), sweep = Math.PI * 1.4 * Math.abs(Math.sin(rad(th))) * Math.min(1, I / 4 + 0.25);
    if (sweep > 0.08) {
      ctx.save(); ctx.strokeStyle = PL.col("warn"); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(tt.x, tt.y, 30 * sc, 11 * sc, 0, -Math.PI / 2, -Math.PI / 2 + sweep); ctx.stroke(); ctx.restore();
      const ea = -Math.PI / 2 + sweep, ex = tt.x + Math.cos(ea) * 30 * sc, ey = tt.y + Math.sin(ea) * 11 * sc;
      D.arrow(ctx, ex - Math.sin(ea) * 8, ey + Math.cos(ea) * 3, ex, ey, { color: PL.col("warn"), width: 2.4, head: 8 });
    }
    D.text(ctx, "τ", tt.x + 36 * sc, tt.y - 6, { color: PL.col("warn"), size: 14, weight: "700" });
    const bp = { x: W - 120 * s, y: H - 62 * s };
    AP.battery(ctx, bp.x, bp.y, 64 * s, 40 * s);
    AP.cable(ctx, [{ x: cm.x - 12 * sc, y: cm.y }, { x: cm.x - 40 * s, y: H - 20 * s }, { x: bp.x - 1, y: bp.y + 20 * s }], "rgb(186,54,48)", 2.2 * s, 6);
    AP.cable(ctx, [{ x: cm.x + 12 * sc, y: cm.y }, { x: cm.x + 50 * s, y: H - 14 * s }, { x: bp.x + 64 * s + 1, y: bp.y + 20 * s }], "rgb(40,44,52)", 2.2 * s, 6);
    D.text(ctx, "θ = " + PL.fmt(th, 0) + "°（法線與 B 的夾角）", W - 18 * s, 44 * s, { color: PL.col("text"), size: 11.5, align: "right", weight: "700" });
    D.text(ctx, Math.abs(Math.sin(rad(th))) < 0.05 ? "線圈面垂直磁場：力矩為零" : "力矩 τ ∝ I sinθ", W - 18 * s, 62 * s, { color: PL.col("text-dim"), size: 10.5, align: "right" });
    fillPill(ctx, 18, 18, "相對力矩", PL.fmt(tq, 2), 104, c);
  };

  /* 黑體輻射：望遠鏡拍到的恆星顏色＋筆電上的光譜曲線 */
  SC["blackbody"] = k => {
    const { ctx, W, H, a: T, b: Rr, t, s, c, v: lam } = k;
    const benchY = H * 0.86;
    AP.labRoom(ctx, W, H, benchY, {});
    const vr = Math.min(H * 0.3, W * 0.17), vx = W * 0.22, vy = H * 0.46;
    AP.steel(ctx, vx - 5 * s, vy + vr, 10 * s, benchY - vy - vr, -6);
    AP.steel(ctx, vx - 40 * s, benchY - 8 * s, 80 * s, 8 * s, -10);
    ctx.save(); ctx.beginPath(); ctx.arc(vx, vy, vr, 0, PL.TAU); ctx.fillStyle = "rgb(4,8,18)"; ctx.fill();
    noteC(ctx, "rgb(4,8,18)", vx - vr * 0.7, vy - vr * 0.7, vr * 1.4, vr * 1.4);
    ctx.clip();
    for (let i = 0; i < 26; i++) { const a = i * 2.39996, rr = vr * Math.sqrt((i * 0.618) % 1); ctx.fillStyle = "rgba(230,236,255," + (0.2 + (i % 5) * 0.12) + ")"; ctx.fillRect(vx + Math.cos(a) * rr, vy + Math.sin(a) * rr, 1.3, 1.3); }
    const sr = vr * clamp(0.1 + 0.12 * Math.sqrt(Rr), 0.1, 0.5), col = AP.kColor(T);
    const glow = ctx.createRadialGradient(vx, vy, sr * 0.2, vx, vy, sr * 2.4);
    glow.addColorStop(0, AP.kColor(T, 0.55)); glow.addColorStop(1, AP.kColor(T, 0));
    ctx.fillStyle = glow; ctx.fillRect(vx - sr * 2.5, vy - sr * 2.5, sr * 5, sr * 5);
    const body = ctx.createRadialGradient(vx - sr * 0.3, vy - sr * 0.3, sr * 0.1, vx, vy, sr);
    body.addColorStop(0, "rgb(255,255,250)"); body.addColorStop(0.5, col); body.addColorStop(1, AP.kColor(T * 0.8));
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(vx, vy, sr, 0, PL.TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgb(44,48,56)"; ctx.lineWidth = 8 * s; ctx.beginPath(); ctx.arc(vx, vy, vr + 4 * s, 0, PL.TAU); ctx.stroke();
    D.text(ctx, "望遠鏡影像：R = " + PL.fmt(Rr, 1) + " R☉", vx, vy + vr * 0.66, { color: "rgb(220,228,240)", size: 10, align: "center", weight: "700" });
    const lw = Math.min(W * 0.48, 390 * s), lh = Math.min(H * 0.64, 280 * s);
    const scr = AP.laptop(ctx, W * 0.47, benchY - lh - 2, lw, lh);
    const gx0 = scr.x + 34 * s, gx1 = scr.x + scr.w - 12 * s, gy0 = scr.y + 24 * s, gy1 = scr.y + scr.h - 30 * s;
    const l0 = 100, l1 = 2000, X = l => gx0 + (l - l0) / (l1 - l0) * (gx1 - gx0), Y = v => gy1 - v * (gy1 - gy0);
    for (let l = 380; l < 780; l += 4) { ctx.fillStyle = AP.nmColor(l, 0.9); ctx.fillRect(X(l), gy1 + 2, Math.max(1, X(l + 4) - X(l)), 7 * s); }
    ctx.save(); ctx.strokeStyle = "rgba(190,205,225,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx0, gy0 - 6); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    const lm = 2898000 / T, a = 4.965, pl = l => { const x = lm / l; return Math.pow(x, 5) * (Math.exp(a) - 1) / (Math.exp(a * x) - 1); };
    ctx.beginPath(); ctx.moveTo(X(l0), gy1);
    for (let i = 0; i <= 120; i++) { const l = l0 + (l1 - l0) * i / 120; ctx.lineTo(X(l), Y(Math.min(1.05, pl(l)))); }
    ctx.lineTo(X(l1), gy1); ctx.closePath(); ctx.fillStyle = AP.kColor(T, 0.25); ctx.fill();
    ctx.strokeStyle = "rgb(255,210,120)"; ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const l = l0 + (l1 - l0) * i / 120, y = Y(Math.min(1.05, pl(l))); i ? ctx.lineTo(X(l), y) : ctx.moveTo(X(l), y); }
    ctx.stroke();
    if (lm > l0 && lm < l1) { ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgb(130,220,255)"; ctx.beginPath(); ctx.moveTo(X(lm), gy0); ctx.lineTo(X(lm), gy1); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = "rgba(200,214,232,0.85)"; ctx.font = Math.max(7, 8.5 * s) + "px system-ui,sans-serif"; ctx.textAlign = "center";
    [500, 1000, 1500, 2000].forEach(l => ctx.fillText(l + "", X(l), gy1 + 20 * s));
    ctx.textAlign = "right"; ctx.fillText("λ (nm)", gx1, gy1 - 5);
    ctx.restore();
    if (lm > l0 && lm < l1) D.text(ctx, "λmax = " + PL.fmt(lm, 0) + " nm", X(lm) + 6, gy0 + 6, { color: "rgb(140,224,255)", size: 10.5, weight: "700" });
    D.text(ctx, "光譜（峰高已縮放）", scr.x + 8, scr.y + 14, { color: "rgba(210,220,236,0.85)", size: 10 });
    D.text(ctx, "T = " + PL.fmt(T, 0) + " K", vx, vy - vr - 14 * s, { color: PL.col("text"), size: 13, align: "center", weight: "700" });
    fillPill(ctx, 18, 18, "峰值波長 λmax", PL.fmt(lam, 1) + " nm", 124, c);
  };

  /* 每個實驗在畫布下方的說明列：一句話講出這個畫面要看什麼 */
  const CAP = {
    "apparent-weight": "電梯加速上升時體重計讀數變大（超重），加速下降時變小（失重）：N = m(g + a)",
    "spring-series-parallel": "同一個 200 g 砝碼：串聯時兩條彈簧各伸長一次、總伸長最大；並聯時兩條一起分擔",
    "center-of-mass": "支點放在質心，木尺就能水平平衡：m₁d₁ = m₂d₂",
    "force-time-profile": "力感測器記下碰撞的 F–t 曲線：曲線下面積是衝量 J；緩衝越久，平均力越小",
    "rocket-equation": "燃料噴得越快、燃料占比越高，燒完時速度越大：Δv = vₑ ln(m₀/m_f)",
    "work-angle": "只有沿位移方向的分力 F cosθ 做功；θ > 90° 時做負功",
    "power-lab": "把重物舉高 3 m 需要的功固定，完成得越快，功率越大：P = W / t",
    "friction-thermal": "摩擦力做的功全部變成熱：Q = μmgd（木塊質量 1 kg）",
    "banked-curve": "傾斜路面的正向力提供向心力：tanθ = v² / (rg)，以設計速率過彎不需要摩擦力",
    "damped-oscillation": "紙板越大、空氣阻尼越大，振幅衰減得越快；β 超過 ω₀ 就不再來回振盪",
    "coupled-oscillators": "只拉開一台車，能量會沿中間的彈簧在兩台車之間來回搬運",
    "hydrostatic-pressure": "越深壓力越大：P = ρgh；換成密度較大的液體，同深度壓力也較大",
    "phase-change": "冰熔化時一直吸熱，溫度卻停在 0 °C；熔化所需時間 t = mL / P",
    "reflection-boundary": "繩端固定：反射脈衝倒立（相位差 180°）；繩端自由：反射脈衝正立",
    "sound-intensity": "聲音的能量向四周擴散：距離加倍，聲強剩四分之一",
    "air-column-resonance": "管口是腹點、水面是節點：基音共鳴時 L = λ/4，所以 v = 4fL",
    "critical-angle": "光由玻璃射向空氣，入射角超過臨界角就發生全反射：sin θc = 1/n",
    "refraction-slab": "光穿過平行玻璃磚後方向不變，只側移 d；玻璃越厚、入射角越大，側移越多",
    "optical-instruments": "望遠鏡的角放大率 M = fₒ / fₑ：物鏡焦距越長、目鏡焦距越短，放大越多",
    "kirchhoff": "流入節點的電流等於流出的電流：I₁ = I₂ + I₃",
    "meter-loading": "伏特計內阻不是無限大，並聯上去會分走電流，讀數比真實電壓小",
    "electrostatic-shield": "金屬籠外表面的感應電荷把外電場擋在外面：籠內電場為零，與殼厚無關",
    "ampere-force": "F = BIL sinθ：導線平行磁場時不受力，垂直時受力最大",
    "motional-emf": "導體棒切割磁力線產生感應電動勢 ε = BLv，推得越快燈越亮",
    "coil-torque": "線圈兩邊受力大小相同、方向相反，形成力偶；力矩 τ ∝ I sinθ",
    "blackbody": "溫度越高，光譜峰值往短波長移動（λmax·T = 2.898×10⁻³ m·K），顏色由紅轉白再轉藍"
  };

  function drawScene(cv, cfg, a, b, t, value) {
    const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
    const f = SC[cfg.id];
    if (f) f({ cv, ctx, W, H, cfg, a, b, t, v: value, c: color(), s: clamp(Math.min(W / 800, H / 464), 0.5, 1.7) });
  }

  /*
   * reflection-boundary：反射相位由「固定端／自由端」決定，與脈衝振幅無關。
   * 原本關係圖掃振幅，畫出來是一條水平線；改掃反射端，才看得到
   * 「固定端反相 180°、自由端同相 0°」這個本來就是重點的落差。
   * damped-oscillation 同理：掃初始振幅只会得到直線，掃阻尼才看得到衰減曲線。
   */
  if (T["reflection-boundary"]) T["reflection-boundary"].sweep = "b";
  if (T["damped-oscillation"]) T["damped-oscillation"].sweep = "b";

  // 同一個 kind 由多個實驗共用，但兩根滑桿的語意各不相同。
  // 把 id 帶進設定，讓畫面可以針對特定實驗做正確的呈現。
  Object.keys(T).forEach(id => { T[id].id = id; });

  Object.keys(T).forEach(id => {
    PL.register(id, { build(root) {
      const cfg = T[id], L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" }), cv = PL.canvas.create(L.canvasWrap, 0.58, 860);
      PL.ui.caption(cv, CAP[id] || "");
      PL.ui.section(L.controls, "實驗條件");
      const sa = PL.ui.slider(L.controls, { label: cfg.a[0], min: cfg.a[1], max: cfg.a[2], value: cfg.a[3], step: (cfg.a[2] - cfg.a[1]) / 100, unit: cfg.a[4], digits: cfg.a[4] === "" ? 2 : 1, onInput: () => render() });
      const sb = PL.ui.slider(L.controls, { label: cfg.b[0], min: cfg.b[1], max: cfg.b[2], value: cfg.b[3], step: (cfg.b[2] - cfg.b[1]) / 100, unit: cfg.b[4], digits: cfg.b[4] === "" ? 2 : 1, onInput: () => render() });
      PL.ui.note(L.controls, PL.templateGuide(id, cfg));
      const row = PL.ui.buttonRow(L.controls);
      let anim;
      /* 播放／暫停由引擎的傳輸列統一提供，實驗不再自備 */
      PL.ui.button(row, "重設", () => { sa.set(cfg.a[3]); sb.set(cfg.b[3]); render(); });
      const r = PL.ui.readout(L.readouts, { label: cfg.output });
      const r2 = PL.ui.readout(L.readouts, { label: cfg.b[0], unit: cfg.b[4] });
      const chart = PL.ui.chart(PL.ui.charts(root), { title: cfg.output + "關係圖", cap: "曲線以目前第二個條件為固定值；滑動任一參數可比較趨勢與當前量測點。" });
      let time = 0;
      function render() {
        const a = sa.get(), b = sb.get(), result = cfg.calc(a, b);
        drawScene(cv, cfg, a, b, time, result);
        r.set(result, Math.abs(result) < 1 ? 3 : 2); r2.set(b, cfg.b[4] === "" ? 2 : 1);
        chart.setCap(PL.ui.relationChart(chart, {
          a: cfg.a, b: cfg.b, av: a, bv: b,
          calc: cfg.calc, output: cfg.output, sweep: cfg.sweep
        }));
      }
      anim = PL.loop(dt => { if (dt) time += dt; render(); });
      cv.onResize(render); chart.onResize(render); render(); anim.start();
      return { stop() { anim.stop(); cv.destroy(); chart.destroy(); }, rerender: render };
    }});
  });

})();
