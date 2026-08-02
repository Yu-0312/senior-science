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
    D.rect(ctx, x, y, w, 27, { fill: PL.theme.shade(0.72), stroke: tint, width: 1, r: 6 });
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
      /*
       * satellite-energy 的「衛星質量」原本對畫面毫無作用。
       * 軌道速度確實與衛星質量無關——這正是要教的事——
       * 但學生看不到任何東西改變時，只會覺得這根滑桿壞了。
       * 改成衛星本身畫得隨質量變大，軌道半徑與速度則紋風不動，
       * 並直接把這個結論寫在畫面上。
       */
      const satR = cfg.id === "satellite-energy"
        ? 6 + 10 * (b - cfg.b[1]) / (cfg.b[2] - cfg.b[1]) : 9;
      D.disc(ctx, px, py, satR, { fill: c, glow: c, glowSize: 10 });
      D.arrow(ctx, px, py, px - 25 * Math.sin(p), py + 18 * Math.cos(p), { color: PL.col("accent-2"), width: 1.7, label: "v" });
      if (cfg.id === "satellite-energy") {
        D.text(ctx, "衛星變重了，但軌道半徑與速度完全沒變——軌道只由中心天體與半徑決定",
          W / 2, H - 30, { color: PL.col("text-dim"), size: 10.5, align: "center" });
      }
      fillPill(ctx, W - 154, 20, "軌道量測", PL.fmt(value, 2), 132, c);
    } else if (cfg.kind === "thermal") {
      const tankX = W * 0.23, tankY = 42, tankW = W * 0.45, tankH = H * 0.56, fillY = tankY + tankH * (0.6 - 0.18 * Math.sin(t));
      D.rect(ctx, tankX, tankY, tankW, tankH, { fill: "rgba(255,255,255,0.03)", stroke: c, width: 2, r: 7 });
      D.rect(ctx, tankX + 2, fillY, tankW - 4, tankY + tankH - fillY - 2, { fill: "rgba(90,162,255,0.20)", r: 4 });
      for (let i = 0; i < 18; i++) { const x = tankX + 16 + (i * 43 % (tankW - 30)); const y = fillY + 16 + ((i * 29 + t * 28) % Math.max(20, tankY + tankH - fillY - 30)); D.disc(ctx, x, y, 2.4, { fill: i % 2 ? PL.col("accent-2") : c }); }
      D.line(ctx, tankX + tankW + 32, tankY, tankX + tankW + 32, tankY + tankH, PL.col("text-faint"), 2); D.disc(ctx, tankX + tankW + 32, fillY + 8, 7, { fill: PL.col("danger") });
      fillPill(ctx, 18, 18, "系統讀值", PL.fmt(value, 2), 118, c);
    } else if (cfg.kind === "wave") {
      /*
       * 原本振幅寫成 18 + b*2，直接吃第二根滑桿的原始數值。
       * 對 reflection-boundary 來說第一根才是「脈衝振幅」，所以那根滑桿沒有作用；
       * 對 air-column-resonance 來說 b 是 100~800 Hz 的頻率，
       * 算出來的振幅會高達一千多像素，整條波直接畫到畫面外。
       * 改成依各滑桿自己的範圍正規化：振幅取自第一根，波長取自第二根。
       */
      const nA = (a - cfg.a[1]) / Math.max(1e-9, cfg.a[2] - cfg.a[1]);
      const nB = (b - cfg.b[1]) / Math.max(1e-9, cfg.b[2] - cfg.b[1]);
      const xStart = 28, amp = 10 + nA * 34, waveLen = 18 + (1 - nB) * 34, mid = cy;
      ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2.8; ctx.beginPath();
      for (let x = xStart; x < W - 24; x += 2) { const y = mid + Math.sin((x - xStart) / waveLen - t * 4) * amp; x === xStart ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
      D.line(ctx, xStart, mid, W - 24, mid, "rgba(255,255,255,0.14)", 1);
      fillPill(ctx, 18, 18, "波動讀值", PL.fmt(value, 2), 118, c);
    } else if (cfg.kind === "optics") {
      const sourceX = 48, lensX = W * 0.5, screenX = W - 70, lensY = cy;
      D.rect(ctx, sourceX - 14, lensY - 22, 28, 44, { fill: PL.col("panel-3"), stroke: c, r: 4 }); D.disc(ctx, sourceX, lensY, 5, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 8 });
      D.line(ctx, lensX, lensY - 64, lensX, lensY + 64, c, 4); D.line(ctx, screenX, lensY - 76, screenX, lensY + 76, "rgba(255,255,255,0.42)", 4);
      if (cfg.id === "critical-angle") {
        /*
         * 「入射角 θ」原本對畫面完全沒有作用——三條光線永遠畫在 dy = −32/0/32。
         * 全反射的重點就是「角度超過臨界角就折不出去」，
         * 角度看不到的話這個實驗等於沒有內容。
         *
         * 改成畫一條真的以 θ 入射的光線：
         *   θ < θc → 折射出去（用 Snell 定律算折射角）
         *   θ ≥ θc → 折射線消失，只剩全反射線
         */
        const n1 = a, thetaC = Math.asin(1 / n1) * 180 / Math.PI;
        const th = b * Math.PI / 180, bx = W * 0.5, by = lensY;
        D.line(ctx, 40, by, W - 40, by, PL.theme.pale(0.3), 2);            // 介面
        D.line(ctx, bx, by - 90, bx, by + 90, PL.theme.pale(0.18), 1, [5, 4]);  // 法線
        D.text(ctx, "n₁ = " + PL.fmt(n1, 2) + "（密介質）", 46, by + 24, { color: PL.col("text-faint"), size: 10 });
        D.text(ctx, "n₂ = 1.00（空氣）", 46, by - 14, { color: PL.col("text-faint"), size: 10 });
        // 入射線（由下方密介質射向介面）
        const inLen = 110;
        D.arrow(ctx, bx - inLen * Math.sin(th), by + inLen * Math.cos(th), bx, by,
          { color: PL.col("warn"), width: 2.2, head: 7, label: "θ = " + PL.fmt(b, 0) + "°" });
        const sinT2 = n1 * Math.sin(th);
        if (sinT2 <= 1) {
          const th2 = Math.asin(sinT2);
          D.arrow(ctx, bx, by, bx + inLen * Math.sin(th2), by - inLen * Math.cos(th2),
            { color: c, width: 2.2, head: 7, label: "折射 " + PL.fmt(th2 * 180 / Math.PI, 0) + "°" });
          D.text(ctx, "θ 還沒超過臨界角 " + PL.fmt(thetaC, 1) + "°，光可以折射出去",
            W / 2, H - 26, { color: PL.col("text-dim"), size: 11, align: "center" });
        } else {
          D.text(ctx, "全反射", bx + 96, by - 34, { color: PL.col("danger"), size: 13, weight: "700" });
          D.text(ctx, "θ 超過臨界角 " + PL.fmt(thetaC, 1) + "°，光完全折不出去，全部反射回密介質",
            W / 2, H - 26, { color: PL.col("danger"), size: 11, align: "center", weight: "700" });
        }
        // 反射線一定存在
        D.arrow(ctx, bx, by, bx + inLen * Math.sin(th), by + inLen * Math.cos(th),
          { color: sinT2 > 1 ? PL.col("danger") : PL.theme.pale(0.35), width: sinT2 > 1 ? 2.4 : 1.4, head: 6 });
      } else {
        for (const dy of [-32, 0, 32]) { D.line(ctx, sourceX + 12, lensY + dy * 0.35, lensX, lensY + dy, PL.col("warn"), 1.8); D.line(ctx, lensX, lensY + dy, screenX, lensY - dy * 0.7, c, 1.8); }
      }
      fillPill(ctx, 18, 18, "光學量測", PL.fmt(value, 2), 118, c);
    } else if (["circuit", "field", "magnetic"].includes(cfg.kind)) {
      const left = 70, right = W - 74, top = H * 0.3, bottom = H * 0.72;
      D.line(ctx, left, top, right, top, c, 2.2); D.line(ctx, right, top, right, bottom, c, 2.2); D.line(ctx, right, bottom, left, bottom, c, 2.2); D.line(ctx, left, bottom, left, top, c, 2.2);
      D.disc(ctx, left, cy, 21, { fill: "rgba(255,204,102,0.14)", stroke: PL.col("warn"), width: 2 }); D.text(ctx, "+", left, cy + 6, { color: PL.col("warn"), size: 18, align: "center", weight: "700" });
      if (cfg.kind === "magnetic") { for (let i = 0; i < 7; i++) D.ring(ctx, W * 0.5, cy, 24 + i * 8, "rgba(201,140,255,0.18)", 1); D.arrow(ctx, W * 0.5, cy, W * 0.5 + 45, cy, { color: PL.col("accent-2"), width: 2, label: "B" }); }
      if (cfg.kind === "field") {
        if (cfg.id === "electrostatic-shield") {
          /*
           * 「屏蔽厚度」原本對畫面沒有作用，外加場的箭頭一路穿過去，
           * 看起來反而像是屏蔽沒有效果——和讀數說的「殼內場強 = 0」互相矛盾。
           * 改成畫出真正有厚度的金屬殼：箭頭在殼外，殼內完全空白，
           * 厚度隨滑桿改變，但殼內恆為零這件事不隨厚度改變。
           */
          const thick = 4 + (b - cfg.b[1]) / Math.max(1e-9, cfg.b[2] - cfg.b[1]) * 22;
          const shellL = W * 0.38, shellR = W * 0.66;
          const arrowLen = 14 + (a - cfg.a[1]) / Math.max(1e-9, cfg.a[2] - cfg.a[1]) * 26;
          for (let y = top + 22; y < bottom; y += 22) {
            D.arrow(ctx, left + 40, y, left + 40 + arrowLen, y, { color: PL.col("accent-2"), width: 1.4 });
            D.arrow(ctx, shellR + thick + 10, y, shellR + thick + 10 + arrowLen, y, { color: PL.col("accent-2"), width: 1.4 });
          }
          D.rect(ctx, shellL, top + 10, thick, bottom - top - 20, { fill: "#8d97a6", stroke: PL.theme.pale(0.4), r: 2 });
          D.rect(ctx, shellR, top + 10, thick, bottom - top - 20, { fill: "#8d97a6", stroke: PL.theme.pale(0.4), r: 2 });
          D.text(ctx, "殼內 E = 0", (shellL + shellR + thick) / 2, cy + 4,
            { color: PL.col("ok"), size: 13, align: "center", weight: "700" });
          D.text(ctx, "厚度 " + PL.fmt(b, 1) + " mm", (shellL + shellR + thick) / 2, cy + 24,
            { color: PL.col("text-faint"), size: 10, align: "center" });
          D.text(ctx, "把厚度或外加場拉到最大，殼內仍然是零——這就是法拉第籠",
            W / 2, bottom + 24, { color: PL.col("text-dim"), size: 10.5, align: "center" });
        } else {
          for (let y = top + 24; y < bottom; y += 25) D.arrow(ctx, left + 46, y, right - 46, y, { color: PL.col("accent-2"), width: 1 });
        }
      }
      fillPill(ctx, W - 154, 20, "儀表讀數", PL.fmt(value, 2), 132, c);
    } else if (cfg.kind === "nuclear") {
      const sourceX = W * 0.14, targetX = W * 0.51, detectorX = W * 0.84;
      D.rect(ctx, sourceX - 24, cy - 32, 48, 64, { fill: "rgba(255,183,77,0.12)", stroke: PL.col("warn"), width: 2, r: 5 });
      D.text(ctx, "粒子束", sourceX, cy + 5, { color: PL.col("warn"), size: 11, align: "center", weight: "700" });
      for (let i = 0; i < 4; i++) D.arrow(ctx, sourceX + 32, cy - 24 + i * 16, targetX - 34, cy - 12 + i * 8, { color: PL.col("accent-2"), width: 1.5 });
      D.disc(ctx, targetX, cy, 28, { fill: "rgba(255,107,107,0.18)", stroke: PL.col("danger"), width: 2, glow: PL.col("danger"), glowSize: 9 });
      D.text(ctx, "靶核", targetX, cy + 5, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
      D.disc(ctx, targetX + 50, cy - 28, 8, { fill: c, glow: c, glowSize: 8 }); D.disc(ctx, targetX + 66, cy + 24, 6, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 7 });
      D.arrow(ctx, targetX + 28, cy - 10, detectorX - 34, cy - 42, { color: c, width: 2, label: "產物" });
      D.arrow(ctx, targetX + 28, cy + 10, detectorX - 34, cy + 42, { color: PL.col("warn"), width: 2, label: "能量" });
      D.rect(ctx, detectorX - 34, cy - 56, 68, 112, { fill: "rgba(90,162,255,0.11)", stroke: PL.col("accent-2"), width: 2, r: 5 });
      D.text(ctx, "偵測器", detectorX, cy - 34, { color: PL.col("accent-2"), size: 10, align: "center", weight: "700" });
      D.text(ctx, "由質量虧損", detectorX, cy + 3, { color: PL.col("text-faint"), size: 8.5, align: "center" });
      D.text(ctx, "轉成釋放能量", detectorX, cy + 18, { color: PL.col("text-faint"), size: 8.5, align: "center" });
      fillPill(ctx, 18, 18, "核反應量測", PL.fmt(value, 1), 130, c);
    } else if (cfg.kind === "cosmos") {
      if (cfg.output === "觀測波長") {
        const z = a / 300000, sx = 58, ex = W - 46, baseY = cy;
        const wavelengthToX = wavelength => sx + (wavelength - 350) / 420 * (ex - sx);
        const shift = Math.min((ex - sx) * 0.22, z * (ex - sx) * 2.8);
        D.text(ctx, "以譜線位移讀出紅移", sx, 38, { color: PL.col("text"), size: 12, weight: "700" });
        D.line(ctx, sx, baseY - 24, ex, baseY - 24, "rgba(210,222,240,0.56)", 7);
        D.line(ctx, sx, baseY + 31, ex, baseY + 31, "rgba(255,107,107,0.58)", 7);
        [410, b, 620].forEach(wavelength => { const x = wavelengthToX(wavelength); D.line(ctx, x, baseY - 35, x, baseY - 13, "#101722", 3); D.line(ctx, x + shift, baseY + 20, x + shift, baseY + 42, "#101722", 3); });
        D.text(ctx, "實驗室參考光譜 λ₀", sx, baseY - 43, { color: PL.col("text-faint"), size: 9 });
        D.text(ctx, "遠方星系觀測光譜 λ", sx, baseY + 56, { color: PL.col("danger"), size: 9 });
        D.arrow(ctx, wavelengthToX(b), baseY + 77, wavelengthToX(b) + shift, baseY + 77, { color: c, width: 2, label: "Δλ" });
        D.text(ctx, "z ≈ v/c = " + PL.fmt(z * 1000, 2) + " ×10⁻³", W * 0.68, H - 38, { color: c, size: 11, align: "center", weight: "700" });
      } else {
        const starX = W * 0.28, starY = cy, temperature = a, starColor = temperature < 4200 ? "#ff8a65" : temperature < 7000 ? "#ffe08a" : "#9dccff";
        D.disc(ctx, starX, starY, 36 + b * 3, { fill: starColor, glow: starColor, glowSize: 26 });
        D.text(ctx, "恆星表面", starX, starY + 5, { color: "#172033", size: 10, align: "center", weight: "700" });
        const gx = W * 0.49, gy = H * 0.73, gw = W * 0.43, gh = H * 0.48;
        const g = PL.graph(cv, { x: gx, y: gy - gh, w: gw, h: gh }, { x0: 200, x1: 1600, y0: 0, y1: 1.1 });
        g.frame({ title: "黑體光譜（形狀示意）", xlabel: "波長 λ (nm)", ylabel: "相對強度" }); g.grid(5, 4);
        const peak = 2898000 / temperature;
        g.fn(lambda => Math.exp(-0.5 * ((lambda - peak) / Math.max(90, peak * 0.34)) ** 2), { color: c, width: 2.4 });
        g.vline(peak, { color: PL.col("warn"), dash: [4, 4] }); g.label(peak, 0.94, "λmax", { color: PL.col("warn"), size: 10 });
        D.text(ctx, "溫度越高，峰值往短波長移動", W * 0.68, H - 22, { color: PL.col("text-faint"), size: 9.5, align: "center" });
      }
      fillPill(ctx, 18, 18, cfg.output === "觀測波長" ? "紅移觀測" : "黑體輻射", PL.fmt(value, 1), 124, c);
    } else {
      const tableX = W * 0.18, tableY = H * 0.26, tableW = W * 0.64, rowH = 38;
      D.rect(ctx, tableX, tableY, tableW, rowH * 4, { fill: "rgba(7,11,17,0.4)", stroke: "rgba(255,255,255,0.18)", r: 6 });
      ["調整參數", "觀察量測值", "比對關係圖"].forEach((label, index) => { const y = tableY + 30 + index * rowH; D.text(ctx, String(index + 1), tableX + 20, y, { color: c, size: 12, align: "center", weight: "700" }); D.text(ctx, label, tableX + 44, y, { color: PL.col("text"), size: 11 }); if (index < 2) D.line(ctx, tableX + 12, y + 17, tableX + tableW - 12, y + 17, "rgba(255,255,255,0.1)", 1); });
      fillPill(ctx, 18, 18, "資料量測", PL.fmt(value, 2), 118, c);
    }
      PL.ui.caption(cv, "互動模型：調整左側參數，讀取右側資料與曲線");
  }

  /*
   * reflection-boundary：反射相位由「固定端／自由端」決定，與脈衝振幅無關。
   * 原本關係圖掃振幅，畫出來是一條水平線；改掃反射端，才看得到
   * 「固定端反相 180°、自由端同相 0°」這個本來就是重點的落差。
   */
  if (T["reflection-boundary"]) T["reflection-boundary"].sweep = "b";

  // 同一個 kind 由多個實驗共用，但兩根滑桿的語意各不相同。
  // 把 id 帶進設定，讓畫面可以針對特定實驗做正確的呈現。
  Object.keys(T).forEach(id => { T[id].id = id; });

  Object.keys(T).forEach(id => {
    PL.register(id, { build(root) {
      const cfg = T[id], L = PL.ui.layout(root), cv = PL.canvas.create(L.canvasWrap, 0.58, 860);
      PL.ui.section(L.controls, "實驗條件");
      const sa = PL.ui.slider(L.controls, { label: cfg.a[0], min: cfg.a[1], max: cfg.a[2], value: cfg.a[3], step: (cfg.a[2] - cfg.a[1]) / 100, unit: cfg.a[4], digits: cfg.a[4] === "" ? 2 : 1, onInput: () => render() });
      const sb = PL.ui.slider(L.controls, { label: cfg.b[0], min: cfg.b[1], max: cfg.b[2], value: cfg.b[3], step: (cfg.b[2] - cfg.b[1]) / 100, unit: cfg.b[4], digits: cfg.b[4] === "" ? 2 : 1, onInput: () => render() });
      PL.ui.note(L.controls, PL.templateGuide(id, cfg));
      const row = PL.ui.buttonRow(L.controls);
      let playing = true, anim;
      const play = PL.ui.button(row, "暫停", () => {
        playing = !playing; play.textContent = playing ? "暫停" : "播放";
        if (playing) anim.start(); else anim.stop();
        render();
      }, { primary: true });
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

  /* 不確定度不能只用一個公式表示：把同一物件的每次讀值直接攤開。 */
  PL.register("measurement-error", { build(root) {
    const L = PL.ui.layout(root), cv = PL.canvas.create(L.canvasWrap, 0.7, 900);
    const trueLength = 100;
    let readings = [];
    PL.ui.section(L.controls, "量測設定");
    const sCount = PL.ui.slider(L.controls, { label: "重複量測次數 N", min: 3, max: 24, step: 1, value: 8, unit: "次", digits: 0, onInput: resample });
    const sResolution = PL.ui.slider(L.controls, { label: "尺的解析度 r", min: 0.1, max: 5, step: 0.1, value: 1, unit: "mm", digits: 1, onInput: resample });
    const sBias = PL.ui.slider(L.controls, { label: "零點偏移 b", min: -2, max: 2, step: 0.1, value: 0, unit: "mm", digits: 1, onInput: resample });
    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "重新量測", resample, { primary: true });
    PL.ui.button(row, "清除零點偏移", () => { sBias.set(0); resample(); });
    PL.ui.note(L.controls, "綠點是每一次讀值，虛線是真實長度，藍線是平均值。提高量測次數會讓平均值更穩定；但零點偏移是系統誤差，重複量測也不會自動消失。");
    const rMean = PL.ui.readout(L.readouts, { label: "平均值 x̄", unit: "mm" });
    const rSpread = PL.ui.readout(L.readouts, { label: "讀值離散 s", unit: "mm" });
    const rUncertainty = PL.ui.readout(L.readouts, { label: "合成不確定度 u", unit: "mm" });
    const rDifference = PL.ui.readout(L.readouts, { label: "平均值與真值差", unit: "mm" });
    const rReport = PL.ui.readout(L.readouts, { label: "建議報告結果" });

    function normal() {
      const u = Math.max(1e-8, Math.random()), v = Math.max(1e-8, Math.random());
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
    }
    function stats() {
      const mean = readings.reduce((sum, value) => sum + value, 0) / readings.length;
      const variance = readings.length > 1 ? readings.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (readings.length - 1) : 0;
      return { mean, spread: Math.sqrt(variance) };
    }
    function resample() {
      const count = Math.round(sCount.get()), resolution = sResolution.get(), bias = sBias.get();
      readings = Array.from({ length: count }, () => Math.round((trueLength + bias + normal() * resolution * 0.72) / resolution) * resolution);
      draw();
    }
    function draw() {
      if (!readings.length) return;
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const resolution = sResolution.get(), bias = sBias.get(), result = stats();
      const standardError = result.spread / Math.sqrt(readings.length);
      const instrumentUncertainty = resolution / Math.sqrt(12);
      const uncertainty = Math.sqrt(standardError * standardError + instrumentUncertainty * instrumentUncertainty);
      const halfRange = Math.max(4, ...readings.map(value => Math.abs(value - trueLength) + resolution * 1.5));
      const min = trueLength - halfRange, max = trueLength + halfRange;
      const x0 = 60, x1 = W - 42, mapX = value => x0 + (value - min) / (max - min) * (x1 - x0);

      D.text(ctx, "同一支金屬棒：每次用尺讀到的長度", x0, 25, { color: PL.col("text"), size: 12, weight: "700" });
      D.text(ctx, "真實長度僅供本模擬對照", x1, 25, { color: PL.col("text-faint"), size: 9, align: "right" });
      D.rect(ctx, x0, 42, x1 - x0, 34, { fill: "rgba(255,255,255,0.05)", stroke: "rgba(255,255,255,0.2)", r: 4 });
      for (let value = Math.ceil(min); value <= Math.floor(max); value++) {
        const x = mapX(value), major = value % 2 === 0;
        D.line(ctx, x, 42, x, 42 + (major ? 18 : 10), "rgba(255,255,255,0.36)", 1);
        if (major) D.text(ctx, String(value), x, 72, { color: PL.col("text-faint"), size: 8.5, align: "center" });
      }
      D.rect(ctx, mapX(trueLength - 1.7), 48, Math.max(10, mapX(trueLength + 1.7) - mapX(trueLength - 1.7)), 14, { fill: "rgba(255,204,102,0.55)", stroke: PL.col("warn"), r: 3 });
      D.text(ctx, "待測金屬棒", mapX(trueLength), 58, { color: "#151b27", size: 8.5, align: "center", weight: "700" });

      const scatterTop = H * 0.28, scatterBottom = H * 0.51;
      D.rect(ctx, x0, scatterTop, x1 - x0, scatterBottom - scatterTop, { fill: "rgba(7,11,17,0.35)", stroke: "rgba(255,255,255,0.15)", r: 5 });
      D.text(ctx, "每次讀值", x0 + 10, scatterTop + 17, { color: PL.col("text-faint"), size: 9 });
      D.line(ctx, mapX(trueLength), scatterTop + 25, mapX(trueLength), scatterBottom - 12, PL.col("warn"), 1.8, [4, 4]);
      D.line(ctx, mapX(result.mean), scatterTop + 25, mapX(result.mean), scatterBottom - 12, PL.col("accent-2"), 2);
      readings.forEach((value, index) => {
        const rowIndex = index % 4, y = scatterTop + 48 + rowIndex * ((scatterBottom - scatterTop - 68) / 3);
        D.disc(ctx, mapX(value), y, 5, { fill: color(), glow: color(), glowSize: 7 });
        D.text(ctx, String(index + 1), mapX(value), y - 9, { color: PL.col("text-faint"), size: 8, align: "center" });
      });
      D.text(ctx, "真值", mapX(trueLength), scatterBottom - 2, { color: PL.col("warn"), size: 9, align: "center" });
      D.text(ctx, "平均值", mapX(result.mean), scatterTop + 19, { color: PL.col("accent-2"), size: 9, align: "center" });

      const histTop = H * 0.64, histBottom = H - 42, binCount = 10, binWidth = (max - min) / binCount;
      const bins = Array.from({ length: binCount }, () => 0);
      readings.forEach(value => { const bin = PL.clamp(Math.floor((value - min) / binWidth), 0, binCount - 1); bins[bin] += 1; });
      const maxBin = Math.max(1, ...bins), barWidth = (x1 - x0) / binCount;
      D.text(ctx, "讀值分布：點越集中，隨機誤差越小", x0, histTop - 14, { color: PL.col("text"), size: 11, weight: "700" });
      D.line(ctx, x0, histBottom, x1, histBottom, "rgba(255,255,255,0.42)", 1);
      bins.forEach((count, index) => {
        const height = (histBottom - histTop) * count / maxBin;
        D.rect(ctx, x0 + index * barWidth + 3, histBottom - height, Math.max(3, barWidth - 6), height, { fill: "rgba(53,224,207,0.52)", stroke: color(), r: 2 });
      });
      D.line(ctx, mapX(trueLength), histTop, mapX(trueLength), histBottom, PL.col("warn"), 1.5, [4, 4]);
      D.line(ctx, mapX(result.mean), histTop, mapX(result.mean), histBottom, PL.col("accent-2"), 2);
      const biasText = Math.abs(bias) < 0.05 ? "零點已校正：重複量測主要處理隨機誤差" : "零點偏移 " + PL.fmt(bias, 1) + " mm：平均值整體偏移，重複量測無法消除";
      D.text(ctx, biasText, W / 2, H - 16, { color: Math.abs(bias) < 0.05 ? PL.col("text-faint") : PL.col("danger"), size: 9.5, align: "center" });

      rMean.set(result.mean, 2); rSpread.set(result.spread, 2); rUncertainty.set(uncertainty, 2); rDifference.set(result.mean - trueLength, 2);
      rReport.set(PL.fmt(result.mean, 1) + " ± " + PL.fmt(uncertainty, 1) + " mm");
    }
    cv.onResize(draw); resample();
    return { stop() { cv.destroy(); }, rerender: draw };
  }});

  /* 路程與位移要把起點、折返點和終點留在同一張圖，不能只讓物體循環移動。 */
  PL.register("distance-displacement", { build(root) {
    const L = PL.ui.layout(root), cv = PL.canvas.create(L.canvasWrap, 0.63, 900);
    let progress = 1, playing = false, anim;
    PL.ui.section(L.controls, "路徑設定");
    const sOutward = PL.ui.slider(L.controls, { label: "去程距離 L", min: 4, max: 30, step: 1, value: 14, unit: "m", digits: 0, onInput: draw });
    const sReturn = PL.ui.slider(L.controls, { label: "回程比例 r", min: 0, max: 1, step: 0.05, value: 0.45, unit: "", digits: 2, onInput: draw });
    const sProgress = PL.ui.slider(L.controls, { label: "觀察路徑進度", min: 0, max: 100, step: 1, value: 100, unit: "%", digits: 0, onInput: value => { progress = value / 100; draw(); } });
    const row = PL.ui.buttonRow(L.controls);
    const play = PL.ui.button(row, "播放整段路徑", () => { progress = 0; sProgress.set(0); playing = true; anim.start(); draw(); }, { primary: true });
    PL.ui.button(row, "回到終點判讀", () => { playing = false; anim.stop(); progress = 1; sProgress.set(100); draw(); });
    PL.ui.note(L.controls, "先從起點走到折返點，再往回走一段。路程只把走過的每一段相加；位移只比較終點與起點的位置，並保留方向。拖曳進度可在任何時刻停下判讀。");
    const rRoute = PL.ui.readout(L.readouts, { label: "總路程 s", unit: "m" });
    const rDisplacement = PL.ui.readout(L.readouts, { label: "終點位移 Δx", unit: "m" });
    const rPosition = PL.ui.readout(L.readouts, { label: "目前位置 x", unit: "m" });
    const rStage = PL.ui.readout(L.readouts, { label: "目前路段" });
    function values() {
      const outward = sOutward.get(), returned = outward * sReturn.get(), route = outward + returned;
      const fractionOut = outward / route;
      const current = progress <= fractionOut ? outward * progress / fractionOut : outward - returned * (progress - fractionOut) / (1 - fractionOut || 1);
      const travelled = route * progress;
      return { outward, returned, route, fractionOut, final: outward - returned, current, travelled };
    }
    function draw() {
      const { ctx, W, H } = cv; cv.clear(); D.bg(cv);
      const data = values(), x0 = 72, x1 = W - 64, trackY = H * 0.57;
      /*
       * 原本寫成 position / data.outward，也就是把去程距離正規化成整個畫布寬度。
       * 結果無論 L 設 4 m 還是 30 m，畫出來的路徑一模一樣長，
       * 學生拉「去程距離」這根滑桿完全看不出差別——尺度被自己抵銷掉了。
       *
       * 改用固定比例尺（以滑桿上限 30 m 對應整條軌道），
       * 短程就畫得短、長程就畫得長，L 這根滑桿才真的在說一件事。
       */
      const SPAN = 30;
      const mapX = position => x0 + position / SPAN * (x1 - x0);
      const finishX = mapX(data.final), currentX = mapX(data.current);
      D.text(ctx, "一趟有折返的直線步行", x0, 31, { color: PL.col("text"), size: 13, weight: "700" });
      D.text(ctx, "以起點為 x = 0，向右為正方向", x1, 31, { color: PL.col("text-faint"), size: 9.5, align: "right" });
      D.line(ctx, x0, trackY, x1, trackY, "rgba(255,255,255,0.28)", 6);
      for (let step = 0; step <= 10; step++) {
        const x = x0 + step / 10 * (x1 - x0);
        D.line(ctx, x, trackY - 10, x, trackY + 10, "rgba(255,255,255,0.2)", 1);
        D.text(ctx, String(step * SPAN / 10), x, trackY + 24,
          { color: PL.col("text-faint"), size: 8.5, align: "center" });
      }
      const turnX = mapX(data.outward);
      D.line(ctx, x0, trackY - 78, turnX, trackY - 78, "rgba(53,224,207,0.22)", 2, [4, 4]);
      D.arrow(ctx, x0 + 8, trackY - 78, turnX - 4, trackY - 78, { color: color(), width: 2.5, label: "去程 L = " + PL.fmt(data.outward, 1) + " m" });
      D.line(ctx, finishX, trackY + 84, turnX, trackY + 84, "rgba(255,183,77,0.22)", 2, [4, 4]);
      D.arrow(ctx, turnX - 4, trackY + 84, finishX + 4, trackY + 84, { color: PL.col("warn"), width: 2.5, label: "回程 rL = " + PL.fmt(data.returned, 1) + " m" });
      [
        [x0, "起點", "x = 0"],
        [turnX, "折返點", "x = " + PL.fmt(data.outward, 1) + " m"],
        [finishX, "終點", "x = " + PL.fmt(data.final, 1) + " m"]
      ].forEach(([x, title, detail], index) => {
        D.line(ctx, x, trackY - 22, x, trackY + 26, index === 2 ? PL.col("warn") : "rgba(255,255,255,0.54)", 2);
        D.disc(ctx, x, trackY, index === 2 ? 7 : 5, { fill: index === 2 ? PL.col("warn") : PL.col("panel-3"), stroke: index === 2 ? PL.col("warn") : "rgba(255,255,255,0.6)", width: 1.5 });
        D.text(ctx, title, x, trackY + 45, { color: index === 2 ? PL.col("warn") : PL.col("text"), size: 10, align: "center", weight: "700" });
        D.text(ctx, detail, x, trackY + 60, { color: PL.col("text-faint"), size: 8.5, align: "center" });
      });
      D.rect(ctx, currentX - 18, trackY - 45, 36, 24, { fill: color(), stroke: "rgba(255,255,255,0.75)", width: 1.4, r: 5 });
      D.disc(ctx, currentX - 11, trackY - 18, 4, { fill: PL.col("panel-3") }); D.disc(ctx, currentX + 11, trackY - 18, 4, { fill: PL.col("panel-3") });
      D.arrow(ctx, currentX, trackY - 56, currentX + (progress <= data.fractionOut ? 38 : -38), trackY - 56, { color: progress <= data.fractionOut ? color() : PL.col("warn"), width: 2, label: progress <= data.fractionOut ? "向右" : "向左" });

      const panelY = H * 0.79, panelW = (W - 112) / 2;
      D.rect(ctx, 56, panelY, panelW, 62, { fill: "rgba(53,224,207,0.08)", stroke: color(), r: 6 });
      D.text(ctx, "路程 s = 去程 + 回程", 70, panelY + 20, { color: PL.col("text-faint"), size: 9.5 });
      D.text(ctx, PL.fmt(data.outward, 1) + " + " + PL.fmt(data.returned, 1) + " = " + PL.fmt(data.route, 1) + " m", 70, panelY + 43, { color: color(), size: 13, weight: "700" });
      D.rect(ctx, 56 + panelW + 16, panelY, panelW, 62, { fill: "rgba(255,183,77,0.08)", stroke: PL.col("warn"), r: 6 });
      D.text(ctx, "位移 Δx = 終點 − 起點", 70 + panelW + 16, panelY + 20, { color: PL.col("text-faint"), size: 9.5 });
      D.text(ctx, PL.fmt(data.final, 1) + " − 0 = +" + PL.fmt(data.final, 1) + " m", 70 + panelW + 16, panelY + 43, { color: PL.col("warn"), size: 13, weight: "700" });
      rRoute.set(data.route, 2); rDisplacement.set(data.final, 2); rPosition.set(data.current, 2); rStage.set(progress < data.fractionOut ? "去程：遠離起點" : progress < 1 ? "回程：朝起點" : "已到終點，可比較路程與位移");
    }
    anim = PL.loop(dt => {
      if (!playing || !dt) return;
      progress = Math.min(1, progress + dt * 0.24); sProgress.set(progress * 100);
      if (progress >= 1) { playing = false; anim.stop(); play.textContent = "再播放一次"; }
      draw();
    });
    cv.onResize(draw); draw();
    return { stop() { anim.stop(); cv.destroy(); }, rerender: draw };
  }});
})();
