/*
 * safe-test.js — 外部輸入的防線（js/safe.js）
 *
 * 這支守的是「網站不會因為一個壞掉的網址或存檔就整個開不起來」。
 * 2026-11 code review 實測到的五種空白頁，每一種都在這裡留一項：
 *
 *   index.html#%E0%A4%A                 → URIError，首頁與實驗頁都不畫
 *   index.html#constructor              → 查到 Object.prototype 上的東西，當成實驗用就壞
 *   localStorage pl-progress = 5        → new Set(5) 丟 TypeError，初始化中斷
 *   localStorage pl-study-plan = {}     → plan.schedule.flatMap 丟 TypeError
 *   匯入一份值不對的存檔                → 以上幾種會被「永久」寫進這台裝置
 *
 * 應用外殼（app.js）本身沒有 Node 測試（它需要真的瀏覽器），所以把會壞的判斷
 * 抽成沒有相依的小函式放在 safe.js，在這裡直接驗；整條流程另由
 * tools/shell-check.js 在瀏覽器裡跑（需要 Playwright，不在 run-all 之列）。
 */
"use strict";
const { reporter } = require("./_lib.js");
const S = require("../../js/safe.js");
const R = reporter();

function fakeStorage(seed) {
  const m = new Map(Object.entries(seed || {}));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    key: i => Array.from(m.keys())[i] || null,
    get length() { return m.size; }
  };
}

R.section("網址的 # 片段");
R.ok(S.hashId("#pendulum") === "pendulum", "一般 id");
R.ok(S.hashId("#%E5%96%AE%E6%93%BA") === "單擺", "百分比編碼照常解開");
R.ok(S.hashId("#%E0%A4%A") === "", "格式壞掉的編碼回空字串，不丟例外");
R.ok(S.hashId("#%") === "" && S.hashId("") === "" && S.hashId(null) === "", "空的、只有 % 的都安全");

R.section("以 id 查表");
{
  const byId = S.dict();
  byId.pendulum = 1;
  const bad = ["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf"].filter(k => byId[k] !== undefined);
  R.ok(bad.length === 0, "原型上的名字查不到東西", bad.join(", "));
  R.ok(byId.pendulum === 1, "自己放的查得到");
}

R.section("localStorage 的形狀不對時");
{
  const store = S.makeStore(() => fakeStorage({
    "pl-progress": "5", "pl-practice-done": "{\"a\":1}", "pl-ok": "[\"a\",\"b\",3]",
    "pl-answers": "[1,2]", "pl-broken": "{not json", "pl-null": "null"
  }));
  R.ok(Array.isArray(store.strings("pl-progress")) && store.strings("pl-progress").length === 0, "數字當成空陣列（new Set 不會丟例外）");
  R.ok(store.strings("pl-practice-done").length === 0, "物件當成空陣列");
  R.ok(store.strings("pl-ok").join() === "a,b", "陣列裡不是字串的項目濾掉");
  R.ok(Object.keys(store.object("pl-answers")).length === 0, "陣列不當成物件");
  R.ok(store.get("pl-broken", "d") === "d" && store.get("pl-null", "d") === "d" && store.get("pl-none", "d") === "d", "壞掉的 JSON、null、不存在都回預設值");
  let threw = false;
  try { new Set(store.strings("pl-progress")); } catch (e) { threw = true; }
  R.ok(!threw, "new Set(store.strings(…)) 一定成功");
}
{
  // Safari 封鎖儲存空間時，連讀取 localStorage 這個屬性都會丟例外
  const store = S.makeStore(() => { throw new Error("SecurityError"); });
  let threw = false, v;
  try { v = [store.get("k", 1), store.set("k", 2), store.strings("k").length, store.keys("pl-").length]; store.remove("k"); } catch (e) { threw = true; }
  R.ok(!threw && v[0] === 1 && v[1] === false && v[2] === 0 && v[3] === 0, "儲存空間不能用時全部安靜地退回預設值");
}
{
  const store = S.makeStore(() => fakeStorage({ "pl-a": "1", "other": "2", "pl-b": "3" }));
  R.ok(store.keys("pl-").sort().join() === "pl-a,pl-b", "keys(prefix) 只列出自己的鍵");
}

R.section("學習計劃");
{
  const known = id => id !== "gone";
  R.ok(S.cleanPlan({ days: 3 }, known) === null, "沒有 schedule 的當成沒有計劃");
  R.ok(S.cleanPlan("x", known) === null && S.cleanPlan(null, known) === null && S.cleanPlan([], known) === null, "不是物件的當成沒有計劃");
  R.ok(S.cleanPlan({ startDate: "昨天", schedule: [{ ids: ["a"] }] }, known) === null, "日期格式不對的當成沒有計劃");
  const p = S.cleanPlan({
    startDate: "2026-11-13", days: 9999, minutes: "30",
    schedule: [{ day: 1, ids: ["a", "gone", 7] }, null, { ids: "abc" }]
  }, known);
  R.ok(!!p && p.schedule.length === 3, "壞掉的那幾天留著位置（天數不能位移）");
  R.ok(p.schedule[0].ids.join() === "a" && p.schedule[1].ids.length === 0 && p.schedule[2].ids.length === 0, "已下架或不是字串的 id 濾掉");
  R.ok(p.days === 366 && p.minutes === 35 && p.totalTasks === 1, "天數、分鐘、總數都夾回合理範圍", p.days + " / " + p.minutes + " / " + p.totalTasks);
  let threw = false;
  try { p.schedule.flatMap(d => d.ids); } catch (e) { threw = true; }
  R.ok(!threw, "清過的計劃可以直接 flatMap");
}

R.section("匯入存檔逐筆檢查");
{
  const good = [
    ["pl-progress", "[\"pendulum\"]"], ["pl-practice-done", "[]"], ["pl-practice-answers", "{\"pendulum-q0\":1}"],
    ["pl-theme", "\"dark\""], ["pl-seed", "12345"], ["pl-demo-mode", "1"], ["pl-reflection-pendulum", "\"擺長越長週期越長\""],
    ["pl-checkpoint-shm", "{\"score\":2,\"total\":3}"], ["pl-record-pendulum", "[]"], ["pl-last-viewed", "\"pendulum\""],
    ["pl-study-plan", JSON.stringify({ startDate: "2026-11-13", days: 1, minutes: 30, schedule: [{ day: 1, ids: ["pendulum"] }] })]
  ];
  const rejected = good.filter(([k, v]) => !S.saveEntryOk(k, v)).map(x => x[0]);
  R.ok(rejected.length === 0, "正常的存檔 " + good.length + " 筆全部放行", rejected.join(", "));

  const bad = [
    ["pl-progress", "5"], ["pl-progress", "[1,2]"], ["pl-practice-done", "\"x\""], ["pl-practice-answers", "[]"],
    ["pl-study-plan", "{\"days\":3}"], ["pl-theme", "\"pink\""], ["pl-seed", "\"abc\""], ["pl-demo-mode", "yes"],
    ["pl-reflection-x", "{}"], ["pl-anything", "{oops"], ["other-key", "1"], ["pl-", "1"],
    ["pl-<img src=x>", "1"], ["pl-big", "\"" + "x".repeat(600 * 1024) + "\""], ["pl-progress", 5]
  ];
  const leaked = bad.filter(([k, v]) => S.saveEntryOk(k, v)).map(x => x[0] + "=" + String(x[1]).slice(0, 12));
  R.ok(leaked.length === 0, "會讓網站開不起來的 " + bad.length + " 筆全部擋下", leaked.join(" | "));
}

R.done();
