/** Apps Script: Normalize + Aggregate by DISTRICT using Mapping sheet (THAI_QUESTION,CODE) */
function onOpen(){ SpreadsheetApp.getUi().createMenu('BKK-ULQ').addItem('Rebuild (all)', 'recomputeAll').addToUi(); }
function onFormSubmit(e){ recomputeAll(); }
function recomputeAll(){
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  var formSheet=ss.getSheetByName('Form Responses 1');
  var mapSheet=ss.getSheetByName('Mapping');
  var outSheet=ss.getSheetByName('Aggregated_District'); if(!outSheet) outSheet=ss.insertSheet('Aggregated_District');
  if(!formSheet||!mapSheet){ SpreadsheetApp.getUi().alert('ไม่พบชีต Form Responses 1 หรือ Mapping'); return; }
  var formData=formSheet.getDataRange().getValues(); if(formData.length<2){ outSheet.clear(); outSheet.appendRow(['DISTRICT','SCORE','INTERVAL']); return; }
  var headers=formData[0]; var dataRows=formData.slice(1);
  var mapData=mapSheet.getDataRange().getValues(); var mapHeaders=mapData[0];
  var idxThai=indexOfHeader(mapHeaders,'THAI_QUESTION'); var idxCode=indexOfHeader(mapHeaders,'CODE');
  if(idxThai===-1||idxCode===-1){ SpreadsheetApp.getUi().alert('Mapping: ต้องมี THAI_QUESTION และ CODE'); return; }
  var qmap={}; for(var i=1;i<mapData.length;i++){ var thai=String(mapData[i][idxThai]||'').trim(); var code=String(mapData[i][idxCode]||'').trim(); if(thai&&code){ qmap[thai]=code; } }
  var idxDistrict=indexOfHeader(headers,'DISTRICT'); if(idxDistrict===-1) idxDistrict=indexOfHeader(headers,'เขต');
  var norm=[];
  for(var r=0;r<dataRows.length;r++){ var row=dataRows[r]; var district=idxDistrict!==-1? row[idxDistrict]:''; var vals=[];
    for(var c=0;c<headers.length;c++){ var h=String(headers[c]||'').trim(); var q=qmap[h]; if(q){ var v=toNumber(row[c]); if(!isNaN(v)) vals.push(v); } }
    if(vals.length){ var avg15=average(vals); var s=(avg15-1)/4; if(s<0) s=0; if(s>1) s=1; s=Math.round(s*100)/100; norm.push({DISTRICT:String(district||'').trim(), SCORE:s}); }
  }
  var byD={}; for(var j=0;j<norm.length;j++){ var d=norm[j].DISTRICT; var s=norm[j].SCORE; if(!d) continue; if(!byD[d]) byD[d]=[]; byD[d].push(s); }
  var out=[['DISTRICT','SCORE','INTERVAL']]; for(var name in byD){ var arr=byD[name]; var m=average(arr); m=Math.round(m*100)/100; out.push([name,m,toInterval(m)]); }
  outSheet.clear(); outSheet.getRange(1,1,out.length,out[0].length).setValues(out);
}
function indexOfHeader(headers,name){ for(var i=0;i<headers.length;i++){ if(String(headers[i]).trim()===name) return i; } return -1; }
function toNumber(x){ if(x===null||x==='') return NaN; var s=String(x).replace(',','.'); var n=Number(s); return isNaN(n)? NaN:n; }
function average(arr){ if(!arr.length) return NaN; var sum=0; for(var i=0;i<arr.length;i++){ sum+=Number(arr[i]||0);} return sum/arr.length; }
function toInterval(v){ if(v<=0.20) return 'แย่มาก'; if(v<=0.40) return 'แย่'; if(v<=0.60) return 'ปานกลาง'; if(v<=0.80) return 'ดี'; return 'ดีมาก'; }
