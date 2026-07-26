/* sw.js — Service Worker（離線快取）
 *
 * 發佈流程：只要改 BUILD 一個字串即可。
 * 之前的寫法把版本號分別寫死在 index.html 與這份清單裡，兩邊很容易對不起來；
 * 一旦不同步，預先快取的就是永遠不會被請求到的網址，等於白做一次下載。
 */
const BUILD = "20260725-9";
const CACHE = "physics-lab-" + BUILD;

const CORE = ["./", "index.html", "license.html", "manifest.json"];
const VERSIONED = [
  "css/style.css",
  "js/curriculum.js",
  "js/advanced-curriculum.js",
  "js/comprehensive-curriculum.js",
  "js/extension-registry.js",
  "js/open-curriculum.js",
  "js/school-curriculum.js",
  "js/question-bank.js",
  "js/sim-core.js",
  "js/sim-tools.js",
  "js/sim-insight.js",
  "js/app.js",
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
  "js/experiments/open-labs.js",
  "js/experiments/school-labs.js"
];
const ICONS = ["icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"];

const ASSETS = CORE.concat(VERSIONED.map(path => path + "?v=" + BUILD)).concat(ICONS);

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      // 單一資源失敗（例如新增的檔案還沒上傳）不該讓整個 Service Worker 安裝失敗。
      Promise.all(ASSETS.map(asset => cache.add(asset).catch(err => console.warn("預先快取略過", asset, err))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  // MathJax 等跨網域資源：網路優先，失敗再看快取
  if (url.origin !== location.origin) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
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
