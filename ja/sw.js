/* sw.js — Service Worker（離線快取）
 *
 * 發佈流程：只要改 BUILD 一個字串即可。
 * 之前的寫法把版本號分別寫死在 index.html 與這份清單裡，兩邊很容易對不起來；
 * 一旦不同步，預先快取的就是永遠不會被請求到的網址，等於白做一次下載。
 */
const BUILD = "20261112-2027";
const CACHE = "physics-lab-ja-" + BUILD;
/*
 * 第三方資源（釘死版本的 MathJax、Google Fonts）另放一個不隨 BUILD 清掉的快取。
 * 它們的網址本身就帶版本（mathjax@3.2.2、gstatic 的字型檔名含雜湊），不會過期；
 * 每次發版都清掉重抓，只是讓學生白白再下載一次 660 KB。
 */
const CDN_CACHE = "physics-lab-cdn-v1";
/* 與 js/app.js 的 MATHJAX_SRC 相同（build-consistency 會檢查）：「下載全部實驗」時一起存，離線也能排公式 */
const MATHJAX = "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js";
/* 第三方快取的上限：中文字型切成上百個 unicode-range 檔，逛久了會一直累積，超過就從最舊的刪 */
const CDN_MAX_ENTRIES = 160;
async function trimCdnCache() {
  const cache = await caches.open(CDN_CACHE);
  const keys = await cache.keys();
  // MathJax 本體不刪：它是唯一一個離線排公式必須的檔案
  const extra = keys.filter(k => k.url !== MATHJAX).slice(0, Math.max(0, keys.length - CDN_MAX_ENTRIES));
  await Promise.all(extra.map(k => cache.delete(k)));
}

const CORE = ["./", "index.html", "licensing.html", "manifest.json"];
const VERSIONED = [
  "css/style.css",
  "js/site-config.js",
  "js/experiment-manifest.js",
  "js/curriculum.js",
  "js/advanced-curriculum.js",
  "js/comprehensive-curriculum.js",
  "js/extension-registry.js",
  "js/open-curriculum.js",
  "js/school-curriculum.js",
  "js/exam-curriculum.js",
  "js/question-bank.js",
  "js/sim-core.js",
  "js/sim-tools.js",
  "js/sim-insight.js",
  "js/sim-a11y.js",
  "js/sim-record.js",
  "js/sim-observe.js",
  "js/teaching-notes.js",
  "js/app.js",
];
const EXPERIMENTS = [
  "js/sim-apparatus.js",      // 器材繪製層：和實驗程式一樣延遲載入
  "js/experiments/kinematics.js",
  "js/experiments/newton.js",
  "js/experiments/momentum.js",
  "js/experiments/energy.js",
  "js/experiments/gravity.js",
  "js/experiments/shm.js",
  "js/experiments/thermal.js",
  "js/experiments/waves.js",
  "js/experiments/optics.js",
  "js/experiments/electric.js",
  "js/experiments/magnetism.js",
  "js/experiments/modern.js",
  "js/experiments/extended.js",
  "js/experiments/advanced.js",
  "js/experiments/comprehensive.js",
  "js/experiments/comprehensive-2.js",
  "js/experiments/open-labs.js",
  "js/experiments/circuit-sandbox.js",
  "js/experiments/school-labs.js",
  "js/experiments/metrology.js",
  "js/experiments/chase.js",
  "js/experiments/loop-track.js",
  "js/experiments/exam-gravity-waves.js",
  "js/experiments/exam-optics-thermal.js",
  "js/experiments/exam-electric.js",
  "js/experiments/exam-modern.js",
  // 自訂實驗室（lab.html）：只有打開那一頁才用得到，跟實驗程式一樣不在安裝時預載
  "css/lab.css",
  "js/lab/lab-engine.js",
  "js/lab/lab-circuit.js",
  "js/lab/lab-optics.js",
  "js/lab/lab-items.js",
  "js/lab/lab-app.js"
];

const ICONS = ["icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];

/*
 * 安裝時只預先快取「每次都會用到」的核心；實驗程式不在其中。
 *
 * 原因：實驗檔共 485 KB，但學生一次只打開一個。若在安裝時全部抓下來，
 * 等於把剛剛靠延遲載入省下的流量又在背景花掉一次——對用行動網路的學生
 * 尤其不友善。實驗檔改由 fetch 處理器在真正被開啟時才快取；
 * 想要完整離線的使用者，可以在網站上主動按「下載全部實驗」。
 *
 * ICONS 也要帶版本號快取：圖示檔本身沒有 hash，
 * 網址若永遠是 icons/icon.svg，瀏覽器與 SW 會一直端出舊的燒瓶圖。
 */
const ASSETS = CORE
  .concat(VERSIONED.map(path => path + "?v=" + BUILD))
  .concat(ICONS.map(path => path + "?v=" + BUILD));
const EXPERIMENT_ASSETS = EXPERIMENTS.map(path => path + "?v=" + BUILD);

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      // 單一資源失敗（例如新增的檔案還沒上傳）不該讓整個 Service Worker 安裝失敗。
      Promise.all(ASSETS.map(asset => cache.add(asset).catch(err => console.warn("事前キャッシュをとばしました", asset, err))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== CDN_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/*
 * 使用者主動要求把全部實驗存起來離線用。
 * 由網頁透過 postMessage 觸發，完成後回報進度，避免使用者以為當掉了。
 */
self.addEventListener("message", event => {
  const data = event.data || {};
  if (data.type !== "cache-all-experiments") return;
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      let done = 0;
      for (const asset of EXPERIMENT_ASSETS) {
        try { await cache.add(asset); } catch (e) { /* 單一檔案失敗不中斷整體 */ }
        done += 1;
        const clients = await self.clients.matchAll();
        clients.forEach(c => c.postMessage({
          type: "cache-progress", done, total: EXPERIMENT_ASSETS.length
        }));
      }
      /*
       * MathJax 改成需要時才載之後，沒開過任何實驗的人按「下載全部實驗」再離線，公式會全部退成純文字。
       * 這裡一併存進第三方快取（走 CORS，存得到一般回應）；失敗不影響實驗檔。
       */
      try {
        const cdn = await caches.open(CDN_CACHE);
        if (!(await cdn.match(MATHJAX))) {
          const res = await fetch(MATHJAX, { mode: "cors", credentials: "omit" });
          if (res.ok) await cdn.put(MATHJAX, res);
        }
      } catch (e) { /* 校園網路擋 jsdelivr 時，公式會退成可讀的純文字 */ }
      const clients = await self.clients.matchAll();
      clients.forEach(c => c.postMessage({ type: "cache-complete", total: EXPERIMENT_ASSETS.length }));
    })
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  /*
   * 跨網域資源
   *
   * 以前是「網路優先、失敗看快取」，但從來沒有任何地方把它們寫進快取，
   * 所以離線時必定失敗：公式退成純文字、標題字型消失——主打離線可用的 PWA 一離線就變樣。
   *
   * 現在分兩種：
   *   - 內容不會變的（釘死版本的 jsdelivr、gstatic 字型檔）：快取優先，第一次抓到就存起來。
   *   - 字型 CSS（fonts.googleapis.com，同一個網址內容會依瀏覽器調整）：先給快取、背景更新。
   * 只存「成功且非不透明」的回應：不透明回應看不到狀態碼，可能把錯誤頁存起來，
   * 而且瀏覽器會把它當成好幾 MB 計入配額。
   */
  if (url.origin !== location.origin) {
    const immutable = url.hostname === "cdn.jsdelivr.net" && /@\d+\.\d+\.\d+\//.test(url.pathname) ||
      url.hostname === "fonts.gstatic.com";
    const revalidate = url.hostname === "fonts.googleapis.com";
    if (!immutable && !revalidate) return;   // 其他第三方一律交給瀏覽器，不攔截
    const store = res => {
      if (res && res.ok && res.type !== "opaque") {
        const copy = res.clone();
        caches.open(CDN_CACHE).then(c => c.put(req, copy)).then(trimCdnCache).catch(() => {});
      }
      return res;
    };
    e.respondWith(caches.match(req).then(cached => {
      if (cached && immutable) return cached;
      const network = fetch(req).then(store).catch(() => cached);
      return cached || network;
    }));
    return;
  }

  // HTML 必須優先取得最新版本，否則 GitHub Pages 更新後仍可能先開到舊首頁。
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then(cached => cached || caches.match("./")))
    );
    return;
  }

  // 同網域靜態資源：快取優先，並在背景更新（stale-while-revalidate）
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
