/*
 * loop-test.js — 力學能守恆與圓環軌道
 *
 * 這一題的教學重點是「2R 與 2.5R 的差別」，所以測試也照這個分：
 *   · 臨界高度必須是 2.5R，而且與質量無關
 *   · 環頂速率 v = √(2g(h−2R))，臨界值 √(gR)
 *   · h 剛好 2R 時必須「爬得上去但過不去」，不能讓它硬滑過
 */
require("./harness.js");
const { reporter } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

let ctx = null;
PL._hooks.onBuilt(c => { if (c.id === "loop-track") ctx = c; });
const root = document.createElement("div");
root.dataset = { simId: "loop-track" };
const api = PL.get("loop-track").build(root);

const ctrl = label => {
  const s = (ctx.sliders || []).find(x => x.label === label);
  if (!s) throw new Error("找不到控制項：" + label);
  return s;
};
const set = (label, v) => { ctrl(label).write(v); if (api.rerender) api.rerender(); };
const get = label => {
  const r = (ctx.readouts || []).find(x => x.label === label);
  return r ? r.number : null;
};
const derived = i => {
  const cells = root.querySelectorAll(".sim-derived-value");
  return cells[i] ? parseFloat(cells[i].textContent) : null;
};
const verdictText = () => {
  const v = root.querySelectorAll(".sim-verdict-text")[0];
  return v ? v.textContent : "";
};

R.section("建置");
R.ok(!!ctx, "取得建置脈絡");
R.ok((ctx.readouts || []).length === 6, "六個讀數",
  (ctx.readouts || []).map(r => r.label).join(" / "));

R.section("臨界高度 h_min = 2.5R，且與質量無關");
[0.2, 0.4, 0.8, 1.2].forEach(rr => {
  set("環半徑 R", rr);
  R.ok(Math.abs(get("最小高度 h_min") - 2.5 * rr) < 1e-9,
    "R = " + rr + " → h_min = " + (2.5 * rr), "得 " + PL.fmt(get("最小高度 h_min"), 3));
});
set("環半徑 R", 0.4);
const hm0 = get("最小高度 h_min");
[0.1, 1.0, 3.0].forEach(m => {
  set("質量 m", m);
  R.ok(Math.abs(get("最小高度 h_min") - hm0) < 1e-9, "質量 " + m + " kg 時 h_min 不變");
});
set("質量 m", 0.5);

R.section("環頂速率 v = √(2g(h−2R))，臨界值 √(gR)");
{
  set("環半徑 R", 0.4); set("重力加速度 g", 9.8);
  [1.2, 1.6, 2.4].forEach(h => {
    set("釋放高度 h", h);
    const want = Math.sqrt(Math.max(0, 2 * 9.8 * (h - 0.8)));
    R.ok(Math.abs(get("最高點速度 v頂") - want) < 0.01,
      "h = " + h + " → v頂 = " + PL.fmt(want, 3), "得 " + PL.fmt(get("最高點速度 v頂"), 3));
  });
  R.ok(Math.abs(get("臨界速度 v頂,min") - Math.sqrt(9.8 * 0.4)) < 1e-9,
    "臨界速度 = √(gR) = " + PL.fmt(Math.sqrt(9.8 * 0.4), 3),
    "得 " + PL.fmt(get("臨界速度 v頂,min"), 3));
}

R.section("動能裕度 ΔEk = mg(h − 2.5R)");
{
  set("質量 m", 0.5); set("環半徑 R", 0.4); set("重力加速度 g", 9.8);
  [[1.0, "負"], [1.0, "負"], [1.2, "正"], [2.0, "正"]].forEach(([h]) => {
    set("釋放高度 h", h);
    const want = 0.5 * 9.8 * (h - 1.0);
    R.ok(Math.abs(derived(2) - want) < 0.02,
      "h = " + h + " → ΔEk = " + PL.fmt(want, 3) + " J", "得 " + PL.fmt(derived(2), 3));
  });
}

R.section("h = 2R：爬得上去，但過不去（不可以硬滑過）");
{
  set("環半徑 R", 0.4); set("釋放高度 h", 0.8);
  R.ok(Math.abs(get("最高點速度 v頂")) < 1e-6, "環頂速率為 0", "得 " + get("最高點速度 v頂"));
  R.ok(derived(2) < 0, "動能裕度為負", PL.fmt(derived(2), 3) + " J");
  R.ok(/過不去|不足/.test(verdictText()), "判定為過不去", verdictText());
}

R.section("h = 2.5R：剛好臨界");
{
  set("釋放高度 h", 1.0);
  R.ok(Math.abs(derived(2)) < 0.02, "動能裕度 ≈ 0", PL.fmt(derived(2), 4) + " J");
  R.ok(Math.abs(get("最高點速度 v頂") - get("臨界速度 v頂,min")) < 0.01,
    "環頂速率剛好等於臨界速率",
    PL.fmt(get("最高點速度 v頂"), 3) + " vs " + PL.fmt(get("臨界速度 v頂,min"), 3));
  R.ok(/剛好臨界/.test(verdictText()), "判定為剛好臨界（不是過不去）", verdictText());
}

R.section("略高於臨界：明確判定為通過");
{
  set("釋放高度 h", 1.05);
  R.ok(/順利通過/.test(verdictText()), "h 略高於 2.5R 判定為通過", verdictText());
}

R.section("總力學能 E = mgh");
{
  [[0.5, 1.2], [2.0, 2.4], [1.0, 0.6]].forEach(([m, h]) => {
    set("質量 m", m); set("釋放高度 h", h);
    R.ok(Math.abs(get("總力學能 E") - m * 9.8 * h) < 0.01,
      "m=" + m + " h=" + h + " → E = " + PL.fmt(m * 9.8 * h, 3),
      "得 " + PL.fmt(get("總力學能 E"), 3));
  });
}

R.section("教學元件都有用上");
{
  const n = cls => root.querySelectorAll(cls).length;
  R.ok(n(".sim-verdict") === 1, "判定徽章");
  R.ok(n(".sim-derived-cell") === 3, "三張衍生量卡");
  R.ok(n(".sim-preset") >= 3, "情境預設");
  R.ok(n(".sim-causality-row") === 3, "因果面板三列");
  R.ok(n(".sim-rule") >= 1, "鐵律警示");
}

if (api && api.stop) api.stop();
R.done();
