// ========================= Dados simulados (exemplo) =========================
const sampleData = [
  { plan: 'PEST QUARTERLY', arv: 21384, rep: 'David Brown' },
  { plan: 'TRELONA TERMITE BAIT', arv: 15820, rep: 'Shauna Perry' },
  { plan: 'WDIIR LETTERS', arv: 12200, rep: 'Alyssa Sohn' },
  { plan: 'TERMITE INSPECTION', arv: 4500, rep: 'Alex Franco' },
  { plan: 'RODENT STATION', arv: 2800, rep: 'Tara Bean' },
];

// ========================= Função para atualizar horário =========================
function setUpdated() {
  const el = document.getElementById("lastUpdated");
  if (el) {
    const now = new Date();
    el.textContent = now.toLocaleTimeString();
  }
}

// ========================= Renderização de gráficos =========================
function renderCharts() {
  const plans = [...new Set(sampleData.map(x => x.plan))];
  const counts = plans.map(p => sampleData.filter(x => x.plan === p).length);

  const reps = [...new Set(sampleData.map(x => x.rep))];
  const arvData = reps.map(r => sampleData.filter(x => x.rep === r).reduce((a,b)=>a+b.arv,0));
  const subsData = reps.map(r => sampleData.filter(x => x.rep === r).length);

  // Top Plans
  new Chart(document.getElementById('svcChartPlans').getContext('2d'), {
    type: 'bar',
    data: { labels: plans, datasets: [{ data: counts, backgroundColor: 'rgba(124,92,255,.55)', borderColor: '#7c5cff', borderWidth: 1 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { display: false } }, y: { beginAtZero: true } }
    }
  });

  // ARV per Sales Rep
  new Chart(document.getElementById('svcChartArvByRep').getContext('2d'), {
    type: 'bar',
    data: { labels: reps, datasets: [{ data: arvData, backgroundColor: 'rgba(255,184,28,.3)', borderColor: '#ffb81c', borderWidth: 1 }] },
    options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
  });

  // # Subscriptions per Sales Rep
  new Chart(document.getElementById('svcChartCountByRep').getContext('2d'), {
    type: 'bar',
    data: { labels: reps, datasets: [{ data: subsData, backgroundColor: 'rgba(0,119,200,.6)', borderColor: '#0077c8', borderWidth: 1 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });

  setUpdated();
}

window.addEventListener('DOMContentLoaded', renderCharts);

