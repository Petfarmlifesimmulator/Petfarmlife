// เปลี่ยนเลขเวอร์ชันทุกครั้งที่อัปโหลดไฟล์เกมใหม่
const VERSION = "v4";
const CACHE = "petfarm-" + VERSION;
const SHELL = ["./", "index.html", "style.css", "game.js", "manifest.json", "icon-192.png", "icon-512.png", "icon-180.png", "icon-maskable-512.png", "img/sign.png", "img/sprout.png", "img/chick.png", "img/cow.png", "img/bush.png", "img/sky_morning.png", "img/sky_day.png", "img/sky_evening.png", "img/sky_night.png", "img/boy_strip.png", "img/x.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// network-first เฉพาะไฟล์ในเว็บเราเอง (Firebase / Google Fonts ปล่อยผ่านไม่แตะ)
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("index.html")))
  );
});
