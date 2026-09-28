/* 第三批互動實驗：以主題專屬儀器畫面、動態讀數與關係曲線呈現進階物理觀念。 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const accent = () => PL.col("m-color", "#35e0cf");
  const AP = PL.apparatus;
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
    "thermal-expansion": cfg("expand", ["原長 L₀", 0.1, 12, 2.4, "m"], ["溫差 ΔT", 5, 300, 120, "K"], "伸長 ΔL", "mm", (l, dt) => l * 0.000018 * dt * 1000, (l, dt, change) => change > 10 ? "伸長 " + PL.fmt(change, 2) + " mm，超過 10 mm 伸縮縫：鐵軌會挫曲" : "伸長 ΔL = " + PL.fmt(change, 2) + " mm，伸縮縫還夠用", (x, dt) => x * 0.000018 * dt * 1000),
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

  /* ---------- 場景共用小工具 ---------- */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fr = (v, r) => clamp((v - r[1]) / Math.max(1e-9, r[2] - r[1]), 0, 1);
  const isL = () => PL.theme.isLight();
  const noteC = (ctx, col, x, y, w, h) => PL.theme.note(ctx, col, x, y, w, h);
  const SC = {};

  /* 火箭（側視）：底部中心 (x, by)、寬 w、高 h；fuel 0..1 為剖面窗燃料量；nose 是否有鼻錐 */
  function rocketBody(ctx, x, by, w, h, fuel, nose, fins, col) {
    const top = by - h;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, "rgb(190,196,206)"); g.addColorStop(0.35, "rgb(250,251,252)"); g.addColorStop(1, "rgb(168,174,186)");
    ctx.fillStyle = g; ctx.fillRect(x - w / 2, top, w, h);
    ctx.strokeStyle = "rgba(40,48,60,0.35)"; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, top, w, h);
    ctx.fillStyle = col || "rgb(214,60,52)";
    if (nose) { ctx.beginPath(); ctx.moveTo(x - w / 2, top); ctx.quadraticCurveTo(x - w * 0.45, top - w * 0.9, x, top - w * 1.2); ctx.quadraticCurveTo(x + w * 0.45, top - w * 0.9, x + w / 2, top); ctx.closePath(); ctx.fill(); }
    if (fins) [-1, 1].forEach(sd => { ctx.beginPath(); ctx.moveTo(x + sd * w / 2, by - h * 0.28); ctx.lineTo(x + sd * w * 1.05, by + 2); ctx.lineTo(x + sd * w / 2, by); ctx.closePath(); ctx.fill(); });
    const wy0 = top + h * 0.14, wy1 = by - h * 0.14, ww = w * 0.42;
    ctx.fillStyle = "rgb(30,36,46)"; ctx.fillRect(x - ww / 2, wy0, ww, wy1 - wy0);
    const fh = (wy1 - wy0 - 4) * clamp(fuel, 0, 1);
    const fg = ctx.createLinearGradient(0, wy1 - fh, 0, wy1);
    fg.addColorStop(0, "rgb(255,196,90)"); fg.addColorStop(1, "rgb(226,120,40)");
    ctx.fillStyle = fg; ctx.fillRect(x - ww / 2 + 2, wy1 - 2 - fh, ww - 4, fh);
    ctx.fillStyle = "rgb(60,64,72)"; ctx.beginPath(); ctx.moveTo(x - w * 0.3, by); ctx.lineTo(x + w * 0.3, by); ctx.lineTo(x + w * 0.38, by + 7); ctx.lineTo(x - w * 0.38, by + 7); ctx.closePath(); ctx.fill();
  }
  function flame(ctx, x, y, w, len, t) {
    const fl = len * (0.9 + 0.1 * Math.sin(t * 40));
    const fg = ctx.createLinearGradient(0, y, 0, y + fl);
    fg.addColorStop(0, "rgba(255,250,220,0.95)"); fg.addColorStop(0.35, "rgba(255,180,60,0.9)"); fg.addColorStop(1, "rgba(255,90,20,0)");
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(x - w * 0.34, y); ctx.quadraticCurveTo(x, y + fl * 1.1, x + w * 0.34, y); ctx.closePath(); ctx.fill();
  }

  /* 終端速度：空投物資掛著降落傘，雲往上捲動（我們跟著它一起往下掉） */
  SC["terminal-velocity"] = k => {
    const { ctx, W, H, a: m, b: bd, t, s, c, v: vt, cfg } = k;
    AP.outdoor(ctx, W, H, H * 1.7, { ground: "none", hills: false, clouds: false, sunX: W * 0.86, sunY: H * 0.13 });
    const sp = Math.min(560, 8 * vt) * s;
    for (let i = 0; i < 7; i++) {
      const x = ((i * 173) % 100) / 100 * W, span = H + 160;
      const y = ((i * 97 + 40 - t * sp * (0.7 + (i % 3) * 0.15)) % span + span) % span - 80;
      AP.cloud(ctx, x, y, (40 + (i % 3) * 18) * s, isL() ? 0.9 : 1);
    }
    const ax = W * 0.14 + ((t * 30 * s) % (W * 0.9)), ay = H * 0.16;
    ctx.fillStyle = isL() ? "rgba(90,100,120,0.8)" : "rgba(180,190,210,0.7)";
    ctx.beginPath(); ctx.ellipse(ax, ay, 14 * s, 3 * s, 0, 0, PL.TAU); ctx.fill(); ctx.fillRect(ax - 3 * s, ay - 9 * s, 5 * s, 18 * s); ctx.fillRect(ax - 13 * s, ay - 5 * s, 4 * s, 5 * s);
    const cx = W * 0.5 + Math.sin(t * 1.2) * 6 * s, cy = H * 0.56;
    const cw = (70 + 170 * Math.sqrt(fr(bd, cfg.b))) * s, chh = cw * 0.42, ctop = cy - 170 * s;
    const box = (28 + 36 * Math.cbrt(m / 5)) * s;
    ctx.strokeStyle = isL() ? "rgba(70,70,76,0.8)" : "rgba(210,210,220,0.7)"; ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(cx - cw / 2 + cw * i / 6, ctop + chh * 0.5 + Math.sin(i / 6 * Math.PI) * chh * 0.45); ctx.lineTo(cx, cy - box); ctx.stroke(); }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? "rgb(245,245,240)" : "rgb(226,70,60)";
      ctx.beginPath(); ctx.moveTo(cx, ctop + chh);
      ctx.ellipse(cx, ctop + chh, cw / 2, chh, 0, Math.PI + i * Math.PI / 6, Math.PI + (i + 1) * Math.PI / 6); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = "rgba(120,30,20,0.6)"; ctx.beginPath(); ctx.ellipse(cx, ctop + chh, cw / 2, chh, 0, Math.PI, PL.TAU); ctx.stroke();
    AP.crate(ctx, cx, cy, box, box, { noShadow: true });
    for (let i = 0; i < Math.min(12, Math.round(vt / 3) + 2); i++) {
      const lx = cx + ((i * 53) % 140 - 70) * s, ly = ((cy + 60 * s - t * sp * 1.4 - i * 37) % (H * 0.5) + H * 0.5) % (H * 0.5) + cy - H * 0.2;
      ctx.strokeStyle = isL() ? "rgba(255,255,255,0.9)" : "rgba(200,215,240,0.45)"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly - 22 * s); ctx.stroke();
    }
    const fl = (32 + 56 * Math.sqrt(m / 5)) * s;
    D.arrow(ctx, cx + box / 2 + 18 * s, cy - box / 2, cx + box / 2 + 18 * s, cy - box / 2 + fl, { color: "#e0473c", width: 2.8, label: "mg" });
    D.arrow(ctx, cx - box / 2 - 18 * s, cy - box / 2, cx - box / 2 - 18 * s, cy - box / 2 - fl, { color: "#2f7fd8", width: 2.8, label: "阻力" });
    AP.lcd(ctx, W - 170 * s, 20, 152 * s, 26 * s, "v = " + PL.fmt(vt, 2) + " m/s", { color: "rgb(120,236,255)" });
    D.text(ctx, "等速下落：阻力 = 重力", W - 18 * s, 66 * s, { color: PL.col("text"), size: 11.5, align: "right", weight: "700" });
    D.text(ctx, "m = " + PL.fmt(m, 2) + " kg", cx, cy + 20 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    label(ctx, 20, 18, "終端速度 vₜ", PL.fmt(vt, 2) + " m/s", 118, c);
  };

  /* 滾動：斜面上的滑塊／球／圓柱／圓環，頻閃殘影看得出加速度 */
  SC["rolling-motion"] = k => {
    const { ctx, W, H, a: beta, b: th, t, s, c, v: acc } = k;
    const benchY = H * 0.88;
    AP.labRoom(ctx, W, H, benchY, {});
    const thr = th * Math.PI / 180, xA = 60 * s;
    const len = Math.min((W - 130 * s) / Math.cos(thr), (benchY - 80 * s) / Math.sin(thr));
    const xB = xA + len * Math.cos(thr), yA = benchY - 6 * s - len * Math.sin(thr), yB = benchY - 6 * s;
    const nx = Math.sin(thr), ny = -Math.cos(thr);
    AP.poly(ctx, [{ x: xA, y: yA }, { x: xB, y: yB }, { x: xB, y: yB + 8 * s }, { x: xA, y: yA + 8 * s }], "rgb(196,150,96)", "rgba(90,60,30,0.7)");
    ctx.fillStyle = "rgb(160,116,64)"; ctx.fillRect(xA, yA + 8 * s, 14 * s, benchY - yA - 8 * s);
    AP.steel(ctx, xB + 2 * s, yB - 18 * s, 6 * s, 20 * s, 6);
    const R = 20 * s, pxPerM = len / 2, aPx = Math.max(0.02, acc) * pxPerM;
    const T = Math.sqrt(2 * (len - 2.6 * R) / aPx), cyc = T + 0.8, tau = t % cyc, tt = Math.min(tau, T);
    const pos = d => ({ x: xA + (R * 0.6 + d) * Math.cos(thr) + nx * R, y: yA + (R * 0.6 + d) * Math.sin(thr) + ny * R });
    const kind = beta < 0.03 ? "block" : beta < 0.45 ? "ball" : "disk";
    const hole = kind === "disk" ? R * clamp((beta - 0.5) / 0.5, 0, 0.84) : 0;
    const drawObj = (p, rot, alpha) => {
      ctx.save(); ctx.globalAlpha = alpha;
      if (kind === "block") { AP.woodBlock(ctx, p.x - nx * R, p.y - ny * R, 2 * R, 1.3 * R, thr); ctx.restore(); return; }
      if (kind === "ball") {
        const g = ctx.createRadialGradient(p.x - R * 0.35, p.y - R * 0.4, R * 0.1, p.x, p.y, R);
        g.addColorStop(0, "rgb(236,242,250)"); g.addColorStop(0.55, "rgb(150,162,180)"); g.addColorStop(1, "rgb(60,68,82)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, PL.TAU); ctx.fill();
      } else {
        ctx.fillStyle = "rgb(120,130,146)"; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, PL.TAU); ctx.fill();
        const g = ctx.createRadialGradient(p.x - R * 0.3, p.y - R * 0.3, R * 0.1, p.x, p.y, R);
        g.addColorStop(0, "rgb(214,220,230)"); g.addColorStop(1, "rgb(130,140,156)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.92, 0, PL.TAU); ctx.fill();
        if (hole > 1) { ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.arc(p.x, p.y, hole, 0, PL.TAU); ctx.fill(); ctx.globalCompositeOperation = "source-over"; ctx.strokeStyle = "rgba(40,48,60,0.6)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, hole, 0, PL.TAU); ctx.stroke(); }
      }
      ctx.strokeStyle = "rgba(214,60,52,0.95)"; ctx.lineWidth = 2.4;
      const r0 = Math.max(hole, 0), r1 = R * 0.92;
      ctx.beginPath(); ctx.moveTo(p.x + Math.cos(rot) * r0, p.y + Math.sin(rot) * r0); ctx.lineTo(p.x + Math.cos(rot) * r1, p.y + Math.sin(rot) * r1); ctx.stroke();
      ctx.restore();
    };
    for (let q = 0.25; q < tt; q += 0.25) { const d = 0.5 * aPx * q * q; drawObj(pos(d), d / R, 0.22); }
    const d = 0.5 * aPx * tt * tt, p = pos(d);
    drawObj(p, d / R, 1);
    const v = aPx * tt;
    if (v > 4) D.arrow(ctx, p.x, p.y - R - 8 * s, p.x + Math.cos(thr) * Math.min(90 * s, v * 0.35), p.y - R - 8 * s + Math.sin(thr) * Math.min(90 * s, v * 0.35), { color: PL.col("accent-2"), width: 2.2, label: "v" });
    const names = { block: "無摩擦滑塊（β = 0）", ball: "實心球（β ≈ 0.4）", disk: beta < 0.7 ? "實心圓柱（β ≈ 0.5）" : "圓環（β ≈ 1）" };
    D.text(ctx, names[kind], W - 18 * s, 44 * s, { color: PL.col("text"), size: 12.5, align: "right", weight: "700" });
    D.text(ctx, "a = g sinθ / (1 + β)：β 越大，轉動分走的能量越多", W - 18 * s, 62 * s, { color: PL.col("text-dim"), size: 10.5, align: "right" });
    D.text(ctx, "殘影間隔 0.25 s", xB - 10 * s, yB - 26 * s, { color: PL.col("text-dim"), size: 10, align: "right" });
    ctx.save(); ctx.strokeStyle = PL.col("warn"); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(xB, yB, 34 * s, Math.PI, Math.PI + thr); ctx.stroke(); ctx.restore();
    D.text(ctx, "θ = " + PL.fmt(th, 0) + "°", xB - 40 * s, yB - 8 * s, { color: PL.col("warn"), size: 10.5, align: "right" });
    label(ctx, 20, 18, "下滑加速度 a", PL.fmt(acc, 2) + " m/s²", 118, c);
  };

  /* 兩節火箭：第一節燒完就丟掉，第二節接著加速 */
  SC["multistage-rocket"] = k => {
    const { ctx, W, H, a: ve, b: ratio, t, s, c, v: dv, cfg } = k;
    const cyc = 9, tau = t % cyc, f1 = 1 - 1 / ratio;
    const u1 = clamp((tau - 1) / 2.5, 0, 1), u2 = clamp((tau - 4) / 2.5, 0, 1);
    const on1 = tau > 1 && tau < 3.5, on2 = tau > 4 && tau < 6.5, sep = tau >= 3.5;
    const v1 = ve * Math.log(1 / (1 - f1 * u1)), vNow = v1 + ve * Math.log(1 / (1 - f1 * u2));
    let alt = 0;
    for (let i = 0; i < 24; i++) { const tt = (i + 0.5) / 24 * tau; const a1 = clamp((tt - 1) / 2.5, 0, 1), a2 = clamp((tt - 4) / 2.5, 0, 1); alt += (ve * Math.log(1 / (1 - f1 * a1)) + ve * Math.log(1 / (1 - f1 * a2))) * tau / 24; }
    const gy = H * 0.9, hr = Math.min(H * 0.5, 230 * s), wr = hr * 0.15, padX = W * 0.44;
    const h1 = hr * 0.55, h2 = hr * 0.45 - wr * 1.2;
    const base = gy - 14 * s - alt * 0.03 * s;
    const shift = Math.max(0, H * 0.45 - (base - hr * 0.5));
    AP.outdoor(ctx, W, H, gy + shift, { t, hills: true, sunX: W * 0.86 });
    if (gy + shift < H + 20) { ctx.fillStyle = isL() ? "#9a9ea6" : "#3a3e46"; ctx.fillRect(padX - 70 * s, gy + shift - 12 * s, 140 * s, 12 * s); AP.steel(ctx, padX - wr - 40 * s, gy + shift - hr * 1.05, 12 * s, hr * 1.05 - 12 * s, -8); }
    const by = base + shift, flameL = (26 + 80 * fr(ve, cfg.a)) * s;
    // 第一節（分離後往下掉並旋轉）
    if (!sep) { if (on1) flame(ctx, padX, by + 6, wr, flameL, t); rocketBody(ctx, padX, by, wr, h1, f1 * (1 - u1), false, true); }
    else {
      const ts = tau - 3.5, fx = padX - ts * 26 * s, fy = by - h1 * 0 + ts * ts * 60 * s + ts * 20 * s;
      ctx.save(); ctx.translate(fx, fy - h1 / 2); ctx.rotate(-ts * 0.9); ctx.translate(-fx, -(fy - h1 / 2)); rocketBody(ctx, fx, fy, wr, h1, 0, false, true); ctx.restore();
      if (ts < 1.2) AP.smokePuff(ctx, padX, by - h1, ts, { scale: 1.2 * s, seed: 4, life: 1.2 });
    }
    const b2 = by - h1 - 2 * s;
    if (on2) flame(ctx, padX, b2 + 6, wr * 0.9, flameL * 0.9, t);
    rocketBody(ctx, padX, b2, wr * 0.92, h2, f1 * (1 - u2), true, false, "rgb(70,110,200)");
    AP.lcd(ctx, W - 176 * s, 20, 158 * s, 24 * s, "v = " + PL.fmt(vNow, 0) + " m/s", { color: "rgb(120,236,255)" });
    const st = tau < 1 ? "倒數點火…" : on1 ? "第一節燃燒中" : tau < 4 ? "第一節分離！丟掉空殼" : on2 ? "第二節燃燒中" : "兩節都燒完：Δv = 2vₑ ln(比)";
    D.text(ctx, st, W - 18 * s, 66 * s, { color: sep && tau < 4 ? PL.col("danger") : PL.col("text"), size: 12, align: "right", weight: "700" });
    if (!sep) D.text(ctx, "第一節", padX + wr * 0.7, by - h1 * 0.5, { color: PL.col("text-dim"), size: 10 });
    D.text(ctx, "第二節", padX + wr * 0.7, b2 - h2 * 0.5, { color: PL.col("text-dim"), size: 10 });
    label(ctx, 20, 18, "兩級總 Δv", PL.fmt(dv, 0) + " m/s", 118, c);
  };

  /* 轉動定律：砝碼拉動飛輪；配重往外移，轉動慣量變大 */
  SC["rotation-dynamics"] = k => {
    const { ctx, W, H, a: tq, b: I, t, s, c, v: alpha, cfg } = k;
    const benchY = H * 0.9;
    AP.labRoom(ctx, W, H, benchY, {});
    const cx = W * 0.4, cy = H * 0.4, R = Math.min(H * 0.3, W * 0.2), rh = 12;
    AP.steel(ctx, cx - 7 * s, cy, 14 * s, benchY - cy - 8 * s, -6);
    AP.steel(ctx, cx - 60 * s, benchY - 9 * s, 120 * s, 9 * s, -10);
    const massR = R * (0.26 + 0.64 * fr(I, cfg.b));
    const av = alpha * 0.15, wmax = 14;
    const mw = (18 + 26 * fr(tq, cfg.a)) * s, mh = mw * 0.8;
    const drop0 = cy + R * 0.2, maxDrop = benchY - 14 * s - mh - drop0;
    const angAt = tt => (av * tt < wmax ? 0.5 * av * tt * tt : wmax * wmax / (2 * av) + wmax * (tt - wmax / av));
    let tEnd = 0; while (tEnd < 12 && rh * angAt(tEnd) < maxDrop) tEnd += 0.05;
    const tt = t % (tEnd + 0.8), tc = Math.min(tt, tEnd), ang = angAt(tc);
    AP.flywheel(ctx, cx, cy, R, ang, massR, 6);
    const drop = Math.min(maxDrop, rh * ang);
    AP.cord(ctx, cx + rh, cy, cx + rh, drop0 + drop);
    AP.weight(ctx, cx + rh, drop0 + drop + 5, mw, mh, null);
    D.text(ctx, "τ", cx + rh + mw / 2 + 8 * s, drop0 + drop + mh / 2 + 4, { color: PL.col("warn"), size: 12, weight: "700" });
    const w = Math.min(wmax, av * tc) / 0.15;
    AP.lcd(ctx, W - 160 * s, 20, 142 * s, 24 * s, "ω = " + PL.fmt(w, 1) + " rad/s", { color: "rgb(130,240,170)" });
    D.line(ctx, cx, cy - R - 16 * s, cx + massR, cy - R - 16 * s, PL.col("accent-2"), 1.4, [3, 3]);
    D.text(ctx, "配重離軸越遠 → I 越大", cx + massR + 8 * s, cy - R - 12 * s, { color: PL.col("accent-2"), size: 10.5, weight: "700" });
    D.text(ctx, "α = τ / I", W - 18 * s, 68 * s, { color: PL.col("text"), size: 12.5, align: "right", weight: "700" });
    D.text(ctx, "I = " + PL.fmt(I, 2) + " kg·m²，τ = " + PL.fmt(tq, 1) + " N·m", W - 18 * s, 86 * s, { color: PL.col("text-dim"), size: 10.5, align: "right" });
    label(ctx, 20, 18, "角加速度 α", PL.fmt(alpha, 2) + " rad/s²", 118, c);
  };

  /* 熱傳導與保溫：烤箱壁的玻璃棉越厚，漏出來的熱越少 */
  SC["heat-transfer"] = k => {
    const { ctx, W, H, a: dT, b: ins, t, s, c, v: q, cfg } = k;
    const L = isL(), floorY = H * 0.9;
    AP.labRoom(ctx, W, H, floorY, { bench: "none" });
    AP.woodFloor(ctx, W, H, floorY);
    const wx = W * 0.42, gw = (8 + 46 * fr(ins, cfg.b)) * s, sw = 6 * s, top = H * 0.14;
    const inT = 20 + dT, heat = clamp(dT / 160, 0, 1);
    const og = ctx.createLinearGradient(0, top, 0, floorY);
    og.addColorStop(0, `rgb(${Math.round(90 + 150 * heat)},${Math.round(60 + 50 * heat)},40)`); og.addColorStop(1, `rgb(${Math.round(50 + 90 * heat)},30,20)`);
    ctx.fillStyle = og; ctx.fillRect(0, top, wx, floorY - top);
    noteC(ctx, `rgb(${Math.round(70 + 120 * heat)},45,30)`, 0, top, wx, floorY - top);
    AP.steel(ctx, 0, top - 10 * s, wx + 2 * sw + gw, 10 * s, -10);
    for (let i = 0; i < 2; i++) {
      const hy = top + (floorY - top) * (0.22 + i * 0.5);
      ctx.save(); ctx.strokeStyle = `rgb(${Math.round(120 + 135 * heat)},${Math.round(40 + 60 * heat)},30)`; ctx.lineWidth = 4 * s; ctx.shadowColor = "rgba(255,120,40,0.9)"; ctx.shadowBlur = 14 * heat;
      ctx.beginPath(); for (let x = 16 * s; x < wx - 16 * s; x += 3) { const y = hy + Math.sin(x * 0.2) * 5 * s; x === 16 * s ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore();
    }
    const tray = top + (floorY - top) * 0.55;
    AP.steel(ctx, 30 * s, tray, wx - 60 * s, 5 * s, 10);
    for (let i = 0; i < 4; i++) { ctx.fillStyle = "rgb(214,160,90)"; ctx.beginPath(); ctx.ellipse(56 * s + i * (wx - 100 * s) / 3, tray - 5 * s, 16 * s, 6 * s, 0, 0, PL.TAU); ctx.fill(); ctx.fillStyle = "rgb(90,50,20)"; ctx.fillRect(50 * s + i * (wx - 100 * s) / 3, tray - 8 * s, 3, 3); }
    AP.steel(ctx, wx, top, sw, floorY - top, 10);
    const gl = ctx.createLinearGradient(wx + sw, 0, wx + sw + gw, 0);
    gl.addColorStop(0, "rgb(236,206,100)"); gl.addColorStop(0.5, "rgb(250,224,140)"); gl.addColorStop(1, "rgb(226,192,88)");
    ctx.fillStyle = gl; ctx.fillRect(wx + sw, top, gw, floorY - top);
    ctx.strokeStyle = "rgba(170,130,40,0.5)"; ctx.lineWidth = 1;
    for (let y = top + 6; y < floorY; y += 9 * s) { ctx.beginPath(); ctx.moveTo(wx + sw, y); ctx.quadraticCurveTo(wx + sw + gw / 2, y + 5 * s, wx + sw + gw, y); ctx.stroke(); }
    AP.steel(ctx, wx + sw + gw, top, sw, floorY - top, 16);
    const outX = wx + 2 * sw + gw, lq = Math.log10(Math.max(1, q / 30)) / 3;
    for (let i = 0; i < 5; i++) {
      const y = top + (floorY - top) * (0.15 + i * 0.17), ph = ((t * 0.8 + i * 0.37) % 1);
      const x0 = wx - 40 * s + ph * 20 * s, x1 = outX + 20 * s + (30 + 90 * lq) * s * (0.5 + ph * 0.5);
      D.arrow(ctx, x0, y, x1, y, { color: `rgba(255,${Math.round(120 - 60 * lq)},60,${(0.35 + 0.6 * lq).toFixed(2)})`, width: 1.5 + 3.5 * lq, head: 10 });
    }
    AP.heatWaves(ctx, outX + 4 * s, floorY - 6, 90 * s, floorY - top, t, 0.2 + 0.8 * lq);
    AP.thermometer(ctx, wx - 36 * s, top + 20 * s, top + 130 * s, 11 * s, clamp(inT / 200, 0, 1));
    D.text(ctx, "烤箱內 " + PL.fmt(inT, 0) + " °C", wx - 50 * s, top + 36 * s, { color: "#fff", size: 12, align: "right", weight: "700" });
    AP.thermometer(ctx, W - 50 * s, top + 60 * s, top + 170 * s, 11 * s, 0.1);
    D.text(ctx, "室溫 20 °C", W - 64 * s, top + 76 * s, { color: PL.col("text"), size: 11.5, align: "right", weight: "700" });
    D.text(ctx, "玻璃棉保溫層", wx + sw + gw / 2, floorY - 14 * s, { color: "rgb(110,80,20)", size: 10, align: "center", weight: "700" });
    AP.lcd(ctx, W - 170 * s, H * 0.62, 150 * s, 24 * s, "漏熱 " + PL.fmt(q, 0) + " W", { color: "rgb(255,160,90)" });
    label(ctx, 20, 18, "熱流率", PL.fmt(q, 0) + " W", 104, c);
  };

  /* 熱膨脹：鐵軌之間的伸縮縫，熱天會被吃掉 */
  SC["thermal-expansion"] = k => {
    const { ctx, W, H, a: L0, b: dT, t, s, c, v: dL, cfg } = k;
    const gy = H * 0.62;
    AP.outdoor(ctx, W, H, gy, { t, hills: true, sunX: W * 0.84 });
    const bedY = gy + 26 * s, railY = bedY - 16 * s;
    ctx.fillStyle = isL() ? "#a09a90" : "#3e3b37"; AP.poly(ctx, [{ x: 0, y: bedY + 30 * s }, { x: 0, y: bedY }, { x: W, y: bedY }, { x: W, y: bedY + 30 * s }], ctx.fillStyle);
    for (let x = 8 * s; x < W; x += 34 * s) { ctx.fillStyle = isL() ? "rgb(120,86,54)" : "rgb(70,50,32)"; ctx.fillRect(x, bedY - 6 * s, 22 * s, 8 * s); }
    const gap0 = 10, gapMm = Math.max(0, gap0 - dL), gapPx = gapMm * 1.4 * s + (gapMm > 0 ? 1 : 0), xj = W * 0.52;
    const buckle = dL > gap0 ? Math.min(26 * s, (dL - gap0) * 1.2 * s) : 0;
    const seg = (60 + 320 * fr(L0, cfg.a)) * s;
    const rail = (x0, x1, bend) => {
      ctx.save(); ctx.lineCap = "butt";
      ctx.strokeStyle = "rgb(120,126,136)"; ctx.lineWidth = 9 * s; ctx.beginPath();
      for (let i = 0; i <= 20; i++) { const x = x0 + (x1 - x0) * i / 20, y = railY - bend * Math.sin(Math.PI * i / 20); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
    };
    rail(Math.max(0, xj - gapPx / 2 - seg), xj - gapPx / 2, buckle);
    rail(xj + gapPx / 2, W, buckle * 0.6);
    if (xj - gapPx / 2 - seg > 0) rail(0, xj - gapPx / 2 - seg - 3 * s, 0);
    AP.steel(ctx, xj - 22 * s, railY - 3 * s, 44 * s, 7 * s, 10);
    [-14, -5, 5, 14].forEach(o => AP.brassDisc(ctx, xj + o * s, railY + 0.5 * s, 2 * s));
    AP.heatWaves(ctx, 0, railY - 8 * s, W, 50 * s, t, clamp(dT / 300, 0, 1));
    D.arrow(ctx, xj - gapPx / 2 - seg, railY - 26 * s, xj - gapPx / 2, railY - 26 * s, { color: PL.col("text"), width: 1.4, head: 6 });
    D.text(ctx, "L₀ = " + PL.fmt(L0, 1) + " m", xj - gapPx / 2 - seg / 2, railY - 32 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    const cw = Math.min(250 * s, W * 0.36), ch = 110 * s, cx0 = W - cw - 16 * s, cy0 = gy + 50 * s;
    AP.infoCard(ctx, cx0, cy0, cw, ch);
    const zx = cx0 + cw / 2, zy = cy0 + ch * 0.46, zg = gapMm * 7 * s;
    ctx.fillStyle = "rgb(120,126,136)"; ctx.fillRect(cx0 + 14 * s, zy - 10 * s, zx - zg / 2 - cx0 - 14 * s, 20 * s); ctx.fillRect(zx + zg / 2, zy - 10 * s, cx0 + cw - 14 * s - zx - zg / 2, 20 * s);
    for (let mm = 0; mm <= 10; mm++) { const x = zx - 35 * s + mm * 7 * s; D.line(ctx, x, zy + 14 * s, x, zy + (mm % 5 ? 18 : 22) * s, PL.col("text-dim"), 1); }
    D.text(ctx, "伸縮縫放大：剩 " + PL.fmt(gapMm, 1) + " mm（原本 10 mm）", cx0 + 10 * s, cy0 + 16 * s, { color: PL.col("text"), size: 10.5, weight: "700" });
    D.text(ctx, buckle > 0 ? "縫隙用完 → 鐵軌擠壓挫曲！" : "ΔL = αL₀ΔT = " + PL.fmt(dL, 2) + " mm", cx0 + 10 * s, cy0 + ch - 12 * s, { color: buckle > 0 ? PL.col("danger") : PL.col("text-dim"), size: 10.5, weight: "700" });
    AP.lcd(ctx, W - 150 * s, 20, 132 * s, 24 * s, "ΔT = " + PL.fmt(dT, 0) + " K", { color: "rgb(255,170,90)" });
    label(ctx, 20, 18, "伸長量 ΔL", PL.fmt(dL, 2) + " mm", 110, c);
  };

  /* 雷諾實驗：染料線在層流時筆直，流速變快就開始抖動、散成紊流 */
  SC["viscosity-reynolds"] = k => {
    const { ctx, W, H, a: v, b: nu, t, s, c, v: Re, cfg } = k;
    const benchY = H * 0.88;
    AP.labRoom(ctx, W, H, benchY, {});
    const L = isL(), vis = fr(nu, cfg.b);
    const liq = [Math.round(120 + 110 * vis), Math.round(192 - 34 * vis), Math.round(228 - 160 * vis)];
    const tx = 26 * s, tw = 112 * s, tTop = H * 0.22, pipeY = H * 0.56, pr = 13 * s, px1 = W - 78 * s;
    const lg = ctx.createLinearGradient(0, tTop, 0, benchY);
    lg.addColorStop(0, `rgba(${liq[0]},${liq[1]},${liq[2]},0.42)`); lg.addColorStop(1, `rgba(${Math.round(liq[0] * 0.8)},${Math.round(liq[1] * 0.8)},${Math.round(liq[2] * 0.8)},0.6)`);
    ctx.fillStyle = lg; ctx.fillRect(tx + 2, tTop + 16 * s, tw - 4, benchY - tTop - 18 * s);
    ctx.strokeStyle = L ? "rgba(84,124,152,0.8)" : "rgba(206,232,244,0.85)"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(tx, tTop); ctx.lineTo(tx, benchY); ctx.lineTo(tx + tw, benchY); ctx.lineTo(tx + tw, tTop); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.fillRect(tx + 5, tTop + 20 * s, 2, benchY - tTop - 30 * s);
    // 染料瓶與針頭
    const bx = tx + tw * 0.5, bTop = tTop - 50 * s;
    ctx.fillStyle = "rgba(226,244,252,0.5)"; AP.rrPath(ctx, bx - 14 * s, bTop, 28 * s, 34 * s, 6 * s); ctx.fill();
    ctx.fillStyle = "rgba(210,30,60,0.85)"; ctx.fillRect(bx - 11 * s, bTop + 12 * s, 22 * s, 20 * s);
    ctx.strokeStyle = L ? "rgba(84,124,152,0.8)" : "rgba(206,232,244,0.8)"; ctx.lineWidth = 1.2; AP.rrPath(ctx, bx - 14 * s, bTop, 28 * s, 34 * s, 6 * s); ctx.stroke();
    ctx.strokeStyle = "rgb(150,158,170)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(bx, bTop + 34 * s); ctx.lineTo(bx, pipeY - 10 * s); ctx.quadraticCurveTo(bx, pipeY, bx + 14 * s, pipeY); ctx.lineTo(tx + tw + 4 * s, pipeY); ctx.stroke();
    // 喇叭口與玻璃管
    AP.poly(ctx, [{ x: tx + tw - 14 * s, y: pipeY - pr * 2 }, { x: tx + tw, y: pipeY - pr }, { x: tx + tw, y: pipeY + pr }, { x: tx + tw - 14 * s, y: pipeY + pr * 2 }], "rgba(226,244,252,0.4)", L ? "rgba(84,124,152,0.8)" : "rgba(206,232,244,0.8)");
    ctx.fillStyle = `rgba(${liq[0]},${liq[1]},${liq[2]},0.38)`; ctx.fillRect(tx + tw, pipeY - pr, px1 - tx - tw, pr * 2);
    AP.steel(ctx, (tx + tw + px1) / 2 - 4 * s, pipeY + pr, 8 * s, benchY - pipeY - pr, -8);
    const xs = tx + tw + 6 * s, xe = px1 - 6 * s, len = xe - xs;
    const regime = Re < 2000 ? 0 : Re < 4000 ? (Re - 2000) / 2000 : 1;
    ctx.save(); ctx.beginPath(); ctx.rect(xs - 2, pipeY - pr + 2, len + 4, 2 * pr - 4); ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let i = 0; i < 14; i++) { const x = xs + (((i * 0.37 + t * (0.05 + v * 0.12)) % 1 + 1) % 1) * len, y = pipeY + (((i * 7) % 11) - 5) / 6 * pr * 0.8; ctx.fillRect(x, y, 2, 1.4); }
    ctx.strokeStyle = "rgba(214,30,60,0.92)"; ctx.lineWidth = 2 * s; ctx.beginPath();
    for (let i = 0; i <= 140; i++) {
      const x = xs + len * i / 140, u = i / 140, grow = clamp((u - 0.12) / 0.4, 0, 1) * regime;
      const y = pipeY + pr * 0.85 * grow * (0.6 * Math.sin(u * 40 - t * (2 + v * 3)) + 0.4 * Math.sin(u * 91 + t * 5));
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    if (regime > 0.4) {
      const n = Math.round(46 * regime);
      for (let i = 0; i < n; i++) {
        const u = 0.42 + (((i * 0.618 + t * 0.2 * (1 + v)) % 0.58) + 0.58) % 0.58, fu = (u - 0.42) / 0.58;
        ctx.fillStyle = `rgba(214,40,70,${(0.1 + 0.25 * regime * fu).toFixed(2)})`;
        ctx.beginPath(); ctx.arc(xs + len * u, pipeY + pr * 0.75 * Math.sin(i * 12.99 + t * 3), (2.5 + 6 * fu) * s, 0, PL.TAU); ctx.fill();
      }
    }
    ctx.restore();
    ctx.strokeStyle = L ? "rgba(84,124,152,0.85)" : "rgba(206,232,244,0.85)"; ctx.lineWidth = 1.6;
    ctx.strokeRect(tx + tw, pipeY - pr, px1 - tx - tw, pr * 2);
    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fillRect(tx + tw + 4, pipeY - pr + 3, px1 - tx - tw - 8, 2);
    AP.steel(ctx, px1, pipeY - pr - 4 * s, 16 * s, pr * 2 + 8 * s, 10);
    const hang = -0.9 + 0.8 * fr(v, cfg.a);
    ctx.save(); ctx.translate(px1 + 8 * s, pipeY - pr - 4 * s); ctx.rotate(hang); ctx.fillStyle = "rgb(214,60,52)"; ctx.fillRect(-3 * s, -26 * s, 6 * s, 26 * s); ctx.restore();
    const sw = (2 + 7 * fr(v, cfg.a)) * s;
    ctx.fillStyle = `rgba(${liq[0]},${liq[1]},${liq[2]},0.6)`; ctx.fillRect(px1 + 16 * s, pipeY - sw / 2, 10 * s, sw);
    ctx.beginPath(); ctx.moveTo(px1 + 24 * s, pipeY - sw / 2); ctx.quadraticCurveTo(px1 + 40 * s, pipeY, px1 + 40 * s, benchY - 40 * s); ctx.lineTo(px1 + 40 * s + sw, benchY - 40 * s); ctx.quadraticCurveTo(px1 + 40 * s + sw, pipeY + sw, px1 + 24 * s, pipeY + sw / 2); ctx.closePath(); ctx.fill();
    AP.beaker(ctx, px1 + 42 * s, benchY, 50 * s, 42 * s, 0.5, `rgb(${liq[0]},${liq[1]},${liq[2]})`);
    const st = Re < 2000 ? "層流：染料線筆直" : Re < 4000 ? "過渡區：染料線開始抖動" : "紊流：染料散開、混在一起";
    D.text(ctx, "Re = " + PL.fmt(Re, 0), (xs + xe) / 2, pipeY - pr - 30 * s, { color: PL.col("text"), size: 14, align: "center", weight: "700" });
    D.text(ctx, st, (xs + xe) / 2, pipeY - pr - 12 * s, { color: Re < 2000 ? PL.col("ok") : Re < 4000 ? PL.col("warn") : PL.col("danger"), size: 12, align: "center", weight: "700" });
    D.text(ctx, "液體黏度越大顏色越深（水 → 甘油）", tx, tTop - 62 * s, { color: PL.col("text-dim"), size: 10 });
    label(ctx, W - 150, 18, "相對雷諾數 Re", PL.fmt(Re, 0), 130, c);
  };

  /* 油壓千斤頂：小活塞推一下，大活塞把汽車頂高一點點 */
  SC["continuity-hydraulic"] = k => {
    const { ctx, W, H, a: ratio, b: F1, t, s, c, v: F2, cfg } = k;
    const floorY = H * 0.62;
    AP.labRoom(ctx, W, H, floorY, { bench: "none" });
    AP.concreteFloor(ctx, W, H, floorY);
    const L = isL(), pitY = floorY + 8 * s, oilY = H - 30 * s;
    ctx.fillStyle = L ? "rgba(90,84,76,0.35)" : "rgba(0,0,0,0.35)"; ctx.fillRect(W * 0.1, pitY, W * 0.8, H - pitY - 8 * s);
    D.text(ctx, "地板剖面", W * 0.1 + 6 * s, H - 14 * s, { color: PL.theme.pale(0.7), size: 9.5 });
    const xs = W * 0.22, xl = W * 0.62, ws = 26 * s, wl = clamp(ws * Math.sqrt(ratio), 34 * s, W * 0.3);
    const oil = "rgba(222,168,44,0.9)", cyc = 1.4, n = Math.floor(t / cyc) % 8, ph = (t % cyc) / cyc;
    const push = ph < 0.5 ? ph * 2 : 1 - (ph - 0.5) * 2, d1 = 34 * s;
    const lift = Math.min(96 * s, (n + (ph < 0.5 ? push : 1)) * d1 / ratio);
    const sTop = floorY - 80 * s, pS = sTop + 14 * s + push * d1;
    ctx.fillStyle = oil;
    ctx.fillRect(xs - ws / 2 + 3, pS, ws - 6, oilY - pS);
    ctx.fillRect(xs, oilY - 14 * s, xl - xs, 14 * s);
    const lTop = floorY - 10 * s, pL = lTop + 20 * s - lift;
    ctx.fillRect(xl - wl / 2 + 3, pL, wl - 6, oilY - pL);
    [[xs, ws, sTop], [xl, wl, lTop]].forEach(q => {
      const g = ctx.createLinearGradient(q[0] - q[1] / 2, 0, q[0] + q[1] / 2, 0);
      g.addColorStop(0, "rgba(200,208,220,0.55)"); g.addColorStop(0.5, "rgba(255,255,255,0.12)"); g.addColorStop(1, "rgba(180,190,204,0.55)");
      ctx.fillStyle = g; ctx.fillRect(q[0] - q[1] / 2, q[2], q[1], oilY - q[2]);
      ctx.strokeStyle = "rgba(60,68,80,0.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q[0] - q[1] / 2, q[2]); ctx.lineTo(q[0] - q[1] / 2, oilY); ctx.moveTo(q[0] + q[1] / 2, q[2]); ctx.lineTo(q[0] + q[1] / 2, oilY); ctx.stroke();
    });
    ctx.strokeStyle = "rgba(60,68,80,0.8)"; ctx.lineWidth = 2; ctx.strokeRect(xs, oilY - 14 * s, xl - xs, 14 * s);
    AP.steel(ctx, xs - ws / 2 + 2, pS - 8 * s, ws - 4, 8 * s, 8);
    AP.steel(ctx, xs - 3 * s, pS - 64 * s, 6 * s, 56 * s, 12);
    AP.hand(ctx, xs, pS - 64 * s, 1, 0.8 * s, { ang: Math.PI / 2, sleeve: "#d0643a" });
    AP.steel(ctx, xl - wl / 2 + 2, pL - 10 * s, wl - 4, 10 * s, 8);
    const platY = floorY - 30 * s - lift, cl = Math.min(200 * s, W * 0.34);
    AP.steel(ctx, xl - wl * 0.18, platY, wl * 0.36, pL - 10 * s - platY, 14);
    AP.steel(ctx, xl - cl * 0.6, platY, cl * 1.2, 8 * s, 6);
    AP.car(ctx, xl, platY, cl, { color: "#2f7fd8" });
    const fa = (14 + 40 * fr(F1, cfg.b)) * s;
    D.arrow(ctx, xs + 22 * s, pS - 70 * s, xs + 22 * s, pS - 70 * s + fa, { color: "#e0473c", width: 3, label: "F₁" });
    const fb = Math.min(110 * s, fa * Math.sqrt(ratio));
    D.arrow(ctx, xl + wl / 2 + 20 * s, pL + 20 * s, xl + wl / 2 + 20 * s, pL + 20 * s - fb, { color: "#1f9d55", width: 3.4, label: "F₂" });
    D.text(ctx, "A₂ / A₁ = " + PL.fmt(ratio, 1), (xs + xl) / 2, oilY - 22 * s, { color: PL.theme.pale(0.85), size: 11, align: "center", weight: "700" });
    D.text(ctx, "壓力處處相等：F₂ = F₁ × A₂/A₁", W - 18 * s, 44 * s, { color: PL.col("text"), size: 12.5, align: "right", weight: "700" });
    D.text(ctx, "小活塞推下 d，大活塞只升 d ÷ " + PL.fmt(ratio, 1) + "（功相同）", W - 18 * s, 62 * s, { color: PL.col("text-dim"), size: 10.5, align: "right" });
    label(ctx, 20, 18, "舉升力 F₂", PL.fmt(F2, 0) + " N", 110, c);
  };

  /* 馬呂斯定律：光源 → 起偏器 → 檢偏器（轉 θ）→ 光屏 */
  SC["malus-law"] = k => {
    const { ctx, W, H, a: th, b: I0, t, s, c, v: I } = k;
    const benchY = H * 0.92;
    AP.labRoom(ctx, W, H, benchY, {});
    const railY = benchY - 30 * s, cy = H * 0.44, r = Math.min(40 * s, H * 0.1);
    AP.bench(ctx, 24 * s, W - 24 * s, railY, { pxPerCm: (W - 48 * s) / 100, cm0: 0 });
    const xL = 96 * s, x1 = W * 0.36, x2 = W * 0.6, xS = W * 0.85, thr = th * Math.PI / 180;
    const band = (xa, xb, a) => { const g = ctx.createLinearGradient(0, cy - 10 * s, 0, cy + 10 * s); g.addColorStop(0, `rgba(255,240,170,0)`); g.addColorStop(0.5, `rgba(255,236,150,${a.toFixed(3)})`); g.addColorStop(1, `rgba(255,240,170,0)`); ctx.fillStyle = g; ctx.fillRect(xa, cy - 10 * s, xb - xa, 20 * s); };
    band(xL, x1, 0.5 + 0.35 * I0 / 100); band(x1, x2, 0.1 + 0.8 * I0 / 100); band(x2, xS, 0.05 + 0.85 * I / 100);
    const sym = (x, y, angs, a) => { ctx.save(); ctx.strokeStyle = `rgba(220,120,20,${a})`; ctx.lineWidth = 1.6; angs.forEach(q => { const dx = Math.sin(q) * 11 * s, dy = -Math.cos(q) * 11 * s; D.arrow(ctx, x - dx, y - dy, x + dx, y + dy, { color: `rgba(220,120,20,${a})`, width: 1.6, head: 5 }); D.arrow(ctx, x + dx, y + dy, x - dx, y - dy, { color: `rgba(220,120,20,${a})`, width: 1.6, head: 5 }); }); ctx.restore(); };
    sym((xL + x1) / 2, cy - 34 * s, [0, Math.PI / 3, -Math.PI / 3], 0.9);
    sym((x1 + x2) / 2, cy - 34 * s, [0], 0.9);
    if (I > 0.5) sym((x2 + xS) / 2, cy - 34 * s, [thr], 0.3 + 0.6 * I / 100);
    AP.carrier(ctx, xL - 26 * s, railY, cy + 34 * s);
    AP.lampHouse(ctx, xL, cy, s, "rgba(255,244,210," + (0.5 + 0.5 * I0 / 100).toFixed(2) + ")");
    AP.carrier(ctx, x1, railY, cy + r + 24 * s); AP.polarizer(ctx, x1, cy, r, 0);
    AP.carrier(ctx, x2, railY, cy + r + 24 * s); AP.polarizer(ctx, x2, cy, r, thr);
    AP.carrier(ctx, xS, railY, cy + 60 * s);
    const pap = AP.paperScreen(ctx, xS, cy, 56 * s, 96 * s);
    const sg = ctx.createRadialGradient(xS, cy, 2, xS, cy, 26 * s);
    sg.addColorStop(0, `rgba(255,230,120,${(0.05 + 0.9 * I / 100).toFixed(3)})`); sg.addColorStop(1, "rgba(255,230,120,0)");
    ctx.fillStyle = sg; ctx.fillRect(pap.x, pap.y, pap.w, pap.h);
    D.text(ctx, "非偏振光", (xL + x1) / 2, cy - 54 * s, { color: PL.col("text-dim"), size: 10, align: "center" });
    D.text(ctx, "起偏器", x1, cy + r + 18 * s + 30, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    D.text(ctx, "檢偏器 θ = " + PL.fmt(th, 0) + "°", x2, cy + r + 18 * s + 30, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    D.text(ctx, "I₀ = " + PL.fmt(I0, 0), (x1 + x2) / 2, cy + 26 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    AP.lcd(ctx, xS - 44 * s, cy - 96 * s, 88 * s, 22 * s, "I = " + PL.fmt(I, 1), { color: "rgb(255,210,110)" });
    D.text(ctx, "I = I₀ cos²θ", W - 18 * s, 44 * s, { color: PL.col("text"), size: 13, align: "right", weight: "700" });
    label(ctx, 20, 18, "透射強度 I", PL.fmt(I, 1), 104, c);
  };

  /* 薄膜干涉：鐵絲圈上的肥皂膜，厚度決定哪一種顏色被增強 */
  SC["thin-film"] = k => {
    const { ctx, W, H, a: tn, b: ang, t, s, c, v: lam } = k;
    const benchY = H * 0.9;
    AP.labRoom(ctx, W, H, benchY, {});
    const cx = W * 0.3, cy = H * 0.42, R = Math.min(H * 0.29, W * 0.19);
    AP.steel(ctx, cx - 3 * s, cy + R, 6 * s, benchY - cy - R - 6 * s, -6);
    AP.steel(ctx, cx - 34 * s, benchY - 7 * s, 68 * s, 7 * s, -10);
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, PL.TAU); ctx.clip();
    for (let i = -3; i <= 3; i++) {
      const col = AP.nmColor(lam + i * 12, 0.5 - Math.abs(i) * 0.08) || "rgba(160,160,170,0.2)";
      const y = cy - R + ((i + 3) / 7) * 2 * R + Math.sin(t * 0.6 + i) * 6 * s;
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx + Math.sin(t * 0.3 + i * 1.7) * 8 * s, y, R * 1.3, R * 0.32, 0.1 * Math.sin(t * 0.2 + i), 0, PL.TAU); ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.beginPath(); ctx.ellipse(cx - R * 0.4, cy - R * 0.45, R * 0.25, R * 0.1, -0.6, 0, PL.TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgb(150,160,176)"; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.arc(cx, cy, R, 0, PL.TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R - 1, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
    D.text(ctx, "肥皂膜", cx, cy - R - 12 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    const cw = Math.min(W * 0.46, 350 * s), ch = Math.min(H * 0.6, 250 * s), cx0 = W - cw - 16 * s, cy0 = H * 0.16;
    AP.infoCard(ctx, cx0, cy0, cw, ch);
    D.text(ctx, "側視：兩道反射光疊加", cx0 + 12 * s, cy0 + 18 * s, { color: PL.col("text"), size: 11, weight: "700" });
    const fy = cy0 + ch * 0.52, ft = (8 + 54 * tn / 900) * s, fx0 = cx0 + 14 * s, fx1 = cx0 + cw - 14 * s;
    ctx.fillStyle = AP.nmColor(lam, 0.35) || "rgba(170,200,230,0.35)"; ctx.fillRect(fx0, fy, fx1 - fx0, ft);
    ctx.strokeStyle = "rgba(60,90,130,0.7)"; ctx.lineWidth = 1.2; ctx.strokeRect(fx0, fy, fx1 - fx0, ft);
    const th1 = ang * Math.PI / 180, th2 = Math.asin(Math.sin(th1) / 1.33), ex = cx0 + cw * 0.42, Lr = ch * 0.34;
    const ray = (x1, y1, x2, y2, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    ray(ex - Lr * Math.sin(th1), fy - Lr * Math.cos(th1), ex, fy, "rgba(230,150,30,0.95)");
    ray(ex, fy, ex + Lr * Math.sin(th1), fy - Lr * Math.cos(th1), "rgba(230,150,30,0.8)");
    const bx = ex + ft * Math.tan(th2), ox = ex + 2 * ft * Math.tan(th2);
    ray(ex, fy, bx, fy + ft, "rgba(230,150,30,0.6)"); ray(bx, fy + ft, ox, fy, "rgba(230,150,30,0.6)");
    ray(ox, fy, ox + Lr * Math.sin(th1), fy - Lr * Math.cos(th1), "rgba(230,150,30,0.8)");
    D.line(ctx, ex, fy - Lr * 0.8, ex, fy + ft + 14 * s, PL.theme.pale(0.4), 1, [3, 3]);
    D.text(ctx, "θ = " + PL.fmt(ang, 0) + "°", ex - 30 * s, fy - Lr * 0.5, { color: PL.col("text-dim"), size: 10, align: "right" });
    D.text(ctx, "t = " + PL.fmt(tn, 0) + " nm", fx1, fy + ft + 16 * s, { color: PL.col("text"), size: 10.5, align: "right", weight: "700" });
    D.text(ctx, "光程差 2nt cosθ₂ 決定哪個顏色增強", cx0 + 12 * s, cy0 + ch - 36 * s, { color: PL.col("text-dim"), size: 10 });
    const sw = AP.nmColor(lam, 1);
    ctx.fillStyle = sw || "rgb(120,120,130)"; AP.rrPath(ctx, cx0 + 12 * s, cy0 + ch - 26 * s, 26 * s, 16 * s, 3); ctx.fill();
    D.text(ctx, "增強 λ ≈ " + PL.fmt(lam, 0) + " nm", cx0 + 44 * s, cy0 + ch - 14 * s, { color: PL.col("text"), size: 11, weight: "700" });
    label(ctx, 20, 18, "相長波長 λ", PL.fmt(lam, 0) + " nm", 110, c);
  };

  /* 斐左測光速：光穿過轉動齒輪的縫，到遠方山頂的鏡子再回來 */
  SC["fizeau-light-speed"] = k => {
    const { ctx, W, H, a: N, b: f, t, s, c, v: cE, cfg } = k;
    const gy = H * 0.86;
    AP.outdoor(ctx, W, H, gy, { t, hills: true, sunX: W * 0.6 });
    AP.building(ctx, 14 * s, gy, 120 * s, 96 * s, {});
    const L = isL(), mx = W - 64 * s, my = gy - 90 * s;
    ctx.fillStyle = L ? "rgba(110,140,110,0.95)" : "rgba(30,48,36,0.95)";
    ctx.beginPath(); ctx.moveTo(W * 0.62, gy); ctx.quadraticCurveTo(mx - 40 * s, my - 10 * s, mx, my + 6 * s); ctx.quadraticCurveTo(mx + 40 * s, my - 4 * s, W, gy - 40 * s); ctx.lineTo(W, gy); ctx.closePath(); ctx.fill();
    AP.steel(ctx, mx - 2 * s, my - 26 * s, 4 * s, 30 * s, 8);
    ctx.fillStyle = "rgb(210,230,245)"; ctx.fillRect(mx - 6 * s, my - 44 * s, 12 * s, 20 * s);
    const sx = 134 * s, sy = gy - 60 * s;
    const sp = clamp(10 + 50 * (1 - fr(f, cfg.b)) * (1 - 0.5 * fr(N, cfg.a)), 8, 60) * s, off = (t * 160 * s) % sp;
    ctx.save(); ctx.strokeStyle = "rgba(255,230,120,0.95)"; ctx.lineWidth = 2.4; ctx.shadowColor = "rgba(255,220,100,0.8)"; ctx.shadowBlur = 5;
    const segLine = (x1, y1, x2, y2, rev) => { const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len; for (let d = (rev ? sp - off : off); d < len; d += sp) { const d2 = Math.min(len, d + sp * 0.45); ctx.beginPath(); ctx.moveTo(x1 + ux * d, y1 + uy * d); ctx.lineTo(x1 + ux * d2, y1 + uy * d2); ctx.stroke(); } };
    segLine(sx, sy, mx - 6 * s, my - 36 * s, false); segLine(mx - 6 * s, my - 32 * s, sx, sy + 5 * s, true);
    ctx.restore();
    D.text(ctx, "遠方山頂的反射鏡", mx - 8 * s, my - 52 * s, { color: PL.col("text"), size: 10.5, align: "right", weight: "700" });
    D.text(ctx, "觀測站", 74 * s, gy - 102 * s, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    const R = Math.min(H * 0.25, W * 0.17), wx = W * 0.34, wy = H * 0.36;
    ctx.save(); ctx.beginPath(); ctx.arc(wx, wy, R + 12 * s, 0, PL.TAU); ctx.fillStyle = "rgba(10,16,28,0.92)"; ctx.fill();
    PL.theme.note(ctx, "rgb(10,16,28)", wx - R * 0.8, wy - R * 0.8, R * 1.6, R * 1.6);
    ctx.clip();
    const nT = clamp(Math.round(N / 40), 10, 45), rot = t * (0.3 + 4 * fr(f, cfg.b)), per = PL.TAU / nT;
    const gph = ((-Math.PI / 2 - rot) % per + per) % per, open = gph > per * 0.5;
    if (open) { const sg = ctx.createRadialGradient(wx, wy - R * 0.93, 1, wx, wy - R * 0.93, 16 * s); sg.addColorStop(0, "rgba(255,240,160,1)"); sg.addColorStop(1, "rgba(255,220,100,0)"); ctx.fillStyle = sg; ctx.fillRect(wx - 16 * s, wy - R * 0.93 - 16 * s, 32 * s, 32 * s); }
    ctx.fillStyle = "rgb(190,196,206)"; ctx.beginPath();
    for (let i = 0; i < nT; i++) { const a0 = rot + i * PL.TAU / nT, a1 = a0 + PL.TAU / nT * 0.5; ctx.arc(wx, wy, R, a0, a1); ctx.arc(wx, wy, R * 0.86, a1, a1 + PL.TAU / nT * 0.5); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgb(120,128,140)"; ctx.beginPath(); ctx.arc(wx, wy, R * 0.78, 0, PL.TAU); ctx.fill();
    AP.brassDisc(ctx, wx, wy, R * 0.12);
    ctx.restore();
    D.text(ctx, open ? "光從齒縫穿過" : "光被齒擋住", wx, wy - R - 20 * s, { color: open ? "rgb(230,160,20)" : PL.col("text-dim"), size: 10.5, align: "center", weight: "700" });
    ctx.strokeStyle = "rgb(60,66,76)"; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.arc(wx, wy, R + 12 * s, 0, PL.TAU); ctx.stroke();
    D.text(ctx, "齒輪放大：N = " + PL.fmt(N, 0) + " 齒，f = " + PL.fmt(f, 0) + " Hz", wx, wy + R + 30 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    D.text(ctx, "光往返 2d 的時間 = 齒輪轉過半個齒的時間 → c = 4dNf", W - 18 * s, 44 * s, { color: PL.col("text"), size: 11.5, align: "right", weight: "700" });
    label(ctx, 20, 18, "估測光速 c", PL.fmt(cE, 0) + " km/s", 124, c);
  };

  /* RL 電路：開關一合上，電感讓電流慢慢爬上來，燈泡漸亮 */
  SC["rl-transient"] = k => {
    const { ctx, W, H, a: Lh, b: R, t, s, c, v: tau, cfg } = k;
    AP.circuitBoard(ctx, W, H, false);
    const tv = clamp(0.3 + 0.8 * Math.log10(1 + tau * 10), 0.25, 2.6), cyc = 6 * tv + 1, tt = t % cyc;
    const on = tt < 6 * tv, cur = on ? 1 - Math.exp(-tt / tv) : 0;
    const Lx = W * 0.1, Rx = W * 0.56, T = H * 0.22, B = H * 0.8, mid = (T + B) / 2;
    const red = "rgb(186,54,48)";
    AP.cable(ctx, [{ x: Lx, y: mid - 36 * s }, { x: Lx, y: T }, { x: Rx, y: T }, { x: Rx, y: B }, { x: Lx, y: B }, { x: Lx, y: mid + 36 * s }], red, 3 * s, 3);
    if (on) AP.flowDots(ctx, [{ x: Lx, y: mid - 36 * s }, { x: Lx, y: T }, { x: Rx, y: T }, { x: Rx, y: B }, { x: Lx, y: B }, { x: Lx, y: mid + 36 * s }], t, 6 * s + 70 * s * cur);
    ctx.save(); ctx.translate(Lx, mid); ctx.rotate(Math.PI / 2); AP.battery(ctx, -34 * s, -22 * s, 68 * s, 44 * s); ctx.restore();
    AP.knifeSwitch(ctx, Lx + (Rx - Lx) * 0.22, T + 3 * s, 46 * s, on ? 0 : 1);
    const turns = clamp(Math.round(4 + 10 * fr(Lh, cfg.a)), 4, 14), cxL = Lx + (Rx - Lx) * 0.62;
    AP.steel(ctx, cxL - 70 * s, T - 7 * s, 140 * s, 14 * s, -8);
    AP.coilWinding(ctx, cxL, T, 110 * s, 20 * s, turns, true);
    D.text(ctx, "電感 L = " + PL.fmt(Lh, 2) + " H", cxL, T - 30 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    AP.resistorBox(ctx, Rx, mid, 56 * s, null, true);
    AP.valueChip(ctx, Rx + 16 * s, mid - 8, "R = " + PL.fmt(R, 1) + " Ω", "rgba(255,200,110,0.95)");
    AP.bulb(ctx, (Lx + Rx) / 2, B - 22 * s, 17 * s, cur);
    if (!on && tt - 6 * tv < 0.15) AP.muzzleFlash(ctx, Lx + (Rx - Lx) * 0.22 + 18 * s, T - 6 * s, Math.PI / 2, tt - 6 * tv, 0.6 * s);
    const lw = Math.min(W * 0.36, 300 * s), lh = Math.min(H * 0.56, 230 * s);
    const scr = AP.laptop(ctx, W - lw - 16 * s, H * 0.5 - lh / 2, lw, lh);
    const gx0 = scr.x + 26 * s, gx1 = scr.x + scr.w - 10 * s, gy0 = scr.y + 22 * s, gy1 = scr.y + scr.h - 20 * s;
    const X = u => gx0 + u / 6 * (gx1 - gx0), Y = v => gy1 - v * (gy1 - gy0);
    ctx.save(); ctx.strokeStyle = "rgba(190,205,225,0.5)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx0, gy0 - 6); ctx.lineTo(gx0, gy1); ctx.lineTo(gx1, gy1); ctx.stroke();
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(X(1), gy1); ctx.lineTo(X(1), Y(0.632)); ctx.lineTo(gx0, Y(0.632)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(110,226,255,0.35)"; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const u = 6 * i / 60; i ? ctx.lineTo(X(u), Y(1 - Math.exp(-u))) : ctx.moveTo(X(u), Y(0)); } ctx.stroke();
    const uc = on ? tt / tv : 6;
    ctx.strokeStyle = "rgb(110,226,255)"; ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const u = uc * i / 60; i ? ctx.lineTo(X(u), Y(1 - Math.exp(-u))) : ctx.moveTo(X(u), Y(0)); } ctx.stroke();
    ctx.fillStyle = "rgba(200,214,232,0.85)"; ctx.font = Math.max(7, 8.5 * s) + "px system-ui,sans-serif"; ctx.textAlign = "center";
    for (let u = 0; u <= 5; u++) ctx.fillText(u === 0 ? "0" : u + "τ", X(u), gy1 + 12 * s);
    ctx.restore();
    D.text(ctx, "I", scr.x + 8 * s, gy0, { color: "rgba(210,220,236,0.9)", size: 10 });
    D.text(ctx, "63%", gx0 + 4, Y(0.632) - 4, { color: "rgba(210,220,236,0.8)", size: 9 });
    D.text(ctx, "τ = L/R = " + PL.fmt(tau, 3) + " s", scr.x + scr.w / 2, scr.y + 14 * s, { color: "rgb(140,224,255)", size: 10.5, align: "center", weight: "700" });
    D.text(ctx, on ? "開關閉合：電流逐漸增加" : "開關打開：重新開始", (Lx + Rx) / 2, B + 22 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    label(ctx, 20, 18, "時間常數 τ", PL.fmt(tau, 3) + " s", 110, c);
  };

  /* 橋式整流：變壓器 → 四顆二極體 → 濾波電容 → 示波器比較輸入與輸出 */
  SC["diode-rectifier"] = k => {
    const { ctx, W, H, a: V0, b: C, t, s, c, v: Vout, cfg } = k;
    AP.circuitBoard(ctx, W, H, false);
    const y0 = H * 0.66, tx = W * 0.12;
    AP.ironCore(ctx, tx - 36 * s, y0 - 46 * s, 72 * s, 92 * s, 14 * s);
    AP.coilWinding(ctx, tx - 29 * s, y0, 30 * s, 26 * s, 5, true);
    AP.coilWinding(ctx, tx + 29 * s, y0, 30 * s, 20 * s, 4, true);
    D.text(ctx, "變壓器", tx, y0 + 64 * s, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    const bx = W * 0.34, bw = 54 * s, T = { x: bx, y: y0 - bw }, Rr = { x: bx + bw, y: y0 }, Bo = { x: bx, y: y0 + bw }, Lc = { x: bx - bw, y: y0 };
    const wire = "rgb(186,54,48)";
    AP.cable(ctx, [{ x: tx + 44 * s, y: y0 - 20 * s }, { x: tx + 60 * s, y: T.y - 16 * s }, { x: T.x, y: T.y - 16 * s }, T], "rgb(58,96,168)", 2.2 * s, 2);
    AP.cable(ctx, [{ x: tx + 44 * s, y: y0 + 20 * s }, { x: tx + 60 * s, y: Bo.y + 16 * s }, { x: Bo.x, y: Bo.y + 16 * s }, Bo], "rgb(58,96,168)", 2.2 * s, 2);
    [[Lc, T], [T, Rr], [Bo, Rr], [Lc, Bo]].forEach(pq => {
      const p = pq[0], q = pq[1], mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2, a = Math.atan2(q.y - p.y, q.x - p.x);
      AP.cable(ctx, [p, q], "rgb(170,178,190)", 1.6 * s, 0);
      ctx.save(); ctx.translate(mx, my); ctx.rotate(a);
      ctx.fillStyle = "rgb(30,30,34)"; AP.rrPath(ctx, -10 * s, -4 * s, 20 * s, 8 * s, 3 * s); ctx.fill();
      ctx.fillStyle = "rgb(200,204,210)"; ctx.fillRect(5 * s, -4 * s, 2.5 * s, 8 * s);
      ctx.restore();
    });
    const outL = { x: W * 0.52, y: y0 - bw }, outR = { x: W * 0.52, y: y0 + bw };
    AP.cable(ctx, [Rr, { x: Rr.x + 20 * s, y: y0 }, { x: Rr.x + 20 * s, y: outL.y }, { x: W * 0.64, y: outL.y }], wire, 2.2 * s, 2);
    AP.cable(ctx, [Lc, { x: Lc.x - 18 * s, y: y0 }, { x: Lc.x - 18 * s, y: y0 + bw + 36 * s }, { x: W * 0.64, y: y0 + bw + 36 * s }], "rgb(40,44,52)", 2.2 * s, 2);
    const ch = (10 + 50 * Math.sqrt(fr(C, cfg.b))) * s, cxp = W * 0.56;
    if (C > 1) {
      AP.cable(ctx, [{ x: cxp, y: outL.y }, { x: cxp, y: y0 - ch / 2 }], "rgb(170,178,190)", 1.6 * s, 0);
      AP.cable(ctx, [{ x: cxp, y: y0 + ch / 2 }, { x: cxp, y: y0 + bw + 36 * s }], "rgb(170,178,190)", 1.6 * s, 0);
      const g = ctx.createLinearGradient(cxp - 13 * s, 0, cxp + 13 * s, 0);
      g.addColorStop(0, "rgb(30,70,150)"); g.addColorStop(0.45, "rgb(80,130,220)"); g.addColorStop(1, "rgb(26,56,120)");
      ctx.fillStyle = g; AP.rrPath(ctx, cxp - 13 * s, y0 - ch / 2, 26 * s, ch, 4 * s); ctx.fill();
      ctx.fillStyle = "rgb(200,204,210)"; ctx.fillRect(cxp - 13 * s, y0 - ch / 2, 26 * s, 3 * s);
      ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(cxp + 6 * s, y0 - ch / 2 + 6 * s, 3 * s, ch - 10 * s);
    }
    D.text(ctx, C > 1 ? "濾波電容 " + PL.fmt(C, 0) + " μF" : "沒有濾波電容", cxp, y0 + ch / 2 + 16 * s, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    AP.cable(ctx, [{ x: W * 0.64, y: outL.y }, { x: W * 0.64, y: y0 - 37 * s }], "rgb(170,178,190)", 1.6 * s, 0);
    AP.cable(ctx, [{ x: W * 0.64, y: y0 + 37 * s }, { x: W * 0.64, y: y0 + bw + 36 * s }], "rgb(170,178,190)", 1.6 * s, 0);
    AP.resistorBox(ctx, W * 0.64, y0, 50 * s, null, true);
    D.text(ctx, "負載", W * 0.64 + 14 * s, y0 + 4, { color: PL.col("text-dim"), size: 10 });
    const sc = AP.oscilloscope(ctx, W * 0.7 - 10 * s, H * 0.1, W * 0.3, H * 0.44, { label: "示波器" });
    const amp = sc.h * 0.2 * (0.3 + 0.7 * fr(V0, cfg.a)), cf = clamp(C / 3000, 0, 1);
    ctx.save(); ctx.beginPath(); ctx.rect(sc.x, sc.y, sc.w, sc.h); ctx.clip();
    ctx.strokeStyle = "rgb(250,220,60)"; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let x = 0; x <= sc.w; x += 2) { const y = sc.y + sc.h * 0.28 - Math.sin(x * 0.07 - t * 3) * amp; x ? ctx.lineTo(sc.x + x, y) : ctx.moveTo(sc.x, y); }
    ctx.stroke();
    ctx.strokeStyle = "rgb(80,220,255)"; ctx.beginPath();
    let held = 0; const decay = Math.exp(-2 / (1 + 400 * cf * cf));
    for (let x = -60; x <= sc.w; x += 2) { const raw = Math.abs(Math.sin(x * 0.07 - t * 3)); held = Math.max(raw, held * decay); if (x >= 0) { const y = sc.y + sc.h * 0.86 - held * amp * 0.92; x ? ctx.lineTo(sc.x + x, y) : ctx.moveTo(sc.x, y); } }
    ctx.stroke(); ctx.restore();
    D.text(ctx, "CH1 輸入 AC", sc.x + 6, sc.y + 12, { color: "rgb(250,220,60)", size: 9.5 });
    D.text(ctx, "CH2 輸出", sc.x + 6, sc.y + sc.h * 0.56, { color: "rgb(80,220,255)", size: 9.5 });
    D.text(ctx, "電容越大，谷底被撐得越高：漣波越小", W * 0.7 - 10 * s, H * 0.1 + H * 0.44 + 20 * s, { color: PL.col("text"), size: 10.5, weight: "700" });
    label(ctx, 20, 18, "平均輸出電壓", PL.fmt(Vout, 2) + " V", 118, c);
  };

  /* LED 發光：可調電源慢慢加壓，跨過能隙才亮；能隙決定顏色 */
  SC["semiconductor-led"] = k => {
    const { ctx, W, H, a: V, b: Eg, t, s, c, v: lam, cfg } = k;
    AP.circuitBoard(ctx, W, H, false);
    const ps = AP.powerSupply(ctx, 20 * s, H * 0.18, 160 * s, 74 * s, PL.fmt(V, 2) + " V", { label: "可調電源", knob: V / 4 });
    const bbx = W * 0.42, bby = H * 0.3, bbw = W * 0.32, bbh = H * 0.36;
    ctx.fillStyle = "rgba(0,0,0,0.18)"; AP.rrPath(ctx, bbx + 3, bby + 4, bbw, bbh, 6); ctx.fill();
    ctx.fillStyle = "rgb(244,244,238)"; AP.rrPath(ctx, bbx, bby, bbw, bbh, 6); ctx.fill();
    PL.theme.note(ctx, "rgb(244,244,238)", bbx, bby, bbw, bbh);
    ctx.fillStyle = "rgba(60,60,70,0.35)";
    for (let y = bby + 12 * s; y < bby + bbh - 8; y += 9 * s) for (let x = bbx + 12 * s; x < bbx + bbw - 8; x += 9 * s) ctx.fillRect(x, y, 2.4 * s, 2.4 * s);
    ctx.fillStyle = "rgba(214,60,52,0.7)"; ctx.fillRect(bbx + 6, bby + 5, bbw - 12, 1.5);
    ctx.fillStyle = "rgba(52,100,200,0.7)"; ctx.fillRect(bbx + 6, bby + bbh - 6, bbw - 12, 1.5);
    const lx = bbx + bbw * 0.64, ly = bby + bbh * 0.52, lit = V >= Eg, over = Math.max(0, V - Eg);
    const col = AP.nmColor(lam, 1), inv = !col;
    AP.resistorBox(ctx, bbx + bbw * 0.3, ly + 14 * s, 44 * s, null, false);
    ctx.strokeStyle = "rgb(170,178,190)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(lx - 5 * s, ly); ctx.lineTo(lx - 5 * s, ly + 14 * s); ctx.lineTo(bbx + bbw * 0.3 + 34 * s, ly + 14 * s); ctx.moveTo(lx + 5 * s, ly); ctx.lineTo(lx + 5 * s, ly + 22 * s); ctx.stroke();
    if (lit) {
      const gr = (26 + 60 * Math.min(1, over / 1.2)) * s;
      const g = ctx.createRadialGradient(lx, ly - 16 * s, 2, lx, ly - 16 * s, gr);
      g.addColorStop(0, inv ? "rgba(200,170,255,0.6)" : AP.nmColor(lam, 0.85)); g.addColorStop(1, inv ? "rgba(200,170,255,0)" : AP.nmColor(lam, 0));
      ctx.fillStyle = g; ctx.fillRect(lx - gr, ly - 16 * s - gr, gr * 2, gr * 2);
    }
    const dome = inv ? (lam < 380 ? "rgb(170,150,210)" : "rgb(120,40,40)") : col;
    ctx.fillStyle = lit ? dome : "rgba(220,220,225,0.9)";
    ctx.globalAlpha = lit ? 1 : 0.9; AP.rrPath(ctx, lx - 8 * s, ly - 28 * s, 16 * s, 24 * s, 8 * s); ctx.fill(); ctx.globalAlpha = 1;
    if (!lit) { ctx.fillStyle = col ? col.replace(",1)", ",0.45)") : "rgba(150,120,200,0.4)"; AP.rrPath(ctx, lx - 8 * s, ly - 28 * s, 16 * s, 24 * s, 8 * s); ctx.fill(); }
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(lx - 5 * s, ly - 24 * s, 2.5 * s, 12 * s);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(lx - 9 * s, ly - 6 * s, 18 * s, 3 * s);
    AP.cable(ctx, [ps.red, { x: ps.red.x, y: ps.red.y + 40 * s }, { x: bbx + 10 * s, y: ps.red.y + 40 * s }, { x: bbx + 10 * s, y: bby + 5 }], "rgb(186,54,48)", 2.4 * s, 4);
    AP.cable(ctx, [ps.black, { x: ps.black.x, y: bby + bbh + 20 * s }, { x: bbx + bbw - 14 * s, y: bby + bbh + 20 * s }, { x: bbx + bbw - 14 * s, y: bby + bbh - 6 }], "rgb(40,44,52)", 2.4 * s, 4);
    D.text(ctx, lit ? "已導通：LED 發光" : "V 未達能隙：不亮", lx, bby - 12 * s, { color: lit ? PL.col("ok") : PL.col("text-dim"), size: 12, align: "center", weight: "700" });
    const cw = Math.min(W * 0.24, 190 * s), ch = Math.min(H * 0.5, 210 * s), cx0 = W - cw - 14 * s, cy0 = H * 0.3;
    AP.infoCard(ctx, cx0, cy0, cw, ch);
    D.text(ctx, "能帶圖", cx0 + 10 * s, cy0 + 16 * s, { color: PL.col("text"), size: 10.5, weight: "700" });
    const gapPx = (Eg / 3.4) * (ch - 70 * s), cb = cy0 + 34 * s, vb = cb + gapPx;
    ctx.fillStyle = "rgba(80,140,230,0.35)"; ctx.fillRect(cx0 + 16 * s, cb - 10 * s, cw - 32 * s, 10 * s);
    ctx.fillStyle = "rgba(230,120,80,0.35)"; ctx.fillRect(cx0 + 16 * s, vb, cw - 32 * s, 10 * s);
    D.text(ctx, "導帶", cx0 + cw - 18 * s, cb - 13 * s, { color: PL.col("text-dim"), size: 9.5, align: "right" });
    D.text(ctx, "價帶", cx0 + cw - 18 * s, vb + 22 * s, { color: PL.col("text-dim"), size: 9.5, align: "right" });
    D.arrow(ctx, cx0 + 30 * s, vb, cx0 + 30 * s, cb, { color: PL.col("text-dim"), width: 1.2, head: 5 });
    D.arrow(ctx, cx0 + 30 * s, cb, cx0 + 30 * s, vb, { color: PL.col("text-dim"), width: 1.2, head: 5 });
    D.text(ctx, "E_g = " + PL.fmt(Eg, 2) + " eV", cx0 + 36 * s, (cb + vb) / 2 + 4, { color: PL.col("text"), size: 10.5, weight: "700" });
    if (lit) {
      const ph = (t * 0.8) % 1, ey = cb - 5 * s + ph * (vb - cb + 10 * s);
      D.disc(ctx, cx0 + cw * 0.62, ey, 3.5 * s, { fill: "#2f7fd8" });
      ctx.strokeStyle = col || "rgb(170,150,210)"; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const x = cx0 + cw * 0.68 + i * 2 * s, y = (cb + vb) / 2 + Math.sin(i * 1.2 - t * 12) * 4 * s; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    D.text(ctx, "λ = 1240 / E_g = " + PL.fmt(lam, 0) + " nm" + (inv ? (lam < 380 ? "（紫外）" : "（紅外）") : ""), cx0 + 10 * s, cy0 + ch - 12 * s, { color: PL.col("text"), size: 10, weight: "700" });
    label(ctx, 20, 18, "發光波長 λ", PL.fmt(lam, 0) + " nm", 110, c);
  };

  /* 示波器：訊號產生器送出正弦波，螢幕上讀週期與峰對峰值 */
  SC["oscilloscope"] = k => {
    const { ctx, W, H, a: f, b: V0, t, s, c, v: Tms } = k;
    const benchY = H * 0.9;
    AP.labRoom(ctx, W, H, benchY, {});
    const gw = Math.min(W * 0.26, 190 * s), gh = 86 * s;
    const gen = AP.powerSupply(ctx, 20 * s, benchY - gh - 2, gw, gh, PL.fmt(f, 0) + " Hz", { label: "訊號產生器  " + PL.fmt(V0, 1) + " V", face: "#d8d2c4", color: "rgb(120,236,255)", knob: f / 1200 });
    const ox = 20 * s + gw + 26 * s, ow = W - ox - 16 * s, oh = Math.min(H * 0.66, benchY - 30 * s);
    const scr = AP.oscilloscope(ctx, ox, benchY - oh - 2, ow, oh, { label: "示波器" });
    AP.cable(ctx, [gen.red, { x: gen.red.x + 10 * s, y: benchY - 10 * s }, { x: ox + ow - 30 * s, y: benchY - 12 * s }, { x: ox + ow - 30 * s, y: benchY - oh + oh - 24 * s }], "rgb(40,44,52)", 2.6 * s, 6);
    const tdiv = f < 12 ? 0.05 : f < 120 ? 0.005 : 0.0005, vdiv = V0 > 6 ? 5 : V0 > 2.5 ? 2 : V0 > 1 ? 1 : 0.5;
    const pxDiv = scr.w / 10, pyDiv = scr.h / 8, midY = scr.y + scr.h / 2;
    ctx.save(); ctx.beginPath(); ctx.rect(scr.x, scr.y, scr.w, scr.h); ctx.clip();
    ctx.strokeStyle = "rgb(120,255,170)"; ctx.lineWidth = 2; ctx.shadowColor = "rgba(120,255,170,0.8)"; ctx.shadowBlur = 6; ctx.beginPath();
    for (let x = 0; x <= scr.w; x += 1.5) { const tt = x / pxDiv * tdiv, y = midY - Math.sin(2 * Math.PI * f * tt) * V0 / vdiv * pyDiv; x ? ctx.lineTo(scr.x + x, y) : ctx.moveTo(scr.x, y); }
    ctx.stroke(); ctx.restore();
    const Tpx = (1 / f) / tdiv * pxDiv;
    if (Tpx > 12 && Tpx < scr.w * 0.9) {
      const x1 = scr.x + Tpx * 0.25, x2 = x1 + Tpx;
      [x1, x2].forEach(x => D.line(ctx, x, scr.y + 4, x, scr.y + scr.h - 4, "rgba(255,220,90,0.9)", 1, [4, 3]));
      D.text(ctx, "T = " + PL.fmt(Tms, 2) + " ms", (x1 + x2) / 2, scr.y + 14, { color: "rgb(255,220,90)", size: 10.5, align: "center", weight: "700" });
    }
    D.text(ctx, "TIME/DIV " + (tdiv >= 0.001 ? PL.fmt(tdiv * 1000, 0) + " ms" : PL.fmt(tdiv * 1e6, 0) + " μs") + "   VOLTS/DIV " + vdiv + " V", scr.x + 6, scr.y + scr.h - 8, { color: "rgb(160,240,190)", size: 9.5 });
    D.text(ctx, "Vpp = " + PL.fmt(2 * V0, 1) + " V", scr.x + scr.w - 8, scr.y + 14, { color: "rgb(160,240,190)", size: 10.5, align: "right", weight: "700" });
    label(ctx, 20, 18, "週期 T", PL.fmt(Tms, 2) + " ms", 104, c);
  };

  /* 霍爾效應（俯視）：半導體薄片放在磁極上，載子偏向一側，兩邊出現電壓 */
  SC["hall-effect"] = k => {
    const { ctx, W, H, a: I, b: B, t, s, c, v: VH, cfg } = k;
    AP.deskTop(ctx, 0, 0, W, H);
    const cx = W * 0.44, cy = H * 0.52, Rp = Math.min(H * 0.4, W * 0.28);
    AP.poleFace(ctx, cx, cy, Rp);
    const nb = fr(B, cfg.b), xs = (3 + 4 * nb) * s;
    ctx.strokeStyle = `rgba(215,180,255,${(0.35 + 0.55 * nb).toFixed(2)})`; ctx.lineWidth = 1 + nb;
    for (let x = cx - Rp; x < cx + Rp; x += 26 * s) for (let y = cy - Rp; y < cy + Rp; y += 26 * s) { if (Math.hypot(x - cx, y - cy) > Rp - 8) continue; ctx.beginPath(); ctx.moveTo(x - xs, y - xs); ctx.lineTo(x + xs, y + xs); ctx.moveTo(x + xs, y - xs); ctx.lineTo(x - xs, y + xs); ctx.stroke(); }
    const pw = Rp * 1.3, ph = Rp * 0.62, px0 = cx - pw / 2, py0 = cy - ph / 2;
    const pg = ctx.createLinearGradient(px0, py0, px0, py0 + ph);
    pg.addColorStop(0, "rgba(90,110,130,0.95)"); pg.addColorStop(1, "rgba(60,76,96,0.95)");
    ctx.fillStyle = pg; ctx.fillRect(px0, py0, pw, ph);
    ctx.strokeStyle = "rgba(200,210,224,0.8)"; ctx.lineWidth = 1.4; ctx.strokeRect(px0, py0, pw, ph);
    PL.theme.note(ctx, "rgb(72,90,110)", px0, py0, pw, ph);
    const q = clamp(VH / 40, 0, 1), nq = 2 + Math.round(7 * q);
    for (let i = 0; i < nq; i++) { const x = px0 + pw * (i + 0.5) / nq; D.text(ctx, "−", x, py0 + 12 * s, { color: "rgb(140,190,255)", size: 13, align: "center", weight: "700" }); D.text(ctx, "+", x, py0 + ph - 5 * s, { color: "rgb(255,140,130)", size: 13, align: "center", weight: "700" }); }
    const sp = (20 + 16 * I) * s;
    for (let i = 0; i < 16; i++) {
      const u = ((i * 0.618 + t * sp / pw) % 1 + 1) % 1, x = px0 + pw - u * pw;
      const lane = ((i * 5) % 7) / 6, drift = Math.min(1, u * (0.6 + 1.6 * nb));
      const y0 = py0 + ph * (0.2 + 0.6 * lane), yt = py0 + 16 * s, yy = y0 + (yt - y0) * drift * 0.85;
      D.disc(ctx, x, yy, 2.6 * s, { fill: "#9fd0ff" });
    }
    const ps = AP.powerSupply(ctx, W - 170 * s, 16 * s, 150 * s, 62 * s, PL.fmt(I, 1) + " A", { label: "電流源", knob: fr(I, cfg.a) });
    AP.cable(ctx, [{ x: px0, y: cy }, { x: px0 - 40 * s, y: cy }, { x: px0 - 40 * s, y: 30 * s }, ps.black], "rgb(40,44,52)", 2.4 * s, 4);
    AP.cable(ctx, [{ x: px0 + pw, y: cy }, { x: px0 + pw + 30 * s, y: cy }, ps.red], "rgb(186,54,48)", 2.4 * s, 4);
    const mm = AP.multimeter(ctx, W - 118 * s, H * 0.52, 96 * s, 124 * s, PL.fmt(VH, 2), { unit: "mV" });
    AP.cable(ctx, [{ x: cx + pw * 0.1, y: py0 }, { x: cx + pw * 0.1, y: py0 - 28 * s }, mm.black], "rgb(40,44,52)", 2 * s, 6);
    AP.cable(ctx, [{ x: cx + pw * 0.1, y: py0 + ph }, { x: cx + pw * 0.1, y: py0 + ph + 26 * s }, mm.red], "rgb(186,54,48)", 2 * s, 6);
    D.arrow(ctx, px0 + 16 * s, cy, px0 + pw - 16 * s, cy, { color: "rgba(255,210,90,0.9)", width: 2.2, label: "I", lsize: 12 });
    D.text(ctx, "B（× 穿入）= " + PL.fmt(B, 2) + " T", cx, cy + Rp + 18 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    D.text(ctx, "載子受勞侖茲力偏向一側 → 兩側累積電荷 → 霍爾電壓", W * 0.44, 30 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    label(ctx, 20, 18, "霍爾電壓 V_H", PL.fmt(VH, 2) + " mV", 118, c);
  };

  /* 電流天平：U 形磁鐵放在電子秤上，通電導線受力，反作用力讓讀數改變 */
  SC["current-balance"] = k => {
    const { ctx, W, H, a: I, b: B, t, s, c, v: F, cfg } = k;
    const benchY = H * 0.9;
    AP.labRoom(ctx, W, H, benchY, {});
    const cx = W * 0.42, base = 250, reading = base + F / 9.8 * 1000;
    const panY = AP.balance(ctx, cx, benchY, 240 * s, PL.fmt(reading, 2) + " g");
    const gap = 58 * s, t0 = 30 * s, len = 124 * s;
    const poles = AP.horseshoe(ctx, cx, panY - len, gap, len, t0, "up");
    const wy = panY - len + 18 * s;
    const nb = fr(B, cfg.b);
    for (let i = 0; i < 2 + Math.round(4 * nb); i++) { const y = panY - len + 6 * s + i * 7 * s; D.arrow(ctx, cx - gap / 2 + 2, y, cx + gap / 2 - 2, y, { color: `rgba(170,110,230,${(0.35 + 0.5 * nb).toFixed(2)})`, width: 1.2, head: 5 }); }
    AP.standRod(ctx, W * 0.78, benchY, H * 0.14);
    AP.steel(ctx, cx, H * 0.14 + 20 * s, W * 0.78 - cx, 8 * s, 6);
    AP.steel(ctx, cx - 3 * s, H * 0.14 + 20 * s, 6 * s, wy - H * 0.14 - 20 * s - 8 * s, 10);
    ctx.fillStyle = "rgb(214,140,70)"; ctx.beginPath(); ctx.arc(cx, wy, 8 * s, 0, PL.TAU); ctx.fill();
    ctx.strokeStyle = "rgb(120,70,30)"; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = "rgb(60,40,20)"; ctx.beginPath(); ctx.arc(cx, wy, 2.2 * s, 0, PL.TAU); ctx.fill();
    D.text(ctx, "⊙ 電流", cx + 12 * s, wy - 12 * s, { color: PL.col("text"), size: 10 });
    const fl = Math.min(80, 16 + 30 * F) * s;
    D.arrow(ctx, cx - 28 * s, wy, cx - 28 * s, wy - fl, { color: "#e0473c", width: 2.8, label: "F（導線）", lsize: 10.5 });
    D.arrow(ctx, cx + 40 * s, panY - len * 0.4, cx + 40 * s, panY - len * 0.4 + fl, { color: "#2f7fd8", width: 2.8, label: "−F（磁鐵）", lsize: 10.5 });
    const ps = AP.powerSupply(ctx, W - 176 * s, benchY - 72 * s, 156 * s, 64 * s, PL.fmt(I, 1) + " A", { label: "DC 電源", knob: fr(I, cfg.a) });
    AP.cable(ctx, [ps.red, { x: ps.red.x, y: H * 0.14 + 40 * s }, { x: cx + 30 * s, y: H * 0.14 + 40 * s }], "rgb(186,54,48)", 2.2 * s, 5);
    D.text(ctx, "磁鐵本身 250 g，多出來的讀數就是 F/g", cx, benchY + 22 * s, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    D.text(ctx, "F = BIL（L = 0.18 m）", W - 18 * s, 44 * s, { color: PL.col("text"), size: 12.5, align: "right", weight: "700" });
    label(ctx, 20, 18, "天平受力 F", PL.fmt(F, 3) + " N", 110, c);
  };

  /* 渦電流：磁鐵在金屬管內掉得很慢；管子導電性越好，煞車越強 */
  SC["eddy-current"] = k => {
    const { ctx, W, H, a: v, b: sig, t, s, c, v: Fb, cfg } = k;
    const benchY = H * 0.92;
    AP.labRoom(ctx, W, H, benchY, {});
    const tx = W * 0.4, tw = 54 * s, top = H * 0.08, bot = benchY - 24 * s;
    const mat = sig < 0.6 ? ["塑膠管", [236, 240, 244]] : sig < 2.5 ? ["鋁管", [196, 202, 212]] : ["銅管", [214, 136, 76]];
    AP.standRod(ctx, tx + 90 * s, benchY, top);
    AP.clampHead(ctx, tx + 90 * s, top + 30 * s, 50 * s, Math.PI);
    AP.clampHead(ctx, tx + 90 * s, bot - 30 * s, 50 * s, Math.PI);
    const mc = mat[1], g = ctx.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0);
    const sh = (k2, a) => `rgba(${Math.round(mc[0] * k2)},${Math.round(mc[1] * k2)},${Math.round(mc[2] * k2)},${a})`;
    const al = sig < 0.6 ? 0.45 : 1;
    g.addColorStop(0, sh(0.7, al)); g.addColorStop(0.35, sh(1.08, al)); g.addColorStop(1, sh(0.62, al));
    ctx.fillStyle = g; ctx.fillRect(tx - tw / 2, top, tw, bot - top);
    const win = { x: tx - tw * 0.2, w: tw * 0.4 };
    ctx.fillStyle = isL() ? "rgba(250,248,244,0.75)" : "rgba(30,36,46,0.8)"; ctx.fillRect(win.x, top + 10 * s, win.w, bot - top - 20 * s);
    const vpx = (16 + 30 * v) * s * clamp(1.4 - 0.25 * sig, 0.3, 1.4), span = bot - top - 60 * s;
    const y = top + 20 * s + ((t * vpx) % span);
    ctx.save(); ctx.beginPath(); ctx.rect(win.x, top + 10 * s, win.w, bot - top - 20 * s); ctx.clip();
    ctx.translate(tx, y + 14 * s); ctx.rotate(Math.PI / 2); AP.barMagnet(ctx, 0, 0, 14 * s, win.w * 0.8);
    ctx.restore();
    const eb = clamp(Fb / 18, 0, 1);
    if (sig >= 0.6) [-1, 1].forEach(sd => {
      const ey = y + 14 * s + sd * 26 * s;
      ctx.strokeStyle = `rgba(255,200,80,${(0.25 + 0.7 * eb).toFixed(2)})`; ctx.lineWidth = 1.5 + 2 * eb;
      ctx.beginPath(); ctx.ellipse(tx, ey, tw * 0.62, 7 * s, 0, 0, PL.TAU); ctx.stroke();
      D.arrow(ctx, tx + (sd > 0 ? 1 : -1) * tw * 0.1, ey + 7 * s, tx + (sd > 0 ? -1 : 1) * tw * 0.3, ey + 7 * s, { color: `rgba(255,200,80,${(0.4 + 0.6 * eb).toFixed(2)})`, width: 1.4, head: 5 });
    });
    D.arrow(ctx, tx - tw / 2 - 26 * s, y + 14 * s, tx - tw / 2 - 26 * s, y + 14 * s - (10 + 40 * eb) * s, { color: "#2f7fd8", width: 2.6, label: "磁力", lsize: 10 });
    D.arrow(ctx, tx - tw / 2 - 44 * s, y + 14 * s, tx - tw / 2 - 44 * s, y + 14 * s + 34 * s, { color: "#e0473c", width: 2.6, label: "mg", lsize: 10 });
    ctx.strokeStyle = isL() ? "rgba(80,90,104,0.6)" : "rgba(220,226,236,0.5)"; ctx.lineWidth = 1.2; ctx.strokeRect(tx - tw / 2, top, tw, bot - top);
    D.text(ctx, mat[0] + "（導電性 σ = " + PL.fmt(sig, 1) + "）", tx, bot + 16 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    D.text(ctx, sig < 0.6 ? "塑膠不導電：沒有渦電流，磁鐵快速落下" : "磁鐵附近的管壁產生渦電流，反向磁場阻礙它下落", W - 18 * s, 44 * s, { color: PL.col("text"), size: 11, align: "right", weight: "700" });
    label(ctx, 20, 18, "相對煞車力", PL.fmt(Fb, 2) + " N", 110, c);
  };

  /* 微波偏振：發射號角 → 金屬柵網（可轉動）→ 接收號角與電表 */
  SC["em-polarization"] = k => {
    const { ctx, W, H, a: th, b: E0, t, s, c, v: E, cfg } = k;
    const benchY = H * 0.9, cy = H * 0.46;
    AP.labRoom(ctx, W, H, benchY, {});
    const horn = (x, dir, col) => {
      AP.steel(ctx, x - 4 * s, cy + 18 * s, 8 * s, benchY - cy - 18 * s, -6);
      AP.steel(ctx, x - 30 * s, benchY - 8 * s, 60 * s, 8 * s, -10);
      ctx.fillStyle = col; AP.rrPath(ctx, x - (dir > 0 ? 46 : -10) * s, cy - 16 * s, 36 * s, 32 * s, 4 * s); ctx.fill();
      const g = ctx.createLinearGradient(0, cy - 30 * s, 0, cy + 30 * s);
      g.addColorStop(0, "rgb(210,214,220)"); g.addColorStop(0.5, "rgb(150,156,166)"); g.addColorStop(1, "rgb(110,116,126)");
      AP.poly(ctx, [{ x: x - 10 * dir * s, y: cy - 10 * s }, { x: x + 30 * dir * s, y: cy - 32 * s }, { x: x + 30 * dir * s, y: cy + 32 * s }, { x: x - 10 * dir * s, y: cy + 10 * s }], g, "rgba(40,46,56,0.6)");
    };
    const xT = W * 0.14, xG = W * 0.46, xR = W * 0.78, thr = th * Math.PI / 180;
    horn(xT, 1, "rgb(60,90,140)"); horn(xR, -1, "rgb(70,70,78)");
    const wave = (x0, x1, A, al) => { ctx.strokeStyle = `rgba(255,170,60,${al})`; ctx.lineWidth = 2; ctx.beginPath(); for (let x = x0; x <= x1; x += 2) { const y = cy - Math.sin((x - x0) * 0.09 - t * 7) * A; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); };
    const A0 = (6 + 3.4 * E0) * s;
    wave(xT + 34 * s, xG - 30 * s, A0, 0.9); wave(xG + 30 * s, xR - 34 * s, A0 * Math.abs(Math.cos(thr)), 0.9);
    const gs = Math.min(64 * s, H * 0.16);
    AP.steel(ctx, xG - 3 * s, cy + gs, 6 * s, benchY - cy - gs, -6); AP.steel(ctx, xG - 28 * s, benchY - 8 * s, 56 * s, 8 * s, -10);
    ctx.save(); ctx.translate(xG, cy);
    ctx.strokeStyle = "rgb(70,76,86)"; ctx.lineWidth = 5 * s; ctx.strokeRect(-gs, -gs, 2 * gs, 2 * gs);
    ctx.beginPath(); ctx.rect(-gs, -gs, 2 * gs, 2 * gs); ctx.clip();
    ctx.rotate(thr); ctx.strokeStyle = "rgba(170,178,190,0.95)"; ctx.lineWidth = 1.6;
    for (let o = -gs * 1.5; o <= gs * 1.5; o += 7 * s) { ctx.beginPath(); ctx.moveTo(-gs * 1.5, o); ctx.lineTo(gs * 1.5, o); ctx.stroke(); }
    ctx.restore();
    const la = gs + 16 * s;
    D.line(ctx, xG - Math.sin(thr) * la, cy + Math.cos(thr) * la, xG + Math.sin(thr) * la, cy - Math.cos(thr) * la, "rgba(230,120,20,0.9)", 1.6, [5, 3]);
    D.text(ctx, "透射軸（與鐵絲垂直）", xG, cy - gs - 22 * s, { color: "rgb(210,110,20)", size: 10, align: "center", weight: "700" });
    const posts = AP.dial(ctx, xR + 10 * s, cy - 92 * s, 30 * s, E / 10, { max: 10, unit: "E" });
    D.text(ctx, "發射器（電場鉛直）", xT, cy + 46 * s, { color: PL.col("text"), size: 10.5, align: "center" });
    D.text(ctx, "接收器", xR, cy + 46 * s, { color: PL.col("text"), size: 10.5, align: "center" });
    D.text(ctx, "金屬柵網 θ = " + PL.fmt(th, 0) + "°", xG, cy + gs + 16 * s, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    D.text(ctx, "E = E₀ cosθ", W - 18 * s, 44 * s, { color: PL.col("text"), size: 13, align: "right", weight: "700" });
    label(ctx, 20, 18, "透射振幅 E", PL.fmt(E, 2), 104, c);
  };

  /* 天線共振：天線長度接近 λ/4 時，遠處的場強計讀數最大 */
  SC["antenna-resonance"] = k => {
    const { ctx, W, H, a: fM, b: Lm, t, s, c, v: match, cfg } = k;
    const gy = H * 0.86;
    AP.outdoor(ctx, W, H, gy, { t, hills: true });
    const q = 75 / fM, ax = W * 0.26, pxPerM = (gy - 96 * s) / Math.max(Lm, q, 0.25) * 0.85;
    AP.steel(ctx, ax - 40 * s, gy - 8 * s, 80 * s, 8 * s, -6);
    const box = AP.powerSupply(ctx, ax - 150 * s, gy - 70 * s, 100 * s, 62 * s, PL.fmt(fM, 0) + " MHz", { label: "發射機", knob: fM / 1000 });
    AP.cable(ctx, [box.red, { x: ax - 30 * s, y: gy - 14 * s }, { x: ax, y: gy - 10 * s }], "rgb(40,44,52)", 2.4 * s, 3);
    const ah = Lm * pxPerM, qh = q * pxPerM;
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = "rgba(40,160,90,0.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax + 16 * s, gy - 8 * s); ctx.lineTo(ax + 16 * s, gy - 8 * s - qh); ctx.stroke(); ctx.restore();
    D.text(ctx, "理想 λ/4 = " + PL.fmt(q, 3) + " m", ax + 22 * s, gy - 8 * s - qh + 4, { color: "rgb(30,140,80)", size: 10.5, weight: "700" });
    AP.steel(ctx, ax - 3 * s, gy - 8 * s - ah, 6 * s, ah, 14);
    AP.brassDisc(ctx, ax, gy - 8 * s - ah, 4 * s);
    const mq = match / 100;
    for (let i = 0; i < 6; i++) {
      const rr = ((t * 60 * s + i * 40 * s) % (240 * s)) + 20 * s;
      ctx.strokeStyle = `rgba(90,160,255,${(mq * 0.6 * (1 - rr / (260 * s))).toFixed(3)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ax, gy - 8 * s - ah * 0.5, rr, -1, 1); ctx.stroke();
    }
    const rx = W * 0.8;
    AP.steel(ctx, rx - 2 * s, gy - 120 * s, 4 * s, 112 * s, 12);
    ctx.fillStyle = "rgb(56,62,72)"; AP.rrPath(ctx, rx - 44 * s, gy - 70 * s, 88 * s, 62 * s, 6 * s); ctx.fill();
    for (let i = 0; i < 10; i++) { const on = i < Math.round(mq * 10); ctx.fillStyle = on ? (i < 6 ? "rgb(90,220,120)" : i < 8 ? "rgb(250,210,60)" : "rgb(250,90,70)") : "rgba(255,255,255,0.12)"; ctx.fillRect(rx - 36 * s + i * 7.4 * s, gy - 40 * s, 5 * s, 22 * s); }
    D.text(ctx, "場強計", rx, gy - 52 * s, { color: "rgb(220,226,236)", size: 10, align: "center", weight: "700" });
    D.text(ctx, "天線長 L = " + PL.fmt(Lm, 2) + " m", ax + 10 * s, gy - 20 * s - ah, { color: PL.col("text"), size: 11, weight: "700" });
    D.text(ctx, "λ = c / f = " + PL.fmt(300 / fM, 2) + " m", W - 18 * s, 44 * s, { color: PL.col("text"), size: 12, align: "right", weight: "700" });
    label(ctx, 20, 18, "共振匹配度", PL.fmt(match, 0) + " %", 110, c);
  };

  /* 輻射屏蔽：放射源與蓋革計數器之間疊屏蔽板，計數隨厚度指數下降 */
  SC["radiation-shielding"] = k => {
    const { ctx, W, H, a: x, b: mu, t, s, c, v: pct, cfg } = k;
    const benchY = H * 0.8, cy = benchY - 72 * s;
    AP.labRoom(ctx, W, H, benchY, {});
    const sx = W * 0.14;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const bx = sx - 54 * s + j * 54 * s, by = benchY - (i + 1) * 36 * s; AP.steel(ctx, bx, by, 52 * s, 34 * s, -20); }
    ctx.fillStyle = "rgb(250,210,40)"; ctx.beginPath(); ctx.arc(sx + 2 * s, cy, 16 * s, 0, PL.TAU); ctx.fill();
    ctx.fillStyle = "rgb(20,20,20)";
    for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * PL.TAU / 3; ctx.beginPath(); ctx.moveTo(sx + 2 * s, cy); ctx.arc(sx + 2 * s, cy, 13 * s, a - 0.5, a + 0.5); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = "rgb(250,210,40)"; ctx.beginPath(); ctx.arc(sx + 2 * s, cy, 4 * s, 0, PL.TAU); ctx.fill();
    const nm = fr(mu, cfg.b);
    const mats = nm < 0.2 ? ["塑膠", [200, 226, 240]] : nm < 0.45 ? ["鋁", [196, 202, 212]] : nm < 0.7 ? ["混凝土", [170, 170, 164]] : ["鉛", [96, 100, 110]];
    const shX = W * 0.38, thick = x * 8 * s, n = Math.ceil(x / 2);
    for (let i = 0; i < n; i++) {
      const w = Math.min(16 * s, thick - i * 16 * s), px = shX + i * 16 * s, mc = mats[1];
      const g = ctx.createLinearGradient(px, 0, px + w, 0);
      g.addColorStop(0, `rgb(${Math.round(mc[0] * 0.8)},${Math.round(mc[1] * 0.8)},${Math.round(mc[2] * 0.8)})`); g.addColorStop(0.5, `rgb(${mc[0]},${mc[1]},${mc[2]})`); g.addColorStop(1, `rgb(${Math.round(mc[0] * 0.7)},${Math.round(mc[1] * 0.7)},${Math.round(mc[2] * 0.7)})`);
      ctx.fillStyle = g; ctx.fillRect(px, cy - 130 * s, w - 1, benchY - cy + 130 * s);
      ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1; ctx.strokeRect(px, cy - 130 * s, w - 1, benchY - cy + 130 * s);
    }
    const dx = W * 0.8, frac = pct / 100;
    for (let i = 0; i < 26; i++) {
      const u = ((t * 0.9 + i * 0.137) % 1), pass = ((i * 0.618) % 1) < frac;
      const xEnd = pass ? dx - 30 * s : shX + Math.min(thick, ((i * 0.37) % 1) * Math.max(thick, 4 * s));
      const px = sx + 20 * s + u * (dx - sx), yy = cy + Math.sin(i * 7.7) * 30 * s;
      if (px > xEnd) continue;
      ctx.fillStyle = "rgba(255,110,70,0.95)"; ctx.beginPath(); ctx.arc(px, yy + (px - sx) * Math.sin(i) * 0.04, 3 * s, 0, PL.TAU); ctx.fill();
    }
    const tubeY = cy - 8 * s;
    const tg = ctx.createLinearGradient(0, tubeY - 10 * s, 0, tubeY + 10 * s);
    tg.addColorStop(0, "rgb(214,220,230)"); tg.addColorStop(0.5, "rgb(150,158,170)"); tg.addColorStop(1, "rgb(110,118,130)");
    ctx.fillStyle = tg; AP.rrPath(ctx, dx - 30 * s, tubeY - 14 * s, 96 * s, 28 * s, 10 * s); ctx.fill();
    ctx.fillStyle = "rgb(60,64,72)"; ctx.fillRect(dx - 33 * s, tubeY - 15 * s, 6 * s, 30 * s);
    AP.lcd(ctx, dx - 20 * s, cy - 70 * s, 96 * s, 26 * s, Math.round(pct * 6) + " /min", { color: "rgb(130,240,170)" });
    const blink = (t * (1 + pct / 12)) % 1 < 0.12;
    ctx.fillStyle = blink ? "rgb(255,80,60)" : "rgb(90,30,26)"; ctx.beginPath(); ctx.arc(dx + 84 * s, cy - 57 * s, 4 * s, 0, PL.TAU); ctx.fill();
    AP.cable(ctx, [{ x: dx + 40 * s, y: tubeY }, { x: dx + 58 * s, y: cy - 20 * s }, { x: dx + 28 * s, y: cy - 44 * s }], "rgb(40,44,52)", 2 * s, 4);
    D.text(ctx, "蓋革計數器", dx + 28 * s, cy - 80 * s, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    D.text(ctx, "放射源（鉛屋）", sx, benchY - 4 * 36 * s - 10 * s, { color: PL.col("text"), size: 10.5, align: "center", weight: "700" });
    D.text(ctx, mats[0] + "屏蔽 x = " + PL.fmt(x, 1) + " cm", shX + Math.max(thick, 20 * s) / 2, cy - 140 * s, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
    D.text(ctx, "I = I₀ e^(−μx)", W - 18 * s, 44 * s, { color: PL.col("text"), size: 13, align: "right", weight: "700" });
    label(ctx, 20, 18, "相對計數 I/I₀", PL.fmt(pct, 1) + " %", 118, c);
  };

  const CAP = {
    "terminal-velocity": "速度越快空氣阻力越大；阻力增加到等於重力時，物體改成等速下落：vₜ = √(mg/b)",
    "rolling-motion": "同一個斜面：滑塊最快、實心球次之、圓環最慢——轉動慣量越大，分給轉動的能量越多",
    "multistage-rocket": "第一節燃料用完就丟掉空殼，第二節只需推動較輕的質量，總增速是兩節相加",
    "rotation-dynamics": "相同力矩下，配重越往外、轉動慣量越大，飛輪越難轉快：α = τ / I",
    "heat-transfer": "溫差越大，熱流越大；保溫層越厚，熱流越小",
    "thermal-expansion": "鐵軌受熱伸長 ΔL = αL₀ΔT，所以接縫要預留伸縮縫",
    "viscosity-reynolds": "雷諾數 Re = vD/ν 小時是層流（染料線筆直），大時變紊流（染料散開）",
    "continuity-hydraulic": "帕斯卡原理：密閉液體中壓力處處相等，大活塞面積大，舉升力就大",
    "malus-law": "檢偏器轉動 θ 角，透射光強度 I = I₀ cos²θ；轉到 90° 光被完全擋住",
    "thin-film": "薄膜上下表面的反射光相互干涉，厚度不同，增強的顏色就不同",
    "fizeau-light-speed": "齒輪轉得夠快時，回來的光正好被下一個齒擋住，由此算出光速",
    "rl-transient": "電感阻礙電流變化：開關合上後電流以時間常數 τ = L/R 逐漸增加",
    "diode-rectifier": "二極體只讓電流單向通過；電容在波谷時放電，把脈動直流撫平",
    "semiconductor-led": "LED 電壓超過能隙才會發光；能隙越大，發出的光波長越短（偏藍）",
    "oscilloscope": "示波器水平軸是時間、垂直軸是電壓：一個完整波形的寬度就是週期",
    "hall-effect": "電流通過磁場中的薄片，載子被推向一側，兩側之間出現霍爾電壓",
    "current-balance": "通電導線受磁力 F = BIL；牛頓第三定律讓磁鐵受到反向的力，電子秤讀數跟著變",
    "eddy-current": "磁鐵在導體管內運動，管壁產生渦電流，渦電流的磁場阻礙磁鐵下落",
    "em-polarization": "電磁波是橫波：金屬柵網只讓與鐵絲垂直的電場分量通過，E = E₀ cosθ",
    "antenna-resonance": "天線長度約為四分之一波長時共振，發射與接收效率最好",
    "radiation-shielding": "屏蔽越厚、材料吸收係數越大，穿透的輻射越少：I = I₀ e^(−μx)"
  };

  function scene(cv, config, a, b, time, out) {
    const { ctx, W, H } = cv;
    cv.clear(); D.bg(cv);
    const f = SC[config.id];
    if (f) f({ cv, ctx, W, H, cfg: config, a, b, t: time, v: out, c: accent(), s: clamp(Math.min(W / 800, H / 472), 0.5, 1.7) });
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
  Object.keys(LABS).forEach(id => { LABS[id].id = id; });

  Object.keys(LABS).forEach(id => {
    PL.register(id, { build(root) {
      const config = LABS[id], L = PL.ui.layout(root, { controls: "bottom", chrome: "quiet" }), cv = PL.canvas.create(L.canvasWrap, 0.59, 920);
      PL.ui.caption(cv, CAP[id] || "");
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
