/* 第三批互動實驗：以主題專屬儀器畫面、動態讀數與關係曲線呈現進階物理觀念。 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const accent = () => PL.col("m-color", "#35e0cf");
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
    "regression-lab": cfg("regression", ["量測雜訊 σ", 0, 2, 0.65, ""], ["真實斜率 k", 0.2, 4, 1.8, ""], "擬合斜率 k̂", "", (noise, slope) => slope + noise * 0.12, (noise, slope, value) => "殘差 RMS = " + PL.fmt(noise * 0.72, 2) + "；擬合斜率接近 " + PL.fmt(value, 2), (x, slope) => slope * x),
    "experimental-design": cfg("design", ["自變因 x", 0, 10, 5, ""], ["控制變因 c", 0, 5, 2, ""], "應變因 y", "", (x, c) => 0.65 * x * x + c, (x, c, y) => "僅改變 x；控制變因固定為 " + PL.fmt(c, 1), (x, c) => 0.65 * x * x + c),
    "error-propagation": cfg("error", ["邊長 L", 0.1, 5, 1.2, "m"], ["邊長相對不確定度", 0.1, 12, 3.2, "%"], "面積相對不確定度", "%", (l, u) => 2 * u, (l, u, v) => "A=L²；邊長的 " + PL.fmt(u, 1) + "% 範圍會使面積約有 " + PL.fmt(v, 1) + "% 的範圍", (x, u) => 2 * u),
    "dimensional-analysis": cfg("dimension", ["長度指數 L", -3, 4, 1, ""], ["時間指數 T", -4, 3, -2, ""], "量綱指標", "", (l, t) => Math.sqrt(l * l + t * t), (l, t) => "候選量綱：L^" + PL.fmt(l, 0) + " T^" + PL.fmt(t, 0), (x, t) => Math.sqrt(x * x + t * t)),
    "rolling-motion": cfg("rolling", ["轉動慣量係數 β", 0, 1, 0.4, ""], ["斜面角 θ", 3, 40, 19, "°"], "下滑加速度 a", "m/s²", (beta, theta) => 9.8 * Math.sin(deg(theta)) / (1 + beta), (beta, theta, a) => "平動與轉動共同分配能量；a = " + PL.fmt(a, 2) + " m/s²", (x, theta) => 9.8 * Math.sin(deg(theta)) / (1 + x)),
    "multistage-rocket": cfg("rocket", ["排氣速度 vₑ", 1200, 4600, 3100, "m/s"], ["每級質量比", 1.2, 6, 2.8, ""], "兩級 Δv", "m/s", (ve, ratio) => 2 * ve * Math.log(ratio), (ve, ratio, v) => "一級分離後降低結構質量，總增速 " + PL.fmt(v, 0) + " m/s", (x, ratio) => 2 * x * Math.log(ratio)),
    "rotation-dynamics": cfg("rotor", ["施加力矩 τ", 0.2, 20, 7.5, "N·m"], ["轉動慣量 I", 0.1, 8, 2.2, "kg·m²"], "角加速度 α", "rad/s²", (torque, inertia) => torque / inertia, (torque, inertia, a) => "角加速度方向依力矩；α = " + PL.fmt(a, 2), (x, inertia) => x / inertia),
    "angular-velocity-vector": cfg("rotor", ["角速度 ω", 0.2, 20, 8, "rad/s"], ["半徑 r", 0.05, 2, 0.65, "m"], "切線速率 v", "m/s", (w, r) => w * r, (w, r, v) => "右手大拇指指向 ω；切線速率 " + PL.fmt(v, 2) + " m/s", (x, r) => x * r),
    "hohmann-transfer": cfg("hohmann", ["目標軌道半徑", 1.2, 8, 2.6, "R"], ["中心天體 μ", 0.4, 3, 1, "μ₀"], "轉移時間比例", "", (r, mu) => Math.PI * Math.sqrt(Math.pow((1 + r) / 2, 3) / mu), (r, mu, t) => "兩次點火；橢圓轉移半週期 = " + PL.fmt(t, 2), (x, mu) => Math.PI * Math.sqrt(Math.pow((1 + x) / 2, 3) / mu)),
    "tidal-roche": cfg("tidal", ["距離 r", 1, 12, 4, "R"], ["密度比", 0.3, 4, 1.4, ""], "相對潮汐力", "", (r, density) => density / Math.pow(r, 3), (r, density, force) => force > 0.08 ? "潮汐梯度明顯，需留意洛希極限" : "潮汐效應較弱", (x, density) => density / Math.pow(x, 3)),
    "heat-transfer": cfg("heat", ["溫差 ΔT", 5, 160, 75, "K"], ["保溫係數", 0.1, 3, 1.2, ""], "熱流率", "W", (dt, insulation) => 18 * dt / insulation, (dt, insulation, q) => "保溫係數越高，熱流越小；目前 " + PL.fmt(q, 1) + " W", (x, insulation) => 18 * x / insulation),
    "thermal-expansion": cfg("expand", ["原長 L₀", 0.1, 12, 2.4, "m"], ["溫差 ΔT", 5, 300, 120, "K"], "伸長 ΔL", "mm", (l, dt) => l * 0.000018 * dt * 1000, (l, dt, change) => "雙金屬片將朝膨脹較小的一側彎曲；ΔL=" + PL.fmt(change, 2) + " mm", (x, dt) => x * 0.000018 * dt * 1000),
    "viscosity-reynolds": cfg("viscosity", ["流速 v", 0.05, 6, 1.7, "m/s"], ["動黏度 ν", 0.1, 6, 1.1, "mm²/s"], "相對雷諾數 Re", "", (v, nu) => 1000 * v / nu, (v, nu, re) => re < 2300 ? "流況偏向層流" : "流況可能轉為紊流", (x, nu) => 1000 * x / nu),
    "continuity-hydraulic": cfg("hydraulic", ["大活塞面積比", 1, 30, 12, ""], ["小活塞施力 F₁", 10, 600, 120, "N"], "舉升力 F₂", "N", (ratio, force) => ratio * force, (ratio, force, out) => "壓力相同，位移則反比；舉升力 " + PL.fmt(out, 0) + " N", (x, force) => x * force),
    "huygens-principle": cfg("huygens", ["波長 λ", 10, 90, 42, "px"], ["介質速率比", 0.3, 1.5, 0.7, ""], "折射角趨勢", "°", (lambda, ratio) => Math.asin(Math.min(0.98, 0.7 * ratio)) * 180 / Math.PI, (lambda, ratio, angle) => "次波包絡形成新波前；趨勢角 " + PL.fmt(angle, 1) + "°", (x, ratio) => Math.asin(Math.min(0.98, 0.7 * ratio)) * 180 / Math.PI),
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
    "quantum-transitions": cfg("quantum", ["能階差 ΔE", 1.2, 5, 2.55, "eV"], ["躍遷機率", 0.1, 1, 0.7, ""], "光子波長 λ", "nm", (energy) => 1240 / energy, (energy, p, l) => "高機率躍遷會使譜線更亮；λ=" + PL.fmt(l, 0) + " nm", (x) => 1240 / x),
    "uncertainty-principle": cfg("uncertainty", ["波包寬度 Δx", 0.1, 5, 1.1, "nm"], ["粒子質量比", 0.1, 5, 1, "mₑ"], "相對 Δp", "", (dx, mass) => 1 / (dx * mass), (dx, mass, dp) => "位置越侷限，動量分布越寬；相對 Δp=" + PL.fmt(dp, 2), (x, mass) => 1 / (x * mass)),
    "twins-paradox": cfg("spacetime", ["旅行速度 v/c", 0.05, 0.99, 0.82, "c"], ["地球經過時間", 1, 40, 16, "yr"], "旅行者經過時間", "yr", (v, t) => t * Math.sqrt(1 - v * v), (v, t, tau) => "折返後旅行者累積 " + PL.fmt(tau, 2) + " 年固有時間", (x, t) => t * Math.sqrt(1 - x * x)),
    "radiation-shielding": cfg("radiation", ["屏蔽厚度 x", 0, 20, 6, "cm"], ["吸收係數 μ", 0.03, 0.8, 0.23, "cm⁻¹"], "相對計數 I/I₀", "%", (x, mu) => 100 * Math.exp(-mu * x), (x, mu, value) => value < 10 ? "屏蔽效果明顯，仍須依輻射種類選材" : "仍有顯著穿透計數", (x, mu) => 100 * Math.exp(-mu * x)),
    "binding-energy": cfg("binding", ["質量數 A", 2, 240, 56, ""], ["反應質量虧損", 0.01, 1, 0.18, "u"], "每核子束縛能", "MeV", (a, dm) => 931.5 * dm / a, (a, dm, energy) => a < 56 ? "融合朝鐵峰移動可釋能" : "分裂朝鐵峰移動可釋能", (x, dm) => 931.5 * dm / x),
    "exoplanet-transit": cfg("transit", ["行星半徑比 Rₚ/R★", 0.02, 0.3, 0.11, ""], ["軌道週期 P", 1, 30, 6.2, "d"], "亮度下降", "%", (ratio) => 100 * ratio * ratio, (ratio, period, dip) => "每 " + PL.fmt(period, 1) + " 天出現一次約 " + PL.fmt(dip, 2) + "% 凌日", (x) => 100 * x * x),
    "hr-diagram": cfg("hr", ["表面溫度 T", 2500, 30000, 6500, "K"], ["半徑 R", 0.2, 50, 1.6, "R☉"], "相對光度 L", "L☉", (t, r) => r * r * Math.pow(t / 5778, 4), (t, r, l) => "恆星位置由溫度與光度決定；L=" + PL.fmt(l, 2) + " L☉", (x, r) => r * r * Math.pow(x / 5778, 4)),
    "cosmic-distance-ladder": cfg("ladder", ["視星等 m", 5, 32, 20, "mag"], ["絕對星等 M", -8, 6, -4.2, "mag"], "距離 d", "Mpc", (m, M) => Math.pow(10, (m - M + 5) / 5) / 1e6, (m, M, d) => "選擇標準燭光後，推得距離 " + PL.fmt(d, 3) + " Mpc", (x, M) => Math.pow(10, (x - M + 5) / 5) / 1e6)
  };

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
      else if (config.kind === "rectifier") { D.text(ctx, "▶|", W * 0.48, y + 6, { color: PL.col("warn"), size: 20, align: "center", weight: "700" }); }
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
        const x0 = W * 0.22, y0 = H - 50, top = 34; D.line(ctx, x0, y0, x0, top, "rgba(255,255,255,0.48)", 2); D.line(ctx, x0, y0, W * 0.82, y0, "rgba(255,255,255,0.48)", 2); D.line(ctx, x0, y0, x0 + (W * 0.55) * a, top + 10, c, 3); D.line(ctx, x0 + (W * 0.55) * a, top + 10, x0, y0, PL.col("accent-2"), 3); D.text(ctx, "地球 t", x0 - 8, top, { color: PL.col("text-faint"), size: 10, align: "right" }); D.text(ctx, "旅行者", x0 + W * 0.25, top + 28, { color: c, size: 11 });
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

  /* =====================================================================
     最小平方法與殘差分析 —— 從泛用模板獨立出來重寫

     原本的版本每一個數字都是編的：
       · 散點的趨勢用固定斜率畫，完全不理會「真實斜率 k」這根滑桿
       · 「雜訊」是 sin(i*7.3)*σ 這種確定性函數，不是隨機量
       · 「擬合線」是兩個寫死的端點連起來的，沒有擬合任何東西
       · 殘差 RMS 直接寫成 σ×0.72，擬合斜率寫成 k+σ×0.12
     於是把 σ 調到 0 時，讀數顯示「殘差 RMS = 0」，畫面上的點卻明顯偏離直線——
     使用者一眼就看出這裡不對。

     這一版真的做最小平方：資料點由 y = kx + b + 雜訊 產生，
     斜率與截距用正規方程解出來，殘差是資料點與擬合線的實際垂直距離。

     教學重點依課綱條目安排：
       · σ = 0 時所有點落在線上、RMS 為 0、k̂ 完全等於 k
       · σ 變大時點散開，k̂ 在 k 附近上下跳動，但平均而言沒有偏移
       · 加入「彎曲」後，殘差圖會出現 U 形——殘差有結構代表模型選錯了，
         這是判斷「該不該用直線擬合」的標準方法，也是課綱說的
         「隨機雜訊與系統誤差不同」
     ===================================================================== */
  PL.register("regression-lab", { build(root) {
    const L = PL.ui.layout(root);
    const cv = PL.canvas.create(L.canvasWrap, 0.58, 900);

    const N = 12;                      // 資料點數
    const B_TRUE = 2.0;                // 真實截距
    let seed = 20260726;

    /* splitmix32：相鄰種子也能給出不相關的序列，換一組雜訊才會真的不一樣 */
    function rng(s) {
      return function () {
        s |= 0; s = (s + 0x9e3779b9) | 0;
        let t = s ^ (s >>> 16); t = Math.imul(t, 0x21f0aaad);
        t = t ^ (t >>> 15); t = Math.imul(t, 0x735a2d97);
        return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
      };
    }
    /* Box–Muller：把均勻亂數轉成常態分布，量測雜訊才是真的高斯雜訊 */
    function gauss(r) {
      const u = Math.max(1e-9, r()), v = r();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    PL.ui.section(L.controls, "真實模型");
    const sK = PL.ui.slider(L.controls, { label: "真實斜率 k", min: 0.2, max: 4, step: 0.05, value: 1.8, digits: 2, onInput: draw });
    PL.ui.section(L.controls, "量測條件");
    const sNoise = PL.ui.slider(L.controls, { label: "量測雜訊 σ", min: 0, max: 2, step: 0.05, value: 0.65, digits: 2, onInput: draw });
    const sBend = PL.ui.slider(L.controls, { label: "偏離直線的彎曲 c", min: 0, max: 0.15, step: 0.005, value: 0, digits: 3, onInput: draw });

    PL.ui.section(L.controls, "顯示");
    const layers = PL.ui.chipGroup(L.controls, {
      multi: true, value: ["resid", "true"],
      options: [
        { value: "resid", label: "殘差線" },
        { value: "true", label: "真實直線" }
      ],
      onChange: draw
    });

    const row = PL.ui.buttonRow(L.controls);
    PL.ui.button(row, "重新取樣", () => { seed = (seed + 7919) | 0; draw(); }, { primary: true });
    PL.ui.button(row, "重設", () => { sK.set(1.8); sNoise.set(0.65); sBend.set(0); seed = 20260726; draw(); });

    PL.ui.note(L.controls,
      "先把「量測雜訊 σ」拉到 0：所有點會落在同一條直線上，殘差 RMS 變成 0，" +
      "擬合斜率會剛好等於你設定的真實斜率。" +
      "接著慢慢加大 σ，反覆按「重新取樣」——擬合斜率會在真值附近上下跳，" +
      "但不會系統性偏高或偏低，這就是「隨機雜訊不會讓估計失準，只會讓它不精確」。" +
      "最後把「彎曲 c」拉起來：點看起來還是很像一條線，" +
      "但下方的殘差圖會出現明顯的 U 形——殘差一旦有規律，就代表直線這個模型本身選錯了。");

    const rSlope = PL.ui.readout(L.readouts, { label: "擬合斜率 k̂" });
    const rInt = PL.ui.readout(L.readouts, { label: "擬合截距 b̂" });
    const rRms = PL.ui.readout(L.readouts, { label: "殘差 RMS" });
    const rR2 = PL.ui.readout(L.readouts, { label: "決定係數 R²" });
    const rBias = PL.ui.readout(L.readouts, { label: "k̂ 與真值的差" });

    const cc = PL.ui.chart(PL.ui.charts(root), {
      title: "殘差圖（資料點與擬合線的垂直差）",
      cap: "殘差應該隨機散布在零線兩側、看不出規律。若出現 U 形或倒 U 形，" +
        "表示資料本身不是直線關係，這時候再怎麼調整擬合線都沒有用，該換模型。"
    });

    /* 產生資料並解最小平方——這裡是真的在算，不是套公式湊數字 */
    function fit() {
      const k = sK.get(), sigma = sNoise.get(), bend = sBend.get();
      const r = rng(seed);
      const pts = [];
      for (let i = 0; i < N; i += 1) {
        const x = i + 1;
        // 彎曲項讓資料偏離直線，但保持整體仍像一條線，只有殘差圖看得出來
        const y = k * x + B_TRUE + bend * (x - (N + 1) / 2) * (x - (N + 1) / 2) + sigma * gauss(r);
        pts.push([x, y]);
      }
      const n = pts.length;
      const mx = pts.reduce((s, p) => s + p[0], 0) / n;
      const my = pts.reduce((s, p) => s + p[1], 0) / n;
      let sxy = 0, sxx = 0;
      pts.forEach(p => { sxy += (p[0] - mx) * (p[1] - my); sxx += (p[0] - mx) * (p[0] - mx); });
      const kHat = sxx > 0 ? sxy / sxx : 0;
      const bHat = my - kHat * mx;
      const resid = pts.map(p => p[1] - (kHat * p[0] + bHat));
      const sse = resid.reduce((s, e) => s + e * e, 0);
      const sst = pts.reduce((s, p) => s + (p[1] - my) * (p[1] - my), 0);
      return { k, sigma, bend, pts, kHat, bHat, resid,
        rms: Math.sqrt(sse / n), r2: sst > 0 ? 1 - sse / sst : 1 };
    }

    function scene(f) {
      const { ctx, W, H } = cv;
      cv.clear(); D.bg(cv);
      const c = accent();
      const box = { x: 54, y: 24, w: W - 96, h: H - 74 };

      const xs = f.pts.map(p => p[0]), ys = f.pts.map(p => p[1]);
      const y0 = Math.min(...ys, f.bHat), y1 = Math.max(...ys, f.kHat * N + f.bHat);
      const pad = Math.max(0.6, (y1 - y0) * 0.14);
      const g = PL.graph(cv, box, { x0: 0, x1: N + 1, y0: y0 - pad, y1: y1 + pad });
      g.frame({ xlabel: "自變量 x", ylabel: "量測值 y" });
      g.grid(6, 4);

      // 真實直線：讓學生看得到「擬合線並不等於真值，只是最好的估計」
      if (layers.has("true")) {
        g.curve([[0, f.k * 0 + B_TRUE], [N + 1, f.k * (N + 1) + B_TRUE]],
          { color: PL.col("text-faint"), width: 1.6, dash: [6, 5] });
        g.label(0.4, f.k * (N + 1) + B_TRUE, "真實直線 y = kx + b",
          { color: PL.col("text-faint"), size: 9.5 });
      }

      // 殘差線：每個點到擬合線的垂直距離，最小平方法要讓這些長度的平方和最小
      if (layers.has("resid")) {
        f.pts.forEach((p, i) => {
          const yHat = f.kHat * p[0] + f.bHat;
          D.line(ctx, g.X(p[0]), g.Y(p[1]), g.X(p[0]), g.Y(yHat),
            f.resid[i] >= 0 ? PL.col("warn") : PL.col("danger"), 1.6);
        });
      }

      // 擬合線
      g.curve([[0, f.bHat], [N + 1, f.kHat * (N + 1) + f.bHat]], { color: c, width: 2.4 });
      f.pts.forEach(p => g.dot(p[0], p[1], { color: PL.col("accent-2"), r: 4 }));

      D.text(ctx, "ŷ = " + PL.fmt(f.kHat, 2) + " x + " + PL.fmt(f.bHat, 2),
        box.x + box.w - 8, box.y + 16, { color: c, size: 12, align: "right", weight: "700" });

      PL.ui.caption(cv, f.sigma === 0 && f.bend === 0
        ? "沒有雜訊時每個點都落在同一條直線上，殘差全為零，擬合斜率剛好等於真實斜率。"
        : f.bend > 0.02
          ? "資料其實是彎的。直線仍然可以擬合，但殘差圖會露出馬腳——殘差有規律就代表模型不對。"
          : "擬合線不會通過每一個點；最小平方法找的是「讓所有殘差平方和最小」的那一條。");
    }

    function residualChart(f) {
      cc.clear();
      const m = Math.max(0.35, Math.max(...f.resid.map(Math.abs)) * 1.35);
      const g = PL.graph(cc, { x: 50, y: 16, w: cc.W - 66, h: cc.H - 40 },
        { x0: 0, x1: N + 1, y0: -m, y1: m });
      g.frame({ xlabel: "x", ylabel: "殘差" });
      g.grid(6, 4);
      g.hline(0, { color: PL.col("text-faint"), width: 1.4 });
      f.resid.forEach((e, i) => {
        const x = f.pts[i][0];
        D.line(cc.ctx, g.X(x), g.Y(0), g.X(x), g.Y(e), e >= 0 ? PL.col("warn") : PL.col("danger"), 1.6);
        g.dot(x, e, { color: e >= 0 ? PL.col("warn") : PL.col("danger"), r: 3.5 });
      });
    }

    function draw() {
      const f = fit();
      scene(f);
      residualChart(f);
      rSlope.set(f.kHat, 3);
      rInt.set(f.bHat, 3);
      rRms.set(f.rms, 3);
      rR2.set(f.r2, 4);
      rBias.set(f.kHat - f.k, 3);
    }

    cv.onResize(draw); cc.onResize(draw);
    draw();
    return { stop() { cv.destroy(); cc.destroy(); }, rerender: draw };
  }});
  delete LABS["regression-lab"];        // 已由上面的專屬實作取代

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
      const config = LABS[id], L = PL.ui.layout(root), cv = PL.canvas.create(L.canvasWrap, 0.59, 920);
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
