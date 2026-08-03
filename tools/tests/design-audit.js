/*
 * design-audit.js — 每個實驗「該有」什麼教學設計，實際有沒有
 *
 * 出發點：精緻度不等於插畫。木質軌道、金屬卡尺只有那幾個實驗用得上，
 * 真正該做到全站的是「這個實驗的內容需要什麼教學鷹架，它就要有什麼」。
 *
 * 內容類型由課綱條目（concept 與 points）判定，這是資料驅動的——
 * 課綱怎麼寫，就代表這個實驗要教什麼：
 *
 *   臨界條件   出現「至少／才能／否則／臨界／最小」→ 需要判定徽章，
 *              學生要知道現在這組設定是成功還是失敗
 *   因果方向   出現「決定／由…決定／反過來」→ 需要因果面板，
 *              學生錯的常是方向而不是算式
 *   方法流程   出現「先…再…／步驟／讀到／作圖求」→ 需要編號步驟，
 *              這類題目失分在流程不在概念
 *   多步計算   concept 提到兩個以上的中間量 → 需要衍生量卡，
 *              把解題過程攤開
 *   關鍵特例   出現「剛好／恰好／等於／時」→ 需要情境預設，
 *              讓學生一鍵跳到那個關鍵點
 *
 * 這支測試不會失敗（缺口是待辦不是錯誤），它輸出的是工作清單。
 */
require("./harness.js");
const { allIds } = require("./_lib.js");
const PL = window.PhysicsLab;
document.documentElement.getAttribute = () => "dark";

const C = window.PhysicsLabCurriculum;
function lesson(id) {
  for (const m of (C.modules || [])) {
    const e = (m.experiments || []).find(x => x.id === id);
    if (e) return e;
  }
  return null;
}

const RULES = [
  { key: "verdict", label: "判定徽章",
    re: /至少|才能|否則|臨界|最小|超過|不足|條件是|必須大於|門檻|恰好|剛好/,
    cls: "sim-verdict" },
  { key: "causality", label: "因果面板",
    re: /決定|由.{0,6}決定|反過來|方向|誰.{0,4}誰|正比於|反比於|不影響|與.{0,6}無關/,
    cls: "sim-causality-row" },
  { key: "procedure", label: "步驟教學",
    re: /先.{0,8}再|步驟|讀到|作圖|求出|記錄|量測.{0,4}次|流程|依序/,
    cls: "sim-procedure-card" },
  { key: "derived", label: "衍生量卡",
    re: /先.{0,10}算|中間|換算|代入|再求|兩個.{0,4}量|分別/,
    cls: "sim-derived-cell" },
  { key: "presets", label: "情境預設",
    re: /剛好|恰好|等於|特例|極端|零時|最大時|最小時/,
    cls: "sim-preset" }
];

const ids = allIds(PL);
const rows = [];
ids.forEach(id => {
  const info = lesson(id);
  if (!info) return;
  const text = (info.concept || "") + " " + (info.points || []).join(" ");
  const root = document.createElement("div"); root.dataset = { simId: id };
  let api;
  try { api = PL.get(id).build(root); } catch (e) { return; }
  const count = cls => {
    let n = 0;
    (function walk(x) { if (x.classList && x.classList.contains(cls)) n++; (x.children || []).forEach(walk); })(root);
    return n;
  };
  const need = [], have = [], gap = [];
  RULES.forEach(r => {
    const wants = r.re.test(text);
    const has = count(r.cls) > 0;
    if (wants) need.push(r.key);
    if (has) have.push(r.key);
    if (wants && !has) gap.push(r.label);
  });
  rows.push({ id, title: info.title || id, need, have, gap });
  if (api && api.stop) api.stop();
});

const withGap = rows.filter(r => r.gap.length);
console.log("盤點 " + rows.length + " 個實驗\n");
console.log("  完全符合內容需求      " + (rows.length - withGap.length));
console.log("  有缺口                " + withGap.length + "\n");

const byComp = {};
RULES.forEach(r => { byComp[r.label] = withGap.filter(x => x.gap.indexOf(r.label) >= 0).length; });
console.log("=== 各類缺口數量 ===");
Object.keys(byComp).forEach(k => console.log("  " + k.padEnd(10) + byComp[k]));

console.log("\n=== 缺口最多的 40 個 ===");
withGap.sort((a, b) => b.gap.length - a.gap.length).slice(0, 40).forEach(r =>
  console.log("  " + r.id.padEnd(30) + r.gap.join("、")));

// 給修補腳本用的機器可讀輸出
if (process.argv.indexOf("--json") >= 0) {
  require("fs").writeFileSync("/tmp/design-gaps.json", JSON.stringify(withGap, null, 1));
  console.log("\n已寫出 /tmp/design-gaps.json");
}
