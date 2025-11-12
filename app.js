const INTERVALS=[
  {label:'แย่มาก',min:0.00,max:0.20,color:'#d73027',text:'#fff'},
  {label:'แย่',min:0.20,max:0.40,color:'#fc8d59',text:'#fff'},
  {label:'ปานกลาง',min:0.40,max:0.60,color:'#fee08b',text:'#111'},
  {label:'ดี',min:0.60,max:0.80,color:'#91cf60',text:'#111'},
  {label:'ดีมาก',min:0.80,max:1.01,color:'#1a9850',text:'#fff'}
];
function findInterval(v){for(const itv of INTERVALS){if(v>=itv.min && v<itv.max) return itv;}return INTERVALS[0];}
function fmt(v){const n=Number(v); return Number.isFinite(n)? n.toFixed(2):'-';}

let map, choroLayer, heatLayer, labelLayer;
let geojsonData=null;
let centroids=[];
let rows=[];

function initMap(){
  map=L.map('map').setView([13.7563,100.5018], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; OpenStreetMap'}).addTo(map);
}

function makeLegend(){
  const el=document.getElementById('legend'); el.innerHTML='';
  INTERVALS.forEach(itv=>{
    const div=document.createElement('div'); div.className='legend-item';
    div.innerHTML=`<span class="legend-swatch" style="background:${itv.color}"></span> ${itv.label} ${itv.min.toFixed(2)}–${(itv.max-0.01).toFixed(2)}`;
    el.appendChild(div);
  });
}

function joinScoresToGeo(geo, dataByDistrict){
  geo.features.forEach(f=>{
    const d=(f.properties.DISTRICT || f.properties.KHET || '').trim();
    const rec=dataByDistrict.get(d);
    if (rec){
      f.properties.SCORE=rec.SCORE;
      f.properties.INTERVAL=rec.INTERVAL;
    } else {
      f.properties.SCORE=null;
      f.properties.INTERVAL=null;
    }
  });
  return geo;
}

function renderChoropleth(){
  if (!geojsonData || !rows.length) return;
  const byD=new Map(rows.map(r=>[r.DISTRICT, r]));
  const geo=joinScoresToGeo(JSON.parse(JSON.stringify(geojsonData)), byD);
  if (choroLayer) choroLayer.remove();
  choroLayer=L.geoJSON(geo, {
    style: f => ({
      color:'#fff', weight:1, fillOpacity:0.85,
      fillColor: findInterval(Number(f.properties.SCORE||0)).color
    }),
    onEachFeature: (f, layer)=>{
      const p=f.properties;
      layer.bindPopup(`<strong>${p.DISTRICT||p.KHET||'-'}</strong><br>คะแนน: ${fmt(p.SCORE)}<br>ช่วงชั้น: ${p.INTERVAL||'-'}`);
    }
  }).addTo(map);
  try{ map.fitBounds(choroLayer.getBounds(), {padding:[10,10]}); }catch(_){}
}

function renderHeat(){
  if (heatLayer) { heatLayer.remove(); heatLayer=null; }
  if (!centroids.length || !rows.length) return;
  const byD=new Map(rows.map(r=>[r.DISTRICT, r]));
  const pts=[];
  centroids.forEach(c=>{
    const rec=byD.get((c.DISTRICT||'').trim());
    if (!rec) return;
    const w=Number(rec.SCORE||0);
    if (isFinite(c.LAT) && isFinite(c.LON)){
      pts.push([c.LAT, c.LON, Math.max(0.01, Math.min(1, w))]);
    }
  });
  if (pts.length){
    heatLayer=L.heatLayer(pts, {radius:25, blur:15, maxZoom:17}).addTo(map);
  }
}

function renderLabels(){
  if (labelLayer){ labelLayer.clearLayers(); labelLayer.remove(); labelLayer=null; }
  if (!document.getElementById('chkLabels').checked) return;
  labelLayer=L.layerGroup().addTo(map);
  const byD=new Map(rows.map(r=>[r.DISTRICT, r]));
  if (centroids.length>0){
    centroids.forEach(c=>{
      const rec=byD.get((c.DISTRICT||'').trim());
      if (!rec) return;
      L.marker([c.LAT,c.LON],{
        icon: L.divIcon({className:'', html:`<span class="label-text">${fmt(rec.SCORE)}</span>`})
      }).addTo(labelLayer);
    });
  } else if (choroLayer) {
    choroLayer.eachLayer(layer=>{
      const p=layer.feature.properties;
      const score=(byD.get((p.DISTRICT||p.KHET||'').trim())||{}).SCORE;
      if (!score && score!==0) return;
      const b=layer.getBounds();
      const center=b.getCenter();
      L.marker(center,{
        icon: L.divIcon({className:'', html:`<span class="label-text">${fmt(score)}</span>`})
      }).addTo(labelLayer);
    });
  }
}

function updateAll(){
  renderChoropleth();
  renderHeat();
  renderLabels();
  fillTable();
}

function fillTable(){
  const tb=document.querySelector('#tbl tbody'); tb.innerHTML='';
  const sorted=[].concat(rows).sort((a,b)=> b.SCORE - a.SCORE);
  sorted.forEach(r=>{
    const itv=findInterval(r.SCORE);
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${r.DISTRICT}</td><td>${fmt(r.SCORE)}</td><td><span class="badge" style="background:${itv.color};color:${itv.text}">${itv.label}</span></td>`;
    tb.appendChild(tr);
  });
}

function mapHeaders(o){
  const out={};
  Object.keys(o).forEach(k=>{
    const kk=k.trim();
    if (['DISTRICT','เขต'].includes(kk)) out.DISTRICT=o[k];
    else if (['SCORE','คะแนน'].includes(kk)) out.SCORE=Number(String(o[k]).replace(',','.'));
    else if (['INTERVAL','ช่วงชั้น'].includes(kk)) out.INTERVAL=o[k];
    else if (['LAT','ละติจูด'].includes(kk)) out.LAT=Number(String(o[k]).replace(',','.'));
    else if (['LON','LONG','ลองจิจูด','LNG'].includes(kk)) out.LON=Number(String(o[k]).replace(',','.'));
  });
  return out;
}

function parseCsvText(text){
  const parsed=Papa.parse(text, {header:true, skipEmptyLines:true});
  return parsed.data.map(mapHeaders);
}

function showStatus(msg){ const el=document.getElementById('status'); el.textContent=msg; el.style.display=msg?'block':'none'; }

async function fetchCsv(url){
  const u=new URL(url); u.searchParams.set('_',Date.now().toString());
  const res=await fetch(u.toString(), {cache:'no-store', mode:'cors'});
  if(!res.ok) throw new Error('HTTP '+res.status);
  return parseCsvText(await res.text());
}

async function handleLoadCsvUrl(){
  const url=document.getElementById('csvUrl').value.trim();
  if (!url) return showStatus('กรุณาวาง URL CSV ก่อน');
  try {
    showStatus('กำลังโหลด CSV ...');
    const arr=await fetchCsv(url);
    const r=arr.filter(x=>x.DISTRICT && isFinite(x.SCORE)).map(x=>({DISTRICT:String(x.DISTRICT).trim(), SCORE:Number(x.SCORE), INTERVAL:x.INTERVAL||''}));
    if (!r.length) throw new Error('ไม่พบคอลัมน์ DISTRICT/SCORE/INTERVAL หรือข้อมูลว่าง');
    rows=r;
    showStatus('โหลด CSV สำเร็จ: '+rows.length+' แถว');
    updateAll();
  } catch(e){
    console.error(e);
    showStatus('โหลดล้มเหลว: '+e.message+' • ลองอัปโหลด CSV ด้วยตนเองด้านขวา');
  }
}

function handleCsvFile(ev){
  const f=ev.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    const arr=parseCsvText(r.result);
    const r2=arr.filter(x=>x.DISTRICT && isFinite(x.SCORE)).map(x=>({DISTRICT:String(x.DISTRICT).trim(), SCORE:Number(x.SCORE), INTERVAL:x.INTERVAL||''}));
    if (!r2.length){ showStatus('CSV ไม่ถูกต้อง (ต้องมี DISTRICT/SCORE/INTERVAL)'); return; }
    rows=r2; showStatus('อ่าน CSV จากไฟล์สำเร็จ: '+rows.length+' แถว');
    updateAll();
  };
  r.readAsText(f);
}

function handleGeoFile(ev){
  const f=ev.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    try { geojsonData=JSON.parse(r.result); updateAll(); }
    catch(e){ showStatus('อ่าน GeoJSON ไม่สำเร็จ: '+e.message); }
  };
  r.readAsText(f);
}

function handleCentFile(ev){
  const f=ev.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{
    const arr=parseCsvText(r.result).filter(x=>isFinite(x.LAT)&&isFinite(x.LON)&&x.DISTRICT);
    centroids=arr.map(x=>({DISTRICT:String(x.DISTRICT).trim(), LAT:Number(x.LAT), LON:Number(x.LON)}));
    showStatus('อ่าน Centroids สำเร็จ: '+centroids.length+' จุด');
    updateAll();
  };
  r.readAsText(f);
}

document.addEventListener('DOMContentLoaded', ()=>{
  initMap(); makeLegend();
  document.getElementById('btnLoad').addEventListener('click', handleLoadCsvUrl);
  document.getElementById('csvFile').addEventListener('change', handleCsvFile);
  document.getElementById('geoFile').addEventListener('change', handleGeoFile);
  document.getElementById('centFile').addEventListener('change', handleCentFile);
  fetch('sample-aggregated.csv').then(r=>r.text()).then(t=>{
    const arr=parseCsvText(t).filter(x=>x.DISTRICT && isFinite(x.SCORE));
    rows=arr.map(x=>({DISTRICT:String(x.DISTRICT).trim(), SCORE:Number(x.SCORE), INTERVAL:x.INTERVAL||''}));
    updateAll();
  });
  fetch('sample-districts.geojson').then(r=>r.json()).then(g=>{ geojsonData=g; updateAll(); });
  fetch('sample-centroids.csv').then(r=>r.text()).then(t=>{
    const arr=parseCsvText(t).filter(x=>isFinite(x.LAT)&&isFinite(x.LON)&&x.DISTRICT);
    centroids=arr.map(x=>({DISTRICT:String(x.DISTRICT).trim(), LAT:Number(x.LAT), LON:Number(x.LON)}));
    updateAll();
  });
  document.getElementById('chkChoro').addEventListener('change', ()=>{
    if (choroLayer){ if (document.getElementById('chkChoro').checked) choroLayer.addTo(map); else choroLayer.remove(); }
  });
  document.getElementById('chkHeat').addEventListener('change', ()=>{
    if (heatLayer){ if (document.getElementById('chkHeat').checked) heatLayer.addTo(map); else heatLayer.remove(); }
  });
  document.getElementById('chkLabels').addEventListener('change', renderLabels);
});
