/*
 * lab-test.js — 自訂實驗室的物理對照封閉解
 *
 * 自訂實驗室讓學生自己搭實驗，引擎算錯的話沒有人會發現——學生只會以為「原來是這樣」。
 * 所以每一種器材組合都要和課本公式對一次：自由落體、斜面（無摩擦、有摩擦、靜摩擦、滾動）、
 * 單擺週期、彈簧週期、阿特午機、彈性碰撞、能量守恆；電路的歐姆定律、並聯、伏特計、短路；
 * 光學的透鏡焦點、凹面鏡、司乃耳定律、全反射、平面鏡、稜鏡色散。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { reporter } = require("./_lib.js");
const R = reporter();

const root = path.resolve(__dirname, "..", "..");
global.window = global;
["lab-engine", "lab-circuit", "lab-optics"].forEach(f => {
  new Function(fs.readFileSync(path.join(root, "js/lab/" + f + ".js"), "utf8"))();
});
const LAB = global.PhysicsLabLab;
const { World } = LAB.mech;
const near = (a, b, tol) => Math.abs(a - b) <= Math.abs(b) * tol;
const box = (w, h) => [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }];
const DEG = Math.PI / 180;

/* ------------------------------ 力學 ------------------------------ */
R.section("力學：自由落體、斜面、摩擦");
{
  const w = new World();
  const b = w.add({ shape: "circle", r: 5, m: 0.2, x: 0, y: 0 });
  let t = 0; while (b.y < 100) { w.step(); t += w.dt; }
  const exact = Math.sqrt(2 * 100 / 980);
  R.ok(near(t, exact, 0.01), "自由落體 1 m 所需時間 = √(2h/g)", t.toFixed(4) + " s vs " + exact.toFixed(4));
}
function rampRun(angDeg, mu, shape, T) {
  const w = new World();
  const L = 400, H = L * Math.tan(angDeg * DEG);
  // 斜面：左低右高的直角三角形
  w.add({ shape: "poly", isStatic: true, mu, x: 0, y: 0, verts: [{ x: -L / 2, y: H / 2 }, { x: L / 2, y: H / 2 }, { x: L / 2, y: -H / 2 }] });
  const th = angDeg * DEG, nx = -Math.sin(th), ny = -Math.cos(th);           // 斜面外法向（朝左上）
  const sx = 120, sy = H / 2 - (sx + L / 2) * Math.tan(th);                  // 斜面上一點
  let b;
  if (shape === "circle") b = w.add({ shape: "circle", r: 6, m: 0.3, mu, e: 0, x: sx + nx * 6.05, y: sy + ny * 6.05 });
  else b = w.add({ shape: "poly", verts: box(16, 10), m: 0.5, mu, e: 0, a: -th, x: sx + nx * 5.05, y: sy + ny * 5.05 });
  for (let i = 0; i < 24; i++) w.step();            // 先讓接觸穩定
  const x0 = b.x, y0 = b.y, v0 = Math.hypot(b.vx, b.vy);
  const n = Math.round(T / w.dt);
  for (let i = 0; i < n; i++) w.step();
  const v1 = Math.hypot(b.vx, b.vy);
  return { a: (v1 - v0) / (n * w.dt), d: Math.hypot(b.x - x0, b.y - y0) };
}
{
  const r = rampRun(30, 0, "poly", 0.4);
  R.ok(near(r.a, 980 * 0.5, 0.03), "無摩擦斜面 30°：a = g sinθ", r.a.toFixed(1) + " vs 490");
  const r2 = rampRun(30, 0.2, "poly", 0.4), ex2 = 980 * (Math.sin(30 * DEG) - 0.2 * Math.cos(30 * DEG));
  R.ok(near(r2.a, ex2, 0.04), "有摩擦斜面 30°、μ = 0.2：a = g(sinθ − μcosθ)", r2.a.toFixed(1) + " vs " + ex2.toFixed(1));
  const r3 = rampRun(30, 0.7, "poly", 1.0);
  R.ok(r3.d < 0.5, "μ = 0.7 > tan30°：木塊靜止（靜摩擦）", "1 秒內移動 " + r3.d.toFixed(3) + " cm");
  const r4 = rampRun(20, 0.6, "circle", 0.5), ex4 = 980 * Math.sin(20 * DEG) * 5 / 7;
  R.ok(near(r4.a, ex4, 0.05), "實心球沿斜面純滾動：a = (5/7) g sinθ", r4.a.toFixed(1) + " vs " + ex4.toFixed(1));
}

R.section("力學：單擺、彈簧、滑輪、碰撞、能量");
function period(series, dt) {
  // 由「往正方向穿越零點」的時刻求平均週期
  const cross = [];
  for (let i = 1; i < series.length; i++) if (series[i - 1] < 0 && series[i] >= 0) cross.push(i * dt);
  if (cross.length < 3) return NaN;
  return (cross[cross.length - 1] - cross[0]) / (cross.length - 1);
}
{
  const w = new World();
  const L = 100, th = 5 * DEG;
  const b = w.add({ shape: "circle", r: 2, m: 0.2, x: L * Math.sin(th), y: L * Math.cos(th) });
  w.rope({ a: null, ax: 0, ay: 0, b, bx: 0, by: 0, L });
  const xs = [], E0 = w.energy(200).E;
  for (let i = 0; i < 240 * 8; i++) { w.step(); xs.push(b.x); }
  const T = period(xs, w.dt), ex = 2 * Math.PI * Math.sqrt(L / 980);
  R.ok(near(T, ex, 0.015), "單擺（L = 1 m、小角度）週期 = 2π√(L/g)", T.toFixed(4) + " vs " + ex.toFixed(4));
  const E1 = w.energy(200).E;
  R.ok(Math.abs(E1 - E0) / Math.abs(E0) < 0.02, "單擺 8 秒後力學能守恆（誤差 < 2%）", E0.toFixed(4) + " → " + E1.toFixed(4) + " J");
}
{
  const w = new World();
  const k = 20, m = 0.2, L0 = 20, eq = L0 + m * 980 / k;
  const b = w.add({ shape: "poly", verts: box(4, 4), m, x: 0, y: eq + 3, noRotate: true });
  w.spring({ a: null, ax: 0, ay: 0, b, bx: 0, by: 0, k, L0, c: 0 });
  const ys = [];
  for (let i = 0; i < 240 * 5; i++) { w.step(); ys.push(b.y - eq); }
  const T = period(ys, w.dt), ex = 2 * Math.PI * Math.sqrt(m / k);
  R.ok(near(T, ex, 0.02), "彈簧振子（k = 20 N/m、m = 0.2 kg）週期 = 2π√(m/k)", T.toFixed(4) + " vs " + ex.toFixed(4));
  const mid = ys.reduce((s, v) => s + v, 0) / ys.length;
  R.ok(Math.abs(mid) < 0.3, "振動中心在 mg/k 的平衡位置", "偏離 " + mid.toFixed(3) + " cm");
}
{
  const w = new World();
  const m1 = 0.3, m2 = 0.2;
  const A = w.add({ shape: "poly", verts: box(5, 5), m: m1, x: -10, y: 60, noRotate: true });
  const B = w.add({ shape: "poly", verts: box(5, 5), m: m2, x: 10, y: 60, noRotate: true });
  w.pulley({ a: A, ax: 0, ay: 0, b: B, bx: 0, by: 0, ga: { x: -10, y: 0 }, gb: { x: 10, y: 0 }, L: 120 });
  for (let i = 0; i < 24; i++) w.step();
  const v0 = A.vy; for (let i = 0; i < 96; i++) w.step();
  const a = (A.vy - v0) / (96 * w.dt), ex = (m1 - m2) / (m1 + m2) * 980;
  R.ok(near(a, ex, 0.03), "阿特午機：a = (m₁ − m₂)g/(m₁ + m₂)", a.toFixed(1) + " vs " + ex.toFixed(1));
  const T = w.pulleys[0].tension / 100, exT = 2 * m1 * m2 / (m1 + m2) * 9.8;
  R.ok(near(T, exT, 0.04), "阿特午機繩張力 T = 2m₁m₂g/(m₁ + m₂)", T.toFixed(3) + " vs " + exT.toFixed(3) + " N");
}
{
  const w = new World({ gravity: 0 });
  const a = w.add({ shape: "circle", r: 5, m: 0.2, e: 1, mu: 0, x: 0, y: 0, vx: 100 });
  const b = w.add({ shape: "circle", r: 5, m: 0.2, e: 1, mu: 0, x: 30, y: 0 });
  for (let i = 0; i < 240; i++) w.step();
  R.ok(Math.abs(a.vx) < 3 && near(b.vx, 100, 0.03), "等質量彈性正面碰撞：速度互換", "vA = " + a.vx.toFixed(1) + "、vB = " + b.vx.toFixed(1) + " cm/s");
  const c = new World({ gravity: 0 });
  const p = c.add({ shape: "circle", r: 5, m: 0.4, e: 0, mu: 0, x: 0, y: 0, vx: 100 });
  const q = c.add({ shape: "circle", r: 5, m: 0.1, e: 0, mu: 0, x: 30, y: 0 });
  for (let i = 0; i < 240; i++) c.step();
  const mom = 0.4 * p.vx + 0.1 * q.vx;
  R.ok(near(mom, 40, 0.01), "完全非彈性碰撞：動量守恆", (mom / 100).toFixed(4) + " vs 0.4 kg·m/s");
}
{
  const w = new World();
  w.add({ shape: "poly", isStatic: true, verts: box(400, 20), x: 0, y: 110, mu: 0.4 });
  const b = w.add({ shape: "poly", verts: box(16, 10), m: 0.5, mu: 0.4, x: 0, y: 95 });
  for (let i = 0; i < 480; i++) w.step();
  R.ok(Math.abs(b.y - 95) < 0.3 && Math.abs(b.vx) < 0.5, "木塊靜置在桌上不下沉、不滑動", "y = " + b.y.toFixed(3));
  w.force({ body: b, F: 3, ang: 0 });
  for (let i = 0; i < 24; i++) w.step();
  const v0 = b.vx; for (let i = 0; i < 96; i++) w.step();
  const a = (b.vx - v0) / (96 * w.dt), ex = (3 - 0.4 * 0.5 * 9.8) / 0.5 * 100;
  R.ok(near(a, ex, 0.04), "定力 3 N 拉桌上木塊：a = (F − μmg)/m", a.toFixed(1) + " vs " + ex.toFixed(1));
}

/* ------------------------------ 電學 ------------------------------ */
R.section("電學：歐姆定律、並聯、電表、短路");
{
  const S = LAB.circuit.solve;
  const bat = { id: "b", kind: "battery", E: 3, r: 0.5, t: ["b+", "b-"] };
  let out = S([bat, { id: "r", kind: "resistor", R: 10, t: ["r1", "r2"] }], [["b+", "r1"], ["r2", "b-"]]);
  R.ok(near(out.comp.r.I, 3 / 10.5, 0.002), "串聯：I = E/(R + r)", out.comp.r.I.toFixed(4) + " A");
  R.ok(near(out.comp.b.V, 3 * 10 / 10.5, 0.002), "端電壓 V = E − Ir", out.comp.b.V.toFixed(4) + " V");
  out = S([bat, { id: "a", kind: "ammeter", t: ["a1", "a2"] }, { id: "r1", kind: "resistor", R: 10, t: ["x1", "x2"] }, { id: "r2", kind: "resistor", R: 10, t: ["y1", "y2"] },
    { id: "v", kind: "voltmeter", t: ["v1", "v2"] }],
    [["b+", "a1"], ["a2", "x1"], ["a2", "y1"], ["x2", "b-"], ["y2", "b-"], ["v1", "x1"], ["v2", "x2"]]);
  const ex = 3 / (5 + 0.5 + 0.01);
  R.ok(near(out.comp.a.I, ex, 0.003), "並聯 10 Ω ∥ 10 Ω：安培計讀總電流", out.comp.a.I.toFixed(4) + " vs " + ex.toFixed(4));
  R.ok(near(out.comp.r1.I, ex / 2, 0.003) && near(out.comp.r2.I, ex / 2, 0.003), "並聯兩支路各分一半電流");
  R.ok(near(out.comp.v.V, ex * 5, 0.003), "伏特計讀到電阻兩端電壓、幾乎不分流", out.comp.v.V.toFixed(4) + " V");
  out = S([bat], [["b+", "b-"]]);
  R.ok(near(out.comp.b.I, 3 / 0.5, 0.01), "導線直接接兩極：短路電流 ≈ E/r", out.comp.b.I.toFixed(3) + " A");
  out = S([bat, { id: "s", kind: "switch", closed: false, t: ["s1", "s2"] }, { id: "r", kind: "resistor", R: 10, t: ["r1", "r2"] }], [["b+", "s1"], ["s2", "r1"], ["r2", "b-"]]);
  R.ok(Math.abs(out.comp.r.I) < 1e-6, "開關斷開：沒有電流", out.comp.r.I.toExponential(2));
}

/* ------------------------------ 光學 ------------------------------ */
R.section("光學：透鏡、面鏡、折射、全反射、色散");
{
  const O = LAB.optics;
  const lens = { id: "L", kind: "lens", cx: 0, cy: 0, tx: 0, ty: 1, half: 30, f: 30 };
  const screen = { id: "S", kind: "block", cx: 30, cy: 0, tx: 0, ty: 1, half: 40 };
  const src = [-15, -5, 5, 15].map(h => ({ x: -50, y: h, dx: 1, dy: 0, nm: 650 }));
  let res = O.trace(src, [lens, screen]);
  const ys = res.hits.map(h => h.y);
  R.ok(ys.length === 4 && ys.every(y => Math.abs(y) < 0.05), "凸透鏡 f = 30 cm：平行光聚於焦點", ys.map(y => y.toFixed(3)).join(", "));
  const concave = Object.assign({}, lens, { f: -30 });
  const scr2 = Object.assign({}, screen, { cx: 30 });
  res = O.trace([{ x: -50, y: 10, dx: 1, dy: 0, nm: 650 }], [concave, scr2]);
  R.ok(Math.abs(res.hits[0].y - 20) < 0.05, "凹透鏡：出射光反向延長經過焦點（f 處高度加倍）", res.hits[0].y.toFixed(3));
  const mir = { id: "M", kind: "mirror", cx: 0, cy: 0, tx: 0, ty: 1, half: 30, f: 20 };
  const scr3 = { id: "S", kind: "block", cx: -20, cy: 0, tx: 0, ty: 1, half: 5 };
  res = O.trace([{ x: -60, y: 12, dx: 1, dy: 0, nm: 650 }], [mir, scr3]);
  R.ok(res.hits.length === 1 && Math.abs(res.hits[0].y) < 0.05, "凹面鏡 f = 20 cm：平行光反射後過焦點", res.hits.length ? res.hits[0].y.toFixed(3) : "沒打到");
  const plane = { id: "P", kind: "mirror", cx: 0, cy: 0, tx: 0, ty: 1, half: 50, f: Infinity };
  res = O.trace([{ x: -40, y: -40, dx: 1, dy: 1, nm: 650 }], [plane]);
  const out = res.segs[1];
  const ang = Math.atan2(out.y2 - out.y1, out.x2 - out.x1) / DEG;
  R.ok(Math.abs(ang - 135) < 0.01, "平面鏡：反射角 = 入射角", ang.toFixed(3) + "°");
  const slab = { id: "G", kind: "glass", n: 1.5, poly: [{ x: 0, y: -50 }, { x: 40, y: -50 }, { x: 40, y: 50 }, { x: 0, y: 50 }] };
  res = O.trace([{ x: -20, y: 0, dx: Math.cos(30 * DEG), dy: Math.sin(30 * DEG), nm: 589.3 }], [slab]);
  const inside = res.segs.find(s => s.x1 >= -1e-3 && s.x1 < 1 && s.x2 > 1 && s.I > 0.5);
  const refr = Math.atan2(inside.y2 - inside.y1, inside.x2 - inside.x1) / DEG, exR = Math.asin(Math.sin(30 * DEG) / 1.5) / DEG;
  R.ok(Math.abs(refr - exR) < 0.01, "司乃耳定律：sin30° = 1.5 sinθ₂", refr.toFixed(3) + "° vs " + exR.toFixed(3) + "°");
  const exit = res.segs.find(s => s.x1 > 39.9 && s.I > 0.5);
  const outAng = Math.atan2(exit.y2 - exit.y1, exit.x2 - exit.x1) / DEG;
  R.ok(Math.abs(outAng - 30) < 0.01, "平行玻璃磚：出射光平行於入射光", outAng.toFixed(3) + "°");
  // 玻璃內以 45° 射向界面（臨界角 41.8°）→ 全反射
  res = O.trace([{ x: 20, y: 0, dx: Math.cos(-45 * DEG), dy: Math.sin(-45 * DEG), nm: 589.3 }], [{ id: "G", kind: "glass", n: 1.5, poly: [{ x: 0, y: -10 }, { x: 200, y: -10 }, { x: 200, y: 100 }, { x: 0, y: 100 }] }]);
  const escaped = res.segs.some(s => s.y2 < -11 && s.I > 0.01);
  R.ok(!escaped, "入射角 45° > 臨界角 41.8°：全反射，沒有光出射到空氣");
  res = O.trace([{ x: 20, y: 0, dx: Math.cos(-38 * DEG), dy: Math.sin(-38 * DEG), nm: 589.3 }], [{ id: "G", kind: "glass", n: 1.5, poly: [{ x: 0, y: -10 }, { x: 200, y: -10 }, { x: 200, y: 100 }, { x: 0, y: 100 }] }]);
  R.ok(res.segs.some(s => s.y2 < -11 && s.I > 0.1), "入射角 38° < 臨界角：仍有折射光出射");
  const s = 40, h = s * Math.sqrt(3) / 2;
  const prism = { id: "Pr", kind: "glass", n: 1.5, poly: [{ x: 0, y: -h * 2 / 3 }, { x: s / 2, y: h / 3 }, { x: -s / 2, y: h / 3 }] };
  res = O.trace([{ x: -60, y: 2, dx: 1, dy: -0.12, nm: 0 }], [prism]);
  const exitDir = nm => { const seg = res.segs.filter(q => q.nm === nm && q.I > 0.3).pop(); return Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1); };
  R.ok(exitDir(410) > exitDir(660) + 0.005, "白光經稜鏡色散：紫光偏折比紅光大",
    "紅 " + (exitDir(660) / DEG).toFixed(2) + "°、紫 " + (exitDir(410) / DEG).toFixed(2) + "°");
}

/* ------------------------------ 擺放吸附 ------------------------------ */
R.section("擺放吸附：拖不準也能拉出水平、鉛直的繩子");
{
  const snap = LAB.snapPoint, ref = { x: 100, y: 80 };
  // scale = 每 cm 幾 px；2.5 是實驗台預設縮放
  let r = snap({ x: 160, y: 81.2 }, { ref, scale: 2.5 });
  R.ok(r.kind === "angle" && r.y === 80 && r.angle === 0, "偏 1.2 cm（3 px）放開：吸成水平，y 和另一端完全相同", JSON.stringify(r));
  R.ok(Math.abs(r.len - 60) < 0.26, "長度取到 0.5 cm", r.len);
  r = snap({ x: 101.5, y: 140 }, { ref, scale: 2.5 });
  R.ok(r.kind === "angle" && r.x === 100 && r.angle === -90, "接近鉛直往下：吸成鉛直", JSON.stringify(r));
  r = snap({ x: 100 + 40 * Math.cos(Math.PI / 6) + 0.6, y: 80 - 40 * Math.sin(Math.PI / 6) }, { ref, scale: 2.5 });
  R.ok(r.kind === "angle" && r.angle === 30, "接近 30°：吸成 30°", JSON.stringify({ kind: r.kind, angle: r.angle }));
  r = snap({ x: 160, y: 88 }, { ref, scale: 2.5 });
  R.ok(r.kind !== "angle", "偏 8 cm（20 px）就是學生要的斜線，不吸", JSON.stringify({ kind: r.kind, angle: r.angle }));
  r = snap({ x: 160, y: 81.2 }, { ref, scale: 2.5, free: true });
  R.ok(r.kind === null && r.y === 81.2, "按住 Shift（free）完全不吸附");
  r = snap({ x: 30.8, y: 52 }, { points: [{ x: 30, y: 120 }], scale: 2.5, grid: 1 });
  R.ok(r.kind === "align" && r.x === 30 && r.y === 52, "沒有基準點時：x 對齊其他器材，y 對到 1 cm 格點", JSON.stringify(r));
  r = snap({ x: 103, y: 80.5 }, { ref, scale: 2.5 });
  R.ok(r.kind !== "angle", "太短（12 px 以內）不做角度吸附，避免在起點附近亂跳", JSON.stringify({ kind: r.kind }));
  r = snap({ x: 160, y: 81.5 }, { ref, scale: 8 });
  R.ok(r.kind !== "angle", "放大到 8 倍時偏 1.5 cm 已經是 12 px：吸附範圍跟著螢幕像素走，放大後可以拉出小角度", JSON.stringify({ kind: r.kind }));
}

R.done();
