/*
 * chase-test.js — 追及與相遇
 *
 * 這個單元最容易寫錯的地方不是公式，而是「前車剎停後不再移動」。
 * 直接套 x = v₀t + ½at² 會讓剎停的車開始往回走，
 * 於是「後車追上」的時刻整個算錯——這是課本會特別提醒的經典錯誤，
 * 模擬如果也犯，就是把錯的東西教給學生。
 */
require("./harness.js");
const { reporter } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

let ctx = null;
PL._hooks.onBuilt(c => { if (c.id === "chase-and-meet") ctx = c; });
const root = document.createElement("div");
root.dataset = { simId: "chase-and-meet" };
const api = PL.get("chase-and-meet").build(root);

const set = (label, v) => {
  const s = (ctx.sliders || []).find(x => x.label === label);
  if (!s) throw new Error("找不到滑桿：" + label);
  s.write(v);
};
const get = label => {
  const r = (ctx.readouts || []).find(x => x.label === label);
  return r ? r.number : null;
};
const at = tt => { set("觀察時刻 t", tt); if (api.rerender) api.rerender(); };

R.section("建置");
R.ok(!!ctx, "取得建置脈絡");
R.ok((ctx.sliders || []).length === 6, "六根滑桿",
  (ctx.sliders || []).map(s => s.label).join(" / "));

R.section("剎停的車不可以倒退（本單元最經典的錯誤）");
{
  // 乙：初速 20、加速度 −4 → 5 秒剎停，停止時前進 50 m
  set("甲 初速 v₀", 0); set("甲 加速度 a", 0);
  set("乙 初速 v₀", 20); set("乙 加速度 a", -4);
  set("初始間距 Δx₀", 30);
  at(5); const x5 = get("乙位置");
  at(8); const x8 = get("乙位置");
  at(12); const x12 = get("乙位置");
  R.ok(Math.abs(x5 - 80) < 0.2, "t=5 s 剛好剎停，位置 = 30 + 50 = 80 m", "得 " + PL.fmt(x5, 2));
  R.ok(Math.abs(x8 - x5) < 1e-6 && Math.abs(x12 - x5) < 1e-6,
    "剎停後位置不再改變", "t=8 → " + PL.fmt(x8, 2) + "，t=12 → " + PL.fmt(x12, 2));
}

R.section("等速追等速：追上時刻應等於 Δx₀ /（v甲 − v乙）");
{
  set("甲 初速 v₀", 20); set("甲 加速度 a", 0);
  set("乙 初速 v₀", 12); set("乙 加速度 a", 0);
  set("初始間距 Δx₀", 40);
  const want = 40 / (20 - 12);          // 5 s
  at(want);
  R.ok(Math.abs(get("當前間距 Δx")) < 0.05, "t = 5 s 時間距為 0",
    "得 " + PL.fmt(get("當前間距 Δx"), 3) + " m");
  at(want - 1);
  R.ok(get("當前間距 Δx") > 0, "追上之前間距為正");
}

R.section("等加速追等速：速度相等時間距最大");
{
  set("甲 初速 v₀", 0); set("甲 加速度 a", 3);
  set("乙 初速 v₀", 12); set("乙 加速度 a", 0);
  set("初始間距 Δx₀", 20);
  const te = 12 / 3;                     // 速度相等於 t = 4 s
  at(te);
  const gapE = get("當前間距 Δx");
  [te - 1.5, te - 0.5, te + 0.5, te + 1.5].forEach(tt => {
    at(tt);
    R.ok(get("當前間距 Δx") <= gapE + 1e-6,
      "t = " + tt + " s 的間距不超過速度相等時",
      PL.fmt(get("當前間距 Δx"), 2) + " ≤ " + PL.fmt(gapE, 2));
  });
  at(te);
  R.ok(Math.abs(get("速度差 v甲 − v乙")) < 0.05, "速度相等時速度差為 0",
    "得 " + PL.fmt(get("速度差 v甲 − v乙"), 3));
  // 解析解：Δx_max = 20 + 12×4 − ½×3×4² = 20 + 48 − 24 = 44
  R.ok(Math.abs(gapE - 44) < 0.2, "最大間距符合解析解 44 m", "得 " + PL.fmt(gapE, 2));
}

R.section("追不上：速度相等時仍有間距，之後就再也追不上");
{
  set("甲 初速 v₀", 10); set("甲 加速度 a", 0);
  set("乙 初速 v₀", 5); set("乙 加速度 a", 2);
  set("初始間距 Δx₀", 40);
  // 速度相等於 t = 2.5 s，此時 Δx = 40 + (5×2.5 + ½×2×2.5²) − 10×2.5 = 40 + 18.75 − 25 = 33.75
  at(2.5);
  R.ok(get("當前間距 Δx") > 30, "速度相等時仍有 30 m 以上的間距",
    "得 " + PL.fmt(get("當前間距 Δx"), 2) + " m");
  at(12);
  R.ok(get("當前間距 Δx") > 30, "之後間距反而變大（永遠追不上）",
    "t=12 s → " + PL.fmt(get("當前間距 Δx"), 2) + " m");
}

R.section("三張圖分頁都存在");
{
  const tabs = root.querySelectorAll(".sim-chart-tab");
  R.ok(tabs.length === 3, "三個分頁", tabs.map(t => t.textContent).join(" / "));
  // 逐一切換，確認都畫得出來、不丟例外
  let err = null;
  tabs.forEach(tb => { try { tb.dispatch("click", {}); } catch (e) { err = e.message; } });
  R.ok(!err, "三個分頁都能繪製", err || "");
}

R.section("情境預設與判定徽章");
{
  R.ok(root.querySelectorAll(".sim-preset").length >= 3, "至少三個情境預設");
  R.ok(root.querySelectorAll(".sim-verdict").length === 1, "有結局判定徽章");
  R.ok(root.querySelectorAll(".sim-derived-cell").length === 3, "三張衍生量卡");
}

if (api && api.stop) api.stop();
R.done();
