#!/usr/bin/env node
/*
 * run-all.js — 一次跑完所有測試
 *
 * 用法：node tools/tests/run-all.js        （在專案根目錄執行）
 *      node tools/tests/run-all.js --fast  （略過耗時的稽核）
 *
 * 慢的兩支（meaning-audit、theme-audit）要對 246 個實驗各建置數百次，
 * 合計數分鐘。日常開發用 --fast，發佈前一定要跑完整版。
 */
"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const fast = process.argv.indexOf("--fast") >= 0;
const SLOW = new Set(["meaning-audit.js", "theme-audit.js"]);

const dir = path.join(__dirname);
const files = fs.readdirSync(dir)
  .filter(f => f.endsWith(".js"))
  .filter(f => !["harness.js", "_lib.js", "run-all.js"].includes(f))
  .sort();

let pass = 0, fail = 0, skipped = 0;
const failed = [];

files.forEach(f => {
  if (fast && SLOW.has(f)) { skipped += 1; console.log("－ " + f.padEnd(24) + "（--fast 略過）"); return; }
  const t0 = Date.now();
  try {
    const out = execFileSync(process.execPath, [path.join(dir, f)],
      { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30 * 60 * 1000 });
    const line = (out.match(/通過 \d+ 項，失敗 \d+ 項/g) || []).pop() ||
                 (out.match(/✓[^\n]*/g) || []).slice(-1)[0] || "";
    console.log("✓ " + f.padEnd(24) + line + "  (" + ((Date.now() - t0) / 1000).toFixed(1) + "s)");
    pass += 1;
  } catch (e) {
    const out = String(e.stdout || "") + String(e.stderr || "");
    console.log("✗ " + f.padEnd(24) + "失敗");
    (out.match(/^\s*✗.*$/gm) || []).slice(0, 6).forEach(l => console.log("     " + l.trim()));
    failed.push(f);
    fail += 1;
  }
});

console.log("\n通過 " + pass + " 支，失敗 " + fail + " 支" + (skipped ? "，略過 " + skipped + " 支" : ""));
if (failed.length) console.log("失敗：" + failed.join("、"));
process.exit(fail ? 1 : 0);
