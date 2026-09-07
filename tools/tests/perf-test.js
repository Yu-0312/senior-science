/*
 * perf-test.js — 首次載入的體積與延遲載入
 *
 * 實驗程式共 600 KB 以上，但學生一次只打開一個。
 * 若全部塞進首頁，用行動網路的學生要等很久才看得到任何東西。
 */
require("./harness.js");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { reporter } = require("./_lib.js");
const R = reporter();

const size = p => (fs.existsSync(p) ? fs.statSync(p).size : 0);
/*
 * 門檻要設在「壓縮後」的位元組上。
 * 第一版量原始大小，回報首次載入 515 KB 超標——但 GitHub Pages 傳輸時會 gzip，
 * 純文字大約壓到三分之一，學生實際下載的是 176 KB。
 * 量錯指標的測試比沒有測試更糟：它會逼人去「優化」一個根本不存在的問題。
 */
const gzipSize = p => (fs.existsSync(p) ? zlib.gzipSync(fs.readFileSync(p), { level: 9 }).length : 0);
const kb = n => (n / 1024).toFixed(0) + " KB";

const html = fs.readFileSync("index.html", "utf8");
const eager = Array.from(html.matchAll(/src="(js\/[^"?]+)/g)).map(m => m[1]);
const eagerRaw = eager.reduce((s, p) => s + size(p), 0) + size("css/style.css") + size("index.html");
const eagerGz = eager.reduce((s, p) => s + gzipSize(p), 0) + gzipSize("css/style.css") + gzipSize("index.html");

R.section("首次載入（以壓縮後為準）");
R.ok(eagerGz < 220 * 1024, "首次載入 gzip " + kb(eagerGz) + "（上限 220 KB）",
  "原始 " + kb(eagerRaw) + "，" + eager.length + " 支腳本 + style.css + index.html");

const expDir = "js/experiments";
const expFiles = fs.readdirSync(expDir).filter(f => f.endsWith(".js"));
const expGz = expFiles.reduce((s, f) => s + gzipSize(path.join(expDir, f)), 0);
R.ok(!eager.some(p => p.indexOf("js/experiments/") === 0),
  "實驗程式（gzip 合計 " + kb(expGz) + "）不在首次載入之列");

const biggest = expFiles.map(f => ({ f, n: gzipSize(path.join(expDir, f)) }))
  .sort((a, b) => b.n - a.n)[0];
R.ok(biggest.n < 40 * 1024,
  "打開單一實驗最多再載 gzip " + kb(biggest.n) + "（" + biggest.f + "）");

R.section("Service Worker 的預先快取不可以抵銷延遲載入");
{
  const sw = fs.readFileSync("sw.js", "utf8");
  R.ok(/const EXPERIMENT_ASSETS/.test(sw) && /EXPERIMENTS\.map/.test(sw),
    "實驗程式獨立成一份清單，不在安裝時預先抓");
  const installBlock = sw.slice(sw.indexOf('addEventListener("install"'), sw.indexOf('addEventListener("activate"'));
  R.ok(installBlock.indexOf("EXPERIMENT_ASSETS") < 0,
    "install 階段沒有預先快取實驗程式");
  R.ok(/cache-all-experiments/.test(sw), "保留「使用者主動下載全部實驗」的途徑");
}

R.section("實驗清單由沙箱執行產生（不是用正則猜）");
{
  const man = fs.readFileSync("js/experiment-manifest.js", "utf8");
  const n = (man.match(/"[a-z0-9-]+":\s*"/g) || []).length;
  R.ok(n >= 240, "清單涵蓋 " + n + " 個實驗");
}

/*
 * 每影格預算
 *
 * 由來：新做的兩個旗艦實驗第一版都在每一影格重算全部幾何——
 * loop-track 畫一次軌道要呼叫 300 次 pointAt()，每次內含 120 步線性搜尋；
 * chase 每次更新掃描 2400 個點三遍。桌機看不太出來，手機會明顯掉格，
 * 而且是「動畫愈久愈卡」那種難以回報的卡。
 *
 * 動畫迴圈跑 50 fps，一影格 20 ms。這裡抓 8 ms 當上限，
 * 留一半以上的餘裕給瀏覽器真正的繪圖（Node 這邊的 canvas 是空殼，不含光柵化）。
 */
const PL = window.PhysicsLab;
document.documentElement.getAttribute = () => "dark";
const C = window.PhysicsLabCurriculum;
const ids = [];
(C.modules || []).forEach(m => (m.experiments || []).forEach(e => { if (PL.has(e.id)) ids.push(e.id); }));

R.section("每影格更新耗時（動畫 50 fps，一影格 20 ms）");
const slow = [];
let worst = { id: "", ms: 0 };
ids.forEach(id => {
  const root = document.createElement("div"); root.dataset = { simId: id };
  let api;
  try { api = PL.get(id).build(root); } catch (e) { return; }
  if (!api || !api.rerender) { if (api && api.stop) api.stop(); return; }
  try { for (let i = 0; i < 5; i++) api.rerender(); } catch (e) {}   // 暖機
  /*
   * 取三批的中位數，不是單批的平均。
   *
   * 由來：loop-track 穩定落在 7.3～7.9 ms，離 8 ms 的上限只剩零點幾毫秒。
   * 單批平均遇到 CI 機器上的排程雜訊就會偶發超標——同一份程式碼重跑一次就綠，
   * 於是這支測試開始產生假警報，而假警報看久了會讓人習慣忽略紅燈。
   *
   * 解法不是放寬門檻（8 ms 是 20 ms 影格預算裡留給 JS 的那一半，
   * 剩下要給瀏覽器真正的光柵化，這個比例本身是對的），
   * 而是讓量測本身不受單次雜訊影響。中位數對偶發的長暫停免疫。
   */
  const N = 40, BATCHES = 3;
  const samples = [];
  for (let b = 0; b < BATCHES; b++) {
    const t0 = process.hrtime.bigint();
    try { for (let i = 0; i < N; i++) api.rerender(); } catch (e) {}
    samples.push(Number(process.hrtime.bigint() - t0) / 1e6 / N);
  }
  samples.sort((x, y) => x - y);
  const ms = samples[1];
  if (ms > worst.ms) worst = { id, ms };
  if (ms > 8) slow.push(id + " " + ms.toFixed(1) + " ms");
  if (api.stop) api.stop();
});
R.ok(slow.length === 0, "全部 " + ids.length + " 個實驗都在 8 ms 以內",
  slow.length ? slow.slice(0, 8).join("、") : "最慢：" + worst.id + " " + worst.ms.toFixed(2) + " ms");

R.done();
