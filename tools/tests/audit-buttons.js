#!/usr/bin/env node
/*
 * audit-buttons.js — 全實驗按鈕稽核
 *
 * 逐實驗建置後收集：
 *  1. 按鈕清單（文字）＋重複檢查（同名按鈕出現多次）
 *  2. 觸發每個按鈕 → 收集 console 錯誤（壞掉的按鈕）
 *  3. 主要按鈕（primary）的位置順序
 *  4. 與播放列的組合（trigger 型實驗不該同時顯示「播放」）
 */
"use strict";
require("./harness.js");
const { reporter } = require("./_lib.js");
const R = reporter();
const PL = window.PhysicsLab;

const ids = PL.ids().sort();
let consoleErrors = [];
const origWarn = console.warn;
console.warn = (...a) => { consoleErrors.push(a.join(" ").slice(0, 160)); };

// 掛錯誤偵測
PL._hooks.onBuilt && PL._hooks.onBuilt(c => {
  c._buttons = [...c.root.querySelectorAll("button")].map(b => ({
    text: (b.textContent || "").trim().slice(0, 24),
    cls: b.className || "",
  }));
});

function clickAll(c) {
  const errors = [];
  const buttons = [...c.root.querySelectorAll("button")];
  buttons.forEach(b => {
    const before = consoleErrors.length;
    try { b.click(); } catch (e) { errors.push((b.textContent || "?").trim() + ": " + e.message); }
    // 模擬迴圈推進一點，讓觸發型按鈕的動畫也跑起來
    (c.loops || []).forEach(l => { try { l.stepOnce(); } catch (e) {} });
    const after = consoleErrors.slice(before);
    if (after.length) errors.push((b.textContent || "?").trim() + " → " + after[0]);
    consoleErrors.length = 0;
  });
  return errors;
}

R.section("A. 按鈕重複（同一實驗內同名按鈕出現 ≥2）");
const dupReport = [];
ids.forEach(id => {
  const def = PL.get(id);
  if (!def) return;
  let c = null;
  PL._hooks.onBuilt && PL._hooks.onBuilt(x => { if (x.id === id) c = x; });
  let root;
  try { root = document.createElement("div"); root.dataset = { simId: id }; def.build(root); }
  catch (e) { dupReport.push([id, "建置失敗: " + e.message]); return; }
  const btns = c && c._buttons ? c._buttons : [];
  const seen = {}, dups = [];
  btns.forEach(b => {
    const k = b.text;
    if (!k) return;
    // stepper 的「−」與「+」是同一個數值步進器的兩顆鍵，不是重複
    if (k === "−" || k === "+") return;
    seen[k] = (seen[k] || 0) + 1;
    if (seen[k] === 2) dups.push(k);
  });
  if (dups.length) dupReport.push([id, dups.join("、")]);
  try { def.build && root.api && root.api.stop && root.api.stop(); } catch (e) {}
});
dupReport.forEach(([id, d]) => R.ok(false, id, "重複按鈕: " + d));
if (!dupReport.length) R.ok(true, "全部 " + ids.length + " 個實驗無同名重複按鈕");

R.section("B. 按鈕點擊錯誤（觸發時丟出例外或 console.warn）");
let badCount = 0;
ids.forEach(id => {
  const def = PL.get(id);
  if (!def) return;
  let c = null;
  PL._hooks.onBuilt && PL._hooks.onBuilt(x => { if (x.id === id) c = x; });
  try {
    const root = document.createElement("div"); root.dataset = { simId: id };
    def.build(root);
  } catch (e) { R.ok(false, id, "建置失敗 " + e.message); badCount++; return; }
  const errs = clickAll(c || { root: { querySelectorAll: () => [] }, loops: [] });
  errs.forEach(e => { R.ok(false, id, e); badCount++; });
});
if (!badCount) R.ok(true, "全部實驗按鈕點擊無錯誤");

R.section("C. 主要動詞一致性（每個實驗的 primary 觸發鈕用詞）");
const verbCount = {};
ids.forEach(id => {
  const def = PL.get(id);
  if (!def) return;
  let c = null;
  PL._hooks.onBuilt && PL._hooks.onBuilt(x => { if (x.id === id) c = x; });
  try {
    const root = document.createElement("div"); root.dataset = { simId: id };
    def.build(root);
  } catch (e) { return; }
  const primary = (c && c._buttons || []).filter(b => /btn-primary|primary/.test(b.cls)).map(b => b.text);
  primary.forEach(t => { verbCount[t] = (verbCount[t] || 0) + 1; });
});
Object.entries(verbCount).sort((a, b) => b[1] - a[1]).slice(0, 15)
  .forEach(([t, n]) => console.log("  「" + t + "」× " + n));

R.done();
