// ===================================================================
// ONE MINING TRAINING DEMO - TNA / COMPETENCE MODULE
// Adds: master Interventions list, Job Profiles, employee competence,
// validity/expiry, soft-delete history, intervention versioning,
// audit log, and TNA (xlsx) import. Loaded BEFORE app.js.
// All data lives in the isolated app_data_demo table.
// ===================================================================

// --- New data stores (populated in init via tnaLoad) ---
var interventions = [];   // master list (versioned, append-only on retire)
var jobprofiles   = [];   // [{title,group,required:[code],tbc:[code]}]
var xassigns      = [];   // per-person add/remove: {id,eid,code,type:'add'|'remove',active,dt,by,reason}
var comp          = [];    // completion history (append-only): {id,eid,code,cname,dt,validUntil,method,by,note}
var auditLog      = [];    // change history: {id,dt,admin,action,detail,reason,before,after}
var empjobs       = {};    // eid -> {title, history:[{title,dt,by}]}  (kept separate from emps to preserve history)
var managers      = [];    // [{id,name,username,password,role:'manager'|'training',allAccess,sites:[],depts:[],jobGroups:[],emps:[]}]
var tnaFilterProg = 'all', tnaSearch = '', jpEdit = null, compEmp = null, compSearch = '', mgrEmp = null, mmgrEdit = null;
var compSites=[], compDepts=[], mgrSites=[], mgrDepts=[], mgrSearch='', expSites=[], expDepts=[], expSearch='';
var libSearch='', jpSearch='', sopArchive=[];
var crSites=[], crDepts=[], crStatuses=[];
var progList=[], catList=[], taxEditP=null, taxEditC=null;
var iaInts=[], iaSites=[], iaDepts=[], iaEmps=[];
var meSites=[], meDepts=[], meSearch='', erSites=[], erDepts=[], erSearch='';
function getDueBy(eid,code){ var a=xassigns.filter(function(x){return x.eid===eid&&x.code===code&&x.type==='add'&&x.active!==false&&x.dueBy;}); return a.length?a[0].dueBy:null; }
function empCompClass(eid){
  var req=empRequired(eid);
  if(!req.length) return 'noset';
  if(isCompetent(eid)) return 'competent';
  var c=empCounts(eid);
  if(c.failed>0) return 'notcompetent';
  return 'notcompleted';
}
function classLabel(cls){ return {competent:'Competent',notcompetent:'Not yet competent',notcompleted:'Not yet completed',noset:'No job set'}[cls]||cls; }
function classBadge(cls){ return cls==='competent'?bg('Competent','green'):cls==='notcompetent'?bg('Not yet competent','red'):cls==='notcompleted'?bg('Not yet completed','gold'):bg('No job set','gray'); }
function complianceBase(){
  return emps.filter(function(e){
    if(crSites.length&&crSites.indexOf(e.site)<0) return false;
    if(crDepts.length&&crDepts.indexOf(e.dept||'')<0) return false;
    return true;
  }).map(function(e){ return {e:e, c:empCounts(e.id), cls:empCompClass(e.id)}; });
}
function complianceList(){
  var b=complianceBase();
  return crStatuses.length ? b.filter(function(r){ return crStatuses.indexOf(r.cls)>=0; }) : b;
}
function crApply(){
  crSites=[]; document.querySelectorAll('.cr-site:checked').forEach(function(c){crSites.push(c.value);});
  crDepts=[]; document.querySelectorAll('.cr-dept:checked').forEach(function(c){crDepts.push(c.value);});
  crStatuses=[]; document.querySelectorAll('.cr-stat:checked').forEach(function(c){crStatuses.push(c.value);});
  render();
}
function renderComplianceReport(){
  var sites=distinctVals(emps,'site'), depts=distinctVals(emps,'dept');
  var stats=[['competent','Competent'],['notcompetent','Not yet competent'],['notcompleted','Not yet completed'],['noset','No job set']];
  var h='<div class="card"><div class="ch"><h3>Filter &amp; Print Compliance Report</h3></div><div class="cb">';
  function _chip(cls,val,label,sel){ return '<label style="cursor:pointer;user-select:none;display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:20px;font-size:.82rem;font-weight:600;margin:0 8px 8px 0;border:1.5px solid '+(sel?'#FBB227':'#d7dbe0')+';background:'+(sel?'#FBB227':'#fff')+';color:'+(sel?'#243034':'#4b5563')+'"><input type="checkbox" class="'+cls+'" value="'+String(val).replace(/"/g,'&quot;')+'"'+(sel?' checked':'')+' onchange="crApply()" style="display:none">'+(sel?'✓ ':'')+label+'</label>'; }
  var nsel=crSites.length+crDepts.length+crStatuses.length;
  h+='<div style="background:#f7f8fa;border:1px solid #eceef1;border-radius:12px;padding:16px 18px">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px"><span style="font-size:.8rem;color:#6B7280">Tap to filter. Nothing selected shows everyone.</span>'+(nsel?'<span style="font-size:.76rem;font-weight:700;color:#FBB227">'+nsel+' filter'+(nsel===1?'':'s')+' active</span>':'')+'</div>';
  h+='<div style="margin-bottom:12px"><div style="font-size:.72rem;font-weight:700;letter-spacing:.06em;color:#9099a3;text-transform:uppercase;margin-bottom:7px">Sites</div>';
  sites.forEach(function(s){ h+=_chip('cr-site',s,s,crSites.indexOf(s)>=0); }); if(!sites.length)h+='<span style="font-size:.8rem;color:#9099a3">None</span>';
  h+='</div>';
  h+='<div style="margin-bottom:12px"><div style="font-size:.72rem;font-weight:700;letter-spacing:.06em;color:#9099a3;text-transform:uppercase;margin-bottom:7px">Departments</div>';
  depts.forEach(function(d){ h+=_chip('cr-dept',d,d,crDepts.indexOf(d)>=0); }); if(!depts.length)h+='<span style="font-size:.8rem;color:#9099a3">None</span>';
  h+='</div>';
  h+='<div><div style="font-size:.72rem;font-weight:700;letter-spacing:.06em;color:#9099a3;text-transform:uppercase;margin-bottom:7px">Status</div>';
  stats.forEach(function(p){ h+=_chip('cr-stat',p[0],p[1],crStatuses.indexOf(p[0])>=0); });
  h+='</div></div>';
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button class="btn btn-p" style="width:auto" onclick="printCompliance()">🖨 Print / Save as PDF</button><button class="btn btn-o" style="width:auto" onclick="crSites=[];crDepts=[];crStatuses=[];render()">Clear filters</button></div>';
  h+='</div></div>';
  var base=complianceBase();
  var cc={competent:0,notcompetent:0,notcompleted:0,noset:0}; base.forEach(function(r){cc[r.cls]++;});
  var list=complianceList();
  h+='<div class="sg"><div class="sc gn"><div class="l">Competent</div><div class="v">'+cc.competent+'</div></div><div class="sc rd"><div class="l">Not Yet Competent</div><div class="v">'+cc.notcompetent+'</div></div><div class="sc gd"><div class="l">Not Yet Completed</div><div class="v">'+cc.notcompleted+'</div></div><div class="sc bl"><div class="l">No Job Set</div><div class="v">'+cc.noset+'</div></div></div>';
  h+='<div class="card"><div class="ch"><h3>Results ('+list.length+')</h3></div><div class="tw"><table><thead><tr><th>Emp#</th><th>Name</th><th>Site</th><th>Dept</th><th>Job Title</th><th>Competent</th><th>Status</th></tr></thead><tbody>';
  list.forEach(function(r){ var e=r.e,c=r.c;
    h+='<tr><td style="font-weight:700;color:#FBB227">'+e.id+'</td><td>'+e.name+'</td><td style="font-size:.8rem">'+e.site+'</td><td style="font-size:.8rem">'+(e.dept||'-')+'</td><td style="font-size:.76rem">'+(empJobTitle(e.id)||'-')+'</td><td>'+c.valid+'/'+c.req+'</td><td>'+classBadge(r.cls)+'</td></tr>';
  });
  if(!list.length) h+='<tr><td colspan="7" style="text-align:center;color:#6B7280;padding:18px">No employees match the selected filters.</td></tr>';
  h+='</tbody></table></div></div>';
  return h;
}
function printCompliance(){
  var list=complianceList(); var filt=[];
  if(crSites.length)filt.push('Sites: '+crSites.join(', ')); if(crDepts.length)filt.push('Departments: '+crDepts.join(', '));
  if(crStatuses.length)filt.push('Status: '+crStatuses.map(classLabel).join(', '));
  if(!filt.length)filt.push('All sites, all departments, all statuses');
  var cc={competent:0,notcompetent:0,notcompleted:0,noset:0}; list.forEach(function(r){cc[r.cls]++;});
  var rows='';
  list.forEach(function(r){ var e=r.e,c=r.c; var col=r.cls==='competent'?'#DCFCE7':r.cls==='notcompetent'?'#FEE2E2':r.cls==='notstarted'?'#FEF9C3':'#f1f5f9';
    rows+='<tr style="background:'+col+'"><td>'+e.id+'</td><td>'+e.name+'</td><td>'+e.site+'</td><td>'+(e.dept||'-')+'</td><td>'+(empJobTitle(e.id)||'-')+'</td><td>'+c.valid+'/'+c.req+'</td><td>'+classLabel(r.cls)+'</td></tr>';
  });
  var w=window.open('','_blank');
  w.document.write('<!DOCTYPE html><html><head><title>Compliance Report</title><style>body{font-family:Arial;color:#243034;padding:30px}h1{font-size:1.4rem}.gold{color:#FBB227}table{width:100%;border-collapse:collapse;font-size:.78rem;margin-top:10px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}th{background:#243034;color:#fff;font-size:.7rem;text-transform:uppercase}@media print{button{display:none}}</style></head><body>');
  w.document.write('<div style="text-align:center;border-bottom:4px solid #FBB227;padding-bottom:10px;margin-bottom:12px"><h1>'+BRAND.name+' — Compliance Report</h1></div>');
  w.document.write('<p style="font-size:.85rem"><b>Filter:</b> '+filt.join(' · ')+'<br><b>Generated:</b> '+fd(now())+'</p>');
  w.document.write('<p style="font-size:.85rem"><b>Summary:</b> '+cc.competent+' Competent · '+cc.notcompetent+' Not yet competent · '+cc.notcompleted+' Not yet completed · '+cc.noset+' No job set · Total '+list.length+'</p>');
  w.document.write('<table><thead><tr><th>Emp#</th><th>Name</th><th>Site</th><th>Dept</th><th>Job Title</th><th>Competent</th><th>Status</th></tr></thead><tbody>'+(rows||'<tr><td colspan="7" style="text-align:center">No matches</td></tr>')+'</tbody></table>');
  w.document.write('<div style="text-align:center;margin-top:16px"><button onclick="window.print()" style="padding:10px 28px;background:#FBB227;border:none;border-radius:8px;font-weight:700;cursor:pointer">🖨 Print / Save as PDF</button></div>');
  w.document.close();
}
// Shared people-filter helpers (filter by Site, Department, Employee no./name)
function distinctVals(list, key){ var s=[]; list.forEach(function(e){ var v=e[key]; if(v&&s.indexOf(v)<0)s.push(v); }); return s.sort(); }
function inArrOrAll(arr, v){ return !arr || !arr.length || arr.indexOf(v)>=0; }
function indBadge(eid){ if(typeof indCounts!=='function') return '-'; if(typeof indCompetent==='function'&&indCompetent(eid)) return bg('Complete','green'); var ic=indCounts(eid); return bg(ic.done+'/'+ic.total,ic.locked?'red':'gold'); }
function indStatusText(eid){ if(typeof indCounts!=='function') return '-'; var ic=indCounts(eid); if(typeof indCompetent==='function'&&indCompetent(eid)) return 'Complete'; return ic.done+'/'+ic.total+' modules'+(ic.locked?' ('+ic.locked+' locked)':''); }
function filterEmps(list, sites, depts, search){
  return list.filter(function(e){
    if(!inArrOrAll(sites, e.site)) return false;
    if(!inArrOrAll(depts, e.dept||'')) return false;
    if(search){ var q=search.toLowerCase(); if((e.id+' '+(e.name||'')).toLowerCase().indexOf(q)<0) return false; }
    return true;
  });
}
// Multi-select checkbox dropdown (native <details>). Tick boxes (state updates), then "Apply".
function msHtml(label, options, selVar){
  var sel=window[selVar]||[]; var n=sel.length;
  var h='<details'+(window.__msOpen===selVar?' open':'')+' style="position:relative;display:inline-block;flex:1;min-width:160px"><summary style="list-style:none;cursor:pointer;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px;background:#fff;font-size:.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+label+': '+(n?'<b>'+n+' selected</b>':'all')+' &#9662;</summary>';
  h+='<div style="position:absolute;z-index:1000;background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.14);padding:8px;max-height:280px;overflow:auto;min-width:240px">';
  options.forEach(function(o){ var v=(o&&o.v!=null)?o.v:o, l=(o&&o.l!=null)?o.l:o; h+='<label style="display:block;padding:3px 6px;font-size:.85rem;cursor:pointer;white-space:nowrap"><input type="checkbox" value="'+String(v).replace(/"/g,'&quot;')+'"'+(sel.indexOf(v)>=0?' checked':'')+' onchange="msSet(\''+selVar+'\',this)"> '+l+'</label>'; });
  if(!options.length) h+='<div style="color:#6B7280;font-size:.8rem;padding:6px">None</div>';
  h+='<div style="border-top:1px solid #eee;margin-top:6px;padding-top:6px"><button class="btn btn-o btn-sm" style="font-size:.74rem;padding:4px 10px" onclick="event.preventDefault();window[\''+selVar+'\']=[];window.__msOpen=null;render()">Clear</button> <button class="btn btn-p btn-sm" style="font-size:.74rem;padding:4px 10px" onclick="event.preventDefault();window.__msOpen=null;render()">Done</button></div>';
  h+='</div></details>';
  return h;
}
function msSet(selVar, cb){ var arr=(window[selVar]||[]).slice(); var v=cb.value; if(cb.checked){ if(arr.indexOf(v)<0)arr.push(v); } else { arr=arr.filter(function(x){return x!==v;}); } window[selVar]=arr; window.__msOpen=selVar; render(); }
// Live type-to-search filter for in-form pick lists (no re-render, keeps checked items visible)
function empPickFilter(inp, boxId){ var q=(inp.value||'').toLowerCase(); var box=document.getElementById(boxId); if(!box)return; box.querySelectorAll('label.mg-pick-opt').forEach(function(l){ var on=l.querySelector('input').checked; l.style.display=(on||l.textContent.toLowerCase().indexOf(q)>=0)?'':'none'; }); }
function filterBar(srcEmps, sitesVar, deptsVar, searchVar){
  var sites=distinctVals(srcEmps,'site'), depts=distinctVals(srcEmps,'dept');
  var qv=window[searchVar]||'';
  var h='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px;position:relative;z-index:50">';
  h+='<input placeholder="Search employee no. or name..." value="'+qv.replace(/"/g,'&quot;')+'" onchange="window[\''+searchVar+'\']=this.value;render()" style="flex:1;min-width:200px;max-width:340px;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px">';
  h+=msHtml('Sites', sites, sitesVar);
  h+=msHtml('Departments', depts, deptsVar);
  h+='<button class="btn btn-o btn-sm" onclick="window[\''+sitesVar+'\']=[];window[\''+deptsVar+'\']=[];window[\''+searchVar+'\']=\'\';render()">Clear all</button>';
  h+='</div>';
  return h;
}

// --- Load / save ---
async function tnaLoad(){
  interventions = await cloudLoad('interventions', []);
  jobprofiles   = await cloudLoad('jobprofiles', []);
  progList      = await cloudLoad('programme_list', defaultProgList());
  catList       = await cloudLoad('category_list', defaultCatList());
  xassigns      = await cloudLoad('xassigns', []);
  comp          = await cloudLoad('comp', []);
  auditLog      = await cloudLoad('audit', []);
  empjobs       = await cloudLoad('empjobs', {});
  managers      = await cloudLoad('managers', []);
  sopArchive    = await cloudLoad('sop_archive', []);
}
async function saveTNA(){
  var r = await Promise.all([
    cloudSave('interventions', interventions),
    cloudSave('jobprofiles', jobprofiles),
    cloudSave('programme_list', progList),
    cloudSave('category_list', catList),
    cloudSave('xassigns', xassigns),
    cloudSave('comp', comp),
    cloudSave('audit', auditLog),
    cloudSave('empjobs', empjobs),
    cloudSave('managers', managers),
    cloudSave('sop_archive', sopArchive)
  ]);
  return r.every(function(x){return x});
}
function logAudit(action, detail, reason, before, after){
  auditLog.unshift({id:gid(), dt:now(), admin:(user&&user.name)||'System',
    action:action, detail:detail||'', reason:reason||'', before:before||null, after:after||null});
}

// --- Validity helpers ---
// validityMonths: 0 = once-off (no expiry), n = recurring every n months, -1 = as required (no fixed expiry), null = unset
function validityLabel(vm){
  if(vm===0) return 'Once-off';
  if(vm===-1) return 'As required';
  if(vm===null||vm===undefined) return 'Not set';
  if(vm===12) return 'Annual';
  if(vm===24) return '2-yearly';
  if(vm===36) return '3-yearly';
  return 'Every '+vm+' mo';
}
function addMonths(iso, m){ var d=new Date(iso); d.setMonth(d.getMonth()+m); return d.toISOString(); }
function daysBetween(iso){ if(!iso) return null; var ms=new Date(iso)-new Date(); return Math.floor(ms/86400000); }
function getIntervention(code){ for(var i=0;i<interventions.length;i++) if(interventions[i].code===code) return interventions[i]; return null; }
function getProfile(title){ for(var i=0;i<jobprofiles.length;i++) if(jobprofiles[i].title===title) return jobprofiles[i]; return null; }
function programmes(){ var s=[]; progList.filter(function(p){return p.active!==false;}).slice().sort(_byOrder).forEach(function(p){ if(s.indexOf(p.name)<0)s.push(p.name); }); interventions.forEach(function(it){ if(it.programme&&s.indexOf(it.programme)<0)s.push(it.programme); }); return s; }

// completion status for an employee+intervention
function compStatus(eid, code){
  var it = getIntervention(code);
  var vm = it ? it.validityMonths : null;
  // events = manual completions + automatic passes of the linked in-app assessment
  var events = [];
  comp.filter(function(c){return c.eid===eid&&c.code===code;}).forEach(function(c){
    events.push({dt:c.dt, validUntil:c.validUntil, last:c});
  });
  if(it && it.linkedSop && typeof res !== 'undefined'){
    res.filter(function(r){return r.eid===eid && r.sc===it.linkedSop && r.pass;}).forEach(function(r){
      var vu = (vm&&vm>0) ? addMonths(r.dt, vm) : null;
      events.push({dt:r.dt, validUntil:vu, last:{dt:r.dt, validUntil:vu, method:'assessment', cname:it.name, auto:true}});
    });
  }
  if(!events.length){
    // no valid completion — did they attempt the linked test and fail?
    if(it && it.linkedSop && typeof res !== 'undefined'){
      var attempts = res.filter(function(r){return r.eid===eid && r.sc===it.linkedSop;});
      if(attempts.length){
        attempts.sort(function(a,b){return new Date(b.dt)-new Date(a.dt);});
        return {status:'failed', last:attempts[0], validUntil:null, days:null, attempts:attempts.length};
      }
    }
    return {status:'outstanding', last:null, validUntil:null, days:null};
  }
  events.sort(function(a,b){return new Date(b.dt)-new Date(a.dt);});
  var top = events[0];
  if(!top.validUntil) return {status:'valid', last:top.last, validUntil:null, days:null}; // once-off / no expiry
  var d = daysBetween(top.validUntil);
  var st = d<0 ? 'expired' : (d<=60 ? 'expiring' : 'valid');
  return {status:st, last:top.last, validUntil:top.validUntil, days:d};
}
function statusBadge(s){
  if(s.status==='outstanding') return bg('Outstanding','gray');
  if(s.status==='failed') return bg('Not yet competent'+(s.attempts?' ('+s.attempts+' att)':''),'red');
  if(s.status==='expired') return bg('EXPIRED '+Math.abs(s.days)+'d ago','red');
  if(s.status==='expiring') return bg('Expires in '+s.days+'d','gold');
  if(s.validUntil) return bg('Valid to '+fd(s.validUntil),'green');
  return bg('Valid','green');
}

function empJobTitle(eid){ return empjobs[eid] ? empjobs[eid].title : ''; }
// Required interventions for an employee = job profile required (active) - individual removes + individual adds
function empRequired(eid){
  var title = empJobTitle(eid);
  var prof = title ? getProfile(title) : null;
  var base = prof ? prof.required.slice() : [];
  var removes = xassigns.filter(function(a){return a.eid===eid&&a.type==='remove'&&a.active!==false;}).map(function(a){return a.code;});
  var adds = xassigns.filter(function(a){return a.eid===eid&&a.type==='add'&&a.active!==false;}).map(function(a){return a.code;});
  var rows = [];
  base.forEach(function(c){ if(removes.indexOf(c)<0) rows.push({code:c, source:'job'}); });
  adds.forEach(function(c){ if(!rows.some(function(r){return r.code===c;})) rows.push({code:c, source:'individual'}); });
  // keep only interventions that still exist & are active
  return rows.filter(function(r){ var it=getIntervention(r.code); return it && it.active!==false; });
}

// =====================  IMPORT TNA (xlsx)  =====================
function importTNA(){
  if(typeof XLSX==='undefined'){ alert('Spreadsheet library not loaded. Please refresh the page and try again.'); return; }
  var inp=document.createElement('input'); inp.type='file'; inp.accept='.xlsx,.xls';
  inp.onchange=function(e){
    var f=e.target.files[0]; if(!f) return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var wb=XLSX.read(new Uint8Array(ev.target.result), {type:'array'});
        var sName=wb.SheetNames[0];
        for(var i=0;i<wb.SheetNames.length;i++){ if(/TNA/i.test(wb.SheetNames[i])){sName=wb.SheetNames[i];break;} }
        var ws=wb.Sheets[sName];
        var rows=XLSX.utils.sheet_to_json(ws, {header:1, raw:false, defval:null});
        var parsed=parseTNARows(rows);
        applyTNAImport(parsed);
      }catch(err){ alert('Could not read this file: '+err.message); }
    };
    reader.readAsArrayBuffer(f);
  };
  inp.click();
}
function parseTNARows(rows){
  var JS=8; // column I (0-based) = first job title
  var maxC=0; rows.forEach(function(r){ if(r&&r.length>maxC)maxC=r.length; });
  // job titles (row index 1) + group carry-forward (row index 0)
  var jobs=[], curGroup='(Ungrouped)';
  for(var c=JS;c<maxC;c++){
    var g=rows[0]&&rows[0][c]; if(g!=null&&String(g).trim()) curGroup=String(g).trim();
    var t=rows[1]&&rows[1][c];
    if(t!=null&&String(t).trim()) jobs.push({c:c, group:curGroup, title:String(t).trim()});
  }
  var ivs=[], profs={}; jobs.forEach(function(j){ profs[j.title]={title:j.title, group:j.group, required:[], tbc:[]}; });
  var cur=null;
  for(var r=2;r<rows.length;r++){
    var row=rows[r]||[];
    var a=row[0], b=row[1], ref=row[2];
    if(a==null&&b==null&&ref==null) continue;
    if(a!=null&&(b==null||String(b).trim()==='')&&(ref==null||String(ref).trim()==='')){ cur=String(a).trim(); continue; }
    var code=a!=null?String(a).trim():'';
    var name=b!=null?String(b).trim():'';
    if(!code) code='AUTO-'+r;
    var freq=row[7]!=null?String(row[7]).trim():'';
    var fl=freq.toLowerCase(), vm=null;
    if(fl.indexOf('annual')>=0) vm=12; else if(fl==='initial') vm=0; else if(fl.indexOf('required')>=0) vm=-1;
    ivs.push({code:code, name:name, ref:ref!=null?String(ref).trim():'', programme:cur||'',
      sopAvailable:String(row[3]).trim().toLowerCase()==='true', critical:String(row[6]).trim().toLowerCase()==='true',
      freq:freq, validityMonths:vm});
    jobs.forEach(function(j){
      var v=row[j.c]; if(v==null) return; var sv=String(v).trim();
      if(sv==='1') profs[j.title].required.push(code);
      else if(sv==='?') profs[j.title].tbc.push(code);
    });
  }
  return {interventions:ivs, profiles:Object.keys(profs).map(function(k){return profs[k];})};
}
function applyTNAImport(parsed){
  // auto-link to existing SOP courses by name
  function norm(s){ return (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean); }
  function autoLink(name){
    var nt=norm(name), best=null, bs=0;
    sops.forEach(function(sp){ var st=norm(sp.title); if(!nt.length||!st.length)return;
      var inter=nt.filter(function(w){return st.indexOf(w)>=0;}).length; var uni=new Set(nt.concat(st)).size;
      var ov=inter/uni; if(ov>bs){bs=ov;best=sp.code;} });
    return bs>=0.5?best:null;
  }
  var existingByCode={}; interventions.forEach(function(it){ existingByCode[it.code]=it; });
  var newCodes={}; parsed.interventions.forEach(function(p){ newCodes[p.code]=true; });
  var added=0, updated=0, retired=0;
  // add/update from TNA (preserve manual edits: validity override + linkedSop if already set)
  parsed.interventions.forEach(function(p){
    var ex=existingByCode[p.code];
    if(ex){
      ex.name=p.name; ex.ref=p.ref; ex.programme=p.programme; ex.sopAvailable=p.sopAvailable; ex.critical=p.critical; ex.freq=p.freq; ex.active=true;
      if(ex.validityMonths===undefined||ex.validityMonths===null) ex.validityMonths=p.validityMonths;
      updated++;
    } else {
      interventions.push({code:p.code, name:p.name, ref:p.ref, programme:p.programme, sopAvailable:p.sopAvailable,
        critical:p.critical, freq:p.freq, validityMonths:p.validityMonths, linkedSop:autoLink(p.name), active:true, retiredAt:null, createdAt:now()});
      added++;
    }
  });
  // retire interventions no longer in TNA (kept for history, NOT deleted)
  interventions.forEach(function(it){ if(it.active!==false && !newCodes[it.code]){ it.active=false; it.retiredAt=now(); retired++; } });
  // confirm before replacing profiles (the "ask each time" choice)
  var msg='TNA import summary:\n\n'+
    '+ '+added+' new interventions\n'+
    '~ '+updated+' updated\n'+
    'x '+retired+' retired (kept as history)\n'+
    parsed.profiles.length+' job profiles in file\n\n'+
    'Apply the updated JOB PROFILES now? This updates required training for all employees already linked to a job.\n'+
    '(Their completion history is always kept. Choose Cancel to import interventions only and review profiles later.)';
  var applyProfiles=confirm(msg);
  if(applyProfiles){ jobprofiles=parsed.profiles; }
  logAudit('TNA IMPORT', added+' new, '+updated+' updated, '+retired+' retired'+(applyProfiles?', profiles applied':', profiles NOT applied'), '');
  saveTNA().then(function(){ render(); alert('TNA imported.\n+'+added+' new, ~'+updated+' updated, x'+retired+' retired.'+(applyProfiles?'\nJob profiles applied.':'\nJob profiles NOT applied (interventions only).')); });
}

// =====================  RENDER: TNA IMPORT  =====================
function renderTnaImport(){
  var libOk = typeof XLSX!=='undefined';
  var h='<div class="topbar"><h1>TNA Import</h1></div><div class="pc">';
  h+='<div class="card"><div class="ch"><h3>Upload Training Needs Analysis (Competence Framework)</h3></div><div class="cb">';
  h+='<p style="color:#6B7280;margin-bottom:16px;font-size:.9rem">Upload the signed-off TNA matrix (.xlsx). It will refresh the master <b>Interventions</b> list and <b>Job Profiles</b>. Re-uploads keep all history: retired interventions are archived, never deleted, and employee completions are preserved.</p>';
  h+='<div style="display:flex;gap:10px;align-items:center"><button class="btn btn-p" style="width:auto" onclick="importTNA()"'+(libOk?'':' disabled')+'>⬆️ Choose TNA file (.xlsx)</button>';
  if(!libOk) h+='<span style="color:#EF4444;font-size:.85rem">Spreadsheet engine still loading — refresh and retry.</span>';
  h+='</div></div></div>';
  h+='<div class="sg"><div class="sc gd"><div class="l">Interventions</div><div class="v">'+interventions.filter(function(i){return i.active!==false;}).length+'</div></div>';
  h+='<div class="sc bl"><div class="l">Job Profiles</div><div class="v">'+jobprofiles.length+'</div></div>';
  h+='<div class="sc rd"><div class="l">Retired (history)</div><div class="v">'+interventions.filter(function(i){return i.active===false;}).length+'</div></div></div>';
  return h+'</div>';
}

// =====================  RENDER: INTERVENTIONS  =====================
function renderInterventions(){
  var progs=programmes();
  var h='<div class="topbar"><h1>Interventions</h1><div style="display:flex;gap:8px;align-items:center"><span style="font-size:.78rem;color:#6B7280">'+interventions.filter(function(i){return i.active!==false;}).length+' active · '+interventions.filter(function(i){return i.active===false;}).length+' retired</span><button class="btn btn-p btn-sm" onclick="addInterventionNew()">+ Add Intervention</button></div></div><div class="pc">';
  h+='<div class="card"><div class="cb"><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">';
  h+='<input id="iv-search" placeholder="Search code or name..." value="'+tnaSearch.replace(/"/g,'&quot;')+'" oninput="tnaSearch=this.value;render()" style="flex:1;min-width:200px;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px">';
  h+='<select onchange="tnaFilterProg=this.value;render()" style="padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px"><option value="all">All programmes</option>';
  progs.forEach(function(p){ h+='<option'+(tnaFilterProg===p?' selected':'')+'>'+p+'</option>'; });
  h+='</select></div></div></div>';
  var list=interventions.filter(function(it){
    if(tnaFilterProg!=='all'&&it.programme!==tnaFilterProg) return false;
    if(tnaSearch){ var q=tnaSearch.toLowerCase(); if((it.code+' '+it.name).toLowerCase().indexOf(q)<0) return false; }
    return true;
  });
  h+='<div class="card"><div class="tw"><table><thead><tr><th>Code</th><th>Name</th><th>Programme</th><th>Category</th><th>Critical</th><th>Validity / Frequency</th><th>Linked course</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  list.slice(0,400).forEach(function(it){
    h+='<tr'+(it.active===false?' style="opacity:.55"':'')+'>';
    h+='<td style="font-weight:700;color:#FBB227">'+it.code+'</td>';
    h+='<td>'+(it.name||'<i style=color:#9ca3af>(unnamed)</i>')+(it.critical?' '+bg('Critical','red'):'')+'</td>';
    h+='<td style="font-size:.78rem">'+it.programme+'</td>';
    h+='<td style="font-size:.78rem">'+(it.category||'-')+'</td>';
    h+='<td>'+(it.critical?'Yes':'-')+'</td>';
    h+='<td>'+bg(validityLabel(it.validityMonths), it.validityMonths==null?'gray':'blue')+'</td>';
    h+='<td style="font-size:.78rem">'+(it.linkedSop?bg(it.linkedSop,'green'):(it.sopAvailable?bg('SOP avail (link)','gold'):bg('Tracked','gray')))+'</td>';
    h+='<td>'+(it.active===false?bg('Retired','red'):bg('Active','green'))+'</td>';
    h+='<td style="white-space:nowrap"><button class="btn btn-o btn-sm" onclick="editIntervention(\''+it.code+'\')">Edit</button></td></tr>';
  });
  if(list.length>400) h+='<tr><td colspan="9" style="text-align:center;color:#6B7280">Showing first 400 of '+list.length+' — use search/filter</td></tr>';
  if(!list.length) h+='<tr><td colspan="9" style="text-align:center;color:#6B7280;padding:24px">No interventions. Import your TNA first.</td></tr>';
  return h+'</tbody></table></div></div></div>';
}
function editIntervention(code){
  var it=getIntervention(code); if(!it) return;
  var sopOpts='<option value="">— none (tracked only) —</option>';
  sops.forEach(function(s){ sopOpts+='<option value="'+s.code+'"'+(it.linkedSop===s.code?' selected':'')+'>'+s.code+' — '+s.title+'</option>'; });
  function vOpt(v,l){ return '<option value="'+v+'"'+(String(it.validityMonths)===String(v)?' selected':'')+'>'+l+'</option>'; }
  var ov=document.createElement('div'); ov.id='iv-ov'; ov.className='mbg';
  ov.onclick=function(e){ if(e.target===ov) ov.remove(); };
  var m='<div class="mdl"><div class="mh"><h2>'+it.code+'</h2><button class="btn btn-o btn-sm" onclick="document.getElementById(\'iv-ov\').remove()">Close</button></div><div class="mbd">';
  m+='<div class="fg"><label>Name</label><input id="iv-name" value="'+(it.name||'').replace(/"/g,'&quot;')+'"></div>';
  m+='<div class="fg"><label>Programme</label>'+progSelect('iv-prog',it.programme||'')+'</div>';
  m+='<div class="fg"><label>Category (subject)</label>'+catSelect('iv-cat',it.category||'')+'</div>';
  m+='<div class="fg"><label>Validity / Frequency (when it expires & must be redone)</label><select id="iv-vm"><option value="">Not set</option>'+
     vOpt(0,'Once-off (no expiry)')+vOpt(12,'Annual')+vOpt(24,'2-yearly')+vOpt(36,'3-yearly')+vOpt(-1,'As required')+'</select></div>';
  m+='<div class="fg"><label>Linked in-app course (document/video/slides/assessment)</label><select id="iv-sop">'+sopOpts+'</select></div>';
  m+='<div style="display:flex;gap:10px;margin-top:10px"><button class="btn btn-p" style="width:auto" onclick="saveIntervention(\''+code+'\')">Save</button>';
  m+='<button class="btn btn-d" style="width:auto" onclick="toggleRetire(\''+code+'\')">'+(it.active===false?'Un-retire':'Retire (keep history)')+'</button></div>';
  m+='<p style="font-size:.78rem;color:#6B7280;margin-top:12px">Ref: '+(it.ref||'-')+' · Programme: '+it.programme+' · Freq: '+(it.freq||'-')+'</p>';
  m+='</div></div>';
  ov.innerHTML=m; document.body.appendChild(ov);
}
function saveIntervention(code){
  var it=getIntervention(code); if(!it) return;
  var nm=document.getElementById('iv-name').value.trim();
  var vmRaw=document.getElementById('iv-vm').value; var vm=vmRaw===''?null:parseInt(vmRaw);
  var sopV=document.getElementById('iv-sop').value||null;
  var before={name:it.name, validityMonths:it.validityMonths, linkedSop:it.linkedSop};
  it.name=nm; it.validityMonths=vm; it.linkedSop=sopV; var _pv=document.getElementById('iv-prog'); if(_pv&&_pv.value)it.programme=_pv.value; var _cv=document.getElementById('iv-cat'); if(_cv)it.category=_cv.value;
  logAudit('EDIT INTERVENTION', code, '', before, {name:nm, validityMonths:vm, linkedSop:sopV});
  saveTNA().then(function(){ var ov=document.getElementById('iv-ov'); if(ov)ov.remove(); render(); });
}
function toggleRetire(code){
  var it=getIntervention(code); if(!it) return;
  if(it.active===false){ it.active=true; it.retiredAt=null; logAudit('UN-RETIRE INTERVENTION', code, ''); }
  else { if(!confirm('Retire '+code+'? It stays on records/history but is no longer an active requirement.')) return; it.active=false; it.retiredAt=now(); logAudit('RETIRE INTERVENTION', code, ''); }
  saveTNA().then(function(){ var ov=document.getElementById('iv-ov'); if(ov)ov.remove(); render(); });
}
function addInterventionNew(){
  var sopOpts='<option value="">— none (tracked only) —</option>'; sops.forEach(function(s){ sopOpts+='<option value="'+s.code+'">'+s.code+' — '+s.title+'</option>'; });
  var progs=programmes();
  var ov=document.createElement('div'); ov.id='iv-ov'; ov.className='mbg'; ov.onclick=function(e){ if(e.target===ov) ov.remove(); };
  var m='<div class="mdl"><div class="mh"><h2>New Intervention</h2><button class="btn btn-o btn-sm" onclick="document.getElementById(\'iv-ov\').remove()">Close</button></div><div class="mbd">';
  m+='<div class="fg"><label>Code</label><input id="niv-code" placeholder="e.g. OM-EXTRA-001"></div>';
  m+='<div class="fg"><label>Name</label><input id="niv-name"></div>';
  m+='<div class="fg"><label>Programme</label>'+progSelect('niv-prog','')+'</div>';
  m+='<div class="fg"><label>Category (subject)</label>'+catSelect('niv-cat','')+'</div>';
  m+='<div class="fg"><label>Validity / Frequency</label><select id="niv-vm"><option value="">Not set</option><option value="0">Once-off (no expiry)</option><option value="12">Annual</option><option value="24">2-yearly</option><option value="36">3-yearly</option><option value="-1">As required</option></select></div>';
  m+='<div class="fg"><label style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="niv-crit"> Critical</label></div>';
  m+='<div class="fg"><label>Linked in-app course (optional)</label><select id="niv-sop">'+sopOpts+'</select></div>';
  m+='<button class="btn btn-p" style="width:auto" onclick="saveNewIntervention()">Create Intervention</button>';
  m+='</div></div>'; ov.innerHTML=m; document.body.appendChild(ov);
}
function saveNewIntervention(){
  var code=document.getElementById('niv-code').value.trim();
  if(!code){ alert('Enter a code'); return; }
  if(getIntervention(code)){ alert('That code already exists'); return; }
  var vmRaw=document.getElementById('niv-vm').value; var vm=vmRaw===''?null:parseInt(vmRaw);
  var sopV=document.getElementById('niv-sop').value||null;
  interventions.push({code:code, name:document.getElementById('niv-name').value.trim(), ref:'', programme:document.getElementById('niv-prog').value||'(Manual)', category:document.getElementById('niv-cat').value||'', sopAvailable:!!sopV, critical:document.getElementById('niv-crit').checked, freq:'', validityMonths:vm, linkedSop:sopV, active:true, retiredAt:null, createdAt:now(), manual:true});
  logAudit('ADD INTERVENTION', code, 'manual');
  saveTNA().then(function(){ var ov=document.getElementById('iv-ov'); if(ov)ov.remove(); render(); });
}

// =====================  RENDER: JOB PROFILES  =====================
function renderJobProfiles(){
  var h='<div class="topbar"><h1>Job Profiles</h1><div style="display:flex;gap:8px;align-items:center"><span style="font-size:.78rem;color:#6B7280">'+jobprofiles.length+' job titles</span><button class="btn btn-p btn-sm" onclick="jpEdit=\'__new__\';render()">+ Add Job Title</button></div></div><div class="pc">';
  if(jpEdit==='__new__'){
    var grps=[]; jobprofiles.forEach(function(p){ if(p.group&&grps.indexOf(p.group)<0)grps.push(p.group); });
    h+='<div class="card"><div class="ch"><h3>New Job Title</h3><button class="btn btn-o btn-sm" onclick="jpEdit=null;render()">← Back</button></div><div class="cb">';
    h+='<div class="fg"><label>Job Title</label><input id="njp-title" placeholder="e.g. Operator - Loader"></div>';
    h+='<div class="fg"><label>Group</label><input id="njp-group" list="njp-groups" placeholder="e.g. TMM - LOADING"><datalist id="njp-groups">'+grps.map(function(g){return '<option value="'+g.replace(/"/g,'&quot;')+'">';}).join('')+'</datalist></div>';
    h+='<button class="btn btn-p" style="width:auto" onclick="addJobProfile()">Create</button>';
    h+='<p style="font-size:.78rem;color:#6B7280;margin-top:10px">After creating, you can tick its required interventions.</p>';
    return h+'</div></div></div>';
  }
  if(jpEdit){
    var p=getProfile(jpEdit);
    if(p){
      h+='<div class="card"><div class="ch"><h3>'+p.title+' <span style="font-weight:400;color:#6B7280;font-size:.8rem">'+(p.group||'')+'</span></h3><button class="btn btn-o btn-sm" onclick="jpEdit=null;render()">← Back to list</button></div><div class="cb">';
      h+='<p style="color:#6B7280;font-size:.85rem;margin-bottom:12px">Tick the interventions required for this job. '+p.required.length+' currently required'+(p.tbc&&p.tbc.length?', '+p.tbc.length+' marked TBC':'')+'.</p>';
      var progs=programmes();
      progs.forEach(function(pr){
        var items=interventions.filter(function(it){return it.active!==false&&it.programme===pr;});
        if(!items.length) return;
        h+='<div style="margin-bottom:10px"><div style="font-weight:700;color:#243034;font-size:.85rem;margin:8px 0 4px">'+pr+'</div>';
        items.forEach(function(it){
          var on=p.required.indexOf(it.code)>=0, tb=p.tbc&&p.tbc.indexOf(it.code)>=0;
          h+='<label style="display:flex;align-items:center;gap:8px;padding:3px 6px;font-size:.82rem;cursor:pointer"><input type="checkbox" class="jp-cb" value="'+it.code+'"'+(on?' checked':'')+' style="accent-color:#FBB227;width:15px;height:15px"><span style="color:#FBB227;font-weight:600;min-width:90px">'+it.code+'</span><span>'+it.name+'</span>'+(tb?' '+bg('TBC','gold'):'')+'</label>';
        });
        h+='</div>';
      });
      h+='<div style="margin-top:14px"><button class="btn btn-p" style="width:auto" onclick="saveProfile(\''+p.title.replace(/'/g,"\\'")+'\')">Save Profile</button></div>';
      return h+'</div></div></div>';
    }
  }
  // grouped list (with search)
  h+='<div class="card"><div class="cb"><input placeholder="Search job title or group..." value="'+(jpSearch||'').replace(/"/g,'&quot;')+'" onchange="jpSearch=this.value;render()" style="width:100%;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px"></div></div>';
  var jpList=jobprofiles;
  if(jpSearch){ var jq=jpSearch.toLowerCase(); jpList=jobprofiles.filter(function(p){ return ((p.title||'')+' '+(p.group||'')).toLowerCase().indexOf(jq)>=0; }); }
  var groups={}; jpList.forEach(function(p){ (groups[p.group||'(Ungrouped)']=groups[p.group||'(Ungrouped)']||[]).push(p); });
  h+='<div class="card"><div class="tw"><table><thead><tr><th>Group</th><th>Job Title</th><th>Required</th><th>TBC</th><th></th></tr></thead><tbody>';
  Object.keys(groups).forEach(function(g){
    groups[g].forEach(function(p){
      h+='<tr><td style="font-size:.78rem;color:#6B7280">'+g+'</td><td style="font-weight:600">'+p.title+'</td><td>'+bg(p.required.length,'green')+'</td><td>'+((p.tbc&&p.tbc.length)?bg(p.tbc.length,'gold'):'-')+'</td><td><button class="btn btn-o btn-sm" onclick="jpEdit=\''+p.title.replace(/'/g,"\\'")+'\';render()">Edit</button></td></tr>';
    });
  });
  if(!jobprofiles.length) h+='<tr><td colspan="5" style="text-align:center;color:#6B7280;padding:24px">No job profiles. Import your TNA first.</td></tr>';
  return h+'</tbody></table></div></div></div>';
}
function saveProfile(title){
  var p=getProfile(title); if(!p) return;
  var sel=[]; document.querySelectorAll('.jp-cb:checked').forEach(function(cb){ sel.push(cb.value); });
  var before=p.required.length;
  p.required=sel;
  logAudit('EDIT JOB PROFILE', title, 'now '+sel.length+' required (was '+before+')');
  saveTNA().then(function(){ jpEdit=null; render(); });
}
function addJobProfile(){
  var t=document.getElementById('njp-title').value.trim();
  var g=document.getElementById('njp-group').value.trim()||'(Ungrouped)';
  if(!t){ alert('Enter a job title'); return; }
  if(getProfile(t)){ alert('That job title already exists'); return; }
  jobprofiles.push({title:t, group:g, required:[], tbc:[]});
  logAudit('ADD JOB PROFILE', t+' ('+g+')', 'manual');
  saveTNA().then(function(){ jpEdit=t; render(); });
}

// =====================  RENDER: AUDIT LOG  =====================
function renderAuditLog(){
  var h='<div class="topbar"><h1>Audit Log</h1><span style="font-size:.78rem;color:#6B7280">'+auditLog.length+' entries</span></div><div class="pc">';
  h+='<div class="card"><div class="tw"><table><thead><tr><th>Date</th><th>By</th><th>Action</th><th>Detail</th><th>Reason</th></tr></thead><tbody>';
  auditLog.slice(0,300).forEach(function(a){
    var det=a.detail; if(a.eid) det=(a.eid||'')+(a.sc?' · '+a.sc:'')+' '+det;
    h+='<tr><td style="font-size:.76rem;white-space:nowrap">'+fd(a.dt)+'</td><td style="font-size:.8rem">'+(a.admin||'-')+'</td><td>'+bg(a.action,'blue')+'</td><td style="font-size:.82rem">'+(det||'')+'</td><td style="font-size:.8rem;color:#6B7280">'+(a.reason||'')+'</td></tr>';
  });
  if(!auditLog.length) h+='<tr><td colspan="5" style="text-align:center;color:#6B7280;padding:24px">No changes recorded yet.</td></tr>';
  return h+'</tbody></table></div></div></div>';
}

// =====================  COMPETENCE (per employee)  =====================
function empCounts(eid){
  var req=empRequired(eid); var c={req:req.length, outstanding:0, failed:0, expiring:0, expired:0, valid:0};
  req.forEach(function(r){ var s=compStatus(eid,r.code).status;
    if(s==='outstanding')c.outstanding++; else if(s==='failed')c.failed++; else if(s==='expiring')c.expiring++; else if(s==='expired')c.expired++; else c.valid++; });
  return c;
}
function renderCompetence(){
  if(compEmp) return renderCompEmp(compEmp);
  var h='<div class="topbar"><h1>Competence</h1><span style="font-size:.78rem;color:#6B7280">Link employees to a job title to drive their required training</span></div><div class="pc">';
  h+=filterBar(emps,'compSites','compDepts','compSearch');
  h+='<div class="card"><div class="tw"><table><thead><tr><th>Emp#</th><th>Name</th><th>Site</th><th>Job Title</th><th>Induction</th><th>Required</th><th>Outstanding</th><th>Not Yet Competent</th><th>Expiring</th><th>Expired</th><th></th></tr></thead><tbody>';
  var list=filterEmps(emps, compSites, compDepts, compSearch);
  list.forEach(function(e){
    var jt=empJobTitle(e.id); var c=empCounts(e.id);
    h+='<tr><td style="font-weight:700;color:#FBB227">'+e.id+'</td><td style="font-weight:600">'+e.name+'</td><td style="font-size:.8rem">'+e.site+'</td>';
    h+='<td>'+(jt?jt:bg('No job set','gray'))+'</td>';
    h+='<td>'+indBadge(e.id)+'</td>';
    h+='<td>'+c.req+'</td><td>'+(c.outstanding?bg(c.outstanding,'gray'):'-')+'</td><td>'+(c.failed?bg(c.failed,'red'):'-')+'</td><td>'+(c.expiring?bg(c.expiring,'gold'):'-')+'</td><td>'+(c.expired?bg(c.expired,'red'):'-')+'</td>';
    h+='<td><button class="btn btn-p btn-sm" onclick="compEmp=\''+e.id+'\';render()">Open</button></td></tr>';
  });
  if(!list.length) h+='<tr><td colspan="11" style="text-align:center;color:#6B7280;padding:24px">No employees.</td></tr>';
  return h+'</tbody></table></div></div></div>';
}
function renderCompEmp(eid){
  var e=emps.find(function(x){return x.id===eid;}); if(!e){compEmp=null;return renderCompetence();}
  var jt=empJobTitle(eid);
  var h='<div class="topbar"><div style="display:flex;align-items:center;gap:12px;width:100%"><button class="btn btn-o btn-sm" onclick="compEmp=null;render()">← Back</button><div><h1>'+e.name+'</h1><span style="font-size:.78rem;color:#6B7280">'+e.id+' · '+e.site+' · '+e.dept+'</span></div><button class="btn btn-p btn-sm" style="margin-left:auto" onclick="empTNAReport(\''+eid+'\')">📄 Individual TNA</button></div></div><div class="pc">';
  // Job title selector
  h+='<div class="card"><div class="cb"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label style="font-weight:700;font-size:.85rem">Job Title:</label><select id="ej-'+eid+'" style="flex:1;min-width:240px;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px"><option value="">— not set —</option>';
  jobprofiles.slice().sort(function(a,b){return a.title.localeCompare(b.title);}).forEach(function(p){ h+='<option'+(jt===p.title?' selected':'')+'>'+p.title+'</option>'; });
  h+='</select><button class="btn btn-p btn-sm" onclick="setEmpJob(\''+eid+'\')">Set / Change Job</button></div>';
  if(empjobs[eid]&&empjobs[eid].history&&empjobs[eid].history.length>1){ h+='<p style="font-size:.76rem;color:#6B7280;margin-top:8px">Job history kept: '+empjobs[eid].history.map(function(x){return (x.title||'(none)')+' ('+fd(x.dt)+')';}).join(' → ')+'</p>'; }
  h+='</div></div>';
  if(typeof indCounts==='function'){ h+='<div class="card"><div class="cb" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><b>Mine Induction:</b> '+indBadge(eid)+'</div><span style="font-size:.78rem;color:#6B7280">Managed under "Manage Induction"</span></div></div>'; }
  // Required training
  var req=empRequired(eid);
  h+='<div class="card"><div class="ch"><h3>Required Training ('+req.length+')</h3></div><div class="cb">';
  if(!jt) h+='<p style="color:#6B7280;font-size:.85rem;margin-bottom:10px">No job title set — set one above to load the required training, or add individual interventions below.</p>';
  h+='<div class="tw"><table><thead><tr><th>Code</th><th>Intervention</th><th>Programme</th><th>Source</th><th>Validity / Frequency</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  req.sort(function(a,b){var pa=getIntervention(a.code),pb=getIntervention(b.code);return (pa?pa.programme:'').localeCompare(pb?pb.programme:'');});
  req.forEach(function(r){
    var it=getIntervention(r.code); var s=compStatus(eid,r.code);
    h+='<tr><td style="font-weight:700;color:#FBB227">'+r.code+'</td><td>'+(it?it.name:r.code)+(it&&it.critical?' '+bg('Critical','red'):'')+'</td><td style="font-size:.76rem">'+(it?it.programme:'')+'</td>';
    h+='<td>'+(r.source==='job'?bg('Job','blue'):bg('Individual','gold'))+'</td>';
    h+='<td style="font-size:.78rem">'+(it?validityLabel(it.validityMonths):'-')+'</td>';
    var dueB=getDueBy(eid,r.code);
    h+='<td>'+statusBadge(s)+(s.status==='outstanding'&&dueB?' <span style="font-size:.72rem;color:#854D0E;font-weight:700">complete by '+fd(dueB)+'</span>':'')+'</td>';
    h+='<td style="white-space:nowrap"><button class="btn btn-gn btn-sm" onclick="markComplete(\''+eid+'\',\''+r.code+'\')">✓ Complete</button> ';
    if(it&&it.linkedSop) h+='<button class="btn btn-bl btn-sm" onclick="openSopByCode(\''+it.linkedSop+'\')">Course</button> ';
    h+='<button class="btn btn-d btn-sm" onclick="removeReq(\''+eid+'\',\''+r.code+'\')">Remove</button></td></tr>';
  });
  if(!req.length) h+='<tr><td colspan="7" style="text-align:center;color:#6B7280;padding:18px">Nothing required yet.</td></tr>';
  h+='</tbody></table></div>';
  // Add extra
  var avail=interventions.filter(function(it){return it.active!==false&&!req.some(function(r){return r.code===it.code;});}).sort(function(a,b){return (a.programme+a.code).localeCompare(b.programme+b.code);});
  h+='<div style="display:flex;gap:10px;margin-top:14px;align-items:center;flex-wrap:wrap"><label style="font-weight:700;font-size:.82rem">Add individual training:</label><select id="extra-'+eid+'" style="flex:1;min-width:240px;padding:8px 10px;border:2px solid #e2e5e9;border-radius:8px"><option value="">Choose intervention...</option>';
  avail.slice(0,500).forEach(function(it){ h+='<option value="'+it.code+'">'+it.code+' — '+it.name+'</option>'; });
  h+='</select><button class="btn btn-p btn-sm" onclick="addExtra(\''+eid+'\')">+ Add</button></div>';
  h+='</div></div>';
  // History (removed / superseded / old-job completions)
  var reqCodes=req.map(function(r){return r.code;});
  var hist=comp.filter(function(c){return c.eid===eid&&reqCodes.indexOf(c.code)<0;});
  var removed=xassigns.filter(function(a){return a.eid===eid&&a.type==='remove'&&a.active!==false;});
  if(hist.length||removed.length){
    h+='<div class="card" style="border-left:4px solid #FBB227"><div class="ch"><h3>History (always kept)</h3></div><div class="cb"><div class="tw"><table><thead><tr><th>Code</th><th>Intervention</th><th>What</th><th>Date</th><th>Detail</th></tr></thead><tbody>';
    hist.sort(function(a,b){return new Date(b.dt)-new Date(a.dt);}).forEach(function(c){
      var it=getIntervention(c.code);
      h+='<tr><td style="font-weight:600;color:#FBB227">'+c.code+'</td><td>'+(c.cname||(it?it.name:''))+'</td><td>'+bg(it&&it.active===false?'Completed (retired/superseded)':'Completed (not in current job)','green')+'</td><td style="font-size:.76rem">'+fd(c.dt)+'</td><td style="font-size:.78rem;color:#6B7280">'+(c.validUntil?'valid to '+fd(c.validUntil):'no expiry')+(c.note?' · '+c.note:'')+'</td></tr>';
    });
    removed.forEach(function(a){ var it=getIntervention(a.code);
      h+='<tr><td style="font-weight:600;color:#FBB227">'+a.code+'</td><td>'+(it?it.name:'')+'</td><td>'+bg('Removed from person','red')+'</td><td style="font-size:.76rem">'+fd(a.dt)+'</td><td style="font-size:.78rem;color:#6B7280">'+(a.reason||'')+' (by '+(a.by||'-')+')</td></tr>';
    });
    h+='</tbody></table></div></div></div>';
  }
  return h+'</div>';
}
function openSopByCode(code){ var s=sops.find(function(x){return x.code===code;}); if(s){ activeSop=s; page='library'; render(); } else alert('Linked course not found in the LMS yet.'); }
function setEmpJob(eid){
  var sel=document.getElementById('ej-'+eid); var title=sel?sel.value:'';
  var prev=empjobs[eid]?empjobs[eid].title:'';
  if(title===prev) return;
  if(!empjobs[eid]) empjobs[eid]={title:'',history:[]};
  empjobs[eid].history.push({title:title, prev:prev, dt:now(), by:(user&&user.name)||''});
  empjobs[eid].title=title;
  logAudit('SET JOB TITLE', eid+' → '+(title||'(none)'), prev?('was '+prev):'');
  saveTNA().then(function(){ render(); });
}
function removeReq(eid,code){
  var it=getIntervention(code);
  if(!confirm('Remove "'+(it?it.name:code)+'" ('+code+') from this person?')) return;
  if(!confirm('ARE YOU SURE?\n\nThe record is archived in History for audit (never deleted). Click OK to confirm and enter a reason.')) return;
  var reason=prompt('Reason for removal (REQUIRED — no note, no save):');
  if(reason===null) return;
  reason=(reason||'').trim();
  if(!reason){ alert('A reason is required. Nothing was removed.'); return; }
  var add=xassigns.filter(function(a){return a.eid===eid&&a.code===code&&a.type==='add'&&a.active!==false;});
  if(add.length){ add.forEach(function(a){a.active=false; a.removedReason=reason; a.removedAt=now();}); }
  else { xassigns.push({id:gid(), eid:eid, code:code, type:'remove', active:true, dt:now(), by:(user&&user.name)||'', reason:reason}); }
  logAudit('REMOVE TRAINING', eid+' · '+code, reason);
  saveTNA().then(function(){ render(); });
}
function addExtra(eid){
  var sel=document.getElementById('extra-'+eid); var code=sel?sel.value:''; if(!code){alert('Choose an intervention');return}
  var it=getIntervention(code);
  var reason=prompt('Why are you adding "'+(it?it.name:code)+'" ('+code+') to this person?\nThis is an INDIVIDUAL addition (extra training, not from the job profile).\n\nReason (REQUIRED — no note, no save):');
  if(reason===null) return;
  reason=(reason||'').trim();
  if(!reason){ alert('A reason is required. Nothing was added.'); return; }
  xassigns.filter(function(a){return a.eid===eid&&a.code===code&&a.type==='remove'&&a.active!==false;}).forEach(function(a){a.active=false;});
  if(!xassigns.some(function(a){return a.eid===eid&&a.code===code&&a.type==='add'&&a.active!==false;}))
    xassigns.push({id:gid(), eid:eid, code:code, type:'add', active:true, dt:now(), by:(user&&user.name)||'', reason:reason});
  logAudit('ADD TRAINING', eid+' · '+code, reason);
  saveTNA().then(function(){ render(); });
}
function markComplete(eid,code){
  var it=getIntervention(code); var today=new Date().toISOString().slice(0,10);
  var ov=document.createElement('div'); ov.id='mc-ov'; ov.className='mbg'; ov.onclick=function(e){if(e.target===ov)ov.remove();};
  var m='<div class="mdl"><div class="mh"><h2>Mark complete — '+code+'</h2><button class="btn btn-o btn-sm" onclick="document.getElementById(\'mc-ov\').remove()">Close</button></div><div class="mbd">';
  m+='<p style="font-size:.85rem;color:#6B7280;margin-bottom:10px">'+(it?it.name:'')+' · Validity / Frequency: '+(it?validityLabel(it.validityMonths):'-')+'</p>';
  m+='<div class="fg"><label>Date completed</label><input type="date" id="mc-date" value="'+today+'"></div>';
  m+='<div class="fg"><label>Method</label><select id="mc-method"><option value="manual">Manual / classroom</option><option value="external">External / certificate</option><option value="assessment">In-app assessment</option></select></div>';
  m+='<div class="fg"><label>Note (optional)</label><input id="mc-note" placeholder="e.g. certificate number"></div>';
  m+='<button class="btn btn-p" style="width:auto;margin-top:6px" onclick="confirmComplete(\''+eid+'\',\''+code+'\')">Save completion</button>';
  m+='</div></div>'; ov.innerHTML=m; document.body.appendChild(ov);
}
function confirmComplete(eid,code){
  var it=getIntervention(code);
  var d=document.getElementById('mc-date').value; if(!d){alert('Pick a date');return}
  var dtISO=new Date(d).toISOString(); var vm=it?it.validityMonths:null;
  var validUntil=(vm&&vm>0)?addMonths(dtISO,vm):null;
  comp.push({id:gid(), eid:eid, code:code, cname:it?it.name:'', dt:dtISO, validUntil:validUntil,
    method:document.getElementById('mc-method').value, by:(user&&user.name)||'', note:document.getElementById('mc-note').value||''});
  logAudit('COMPLETE TRAINING', eid+' · '+code, validUntil?('valid to '+fd(validUntil)):'no expiry');
  saveTNA().then(function(){ var ov=document.getElementById('mc-ov'); if(ov)ov.remove(); render(); });
}

// =====================  EXPIRY REPORT  =====================
function expiryRows(){
  var rows=[];
  emps.forEach(function(e){
    empRequired(e.id).forEach(function(r){
      var s=compStatus(e.id,r.code); if(s.status!=='expiring'&&s.status!=='expired'&&s.status!=='failed') return;
      var it=getIntervention(r.code);
      rows.push({eid:e.id, name:e.name, site:e.site, dept:e.dept, job:empJobTitle(e.id), code:r.code, iname:it?it.name:'', days:s.days, validUntil:s.validUntil, status:s.status});
    });
  });
  return rows.sort(function(a,b){ function k(r){return r.status==='failed'?-1000:(r.days==null?9999:r.days);} return k(a)-k(b); });
}
function expiryRowsFiltered(){
  return expiryRows().filter(function(r){
    if(!inArrOrAll(expSites, r.site)) return false;
    if(!inArrOrAll(expDepts, r.dept||'')) return false;
    if(expSearch){ var q=expSearch.toLowerCase(); if((r.eid+' '+(r.name||'')).toLowerCase().indexOf(q)<0) return false; }
    return true;
  });
}
function bucket(r){ if(r&&r.status==='failed') return 'Not Yet Competent'; var d=(r&&typeof r==='object')?r.days:r; if(d<0)return 'Expired'; if(d<=1)return 'Due ≤1 day'; if(d<=7)return 'Due ≤7 days'; if(d<=30)return 'Due ≤30 days'; return 'Due ≤60 days'; }
function renderExpiry(){
  var rows=expiryRowsFiltered();
  var b={'Not Yet Competent':0,'Expired':0,'Due ≤1 day':0,'Due ≤7 days':0,'Due ≤30 days':0,'Due ≤60 days':0};
  rows.forEach(function(r){ b[bucket(r)]++; });
  var h='<div class="topbar"><h1>Expiry & Renewals</h1><button class="btn btn-p btn-sm" onclick="dlExpiryCSV()">📥 Export CSV</button></div><div class="pc">';
  h+=filterBar(emps,'expSites','expDepts','expSearch');
  h+='<div class="sg"><div class="sc rd"><div class="l">Not Yet Competent</div><div class="v">'+b['Not Yet Competent']+'</div></div>'+
     '<div class="sc rd"><div class="l">Expired</div><div class="v">'+b['Expired']+'</div></div>'+
     '<div class="sc gd"><div class="l">Due ≤1 day</div><div class="v">'+b['Due ≤1 day']+'</div></div>'+
     '<div class="sc gd"><div class="l">Due ≤7 days</div><div class="v">'+b['Due ≤7 days']+'</div></div>'+
     '<div class="sc bl"><div class="l">Due ≤30 days</div><div class="v">'+b['Due ≤30 days']+'</div></div>'+
     '<div class="sc bl"><div class="l">Due ≤60 days</div><div class="v">'+b['Due ≤60 days']+'</div></div></div>';
  h+='<div class="card"><div class="ch"><h3>Action Needed — Not Yet Competent, Expiring &amp; Expired</h3></div><div class="tw"><table><thead><tr><th>Status</th><th>Emp#</th><th>Name</th><th>Site</th><th>Dept</th><th>Job</th><th>Code</th><th>Intervention</th><th>Expiry</th></tr></thead><tbody>';
  rows.slice(0,500).forEach(function(r){
    var col=(r.status==='expired'||r.status==='failed')?'red':'gold';
    h+='<tr><td>'+bg(bucket(r),col)+'</td><td style="font-weight:600">'+r.eid+'</td><td>'+r.name+'</td><td style="font-size:.8rem">'+r.site+'</td><td style="font-size:.78rem">'+(r.dept||'-')+'</td><td style="font-size:.76rem">'+(r.job||'-')+'</td><td style="font-weight:600;color:#FBB227">'+r.code+'</td><td>'+r.iname+'</td><td style="font-size:.8rem">'+(r.validUntil?fd(r.validUntil):'-')+'</td></tr>';
  });
  if(!rows.length) h+='<tr><td colspan="9" style="text-align:center;color:#6B7280;padding:24px">Nothing to action — no not-yet-competent, expiring or expired training. 🎉</td></tr>';
  return h+'</tbody></table></div></div></div>';
}
function dlExpiryCSV(){
  var rows=expiryRowsFiltered(); var csv='Window,EmployeeNo,Name,Site,JobTitle,Code,Intervention,ExpiryDate,Status\n';
  rows.forEach(function(r){ csv+=[bucket(r),r.eid,'"'+r.name+'"',r.site,'"'+(r.job||'')+'"',r.code,'"'+r.iname.replace(/"/g,'')+'"',r.validUntil?fd(r.validUntil):'',r.status].join(',')+'\n'; });
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='OneMining_Expiry_Report.csv'; a.click();
}

// =====================  EMPLOYEE SELF-VIEW: MY COMPETENCE  =====================
function renderMyComp(){
  var eid=user.id; var jt=empJobTitle(eid); var req=empRequired(eid);
  var h='<div class="topbar"><h1>My Competence</h1><span style="font-size:.78rem;color:#6B7280">'+(jt||'No job title set')+'</span></div><div class="pc">';
  var c=empCounts(eid);
  h+='<div class="sg"><div class="sc gd"><div class="l">Required</div><div class="v">'+c.req+'</div></div><div class="sc gn"><div class="l">Valid</div><div class="v">'+c.valid+'</div></div><div class="sc bl"><div class="l">Outstanding</div><div class="v">'+c.outstanding+'</div></div><div class="sc rd"><div class="l">Expired/Expiring</div><div class="v">'+(c.expired+c.expiring)+'</div></div></div>';
  h+='<div class="card"><div class="ch"><h3>My Required Training</h3></div><div class="tw"><table><thead><tr><th>Code</th><th>Intervention</th><th>Programme</th><th>Status</th><th></th></tr></thead><tbody>';
  req.forEach(function(r){ var it=getIntervention(r.code); var s=compStatus(eid,r.code);
    h+='<tr><td style="font-weight:600;color:#FBB227">'+r.code+'</td><td>'+(it?it.name:r.code)+'</td><td style="font-size:.76rem">'+(it?it.programme:'')+'</td><td>'+statusBadge(s)+'</td>';
    h+='<td>'+(it&&it.linkedSop&&(s.status==='outstanding'||s.status==='expired'||s.status==='expiring')?'<button class="btn btn-p btn-sm" onclick="openSopByCode(\''+it.linkedSop+'\')">Start</button>':'')+'</td></tr>';
  });
  if(!req.length) h+='<tr><td colspan="5" style="text-align:center;color:#6B7280;padding:24px">No training assigned. Contact your administrator.</td></tr>';
  return h+'</tbody></table></div></div></div>';
}

// ===================== MANAGER / ROLE-BASED ACCESS =====================
function loginModeChange(){
  var m=document.getElementById('login-mode').value;
  var ef=document.getElementById('emp-fields'), lbl=document.getElementById('login-lbl'),
      elbl=document.getElementById('login-eid-lbl'), ein=document.getElementById('login-eid');
  if(!ef) return;
  if(m==='admin'){ ef.style.display='none'; lbl.textContent='Password'; }
  else if(m==='manager'){ ef.style.display='block'; elbl.textContent='Username'; ein.placeholder='manager username'; lbl.textContent='Password'; }
  else { ef.style.display='block'; elbl.textContent='Employee Number'; ein.placeholder='e.g. OM001'; lbl.textContent='PIN'; }
}
function getManager(username){ for(var i=0;i<managers.length;i++) if(managers[i].username&&managers[i].username.toLowerCase()===String(username).toLowerCase()) return managers[i]; return null; }
function getManagerById(id){ for(var i=0;i<managers.length;i++) if(managers[i].id===id) return managers[i]; return null; }
function inScope(mgr,emp){
  if(!mgr) return false;
  if(mgr.allAccess) return true;
  if(mgr.sites&&mgr.sites.indexOf(emp.site)>=0) return true;
  if(mgr.depts&&mgr.depts.length&&emp.dept&&mgr.depts.some(function(d){return d&&emp.dept.toLowerCase()===String(d).toLowerCase();})) return true;
  if(mgr.jobGroups&&mgr.jobGroups.length){ var jt=empJobTitle(emp.id); var p=jt?getProfile(jt):null; if(p&&mgr.jobGroups.indexOf(p.group)>=0) return true; }
  if(mgr.emps&&mgr.emps.indexOf(emp.id)>=0) return true;
  return false;
}
function scopedEmps(mgr){ return emps.filter(function(e){return inScope(mgr,e);}); }
function isCompetent(eid){ var req=empRequired(eid); for(var i=0;i<req.length;i++){var s=compStatus(eid,req[i].code).status; if(s==='outstanding'||s==='expired'||s==='failed') return false;} return true; }

function renderManagerShell(){
  var mgr=user.mgr; var nm=user.name||'Manager';
  var sb='<aside class="sb"><div class="sb-brand"><div class="sb-logo"><img src="'+BRAND.logo+'" alt=""></div><h2>'+BRAND.name+'</h2><p>'+(user.role==='training'?'Training Dept':'Manager')+'</p></div><div class="sb-nav">';
  sb+='<div class="ni a" onclick="mgrEmp=null;render()">📋 Compliance Report</div>';
  sb+='</div><div class="sb-u"><div class="nm">'+nm+'</div><div class="rl">'+(mgr&&mgr.allAccess?'All sites':'Scoped access')+'</div><div class="ni" style="margin-top:8px;padding:8px 0" onclick="doLogout()">← Sign Out</div></div></aside>';
  var mc='<main class="mc">'+(mgrEmp?renderManagerEmp(mgrEmp):renderManagerReport())+'</main>';
  return '<div class="app">'+sb+mc+'</div>';
}
function renderManagerReport(){
  var mgr=user.mgr; var scoped=scopedEmps(mgr);
  var list=filterEmps(scoped, mgrSites, mgrDepts, mgrSearch);
  var notC=[], comp_=[], noset=[];
  list.forEach(function(e){ var req=empRequired(e.id); if(!req.length){noset.push(e);} else if(isCompetent(e.id)){comp_.push(e);} else {notC.push(e);} });
  var h='<div class="topbar"><h1>Compliance Report</h1><span style="font-size:.78rem;color:#6B7280">'+list.length+' of '+scoped.length+' people</span></div><div class="pc">';
  h+=filterBar(scoped,'mgrSites','mgrDepts','mgrSearch');
  h+='<div class="sg"><div class="sc rd"><div class="l">Not Yet Competent</div><div class="v">'+notC.length+'</div></div><div class="sc gn"><div class="l">Competent</div><div class="v">'+comp_.length+'</div></div><div class="sc gd"><div class="l">No Job/Training Set</div><div class="v">'+noset.length+'</div></div></div>';
  function tbl(title,arr,badgeFn){
    var x='<div class="card"><div class="ch"><h3>'+title+' ('+arr.length+')</h3></div><div class="tw"><table><thead><tr><th>Emp#</th><th>Name</th><th>Site</th><th>Dept</th><th>Job Title</th><th>Outstanding</th><th>Expired</th><th>Status</th><th></th></tr></thead><tbody>';
    arr.forEach(function(e){ var c=empCounts(e.id);
      x+='<tr><td style="font-weight:700;color:#FBB227">'+e.id+'</td><td style="font-weight:600">'+e.name+'</td><td style="font-size:.8rem">'+e.site+'</td><td style="font-size:.8rem">'+(e.dept||'-')+'</td><td style="font-size:.76rem">'+(empJobTitle(e.id)||'-')+'</td>';
      x+='<td>'+(c.outstanding?bg(c.outstanding,'gray'):'-')+'</td><td>'+(c.expired?bg(c.expired,'red'):'-')+'</td><td>'+badgeFn(e)+'</td><td><button class="btn btn-p btn-sm" onclick="mgrEmp=\''+e.id+'\';render()">View</button></td></tr>';
    });
    if(!arr.length) x+='<tr><td colspan="9" style="text-align:center;color:#6B7280;padding:18px">None.</td></tr>';
    return x+'</tbody></table></div></div>';
  }
  h+=tbl('⚠ Not Yet Competent — action needed', notC, function(e){var c=empCounts(e.id);var t=[];if(c.failed)t.push(c.failed+' not yet competent');if(c.expired)t.push(c.expired+' expired');if(c.outstanding)t.push(c.outstanding+' outstanding');return bg(t.join(' · ')||'Not yet competent','red');});
  if(noset.length) h+=tbl('No Job Title / Training Set', noset, function(){return bg('Not set','gray');});
  h+=tbl('✓ Competent', comp_, function(e){var c=empCounts(e.id);return c.expiring?bg('Competent · '+c.expiring+' expiring','gold'):bg('Competent','green');});
  return h+'</div>';
}
function renderManagerEmp(eid){
  var e=emps.find(function(x){return x.id===eid;}); if(!e){mgrEmp=null;return renderManagerReport();}
  var req=empRequired(eid);
  var h='<div class="topbar"><div style="display:flex;align-items:center;gap:12px;flex:1"><button class="btn btn-o btn-sm" onclick="mgrEmp=null;render()">← Back to report</button><div><h1>'+e.name+'</h1><span style="font-size:.78rem;color:#6B7280">'+e.id+' · '+e.site+' · '+(e.dept||'')+' · '+(empJobTitle(eid)||'No job set')+'</span></div></div>'+(isCompetent(eid)&&req.length?bg('COMPETENT','green'):bg('NOT YET COMPETENT','red'))+'</div><div class="pc">';
  // ID number intentionally hidden for manager/training roles
  h+='<div class="card"><div class="ch"><h3>Training ('+req.length+')</h3></div><div class="tw"><table><thead><tr><th>Code</th><th>Intervention</th><th>Programme</th><th>Validity / Frequency</th><th>Completed</th><th>Status</th></tr></thead><tbody>';
  var rank={outstanding:0,expired:1,expiring:2,valid:3};
  req.sort(function(a,b){return rank[compStatus(eid,a.code).status]-rank[compStatus(eid,b.code).status];});
  req.forEach(function(r){ var it=getIntervention(r.code); var s=compStatus(eid,r.code);
    h+='<tr><td style="font-weight:600;color:#FBB227">'+r.code+'</td><td>'+(it?it.name:r.code)+(it&&it.critical?' '+bg('Critical','red'):'')+'</td><td style="font-size:.76rem">'+(it?it.programme:'')+'</td><td style="font-size:.78rem">'+(it?validityLabel(it.validityMonths):'-')+'</td><td style="font-size:.78rem">'+(s.last?fd(s.last.dt):'-')+'</td><td>'+statusBadge(s)+'</td></tr>';
  });
  if(!req.length) h+='<tr><td colspan="6" style="text-align:center;color:#6B7280;padding:18px">No training assigned.</td></tr>';
  h+='</tbody></table></div></div>';
  var reqCodes=req.map(function(r){return r.code;});
  var hist=comp.filter(function(c){return c.eid===eid&&reqCodes.indexOf(c.code)<0;});
  if(hist.length){
    h+='<div class="card" style="border-left:4px solid #FBB227"><div class="ch"><h3>Previous / Superseded Training (history)</h3></div><div class="tw"><table><thead><tr><th>Code</th><th>Intervention</th><th>Completed</th><th>Detail</th></tr></thead><tbody>';
    hist.sort(function(a,b){return new Date(b.dt)-new Date(a.dt);}).forEach(function(c){ var it=getIntervention(c.code);
      h+='<tr><td style="font-weight:600;color:#FBB227">'+c.code+'</td><td>'+(c.cname||(it?it.name:''))+'</td><td style="font-size:.78rem">'+fd(c.dt)+'</td><td style="font-size:.78rem;color:#6B7280">'+(c.validUntil?'valid to '+fd(c.validUntil):'no expiry')+'</td></tr>';
    });
    h+='</tbody></table></div></div>';
  }
  return h+'</div>';
}

// ----- Admin: manage manager accounts -----
function renderManageManagers(){
  if(mmgrEdit!==null) return renderManagerForm();
  var h='<div class="topbar"><h1>Manager Accounts</h1><button class="btn btn-p btn-sm" onclick="mmgrEdit=\'new\';render()">+ Add Account</button></div><div class="pc">';
  h+='<div class="card"><div class="tw"><table><thead><tr><th>Name</th><th>Username</th><th>Type</th><th>Scope</th><th>Actions</th></tr></thead><tbody>';
  managers.forEach(function(m){
    var scope=m.allAccess?'All sites':[((m.sites||[]).length?'Sites: '+m.sites.join(', '):''),((m.depts||[]).length?'Depts: '+m.depts.join(', '):''),((m.jobGroups||[]).length?'Groups: '+m.jobGroups.join(', '):''),((m.emps||[]).length?m.emps.length+' employees':'')].filter(Boolean).join(' · ')||'(none set)';
    h+='<tr><td style="font-weight:600">'+m.name+'</td><td>'+m.username+'</td><td>'+bg(m.role==='training'?'Training Dept':'Manager',m.allAccess?'blue':'gold')+'</td><td style="font-size:.78rem">'+scope+'</td><td style="white-space:nowrap"><button class="btn btn-o btn-sm" onclick="mmgrEdit=\''+m.id+'\';render()">Edit</button> <button class="btn btn-d btn-sm" onclick="delManager(\''+m.id+'\')">Del</button></td></tr>';
  });
  if(!managers.length) h+='<tr><td colspan="5" style="text-align:center;color:#6B7280;padding:24px">No manager accounts yet. Add one to give scoped, view-only compliance access.</td></tr>';
  return h+'</tbody></table></div></div></div>';
}
function renderManagerForm(){
  var m=mmgrEdit==='new'?{id:'',name:'',username:'',password:'',role:'manager',allAccess:false,sites:[],depts:[],jobGroups:[],emps:[]}:getManagerById(mmgrEdit);
  if(!m){ mmgrEdit=null; return renderManageManagers(); }
  var allGroups=[]; jobprofiles.forEach(function(p){ if(p.group&&allGroups.indexOf(p.group)<0)allGroups.push(p.group); });
  var roleNow=(document.getElementById('mg-role')?document.getElementById('mg-role').value:m.role);
  var isTraining=roleNow==='training';
  var h='<div class="topbar"><h1>'+(mmgrEdit==='new'?'New':'Edit')+' Manager Account</h1><button class="btn btn-o btn-sm" onclick="mmgrEdit=null;render()">← Back</button></div><div class="pc"><div class="card"><div class="cb">';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">';
  h+='<div class="fg"><label>Full Name</label><input id="mg-name" value="'+(m.name||'').replace(/"/g,'&quot;')+'"></div>';
  h+='<div class="fg"><label>Username</label><input id="mg-user" value="'+(m.username||'').replace(/"/g,'&quot;')+'"></div>';
  h+='<div class="fg"><label>Password</label><input id="mg-pass" value="'+(m.password||'').replace(/"/g,'&quot;')+'"></div>';
  h+='<div class="fg"><label>Role</label><select id="mg-role" onchange="render()"><option value="manager"'+(!isTraining?' selected':'')+'>Manager (scoped)</option><option value="training"'+(isTraining?' selected':'')+'>Training Dept (all access)</option></select></div>';
  h+='</div>';
  if(!isTraining){
    h+='<div style="margin-top:6px"><label style="font-weight:700;font-size:.82rem">Responsible area — an employee is included if they match ANY of these:</label>';
    h+='<div style="margin:8px 0"><div style="font-size:.78rem;font-weight:700;color:#6B7280;margin-bottom:4px">Sites</div>';
    sites.forEach(function(s){ h+='<label style="margin-right:14px;font-size:.85rem"><input type="checkbox" class="mg-site" value="'+s.replace(/"/g,'&quot;')+'"'+((m.sites||[]).indexOf(s)>=0?' checked':'')+'> '+s+'</label>'; });
    h+='</div>';
    h+='<div class="fg"><label>Departments — type to search, tick to add</label><input placeholder="Type a department..." oninput="empPickFilter(this,\'mg-dept-box\')" style="width:100%;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px;margin-bottom:6px"><div id="mg-dept-box" style="max-height:160px;overflow:auto;border:1px solid #d1d5db;border-radius:8px;padding:8px">';
    distinctVals(emps,'dept').forEach(function(d){ h+='<label class="mg-pick-opt" style="display:block;padding:2px 4px;font-size:.85rem"><input type="checkbox" class="mg-dept-cb" value="'+d.replace(/"/g,'&quot;')+'"'+((m.depts||[]).indexOf(d)>=0?' checked':'')+'> '+d+'</label>'; });
    h+='</div></div>';
    h+='<div style="margin:8px 0"><div style="font-size:.78rem;font-weight:700;color:#6B7280;margin-bottom:4px">Job Groups</div>';
    allGroups.forEach(function(g){ h+='<label style="margin-right:14px;font-size:.85rem;display:inline-block"><input type="checkbox" class="mg-grp" value="'+g.replace(/"/g,'&quot;')+'"'+((m.jobGroups||[]).indexOf(g)>=0?' checked':'')+'> '+g+'</label>'; });
    h+='</div>';
    h+='<div class="fg"><label>Specific employees (optional) — type name or number to search, tick to add</label><input placeholder="Type name or employee no..." oninput="empPickFilter(this,\'mg-emp-box\')" style="width:100%;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px;margin-bottom:6px"><div id="mg-emp-box" style="max-height:200px;overflow:auto;border:1px solid #d1d5db;border-radius:8px;padding:8px">';
    emps.forEach(function(e){ h+='<label class="mg-pick-opt" style="display:block;padding:2px 4px;font-size:.85rem"><input type="checkbox" class="mg-emp-cb" value="'+e.id+'"'+((m.emps||[]).indexOf(e.id)>=0?' checked':'')+'> '+e.id+' — '+e.name+'</label>'; });
    h+='</div></div></div>';
  } else { h+='<p style="color:#6B7280;font-size:.85rem;margin-top:8px">Training Dept account sees <b>all employees, all sites</b> — view-only, with ID numbers hidden.</p>'; }
  h+='<div style="margin-top:14px"><button class="btn btn-p" style="width:auto" onclick="saveManager()">Save Account</button></div>';
  return h+'</div></div></div>';
}
function saveManager(){
  var name=document.getElementById('mg-name').value.trim(), un=document.getElementById('mg-user').value.trim(), pw=document.getElementById('mg-pass').value.trim();
  var role=document.getElementById('mg-role').value;
  if(!name||!un||!pw){ alert('Name, username and password are required'); return; }
  var allAccess=role==='training', sitesSel=[], grpSel=[], depts=[], empsSel=[];
  if(!allAccess){
    document.querySelectorAll('.mg-site:checked').forEach(function(c){sitesSel.push(c.value);});
    document.querySelectorAll('.mg-grp:checked').forEach(function(c){grpSel.push(c.value);});
    document.querySelectorAll('.mg-dept-cb:checked').forEach(function(c){depts.push(c.value);});
    document.querySelectorAll('.mg-emp-cb:checked').forEach(function(c){empsSel.push(c.value);});
  }
  if(mmgrEdit==='new'){
    if(getManager(un)){ alert('That username already exists'); return; }
    managers.push({id:gid(),name:name,username:un,password:pw,role:role,allAccess:allAccess,sites:sitesSel,depts:depts,jobGroups:grpSel,emps:empsSel});
    logAudit('ADD MANAGER', name+' ('+un+')', role);
  } else {
    var mm=getManagerById(mmgrEdit); if(mm){ mm.name=name;mm.username=un;mm.password=pw;mm.role=role;mm.allAccess=allAccess;mm.sites=sitesSel;mm.depts=depts;mm.jobGroups=grpSel;mm.emps=empsSel; logAudit('EDIT MANAGER', name+' ('+un+')', role); }
  }
  saveTNA().then(function(){ mmgrEdit=null; render(); });
}
function delManager(id){ var m=getManagerById(id); if(!m)return; if(!confirm('Delete manager account '+m.name+'?'))return; managers=managers.filter(function(x){return x.id!==id;}); logAudit('DELETE MANAGER', m.name+' ('+m.username+')',''); saveTNA().then(function(){render();}); }

// ===================== TRAINING VERSIONING / ARCHIVE =====================
function bumpRev(rev){ rev=rev||'Rev 1.0'; var m=rev.match(/(\d+)\.(\d+)\s*$/); if(m){return rev.replace(/(\d+)\.(\d+)\s*$/, m[1]+'.'+(parseInt(m[2])+1));} var n=rev.match(/(\d+)\s*$/); if(n){return rev.replace(/(\d+)\s*$/, parseInt(n[1])+1);} return rev+' v2'; }
function reviseSop(id){
  var sop=sops.find(function(s){return s.id===id;}); if(!sop){ alert('Training not found'); return; }
  var reason=prompt('Revise "'+sop.title+'" ('+sop.code+').\n\nThis ARCHIVES the current version ('+sop.rev+') for audit, KEEPS all employee records, then opens the editor so you can upload the new info.\n\nWhat is changing? (reason for audit):');
  if(reason===null) return;
  var newRev=prompt('New version label:', bumpRev(sop.rev));
  if(newRev===null) return;
  sopArchive.unshift({id:gid(), code:sop.code, title:sop.title, rev:sop.rev, archivedAt:now(), by:(user&&user.name)||'Administrator', reason:reason||'', snapshot:JSON.parse(JSON.stringify(sop))});
  sop.rev = newRev || sop.rev;
  logAudit('REVISE TRAINING', sop.code+' → '+sop.rev, reason||'');
  if(typeof save==='function') save();
  saveTNA().then(function(){
    page='msops'; activeSop=null; render();
    if(typeof editSop==='function') setTimeout(function(){ editSop(id); }, 60);
  });
}
function renderSopArchive(){
  var h='<div class="topbar"><h1>Training Archive</h1><span style="font-size:.78rem;color:#6B7280">'+sopArchive.length+' archived versions</span></div><div class="pc">';
  h+='<p style="color:#6B7280;font-size:.85rem;margin-bottom:10px">A snapshot is captured every time a training is revised — kept permanently for audit. Employee completion records are never deleted.</p>';
  h+='<div class="card"><div class="tw"><table><thead><tr><th>Code</th><th>Title</th><th>Version</th><th>Archived</th><th>By</th><th>Reason</th><th></th></tr></thead><tbody>';
  sopArchive.forEach(function(a){
    h+='<tr><td style="font-weight:700;color:#FBB227">'+a.code+'</td><td>'+a.title+'</td><td>'+a.rev+'</td><td style="font-size:.78rem">'+fd(a.archivedAt)+'</td><td style="font-size:.8rem">'+(a.by||'-')+'</td><td style="font-size:.8rem;color:#6B7280">'+(a.reason||'')+'</td><td><button class="btn btn-o btn-sm" onclick="viewArchive(\''+a.id+'\')">View</button></td></tr>';
  });
  if(!sopArchive.length) h+='<tr><td colspan="7" style="text-align:center;color:#6B7280;padding:24px">No archived versions yet. Use "Make changes / New version" on a training to create one.</td></tr>';
  return h+'</tbody></table></div></div></div>';
}
function viewArchive(id){
  var a=null; for(var i=0;i<sopArchive.length;i++) if(sopArchive[i].id===id) a=sopArchive[i];
  if(!a) return; var s=a.snapshot||{};
  var ov=document.createElement('div'); ov.id='arch-ov'; ov.className='mbg'; ov.onclick=function(e){ if(e.target===ov) ov.remove(); };
  var m='<div class="mdl"><div class="mh"><h2>'+a.code+' · '+a.rev+'</h2><button class="btn btn-o btn-sm" onclick="document.getElementById(\'arch-ov\').remove()">Close</button></div><div class="mbd">';
  m+='<p style="font-size:.82rem;color:#6B7280">Archived '+fd(a.archivedAt)+' by '+(a.by||'-')+' · Reason: '+(a.reason||'-')+'</p>';
  m+='<div class="fg"><label>Title (at the time)</label><div>'+(s.title||'')+'</div></div>';
  m+='<div class="fg"><label>Description</label><div>'+(s.desc||'')+'</div></div>';
  m+='<p style="font-size:.82rem;color:#6B7280">Document: '+(s.docName||'none')+' · Video: '+(s.vidName||'none')+' · Slides: '+(s.slidesName||'none')+' · Questions: '+((s.qs&&s.qs.length)||0)+'</p>';
  if(s.html) m+='<div class="card"><div class="cb" style="max-height:300px;overflow:auto">'+s.html+'</div></div>';
  m+='</div></div>'; ov.innerHTML=m; document.body.appendChild(ov);
}

// ===================== INDIVIDUAL TNA REPORT (per employee) =====================
function monthYear(iso){ if(!iso) return '-'; var d=new Date(iso); return d.toLocaleDateString('en-ZA',{month:'short',year:'numeric'}); }
function empTNAReport(eid){
  var e=emps.find(function(x){return x.id===eid;}); if(!e){ alert('Employee not found'); return; }
  var jt=empJobTitle(eid); var prof=jt?getProfile(jt):null;
  var req=empRequired(eid);
  req.sort(function(a,b){ var pa=getIntervention(a.code)||{}, pb=getIntervention(b.code)||{}; return ((pa.programme||'')+a.code).localeCompare((pb.programme||'')+b.code); });
  var GRN='#DCFCE7',GRNT='#166534',RED='#FEE2E2',REDT='#991B1B',YEL='#FEF9C3',YELT='#854D0E';
  var rows='', nC=0,nOver=0,nDue=0;
  req.forEach(function(r){ var it=getIntervention(r.code)||{}; var s=compStatus(eid,r.code);
    var bgc,txt,statusLbl,nextStyle='';
    if(s.status==='valid'){bgc=GRN;txt=GRNT;statusLbl='Competent';nC++;}
    else if(s.status==='expiring'){bgc=GRN;txt=GRNT;statusLbl='Competent — renew soon';nC++;nextStyle='background:'+YEL+';color:'+YELT+';font-weight:700';}
    else if(s.status==='expired'){bgc=RED;txt=REDT;statusLbl='Overdue';nOver++;}
    else if(s.status==='failed'){bgc=RED;txt=REDT;statusLbl='Not yet competent';nOver++;}
    else {bgc=YEL;txt=YELT;statusLbl='To be done';nDue++;}
    var completed=s.last?monthYear(s.last.dt):'-';
    var nextDue=s.validUntil?fd(s.validUntil):(getDueBy(eid,r.code)?('by '+fd(getDueBy(eid,r.code))):((s.status==='valid'||s.status==='expiring')?'No expiry':'-'));
    rows+='<tr style="background:'+bgc+';color:'+txt+'"><td>'+r.code+'</td><td>'+(it.name||r.code)+(it.critical?' <b>(Critical)</b>':'')+'</td><td>'+(it.programme||'')+'</td><td>'+validityLabel(it.validityMonths)+'</td><td style="font-weight:700">'+statusLbl+'</td><td>'+completed+'</td><td style="'+nextStyle+'">'+nextDue+'</td></tr>';
  });
  var w=window.open('','_blank');
  w.document.write('<!DOCTYPE html><html><head><title>Individual TNA - '+e.name+'</title><style>*{box-sizing:border-box}body{font-family:Arial;color:#243034;padding:30px;max-width:1040px;margin:0 auto}.hdr{text-align:center;border-bottom:4px solid #FBB227;padding-bottom:14px;margin-bottom:16px}.hdr h1{font-size:1.5rem;font-weight:800}.gold{color:#FBB227}.ttl{text-align:center;font-size:1.1rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:12px 0}table{width:100%;border-collapse:collapse;margin:8px 0;font-size:.78rem}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left}th{background:#243034;color:#fff;font-size:.7rem;text-transform:uppercase}.info td{border:1px solid #e5e7eb;padding:7px 10px;font-size:.85rem}.info td:nth-child(odd){background:#f8f9fa;font-weight:700;width:150px;text-transform:uppercase;font-size:.7rem;color:#6B7280}.leg{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0;font-size:.76rem}.leg span{padding:4px 10px;border-radius:4px;font-weight:700}.ftr{margin-top:22px;padding-top:10px;border-top:2px solid #FBB227;font-size:.7rem;color:#6B7280;text-align:center}@media print{button{display:none}}</style></head><body>');
  w.document.write('<div class="hdr"><h1>'+BRAND.name+'</h1><p>Training Management System</p></div><div class="ttl">Individual Training Needs Analysis (TNA)</div>');
  w.document.write('<table class="info"><tr><td>Employee Name</td><td>'+e.name+'</td><td>Employee No.</td><td>'+e.id+'</td></tr><tr><td>ID Number</td><td>'+(e.idn||'-')+'</td><td>Gender</td><td>'+(e.gender||'-')+'</td></tr><tr><td>Site</td><td>'+(e.site||'-')+'</td><td>Department</td><td>'+(e.dept||'-')+'</td></tr><tr><td>Job Title</td><td>'+(jt||'(not set)')+'</td><td>Job Group</td><td>'+((prof&&prof.group)||'-')+'</td></tr><tr><td>Date Generated</td><td>'+fd(now())+'</td><td>Total Interventions</td><td>'+req.length+'</td></tr><tr><td>Mine Induction</td><td>'+(typeof indStatusText==='function'?indStatusText(eid):'-')+'</td><td>Induction Status</td><td>'+((typeof indCompetent==='function'&&indCompetent(eid))?'COMPLETE':'IN PROGRESS')+'</td></tr></table>');
  w.document.write('<div class="leg"><span style="background:'+GRN+';color:'+GRNT+'">Competent</span><span style="background:'+YEL+';color:'+YELT+'">To be done / Next due</span><span style="background:'+RED+';color:'+REDT+'">Overdue / Not competent</span></div>');
  w.document.write('<p style="font-size:.82rem"><b>Summary:</b> '+nC+' competent · '+nDue+' to be done · '+nOver+' overdue/not competent</p>');
  w.document.write('<table><thead><tr><th>Code</th><th>Training Intervention</th><th>Programme</th><th>Frequency</th><th>Status</th><th>Completed</th><th>Next Due</th></tr></thead><tbody>'+(rows||'<tr><td colspan="7" style="text-align:center">No training allocated — set a job title for this employee.</td></tr>')+'</tbody></table>');
  w.document.write('<div style="margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:40px"><div style="border-top:2px solid #243034;padding-top:6px;font-size:.76rem">Employee Signature / Date</div><div style="border-top:2px solid #243034;padding-top:6px;font-size:.76rem">Training Officer / Date</div></div>');
  w.document.write('<div class="ftr">'+BRAND.legal+' — Individual TNA · Generated '+fd(now())+' · Confidential</div>');
  w.document.write('<div style="text-align:center;margin-top:16px"><button onclick="window.print()" style="padding:10px 28px;background:#FBB227;border:none;border-radius:8px;font-weight:700;cursor:pointer">🖨 Print / Save as PDF</button></div>');
  w.document.close();
}

// ===================== BULK ASSIGN INTERVENTIONS (by site/dept/people, with complete-by date) =====================
function iaTargets(){
  // Most specific wins: if specific employees are chosen, use only those.
  if(iaEmps.length) return emps.filter(function(e){ return iaEmps.indexOf(e.id)>=0; });
  if(!iaSites.length&&!iaDepts.length) return [];
  // Otherwise match Site AND Department together (each optional).
  return emps.filter(function(e){
    if(iaSites.length&&iaSites.indexOf(e.site)<0) return false;
    if(iaDepts.length&&iaDepts.indexOf(e.dept||'')<0) return false;
    return true;
  });
}
function renderIAssign(){
  var h='<div class="topbar"><h1>Bulk Assign</h1></div><div class="pc">';
  h+='<div class="card" style="overflow:visible"><div class="ch"><h3>Bulk-assign training to many people at once</h3></div><div class="cb" style="overflow:visible">';
  h+='<p style="color:#6B7280;font-size:.85rem;margin-bottom:12px">Pick one or more interventions, then choose who gets them by Site, Department and/or specific employees (included if they match ANY selection). Optionally set a complete-by date — it shows as the due date and the person reads "Not yet started" until done. These are individual additions and require a reason.</p>';
  var intOpts=interventions.filter(function(i){return i.active!==false;}).map(function(i){return {v:i.code,l:i.code+' — '+(i.name||'')};});
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><span style="font-weight:700;font-size:.82rem">Interventions:</span>'+msHtml('Choose', intOpts, 'iaInts')+'</div>';
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><span style="font-weight:700;font-size:.82rem">Assign to:</span>'+msHtml('Sites', distinctVals(emps,'site'),'iaSites')+msHtml('Departments', distinctVals(emps,'dept'),'iaDepts')+msHtml('Specific employees', emps.map(function(e){return {v:e.id,l:e.id+' — '+e.name};}),'iaEmps')+'</div>';
  h+='<div class="fg" style="max-width:260px"><label>Complete by (optional)</label><input type="date" id="ia-due"></div>';
  var targets=iaTargets();
  h+='<p style="font-size:.88rem;margin:6px 0"><b>'+targets.length+'</b> employee(s) match · <b>'+iaInts.length+'</b> intervention(s) selected</p>';
  h+='<button class="btn btn-p" style="width:auto" onclick="doIAssign()">Assign now</button>';
  h+='</div></div>';
  if(targets.length){
    h+='<div class="card"><div class="ch"><h3>Will be assigned to ('+targets.length+')</h3></div><div class="tw"><table><thead><tr><th>Emp#</th><th>Name</th><th>Site</th><th>Dept</th></tr></thead><tbody>';
    targets.slice(0,300).forEach(function(e){ h+='<tr><td style="font-weight:600;color:#FBB227">'+e.id+'</td><td>'+e.name+'</td><td style="font-size:.8rem">'+e.site+'</td><td style="font-size:.8rem">'+(e.dept||'-')+'</td></tr>'; });
    if(targets.length>300)h+='<tr><td colspan="4" style="text-align:center;color:#6B7280">Showing first 300 of '+targets.length+'</td></tr>';
    h+='</tbody></table></div></div>';
  }
  return h+'</div>';
}
function doIAssign(){
  if(!iaInts.length){ alert('Choose at least one intervention'); return; }
  var targets=iaTargets();
  if(!targets.length){ alert('Choose at least one site, department or employee'); return; }
  var due=document.getElementById('ia-due')?document.getElementById('ia-due').value:'';
  var dueISO=due?new Date(due).toISOString():null;
  var reason=prompt('Reason for assigning this training to '+targets.length+' people (REQUIRED — no note, no save):');
  if(reason===null) return; reason=(reason||'').trim();
  if(!reason){ alert('A reason is required. Nothing was assigned.'); return; }
  var added=0;
  targets.forEach(function(e){ iaInts.forEach(function(code){
    xassigns.filter(function(a){return a.eid===e.id&&a.code===code&&a.type==='remove'&&a.active!==false;}).forEach(function(a){a.active=false;});
    if(!xassigns.some(function(a){return a.eid===e.id&&a.code===code&&a.type==='add'&&a.active!==false;})){
      xassigns.push({id:gid(),eid:e.id,code:code,type:'add',active:true,dt:now(),by:(user&&user.name)||'',reason:reason,dueBy:dueISO}); added++;
    }
  });});
  logAudit('BULK ASSIGN', added+' assignment(s) to '+targets.length+' people: '+iaInts.join(', '), reason+(dueISO?' · due '+fd(dueISO):''));
  saveTNA().then(function(){ alert(added+' assignment(s) created across '+targets.length+' people.'+(dueISO?'\nComplete-by: '+fd(dueISO):'')); iaInts=[];iaSites=[];iaDepts=[];iaEmps=[]; render(); });
}

// =====================  PROGRAMME + CATEGORY TAXONOMY  =====================
function _byOrder(a,b){ return (a.order||0)-(b.order||0); }
function defaultProgList(){ return [
 {id:gid(),name:'Policy',code:'POL',desc:'Company policies — the highest-level rules everyone follows.',active:true,order:1},
 {id:gid(),name:'MCOP',code:'MCOP',desc:'Mandatory Codes of Practice issued under the MHSA.',active:true,order:2},
 {id:gid(),name:'Company Procedure',code:'CP',desc:'Company procedures that give effect to policies and codes.',active:true,order:3},
 {id:gid(),name:'SOP',code:'SOP',desc:'Safe/standard operating procedures for specific tasks.',active:true,order:4},
 {id:gid(),name:'Additional Training',code:'ADD',desc:'Other required training not covered above.',active:true,order:5},
 {id:gid(),name:'Skills Training',code:'SKL',desc:'Competency and skills development.',active:true,order:6}
]; }
function defaultCatList(){ return [
 {id:gid(),name:'Environmental',code:'ENV',desc:'Water, air, dust, waste, heritage.',active:true,order:1},
 {id:gid(),name:'Trackless Mobile Machinery',code:'TMM',desc:'Mobile machines, traffic, pedestrian safety.',active:true,order:2},
 {id:gid(),name:'Explosives & Blasting',code:'EXP',desc:'Explosives handling and blasting.',active:true,order:3},
 {id:gid(),name:'Occupational Health',code:'OH',desc:'Health, hygiene, fitness for work.',active:true,order:4},
 {id:gid(),name:'Emergency Preparedness',code:'EMG',desc:'Emergency response, evacuation, first aid.',active:true,order:5},
 {id:gid(),name:'HIRA / Risk',code:'RISK',desc:'Hazard identification and risk assessment.',active:true,order:6},
 {id:gid(),name:'Security',code:'SEC',desc:'Access control, protection of people and assets.',active:true,order:7},
 {id:gid(),name:'Engineering',code:'ENG',desc:'Mechanical, electrical, isolation, maintenance.',active:true,order:8},
 {id:gid(),name:'SHE Representatives',code:'SHEREP',desc:'SHE reps and committee duties.',active:true,order:9},
 {id:gid(),name:'Contractor Management',code:'CON',desc:'Contractors and service providers.',active:true,order:10},
 {id:gid(),name:'Leadership',code:'LEAD',desc:'Supervision, leadership and consequence management.',active:true,order:11},
 {id:gid(),name:'Legal & Statutory',code:'LEG',desc:'Legal appointments and statutory requirements.',active:true,order:12},
 {id:gid(),name:'HR & Wellbeing',code:'HR',desc:'HR policies, wellness, GBVF.',active:true,order:13},
 {id:gid(),name:'General',code:'GEN',desc:'General awareness and induction-type content.',active:true,order:14}
]; }
function catNames(){ var s=[]; catList.filter(function(c){return c.active!==false;}).slice().sort(_byOrder).forEach(function(c){ if(s.indexOf(c.name)<0)s.push(c.name); }); interventions.forEach(function(it){ if(it.category&&s.indexOf(it.category)<0)s.push(it.category); }); if(typeof sops!=='undefined')sops.forEach(function(sp){ if(sp.cat&&s.indexOf(sp.cat)<0)s.push(sp.cat); }); return s; }

function progSelect(id,cur){ var h='<select id="'+id+'"><option value="">— choose —</option>'; programmes().forEach(function(p){ h+='<option'+(cur===p?' selected':'')+'>'+p+'</option>'; }); return h+'</select>'; }
function catSelect(id,cur){ var h='<select id="'+id+'"><option value="">— choose —</option>'; catNames().forEach(function(c){ h+='<option'+(cur===c?' selected':'')+'>'+c+'</option>'; }); return h+'</select>'; }

// ---------- admin tab: Programmes & Categories ----------
function renderTax(){
  var h='<div class="topbar"><h1>Programmes &amp; Categories</h1></div><div class="pc">';
  h+='<div class="card"><div class="cb"><b>Your training taxonomy.</b><p style="color:#6B7280;font-size:.85rem;margin-top:4px">Two managed lists used across the whole system. <b>Programme</b> is the document type in order of authority (Policy, MCOP, Company Procedure, SOP, then training). <b>Category</b> is the subject area (Environmental, TMM, Explosives, and so on). Every intervention and every training item is tagged with one of each, so people can filter and find things fast.</p></div></div>';
  h+=renderTaxSection('prog','Programmes','Programme',progList);
  h+=renderTaxSection('cat','Categories','Category',catList);
  return h+'</div>';
}
function renderTaxSection(kind,title,noun,list){
  var editId=(kind==='prog')?taxEditP:taxEditC;
  var items=list.slice().sort(_byOrder);
  var h='<div class="card"><div class="ch"><h3>'+title+'</h3></div><div class="cb">';
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px">';
  h+='<div style="flex:2;min-width:180px"><label style="font-size:.76rem;font-weight:600">Name</label><input id="tx-'+kind+'-name" placeholder="'+noun+' name" style="width:100%;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px"></div>';
  h+='<div style="flex:1;min-width:90px"><label style="font-size:.76rem;font-weight:600">Code</label><input id="tx-'+kind+'-code" placeholder="Short" style="width:100%;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px"></div>';
  h+='<div style="flex:3;min-width:200px"><label style="font-size:.76rem;font-weight:600">Description</label><input id="tx-'+kind+'-desc" placeholder="Optional" style="width:100%;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px"></div>';
  h+='<button class="btn btn-p" style="width:auto" onclick="taxAdd(\''+kind+'\')">+ Add</button></div>';
  h+='<div class="tw"><table><thead><tr><th style="width:90px">Order</th><th>Name</th><th>Code</th><th>Description</th><th>Status</th><th>Manage</th></tr></thead><tbody>';
  if(!items.length)h+='<tr><td colspan="6" style="text-align:center;color:#6B7280;padding:18px">None yet. Add your first above.</td></tr>';
  items.forEach(function(o){
    if(editId===o.id){
      h+='<tr><td colspan="6" style="background:#fff8ec"><div style="padding:6px 2px;display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">';
      h+='<div style="flex:2;min-width:160px"><label style="font-size:.72rem;font-weight:600">Name</label><input id="txe-'+kind+'-name" value="'+(o.name||'').replace(/"/g,'&quot;')+'" style="width:100%;padding:8px 10px;border:2px solid #e2e5e9;border-radius:8px"></div>';
      h+='<div style="flex:1;min-width:80px"><label style="font-size:.72rem;font-weight:600">Code</label><input id="txe-'+kind+'-code" value="'+(o.code||'').replace(/"/g,'&quot;')+'" style="width:100%;padding:8px 10px;border:2px solid #e2e5e9;border-radius:8px"></div>';
      h+='<div style="flex:3;min-width:200px"><label style="font-size:.72rem;font-weight:600">Description</label><input id="txe-'+kind+'-desc" value="'+(o.desc||'').replace(/"/g,'&quot;')+'" style="width:100%;padding:8px 10px;border:2px solid #e2e5e9;border-radius:8px"></div>';
      h+='<div style="display:flex;gap:8px"><button class="btn btn-p btn-sm" style="width:auto" onclick="taxSaveEdit(\''+kind+'\',\''+o.id+'\')">Save</button><button class="btn btn-o btn-sm" style="width:auto" onclick="'+(kind==='prog'?'taxEditP':'taxEditC')+'=null;render()">Cancel</button></div>';
      h+='</div></td></tr>';
    }else{
      h+='<tr'+(o.active===false?' style="opacity:.55"':'')+'><td style="white-space:nowrap"><button class="btn btn-o btn-sm" onclick="taxMove(\''+kind+'\',\''+o.id+'\',-1)">↑</button> <button class="btn btn-o btn-sm" onclick="taxMove(\''+kind+'\',\''+o.id+'\',1)">↓</button></td>';
      h+='<td style="font-weight:600">'+o.name+'</td><td><span class="b b-gy">'+(o.code||'-')+'</span></td><td style="font-size:.82rem;color:#4b5563">'+(o.desc||'')+'</td>';
      h+='<td>'+(o.active!==false?bg('Active','green'):bg('Off','gray'))+'</td>';
      h+='<td style="white-space:nowrap"><button class="btn btn-o btn-sm" onclick="'+(kind==='prog'?'taxEditP':'taxEditC')+'=\''+o.id+'\';render()">✎ Edit</button> <button class="btn btn-o btn-sm" onclick="taxToggle(\''+kind+'\',\''+o.id+'\')">'+(o.active!==false?'Turn off':'Turn on')+'</button> <button class="btn btn-d btn-sm" onclick="taxDel(\''+kind+'\',\''+o.id+'\')">Delete</button></td></tr>';
    }
  });
  return h+'</tbody></table></div></div></div>';
}
function _taxList(kind){ return kind==='prog'?progList:catList; }
function taxAdd(kind){ var n=document.getElementById('tx-'+kind+'-name').value.trim(); if(!n){alert('Enter a name.');return;} var list=_taxList(kind); var mo=list.reduce(function(m,o){return Math.max(m,o.order||0);},0); list.push({id:gid(),name:n,code:document.getElementById('tx-'+kind+'-code').value.trim(),desc:document.getElementById('tx-'+kind+'-desc').value.trim(),active:true,order:mo+1}); saveTNA().then(function(){render();}); }
function taxSaveEdit(kind,id){ var o=_taxList(kind).find(function(x){return x.id===id;}); if(!o)return; o.name=document.getElementById('txe-'+kind+'-name').value.trim()||o.name; o.code=document.getElementById('txe-'+kind+'-code').value.trim(); o.desc=document.getElementById('txe-'+kind+'-desc').value.trim(); if(kind==='prog')taxEditP=null; else taxEditC=null; saveTNA().then(function(){render();}); }
function taxToggle(kind,id){ var o=_taxList(kind).find(function(x){return x.id===id;}); if(!o)return; o.active=(o.active===false); saveTNA().then(function(){render();}); }
function taxDel(kind,id){ if(!confirm('Delete this '+(kind==='prog'?'programme':'category')+'? Items already tagged with it keep the text; it just stops appearing in the dropdowns.'))return; if(kind==='prog')progList=progList.filter(function(x){return x.id!==id;}); else catList=catList.filter(function(x){return x.id!==id;}); saveTNA().then(function(){render();}); }
function taxMove(kind,id,dir){ var items=_taxList(kind).slice().sort(_byOrder); var i=items.findIndex(function(x){return x.id===id;}); var j=i+dir; if(j<0||j>=items.length)return; var a=items[i],b=items[j]; var ao=(a.order||0),bo=(b.order||0); a.order=bo; b.order=ao; saveTNA().then(function(){render();}); }
