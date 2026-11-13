#!/usr/bin/env node
/*
 * bump-version.js — 一個指令換掉全站的版本號
 *
 * 用法（在專案根目錄）：
 *   node tools/bump-version.js              版本號取現在的台北時間（YYYYMMDD-HHMM）
 *   node tools/bump-version.js 20261113-1  自己指定
 *   node tools/bump-version.js --build      換完順便重建 p/、experiments.html、sitemap 與 ja/
 *
 * 由來：版本號寫在十幾個地方（site-config.js、sw.js、每一頁手寫 HTML 的 ?v=、manifest.json），
 * 以前每次改版用 sed 把「舊版號」換成「新版號」。只要有一頁落後一版，舊字串就對不到它，
 * 它會一直留在原地（build-consistency.js 開頭記的就是這件事）。
 *
 * 這支不比對舊版號：手寫頁面裡所有的 ?v=… 一律換成新的，所以不會有漏網的頁面。
 * 產生出來的頁面（p/、experiments.html、ja/）不在這裡改，重跑建置腳本就會帶新版號。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const wantBuild = args.includes("--build");
const given = args.find(a => !a.startsWith("--"));

function taipeiStamp() {
  // 不依賴執行環境的時區：直接取 UTC+8
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const p = n => String(n).padStart(2, "0");
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + "-" + p(d.getUTCHours()) + p(d.getUTCMinutes());
}
const next = given || taipeiStamp();
if (!/^[0-9a-zA-Z.-]+$/.test(next)) {
  console.error("版本號只能用英數字、點和連字號：" + next);
  process.exit(1);
}

const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const write = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);
let changed = 0;
function patch(file, fn) {
  const before = read(file);
  const after = fn(before);
  if (after === before) return;
  write(file, after);
  changed += 1;
  console.log("  ✓ " + file);
}

const cfg = read("js/site-config.js");
const prev = (cfg.match(/build:\s*"([^"]+)"/) || [])[1];
if (!prev) { console.error("js/site-config.js 找不到 build 欄位"); process.exit(1); }
if (prev === next) { console.log("版本號已經是 " + next + "，沒有東西要改。"); process.exit(0); }
console.log("版本號 " + prev + " → " + next);

patch("js/site-config.js", s => s.replace(/(build:\s*")[^"]+(")/, "$1" + next + "$2"));
patch("sw.js", s => s.replace(/(const BUILD\s*=\s*")[^"]+(")/, "$1" + next + "$2"));
// 手寫的頁面：不管原本是哪一版，?v= 全部換掉
["index.html", "licensing.html", "lab.html", "duo/index.html", "duo/embed.html", "manifest.json"].forEach(f => {
  if (!fs.existsSync(path.join(ROOT, f))) return;
  patch(f, s => s.replace(/\?v=[0-9a-zA-Z.-]+/g, "?v=" + next));
});

if (wantBuild) {
  console.log("\n重建產生的頁面…");
  ["tools/build-manifest.js", "tools/build-static.js", "tools/build-ja.js", "tools/verify-static.js"].forEach(script => {
    execFileSync(process.execPath, [path.join(ROOT, script)], { cwd: ROOT, stdio: "inherit" });
  });
} else {
  console.log("\n改了 " + changed + " 個檔案。接著請重建產生的頁面：");
  console.log("  node tools/build-static.js && node tools/build-ja.js");
  console.log("（或下次直接用 node tools/bump-version.js --build）");
}
