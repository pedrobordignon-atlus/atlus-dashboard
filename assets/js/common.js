// ====== Estado/Admin ======
const ADMIN_PASS = "32832126";
const ADMIN_KEY  = "atl_admin";

function isAdmin(){ return localStorage.getItem(ADMIN_KEY) === "1"; }
function setAdmin(on){
  if(on){ localStorage.setItem(ADMIN_KEY, "1"); document.body.classList.add("admin"); }
  else  { localStorage.removeItem(ADMIN_KEY); document.body.classList.remove("admin"); }
}
if (isAdmin()) document.body.classList.add("admin");

// ====== Helpers globais ======
function $(id){ return document.getElementById(id); }
function norm(s){ return String(s||'').toLowerCase().trim(); }
function fmtUSD(v){ return isFinite(v)? v.toLocaleString("en-US",{style:"currency",currency:"USD"}):"—"; }
function fmtInt(v){ return isFinite(v)? v.toLocaleString("en-US"):"—"; }
function setUpdated(){
  const el = $("lastUpdated");
  if (el) el.textContent = 'Last updated: ' + new Date().toLocaleString('en-US',{hour:'numeric',minute:'2-digit'});
}
function chip(t){
  const s=document.createElement('span');
  s.style.border='1px solid var(--border)'; s.style.background='#09192a';
  s.style.color='#a7bfd9'; s.style.padding='6px 10px'; s.style.borderRadius='999px';
  s.style.fontSize='12px'; s.textContent=t; return s;
}
function chips(id,msgs){
  const c=$(id); if(!c) return; c.innerHTML=''; msgs.forEach(m=>c.appendChild(chip(m)));
}
function toNumber(x){
  if (x==null || x==='') return 0;
  if (typeof x==='number' && isFinite(x)) return x;
  let s = String(x).trim().replace(/[^0-9.\-]/g,'');
  if ((s.match(/\./g)||[]).length>1) s = s.replace(/\.(?=.*\.)/g,'');
  const n = parseFloat(s);
  return isFinite(n)?n:0;
}

// Mobile helpers p/ Chart.js
const MOBILE = window.matchMedia('(max-width:700px)');
function mobFont(szDesktop=12, szMobile=10){ return { size: MOBILE.matches ? szMobile : szDesktop }; }
function mobTicks(showDesktop=true, showMobile=true){
  return MOBILE.matches ? (showMobile?{}:{display:false}) : (showDesktop?{}:{display:false});
}

// Defaults de links (usados nos módulos)
window.DEFAULT_LINK = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT7EMxEc6BGdAxnSphrzKpW03Bv6zz96bNiIz58PZCjwDHvW3XhKbXNuC0bZll9gg/pub?gid=1004742443&single=true&output=csv";
window.BONUS_DEFAULT_LINK = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQOju0Fvn-Qe3oaTEZQiEm23CYOYtE6EChD6TNiW3y-MlUsHQcLPbrFPcgycz_x_Q_aEoO-XXlJpbnZ/pub?gid=2024260664&single=true&output=csv";
window.SVC_DEFAULT_LINK   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQp8vyChNgnzBaebfXtffk5G-wJBdcblAnj6RZtu695mOnaV8dxXdrf8TSmkXSlSzBnkVvxZ5EncESS/pub?gid=0&single=true&output=csv";

