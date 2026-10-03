(function(){
"use strict";
const firebaseConfig = {
  apiKey: "AIzaSyCaJ5I88uTu4y08i_dnh6queGnDDcL_biw",
  authDomain: "kayeejai-arena.firebaseapp.com",
  projectId: "kayeejai-arena",
  storageBucket: "kayeejai-arena.firebasestorage.app",
  messagingSenderId: "283622850863",
  appId: "1:283622850863:web:d4ac760a89b8710e82e1da",
  databaseURL: "https://kayeejai-arena-default-rtdb.asia-southeast1.firebasedatabase.app"
};
let db = null, auth = null, currentUser = null, firebaseReady = false;
try{
  if(window.firebase && !firebase.apps.length) firebase.initializeApp(firebaseConfig);
  if(window.firebase){ db = firebase.database(); auth = firebase.auth(); firebaseReady = true; }
}catch(e){ console.error("Firebase init error:", e); }
const $ = id => document.getElementById(id);
const fmtRuby = n => n.toLocaleString("en-US");
const lvXpNeed = lv => 100 + (Math.max(1, lv) - 1) * 120;
const safeSrc = v => (typeof v === "string" && v.indexOf("data:image/") === 0) ? v : "";
const avKey = () => "kyjAvatar_" + (currentUser ? currentUser.uid : "");
const getPlayerName = () => ((currentUser && (currentUser.displayName || (currentUser.email || "").split("@")[0])) || "").trim().slice(0, 20);

/* ===== PET FARM LIFE: 5 เซิร์ฟเวอร์ถาวร เซิร์ฟละไม่เกิน 5 คน ===== */
const PF_OPEN = false; /* เปลี่ยนเป็น true เมื่อพร้อมเปิดให้เล่นจริง */
const PF_TEST = /[?&]petfarm=1/.test(location.search); /* เปิดทดสอบด้วย ?petfarm=1 */
const PF_MAX = 5;
const PF_VER = 2; /* เพิ่มเลขนี้ (3, 4, ...) เมื่อไหร่ก็ตาม ทุกบัญชีที่เซฟไม่ตรงเวอร์ชันจะถูกรีเซ็ตตอนเข้าเกมครั้งถัดไป */
const PF_PETS = ["🐶","🐱","🐰","🐥","🐹"];
const PF_SERVERS = ["s1","s2","s3","s4","s5"];
let pfData = {}, pfCur = "", pfRef = null, pfBusy = false, pfPending = "", pfJoinId = "";
/* เหรียญและเพชรของ Pet Farm ยังไม่มีระบบ ตอนนี้แสดง 0 ไว้ก่อน พอทำระบบแล้วเปลี่ยนสองค่านี้ */
let pfCoins = 0, pfGems = 0, pfClockT = null, pfEggs = {};
const PF_EGG_NAMES = {cat:"ไข่แมว"};
const pfFarmKey = "kyjFarmName";
const pfEsc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pfNum = id => PF_SERVERS.indexOf(id) + 1;
function pfMyName(){ return (getPlayerName() || (currentUser && currentUser.displayName) || "Player").slice(0, 20); }
function pfPlayers(id){
  const p = pfData[id] && pfData[id].players;
  return p ? Object.keys(p).map(u => ({uid:u, name:p[u].name || "Player", farm:p[u].farm || "", at:p[u].joinedAt || 0})).sort((a,b) => a.at - b.at) : [];
}
function pfStart(){
  if(!firebaseReady || pfRef) return;
  pfRef = db.ref("petfarm/servers");
  pfRef.on("value", s => { pfData = s.val() || {}; pfRender(); }, e => {
    console.error(e);
    const l = $("pfmList");
    if(l) l.innerHTML = '<p class="pfm-note">โหลดเซิร์ฟเวอร์ไม่ได้ ตรวจสอบ Firebase Rules ของ petfarm</p>';
  });
}
function pfStop(){ if(pfRef){ pfRef.off(); pfRef = null; } }
let pfLocked = false;
/* ไข่แมวน่ารัก (วาดด้วย SVG) */
function pfEggSvg(h){
  return '<svg viewBox="0 0 64 80" width="' + Math.round(h * 0.8) + '" height="' + h + '" aria-hidden="true">'
    + '<path d="M32 4C48 4 58 30 58 50C58 66 46 77 32 77C18 77 6 66 6 50C6 30 16 4 32 4Z" fill="#fff6e8" stroke="#ffb3cf" stroke-width="3"/>'
    + '<polygon points="12,24 11,6 29,15" fill="#ffd9a8" stroke="#ffb3cf" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<polygon points="52,24 53,6 35,15" fill="#ffd9a8" stroke="#ffb3cf" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<polygon points="15,19 15,11 22,15" fill="#ffc2d6"/><polygon points="49,19 49,11 42,15" fill="#ffc2d6"/>'
    + '<ellipse cx="17" cy="60" rx="8" ry="9" fill="#ffd9a8" opacity=".75"/><ellipse cx="48" cy="64" rx="6" ry="6" fill="#ffd9a8" opacity=".75"/>'
    + '<path d="M26 17v6M32 15v7M38 17v6" stroke="#ffb98a" stroke-width="2.5" stroke-linecap="round"/>'
    + '<ellipse cx="23.5" cy="45" rx="3.6" ry="4.6" fill="#5a4a6a"/><ellipse cx="40.5" cy="45" rx="3.6" ry="4.6" fill="#5a4a6a"/>'
    + '<circle cx="24.8" cy="43.4" r="1.4" fill="#fff"/><circle cx="41.8" cy="43.4" r="1.4" fill="#fff"/>'
    + '<ellipse cx="16.5" cy="53" rx="4.2" ry="2.8" fill="#ffb3cf" opacity=".8"/><ellipse cx="47.5" cy="53" rx="4.2" ry="2.8" fill="#ffb3cf" opacity=".8"/>'
    + '<path d="M29.5 51h5l-2.5 3z" fill="#ff8fb8"/>'
    + '<path d="M32 54v2.2M27.5 57c1.6 2 3.4 2 4.5 0c1.1 2 2.9 2 4.5 0" fill="none" stroke="#9a7a8a" stroke-width="1.8" stroke-linecap="round"/>'
    + '<path d="M8 47h-5M9 52l-5 2M56 47h5M55 52l5 2" stroke="#d9b8c8" stroke-width="1.6" stroke-linecap="round"/>'
    + '<ellipse cx="19" cy="26" rx="3.5" ry="7" fill="#fff" opacity=".7" transform="rotate(25 19 26)"/>'
    + '</svg>';
}
/* ===== สัตว์เลี้ยงมีชีวิต: ไข่ฟักตามเวลาจริง โต 3 ระยะ ค่าสถานะลดตามเวลา (คำนวณจาก last จึงลดต่อแม้ปิดเกม) ===== */
const PF_HATCH_MS = 5 * 60000, PF_BABY_MS = 30 * 60000, PF_TEEN_MS = 3 * 3600000;
/* home=1 สัตว์เลี้ยงในบ้าน (สัตว์ที่คนเลี้ยงจริง) / home=0 สัตว์ฟาร์ม อยู่ข้างนอก · e = อีโมจิ [ลูก, วัยรุ่น, โต] */
const PF_TYPES = {cat:{n:"แมว",home:1,e:["🐱","🐱","🐈"]}, dog:{n:"สุนัข",home:1,e:["🐶","🐶","🐕"]}, rabbit:{n:"กระต่าย",home:1,e:["🐰","🐰","🐇"]}, hamster:{n:"แฮมสเตอร์",home:1,e:["🐹","🐹","🐹"]},
  chicken:{n:"ไก่",home:0,e:["🐣","🐤","🐔"]}, duck:{n:"เป็ด",home:0,e:["🐥","🐥","🦆"]}};
const pfHome = p => (PF_TYPES[p.type] || PF_TYPES.cat).home;
const pfEmoji = (p, st) => (PF_TYPES[p.type] || PF_TYPES.cat).e[{baby:0, teen:1, adult:2}[st]];
const pfGrow = p => .5 + .5 * Math.sqrt(Math.min(1, (Date.now() - (p.born || 0)) / PF_TEEN_MS)); /* โตต่อเนื่อง 0.5→1 เท่า */
function pfAge(p){ const m = Math.floor((Date.now() - (p.born || 0)) / 60000); return m < 60 ? m + " นาที" : m < 1440 ? Math.floor(m / 60) + " ชม." : Math.floor(m / 1440) + " วัน"; }
/* สภาพอากาศสุ่มทุก 4 นาที (สุ่มจากช่วงเวลา ทุกคนเห็นตรงกัน) */
const PF_WX = {sun:["☀️","แจ่มใส","แดดดี สัตว์ออกมาเดินเล่นในฟาร์ม"], cloud:["⛅","ครึ้มฟ้า","ฟ้าครึ้ม ลมเย็น ๆ"], rain:["🌧️","ฝนตก","ฝนตก! สัตว์ฟาร์มวิ่งเข้าเล้า"], storm:["⛈️","พายุ","พายุเข้า! สัตว์ฟาร์มหลบในเล้า"]};
let pfWx = "";
function pfWeather(){
  let h = Math.imul(Math.floor(Date.now() / 240000), 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  const r = (h >>> 0) % 100; return r < 38 ? "sun" : r < 62 ? "cloud" : r < 86 ? "rain" : "storm";
}
function pfPaintWx(){
  const w = pfWeather(), box = $("pfmStageIn"); if(w === pfWx || !box) return; pfWx = w;
  Object.keys(PF_WX).forEach(k => box.classList.toggle("wx-" + k, k === w));
  $("pfmWxChip").textContent = PF_WX[w][0] + " " + PF_WX[w][1]; $("pfmWxNote").textContent = PF_WX[w][2]; $("pfmWinSky").textContent = PF_WX[w][0];
  const cl = (n, d) => Array.from({length:n}, (_, i) => '<i class="cl" style="top:' + (6 + i * 17 % 50) + '%;animation-delay:-' + (i * 9 + d) + 's;animation-duration:' + (34 + i * 7) + 's">☁️</i>').join("");
  $("pfmSky").innerHTML = (w === "sun" || w === "cloud" ? '<i class="sun">☀️</i>' : "") + cl(w === "sun" ? 1 : w === "cloud" ? 3 : w === "rain" ? 4 : 5, 3);
  const nd = w === "rain" ? 26 : w === "storm" ? 46 : 0; let d = "";
  for(let i = 0; i < nd; i++) d += '<s style="left:' + Math.random() * 100 + '%;animation-delay:-' + Math.random() + 's;animation-duration:' + (w === "storm" ? .45 : .7) + 's"></s>';
  $("pfmWx").innerHTML = d + (w === "storm" ? '<b class="bolt" style="animation-delay:-' + Math.random() * 6 + 's"></b>' : "");
  pfMove();
}
/* ===== ร้านไข่: สต็อกรีเฟรชทุก 5 นาที (ทุกคนเติมพร้อมกัน) ===== */
const PF_SHOP_MS = 300000;
const PF_SHOP = [{t:"chicken",price:60,max:5,min:1},{t:"duck",price:60,max:4,min:1},{t:"hamster",price:60,max:3,min:0},{t:"rabbit",price:80,max:2,min:0},{t:"cat",price:120,max:2,min:0},{t:"dog",price:150,max:1,min:0}];
let pfShop = {}, pfShopSlot = 0, pfAud = null;
const pfSlot = () => Math.floor(Date.now() / PF_SHOP_MS);
function pfStock(it, i){
  let h = Math.imul(pfSlot() * 31 + i * 7919 + 1, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  const got = pfShop.slot === pfSlot() ? (pfShop.b || {})[it.t] || 0 : 0;
  return Math.max(0, Math.max(it.min, (h >>> 0) % (it.max + 1)) - got);
}
function pfSound(k){
  try{
    pfAud = pfAud || new (window.AudioContext || window.webkitAudioContext)(); if(pfAud.state === "suspended") pfAud.resume();
    (k === "buy" ? [660, 990] : [784, 988, 1175, 1568]).forEach((f, i) => {
      const o = pfAud.createOscillator(), g = pfAud.createGain(), t = pfAud.currentTime + i * .13;
      o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.25, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .35);
      o.connect(g); g.connect(pfAud.destination); o.start(t); o.stop(t + .4);
    });
  }catch(e){}
}
function pfToast(txt){ const t = $("pfmToast"); if(!t) return; t.textContent = txt; t.classList.remove("show"); void t.offsetWidth; t.classList.add("show"); }
function pfPaintShop(){
  const l = $("pfmShopList"); if(!l) return;
  l.innerHTML = PF_SHOP.map((it, i) => { const n = pfStock(it, i);
    return '<div class="pfm-item' + (n ? "" : " out") + '"><span>' + pfEggFor(it.t, 38) + '</span><b>ไข่' + PF_TYPES[it.t].n + '</b><small>🪙 ' + it.price + ' · เหลือ ' + n + '</small><button data-pfbuy="' + it.t + '" type="button"' + (n && pfCoins >= it.price ? "" : " disabled") + '>' + (n ? "ซื้อ" : "หมด") + '</button></div>'; }).join("");
}
function pfBuy(t){
  const i = PF_SHOP.findIndex(x => x.t === t), it = PF_SHOP[i]; if(!it || !currentUser || pfStock(it, i) < 1 || pfCoins < it.price) return;
  const sl = pfSlot(); if(pfShop.slot !== sl) pfShop = {slot:sl, b:{}};
  pfShop.b = pfShop.b || {}; pfShop.b[t] = (pfShop.b[t] || 0) + 1; pfCoins -= it.price;
  const key = "e" + Date.now().toString(36) + Math.floor(Math.random() * 99), egg = {type:t}; pfBag[key] = egg;
  const up = {coins:pfCoins, shop:pfShop}; up["bag/" + key] = egg;
  db.ref("petfarm/saves/" + currentUser.uid).update(up).catch(e => console.error(e));
  pfQAdd("buyegg"); pfSound("buy"); pfPaintCur(); pfPaintShop(); pfPaintFood(); pfPaintBag(); pfToast("🥚 ได้ไข่" + PF_TYPES[t].n + "แล้ว! อยู่ในกระเป๋า 🎒");
}
function pfShopTick(){
  const sl = pfSlot(), r = (sl + 1) * PF_SHOP_MS - Date.now(), t = $("pfmShopT");
  if(t) t.textContent = Math.floor(r / 60000) + ":" + String(Math.floor(r % 60000 / 1000)).padStart(2, "0");
  if(sl !== pfShopSlot){ const first = !pfShopSlot; pfShopSlot = sl; pfPaintShop(); if(!first){ pfSound("stock"); pfToast("🥚 ร้านไข่เติม stock แล้ว!"); } }
}
function pfAddCoins(n, noQ){
  pfCoins += n; if(n > 0 && !noQ) pfQAdd("earn", n); pfPaintCur(); pfPaintShop(); pfPaintFood();
  if(currentUser && firebaseReady) db.ref("petfarm/saves/" + currentUser.uid + "/coins").set(pfCoins).catch(e => console.error(e));
}
/* ===== ปลูกข้าว + เครื่องบดอาหารสัตว์ ===== */
const PF_RICE_MS = 6 * 60000, PF_MILL_MS = 10000;
let pfBag = {}, pfInv = {seeds:0, rice:0, feed:0, catfood:0, dogfood:0, rabbitfood:0, hamsterfood:0, chickenegg:0, duckegg:0}, pfPlots = {}, pfMill = null, pfMillSig = "";
function pfSaveFarm(){
  if(!currentUser || !firebaseReady) return;
  db.ref("petfarm/saves/" + currentUser.uid).update({seeds:pfInv.seeds, rice:pfInv.rice, feed:pfInv.feed, catfood:pfInv.catfood, dogfood:pfInv.dogfood, rabbitfood:pfInv.rabbitfood, hamsterfood:pfInv.hamsterfood, chickenegg:pfInv.chickenegg, duckegg:pfInv.duckegg, plots:Object.keys(pfPlots).length ? pfPlots : null, mill:pfMill}).catch(e => console.error(e));
}
function pfPaintPlots(){
  const box = $("pfmPlots"); if(!box) return;
  let h = "";
  for(let i = 0; i < 6; i++){
    const pl = pfPlots[i], pr = pl ? Math.min(1, (Date.now() - pl.at) / PF_RICE_MS) : 0;
    h += '<div class="pfm-plot ' + (!pl ? "empty" : pr >= 1 ? "ripe" : "grow") + '" data-plot="' + i + '" style="left:' + PF_PLOTXY[i][0] + '%;top:' + PF_PLOTXY[i][1] + '%">' + (!pl ? "" : pr >= 1 ? "🌾" : pr > .34 ? "🌿" : "🌱") + '</div>';
  }
  if(box.dataset.h !== h){ box.dataset.h = h; box.innerHTML = h; }
  const f = $("pfmFarmInv"); if(f) f.textContent = "🌱 เมล็ดข้าว " + pfInv.seeds + " · 🌾 ข้าว " + pfInv.rice + " · แตะแปลงเพื่อปลูก/เก็บเกี่ยว";
}
function pfPlotTap(i){
  const pl = pfPlots[i];
  if(!pl){ if(pfInv.seeds < 1) return pfToast("🌱 ไม่มีเมล็ดข้าวแล้ว"); pfInv.seeds--; pfPlots[i] = {at:Date.now()}; pfQAdd("plant"); }
  else if(Date.now() - pl.at >= PF_RICE_MS){ pfMeAnim("rice", 1000); delete pfPlots[i]; pfInv.rice += 2; pfInv.seeds += 1; pfSound("buy"); pfToast("🌾 เก็บเกี่ยวได้ข้าว 2 + เมล็ด 1"); pfQAdd("harvest"); }
  else return pfToast("🌿 ข้าวกำลังโต อีกประมาณ " + Math.ceil((pl.at + PF_RICE_MS - Date.now()) / 60000) + " นาที");
  pfSaveFarm(); pfPaintPlots(); pfPaintMill(); pfPaintSell();
}
const pfMillState = () => !pfMill ? "idle" : Date.now() - pfMill.at >= PF_MILL_MS ? "done" : "run";
function pfPaintMill(){
  const b = $("pfmMillBody"); if(!b) return;
  const st = pfMillState(), sig = st + pfInv.rice + "|" + pfInv.feed + "|" + pfInv.seeds;
  if(sig === pfMillSig){ const bar = $("pfmMBar"); if(bar && pfMill) bar.style.width = Math.min(100, (Date.now() - pfMill.at) / PF_MILL_MS * 100) + "%"; return; }
  pfMillSig = sig;
  b.innerHTML = '<div class="pfm-mach' + (st === "run" ? " run" : "") + '">⚙️</div><div class="pfm-mside">'
    + '<div>🌱 เมล็ด ' + pfInv.seeds + ' · 🌾 ข้าว ' + pfInv.rice + ' · 🥣 อาหารสัตว์ ' + pfInv.feed + '</div>'
    + '<small>ข้าว 2 → อาหารไก่/เป็ด 1 ถุง (บด 10 วินาที)</small>'
    + (st === "run" ? '<div class="pfm-mbar"><i id="pfmMBar" style="width:0"></i></div>' : "")
    + '<button class="btn primary" data-pfmill="' + st + '" type="button"' + ((st === "idle" && pfInv.rice < 2) || st === "run" ? " disabled" : "") + '>' + (st === "done" ? "รับอาหารสัตว์ 🥣" : st === "run" ? "กำลังบด..." : "บดข้าว") + '</button></div>';
}
function pfMillTap(){
  const st = pfMillState();
  if(st === "idle"){ if(pfInv.rice < 2) return; pfInv.rice -= 2; pfMill = {at:Date.now()}; pfSound("buy"); }
  else if(st === "done"){ pfInv.feed += 1; pfMill = null; pfSound("stock"); pfToast("🥣 ได้อาหารสัตว์ 1 ถุง"); pfQAdd("mill"); }
  else return;
  pfSaveFarm(); pfPaintMill(); pfPaintPlots(); pfPaintCare(); pfPaintSell();
}
/* ===== ร้านรับซื้อผลผลิต: ข้าว ไข่ไก่ ไข่เป็ด ===== */
const PF_SELL = [{k:"rice",e:"🌾",n:"ข้าว",u:"ต้น",price:5}, {k:"chickenegg",e:"🥚",n:"ไข่ไก่",u:"ฟอง",price:10,f:["#fff1dc","#e0b890"]}, {k:"duckegg",e:"🥚",n:"ไข่เป็ด",u:"ฟอง",price:12,f:["#e8f8ef","#8fd0b0"]}];
function pfPaintSell(){
  const l = $("pfmSellList"); if(!l) return;
  l.innerHTML = PF_SELL.map(it => { const n = pfInv[it.k] || 0;
    return '<div class="pfm-item' + (n ? "" : " out") + '"><span>' + (it.f ? pfPlainEgg(it.f[0], it.f[1], 38) : '<b style="font-size:34px">' + it.e + '</b>') + '</span><b>' + it.n + '</b><small>มี ' + n + ' ' + it.u + ' · ' + it.u + 'ละ 🪙 ' + it.price + '</small>'
      + '<button data-pfsell="' + it.k + ':1" type="button"' + (n ? "" : " disabled") + '>ขาย 1</button>'
      + '<button data-pfsell="' + it.k + ':all" type="button"' + (n ? "" : " disabled") + '>ขายทั้งหมด (+' + n * it.price + ')</button></div>'; }).join("");
}
function pfSellItem(arg){
  const a = String(arg).split(":"), it = PF_SELL.find(x => x.k === a[0]); if(!it) return;
  const have = pfInv[it.k] || 0, n = a[1] === "all" ? have : Math.min(+a[1] || 0, have);
  if(n < 1) return pfToast(it.e + " ไม่มี" + it.n + "ให้ขาย");
  pfInv[it.k] -= n; pfSaveFarm(); pfAddCoins(n * it.price); pfQAdd("sell", n);
  pfSound("buy"); pfToast(it.e + " ขาย" + it.n + " " + n + " " + it.u + " ได้ 🪙 " + n * it.price);
  pfPaintSell(); pfPaintPlots(); pfPaintMill(); pfPaintBag();
}
/* ===== เควสประจำวัน: 10 เควส รีเซ็ตทุกเที่ยงคืน (เวลาเครื่อง) ได้ XP + เพชร ===== */
const qs = (tier, arr) => arr.map(a => ({tier:tier, k:a[0], g:a[1], t:a[2], e:a[3], id:a[0] + "_" + a[1]}));
const PF_QPOOL = [].concat(
  qs("e", [["wash",2,"อาบน้ำสัตว์เลี้ยง 2 ครั้ง","🛁"], ["feed",2,"ให้อาหารสัตว์เลี้ยง 2 ครั้ง","🍖"], ["play",2,"เล่นกับสัตว์เลี้ยง 2 ครั้ง","🎾"], ["sleep",3,"ให้สัตว์เลี้ยงนอนหลับ 3 ครั้ง","😴"],
    ["plant",2,"ปลูกข้าว 2 แปลง","🌱"], ["buyegg",1,"ซื้อไข่จากร้านไข่ 1 ฟอง","🥚"], ["buyfood",1,"ซื้ออาหารสัตว์เลี้ยง 1 ถุง","🛒"], ["earn",30,"หาเหรียญให้ได้ 30 🪙","🪙"]]),
  qs("m", [["wash",5,"อาบน้ำสัตว์เลี้ยง 5 ครั้ง","🛁"], ["feed",4,"ให้อาหารสัตว์เลี้ยง 4 ครั้ง","🍖"], ["play",5,"เล่นกับสัตว์เลี้ยง 5 ครั้ง","🎾"], ["plant",4,"ปลูกข้าว 4 แปลง","🌱"],
    ["harvest",2,"เก็บเกี่ยวข้าว 2 แปลง","🌾"], ["mill",1,"บดข้าวแล้วรับอาหารสัตว์ 1 ครั้ง","⚙️"], ["incubate",1,"ใส่ไข่เข้าตู้ฟัก 1 ฟอง","🥚"], ["sell",4,"ขายผลผลิต 4 ชิ้น","🧺"],
    ["hatch",1,"ฟักไข่ให้ออกเป็นตัว 1 ฟอง","🐣"], ["earn",80,"หาเหรียญให้ได้ 80 🪙","🪙"], ["buyfood",3,"ซื้ออาหารสัตว์เลี้ยง 3 ถุง","🛒"]]),
  qs("h", [["harvest",6,"เก็บเกี่ยวข้าว 6 แปลง","🌾"], ["mill",2,"บดข้าวแล้วรับอาหารสัตว์ 2 ครั้ง","⚙️"], ["hatch",2,"ฟักไข่ให้ออกเป็นตัว 2 ฟอง","🐣"], ["earn",200,"หาเหรียญให้ได้ 200 🪙","🪙"],
    ["sell",10,"ขายผลผลิต 10 ชิ้น","🧺"], ["feed",10,"ให้อาหารสัตว์เลี้ยง 10 ครั้ง","🍖"], ["play",10,"เล่นกับสัตว์เลี้ยง 10 ครั้ง","🎾"], ["plant",6,"ปลูกข้าวให้ครบ 6 แปลง","🌱"]]));
/* รางวัลตามระดับความยาก: ยิ่งยากยิ่งได้เยอะ */
const PF_QTIER = {e:{n:"ง่าย", xp:10, gem:1, coin:10}, m:{n:"กลาง", xp:25, gem:2, coin:30}, h:{n:"ยาก", xp:50, gem:4, coin:80}};
function pfRng(seed){ let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/* สุ่มเควสวันละ 10 ข้อ (ง่าย 4 กลาง 4 ยาก 2) จากเลขวัน ทุกเครื่องได้ชุดเดียวกัน แต่ละวันไม่เหมือนกัน และพยายามไม่ให้ซ้ำชนิดกันในวันเดียว */
function pfPickQuests(day){
  const rnd = pfRng(Math.imul(day, 2654435761) + 1013904223), used = {}, out = [];
  [["h", 2], ["m", 4], ["e", 4]].forEach(tn => {
    const pool = PF_QPOOL.filter(q => q.tier === tn[0]), got = [];
    for(let i = pool.length - 1; i > 0; i--){ const j = Math.floor(rnd() * (i + 1)); const x = pool[i]; pool[i] = pool[j]; pool[j] = x; }
    pool.forEach(q => { if(got.length < tn[1] && !used[q.k]){ got.push(q); used[q.k] = 1; } });
    pool.forEach(q => { if(got.length < tn[1] && got.indexOf(q) < 0) got.push(q); });
    got.forEach(q => out.push(Object.assign({}, q, PF_QTIER[q.tier], {tn:PF_QTIER[q.tier].n})));
  });
  const ord = {e:0, m:1, h:2};
  return out.sort((a, b) => ord[a.tier] - ord[b.tier]);
}
let pfQCache = {day:-1, list:[]};
function pfQList(){ const d = pfQ.day || pfDayNo(); if(pfQCache.day !== d) pfQCache = {day:d, list:pfPickQuests(d)}; return pfQCache.list; }
let pfLv = 1, pfXp = 0, pfQ = {day:0, p:{}, cl:{}}, pfLoaded = false;
const pfDayNo = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
function pfSaveProg(){
  if(!pfLoaded || !currentUser || !firebaseReady) return;
  db.ref("petfarm/saves/" + currentUser.uid).update({gems:pfGems, lv:pfLv, xp:pfXp, quests:pfQ}).catch(e => console.error(e));
}
function pfGainXp(n){
  pfXp += n; let up = 0;
  while(pfXp >= lvXpNeed(pfLv)){ pfXp -= lvXpNeed(pfLv); pfLv++; up++; }
  pfPaintLevel(pfLv, pfXp); return up;
}
function pfQuestCheck(){
  const d = pfDayNo(); if(!pfLoaded || pfQ.day === d) return;
  pfQ = {day:d, p:{}, cl:{}}; pfSaveProg(); pfPaintQuest();
}
function pfQAdd(k, n){
  if(!pfLoaded) return; pfQuestCheck();
  pfQ.p[k] = (pfQ.p[k] || 0) + (n == null ? 1 : n);
  pfSaveProg(); pfPaintQuest();
}
function pfPaintQuest(){
  const l = $("pfmQList"); if(!l) return;
  const list = pfQList(); let done = 0, ready = 0;
  l.innerHTML = list.map(q => {
    const pr = Math.min(q.g, pfQ.p[q.k] || 0), ok = pr >= q.g, cl = !!pfQ.cl[q.id];
    if(cl) done++; else if(ok) ready++;
    return '<div class="pfm-q' + (cl ? " claimed" : ok ? " ready" : "") + '"><span class="pfm-qi">' + q.e + '</span><div class="pfm-qm"><div class="pfm-qtt"><em class="pfm-qt t-' + q.tier + '">' + q.tn + '</em><b>' + q.t + '</b></div><div class="pfm-qbar"><i style="width:' + (pr / q.g * 100) + '%"></i></div><small>' + pr + " / " + q.g + '</small></div>'
      + '<div class="pfm-qr"><span>✨ ' + q.xp + ' XP</span><span>💎 ' + q.gem + '</span><span>🪙 ' + q.coin + '</span></div>'
      + '<button data-pfqclaim="' + q.id + '" type="button"' + (ok && !cl ? "" : " disabled") + '>' + (cl ? "รับแล้ว ✓" : ok ? "รับ" : "ยังไม่ครบ") + '</button></div>';
  }).join("");
  const d = $("pfmQDone"); if(d) d.textContent = "สำเร็จ " + done + " / " + list.length;
  const b = $("pfmQBadge"); if(b){ b.textContent = ready; b.classList.toggle("hidden", !ready); }
}
function pfQClaim(id){
  if(!pfLoaded) return; pfQuestCheck();
  const q = pfQList().find(x => x.id === id); if(!q) return;
  if((pfQ.p[q.k] || 0) < q.g || pfQ.cl[id]) return;
  pfQ.cl[id] = 1; pfGems += q.gem; const up = pfGainXp(q.xp);
  pfAddCoins(q.coin, true); pfSaveProg(); pfPaintCur(); pfPaintQuest(); pfSound(up ? "stock" : "buy");
  pfToast("📜 +" + q.xp + " XP · +" + q.gem + " 💎 · +" + q.coin + " 🪙" + (up ? " · 🎉 เลเวลอัป Lv." + pfLv : ""));
}
function pfQOpen(on){
  const m = $("pfmQuest"); if(!m) return;
  m.classList.toggle("hidden", !on);
  if(on){ const s = $("pfmSet"); if(s) s.classList.add("hidden"); pfQuestCheck(); pfPaintQuest(); pfQuestTick(); }
}
function pfQuestTick(){
  pfQuestCheck();
  const t = $("pfmQTime"), m = $("pfmQuest"); if(!t || !m || m.classList.contains("hidden")) return;
  const r = Math.max(0, Math.floor(((pfDayNo() + 1) * 86400000 + new Date().getTimezoneOffset() * 60000 - Date.now()) / 1000));
  t.textContent = String(Math.floor(r / 3600)).padStart(2, "0") + ":" + String(Math.floor(r % 3600 / 60)).padStart(2, "0") + ":" + String(r % 60).padStart(2, "0");
}
/* ===== ร้านอาหารสัตว์เลี้ยง + กระเป๋า ===== */
const PF_FOODSHOP = [{k:"catfood",e:"🐟",n:"อาหารแมว"}, {k:"dogfood",e:"🦴",n:"อาหารหมา"}, {k:"rabbitfood",e:"🥕",n:"อาหารกระต่าย"}, {k:"hamsterfood",e:"🌻",n:"อาหารแฮมสเตอร์"}], PF_FOOD_PRICE = 20;
/* ถุงอาหารแต่ละชนิดหน้าตาต่างกัน: [ทรงถุง, สีถุง, สีขอบ] */
const PF_BAGSTYLE = {catfood:["sack","#ffc2d6","#f090b0"], dogfood:["box","#f4b06a","#c9803a"], rabbitfood:["paper","#bfe8a8","#7fc25f"], hamsterfood:["pouch","#ffe08a","#e6b84a"], feed:["sack","#e9d3a8","#b9955a"]};
function pfBagSvg(k, e){
  const st = PF_BAGSTYLE[k] || PF_BAGSTYLE.feed;
  const body = {sack:'<path d="M10 20Q4 38 10 52H38Q44 38 38 20Z"/><path d="M16 20L18 10H30L32 20"/><path d="M17 14H31" fill="none" stroke="#ffd37a" stroke-width="3"/>',
    box:'<path d="M8 12L12 8L16 12L20 8L24 12L28 8L32 12L36 8L40 12V52H8Z"/><rect x="12" y="26" width="24" height="20" rx="4" fill="#fff" stroke="none" opacity=".75"/>',
    paper:'<path d="M10 14H38V52H10Z"/><path d="M10 14L24 24L38 14" fill="#fff" opacity=".55"/>',
    pouch:'<path d="M12 22Q6 52 24 52Q42 52 36 22Z"/><rect x="12" y="16" width="24" height="7" rx="3.5" fill="#fff6c4"/>'}[st[0]];
  return '<svg viewBox="0 0 48 56" width="40" height="46" aria-hidden="true"><g fill="' + st[1] + '" stroke="' + st[2] + '" stroke-width="2" stroke-linejoin="round">' + body + '</g><text x="24" y="43" font-size="16" text-anchor="middle">' + e + '</text></svg>';
}
const PF_FOOD = {cat:["catfood","🐟","อาหารแมว"], dog:["dogfood","🦴","อาหารหมา"], rabbit:["rabbitfood","🥕","อาหารกระต่าย"], hamster:["hamsterfood","🌻","อาหารแฮมสเตอร์"], chicken:["feed","🥣","อาหารสัตว์"], duck:["feed","🥣","อาหารสัตว์"]};
const pfFeedLbl = p => { const f = PF_FOOD[p.type]; return f ? f[1] + " " + f[2] + " (" + pfInv[f[0]] + ")" : "🍖 อาหาร"; };
function pfPaintFood(){
  const l = $("pfmFoodList"); if(!l) return;
  l.innerHTML = PF_FOODSHOP.map(f => '<div class="pfm-item"><span>' + pfBagSvg(f.k, f.e) + '</span><b>' + f.n + '</b><small>🪙 ' + PF_FOOD_PRICE + ' · มี ' + pfInv[f.k] + '</small><button data-pffood="' + f.k + '" type="button"' + (pfCoins >= PF_FOOD_PRICE ? "" : " disabled") + '>ซื้อ</button></div>').join("");
}
function pfBuyFood(k){
  const f = PF_FOODSHOP.find(x => x.k === k); if(!f || pfCoins < PF_FOOD_PRICE) return;
  pfInv[k]++; pfSaveFarm(); pfAddCoins(-PF_FOOD_PRICE); pfQAdd("buyfood"); pfSound("buy"); pfToast(f.e + " ซื้อ" + f.n + "แล้ว"); pfPaintFood(); pfPaintBag();
}
function pfPaintBag(){
  const l = $("pfmBagList"); if(!l) return;
  const eg = Object.keys(pfBag).map(k => '<div class="pfm-item"><span>' + pfEggFor(pfBag[k].type, 38) + '</span><b>ไข่' + ((PF_TYPES[pfBag[k].type] || {}).n || "") + '</b><button data-pfinc="' + pfEsc(k) + '" type="button">ใส่ตู้ฟัก</button></div>').join("");
  const fd = PF_FOODSHOP.map(f => [f.e, f.n, f.k]).concat([["🥣","อาหารสัตว์","feed"]]).map(f => '<div class="pfm-item' + (pfInv[f[2]] ? "" : " out") + '"><span>' + pfBagSvg(f[2], f[0]) + '</span><b>' + f[1] + '</b><small>มี ' + pfInv[f[2]] + '</small></div>').join("");
  const pr = [["chickenegg","ไข่ไก่","#fff1dc","#e0b890"], ["duckegg","ไข่เป็ด","#e8f8ef","#8fd0b0"]].map(f => '<div class="pfm-item' + (pfInv[f[0]] ? "" : " out") + '"><span>' + pfPlainEgg(f[2], f[3], 38) + '</span><b>' + f[1] + '</b><small>ผลผลิต · มี ' + pfInv[f[0]] + '</small></div>').join("");
  l.innerHTML = eg + fd + pr;
}
function pfIncubate(k){
  const e = pfBag[k]; if(!e) return;
  delete pfBag[k]; pfEggs[k] = {type:e.type, at:Date.now()};
  if(currentUser && firebaseReady){ const up = {}; up["bag/" + k] = null; up["eggs/" + k] = pfEggs[k]; db.ref("petfarm/saves/" + currentUser.uid).update(up).catch(err => console.error(err)); }
  pfQAdd("incubate"); pfSound("buy"); pfToast("🥚 ใส่ไข่เข้าตู้ฟักแล้ว แตะที่บ้านเพื่อดูตู้ฟัก"); pfPaintBag(); pfPaintPen();
}
/* ===== ไก่/เป็ดโตเต็มวัยออกไข่ให้เก็บ (ต้องไม่ป่วยและไม่หิว) ===== */
const PF_LAY = {chicken:240000, duck:300000}, PF_LAY_MAX = 3; /* ms ต่อฟอง, ค้างได้สูงสุด 3 ฟอง */
function pfLay(){
  Object.keys(pfPets).forEach(id => {
    const p = pfPets[id], iv = PF_LAY[p.type], now = Date.now(); if(!iv || p.sick || pfStage(p) !== "adult") return;
    p.eggs = p.eggs || 0;
    if(!p.lay || p.eggs >= PF_LAY_MAX || pfStat(p, "hunger") < 30){ p.lay = now; return; }
    const n = Math.min(PF_LAY_MAX - p.eggs, Math.floor((now - p.lay) / iv));
    if(n > 0){ p.eggs += n; p.lay = p.eggs >= PF_LAY_MAX ? now : p.lay + n * iv; pfSavePet(p); }
  });
}
function pfCollect(id){
  const p = pfPets[id]; if(!p || !(p.eggs > 0)) return; pfMeAnim("egg", 1000);
  const n = p.eggs, k = p.type === "duck" ? "duckegg" : "chickenegg"; pfInv[k] += n; p.eggs = 0;
  pfSavePet(p); pfSaveFarm(); pfPaintSell(); pfSound("buy"); pfToast("🧺 เก็บไข่" + (p.type === "duck" ? "เป็ด" : "ไก่") + " " + n + " ฟอง ไว้ในกระเป๋า"); pfPaintPen(); pfPaintBag();
}
const pfPlainEgg = (f, st, h) => '<svg viewBox="0 0 64 80" width="' + Math.round(h * .8) + '" height="' + h + '" aria-hidden="true"><path d="' + PF_EGGP + '" fill="' + f + '" stroke="' + st + '" stroke-width="3"/><ellipse cx="22" cy="28" rx="4" ry="8" fill="#fff" opacity=".7" transform="rotate(25 22 28)"/></svg>';
function pfZone(p){ return p.type === "duck" ? {x:[77,90], y:[55,65]} : p.type === "chicken" ? {x:[7,24], y:[43,55]} : {x:[27,60], y:[46,62]}; }
function pfSpot(p){
  if(!pfHome(p) && (pfWx === "rain" || pfWx === "storm")) return p.type === "duck" ? {x:83 + Math.random() * 7, y:35 + Math.random() * 4} : {x:14 + Math.random() * 9, y:34 + Math.random() * 4};
  const z = pfZone(p); return {x:z.x[0] + Math.random() * (z.x[1] - z.x[0]), y:z.y[0] + Math.random() * (z.y[1] - z.y[0])};
}
const PF_CRACK = '<svg class="pfm-crack" viewBox="0 0 64 80" aria-hidden="true"><path d="M10 44l9-7 7 9 7-10 8 9 9-8" fill="none" stroke="#9a7a6a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PF_EGGP = "M32 4C48 4 58 30 58 50C58 66 46 77 32 77C18 77 6 66 6 50C6 30 16 4 32 4Z";
const PF_EYES = '<ellipse cx="23.5" cy="45" rx="3.4" ry="4.4" fill="#5a4a6a"/><ellipse cx="40.5" cy="45" rx="3.4" ry="4.4" fill="#5a4a6a"/><circle cx="24.7" cy="43.5" r="1.3" fill="#fff"/><circle cx="41.7" cy="43.5" r="1.3" fill="#fff"/>';
const PF_CHEEK = '<ellipse cx="15.5" cy="54" rx="4" ry="2.6" fill="#ffb3cf" opacity=".8"/><ellipse cx="48.5" cy="54" rx="4" ry="2.6" fill="#ffb3cf" opacity=".8"/>';
/* ไข่แต่ละชนิดหน้าตาต่างกัน: [วาดหลังไข่, วาดหน้าไข่, สีไข่, สีขอบ] (แมวใช้ pfEggSvg) */
const PF_EGGD = {
  dog:['<path d="M10 22C2 24 2 46 9 48C14 44 15 32 14 24Z" fill="#b97a44" stroke="#8a5530" stroke-width="2"/><path d="M54 22C62 24 62 46 55 48C50 44 49 32 50 24Z" fill="#b97a44" stroke="#8a5530" stroke-width="2"/>',
    '<ellipse cx="22" cy="44" rx="9" ry="10" fill="#d9a066" opacity=".6"/>' + PF_EYES + '<ellipse cx="32" cy="53" rx="4.2" ry="3" fill="#4a3a3a"/><path d="M32 56v2M27 58c2 2.4 5 2.4 5 0c0 2.4 3 2.4 5 0" fill="none" stroke="#9a7a6a" stroke-width="1.6" stroke-linecap="round"/><path d="M30 60h4v3.5a2 2 0 0 1-4 0z" fill="#ff8fa8"/>', "#fff3e0", "#d9a066"],
  rabbit:['<ellipse cx="22" cy="12" rx="5.5" ry="11" fill="#fff" stroke="#f0a8c8" stroke-width="2.5"/><ellipse cx="22" cy="13" rx="2.5" ry="7" fill="#ffc2d6"/><ellipse cx="42" cy="12" rx="5.5" ry="11" fill="#fff" stroke="#f0a8c8" stroke-width="2.5"/><ellipse cx="42" cy="13" rx="2.5" ry="7" fill="#ffc2d6"/>',
    PF_EYES + PF_CHEEK + '<path d="M29.5 51h5l-2.5 3z" fill="#ff8fb8"/><rect x="29.6" y="55" width="2.3" height="4.5" rx=".8" fill="#fff" stroke="#d9b8c8" stroke-width=".9"/><rect x="32.1" y="55" width="2.3" height="4.5" rx=".8" fill="#fff" stroke="#d9b8c8" stroke-width=".9"/><path d="M8 50h-5M9 55l-5 2M56 50h5M55 55l5 2" stroke="#d9b8c8" stroke-width="1.5" stroke-linecap="round"/>', "#fff8fb", "#f0a8c8"],
  hamster:['<circle cx="14" cy="15" r="7" fill="#ffd08a" stroke="#d9a24a" stroke-width="2.5"/><circle cx="14" cy="15" r="3.4" fill="#ffb3a8"/><circle cx="50" cy="15" r="7" fill="#ffd08a" stroke="#d9a24a" stroke-width="2.5"/><circle cx="50" cy="15" r="3.4" fill="#ffb3a8"/>',
    '<path d="M32 9v11" stroke="#d9a24a" stroke-width="4" stroke-linecap="round"/><ellipse cx="32" cy="63" rx="14" ry="10" fill="#fff8ea"/><ellipse cx="13" cy="55" rx="7" ry="6" fill="#ffc98a"/><ellipse cx="51" cy="55" rx="7" ry="6" fill="#ffc98a"/>' + PF_EYES + '<circle cx="32" cy="51" r="2.3" fill="#ff8fb8"/><rect x="30" y="54" width="1.9" height="3.6" rx=".6" fill="#fff" stroke="#c9a070" stroke-width=".8"/><rect x="32.1" y="54" width="1.9" height="3.6" rx=".6" fill="#fff" stroke="#c9a070" stroke-width=".8"/>', "#ffe2a8", "#d9a24a"],
  chicken:['<path d="M24 11C22 3 27 2 28 7C28 1 36 1 36 7C37 2 42 3 40 11Z" fill="#ff5f6d" stroke="#d93a4a" stroke-width="2" stroke-linejoin="round"/>',
    '<circle cx="18" cy="30" r="1.4" fill="#d9a070"/><circle cx="46" cy="34" r="1.4" fill="#d9a070"/><circle cx="14" cy="64" r="1.4" fill="#d9a070"/><circle cx="48" cy="62" r="1.4" fill="#d9a070"/><circle cx="31" cy="30" r="1.4" fill="#d9a070"/>' + PF_EYES.replace(/rx="3.4" ry="4.4"/g, 'rx="3" ry="3.6"') + PF_CHEEK + '<path d="M27.5 49h9L32 56z" fill="#ffb347" stroke="#e08a1e" stroke-width="1.5" stroke-linejoin="round"/><ellipse cx="32" cy="61" rx="3" ry="4" fill="#ff5f6d"/>', "#fff1dc", "#e0b890"],
  duck:['<path d="M32 4C28 -1 36 -1 34 3C37 0 38 5 32 5Z" fill="#ffd84a" stroke="#e0b020" stroke-width="1.5"/>',
    '<path d="M6 56C14 50 18 62 12 68C8 66 6 62 6 56Z" fill="#cfeedd" stroke="#8fd0b0" stroke-width="2"/><path d="M58 56C50 50 46 62 52 68C56 66 58 62 58 56Z" fill="#cfeedd" stroke="#8fd0b0" stroke-width="2"/>' + PF_EYES.replace(/cy="45"/g, 'cy="42"').replace(/cy="43.5"/g, 'cy="40.5"') + PF_CHEEK.replace(/cy="54"/g, 'cy="51"') + '<ellipse cx="32" cy="54" rx="10.5" ry="5.2" fill="#ffc933" stroke="#e0a010" stroke-width="2"/><circle cx="28.5" cy="53" r="1" fill="#c98a10"/><circle cx="35.5" cy="53" r="1" fill="#c98a10"/>', "#e8f8ef", "#8fd0b0"]
};
function pfEggFor(t, h){
  const d = PF_EGGD[t]; if(!d) return pfEggSvg(h);
  return '<svg viewBox="0 0 64 80" width="' + Math.round(h * .8) + '" height="' + h + '" aria-hidden="true">' + d[0] + '<path d="' + PF_EGGP + '" fill="' + d[2] + '" stroke="' + d[3] + '" stroke-width="3"/>' + d[1] + '<ellipse cx="19" cy="26" rx="3.5" ry="7" fill="#fff" opacity=".6" transform="rotate(25 19 26)"/></svg>';
}
const PF_STAT = {hunger:["🍖",12], mood:["💖",8], clean:["🛁",6], energy:["⚡",5]}; /* [ไอคอน, ลด/ชั่วโมง] */
const PF_PERS = {playful:{n:"ขี้เล่น",mood:1.5}, cuddly:{n:"ขี้อ้อน",mood:1.3,hunger:1.1}, lazy:{n:"ขี้เกียจ",energy:.5,hunger:1.2}, shy:{n:"ขี้อาย",clean:.8}, naughty:{n:"ซน",clean:1.5}};
const PF_STAGE = {baby:"ลูกสัตว์", teen:"วัยรุ่น", adult:"โตเต็มวัย"};
const PF_NAMES = ["มะลิ","โมจิ","ส้มโอ","ข้าวปั้น","ทองหยิบ","น้ำตาล","บุ๋ม","ถุงเงิน"];
let pfPets = {}, pfSel = "", pfTickT = null, pfMoveT = null, pfTickN = 0, pfSig = "", pfPos = {};
const pfRand = a => a[Math.floor(Math.random() * a.length)];
function pfStat(p, k){
  const hrs = Math.max(0, (Date.now() - (p.last || Date.now())) / 3600000);
  const m = (PF_PERS[p.pers] || {})[k] || 1;
  return Math.max(0, Math.min(100, (p[k] == null ? 80 : p[k]) - PF_STAT[k][1] * m * hrs));
}
function pfSnap(p){ const s = {}; Object.keys(PF_STAT).forEach(k => { s[k] = pfStat(p, k); }); return s; }
function pfStage(p){ const a = Date.now() - (p.born || 0); return a < PF_BABY_MS ? "baby" : a < PF_TEEN_MS ? "teen" : "adult"; }
function pfHatchAt(e){ return (e.at || 0) + PF_HATCH_MS; }
function pfSigOf(){ return Object.keys(pfPets).map(id => id + pfStage(pfPets[id]) + (pfPets[id].sick ? 1 : 0) + (pfPets[id].eggs || 0)).join("|"); }
function pfSavePet(p){
  if(!currentUser || !firebaseReady) return;
  db.ref("petfarm/saves/" + currentUser.uid + "/pets/" + p.id).set(p).catch(e => console.error(e));
}
function pfFx(txt, el){
  const pen = el ? el.parentNode : $("pfmHomePets"); if(!pen) return;
  const f = document.createElement("span"); f.className = "pfm-fx"; f.textContent = txt;
  f.style.left = (el ? el.offsetLeft : pen.clientWidth / 2) + "px";
  f.style.top = (el ? el.offsetTop - el.offsetHeight / 2 : pen.clientHeight / 2) + "px";
  pen.appendChild(f); setTimeout(() => f.remove(), 900);
}
function pfPaintPen(){
  const hp = $("pfmHomePets"), fp = $("pfmFarmPets"); if(!hp || !fp) return;
  const ek = Object.keys(pfEggs || {}), pk = Object.keys(pfPets), hh = [], fh = [];
  pk.forEach(id => {
    const p = pfPets[id], w = pfPos[id] || (pfPos[id] = pfSpot(p)), st = pfStage(p);
    fh.push('<div class="pfm-pet st-' + st + (id === pfSel ? " sel" : "") + '" data-pid="' + pfEsc(id) + '" style="left:' + w.x + '%;top:' + w.y + '%;z-index:' + Math.round(w.y) + ';--g:' + pfGrow(p).toFixed(3) + '">'
      + '<div class="pfm-pe" style="filter:hue-rotate(' + (p.hue || 0) + 'deg)"><b>' + pfEmoji(p, st) + '</b></div>'
      + '<i class="pfm-pn">' + (p.rare ? "✨" : "") + pfEsc(p.name) + (p.sick ? " 🤒" : "") + '</i>' + (p.eggs > 0 ? '<u class="pfm-lay" data-pflay="' + pfEsc(id) + '">🥚' + (p.eggs > 1 ? p.eggs : "") + '</u>' : "") + '</div>');
  });
  hp.innerHTML = hh.join(""); fp.innerHTML = fh.join(""); pfMeAttach();
  $("pfmEggs").innerHTML = ek.map(k => '<button class="pfm-egg2" data-pfegg="' + pfEsc(k) + '" type="button"><span class="pfm-eg">' + pfEggFor((pfEggs[k] || {}).type, 40) + PF_CRACK + '</span><small data-hat="' + pfEsc(k) + '"></small></button>').join("") || '<span class="pfm-incempty">ว่าง</span>';
  pfSig = pfSigOf(); pfTickEggs(); pfPaintCare(); pfPaintPlots();
}
function pfPaintInv(){ pfPaintPen(); }
function pfPaintCare(){
  const c = $("pfmCare"); if(!c) return;
  const p = pfPets[pfSel];
  if(!p){ c.innerHTML = '<div class="pfm-chint">' + (Object.keys(pfEggs || {}).length ? "🥚 แตะไข่ในตู้ฟักเมื่อครบเวลา ลูกสัตว์จะค่อย ๆ โตตามเวลา" : "👆 แตะพื้นเพื่อเดิน · แตะบ้าน/โรงสี/ร้านต่าง ๆ ในภาพ") + '</div>'; return; }
  const s = pfSnap(p), sick = !!p.sick;
  c.innerHTML = '<div class="pfm-cinfo"><b>' + pfEsc(p.name) + '</b><small>' + ((PF_TYPES[p.type] || {}).n || "") + " · " + PF_STAGE[pfStage(p)] + " " + pfAge(p) + " · " + ((PF_PERS[p.pers] || {}).n || "") + (p.rare ? " · ✨หายาก" : "") + (sick ? " · 🤒ป่วย" : "") + (PF_LAY[p.type] && pfStage(p) !== "adult" ? " · ยังไม่ออกไข่" : "") + '</small></div>'
    + '<div class="pfm-bars">' + Object.keys(PF_STAT).map(k => '<div class="pfm-bar2"><span>' + PF_STAT[k][0] + '</span><div><i class="' + (s[k] > 50 ? "" : s[k] > 25 ? "mid" : "low") + '" style="width:' + Math.round(s[k]) + '%"></i></div></div>').join("") + '</div>'
    + '<div class="pfm-acts">' + (sick ? '<button data-pfact="cure" type="button">💊 รักษา</button>' : "") + (p.eggs > 0 ? '<button data-pfcollect="' + pfEsc(p.id) + '" type="button">🧺 เก็บไข่ (' + p.eggs + ')</button>' : "")
    + '<button data-pfact="feed" type="button">' + pfFeedLbl(p) + '</button><button data-pfact="play" type="button"' + (sick ? " disabled" : "") + '>🎾 เล่น</button>'
    + '<button data-pfact="wash" type="button">🛁 อาบน้ำ</button><button data-pfact="sleep" type="button">😴 นอน</button></div>';
}
function pfTickEggs(){
  document.querySelectorAll("#pfmEggs [data-hat]").forEach(el => {
    const e = pfEggs[el.dataset.hat]; if(!e) return;
    const r = pfHatchAt(e) - Date.now(), pr = 1 - r / PF_HATCH_MS, b = el.parentNode;
    el.textContent = r <= 0 ? "แตะฟัก!" : Math.floor(r / 60000) + ":" + String(Math.floor(r % 60000 / 1000)).padStart(2, "0");
    b.classList.toggle("ready", r <= 0); b.classList.toggle("crk", pr > .55); b.classList.toggle("near", pr > .85 && r > 0);
  });
}
function pfTick(){
  pfTickEggs(); pfPaintWx(); pfShopTick(); pfPaintMill(); pfQuestTick();
  if(++pfTickN % 5) return;
  document.querySelectorAll("#pfmRoom .pfm-pet").forEach(el => { const q = pfPets[el.dataset.pid]; if(q) el.style.setProperty("--g", pfGrow(q).toFixed(3)); }); pfPaintPlots();
  Object.keys(pfPets).forEach(id => {
    const p = pfPets[id]; if(p.sick) return;
    const s = pfSnap(p);
    if(s.hunger <= 3 || s.clean <= 3){ Object.assign(p, s, {sick:true, last:Date.now()}); pfSavePet(p); }
  });
  pfLay();
  if(pfSigOf() !== pfSig) pfPaintPen(); else pfPaintCare();
}
function pfMove(){
  document.querySelectorAll("#pfmRoom .pfm-pet").forEach(el => {
    const id = el.dataset.pid, p = pfPets[id], w = pfPos[id]; if(!p || !w || p.sick) return;
    const bad = !pfHome(p) && (pfWx === "rain" || pfWx === "storm");
    if(bad ? w.y < 42 : Math.random() < .35) return;
    const n = pfSpot(p);
    el.querySelector(".pfm-pe").style.transform = n.x < w.x ? "scaleX(-1)" : "";
    w.x = n.x; w.y = n.y; el.style.left = n.x + "%"; el.style.top = n.y + "%"; el.style.zIndex = Math.round(n.y);
  });
}
function pfHatch(key){
  const e = pfEggs[key]; if(!e || Date.now() < pfHatchAt(e) || !currentUser) return;
  const dn = pfRand(PF_NAMES);
  const name = (prompt("ไข่ฟักแล้ว! ตั้งชื่อสัตว์เลี้ยงของคุณ", dn) || "").trim().slice(0, 12) || dn;
  const id = "p" + Date.now().toString(36), now = Date.now();
  const p = {id:id, type:e.type || "cat", name:name, pers:pfRand(Object.keys(PF_PERS)), hue:pfRand([0,0,0,0,12,-12,25]), rare:Math.random() < .08,
    born:now, hunger:80, mood:80, clean:80, energy:80, last:now, sick:false};
  pfPets[id] = p; delete pfEggs[key]; pfSel = id;
  const up = {}; up["eggs/" + key] = null; up["pets/" + id] = p;
  db.ref("petfarm/saves/" + currentUser.uid).update(up).catch(err => console.error(err));
  pfQAdd("hatch"); pfSetTab(pfHome(p) ? "animal" : "crop");
  const el = document.querySelector('#pfmRoom [data-pid="' + id + '"]'); if(el) pfFx("🎉", el);
}
function pfAct(a){
  const p = pfPets[pfSel]; if(!p) return;
  const el = document.querySelector('#pfmRoom [data-pid="' + pfSel + '"]');
  const s = pfSnap(p);
  if(a === "feed"){
    const f = PF_FOOD[p.type];
    if(f){ if(pfInv[f[0]] < 1) return pfToast(f[1] + " ไม่มี" + f[2] + (f[0] === "feed" ? " ปลูกข้าวแล้วไปบดที่เครื่องบด" : " ไปซื้อที่ร้านอาหาร")); pfInv[f[0]]--; pfSaveFarm(); pfPaintMill(); pfPaintBag(); }
    s.hunger += 35; pfFx("🍖", el);
  }
  else if(a === "play"){
    if(p.sick) return;
    if(s.energy < 10){ pfFx("😫", el); return; }
    pfMeAnim("play", 1200); s.mood += 30; s.energy -= 15; s.hunger -= 5; pfFx("🎾", el);
  }
  else if(a === "wash"){ s.clean += 45; pfFx("🫧", el); }
  else if(a === "sleep"){ s.energy += 40; s.hunger -= 5; pfFx("💤", el); }
  else if(a === "cure"){ p.sick = false; s.hunger = Math.max(s.hunger, 40); s.clean = Math.max(s.clean, 40); pfFx("💊", el); }
  Object.keys(s).forEach(k => { s[k] = Math.max(0, Math.min(100, s[k])); });
  Object.assign(p, s, {last:Date.now()});
  pfSavePet(p); pfPaintPen(); pfAddCoins(2); pfQAdd(a);
}
function pfSetTab(t){
  pfTab = "crop"; pfWalk = null; /* ฉากเดียวตลอด: แตะวัตถุในภาพเพื่อเปิดป๊อปอัป */
  const P = {home:"pfmAnimal", shop:"pfmShop", mill:"pfmMill", food:"pfmFood", sell:"pfmSell", bag:"pfmBag"};
  Object.keys(P).forEach(k => $(P[k]).classList.toggle("hidden", k !== t));
  $("pfmPop").classList.toggle("hidden", !P[t]);
  if(t === "shop") pfPaintShop(); if(t === "food") pfPaintFood(); if(t === "bag") pfPaintBag(); if(t === "sell") pfPaintSell();
  pfPaintPen();
}
/* ===== ตัวละครผู้เล่น: เดินด้วยการแตะหน้าจอ (ฉากในบ้าน + ฟาร์ม) =====
   แตะพื้น = เดินไปที่นั่น · แตะแปลง = เดินไปแล้วปลูก/เก็บเกี่ยว · แตะสัตว์ = เดินไปหา · แตะไข่ที่ค้าง 🥚 = เดินไปเก็บ */
let pfGender = "", pfTab = "animal", pfWalk = null, pfMeRaf = 0, pfMeLast = 0, pfMeAct = "", pfMeActT = 0;
function pfMeAnim(a, ms){ pfMeAct = a; pfMeActT = Date.now() + ms; }
const PF_ME_Z = {animal:{x:[5,95], y:[54,92]}, crop:{x:[4,96], y:[42,94]}}; /* พื้นที่เดินได้ (% ของฉาก) */
const pfMeS = {animal:{x:50, y:80, dir:1}, crop:{x:45, y:80, dir:1}}, pfMeEls = {};
const pfLayerOf = () => $("pfmFarmPets");
const pfScene = () => "crop";
/* แปลงจุดบนหน้าจอเป็นสัดส่วน (0-1) ภายในฉาก: ต้องคิดการหมุนหน้าเกม 90° บนมือถือแนวตั้งด้วย (getBoundingClientRect คืนกรอบหลังหมุน) */
function pfLocal(el, X, Y){
  const r = el.getBoundingClientRect(), rot = (($("pfApp").style.transform) || "").indexOf("rotate") >= 0;
  return rot ? {x:(Y - r.top) / r.height, y:(r.right - X) / r.width} : {x:(X - r.left) / r.width, y:(Y - r.top) / r.height};
}
function pfMeEl(sc){
  if(pfMeEls[sc]) return pfMeEls[sc];
  const d = document.createElement("div"); d.className = "pfm-me";
  d.innerHTML = '<div class="pfm-pe"><i class="pfm-spr"></i></div><i class="pfm-pn"></i>';
  const s = pfMeS[sc]; d.style.left = s.x + "%"; d.style.top = s.y + "%"; d.style.zIndex = Math.round(s.y);
  return pfMeEls[sc] = d;
}
function pfMeAttach(){ /* ชั้นสัตว์ถูกวาดใหม่บ่อย ต้องเอาตัวละครกลับมาใส่ทุกครั้ง */
  [["animal", "pfmHomePets"], ["crop", "pfmFarmPets"]].forEach(x => {
    const L = $(x[1]); if(!L) return;
    const el = pfMeEl(x[0]); L.appendChild(el); el.lastChild.textContent = pfMyName();
  });
}
function pfWalkSet(sc, x, y, r, act, chase){
  const z = PF_ME_Z[sc];
  pfWalk = {sc:sc, tx:Math.max(z.x[0], Math.min(z.x[1], x)), ty:Math.max(z.y[0], Math.min(z.y[1], y)), r:r, act:act, chase:chase || "", t0:Date.now()};
}
function pfWalkGround(cx, cy){
  const sc = pfScene(), L = sc && pfLayerOf(sc); if(!L || !L.offsetWidth) return;
  const p = pfLocal(L, cx, cy); pfWalkSet(sc, p.x * 100, p.y * 100, 0, null);
  const m = document.createElement("span"); m.className = "pfm-tapm"; m.style.left = pfWalk.tx + "%"; m.style.top = pfWalk.ty + "%";
  L.appendChild(m); setTimeout(() => m.remove(), 700);
}
function pfWalkAct(a){
  const sc = pfScene(), L = sc && pfLayerOf(sc); if(!L || !L.offsetWidth) return;
  if(a.type === "plot"){
    const r = a.el.getBoundingClientRect(), p = pfLocal(L, r.left + r.width / 2, r.top + r.height / 2);
    pfWalkSet(sc, p.x * 100, p.y * 100 + a.el.offsetHeight * .25 / L.offsetHeight * 100, 3, a);
  }
  else{ const q = pfPos[a.id]; if(!q) return; pfWalkSet(sc, q.x, q.y, 52, a, a.id); }
}
function pfWalkDone(w){
  const a = w.act; if(!a) return;
  if(a.type === "plot") pfPlotTap(a.i);
  else if(a.type === "lay") pfCollect(a.id);
  else if(a.type === "pet"){
    const el = document.querySelector('#pfmRoom [data-pid="' + a.id + '"]');
    pfMeAnim("play", 1200); if(el){ pfFx("💕", el); el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  }
}
function pfMeStep(dt){
  const sc = pfScene(); if(!sc) return;
  const L = pfLayerOf(sc); if(!L || !L.offsetWidth) return;
  const el = pfMeEl(sc), s = pfMeS[sc]; if(el.parentNode !== L) L.appendChild(el);
  let moving = false;
  if(pfWalk && pfWalk.sc !== sc) pfWalk = null;
  const w = pfWalk;
  if(w){
    if(w.chase && pfPos[w.chase]){ w.tx = pfPos[w.chase].x; w.ty = pfPos[w.chase].y; } /* สัตว์ขยับ ก็เดินตามไป */
    const W = L.offsetWidth, H = L.offsetHeight, dx = (w.tx - s.x) * W / 100, dy = (w.ty - s.y) * H / 100, d = Math.hypot(dx, dy);
    if(d <= w.r + .5 || (w.chase && Date.now() - w.t0 > 10000)){ pfWalk = null; pfWalkDone(w); }
    else{
      const st = Math.min(d - w.r, Math.max(110, W * .28) * dt);
      s.x += dx / d * st / W * 100; s.y += dy / d * st / H * 100; moving = true;
      if(Math.abs(dx) > 2) s.dir = dx < 0 ? -1 : 1;
    }
  }
  el.dataset.g = pfGender || "girl"; el.style.left = s.x + "%"; el.style.top = s.y + "%"; el.style.zIndex = Math.round(s.y);
  el.classList.toggle("walking", moving);
  if(moving || (pfMeAct && Date.now() > pfMeActT)) pfMeAct = ""; el.dataset.a = pfMeAct;
  el.firstChild.style.transform = s.dir < 0 ? "scaleX(-1)" : "";
}
function pfMeLoop(ts){
  pfMeRaf = requestAnimationFrame(pfMeLoop);
  const dt = Math.min(.1, Math.max(0, (ts - pfMeLast) / 1000)); pfMeLast = ts;
  try{ pfMeStep(dt); }catch(e){ console.error(e); }
}
function pfSetGender(v){ /* เลือกตัวละคร: girl / boy เก็บใน Firebase ผูกกับบัญชี */
  if(v === "ask") return $("pfmGender").classList.remove("hidden"), $("pfmSet").classList.add("hidden");
  if(!/^(girl|boy|c[1-7])$/.test(v)) return;
  pfGender = v; $("pfmGender").classList.add("hidden"); if(!pfHouse) setTimeout(pfHouseOpen, 0);
  if(currentUser && firebaseReady) db.ref("petfarm/saves/" + currentUser.uid + "/gender").set(v).catch(e => console.error(e));
}
function pfShowGift(){
  const g = $("pfmGift"), e = $("pfmGiftEgg"); if(!g || !e) return;
  e.innerHTML = pfEggSvg(110);
  g.classList.remove("hidden");
}
/* แจกไข่เริ่มต้นคนละ 1 ฟอง (ไข่แมว) ครั้งเดียวต่อบัญชี เก็บที่ petfarm/saves/{uid} */
async function pfLoadSave(){
  if(!currentUser || !firebaseReady) return;
  const uid = currentUser.uid; let gave = false, gaveSeed = false; pfLoaded = false;
  try{
    const res = await db.ref("petfarm/saves/" + uid).transaction(cur => {
      cur = cur || {}; if(cur.ver !== PF_VER) cur = {ver:PF_VER}; /* เซฟเวอร์ชันเก่า = ล้างแล้วเริ่มใหม่ */ gave = !cur.starterGiven; cur.eggs = cur.eggs || {}; if(cur.coins == null) cur.coins = 200; gaveSeed = !cur.seedGiven; if(gaveSeed){ cur.seedGiven = true; cur.seeds = (cur.seeds || 0) + 6; } /* แจกเมล็ดข้าว 6 เมล็ด */ /* เหรียญเริ่มต้นสำหรับซื้อไข่ */
      if(gave){ cur.starterGiven = true; if(!cur.eggs.starter) cur.eggs.starter = {type:"cat", at:Date.now()}; }
      return cur;
    });
    const v = res.snapshot.val() || {};
    pfEggs = v.eggs || {}; pfPets = v.pets || {}; pfCoins = v.coins || 0; pfShop = v.shop || {}; const qv = v.quests || {}; pfGems = v.gems || 0; pfLv = Math.max(1, v.lv || 1); pfXp = v.xp || 0; pfQ = {day:qv.day || 0, p:qv.p || {}, cl:qv.cl || {}}; pfLoaded = true; pfPaintLevel(pfLv, pfXp); pfQuestCheck(); pfPaintQuest(); pfPaintCur(); pfPaintShop();
    pfInv = {seeds:v.seeds || 0, rice:v.rice || 0, feed:v.feed || 0, catfood:v.catfood || 0, dogfood:v.dogfood || 0, rabbitfood:v.rabbitfood || 0, hamsterfood:v.hamsterfood || 0, chickenegg:v.chickenegg || 0, duckegg:v.duckegg || 0}; pfBag = Object.assign({}, v.bag || {}); pfPaintFood(); pfPaintBag(); pfPlots = Object.assign({}, v.plots || {}); pfMill = v.mill || null; pfMillSig = ""; pfPaintPlots(); pfPaintMill(); pfPaintSell();
    if(gaveSeed) pfToast("🌾 ได้รับเมล็ดข้าว 6 เมล็ด! ไปปลูกที่ฟาร์มข้างนอก");
    Object.keys(pfPets).forEach(k => { pfPets[k].id = k; });
    if(!pfPets[pfSel]) pfSel = Object.keys(pfPets)[0] || "";
    pfPaintInv();
    pfGender = /^(girl|boy|c[1-7])$/.test(v.gender) ? v.gender : ""; if(!pfGender) $("pfmGender").classList.remove("hidden"); pfHouse = v.house || null; pfDrawWorld(); if(pfGender && !pfHouse) pfHouseOpen();
    if(res.committed && gave) pfShowGift();
  }catch(e){ console.error("Pet farm save error", e); }
}
function pfClock(){
  const t = $("pfmTime"), d = $("pfmDate"); if(!t || !d) return;
  const n = new Date();
  t.textContent = n.toLocaleTimeString("th-TH", {hour:"2-digit", minute:"2-digit", hour12:false});
  d.textContent = n.toLocaleDateString("th-TH", {weekday:"long", day:"numeric", month:"short", year:"numeric"});
}
function pfBody(on){
  document.body.style.overflow = on ? "hidden" : "";
  if(on){
    if(!pfClockT){ pfClock(); pfClockT = setInterval(pfClock, 15000); }
    pfPaintWx();
    if(!pfTickT){ pfTickT = setInterval(pfTick, 1000); pfMoveT = setInterval(pfMove, 3500); }
    if(!pfMeRaf) pfMeRaf = requestAnimationFrame(pfMeLoop);
  }
  else{
    if(pfTickT){ clearInterval(pfTickT); clearInterval(pfMoveT); pfTickT = pfMoveT = null; }
    if(pfClockT){ clearInterval(pfClockT); pfClockT = null; }
    if(pfMeRaf){ cancelAnimationFrame(pfMeRaf); pfMeRaf = 0; } pfWalk = null;
    const st = $("pfmSet"); if(st) st.classList.add("hidden");
    const gf = $("pfmGift"); if(gf) gf.classList.add("hidden");
    const qm = $("pfmQuest"); if(qm) qm.classList.add("hidden");
  }
}
/* แถบโปรไฟล์: ชื่อ รูป เลเวล XP อ่านจากข้อมูลเดิมของเว็บ (ยังไม่ใช้ในเว็บแยก) */
function pfPaintCur(){
  const c = $("pfmCoin"), g = $("pfmGem");
  if(c) c.textContent = fmtRuby(Math.max(0, Math.floor(pfCoins) || 0));
  if(g) g.textContent = fmtRuby(Math.max(0, Math.floor(pfGems) || 0));
}
function pfPaintLevel(lv, xp){
  lv = Math.max(1, Math.floor(+lv) || 1); xp = Math.max(0, Math.floor(+xp) || 0);
  const need = Math.max(1, lvXpNeed(lv)), got = Math.min(xp, need);
  const l = $("pfmLv"), f = $("pfmXpFill"), t = $("pfmXpTxt");
  if(l) l.textContent = lv;
  if(f) f.style.width = (got / need * 100) + "%";
  if(t) t.textContent = got + " / " + need;
}
function pfSetAvatar(src){
  const box = $("pfmAv"); if(!box) return;
  src = safeSrc(src);
  if(src){ box.innerHTML = ""; const im = document.createElement("img"); im.alt = ""; im.src = src; box.appendChild(im); }
  else box.textContent = "🐥";
}
async function pfPaintProfile(){
  const nm = $("pfmPName"); if(nm) nm.textContent = pfMyName();
  pfPaintCur(); pfPaintLevel(pfLv, pfXp);
  if(!currentUser || !firebaseReady) return;
  let src = ""; try{ src = localStorage.getItem(avKey()) || ""; }catch(e){}
  pfSetAvatar(src);
  const uid = currentUser.uid;
  try{
    const v = (await db.ref("users/" + uid + "/avatar").once("value")).val();
    if(typeof v === "string" && currentUser && currentUser.uid === uid) pfSetAvatar(v);
  }catch(e){}
}
/* ถ้าเครื่องอยู่แนวตั้ง จะหมุนหน้าเกมให้เป็นแนวนอนด้วย CSS (ใช้ได้ทั้ง iPhone และ Android) */

/* ===== ฉากกริด (24x16 ช่อง ช่องละ 64px) วาดบน canvas จากภาพ sprite sheet ===== */
const PW = 1536, PH = 1024, TS = 64, PF_IMG = {}; let pfImgOk = false, pfHouse = null, pfHDraft = null;
const PF_ASSETS = "g1 g2 dirt cob soil h_red h_blue h_brown h_green shop_blue shop_red mill kennel lamp mailbox bench sign pot1 pot2 pot3 umbrella fence hedge tree1 tree2 pine blossom bush pond".split(" ");
const PF_HOUSES = {red:"h_red", blue:"h_blue", brown:"h_brown", green:"h_green"};
const PF_DECO = [["lamp","🏮","โคมไฟ"],["pots","🌷","กระถางดอกไม้"],["bench","🪑","ม้านั่ง"],["mailbox","📮","ตู้ไปรษณีย์"],["tree","🌸","ต้นไม้"],["fence","🚧","รั้ว"],["hedge","🌿","พุ่มไม้"],["umb","⛱️","โต๊ะร่ม"]];
const PF_PLOTXY = [0,1,2,3,4,5].map(i => [((([2,5,8][i % 3]) + 1) * TS) / PW * 100, ((([10,13][Math.floor(i / 3)]) + 1) * TS) / PH * 100]);
function pfLoadImgs(cb){ let n = 0; PF_ASSETS.forEach(k => { const i = new Image(); i.onload = i.onerror = () => { if(++n === PF_ASSETS.length){ pfImgOk = true; if(cb) cb(); } }; i.src = "assets/" + k + ".png"; PF_IMG[k] = i; }); }
function pfSpr(c, k, cx, by, h){ const i = PF_IMG[k]; if(!i || !i.naturalWidth) return null; const w = i.naturalWidth * h / i.naturalHeight; c.drawImage(i, cx - w / 2, by - h, w, h); return {x:cx - w / 2, y:by - h, w:w, h:h}; }
function pfDrawHouse(c, cx, by, hs, s){
  const d = hs.deco || [], has = k => d.indexOf(k) >= 0;
  if(has("tree")) pfSpr(c, "blossom", cx + 340 * s, by - 4 * s, 190 * s);
  if(has("umb")) pfSpr(c, "umbrella", cx - 340 * s, by + 4 * s, 120 * s);
  if(has("hedge")){ pfSpr(c, "hedge", cx - 250 * s, by + 14 * s, 46 * s); pfSpr(c, "hedge", cx + 250 * s, by + 14 * s, 46 * s); }
  const r = pfSpr(c, PF_HOUSES[hs.style] || "h_red", cx, by, 300 * s);
  if(has("lamp")) pfSpr(c, "lamp", cx - 165 * s, by + 12 * s, 110 * s);
  if(has("mailbox")) pfSpr(c, "mailbox", cx + 165 * s, by + 12 * s, 80 * s);
  if(has("bench")) pfSpr(c, "bench", cx + 270 * s, by + 14 * s, 56 * s);
  if(has("pots")){ pfSpr(c, "pot1", cx - 105 * s, by + 16 * s, 60 * s); pfSpr(c, "pot2", cx + 105 * s, by + 16 * s, 60 * s); }
  if(has("fence")) [-150, -236, 150, 236].forEach(x => pfSpr(c, "fence", cx + x * s, by + 46 * s, 46 * s));
  return r;
}
function pfDrawWorld(){
  const cv = $("pfmCanvas"); if(!cv || !pfImgOk) return; const c = cv.getContext("2d"); c.clearRect(0, 0, PW, PH);
  const tile = (k, x, y) => { const i = PF_IMG[k]; if(i && i.naturalWidth) c.drawImage(i, x, y, TS + 1, TS + 1); };
  for(let r = 0; r < 16; r++) for(let q = 0; q < 24; q++){
    let k = (r * 7 + q * 13 + r * q) % 5 < 2 ? "g2" : "g1";
    if(r >= 6 && r <= 8 && q >= 1 && q <= 6) k = "dirt"; else if((q === 11 || q === 12) && r >= 6) k = "cob";
    tile(k, q * TS, r * TS);
  }
  for(let i = 0; i < 6; i++){ const q = [2,5,8][i % 3], r = [10,13][Math.floor(i / 3)]; for(let a = 0; a < 2; a++) for(let b = 0; b < 2; b++) tile("soil", (q + a) * TS, (r + b) * TS); }
  const O = [], rc = {}; const add = (by, f) => O.push([by, f]);
  [["tree1",50,118,130],["pine",150,112,150],["tree2",260,120,125],["pine",360,108,140],["blossom",1160,116,140],["tree1",1260,112,130],["pine",1370,118,150],["tree2",1480,120,130],["tree2",50,1010,140],["pine",1480,1010,150],["tree1",1400,900,120],["bush",980,900,50],["bush",1090,985,50],["bush",1180,840,46],["bush",620,995,48],["hedge",450,1005,44],["pond",1280,700,190]].forEach(o => add(o[2], () => pfSpr(c, o[0], o[1], o[2], o[3])));
  [80,164,248,332,416].forEach(x => { add(396, () => pfSpr(c, "fence", x, 396, 44)); add(590, () => pfSpr(c, "fence", x, 590, 44)); });
  add(345, () => { rc.shop = pfSpr(c, "shop_blue", 300, 345, 140); }); add(335, () => { rc.mill = pfSpr(c, "mill", 110, 335, 110); });
  add(345, () => { rc.sell = pfSpr(c, "shop_red", 1210, 345, 120); }); add(350, () => { rc.food = pfSpr(c, "kennel", 1385, 350, 150); });
  add(470, () => { rc.quest = pfSpr(c, "sign", 1295, 470, 90); });
  add(400, () => { rc.home = pfDrawHouse(c, 768, 400, pfHouse || {style:"red", deco:[]}, 1); });
  O.sort((a, b) => a[0] - b[0]).forEach(o => o[1]());
  const hot = (sel, r) => { const b = document.querySelector(sel); if(b && r) b.style.cssText = "left:" + r.x / PW * 100 + "%;top:" + r.y / PH * 100 + "%;width:" + r.w / PW * 100 + "%;height:" + r.h / PH * 100 + "%"; };
  hot('.pfm-hot[data-pftab="shop"]', rc.shop); hot('.pfm-hot[data-pftab="mill"]', rc.mill); hot('.pfm-hot[data-pftab="sell"]', rc.sell);
  hot('.pfm-hot[data-pftab="food"]', rc.food); hot("#pfmQBtn", rc.quest); hot('.pfm-hot[data-pftab="home"]', rc.home);
  pfHPaint();
}
function pfHPaint(){
  const m = $("pfmHouse"); if(!m || !pfHDraft) return;
  m.querySelectorAll("[data-pfhs]").forEach(b => b.classList.toggle("on", b.dataset.pfhs === pfHDraft.style));
  m.querySelectorAll("[data-pfhd]").forEach(b => b.classList.toggle("on", pfHDraft.deco.indexOf(b.dataset.pfhd) >= 0));
  const cv = $("pfmHPrev"), c = cv.getContext("2d"); c.clearRect(0, 0, cv.width, cv.height);
  c.fillStyle = "#9fd878"; c.fillRect(0, 0, cv.width, cv.height);
  const g = PF_IMG.cob; if(g && g.naturalWidth) for(let y = 120; y < cv.height; y += 26) c.drawImage(g, cv.width / 2 - 26, y, 52, 27);
  pfDrawHouse(c, cv.width / 2, 150, pfHDraft, .4);
}
function pfHouseOpen(){
  pfHDraft = {style:(pfHouse && pfHouse.style) || "red", deco:((pfHouse && pfHouse.deco) || []).slice()};
  $("pfmHStyles").innerHTML = Object.keys(PF_HOUSES).map(k => '<button type="button" data-pfhs="' + k + '"><img src="assets/' + PF_HOUSES[k] + '.png" alt=""></button>').join("");
  $("pfmHDeco").innerHTML = PF_DECO.map(d => '<button type="button" data-pfhd="' + d[0] + '">' + d[1] + " " + d[2] + "</button>").join("");
  $("pfmSet").classList.add("hidden"); $("pfmHouse").classList.remove("hidden"); pfHPaint();
}
function pfHouseSave(){
  if(!pfHDraft) return; pfHouse = pfHDraft; pfHDraft = null; $("pfmHouse").classList.add("hidden"); pfDrawWorld();
  if(currentUser && firebaseReady) db.ref("petfarm/saves/" + currentUser.uid + "/house").set(pfHouse).catch(e => console.error(e));
}
pfLoadImgs(pfDrawWorld);
function pfFit(){ /* วางฉากฟาร์ม (สัดส่วน 3:2 ตามภาพ) ให้พอดีจอ ตำแหน่งปุ่ม/แปลง/สัตว์ใช้ % ของฉากนี้ */
  const st = $("pfmRoom"), w = $("pfmWorld"), a = $("pfApp"); if(!st || !w || !a || st.classList.contains("hidden")) return;
  const W = a.offsetWidth, H = a.offsetHeight, k = Math.min(W / 1536, H / 1024);
  w.style.cssText = "width:" + 1536 * k + "px;height:" + 1024 * k + "px;left:" + (W - 1536 * k) / 2 + "px;top:" + (H - 1024 * k) / 2 + "px;--u:" + k;
}
/* มือถือที่รองรับ: ขอเต็มจอ + ล็อกแนวนอน (iPhone ไม่รองรับ จะใช้การหมุนด้วย CSS แทน) */
function pfTryLandscape(){
  try{
    if(!window.matchMedia("(pointer:coarse)").matches) return;
    pfLocked = true;
    const d = document.documentElement;
    Promise.resolve(d.requestFullscreen ? d.requestFullscreen() : null)
      .then(() => { if(screen.orientation && screen.orientation.lock) return screen.orientation.lock("landscape"); })
      .catch(() => {});
  }catch(e){}
}
function pfUnlockOrient(){
  try{
    if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    if(document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }catch(e){}
}
function pfRender(){
  const list = $("pfmList"), room = $("pfmRoom"), nb = $("pfmName");
  if(!list || !room || !nb) return;
  const uid = currentUser && currentUser.uid;
  if(pfCur && !pfBusy && !pfPlayers(pfCur).some(p => p.uid === uid)) pfCur = "";
  const sid = pfCur || pfPending || pfJoinId;
  if(!sid && !pfBusy) pfBody(false);
  if(sid){
    const ps = pfPlayers(sid);
    list.classList.add("hidden"); room.classList.remove("hidden");
    nb.classList.toggle("hidden", !(pfPending && !pfCur));
    $("pfmRoomName").textContent = "FARM SERVER " + pfNum(sid);
    $("pfmRoomCount").textContent = ps.length + "/" + PF_MAX;
    const mine = ps.find(p => p.uid === uid);
    $("pfmFarmName").textContent = (mine && mine.farm) || (pfCur ? pfMyName() : "ฟาร์มของคุณ");
    let h = "";
    for(let i = 0; i < PF_MAX; i++){
      const p = ps[i];
      if(!p) h += '<div class="pfm-slot empty"><b>🥚</b>ว่าง</div>';
      else h += '<div class="pfm-slot' + (p.uid === uid ? " me" : "") + '"><b>' + PF_PETS[i] + '</b><div>' + pfEsc(p.farm || p.name) + (p.farm ? '<small>' + pfEsc(p.name) + '</small>' : '') + '</div>' + (i === 0 ? '<em>HOST</em>' : (p.uid === uid ? '<em>YOU</em>' : '')) + '</div>';
    }
    $("pfmSlots").innerHTML = h;
    pfBody(true); pfFit();
    return;
  }
  nb.classList.add("hidden");
  room.classList.add("hidden"); list.classList.remove("hidden");
  list.innerHTML = PF_SERVERS.map(id => {
    const ps = pfPlayers(id), n = ps.length;
    const st = n >= PF_MAX ? "full" : n ? "open" : "empty";
    const label = st === "full" ? "FULL" : st === "open" ? "OPEN" : "EMPTY";
    return '<article class="game-card pfm-srv"><h3>FARM SERVER ' + pfNum(id) + '</h3>'
      + '<div class="pfm-bar"><i style="width:' + (n / PF_MAX * 100) + '%"></i></div>'
      + '<div class="pfm-meta"><span>' + n + '/' + PF_MAX + ' PLAYERS</span><span class="pfm-tag ' + st + '">' + label + '</span></div>'
      + '<div class="pfm-names">' + (n ? ps.map(p => pfEsc(p.farm || p.name)).join(", ") : "ยังไม่มีผู้เล่น") + '</div>'
      + '<button class="btn primary full" data-pfjoin="' + id + '" type="button"' + (st === "full" ? " disabled" : "") + '>' + (st === "full" ? "FULL" : "JOIN") + '</button></article>';
  }).join("");
}
function pfAskName(id){
  if(!currentUser) return alert("กรุณาเข้าสู่ระบบก่อน");
  if(pfBusy) return;
  if(pfPlayers(id).length >= PF_MAX && !pfPlayers(id).some(p => p.uid === currentUser.uid)) return alert("เซิร์ฟเวอร์นี้เต็มแล้ว (5/5)");
  pfPending = id;
  pfTryLandscape();
  pfPaintProfile();
  $("pfmNameSrv").textContent = "FARM SERVER " + pfNum(id);
  let saved = ""; try{ saved = localStorage.getItem(pfFarmKey) || ""; }catch(e){}
  $("pfmNameIn").value = saved;
  pfRender();
  setTimeout(() => $("pfmNameIn").focus(), 50);
}
function pfConfirmName(){
  const name = $("pfmNameIn").value.trim().slice(0, 20);
  if(!name){ $("pfmNameIn").focus(); return alert("กรุณาตั้งชื่อฟาร์มก่อน"); }
  try{ localStorage.setItem(pfFarmKey, name); }catch(e){}
  const id = pfPending; pfPending = "";
  pfJoin(id, name);
}
async function pfJoin(id, farm){
  if(!currentUser) return alert("กรุณาเข้าสู่ระบบก่อน");
  if(!firebaseReady || pfBusy) return;
  pfBusy = true; pfJoinId = id;
  try{
    if(pfCur && pfCur !== id) await pfLeave(true);
    const uid = currentUser.uid, name = pfMyName();
    const res = await db.ref("petfarm/servers/" + id + "/players").transaction(cur => {
      cur = cur || {};
      if(cur[uid]){ cur[uid].farm = farm; return cur; }
      if(Object.keys(cur).length >= PF_MAX) return;
      cur[uid] = {name:name, farm:farm, joinedAt:Date.now()};
      return cur;
    });
    if(!res.committed){ pfBody(false); alert("เซิร์ฟเวอร์นี้เต็มแล้ว (5/5)"); return; }
    pfCur = id;
    db.ref("petfarm/servers/" + id + "/players/" + uid).onDisconnect().remove();
    pfLoadSave();
  }catch(e){
    console.error(e);
    pfBody(false);
    alert("เข้าเซิร์ฟเวอร์ไม่สำเร็จ ลองใหม่อีกครั้ง");
  }finally{
    pfBusy = false; pfJoinId = "";
    if(!pfCur) pfBody(false);
    pfRender();
  }
}
async function pfLeave(silent){
  if(!pfCur || !currentUser){ pfCur = ""; return; }
  const id = pfCur; pfCur = "";
  pfBody(false);
  const r = db.ref("petfarm/servers/" + id + "/players/" + currentUser.uid);
  try{ await r.onDisconnect().cancel(); await r.remove(); }catch(e){ console.error(e); }
  if(!silent) pfRender();
}
function pfEnter(){ pfStart(); pfRender(); }
function pfExit(){ pfPending = ""; pfBody(false); if(pfCur) pfLeave(true).then(pfStop); else pfStop(); }
(function pfInit(){
  document.addEventListener("pointerdown", () => { try{ pfAud = pfAud || new (window.AudioContext || window.webkitAudioContext)(); pfAud.resume(); }catch(e){} }); /* ปลดล็อกเสียง */
  const list = $("pfmList");
  if(list) list.addEventListener("click", e => { const b = e.target.closest("[data-pfjoin]"); if(b) pfAskName(b.dataset.pfjoin); });
  if($("pfmNameOk")) $("pfmNameOk").addEventListener("click", pfConfirmName);
  if($("pfmNameCancel")) $("pfmNameCancel").addEventListener("click", () => { pfPending = ""; pfRender(); });
  if($("pfmNameIn")) $("pfmNameIn").addEventListener("keydown", e => { if(e.key === "Enter") pfConfirmName(); });
  const gear = $("pfmGear"), setp = $("pfmSet");
  if(gear) gear.addEventListener("click", e => { e.stopPropagation(); setp.classList.toggle("hidden"); });
  const stg = $("pfmRoom");
  if(stg) stg.addEventListener("click", e => { if(setp && !e.target.closest("#pfmSet")) setp.classList.add("hidden"); });
  window.addEventListener("resize", pfFit);
  window.addEventListener("orientationchange", () => setTimeout(pfFit, 150));
  if($("pfmGiftOk")) $("pfmGiftOk").addEventListener("click", () => $("pfmGift").classList.add("hidden"));
  document.querySelectorAll("[data-pftab]").forEach(b => b.addEventListener("click", () => pfSetTab(b.dataset.pftab)));
  const an = $("pfmRoom");
  if(an) an.addEventListener("click", e => {
    const h1 = e.target.closest("[data-pfhs]"); if(h1 && pfHDraft){ pfHDraft.style = h1.dataset.pfhs; return pfHPaint(); }
    const h2 = e.target.closest("[data-pfhd]"); if(h2 && pfHDraft){ const a = pfHDraft.deco, k = h2.dataset.pfhd, ix = a.indexOf(k); if(ix < 0) a.push(k); else a.splice(ix, 1); return pfHPaint(); }
    if(e.target.closest("#pfmHOk")) return pfHouseSave();
    if(e.target.closest("[data-pfhouse]")) return pfHouseOpen();
    const lc = e.target.closest("[data-pflay],[data-pfcollect]"); if(lc){ if(lc.dataset.pflay) return pfWalkAct({type:"lay", id:lc.dataset.pflay}); return pfCollect(lc.dataset.pfcollect); }
    const gp = e.target.closest("[data-pfgender]"); if(gp) return pfSetGender(gp.dataset.pfgender);
    const ic = e.target.closest("[data-pfinc]"); if(ic) return pfIncubate(ic.dataset.pfinc);
    const qc = e.target.closest("[data-pfqclaim]"); if(qc) return pfQClaim(qc.dataset.pfqclaim);
    if(e.target.closest("#pfmQBtn")) return pfQOpen(true);
    if(e.target.closest("#pfmQClose") || e.target.id === "pfmQuest") return pfQOpen(false);
    const sl = e.target.closest("[data-pfsell]"); if(sl) return pfSellItem(sl.dataset.pfsell);
    const fd = e.target.closest("[data-pffood]"); if(fd) return pfBuyFood(fd.dataset.pffood);
    const pl = e.target.closest("[data-plot]"); if(pl) return pfWalkAct({type:"plot", i:+pl.dataset.plot, el:pl});
    if(e.target.closest("[data-pfmill]")) return pfMillTap();
    const by = e.target.closest("[data-pfbuy]"); if(by) return pfBuy(by.dataset.pfbuy);
    const eg = e.target.closest("[data-pfegg]"); if(eg) return pfHatch(eg.dataset.pfegg);
    const ac = e.target.closest("[data-pfact]"); if(ac) return pfAct(ac.dataset.pfact);
    const pe = e.target.closest("[data-pid]");
    if(pe){
      pfSel = pe.dataset.pid;
      document.querySelectorAll("#pfmRoom .pfm-pet").forEach(x => x.classList.toggle("sel", x === pe));
      pfPaintCare();
      return pfWalkAct({type:"pet", id:pfSel});
    }
    if(e.target.closest("[data-pftab],#pfmQBtn,.pfm-pop") || !e.target.closest(".pfm-pen")) return;
    pfWalkGround(e.clientX, e.clientY);
  });
  if($("pfmPop")) $("pfmPop").addEventListener("click", e => { if(e.target.id === "pfmPop") pfSetTab("close"); });
  if($("pfmLeave")) $("pfmLeave").addEventListener("click", () => pfLeave(false));
})();


/* ===== บังคับทั้งหน้าเว็บเป็นแนวนอน: มือถือที่ถือแนวตั้งจะหมุนหน้าด้วย CSS (ล็อกแนวนอนจริงได้ก็ใช้ตัวนั้นแทน) ===== */
function pfFitApp(){
  const app = $("pfApp"); if(!app) return;
  const w = window.innerWidth, h = window.innerHeight;
  const touch = window.matchMedia && window.matchMedia("(pointer:coarse)").matches;
  if(touch && h > w) app.style.cssText = "width:" + h + "px;height:" + w + "px;left:" + w + "px;top:0;right:auto;bottom:auto;transform-origin:0 0;transform:rotate(90deg)";
  else app.style.cssText = "";
  document.documentElement.classList.toggle("pf-short", ((touch && h > w) ? w : h) <= 520);
  pfFit();
}
window.addEventListener("resize", pfFitApp);
window.addEventListener("orientationchange", () => setTimeout(pfFitApp, 150));
document.addEventListener("pointerdown", () => { pfTryLandscape(); setTimeout(pfFitApp, 400); }, {once:true});
pfFitApp();

/* ===== ล็อกอิน (ใช้บัญชีเดิมของ Firebase project เดียวกัน) ===== */
(function authInit(){
  let mode = "login";
  window.addEventListener("error", e => { const m = $("gMsg"); if(m && !$("pfGate").classList.contains("hidden")){ m.style.color = "#ff6b8a"; m.textContent = "เกิดข้อผิดพลาด: " + (e.message || "unknown"); } });
  const msg = (t, ok) => { const m = $("gMsg"); m.textContent = t || ""; m.style.color = ok ? "#3dbb85" : "#ff6b8a"; };
  const ERR = {"auth/invalid-email":"อีเมลไม่ถูกต้อง","auth/user-not-found":"ไม่พบบัญชีนี้","auth/wrong-password":"รหัสผ่านไม่ถูกต้อง","auth/invalid-credential":"อีเมลหรือรหัสผ่านไม่ถูกต้อง","auth/email-already-in-use":"อีเมลนี้ถูกใช้แล้ว","auth/weak-password":"รหัสผ่านสั้นเกินไป","auth/too-many-requests":"ลองบ่อยเกินไป รอสักครู่","auth/unauthorized-domain":"โดเมนนี้ยังไม่ได้เพิ่มใน Firebase Authorized domains","auth/popup-closed-by-user":"ปิดหน้าต่าง Google ก่อนเข้าสำเร็จ"};
  ERR["auth/operation-not-allowed"] = "ยังไม่ได้เปิดวิธีล็อกอินนี้ใน Firebase (Authentication → Sign-in method)";
  ERR["auth/network-request-failed"] = "เชื่อมต่อไม่ได้ เช็กอินเทอร์เน็ต";
  ERR["auth/invalid-api-key"] = "apiKey ใน firebaseConfig ไม่ถูกต้อง";
  const err = e => { console.error(e); msg(ERR[e && e.code] || ("เข้าสู่ระบบไม่สำเร็จ (" + ((e && e.code) || "unknown") + ")")); };
  const setMode = m => {
    mode = m;
    $("gName").classList.toggle("hidden", m !== "register");
    $("gGo").textContent = m === "register" ? "สมัครสมาชิก" : "เข้าสู่ระบบ";
    $("gSwitch").textContent = m === "register" ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? สมัครสมาชิก";
    msg("");
  };
  $("gSwitch").addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));
  if(location.protocol === "file:") msg("เปิดไฟล์ตรง ๆ ล็อกอินไม่ได้ ให้เปิดผ่านเว็บโฮสต์หรือ Live Server");
  if(!auth){
    const m = "โหลด Firebase ไม่สำเร็จ เช็กอินเทอร์เน็ต หรือปิดตัวบล็อกโฆษณาแล้วลองใหม่";
    msg(m); ["gGo","gGoogle"].forEach(i => $(i).addEventListener("click", () => msg(m))); return;
  }
  msg("");
  $("gGo").addEventListener("click", async () => {
    const email = $("gEmail").value.trim(), pw = $("gPass").value, name = $("gName").value.trim().slice(0, 20);
    if(!email || !pw) return msg("กรุณากรอกอีเมลและรหัสผ่าน");
    msg("กำลังเข้าสู่ระบบ...", true); $("gGo").disabled = true;
    try{
      if(mode === "register"){
        if(!name) return msg("กรุณาใส่ชื่อผู้เล่น");
        if(pw.length < 6) return msg("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
        const c = await auth.createUserWithEmailAndPassword(email, pw);
        try{ await c.user.updateProfile({displayName:name}); }catch(e){ console.error(e); }
        currentUser = c.user; pfPaintProfile();
      }else await auth.signInWithEmailAndPassword(email, pw);
    }catch(e){ err(e); }
    finally{ $("gGo").disabled = false; }
  });
  $("gGoogle").addEventListener("click", async () => {
    if(/Line\/|FBAN|FBAV|Instagram|MicroMessenger/i.test(navigator.userAgent)) return msg("Google ไม่รองรับเบราว์เซอร์ในแอปนี้ เปิดลิงก์ด้วย Chrome/Safari หรือใช้อีเมลแทน");
    msg("กำลังเปิดหน้าต่าง Google...", true);
    try{ await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
    catch(e){
      if(e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) msg("เบราว์เซอร์บล็อกหน้าต่าง Google อนุญาต pop-up หรือใช้อีเมลแทน");
      else err(e);
    }
  });
  auth.getRedirectResult().catch(err);
  $("pfmLogout").addEventListener("click", async () => { try{ await pfExit(); }catch(e){} auth.signOut(); });
  auth.onAuthStateChanged(user => {
    currentUser = user;
    if(user){ $("pfGate").classList.add("hidden"); pfEnter(); }
    else{ pfExit(); $("pfGate").classList.remove("hidden"); }
  });
})();

})();
