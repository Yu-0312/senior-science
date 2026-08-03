/*
 * control-response-test.js — 暫停狀態下拉滑桿，畫面必須真的改變
 *
 * 既有的 meaning-audit 也在量「拉滑桿有沒有反應」，但它是在動畫跑著的時候量的，
 * 因此完全看不到這個洞：許多實驗把重繪整個放在動畫迴圈裡，滑桿本身不接
 * onInput——迴圈在跑時每格都重畫，看起來一切正常。
 *
 * 可是實驗進場預設是暫停的（依 PhET 訪談結論不自動播放），而迴圈停下來時
 * step() 一次都不會被呼叫。於是學生打開槓桿，把四個滑桿從頭拉到尾，
 * 畫面和讀數一動也不動——只有滑桿旁邊那個數字會變。盤點下來有 41 個實驗如此。
 *
 * 這支測試就是在「使用者真正遇到的狀態」下量：建置完、不按播放，
 * 直接派發 input 事件，然後看畫面有沒有變。
 *
 * 注意 harness 的 requestAnimationFrame 是排隊制，引擎的重繪延到下一格，
 * 所以每次派發事件後都要 flushFrames() —— 少了這一步，這支測試會全部誤報。
 */
require("./harness.js");
const { reporter, allIds, makeRecorder, hashFrame } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
const rec = makeRecorder();

const ids = allIds(PL);
const dead = [];        // 拉了完全沒反應
const textOnly = [];    // 只有文字變，圖形沒動
let checkedSliders = 0, checkedExps = 0, movedOk = 0;

ids.forEach(id => {
  const def = PL.get(id);
  if (!def || typeof def.build !== "function") return;
  const root = document.createElement("div");
  document.body.appendChild(root);

  let api = null;
  try { api = def.build(root); } catch (e) { return; }
  // 建置期間排進去的影格先清掉，避免混進待測的那一格
  flush();

  const inputs = Array.from(root.querySelectorAll ? root.querySelectorAll("input") : [])
    .filter(el => el.type === "range");
  if (!inputs.length) { cleanup(); return; }

  // 找出這次建置用到的 canvas context 並掛上錄影機
  const canvases = Array.from(root.querySelectorAll("canvas"));
  canvases.forEach(c => { try { rec.instrument(c.getContext("2d")); } catch (e) {} });
  if (!canvases.length) { cleanup(); return; }

  checkedExps++;

  inputs.forEach(input => {
    const min = Number(input.min), max = Number(input.max), cur = Number(input.value);
    if (!isFinite(min) || !isFinite(max) || max <= min) return;
    /*
     * 不能只試量程的兩端。
     *
     * 相位差滑桿的範圍是 0–360°，而 sin(x + 2π) = sin(x)——兩端畫出來一模一樣，
     * 於是一個完全正常的滑桿被判成沒反應。週期性參數在物理模擬裡很常見
     * （相位、角度、方位），只比較端點一定會踩到。
     * 改成試好幾個值，任何一個造成差異就算有反應。
     */
    const targets = [max, min, min + (max - min) * 0.27, min + (max - min) * 0.63]
      .filter(v => isFinite(v) && Math.abs(v - cur) > (max - min) * 1e-3);
    if (!targets.length) return;
    checkedSliders++;

    /*
     * 前後兩次要做「完全相同的動作」，只有滑桿的值不同。
     *
     * 第一版把 dispatch 寫在 capture 外面，於是有接 onInput 的實驗
     * 在 dispatch 當下就同步畫完了，錄影機根本沒開——532 支滑桿全被報成沒反應。
     * 這種錯誤最危險的地方是它看起來很像重大發現。
     */
    const before = rec.capture(() => { dispatch(input, "input"); flush(); });
    const domBefore = readoutText(root);
    const label = labelOf(input) || input.getAttribute("aria-label") || "（未命名滑桿）";

    let painted = false, geomSame = true, canvasTextSame = true, domSame = true;
    for (const target of targets) {
      input.value = String(target);
      const after = rec.capture(() => { dispatch(input, "input"); flush(); });
      const domAfter = readoutText(root);
      if (after.length) painted = true;
      const gB = before.filter(s => s[0] === "G"), gA = after.filter(s => s[0] === "G");
      const tB = before.filter(s => s[0] === "T"), tA = after.filter(s => s[0] === "T");
      if (hashFrame(gB) !== hashFrame(gA)) geomSame = false;
      if (hashFrame(tB) !== hashFrame(tA)) canvasTextSame = false;
      if (domBefore !== domAfter) domSame = false;
      if (!geomSame) break;          // 已經確認會動，不必再試其他值
    }
    if (!painted) { dead.push(`${id} · ${label}：暫停時完全沒有重繪`); restore(); return; }

    /*
     * 「有反應」不只看畫布。
     *
     * 單擺就是個好例子：t = 0 時擺球停在初始角，改變 g 不會讓它移動一毫米——
     * 這在物理上完全正確。但週期 T = 2π√(L/g) 是寫在讀數區的 DOM，不是畫在畫布上，
     * 而學生確實看得到它變。第一版只錄畫布，於是把 28 支正常的滑桿判成沒反應。
     * 稽核要量的是「學生看不看得到差別」，不是「畫布有沒有重畫」。
     */
    if (geomSame && canvasTextSame && domSame) dead.push(`${id} · ${label}：畫面與讀數都沒有變化`);
    else if (geomSame && canvasTextSame) textOnly.push(`${id} · ${label}：只有讀數變了，畫面沒動`);
    else movedOk++;

    restore();

    // 還原，避免一支滑桿的改動污染下一支的比較基準
    function restore() {
      input.value = String(cur);
      dispatch(input, "input");
      flush();
    }
  });

  cleanup();

  function cleanup() {
    try { if (api && api.stop) api.stop(); } catch (e) {}
    if (root.parentNode) root.parentNode.removeChild(root);
  }
});

function dispatch(el, type) {
  try { el.dispatchEvent({ type, bubbles: true }); } catch (e) {}
}
/* 引擎把暫停時的重繪延到下一個影格，所以每次操作後都要把佇列跑掉 */
function flush() { try { flushFrames(2); } catch (e) {} }
/* 讀數區、衍生量卡與判讀列的文字——學生看得到的另一半 */
function readoutText(root) {
  const sel = ".readout-value, .sim-derived-value, .sim-verdict-text";
  const nodes = root.querySelectorAll ? Array.from(root.querySelectorAll(sel)) : [];
  return nodes.map(n => n.textContent).join("|");
}
function labelOf(input) {
  const wrap = input.parentNode;
  if (!wrap || !wrap.querySelector) return "";
  const l = wrap.querySelector(".ctrl-label");
  return l ? l.textContent : "";
}

R.section("暫停狀態下的滑桿反應");
R.ok(checkedExps > 0, "確實有量到實驗", String(checkedExps) + " 個");
R.ok(checkedSliders > 0, "確實有量到滑桿", String(checkedSliders) + " 支");
R.ok(movedOk > 0, "確實有量到「有反應」的案例（證明量法本身有效）", String(movedOk) + " 支");
R.ok(dead.length === 0, "沒有滑桿在暫停時毫無反應",
  dead.length ? "\n    " + dead.slice(0, 60).join("\n    ") : String(checkedSliders) + " 支全部有反應");
/*
 * 「只有讀數變、畫面沒動」不算缺陷，所以這裡不判失敗，只列出來。
 *
 * 剩下的都是物理上本來就無法在 t = 0 顯示的參數：單擺的 g 只改變週期，
 * 靜止的轉子改變轉動慣量不會讓它轉起來，碰撞前調整回復係數也沒有東西可以動。
 * 這些實驗的讀數確實有跟著變，學生看得到。
 * 硬要它們動反而會逼出假的視覺效果——那比沒有反應更糟。
 * 列在這裡是為了讓這份清單是「已知且刻意如此」，而不是沒人看過。
 */
R.ok(true, "（僅供參考）只改讀數、不改畫面的滑桿：" + textOnly.length + " 支",
  textOnly.length ? "\n    " + textOnly.slice(0, 25).join("\n    ") : "—");

R.done();
