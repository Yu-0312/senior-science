/*
 * layout-test.js — 版面規則與「孤兒 class」掃描
 *
 * 兩件事：
 *  1. 同一列的面板必須等高。使用者回報「左右不同長度」，查出來是
 *     .content-grid 與 .sim-stage 都寫了 align-items: start。
 *  2. JS 產生了某個 class 而 CSS 沒有對應規則 → 畫面就少一塊樣式，
 *     而對比、物理、無障礙測試全部不會有任何反應。
 *     學習單那一列（.worksheet-link-row 等三個）就是這樣裸奔了很久。
 *
 * 限制：jsdom 沒有版面引擎，這裡驗的是「CSS 規則是否寫對」，
 * 不是「畫面是否真的對齊」。真正的版面驗收只有人打開瀏覽器看才算數。
 */
const fs = require("fs");
const path = require("path");
const { reporter } = require("./_lib.js");
const R = reporter();

const cssRaw = fs.readFileSync("css/style.css", "utf8");
/* 先剝註解：第一版忘了這步，凡是「上面有註解的規則」都被判定成不存在，
   而新加的規則每條上面都有註解，於是回報了一整排假的失敗。 */
const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, "");

function rulesFor(sel) {
  const out = [];
  const re = /([^{}]+)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sels = m[1].split(",").map(s => s.trim().replace(/\s+/g, " "));
    if (sels.indexOf(sel) >= 0) out.push(m[2]);
  }
  return out.join(";");
}
function decl(sel, prop) {
  const body = rulesFor(sel);
  const hits = body.match(new RegExp("(?:^|;)\\s*" + prop + "\\s*:([^;]+)", "g"));
  if (!hits) return null;
  return hits[hits.length - 1].split(":").slice(1).join(":").trim();
}

R.section("同列面板等高");
R.ok(decl(".content-grid", "align-items") === "stretch", "外層兩欄等高");
R.ok(decl(".card", "flex-direction") === "column", ".card 為直向 flex");
R.ok(/flex\s*:\s*1/.test(rulesFor(".card > .card-body")), "撐高分配給 card-body");
R.ok(decl(".sim-stage", "align-items") === "stretch", "實驗台內畫布欄與參數欄等高");
R.ok(decl(".sim-visual-panel", "flex-direction") === "column", "畫布面板為直向 flex");
R.ok(decl(".sim-control-deck", "flex-direction") === "column", "參數面板為直向 flex");
R.ok(decl(".sim-visual-panel > .sim-instrument-strip", "margin-top") === "auto",
  "底部識別列貼齊面板下緣");

R.section("沒有後續規則把等高改回 start");
["\\.content-grid", "\\.sim-stage"].forEach(sel => {
  const re = new RegExp("^[^{\\n]*" + sel + "[^{\\n]*\\{([^}]*)\\}", "gm");
  let m; const bad = [];
  while ((m = re.exec(css))) {
    const v = m[1].match(/align-items\s*:\s*([^;]+)/);
    if (v && v[1].trim() !== "stretch") bad.push(m[0].split("{")[0].trim() + " → " + v[1].trim());
  }
  R.ok(bad.length === 0, sel.replace(/\\/g, "") + " 沒有被覆寫", bad.join(" / "));
});

R.section("量測工具疊圖層對齊主畫布");
R.ok(!/inset\s*:/.test(rulesFor(".sim-tool-host")),
  "不用 inset: 0（會相對內距框，整片偏移一個 padding）");
const tools = fs.readFileSync("js/sim-tools.js", "utf8");
R.ok(/host\.style\.left\s*=\s*\(cv\.canvas\.offsetLeft/.test(tools),
  "改由畫布實際 offset 定位");

R.section("新加的教學元件都有樣式");
[".sim-verdict", ".sim-derived", ".sim-presets", ".sim-chart-tabs",
 ".sim-magnifier", ".sim-causality", ".sim-procedure-card", ".sim-rule"]
  .forEach(s => R.ok(rulesFor(s).length > 0, s + " 有規則"));

R.section("孤兒 class 掃描（JS 產生但 CSS 沒樣式）");
/* 掛在其他 class 上的語意修飾詞，三段外觀刻意一致，留給老師自訂列印樣式 */
const HOOKS = new Set(["observe", "textbook", "takeaway"]);
const jsFiles = ["js/app.js", "js/sim-core.js", "js/sim-tools.js", "js/sim-insight.js", "js/sim-a11y.js"];
const produced = new Map();
jsFiles.forEach(rel => {
  if (!fs.existsSync(rel)) return;
  const src = fs.readFileSync(rel, "utf8");
  [/\bel\(\s*["'][a-zA-Z0-9]+["']\s*,\s*["']([^"']+)["']/g,
   /\.className\s*=\s*["']([^"']+)["']/g].forEach(re => {
    let m;
    while ((m = re.exec(src))) {
      m[1].split(/\s+/).filter(Boolean).forEach(c => {
        // 以 - 結尾的是字串拼接的前綴（"path-" + id），不是完整 class
        if (/^[a-z][a-z0-9-]*[a-z0-9]$/.test(c) && !produced.has(c)) produced.set(c, rel);
      });
    }
  });
});
const orphans = [];
produced.forEach((from, cls) => {
  const re = new RegExp("\\." + cls.replace(/-/g, "\\-") + "(?![a-zA-Z0-9-])");
  if (!re.test(css) && !HOOKS.has(cls)) orphans.push(cls + "  ← " + from);
});
R.ok(orphans.length === 0, "檢查 " + produced.size + " 個 class",
  orphans.length ? "\n      " + orphans.join("\n      ") : "全部有樣式");

R.done();
