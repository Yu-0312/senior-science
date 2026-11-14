/*
 * shell-check.js — 應用外殼的瀏覽器實測（路由、存檔、搜尋、離線、鍵盤）
 *
 * 用法（專案根目錄，需要 Playwright）：
 *   node tools/shell-check.js
 *
 * 由來：tools/tests/ 的二十幾支測試都在 Node 的 DOM 替身裡跑，守的是模擬引擎與每個實驗；
 * 應用外殼（js/app.js、duo/duo.js、sw.js）一行都沒被執行過。2026-11 的 code review 找到的問題
 * 全部落在這一塊，而且每一個都要真的瀏覽器才重現得出來：
 *
 *   · 網址 #%E0%A4%A、#constructor 讓整站停在空白頁
 *   · localStorage 裡一筆形狀不對的資料（或匯入一份壞掉的存檔）讓網站永遠開不起來
 *   · 實驗檔載入失敗一次，重新整理前就再也開不了，畫面還寫「尚在開發中」
 *   · 在實驗頁搜尋後清空搜尋框，畫面卡在舊的結果上
 *   · 「重設進度」只清掉一部分；已有計劃時改不了計劃天數
 *   · 課程目錄不能用鍵盤操作
 *   · 離線時沒存過的頁面變成一頁沒有樣式的首頁
 *
 * 每一項都留在這裡。和 stage-fit-check.js 一樣不在 run-all 之列（CI 沒有瀏覽器），發佈前手動跑。
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) {
  console.error("需要 Playwright：npm i -D playwright（或全域安裝）");
  process.exit(2);
}

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split("?")[0]);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(ROOT, rel));
  if (!(file + path.sep).startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

let pass = 0, fail = 0;
const ok = (cond, name, detail) => {
  cond ? pass += 1 : fail += 1;
  console.log((cond ? "  ✓ " : "  ✗ ") + name + (detail ? "  " + detail : ""));
};
const section = t => console.log("\n=== " + t + " ===");

(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();

  async function open(url, opts) {
    opts = opts || {};
    const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1366, height: 768 }, serviceWorkers: opts.sw ? "allow" : "block" });
    if (opts.init) await ctx.addInitScript(opts.init);
    const page = await ctx.newPage();
    page.errors = [];
    page.on("pageerror", e => page.errors.push(e.message));
    // 外部資源（字型、MathJax）不影響這裡要驗的事，擋掉讓測試不依賴網路
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    if (opts.route) await opts.route(page);
    await page.goto(base + url);
    await page.waitForTimeout(opts.wait || 900);
    return page;
  }
  const view = page => page.evaluate(() => ({
    view: (document.querySelector(".app") || {}).dataset ? document.querySelector(".app").dataset.view : "",
    home: getComputedStyle(document.querySelector("#home-view")).display !== "none",
    exp: getComputedStyle(document.querySelector("#exp-view")).display !== "none",
    tabs: document.querySelectorAll("#catalog-modules .catalog-tab").length,
    canvas: !!document.querySelector("#sim-root canvas"),
    simText: (document.querySelector("#sim-root") || {}).textContent || ""
  }));

  /* ------------------------------------------------------------------ */
  section("壞掉的網址");
  for (const hash of ["#%E0%A4%A", "#%", "#constructor", "#__proto__", "#toString", "#no-such-experiment"]) {
    const p = await open("/index.html" + hash);
    const v = await view(p);
    ok(!p.errors.length && v.home && v.tabs === 12, "index.html" + hash + " 回到首頁，沒有例外", p.errors.join(" | "));
    await p.context().close();
  }
  for (const hash of ["#%E0%A4%A", "#constructor"]) {
    const p = await open("/duo/" + hash);
    const units = await p.evaluate(() => document.querySelectorAll(".unit").length);
    ok(!p.errors.length && units === 12, "duo/" + hash + " 照常畫出地圖", p.errors.join(" | "));
    await p.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("壞掉的 localStorage");
  const badStores = [
    ["pl-progress", "5"], ["pl-progress", "{\"a\":1}"], ["pl-practice-done", "7"], ["pl-practice-answers", "[1]"],
    ["pl-study-plan", "{\"days\":3}"], ["pl-study-plan", "\"x\""], ["pl-last-viewed", "42"], ["pl-theme", "{oops"]
  ];
  for (const [key, value] of badStores) {
    const p = await open("/index.html#pendulum", { init: `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)})`, wait: 1500 });
    const v = await view(p);
    ok(!p.errors.length && v.exp && v.canvas, key + " = " + value + " 時實驗照常打開", p.errors.join(" | "));
    await p.context().close();
  }
  {
    const p = await open("/duo/", { init: `localStorage.setItem("duo2-state", '{"streak":null,"mistakes":3,"done":{"x":true},"xp":"many"}')` });
    const units = await p.evaluate(() => document.querySelectorAll(".unit").length);
    ok(!p.errors.length && units === 12, "關卡版的進度存檔壞掉時照常畫出地圖", p.errors.join(" | "));
    await p.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("匯入存檔");
  {
    const p = await open("/index.html");
    const save = { app: "senior-science", version: 1, data: { "pl-progress": "5", "pl-study-plan": "{\"days\":3}", "pl-practice-done": "[\"pendulum-q0\"]", "pl-theme": "\"dark\"", "evil": "1" } };
    await p.setInputFiles("#import-save-file", { name: "save.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(save)) });
    await p.waitForTimeout(400);
    const after = await p.evaluate(() => ({
      progress: localStorage.getItem("pl-progress"), plan: localStorage.getItem("pl-study-plan"),
      done: localStorage.getItem("pl-practice-done"), evil: localStorage.getItem("evil"),
      theme: document.documentElement.getAttribute("data-theme"), status: document.querySelector("#save-status").textContent
    }));
    ok(after.progress === null && after.plan === null && after.evil === null, "形狀不對的那幾筆沒有寫進去", JSON.stringify(after));
    ok(after.done === "[\"pendulum-q0\"]" && after.theme === "dark", "其餘正常的資料照常匯入", after.status);
    await p.reload(); await p.waitForTimeout(700);
    const v = await view(p);
    ok(!p.errors.length && v.home && v.tabs === 12, "匯入後重新整理，網站照常啟動", p.errors.join(" | "));
    await p.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("實驗檔載入失敗");
  {
    let block = true;
    const p = await open("/index.html#pendulum", { wait: 1500, route: page => page.route("**/js/experiments/shm.js*", r => (block ? r.abort() : r.continue())) });
    let v = await view(p);
    ok(!v.canvas && !/尚在開發中|製作中/.test(v.simText) && !!(await p.$("#sim-root .sim-problem button")), "載不到時說明原因並給「重試」，不說成還沒做", v.simText.slice(0, 40));
    block = false;
    await p.click("#sim-root .sim-problem button"); await p.waitForTimeout(1500);
    v = await view(p);
    ok(v.canvas, "網路恢復後按重試就能打開（失敗的載入沒有被記住）");
    await p.context().close();
  }
  {
    const p = await open("/index.html", { route: page => page.route("**/js/experiments/shm.js*", async r => { await new Promise(s => setTimeout(s, 1200)); r.continue(); }) });
    await p.evaluate(() => { location.hash = "#pendulum"; }); await p.waitForTimeout(250);
    await p.evaluate(() => { location.hash = "#home"; }); await p.waitForTimeout(2200);
    const v = await view(p);
    ok(v.home && !v.canvas, "還在載入時回首頁，模擬不會偷偷建在看不見的實驗頁裡");
    await p.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("搜尋面板");
  {
    const p = await open("/index.html#pendulum", { wait: 1500 });
    await p.keyboard.press("/"); await p.waitForTimeout(150);
    ok(await p.evaluate(() => !document.querySelector("#palette").hidden && document.activeElement.id === "search-input"), "按 / 打開面板，焦點在輸入框");
    await p.keyboard.type("透鏡"); await p.waitForTimeout(150);
    const hits = await p.evaluate(() => Array.from(document.querySelectorAll("#palette-list .palette-title")).map(n => n.textContent));
    ok(hits.length >= 3 && hits[0].indexOf("透鏡") >= 0, "標題命中的排在最前面", hits.slice(0, 3).join("、"));
    await p.fill("#search-input", ""); await p.waitForTimeout(100);
    await p.keyboard.press("Escape"); await p.waitForTimeout(150);
    let v = await view(p);
    ok(v.exp && v.canvas && await p.evaluate(() => document.querySelector("#palette").hidden), "清空再關掉，回到原本的實驗（以前會卡在舊的搜尋結果）");
    await p.keyboard.press("/"); await p.keyboard.type("F = ma"); await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.querySelectorAll("#palette-list .palette-item").length > 0), "公式裡的符號也找得到（F = ma）");
    await p.fill("#search-input", "<img src=x onerror=alert(1)>"); await p.waitForTimeout(150);
    ok(await p.evaluate(() => !document.querySelector("#palette-list img") && /找不到/.test(document.querySelector("#palette-list").textContent)), "查詢字串當成文字，不會變成 HTML");
    await p.fill("#search-input", "自由落體"); await p.waitForTimeout(150);
    await p.keyboard.press("Enter"); await p.waitForTimeout(1200);
    ok(await p.evaluate(() => location.hash === "#freefall" && document.querySelector("#palette").hidden), "Enter 開啟選到的實驗並關掉面板");
    await p.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("重設進度與學習計劃");
  {
    const seed = () => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
      set("pl-progress", ["pendulum"]); set("pl-practice-done", ["pendulum-q0"]); set("pl-practice-answers", { "pendulum-q0": 1 });
      set("pl-checkpoint-shm", { score: 1, total: 3 }); set("pl-reflection-pendulum", "hi"); set("pl-record-pendulum", []);
      set("pl-theme", "dark"); localStorage.setItem("pl-lab-v1", "{\"v\":1,\"seq\":1,\"items\":[],\"wires\":[]}");
    };
    const p = await open("/index.html", { init: seed });
    let dialogs = 0; p.on("dialog", d => { dialogs += 1; d.dismiss(); });
    await p.click("#btn-reset"); await p.waitForTimeout(200);
    ok(dialogs === 0 && await p.evaluate(() => !document.querySelector("#confirm").hidden && document.activeElement.id === "confirm-cancel"), "用頁面內的確認框（不是瀏覽器的 confirm），預設焦點在「取消」");
    await p.keyboard.press("Escape"); await p.waitForTimeout(150);
    ok(await p.evaluate(() => document.querySelector("#confirm").hidden && localStorage.getItem("pl-progress") === "[\"pendulum\"]"), "Esc 取消，進度還在");
    await p.click("#btn-reset"); await p.click("#confirm-ok"); await p.waitForTimeout(200);
    const left = await p.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf("pl-") === 0).sort());
    const learning = left.filter(k => !/^pl-(theme|lab-v1|sidebar-collapsed|demo-mode|offline-cached)$/.test(k));
    ok(learning.length === 0, "學習進度全部清掉（練習題、檢核、結論、記錄表都算）", "還留著：" + learning.join(", "));
    ok(left.indexOf("pl-theme") >= 0 && left.indexOf("pl-lab-v1") >= 0, "主題與自訂實驗室的作品不算學習進度，留著");

    await p.click("#btn-create-plan"); await p.waitForTimeout(150);
    await p.selectOption("#plan-days", "7"); await p.waitForTimeout(100);
    ok(await p.evaluate(() => document.querySelector("#plan-days").value === "7"), "已有 30 天計劃時仍可改選 7 天（以前會彈回 30）");
    await p.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("學習進度只算真的操作");
  {
    // 拋體運動建置時會由程式補發 input 事件；以前這樣就被記成「做過」
    const p = await open("/index.html#projectile", { wait: 1800 });
    ok(await p.evaluate(() => (localStorage.getItem("pl-progress") || "[]") === "[]"), "只是打開實驗（沒有任何操作）不算做過", await p.evaluate(() => localStorage.getItem("pl-progress")));
    await p.click("#sim-root .sim-visual-panel canvas", { position: { x: 30, y: 30 } }); await p.waitForTimeout(200);
    ok(await p.evaluate(() => (localStorage.getItem("pl-progress") || "").indexOf("projectile") >= 0), "真的動手點了實驗台才算");
    await p.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("教師演示與精簡版");
  {
    const p = await open("/index.html#pendulum", { wait: 1500 });
    const mode = () => p.evaluate(() => ({
      stage: document.body.classList.contains("stage-only"), demo: document.body.classList.contains("demo-mode"),
      predict: !!(document.querySelector(".sim-predict") && document.querySelector(".sim-predict").getClientRects().length),
      crumb: !!document.querySelector("#exp-crumb").getClientRects().length, hash: location.hash
    }));
    await p.click("#exp-present"); await p.waitForTimeout(1500);
    let m = await mode();
    ok(m.stage && m.demo && m.hash === "#pendulum", "實驗頁的「教師演示」直接把同一個實驗切成一頁式實驗台");
    await p.keyboard.press("Escape"); await p.waitForTimeout(600);
    await p.click("#catalog-panel .catalog-exp"); await p.waitForTimeout(1500);
    m = await mode();
    ok(!m.stage && !m.demo && m.predict && m.crumb, "離開演示後再開實驗是完整版（以前會一直停在沒有預測與麵包屑的精簡版）", JSON.stringify(m));
    await p.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("鍵盤與語意");
  {
    const p = await open("/index.html#pendulum", { wait: 1500 });
    const info = await p.evaluate(() => {
      const head = document.querySelector("#module-list .module-head"), item = document.querySelector("#module-list .exp-item");
      const brand = document.querySelector("#brand-home"), active = document.querySelector("#module-list .exp-item.active");
      return {
        head: head.tagName + "/" + head.getAttribute("aria-expanded"), item: item.tagName + "/" + item.getAttribute("href"),
        brand: brand.tagName + "/" + brand.getAttribute("href"), current: active && active.getAttribute("aria-current"),
        openHead: active.closest(".module").querySelector(".module-head").getAttribute("aria-expanded")
      };
    });
    ok(info.head === "BUTTON/false" && /^A\/#/.test(info.item) && info.brand === "A/#home", "目錄的模組是按鈕、實驗與品牌是連結", JSON.stringify(info));
    ok(info.current === "page" && info.openHead === "true", "目前的實驗標成 aria-current，所在模組標成展開");
    await p.focus("#module-list .module-head"); await p.keyboard.press("Enter"); await p.waitForTimeout(100);
    ok(await p.evaluate(() => document.querySelector("#module-list .module").classList.contains("open")), "鍵盤可以展開模組");
    const before = await p.evaluate(() => location.hash);
    await p.evaluate(() => document.body.focus());
    await p.keyboard.press("Alt+ArrowRight"); await p.waitForTimeout(200);
    ok(await p.evaluate(() => location.hash) === before, "Alt＋方向鍵留給瀏覽器，不會換實驗");
    const toc = await p.evaluate(() => Array.from(document.querySelectorAll("#exp-toc .exp-toc-link")).map(b => b.textContent));
    ok(toc.length >= 4 && toc[0] === "實驗台", "本頁導覽依畫面順序列出區塊", toc.join(" → "));
    await p.context().close();
  }
  {
    const p = await open("/index.html");
    await p.focus("#catalog-modules .catalog-tab.is-active"); await p.keyboard.press("ArrowDown"); await p.waitForTimeout(100);
    const cat = await p.evaluate(() => ({
      selected: document.querySelector("#catalog-modules .catalog-tab[aria-selected='true']").dataset.mod,
      title: document.querySelector("#catalog-panel .catalog-title").textContent,
      links: Array.from(document.querySelectorAll("#catalog-panel .catalog-exp")).every(a => /^#/.test(a.getAttribute("href"))),
      sidebar: getComputedStyle(document.querySelector("#sidebar")).display
    }));
    ok(cat.selected === "newton" && cat.links, "首頁目錄用方向鍵換模組，實驗都是連結", cat.title);
    ok(cat.sidebar === "none", "首頁不放側欄（目錄只有一份）");
    // 首頁不會觸發 MathJax：上面不可以留著 \\( … \\) 這種要等排版的原始碼
    ok(await p.evaluate(() => !/\\\(|\\\[/.test(document.querySelector("#home-view").innerText)), "首頁沒有未排版的公式原始碼");
    await p.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("自訂實驗室讀檔");
  {
    const scene = { v: 1, seq: 3, items: [{ id: "i1", type: "ball", x: 300, y: 100, a: 0, p: { m: 0, r: -5 } }, { id: "i2", type: "constructor", x: 1, y: 1 }], wires: [] };
    const p = await open("/lab.html", { init: `localStorage.setItem("pl-lab-v1", ${JSON.stringify(JSON.stringify(scene))})` });
    await p.click("#lab-play"); await p.waitForTimeout(700);
    const items = await p.evaluate(() => window.PhysicsLabLabApp.state.items.map(i => [i.x, i.y, i.p.m, i.p.r]));
    ok(!p.errors.length && items.length === 1 && items[0].every(n => typeof n === "number" && isFinite(n)) && items[0][2] > 0 && items[0][3] > 0,
      "質量 0、半徑 −5 的器材夾回合法範圍，播放後座標仍是有限的數", JSON.stringify(items));
    await p.context().close();
  }

  /* ------------------------------------------------------------------ */
  section("離線");
  {
    const p = await open("/index.html", { sw: true });
    await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(1200);
    const ctx = p.context();
    await ctx.setOffline(true);
    const p2 = await ctx.newPage();
    await p2.goto(base + "/p/pendulum.html").catch(() => {}); await p2.waitForTimeout(500);
    const off = await p2.evaluate(() => ({ home: !!document.querySelector("#home-view"), text: document.body.innerText, link: (document.querySelector("a") || {}).href || "" }));
    ok(!off.home && /沒有網路/.test(off.text) && off.link === base + "/", "沒存過的頁面顯示離線說明，不是套錯路徑的首頁", off.text.slice(0, 20));
    const p3 = await ctx.newPage();
    await p3.goto(base + "/index.html?utm=x#pendulum").catch(() => {}); await p3.waitForTimeout(1500);
    const v = await p3.evaluate(() => ({ styled: getComputedStyle(document.body).fontFamily.indexOf("Times") < 0, problem: !!document.querySelector("#sim-root .sim-problem"), text: (document.querySelector("#sim-root") || {}).textContent || "" }));
    ok(v.styled && v.problem && /沒有網路/.test(v.text), "首頁帶查詢字串離線也開得起來；沒存過的實驗說明是離線", v.text.slice(0, 30));
    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log("\n通過 " + pass + " 項，失敗 " + fail + " 項");
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error(err); process.exit(1); });
