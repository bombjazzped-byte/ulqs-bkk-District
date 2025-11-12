const intervals=[
  {label:'แย่มาก',min:0.00,max:0.20,color:'#d73027',text:'#fff'},
  {label:'แย่',min:0.20,max:0.40,color:'#fc8d59',text:'#fff'},
  {label:'ปานกลาง',min:0.40,max:0.60,color:'#fee08b',text:'#111'},
  {label:'ดี',min:0.60,max:0.80,color:'#91cf60',text:'#111'},
  {label:'ดีมาก',min:0.80,max:1.01,color:'#1a9850',text:'#fff'}
];
function findInterval(v){for(const itv of intervals){if(v>=itv.min && v<itv.max) return itv;}return intervals[0];}
function formatScore(v){const n=Number(v); return Number.isFinite(n)? n.toFixed(2): '-';}

function normalizeHeaders(row){
  const out={};
  for (const k of Object.keys(row)){
    const key=k.trim();
    if (['DISTRICT','เขต'].includes(key)) out.DISTRICT=row[k];
    else if (['SCORE','คะแนน'].includes(key)) out.SCORE=row[k];
    else if (['INTERVAL','ช่วงชั้น'].includes(key)) out.INTERVAL=row[k];
  }
  return out;
}

function showStatus(msg){
  const el=document.getElementById('status');
  el.textContent=msg;
  el.style.display=msg?'block':'none';
}

function parseCsvText(text){
  const parsed=Papa.parse(text,{header:true,skipEmptyLines:true});
  const rows=parsed.data.map(r=>{
    const m=normalizeHeaders(r);
    return {
      DISTRICT:(m.DISTRICT||'').trim(),
      SCORE:Number((m.SCORE||'').toString().replace(',','.')),
      INTERVAL:(m.INTERVAL||'').trim()
    };
  }).filter(r=>r.DISTRICT && Number.isFinite(r.SCORE));
  return rows;
}

async function fetchCsv(url){
  const u=new URL(url);
  u.searchParams.set('_',Date.now().toString());
  const res=await fetch(u.toString(),{cache:'no-store',mode:'cors'});
  if(!res.ok) throw new Error('HTTP '+res.status+' '+res.statusText);
  const text=await res.text();
  return parseCsvText(text);
}

function makeLegend(){
  const ul=document.getElementById('legend'); ul.innerHTML='';
  intervals.forEach(itv=>{
    const li=document.createElement('li');
    li.innerHTML=`<span class="badge" style="background:${itv.color};color:${itv.text}">${itv.label}</span>
    <span style="margin-left:8px">${itv.min.toFixed(2)}–${(itv.max-0.01).toFixed(2)}</span>`;
    ul.appendChild(li);
  });
}

let currentRows=[];
let currentSortKey='SCORE';
let currentSortDir='desc';

function renderTable(rows){
  const tbody=document.querySelector('#tbl tbody'); tbody.innerHTML='';
  rows.forEach(r=>{
    const itv=findInterval(r.SCORE);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${r.DISTRICT}</td>
      <td>${formatScore(r.SCORE)}</td>
      <td><span class="badge" style="background:${itv.color};color:${itv.text}">${itv.label}</span></td>`;
    tbody.appendChild(tr);
  });
}

let bar;
function renderChart(rows){
  const ctx=document.getElementById('barChart').getContext('2d');
  if(bar) bar.destroy();
  const labels=rows.map(r=>r.DISTRICT);
  const data=rows.map(r=>Number(r.SCORE.toFixed(2)));
  const colors=rows.map(r=>findInterval(r.SCORE).color);
  bar=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'คะแนน (0–1)',data,backgroundColor:colors}]},
    options:{responsive:true,scales:{y:{beginAtZero:true,max:1}}}});
}

function sortRows(rows,key,dir){
  const s=[...rows];
  s.sort((a,b)=>{
    const va=a[key], vb=b[key];
    if (typeof va==='number' && typeof vb==='number') return dir==='asc'? va-vb : vb-va;
    return dir==='asc'? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
  return s;
}

function applySortAndRender(){
  const rows=sortRows(currentRows,currentSortKey,currentSortDir);
  renderTable(rows);
  renderChart(rows);
}

async function handleLoadUrl(){
  const url=document.getElementById('csvUrl').value.trim();
  if(!url){ showStatus('กรุณาวาง URL CSV'); return; }
  try{
    showStatus('กำลังโหลดข้อมูลจาก URL ...');
    const rows=await fetchCsv(url);
    if(!rows.length) throw new Error('ไม่พบข้อมูล หรือหัวคอลัมน์ไม่ตรง (DISTRICT/SCORE/INTERVAL หรือ เขต/คะแนน/ช่วงชั้น)');
    currentRows=rows;
    showStatus('โหลดสำเร็จ • แถวข้อมูล: '+rows.length);
    applySortAndRender();
  }catch(e){
    console.error(e);
    showStatus('โหลดข้อมูลไม่สำเร็จ: '+e.message+' • ให้ลองใช้ปุ่มเลือกไฟล์ CSV แทน');
  }
}

function handleFileUpload(ev){
  const file=ev.target.files[0];
  if(!file) return;
  showStatus('กำลังอ่านไฟล์ CSV ...');
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const rows=parseCsvText(reader.result);
      if(!rows.length) throw new Error('ไม่พบข้อมูล หรือหัวคอลัมน์ไม่ตรง');
      currentRows=rows;
      showStatus('อ่านไฟล์สำเร็จ • แถวข้อมูล: '+rows.length);
      applySortAndRender();
    }catch(e){
      console.error(e); showStatus('อ่านไฟล์ไม่สำเร็จ: '+e.message);
    }
  };
  reader.readAsText(file);
}

function setupSorting(){
  document.querySelectorAll('#tbl thead th').forEach(th=>{
    th.addEventListener('click',()=>{
      const key=th.getAttribute('data-sort'); if(!key) return;
      if(currentSortKey===key){ currentSortDir=currentSortDir==='asc'?'desc':'asc'; }
      else { currentSortKey=key; currentSortDir=key==='DISTRICT'?'asc':'desc'; }
      applySortAndRender();
    });
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  makeLegend();
  setupSorting();
  document.getElementById('btnLoad').addEventListener('click',handleLoadUrl);
  document.getElementById('csvFile').addEventListener('change',handleFileUpload);
  // demo
  fetch('sample-aggregated.csv').then(r=>r.text()).then(txt=>{
    currentRows=parseCsvText(txt);
    applySortAndRender();
  });
});
