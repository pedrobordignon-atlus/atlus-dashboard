// ======== Parsers/Helpers Atlus ========
function detectColumns(headers){
  const h=headers.map(x=>String(x||'').toLowerCase());
  const find = keys => { for(let i=0;i<h.length;i++){ for(let j=0;j<keys.length;j++){ if(h[i].includes(keys[j])) return i; } } return -1; };
  return { platform:find(['platform','source']), location:find(['location','market']),
          metric:find(['metric','indicator']), monthyear:find(['monthyear','period','date']),
          month:find(['month']), value:find(['value','amount','qty','number']) };
}
function parseCSVText(text){
  const res=Papa.parse(text,{skipEmptyLines:true});
  const rows=res.data||[]; if(rows.length<2) return {headers:[],rows:[]};
  const headers=rows[0].map(x=>String(x||'')); const col=detectColumns(headers);
  const out=[];
  for(let i=1;i<rows.length;i++){
    const r=rows[i]; if(!r||!r.length)continue;
    const get=idx=> (idx>=0&&idx<r.length)?r[idx]:''; 
    out.push({ Platform:String(get(col.platform)).trim(),
              Location:String(get(col.location)).trim(),
              Metric:String(get(col.metric)).trim(),
              Month:String(col.monthyear>=0?get(col.monthyear):(col.month>=0?get(col.month):'')).trim(),
              ValueRaw:get(col.value) });
  }
  return {headers,rows:out};
}
function pivotLong(rows){
  const map={}, out=[];
  rows.forEach(r=>{
    if(!r || !r.Month || !r.Platform) return;
    if(r.Month==='#DIV/0!'||r.Platform==='#DIV/0!') return;

    const plat = String(r.Platform||'').trim();
    const platN = plat.toLowerCase();
    const locRaw = String(r.Location||'').trim();
    const locN = locRaw.toLowerCase();
    const loc = locRaw || 'All locations';
    if ((locN==='all locations'||locN==='all location') && platN!=='thumbtack') return;

    const k = [r.Month, loc, plat].join('||');
    (map[k]||(map[k]=[])).push({ Month:r.Month, Location:loc, Platform:plat, Metric:r.Metric, ValueRaw:r.ValueRaw });
  });

  Object.keys(map).forEach(k=>{
    const [Month,Location,Platform]=k.split('||');
    const rec = {Month, Location, Platform, Leads:0, Spend:0, JobsClosed:0, ContractTotal:0, Profit:0, ROI:null, CPJ:0, GoodPct:null};
    map[k].forEach(row=>{
      const m = String(row.Metric||'').toLowerCase();
      const raw = (row.ValueRaw==null?'':String(row.ValueRaw));
      let s = raw.trim().replace(/[^0-9.\-]/g,''); if((s.match(/\./g)||[]).length>1) s=s.replace(/\.(?=.*\.)/g,'');
      let v = parseFloat(s); v = isFinite(v)?v:0;

      if ((m.includes('spend') && !m.includes('daily')) || m.includes('monthly spend')) rec.Spend += v;
      else if (m.includes('number of leads')) rec.Leads += v;
      else if (m.includes('closed job')) rec.JobsClosed += v;
      else if (m.includes('contract total')) rec.ContractTotal += v;
      else if (m==='roi' || m==='roi (%)'){
        let t=v; if(raw.includes('%')) t=(+raw.replace(/[^0-9.\-]/g,''))/100;
        if(t>1.5)t/=100; rec.ROI=t;
      }
      else if (m.includes('% good')){
        let t=v; if(raw.includes('%')) t=(+raw.replace(/[^0-9.\-]/g,''))/100;
        if(t>1.5)t/=100; rec.GoodPct=t;
      }
      else if (m.includes('profit')) rec.Profit += v;
    });

    if(!rec.Profit) rec.Profit = rec.ContractTotal - rec.Spend;
    if(rec.ROI==null) rec.ROI = rec.Spend>0 ? rec.Profit/rec.Spend : 0;
    rec.CPJ = rec.JobsClosed>0 ? rec.Spend/rec.JobsClosed : 0;

    rec.Leads = Math.round(rec.Leads);
    rec.JobsClosed = Math.round(rec.JobsClosed);
    rec.Spend = +rec.Spend.toFixed(2);
    rec.ContractTotal = +rec.ContractTotal.toFixed(2);
    rec.Profit = +rec.Profit.toFixed(2);

    out.push(rec);
  });

  return out;
}
function uniqSortedClean(arr, excludeAllLocations){
  const seen={}, out=[];
  arr.forEach(s=>{
    const t=String(s||'').trim(); const n=t.toLowerCase();
    if(excludeAllLocations && (n==='all locations'||n==='all location')) return;
    if(!seen[n]){ seen[n]=true; out.push(t); }
  });
  return out.sort();
}
function sum(arr,k){ let t=0; for(let i=0;i<arr.length;i++){ t += (+arr[i][k]||0) } return t }
function daysInMonth(name){
  const d = new Date(name+' 01'); if(isNaN(d)) return 30;
  const y=d.getFullYear(), m=d.getMonth(); return new Date(y, m+1, 0).getDate();
}

// ======== Estado Atlus ========
let original=[], filtered=[];
window.leadsChart=null; window.roiChart=null; window.profitChart=null;

// ======== UI / filtros / KPIs ========
function fillFilters(data){
  const months = [...new Set(data.map(r=>r.Month))].sort((a,b)=> new Date(a) - new Date(b));
  const locs  = uniqSortedClean(data.map(r=>r.Location), true);
  const plats = uniqSortedClean(data.map(r=>r.Platform), false);

  const fixLabel = (t) => (String(t||'').trim().toLowerCase() === 'pendig') ? 'Pending' : String(t||'').trim();

  const fill = (id, arr, label)=>{
    const s=$(id); s.innerHTML='';
    const opt=document.createElement('option'); opt.value=''; opt.textContent='All '+label; s.appendChild(opt);
    arr.forEach(v=>{
      const e=document.createElement('option');
      e.value=v; e.textContent=fixLabel(v);
      s.appendChild(e);
    });
  };
  fill('monthFilter', months, 'months');
  fill('locationFilter', locs,  'locations');
  fill('platformFilter', plats, 'platforms');
}
function applyFilters(){
  const m=$('monthFilter').value, l=$('locationFilter').value, p=$('platformFilter').value;
  filtered = original.filter(r => (m?r.Month===m:true) && (l?r.Location===l:true) && (p?r.Platform===p:true));
  updateKPIs(); updateCharts();
}
function updateKPIs(){
  const leads = sum(filtered,'Leads'),
        spend = sum(filtered,'Spend'),
        jobs  = sum(filtered,'JobsClosed'),
        contract = sum(filtered,'ContractTotal'),
        profit   = sum(filtered,'Profit'),
        roi = spend>0 ? profit/spend : 0;

  let days = 0;
  const monthSel = $('monthFilter').value;
  if(monthSel){ days = daysInMonth(monthSel); }
  else{
    const months = [...new Set(filtered.map(r=>r.Month))];
    if(months.length>0) days = months.map(daysInMonth).reduce((a,b)=>a+b,0);
    if(days===0) days = 30;
  }
  const daily = spend>0 ? spend/Math.max(1, days) : 0;
  const closeRate = leads>0 ? (jobs/leads) : 0;

  let wNum=0, wDen=0;
  filtered.forEach(r=>{ if(r.GoodPct!=null && r.Leads>0){ wNum += r.GoodPct * r.Leads; wDen += r.Leads; }});
  const goodPct = (wDen>0) ? (wNum/wDen) : null;

  $('kpiLeads').textContent     = fmtInt(Math.round(leads));
  $('kpiSpend').textContent     = fmtUSD(spend);
  $('kpiJobs').textContent      = fmtInt(Math.round(jobs));
  $('kpiContract').textContent  = fmtUSD(contract);
  $('kpiProfit').textContent    = fmtUSD(profit);
  $('kpiROI').textContent       = isFinite(roi)?((roi*100).toFixed(1)+'%'):'—';
  $('kpiDaily').textContent     = fmtUSD(daily);
  $('kpiClose').textContent     = (closeRate*100).toFixed(1)+'%';
  $('kpiGood').textContent      = (goodPct==null)?'—':((goodPct*100).toFixed(1)+'%');
}
function updateCharts(){
  // Leads per platform
  const mp={}; filtered.forEach(r=>{ mp[r.Platform]=(mp[r.Platform]||0)+(r.Leads||0) });
  const l1=Object.keys(mp), d1=l1.map(k=>mp[k]);
  if(window.leadsChart) window.leadsChart.destroy();
  window.leadsChart=new Chart($('chartLeads').getContext('2d'),{
    type:'bar',
    data:{labels:l1,datasets:[{label:'Leads',data:d1,backgroundColor:'rgba(56,189,248,.55)',borderColor:'var(--sky)',borderWidth:1}]},
    options:{
      responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{
        x:{ ticks:Object.assign({ font: mobFont(11,10), maxRotation:0, minRotation:0 }, mobTicks(true,false)), grid:{display:!MOBILE.matches}, border:{display:!MOBILE.matches} },
        y:{ beginAtZero:true, ticks:{ font: mobFont(11,10) } }
      }
    }
  });

  // ROI por location
  const byLoc={};
  filtered.forEach(r=>{
    const n = norm(r.Location);
    if(n==='all locations'||n==='all location') return;
    (byLoc[r.Location]||(byLoc[r.Location]={s:0,p:0})).s += r.Spend||0;
    (byLoc[r.Location]).p += r.Profit||0;
  });
  const l2=Object.keys(byLoc), d2=l2.map(loc=>{
    const o=byLoc[loc]; return o.s>0?+((o.p/o.s)*100).toFixed(1):0;
  });
  if(window.roiChart) window.roiChart.destroy();
  window.roiChart=new Chart($('chartROI').getContext('2d'),{
    type:'bar',
    data:{labels:l2,datasets:[{label:'ROI (%)',data:d2,backgroundColor:'rgba(45,212,191,.55)',borderColor:'var(--teal)',borderWidth:1}]},
    options:{
      indexAxis:'y',
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{ x:{beginAtZero:true,ticks:{ font: mobFont(11,10), callback:v=>Number(v).toFixed(1)+'%' }},
               y:{ticks:{ font: mobFont(11,10) }} }
    }
  });

  // Profit por location
  const agg={}, pairs=[];
  filtered.forEach(r=>{
    const n=norm(r.Location); if(n==='all locations'||n==='all location') return;
    agg[r.Location]=(agg[r.Location]||0)+(r.Profit||0);
  });
  Object.keys(agg).forEach(k=>pairs.push({l:k,v:agg[k]}));
  const pPairs = pairs.filter(p=>p.v!==0).sort((a,b)=>b.v-a.v);
  const pLabels = pPairs.map(p=>p.l), pData=pPairs.map(p=>+p.v.toFixed(2));
  if(window.profitChart) window.profitChart.destroy();
  window.profitChart=new Chart($('chartProfit').getContext('2d'),{
    type:'bar',
    data:{labels:pLabels,datasets:[{label:'Profit ($)',data:pData,borderColor:'var(--gold)',backgroundColor:'rgba(255,184,28,.30)'}]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:ctx=>fmtUSD(ctx.parsed.y)}}},
      scales:{ x:{ ticks:{ font: mobFont(11,10), maxRotation:0, minRotation:0 } },
               y:{ beginAtZero:true, ticks:{ font: mobFont(11,10), callback:v=>fmtUSD(v) } } }
    }
  });
}

// ======== Fetch CSV ========
function normalizeUrl(u){
  if(!u)return'';
  if(/tqx=out:csv/.test(u))return u;
  if(/\/pub\?/.test(u)&&/output=csv/.test(u))return u;
  const m=u.match(/spreadsheets\/d\/([^\/]+).*?[#\?].*?gid=(\d+)/);
  if(m)return 'https://docs.google.com/spreadsheets/d/'+m[1]+'/gviz/tq?tqx=out:csv&gid='+m[2];
  return u;
}
function withBust(url){ const s=url.includes('?')?'&':'?'; return url+s+'t='+(Date.now()) }
function fetchCsvText(url){
  url = withBust(url);
  return fetch(url,{mode:'cors'}).then(r=>{
    if(r.ok) return r.text();
    throw new Error('HTTP '+r.status);
  }).catch(()=>{
    const prox=(url.indexOf('https://')===0?'https://r.jina.ai/http://':'https://r.jina.ai/https://')+url.replace(/^https?:\/\//,'');
    return fetch(prox).then(r2=>{
      if(r2.ok) return r2.text();
      return fetch('https://cors.isomorphic-git.org/'+url).then(r3=>{
        if(r3.ok) return r3.text();
        throw new Error('All proxies failed');
      });
    });
  });
}

// ======== API pública p/ router ========
window.loadFromUrl = function(url){
  const normUrl=normalizeUrl((url||'').trim());
  if(!normUrl){ chips('statusChips',['Paste a valid CSV link']); return; }
  chips('statusChips',['Loading…']);
  fetchCsvText(normUrl).then(text=>{
    const parsed=parseCSVText(text);
    if(!parsed.rows||parsed.rows.length===0){ chips('statusChips',['Empty CSV or headers not recognized']); return; }
    original=pivotLong(parsed.rows);
    fillFilters(original);
    $('monthFilter').value=''; $('locationFilter').value=''; $('platformFilter').value='';
    filtered=original.slice(0);
    applyFilters();
    chips('statusChips',['CSV loaded: '+parsed.rows.length+' rows']);
    setUpdated();
  }).catch(err=>{
    chips('statusChips',['Failed to load CSV: '+err.message]); console.error(err);
  });
};
function loadFromFile(file){
  chips('statusChips',['Reading local CSV…']);
  Papa.parse(file,{complete:function(res){
    try{
      const csvText=Papa.unparse(res.data);
      const parsed=parseCSVText(csvText);
      if(!parsed.rows||parsed.rows.length===0){chips('statusChips',['Local CSV empty']); return;}
      original=pivotLong(parsed.rows);
      fillFilters(original);
      $('monthFilter').value=''; $('locationFilter').value=''; $('platformFilter').value='';
      filtered=original.slice(0);
      applyFilters();
      chips('statusChips',['Local CSV loaded']); setUpdated();
    }catch(e){ chips('statusChips',['Local parse error: '+e.message]); }
  }});
}

// ======== Eventos Atlus ========
if ($('reloadAtlus')) $('reloadAtlus').addEventListener('click',()=>window.loadFromUrl($('csvUrl').value));
if ($('csvFile')) $('csvFile').addEventListener('change',e=>{ const f=e.target.files[0]; if(f)loadFromFile(f); });
if ($('clearFilters')) $('clearFilters').addEventListener('click',()=>{ $('monthFilter').value=''; $('locationFilter').value=''; $('platformFilter').value=''; applyFilters(); });
['monthFilter','locationFilter','platformFilter'].forEach(id=> $(id)?.addEventListener('change',applyFilters));

