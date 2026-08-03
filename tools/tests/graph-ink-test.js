/*
 * graph-ink-test.js — 圖表裡的曲線在兩種主題都要看得見
 *
 * 為什麼需要這一支：
 * 墨色層掛在 D.line / D.disc / D.rect / D.text 上，所以圖表的 dot、vline、
 * hline、label 都自動享有搶救。但 graph.curve 與 graph.area 是圖表裡唯二
 * 自己指派 ctx.strokeStyle / ctx.fillStyle 的地方，它們繞過了整層墨色。
 *
 * 代價是實際發生過的：等加速度運動的 x–t 參考曲線寫死成 rgba(255,255,255,0.18)，
 * 淺色主題下白線畫在近白的圖表底板上，整張 x–t 圖看起來是空的。
 * 使用者截圖回報「x–t 沒有東西」，而當時所有稽核都是綠的——
 * 因為沒有任何一支在量「曲線相對於它底下那塊底板的對比」。
 *
 * 量法：把 PL.graph 包起來，在 curve/area 呼叫後直接讀 ctx 上真正被指派的顏色
 * （harness 的 save/restore 是空的，所以讀得到），把半透明色合成到底板顏色上，
 * 再算對比。門檻取 1.5——這不是 WCAG，而是「還看得出有一條線在那裡」的下限；
 * 淡淡的參考線本來就不該被要求到 3:1。
 */
require("./harness.js");
const fs = require("fs");
const { reporter, allIds, cssVars, useTheme, colorMetrics } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
const V = cssVars(fs.readFileSync("css/style.css", "utf8"));

const MIN_RATIO = 1.5;
/*
 * 引擎解不透明度時是「剛好解到 1.5」，而且它只知道背景亮度、用同亮度的中性灰去合成；
 * 這支測試則用底板真正的顏色（#f3f7fc 帶一點藍）。兩者會差在小數第三位。
 * 不留容差的話，每一條剛好達標的線都會被判失敗——那是量測誤差，不是缺陷。
 */
const TOL = 0.01;

/*
 * 這裡需要的是 r/g/b 三個通道（要做 alpha 合成），
 * 而 _lib 的 colorMetrics 只回傳亮度與彩度，所以自己解析一次。
 */
function rgbOf(c) {
  const s = String(c);
  const m = /rgba?\(([^)]+)\)/.exec(s);
  if (m) {
    const p = m[1].split(",").map(Number);
    if (p.slice(0, 3).some(v => !isFinite(v))) return null;
    return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
  }
  if (s[0] === "#") {
    let h = s.slice(1), a = 1;
    if (h.length === 3) h = h.split("").map(x => x + x).join("");
    if (h.length === 8) { a = parseInt(h.slice(6, 8), 16) / 255; h = h.slice(0, 6); }
    if (h.length !== 6) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a };
  }
  return null;
}
/* 把半透明前景合成到背景上，得到眼睛實際看到的顏色 */
function composite(fg, bg) {
  const a = fg.a == null ? 1 : fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a)
  };
}
/*
 * 相對亮度必須做 gamma 反轉，不能直接把 0–255 除以 255 加權。
 * 第一版就是漏了這一步，於是同一塊陰影引擎算出 1.50、測試算出 1.20，
 * 我還先去改了引擎——量錯的是稽核。WCAG 的定義在這裡不是形式，
 * 少了 gamma 會系統性低估淺色背景上的對比。
 */
const relLum = c => {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/*
 * 圖表底板的顏色就是 frame() 填的 --sim-bg-1。
 * 這裡直接讀 CSS 變數，而不是相信墨色網格的取樣值——
 * 那等於用被測物來驗證自己。
 */
function panelOf(vars) {
  const m = rgbOf(vars["--sim-bg-1"]);
  return m || { r: 10, g: 15, b: 22, a: 1 };
}

/* 把 PL.graph 包起來，記錄每一次 curve / area 實際落在 ctx 上的顏色 */
let LOG = null;
const origGraph = PL.graph;
PL.graph = function (cv, box, dom) {
  const g = origGraph.call(this, cv, box, dom);
  const ctx = cv.ctx;
  ["curve", "area"].forEach(name => {
    const fn = g[name];
    if (typeof fn !== "function") return;
    g[name] = function (...args) {
      const out = fn.apply(this, args);
      if (LOG) {
        const used = name === "area" ? ctx.fillStyle : ctx.strokeStyle;
        if (used) LOG.push({ api: name, color: String(used) });
      }
      return out;
    };
  });
  // fn() 內部轉呼叫 g.curve，包過 curve 就一併涵蓋了
  return g;
};

function audit(theme, vars) {
  useTheme(PL, theme, vars);
  const panel = panelOf(vars);
  const panelLum = relLum(panel);
  const ids = allIds(PL);
  const bad = [];
  let drawn = 0, checked = 0;

  ids.forEach(id => {
    const def = PL.get(id);
    if (!def || typeof def.build !== "function") return;
    const root = document.createElement("div");
    document.body.appendChild(root);
    let api = null;
    LOG = [];
    try { api = def.build(root); } catch (e) { LOG = null; return; }
    const log = LOG; LOG = null;
    if (log.length) drawn++;
    log.forEach(entry => {
      const fg = rgbOf(entry.color);
      if (!fg) return;
      checked++;
      const seen = composite(fg, panel);
      const r = ratio(relLum(seen), panelLum);
      if (r < MIN_RATIO - TOL) bad.push(`${id}  ${entry.api}  ${entry.color}  對比 ${r.toFixed(2)}`);
    });
    try { if (api && api.stop) api.stop(); } catch (e) {}
    if (root.parentNode) root.parentNode.removeChild(root);
  });

  R.section((theme === "light" ? "淺色" : "深色") + "主題：圖表曲線與底板的對比");
  R.ok(drawn > 0, "確實量到東西（有畫曲線的實驗數）", String(drawn) + " 個實驗");
  R.ok(checked > 0, "確實量到顏色（curve/area 呼叫數）", String(checked) + " 次");
  R.ok(bad.length === 0,
    `所有曲線對比 ≥ ${MIN_RATIO}`,
    bad.length ? "\n    " + bad.slice(0, 20).join("\n    ") : String(checked) + " 次全部通過");
}

audit("dark", V.dark);
audit("light", V.light);

R.done();
