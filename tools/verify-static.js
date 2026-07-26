#!/usr/bin/env node
/*
 * verify-static.js — 靜態層的自我檢查
 *
 * 在 CI 裡跑，確保「內容真的進得了 HTML」這件事不會悄悄壞掉。
 * 這正是原本最嚴重的問題：頁面看起來正常，但爬蟲讀到的是空的。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
let failed = 0;
const check = (name, ok, extra) => {
  if (!ok) failed += 1;
  console.log((ok ? "  ✓ " : "  ✗ ") + name + (extra ? "  " + extra : ""));
};

/* 載入課程資料以取得應有的實驗數 */
const sandbox = { window: {}, document: { documentElement: {}, head: { appendChild() {} }, createElement: () => ({}) }, console };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
["js/site-config.js", "js/curriculum.js", "js/advanced-curriculum.js", "js/comprehensive-curriculum.js",
 "js/extension-registry.js", "js/open-curriculum.js", "js/school-curriculum.js"].forEach(f => {
  const full = path.join(ROOT, f);
  if (fs.existsSync(full)) vm.runInContext(fs.readFileSync(full, "utf8"), sandbox, { filename: f });
});
const C = sandbox.window.PhysicsLabCurriculum;
const site = sandbox.window.PhysicsLabSite || {};
const flat = [];
C.modules.forEach(m => m.experiments.forEach(e => flat.push({ e, m })));
const gated = site.accessGate !== false;

console.log("=== 靜態層檢查（閘門：" + (gated ? "開啟" : "關閉") + "）===");

check("每個實驗都有說明頁", flat.every(x => fs.existsSync(path.join(ROOT, "p", x.e.id + ".html"))),
  flat.length + " 個");
check("每個實驗都有學習單", flat.every(x => fs.existsSync(path.join(ROOT, "p", "worksheet-" + x.e.id + ".html"))));
check("有總索引頁", fs.existsSync(path.join(ROOT, "experiments.html")));
check("有 sitemap.xml", fs.existsSync(path.join(ROOT, "sitemap.xml")));
check("有 robots.txt", fs.existsSync(path.join(ROOT, "robots.txt")));

/* 最關鍵的一項：內容必須真的在 HTML 裡，不是靠 JS 生成 */
const indexHtml = fs.readFileSync(path.join(ROOT, "experiments.html"), "utf8");
const titlesInHtml = flat.filter(x => indexHtml.includes(x.e.title)).length;
check("索引頁含有全部實驗標題（爬蟲讀得到）", titlesInHtml === flat.length,
  titlesInHtml + " / " + flat.length);

const sample = fs.readFileSync(path.join(ROOT, "p", flat[0].e.id + ".html"), "utf8");
check("實驗頁含有概念敘述", sample.includes(flat[0].e.concept.slice(0, 20)));
check("實驗頁含有結構化資料", sample.includes("LearningResource"));
check("實驗頁指向互動版本", sample.includes("index.html#"));

/* 閘門狀態與索引設定必須一致，否則會收錄到空殼或該公開卻沒公開 */
const robots = fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8");
check("robots.txt 與閘門狀態一致",
  gated ? robots.includes("Disallow: /") : robots.includes("Allow: /"),
  gated ? "閘門開啟 → 不開放索引" : "已公開 → 開放索引");
check("頁面的 noindex 與閘門狀態一致",
  gated ? sample.includes("noindex") : !sample.includes("noindex"));

const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const urlCount = (sitemap.match(/<url>/g) || []).length;
check("sitemap 涵蓋所有實驗頁與學習單", urlCount >= flat.length * 2, urlCount + " 筆");

console.log(failed ? "\n" + failed + " 項未通過" : "\n全部通過");
process.exit(failed ? 1 : 0);
