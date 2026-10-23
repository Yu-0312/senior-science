/*
 * stage-fit-check.js — 教師演示版「一頁不捲動」的瀏覽器實測
 *
 * 用法（專案根目錄，需要 Playwright）：
 *   node tools/stage-fit-check.js                 # 1280×720、1366×768、1920×1080
 *   node tools/stage-fit-check.js 1366x768        # 只跑一種尺寸
 *
 * 逐一打開每個實驗，檢查：整頁不捲動、右欄每個分頁都放得下、畫布卡沒有被撐破。
 * 不放在 tools/tests/ 是因為那裡的測試都在 Node 的 DOM 替身裡跑，這支需要真的瀏覽器。
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) {
  console.error("需要 Playwright：npm i -D playwright（或全域安裝）");
  process.exit(2);
}

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

const sizes = (process.argv.slice(2).length ? process.argv.slice(2) : ["1280x720", "1366x768", "1920x1080"])
  .map(s => s.split("x").map(Number));

async function check(browser, base, w, h) {
  let page = null;
  const open = async id => {
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await page.addInitScript(() => { sessionStorage.setItem("pl-teacher-stage", "1"); localStorage.setItem("pl-demo-mode", "1"); });
    await page.goto(base + "/index.html#" + id);
    await page.waitForTimeout(1200);
  };
  await open("uniform-accel");
  const ids = await page.evaluate(() => window.PhysicsLabCurriculum.modules.flatMap(m => m.experiments.map(e => e.id)));
  const bad = [];
  for (let i = 0; i < ids.length; i++) {
    // 每 20 個換一個分頁：大量畫布累積在無頭瀏覽器裡會把行程撐垮
    if (i % 20 === 0) await open(ids[i]);
    else { await page.evaluate(id => { location.hash = "#" + id; }, ids[i]); await page.waitForTimeout(700); }
    const r = await page.evaluate(async () => {
      const raf = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
      const side = document.querySelector(".stage-side");
      if (!side) return { missing: true };
      let over = side.scrollHeight - side.clientHeight;
      const tabs = Array.from(side.querySelectorAll(".stage-tab")).filter(t => !t.hidden && !t.parentNode.hidden);
      for (const t of tabs) { t.click(); await raf(); over = Math.max(over, side.scrollHeight - side.clientHeight); }
      if (tabs[0]) tabs[0].click();
      const vis = document.querySelector(".sim-visual-panel");
      return {
        page: document.scrollingElement.scrollHeight - innerHeight,
        over, left: vis ? vis.scrollHeight - vis.clientHeight : 0,
        scroll: side.classList.contains("is-overflowing")
      };
    });
    if (r.missing || r.page > 0 || r.over > 2 || r.left > 2 || r.scroll) bad.push(ids[i] + " " + JSON.stringify(r));
  }
  await page.close();
  return { total: ids.length, bad };
}

(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  let failed = 0;
  for (const [w, h] of sizes) {
    const { total, bad } = await check(browser, base, w, h);
    console.log((bad.length ? "✗ " : "✓ ") + w + "×" + h + "：" + (total - bad.length) + " / " + total + " 個實驗一頁放得下");
    bad.forEach(b => console.log("    " + b));
    failed += bad.length;
  }
  await browser.close();
  server.close();
  process.exit(failed ? 1 : 0);
})();
