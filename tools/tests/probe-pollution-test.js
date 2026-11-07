/*
 * probe-pollution-test.js — 自動探測不可以改掉實驗的初始狀態
 *
 * 由來（2026-11）：生物版「影響酵素活性的因素」一打開就是「0 %、變性」。
 * 建置時的探測引擎把溫度滑桿掃到 60 °C，實驗用一個旗標記住「已變性」，
 * 探測結束把滑桿放回 37 °C，旗標卻沒有回來——學生什麼都還沒碰，酵素就已經死了。
 *
 * 這支測試每個實驗建置兩次：一次關掉探測（window.PhysicsLabNoProbe），一次照常探測，
 * 比較兩次的初始讀數。先用兩次「不探測」的建置排除本來就會變動的讀數（亂數、計時）。
 * 有差異就代表探測把某個狀態留在了實驗裡；修法是在記住之前檢查 PL.probing。
 */
require("./harness.js");
const { reporter, allIds } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

let LAST = null;
PL._hooks.onBuilt(c => { LAST = c; });

function snapshot(id, noProbe) {
  window.PhysicsLabNoProbe = !!noProbe;
  LAST = null;
  const root = document.createElement("div");
  root.dataset = { simId: id };
  let api = null;
  try { api = PL.get(id).build(root); window.flushFrames(2); } catch (e) { return null; }
  const ctx = LAST;
  if (api && api.rerender) { try { api.rerender(); } catch (e) {} }
  const out = ctx ? (ctx.readouts || []).map(r => r.label + "=" + r.value) : [];
  try { api && api.stop && api.stop(); } catch (e) {}
  window.PhysicsLabNoProbe = false;
  return out;
}

R.section("探測前後的初始讀數一致");
const polluted = [];
allIds(PL).forEach(id => {
  const a = snapshot(id, true), b = snapshot(id, true), c = snapshot(id, false);
  if (!a || !b || !c) return;
  const diffs = [];
  a.forEach((v, i) => {
    if (v !== b[i]) return;                // 本來就會變（亂數、時間）的讀數不比
    if (c[i] !== undefined && c[i] !== v) diffs.push(v + " → " + c[i]);
  });
  if (diffs.length) polluted.push(id + "：" + diffs.slice(0, 2).join("；"));
});
R.ok(polluted.length === 0, "探測沒有在任何實驗留下狀態", polluted.slice(0, 12).join("\n      "));
R.done();
