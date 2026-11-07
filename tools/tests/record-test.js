/*
 * record-test.js — 實驗記錄表（sim-record.js）
 *
 * 「記一行」存下的必須是當下真的看到的參數與讀數；點一列要把滑桿還原回去，
 * 讀數也要跟著回到那一列的值（否則「保存參數」只是把數字搬回滑桿，畫面沒有跟上）。
 * 實驗改版、欄位不同時，舊紀錄必須作廢，不能錯欄顯示。
 *
 * sim-record 不放進 harness 的預設載入清單：它在每次建置後排計時器，
 * meaning-audit 這類要建置上千次的稽核會被拖慢。這裡自己載入。
 */
const { ROOT } = require("./harness.js");
const fs = require("fs"), path = require("path"), vm = require("vm");
const { reporter, allIds } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();

vm.runInThisContext(fs.readFileSync(path.join(ROOT, "js/sim-record.js"), "utf8"), { filename: "js/sim-record.js" });

let LAST = null;
PL._hooks.onBuilt(c => { LAST = c; });
const wait = ms => new Promise(r => setTimeout(r, ms));
const find = (node, cls) => {
  if (!node) return null;
  if (node.classList && node.classList.contains(cls)) return node;
  for (const k of node.children || []) { const f = find(k, cls); if (f) return f; }
  return null;
};
const all = (node, tag, out = []) => {
  if (!node) return out;
  if (node.tagName === tag) out.push(node);
  (node.children || []).forEach(k => all(k, tag, out));
  return out;
};
const click = b => (b._listeners && b._listeners.click || []).forEach(f => f({ preventDefault() {} }));

(async () => {
  // 挑一個有滑桿、也有數值讀數的實驗
  let pick = null;
  for (const id of allIds(PL)) {
    const root = document.createElement("div");
    root.dataset = { simId: id };
    root.isConnected = true;
    PL.get(id).build(root);
    if (window.flushFrames) window.flushFrames(2);
    const c = LAST;
    if (c && c.sliders.length && c.readouts.some(r => r.number != null)) {
      const s = c.sliders[0];
      const before = c.readouts.filter(r => r.number != null).map(r => r.number);
      s.write(s.max); if (window.flushFrames) window.flushFrames(2);
      const after = c.readouts.filter(r => r.number != null).map(r => r.number);
      s.write(s.initial); if (window.flushFrames) window.flushFrames(2);
      if (before.join() !== after.join()) { pick = { id, root, c }; break; }
    }
  }
  R.section("建立記錄表");
  R.ok(!!pick, "找得到可測的實驗（有滑桿、讀數會隨滑桿改變）", pick && pick.id);
  if (!pick) return R.done();
  await wait(50);
  const panel = find(pick.root, "sim-record");
  R.ok(!!panel, pick.id + "：讀數就緒後出現記錄表");
  if (!panel) return R.done();
  const btns = all(panel, "BUTTON");
  const byText = t => btns.find(b => b.textContent === t);
  R.ok(!!(byText("記一行") && byText("刪最後一列") && byText("清空") && byText("CSV")), "有記一行／刪最後一列／清空／CSV 四個按鈕");
  R.ok(byText("CSV").disabled === true, "還沒有資料時 CSV、清空不能按");

  R.section("記一行與套用");
  const c = pick.c, s = c.sliders[0];
  const nums = () => c.readouts.filter(r => r.number != null).map(r => r.number);
  s.write(s.min); window.flushFrames && window.flushFrames(2);
  const rowA = nums().slice(0, 3);
  click(byText("記一行"));
  s.write(s.max); window.flushFrames && window.flushFrames(2);
  click(byText("記一行"));
  const trs = all(panel, "TBODY")[0];
  const rows = all(trs, "TR");
  R.ok(rows.length === 2, "記了兩列", rows.length + " 列");
  R.ok(byText("CSV").disabled === false, "有資料後可以下載 CSV");
  const cells = all(rows[0], "TD").map(td => td.textContent);
  R.ok(cells[0] === "1", "第一欄是列號");
  click(rows[0]);
  window.flushFrames && window.flushFrames(2);
  R.ok(s.read() === s.min, "點第一列：滑桿回到記錄時的值", s.read() + " vs " + s.min);
  R.ok(nums().slice(0, 3).join() === rowA.join(), "點第一列：讀數也回到那一列的值", nums().slice(0, 3).join() + " vs " + rowA.join());

  R.section("讀數算不出來（—）時");
  // isFinite(null) 是 true：以前 null 會被當成數字交給 fmt，整頁報錯
  const numeric = c.readouts.filter(r => r.number != null)[0];
  numeric.number = null;
  let threw = null;
  try { click(byText("記一行")); } catch (e) { threw = e; }
  const lastCells = all(all(all(panel, "TBODY")[0], "TR").slice(-1)[0], "TD").map(td => td.textContent);
  R.ok(!threw, "讀數為 null 時記一行不報錯", threw && threw.message);
  R.ok(lastCells.indexOf("—") >= 0, "算不出來的讀數記成「—」", lastCells.join(" "));
  click(byText("刪最後一列"));

  R.section("保存與欄位變更");
  const key = "pl-record-" + pick.id;
  const saved = JSON.parse(localStorage.getItem(key) || "[]");
  R.ok(saved.length === 2 && saved.every(r => r.sig), "存進 localStorage，每列帶欄位簽章", saved.length + " 列");
  localStorage.setItem(key, JSON.stringify(saved.map(r => Object.assign({}, r, { sig: "舊版欄位" }))));
  const root2 = document.createElement("div"); root2.dataset = { simId: pick.id }; root2.isConnected = true;
  PL.get(pick.id).build(root2); window.flushFrames && window.flushFrames(2);
  await wait(50);
  const panel2 = find(root2, "sim-record");
  R.ok(!!panel2 && all(all(panel2, "TBODY")[0], "TR").length === 0, "欄位簽章不同的舊紀錄被作廢，不會錯欄");
  click(all(panel2, "BUTTON").find(b => b.textContent === "清空"));
  R.done();
})().catch(e => { console.error(e); process.exit(1); });
