/*
 * build-consistency.js — 發佈前的版本一致性檢查
 *
 * 由來：license.html 的 style.css 停在 ?v=20260725-8，其餘全站都是 20260726-5。
 * 每次改版我都用 sed 批次替換舊版號，但 license.html 落後了好幾版，
 * 舊的替換字串一直對不到它，於是它就一直留在原地。
 *
 * 後果不只是「拿到舊 CSS」：Service Worker 預先快取的是
 * css/style.css?v=<目前版本>，另一個查詢字串等於完全不同的網址，
 * 每次都得走網路，離線時直接失敗。
 *
 * 這種錯不會讓任何測試變紅，也不會在畫面上報錯——只有使用者會發現。
 * 因此把它變成一項會失敗的檢查。
 */
const fs = require("fs");
const path = require("path");

let pass = 0, fail = 0;
const ok = (c, n, d) => { c ? pass++ : fail++; console.log((c ? "  ✓ " : "  ✗ ") + n + (d ? "  " + d : "")); };

const cfg = fs.readFileSync("js/site-config.js", "utf8");
const sw = fs.readFileSync("sw.js", "utf8");
const BUILD = (cfg.match(/build:\s*"([^"]+)"/) || [])[1];
const SW_BUILD = (sw.match(/BUILD\s*=\s*"([^"]+)"/) || [])[1];

console.log("=== 版本號來源 ===");
ok(!!BUILD, "site-config.js 有 build", BUILD);
ok(BUILD === SW_BUILD, "sw.js 的 BUILD 與 site-config 相同",
  "site-config=" + BUILD + " sw=" + SW_BUILD);

console.log("\n=== 所有 HTML 的 ?v= 都等於目前版本 ===");
const htmls = ["index.html", "experiments.html", "license.html"]
  .concat(fs.existsSync("p") ? fs.readdirSync("p").map(f => "p/" + f).filter(f => f.endsWith(".html")) : []);
const bad = [];
htmls.forEach(f => {
  const src = fs.readFileSync(f, "utf8");
  Array.from(src.matchAll(/\?v=([0-9a-zA-Z.-]+)/g)).forEach(m => {
    if (m[1] !== BUILD) bad.push(f + " → ?v=" + m[1]);
  });
});
ok(bad.length === 0, "檢查 " + htmls.length + " 個 HTML",
  bad.length ? "\n      " + bad.slice(0, 10).join("\n      ") : "全部為 " + BUILD);

console.log("\n=== Service Worker 快取清單 ===");
function grab(name) {
  const m = sw.match(new RegExp("const " + name + " = \\[([\\s\\S]*?)\\];"));
  return m ? Array.from(m[1].matchAll(/"([^"]+)"/g)).map(x => x[1]) : [];
}
const listed = [].concat(grab("CORE"), grab("VERSIONED"), grab("EXPERIMENTS"), grab("ICONS"))
  .filter(p => p !== "./");
const missing = listed.filter(p => !fs.existsSync(p));
ok(missing.length === 0, "清單裡的檔案都存在（共 " + listed.length + " 筆）", missing.join(", "));

function walk(d, out) {
  out = out || [];
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = d + "/" + e.name;
    if (e.isDirectory()) walk(p, out); else out.push(p);
  });
  return out;
}
const real = [].concat(walk("js"), walk("css"));
const uncached = real.filter(p => listed.indexOf(p) < 0);
ok(uncached.length === 0, "所有 js/css 都在快取清單裡", uncached.join(", "));

console.log("\n=== HTML 引用的資源都有被快取 ===");
const notCached = [];
htmls.forEach(f => {
  const src = fs.readFileSync(f, "utf8");
  const prefix = f.startsWith("p/") ? "../" : "";
  Array.from(src.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))/g)).forEach(m => {
    let rel = m[1];
    if (prefix && rel.startsWith("../")) rel = rel.slice(3);
    if (!/^(js|css)\//.test(rel)) return;
    if (listed.indexOf(rel) < 0 && notCached.indexOf(f + " → " + rel) < 0) notCached.push(f + " → " + rel);
  });
});
ok(notCached.length === 0, "沒有「有引用卻沒快取」的資源",
  notCached.slice(0, 8).join("\n      "));

console.log("\n通過 " + pass + " 項，失敗 " + fail + " 項");
process.exit(fail ? 1 : 0);
