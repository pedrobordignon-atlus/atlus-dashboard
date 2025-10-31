function $svc(id){ return document.getElementById(id); }

function svcDetectColumns(headers){
  const h = headers.map(c => String(c||'').toLowerCase().trim());
  const find = keys => { for (let i=0;i<h.length;i++){ for (let j=0;j<keys.length;j++){ if(h[i] === keys[j] || h[i].includes(keys[j])) return i; } } return -1; };
  return {
    id:         find(['customer id','id']),
    customer:   find(['customer','name']),
    subs:       find(['subscription','plan']),
    active:     find(['active']),
    rep:        find(['sales rep','rep']),
    dateSold:   find(['date sold','sold']),
    initDate:   find(['initial service','initial service date','start']),
    status:     find(['status']),
    balance:    find(['balance']),
    arv:        find(['annual recurring value','arv'])
  };
}
function svcParseCSV(text){
  const res = Papa.parse(text, { skipEmptyLines: true });
  const rows = res.data || [];
  if (rows.length < 2) return { rows: [] };

  const headers = rows[0].map(x => String(x||''));
  const col = svcDetectColumns(headers);

  const toMoney = v => {
    if (v==null) return 0;
    let s = String(v).replace(/[^0-9.\-]/g,'').trim();
    if ((s.match(/\./g)||[]).length>1) s = s.replace(/\.(?=.*\.)/g,'');
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  };

  const out = [];
  for (let i=1;i<rows.length;i++){
    const r = rows[i] || [];
    const get = idx => (idx>=0 && idx<r.length) ? r[idx] : '';
    out.push({
      CustomerID: String(get(col.id)).trim(),
      Customer:   String(get(col.customer)).trim(),
      Subscription: String(get(col.subs)).trim(),
      Active:       String(get(col.active)).trim(),
      SalesRep:     String(get(col.rep)).trim(),
      DateSold:     String(get(col.dateSold)).trim(),
      InitialServiceDate: String(get(col.initDate)).trim(),
      Status:       String(get(col.status)).trim(),
      Balance:      toMoney(get(col.balance)),
      ARV:          toMoney(get(col.arv))
    });
  }
  return { rows: out };
}

// ===== Cycle note =====
function svcParseDate(str){
  if(!str) return null;
  const s = String(str).trim();
  let d = new Date(s);
  if(!isNaN(d)) return d;
  d = new Date(s.replace(/-/g,'/'));
  if(!isNaN(d)) return d;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if(m){
    const mm=+m[1]-1, dd=+m[2], yy=+m[3];
    const full=(yy>=70?1900+yy:2000+yy);
    const d2=new Date(full,mm,dd);
    if(!isNaN(d2)) return d2;
  }
  return null;
}
function svcIsSameMonthYear(d,y,m){ return d && d.getFullYear()===y && d.getMonth()===m; }
function svcPrevMonth(y,m){ return (m===0)?{y:y-1,m:11}:{y:y,m:m-1}; }
function svcUpdateCycleNote(rows){
  const box = $('svcCycleNote'); if(!box) return;

  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth();
  const { y:py, m:pm } = svcPrevMonth(cy, cm);

  let soldThisMonth = 0;
  let servicedThisMonth = 0;
  let servicedThisMonth_soldLastMonth = 0;

  (rows||[]).forEach(r=>{
    const dSold = svcParseDate(r?.DateSold);
    const dInit = svcParseDate(r?.InitialServiceDate);

    if (dSold && svcIsSameMonthYear(dSold, cy, cm)) soldThisMonth++;
    if (dInit && svcIsSameMonthYear(dInit, cy, cm)) servicedThisMonth++;

    if (dInit && svcIsSameMonthYear(dInit, cy, cm) &&
        dSold && svcIsSameMonthYear(dSold, py, pm)) {
      servicedThisMonth_soldLastMonth++;
    }
  });

  const monthName = now.toLocaleString('en-US', { month:'long' });
  const prevName  = new Date(py, pm, 1).toLocaleString('en-US', { month:'long' });

  box.innerHTML = `
    <b>Cycle insight — ${monthName} ${cy}</b><br>
    One for <b>sold in ${monthName}</b>: <b>${soldThisMonth}</b> ·
    One for <b>serviced in ${monthName}</b>: <b>${servicedThisMonth}</b> ·
    Combined: <b>serviced in ${monthName}</b> but <b>sold in ${prevName}</b>: <b>${servicedThisMonth_soldLastMonth}</b>.
  `;
}

// ===== Aggregates + charts =====
function svcComputeAggregates(list){
  const total = list.length;
  const active = list.filter(r=>/^y(es)?$/i.test(r.Active)).length;
  const arvSum = list.reduce((a,b)=>a+(b.ARV||0),0);
  const balSum = list.reduce((a,b)=>a+(b.Balance||0),0);
  const byRep={};
  list.forEach(r=>{
    const k=r.SalesRep||'—';
    (byRep[k]||(byRep[k]={count:0,arv:0}));
    byRep[k].count++;
    byRep[k].arv += (r.ARV||0);
  });
  return {total,active,arv:arvSum,balance:balSum,byRep};
}
function svcRenderKpis(agg){
  $('svcKpiCount').textContent   = isFinite(agg.total)? agg.total.toLocaleString('en-US') : '—';
  $('svcKpiActive').textContent  = isFinite(agg.active)? agg.active.toLocaleString('en-US') : '—';
  $('svcKpiARV').textContent     = fmtUSD(agg.arv||0);
  $('svcKpiBalance').textContent = fmtUSD(agg.balance||0);
}

window.svcArvChart=null; window.svcCountChart=null; window.svcActiveChart=null; window.svcPlansChart=null;

function svcRenderCharts(agg, rows){
  // Donut
  const active = agg.active;
  const inactive = Math.max(0, (agg.total||0) - active);
  const actEl = $('svcChartActive');
  if (actEl){
    if(window.svcActiveChart) window.svcActiveChart.destroy();
    window.svcActiveChart = new Chart(actEl.getContext('2d'),{
      type:'doughnut',
      data:{ labels:['Active','Inactive'],
        datasets:[{ data:[active, inactive],
          backgroundColor:['rgba(25,195,125,.85)','rgba(255,107,107,.85)'],
          borderColor:['#19c37d','#ff6b6b'], borderWidth:1 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } }
    });
  }

  // Top plans
  const planCount = {};
  (rows||[]).forEach(r=>{
    const p = r.Subscription?.trim() || '—';
    planCount[p] = (planCount[p]||0)+1;
  });
  const planPairs = Object.entries(planCount).map(([k,v])=>({k,v})).sort((a,b)=>b.v-a.v).slice(0,12);
  const planLabels = planPairs.map(p=>p.k);
  const planValues = planPairs.map(p=>p.v);
  if(window.svcPlansChart) window.svcPlansChart.destroy();
  window.svcPlansChart = new Chart($('svcChartPlans').getContext('2d'),{
    type:'bar',
    data:{ labels:planLabels, datasets:[{ label:'# Subs', data:planValues,
      backgroundColor:'rgba(124,92,255,.55)', borderColor:'var(--purple)', borderWidth:1 }]},
    options:{
      responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{ display:false }, grid:{ display:false }, border:{ display:false } },
        y:{ beginAtZero:true, ticks:{ font:{ size:11 } } }
      }
    }
  });

  // ARV por rep
  const reps = Object.keys(agg.byRep).sort((a,b)=> (agg.byRep[b].arv - agg.byRep[a].arv));
  const arvData = reps.map(k=> +(agg.byRep[k].arv||0).toFixed(2));
  const cntData = reps.map(k=> agg.byRep[k].count||0);

  if(window.svcArvChart) window.svcArvChart.destroy();
  window.svcArvChart = new Chart($('svcChartArvByRep').getContext('2d'),{
    type:'bar',
    data:{labels:reps,datasets:[{label:'ARV ($)',data:arvData,borderColor:'var(--gold)',backgroundColor:'rgba(255,184,28,.30)'}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>fmtUSD(ctx.parsed.x)}}},scales:{x:{beginAtZero:true,ticks:{callback:v=>fmtUSD(v)}}}}
  });

  if(window.svcCountChart) window.svcCountChart.destroy();
  window.svcCountChart = new Chart($('svcChartCountByRep').getContext('2d'),{
    type:'bar',
    data:{labels:reps,datasets:[{label:'# Subs',data:cntData,backgroundColor:'rgba(0,119,200,.60)',borderColor:'var(--blue)'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}
  });
}

// ===== Tabela (opcional/oculta) =====
function svcRender(list){
  const T = $('svcTable'); if(!T) return;
  T.innerHTML = '';
  const header = document.createElement('div');
  header.style.display='grid';
  header.style.gridTemplateColumns='0.85fr 1.4fr 1fr 0.6fr 0.9fr 0.9fr 0.9fr 0.7fr 0.8fr 0.9fr';
  header.style.gap='10px';
  header.style.padding='8px 10px';
  header.style.color='var(--text-dim)';
  header.innerHTML = `
    <div>Customer ID</div><div>Customer</div><div>Subscription</div><div>Active</div>
    <div>Sales Rep</div><div>Date Sold</div><div>Initial Service</div><div>Status</div>
    <div>Balance</div><div>ARV</div>`;
  T.appendChild(header);

  list.forEach(r=>{
    const row = document.createElement('div');
    row.style.display='grid';
    row.style.gridTemplateColumns='0.85fr 1.4fr 1fr 0.6fr 0.9fr 0.9fr 0.9fr 0.7fr 0.8fr 0.9fr';
    row.style.gap='10px';
    row.style.padding='10px';
    row.style.border='1px solid var(--border)';
    row.style.borderRadius='12px';
    row.style.background='#081b2b';
    row.innerHTML = `
      <div>${r.CustomerID || '-'}</div>
      <div><b>${r.Customer || '-'}</b></div>
      <div>${r.Subscription || '-'}</div>
      <div>${r.Active || '-'}</div>
      <div>${r.SalesRep || '-'}</div>
      <div>${r.DateSold || '-'}</div>
      <div>${r.InitialServiceDate || '-'}</div>
      <div>${r.Status || '-'}</div>
      <div>${fmtUSD(r.Balance || 0)}</div>
      <div>${fmtUSD(r.ARV || 0)}</div>`;
    T.appendChild(row);
  });
}

// ===== Loader público (usado pelo router) =====
function svcWithBust(url){ const s = url.includes('?') ? '&' : '?'; return url + s + 't=' + Date.now(); }
window.svcLoad = function(url){
  const link = (url||'').trim();
  if(!link){ alert('Paste a valid CSV link'); return; }
  fetch(svcWithBust(link))
    .then(r=>{ if(r.ok) return r.text(); throw new Error('HTTP '+r.status); })
    .then(text=>{
      const parsed = svcParseCSV(text);
      svcUpdateCycleNote(parsed.rows);
      const agg = svcComputeAggregates(parsed.rows);
      svcRenderKpis(agg);
      svcRenderCharts(agg, parsed.rows);
      setUpdated();
    })
    .catch(err=>{
      console.error(err);
      alert('Failed to load CSV: ' + err.message);
    });
};

// Eventos
$('svcReload')?.addEventListener('click', ()=> window.svcLoad($('svcCsvUrl').value));
document.getElementById('svcReloadPublic')?.addEventListener('click', (e)=>{ e.preventDefault(); window.svcLoad($('svcCsvUrl').value); });

