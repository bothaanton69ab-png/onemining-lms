// === SUPABASE DATA LAYER ===
function gid(){return Math.random().toString(36).substr(2,9)}
function now(){return new Date().toISOString()}
function fd(d){if(!d)return'-';return new Date(d).toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'})}
function bg(t,c){var m={gold:'b-gd',green:'b-gn',red:'b-rd',blue:'b-bl',gray:'b-gy'};return'<span class="b '+(m[c]||'b-gy')+'">'+t+'</span>'}

// Data variables (loaded from Supabase on init)
var sites=[];
var emps=[];
var res=[];
var prog={};
var notifs=[];
var assigns=[];
var unlockLog=[];
var sops=[];

var user=null,page='login',activeSop=null,assessAns={},assessStarted=false,assessDone=false,assessResult=null;
var qmSopId=null,qmMode='add',qmQt='',qmOpts=['','','',''],qmCor=0,qmBulk='',qmEi=null;
var adminSiteF='all',adminSopF='all',adminEmpF='';
var adminPass='admin';
var editSopId=null;

// Load one key from Supabase
async function cloudLoad(key, fallback) {
    try {
        var { data, error } = await sb.from('app_data').select('value').eq('key', key).single();
        if (error || !data) return fallback;
        return data.value;
    } catch(e) { return fallback; }
}

// Save one key to Supabase
async function cloudSave(key, value) {
    try {
        await sb.from('app_data').upsert({ key: key, value: value, updated_at: new Date().toISOString() });
    } catch(e) { console.error('Save failed for ' + key, e); }
}

// Save all data (called after every change)
function save() {
    cloudSave('res', res);
    cloudSave('prog', prog);
    cloudSave('notifs', notifs);
    cloudSave('sops', sops);
    cloudSave('sites', sites);
    cloudSave('emps', emps);
    cloudSave('assigns', assigns);
    cloudSave('unlock', unlockLog);
}

// Initialize - load all data from Supabase
async function init() {
    try {
        sites = await cloudLoad('sites', ['Thutse Mining','Malekaskraal Vanadium','Head Office']);
        emps = await cloudLoad('emps', []);
        res = await cloudLoad('res', []);
        prog = await cloudLoad('prog', {});
        notifs = await cloudLoad('notifs', []);
        assigns = await cloudLoad('assigns', []);
        unlockLog = await cloudLoad('unlock', []);
        sops = await cloudLoad('sops', []);
        adminPass = await cloudLoad('admin_password', 'admin');
        render();
    } catch(e) {
        console.error('Failed to load data:', e);
        document.getElementById('app').innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Arial;background:#243034;color:#fff"><h1 style="font-size:1.6rem;font-weight:800;margin-bottom:8px">One <span style="color:#FBB227">Mining</span></h1><p style="color:#EF4444">Failed to connect to database. Please check your internet connection and try again.</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:#FBB227;border:none;border-radius:8px;font-weight:600;cursor:pointer">Retry</button></div>';
    }
}

function getAtt(eid,sc){return res.filter(function(r){return r.eid===eid&&r.sc===sc})}
function hasPassed(eid,sc){return res.some(function(r){return r.eid===eid&&r.sc===sc&&r.pass})}
function isLocked(eid,sc){var a=getAtt(eid,sc);return a.length>=3&&!a.some(function(r){return r.pass})}
function getEmpAssigns(eid){return assigns.filter(function(a){return a.eid===eid}).sort(function(a,b){return a.order-b.order})}
function getStatus(eid,sc){if(hasPassed(eid,sc))return'passed';if(isLocked(eid,sc))return'locked';var a=getAtt(eid,sc);if(a.length>0)return'progress';var p=prog[eid+'_'+sc];if(p&&(p.sr||p.vw))return'progress';return'notstarted'}
function canAccess(eid,sc){var ea=getEmpAssigns(eid);if(!ea.length)return true;var idx=ea.findIndex(function(a){return a.sc===sc});if(idx<=0)return true;var prev=ea[idx-1];return hasPassed(eid,prev.sc)}
// === RENDER ===
function render(){
var el=document.getElementById('app');
if(!user){el.innerHTML=renderLogin();return}
var isA=user.role==='admin';
var sb='<aside class="sb"><div class="sb-brand"><h2>One <span class="gold">Mining</span></h2><p>Training LMS</p></div><div class="sb-nav">';
sb+='<div class="ni'+(page==='dashboard'&&!activeSop?' a':'')+'" onclick="goPage(\'dashboard\')">📊 Dashboard</div>';
sb+='<div class="ni'+(page==='library'||activeSop?' a':'')+'" onclick="goPage(\'library\')">📚 My Training</div>';
if(!isA)sb+='<div class="ni'+(page==='myres'?' a':'')+'" onclick="goPage(\'myres\')">📋 My Results</div>';
if(isA){
sb+='<div class="ni'+(page==='msops'?' a':'')+'" onclick="goPage(\'msops\')">⚙️ Manage SOPs</div>';
sb+='<div class="ni'+(page==='massign'?' a':'')+'" onclick="goPage(\'massign\')">🔗 Assign Training</div>';
sb+='<div class="ni'+(page==='memps'?' a':'')+'" onclick="goPage(\'memps\')">👤 Manage Employees</div>';
sb+='<div class="ni'+(page==='emprec'?' a':'')+'" onclick="goPage(\'emprec\')">👥 Employee Records</div>';
sb+='<div class="ni'+(page==='reports'?' a':'')+'" onclick="goPage(\'reports\')">📈 Reports</div>';
sb+='<div class="ni'+(page==='anot'?' a':'')+'" onclick="goPage(\'anot\')">🔔 Notifications'+(notifs.length?' '+bg(notifs.length,'gold'):'')+' </div>';
sb+='<div class="ni'+(page==='smgmt'?' a':'')+'" onclick="goPage(\'smgmt\')">🏭 Manage Sites</div>';}
sb+='</div><div class="sb-u"><div class="nm">'+user.name+'</div><div class="rl">'+(isA?'Administrator':user.id+' · '+user.site)+'</div><div class="ni" style="margin-top:8px;padding:8px 0" onclick="doLogout()">← Sign Out</div></div></aside>';
var mc='<main class="mc">';
if(activeSop)mc+=renderSopView();
else if(page==='dashboard')mc+=isA?renderAdminDash():renderEmpDash();
else if(page==='library')mc+=renderLib();
else if(page==='myres')mc+=renderMyRes();
else if(page==='msops'&&isA)mc+=renderMSops();
else if(page==='massign'&&isA)mc+=renderAssign();
else if(page==='memps'&&isA)mc+=renderMgmtEmp();
else if(page==='emprec'&&isA)mc+=renderEmpRec();
else if(page==='reports'&&isA)mc+=renderReports();
else if(page==='anot'&&isA)mc+=renderANot();
else if(page==='smgmt'&&isA)mc+=renderSMgmt();
mc+='</main>';
el.innerHTML='<div class="app">'+sb+mc+'</div>';
}

function renderLogin(){
return'<div class="login-bg"><div class="login-card"><div class="login-logo"><h1>One <span class="gold">Mining</span></h1><p>Training Management System</p></div>'+
'<div style="display:flex;margin-bottom:22px"><div class="tab a" style="flex:1;text-align:center" onclick="this.className=\'tab a\';this.nextSibling.className=\'tab\';document.getElementById(\'emp-fields\').style.display=\'block\';document.getElementById(\'login-lbl\').textContent=\'PIN\';document.getElementById(\'login-mode\').value=\'emp\'">Employee</div>'+
'<div class="tab" style="flex:1;text-align:center" onclick="this.className=\'tab a\';this.previousSibling.className=\'tab\';document.getElementById(\'emp-fields\').style.display=\'none\';document.getElementById(\'login-lbl\').textContent=\'Password\';document.getElementById(\'login-mode\').value=\'admin\'">Admin</div></div>'+
'<input type="hidden" id="login-mode" value="emp"><div id="emp-fields" class="fg"><label>Employee Number</label><input id="login-eid" placeholder="e.g. OM001"></div>'+
'<div class="fg"><label id="login-lbl">PIN</label><input type="password" id="login-pin" onkeydown="if(event.key===\'Enter\')doLogin()"></div>'+
'<div id="login-err" style="color:#EF4444;font-size:.82rem;margin-bottom:12px"></div>'+
'<button class="btn btn-p" onclick="doLogin()">Sign In</button>'+
'<p style="font-size:.74rem;color:#6B7280;margin-top:14px;text-align:center">Employee: Use your ID and PIN</p></div></div>';
}

// === EMPLOYEE DASHBOARD ===
function renderEmpDash(){
var ea=getEmpAssigns(user.id);
var completed=0,outstanding=0;
ea.forEach(function(a){if(hasPassed(user.id,a.sc))completed++;else outstanding++});
var pct=ea.length?Math.round(completed/ea.length*100):0;
var initials=user.name.split(' ').map(function(n){return n[0]}).join('');
var h='<div class="topbar"><h1>My Dashboard</h1></div><div class="pc">';
// Profile
h+='<div class="card"><div class="cb"><div class="profile-card"><div class="profile-avatar">'+initials+'</div><div class="profile-info">';
h+='<h2 style="font-size:1.2rem;font-weight:700;margin-bottom:6px">'+user.name+'</h2>';
h+='<p><b>Employee #:</b> '+user.id+'</p><p><b>ID Number:</b> '+user.idn+'</p>';
h+='<p><b>Gender:</b> '+user.gender+'</p><p><b>Department:</b> '+user.dept+'</p><p><b>Site:</b> '+user.site+'</p>';
h+='</div></div></div></div>';
// Stats
h+='<div class="sg"><div class="sc gd"><div class="l">Assigned Courses</div><div class="v">'+ea.length+'</div></div>';
h+='<div class="sc gn"><div class="l">Completed</div><div class="v">'+completed+'</div></div>';
h+='<div class="sc rd"><div class="l">Outstanding</div><div class="v">'+outstanding+'</div></div>';
h+='<div class="sc bl"><div class="l">Progress</div><div class="v">'+pct+'%</div><div class="pb" style="margin-top:6px"><div class="pf '+(pct>=80?'gn':'gd')+'" style="width:'+pct+'%"></div></div></div></div>';
// Training table
h+='<div class="card"><div class="ch"><h3>My Assigned Training</h3></div><div class="cb">';
if(!ea.length)h+='<p style="text-align:center;color:#6B7280;padding:20px">No training assigned yet. Contact your administrator.</p>';
else{h+='<div class="tw"><table><thead><tr><th>#</th><th>SOP Code</th><th>Title</th><th>Status</th><th>Score</th><th>Attempts</th><th>Date</th><th>Action</th></tr></thead><tbody>';
ea.forEach(function(a,i){
var sop=sops.find(function(s){return s.code===a.sc});
var st=getStatus(user.id,a.sc);
var att=getAtt(user.id,a.sc);
var passR=att.find(function(r){return r.pass});
var lastR=att.length?att[att.length-1]:null;
var ca=canAccess(user.id,a.sc);
var stBg=st==='passed'?bg('Completed','green'):st==='locked'?bg('Locked','red'):st==='progress'?bg('In Progress','gold'):!ca?bg('🔒 Locked','gray'):bg('Not Started','gray');
var scoreStr=passR?passR.pct+'%':lastR?lastR.pct+'%':'-';
var dateStr=passR?fd(passR.dt):'-';
var actionStr='';
if(st==='passed')actionStr='<button class="btn btn-gn btn-sm" onclick="dlProofEmp(\''+user.id+'\',\''+a.sc+'\')">📥 Proof</button>';
else if(st==='locked')actionStr='<span style="font-size:.78rem;color:#EF4444">Contact admin</span>';
else if(!ca)actionStr='<span style="font-size:.78rem;color:#6B7280">Complete previous first</span>';
else actionStr='<button class="btn btn-p btn-sm" onclick="openSop(\''+sop.id+'\')">Start</button>';
h+='<tr><td>'+(i+1)+'</td><td style="font-weight:700;color:#FBB227">'+a.sc+'</td><td>'+(sop?sop.title:'')+'</td><td>'+stBg+'</td><td style="font-weight:700">'+scoreStr+'</td><td>'+att.length+'/3</td><td>'+dateStr+'</td><td>'+actionStr+'</td></tr>';
});h+='</tbody></table></div>';}
h+='</div></div></div>';return h;
}

// === ADMIN DASHBOARD ===
function renderAdminDash(){
var h='<div class="topbar"><h1>Admin Dashboard</h1><div style="display:flex;gap:8px"><button class="btn btn-p btn-sm" onclick="dlReport(\'full\')">📥 Full Compliance Report</button></div></div><div class="pc">';
// Filters
h+='<div class="sf"><select id="ad-site" onchange="adminSiteF=this.value;render()"><option value="all">All Sites</option>';
sites.forEach(function(s){h+='<option'+(adminSiteF===s?' selected':'')+'>'+s+'</option>'});
h+='</select><select id="ad-sop" onchange="adminSopF=this.value;render()"><option value="all">All Courses</option>';
sops.forEach(function(s){h+='<option value="'+s.code+'"'+(adminSopF===s.code?' selected':'')+'>'+s.code+' — '+s.title+'</option>'});
h+='</select><input id="ad-emp" placeholder="Search employee..." value="'+adminEmpF+'" oninput="adminEmpF=this.value;render()"></div>';
// Filter employees
var fEmps=emps.filter(function(e){
var ms=adminSiteF==='all'||e.site===adminSiteF;
var me=!adminEmpF||e.name.toLowerCase().indexOf(adminEmpF.toLowerCase())>=0||e.id.toLowerCase().indexOf(adminEmpF.toLowerCase())>=0;
return ms&&me});
// Stats
var totalAssigns=0,totalCompleted=0,totalLocked=0;
fEmps.forEach(function(e){var ea=getEmpAssigns(e.id);ea.forEach(function(a){
totalAssigns++;if(hasPassed(e.id,a.sc))totalCompleted++;if(isLocked(e.id,a.sc))totalLocked++;})});
var compRate=totalAssigns?Math.round(totalCompleted/totalAssigns*100):0;
h+='<div class="sg"><div class="sc gd"><div class="l">Employees</div><div class="v">'+fEmps.length+'</div></div>';
h+='<div class="sc bl"><div class="l">Assigned Courses</div><div class="v">'+totalAssigns+'</div></div>';
h+='<div class="sc gn"><div class="l">Completed</div><div class="v">'+totalCompleted+'</div></div>';
h+='<div class="sc rd"><div class="l">Locked / Failed</div><div class="v">'+totalLocked+'</div></div></div>';
h+='<div class="sg"><div class="sc bl"><div class="l">Completion Rate</div><div class="v">'+compRate+'%</div><div class="pb" style="margin-top:6px"><div class="pf '+(compRate>=80?'gn':'gd')+'" style="width:'+compRate+'%"></div></div></div></div>';
// Completion matrix
h+='<div class="card"><div class="ch"><h3>Training Completion Matrix</h3></div><div class="cb"><div class="tw"><table><thead><tr><th>Employee</th><th>Site</th>';
var fSops=adminSopF==='all'?sops:sops.filter(function(s){return s.code===adminSopF});
fSops.forEach(function(s){h+='<th style="text-align:center;font-size:.65rem;max-width:80px;white-space:normal">'+s.code+'</th>'});
h+='<th>Actions</th></tr></thead><tbody>';
fEmps.forEach(function(e){
h+='<tr><td style="font-weight:600">'+e.name+'<br><span style="font-size:.72rem;color:#6B7280">'+e.id+'</span></td><td style="font-size:.78rem">'+e.site+'</td>';
fSops.forEach(function(s){
var ea=getEmpAssigns(e.id);var assigned=ea.some(function(a){return a.sc===s.code});
if(!assigned){h+='<td style="text-align:center"><span class="cm-cell" style="background:#e5e7eb;color:#9ca3af">—</span></td>';return}
var st=getStatus(e.id,s.code);
var col=st==='passed'?'#22C55E':st==='locked'?'#EF4444':st==='progress'?'#FBB227':'#9ca3af';
var lbl=st==='passed'?'✓':st==='locked'?'✕':st==='progress'?'…':'○';
h+='<td style="text-align:center"><span class="cm-cell" style="background:'+col+'">'+lbl+'</span></td>';
});
h+='<td><button class="btn btn-o btn-sm" onclick="dlReport(\'emp\',\''+e.id+'\')">📥</button>';
// unlock button for locked
var lockedSops=fSops.filter(function(s){return isLocked(e.id,s.code)});
if(lockedSops.length)h+=' <button class="btn btn-gn btn-sm" onclick="showUnlock(\''+e.id+'\')">🔓 Unlock</button>';
h+='</td></tr>';
});
h+='</tbody></table></div></div></div>';
h+='</div>';return h;
}

// === EMPLOYEE LIBRARY ===
function renderLib(){
var isA=user.role==='admin';
var h='<div class="topbar"><h1>'+(isA?'SOP Library':'My Training')+'</h1></div><div class="pc">';
var ea=isA?null:getEmpAssigns(user.id);
var showSops=isA?sops:sops.filter(function(s){return ea.some(function(a){return a.sc===s.code})});
if(!isA&&!showSops.length)return h+'<div class="card"><div class="cb"><p style="text-align:center;color:#6B7280;padding:24px">No training assigned yet. Contact your administrator.</p></div></div></div>';
h+='<div class="spg">';
showSops.forEach(function(s){
var ps=!isA&&hasPassed(user.id,s.code);var lk=!isA&&isLocked(user.id,s.code);
var att=!isA?getAtt(user.id,s.code):[];
var ca=isA||canAccess(user.id,s.code);
var locked=!isA&&!ca;
h+='<div class="spc'+(locked?' locked':'')+'" onclick="'+(locked?'alert(\'Complete the previous training first\')':'openSop(\''+s.id+'\')')+'"><div class="cd">'+(locked?'🔒 ':'')+s.code+' · '+s.rev+'</div><h4>'+s.title+'</h4><p>'+s.desc+'</p>';
h+='<div class="mt">'+bg(s.cat,'blue')+bg(s.qs.length+' Qs','gray')+bg(s.site,'gray');
if(!isA){if(ps)h+=bg('✓ Completed','green');else if(lk)h+=bg('Locked','red');else if(locked)h+=bg('🔒 Complete Previous','gray');else if(att.length)h+=bg(att.length+'/3','gold');}
h+='</div></div>';
});
h+='</div></div>';return h;
}
// === SOP VIEWER ===
function renderSopView(){
var s=activeSop,isA=user.role==='admin';
var pr=!isA?(prog[user.id+'_'+s.code]||{}):{sr:true,vw:true,ia:true};
var ps=!isA&&hasPassed(user.id,s.code),lk=!isA&&isLocked(user.id,s.code),att=!isA?getAtt(user.id,s.code):[];
var tabV=document.getElementById('sop-tab-val');var tab=tabV?tabV.value:'sop';
var h='<div class="topbar"><div style="display:flex;align-items:center;gap:14px"><button class="btn btn-o btn-sm" onclick="closeSop()">← Back</button><div><h1>'+s.title+'</h1><span style="font-size:.76rem;color:#6B7280">'+s.code+' · '+s.rev+' · '+s.site+'</span></div></div></div>';
h+='<div class="pc"><input type="hidden" id="sop-tab-val" value="'+tab+'">';
if(!isA){
var numSteps=s.interactiveNA?3:4;
h+='<div class="sg">';
h+='<div class="sc"><div class="l">1. Read SOP</div><div style="margin-top:6px">'+(pr.sr?bg('Done','green'):bg('Pending','gray'))+'</div></div>';
h+='<div class="sc"><div class="l">2. Watch Video</div><div style="margin-top:6px">'+(pr.vw?bg('Done','green'):bg('Pending','gray'))+'</div></div>';
if(!s.interactiveNA){h+='<div class="sc"><div class="l">3. Interactive Training</div><div style="margin-top:6px">'+(pr.ia?bg('Done','green'):bg('Pending','gray'))+'</div></div>';
h+='<div class="sc"><div class="l">4. Assessment</div><div style="margin-top:6px">'+(ps?bg('Passed','green'):lk?bg('Locked','red'):bg(att.length+'/3','gold'))+'</div></div>';}
else{h+='<div class="sc"><div class="l">3. Assessment</div><div style="margin-top:6px">'+(ps?bg('Passed','green'):lk?bg('Locked','red'):bg(att.length+'/3','gold'))+'</div></div>';}}
h+='</div>';}
h+='<div class="tabs"><div class="tab'+(tab==='sop'?' a':'')+'" onclick="setSopTab(\'sop\')">SOP Document</div>';
h+='<div class="tab'+(tab==='vid'?' a':'')+'" onclick="setSopTab(\'vid\')">Video</div>';
if(!isA&&!s.interactiveNA){h+='<div class="tab'+(tab==='interactive'?' a':'')+'" onclick="setSopTab(\'interactive\')">Interactive</div>';}
h+='<div class="tab'+(tab==='test'?' a':'')+'" onclick="setSopTab(\'test\')">Assessment ('+s.qs.length+')</div></div>';
if(tab==='sop'){h+='<div style="max-width:860px;margin:0 auto">';
if(s.docUrl)h+='<iframe src="'+s.docUrl+'" style="width:100%;height:80vh;border:1px solid #e5e7eb;border-radius:10px"></iframe>';
else h+='<div class="card"><div class="cb">'+s.html+'</div></div>';
if(!isA&&!pr.sr)h+='<div style="text-align:center;margin-top:16px"><button class="btn btn-p" style="width:auto;padding:12px 44px" onclick="markRead()">✓ I have read this SOP</button></div>';
if(!isA&&pr.sr)h+='<p style="text-align:center;margin-top:12px;color:#22C55E;font-weight:600">Acknowledged '+fd(pr.srd)+'</p>';
h+='</div>';}
if(tab==='vid'){h+='<div style="max-width:860px;margin:0 auto">';
if(s.vidUrl)h+='<div style="background:#000;border-radius:10px;overflow:hidden;margin-bottom:16px"><video controls style="width:100%;display:block" src="'+s.vidUrl+'"></video></div>';
else h+='<div style="background:#000;border-radius:10px;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;margin-bottom:16px"><p style="color:#fff;text-align:center;font-weight:600">Training Video<br><span style="font-size:.78rem;opacity:.5">'+(isA?'Upload via Manage SOPs':'No video yet')+'</span></p></div>';
if(!isA&&!pr.vw)h+='<div style="text-align:center"><button class="btn btn-p" style="width:auto;padding:12px 44px" onclick="markVid()">✓ I have watched the video</button></div>';
if(!isA&&pr.vw)h+='<p style="text-align:center;color:#22C55E;font-weight:600">Completed '+fd(pr.vwd)+'</p>';
h+='</div>';}
if(!isA&&!s.interactiveNA&&tab==='interactive'){h+='<div style="max-width:860px;margin:0 auto">';
if(s.interactiveUrl)h+='<iframe src="'+s.interactiveUrl+'" style="width:100%;height:80vh;border:1px solid #e5e7eb;border-radius:10px"></iframe>';
else h+='<div class="card"><div class="cb" style="text-align:center;padding:28px;color:#6B7280">No interactive assessment uploaded yet.</div></div>';
if(!pr.ia)h+='<div style="text-align:center;margin-top:16px"><button class="btn btn-p" style="width:auto;padding:12px 44px" onclick="markInteractive()">✓ I have completed the interactive training</button></div>';
if(pr.ia)h+='<p style="text-align:center;margin-top:12px;color:#22C55E;font-weight:600">Completed '+fd(pr.iad)+'</p>';
h+='</div>';}
if(tab==='test')h+=renderAssess(s,isA,pr,ps,lk,att);
h+='</div>';return h;
}

function renderAssess(s,isA,pr,ps,lk,att){
if(isA){var h='<div class="card"><div class="ch"><h3>Answer Memorandum</h3></div><div class="cb"><div class="tw"><table><thead><tr><th>#</th><th>Question</th><th>Answer</th></tr></thead><tbody>';
s.qs.forEach(function(q,i){h+='<tr><td style="font-weight:700">Q'+(i+1)+'</td><td>'+q.t+'</td><td style="font-weight:700;color:#22C55E">'+String.fromCharCode(65+q.c)+') '+q.o[q.c]+'</td></tr>'});
return h+'</tbody></table></div></div></div>';}
if(!s.qs.length)return'<div class="card"><div class="cb" style="text-align:center;padding:28px;color:#6B7280">No assessment yet.</div></div>';
if(ps)return'<div class="card"><div class="cb" style="text-align:center;padding:40px"><div class="ri ps">✓</div><h2 style="color:#22C55E">Passed</h2><p style="color:#6B7280;margin-top:8px">Training module completed.</p><button class="btn btn-p" style="width:auto;margin-top:16px" onclick="dlProofEmp(\''+user.id+'\',\''+s.code+'\')">📥 Download Proof</button></div></div>';
if(lk)return'<div class="card"><div class="cb" style="text-align:center;padding:40px"><div class="ri fl">✕</div><h2 style="color:#EF4444">Locked</h2><p style="color:#6B7280;margin-top:8px">3 attempts used. Contact your administrator for assistance.</p></div></div>';
if(!pr.sr||!pr.vw||(s.interactiveNA===false&&!pr.ia)){
var need=[];if(!pr.sr)need.push('read the SOP');if(!pr.vw)need.push('watch the video');if(s.interactiveNA===false&&!pr.ia)need.push('complete the interactive training');
return'<div class="card"><div class="cb" style="text-align:center;padding:28px;color:#6B7280">You must <b>'+need.join('</b> and <b>')+'</b> before taking the assessment.</div></div>';}
if(assessDone&&assessResult){var r=assessResult;
var h='<div class="card"><div class="cb" style="text-align:center;padding:40px"><div class="ri '+(r.pass?'ps':'fl')+'">'+(r.pass?'✓':'✕')+'</div>';
h+='<h2 style="color:'+(r.pass?'#22C55E':'#EF4444')+'">'+(r.pass?'PASSED':'FAILED')+'</h2>';
h+='<p style="font-size:1.6rem;font-weight:700;margin:10px 0">'+r.pct+'%</p>';
h+='<p style="color:#6B7280">'+r.score+'/'+r.total+' · Attempt '+r.att+'/3 · Pass 80%</p>';
if(r.pass)h+='<button class="btn btn-p" style="width:auto;margin-top:16px" onclick="dlProof(\''+user.id+'\',\''+activeSop.code+'\','+r.score+','+r.total+','+r.pct+',true,'+r.att+',\''+r.dt+'\')">📥 Download Proof</button>';
if(!r.pass&&r.att<3)h+='<p style="color:#6B7280;margin-top:16px;font-size:.85rem">You must re-read the SOP and re-watch the video before your next attempt.</p><button class="btn btn-p" style="width:auto;margin-top:12px" onclick="resetForRetry()">Re-do Training (Attempt '+(r.att+1)+'/3)</button>';
if(!r.pass&&r.att>=3)h+='<p style="color:#EF4444;font-weight:600;margin-top:14px">All 3 attempts used. Contact your administrator.</p>';
return h+'</div></div>';}
if(!assessStarted)return'<div class="card"><div class="cb" style="text-align:center;padding:40px"><h3>'+s.qs.length+' MCQs · 80% pass · Attempt '+(att.length+1)+'/3</h3><button class="btn btn-p" style="width:auto;margin-top:20px;padding:12px 44px" onclick="startAssess()">Start Assessment</button></div></div>';
var cnt=Object.keys(assessAns).length;
var h='<div style="max-width:780px;margin:0 auto"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><span style="font-weight:600">'+cnt+'/'+s.qs.length+'</span><div class="pb" style="flex:1;margin:0 14px;max-width:280px"><div class="pf gd" style="width:'+(cnt/s.qs.length*100)+'%"></div></div><span style="font-weight:600;color:#FBB227">Attempt '+(att.length+1)+'/3</span></div>';
s.qs.forEach(function(q,qi){
h+='<div class="qc"><div class="qn">Question '+(qi+1)+'/'+s.qs.length+'</div><div class="qt">'+q.t+'</div>';
q.o.forEach(function(o,oi){h+='<div class="op'+(assessAns[q.id]===oi?' sel':'')+'" onclick="pickAns(\''+q.id+'\','+oi+')"><span class="lt">'+String.fromCharCode(65+oi)+'</span><span>'+o+'</span></div>'});
h+='</div>';});
h+='<div style="text-align:center;padding:20px 0"><button class="btn btn-p" style="width:auto;padding:14px 56px" onclick="submitAssess()">Submit Assessment</button></div></div>';
return h;
}

function renderMyRes(){
var my=res.filter(function(r){return r.eid===user.id}).slice().reverse();
var h='<div class="topbar"><h1>My Results</h1><button class="btn btn-p btn-sm" onclick="dlReport(\'emp\',\''+user.id+'\')">📥 Download My Record</button></div><div class="pc">';
if(!my.length)return h+'<div class="card"><div class="cb" style="text-align:center;color:#6B7280;padding:24px">No results.</div></div></div>';
h+='<div class="card"><div class="tw"><table><thead><tr><th>SOP</th><th>Title</th><th>Score</th><th>%</th><th>Result</th><th>Attempt</th><th>Date</th><th>Proof</th></tr></thead><tbody>';
my.forEach(function(r){var s=sops.find(function(x){return x.code===r.sc});h+='<tr><td style="font-weight:600">'+r.sc+'</td><td>'+(s?s.title:'')+'</td><td>'+r.score+'/'+r.total+'</td><td style="font-weight:700">'+r.pct+'%</td><td>'+bg(r.pass?'PASS':'FAIL',r.pass?'green':'red')+'</td><td>'+r.att+'/3</td><td>'+fd(r.dt)+'</td><td>'+(r.pass?'<button class="btn btn-p btn-sm" onclick="dlProof(\''+r.eid+'\',\''+r.sc+'\','+r.score+','+r.total+','+r.pct+',true,'+r.att+',\''+r.dt+'\')">📥</button>':'-')+'</td></tr>'});
return h+'</tbody></table></div></div></div>';
}
// === ASSIGN TRAINING (ADMIN) ===
function renderAssign(){
var h='<div class="topbar"><h1>Assign Training</h1><div style="display:flex;gap:8px"><button class="btn btn-p btn-sm" onclick="toggleBulkAssign()">📄 Bulk</button></div></div><div class="pc">';
h+='<div id="bulk-assign-form" class="card hide"><div class="ch"><h3>Bulk Assign</h3></div><div class="cb"><div style="background:#f3f4f6;padding:14px;border-radius:8px;margin-bottom:16px;font-size:.82rem;font-family:monospace"><b>EmployeeID, SOPCode, SOPCode</b><br>OM001, OM-SOP-001, OM-SOP-002<br>OM002, OM-SOP-001</div>';
h+='<div class="fg"><textarea id="bulk-assign-txt" rows="6" placeholder="Paste data..."></textarea></div>';
h+='<div style="display:flex;gap:10px"><button class="btn btn-p" style="width:auto" onclick="importBulkAssign()">Import</button><button class="btn btn-o" style="width:auto" onclick="toggleBulkAssign()">Cancel</button></div></div></div>';
h+='<div class="card"><div class="ch"><h3>Current Assignments</h3></div><div class="cb"><div class="tw"><table><thead><tr><th>Employee</th><th>ID</th><th>Site</th><th>Assigned SOPs</th><th>Status</th><th>Action</th></tr></thead><tbody>';
emps.forEach(function(emp){var ea=getEmpAssigns(emp.id);h+='<tr><td style="font-weight:600">'+emp.name+'</td><td>'+emp.id+'</td><td>'+emp.site+'</td><td>';
if(!ea.length)h+='<span style="color:#6B7280">None</span>';
else ea.forEach(function(a,i){var sop=sops.find(function(s){return s.code===a.sc});h+=(i?', ':'')+a.sc+'<br><span style="font-size:.7rem;color:#6B7280">'+(sop?sop.title:'')+'</span>'});
h+='</td><td>'+(ea.length?bg(ea.length+' active','blue'):'-')+'</td><td><button class="btn btn-o btn-sm" onclick="editAssign(\''+emp.id+'\')">Edit</button></td></tr>'});
return h+'</tbody></table></div></div></div></div>';
}

function renderMSops(){
var h='<div class="topbar"><h1>Manage SOPs</h1><button class="btn btn-p btn-sm" onclick="toggleAddSop()">+ Add SOP</button></div><div class="pc">';
h+='<div id="add-sop-form" class="card hide"><div class="ch"><h3 id="sop-form-title">New SOP</h3></div><div class="cb"><input type="hidden" id="edit-sop-id" value=""><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">';
h+='<div class="fg"><label>Code</label><input id="nsop-code" placeholder="OM-SOP-XXX-001"></div>';
h+='<div class="fg"><label>Rev</label><input id="nsop-rev" value="Rev 1.0"></div>';
h+='<div class="fg" style="grid-column:span 2"><label>Title</label><input id="nsop-title"></div>';
h+='<div class="fg" style="grid-column:span 2"><label>Description</label><textarea id="nsop-desc"></textarea></div>';
h+='<div class="fg"><label>Category</label><input id="nsop-cat" placeholder="e.g. Safety"></div>';
h+='<div class="fg"><label>Site</label><select id="nsop-site"><option>All Sites</option>';
sites.forEach(function(s){h+='<option>'+s+'</option>'});
h+='</select></div><div class="fg" style="grid-column:span 2"><label><input type="checkbox" id="nsop-ia-na" checked> Interactive Assessment: Not Applicable</label></div></div><div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-p" style="width:auto" onclick="addSop()">Save</button><button class="btn btn-o" style="width:auto" onclick="toggleAddSop()">Cancel</button></div></div></div>';
h+='<div class="card"><div class="tw"><table><thead><tr><th>Code</th><th>Title</th><th>Cat</th><th>Site</th><th>Doc</th><th>Video</th><th>Interactive</th><th>Qs</th><th>Actions</th></tr></thead><tbody>';
sops.forEach(function(s){
h+='<tr><td style="font-weight:700;color:#FBB227">'+s.code+'</td><td>'+s.title+'</td><td>'+s.cat+'</td><td>'+s.site+'</td>';
h+='<td>'+(s.docName?bg(s.docName,'green'):bg('None','gray'))+'</td>';
h+='<td>'+(s.vidName?bg(s.vidName,'green'):bg('None','gray'))+'</td>';
h+='<td>'+(s.interactiveNA?bg('N/A','gray'):s.interactiveName?bg(s.interactiveName,'green'):bg('None','gray'))+'</td>';
h+='<td style="font-weight:700">'+s.qs.length+'</td>';
h+='<td><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="btn btn-p btn-sm" onclick="uploadDoc(\''+s.id+'\')">📄 Doc</button><button class="btn btn-p btn-sm" onclick="uploadVid(\''+s.id+'\')">🎬 Video</button><button class="btn btn-p btn-sm" onclick="uploadInteractive(\''+s.id+'\')">🎯 Interactive</button>'+(s.interactiveNA?'<button class="btn btn-gn btn-sm" onclick="toggleInteractiveNA(\''+s.id+'\')">Enable</button>':'<button class="btn btn-o btn-sm" onclick="toggleInteractiveNA(\''+s.id+'\')">N/A</button>')+'<button class="btn btn-bl btn-sm" onclick="openQEditor(\''+s.id+'\',\'add\')">+ Q</button><button class="btn btn-s btn-sm" onclick="openQEditor(\''+s.id+'\',\'bulk\')">Bulk</button><button class="btn btn-o btn-sm" onclick="editSop(\''+s.id+'\')">Edit</button><button class="btn btn-o btn-sm" onclick="openSop(\''+s.id+'\')">View</button><button class="btn btn-d btn-sm" onclick="delSop(\''+s.id+'\')">Del</button></div></td></tr>'});
h+='</tbody></table></div></div>';
if(qmSopId)h+=renderQEditor();
return h+'</div>';
}

function renderQEditor(){
var sop=sops.find(function(s){return s.id===qmSopId});if(!sop)return'';
var h='<div class="mbg" onclick="if(event.target===this)closeQEditor()"><div class="mdl"><div class="mh"><h2>Questions — '+sop.code+' ('+sop.qs.length+')</h2><button class="btn btn-o btn-sm" onclick="closeQEditor()">Close</button></div><div class="mbd">';
h+='<div class="tabs"><div class="tab'+(qmMode==='add'?' a':'')+'" onclick="setQmMode(\'add\')">Add/Edit</div><div class="tab'+(qmMode==='bulk'?' a':'')+'" onclick="setQmMode(\'bulk\')">Bulk</div><div class="tab'+(qmMode==='list'?' a':'')+'" onclick="setQmMode(\'list\')">All ('+sop.qs.length+')</div></div>';
if(qmMode==='add'){
h+='<div class="fg"><label>Question</label><textarea id="qm-qt" rows="3">'+qmQt+'</textarea></div>';
['A','B','C','D'].forEach(function(l,i){
h+='<div class="fg" style="display:flex;gap:10px;align-items:center"><label style="width:18px;margin:0">'+l+')</label><input id="qm-o'+i+'" value="'+qmOpts[i].replace(/"/g,'&quot;')+'" style="flex:1"><label style="display:flex;align-items:center;gap:4px;cursor:pointer;margin:0;font-size:.8rem"><input type="radio" name="qm-cor" '+(qmCor===i?'checked':'')+' onchange="qmCor='+i+'"> Correct</label></div>'});
if(qmEi!==null)h+='<div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-p" style="width:auto" onclick="updateQ()">Update</button><button class="btn btn-o" style="width:auto" onclick="cancelQEdit()">Cancel</button></div>';
else h+='<button class="btn btn-p" style="width:auto;margin-top:14px" onclick="addQ()">Add Question</button>';}
if(qmMode==='bulk'){
h+='<p style="font-size:.82rem;color:#6B7280;margin-bottom:12px">Number questions, A-D options. Mark correct with <b>*</b> or <b>Answer: B</b></p>';
h+='<pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:.76rem;margin-bottom:12px">1. What is the pass mark?\nA. 60%\nB. 80%*\nC. 70%\nD. 90%</pre>';
h+='<div class="fg"><textarea id="qm-bulk" rows="10" placeholder="Paste questions...">'+qmBulk+'</textarea></div>';
h+='<button class="btn btn-p" style="width:auto" onclick="importBulk()">Import</button>';}
if(qmMode==='list'){
if(!sop.qs.length)h+='<p style="color:#6B7280;text-align:center;padding:20px">No questions.</p>';
else sop.qs.forEach(function(q,i){
h+='<div style="padding:10px 0;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;gap:12px"><div style="flex:1"><b style="color:#FBB227">Q'+(i+1)+'.</b> '+q.t+'<br><span style="font-size:.8rem;color:#22C55E">✓ '+String.fromCharCode(65+q.c)+') '+q.o[q.c]+'</span></div>';
h+='<div style="display:flex;gap:5px;flex-shrink:0"><button class="btn btn-o btn-sm" onclick="editQ('+i+')">Edit</button><button class="btn btn-d btn-sm" onclick="deleteQ(\''+q.id+'\')">Del</button></div></div>'});}
return h+'</div></div></div>';
}

// === MANAGE EMPLOYEES ===
function renderMgmtEmp(){
var h='<div class="topbar"><h1>Manage Employees</h1><div style="display:flex;gap:8px"><button class="btn btn-p btn-sm" onclick="toggleAddEmp()">+ Add</button><button class="btn btn-s btn-sm" onclick="toggleBulkEmp()">📄 CSV Upload</button><button class="btn btn-o btn-sm" onclick="dlEmpTemplate()">📥 Template</button></div></div><div class="pc">';
h+='<div id="add-emp-form" class="card hide"><div class="ch"><h3 id="emp-form-title">Add Employee</h3></div><div class="cb">';
h+='<input type="hidden" id="edit-emp-id" value=""><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">';
h+='<div class="fg"><label>Employee Number</label><input id="nemp-id" placeholder="OM006"></div>';
h+='<div class="fg"><label>ID Number</label><input id="nemp-idn" placeholder="9201015012083" maxlength="13"></div>';
h+='<div class="fg"><label>Full Name</label><input id="nemp-name"></div>';
h+='<div class="fg"><label>Gender</label><select id="nemp-gender"><option value="">Select...</option><option>Male</option><option>Female</option></select></div>';
h+='<div class="fg"><label>Department</label><input id="nemp-dept"></div>';
h+='<div class="fg"><label>Site</label><select id="nemp-site"><option value="">Select...</option>';
sites.forEach(function(s){h+='<option>'+s+'</option>'});
h+='</select></div><div class="fg"><label>PIN</label><input id="nemp-pin" value="1234"></div></div>';
h+='<div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-p" style="width:auto" onclick="saveEmp()">Save</button><button class="btn btn-o" style="width:auto" onclick="toggleAddEmp()">Cancel</button></div></div></div>';
h+='<div id="bulk-emp-form" class="card hide"><div class="ch"><h3>CSV Upload</h3></div><div class="cb">';
h+='<div style="background:#f3f4f6;padding:14px;border-radius:8px;margin-bottom:16px;font-size:.82rem;font-family:monospace"><b>EmployeeNumber, IDNumber, FullName, Gender, Department, Site, PIN</b><br>OM006, 9201015012083, Thabo Mokoena, Male, Processing, Thutse Mining, 1234</div>';
h+='<div style="display:flex;gap:10px"><button class="btn btn-p" style="width:auto" onclick="uploadEmpCSV()">📄 Choose File</button><button class="btn btn-o" style="width:auto" onclick="toggleBulkEmp()">Cancel</button></div></div></div>';
var males=emps.filter(function(e){return e.gender==='Male'}).length;
h+='<div class="sg"><div class="sc gd"><div class="l">Total</div><div class="v">'+emps.length+'</div></div><div class="sc bl"><div class="l">Male</div><div class="v">'+males+'</div></div><div class="sc rd"><div class="l">Female</div><div class="v">'+(emps.length-males)+'</div></div></div>';
h+='<div class="card"><div class="tw"><table><thead><tr><th>Emp#</th><th>ID Number</th><th>Name</th><th>Gender</th><th>Dept</th><th>Site</th><th>PIN</th><th>Actions</th></tr></thead><tbody>';
emps.forEach(function(e,i){h+='<tr><td style="font-weight:700;color:#FBB227">'+e.id+'</td><td style="font-size:.78rem">'+e.idn+'</td><td style="font-weight:600">'+e.name+'</td><td>'+bg(e.gender,e.gender==='Male'?'blue':'gold')+'</td><td>'+e.dept+'</td><td>'+e.site+'</td><td style="font-size:.78rem">'+e.pin+'</td><td><div style="display:flex;gap:5px"><button class="btn btn-o btn-sm" onclick="editEmp('+i+')">Edit</button><button class="btn btn-d btn-sm" onclick="deleteEmp(\''+e.id+'\')">Del</button></div></td></tr>'});
return h+'</tbody></table></div></div></div>';
}

// === EMPLOYEE RECORDS ===
function renderEmpRec(){
var h='<div class="topbar"><h1>Employee Records</h1></div><div class="pc">';
h+='<div class="card"><div class="tw"><table><thead><tr><th>Emp#</th><th>ID</th><th>Name</th><th>Gender</th><th>Site</th><th>SOP</th><th>1st</th><th>2nd</th><th>3rd</th><th>Status</th><th>Proof</th></tr></thead><tbody>';
emps.forEach(function(emp){
var ea=getEmpAssigns(emp.id);
if(!ea.length){h+='<tr><td style="font-weight:600">'+emp.id+'</td><td style="font-size:.78rem">'+emp.idn+'</td><td>'+emp.name+'</td><td>'+emp.gender+'</td><td>'+emp.site+'</td><td colspan="5" style="text-align:center;color:#6B7280">No training assigned</td><td>-</td></tr>';return;}
ea.forEach(function(a,si){var sc=a.sc;var sr=getAtt(emp.id,sc);
var a1=sr.find(function(r){return r.att===1}),a2=sr.find(function(r){return r.att===2}),a3=sr.find(function(r){return r.att===3});
var ap=sr.some(function(r){return r.pass});var sop=sops.find(function(x){return x.code===sc});
h+='<tr>';
if(si===0){h+='<td style="font-weight:600" rowspan="'+ea.length+'">'+emp.id+'</td><td style="font-size:.78rem" rowspan="'+ea.length+'">'+emp.idn+'</td><td rowspan="'+ea.length+'">'+emp.name+'</td><td rowspan="'+ea.length+'">'+emp.gender+'</td><td rowspan="'+ea.length+'">'+emp.site+'</td>';}
h+='<td><span style="font-size:.7rem;font-weight:700;color:#FBB227">'+sc+'</span></td>';
h+='<td>'+(a1?bg(a1.pct+'%',a1.pass?'green':'red'):'—')+'</td>';
h+='<td>'+(a2?bg(a2.pct+'%',a2.pass?'green':'red'):'—')+'</td>';
h+='<td>'+(a3?bg(a3.pct+'%',a3.pass?'green':'red'):'—')+'</td>';
h+='<td>'+(ap?bg('Competent','green'):isLocked(emp.id,sc)?bg('Locked','red'):sr.length?bg('In Progress','gold'):bg('Outstanding','gray'))+'</td>';
h+='<td>'+(ap?'<button class="btn btn-p btn-sm" onclick="dlProofEmp(\''+emp.id+'\',\''+sc+'\')">📥</button>':'-')+'</td></tr>';
});});
return h+'</tbody></table></div></div></div>';
}

// === REPORTS ===
function renderReports(){
var h='<div class="topbar"><h1>Compliance Reports</h1></div><div class="pc">';
h+='<div class="sg">';
h+='<div class="spc" onclick="dlReport(\'full\')" style="text-align:center;padding:30px"><h4>📥 Full Compliance Report</h4><p>All employees, all training, all statuses</p></div>';
h+='<div class="spc" onclick="dlReport(\'site\')" style="text-align:center;padding:30px"><h4>📥 Site Training Summary</h4><p>Training status by site</p></div>';
h+='<div class="spc" onclick="dlReport(\'course\')" style="text-align:center;padding:30px"><h4>📥 Course Completion Report</h4><p>Status per SOP/training course</p></div>';
h+='</div>';
return h+'</div>';
}
// === NOTIFICATIONS ===
function renderANot(){
var h='<div class="topbar"><h1>Notifications</h1><button class="btn btn-o btn-sm" onclick="clearNotifs()">Clear All</button></div><div class="pc">';
if(!notifs.length){return h+'<div class="card"><div class="cb" style="text-align:center;padding:24px;color:#6B7280">No notifications.</div></div></div>';}
h+='<div>';
notifs.forEach(function(n){
h+='<div class="card" style="margin-bottom:12px"><div class="cb"><div style="display:flex;justify-content:space-between;align-items:start;gap:12px">';
var ico=n.type==='pass'?'✓':'✕';var col=n.type==='pass'?'#22C55E':'#EF4444';
h+='<div style="flex:1"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;background:'+col+';color:#fff;border-radius:50%;font-weight:700">'+ico+'</span><b>'+n.en+'</b></div>';
h+='<p style="font-size:.8rem;color:#6B7280;margin:4px 0">'+n.sc+' · Attempt '+n.att+'/3 · '+n.pct+'% · '+fd(n.dt)+'</p><p style="font-size:.8rem">'+(n.type==='pass'?'Passed with '+n.pct+'%':'Failed with '+n.pct+'% — needs '+Math.abs(80-n.pct)+'% more')+'</p></div>';
h+='<button class="btn btn-o btn-sm" onclick="this.parentElement.parentElement.parentElement.style.display=\'none\'">✕</button></div></div></div>';
});
return h+'</div></div>';
}
// === MANAGE SITES ===
function renderSMgmt(){
var h='<div class="topbar"><h1>Manage Sites</h1><button class="btn btn-p btn-sm" onclick="toggleAddSite()">+ Add</button></div><div class="pc">';
h+='<div id="add-site-form" class="card hide"><div class="ch"><h3>New Site</h3></div><div class="cb"><input id="nsite-name" placeholder="Site name"><div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-p" style="width:auto" onclick="addSite()">Save</button><button class="btn btn-o" style="width:auto" onclick="toggleAddSite()">Cancel</button></div></div></div>';
h+='<div class="card"><div class="tw"><table><thead><tr><th>Site Name</th><th>Employees</th><th>Action</th></tr></thead><tbody>';
sites.forEach(function(s){var empC=emps.filter(function(e){return e.site===s}).length;h+='<tr><td style="font-weight:600">'+s+'</td><td>'+empC+'</td><td><button class="btn btn-d btn-sm" onclick="delSite(\''+s+'\')">Del</button></td></tr>'});
return h+'</tbody></table></div></div></div>';
}

// === FUNCTION HANDLERS ===
function doLogin(){var mode=document.getElementById('login-mode').value;var pin=document.getElementById('login-pin').value;
if(mode==='admin'){if(pin===adminPass){user={id:'ADMIN',name:'Administrator',role:'admin'};page='dashboard';render();return}document.getElementById('login-err').textContent='Invalid credentials';return}
var eid=document.getElementById('login-eid').value;var emp=emps.find(function(e){return e.id.toUpperCase()===eid.toUpperCase()});
if(!emp){document.getElementById('login-err').textContent='Employee not found';return}
if(pin!==emp.pin){document.getElementById('login-err').textContent='Incorrect PIN';return}
user=emp;page='dashboard';render();}
function doLogout(){user=null;page='login';activeSop=null;render()}
function goPage(p){page=p;activeSop=null;assessStarted=false;assessDone=false;assessResult=null;assessAns={};render()}
function openSop(id){activeSop=sops.find(function(s){return s.id===id});assessStarted=false;assessDone=false;assessResult=null;assessAns={};render()}
function closeSop(){activeSop=null;render()}
function setSopTab(t){var el=document.getElementById('sop-tab-val');if(el)el.value=t;render()}
function markRead(){var k=user.id+'_'+activeSop.code;prog[k]=prog[k]||{};prog[k].sr=true;prog[k].srd=now();save();render()}
function markVid(){var k=user.id+'_'+activeSop.code;prog[k]=prog[k]||{};prog[k].vw=true;prog[k].vwd=now();save();render()}
function markInteractive(){var k=user.id+'_'+activeSop.code;prog[k]=prog[k]||{};prog[k].ia=true;prog[k].iad=now();save();render()}
function startAssess(){assessStarted=true;assessAns={};render()}
function resetForRetry(){
var k=user.id+'_'+activeSop.code;prog[k]=prog[k]||{};prog[k].sr=false;prog[k].vw=false;
assessStarted=false;assessDone=false;assessResult=null;assessAns={};save();render();}
function pickAns(qid,oi){assessAns[qid]=oi;render()}
function submitAssess(){var s=activeSop;if(Object.keys(assessAns).length<s.qs.length){alert('Answer all questions first');return}
var score=0;s.qs.forEach(function(q){if(assessAns[q.id]===q.c)score++});
var att=getAtt(user.id,s.code);var attN=att.length+1;var pct=Math.round(score/s.qs.length*100);var pass=pct>=80;
var r={id:gid(),eid:user.id,sc:s.code,score:score,total:s.qs.length,pct:pct,pass:pass,att:attN,dt:now()};
res.push(r);var emp=emps.find(function(e){return e.id===user.id});
notifs.unshift({id:gid(),type:pass?'pass':'fail',en:emp?emp.name:user.id,es:emp?emp.site:'',sc:s.code,pct:pct,att:attN,dt:now()});
save();assessResult=r;assessDone=true;render();}

// SOP management
function toggleAddSop(){var el=document.getElementById('add-sop-form');if(el){el.classList.toggle('hide');if(!el.classList.contains('hide')){document.getElementById('edit-sop-id').value='';document.getElementById('sop-form-title').textContent='New SOP';editSopId=null;document.getElementById('nsop-code').value='';document.getElementById('nsop-rev').value='Rev 1.0';document.getElementById('nsop-title').value='';document.getElementById('nsop-desc').value='';document.getElementById('nsop-cat').value='';document.getElementById('nsop-ia-na').checked=true;}}}
function editSop(id){
var s=sops.find(function(x){return x.id===id});if(!s)return;
editSopId=id;
render();
setTimeout(function(){
var form=document.getElementById('add-sop-form');
if(form)form.classList.remove('hide');
document.getElementById('sop-form-title').textContent='Edit SOP: '+s.code;
document.getElementById('edit-sop-id').value=id;
document.getElementById('nsop-code').value=s.code;
document.getElementById('nsop-rev').value=s.rev;
document.getElementById('nsop-title').value=s.title;
document.getElementById('nsop-desc').value=s.desc;
document.getElementById('nsop-cat').value=s.cat;
document.getElementById('nsop-site').value=s.site;
document.getElementById('nsop-ia-na').checked=s.interactiveNA!==false;
},50);
}
function addSop(){var code=document.getElementById('nsop-code').value,title=document.getElementById('nsop-title').value;
if(!code||!title){alert('Code & title required');return}
var editId=document.getElementById('edit-sop-id').value;
var iaNa=document.getElementById('nsop-ia-na').checked;
if(editId){
// EDIT existing SOP
var sop=sops.find(function(s){return s.id===editId});
if(sop){
sop.code=code;
sop.rev=document.getElementById('nsop-rev').value||'Rev 1.0';
sop.title=title;
sop.desc=document.getElementById('nsop-desc').value||'';
sop.cat=document.getElementById('nsop-cat').value||'General';
sop.site=document.getElementById('nsop-site').value||'All Sites';
sop.interactiveNA=iaNa;
if(iaNa){sop.interactiveUrl=null;sop.interactiveName=null;}
}
document.getElementById('edit-sop-id').value='';
editSopId=null;
} else {
// ADD new SOP
sops.push({id:gid(),code:code,rev:document.getElementById('nsop-rev').value||'Rev 1.0',title:title,desc:document.getElementById('nsop-desc').value||'',cat:document.getElementById('nsop-cat').value||'General',site:document.getElementById('nsop-site').value||'All Sites',html:'<h2>'+title+'</h2><p>Upload document.</p>',docUrl:null,docName:null,vidUrl:null,vidName:null,interactiveUrl:null,interactiveName:null,interactiveNA:iaNa,qs:[]});
}
save();render();
}
function delSop(id){sops=sops.filter(function(s){return s.id!==id});save();render()}
function uploadDoc(sid){var inp=document.createElement('input');inp.type='file';inp.accept='.pdf';inp.onchange=async function(e){var f=e.target.files[0];if(!f)return;var path='sop-docs/'+sid+'_'+Date.now()+'_'+f.name;var {data,error}=await sb.storage.from('lms-files').upload(path,f);if(error){alert('Upload failed: '+error.message);return}var {data:urlData}=sb.storage.from('lms-files').getPublicUrl(path);var sop=sops.find(function(s){return s.id===sid});sop.docUrl=urlData.publicUrl;sop.docName=f.name;save();render();alert('Document uploaded!')};inp.click()}
function uploadVid(sid){var inp=document.createElement('input');inp.type='file';inp.accept='video/*';inp.onchange=async function(e){var f=e.target.files[0];if(!f)return;if(f.size>100*1024*1024){alert('Max 100MB. For larger videos, upload to YouTube and paste the link.');return}var path='sop-vids/'+sid+'_'+Date.now()+'_'+f.name;var {data,error}=await sb.storage.from('lms-files').upload(path,f);if(error){alert('Upload failed: '+error.message);return}var {data:urlData}=sb.storage.from('lms-files').getPublicUrl(path);var sop=sops.find(function(s){return s.id===sid});sop.vidUrl=urlData.publicUrl;sop.vidName=f.name;save();render();alert('Video uploaded!')};inp.click()}
function uploadInteractive(sid){
var sop=sops.find(function(s){return s.id===sid});
if(sop.interactiveNA){alert('Interactive assessment is set to N/A for this SOP. Change it to "Enabled" first.');return}
var inp=document.createElement('input');inp.type='file';inp.accept='.html';
inp.onchange=async function(e){
var f=e.target.files[0];if(!f)return;
var path='sop-interactive/'+sid+'_'+Date.now()+'_'+f.name;
var {data,error}=await sb.storage.from('lms-files').upload(path,f);
if(error){alert('Upload failed: '+error.message);return}
var {data:urlData}=sb.storage.from('lms-files').getPublicUrl(path);
sop.interactiveUrl=urlData.publicUrl;sop.interactiveName=f.name;
save();render();alert('Interactive assessment uploaded!');
};inp.click();
}
function toggleInteractiveNA(sid){
var sop=sops.find(function(s){return s.id===sid});
sop.interactiveNA=!sop.interactiveNA;
if(sop.interactiveNA){sop.interactiveUrl=null;sop.interactiveName=null;}
save();render();
}

// Question editor
function openQEditor(sid,mode){qmSopId=sid;qmMode=mode;qmQt='';qmOpts=['','','',''];qmCor=0;qmBulk='';qmEi=null;render()}
function closeQEditor(){qmSopId=null;render()}
function setQmMode(m){qmMode=m;qmEi=null;qmQt='';qmOpts=['','','',''];qmCor=0;render()}
function addQ(){qmQt=document.getElementById('qm-qt')?document.getElementById('qm-qt').value:'';
[0,1,2,3].forEach(function(i){qmOpts[i]=document.getElementById('qm-o'+i)?document.getElementById('qm-o'+i).value:''});
if(!qmQt.trim()||qmOpts.some(function(o){return!o.trim()})){alert('Fill all fields');return}
var sop=sops.find(function(s){return s.id===qmSopId});sop.qs.push({id:gid(),t:qmQt.trim(),o:qmOpts.map(function(x){return x.trim()}),c:qmCor});
qmQt='';qmOpts=['','','',''];qmCor=0;save();render();}
function editQ(i){var sop=sops.find(function(s){return s.id===qmSopId});var q=sop.qs[i];qmEi=i;qmQt=q.t;qmOpts=q.o.slice();qmCor=q.c;qmMode='add';render()}
function updateQ(){qmQt=document.getElementById('qm-qt')?document.getElementById('qm-qt').value:'';
[0,1,2,3].forEach(function(i){qmOpts[i]=document.getElementById('qm-o'+i)?document.getElementById('qm-o'+i).value:''});
if(!qmQt.trim()||qmOpts.some(function(o){return!o.trim()})){alert('Fill all fields');return}
var sop=sops.find(function(s){return s.id===qmSopId});sop.qs[qmEi]={id:sop.qs[qmEi].id,t:qmQt.trim(),o:qmOpts.map(function(x){return x.trim()}),c:qmCor};
qmEi=null;qmQt='';qmOpts=['','','',''];save();render();}
function deleteQ(qid){var sop=sops.find(function(s){return s.id===qmSopId});sop.qs=sop.qs.filter(function(q){return q.id!==qid});save();render()}
function cancelQEdit(){qmEi=null;qmQt='';qmOpts=['','','',''];qmCor=0;render()}
function importBulk(){qmBulk=document.getElementById('qm-bulk')?document.getElementById('qm-bulk').value:'';
var qs=[];var lines=qmBulk.split('\n');var currentQ=null;
lines.forEach(function(line){line=line.trim();if(!line)return;
if(/^\d+\./.test(line)){
if(currentQ){qs.push(currentQ);}
currentQ={t:line,o:[],c:0};}
else if(/^[A-D]\)/.test(line)){
var idx=line.charCodeAt(0)-65;var txt=line.substring(3).trim();var isAns=txt.endsWith('*')||/^Answer:\s*[A-D]/i.test(line);
if(isAns){if(txt.endsWith('*'))txt=txt.slice(0,-1).trim();else txt=txt.replace(/^Answer:\s*[A-D]\s*/i,'').trim();currentQ.c=idx;}
if(currentQ)currentQ.o[idx]=txt;}});
if(currentQ)qs.push(currentQ);
if(!qs.length){alert('Could not parse questions');return}
var sop=sops.find(function(s){return s.id===qmSopId});sop.qs=sop.qs.concat(qs);qmBulk='';save();render();alert(qs.length+' imported');}

// Employee management
function toggleAddEmp(){var el=document.getElementById('add-emp-form');if(el)el.classList.toggle('hide')}
function toggleBulkEmp(){var el=document.getElementById('bulk-emp-form');if(el)el.classList.toggle('hide')}
function saveEmp(){var id=document.getElementById('edit-emp-id').value;var idn=document.getElementById('nemp-idn').value,eid=document.getElementById('nemp-id').value,name=document.getElementById('nemp-name').value,gender=document.getElementById('nemp-gender').value,dept=document.getElementById('nemp-dept').value,site=document.getElementById('nemp-site').value,pin=document.getElementById('nemp-pin').value;
if(!eid||!name||!idn){alert('Fill required fields');return}
if(id){var emp=emps.find(function(e){return e.id===id});if(emp){emp.id=eid;emp.idn=idn;emp.name=name;emp.gender=gender;emp.dept=dept;emp.site=site;emp.pin=pin;}}
else if(!emps.find(function(e){return e.id===eid})){emps.push({id:eid,idn:idn,name:name,gender:gender,dept:dept,site:site,pin:pin});}
else{alert('Employee already exists');return}
document.getElementById('nemp-id').value='';document.getElementById('nemp-idn').value='';document.getElementById('nemp-name').value='';document.getElementById('nemp-gender').value='';document.getElementById('nemp-dept').value='';document.getElementById('nemp-site').value='';document.getElementById('nemp-pin').value='1234';document.getElementById('edit-emp-id').value='';
save();render();}
function editEmp(i){var e=emps[i];document.getElementById('edit-emp-form').classList.remove('hide');document.getElementById('emp-form-title').textContent='Edit Employee';document.getElementById('edit-emp-id').value=e.id;document.getElementById('nemp-id').value=e.id;document.getElementById('nemp-idn').value=e.idn;document.getElementById('nemp-name').value=e.name;document.getElementById('nemp-gender').value=e.gender;document.getElementById('nemp-dept').value=e.dept;document.getElementById('nemp-site').value=e.site;document.getElementById('nemp-pin').value=e.pin;}
function deleteEmp(id){emps=emps.filter(function(e){return e.id!==id});save();render()}
function uploadEmpCSV(){var inp=document.createElement('input');inp.type='file';inp.accept='.csv';inp.onchange=function(e){var f=e.target.files[0];if(!f)return;var rd=new FileReader();rd.onload=function(ev){var csv=ev.target.result;var lines=csv.split('\n');for(var i=1;i<lines.length;i++){var line=lines[i].trim();if(!line)continue;var cols=line.split(',').map(function(c){return c.trim()});if(cols.length<7)continue;emps.push({id:cols[0],idn:cols[1],name:cols[2],gender:cols[3],dept:cols[4],site:cols[5],pin:cols[6]});}save();render();alert(Math.max(0,lines.length-2)+' added')};rd.readAsText(f)};inp.click()}
function dlEmpTemplate(){var csv='EmployeeNumber,IDNumber,FullName,Gender,Department,Site,PIN\nOM006,9201015012083,Thabo Mokoena,Male,Processing,Thutse Mining,1234\nOM007,9201015012084,Lerato Khubone,Female,Safety,Malekaskraal Vanadium,1234';var a=document.createElement('a');a.href='data:text/csv,'+encodeURIComponent(csv);a.download='employees-template.csv';a.click()}

// Assignment
function toggleBulkAssign(){var el=document.getElementById('bulk-assign-form');if(el)el.classList.toggle('hide')}
function editAssign(eid){var html='<div class="mbg" onclick="if(event.target===this)render()"><div class="mdl"><div class="mh"><h2>Assign Training — '+eid+'</h2><button class="btn btn-o btn-sm" onclick="render()">Close</button></div><div class="mbd">';
var emp=emps.find(function(e){return e.id===eid});
var ea=getEmpAssigns(eid);
html+='<div style="margin-bottom:16px"><p style="color:#6B7280;font-size:.9rem">'+emp.name+' · '+emp.id+' · '+emp.site+'</p></div>';
html+='<div style="margin-bottom:20px"><h3 style="margin-bottom:12px">Available SOPs</h3>';
sops.forEach(function(s){var assigned=ea.some(function(a){return a.sc===s.code});html+='<div style="display:flex;gap:10px;align-items:center;padding:10px;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:8px"><input type="checkbox" id="ck-'+s.id+'"'+(assigned?' checked':'')+'><label style="flex:1;cursor:pointer;margin:0" for="ck-'+s.id+'"><b>'+s.code+'</b> — '+s.title+'</label></div>'});
html+='</div>';
html+='<div style="display:flex;gap:10px"><button class="btn btn-p" style="width:auto" onclick="saveAssignments(\''+eid+'\')">Save</button><button class="btn btn-o" style="width:auto" onclick="render()">Cancel</button></div>';
html+='</div></div></div>';
document.body.insertAdjacentHTML('beforeend',html);
}
function saveAssignments(eid){
var newAssigns=[];
sops.forEach(function(s){if(document.getElementById('ck-'+s.id).checked){newAssigns.push(s.code)}});
assigns=assigns.filter(function(a){return a.eid!==eid});
newAssigns.forEach(function(sc,order){assigns.push({id:gid(),eid:eid,sc:sc,order:order})});
save();render();
}
function importBulkAssign(){
var txt=document.getElementById('bulk-assign-txt').value;
var lines=txt.split('\n');
lines.forEach(function(line){
line=line.trim();if(!line)return;
var parts=line.split(',').map(function(p){return p.trim()});
if(parts.length<2)return;
var eid=parts[0];var scs=parts.slice(1);
scs.forEach(function(sc,order){if(!assigns.find(function(a){return a.eid===eid&&a.sc===sc})){assigns.push({id:gid(),eid:eid,sc:sc,order:order})}});
});
save();render();alert('Assignments imported');
}

// Notifications & unlocking
function clearNotifs(){notifs=[];save();render()}
function showUnlock(eid){
var html='<div class="mbg" onclick="if(event.target===this)render()"><div class="mdl"><div class="mh"><h2>Unlock SOP Access</h2><button class="btn btn-o btn-sm" onclick="render()">Close</button></div><div class="mbd">';
var emp=emps.find(function(e){return e.id===eid});var ea=getEmpAssigns(eid);
var locked=ea.filter(function(a){return isLocked(eid,a.sc)});
html+='<p style="margin-bottom:16px">'+emp.name+' — '+eid+'</p>';
html+='<div>';
locked.forEach(function(a){html+='<div style="padding:10px;background:#fef2f2;border:1px solid #fee2e2;border-radius:6px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center"><span><b>'+a.sc+'</b> — 3 failed attempts</span><button class="btn btn-gn btn-sm" onclick="unlockSop(\''+eid+'\',\''+a.sc+'\')">Unlock</button></div></div>'});
html+='</div></div></div></div>';
document.body.insertAdjacentHTML('beforeend',html);
}
function unlockSop(eid,sc){
res=res.filter(function(r){return!(r.eid===eid&&r.sc===sc)});
unlockLog.push({id:gid(),eid:eid,sc:sc,dt:now()});
save();render();
}

// Site management
function toggleAddSite(){var el=document.getElementById('add-site-form');if(el)el.classList.toggle('hide')}
function addSite(){var name=document.getElementById('nsite-name').value;if(!name)return;if(!sites.find(function(s){return s===name})){sites.push(name);document.getElementById('nsite-name').value='';save();render()}}
function delSite(s){sites=sites.filter(function(x){return x!==s});save();render()}

// Reports & proof
function dlProofEmp(eid,sc){var emp=emps.find(function(e){return e.id===eid});var sop=sops.find(function(s){return s.code===sc});var r=res.find(function(x){return x.eid===eid&&x.sc===sc&&x.pass});if(!r)return;dlProof(eid,sc,r.score,r.total,r.pct,r.pass,r.att,r.dt)}
function dlProof(eid,sc,score,total,pct,pass,att,dt){
var emp=emps.find(function(e){return e.id===eid});var sop=sops.find(function(s){return s.code===sc});
var w=window.open('','_blank');
w.document.write('<!DOCTYPE html><html><head><title>One Mining — Proof of Competency</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;color:#243034;padding:40px;background:#f9fafb}h1{color:#FBB227;font-size:2rem;margin-bottom:8px}.logo{text-align:center;margin-bottom:40px}.card{background:#fff;padding:40px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);max-width:600px;margin:0 auto}.hdr{border-bottom:3px solid #FBB227;padding-bottom:20px;margin-bottom:30px}table{width:100%;margin:20px 0}td{padding:10px;border-bottom:1px solid #e5e7eb}td:first-child{font-weight:600;width:200px}.res{text-align:center;margin:30px 0;padding:30px;background:#f0fdf4;border:2px solid #22c55e;border-radius:8px}.res .big{font-size:3rem;font-weight:800;color:#22c55e}.res .sm{color:#6b7280;font-size:.9rem;margin-top:8px}.sig{margin-top:40px;border-top:1px solid #d1d5db;padding-top:20px;text-align:center;color:#6b7280;font-size:.85rem}</style></head><body>');
w.document.write('<div class="card"><div class="logo"><h1>One <span style="color:#243034">Mining</span></h1><p style="color:#6B7280">Proof of Training Competency</p></div><div class="hdr"><h2 style="margin:0">'+sop.title+'</h2><p style="color:#6B7280;margin:6px 0 0">'+sop.code+' · '+sop.rev+'</p></div>');
w.document.write('<table><tr><td>Employee</td><td>'+emp.name+'</td></tr><tr><td>Employee #</td><td>'+emp.id+'</td></tr><tr><td>ID Number</td><td>'+emp.idn+'</td></tr><tr><td>Site</td><td>'+emp.site+'</td></tr></table>');
w.document.write('<div class="res"><div class="big">✓</div><div style="font-size:1.5rem;font-weight:700;margin:10px 0;color:#22c55e">COMPETENT</div><div class="sm">'+score+'/'+total+' · '+pct+'%</div></div>');
w.document.write('<table><tr><td>Assessment Date</td><td>'+fd(dt)+'</td></tr><tr><td>Attempt</td><td>'+att+'/3</td></tr><tr><td>Pass Mark</td><td>80%</td></tr></table>');
w.document.write('<div class="sig"><p>This document certifies that the above employee has successfully completed the training assessment for the specified SOP.</p><p style="margin-top:12px">Generated '+fd(now())+' | One Mining Training Management System</p></div></div></body></html>');
w.document.close();setTimeout(function(){w.print()},500);}
function dlReport(type,id){
var w=window.open('','_blank');
var css='*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;color:#243034;padding:30px;font-size:12px}.hdr{text-align:center;padding-bottom:16px;border-bottom:4px solid #FBB227;margin-bottom:24px}.hdr h1{font-size:1.5rem;font-weight:800}.gold{color:#FBB227}.hdr p{font-size:.8rem;color:#6B7280}h2{font-size:1rem;font-weight:700;margin:20px 0 10px;border-bottom:2px solid #FBB227;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}th{background:#243034;color:#fff;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase}td{padding:8px 10px;border:1px solid #e5e7eb}.pass{color:#22C55E;font-weight:700}.fail{color:#EF4444;font-weight:700}.ftr{margin-top:30px;padding-top:12px;border-top:2px solid #FBB227;text-align:center;font-size:10px;color:#6B7280}@media print{body{padding:15px}}';
w.document.write('<!DOCTYPE html><html><head><title>One Mining Report</title><style>'+css+'</style></head><body>');
w.document.write('<div class="hdr"><h1>One <span class="gold">Mining</span></h1><p>Training Management System — Compliance Report</p><p style="margin-top:4px">Generated: '+fd(now())+'</p></div>');

if(type==='emp'){
var emp=emps.find(function(e){return e.id===id});if(!emp){w.document.close();return}
var ea=getEmpAssigns(emp.id);
w.document.write('<h2>Individual Training Record</h2>');
w.document.write('<table><tr><td style="font-weight:700;width:150px">Employee</td><td>'+emp.name+'</td><td style="font-weight:700;width:150px">Emp #</td><td>'+emp.id+'</td></tr>');
w.document.write('<tr><td style="font-weight:700">ID Number</td><td>'+emp.idn+'</td><td style="font-weight:700">Gender</td><td>'+emp.gender+'</td></tr>');
w.document.write('<tr><td style="font-weight:700">Site</td><td>'+emp.site+'</td><td style="font-weight:700">Department</td><td>'+emp.dept+'</td></tr></table>');
w.document.write('<h2>Training Status</h2><table><thead><tr><th>#</th><th>SOP Code</th><th>Title</th><th>Status</th><th>Score</th><th>Pass Mark</th><th>Attempts</th><th>Date</th></tr></thead><tbody>');
ea.forEach(function(a,i){var sop=sops.find(function(s){return s.code===a.sc});var st=getStatus(emp.id,a.sc);var att=getAtt(emp.id,a.sc);var pr=att.find(function(r){return r.pass});
var stTxt=st==='passed'?'COMPETENT':st==='locked'?'LOCKED':st==='progress'?'IN PROGRESS':'OUTSTANDING';
var stCls=st==='passed'?'pass':st==='locked'?'fail':'';
w.document.write('<tr><td>'+(i+1)+'</td><td>'+a.sc+'</td><td>'+(sop?sop.title:'')+'</td><td class="'+stCls+'">'+stTxt+'</td><td>'+(pr?pr.pct+'%':att.length?att[att.length-1].pct+'%':'-')+'</td><td>80%</td><td>'+att.length+'/3</td><td>'+(pr?fd(pr.dt):'-')+'</td></tr>');});
w.document.write('</tbody></table>');
}
else if(type==='site'){
w.document.write('<h2>Site Training Summary</h2>');
sites.forEach(function(site){
var sEmps=emps.filter(function(e){return e.site===site});if(!sEmps.length)return;
w.document.write('<h2>'+site+' ('+sEmps.length+' employees)</h2><table><thead><tr><th>Emp#</th><th>Name</th><th>Gender</th><th>Dept</th><th>SOP</th><th>Status</th><th>Score</th><th>Date</th></tr></thead><tbody>');
sEmps.forEach(function(emp){var ea=getEmpAssigns(emp.id);
if(!ea.length){w.document.write('<tr><td>'+emp.id+'</td><td>'+emp.name+'</td><td>'+emp.gender+'</td><td>'+emp.dept+'</td><td colspan="4" style="color:#6B7280">No training assigned</td></tr>');return;}
ea.forEach(function(a,si){var sop=sops.find(function(s){return s.code===a.sc});var st=getStatus(emp.id,a.sc);var att=getAtt(emp.id,a.sc);var pr=att.find(function(r){return r.pass});
var stTxt=st==='passed'?'COMPETENT':st==='locked'?'LOCKED':st==='progress'?'IN PROGRESS':'OUTSTANDING';
w.document.write('<tr>'+(si===0?'<td rowspan="'+ea.length+'">'+emp.id+'</td><td rowspan="'+ea.length+'">'+emp.name+'</td><td rowspan="'+ea.length+'">'+emp.gender+'</td><td rowspan="'+ea.length+'">'+emp.dept+'</td>':'')+'<td>'+a.sc+'</td><td class="'+(st==='passed'?'pass':st==='locked'?'fail':'')+'">'+stTxt+'</td><td>'+(pr?pr.pct+'%':'-')+'</td><td>'+(pr?fd(pr.dt):'-')+'</td></tr>');});});
w.document.write('</tbody></table>');});}
else if(type==='course'){
w.document.write('<h2>Course Completion Report</h2>');
sops.forEach(function(sop){
var sopAssigns=assigns.filter(function(a){return a.sc===sop.code});if(!sopAssigns.length)return;
var passed=sopAssigns.filter(function(a){return hasPassed(a.eid,sop.code)}).length;
w.document.write('<h2>'+sop.code+' — '+sop.title+' ('+passed+'/'+sopAssigns.length+' completed)</h2>');
w.document.write('<table><thead><tr><th>Emp#</th><th>Name</th><th>ID Number</th><th>Gender</th><th>Site</th><th>Status</th><th>Score</th><th>Pass Mark</th><th>Attempts</th><th>Date</th></tr></thead><tbody>');
sopAssigns.forEach(function(a){var emp=emps.find(function(e){return e.id===a.eid});var st=getStatus(a.eid,sop.code);var att=getAtt(a.eid,sop.code);var pr=att.find(function(r){return r.pass});
var stTxt=st==='passed'?'COMPETENT':st==='locked'?'LOCKED':st==='progress'?'IN PROGRESS':'OUTSTANDING';
w.document.write('<tr><td>'+(emp?emp.id:'')+'</td><td>'+(emp?emp.name:'')+'</td><td>'+(emp?emp.idn:'')+'</td><td>'+(emp?emp.gender:'')+'</td><td>'+(emp?emp.site:'')+'</td><td class="'+(st==='passed'?'pass':st==='locked'?'fail':'')+'">'+stTxt+'</td><td>'+(pr?pr.pct+'%':att.length?att[att.length-1].pct+'%':'-')+'</td><td>80%</td><td>'+att.length+'/3</td><td>'+(pr?fd(pr.dt):'-')+'</td></tr>');});
w.document.write('</tbody></table>');});}
else{// full
w.document.write('<h2>Full Compliance Report — All Employees</h2>');
w.document.write('<table><thead><tr><th>Emp#</th><th>Name</th><th>ID Number</th><th>Gender</th><th>Site</th><th>Dept</th><th>SOP</th><th>Status</th><th>Score</th><th>Pass Mark</th><th>Attempts</th><th>Date</th></tr></thead><tbody>');
emps.forEach(function(emp){var ea=getEmpAssigns(emp.id);
if(!ea.length){w.document.write('<tr><td>'+emp.id+'</td><td>'+emp.name+'</td><td>'+emp.idn+'</td><td>'+emp.gender+'</td><td>'+emp.site+'</td><td>'+emp.dept+'</td><td colspan="6" style="color:#6B7280">No training assigned</td></tr>');return;}
ea.forEach(function(a,si){var sop=sops.find(function(s){return s.code===a.sc});var st=getStatus(emp.id,a.sc);var att=getAtt(emp.id,a.sc);var pr=att.find(function(r){return r.pass});
var stTxt=st==='passed'?'COMPETENT':st==='locked'?'LOCKED':st==='progress'?'IN PROGRESS':'OUTSTANDING';
w.document.write('<tr>'+(si===0?'<td rowspan="'+ea.length+'">'+emp.id+'</td><td rowspan="'+ea.length+'">'+emp.name+'</td><td rowspan="'+ea.length+'">'+emp.idn+'</td><td rowspan="'+ea.length+'">'+emp.gender+'</td><td rowspan="'+ea.length+'">'+emp.site+'</td><td rowspan="'+ea.length+'">'+emp.dept+'</td>':'')+'<td>'+a.sc+'</td><td class="'+(st==='passed'?'pass':st==='locked'?'fail':'')+'">'+stTxt+'</td><td>'+(pr?pr.pct+'%':att.length?att[att.length-1].pct+'%':'-')+'</td><td>80%</td><td>'+att.length+'/3</td><td>'+(pr?fd(pr.dt):'-')+'</td></tr>');});});
w.document.write('</tbody></table>');}
w.document.write('<div class="ftr"><p><b>One Mining (Pty) Ltd</b> — Training Management System</p><p>Generated '+fd(now())+' | Confidential — For compliance use only</p></div></body></html>');
w.document.close();setTimeout(function(){w.print()},500);}

init();


