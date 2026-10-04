// เปลี่ยนเลขเวอร์ชันทุกครั้งที่อัปโหลดไฟล์เกมใหม่
const VERSION = "v19";
const CACHE = "petfarm-" + VERSION;
const SHELL = ["./", "index.html", "style.css", "game.js", "manifest.json", "icon-192.png", "icon-512.png", "icon-180.png", "icon-maskable-512.png", "sign%202.png", "sprout.png", "chick.png", "cow.png", "bush%202.png", "sky_morning.png", "sky_day.png", "sky_evening.png", "sky_night.png", "boy_strip.png", "x.png", "n_fountain_sheet.png", "n_shop_sell.png", "n_shop_egg.png", "n_floor1.png", "n_floor2.png", "n_flower.png", "n_crate.png", "n_barrel.png", "n_bush1.png", "n_bush2.png", "n_lamp.png", "n_umbrella.png", "n_plant.png", "n_path1.png", "n_path2.png", "n_path3.png", "n_path4.png", "n_path5.png", "n_path6.png", "pf_crop.png", "pf_can.png", "pf_pond.png", "pf_ripple.png", "pf_garden.png", "pf_sky_morning.png", "pf_sky_night.png", "pf_sky_rain.png", "pf_sky_storm.png", "srv_title.png", "srv_card1.png", "srv_card2.png", "srv_card3.png", "srv_card4.png", "srv_card5.png", "srv_btn.png", "srv_btn_hover.png", "srv_btn_press.png", "srv_btn_off.png", "srv_box.png", "srv_grass.png", "set_bg.png", "inc_win.png", "inc_win_empty.png", "inc_btn_add.png", "inc_btn_temp.png", "inc_btn_detail.png", "inc_ico_therm.png", "inc_ico_clock.png"];

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
  if (/\.mp3$/i.test(url.pathname)) return; // ไฟล์เพลงใหญ่/ใช้ range request ให้เบราว์เซอร์จัดการเอง
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match("index.html")))
  );
});
