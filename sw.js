/* sw.js — Service Worker（離線快取）
 * 更新任何檔案後，請調高 CACHE 版本號以觸發更新。 */
const CACHE = "physics-lab-v6";
const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/curriculum.js",
  "js/sim-core.js",
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
