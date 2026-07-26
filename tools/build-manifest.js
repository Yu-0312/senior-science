#!/usr/bin/env node
/*
 * build-manifest.js — 產生「實驗 id → 檔案」對應表
 *
 * 要解決的問題：
 * 首頁一次同步載入 849 KB 的 JavaScript，其中 496 KB（58%）是 16 個實驗檔。
 * 但學生一次只會打開一個實驗，其餘 244 個實驗的程式碼完全用不到。
 * 在中階手機上，光是解析與執行這些程式就要花掉可觀的時間，
 * 而且是在畫面出現之前，屬於直接可感受到的卡頓。
 *
 * 這支腳本掃描每個實驗檔註冊了哪些 id，產生對應表；
 * app.js 之後就能在開啟實驗時才載入需要的那一個檔案。
 *
 * 用法：node tools/build-manifest.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const EXP_DIR = path.join(ROOT, "js/experiments");
const OUT = path.join(ROOT, "js/experiment-manifest.js");

/*
 * 怎麼知道一個檔案註冊了哪些實驗
 *
 * 用正規表示式抓 PL.register("id") 只找得到 104 / 245——因為有不少實驗是
 * 資料驅動的，用陣列跑迴圈註冊，字串根本不會出現在原始碼裡。
 * 因此改成「真的把檔案跑一次」：給一個只會記錄 register() 的假 PhysicsLab，
 * 執行完就知道這個檔案到底登記了哪些 id。這個做法不受寫法影響，永遠正確。
 */
const vm = require("vm");

function stubLab(collect) {
  const noop = () => {};
  const chainable = new Proxy(function () { return chainable; }, {
    get: () => chainable,
    apply: () => chainable
  });
  return {
    register(id) { collect.push(id); },
    has: () => false,
    get: () => null,
    ids: () => [],
    // 實驗檔在載入時會解構這些成員（const PL = window.PhysicsLab, D = PL.draw），
    // 因此必須存在；但真正的繪圖函式不會在註冊階段被呼叫。
    ui: chainable, canvas: chainable, draw: chainable, graph: chainable,
    theme: { isLight: () => false, ink: (c, x) => x, pale: noop, shade: noop, parseColor: () => null, luminance: () => 0, name: () => "dark" },
    loop: () => chainable,
    col: () => "#000", fmt: n => String(n), clamp: (v) => v, lerp: (a) => a,
    TAU: Math.PI * 2, el: () => ({ style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, appendChild: noop, addEventListener: noop }),
    _hooks: { onStageCanvas: noop, onBuilt: noop, current: () => null },
    _registry: {}
  };
}

function idsIn(file) {
  const collected = [];
  const sandbox = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Math, JSON, Object, Array, String, Number, Boolean, Date, isFinite, isNaN, parseFloat, parseInt,
    Set, Map, Float32Array, Proxy, RegExp, Error
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.document = {
    documentElement: { getAttribute: () => "dark", style: { getPropertyValue: () => "" } },
    head: { appendChild: () => {} },
    createElement: () => ({ style: {}, dataset: {}, appendChild() {}, addEventListener() {} })
  };
  sandbox.PhysicsLab = stubLab(collected);
  vm.createContext(sandbox);

  // 課程資料有些實驗檔會在註冊時讀取，先載入
  ["js/curriculum.js", "js/advanced-curriculum.js", "js/comprehensive-curriculum.js",
   "js/extension-registry.js", "js/open-curriculum.js", "js/school-curriculum.js"].forEach(f => {
    const full = path.join(ROOT, f);
    if (fs.existsSync(full)) {
      try { vm.runInContext(fs.readFileSync(full, "utf8"), sandbox, { filename: f }); } catch (e) {}
    }
  });

  try {
    vm.runInContext(fs.readFileSync(path.join(EXP_DIR, file), "utf8"), sandbox, { filename: file });
  } catch (e) {
    console.error("載入 " + file + " 時發生錯誤：" + e.message);
    process.exit(1);
  }
  return [...new Set(collected)];
}

function main() {
  const files = fs.readdirSync(EXP_DIR).filter(f => f.endsWith(".js")).sort();
  const map = {};
  const perFile = {};
  let duplicates = [];

  files.forEach(file => {
    const ids = idsIn(file);
    perFile[file] = ids.length;
    ids.forEach(id => {
      if (map[id] && map[id] !== file) duplicates.push(id + "（" + map[id] + " 與 " + file + "）");
      map[id] = file;
    });
  });

  if (duplicates.length) {
    console.error("同一個實驗 id 出現在多個檔案，請先處理：");
    duplicates.forEach(d => console.error("  " + d));
    process.exit(1);
  }

  const body = `/*
 * experiment-manifest.js — 自動產生，請勿手動編輯
 *
 * 由 tools/build-manifest.js 掃描 js/experiments/ 產生。
 * app.js 依這張表在開啟實驗時才載入對應的檔案，
 * 讓首次載入不必付出 244 個用不到的實驗的成本。
 *
 * 重新產生：node tools/build-manifest.js
 */
window.PhysicsLabExperimentFiles = ${JSON.stringify(map, null, 2)};
`;
  fs.writeFileSync(OUT, body, "utf8");

  const totalIds = Object.keys(map).length;
  const bytes = files.reduce((sum, f) => sum + fs.statSync(path.join(EXP_DIR, f)).size, 0);
  const largest = files.map(f => ({ f, size: fs.statSync(path.join(EXP_DIR, f)).size }))
    .sort((a, b) => b.size - a.size)[0];

  console.log("已產生 js/experiment-manifest.js");
  console.log("  實驗檔 " + files.length + " 個，登記 " + totalIds + " 個實驗");
  console.log("  原本首次載入需要 " + (bytes / 1024).toFixed(0) + " KB 的實驗程式碼");
  console.log("  改為延遲載入後，開啟一個實驗最多只需 " + (largest.size / 1024).toFixed(0) +
    " KB（" + largest.f + "）");
}

main();
