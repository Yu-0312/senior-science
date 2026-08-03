/*
 * insight-test.js — 自動關係摘要（探測引擎）
 *
 * 探測引擎會在建置時掃描滑桿，用對數迴歸找出冪次律，
 * 自動寫出「T ∝ √L」這類結論。兩個要求：
 *   1. 結論要和已知物理相符
 *   2. 探測完必須把滑桿還原——否則學生一進場看到的就不是預設值
 */
require("./harness.js");
const { reporter } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

const insights = {};
PL._hooks.onBuilt(c => { if (c.insight) insights[c.id] = c.insight; });

function build(id) {
  const root = document.createElement("div"); root.dataset = { simId: id };
  return { root, api: PL.get(id).build(root) };
}

R.section("探測結果要符合已知物理");
[
  ["pendulum", "擺長 L", "週期 T", 0.5, "T ∝ √L"],
  ["pendulum", "重力 g", "週期 T", -0.5, "T ∝ 1/√g"],
  ["spring", "質量 m", "週期 T", 0.5, "T ∝ √m"],
  ["spring", "勁度 k", "週期 T", -0.5, "T ∝ 1/√k"],
  ["ohms", "電壓 V", "電流 I", 1, "I ∝ V"]
].forEach(([id, sl, ro, wantExp, desc]) => {
  if (!PL.has(id)) return;
  const b = build(id);
  const ins = insights[id];
  const rel = ins && (ins.relations || []).find(r => r.slider.label === sl && r.readout.label === ro);
  if (!rel) { R.ok(false, id + "：" + desc, "找不到這組關係"); }
  else {
    const e = rel.exponent;
    R.ok(e != null && Math.abs(e - wantExp) < 0.12, id + "：" + desc,
      "指數 " + (e == null ? "—" : e.toFixed(3)) + "，理論 " + wantExp);
  }
  if (b.api && b.api.stop) b.api.stop();
});

R.section("探測不可以污染實驗狀態（滑桿必須還原）");
["pendulum", "ohms", "spring", "freefall", "projectile", "vernier-micrometer"].forEach(id => {
  if (!PL.has(id)) return;
  let ctx = null;
  PL._hooks.onBuilt(c => { if (c.id === id) ctx = c; });
  const b = build(id);
  const bad = [];
  (ctx && ctx.sliders || []).forEach(m => {
    if (Math.abs(m.read() - m.initial) > 1e-9) bad.push(m.label + "=" + m.read() + "≠" + m.initial);
  });
  R.ok(bad.length === 0, id.padEnd(20) + " 滑桿已還原", bad.join("、"));
  if (b.api && b.api.stop) b.api.stop();
});

R.done();
