/*
 * relation-test.js — 模板實驗的關係圖必須有資訊
 *
 * 全站 142 個實驗由「兩根滑桿 + 一個讀數 + 一條關係曲線」的模板產生。
 * 兩個結構性保證：
 *   1. 亮點（讀數）必須落在曲線上。曲線與讀數改由同一個 calc() 導出之後，
 *      這件事在結構上就不可能出錯——這裡守住它不被改回去。
 *   2. 關係圖不可以是一條完全水平的線：輸出若不隨掃描軸變化，
 *      代表圖畫在錯的變數上，學生看不出任何關係。
 */
require("./harness.js");
const fs = require("fs");
const { reporter } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

/* 這裡的「沒有關係」本身就是結論：法拉第籠殼內場強恆為零 */
const FLAT_OK = new Set(["electrostatic-shield"]);

const FILES = ["extended", "advanced", "comprehensive", "comprehensive-2", "open-labs"];
const all = {};
FILES.forEach(f => {
  const p = "js/experiments/" + f + ".js";
  if (!fs.existsSync(p)) return;
  const src = fs.readFileSync(p, "utf8");
  const markers = ["Object.keys(LABS).forEach", "Object.entries(LABS).forEach", "Object.keys(T).forEach"];
  let i = -1, name = "LABS";
  for (const mk of markers) {
    const j = src.indexOf(mk);
    if (j >= 0) { i = j; name = mk.indexOf("(T)") >= 0 ? "T" : "LABS"; break; }
  }
  if (i < 0) return;
  globalThis.__LABS = null;
  try { new Function(src.slice(0, i) + "globalThis.__LABS = " + name + ";\n  " + src.slice(i))(); }
  catch (e) { /* 只是要拿設定表，執行失敗就跳過 */ }
  if (globalThis.__LABS) all[f] = globalThis.__LABS;
});

let total = 0;
const flat = [], off = [];
Object.keys(all).forEach(f => {
  const LABS = all[f];
  Object.keys(LABS).forEach(id => {
    const cfg = LABS[id];
    if (!cfg || typeof cfg.calc !== "function") return;
    total += 1;
    const sweepB = cfg.sweep === "b";
    const axis = sweepB ? cfg.b : cfg.a;
    const other = sweepB ? cfg.a : cfg.b;
    const at = (x, ov) => sweepB ? cfg.calc(ov, x) : cfg.calc(x, ov);

    const ys = [];
    for (let i = 0; i <= 24; i++) {
      const y = at(axis[1] + (axis[2] - axis[1]) * i / 24, other[3]);
      if (isFinite(y)) ys.push(y);
    }
    if (ys.length < 3) return;
    const range = Math.max.apply(null, ys) - Math.min.apply(null, ys);
    const scale = Math.max(1e-9, Math.max.apply(null, ys.map(Math.abs)));
    if (range / scale < 0.01 && !FLAT_OK.has(id)) flat.push(id + "（" + f + "，掃 " + axis[0] + "）");

    const readout = cfg.calc(cfg.a[3], cfg.b[3]);
    const onCurve = at(sweepB ? cfg.b[3] : cfg.a[3], other[3]);
    if (isFinite(readout) && isFinite(onCurve) &&
        Math.abs(readout - onCurve) > Math.max(1e-9, Math.abs(readout) * 1e-9)) {
      off.push(id + "（" + f + "）讀數 " + PL.fmt(readout, 3) + " ≠ 曲線 " + PL.fmt(onCurve, 3));
    }
  });
});

R.section("檢查 " + total + " 個模板實驗");
R.ok(off.length === 0, "亮點都落在關係曲線上", off.slice(0, 8).join("\n      "));
R.ok(flat.length === 0, "沒有一張關係圖是水平線", flat.slice(0, 8).join("\n      "));

R.section("relationChart 會產生具體的中文描述");
const spec = {
  a: ["電壓 V", 1, 12, 6, "V"], b: ["電阻 R", 1, 20, 5, "Ω"], av: 6, bv: 5,
  calc: (v, r) => v / r, output: "電流 I"
};
const fake = {
  W: 400, H: 240, clear() {}, ctx: (function () {
    const noop = () => {};
    return new Proxy({
      measureText: () => ({ width: 10 }),
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      getLineDash: () => []
    }, { get: (t, k) => (k in t ? t[k] : noop), set: () => true });
  })()
};
let desc = "";
try { desc = PL.ui.relationChart(fake, spec); } catch (e) { desc = "!! " + e.message; }
R.ok(typeof desc === "string" && desc.length > 12 && desc.indexOf("!!") < 0, "有產生描述", desc);
R.ok(desc.indexOf("電流 I") >= 0 && desc.indexOf("電壓 V") >= 0, "描述用實驗自己的變數名");
R.ok(desc.indexOf("電阻 R") >= 0, "描述有說明第二根滑桿的作用");

R.section("relationChart 的刻度與圖說（2026-10 改版的回歸防護）");
/* 記錄所有 fillText，從中挑出純數字的刻度標籤 */
function recordingCanvas(W, H) {
  const texts = [];
  const noop = () => {};
  const ctx = new Proxy({
    measureText: t => ({ width: String(t).length * 6 }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    getLineDash: () => [],
    fillText: (t, x, y) => texts.push({ t: String(t), x, y })
  }, { get: (t, k) => (k in t ? t[k] : noop), set: () => true });
  return { W, H, ctx, clear() {}, texts };
}
const positive = {
  a: ["物體質量 m", 0.02, 5, 0.35, "kg"], b: ["阻力係數 b", 0.01, 2, 0.22, "kg/m"], av: 0.35, bv: 0.22,
  calc: (m, b) => Math.sqrt(m * 9.8 / b), output: "終端速度 vₜ"
};
const rc = recordingCanvas(998, 340);
PL.ui.relationChart(rc, positive);
const nums = rc.texts.filter(o => /^-?\d+(\.\d+)?$/.test(o.t));
const yTicks = nums.filter(o => o.x < 52).map(o => Number(o.t)).sort((a, b) => a - b);
R.ok(nums.length >= 6 && nums.every(o => Number(o.t) >= 0), "全為正的量不出現負刻度", nums.map(o => o.t).join(" "));
const steps = yTicks.slice(1).map((v, i) => +(v - yTicks[i]).toPrecision(6));
const nice = v => { const m = v / Math.pow(10, Math.floor(Math.log10(v))); return [1, 2, 2.5, 5, 10].some(k => Math.abs(m - k) < 1e-6); };
R.ok(yTicks.length >= 3 && steps.every(d => d === steps[0]) && nice(steps[0]), "縱軸刻度等距且步距整齊（1／2／2.5／5 × 10ⁿ）", yTicks.join(" "));

const falling = {
  a: ["電阻 R", 1, 20, 5, "Ω"], b: ["電壓 V", 1, 12, 6, "V"], av: 5, bv: 6,
  calc: (r, v) => v / r, output: "電流 I"
};
const fd = PL.ui.relationChart(recordingCanvas(600, 300), falling);
R.ok(fd.indexOf("反而變小") >= 0 && fd.indexOf("減少得越來越慢") >= 0 && fd.indexOf("增加得") < 0,
  "下降曲線的形狀說明不會寫成「增加得越來越快」", fd);

R.done();
