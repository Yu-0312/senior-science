/*
 * ink-test.js — 墨色層的顏色語意
 *
 * 墨色層存在的唯一理由是搶救「實驗檔裡寫死的顏色」：
 * 某個實驗直接寫 #fff 畫標記點，深色台上很清楚，切到淺色主題就整片消失。
 *
 * 但 col()、theme.pale()、theme.shade() 回傳的顏色本身就已隨主題變化，
 * 它們是刻意選好的表面色，墨色層不可以再改一次。
 * 這條界線出過兩次事故（深色主題白方塊、淺色主題黑底板），
 * 而且兩次都是使用者截圖才發現的——因為既有檢查全在驗「對比夠不夠」，
 * 一塊被翻成白色的底板對比極高，每一項都會通過。
 */
require("./harness.js");
const fs = require("fs");
const { reporter, cssVars, useTheme, colorMetrics } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
const V = cssVars(fs.readFileSync("css/style.css", "utf8"));

/* 一個假的 ctx：帶著「背景很暗」或「背景很亮」的墨色網格 */
function fakeCtx(baseLum) {
  return {
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    _labDpr: 1,
    _labInkMap: { cols: 60, rows: 40, cells: new Float32Array(2400).fill(baseLum), base: baseLum }
  };
}
const DARK_BG = fakeCtx(0.006);
const LIGHT_BG = fakeCtx(0.90);

R.section("深色主題：主題衍生的填色面必須原封不動");
useTheme(PL, "dark", V.dark);
[["col(sim-bg-1)", PL.col("sim-bg-1", "#0a0f16")],
 ["theme.shade(0.45)", PL.theme.shade(0.45)],
 ["theme.shade(0.82)", PL.theme.shade(0.82)],
 ["theme.pale(0.12)", PL.theme.pale(0.12)]].forEach(([name, c]) => {
  const out = PL.theme.ink(DARK_BG, c, 100, 100, "fill");
  R.ok(out === c, name + " 用作填色面時放行", c + " → " + out);
});

R.section("深色主題：寫死的深色文字仍要翻成亮墨（這條規則不能被誤刪）");
{
  const out = PL.theme.ink(DARK_BG, "#0d1117", 100, 100);
  const m = colorMetrics(out);
  R.ok(m && m.lum > 0.5, "深色文字畫在深背景上 → 換亮墨", "#0d1117 → " + out);
}

R.section("淺色主題：主題衍生的填色面必須原封不動");
useTheme(PL, "light", V.light);
[["col(sim-bg-1)", PL.col("sim-bg-1", "#0a0f16")],
 ["theme.shade(0.45)", PL.theme.shade(0.45)],
 ["theme.pale(0.12)", PL.theme.pale(0.12)]].forEach(([name, c]) => {
  const out = PL.theme.ink(LIGHT_BG, c, 100, 100, "fill");
  R.ok(out === c, name + " 用作填色面時放行", c + " → " + out);
});

R.section("淺色主題：寫死的白色仍要被搶救（否則白底白字看不見）");
{
  // 打點計時器紙帶上有 1667 個 #e6edf3 的點，淺色主題下不搶救就整片消失
  const out = PL.theme.ink(LIGHT_BG, "#e6edf3", 100, 100, "fill");
  const m = colorMetrics(out);
  R.ok(out !== "#e6edf3" && m && m.lum < 0.2, "寫死的淺色填色 → 換深墨", "#e6edf3 → " + out);
  const out2 = PL.theme.ink(LIGHT_BG, "rgba(255,255,255,0.5)", 100, 100);
  R.ok(out2 !== "rgba(255,255,255,0.5)", "寫死的半透明白線 → 換深墨", "→ " + out2);
}

R.section("主題衍生色的登記簿會隨主題失效（不能把淺色的值當成深色的）");
{
  useTheme(PL, "light", V.light);
  const lightShade = PL.theme.shade(0.5);
  useTheme(PL, "dark", V.dark);
  R.ok(PL.theme.isThemeSurface(lightShade) === false,
    "切到深色後，淺色主題產生的值不再被視為主題色", lightShade);
  const darkShade = PL.theme.shade(0.5);
  R.ok(PL.theme.isThemeSurface(darkShade) === true, "目前主題產生的值仍被認得", darkShade);
}

R.done();
