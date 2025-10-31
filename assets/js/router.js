// ===== Router de views =====
function openView(which){
  if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
  document.querySelectorAll('select').forEach(el => el.blur());

  $('view-home').style.display  = (which === 'home')  ? 'block' : 'none';
  $('view-atlus').style.display = (which === 'atlus') ? 'block' : 'none';
  if ($('view-bonus')) $('view-bonus').style.display = (which === 'bonus') ? 'block' : 'none';
  if ($('view-subs'))  $('view-subs').style.display  = (which === 'subs')  ? 'block' : 'none';

  $('headerTitle').textContent =
    which === 'home'  ? 'Atlus Dashboards' :
    which === 'atlus' ? 'Atlus Performance Dashboard' :
    which === 'bonus' ? 'Bonus & Tech Dashboard' :
                        'Subscriptions / ARV';

  history.replaceState(null, '', location.pathname + '?view=' + which);
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}
(function initViewFromURL(){
  const v = new URLSearchParams(location.search).get('view');
  openView(v === 'atlus' ? 'atlus' : (v === 'bonus' ? 'bonus' : (v === 'subs' ? 'subs' : 'home')));
})();

// ===== Login modal =====
const loginBox   = $('adminLoginBox');
const openBtn    = $('openAdminLogin');
const cancelBtn  = $('cancelAdminLogin');
const confirmBtn = $('confirmAdminLogin');
const passInput  = $('adminPassword');
const msgBox     = $('adminLoginMsg');
const logoutBtn  = $('logoutBtn');

if(openBtn){
  openBtn.addEventListener('click', ()=>{ msgBox.textContent = ""; passInput.value = ""; loginBox.style.display = 'grid'; passInput.focus(); });
}
if(cancelBtn){ cancelBtn.addEventListener('click', ()=> loginBox.style.display = 'none'); }
if(confirmBtn){
  confirmBtn.addEventListener('click', ()=>{ const ok = passInput.value === ADMIN_PASS;
    if(ok){ setAdmin(true); loginBox.style.display = 'none'; msgBox.textContent = ""; }
    else { msgBox.textContent = "Incorrect password."; }
  });
}
if(passInput){ passInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ confirmBtn.click(); } }); }
if(logoutBtn){ logoutBtn.addEventListener('click', ()=> setAdmin(false)); }

// ===== Boot inicial =====
window.addEventListener('DOMContentLoaded', ()=>{
  // preencher inputs com defaults
  if ($('csvUrl'))     $('csvUrl').value     = DEFAULT_LINK;
  if ($('btCsvUrl'))   $('btCsvUrl').value   = BONUS_DEFAULT_LINK;
  if ($('svcCsvUrl'))  $('svcCsvUrl').value  = SVC_DEFAULT_LINK;

  const v = new URLSearchParams(location.search).get('view');
  if (v === 'atlus' && window.loadFromUrl) window.loadFromUrl(DEFAULT_LINK);
  if (v === 'bonus' && window.btLoad)      window.btLoad(BONUS_DEFAULT_LINK);
  if (v === 'subs'  && window.svcLoad)     window.svcLoad(SVC_DEFAULT_LINK);

  // auto-refresh (Atlus)
  const auto = $('autoRefresh');
  if (auto) auto.addEventListener('change', e=>{
    if(e.target.checked){
      if(!window.__auto){ window.__auto=setInterval(()=> window.loadFromUrl && window.loadFromUrl($('csvUrl').value), 5*60*1000); }
    }else{
      if(window.__auto){ clearInterval(window.__auto); window.__auto=null; }
    }
  });
  if (auto) auto.dispatchEvent(new Event('change'));

  setUpdated();
});

// Redesenhar fontes/ticks ao mudar mobile/desktop
MOBILE.addEventListener?.('change', () => {
  try{
    [window.leadsChart, window.roiChart, window.profitChart,
     window.svcPlansChart, window.svcArvChart, window.svcCountChart, window.svcActiveChart]
      .filter(Boolean).forEach(ch => ch.update('none'));
  }catch(e){}
});

