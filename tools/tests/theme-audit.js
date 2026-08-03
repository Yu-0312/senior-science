/*
 * theme-audit.js — 兩種主題下都不該出現「刺眼的白塊」或「黑洞」
 *
 * 這支測試守的是本專案最嚴重的一類 bug：墨色層把「本來就該是那個顏色的表面」
 * 翻成相反的顏色。深色主題下圖表底板被翻成近白色、淺色主題下被翻成近黑色，
 * 兩次都是使用者截圖才發現的——因為既有的檢查全都在驗「對比夠不夠」，
 * 而一塊白底板的對比極高，每一項都會通過。
 *
 * 判準：
 *   深色主題 → 不該有低彩度的淺色大面積
 *   淺色主題 → 不該有低彩度的深色大面積
 * 並且只回報「沒有人管過的寫死顏色」：
 *   · 墨色層已介入的（out !== fill）是設計中的搶救行為
 *   · 主題衍生色（col / theme.shade / theme.pale）本來就已隨主題調整
 */
require("./harness.js");
const fs = require("fs");
const { reporter, allIds, cssVars, useTheme, colorMetrics } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();

/* 實體物件本來就是這個顏色，不是被誤翻的面板。
   判斷依據是它代表「被觀察的物體」而不是襯在後面的底板。 */
const ALLOW = new Set([
  "#8d97a6",                 // 氣體實驗的活塞、法拉第籠的金屬殼
  "rgba(225,235,255,0.62)"   // 水火箭的水柱
]);

const V = cssVars(fs.readFileSync("css/style.css", "utf8"));
R.section("變數解析自我檢查（兩主題必須不同，否則解析器壞了）");
["--sim-bg-1", "--panel-solid", "--text"].forEach(k => {
  R.ok(V.dark[k] !== V.light[k], k + " 兩主題不同",
    "深 " + V.dark[k] + " ／ 淺 " + V.light[k]);
});

const ids = allIds(PL);

function scan(theme, vars) {
  const probe = useTheme(PL, theme, vars);
  if (probe !== vars["--sim-bg-1"]) {
    R.ok(false, "[" + theme + "] 變數注入生效", "col() 讀到 " + probe + "，應為 " + vars["--sim-bg-1"]);
    return null;
  }
  R.ok(true, "[" + theme + "] 變數注入生效", 'col("sim-bg-1") = ' + probe);

  const hits = [];
  let current = "";
  const orig = PL.draw.rect;
  PL.draw.rect = function (ctx, x, y, w, h, o) {
    if (o && o.fill && Math.abs(w * h) > 2500) {
      const out = PL.theme.ink(ctx, o.fill, x, y, "fill");
      const M = colorMetrics(out);
      const untouched = out === o.fill && !PL.theme.isThemeSurface(o.fill) && !ALLOW.has(o.fill);
      if (M && M.alpha >= 0.4 && untouched && M.chroma <= 0.14) {
        const pale = M.lum > 0.30, darkBlock = M.lum < 0.12;
        if ((theme === "dark" && pale) || (theme === "light" && darkBlock)) {
          hits.push({ exp: current, area: Math.round(Math.abs(w * h)), fill: o.fill });
        }
      }
    }
    return orig.apply(this, arguments);
  };
  ids.forEach(id => {
    current = id;
    try {
      const root = document.createElement("div"); root.dataset = { simId: id };
      const api = PL.get(id).build(root);
      if (api && api.stop) api.stop();
    } catch (e) { /* render-test 負責抓建置失敗 */ }
  });
  PL.draw.rect = orig;
  return hits;
}

R.section("深色主題：不該有低彩度的淺色大面積（刺眼白塊）");
const d = scan("dark", V.dark);
if (d) {
  const agg = summarise(d);
  R.ok(d.length === 0, "掃描 " + ids.length + " 個實驗", agg);
}

R.section("淺色主題：不該有低彩度的深色大面積（黑洞）");
const l = scan("light", V.light);
if (l) {
  const agg = summarise(l);
  R.ok(l.length === 0, "掃描 " + ids.length + " 個實驗", agg);
}

function summarise(hits) {
  if (!hits.length) return "";
  const m = new Map();
  hits.forEach(h => {
    if (!m.has(h.fill)) m.set(h.fill, { n: 0, area: 0, exps: new Set() });
    const e = m.get(h.fill); e.n++; e.area = Math.max(e.area, h.area); e.exps.add(h.exp);
  });
  return "\n      " + [...m.entries()].sort((a, b) => b[1].area - a[1].area).slice(0, 8)
    .map(([f, e]) => f + "  最大面積 " + e.area + "  " + e.exps.size + " 個實驗  " +
      [...e.exps].slice(0, 3).join(", ")).join("\n      ");
}

R.done();
