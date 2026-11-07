/*
 * formula-text-test.js — 公式轉純文字不可以漏掉符號
 *
 * 說明頁、學習單（給搜尋引擎與列印）和離線時的退路，都把 LaTeX 轉成純文字。
 * 2026-11 以前轉換器只認得一小撮指令，其他一律略過：
 * N₂ + 3H₂ ⇌ 2NH₃ 變成「N₂+3H₂2NH₃」，「濃度↑ → 速率↑」掉了箭頭，三站共 81 條公式意思走樣。
 * 這裡逐條檢查：課程與題庫用到的每一個 LaTeX 指令都要在轉換器裡有對應，轉出來不能殘留 \ 或大括號。
 */
require("./harness.js");
const fs = require("fs");
const path = require("path");
const { reporter } = require("./_lib.js");
const R = reporter();
const { plainFormula, HANDLED } = require(path.join(process.cwd(), "tools/build-static.js"));
const handled = new Set(HANDLED);

const C = window.PhysicsLabCurriculum;
const QB = window.PhysicsLabQuestionBank || {};
const sources = [];
C.modules.forEach(m => m.experiments.forEach(e => {
  if (e.formula) sources.push([e.id + " 公式", e.formula]);
  (e.points || []).forEach((p, i) => { if (/\\[a-zA-Z]/.test(p)) sources.push([e.id + " 重點" + (i + 1), p]); });
  if (/\\[a-zA-Z]/.test(e.concept || "")) sources.push([e.id + " 概念", e.concept]);
}));

R.section("每一個 LaTeX 指令都有純文字對應");
const unknown = {};
sources.forEach(([where, src]) => {
  for (const m of src.matchAll(/\\([A-Za-z]+)/g)) if (!handled.has(m[1])) (unknown[m[1]] = unknown[m[1]] || []).push(where);
});
const names = Object.keys(unknown);
R.ok(names.length === 0, "課程用到的指令都認得（共 " + sources.length + " 段含公式的文字）",
  names.map(n => "\\" + n + "：" + unknown[n].slice(0, 3).join("、")).join("\n      "));

R.section("轉出來的文字乾淨");
const dirty = sources.map(([where, src]) => [where, plainFormula(src.replace(/\\\(|\\\)|\$\$/g, ""))])
  .filter(([, out]) => /[\\{}]/.test(out));
R.ok(dirty.length === 0, "沒有殘留 \\ 或大括號", dirty.slice(0, 5).map(d => d[0] + "：" + d[1]).join("\n      "));

R.section("抽查");
const sample = (latex, expect) => R.ok(plainFormula(latex) === expect, latex + " → " + expect, "得到 " + plainFormula(latex));
sample("\\text{N}_2+3\\text{H}_2\\rightleftharpoons2\\text{NH}_3", "N₂+3H₂ ⇌ 2NH₃");
sample("\\text{Zn}+\\text{Cu}^{2+}", "Zn+Cu²⁺");
sample("r\\approx10^{-15}\\,\\text{m}", "r≈10⁻¹⁵m");
sample("pK_a", "pK_a");
sample("k=Ae^{-E_a/RT}", "k=Ae^(-E_a/RT)");
sample("q_{\\text{放}}=q_{\\text{吸}}", "q_放=q_吸");
sample("90^{\\circ}", "90°");
sample("A\\xrightarrow{\\text{加熱}}B", "A →(加熱) B");
sample("\\underset{\\text{升溫}}{\\overset{\\text{過熱}}{\\rightleftharpoons}}", "⇌(過熱／升溫)");
R.done();
