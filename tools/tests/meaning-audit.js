/*
 * meaning-audit.js — 每一根滑桿都必須讓畫面產生看得見的變化
 *
 * 使用者的原話：「不要讓學生看起來像是在看不知名動畫」
 * 「不要出現一些球在旁邊不知道意義為何的動」。這件事可以量化。
 *
 * 判準：把同一根滑桿設到最小／中間／最大各建一個實例，同步步進，
 * 一發現圖形不同就收工。圖形完全一樣，那根滑桿對學生就是沒有作用的
 * ——不管讀數的數字變了多少。
 *
 * 這支測試自己踩過的坑（全部寫在這裡，避免重蹈）：
 *
 *  1. 只 hook PL.draw.*       → 用原生 ctx.lineTo() 畫波形的實驗完全錄不到
 *  2. 文字與圖形混在一起算    → 變的只是標籤上的數字，畫面其實沒動
 *  3. 只在 t=0 量             → 全站「進場不自動播放」，按下播放前本來就靜止
 *  4. 迴圈未播放時直接 return  → 兩組錄影都是空的，被判成「完全不變」
 *  5. 加總型雜湊              → 對「對調」是盲的（兩支力箭頭互換方向會湊出同值）
 *  6. 只比 min 與 max         → 相位 0° 與 360°、夾角 0° 與 180° 是同一個狀態
 *  7. 每次都跑滿 40 影格      → 六萬多影格，慢到不能用；改成一發現差異就收工
 *  8. 每次建置都註冊掛鉤      → 累積五千多個掛鉤各自抓著一棵 DOM 樹，
 *                               既是 O(n²) 也是記憶體洩漏。加入自動生成的教學元件、
 *                               每棵樹變大之後直接把 Node 撐爆
 *                               （FatalProcessOutOfMemory）。掛鉤只能註冊一次。
 */
require("./harness.js");
const { reporter, allIds, makeRecorder, hashFrame } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
const rec = makeRecorder();

document.documentElement.getAttribute = () => "dark";

/* 這裡的「沒有關係」本身就是要教的結論：
   法拉第籠的殼內場強恆為零，不管外加場多強、殼多厚。
   一條貼在零的水平線正是重點，不是畫錯。 */
const FLAT_OK = new Set(["electrostatic-shield"]);

/*
 * 引擎的 onBuilt 沒有提供取消註冊，所以測試這端只能註冊一次，
 * 用一個共用變數接住「最近一次建置的脈絡」。
 */
let LAST = null;
PL._hooks.onBuilt(c => { LAST = c; });

function makeInstance(id, label, value) {
  LAST = null;
  const root = document.createElement("div");
  root.dataset = { simId: id };
  let api;
  try { api = PL.get(id).build(root); } catch (e) { return null; }
  const ctx = LAST;
  if (!ctx || ctx.id !== id) { if (api && api.stop) api.stop(); return null; }
  (ctx.canvases || []).forEach(c => rec.instrument(c && c.ctx));
  if (label != null) {
    const sl = (ctx.sliders || []).find(x => x.label === label);
    if (sl) { try { sl.write(value); } catch (e) {} }
  }
  return { api, ctx, loop: (ctx.loops || [])[0] };
}

function frameOf(inst) {
  const f = rec.capture(() => { if (inst.loop && inst.loop.stepOnce) inst.loop.stepOnce(1 / 20); });
  // 迴圈在未播放時可能一筆都不畫，這時補一次 rerender 才拿得到畫面內容
  const use = f.length ? f : rec.capture(() => { if (inst.api.rerender) inst.api.rerender(); });
  return hashFrame(use).split("/")[0];      // 只取圖形部分，不含文字
}

/*
 * 三個取值同步步進，一發現差異就收工。
 * 絕大多數滑桿在前幾影格就看得出差別，跑滿純粹是浪費；
 * 真正需要跑滿的只有「完全沒有差別」的那些——而那正是要回報的對象。
 */
function sliderHasEffect(id, label, lo, mid, hi, maxFrames) {
  const insts = [makeInstance(id, label, lo), makeInstance(id, label, mid), makeInstance(id, label, hi)];
  const stop = () => insts.forEach(x => {
    if (x && x.api && x.api.stop) { try { x.api.stop(); } catch (e) {} }
  });
  if (insts.some(x => !x)) { stop(); return true; }
  let effect = false;
  for (let i = 0; i < maxFrames && !effect; i++) {
    const a = frameOf(insts[0]), b = frameOf(insts[1]), c = frameOf(insts[2]);
    if (a !== b || b !== c || a !== c) effect = true;
  }
  stop();
  return effect;
}

const ids = allIds(PL);
const dead = [], partial = [];
let good = 0, checked = 0;

ids.forEach(id => {
  LAST = null;
  const probe = document.createElement("div");
  probe.dataset = { simId: id };
  let api;
  try { api = PL.get(id).build(probe); } catch (e) { return; }
  const ctx = LAST;
  if (!ctx || ctx.id !== id) { if (api && api.stop) api.stop(); return; }
  const metas = (ctx.sliders || []).map(s => ({ label: s.label, min: s.min, max: s.max }));
  if (api && api.stop) api.stop();
  if (!metas.length) return;
  checked += 1;

  const inert = [];
  metas.forEach(s => {
    const mid = (s.min + s.max) / 2;
    if (!sliderHasEffect(id, s.label, s.min, mid, s.max, 40) && !FLAT_OK.has(id)) {
      inert.push(s.label);
    }
  });
  if (inert.length === metas.length) dead.push({ id, labels: metas.map(m => m.label) });
  else if (inert.length) partial.push({ id, inert, total: metas.length });
  else good += 1;
});

R.section("盤點 " + checked + " 個有滑桿的實驗（比圖形，不算標籤數字）");
console.log("  每根滑桿都會改變畫面      " + good);
console.log("  部分滑桿是擺設            " + partial.length);
console.log("  拉任何滑桿畫面都不變      " + dead.length + "\n");

R.ok(dead.length === 0, "沒有「拉任何滑桿都不變」的實驗",
  dead.map(r => r.id + "（" + r.labels.join("、") + "）").slice(0, 6).join("\n      "));
R.ok(partial.length === 0, "沒有擺設滑桿",
  partial.sort((a, b) => b.inert.length - a.inert.length).slice(0, 10)
    .map(r => r.id + "  " + r.inert.length + "/" + r.total + " 根無作用：" + r.inert.join("、"))
    .join("\n      "));

R.done();
