/* sw.js — Service Worker（離線快取）
 * 更新任何檔案後，請調高 CACHE 版本號以觸發更新。 */
const CACHE = "physics-lab-v26";
const ASSETS = [
  "./",
  "index.html",
  "license.html",
  "manifest.json",
  "css/style.css?v=20260725-4",
  "js/curriculum.js?v=20260725-4",
  "js/advanced-curriculum.js?v=20260725-1",
  "js/comprehensive-curriculum.js?v=20260724-4",
  "js/extension-registry.js?v=20260725-1",
  "js/open-curriculum.js?v=20260725-3",
  "js/sim-core.js?v=20260725-1",
  "js/app.js?v=20260725-4",
  "js/experiments/kinematics.js",
  "js/experiments/newton.js?v=20260725-2",
  "js/experiments/momentum.js",
  "js/experiments/energy.js",
  "js/experiments/gravity.js",
  "js/experiments/shm.js",
  "js/experiments/thermal.js?v=20260725-1",
  "js/experiments/waves.js",
  "js/experiments/optics.js?v=20260725-1",
  "js/experiments/electric.js?v=20260725-1",
  "js/experiments/magnetism.js",
  "js/experiments/modern.js?v=20260725-1",
  "js/experiments/extended.js?v=20260725-3",
  "js/experiments/advanced.js?v=20260725-1",
  "js/experiments/comprehensive.js?v=20260724-4",
  "js/experiments/open-labs.js?v=20260725-2",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // MathJax 等跨網域資源：網路優先，失敗再看快取
  if (url.origin !== location.origin) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  // HTML 必須優先取得最新版本，否則 GitHub Pages 更新後仍可能先開到舊首頁。
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) caches.open(CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => caches.match(req).then(cached => cached || caches.match("./")))
    );
    return;
  }
  // 同網域：快取優先，並在背景更新
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
