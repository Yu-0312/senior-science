/*
 * render-test.js — 每個實驗在兩種主題下都要能建置、重繪、停止
 * 最基本的一道防線：任何一個實驗丟出例外，整頁就是空白。
 */
require("./harness.js");
const { reporter, allIds } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();

const ids = allIds(PL);
R.section("建置與重繪（深色 / 淺色）");
let count = 0;
const broken = [];
["dark", "light"].forEach(theme => {
  document.documentElement.getAttribute = k => (k === "data-theme" ? theme : null);
  ids.forEach(id => {
    try {
      const root = document.createElement("div");
      root.dataset = { simId: id };
      const api = PL.get(id).build(root);
      if (api && api.rerender) api.rerender();
      if (api && api.stop) api.stop();
      count += 1;
    } catch (e) {
      broken.push(theme + " / " + id + "：" + e.message);
    }
  });
});
R.ok(broken.length === 0, "共 " + ids.length + " 個實驗 × 2 主題 = " + count + " 次成功",
  broken.slice(0, 5).join("\n      "));

R.section("每個實驗都要能被停止（避免離開後計時器繼續跑）");
const leaky = [];
document.documentElement.getAttribute = () => "dark";
ids.forEach(id => {
  const root = document.createElement("div");
  root.dataset = { simId: id };
  let api;
  try { api = PL.get(id).build(root); } catch (e) { return; }
  if (!api || typeof api.stop !== "function") leaky.push(id);
  else { try { api.stop(); } catch (e) { leaky.push(id + "（stop 丟例外）"); } }
});
R.ok(leaky.length === 0, "全部提供可用的 stop()", leaky.slice(0, 6).join("、"));

R.done();
