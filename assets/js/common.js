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
// ===== Feedback local (somente Admin vê a lista) =====
const FEED_KEY = 'atl_feedback_v1';

function loadFeedback() {
  try { return JSON.parse(localStorage.getItem(FEED_KEY) || '[]'); }
  catch { return []; }
}
function saveFeedback(list) {
  localStorage.setItem(FEED_KEY, JSON.stringify(list));
}

function openFeedbackModal() {
  const box = document.getElementById('feedbackBox');
  if (!box) return;
  box.style.display = 'grid';
  (document.getElementById('fbMessage') || {}).focus?.();
}
function closeFeedbackModal() {
  const box = document.getElementById('feedbackBox');
  if (!box) return;
  box.style.display = 'none';
}

async function sendFeedback() {
  const name    = (document.getElementById('fbName')?.value || '').trim();
  const rating  = (document.getElementById('fbRating')?.value || '').trim();
  const message = (document.getElementById('fbMessage')?.value || '').trim();

  if (!message) {
    alert("Please write a short message before sending.");
    return;
  }

  const list = loadFeedback();
  list.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    name, rating, message,
    url: location.href,
    ts: Date.now()
  });
  saveFeedback(list);

  // Limpa e fecha modal
  const msg = document.getElementById('fbMessage');
  const nm  = document.getElementById('fbName');
  if (msg) msg.value = '';
  if (nm)  nm.value = '';
  closeFeedbackModal();

  alert('Thanks! Your feedback was saved.');
}

/* ===== Lista para Admin ===== */
function openFeedbackList() {
  if (!document.body.classList.contains('admin')) {
    alert('Admin only.');
    return;
  }
  renderFeedbackList();
  const box = document.getElementById('feedbackListBox');
  if (box) box.style.display = 'grid';
}
function closeFeedbackList() {
  const box = document.getElementById('feedbackListBox');
  if (box) box.style.display = 'none';
}
function renderFeedbackList() {
  const wrap = document.getElementById('fbList');
  if (!wrap) return;
  const data = loadFeedback();

  wrap.innerHTML = '';
  if (!data.length) {
    const empty = document.createElement('div');
    empty.className = 'muted';
    empty.textContent = 'No feedback yet.';
    wrap.appendChild(empty);
    return;
  }

  data.forEach(item => {
    const d = new Date(item.ts);
    const row = document.createElement('div');
    row.style.border = '1px solid var(--border)';
    row.style.background = '#081b2b';
    row.style.borderRadius = '12px';
    row.style.padding = '12px';
    row.style.display = 'grid';
    row.style.gap = '8px';

    row.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <div style="font-weight:600">${item.name || 'Anonymous'}</div>
        <div class="muted" style="font-size:12px">${d.toLocaleString()}</div>
      </div>
      <div class="muted" style="font-size:12px">${item.rating || ''}</div>
      <div style="white-space:pre-wrap">${(item.message || '').replace(/[<>&]/g, s=>({ '<':'&lt;','>':'&gt;','&':'&amp;' }[s]))}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <a href="${item.url}" target="_blank" class="muted" style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%">Source: ${item.url}</a>
        <button class="btn link" data-del="${item.id}">Delete</button>
      </div>
    `;
    wrap.appendChild(row);
  });

  // Botões de delete
  wrap.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-del');
      const list = loadFeedback().filter(x => x.id !== id);
      saveFeedback(list);
      renderFeedbackList();
    });
  });
}

function exportFeedbackCSV() {
  const rows = loadFeedback();
  if (!rows.length) return alert('Nothing to export.');
  const header = ['ts','date','name','rating','message','url'];
  const csv = [
    header.join(','),
    ...rows.map(r => {
      const date = new Date(r.ts).toISOString();
      const esc = s => `"${String(s||'').replace(/"/g,'""')}"`;
      return [r.ts, date, esc(r.name), esc(r.rating), esc(r.message), esc(r.url)].join(',');
    })
  ].join('\n');

  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'feedback.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function clearAllFeedback() {
  if (!confirm('Delete ALL feedback?')) return;
  saveFeedback([]);
  renderFeedbackList();
}

/* ===== Wire events ===== */
(function(){
  // Abrir modal de envio (se você tiver um botão público, chame openFeedbackModal())
  const fbSend = document.getElementById('fbSend');
  const fbCancel = document.getElementById('fbCancel');
  const fbClose = document.getElementById('fbClose');

  fbSend?.addEventListener('click', sendFeedback);
  fbCancel?.addEventListener('click', closeFeedbackModal);
  fbClose?.addEventListener('click', closeFeedbackModal);

  // Lista (Admin)
  const openList = document.getElementById('openFeedbackList');
  const listClose = document.getElementById('fbListClose');
  const btnExport = document.getElementById('fbExport');
  const btnClearAll = document.getElementById('fbClearAll');

  openList?.addEventListener('click', openFeedbackList);
  listClose?.addEventListener('click', closeFeedbackList);
  btnExport?.addEventListener('click', exportFeedbackCSV);
  btnClearAll?.addEventListener('click', clearAllFeedback);

  // Fechar modais ao apertar ESC
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape') {
      closeFeedbackModal();
      closeFeedbackList();
    }
  });
})();


