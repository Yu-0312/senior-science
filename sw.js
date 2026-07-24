/* Service Worker — 離線快取（PWA） */
const CACHE = "physics-lab-v2";
const ASSETS = [
  "./", "./index.html", "./manifest.json",
  "./css/style.css",
  "./js/curriculum.js", "./js/sim-core.js", "./js/app.js",
  "./js/experiments/projectile.js", "./js/experiments/freefall.js", "./js/experiments/incline.js",
  "./js/experiments/collision.js", "./js/experiments/energy-track.js", "./js/experiments/orbit.js",
  "./js/experiments/circular.js", "./js/experiments/spring.js", "./js/experiments/pendulum.js",
  "./js/experiments/gas.js", "./js/experiments/buoyancy.js", "./js/experiments/standing-wave.js",
  "./js/experiments/doppler.js", "./js/experiments/double-slit.js", "./js/experiments/snell.js",
  "./js/experiments/lens.js", "./js/experiments/efield.js", "./js/experiments/ohms.js",
  "./js/experiments/induction.js", "./js/experiments/lorentz.js", "./js/experiments/photoelectric.js",
  "./js/experiments/bohr.js", "./js/experiments/superposition.js", "./js/experiments/mirror.js",
  "./js/experiments/ac.js", "./js/experiments/halflife.js", "./js/experiments/relativity.js",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 外部資源（如 MathJax CDN）走網路
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
