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
const PF_SPR = {cat:"🐱"};
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
function pfSigOf(){ return Object.keys(pfPets).map(id => id + pfStage(pfPets[id]) + (pfPets[id].sick ? 1 : 0)).join("|"); }
function pfSavePet(p){
  if(!currentUser || !firebaseReady) return;
  db.ref("petfarm/saves/" + currentUser.uid + "/pets/" + p.id).set(p).catch(e => console.error(e));
}
function pfFx(txt, el){
  const pen = $("pfmPen"); if(!pen) return;
  const f = document.createElement("span"); f.className = "pfm-fx"; f.textContent = txt;
  f.style.left = (el ? el.offsetLeft + el.offsetWidth / 2 : pen.clientWidth / 2) + "px";
  f.style.top = (el ? el.offsetTop : pen.clientHeight / 2) + "px";
  pen.appendChild(f); setTimeout(() => f.remove(), 900);
}
function pfPaintPen(){
  const pen = $("pfmPen"); if(!pen) return;
  const ek = Object.keys(pfEggs || {}), pk = Object.keys(pfPets);
  let h = "";
  if(ek.length) h += '<div class="pfm-eggs">' + ek.map(k => '<button class="pfm-egg2" data-pfegg="' + pfEsc(k) + '" type="button">' + pfEggSvg(46) + '<small data-hat="' + pfEsc(k) + '"></small></button>').join("") + '</div>';
  pk.forEach(id => {
    const p = pfPets[id], w = pfPos[id] || (pfPos[id] = {x:8 + Math.random() * 70, y:30 + Math.random() * 40});
    h += '<div class="pfm-pet st-' + pfStage(p) + (id === pfSel ? " sel" : "") + '" data-pid="' + pfEsc(id) + '" style="left:' + w.x + '%;top:' + w.y + '%">'
      + '<div class="pfm-pe" style="filter:hue-rotate(' + (p.hue || 0) + 'deg)"><b>' + (PF_SPR[p.type] || "🐱") + '</b></div>'
      + '<i class="pfm-pn">' + (p.rare ? "✨" : "") + pfEsc(p.name) + (p.sick ? " 🤒" : "") + '</i></div>';
  });
  if(!ek.length && !pk.length) h = '<div class="pfm-empty">ยังไม่มีสัตว์เลี้ยง</div>';
  pen.innerHTML = h; pfSig = pfSigOf(); pfTickEggs(); pfPaintCare();
}
function pfPaintInv(){ pfPaintPen(); }
function pfPaintCare(){
  const c = $("pfmCare"); if(!c) return;
  const p = pfPets[pfSel];
  if(!p){ c.innerHTML = '<div class="pfm-chint">' + (Object.keys(pfEggs || {}).length ? "🥚 แตะไข่เมื่อครบเวลาเพื่อฟักเป็นสัตว์เลี้ยง" : "แตะสัตว์เพื่อดูแล") + '</div>'; return; }
  const s = pfSnap(p), sick = !!p.sick;
  c.innerHTML = '<div class="pfm-cinfo"><b>' + pfEsc(p.name) + '</b><small>' + PF_STAGE[pfStage(p)] + " · " + ((PF_PERS[p.pers] || {}).n || "") + (p.rare ? " · ✨หายาก" : "") + (sick ? " · 🤒ป่วย" : "") + '</small></div>'
    + '<div class="pfm-bars">' + Object.keys(PF_STAT).map(k => '<div class="pfm-bar2"><span>' + PF_STAT[k][0] + '</span><div><i class="' + (s[k] > 50 ? "" : s[k] > 25 ? "mid" : "low") + '" style="width:' + Math.round(s[k]) + '%"></i></div></div>').join("") + '</div>'
    + '<div class="pfm-acts">' + (sick ? '<button data-pfact="cure" type="button">💊 รักษา</button>' : "")
    + '<button data-pfact="feed" type="button">🍖 อาหาร</button><button data-pfact="play" type="button"' + (sick ? " disabled" : "") + '>🎾 เล่น</button>'
    + '<button data-pfact="wash" type="button">🛁 อาบน้ำ</button><button data-pfact="sleep" type="button">😴 นอน</button></div>';
}
function pfTickEggs(){
  document.querySelectorAll("#pfmPen [data-hat]").forEach(el => {
    const e = pfEggs[el.dataset.hat]; if(!e) return;
    const r = pfHatchAt(e) - Date.now();
    el.textContent = r <= 0 ? "แตะฟัก!" : Math.floor(r / 60000) + ":" + String(Math.floor(r % 60000 / 1000)).padStart(2, "0");
    el.parentNode.classList.toggle("ready", r <= 0);
  });
}
function pfTick(){
  pfTickEggs();
  if(++pfTickN % 5) return;
  Object.keys(pfPets).forEach(id => {
    const p = pfPets[id]; if(p.sick) return;
    const s = pfSnap(p);
    if(s.hunger <= 3 || s.clean <= 3){ Object.assign(p, s, {sick:true, last:Date.now()}); pfSavePet(p); }
  });
  if(pfSigOf() !== pfSig) pfPaintPen(); else pfPaintCare();
}
function pfMove(){
  document.querySelectorAll("#pfmPen .pfm-pet").forEach(el => {
    const id = el.dataset.pid, p = pfPets[id], w = pfPos[id];
    if(!p || !w || p.sick || Math.random() < .35) return;
    const nx = 6 + Math.random() * 72, ny = 28 + Math.random() * 42;
    el.querySelector(".pfm-pe").style.transform = nx < w.x ? "scaleX(-1)" : "";
    w.x = nx; w.y = ny; el.style.left = nx + "%"; el.style.top = ny + "%";
  });
}
function pfHatch(key){
  const e = pfEggs[key]; if(!e || Date.now() < pfHatchAt(e) || !currentUser) return;
  const dn = pfRand(PF_NAMES);
  const name = (prompt("ไข่ฟักแล้ว! ตั้งชื่อสัตว์เลี้ยงของคุณ", dn) || "").trim().slice(0, 12) || dn;
  const id = "p" + Date.now().toString(36), now = Date.now();
  const p = {id:id, type:e.type || "cat", name:name, pers:pfRand(Object.keys(PF_PERS)), hue:pfRand([0,0,0,30,150,200,280]), rare:Math.random() < .08,
    born:now, hunger:80, mood:80, clean:80, energy:80, last:now, sick:false};
  pfPets[id] = p; delete pfEggs[key]; pfSel = id;
  const up = {}; up["eggs/" + key] = null; up["pets/" + id] = p;
  db.ref("petfarm/saves/" + currentUser.uid).update(up).catch(err => console.error(err));
  pfPaintPen();
  const el = document.querySelector('#pfmPen [data-pid="' + id + '"]'); if(el) pfFx("🎉", el);
}
function pfAct(a){
  const p = pfPets[pfSel]; if(!p) return;
  const el = document.querySelector('#pfmPen [data-pid="' + pfSel + '"]');
  const s = pfSnap(p);
  if(a === "feed"){ s.hunger += 35; pfFx("🍖", el); }
  else if(a === "play"){
    if(p.sick) return;
    if(s.energy < 10){ pfFx("😫", el); return; }
    s.mood += 30; s.energy -= 15; s.hunger -= 5; pfFx("🎾", el);
  }
  else if(a === "wash"){ s.clean += 45; pfFx("🫧", el); }
  else if(a === "sleep"){ s.energy += 40; s.hunger -= 5; pfFx("💤", el); }
  else if(a === "cure"){ p.sick = false; s.hunger = Math.max(s.hunger, 40); s.clean = Math.max(s.clean, 40); pfFx("💊", el); }
  Object.keys(s).forEach(k => { s[k] = Math.max(0, Math.min(100, s[k])); });
  Object.assign(p, s, {last:Date.now()});
  pfSavePet(p); pfPaintPen();
}
function pfSetTab(t){
  document.querySelectorAll("[data-pftab]").forEach(b => b.classList.toggle("on", b.dataset.pftab === t));
  $("pfmAnimal").classList.toggle("hidden", t !== "animal");
  $("pfmCrop").classList.toggle("hidden", t !== "crop");
  if(t === "animal") pfPaintPen();
}
function pfShowGift(){
  const g = $("pfmGift"), e = $("pfmGiftEgg"); if(!g || !e) return;
  e.innerHTML = pfEggSvg(110);
  g.classList.remove("hidden");
}
/* แจกไข่เริ่มต้นคนละ 1 ฟอง (ไข่แมว) ครั้งเดียวต่อบัญชี เก็บที่ petfarm/saves/{uid} */
async function pfLoadSave(){
  if(!currentUser || !firebaseReady) return;
  const uid = currentUser.uid; let gave = false;
  try{
    const res = await db.ref("petfarm/saves/" + uid).transaction(cur => {
      if(cur && cur.starterGiven){ gave = false; return cur; }
      gave = true;
      cur = cur || {};
      cur.starterGiven = true;
      cur.eggs = cur.eggs || {};
      if(!cur.eggs.starter) cur.eggs.starter = {type:"cat", at:Date.now()};
      return cur;
    });
    const v = res.snapshot.val() || {};
    pfEggs = v.eggs || {}; pfPets = v.pets || {};
    Object.keys(pfPets).forEach(k => { pfPets[k].id = k; });
    if(!pfPets[pfSel]) pfSel = Object.keys(pfPets)[0] || "";
    pfPaintInv();
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
    if(!pfTickT){ pfTickT = setInterval(pfTick, 1000); pfMoveT = setInterval(pfMove, 3500); }
  }
  else{
    if(pfTickT){ clearInterval(pfTickT); clearInterval(pfMoveT); pfTickT = pfMoveT = null; }
    if(pfClockT){ clearInterval(pfClockT); pfClockT = null; }
    const st = $("pfmSet"); if(st) st.classList.add("hidden");
    const gf = $("pfmGift"); if(gf) gf.classList.add("hidden");
    if(pfLocked){ pfLocked = false; pfUnlockOrient(); }
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
  pfPaintCur(); pfPaintLevel(1, 0);
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
function pfFit(){
  const st = $("pfmRoom"), box = $("pfmStageIn");
  if(!st || !box || st.classList.contains("hidden")) return;
  const w = window.innerWidth, h = window.innerHeight;
  if(h > w) box.style.cssText = "width:" + h + "px;height:" + w + "px;left:" + w + "px;top:0;transform-origin:0 0;transform:rotate(90deg)";
  else box.style.cssText = "";
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
  const an = $("pfmAnimal");
  if(an) an.addEventListener("click", e => {
    const eg = e.target.closest("[data-pfegg]"); if(eg) return pfHatch(eg.dataset.pfegg);
    const ac = e.target.closest("[data-pfact]"); if(ac) return pfAct(ac.dataset.pfact);
    const pe = e.target.closest("[data-pid]");
    if(pe){
      pfSel = pe.dataset.pid; pfFx("💕", pe);
      document.querySelectorAll("#pfmPen .pfm-pet").forEach(x => x.classList.toggle("sel", x === pe));
      pe.classList.remove("bump"); void pe.offsetWidth; pe.classList.add("bump");
      pfPaintCare();
    }
  });
  if($("pfmLeave")) $("pfmLeave").addEventListener("click", () => pfLeave(false));
})();


/* ===== ล็อกอิน (ใช้บัญชีเดิมของ Firebase project เดียวกัน) ===== */
(function authInit(){
  let mode = "login";
  const msg = (t, ok) => { const m = $("gMsg"); m.textContent = t || ""; m.style.color = ok ? "#3dbb85" : "#ff6b8a"; };
  const ERR = {"auth/invalid-email":"อีเมลไม่ถูกต้อง","auth/user-not-found":"ไม่พบบัญชีนี้","auth/wrong-password":"รหัสผ่านไม่ถูกต้อง","auth/invalid-credential":"อีเมลหรือรหัสผ่านไม่ถูกต้อง","auth/email-already-in-use":"อีเมลนี้ถูกใช้แล้ว","auth/weak-password":"รหัสผ่านสั้นเกินไป","auth/too-many-requests":"ลองบ่อยเกินไป รอสักครู่","auth/unauthorized-domain":"โดเมนนี้ยังไม่ได้เพิ่มใน Firebase Authorized domains","auth/popup-closed-by-user":"ปิดหน้าต่าง Google ก่อนเข้าสำเร็จ"};
  const err = e => msg(ERR[e && e.code] || "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
  const setMode = m => {
    mode = m;
    $("gName").classList.toggle("hidden", m !== "register");
    $("gGo").textContent = m === "register" ? "สมัครสมาชิก" : "เข้าสู่ระบบ";
    $("gSwitch").textContent = m === "register" ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? สมัครสมาชิก";
    msg("");
  };
  $("gSwitch").addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));
  if(location.protocol === "file:") msg("เปิดไฟล์ตรง ๆ ล็อกอินไม่ได้ ให้เปิดผ่านเว็บโฮสต์หรือ Live Server");
  if(!auth){ msg("โหลด Firebase ไม่สำเร็จ เช็กอินเทอร์เน็ต"); return; }
  $("gGo").addEventListener("click", async () => {
    const email = $("gEmail").value.trim(), pw = $("gPass").value, name = $("gName").value.trim().slice(0, 20);
    if(!email || !pw) return msg("กรุณากรอกอีเมลและรหัสผ่าน");
    try{
      if(mode === "register"){
        if(!name) return msg("กรุณาใส่ชื่อผู้เล่น");
        if(pw.length < 6) return msg("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
        const c = await auth.createUserWithEmailAndPassword(email, pw);
        try{ await c.user.updateProfile({displayName:name}); }catch(e){ console.error(e); }
        currentUser = c.user; pfPaintProfile();
      }else await auth.signInWithEmailAndPassword(email, pw);
    }catch(e){ err(e); }
  });
  $("gGoogle").addEventListener("click", async () => {
    const p = new firebase.auth.GoogleAuthProvider();
    try{ await auth.signInWithPopup(p); }
    catch(e){
      if(e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) auth.signInWithRedirect(p);
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
