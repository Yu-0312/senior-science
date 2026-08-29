/* 第四批互動實驗：國中銜接與高中延伸的生活裝置、量測與關係圖。 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw, TAU = PL.TAU;
  const accent = () => PL.col("m-color", "#35e0cf");
  const rad = degree => degree * Math.PI / 180;

  function lab(kind, a, b, output, unit, calc, status, chart) {
    return { kind, a, b, output, unit, calc, status, chart };
  }

  const LABS = {
    "unit-conversion": lab("measure", ["原始數值", 0.1, 100, 12.5, "", 0.1, 1], ["換算倍率", 0.001, 1000, 1000, "", 0.001, 3], "換算結果", "m", (v, scale) => v * scale, (v, scale, out) => PL.fmt(v, 2) + " × " + PL.fmt(scale, 3) + " = " + PL.fmt(out, 2), (x, scale) => x * scale),
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
    "planetary-weight": lab("planet", ["物體質量", 1, 120, 58, "kg", 1, 0], ["重力加速度", 1, 25, 9.8, "m/s²", 0.1, 1], "重量", "N", (mass, gravity) => mass * gravity, (mass, gravity, weight) => "質量固定為 " + PL.fmt(mass, 0) + " kg；重量隨 g 改變", (x, gravity) => x * gravity),
    "gravity-field-map": lab("field", ["中心質量比", 0.2, 8, 2.1, "M₀", 0.1, 1], ["觀測距離", 1, 14, 4.2, "R₀", 0.1, 1], "相對場強", "g₀", (mass, distance) => mass / (distance * distance), (mass, distance, g) => "距離平方反比；場強 " + PL.fmt(g, 3) + " g₀", (x, distance) => x / (distance * distance)),
    "physical-pendulum": lab("pendulum", ["轉動慣量 I", 0.02, 4, 0.72, "kg·m²", 0.01, 2], ["質心距離 d", 0.02, 1.5, 0.42, "m", 0.01, 2], "週期 T", "s", (inertia, distance) => TAU * Math.sqrt(inertia / (2.6 * 9.8 * distance)), (inertia, distance, period) => "轉動慣量越大，週期越長：" + PL.fmt(period, 2) + " s", (x, distance) => TAU * Math.sqrt(x / (2.6 * 9.8 * distance))),
    "torsion-pendulum": lab("torsion", ["轉動慣量 I", 0.01, 3, 0.48, "kg·m²", 0.01, 2], ["扭轉常數 κ", 0.02, 5, 0.74, "N·m/rad", 0.01, 2], "週期 T", "s", (inertia, kappa) => TAU * Math.sqrt(inertia / kappa), (inertia, kappa, period) => "扭絲越硬，擺動越快：" + PL.fmt(period, 2) + " s", (x, kappa) => TAU * Math.sqrt(x / kappa)),
    "resonance-phase-lag": lab("phase", ["驅動頻率 f", 0.1, 6, 1.4, "Hz", 0.01, 2], ["固有頻率 f₀", 0.2, 6, 2.1, "Hz", 0.01, 2], "相位差", "°", (frequency, natural) => Math.abs(Math.atan2(0.35 * frequency * natural, natural * natural - frequency * frequency) * 180 / Math.PI), (frequency, natural, phase) => "接近共振時相位快速跨越；目前 " + PL.fmt(phase, 0) + "°", (x, natural) => Math.abs(Math.atan2(0.35 * x * natural, natural * natural - x * x) * 180 / Math.PI)),
    "density-lab": lab("density", ["物體質量", 10, 2000, 420, "g", 1, 0], ["物體體積", 10, 1800, 520, "cm³", 1, 0], "物體密度", "g/cm³", (mass, volume) => mass / volume, (mass, volume, density) => density < 1 ? "密度小於水，會漂浮" : density > 1 ? "密度大於水，會下沉" : "密度接近水，可懸浮", (x, volume) => x / volume),
    "atmospheric-pressure": lab("atmosphere", ["海拔高度", 0, 5000, 350, "m", 10, 0], ["半球面積", 0.01, 0.24, 0.08, "m²", 0.01, 2], "壓差合力", "kN", (height, area) => 101.3 * Math.exp(-height / 8500) * area, (height, area, force) => "外界大氣壓造成 " + PL.fmt(force, 2) + " kN 合力", (x, area) => 101.3 * Math.exp(-x / 8500) * area),
    "surface-tension": lab("surface", ["毛細管半徑", 0.1, 2.5, 0.45, "mm", 0.01, 2], ["液面張力 γ", 0.02, 0.09, 0.072, "N/m", 0.001, 3], "毛細上升高度", "cm", (radius, gamma) => 2 * gamma * 0.94 / (1000 * 9.8 * radius * 1e-3) * 100, (radius, gamma, height) => "管徑越細，液面上升越高：" + PL.fmt(height, 2) + " cm", (x, gamma) => 2 * gamma * 0.94 / (1000 * 9.8 * x * 1e-3) * 100),
    "calorimetry-mixing": lab("calorimetry", ["熱水溫度", 35, 98, 82, "°C", 1, 0], ["冷水溫度", 0, 30, 18, "°C", 1, 0], "平衡溫度", "°C", (hot, cold) => (hot * 1.4 + cold) / 2.4, (hot, cold, temp) => "假設熱水質量為冷水 1.4 倍；平衡於 " + PL.fmt(temp, 1) + "°C", (x, cold) => (x * 1.4 + cold) / 2.4),
    "greenhouse-radiation": lab("greenhouse", ["太陽吸收率", 0.2, 0.95, 0.68, "", 0.01, 2], ["紅外線滯留率", 0, 0.8, 0.34, "", 0.01, 2], "平衡溫度", "°C", (absorb, trap) => -18 + 62 * Math.pow(absorb * (1 + trap), 0.25), (absorb, trap, temp) => "紅外線滯留改變散熱，模型平衡溫度 " + PL.fmt(temp, 1) + "°C", (x, trap) => -18 + 62 * Math.pow(x * (1 + trap), 0.25)),
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

  function scene(cv, config, a, b, time, out) {
    const { ctx, W, H } = cv, c = accent(), cx = W * 0.5, cy = H * 0.52, ground = H - 46;
    cv.clear(); D.bg(cv);
    const pulse = 0.5 + 0.5 * Math.sin(time * 2.4);

    if (config.kind === "measure") {
      D.rect(ctx, 48, cy - 18, W - 96, 36, { fill: "rgba(90,162,255,0.12)", stroke: c, width: 2, r: 5 });
      for (let x = 60; x < W - 50; x += 22) { D.line(ctx, x, cy - 18, x, cy + (x % 110 === 60 ? 10 : 4), "rgba(255,255,255,0.46)", 1); }
      const marker = 58 + (a / 100) * (W - 116); D.line(ctx, marker, cy - 46, marker, cy + 30, PL.col("warn"), 3); D.text(ctx, "原始值", marker, cy - 56, { color: PL.col("warn"), size: 10, align: "center" });
      label(ctx, 20, 18, "尺度換算", PL.fmt(out, 2) + " m", c);
    } else if (config.kind === "sensor") {
      const AP = PL.apparatus;
      AP.benchTop(ctx, W, H, ground + 8);
      AP.steel(ctx, 40, ground, W - 78, 8, -6);
      for (let x = 60; x < W - 40; x += 34) D.line(ctx, x, ground + 8, x, ground + 14, PL.theme.pale(0.34), 1);
      const x = 74 + ((time * out * 34) % Math.max(40, W - 170));
      AP.cart(ctx, x, ground, 62, 26);
      // 超音波感測器：發射的波前一圈一圈打出去
      AP.steel(ctx, 26, ground - 40, 26, 40, -14);
      for (let i = 0; i < 3; i++) {
        D.ring(ctx, 52, ground - 20, 14 + i * 13 + pulse * 8, "rgba(255,204,102,0.34)", 1.2);
      }
      label(ctx, 20, 18, "位置感測", PL.fmt(out, 2) + " m/s", c);
    } else if (config.kind === "reaction") {
      D.rect(ctx, 26, cy - 62, W - 52, 122, { fill: PL.theme.shade(0.48), stroke: PL.theme.pale(0.14), r: 7 });
      for (let x = 38; x < W - 30; x += 42) D.line(ctx, x, cy + 8, x + 20, cy + 8, "rgba(255,255,255,0.55)", 2);
      const carX = 64 + (time * 60 * a / 25) % (W - 170); D.rect(ctx, carX, cy - 12, 76, 26, { fill: "rgba(255,138,101,0.55)", stroke: PL.col("warn"), width: 2, r: 8 }); D.disc(ctx, carX + 17, cy + 18, 8, { fill: "#111827" }); D.disc(ctx, carX + 59, cy + 18, 8, { fill: "#111827" });
      D.line(ctx, Math.min(W - 58, carX + out * 6), cy - 44, Math.min(W - 58, carX + out * 6), cy + 48, c, 2, [5, 4]); label(ctx, 20, 18, "反應距離", PL.fmt(out, 1) + " m", c);
    } else if (config.kind === "lever") {
      const AP = PL.apparatus, pivotX = cx, beamY = cy;
      AP.benchTop(ctx, W, H, beamY + 62);
      // 金屬槓桿：兩端高低差來自傾斜，桿身用漸層畫出圓桿的亮暗面
      ctx.save();
      const bg = ctx.createLinearGradient(0, beamY - 24, 0, beamY + 24);
      bg.addColorStop(0, "rgb(206,214,226)"); bg.addColorStop(0.45, "rgb(140,150,166)"); bg.addColorStop(1, "rgb(80,88,102)");
      ctx.strokeStyle = bg; ctx.lineWidth = 8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(72, beamY - 20); ctx.lineTo(W - 72, beamY + 20); ctx.stroke();
      ctx.restore();
      // 三角刀口支點
      AP.contactShadow(ctx, pivotX, beamY + 62, 44);
      ctx.save();
      const kg = ctx.createLinearGradient(0, beamY, 0, beamY + 58);
      kg.addColorStop(0, "rgb(160,170,186)"); kg.addColorStop(0.5, "rgb(104,113,128)"); kg.addColorStop(1, "rgb(58,64,76)");
      ctx.fillStyle = kg;
      ctx.beginPath(); ctx.moveTo(pivotX, beamY + 4); ctx.lineTo(pivotX + 26, beamY + 58); ctx.lineTo(pivotX - 26, beamY + 58);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(30,38,50,0.6)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      AP.steel(ctx, pivotX - 38, beamY + 56, 76, 7, 6);
      D.arrow(ctx, 110, beamY - 72, 110, beamY - 26, { color: c, width: 3, label: "F 施" });
      AP.weight(ctx, W - 125, beamY + 22, 56, 40, "負載");
      label(ctx, 20, 18, "槓桿平衡", PL.fmt(out, 0) + " N", c);
    } else if (config.kind === "pulley") {
      const AP = PL.apparatus, px = cx, top = 84, loadY = cy + 44;
      AP.benchTop(ctx, W, H, loadY + 62);
      // 上方橫樑：滑輪要吊在什麼東西上，學生才知道力最後傳到哪裡
      AP.steel(ctx, px - 130, top - 40, 260, 9, 4);
      AP.cord(ctx, px, top - 31, px, top - 14);
      AP.pulley(ctx, px, top, 26);
      // 支撐繩段：段數就是滑桿 b，越多段越省力
      const segs = Math.max(1, Math.round(b));
      for (let i = 0; i < segs; i++) {
        const sx = px - 46 + i * (92 / Math.max(1, segs - 1 || 1));
        AP.cord(ctx, sx, top + 20, sx, loadY);
      }
      AP.cord(ctx, px + 26, top, px + 96, top);
      AP.cord(ctx, px + 96, top, px + 96, loadY + 10);
      AP.weight(ctx, px, loadY, 110, 46, null);
      D.arrow(ctx, px + 96, loadY + 12, px + 96, loadY - 40, { color: c, width: 3, label: "F" });
      D.text(ctx, segs + " 段支撐繩", px, top - 50, { color: PL.col("text-faint"), size: 10, align: "center" });
      label(ctx, 20, 18, "滑輪組", PL.fmt(out, 0) + " N", c);
    } else if (config.kind === "pressure") {
      D.rect(ctx, cx - 110, cy + 35, 220, 28, { fill: "rgba(90,162,255,0.22)", stroke: c, width: 2, r: 4 }); D.rect(ctx, cx - 52, cy - 48, 104, 70, { fill: "rgba(255,179,87,0.28)", stroke: PL.col("warn"), width: 2, r: 5 });
      for (let x = cx - 42; x <= cx + 42; x += 21) D.arrow(ctx, x, cy - 82, x, cy - 52, { color: PL.col("danger"), width: 2, label: x === cx ? "F" : "" });
      const points = Math.min(16, Math.max(3, Math.round(out / 18))); for (let i = 0; i < points; i++) D.disc(ctx, cx - 88 + (i % 8) * 25, cy + 80 + Math.floor(i / 8) * 12, 2.5, { fill: c }); label(ctx, 20, 18, "接觸壓強", PL.fmt(out, 1) + " kPa", c);
    } else if (config.kind === "truss") {
      const x0 = 72, y0 = cy + 58, span = W - 144, steps = 6; D.line(ctx, x0, y0, x0 + span, y0, c, 3); for (let i = 0; i < steps; i++) { const xa = x0 + i * span / steps, xb = x0 + (i + 1) * span / steps, xm = (xa + xb) / 2; D.line(ctx, xa, y0, xm, y0 - 78, PL.col("warn"), 2); D.line(ctx, xm, y0 - 78, xb, y0, PL.col("accent-2"), 2); } D.rect(ctx, cx - 42, y0 - 132, 84, 36, { fill: "rgba(255,138,101,0.38)", stroke: PL.col("warn"), width: 2, r: 4 }); D.arrow(ctx, cx, y0 - 182, cx, y0 - 139, { color: PL.col("danger"), width: 3, label: "載重" }); label(ctx, 20, 18, "桁架內力", PL.fmt(out, 0) + " N", c);
    } else if (config.kind === "rocket") {
      const y = ground - 18 - ((time * Math.max(0, out) * 2) % Math.max(20, H - 150)); const rx = cx; D.rect(ctx, rx - 18, y, 36, 94, { fill: "rgba(225,235,255,0.62)", stroke: c, width: 2, r: 8 }); ctx.save(); ctx.fillStyle = PL.col("warn"); ctx.beginPath(); ctx.moveTo(rx - 18, y + 12); ctx.lineTo(rx, y - 28); ctx.lineTo(rx + 18, y + 12); ctx.closePath(); ctx.fill(); ctx.restore(); for (let i = 0; i < 6; i++) D.line(ctx, rx - 10 + i * 4, y + 98, rx - 12 + i * 5, y + 120 + pulse * 18, i % 2 ? PL.col("warn") : PL.col("danger"), 2); D.line(ctx, 36, ground + 4, W - 36, ground + 4, "rgba(255,255,255,0.28)", 3); label(ctx, 20, 18, "水火箭", PL.fmt(out, 1) + " m/s²", c);
    } else if (config.kind === "crumple") {
      D.line(ctx, 34, ground, W - 34, ground, "rgba(255,255,255,0.28)", 3); const x = cx - 85; D.rect(ctx, x, ground - 68, 142, 46, { fill: "rgba(255,138,101,0.38)", stroke: PL.col("warn"), width: 2, r: 8 }); D.rect(ctx, x + 108, ground - 58, 34, 26, { fill: "rgba(255,204,102,0.45)", stroke: c, width: 1.5, r: 4 }); D.spring(ctx, x + 142, ground - 45, x + 205, ground - 45, 7, 8, c); D.line(ctx, x + 210, ground - 100, x + 210, ground + 2, "rgba(255,255,255,0.62)", 5); D.arrow(ctx, x + 55, ground - 115, x + 55, ground - 75, { color: PL.col("danger"), width: 3, label: "F" }); label(ctx, 20, 18, "平均緩衝力", PL.fmt(out, 1) + " kN", c);
    } else if (config.kind === "skate") {
      D.line(ctx, 42, ground, W - 42, ground, "rgba(255,255,255,0.30)", 3); const separation = 80 + out * 42; [[cx - separation, "A"], [cx + separation, "B"]].forEach(pair => { D.rect(ctx, pair[0] - 44, ground - 10, 88, 8, { fill: "rgba(90,162,255,0.36)", stroke: c, width: 1, r: 5 }); D.disc(ctx, pair[0], ground - 54, 15, { fill: pair[1] === "A" ? c : PL.col("warn") }); D.line(ctx, pair[0], ground - 39, pair[0], ground - 14, "rgba(255,255,255,0.75)", 4); }); D.arrow(ctx, cx - 8, ground - 62, cx - 60, ground - 62, { color: c, width: 2, label: "v₁" }); D.arrow(ctx, cx + 8, ground - 62, cx + 60, ground - 62, { color: PL.col("warn"), width: 2, label: "v₂" }); label(ctx, 20, 18, "推離速度", PL.fmt(out, 2) + " m/s", c);
    } else if (config.kind === "energy" || config.kind === "machine" || config.kind === "hydro" || config.kind === "wind") {
      if (config.kind === "energy") { const names = ["輸入", "機械", "有用", "損耗"]; names.forEach((name, i) => { const x = 48 + i * (W - 96) / 3; D.rect(ctx, x - 42, cy - 32, 84, 64, { fill: i === 3 ? "rgba(255,138,101,0.20)" : "rgba(90,162,255,0.16)", stroke: i === 3 ? PL.col("warn") : c, width: 2, r: 7 }); D.text(ctx, name, x, cy + 5, { color: "#fff", size: 11, align: "center", weight: "700" }); if (i < 3) D.arrow(ctx, x + 47, cy, x + (W - 96) / 3 - 47, cy, { color: PL.col("accent-2"), width: 2 }); }); }
      else if (config.kind === "machine") { D.line(ctx, 64, ground, W - 70, ground, "rgba(255,255,255,0.32)", 3); D.line(ctx, 112, ground - 10, W - 150, ground - 132, c, 6); D.rect(ctx, W - 205, ground - 172, 74, 40, { fill: "rgba(255,179,87,0.36)", stroke: PL.col("warn"), width: 2, r: 5 }); D.arrow(ctx, 118, ground - 66, 190, ground - 94, { color: PL.col("accent-2"), width: 2, label: "F" }); }
      else if (config.kind === "hydro") { D.rect(ctx, 70, 52, 96, ground - 52, { fill: "rgba(90,162,255,0.22)", stroke: c, width: 2, r: 4 }); D.line(ctx, 70, cy - 32, 166, cy - 32, "rgba(90,162,255,0.74)", 3); D.line(ctx, 166, cy - 30, cx, ground - 55, c, 3); D.ring(ctx, cx + 22, ground - 55, 34, PL.col("warn"), 5); for (let i = 0; i < 7; i++) D.line(ctx, cx + 22, ground - 55, cx + 22 + Math.cos(i * TAU / 7 + time) * 28, ground - 55 + Math.sin(i * TAU / 7 + time) * 28, PL.col("warn"), 2); D.line(ctx, cx + 58, ground - 55, W - 76, ground - 55, PL.col("accent-2"), 3); }
      else { const hubX = cx, hubY = cy; D.line(ctx, hubX, ground, hubX, hubY, "rgba(255,255,255,0.55)", 5); D.disc(ctx, hubX, hubY, 12, { fill: c, glow: c, glowSize: 12 }); for (let i = 0; i < 3; i++) { const angle = time * 1.8 + i * TAU / 3; D.line(ctx, hubX, hubY, hubX + Math.cos(angle) * Math.min(105, a * 4), hubY + Math.sin(angle) * Math.min(105, a * 4), PL.col("warn"), 9); } }
      label(ctx, 20, 18, config.kind === "hydro" ? "水輪機" : config.kind === "wind" ? "風力機" : "能量流", PL.fmt(out, 1) + " " + config.unit, c);
    } else if (["cavendish", "planet", "field"].includes(config.kind)) {
      if (config.kind === "cavendish") { D.line(ctx, cx - 126, cy, cx + 126, cy, "rgba(255,255,255,0.52)", 3); D.disc(ctx, cx - 112, cy, 20, { fill: "rgba(255,204,102,0.72)", glow: PL.col("warn"), glowSize: 12 }); D.disc(ctx, cx + 112, cy, 20, { fill: "rgba(255,204,102,0.72)", glow: PL.col("warn"), glowSize: 12 }); D.disc(ctx, cx - 38, cy - 28, 11, { fill: c }); D.disc(ctx, cx + 38, cy + 28, 11, { fill: c }); D.line(ctx, cx, 32, cx, cy, "rgba(255,255,255,0.45)", 1.5); D.ring(ctx, cx, cy, 46 + out * 5, "rgba(90,162,255,0.32)", 1.4); }
      else if (config.kind === "planet") { D.disc(ctx, cx, cy, 74, { fill: "rgba(90,162,255,0.44)", stroke: c, width: 2, glow: c, glowSize: 14 }); D.text(ctx, "g=" + PL.fmt(b, 1), cx, cy + 5, { color: "#fff", size: 14, align: "center", weight: "700" }); D.disc(ctx, cx + 118, cy - 10, 13, { fill: PL.col("warn") }); D.arrow(ctx, cx + 118, cy - 36, cx + 118, cy + 38, { color: PL.col("danger"), width: 3, label: "W" }); }
      else { D.disc(ctx, cx, cy, 24 + a * 5, { fill: "rgba(255,179,87,0.38)", stroke: PL.col("warn"), width: 2, glow: PL.col("warn"), glowSize: 14 }); for (let r = 54; r < Math.min(W, H) * 0.45; r += 30) D.ring(ctx, cx, cy, r, "rgba(90,162,255,0.24)", 1.2); for (let angle = 0; angle < TAU; angle += TAU / 10) D.arrow(ctx, cx + Math.cos(angle) * 150, cy + Math.sin(angle) * 90, cx + Math.cos(angle) * 80, cy + Math.sin(angle) * 48, { color: c, width: 1.4 }); }
      label(ctx, 20, 18, config.kind === "cavendish" ? "扭秤偏轉" : config.kind === "planet" ? "星球重量" : "引力場", PL.fmt(out, 2) + " " + config.unit, c);
    } else if (["pendulum", "torsion", "phase"].includes(config.kind)) {
      if (config.kind === "pendulum") {
        const AP = PL.apparatus, px = cx, py = 56;
        const length = Math.min(150, 70 + b * 80), angle = Math.sin(time * TAU / Math.max(0.4, out)) * 0.55;
        const bx = px + Math.sin(angle) * length, by = py + Math.cos(angle) * length;
        AP.benchTop(ctx, W, H, H - 22);
        AP.standRod(ctx, px - 122, H - 20, py - 26);
        AP.crossArm(ctx, px - 122, py - 16, px);
        AP.cord(ctx, px, py, bx, by);
        AP.bob(ctx, bx, by, 22);
      }
      else if (config.kind === "torsion") {
        const AP = PL.apparatus;
        AP.benchTop(ctx, W, H, cy + 92);
        AP.steel(ctx, cx - 90, 30, 180, 8, 4);          // 上方固定架
        AP.cord(ctx, cx, 38, cx, cy - 46);              // 扭絲
        // 轉動的圓盤：金屬盤 + 一條標記線，才看得出它在轉
        ctx.save();
        const dg = ctx.createRadialGradient(cx - 18, cy - 20, 6, cx, cy, 50);
        dg.addColorStop(0, "rgb(198,207,219)"); dg.addColorStop(0.7, "rgb(128,138,153)"); dg.addColorStop(1, "rgb(72,80,94)");
        ctx.fillStyle = dg;
        ctx.beginPath(); ctx.arc(cx, cy, 50, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(30,38,50,0.65)"; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(cx, cy, 50, 0, TAU); ctx.stroke();
        ctx.restore();
        const tw = Math.sin(time * TAU / Math.max(0.3, out)) * 26;
        D.line(ctx, cx - 38, cy + tw, cx + 38, cy - tw, PL.col("warn"), 4);
        AP.brassDisc(ctx, cx, cy, 8);
      }
      else { D.rect(ctx, 52, 36, W - 104, H - 88, { fill: "rgba(0,0,0,0.20)", stroke: "rgba(255,255,255,0.16)", r: 6 }); ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.beginPath(); for (let x = 58; x < W - 58; x += 2) { const y = cy + Math.sin((x - 58) * 0.045 + time * a) * 50; x === 58 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.strokeStyle = PL.col("warn"); ctx.beginPath(); for (let x = 58; x < W - 58; x += 2) { const y = cy + Math.sin((x - 58) * 0.045 + time * b) * 30; x === 58 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); }
      label(ctx, 20, 18, "振動量測", PL.fmt(out, 2) + " " + config.unit, c);
    } else if (["density", "atmosphere", "surface", "calorimetry", "greenhouse"].includes(config.kind)) {
      if (config.kind === "density") {
        const AP = PL.apparatus;
        AP.benchTop(ctx, W, H, ground - 2);
        AP.beaker(ctx, cx, ground, 240, ground - 42, 0.72);
        const y = out < 1 ? 96 : out > 1 ? ground - 105 : cy;
        AP.woodBlock(ctx, cx, y + 54, 76, 54, 0);
      }
      else if (config.kind === "atmosphere") { D.ring(ctx, cx - 70, cy, 62, "rgba(255,255,255,0.62)", 5); D.ring(ctx, cx + 70, cy, 62, "rgba(255,255,255,0.62)", 5); D.line(ctx, cx - 8, cy, cx + 8, cy, c, 4); D.arrow(ctx, cx - 135, cy, cx - 90, cy, { color: PL.col("warn"), width: 3, label: "Pₐ" }); D.arrow(ctx, cx + 135, cy, cx + 90, cy, { color: PL.col("warn"), width: 3 }); }
      else if (config.kind === "surface") { D.rect(ctx, cx - 120, cy - 8, 240, 118, { fill: "rgba(90,162,255,0.14)", stroke: c, width: 2, r: 5 }); D.line(ctx, cx - 118, cy - 8, cx + 118, cy - 8, "rgba(90,162,255,0.74)", 2); [cx - 60, cx, cx + 60].forEach((x, i) => { const rise = Math.min(72, 8 + out * (i === 1 ? 1.4 : 0.7)); D.rect(ctx, x - 7, cy - 92, 14, 84, { fill: "rgba(255,255,255,0.13)", stroke: "rgba(255,255,255,0.48)", width: 1, r: 2 }); D.line(ctx, x - 5, cy - 8 - rise, x + 5, cy - 8 - rise, PL.col("warn"), 2); }); }
      else if (config.kind === "calorimetry") {
        const AP = PL.apparatus;
        AP.benchTop(ctx, W, H, cy + 66);
        [[cx - 104, a, "rgba(214,86,74,"], [cx + 104, b, "rgba(74,144,196,"]].forEach(item => {
          // 水色隨溫度：熱的偏紅、冷的偏藍，杯子本身是玻璃
          ctx.save();
          ctx.fillStyle = item[2] + "0.42)";
          ctx.fillRect(item[0] - 50, cy + 4, 100, 56);
          ctx.restore();
          AP.beaker(ctx, item[0], cy + 62, 108, 116, 0.55);
          AP.thermometer(ctx, item[0] + 34, cy - 56, cy + 44, 13, PL.clamp(item[1] / 100, 0, 1));
          D.text(ctx, PL.fmt(item[1], 0) + "°C", item[0] - 12, cy - 30,
            { color: item[1] > 50 ? PL.col("danger") : c, size: 15, align: "center", weight: "700" });
        });
        D.arrow(ctx, cx - 30, cy - 10, cx + 30, cy - 10, { color: PL.col("warn"), width: 3, label: "熱流" });
      }
      else { D.rect(ctx, cx - 138, 48, 276, ground - 88, { fill: "rgba(90,162,255,0.09)", stroke: c, width: 2, r: 90 }); D.disc(ctx, cx, ground - 95, 44, { fill: "rgba(90,162,255,0.38)", stroke: c, width: 2, glow: c, glowSize: 14 }); for (let i = 0; i < 7; i++) D.arrow(ctx, cx - 95 + i * 31, 76, cx - 55 + i * 24, ground - 142, { color: PL.col("warn"), width: 1.5 }); for (let i = 0; i < 5; i++) D.arrow(ctx, cx - 50 + i * 26, ground - 130, cx - 40 + i * 22, 72, { color: PL.col("danger"), width: 1.5 }); }
      label(ctx, 20, 18, "熱流 / 流體", PL.fmt(out, 2) + " " + config.unit, c);
    } else if (["string", "sound", "echo", "seismic"].includes(config.kind)) {
      if (config.kind === "string") { D.line(ctx, 38, cy, W - 38, cy, "rgba(255,255,255,0.20)", 1); ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 2.7; ctx.beginPath(); for (let x = 38; x < W - 38; x += 3) { const y = cy + Math.sin((x - 38) / 22 - time * out * 0.2) * 34; x === 38 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); }
      else if (config.kind === "sound") {
        /*
         * 原本波前的間距寫死成 25px，「頻率 f」只印成一行字。
         * 聲音的頻率就是波前的疏密——這件事本來就該用看的。
         * 改成間距反比於頻率（高頻密、低頻疏），振幅則決定波前的粗細與喇叭大小。
         */
        const nf = (a - config.a[1]) / Math.max(1e-9, config.a[2] - config.a[1]);
        const spacing = 46 - nf * 34;                 // 低頻 46px、高頻 12px
        const amp = 0.3 + 0.7 * (b - config.b[1]) / Math.max(1e-9, config.b[2] - config.b[1]);
        const spH = 60 + amp * 70;
        D.rect(ctx, 58, cy - spH / 2, 58, spH, { fill: "rgba(90,162,255,0.22)", stroke: c, width: 2, r: 6 });
        for (let r = 30; r < W * 0.42; r += spacing) {
          D.ring(ctx, 122, cy, r + pulse * 6, "rgba(255,204,102,0.24)", 1 + amp * 2.2);
        }
        D.text(ctx, "f = " + PL.fmt(a, 0) + " Hz（波前間距 ∝ 1/f）", W - 118, cy - 30,
          { color: PL.col("warn"), size: 12, align: "center" });
        D.text(ctx, "振幅越大，波前畫得越粗、喇叭越大", W - 118, cy - 12,
          { color: PL.col("text-faint"), size: 9.5, align: "center" });
      }
      else if (config.kind === "echo") { D.rect(ctx, W - 112, 42, 28, ground - 42, { fill: "rgba(255,255,255,0.22)", stroke: "rgba(255,255,255,0.55)", r: 3 }); D.disc(ctx, 100, cy, 16, { fill: c, glow: c, glowSize: 12 }); const r = (time * b * 0.35) % (W - 210); D.ring(ctx, 100, cy, r, "rgba(255,204,102,0.42)", 2); D.line(ctx, 100, cy, W - 112, cy, "rgba(255,255,255,0.20)", 1, [4, 4]); }
      else { D.rect(ctx, 46, ground - 30, W - 92, 26, { fill: "rgba(90,162,255,0.22)", stroke: c, width: 2, r: 5 }); D.rect(ctx, cx - 65, ground - 105, 130, 75, { fill: "rgba(255,255,255,0.12)", stroke: PL.col("warn"), width: 2, r: 6 }); const sway = Math.sin(time * a) * Math.min(36, out * 14); D.line(ctx, cx, ground - 30, cx + sway, ground - 105, PL.col("danger"), 4); D.ring(ctx, cx, ground - 18, 16 + b * 5, "rgba(90,162,255,0.38)", 2); }
      label(ctx, 20, 18, "波動量測", PL.fmt(out, 2) + " " + config.unit, c);
    } else if (["pinhole", "rgb", "fiber", "eye", "camera"].includes(config.kind)) {
      if (config.kind === "pinhole") { D.rect(ctx, cx - 6, 42, 12, ground - 100, { fill: "rgba(255,255,255,0.23)", stroke: "rgba(255,255,255,0.48)", r: 2 }); D.disc(ctx, cx, cy, 3, { fill: PL.col("warn") }); D.rect(ctx, W - 100, 72, 10, ground - 130, { fill: "rgba(90,162,255,0.26)", stroke: c, width: 2, r: 2 }); D.line(ctx, 100, cy - 52, cx, cy, PL.col("warn"), 1.8); D.line(ctx, 100, cy + 52, cx, cy, PL.col("warn"), 1.8); D.line(ctx, cx, cy, W - 95, cy + 56, c, 1.8); D.line(ctx, cx, cy, W - 95, cy - 56, c, 1.8); D.rect(ctx, 82, cy - 66, 34, 132, { fill: "rgba(255,179,87,0.34)", stroke: PL.col("warn"), width: 2, r: 4 }); }
      else if (config.kind === "rgb") { const centers = [[cx - 56, cy - 18, "rgba(255,72,72,0.46)"], [cx + 56, cy - 18, "rgba(85,255,126,0.46)"], [cx, cy + 54, "rgba(88,132,255,0.46)"]]; centers.forEach(item => D.disc(ctx, item[0], item[1], 76, { fill: item[3] })); D.disc(ctx, cx, cy + 2, 18 + out * 0.38, { fill: "rgba(255,255,255,0.80)", glow: "#ffffff", glowSize: 16 }); }
      else if (config.kind === "fiber") { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 16; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(62, cy); ctx.bezierCurveTo(W * 0.32, cy - 92, W * 0.58, cy + 98, W - 62, cy); ctx.stroke(); ctx.strokeStyle = "rgba(255,204,102,0.85)"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore(); for (let x = 86; x < W - 76; x += 36) D.disc(ctx, x, cy + Math.sin(x * 0.035 + time) * 18, 3, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 7 }); }
      else if (config.kind === "eye") { D.ring(ctx, cx, cy, 82, "rgba(255,255,255,0.55)", 3); D.disc(ctx, cx - 14, cy, 33, { fill: "rgba(90,162,255,0.25)", stroke: c, width: 2 }); D.ring(ctx, cx + 55, cy, 17, PL.col("warn"), 3); D.line(ctx, 58, cy - 42, cx - 42, cy - 12, PL.col("warn"), 1.8); D.line(ctx, 58, cy + 42, cx - 42, cy + 12, PL.col("warn"), 1.8); D.line(ctx, cx + 20, cy - 18, cx + 56, cy, c, 1.8); D.line(ctx, cx + 20, cy + 18, cx + 56, cy, c, 1.8); }
      else { D.rect(ctx, cx - 118, cy - 84, 236, 168, { fill: "rgba(0,0,0,0.32)", stroke: c, width: 3, r: 8 }); D.ring(ctx, cx, cy, 48 / Math.max(1, a / 3), PL.col("warn"), 6); D.rect(ctx, cx - 50, cy - 34, 100, 68, { fill: "rgba(90,162,255," + Math.min(0.65, out * 0.42) + ")", stroke: c, width: 1.5, r: 2 }); D.text(ctx, "曝光", cx, cy + 6, { color: "#fff", size: 12, align: "center", weight: "700" }); }
      label(ctx, 20, 18, "光學量測", PL.fmt(out, 2) + " " + config.unit, c);
    } else if (["induction", "heating", "house", "rlc"].includes(config.kind)) {
      if (config.kind === "induction") { D.rect(ctx, cx - 18, 48, 36, 126, { fill: "rgba(255,179,87,0.36)", stroke: PL.col("warn"), width: 2, r: 5 }); D.line(ctx, cx, 174, cx, cy - 18, "rgba(255,255,255,0.55)", 2); D.line(ctx, cx, cy - 18, cx - 48 - out, cy + 74, c, 2); D.line(ctx, cx, cy - 18, cx + 48 + out, cy + 74, c, 2); D.disc(ctx, cx - 104, cy, 24, { fill: "rgba(255,138,101,0.42)", stroke: PL.col("danger"), width: 2, glow: PL.col("danger"), glowSize: 10 }); D.text(ctx, "+", cx - 104, cy + 5, { color: "#fff", size: 15, align: "center" }); }
      else if (config.kind === "heating") {
        const AP = PL.apparatus;
        AP.benchTop(ctx, W, H, cy + 108);
        AP.wire(ctx, [{ x: 70, y: cy }, { x: 70, y: cy + 84 }, { x: W - 76, y: cy + 84 },
                      { x: W - 76, y: cy }, { x: 70, y: cy }], "rgb(186,54,48)", 3.2);
        AP.battery(ctx, 54, cy + 26, 32, 32);
        AP.resistorBox(ctx, cx, cy, 96, null, false);
        // 上升的熱氣：功率越大冒得越高
        for (let i = 0; i < 5; i++) {
          D.arrow(ctx, cx - 26 + i * 13, cy - 26, cx - 15 + i * 13, cy - 58 - pulse * 12,
            { color: "rgba(226,110,86,0.65)", width: 1.5 });
        }
      }
      else if (config.kind === "house") { const rows = [[cx - 110, "照明"], [cx, "插座"], [cx + 110, "電器"]]; D.line(ctx, 52, cy - 60, W - 52, cy - 60, c, 3); D.line(ctx, 52, cy + 72, W - 52, cy + 72, c, 3); rows.forEach(item => { D.line(ctx, item[0], cy - 60, item[0], cy + 72, c, 2); D.rect(ctx, item[0] - 33, cy - 10, 66, 44, { fill: "rgba(255,255,255,0.10)", stroke: item[0] === cx ? PL.col("warn") : c, width: 1.5, r: 5 }); D.text(ctx, item[1], item[0], cy + 16, { color: "#fff", size: 10, align: "center" }); }); }
      else { D.line(ctx, 70, cy, W - 70, cy, c, 2.5); D.line(ctx, 70, cy, 70, cy + 84, c, 2.5); D.line(ctx, 70, cy + 84, W - 70, cy + 84, c, 2.5); D.line(ctx, W - 70, cy + 84, W - 70, cy, c, 2.5); D.spring(ctx, 160, cy, 278, cy, 7, 10, PL.col("accent-3")); D.ring(ctx, cx, cy, 22, PL.col("warn"), 3); D.text(ctx, "C", cx, cy + 5, { color: PL.col("warn"), size: 14, align: "center", weight: "700" }); D.rect(ctx, W - 190, cy - 18, 48, 36, { fill: "rgba(255,138,101,0.26)", stroke: PL.col("danger"), width: 2, r: 3 }); D.text(ctx, "R", W - 166, cy + 5, { color: "#fff", size: 13, align: "center" }); }
      label(ctx, 20, 18, "電路讀值", PL.fmt(out, 2) + " " + config.unit, c);
    } else if (["compass", "electromagnet", "motor"].includes(config.kind)) {
      if (config.kind === "compass") {
        const AP = PL.apparatus;
        AP.benchTop(ctx, W, H, cy + 108);
        // 羅盤：白色錶面 + 刻度環，磁針是紅藍兩段的實體針
        AP.protractor(ctx, cx, cy, 88);
        for (let i = 0; i < 4; i++) {
          D.text(ctx, ["N", "E", "S", "W"][i], cx + Math.sin(i * TAU / 4) * 62,
            cy - Math.cos(i * TAU / 4) * 62 + 4, { color: "#28303c", size: 12, align: "center", weight: "700" });
        }
        const angle = rad(out);
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(angle);
        AP.barMagnet(ctx, 0, 0, 58, 9);
        ctx.restore();
        AP.brassDisc(ctx, cx, cy, 5);
        D.text(ctx, "磁針", cx, cy + 106, { color: PL.col("text-faint"), size: 10, align: "center" });
      }
      else if (config.kind === "electromagnet") {
        const AP = PL.apparatus;
        AP.benchTop(ctx, W, H, cy + 84);
        // 鐵芯：一根圓柱，兩端露出來當磁極
        AP.steel(ctx, cx - 126, cy - 14, 252, 28, -8);
        // 繞在鐵芯上的銅線，匝數隨滑桿 a 增加而變密
        const turns = PL.clamp(Math.round(a / 40), 4, 18);
        AP.coilWinding(ctx, cx, cy, 172, 30, turns, true);
        D.text(ctx, "S", cx - 142, cy + 5, { color: PL.col("accent-2"), size: 16, align: "center", weight: "700" });
        D.text(ctx, "N", cx + 142, cy + 5, { color: PL.col("danger"), size: 16, align: "center", weight: "700" });
        // 磁力線密度隨磁場強度
        const rings = PL.clamp(Math.round(2 + out / 8), 2, 6);
        for (let i = 1; i <= rings; i++) D.ring(ctx, cx, cy, 44 + i * 15, "rgba(185,139,255,0.20)", 1);
        // 電源
        AP.battery(ctx, cx - 20, cy + 58, 40, 26);
        AP.wire(ctx, [{ x: cx - 40, y: cy + 30 }, { x: cx - 40, y: cy + 70 }, { x: cx - 20, y: cy + 70 }], "rgb(186,54,48)", 2.6);
        AP.wire(ctx, [{ x: cx + 40, y: cy + 30 }, { x: cx + 40, y: cy + 70 }, { x: cx + 20, y: cy + 70 }], "rgb(58,96,168)", 2.6);
      }
      else {
        const AP = PL.apparatus;
        AP.benchTop(ctx, W, H, cy + 106);
        // 定子磁極：轉子夾在 N、S 兩極之間，力矩從哪來看得出來
        AP.polePiece(ctx, cx - 122, cy - 52, 26, 104, true);
        AP.polePiece(ctx, cx + 96, cy - 52, 26, 104, false);
        D.text(ctx, "N", cx - 109, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" });
        D.text(ctx, "S", cx + 109, cy + 5, { color: "#fff", size: 13, align: "center", weight: "700" });
        // 轉子：三段銅線繞組隨轉速旋轉
        for (let i = 0; i < 3; i++) {
          const angle = time * (out / 100) + i * TAU / 3;
          ctx.save();
          const wg = ctx.createLinearGradient(cx - 72, 0, cx + 72, 0);
          wg.addColorStop(0, "rgb(140,86,40)"); wg.addColorStop(0.4, "rgb(230,168,94)"); wg.addColorStop(1, "rgb(148,92,42)");
          ctx.strokeStyle = wg; ctx.lineWidth = 7; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * 72, cy + Math.sin(angle) * 72); ctx.stroke();
          ctx.restore();
        }
        // 換向器：轉軸上的兩片銅環
        AP.brassDisc(ctx, cx, cy, 17);
        ctx.save();
        ctx.strokeStyle = "rgba(60,44,18,0.7)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy - 17); ctx.lineTo(cx, cy + 17); ctx.stroke();
        ctx.restore();
        AP.steel(ctx, cx - 4, cy + 17, 8, 88, -10);
      }
      label(ctx, 20, 18, "電磁裝置", PL.fmt(out, 2) + " " + config.unit, c);
    } else if (["cathode", "spectrum", "solar"].includes(config.kind)) {
      if (config.kind === "cathode") { D.rect(ctx, 72, cy - 76, W - 144, 152, { fill: "rgba(0,0,0,0.28)", stroke: "rgba(90,162,255,0.45)", width: 2, r: 74 }); ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(108, cy); ctx.quadraticCurveTo(cx, cy - Math.min(90, a / b * 0.7), W - 112, cy); ctx.stroke(); ctx.restore(); D.disc(ctx, 108, cy, 8, { fill: PL.col("warn"), glow: PL.col("warn"), glowSize: 10 }); D.text(ctx, "e⁻", 116, cy - 14, { color: PL.col("warn"), size: 11 }); }
      else if (config.kind === "spectrum") { D.rect(ctx, 50, cy - 42, W - 100, 84, { fill: "rgba(255,255,255,0.06)", stroke: "rgba(255,255,255,0.22)", r: 4 }); const colors = ["#a855f7", "#3b82f6", "#22c55e", "#facc15", "#ef4444"]; colors.forEach((color, i) => { const x = 84 + i * (W - 168) / 4; D.line(ctx, x, cy - 35, x, cy + 35, color, 6 + (i === 2 ? b * 6 : 0)); }); D.text(ctx, "λ = " + PL.fmt(out, 0) + " nm", cx, cy + 70, { color: c, size: 12, align: "center" }); }
      else { D.rect(ctx, cx - 92, cy - 66, 184, 132, { fill: "rgba(31,66,145,0.52)", stroke: c, width: 2, r: 4 }); for (let x = cx - 74; x <= cx + 74; x += 28) for (let y = cy - 48; y <= cy + 48; y += 24) D.rect(ctx, x, y, 20, 16, { fill: "rgba(90,162,255,0.25)", stroke: "rgba(255,255,255,0.32)", width: 1, r: 2 }); for (let i = 0; i < 7; i++) D.arrow(ctx, cx - 115 + i * 36, 30, cx - 80 + i * 30, cy - 76, { color: PL.col("warn"), width: 2 }); D.line(ctx, cx - 92, cy + 92, W - 70, cy + 92, c, 2); D.text(ctx, "DC", W - 56, cy + 96, { color: c, size: 10, align: "center" }); }
      label(ctx, 20, 18, "微觀探測", PL.fmt(out, 2) + " " + config.unit, c);
    }

    D.text(ctx, config.status(a, b, out), W / 2, H - 22, { color: PL.col("text-faint"), size: 9.5, align: "center" });
  }

  /*
   * sound-properties：聲級 dB 由振幅決定，與頻率無關（頻率決定的是音調）。
   * 原本關係圖掃頻率，畫出來是一條水平線。改掃振幅，才看得到 dB 的對數關係。
   */
  if (LABS["sound-properties"]) LABS["sound-properties"].sweep = "b";

  Object.keys(LABS).forEach(id => {
    PL.register(id, { build(root) {
      const config = LABS[id], L = PL.ui.layout(root), cv = PL.canvas.create(L.canvasWrap, 0.59, 920);
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
