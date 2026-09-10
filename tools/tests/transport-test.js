/*
 * transport-test.js — 傳輸列必須真的能驅動實驗
 *
 * 使用者回報「有些實驗會有兩個播放」。查下去發現不只是重複：
 * 有些實驗在自己的迴圈回呼裡維護 running 旗標，
 * 傳輸列讓迴圈開始跑，回呼卻因為 running 為 false 而什麼都不做——
 * 結果是<strong>兩個開關必須同時打開</strong>，而學生看不出來要按哪一個。
 *
 * 兩條規則：
 *   1. 實驗不可以自己做播放／暫停按鈕。引擎的傳輸列已經提供，
 *      而且還附單步與速度控制。重複只會讓人不知道該按哪個。
 *      「釋放／發射／推一下」這類<strong>觸發一次的動作</strong>不算，那是實驗內容的一部分。
 *   2. 只要實驗有連續動畫，傳輸列的播放就必須能推進它。
 */
require("./harness.js");
const fs = require("fs");
const { reporter, allIds, makeRecorder, hashFrame } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
const rec = makeRecorder();
document.documentElement.getAttribute = () => "dark";

let LAST = null;
PL._hooks.onBuilt(c => { LAST = c; });

/* 由 manifest 找出這個實驗寫在哪一個檔案 */
let MANIFEST = null;
function readSource(id) {
  if (!MANIFEST) {
    MANIFEST = {};
    try {
      const m = fs.readFileSync("js/experiment-manifest.js", "utf8");
      let x; const re = /"([a-z0-9-]+)":\s*"([^"]+)"/g;
      while ((x = re.exec(m))) MANIFEST[x[1]] = x[2];
    } catch (e) {}
  }
  const f = MANIFEST[id];
  if (!f) return null;
  try { return fs.readFileSync("js/experiments/" + f, "utf8"); } catch (e) { return null; }
}

R.section("實驗不可以自己做播放／暫停按鈕");
{
  const bad = [];
  fs.readdirSync("js/experiments").filter(f => f.endsWith(".js")).forEach(f => {
    const src = fs.readFileSync("js/experiments/" + f, "utf8");
    const re = /PL\.ui\.button\([^,]*,\s*"(暫停|播放|繼續)"/g;
    let m;
    while ((m = re.exec(src))) {
      const line = src.slice(0, m.index).split("\n").length;
      bad.push(f + ":" + line + " → 「" + m[1] + "」");
    }
  });
  R.ok(bad.length === 0, "沒有重複的播放／暫停按鈕",
    bad.slice(0, 12).join("\n      "));
}

R.section("不可以用自己的旗標把傳輸列擋住");
{
  /*
   * 具體的反模式：迴圈回呼一開頭就用一個布林旗標決定要不要前進。
   * 傳輸列讓迴圈跑起來，回呼卻因為旗標是 false 而什麼都不做，
   * 於是「兩個開關要同時打開」。這是實際回報過的問題，
   * 而且症狀是「按了播放沒反應」，非常難自行判斷原因。
   *
   * 用靜態分析而不是「跑跑看畫面有沒有變」：後者無法區分
   * 「被旗標擋住」與「這個實驗本來就是靜態的」。
   */
  const bad = [];
  fs.readdirSync("js/experiments").filter(f => f.endsWith(".js")).forEach(f => {
    const src = fs.readFileSync("js/experiments/" + f, "utf8");
    const re = /PL\.loop\(\s*(?:function\s*)?\(?\s*dt[^)]*\)?\s*=>?\s*\{([^\n]*\n){0,3}/g;
    let m;
    while ((m = re.exec(src))) {
      const body = m[0];
      // if (dt && xxx)  或  if (!xxx || !dt) return  這兩種寫法
      const g = /if\s*\(\s*dt\s*&&\s*([A-Za-z_$][\w$]*)\s*\)|if\s*\(\s*!\s*([A-Za-z_$][\w$]*)\s*\|\|\s*!\s*dt\s*\)/.exec(body);
      if (!g) continue;
      const flag = g[1] || g[2];
      /*
       * 只有「開關式」的旗標才是問題。
       *
       * 單向觸發（放上輸送帶、接觸、發射）把旗標從 false 設成 true 之後就不再切換，
       * 那是實驗內容的一部分：東西還沒開始跑本來就不該動。
       * 真正會擋住傳輸列的是 flag = !flag 這種開關——
       * 它和傳輸列各自維護一份播放狀態，兩個都打開才會動，
       * 而學生按了傳輸列的播放卻毫無反應，完全看不出問題在哪。
       */
      if (!new RegExp(flag + "\\s*=\\s*!\\s*" + flag).test(src)) continue;
      const line = src.slice(0, m.index).split("\n").length;
      bad.push(f + ":" + line + " → 迴圈被開關式旗標 " + flag + " 擋住");
    }
  });
  R.ok(bad.length === 0, "沒有實驗用開關式旗標擋住傳輸列", bad.slice(0, 10).join("\n      "));
}

R.section("傳輸列真的推得動 chase-and-meet（實際回報的案例）");
{
  LAST = null;
  const root = document.createElement("div");
  root.dataset = { simId: "chase-and-meet" };
  const api = PL.get("chase-and-meet").build(root);
  const ctx = LAST;
  const read = () => {
    const r = (ctx.readouts || []).find(x => x.label === "時間 t");
    return r ? r.number : null;
  };
  const loop = (ctx.loops || [])[0];
  const before = read();
  for (let i = 0; i < 120; i++) loop.stepOnce(1 / 60);
  const after = read();
  R.ok(after > before + 1.5, "傳輸列跑 2 秒，實驗時間跟著前進",
    "t " + PL.fmt(before, 2) + " → " + PL.fmt(after, 2));
  if (api && api.stop) api.stop();
}

R.section("自帶觸發鈕的實驗：不放播放鍵，改在旁邊提示怎麼開始");
{
  /*
   * 使用者回報「不需要播放的實驗要把播放移掉」，而且沒有播放時
   * 要在旁邊寫上要怎麼玩。自帶發射／釋放的實驗開始鍵在參數區，
   * 傳輸列再放一顆播放是重複開關——隱藏播放、保留單步／速度／重設，
   * 並在原本播放鍵的位置顯示提示。
   */
  const root = document.createElement("div");
  root.dataset = { simId: "projectile" };
  let captured = null;
  PL._hooks.onBuilt(c => { captured = c; });
  const api = PL.get("projectile").build(root);
  const ctx = captured;
  const trans = root._labTransport;

  R.ok(!!ctx && ctx.hasTrigger === true, "projectile 被標記為自帶觸發鈕");
  R.ok(!!trans && trans.playBtn.hidden === true, "傳輸列播放鍵已隱藏");
  R.ok(!!trans && trans.playHint && trans.playHint.hidden === false,
    "顯示「怎麼開始」的提示");
  R.ok(!!trans && /發射/.test(trans.playHint.textContent),
    "提示寫出觸發鈕名稱：" + (trans.playHint ? trans.playHint.textContent : ""));
  R.ok(!!trans && trans.stepBtnT.hidden !== true, "單步鈕仍保留（可逐格檢視）");

  const loop = (ctx.loops || [])[0];
  const fireBtn = Array.from(root.querySelectorAll("button")).find(b => b.textContent.trim() === "發射");
  R.ok(!!fireBtn, "找得到「發射」鈕");
  R.ok(loop && loop.running === false, "發射前迴圈是停的");
  if (fireBtn) fireBtn.dispatch("click", {});
  R.ok(loop && loop.running === true, "按發射後迴圈啟動了（觸發鈕確實有 start）");
  if (api && api.stop) api.stop();
}

R.section("靜態實驗：沒有播放／單步／速度，提示改成調整參數");
{
  // 連續繞行的對照
  const satRoot = document.createElement("div");
  satRoot.dataset = { simId: "satellite" };
  const satApi = PL.get("satellite").build(satRoot);
  const satTrans = satRoot._labTransport;
  R.ok(!!satTrans && satTrans.playBtn.hidden !== true,
    "satellite 保留播放/暫停（持續繞行要能暫停讀值）");
  R.ok(!!satTrans && (!satTrans.playHint || satTrans.playHint.hidden === true),
    "有播放鍵時不顯示提示");
  if (satApi && satApi.stop) satApi.stop();

  // 靜態場景：拉滑桿就重畫，沒有動畫迴圈
  const root = document.createElement("div");
  root.dataset = { simId: "efield" };
  const api = PL.get("efield").build(root);
  const trans = root._labTransport;
  const ctx = null;
  R.ok(!!trans && trans.playBtn.hidden === true, "靜態實驗隱藏播放鍵");
  R.ok(!!trans && trans.stepBtnT.hidden === true, "靜態實驗隱藏單步");
  const speedWrap = root.querySelector(".sim-speed");
  R.ok(!!speedWrap && speedWrap.hidden === true, "靜態實驗隱藏速度列");
  R.ok(!!trans && trans.timeLabel.hidden === true, "靜態實驗隱藏模擬時間");
  R.ok(!!trans && trans.playHint && trans.playHint.hidden === false,
    "靜態實驗顯示調整參數提示");
  R.ok(!!trans && /調整參數/.test(trans.playHint.textContent),
    "提示文案：" + (trans.playHint ? trans.playHint.textContent : ""));
  if (api && api.stop) api.stop();
}

R.done();
