/*
 * metrology-test.js — 量具讀數實驗
 *
 * 這一個實驗的正確性標準跟其他實驗不同：它教的是「讀數規則」本身，
 * 所以規則錯了就是教錯，比物理量算差幾個百分比嚴重得多。
 * 因此這裡逐條斷言讀數規則，而不只是檢查有沒有畫出東西。
 *
 * 規則來源（課本與學測命題慣例）：
 *   游標卡尺  n 格 = 主尺 n−1 mm → 分度值 1/n mm；讀到分度值為止，不估讀
 *   螺旋測微器 螺距 0.5 mm、圓周 50 格 → 一格 0.01 mm；必須估讀一位
 */
require("./harness.js");
const PL = window.PhysicsLab;

let pass = 0, fail = 0;
const ok = (c, n, d) => { c ? pass++ : fail++; console.log((c ? "  ✓ " : "  ✗ ") + n + (d ? "  " + d : "")); };

let ctx = null;
PL._hooks.onBuilt(c => { if (c.id === "vernier-micrometer") ctx = c; });

function build() {
  ctx = null;
  const root = document.createElement("div");
  root.dataset = { simId: "vernier-micrometer" };
  const api = PL.get("vernier-micrometer").build(root);
  return { api, root, ctx };
}
function readOut(c, label) {
  const r = (c.readouts || []).find(x => x.label === label);
  return r ? r.value : null;
}
function readNum(c, label) {
  const r = (c.readouts || []).find(x => x.label === label);
  return r ? r.number : null;
}
function slider(c, label) { return (c.sliders || []).find(x => x.label === label); }
function findButton(node, text) {
  if (node.tagName === "BUTTON" && String(node.textContent).indexOf(text) >= 0) return node;
  for (const ch of (node.children || [])) { const f = findButton(ch, text); if (f) return f; }
  return null;
}
function findChip(node, text) {
  const all = [];
  (function walk(n) { all.push(n); (n.children || []).forEach(walk); })(node);
  return all.find(n => n.tagName === "BUTTON" && String(n.textContent).trim() === text) || null;
}

console.log("=== 建置 ===");
let B = build();
ok(!!B.ctx, "取得建置脈絡");
ok((B.ctx.readouts || []).length === 4, "四個讀數欄位",
  (B.ctx.readouts || []).map(r => r.label).join(" / "));

const sV = slider(B.ctx, "拖動改變讀數");
ok(!!sV, "找到讀數滑桿");

console.log("\n=== 游標卡尺：50 分度（分度值 0.02 mm）===");
function setAndRead(v) { sV.write(v); if (B.api.rerender) B.api.rerender(); }

setAndRead(81.32);
ok(readOut(B.ctx, "讀數") === "81.32", "81.32 讀成 81.32", "得到 " + readOut(B.ctx, "讀數"));
ok(readNum(B.ctx, "主尺 M") === 81, "主尺 M = 81", "得到 " + readNum(B.ctx, "主尺 M"));
ok(readNum(B.ctx, "對齊格 k") === 16, "對齊格 k = 16（0.32 ÷ 0.02）", "得到 " + readNum(B.ctx, "對齊格 k"));
ok(Math.abs(readNum(B.ctx, "k × 精度") - 0.32) < 1e-9, "k × 精度 = 0.32");

console.log("\n  M + k×精度 必須等於讀數（隨機抽驗 200 個位置）");
let bad = [];
for (let i = 0; i < 200; i++) {
  const v = Math.round((2 + Math.random() * 140) / 0.02) * 0.02;
  setAndRead(v);
  const M = readNum(B.ctx, "主尺 M");
  const k = readNum(B.ctx, "對齊格 k");
  const read = Number(readOut(B.ctx, "讀數"));
  if (Math.abs(M + k * 0.02 - read) > 1e-6) bad.push(v + " → M=" + M + " k=" + k + " 讀=" + read);
  if (k < 0 || k > 49) bad.push(v + " → k 超出 0..49：" + k);
  if ((readOut(B.ctx, "讀數").split(".")[1] || "").length !== 2) bad.push(v + " → 小數位數不是 2");
}
ok(bad.length === 0, "200 個位置全部自洽", bad.slice(0, 3).join(" ; "));

console.log("\n=== 換分度：精度是量具給的，不是算出來的 ===");
[["10 分度", 0.1, 1], ["20 分度", 0.05, 2], ["50 分度", 0.02, 2]].forEach(([label, prec, digits]) => {
  const chip = findChip(B.root, label);
  if (!chip) { ok(false, "找得到「" + label + "」"); return; }
  chip.dispatch("click", {});
  setAndRead(42 + prec * 7);
  const read = readOut(B.ctx, "讀數");
  const dec = (read.split(".")[1] || "").length;
  const k = readNum(B.ctx, "對齊格 k");
  ok(dec === digits && k === 7,
    label + "：小數 " + digits + " 位、k = 7", "讀數 " + read + "，k = " + k);
});

console.log("\n=== 螺旋測微器：一格 0.01 mm、必須估讀 ===");
const micChip = findChip(B.root, "螺旋測微器");
ok(!!micChip, "找得到量具切換");
micChip.dispatch("click", {});
setAndRead(6.721);
ok(readOut(B.ctx, "讀數") === "6.721", "6.721 讀成 6.721（三位小數）", "得到 " + readOut(B.ctx, "讀數"));
ok(Math.abs(readNum(B.ctx, "主尺 M") - 6.5) < 1e-9, "套管讀數 6.5 mm（半毫米線已露出）",
  "得到 " + readNum(B.ctx, "主尺 M"));
ok(Math.abs(readNum(B.ctx, "k × 精度") - 0.221) < 1e-6, "微分筒 22.1 格 × 0.01 = 0.221 mm");

console.log("\n  套管必為 0.5 的整數倍、微分筒落在 0..50（隨機抽驗 200 次）");
bad = [];
for (let i = 0; i < 200; i++) {
  const v = Math.round((0.5 + Math.random() * 24) * 1000) / 1000;
  setAndRead(v);
  const sleeve = readNum(B.ctx, "主尺 M");
  const fine = readNum(B.ctx, "k × 精度");
  const read = Number(readOut(B.ctx, "讀數"));
  if (Math.abs(sleeve / 0.5 - Math.round(sleeve / 0.5)) > 1e-9) bad.push(v + " → 套管非 0.5 倍數：" + sleeve);
  if (fine < -1e-9 || fine > 0.5 + 1e-9) bad.push(v + " → 微分筒超出 0..0.5：" + fine);
  if (Math.abs(sleeve + fine - read) > 1e-6) bad.push(v + " → 相加不符：" + sleeve + "+" + fine + "≠" + read);
  if ((readOut(B.ctx, "讀數").split(".")[1] || "").length !== 3) bad.push(v + " → 不是三位小數");
}
ok(bad.length === 0, "200 個位置全部自洽", bad.slice(0, 3).join(" ; "));

console.log("\n=== 半毫米陷阱：6.4 與 6.6 的套管讀數必須不同 ===");
setAndRead(6.4);
const s64 = readNum(B.ctx, "主尺 M");
setAndRead(6.6);
const s66 = readNum(B.ctx, "主尺 M");
ok(s64 === 6.0 && s66 === 6.5,
  "6.4 → 套管 6.0；6.6 → 套管 6.5（半毫米線露出）", "得到 " + s64 + " / " + s66);

console.log("\n=== 練習模式：答案必須被蓋住 ===");
B = build();
const practiceChip = findChip(B.root, "讀數練習");
ok(!!practiceChip, "找得到模式切換");
practiceChip.dispatch("click", {});
ok(readOut(B.ctx, "讀數") === "？？", "未作答時讀數被蓋住", "得到 " + readOut(B.ctx, "讀數"));
ok(readOut(B.ctx, "主尺 M") === "？", "主尺也被蓋住");

const learnChip = findChip(B.root, "認識量具");
learnChip.dispatch("click", {});
ok(readOut(B.ctx, "讀數") !== "？？", "切回認識量具後答案出現");

console.log("\n=== 引擎新元件在這個實驗裡都有被用到 ===");
function countClass(node, cls) {
  let n = 0;
  (function walk(x) { if (x.classList && x.classList.contains(cls)) n++; (x.children || []).forEach(walk); })(node);
  return n;
}
[["sim-verdict", "判定徽章"], ["sim-derived", "衍生量卡"], ["sim-presets", "情境預設"],
 ["sim-magnifier", "放大窗"], ["sim-procedure-card", "步驟教學"], ["sim-rule", "鐵律警示"]]
  .forEach(([cls, name]) => ok(countClass(B.root, cls) > 0, name + " 已使用"));

if (B.api && B.api.stop) B.api.stop();
console.log("\n通過 " + pass + " 項，失敗 " + fail + " 項");
process.exit(fail ? 1 : 0);
