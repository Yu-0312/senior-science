/*
 * safe.js — 外部輸入的防線（網址、localStorage、匯入的存檔）
 *
 * 由來（2026-11 code review）：應用外殼把三種「不是自己寫的資料」直接拿來用，
 * 任何一種壞掉都會讓整個網站停在空白頁，而且使用者沒有任何辦法自救：
 *
 *   1. 網址的 #實驗 id：decodeURIComponent("%E0%A4%A") 會丟 URIError，
 *      而且發生在初始化之前，首頁與實驗頁都不會畫出來。
 *   2. 以 id 查一般物件：byId["constructor"] 查到的是 Object 本身，不是 undefined，
 *      後面當成實驗使用就壞了。
 *   3. localStorage：new Set(5)、plan.schedule.flatMap 這類寫法假設存檔的形狀永遠正確；
 *      匯入一份壞掉的存檔（或別的分頁寫壞）之後，每次開站都在同一行丟例外。
 *
 * 這支把三件事各包成一個小函式，app.js、duo.js 共用，也讓 Node 測試可以直接驗
 * （tools/tests/safe-test.js）。不碰 DOM、沒有相依。
 */
(function (root) {
  "use strict";

  /* 沒有原型的查表物件：dict()["constructor"] 是 undefined */
  function dict() { return Object.create(null); }

  /* 網址 # 後面的 id；格式壞掉就當成沒有 */
  function hashId(hash) {
    const raw = String(hash == null ? "" : hash).replace(/^#/, "");
    if (!raw) return "";
    try { return decodeURIComponent(raw); } catch (e) { return ""; }
  }

  const isPlain = v => !!v && typeof v === "object" && !Array.isArray(v);

  /*
   * 包住一個 Storage。傳函式而不是物件：Safari 封鎖儲存空間時，
   * 光是「讀取 window.localStorage」就會丟 SecurityError，所以每次用到才取。
   */
  function makeStore(getStorage) {
    const raw = k => { try { return getStorage().getItem(k); } catch (e) { return null; } };
    const store = {
      raw,
      get(k, d) {
        const text = raw(k);
        if (text == null) return d;
        try { const v = JSON.parse(text); return v == null ? d : v; } catch (e) { return d; }
      },
      set(k, v) { try { getStorage().setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
      setRaw(k, text) { try { getStorage().setItem(k, String(text)); return true; } catch (e) { return false; } },
      remove(k) { try { getStorage().removeItem(k); } catch (e) {} },
      keys(prefix) {
        const out = [];
        try {
          const s = getStorage();
          for (let i = 0; i < s.length; i += 1) {
            const key = s.key(i);
            if (key && (!prefix || key.indexOf(prefix) === 0)) out.push(key);
          }
        } catch (e) {}
        return out;
      },
      /* 一定回傳「字串陣列」：存檔被寫成數字、物件時回空陣列，而不是讓 new Set() 丟例外 */
      strings(k) {
        const v = store.get(k, []);
        return Array.isArray(v) ? v.filter(x => typeof x === "string") : [];
      },
      /* 一定回傳一般物件 */
      object(k) {
        const v = store.get(k, null);
        return isPlain(v) ? v : {};
      }
    };
    return store;
  }

  /*
   * 學習計劃：形狀不對就當成沒有計劃，欄位超出範圍就夾回去。
   * knownId(id) 用來濾掉已經下架的實驗（改版後 id 可能消失）。
   */
  function cleanPlan(plan, knownId) {
    if (!isPlain(plan) || !Array.isArray(plan.schedule) || !plan.schedule.length) return null;
    if (typeof plan.startDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(plan.startDate)) return null;
    const num = (v, lo, hi, d) => (typeof v === "number" && isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d);
    const schedule = plan.schedule.slice(0, 366).map((day, i) => ({
      day: i + 1,
      ids: (isPlain(day) && Array.isArray(day.ids) ? day.ids : [])
        .filter(id => typeof id === "string" && (!knownId || knownId(id)))
    }));
    const totalTasks = schedule.reduce((n, day) => n + day.ids.length, 0);
    return {
      version: 1,
      createdAt: typeof plan.createdAt === "string" ? plan.createdAt : "",
      startDate: plan.startDate,
      days: num(plan.days, 1, 366, schedule.length),
      minutes: num(plan.minutes, 10, 180, 35),
      totalTasks,
      schedule
    };
  }

  /*
   * 匯入存檔時逐筆檢查：回傳 true 才寫進 localStorage。
   * 值是「localStorage 裡的原始字串」（多半是 JSON 文字）。
   */
  const MAX_VALUE = 512 * 1024;
  function saveEntryOk(key, value) {
    if (typeof key !== "string" || !/^pl-[A-Za-z0-9_.:-]{1,80}$/.test(key)) return false;
    if (typeof value !== "string" || value.length > MAX_VALUE) return false;
    if (key === "pl-demo-mode") return value === "0" || value === "1";   // 這一筆存的是原始字串
    let v;
    try { v = JSON.parse(value); } catch (e) { return false; }
    const strings = a => Array.isArray(a) && a.every(x => typeof x === "string");
    if (key === "pl-progress" || key === "pl-practice-done") return strings(v);
    if (key === "pl-practice-answers") return isPlain(v);
    if (key === "pl-study-plan") return !!cleanPlan(v);
    if (key === "pl-theme") return v === "light" || v === "dark";
    if (key === "pl-seed") return typeof v === "number" && isFinite(v);
    if (key === "pl-last-viewed") return typeof v === "string";
    if (key.indexOf("pl-reflection-") === 0) return typeof v === "string";
    if (key.indexOf("pl-checkpoint-") === 0) return v === null || isPlain(v);
    return true;   // 其他鍵只要求是合法 JSON；讀的那一端各自有預設值
  }

  const api = { dict, hashId, isPlain, makeStore, cleanPlan, saveEntryOk };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.PhysicsLabSafe = api;
})(typeof window !== "undefined" ? window : null);
