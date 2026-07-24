/* 第二批課程實驗：將細分知識點做成可操作的量測台。 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const color = () => PL.col("m-color", "#35e0cf");

  function topic(kind, a, b, output, calc) {
    return { kind, a, b, output, calc };
  }
  const T = {
    "vector-components": topic("vector", ["向量大小 A", 4, 30, 16, "N"], ["方向 θ", 0, 90, 38, "°"], "水平分量 Aₓ", (a, b) => a * Math.cos(b * Math.PI / 180)),
    "distance-displacement": topic("motion", ["往返路程", 2, 30, 14, "m"], ["回程比例", 0, 1, 0.45, ""], "位移大小", (a, b) => Math.abs(a * (1 - 2 * b))),
    "measurement-error": topic("measurement", ["量測次數", 3, 24, 8, "次"], ["儀器解析度", 0.1, 5, 1, "mm"], "平均不確定度", (a, b) => b / Math.sqrt(a)),
    "force-components": topic("force", ["拉力 F", 2, 60, 28, "N"], ["拉力角 θ", 0, 90, 35, "°"], "水平分力", (a, b) => a * Math.cos(b * Math.PI / 180)),
    "apparent-weight": topic("elevator", ["乘客質量 m", 20, 100, 60, "kg"], ["加速度 a", -8, 8, 2, "m/s²"], "體重計讀數 N", (a, b) => a * (9.8 + b)),
    "spring-series-parallel": topic("spring", ["彈簧 k₁", 10, 80, 35, "N/m"], ["彈簧 k₂", 10, 80, 50, "N/m"], "串聯等效勁度", (a, b) => a * b / (a + b)),
    "center-of-mass": topic("momentum", ["左側質量", 1, 10, 3, "kg"], ["右側質量", 1, 10, 7, "kg"], "質心位置", (a, b) => 10 * b / (a + b)),
    "force-time-profile": topic("impulse", ["衝量 J", 5, 80, 30, "N·s"], ["作用時間 Δt", 0.1, 4, 1, "s"], "平均力", (a, b) => a / b),
    "rocket-equation": topic("rocket", ["噴氣速度 vₑ", 500, 5000, 2400, "m/s"], ["質量比 m₀/m_f", 1.1, 8, 3, ""], "速度改變 Δv", (a, b) => a * Math.log(b)),
    "work-angle": topic("work", ["外力 F", 5, 100, 48, "N"], ["夾角 θ", 0, 180, 35, "°"], "單位位移做功", (a, b) => a * Math.cos(b * Math.PI / 180)),
    "power-lab": topic("power", ["做功 W", 100, 3000, 1200, "J"], ["完成時間 t", 1, 30, 8, "s"], "平均功率", (a, b) => a / b),
    "friction-thermal": topic("energy", ["摩擦係數 μ", 0.05, 1, 0.32, ""], ["滑行距離 d", 1, 20, 8, "m"], "轉化熱量 Q", (a, b) => a * 9.8 * b),
    "banked-curve": topic("orbit", ["彎道半徑 r", 20, 200, 85, "m"], ["傾角 θ", 2, 45, 18, "°"], "設計速率", (a, b) => Math.sqrt(a * 9.8 * Math.tan(b * Math.PI / 180))),
    "satellite-energy": topic("orbit", ["軌道半徑 r", 1, 12, 4, "R⊕"], ["衛星質量 m", 100, 2000, 600, "kg"], "相對軌道速度", (a) => 7.9 / Math.sqrt(a)),
    "escape-speed": topic("orbit", ["天體質量比", 0.1, 5, 1, "M⊕"], ["天體半徑比", 0.3, 3, 1, "R⊕"], "逃逸速度", (a, b) => 11.2 * Math.sqrt(a / b)),
    "damped-oscillation": topic("oscillation", ["初始振幅 A₀", 1, 12, 7, "cm"], ["阻尼 β", 0.05, 1, 0.3, "s⁻¹"], "5 秒後振幅", (a, b) => a * Math.exp(-5 * b)),
    "shm-phase": topic("oscillation", ["振幅 A", 1, 10, 6, "cm"], ["週期 T", 0.5, 6, 2, "s"], "最大速率", (a, b) => a * TAU / b),
    "coupled-oscillators": topic("oscillation", ["耦合勁度", 1, 30, 12, "N/m"], ["質量 m", 0.2, 5, 1, "kg"], "交換頻率", (a, b) => Math.sqrt(a / b) / TAU),
    "hydrostatic-pressure": topic("thermal", ["深度 h", 0, 30, 12, "m"], ["液體密度 ρ", 600, 1400, 1000, "kg/m³"], "表壓", (a, b) => a * b * 9.8 / 1000),
    "phase-change": topic("thermal", ["質量 m", 0.1, 4, 1, "kg"], ["加熱功率", 100, 2000, 800, "W"], "熔化時間", (a, b) => a * 334000 / b),
    "heat-engine": topic("thermal", ["高溫 Tₕ", 350, 1200, 700, "K"], ["低溫 T𝚌", 200, 600, 320, "K"], "卡諾效率", (a, b) => Math.max(0, 1 - b / a) * 100),
    "reflection-boundary": topic("wave", ["脈衝振幅", 1, 12, 7, "cm"], ["反射端", 0, 1, 0, ""], "反射相位", (a, b) => b ? 0 : 180),
    "sound-intensity": topic("wave", ["距離 r", 1, 30, 8, "m"], ["聲源振幅", 1, 10, 5, ""], "相對聲強", (a, b) => b * b / (a * a)),
    "air-column-resonance": topic("wave", ["空氣柱長度 L", 5, 120, 42, "cm"], ["音叉頻率 f", 100, 800, 440, "Hz"], "基頻聲速", (a, b) => 4 * a / 100 * b),
    "critical-angle": topic("optics", ["介質折射率 n₁", 1.1, 2.4, 1.5, ""], ["入射角 θ", 0, 90, 48, "°"], "臨界角", (a) => Math.asin(1 / a) * 180 / Math.PI),
    "refraction-slab": topic("optics", ["玻璃厚度", 1, 30, 12, "mm"], ["入射角 θ", 0, 75, 42, "°"], "側向位移", (a, b) => a * Math.sin(b * Math.PI / 180) * 0.45),
    "optical-instruments": topic("optics", ["物鏡焦距 fₒ", 100, 1600, 800, "mm"], ["目鏡焦距 fₑ", 5, 80, 25, "mm"], "角放大率", (a, b) => a / b),
    "kirchhoff": topic("circuit", ["電源電壓 V", 1, 24, 12, "V"], ["支路電阻 R", 1, 100, 24, "Ω"], "支路電流", (a, b) => a / b),
    "meter-loading": topic("circuit", ["待測電阻 R", 10, 10000, 1200, "Ω"], ["電壓表內阻", 1000, 100000, 10000, "Ω"], "並聯量測誤差", (a, b) => 100 * a / (a + b)),
    "electrostatic-shield": topic("field", ["外加場強 E", 1, 100, 45, "V/m"], ["屏蔽厚度", 1, 12, 5, "mm"], "殼內場強", () => 0),
    "ampere-force": topic("magnetic", ["電流 I", 0.1, 10, 3, "A"], ["夾角 θ", 0, 180, 90, "°"], "相對安培力", (a, b) => a * Math.sin(b * Math.PI / 180)),
    "motional-emf": topic("magnetic", ["導體速度 v", 0.1, 12, 4, "m/s"], ["磁場 B", 0.05, 2, 0.8, "T"], "相對感應電壓", (a, b) => a * b),
    "coil-torque": topic("magnetic", ["線圈電流 I", 0.1, 8, 3, "A"], ["轉角 θ", 0, 180, 70, "°"], "相對力矩", (a, b) => a * Math.sin(b * Math.PI / 180)),
    "nuclear-reaction": topic("nuclear", ["質量虧損 Δm", 0.01, 1.2, 0.18, "u"], ["反應次數", 1, 20, 4, "次"], "相對釋放能", (a, b) => a * b * 931.5),
    "cosmological-redshift": topic("cosmos", ["退行速度", 100, 30000, 9000, "km/s"], ["本徵波長", 350, 700, 486, "nm"], "觀測波長", (a, b) => b * (1 + a / 300000)),
    "blackbody": topic("cosmos", ["表面溫度 T", 2000, 14000, 5800, "K"], ["半徑比例", 0.2, 8, 1, "R☉"], "峰值波長", (a) => 2898000 / a)
  };

  function fillPill(ctx, x, y, label, value, w, tint) {
    D.rect(ctx, x, y, w, 27, { fill: "rgba(7,11,17,0.72)", stroke: tint, width: 1, r: 6 });
    D.text(ctx, label, x + 9, y + 11, { color: PL.col("text-faint"), size: 8.5 });
    D.text(ctx, value, x + 9, y + 22, { color: tint, size: 10.5, weight: "700" });
  }

  function drawScene(cv, cfg, a, b, t, value) {
    const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
    const c = color(), cy = H * 0.52, x0 = 54, x1 = W - 46;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    if (cfg.kind === "vector" || cfg.kind === "force") {
      const angle = b * Math.PI / 180, length = 42 + (a - cfg.a[1]) / (cfg.a[2] - cfg.a[1]) * Math.min(120, W * 0.26), ox = W * 0.43, oy = H * 0.7;
      D.line(ctx, x0, oy, x1, oy, "rgba(255,255,255,0.13)", 1); D.line(ctx, ox, 35, ox, H - 40, "rgba(255,255,255,0.13)", 1);
      D.arrow(ctx, ox, oy, ox + length * Math.cos(angle), oy - length * Math.sin(angle), { color: c, width: 3, label: "A" });
      D.arrow(ctx, ox, oy, ox + length * Math.cos(angle), oy, { color: PL.col("accent-2"), width: 1.7, label: "x" });
      D.arrow(ctx, ox + length * Math.cos(angle), oy, ox + length * Math.cos(angle), oy - length * Math.sin(angle), { color: PL.col("warn"), width: 1.7, label: "y" });
      fillPill(ctx, 18, 18, "向量實驗", PL.fmt(value, 2), 112, c);
    } else if (["motion", "momentum", "impulse", "rocket", "work", "power", "energy"].includes(cfg.kind)) {
      const railY = H * 0.7, pos = x0 + (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 1.2))) * (x1 - x0);
      D.rect(ctx, x0, railY, x1 - x0, 8, { fill: "rgba(255,255,255,0.10)", r: 4 });
      for (let x = x0 + 12; x < x1; x += 26) D.line(ctx, x, railY, x, railY + 8, "rgba(255,255,255,0.18)", 1);
      D.rect(ctx, pos - 25, railY - 34, 50, 25, { fill: c, stroke: "rgba(255,255,255,0.42)", r: 5 });
      D.disc(ctx, pos - 14, railY - 6, 5, { fill: PL.col("panel-3") }); D.disc(ctx, pos + 14, railY - 6, 5, { fill: PL.col("panel-3") });
      if (cfg.kind === "rocket") { for (let i = 0; i < 4; i++) D.line(ctx, pos - 31 - i * 8, railY - 23, pos - 42 - i * 8, railY - 23 + Math.sin(t * 8 + i) * 5, PL.col("warn"), 2); }
      if (cfg.kind === "energy") { D.rect(ctx, 42, 48, 20, H * 0.36, { fill: c, r: 3 }); D.rect(ctx, 70, H * 0.42, 20, H * 0.42, { fill: PL.col("accent-2"), r: 3 }); }
      D.arrow(ctx, pos, railY - 47, pos + 44, railY - 47, { color: PL.col("accent-2"), width: 2, label: "運動" });
      fillPill(ctx, 18, 18, "即時量測", PL.fmt(value, 2), 118, c);
    } else if (cfg.kind === "elevator") {
      const cabinX = W * 0.38, cabinY = 48 + (0.5 + 0.5 * Math.sin(t * 1.5)) * (H * 0.33), cabinW = W * 0.25, cabinH = H * 0.3;
      D.line(ctx, cabinX - 16, 22, cabinX - 16, H - 24, "rgba(255,255,255,0.22)", 3); D.line(ctx, cabinX + cabinW + 16, 22, cabinX + cabinW + 16, H - 24, "rgba(255,255,255,0.22)", 3);
      D.rect(ctx, cabinX, cabinY, cabinW, cabinH, { fill: "rgba(90,162,255,0.17)", stroke: c, width: 2, r: 7 });
      D.disc(ctx, cabinX + cabinW / 2, cabinY + cabinH * 0.58, 13, { fill: PL.col("warn") });
      D.arrow(ctx, cabinX + cabinW / 2, cabinY + cabinH * 0.56, cabinX + cabinW / 2, cabinY + cabinH * 0.22, { color: c, width: 2, label: "N" });
      D.arrow(ctx, cabinX + cabinW / 2, cabinY + cabinH * 0.62, cabinX + cabinW / 2, cabinY + cabinH * 0.86, { color: PL.col("danger"), width: 2, label: "mg" });
      fillPill(ctx, W - 148, 20, "體重計", PL.fmt(value, 0) + " N", 126, c);
    } else if (["spring", "oscillation"].includes(cfg.kind)) {
      const wall = 52, center = W * 0.56, dx = Math.sin(t * 2.3) * (20 + a * 1.4), my = cy;
      D.rect(ctx, wall - 10, my - 55, 10, 110, { fill: "rgba(255,255,255,0.26)" });
      D.spring(ctx, wall, my, center + dx - 30, my, 12, 12, c);
      D.rect(ctx, center + dx - 30, my - 29, 60, 58, { fill: PL.col("panel-3"), stroke: c, width: 2, r: 7 });
      D.line(ctx, center, 38, center, H - 38, "rgba(255,255,255,0.14)", 1, [4, 4]);
      D.arrow(ctx, center + dx, my - 40, center + dx + 30 * Math.cos(t * 2.3), my - 40, { color: PL.col("accent-2"), width: 2, label: "v" });
      fillPill(ctx, 18, 18, "振動讀值", PL.fmt(value, 2), 118, c);
    } else if (cfg.kind === "orbit") {
      const cx = W * 0.47, cy2 = H * 0.54, r = Math.min(W, H) * (0.18 + 0.18 * (a - cfg.a[1]) / (cfg.a[2] - cfg.a[1]));
      D.disc(ctx, cx, cy2, 20, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 18 });
      D.ring(ctx, cx, cy2, r, "rgba(255,255,255,0.22)", 1.4);
      const p = t * 0.9, px = cx + r * Math.cos(p), py = cy2 + r * Math.sin(p) * 0.68;
      D.disc(ctx, px, py, 9, { fill: c, glow: c, glowSize: 10 }); D.arrow(ctx, px, py, px - 25 * Math.sin(p), py + 18 * Math.cos(p), { color: PL.col("accent-2"), width: 1.7, label: "v" });
      fillPill(ctx, W - 154, 20, "軌道量測", PL.fmt(value, 2), 132, c);
    } else if (cfg.kind === "thermal") {
      const tankX = W * 0.23, tankY = 42, tankW = W * 0.45, tankH = H * 0.56, fillY = tankY + tankH * (0.6 - 0.18 * Math.sin(t));
      D.rect(ctx, tankX, tankY, tankW, tankH, { fill: "rgba(255,255,255,0.03)", stroke: c, width: 2, r: 7 });
      D.rect(ctx, tankX + 2, fillY, tankW - 4, tankY + tankH - fillY - 2, { fill: "rgba(90,162,255,0.20)", r: 4 });
      for (let i = 0; i < 18; i++) { const x = tankX + 16 + (i * 43 % (tankW - 30)); const y = fillY + 16 + ((i * 29 + t * 28) % Math.max(20, tankY + tankH - fillY - 30)); D.disc(ctx, x, y, 2.4, { fill: i % 2 ? PL.col("accent-2") : c }); }
      D.line(ctx, tankX + tankW + 32, tankY, tankX + tankW + 32, tankY + tankH, PL.col("text-faint"), 2); D.disc(ctx, tankX + tankW + 32, fillY + 8, 7, { fill: PL.col("danger") });
      fillPill(ctx, 18, 18, "系統讀值", PL.fmt(value, 2), 118, c);
    } else if (cfg.kind === "wave") {
      const xStart = 28, amp = 18 + b * 2, mid = cy;
      ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2.8; ctx.beginPath();
      for (let x = xStart; x < W - 24; x += 2) { const y = mid + Math.sin((x - xStart) / 28 - t * 4) * amp; x === xStart ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      D.line(ctx, xStart, mid, W - 24, mid, "rgba(255,255,255,0.14)", 1);
      fillPill(ctx, 18, 18, "波動讀值", PL.fmt(value, 2), 118, c);
    } else if (cfg.kind === "optics") {
      const sourceX = 48, lensX = W * 0.5, screenX = W - 70, lensY = cy;
      D.rect(ctx, sourceX - 14, lensY - 22, 28, 44, { fill: PL.col("panel-3"), stroke: c, r: 4 }); D.disc(ctx, sourceX, lensY, 5, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 8 });
      D.line(ctx, lensX, lensY - 64, lensX, lensY + 64, c, 4); D.line(ctx, screenX, lensY - 76, screenX, lensY + 76, "rgba(255,255,255,0.42)", 4);
      for (const dy of [-32, 0, 32]) { D.line(ctx, sourceX + 12, lensY + dy * 0.35, lensX, lensY + dy, PL.col("warn"), 1.8); D.line(ctx, lensX, lensY + dy, screenX, lensY - dy * 0.7, c, 1.8); }
      fillPill(ctx, 18, 18, "光學量測", PL.fmt(value, 2), 118, c);
    } else if (["circuit", "field", "magnetic"].includes(cfg.kind)) {
      const left = 70, right = W - 74, top = H * 0.3, bottom = H * 0.72;
      D.line(ctx, left, top, right, top, c, 2.2); D.line(ctx, right, top, right, bottom, c, 2.2); D.line(ctx, right, bottom, left, bottom, c, 2.2); D.line(ctx, left, bottom, left, top, c, 2.2);
      D.disc(ctx, left, cy, 21, { fill: "rgba(255,204,102,0.14)", stroke: PL.col("warn"), width: 2 }); D.text(ctx, "+", left, cy + 6, { color: PL.col("warn"), size: 18, align: "center", weight: "700" });
      if (cfg.kind === "magnetic") { for (let i = 0; i < 7; i++) D.ring(ctx, W * 0.5, cy, 24 + i * 8, "rgba(201,140,255,0.18)", 1); D.arrow(ctx, W * 0.5, cy, W * 0.5 + 45, cy, { color: PL.col("accent-2"), width: 2, label: "B" }); }
      if (cfg.kind === "field") { for (let y = top + 24; y < bottom; y += 25) D.arrow(ctx, left + 46, y, right - 46, y, { color: PL.col("accent-2"), width: 1 }); }
      fillPill(ctx, W - 154, 20, "儀表讀數", PL.fmt(value, 2), 132, c);
    } else {
      const cx = W * 0.48, rr = 42 + a * 3;
      D.disc(ctx, cx, cy, rr, { fill: "rgba(255,183,77,0.12)", stroke: c, width: 2, glow: c, glowSize: 10 });
      for (let i = 0; i < 16; i++) { const ang = i / 16 * TAU + t * 0.35; D.disc(ctx, cx + Math.cos(ang) * rr * 1.45, cy + Math.sin(ang) * rr * 0.75, 3, { fill: i % 2 ? c : PL.col("accent-2") }); }
      D.text(ctx, "微觀 / 宇宙觀測", cx, cy + 5, { color: PL.col("text"), size: 12, align: "center", weight: "700" });
      fillPill(ctx, 18, 18, "探測讀值", PL.fmt(value, 2), 118, c);
    }
    D.text(ctx, "互動模型：調整左側參數，讀取右側資料與曲線", W / 2, H - 25, { color: PL.col("text-faint"), size: 9.5, align: "center" });
  }

  Object.keys(T).forEach(id => {
    PL.register(id, { build(root) {
      const cfg = T[id], L = PL.ui.layout(root), cv = PL.canvas.create(L.canvasWrap, 0.58, 860);
      PL.ui.section(L.controls, "實驗條件");
      const sa = PL.ui.slider(L.controls, { label: cfg.a[0], min: cfg.a[1], max: cfg.a[2], value: cfg.a[3], step: (cfg.a[2] - cfg.a[1]) / 100, unit: cfg.a[4], digits: cfg.a[4] === "" ? 2 : 1 });
      const sb = PL.ui.slider(L.controls, { label: cfg.b[0], min: cfg.b[1], max: cfg.b[2], value: cfg.b[3], step: (cfg.b[2] - cfg.b[1]) / 100, unit: cfg.b[4], digits: cfg.b[4] === "" ? 2 : 1 });
      PL.ui.note(L.controls, "拖曳參數可同步更新儀器場景、即時讀數與關係圖。以本頁公式和讀數確認物理關係。");
      const row = PL.ui.buttonRow(L.controls);
      let playing = true;
      const play = PL.ui.button(row, "暫停", () => { playing = !playing; play.textContent = playing ? "暫停" : "播放"; }, { primary: true });
      PL.ui.button(row, "重設", () => { sa.set(cfg.a[3]); sb.set(cfg.b[3]); });
      const r = PL.ui.readout(L.readouts, { label: cfg.output });
      const r2 = PL.ui.readout(L.readouts, { label: cfg.b[0], unit: cfg.b[4] });
      const chart = PL.ui.chart(PL.ui.charts(root), { title: cfg.output + "關係圖", cap: "曲線以目前第二個條件為固定值；滑動任一參數可比較趨勢與當前量測點。" });
      let time = 0;
      function render() {
        const a = sa.get(), b = sb.get(), result = cfg.calc(a, b);
        drawScene(cv, cfg, a, b, time, result);
        r.set(result, Math.abs(result) < 1 ? 3 : 2); r2.set(b, cfg.b[4] === "" ? 2 : 1);
        chart.clear();
        const x0 = cfg.a[1], x1 = cfg.a[2], samples = 100;
        const pts = []; let ymax = 1;
        for (let i = 0; i <= samples; i++) { const x = PL.lerp(x0, x1, i / samples); const y = cfg.calc(x, b); pts.push([x, y]); ymax = Math.max(ymax, Math.abs(y) * 1.15); }
        const ymin = Math.min(0, ...pts.map(p => p[1])) * 1.15;
        const g = PL.graph(chart, { x: 42, y: 18, w: chart.W - 58, h: chart.H - 44 }, { x0, x1, y0: ymin, y1: ymax });
        g.frame({ xlabel: cfg.a[0], ylabel: cfg.output }); g.grid(5, 4); g.curve(pts, { color: color(), width: 2.2 }); g.dot(a, result, { color: PL.col("accent-2"), glow: PL.col("accent-2") });
      }
      const anim = PL.loop(dt => { if (dt && playing) time += dt; render(); });
      cv.onResize(render); chart.onResize(render); anim.start();
      return { stop() { anim.stop(); cv.destroy(); chart.destroy(); }, rerender: render };
    }});
  });
})();
