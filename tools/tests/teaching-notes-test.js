/*
 * teaching-notes-test.js — 逐題教學補充
 *
 * 這一支要防的不是「有沒有出現」，而是「出現的是不是空話」。
 * 一句「請注意實驗安全」放在每個實驗上都成立，因此也等於什麼都沒說。
 * 判準：內容必須提到這個實驗自己的物理量或器材名稱。
 */
require("./harness.js");
const { reporter, allIds } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

let LAST = null;
PL._hooks.onBuilt(c => { LAST = c; });
function open(id) {
  LAST = null;
  const root = document.createElement("div");
  root.dataset = { simId: id };
  const api = PL.get(id).build(root);
  return { root, ctx: LAST, api };
}
const textOf = (root, cls) => root.querySelectorAll(cls).map(n => n.textContent).join(" ");

R.section("判定徽章：內容要指向這個實驗自己的物理");
[
  ["wall-friction", /最大靜摩擦|撐/],
  ["vertical-circle", /頂|臨界|繩/],
  ["critical-angle", /臨界角|全反射/],
  ["photoelectric", /底限頻率|光電子|動能/],
  ["household-circuit", /負載|斷路器/],
  ["hookes-law", /彈性限度|勁度/],
  ["damped-oscillation", /阻尼/],
  ["energy-track", /力學能|熱能/],
  ["stacked-block-friction", /摩擦|滑動/],
  ["two-rope-equilibrium", /平衡|鉛直/]
].forEach(([id, re]) => {
  if (!PL.has(id)) return;
  const s = open(id);
  const t = textOf(s.root, ".sim-verdict-text");
  R.ok(t.length > 6 && re.test(t), id.padEnd(24) + "判定具體", t.slice(0, 50));
  if (s.api && s.api.stop) s.api.stop();
});

R.section("方法類實驗：改成自我檢核，不假裝有標準答案");
["unit-conversion", "experimental-design", "error-propagation", "energy-forms", "cosmic-distance-ladder"]
  .forEach(id => {
    if (!PL.has(id)) return;
    const s = open(id);
    const t = textOf(s.root, ".sim-verdict-text");
    R.ok(/自我檢核/.test(t), id.padEnd(24) + "為自我檢核式", t.slice(0, 44));
    if (s.api && s.api.stop) s.api.stop();
  });

R.section("學生必做實驗：步驟寫的是實體實驗室，而且附誤差鐵律");
[
  ["pendulum-measure-g", /球心/],
  ["spring-measure-k", /彈性限度/],
  ["lens-focal-measurement", /共軸/],
  ["lens-displacement", /4f|物距與像距/],
  ["iv-measurement", /內接|外接/],
  ["wheatstone", /指零/],
  ["closed-circuit-emf", /內阻|截距/],
  ["resistance-vs-temperature", /攪拌|穩定/],
  ["resonance-tube-sound-speed", /管口修正/],
  ["current-balance", /歸零|有效長度/],
  ["cathode-ray-em", /垂直|速度選擇/],
  ["motion-sensor", /回波|聲速/],
  ["distance-displacement", /打點|折返/],
  ["lens", /虛像/],
  ["mirror", /凸面鏡|虛像/],
  ["unit-conversion", /有效數字/]
].forEach(([id, re]) => {
  if (!PL.has(id)) return;
  const s = open(id);
  const steps = s.root.querySelectorAll(".sim-step").length;
  const rule = textOf(s.root, ".sim-rule-text");
  const all = textOf(s.root, ".sim-procedure-card");
  R.ok(steps >= 3, id.padEnd(26) + "至少三個步驟", steps + " 步");
  R.ok(rule.length > 20, id.padEnd(26) + "有誤差鐵律", rule.slice(0, 40));
  R.ok(re.test(all), id.padEnd(26) + "提到這個實驗的關鍵誤差點");
  if (s.api && s.api.stop) s.api.stop();
});

R.section("全站沒有缺口");
{
  const ids = allIds(PL);
  const missing = [];
  ids.forEach(id => {
    const s = open(id);
    /*
     * 每個實驗至少要有一種教學鷹架。
     * 探測引擎自動產生的「關係摘要」與「挑戰任務」也算——
     * 第一版只認手寫的五種元件，把 orbit、dispersion 這些
     * 其實已經有自動摘要的實驗誤報成沒有鷹架。
     */
    const has = [".sim-verdict", ".sim-causality", ".sim-procedure-card", ".sim-derived",
                 ".sim-presets", ".sim-relations", ".sim-challenge", ".sim-poe"]
      .some(c => s.root.querySelectorAll(c).length > 0);
    if (!has) missing.push(id);
    if (s.api && s.api.stop) s.api.stop();
  });
  R.ok(missing.length === 0, "共 " + ids.length + " 個實驗都有教學鷹架",
    missing.slice(0, 8).join("、"));
}

R.done();
