/* 第三批互動實驗：以主題專屬儀器畫面、動態讀數與關係曲線呈現進階物理觀念。 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const accent = () => PL.col("m-color", "#35e0cf");
  const AP = () => PL.apparatus || {};
  const deg = value => value * Math.PI / 180;

  function visibleFilmWavelength(thickness, angle) {
    const raw = 4 * 1.33 * thickness * Math.cos(deg(angle));
    let best = raw, distance = Infinity;
    for (let order = 0; order <= 8; order++) {
      const candidate = raw / (2 * order + 1);
      const delta = Math.abs(candidate - 550);
      if (candidate >= 360 && candidate <= 780 && delta < distance) { best = candidate; distance = delta; }
    }
    return best;
  }

  function cfg(kind, a, b, output, unit, calc, status, chart) {
    return { kind, a, b, output, unit, calc, status, chart };
  }

  const LABS = {
    "terminal-velocity": cfg("fall", ["物體質量 m", 0.02, 5, 0.35, "kg"], ["阻力係數 b", 0.01, 2, 0.22, "kg/m"], "終端速度 vₜ", "m/s", (m, b) => Math.sqrt(m * 9.8 / b), (m, b, v) => "阻力 = 重力；以 " + PL.fmt(v, 2) + " m/s 等速下落", (x, b) => Math.sqrt(x * 9.8 / b)),
    "rolling-motion": cfg("rolling", ["轉動慣量係數 β", 0, 1, 0.4, ""], ["斜面角 θ", 3, 40, 19, "°"], "下滑加速度 a", "m/s²", (beta, theta) => 9.8 * Math.sin(deg(theta)) / (1 + beta), (beta, theta, a) => "平動與轉動共同分配能量；a = " + PL.fmt(a, 2) + " m/s²", (x, theta) => 9.8 * Math.sin(deg(theta)) / (1 + x)),
    "multistage-rocket": cfg("rocket", ["排氣速度 vₑ", 1200, 4600, 3100, "m/s"], ["每級質量比", 1.2, 6, 2.8, ""], "兩級 Δv", "m/s", (ve, ratio) => 2 * ve * Math.log(ratio), (ve, ratio, v) => "一級分離後降低結構質量，總增速 " + PL.fmt(v, 0) + " m/s", (x, ratio) => 2 * x * Math.log(ratio)),
    "rotation-dynamics": cfg("rotor", ["施加力矩 τ", 0.2, 20, 7.5, "N·m"], ["轉動慣量 I", 0.1, 8, 2.2, "kg·m²"], "角加速度 α", "rad/s²", (torque, inertia) => torque / inertia, (torque, inertia, a) => "角加速度方向依力矩；α = " + PL.fmt(a, 2), (x, inertia) => x / inertia),
    "heat-transfer": cfg("heat", ["溫差 ΔT", 5, 160, 75, "K"], ["保溫係數", 0.1, 3, 1.2, ""], "熱流率", "W", (dt, insulation) => 18 * dt / insulation, (dt, insulation, q) => "保溫係數越高，熱流越小；目前 " + PL.fmt(q, 1) + " W", (x, insulation) => 18 * x / insulation),
    "thermal-expansion": cfg("expand", ["原長 L₀", 0.1, 12, 2.4, "m"], ["溫差 ΔT", 5, 300, 120, "K"], "伸長 ΔL", "mm", (l, dt) => l * 0.000018 * dt * 1000, (l, dt, change) => "雙金屬片將朝膨脹較小的一側彎曲；ΔL=" + PL.fmt(change, 2) + " mm", (x, dt) => x * 0.000018 * dt * 1000),
    "viscosity-reynolds": cfg("viscosity", ["流速 v", 0.05, 6, 1.7, "m/s"], ["動黏度 ν", 0.1, 6, 1.1, "mm²/s"], "相對雷諾數 Re", "", (v, nu) => 1000 * v / nu, (v, nu, re) => re < 2300 ? "流況偏向層流" : "流況可能轉為紊流", (x, nu) => 1000 * x / nu),
    "continuity-hydraulic": cfg("hydraulic", ["大活塞面積比", 1, 30, 12, ""], ["小活塞施力 F₁", 10, 600, 120, "N"], "舉升力 F₂", "N", (ratio, force) => ratio * force, (ratio, force, out) => "壓力相同，位移則反比；舉升力 " + PL.fmt(out, 0) + " N", (x, force) => x * force),
    "malus-law": cfg("polarizer", ["偏振夾角 θ", 0, 90, 38, "°"], ["入射強度 I₀", 1, 100, 72, "a.u."], "透射強度 I", "a.u.", (theta, intensity) => intensity * Math.pow(Math.cos(deg(theta)), 2), (theta, intensity, out) => "分析器轉至 " + PL.fmt(theta, 0) + "°；透射 " + PL.fmt(out, 1), (x, intensity) => intensity * Math.pow(Math.cos(deg(x)), 2)),
    "thin-film": cfg("thinfilm", ["薄膜厚度 t", 20, 900, 320, "nm"], ["觀察角 θ", 0, 70, 18, "°"], "相長波長 λ", "nm", visibleFilmWavelength, (t, theta, l) => "目前增強接近 " + PL.fmt(l, 0) + " nm 的色光", visibleFilmWavelength),
    "fizeau-light-speed": cfg("fizeau", ["齒輪齒數 N", 100, 1800, 720, "齒"], ["轉速 f", 1, 10000, 5800, "Hz"], "估測光速 c", "km/s", (n, f) => 4 * 18 * n * f / 1000, (n, f, c) => "遮光條件下的估測值為 " + PL.fmt(c, 0) + " km/s", (x, f) => 4 * 18 * x * f / 1000),
    "rl-transient": cfg("rl", ["電感 L", 0.01, 3, 0.85, "H"], ["電阻 R", 0.2, 50, 8, "Ω"], "時間常數 τ", "s", (l, r) => l / r, (l, r, tau) => "電流以 τ=" + PL.fmt(tau, 3) + " s 的尺度上升", (x, r) => x / r),
    "diode-rectifier": cfg("rectifier", ["輸入振幅 V₀", 1, 24, 12, "V"], ["濾波電容 C", 0, 3000, 900, "μF"], "平均輸出 V", "V", (v, c) => v * (0.62 + 0.3 * (1 - Math.exp(-c / 800))), (v, c, out) => c > 120 ? "濾波已降低漣波；平均輸出 " + PL.fmt(out, 2) + " V" : "脈動直流仍有明顯漣波", (x, c) => x * (0.62 + 0.3 * (1 - Math.exp(-c / 800)))),
    "semiconductor-led": cfg("led", ["順向電壓 V", 0, 4, 2.4, "V"], ["能隙 E_g", 1.6, 3.4, 2.25, "eV"], "發光波長 λ", "nm", (v, gap) => 1240 / gap, (v, gap, wavelength) => v < gap ? "尚未跨過導通門檻" : "電子復合發光，約 " + PL.fmt(wavelength, 0) + " nm", (x, gap) => 1240 / gap),
    "oscilloscope": cfg("scope", ["頻率 f", 1, 1200, 180, "Hz"], ["振幅 V₀", 0.1, 12, 3.2, "V"], "週期 T", "ms", (f) => 1000 / f, (f, amp, period) => "Vpp=" + PL.fmt(amp * 2, 2) + " V；週期=" + PL.fmt(period, 2) + " ms", (x) => 1000 / x),
    "hall-effect": cfg("hall", ["電流 I", 0.1, 8, 2.2, "A"], ["磁場 B", 0.05, 2, 0.7, "T"], "霍爾電壓 V_H", "mV", (i, b) => 2.5 * i * b, (i, b, voltage) => "霍爾極性可辨識主要載子；V_H=" + PL.fmt(voltage, 2) + " mV", (x, b) => 2.5 * x * b),
    "current-balance": cfg("balance", ["電流 I", 0.1, 10, 3.5, "A"], ["磁場 B", 0.05, 1.5, 0.65, "T"], "天平受力 F", "N", (i, b) => i * b * 0.18, (i, b, force) => "以天平讀值驗證 F=BIL；目前 " + PL.fmt(force, 3) + " N", (x, b) => x * b * 0.18),
    "eddy-current": cfg("eddy", ["磁鐵速度 v", 0.1, 8, 2.3, "m/s"], ["導體導電性 σ", 0.1, 5, 3.5, ""], "相對煞車力", "N", (v, s) => v * s * 0.45, (v, s, force) => "感應渦電流產生反向磁力；煞車力 " + PL.fmt(force, 2) + " N", (x, s) => x * s * 0.45),
    "em-polarization": cfg("emwave", ["偏振器角 θ", 0, 90, 32, "°"], ["電場振幅 E₀", 1, 10, 5, "a.u."], "透射振幅 E", "a.u.", (theta, e) => e * Math.cos(deg(theta)), (theta, e, out) => "電場選向 " + PL.fmt(theta, 0) + "°；透射振幅 " + PL.fmt(out, 2), (x, e) => e * Math.cos(deg(x))),
    "antenna-resonance": cfg("antenna", ["發射頻率 f", 20, 1000, 280, "MHz"], ["天線長度 L", 0.05, 3, 0.27, "m"], "共振匹配度", "%", (f, l) => Math.max(0, 100 * (1 - Math.min(1, Math.abs(l - 75 / f) / (75 / f + 0.05)))), (f, l, match) => "λ/4 最佳長度約 " + PL.fmt(75 / f, 3) + " m；匹配度 " + PL.fmt(match, 0) + "%", (x, l) => Math.max(0, 100 * (1 - Math.min(1, Math.abs(l - 75 / x) / (75 / x + 0.05))))),
    "radiation-shielding": cfg("radiation", ["屏蔽厚度 x", 0, 20, 6, "cm"], ["吸收係數 μ", 0.03, 0.8, 0.23, "cm⁻¹"], "相對計數 I/I₀", "%", (x, mu) => 100 * Math.exp(-mu * x), (x, mu, value) => value < 10 ? "屏蔽效果明顯，仍須依輻射種類選材" : "仍有顯著穿透計數", (x, mu) => 100 * Math.exp(-mu * x))};

  function label(ctx, x, y, title, value, width, color) {
    D.rect(ctx, x, y, width, 33, { fill: PL.theme.shade(0.82), stroke: color, width: 1, r: 6 });
    D.text(ctx, title, x + 9, y + 12, { color: PL.col("text-faint"), size: 8.5 });
    D.text(ctx, value, x + 9, y + 25, { color, size: 11, weight: "700" });
  }

  function scene(cv, config, a, b, time, out) {
    const { ctx, W, H } = cv, c = accent(), cx = W * 0.5, cy = H * 0.52, p = 0.5 + 0.5 * Math.sin(time * 2.2);
    cv.clear(); D.bg(cv);
    const railY = H - 48;
    if (config.kind === "error") {
      const deltaL = a * b / 100, minL = Math.max(0.02, a - deltaL), maxL = a + deltaL;
      const minArea = minL * minL, area = a * a, maxArea = maxL * maxL;
      const panelX = 38, panelY = 44, panelW = W * 0.48, panelH = H - 104;
      D.rect(ctx, panelX, panelY, panelW, panelH, { fill: "rgba(7,11,17,0.34)", stroke: "rgba(255,255,255,0.16)", r: 7 });
      D.text(ctx, "把邊長的不確定範圍畫出來", panelX + 16, panelY + 20, { color: PL.col("text"), size: 11, weight: "700" });
      /*
       * 原本 scale 以 maxL 為分母，正方形永遠剛好塞滿面板，
       * 於是「邊長 L」這根滑桿完全不改變畫面——尺度被自己抵銷。
       * 改用固定比例尺（以滑桿上限 5 m 對應面板寬度），
       * 邊長小就畫得小、大就畫得大，同時仍看得到 ±ΔL 的三層方框。
       */
      const L_MAX = 5.6;
      const scale = Math.min((panelW - 68) / L_MAX, (panelH - 74) / L_MAX), baseX = panelX + 34, baseY = panelY + panelH - 28;
      D.rect(ctx, baseX, baseY - maxL * scale, maxL * scale, maxL * scale, { fill: "rgba(255,183,77,0.12)", stroke: PL.col("warn"), width: 1.5, r: 2 });
      D.rect(ctx, baseX, baseY - a * scale, a * scale, a * scale, { fill: "rgba(53,224,207,0.18)", stroke: c, width: 2.2, r: 2 });
      D.rect(ctx, baseX, baseY - minL * scale, minL * scale, minL * scale, { fill: "rgba(90,162,255,0.16)", stroke: PL.col("accent-2"), width: 1.4, r: 2 });
      D.line(ctx, baseX, baseY + 10, baseX + a * scale, baseY + 10, c, 1.8);
      D.text(ctx, "L = " + PL.fmt(a, 2) + " m", baseX + a * scale / 2, baseY + 23, { color: c, size: 10, align: "center" });
      D.text(ctx, "L ± ΔL", baseX + maxL * scale + 8, baseY - maxL * scale + 10, { color: PL.col("warn"), size: 9 });
      const chartX = W * 0.62, chartY = 70, chartW = W * 0.3, chartH = H * 0.58;
      D.rect(ctx, chartX, chartY, chartW, chartH, { fill: "rgba(7,11,17,0.34)", stroke: "rgba(255,255,255,0.16)", r: 7 });
      D.text(ctx, "面積 A = L² 的可能範圍", chartX + 12, chartY + 20, { color: PL.col("text"), size: 10.5, weight: "700" });
      const barY = chartY + chartH * 0.54, barX = chartX + 20, barW = chartW - 40;
      D.line(ctx, barX, barY, barX + barW, barY, "rgba(255,255,255,0.35)", 3);
      D.line(ctx, barX, barY, barX + barW, barY, "rgba(255,183,77,0.76)", 7);
      D.disc(ctx, barX + barW * (area - minArea) / Math.max(1e-8, maxArea - minArea), barY, 6, { fill: c, glow: c, glowSize: 9 });
      D.text(ctx, "Amin " + PL.fmt(minArea, 3) + " m²", barX, barY + 28, { color: PL.col("accent-2"), size: 9 });
      D.text(ctx, "Amax " + PL.fmt(maxArea, 3) + " m²", barX + barW, barY + 28, { color: PL.col("warn"), size: 9, align: "right" });
      D.text(ctx, "名義面積 A = " + PL.fmt(area, 3) + " m²", chartX + chartW / 2, chartY + chartH - 30, { color: c, size: 10, align: "center", weight: "700" });
      label(ctx, 20, 18, "範圍傳遞", "邊長誤差會被平方放大", 148, c);
    } else if (["fall", "dimension"].includes(config.kind)) {
      const AP = PL.apparatus;
      AP.benchTop(ctx, W, H, railY + 4);
      // 落體管：直立刻度尺 + 金屬球，落下距離量得出來
      AP.ruler(ctx, W * 0.5 + 24, 34, railY - 4, (railY - 38) / 12);
      D.line(ctx, W * 0.5, 30, W * 0.5, railY, PL.theme.pale(0.22), 2, [5, 5]);
      const y = 60 + ((time * 60) % Math.max(100, railY - 85));
      AP.bob(ctx, cx, y, 16);
      D.arrow(ctx, cx, y + 20, cx, Math.min(railY - 8, y + 56), { color: PL.col("accent-2"), width: 2, label: "v" });
      D.arrow(ctx, cx, y - 18, cx, Math.max(34, y - 48), { color: PL.col("warn"), width: 2, label: "Fᵈ" });
      label(ctx, 20, 18, "力平衡", config.kind === "fall" ? "mg = Fᵈ" : "量測模型", 112, c);
    } else if (["regression", "design"].includes(config.kind)) {
      const x0 = 64, y0 = H - 58, w = W - 112, h = H - 112;
      D.rect(ctx, x0, 30, w, h, { fill: PL.theme.shade(0.56), stroke: "rgba(255,255,255,0.16)", r: 6 });
      D.grid(ctx, x0, 30, w, h, Math.max(24, Math.round(w / 8)), "rgba(255,255,255,0.07)");
      D.line(ctx, x0, y0, x0 + w, y0, PL.col("text-faint"), 1); D.line(ctx, x0, 30, x0, y0, PL.col("text-faint"), 1);
      for (let i = 0; i < 10; i++) { const x = x0 + 25 + i * (w - 50) / 9, ideal = y0 - (i / 9) * (h - 30) * 0.8; const n = Math.sin(i * 7.3) * a * 8; D.disc(ctx, x, ideal - n, 4, { fill: PL.col("accent-2"), glow: PL.col("accent-2"), glowSize: 5 }); }
      D.line(ctx, x0 + 18, y0 - 12, x0 + w - 18, 48, c, 2.2);
      label(ctx, x0 + 12, 40, config.kind === "regression" ? "最小平方法" : "受控實驗", config.kind === "regression" ? "擬合與殘差" : "僅改變 x", 132, c);
    } else if (["rolling", "rocket"].includes(config.kind)) {
      const x0 = 42, x1 = W - 44, y0 = H * 0.72;
      if (config.kind === "rolling") {
        const AP = PL.apparatus;
        AP.benchTop(ctx, W, H, y0 + 6);
        // 斜面板：實體板材，圓盤沿板面滾下
        const ang = Math.atan2(y0 - H * 0.32, x1 - x0);
        AP.ramp(ctx, x0, y0, Math.hypot(x1 - x0, y0 - H * 0.32), ang);
        const x = x0 + (x1 - x0) * (0.18 + 0.66 * p), y = H * 0.32 + (y0 - H * 0.32) * (x - x0) / (x1 - x0);
        ctx.save();
        const dg = ctx.createRadialGradient(x - 7, y - 27, 3, x, y - 20, 21);
        dg.addColorStop(0, "rgb(198,207,219)"); dg.addColorStop(0.7, "rgb(126,136,151)"); dg.addColorStop(1, "rgb(70,78,92)");
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(x, y - 20, 21, 0, PL.TAU); ctx.fill();
        ctx.strokeStyle = "rgba(28,34,44,0.6)"; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
        // 半徑標記線：轉動角度看得見，「無滑動」才有意義
        const spin = (x - x0) / 21;
        D.line(ctx, x, y - 20, x + Math.cos(spin) * 18, y - 20 + Math.sin(spin) * 18, PL.col("warn"), 2.4); D.arrow(ctx, x, y - 48, x + 35, y - 48, { color: PL.col("accent-2"), width: 2, label: "v" });
      } else {
        const x = W * (0.2 + 0.45 * p), y = H * (0.72 - 0.42 * p);
        D.line(ctx, 28, railY, W - 28, railY, "rgba(255,255,255,0.14)", 2);
        D.rect(ctx, x - 16, y - 36, 32, 70, { fill: c, stroke: "rgba(255,255,255,0.65)", r: 5 });
        D.rect(ctx, x - 30, y + 20, 60, 12, { fill: PL.col("accent-2"), r: 3 });
        for (let i = 0; i < 6; i++) D.line(ctx, x - 10 + i * 4, y + 34, x - 18 + i * 7, y + 52 + Math.sin(time * 12 + i) * 5, PL.col("warn"), 3);
        D.text(ctx, "STAGE 1", x, y - 46, { color: c, size: 10, align: "center", weight: "700" });
      }
      label(ctx, 20, 18, config.kind === "rolling" ? "無滑動條件" : "兩級分離", config.kind === "rolling" ? "v = ωR" : "Δv 疊加", 118, c);
    } else if (["rotor", "hohmann", "tidal"].includes(config.kind)) {
      if (config.kind === "rotor") {
        const AP = PL.apparatus;
        const radius = Math.min(H, W) * 0.22, theta = time * a * 0.17;
        AP.benchTop(ctx, W, H, cy + radius + 32);
        ctx.save();
        const rg = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.35, radius * 0.1, cx, cy, radius);
        rg.addColorStop(0, "rgb(190,199,212)"); rg.addColorStop(0.72, "rgb(118,128,144)"); rg.addColorStop(1, "rgb(64,72,86)");
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, PL.TAU); ctx.fill();
        ctx.strokeStyle = "rgba(28,34,44,0.65)"; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, PL.TAU); ctx.stroke();
        ctx.restore();
        D.line(ctx, cx, cy, cx + Math.cos(theta) * radius, cy + Math.sin(theta) * radius, PL.col("warn"), 5);
        AP.brassDisc(ctx, cx, cy, 11);
        D.arrow(ctx, cx, cy, cx, cy - radius - 35, { color: PL.col("accent-3"), width: 2, label: "ω" });
      } else {
        const r1 = Math.min(W, H) * 0.16, r2 = r1 * (1.2 + a / (config.a[2] || 8));
        D.disc(ctx, cx, cy, 18, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 15 }); D.ring(ctx, cx, cy, r1, "rgba(90,162,255,0.35)", 1.5); D.ring(ctx, cx, cy, r2, "rgba(255,255,255,0.24)", 1.5);
        if (config.kind === "hohmann") { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, (r1 + r2) / 2, r1 * 0.65, 0, 0, TAU); ctx.stroke(); ctx.restore(); }
        else { D.disc(ctx, cx - r2, cy, 22, { fill: "rgba(90,162,255,0.16)", stroke: c, width: 2 }); D.disc(ctx, cx + r2, cy, 7, { fill: PL.col("accent-2") }); D.line(ctx, cx - r2, cy, cx + r2, cy, "rgba(255,255,255,0.16)", 1, [5, 5]); }
      }
      label(ctx, 20, 18, config.kind === "hohmann" ? "軌道機動" : config.kind === "tidal" ? "重力梯度" : "轉軸向量", config.kind === "rotor" ? "τ = Iα" : "中央引力場", 112, c);
    } else if (["heat", "expand", "viscosity", "hydraulic"].includes(config.kind)) {
      if (config.kind === "hydraulic") {
        const y = H * 0.69, leftX = W * 0.27, rightX = W * 0.7, h1 = 54, h2 = 90;
        D.rect(ctx, leftX - 34, y - h1, 68, h1, { fill: "rgba(90,162,255,0.18)", stroke: c, r: 4 }); D.rect(ctx, rightX - 74, y - h2, 148, h2, { fill: "rgba(90,162,255,0.18)", stroke: c, r: 4 });
        D.rect(ctx, leftX - 48, y - h1 - 11, 96, 10, { fill: PL.col("panel-3"), stroke: "rgba(255,255,255,0.5)", r: 2 }); D.rect(ctx, rightX - 90, y - h2 - 11, 180, 10, { fill: PL.col("panel-3"), stroke: "rgba(255,255,255,0.5)", r: 2 });
        D.arrow(ctx, leftX, y - h1 - 44, leftX, y - h1 - 15, { color: PL.col("warn"), width: 3, label: "F₁" }); D.arrow(ctx, rightX, y - h2 - 60, rightX, y - h2 - 15, { color: c, width: 3, label: "F₂" });
      } else if (config.kind === "expand") {
        const x = 80, y = cy, base = W - 160, change = Math.min(90, out * 5);
        D.rect(ctx, x, y - 20, base + change, 40, { fill: "rgba(255,179,87,0.18)", stroke: c, width: 2, r: 5 });
        for (let i = 0; i < 7; i++) D.line(ctx, x + i * (base + change) / 6, y - 20, x + i * (base + change) / 6, y + 20, "rgba(255,255,255,0.18)", 1);
        D.arrow(ctx, x + base, y - 45, x + base + change, y - 45, { color: PL.col("warn"), width: 2, label: "ΔL" });
      } else {
        const tankX = W * 0.25, tankW = W * 0.5, tankY = 46, tankH = H * 0.58;
        D.rect(ctx, tankX, tankY, tankW, tankH, { fill: "rgba(90,162,255,0.08)", stroke: c, width: 2, r: 7 });
        if (config.kind === "heat") { for (let i = 0; i < 15; i++) { const x = tankX + 20 + (i * 37 % (tankW - 40)), y = tankY + 30 + ((i * 29 + time * 24) % (tankH - 60)); D.disc(ctx, x, y, 3, { fill: i % 2 ? PL.col("warn") : c }); } D.arrow(ctx, tankX - 34, cy, tankX - 4, cy, { color: PL.col("danger"), width: 2, label: "熱流" }); }
        else { for (let i = 0; i < 13; i++) { const x = tankX + 28 + (i * 61 % (tankW - 56)), y = tankY + 30 + ((i * 41 + time * a * 8) % (tankH - 60)); D.disc(ctx, x, y, 2.5, { fill: c }); } D.line(ctx, tankX + tankW + 24, tankY, tankX + tankW + 24, tankY + tankH, PL.col("text-faint"), 3); }
      }
      label(ctx, 20, 18, config.kind === "heat" ? "熱傳遞" : config.kind === "expand" ? "熱膨脹" : config.kind === "viscosity" ? "流況觀測" : "液壓迴路", PL.fmt(out, 2) + " " + config.unit, 130, c);
    } else if (["huygens", "polarizer", "thinfilm", "fizeau"].includes(config.kind)) {
      if (config.kind === "huygens") {
        const sx = W * 0.23, boundary = W * 0.57;
        D.line(ctx, boundary, 25, boundary, H - 35, "rgba(255,255,255,0.36)", 2);
        for (let i = 0; i < 7; i++) D.ring(ctx, sx, cy, 22 + i * a * 0.58 + p * 12, "rgba(90,162,255,0.18)", 1);
        for (let y = cy - 72; y <= cy + 72; y += 24) D.ring(ctx, boundary, y, 16 + p * 14, "rgba(255,204,102,0.35)", 1);
        D.line(ctx, boundary + 10, cy - 80, W - 46, cy + 50, c, 2.4);
      } else if (config.kind === "polarizer") {
        const l = W * 0.35, r = W * 0.65;
        [l, r].forEach((x, i) => { D.rect(ctx, x - 12, cy - 72, 24, 144, { fill: "rgba(185,139,255,0.15)", stroke: i ? PL.col("accent-2") : c, width: 2, r: 3 }); const angle = i ? deg(a) : 0; D.line(ctx, x - 18 * Math.sin(angle), cy + 42 * Math.cos(angle), x + 18 * Math.sin(angle), cy - 42 * Math.cos(angle), PL.col("warn"), 3); });
        for (let x = 30; x < W - 30; x += 8) D.line(ctx, x, cy + Math.sin(x * 0.14 + time * 4) * 14, x + 6, cy + Math.sin((x + 6) * 0.14 + time * 4) * 14, "rgba(90,162,255,0.55)", 2);
      } else if (config.kind === "thinfilm") {
        D.rect(ctx, W * 0.17, cy - 50, W * 0.66, 100, { fill: "rgba(90,162,255,0.10)", stroke: c, width: 2, r: 8 });
        for (let i = 0; i < 9; i++) { const hue = (a / 900 * 300 + i * 24) % 360; D.line(ctx, W * 0.18, cy - 42 + i * 10, W * 0.82, cy - 42 + i * 10, "hsla(" + hue + ",86%,66%,0.82)", 5); }
        D.arrow(ctx, W * 0.12, cy - 80, W * 0.4, cy - 30, { color: PL.col("warn"), width: 2, label: "入射光" }); D.arrow(ctx, W * 0.47, cy - 30, W * 0.76, cy - 100, { color: c, width: 2, label: "反射光" });
      } else {
        const gx = W * 0.28, mirror = W * 0.8, radius = 52;
        D.ring(ctx, gx, cy, radius, "rgba(255,255,255,0.48)", 3); for (let i = 0; i < 10; i++) D.line(ctx, gx + Math.cos(i / 10 * TAU) * radius, cy + Math.sin(i / 10 * TAU) * radius, gx + Math.cos(i / 10 * TAU) * (radius + 10), cy + Math.sin(i / 10 * TAU) * (radius + 10), c, 2);
        D.line(ctx, gx + radius, cy, mirror, cy, PL.col("warn"), 2); D.line(ctx, mirror, cy - 74, mirror, cy + 74, "rgba(255,255,255,0.5)", 4); D.line(ctx, mirror, cy, gx + radius, cy + 6, PL.col("accent-2"), 1.8, [5, 4]);
      }
      label(ctx, 20, 18, config.kind === "huygens" ? "波前包絡" : config.kind === "polarizer" ? "偏振分析" : config.kind === "thinfilm" ? "薄膜光程差" : "旋轉齒輪", config.kind === "thinfilm" ? PL.fmt(out, 0) + " nm" : "即時觀察", 124, c);
    } else if (["rl", "rectifier", "led", "scope"].includes(config.kind)) {
      const x0 = 48, x1 = W - 42, y = cy;
      D.line(ctx, x0, y, x1, y, c, 2.4); D.line(ctx, x0, y, x0, y + 76, c, 2.4); D.line(ctx, x0, y + 76, x1, y + 76, c, 2.4); D.line(ctx, x1, y + 76, x1, y, c, 2.4);
      if (config.kind === "rl") { D.spring(ctx, W * 0.38, y, W * 0.58, y, 8, 10, PL.col("accent-3")); D.text(ctx, "L", W * 0.48, y - 16, { color: PL.col("accent-3"), size: 14, align: "center", weight: "700" }); }
      else if (config.kind === "rectifier") {
        /* 橋式整流：菱形電橋（四顆二極體）＋輸入交流波 vs 輸出脈動直流雙幕 */
        const bx = W * 0.36, bw3 = 74, bh3 = 54, by2 = y - bh3 / 2;
        // 菱形四頂點
        const T = [bx, by2], Rr = [bx + bw3, y], Bo = [bx, by2 + bh3], Lc = [bx - bw3, y];
        ctx.strokeStyle = "rgba(190,198,215,0.85)"; ctx.lineWidth = 2;
        [[T, Rr], [Rr, Bo], [Bo, Lc], [Lc, T]].forEach(([p1, p2]) => { ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); });
        // 四顆二極體（三角形+橫棒）
        const dias = [[(T[0]+Rr[0])/2, (T[1]+Rr[1])/2, 0.7], [(Rr[0]+Bo[0])/2, (Rr[1]+Bo[1])/2, -0.7], [(Bo[0]+Lc[0])/2, (Bo[1]+Lc[1])/2, 0.7], [(Lc[0]+T[0])/2, (Lc[1]+T[1])/2, -0.7]];
        dias.forEach(([dx, dy, angd]) => {
          ctx.save(); ctx.translate(dx, dy); ctx.rotate(angd);
          ctx.fillStyle = PL.col("warn");
          ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(2, 0); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
          ctx.fillRect(2, -4, 2, 8);
          ctx.restore();
        });
        // 交流輸入（左）
        D.text(ctx, "AC", Lc[0] - 34, y + 4, { color: PL.col("accent-2"), size: 12, align: "center", weight: "700" });
        D.line(ctx, Lc[0] - 20, y, Lc[0], y, c, 2);
        // 直流輸出（右）
        D.line(ctx, Rr[0], y, Rr[0] + 20, y, c, 2);
        D.text(ctx, "DC", Rr[0] + 34, y + 4, { color: PL.col("warn"), size: 12, align: "center", weight: "700" });
        // 雙波形幕
        const wx = W * 0.62, wy = y - 62, ww = W * 0.30, wh = 124;
        ctx.fillStyle = "rgba(8,12,18,0.55)";
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(wx, wy, ww, wh, 6) : ctx.rect(wx, wy, ww, wh); ctx.fill();
        ctx.strokeStyle = "rgba(150,165,190,0.5)"; ctx.lineWidth = 1; ctx.stroke();
        // 輸入：正弦（藍）
        ctx.strokeStyle = "rgba(100,160,255,0.85)"; ctx.lineWidth = 1.8; ctx.beginPath();
        for (let x = 0; x <= ww - 16; x += 2) {
          const yy = wy + wh / 4 + Math.sin(x * 0.09 + time * 2.4) * 20;
          x === 0 ? ctx.moveTo(wx + 8 + x, yy) : ctx.lineTo(wx + 8 + x, yy);
        }
        ctx.stroke();
        // 輸出：整流後（黃，含濾波）
        const cf = Math.min(0.92, b / 3000);   // 電容濾波程度
        ctx.strokeStyle = "rgba(255,204,102,0.9)"; ctx.lineWidth = 1.8; ctx.beginPath();
        for (let x = 0; x <= ww - 16; x += 2) {
          const raw = Math.abs(Math.sin(x * 0.09 + time * 2.4));
          const env = cf > 0.02 ? Math.max(raw, (wy ? 1 : 1) * cf * 0.9) : raw;   // 簡化濾波：抬高谷底
          const yy = wy + wh * 0.72 - env * 24;
          x === 0 ? ctx.moveTo(wx + 8 + x, yy) : ctx.lineTo(wx + 8 + x, yy);
        }
        ctx.stroke();
        ctx.fillStyle = "rgba(160,175,200,0.8)"; ctx.font = "9.5px sans-serif";
        ctx.fillText("AC 入", wx + 8, wy + 14);
        ctx.fillText("脈動 DC 出（C=" + PL.fmt(b, 0) + "μF）", wx + ww - 130, wy + 14);
      }
      else if (config.kind === "led") {
        /*
         * 原本不管順向電壓多少，LED 都畫成同一顆會發光的圓——
         * 「順向電壓」這根滑桿對畫面毫無作用，也就看不出導通門檻這件事。
         * 改成：電壓低於能隙時 LED 是暗的、不發光、不畫光子箭頭；
         * 跨過門檻之後才亮起來，而且越亮光暈越大。
         */
        const gap = b, lit = a >= gap;
        const over = Math.max(0, a - gap);
        D.disc(ctx, W * 0.5, y, 15, {
          fill: lit ? "rgba(90,162,255,0.16)" : "rgba(90,162,255,0.05)",
          stroke: lit ? c : PL.col("text-faint"), width: 2,
          glow: lit ? c : null, glowSize: lit ? 12 + over * 22 : 0
        });
        if (lit) {
          for (let i = 0; i < 3; i += 1) {
            D.arrow(ctx, W * 0.5 + 16, y - 8 - i * 10, W * 0.5 + 40 + over * 18, y - 30 - i * 14,
              { color: PL.col("warn"), width: 1.8, head: 6, label: i === 0 ? "hν" : "" });
          }
        }
        D.text(ctx, lit ? "已導通　V − E_g = " + PL.fmt(over, 2) + " V"
                        : "未導通　V 還差 " + PL.fmt(gap - a, 2) + " V 才到能隙",
          W * 0.5, y + 44, { color: lit ? c : PL.col("text-faint"), size: 11, align: "center", weight: "700" });
      }
      else { D.rect(ctx, 50, 35, W - 100, H - 100, { fill: "rgba(0,0,0,0.24)", stroke: "rgba(90,162,255,0.36)", r: 6 }); for (let x = 62; x < W - 62; x += 24) D.line(ctx, x, 40, x, H - 70, "rgba(255,255,255,0.07)", 1); for (let yy = 50; yy < H - 75; yy += 22) D.line(ctx, 56, yy, W - 56, yy, "rgba(255,255,255,0.07)", 1); ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2.4; ctx.beginPath(); for (let x = 58; x < W - 58; x += 2) { const yy = cy + Math.sin((x - 58) * 0.11 + time * 2.5) * Math.min(48, b * 10); x === 58 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); ctx.restore(); }
      label(ctx, 20, 18, config.kind === "rl" ? "自感線圈" : config.kind === "rectifier" ? "橋式整流" : config.kind === "led" ? "PN 接面" : "時間掃描", PL.fmt(out, 2) + " " + config.unit, 128, c);
    } else if (["hall", "balance", "eddy", "emwave", "antenna"].includes(config.kind)) {
      if (config.kind === "hall" || config.kind === "balance") {
        const plateX = W * 0.35, plateY = cy - 45, plateW = W * 0.3, plateH = 90;
        D.rect(ctx, plateX, plateY, plateW, plateH, { fill: "rgba(90,162,255,0.14)", stroke: c, width: 2, r: 5 });
        for (let y = plateY + 18; y < plateY + plateH; y += 22) D.text(ctx, "×", plateX + plateW * 0.5, y, { color: PL.col("accent-3"), size: 15, align: "center" });
        D.arrow(ctx, plateX + 18, cy, plateX + plateW - 18, cy, { color: PL.col("warn"), width: 3, label: "I" });
        if (config.kind === "hall") { D.text(ctx, "+", plateX + plateW - 16, plateY + 16, { color: c, size: 14, align: "center", weight: "700" }); D.text(ctx, "−", plateX + 16, plateY + plateH - 8, { color: PL.col("accent-2"), size: 14, align: "center", weight: "700" }); }
        else { D.arrow(ctx, plateX + plateW * 0.5, plateY, plateX + plateW * 0.5, plateY - 52, { color: c, width: 3, label: "F" }); }
      } else if (config.kind === "eddy") {
        const tubeX = W * 0.47, tubeY = 34, tubeH = H - 90;
        D.rect(ctx, tubeX - 32, tubeY, 64, tubeH, { fill: "rgba(185,139,255,0.14)", stroke: PL.col("accent-3"), width: 3, r: 8 }); const y = tubeY + 22 + ((time * a * 12) % (tubeH - 46)); D.disc(ctx, tubeX, y, 17, { fill: c, glow: c, glowSize: 14 }); D.ring(ctx, tubeX, y, 27, "rgba(255,204,102,0.45)", 1.5); D.arrow(ctx, tubeX + 52, y, tubeX + 52, y - 40, { color: PL.col("warn"), width: 2, label: "Fᵦ" });
      } else {
        const baseY = cy + 46, antennaX = W * 0.5; D.line(ctx, antennaX, baseY, antennaX, baseY - 100, c, 5); D.line(ctx, antennaX - 35, baseY, antennaX + 35, baseY, "rgba(255,255,255,0.45)", 3);
        for (let r = 35; r < Math.min(W, H) * 0.42; r += 28) D.ring(ctx, antennaX, baseY - 60, r + p * 9, "rgba(90,162,255,0.20)", 1.4);
        if (config.kind === "emwave") D.arrow(ctx, antennaX - 80, cy - 80, antennaX + 80, cy - 80, { color: PL.col("warn"), width: 2, label: "E" });
      }
      label(ctx, 20, 18, config.kind === "hall" ? "霍爾電壓" : config.kind === "balance" ? "電流天平" : config.kind === "eddy" ? "渦電流煞車" : config.kind === "emwave" ? "電磁偏振" : "天線共振", PL.fmt(out, 2) + " " + config.unit, 130, c);
    } else if (["quantum", "uncertainty", "spacetime", "radiation", "binding", "transit", "hr", "ladder"].includes(config.kind)) {
      if (config.kind === "quantum") {
        const levels = [cy + 76, cy + 30, cy - 22, cy - 72];
        levels.forEach((y, i) => { D.line(ctx, W * 0.29, y, W * 0.7, y, "rgba(255,255,255,0.34)", 2); D.text(ctx, "n=" + (i + 1), W * 0.73, y + 4, { color: PL.col("text-faint"), size: 10 }); });
        /*
         * 「躍遷機率」原本對畫面沒有任何作用，只有一支固定粗細的箭頭。
         * 改成用一整排躍遷事件呈現機率：機率高就多數次都發生（實心箭頭），
         * 機率低就多數落空（虛淡的箭頭）。這才是「機率」在量子躍遷裡的意思——
         * 不是箭頭變粗，而是「發生的次數比例」。
         */
        const N = 10, hit = Math.round(b * N);
        for (let i = 0; i < N; i += 1) {
          const ax = W * 0.31 + i * (W * 0.38) / (N - 1);
          if (i < hit) {
            // 發生了：電子從高能階落到低能階，放出一個光子
            D.arrow(ctx, ax, levels[3] + 4, ax, levels[0] - 5, { color: c, width: 2.2 });
          } else {
            // 沒發生：只在起點畫一小截，代表「這次機會沒有躍遷」。
            // 刻意不用「同樣長度但淡一點的箭頭」——只靠顏色深淺區分，
            // 學生很難讀出比例，色弱的使用者更是完全分不出來。
            D.line(ctx, ax, levels[3] + 4, ax, levels[3] + 16, PL.theme.pale(0.18), 1.4);
          }
        }
        D.text(ctx, "10 次機會中發生 " + hit + " 次（機率 " + PL.fmt(b * 100, 0) + "%）",
          W * 0.5, levels[0] + 26, { color: c, size: 11, align: "center", weight: "700" });
      } else if (config.kind === "uncertainty") {
        const width = Math.max(18, a * 32), x0 = cx - width * 2; ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.beginPath(); for (let x = 38; x < W - 38; x += 2) { const g = Math.exp(-Math.pow((x - cx) / width, 2)); const y = cy + Math.sin((x - cx) * 0.38) * g * 55; x === 38 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); D.line(ctx, x0, cy + 80, cx + width * 2, cy + 80, PL.col("warn"), 2); D.text(ctx, "Δx", cx, cy + 96, { color: PL.col("warn"), size: 12, align: "center" });
       } else if (config.kind === "spacetime") {
        /* 世界線圖儀器化：星空背景＋地球/太空船圖示＋雙鐘對比。
           地球線垂直、旅行者線斜去斜回，兩鐘累積差就是雙生子悖論。 */
        AP() && AP().starfield && AP().starfield(ctx, W, H, 77);
        const x0 = W * 0.22, y0 = H - 50, top = 40;
        // 座標軸
        D.line(ctx, x0, y0, x0, top, "rgba(200,210,230,0.55)", 2);
        D.line(ctx, x0, y0, W * 0.82, y0, "rgba(200,210,230,0.55)", 2);
        D.text(ctx, "時間 t（地球）", x0 - 8, top - 6, { color: PL.col("text-faint"), size: 10, align: "right" });
        D.text(ctx, "距離 →", W * 0.82, y0 + 18, { color: PL.col("text-faint"), size: 10 });
        // 地球（左下角，藍色行星）
        AP() && AP().planet ? AP().planet(ctx, x0, y0 - 16, 15, [86, 156, 232], "earth")
                            : D.disc(ctx, x0, y0 - 16, 15, { fill: "rgba(90,162,255,0.5)", stroke: PL.col("accent-2"), width: 2 });
        // 目的地星（右上）
        const destX = x0 + (W * 0.55) * a, destY = top + 10;
        AP() && AP().planet && AP().planet(ctx, destX, destY, 10, [255, 204, 92], "star");
        // 旅行者世界線：去（綠）回（藍）
        D.line(ctx, x0, y0, destX, destY, c, 3);
        D.line(ctx, destX, destY, x0, y0, PL.col("accent-2"), 3);
        // 太空船（在去程線上移動）
        const prog = (time * 0.22) % 2;                 // 0→2 往返
        const px2 = prog < 1 ? x0 + (destX - x0) * prog : destX + (x0 - destX) * (prog - 1);
        const py2 = prog < 1 ? y0 + (destY - y0) * prog : destY + (y0 - destY) * (prog - 1);
        ctx.save(); ctx.translate(px2, py2); ctx.rotate(prog < 1 ? Math.atan2(destY - y0, destX - x0) : Math.atan2(y0 - destY, x0 - destX));
        // 小火箭：機身＋鼻錐＋尾焰
        ctx.fillStyle = "rgb(214,222,238)";
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-9, -3.4, 15, 6.8, 3) : ctx.rect(-9, -3.4, 15, 6.8); ctx.fill();
        ctx.fillStyle = "rgb(255,150,90)";
        ctx.beginPath(); ctx.moveTo(6, -3.4); ctx.lineTo(11, 0); ctx.lineTo(6, 3.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,190,80,0.85)";
        ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(-15 - (Math.sin(Date.now() / 90) * 0.5 + 0.5) * 4, 0); ctx.lineTo(-9, 2); ctx.closePath(); ctx.fill();
        ctx.restore();
        // 雙鐘對比：地球鐘 vs 旅行者鐘
        const clockY = top + 6, cw = 150;
        ctx.save();
        ctx.fillStyle = "rgba(20,26,38,0.72)";
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(W * 0.62, clockY, cw, 62, 8) : ctx.rect(W * 0.62, clockY, cw, 62); ctx.fill();
        ctx.strokeStyle = "rgba(150,160,185,0.5)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = "rgba(220,228,242,0.95)"; ctx.font = "700 13px sans-serif";
        ctx.fillText("地球鐘：" + PL.fmt(b, 1) + " yr", W * 0.62 + 14, clockY + 24);
        ctx.fillStyle = c; ctx.font = "700 13px sans-serif";
        ctx.fillText("旅行者鐘：" + PL.fmt(out, 1) + " yr", W * 0.62 + 14, clockY + 48);
        ctx.restore();
        D.text(ctx, "v = " + PL.fmt(a, 2) + " c", W * 0.62, clockY - 8, { color: PL.col("text-faint"), size: 10 });
      } else if (config.kind === "radiation") {
        const sourceX = W * 0.22, shieldX = W * 0.58; D.disc(ctx, sourceX, cy, 19, { fill: PL.col("danger"), glow: PL.col("danger"), glowSize: 14 }); D.text(ctx, "γ", sourceX, cy + 5, { color: "#fff", size: 14, align: "center", weight: "700" }); D.rect(ctx, shieldX, cy - 84, 30 + a * 4, 168, { fill: "rgba(150,165,190,0.33)", stroke: c, width: 2, r: 3 }); for (let i = 0; i < 7; i++) D.line(ctx, sourceX + 24, cy - 42 + i * 14, W - 46, cy - 42 + i * 14, i < Math.round(7 * out / 100) ? PL.col("warn") : "rgba(255,204,102,0.12)", 2);
      } else if (config.kind === "binding") {
        const x0 = 54, y0 = H - 58, w = W - 94, h = H - 105; D.line(ctx, x0, y0, x0 + w, y0, "rgba(255,255,255,0.45)", 1.3); D.line(ctx, x0, y0, x0, 34, "rgba(255,255,255,0.45)", 1.3); ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2.7; ctx.beginPath(); for (let i = 0; i <= 160; i++) { const x = i / 160 * 240, y = 8.8 * (1 - Math.exp(-x / 19)) * Math.exp(-Math.max(0, x - 56) / 680); const px = x0 + x / 240 * w, py = y0 - y / 9 * h; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); ctx.restore(); D.text(ctx, "Fe", x0 + 56 / 240 * w, y0 - h * 0.93, { color: PL.col("warn"), size: 10, align: "center" });
      } else if (config.kind === "transit") {
        /*
         * 原本行星的移動速度寫死成 time * 35，「軌道週期 P」完全不影響畫面。
         * 週期本來就是這個實驗的主角之一：週期短的行星跑得快、凌星頻繁。
         * 改成掃過一圈的時間正比於 P。
         */
        const starX = W * 0.56, starY = cy, r = Math.min(H, W) * 0.22;
        const sweep = Math.max(1.2, b * 0.55);                  // P=1天→1.2s，P=30天→16.5s
        const px = starX - r * 1.5 + ((time / sweep) % 1) * (r * 3); D.disc(ctx, starX, starY, r, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 22 }); D.disc(ctx, px, starY, Math.max(5, a * r), { fill: PL.col("panel-solid"), stroke: c, width: 1.5 }); D.text(ctx, "亮度下降 " + PL.fmt(out, 2) + "%", starX, starY + r + 28, { color: c, size: 11, align: "center" });
      } else if (config.kind === "hr") {
        const x0 = 52, y0 = H - 55, w = W - 96, h = H - 104; D.rect(ctx, x0, 32, w, h, { fill: PL.theme.shade(0.5), stroke: "rgba(255,255,255,0.16)", r: 6 }); D.grid(ctx, x0, 32, w, h, Math.max(24, w / 7), "rgba(255,255,255,0.07)"); ctx.save(); ctx.strokeStyle = "rgba(255,204,102,0.72)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0 + w * 0.16, 50); ctx.lineTo(x0 + w * 0.78, y0 - 12); ctx.stroke(); ctx.restore(); const px = x0 + w * (1 - (a - 2500) / 27500), py = y0 - Math.min(h - 10, Math.log10(Math.max(1, out)) / 6 * h); D.disc(ctx, px, py, 7, { fill: c, glow: c, glowSize: 10 });
      } else {
        const steps = ["視差", "造父", "Ia 超新星", "哈伯定律"]; steps.forEach((s, i) => { const x = 42 + i * (W - 84) / 3; D.disc(ctx, x, cy, 22, { fill: i < 3 ? "rgba(90,162,255,0.18)" : "rgba(255,204,102,0.18)", stroke: i < 3 ? c : PL.col("warn"), width: 2 }); D.text(ctx, String(i + 1), x, cy + 5, { color: c, size: 13, align: "center", weight: "700" }); D.text(ctx, s, x, cy + 48, { color: PL.col("text-dim"), size: 10, align: "center" }); if (i < 3) D.arrow(ctx, x + 25, cy, x + (W - 84) / 3 - 25, cy, { color: "rgba(255,255,255,0.35)", width: 1.5 }); });
      }
      label(ctx, 20, 18, config.kind === "transit" ? "亮度曲線" : config.kind === "hr" ? "恆星分布" : config.kind === "ladder" ? "距離校準" : "量子 / 宇宙模型", PL.fmt(out, 2) + " " + config.unit, 146, c);
    }
    D.text(ctx, config.status(a, b, out), W / 2, H - 23, { color: PL.col("text-faint"), size: 9.5, align: "center" });
  }

  /*
   * 關係圖要掃哪一根滑桿
   *
   * 模板預設拿第一根滑桿當關係圖的 x 軸，但這三個實驗的輸出根本不取決於第一根：
   *   · error-propagation  ΔA/A = 2·ΔL/L，與邊長 L 多大無關
   *   · huygens-principle  折射角由介質速率比決定，與波長無關
   *   · semiconductor-led  發光波長 λ = 1240/E_g，由能隙決定，與順向電壓無關
   * 結果關係圖是一條完全水平的線，學生看不出任何關係。
   *
   * 這件事本身是重要的物理（「這個量跟那個量無關」），
   * 但要看得出來，圖就得畫在真正有關係的那根滑桿上。
   * 畫面（scene）依位置使用 a、b，因此不對調滑桿，只告訴關係圖掃哪一根。
   */
  ["error-propagation", "huygens-principle", "semiconductor-led"].forEach(id => {
    if (LABS[id]) LABS[id].sweep = "b";
  });

  Object.keys(LABS).forEach(id => {
    PL.register(id, { build(root) {
      const config = LABS[id], L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" }), cv = PL.canvas.create(L.canvasWrap, 0.59, 920);
      PL.ui.section(L.controls, "操作條件");
      const a = PL.ui.slider(L.controls, { label: config.a[0], min: config.a[1], max: config.a[2], value: config.a[3], step: (config.a[2] - config.a[1]) / 100, unit: config.a[4], digits: config.a[4] === "" ? 2 : 2, onInput: () => render() });
      const b = PL.ui.slider(L.controls, { label: config.b[0], min: config.b[1], max: config.b[2], value: config.b[3], step: (config.b[2] - config.b[1]) / 100, unit: config.b[4], digits: config.b[4] === "" ? 2 : 2, onInput: () => render() });
      PL.ui.note(L.controls, PL.templateGuide(id, config));
      const buttons = PL.ui.buttonRow(L.controls); let anim;
      /* 播放／暫停由引擎的傳輸列統一提供，實驗不再自備 */
      PL.ui.button(buttons, "重設", () => { a.set(config.a[3]); b.set(config.b[3]); render(); });
      const reading = PL.ui.readout(L.readouts, { label: config.output, unit: config.unit });
      const parameter = PL.ui.readout(L.readouts, { label: config.b[0], unit: config.b[4] });
      const conclusion = PL.ui.readout(L.readouts, { label: "模型判讀" });
      const chart = PL.ui.chart(PL.ui.charts(root), { title: config.output + "關係圖", cap: "曲線固定目前第二個參數；亮點表示正在操作的條件。讀取曲線趨勢，再用本頁公式說明原因。" });
      let time = 0;
      function render() {
        const av = a.get(), bv = b.get(), result = config.calc(av, bv);
        scene(cv, config, av, bv, time, result);
        reading.set(result, Math.abs(result) >= 100 ? 1 : 3); parameter.set(bv, config.b[4] === "" ? 2 : 2); conclusion.set(config.status(av, bv, result));
        chart.setCap(PL.ui.relationChart(chart, {
          a: config.a, b: config.b, av: av, bv: bv,
          calc: config.calc, output: config.output, sweep: config.sweep
        }));
      }
      anim = PL.loop(dt => { if (dt) time += dt; render(); });
      cv.onResize(render); chart.onResize(render); render(); anim.start();
      return { stop() { anim.stop(); cv.destroy(); chart.destroy(); }, rerender: render };
    }});
  });
})();
