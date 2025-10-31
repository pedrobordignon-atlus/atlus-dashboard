function $bt(id){ return document.getElementById(id); }
function btChip(t){ return chip(t); }
function btChips(msgs){ chips('btStatusChips', msgs); }

function toNumUSD(x){
  if (x==null || x==='') return 0;
  let s = String(x).replace(/[^0-9.\-]/g,'').trim();
  if ((s.match(/\./g)||[]).length>1) s = s.replace(/\.(?=.*\.)/g,'');
  const n = parseFloat(s);
  return isFinite(n)?n:0;
}
function btDetectColumns(headers){
  const h=headers.map(x=>String(x||'').toLowerCase());
  const find = keys => { for(let i=0;i<h.length;i++){ for(let j=0;j<keys.length;j++){ if(h[i].includes(keys[j])) return i; } } return -1; };
  return { name:find(['name']), owner:find(['owner','tech']), status:find(['status']), job:find(['job']),
          contract:find(['contract']), bonus:find(['bonus']), notes:find(['note']) };
}
let BT_ALL = [], BT_VIEW = [];

function btParseCSV(text){
  const res = Papa.parse(text, { skipEmptyLines:true });
  const rows = res.data || [];
  if(rows.length < 2) return { rows:[] };

  const headers = rows[0].map(c=>String(c||''));
  const col = btDetectColumns(headers);

  const out=[];
  for(let i=1;i<rows.length;i++){
    const r = rows[i] || [];
    const get = idx => (idx>=0 && idx<r.length) ? r[idx] : '';
    const statusRaw = String(get(col.status)).trim();
    const status = /^pend/i.test(statusRaw) ? 'Pending' : (statusRaw || '');
    out.push({
      Name: String(get(col.name)).trim(),
      Owner: String(get(col.owner)).trim(),
      Status: status,
      Job: String(get(col.job)).trim(),
      Contract: toNumUSD(get(col.contract)),
      Bonus: toNumUSD(get(col.bonus)),
      Notes: String(get(col.notes)).trim()
    });
  }
  return { rows: out };
}
function btFillFilters(data){
  const owners = [...new Set(data.map(r=>r.Owner).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const s=$bt('btOwner'); if(!s) return;
  s.innerHTML=''; const o=document.createElement('option'); o.value=''; o.textContent='All owners'; s.appendChild(o);
  owners.forEach(v=>{ const e=document.createElement('option'); e.value=v; e.textContent=v; s.appendChild(e); });
}
function btApply(){
  const owner = $bt('btOwner').value;
  const status = $bt('btStatus').value;
  const jobSub = $bt('btJobSearch').value.trim().toLowerCase();

  BT_VIEW = BT_ALL.filter(r=>{
    if(owner && r.Owner!==owner) return false;
    if(status && r.Status!==status) return false;
    if(jobSub && !String(r.Job||'').toLowerCase().includes(jobSub)) return false;
    return true;
  });

  const jobs = BT_VIEW.length;
  const completed = BT_VIEW.filter(r=>r.Status==='Completed').length;
  const pending = BT_VIEW.filter(r=>r.Status==='Pending').length;
  const contractTotal = BT_VIEW.reduce((a,b)=>a+(b.Contract||0),0);
  const bonusTotal = BT_VIEW.reduce((a,b)=>a+(b.Bonus||0),0);
  const avgBonus = jobs>0 ? (bonusTotal/jobs) : 0;

  $bt('btJobs').textContent          = fmtInt(jobs);
  $bt('btCompleted').textContent     = fmtInt(completed);
  $bt('btPending').textContent       = fmtInt(pending);
  $bt('btContractTotal').textContent = fmtUSD(contractTotal);
  $bt('btBonusTotal').textContent    = fmtUSD(bonusTotal);
  $bt('btAvgBonus').textContent      = fmtUSD(avgBonus);

  const T=$bt('btTable'); if(!T) return; T.innerHTML='';
  BT_VIEW.forEach(r=>{
    const row=document.createElement('div');
    row.style.display='grid';
    row.style.gridTemplateColumns='1.2fr 1fr 0.9fr 2fr 0.9fr 0.9fr';
    row.style.gap='10px'; row.style.padding='10px';
    row.style.border='1px solid var(--border)'; row.style.borderRadius='12px';
    row.style.background='#081b2b';
    row.innerHTML = `
      <div><b>${r.Name||'-'}</b></div>
      <div>${r.Owner||'-'}</div>
      <div>${r.Status||'-'}</div>
      <div>${r.Job||'-'}</div>
      <div>${fmtUSD(r.Contract||0)}</div>
      <div>${fmtUSD(r.Bonus||0)}</div>`;
    T.appendChild(row);
  });
}
function btNormalizeUrl(u){
  if(!u)return'';
  if(/tqx=out:csv/.test(u))return u;
  if(/\/pub\?/.test(u)&&/output=csv/.test(u))return u;
  const m=u.match(/spreadsheets\/d\/([^\/]+).*?[#\?].*?gid=(\d+)/);
  if(m)return 'https://docs.google.com/spreadsheets/d/'+m[1]+'/gviz/tq?tqx=out:csv&gid='+m[2];
  return u;
}
function btWithBust(url){ const s=url.includes('?')?'&':'?'; return url+s+'t='+(Date.now()); }

// API pública
window.btLoad = function(url){
  const norm = btNormalizeUrl((url||'').trim());
  if(!norm){ btChips(['Paste a valid CSV link']); return; }
  btChips(['Loading…']);
  fetch(btWithBust(norm))
    .then(r=>{ if(r.ok) return r.text(); throw new Error('HTTP '+r.status); })
    .then(text=>{
      const parsed = btParseCSV(text);
      if(!parsed.rows.length){ btChips(['Empty CSV or headers not recognized']); return; }
      BT_ALL = parsed.rows;
      btFillFilters(BT_ALL);
      $bt('btOwner').value=''; $bt('btStatus').value=''; $bt('btJobSearch').value='';
      btApply();
      btChips(['CSV loaded: '+BT_ALL.length+' rows']); setUpdated();
    })
    .catch(err=>{ btChips(['Failed to load CSV: '+err.message]); console.error(err); });
};

// Eventos
['btOwner','btStatus'].forEach(id=> $bt(id)?.addEventListener('change', btApply));
$bt('btJobSearch')?.addEventListener('input', btApply);
$bt('btClear')?.addEventListener('click', ()=>{ $bt('btOwner').value=''; $bt('btStatus').value=''; $bt('btJobSearch').value=''; btApply(); });
$bt('btReload')?.addEventListener('click', ()=> window.btLoad($bt('btCsvUrl').value));
document.getElementById('btReloadPublic')?.addEventListener('click', (e)=>{ e.preventDefault(); window.btLoad($bt('btCsvUrl').value); });

