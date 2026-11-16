/*
 * lifecycle-test.js — 離開實驗、或在同一個 root 上重建之後，不能留下監聽器、計時器、觀察器
 *
 * 引擎和各個附加模組（觀察提問、教學判定、版面平衡、畫布）都會在 root 上掛東西。
 * 以前它們假設「root 被丟掉就自然消失」，用 root.isConnected 判斷自己過期了沒；
 * 但主站的 #sim-root 一直連在頁面上，於是每開一個實驗就多留一組：
 * 瀏覽器實測連開 30 個實驗，每一輪多 8,800 個節點、1,900 個監聽器，舊實驗的輪詢還在跑。
 *
 * 現在的保證是：每次建置一個 AbortController（context.signal / context.dispose），
 * api.stop() 時中止；同一個 root 再建一次時，先中止上一次的。
 * 這支測試鎖住這個保證，避免日後有人直接在 root 上 addEventListener、
 * 或開了 setInterval／ResizeObserver 卻沒有登記收尾。
 */
const { ROOT } = require("./harness.js");
const fs = require("fs"), path = require("path"), vm = require("vm");
const { reporter, allIds } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();

/* ---- 計數用的替身：活著的 setInterval 與 ResizeObserver ---- */
const liveIntervals = new Set();
const realSetInterval = global.setInterval, realClearInterval = global.clearInterval;
global.setInterval = window.setInterval = function (fn, ms) {
  const id = realSetInterval(fn, ms);
  liveIntervals.add(id);
  return id;
};
global.clearInterval = window.clearInterval = function (id) { liveIntervals.delete(id); return realClearInterval(id); };

const liveObservers = new Set();
class CountingResizeObserver {
  constructor(cb) { this._cb = cb; }
  observe() { liveObservers.add(this); }
  unobserve() {}
  disconnect() { liveObservers.delete(this); }
}
global.ResizeObserver = window.ResizeObserver = CountingResizeObserver;

let LAST = null;
PL._hooks.onBuilt(c => { LAST = c; });

const listeners = root => Object.keys(root._listeners || {}).reduce((n, t) => n + root._listeners[t].length, 0);
// isConnected = true：和正式站一樣「root 一直連在頁面上」，觀察提問那些輪詢才會真的開起來
const makeRoot = id => { const r = document.createElement("div"); r.dataset = { simId: id }; r.isConnected = true; return r; };
const ids = allIds(PL);
const list = a => a.slice(0, 6).join("、") + (a.length > 6 ? " …等 " + a.length + " 個" : "");

R.section("api.stop 之後：signal 中止，root 上沒有監聽器，計時器與觀察器全部收掉");
{
  const bad = { signal: [], listeners: [], intervals: [], observers: [], loops: [] };
  ids.forEach(id => {
    const i0 = liveIntervals.size, o0 = liveObservers.size;
    const root = makeRoot(id);
    const api = PL.get(id).build(root);
    const ctx = LAST;
    const ac = root._plAbort;
    if (!ac || ac.signal.aborted || !ctx || ctx.signal !== ac.signal) bad.signal.push(id);
    if (api && typeof api.stop === "function") api.stop();
    if (!ac || !ac.signal.aborted) bad.signal.push(id);
    if (listeners(root) !== 0) bad.listeners.push(id + "(" + listeners(root) + ")");
    if (liveIntervals.size !== i0) bad.intervals.push(id + "(+" + (liveIntervals.size - i0) + ")");
    if (liveObservers.size !== o0) bad.observers.push(id + "(+" + (liveObservers.size - o0) + ")");
    if (ctx && ctx.loops.some(l => l.running)) bad.loops.push(id);
    // 沒收乾淨的不要拖累後面的實驗
    liveIntervals.forEach(t => { if (liveIntervals.size > i0) global.clearInterval(t); });
  });
  R.ok(!bad.signal.length, ids.length + " 個實驗：建置後 signal 存活，stop 後已中止", list(bad.signal));
  R.ok(!bad.listeners.length, "stop 後 root 上沒有殘留的監聽器", list(bad.listeners));
  R.ok(!bad.intervals.length, "stop 後沒有還在跑的 setInterval", list(bad.intervals));
  R.ok(!bad.observers.length, "stop 後 ResizeObserver 全部 disconnect", list(bad.observers));
  R.ok(!bad.loops.length, "stop 後動畫迴圈都停了", list(bad.loops));
}

R.section("同一個 root 連建 4 次（不呼叫 stop）：監聽器、計時器、觀察器不累積");
{
  // 「載入失敗後按重試」「建到一半丟例外」走的就是這條路：沒有人會呼叫舊的 api.stop
  const bad = { listeners: [], intervals: [], observers: [], prev: [] };
  ids.filter((_, i) => i % 3 === 0).forEach(id => {
    const i0 = liveIntervals.size, o0 = liveObservers.size;
    const root = makeRoot(id);
    const sizes = [];
    let prevSignal = null;
    for (let i = 0; i < 4; i++) {
      PL.get(id).build(root);
      if (prevSignal && !prevSignal.aborted) bad.prev.push(id);
      prevSignal = root._plAbort && root._plAbort.signal;
      sizes.push([listeners(root), liveIntervals.size - i0, liveObservers.size - o0]);
    }
    const first = sizes[0], last = sizes[3];
    if (last[0] > first[0]) bad.listeners.push(id + "(" + sizes.map(s => s[0]).join("→") + ")");
    if (last[1] > first[1]) bad.intervals.push(id + "(" + sizes.map(s => s[1]).join("→") + ")");
    if (last[2] > first[2]) bad.observers.push(id + "(" + sizes.map(s => s[2]).join("→") + ")");
    if (root._plAbort) root._plAbort.abort();
  });
  R.ok(!bad.prev.length, "重建時上一次建置的 signal 已中止", list(bad.prev));
  R.ok(!bad.listeners.length, "root 監聽器沒有越建越多", list(bad.listeners));
  R.ok(!bad.intervals.length, "setInterval 沒有越建越多", list(bad.intervals));
  R.ok(!bad.observers.length, "ResizeObserver 沒有越建越多", list(bad.observers));
}

R.section("重建時清掉上一個實驗留在 root 上的旗標");
{
  const root = makeRoot(ids[0]);
  PL.get(ids[0]).build(root);
  root.dataset.labNoBrief = "1"; root.dataset.labNoProcedure = "1";
  root.classList.add("show-procedure"); root.classList.add("is-ambient");
  PL.get(ids[1]).build(root);
  R.ok(root.dataset.labNoBrief === undefined && root.dataset.labNoProcedure === undefined, "data-lab-no-brief／no-procedure 不會沿用到下一個實驗");
  R.ok(!root.classList.contains("show-procedure") && !root.classList.contains("is-ambient"), "show-procedure／is-ambient 不會沿用到下一個實驗");
  R.ok(root.dataset.simId === ids[1], "data-sim-id 是新的實驗", root.dataset.simId);
  if (root._plAbort) root._plAbort.abort();
}

R.section("過期的建置不再動畫面（記錄表晚到的計時器）");
(async () => {
  // sim-record 在建置後等讀數就緒才插入記錄表，最多重試 2.4 秒；這段時間內換了實驗就不該再插
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, "js/sim-record.js"), "utf8"), { filename: "js/sim-record.js" });
  const count = (node, cls) => (node.classList && node.classList.contains(cls) ? 1 : 0) + (node.children || []).reduce((n, k) => n + count(k, cls), 0);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // 挑兩個建得出記錄表的實驗
  const usable = [];
  for (const id of ids) {
    if (usable.length >= 2) break;
    const root = makeRoot(id);
    const api = PL.get(id).build(root);
    if (window.flushFrames) window.flushFrames(2);
    await wait(20);
    if (count(root, "sim-record") === 1) usable.push(id);
    if (api && api.stop) api.stop();
  }
  R.ok(usable.length === 2, "找得到兩個有記錄表的實驗", usable.join("、"));
  if (usable.length === 2) {
    const root = makeRoot(usable[0]);
    PL.get(usable[0]).build(root);          // 記錄表排在下一個計時器
    PL.get(usable[1]).build(root);          // 還沒插入就換成別的實驗
    if (window.flushFrames) window.flushFrames(2);
    await wait(60);
    R.ok(count(root, "sim-record") === 1, "同一個 root 換實驗後只有一張記錄表（舊實驗的不會晚到）", String(count(root, "sim-record")));
    const a = makeRoot(usable[0]);
    const api = PL.get(usable[0]).build(a);
    if (api && api.stop) api.stop();        // 還沒插入就離開
    await wait(60);
    R.ok(count(a, "sim-record") === 0, "離開實驗後，晚到的計時器不會再把記錄表插進去", String(count(a, "sim-record")));
    if (root._plAbort) root._plAbort.abort();
  }
  R.done();
})();
