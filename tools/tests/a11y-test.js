/*
 * a11y-test.js — 無障礙與觸控
 *
 * canvas 對螢幕報讀器是一塊完全不透明的區域。若不另外提供文字替代，
 * 使用報讀器的學生等於完全用不了這個網站。
 * 觸控目標則依 WCAG 2.5.5：粗指標裝置上至少 44×44 px。
 */
require("./harness.js");
const fs = require("fs");
const { reporter, allIds } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

const ids = allIds(PL);

R.section("每個實驗的主畫布都要有文字替代");
{
  const bad = [];
  ids.forEach(id => {
    const root = document.createElement("div"); root.dataset = { simId: id };
    let api;
    try { api = PL.get(id).build(root); } catch (e) { return; }
    const canvases = root.querySelectorAll("CANVAS");
    const main = canvases[0];
    if (!main) { bad.push(id + "（沒有畫布）"); }
    else {
      const role = main.getAttribute("role");
      const label = main.getAttribute("aria-label");
      if (role !== "img" || !label || label.length < 4) {
        bad.push(id + "（role=" + role + " label=" + (label ? label.slice(0, 20) : "無") + "）");
      }
    }
    if (api && api.stop) api.stop();
  });
  R.ok(bad.length === 0, "共 " + ids.length + " 個實驗", bad.slice(0, 5).join("\n      "));
}

R.section("讀數要有可被報讀的文字版本");
{
  const root = document.createElement("div"); root.dataset = { simId: "pendulum" };
  const api = PL.get("pendulum").build(root);
  const live = root.querySelectorAll(".sim-readouts").length > 0;
  R.ok(live, "讀數區存在");
  const howto = root.querySelector(".sim-a11y-howto-body");
  R.ok(!!howto && howto.textContent.length > 10,
    "有操作說明：" + (howto ? howto.textContent.slice(0, 40) + "…" : "無"));
  if (api && api.stop) api.stop();
}

R.section("沒有播放鍵的實驗，操作說明要寫出怎麼開始");
{
  const checks = [
    ["projectile", /發射/],
    ["efield", /調整參數|滑桿|參數/],
    ["satellite", /播放/]
  ];
  const bad = [];
  checks.forEach(([id, re]) => {
    const root = document.createElement("div"); root.dataset = { simId: id };
    let api;
    try { api = PL.get(id).build(root); } catch (e) { bad.push(id + " 建置失敗"); return; }
    const howto = root.querySelector(".sim-a11y-howto-body");
    const text = howto ? howto.textContent : "";
    if (!text) bad.push(id + "（沒有操作說明）");
    else if (!re.test(text)) bad.push(id + "（說明不夠具體：" + text.slice(0, 50) + "）");
    const canvas = root.querySelector("canvas");
    if (canvas && !/怎麼|按|調整/.test(canvas.getAttribute("aria-label") || "")) {
      bad.push(id + "（canvas aria-label 缺操作指引）");
    }
    if (api && api.stop) api.stop();
  });
  R.ok(bad.length === 0, "自帶觸發／靜態／連續動畫三種都有指引", bad.join("\n      "));
}

R.section("傳輸列按鈕要有可讀的 name");
{
  const root = document.createElement("div"); root.dataset = { simId: "satellite" };
  const api = PL.get("satellite").build(root);
  const play = root.querySelector(".sim-transport-play");
  const step = root.querySelector(".sim-transport-btn");
  const reset = root.querySelector(".sim-transport-reset");
  R.ok(!!play && /播放/.test(play.getAttribute("aria-label") || play.textContent),
    "播放鍵有明確名稱");
  R.ok(!!step && /單步/.test(step.getAttribute("aria-label") || step.textContent),
    "單步鍵有明確名稱");
  R.ok(!!reset && /重設/.test(reset.getAttribute("aria-label") || reset.textContent),
    "重設鍵有明確名稱");
  const live = root.querySelector(".sim-a11y-live");
  R.ok(!!live && live.getAttribute("aria-live") === "polite", "有 aria-live 播報區");
  if (api && api.stop) api.stop();
}

R.section("觸控目標尺寸（WCAG 2.5.5：粗指標下至少 44px）");
{
  const css = fs.readFileSync("css/style.css", "utf8");
  const coarse = css.indexOf("(pointer: coarse)");
  R.ok(coarse > 0, "有針對粗指標裝置的樣式區塊");
  const block = css.slice(coarse, coarse + 4000);
  const hits = (block.match(/min-height:\s*4[4-9]px|min-height:\s*[5-9]\dpx/g) || []).length;
  R.ok(hits >= 3, "粗指標區塊裡有放大觸控目標的規則（" + hits + " 條）");
}

R.section("量測工具在觸控裝置上的命中範圍要放大");
{
  const tools = fs.readFileSync("js/sim-tools.js", "utf8");
  R.ok(/GRAB\s*=\s*COARSE\s*\?\s*24/.test(tools), "把手命中半徑觸控時放大到 24px");
  R.ok(/BTN_H\s*=\s*COARSE\s*\?\s*30/.test(tools), "碼錶按鈕觸控時加高");
}

R.done();
