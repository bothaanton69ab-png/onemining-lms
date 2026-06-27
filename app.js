// === SUPABASE DATA LAYER ===
function gid(){return Math.random().toString(36).substr(2,9)}
function now(){return new Date().toISOString()}
function fd(d){if(!d)return'-';return new Date(d).toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'})}
function bg(t,c){var m={gold:'b-gd',green:'b-gn',red:'b-rd',blue:'b-bl',gray:'b-gy'};return'<span class="b '+(m[c]||'b-gy')+'">'+t+'</span>'}
function cleanStr(s){return(s||'').replace(/[^\x20-\x7E]/g,'').trim()}

// Data variables (loaded from Supabase on init)
var sites=[];
var emps=[];
var res=[];
var prog={};
var notifs=[];
var assigns=[];
var unlockLog=[];
var sops=[];

var adminPass='admin';
var editSopId=null;
var user=null,page='login',activeSop=null,assessAns={},assessStarted=false,assessDone=false,assessResult=null,assessQs=[];
var qmSopId=null,qmMode='add',qmQt='',qmOpts=['','','',''],qmCor=0,qmBulk='',qmEi=null;
var adminSites=[],adminDepts=[],adminSops=[],adminEmpF='';

// Load one key from Supabase
async function cloudLoad(key, fallback) {
    try {
        var { data, error } = await sb.from('app_data_demo').select('value').eq('key', key).single();
        if (error || !data) return fallback;
        return data.value;
    } catch(e) { return fallback; }
}

// Save one key to Supabase
async function cloudSave(key, value) {
    try {
        var { error } = await sb.from('app_data_demo').upsert({ key: key, value: value, updated_at: new Date().toISOString() });
        if (error) { console.error('Save error for ' + key, error); return false; }
        return true;
    } catch(e) { console.error('Save failed for ' + key, e); return false; }
}

// Merge arrays by ID — keeps cloud records, adds/updates local records
function mergeById(cloud, local, idKey) {
    idKey = idKey || 'id';
    var merged = cloud.slice();
    var cloudIds = {};
    cloud.forEach(function(item) { if(item[idKey]) cloudIds[item[idKey]] = true; });
    local.forEach(function(item) {
        if(item[idKey] && !cloudIds[item[idKey]]) merged.push(item);
    });
    return merged;
}

// Merge assignment arrays — unique by eid+sc combo
function mergeAssigns(cloud, local) {
    var merged = cloud.slice();
    var cloudKeys = {};
    cloud.forEach(function(a) { cloudKeys[a.eid + '||' + a.sc] = true; });
    local.forEach(function(a) {
        if(!cloudKeys[a.eid + '||' + a.sc]) merged.push(a);
    });
    return merged;
}

// Merge progress objects — keeps all keys from both, local wins on conflicts
function mergeObj(cloud, local) {
    var merged = {};
    Object.keys(cloud).forEach(function(k) { merged[k] = cloud[k]; });
    Object.keys(local).forEach(function(k) {
        if(!merged[k]) { merged[k] = local[k]; }
        else {
            // Merge individual progress fields — true wins over false
            var c = merged[k], l = local[k], m = {};
            Object.keys(c).forEach(function(f) { m[f] = c[f]; });
            Object.keys(l).forEach(function(f) { if(l[f] === true || !m[f]) m[f] = l[f]; });
            merged[k] = m;
        }
    });
    return merged;
}

// Save all data with merge-from-cloud to prevent overwrites
async function save() {
    try {
        // Reload latest from cloud before saving
        var cloudRes = await cloudLoad('res', []);
        var cloudProg = await cloudLoad('prog', {});
        var cloudAssigns = await cloudLoad('assigns', []);
        var cloudNotifs = await cloudLoad('notifs', []);
        var cloudEmps = await cloudLoad('emps', []);
        var cloudSops = await cloudLoad('sops', []);
        var cloudUnlock = await cloudLoad('unlock', []);

        // Merge — cloud data + local additions
        res = mergeById(cloudRes, res);
        // Remove any results that admin explicitly reset this session
        if(removedResKeys.length){res=res.filter(function(r){return removedResKeys.indexOf(r.eid+'||'+r.sc)<0});}
        prog = mergeObj(cloudProg, prog);
        assigns = mergeAssigns(cloudAssigns, assigns);
        // Remove any assignments that admin explicitly deleted this session
        if(removedAssigns.length){assigns=assigns.filter(function(a){return removedAssigns.indexOf(a.eid+'||'+a.sc)<0});}
        notifs = mergeById(cloudNotifs, notifs);
        unlockLog = mergeById(cloudUnlock, unlockLog);

        // For emps and sops — admin is sole editor, use local version
        // But merge emps by id to prevent losing employees added by other admins
        var empMerged = cloudEmps.slice();
        var cloudEmpIds = {};
        cloudEmps.forEach(function(e) { cloudEmpIds[e.id.toUpperCase()] = true; });
        emps.forEach(function(e) { if(!cloudEmpIds[e.id.toUpperCase()]) empMerged.push(e); });
        emps = empMerged;
    } catch(e) {
        console.error('Merge-reload failed, saving local copy:', e);
    }

    var results = await Promise.all([
        cloudSave('res', res),
        cloudSave('prog', prog),
        cloudSave('notifs', notifs),
        cloudSave('sops', sops),
        cloudSave('sites', sites),
        cloudSave('emps', emps),
        cloudSave('assigns', assigns),
        cloudSave('unlock', unlockLog)
    ]);
    var failed = results.filter(function(r){ return !r; }).length;
    if (failed > 0) { console.error(failed + ' save(s) failed'); return false; }
    return true;
}

// Reload just results and progress from Supabase (prevents overwrites between users)
async function reloadCritical() {
    try {
        var latestRes = await cloudLoad('res', []);
        var latestProg = await cloudLoad('prog', {});
        var latestAssigns = await cloudLoad('assigns', []);
        res = mergeById(latestRes, res);
        prog = mergeObj(latestProg, prog);
        assigns = mergeAssigns(latestAssigns, assigns);
    } catch(e) { console.error('Reload failed', e); }
}

// Initialize - load all data from Supabase
async function init() {
    try {
        sites = await cloudLoad('sites', ['Thutse Mining','Malekaskraal Vanadium','Head Office']);
        emps = await cloudLoad('emps', []);
        emps.forEach(function(e){e.idn=cleanStr(e.idn);e.name=cleanStr(e.name);e.id=cleanStr(e.id);e.gender=cleanStr(e.gender);e.site=cleanStr(e.site);e.dept=cleanStr(e.dept);});
        res = await cloudLoad('res', []);
        prog = await cloudLoad('prog', {});
        notifs = await cloudLoad('notifs', []);
        assigns = await cloudLoad('assigns', []);
        unlockLog = await cloudLoad('unlock', []);
        sops = await cloudLoad('sops', []);
        adminPass = await cloudLoad('admin_password', 'admin');
        await tnaLoad();
        await indLoad();
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
if(user.role==='manager'||user.role==='training'){el.innerHTML=renderManagerShell();return}
var isA=user.role==='admin';
var sb='<aside class="sb"><div class="sb-brand"><h2>One <span class="gold">Mining</span></h2><p>Training LMS · DEMO</p></div><div class="sb-nav">';
sb+='<div class="ni'+(page==='dashboard'&&!activeSop?' a':'')+'" onclick="goPage(\'dashboard\')">📊 Dashboard</div>';
sb+='<div class="ni'+(page==='library'||activeSop?' a':'')+'" onclick="goPage(\'library\')">📚 My Training</div>';
if(!isA)sb+='<div class="ni'+(page==='myres'?' a':'')+'" onclick="goPage(\'myres\')">📋 My Results</div>';
if(!isA)sb+='<div class="ni'+(page==='mycomp'?' a':'')+'" onclick="goPage(\'mycomp\')">🎯 My Competence</div>';
if(!isA)sb+='<div class="ni'+(page==='myind'?' a':'')+'" onclick="goPage(\'myind\')">🎓 Induction</div>';
if(isA){
sb+='<div class="ni'+(page==='comp'?' a':'')+'" onclick="goPage(\'comp\')">🎯 Competence</div>';
sb+='<div class="ni'+(page==='iassign'?' a':'')+'" onclick="goPage(\'iassign\')">➕ Assign Interventions</div>';
sb+='<div class="ni'+(page==='mind'?' a':'')+'" onclick="goPage(\'mind\')">🎓 Manage Induction</div>';
sb+='<div class="ni'+(page==='mint'?' a':'')+'" onclick="goPage(\'mint\')">🧩 Interventions</div>';
sb+='<div class="ni'+(page==='mjp'?' a':'')+'" onclick="goPage(\'mjp\')">🏷️ Job Profiles</div>';
sb+='<div class="ni'+(page==='expiry'?' a':'')+'" onclick="goPage(\'expiry\')">⏰ Expiry & Renewals</div>';
sb+='<div class="ni'+(page==='tnaimp'?' a':'')+'" onclick="goPage(\'tnaimp\')">⬆️ TNA Import</div>';
sb+='<div class="ni'+(page==='audit'?' a':'')+'" onclick="goPage(\'audit\')">📜 Audit Log</div>';
sb+='<div class="ni'+(page==='mmgr'?' a':'')+'" onclick="goPage(\'mmgr\')">👔 Manager Accounts</div>';
sb+='<div class="ni'+(page==='soparch'?' a':'')+'" onclick="goPage(\'soparch\')">🗄️ Training Archive</div>';
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
else if(page==='comp'&&isA)mc+=renderCompetence();
else if(page==='iassign'&&isA)mc+=renderIAssign();
else if(page==='mind'&&isA)mc+=renderManageInduction();
else if(page==='myind'&&!isA)mc+=renderMyInduction();
else if(page==='mint'&&isA)mc+=renderInterventions();
else if(page==='mjp'&&isA)mc+=renderJobProfiles();
else if(page==='expiry'&&isA)mc+=renderExpiry();
else if(page==='tnaimp'&&isA)mc+=renderTnaImport();
else if(page==='audit'&&isA)mc+=renderAuditLog();
else if(page==='mmgr'&&isA)mc+=renderManageManagers();
else if(page==='soparch'&&isA)mc+=renderSopArchive();
else if(page==='mycomp'&&!isA)mc+=renderMyComp();
mc+='</main>';
el.innerHTML='<div class="app">'+sb+mc+'</div>';
}

function renderLogin(){
return'<div class="login-bg"><div class="login-card"><div class="login-logo"><h1>One <span class="gold">Mining</span></h1><p>Training Management System</p></div>'+
'<div class="fg"><label>Login as</label><select id="login-mode" onchange="loginModeChange()" style="width:100%;padding:10px 12px;border:2px solid #e2e5e9;border-radius:8px"><option value="emp">Employee</option><option value="manager">Manager / Training Dept</option><option value="admin">Admin</option></select></div>'+
'<div id="emp-fields" class="fg"><label id="login-eid-lbl">Employee Number</label><input id="login-eid" placeholder="e.g. OM001"></div>'+
'<div class="fg"><label id="login-lbl">PIN</label><input type="password" id="login-pin" onkeydown="if(event.key===\'Enter\')doLogin()"></div>'+
'<div id="login-err" style="color:#EF4444;font-size:.82rem;margin-bottom:12px"></div>'+
'<button class="btn btn-p" onclick="doLogin()">Sign In</button>'+
'<p style="font-size:.74rem;color:#6B7280;margin-top:14px;text-align:center">Employee: ID + PIN · Manager: username + password</p></div></div>';
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
var h='<div class="topbar"><h1>Admin Dashboard</h1><div style="display:flex;gap:8px"><button class="btn btn-p btn-sm" onclick="dashReport()">📥 Compliance Report</button></div></div><div class="pc">';
// Filters
h+='<div class="sf" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">';
h+='<input id="ad-emp" placeholder="Search employee..." value="'+adminEmpF+'" onchange="adminEmpF=this.value;render()" style="flex:1;min-width:200px;max-width:340px;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px">';
h+=msHtml('Sites', distinctVals(emps,'site'), 'adminSites');
h+=msHtml('Departments', distinctVals(emps,'dept'), 'adminDepts');
h+=msHtml('Courses', sops.map(function(s){return {v:s.code,l:s.code+' — '+s.title};}), 'adminSops');
h+='<button class="btn btn-o btn-sm" onclick="adminSites=[];adminDepts=[];adminSops=[];adminEmpF=\'\';render()">Clear all</button>';
h+='</div>';
// Filter employees (multi-select)
var fEmps=emps.filter(function(e){
if(!inArrOrAll(adminSites,e.site)) return false;
if(!inArrOrAll(adminDepts,e.dept||'')) return false;
if(adminEmpF){var q=adminEmpF.toLowerCase(); if((e.name+' '+e.id).toLowerCase().indexOf(q)<0) return false;}
return true});
// Stats
var totalAssigns=0,totalCompleted=0,totalLocked=0;
fEmps.forEach(function(e){var ea=getEmpAssigns(e.id);if(adminSops&&adminSops.length)ea=ea.filter(function(a){return adminSops.indexOf(a.sc)>=0;});ea.forEach(function(a){
totalAssigns++;if(hasPassed(e.id,a.sc))totalCompleted++;if(isLocked(e.id,a.sc))totalLocked++;})});
var compRate=totalAssigns?Math.round(totalCompleted/totalAssigns*100):0;
h+='<div class="sg"><div class="sc gd"><div class="l">Employees</div><div class="v">'+fEmps.length+'</div></div>';
h+='<div class="sc bl"><div class="l">Assigned Courses</div><div class="v">'+totalAssigns+'</div></div>';
h+='<div class="sc gn"><div class="l">Completed</div><div class="v">'+totalCompleted+'</div></div>';
h+='<div class="sc rd"><div class="l">Locked / Not Yet Competent</div><div class="v">'+totalLocked+'</div></div></div>';
h+='<div class="sg"><div class="sc bl"><div class="l">Completion Rate</div><div class="v">'+compRate+'%</div><div class="pb" style="margin-top:6px"><div class="pf '+(compRate>=80?'gn':'gd')+'" style="width:'+compRate+'%"></div></div></div></div>';
// Completion matrix
h+='<div class="card"><div class="ch"><h3>Training Completion Matrix</h3></div><div class="cb"><div class="tw"><table><thead><tr><th>Employee</th><th>Site</th>';
var fSops=(adminSops&&adminSops.length)?sops.filter(function(s){return adminSops.indexOf(s.code)>=0;}):sops;
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
var h='<div class="topbar"><h1>'+(isA?'Training Library':'My Training')+'</h1></div><div class="pc">';
var ea=isA?null:getEmpAssigns(user.id);
var showSops=isA?sops:sops.filter(function(s){return ea.some(function(a){return a.sc===s.code})});
if(!isA&&!showSops.length)return h+'<div class="card"><div class="cb"><p style="text-align:center;color:#6B7280;padding:24px">No training assigned yet. Contact your administrator.</p></div></div></div>';
h+='<div class="card"><div class="cb"><input placeholder="Search training by name or code..." value="'+(typeof libSearch!=="undefined"?(libSearch||"").replace(/"/g,"&quot;"):"")+'" onchange="libSearch=this.value;render()" style="width:100%;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px"></div></div>';
if(typeof libSearch!=="undefined"&&libSearch){var lq=libSearch.toLowerCase();showSops=showSops.filter(function(s){return ((s.code||"")+" "+(s.title||"")+" "+(s.cat||"")).toLowerCase().indexOf(lq)>=0;});}
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
var pr=!isA?(prog[user.id+'_'+s.code]||{}):{sr:true,vw:true,sl:true};
var hasSlides=!!s.slidesUrl;
var ps=!isA&&hasPassed(user.id,s.code),lk=!isA&&isLocked(user.id,s.code),att=!isA?getAtt(user.id,s.code):[];
var tabV=document.getElementById('sop-tab-val');var tab=tabV?tabV.value:'sop';
var h='<div class="topbar"><div style="display:flex;align-items:center;gap:14px"><button class="btn btn-o btn-sm" onclick="closeSop()">← Back</button><div><h1>'+s.title+'</h1><span style="font-size:.76rem;color:#6B7280">'+s.code+' · '+s.rev+' · '+s.site+'</span></div></div></div>';
h+='<div class="pc"><input type="hidden" id="sop-tab-val" value="'+tab+'">';
if(isA)h+='<div class="card" style="border-left:4px solid #FBB227"><div class="cb" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div style="font-size:.9rem"><b>Need to change this training?</b> Name, version, document, video, slides or questions — the current version is archived for audit and all employee records are kept.</div><button class="btn btn-p" style="width:auto" onclick="reviseSop(\''+s.id+'\')">✎ Make changes / New version</button></div></div>';
if(!isA){h+='<div class="sg"><div class="sc"><div class="l">1. Read SOP</div><div style="margin-top:6px">'+(pr.sr?bg('Done','green'):bg('Pending','gray'))+'</div></div>';
h+='<div class="sc"><div class="l">2. Watch Video</div><div style="margin-top:6px">'+(pr.vw?bg('Done','green'):bg('Pending','gray'))+'</div></div>';
if(hasSlides){h+='<div class="sc"><div class="l">3. Slides</div><div style="margin-top:6px">'+(pr.sl?bg('Done','green'):bg('Pending','gray'))+'</div></div>';}
h+='<div class="sc"><div class="l">'+(hasSlides?'4':'3')+'. Assessment</div><div style="margin-top:6px">'+(ps?bg('Competent','green'):lk?bg('Locked','red'):bg(att.length+'/3','gold'))+'</div></div>';
h+='</div>';}
h+='<div class="tabs"><div class="tab'+(tab==='sop'?' a':'')+'" onclick="setSopTab(\'sop\')">SOP Document</div>';
h+='<div class="tab'+(tab==='vid'?' a':'')+'" onclick="setSopTab(\'vid\')">Video</div>';
if(hasSlides){h+='<div class="tab'+(tab==='slides'?' a':'')+'" onclick="setSopTab(\'slides\')">Slides</div>';}
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
if(hasSlides&&tab==='slides'){h+='<div style="max-width:860px;margin:0 auto">';
h+='<iframe src="'+s.slidesUrl+'" style="width:100%;height:80vh;border:1px solid #e5e7eb;border-radius:10px"></iframe>';
h+='<p style="text-align:center;margin-top:8px;color:#6B7280;font-size:.8rem">'+(s.slidesName||'Presentation slides')+' · <a href="'+s.slidesUrl+'" target="_blank" style="color:#FBB227;font-weight:600">Open in new tab</a></p>';
if(!isA&&!pr.sl)h+='<div style="text-align:center;margin-top:12px"><button class="btn btn-p" style="width:auto;padding:12px 44px" onclick="markSlides()">✓ I have viewed the slides</button></div>';
if(!isA&&pr.sl)h+='<p style="text-align:center;margin-top:12px;color:#22C55E;font-weight:600">Viewed '+fd(pr.sld)+'</p>';
h+='</div>';}
if(tab==='test')h+=renderAssess(s,isA,pr,ps,lk,att);
h+='</div>';return h;
}

function renderAssess(s,isA,pr,ps,lk,att){
if(isA){var h='<div class="card"><div class="ch"><h3>Answer Memorandum</h3></div><div class="cb"><div class="tw"><table><thead><tr><th>#</th><th>Question</th><th>Answer</th></tr></thead><tbody>';
s.qs.forEach(function(q,i){h+='<tr><td style="font-weight:700">Q'+(i+1)+'</td><td>'+q.t+'</td><td style="font-weight:700;color:#22C55E">'+String.fromCharCode(65+q.c)+') '+q.o[q.c]+'</td></tr>'});
return h+'</tbody></table></div></div></div>';}
if(!s.qs.length)return'<div class="card"><div class="cb" style="text-align:center;padding:28px;color:#6B7280">No assessment yet.</div></div>';
if(ps)return'<div class="card"><div class="cb" style="text-align:center;padding:40px"><div class="ri ps">✓</div><h2 style="color:#22C55E">Competent</h2><p style="color:#6B7280;margin-top:8px">Training module completed.</p><button class="btn btn-p" style="width:auto;margin-top:16px" onclick="dlProofEmp(\''+user.id+'\',\''+s.code+'\')">📥 Download Proof</button></div></div>';
if(lk)return'<div class="card"><div class="cb" style="text-align:center;padding:40px"><div class="ri fl">✕</div><h2 style="color:#EF4444">Locked</h2><p style="color:#6B7280;margin-top:8px">3 attempts used. Contact your administrator for assistance.</p></div></div>';
if(!pr.sr||!pr.vw||(s.slidesUrl&&!pr.sl)){
var need=[];if(!pr.sr)need.push('read the SOP');if(!pr.vw)need.push('watch the video');if(s.slidesUrl&&!pr.sl)need.push('view the slides');
return'<div class="card"><div class="cb" style="text-align:center;padding:28px;color:#6B7280">You must <b>'+need.join('</b> and <b>')+'</b> before taking the assessment.</div></div>';}
if(assessDone&&assessResult){var r=assessResult;
var h='<div class="card"><div class="cb" style="text-align:center;padding:40px"><div class="ri '+(r.pass?'ps':'fl')+'">'+(r.pass?'✓':'✕')+'</div>';
h+='<h2 style="color:'+(r.pass?'#22C55E':'#EF4444')+'">'+(r.pass?'COMPETENT':'NOT YET COMPETENT')+'</h2>';
h+='<p style="font-size:1.6rem;font-weight:700;margin:10px 0">'+r.pct+'%</p>';
h+='<p style="color:#6B7280">'+r.score+'/'+r.total+' · Attempt '+r.att+'/3 · Competency mark 100%</p>';
if(r.pass)h+='<button class="btn btn-p" style="width:auto;margin-top:16px" onclick="dlProof(\''+user.id+'\',\''+activeSop.code+'\','+r.score+','+r.total+','+r.pct+',true,'+r.att+',\''+r.dt+'\')">📥 Download Proof</button>';
if(r.pass&&r.pct<100){var aq2=assessQs.length?assessQs:s.qs;var wrongs=[];aq2.forEach(function(q,qi){if(assessAns[q.id]!==q.c){wrongs.push({n:qi+1,t:q.t,yours:assessAns[q.id]!==undefined?String.fromCharCode(65+assessAns[q.id])+') '+q.o[assessAns[q.id]]:'No answer',correct:String.fromCharCode(65+q.c)+') '+q.o[q.c]})}});
if(wrongs.length){h+='</div></div><div class="card" style="margin-top:16px;border-left:4px solid #FBB227"><div class="ch"><h3 style="color:#243034">Review — Questions You Got Wrong</h3></div><div class="cb">';
h+='<p style="color:#6B7280;margin-bottom:16px;font-size:.85rem">You are competent, but review the following to strengthen your understanding:</p>';
wrongs.forEach(function(w){h+='<div style="padding:12px 0;border-bottom:1px solid #f0f0f0"><div style="font-weight:600;color:#243034;margin-bottom:6px">Q'+w.n+'. '+w.t+'</div><div style="font-size:.85rem;color:#EF4444;margin-bottom:4px">✗ Your answer: '+w.yours+'</div><div style="font-size:.85rem;color:#22C55E;font-weight:600">✓ Correct answer: '+w.correct+'</div></div>'});
h+='</div>';}}
if(!r.pass&&r.att<3)h+='<p style="color:#6B7280;margin-top:16px;font-size:.85rem">You must re-read the SOP and re-watch the video before your next attempt.</p><button class="btn btn-p" style="width:auto;margin-top:12px" onclick="resetForRetry()">Re-do Training (Attempt '+(r.att+1)+'/3)</button>';
if(!r.pass&&r.att>=3)h+='<p style="color:#EF4444;font-weight:600;margin-top:14px">All 3 attempts used. Contact your administrator.</p>';
return h+'</div></div>';}
if(!assessStarted){var dispN=Math.min(15,s.qs.length);return'<div class="card"><div class="cb" style="text-align:center;padding:40px"><h3>'+dispN+' MCQs · 100% to be competent· Attempt '+(att.length+1)+'/3</h3>'+(s.qs.length>15?'<p style="color:#6B7280;margin-top:8px;font-size:.85rem">Questions are randomly selected from a bank of '+s.qs.length+'</p>':'')+'<button class="btn btn-p" style="width:auto;margin-top:20px;padding:12px 44px" onclick="startAssess()">Start Assessment</button></div></div>';}
var aq=assessQs.length?assessQs:s.qs;var cnt=Object.keys(assessAns).length;
var h='<div style="max-width:780px;margin:0 auto"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><span style="font-weight:600">'+cnt+'/'+aq.length+'</span><div class="pb" style="flex:1;margin:0 14px;max-width:280px"><div class="pf gd" style="width:'+(cnt/aq.length*100)+'%"></div></div><span style="font-weight:600;color:#FBB227">Attempt '+(att.length+1)+'/3</span></div>';
aq.forEach(function(q,qi){
h+='<div class="qc"><div class="qn">Question '+(qi+1)+'/'+aq.length+'</div><div class="qt">'+q.t+'</div>';
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
my.forEach(function(r){var s=sops.find(function(x){return x.code===r.sc});h+='<tr><td style="font-weight:600">'+r.sc+'</td><td>'+(s?s.title:'')+'</td><td>'+r.score+'/'+r.total+'</td><td style="font-weight:700">'+r.pct+'%</td><td>'+bg(r.pass?'Competent':'Not yet competent',r.pass?'green':'red')+'</td><td>'+r.att+'/3</td><td>'+fd(r.dt)+'</td><td>'+(r.pass?'<button class="btn btn-p btn-sm" onclick="dlProof(\''+r.eid+'\',\''+r.sc+'\','+r.score+','+r.total+','+r.pct+',true,'+r.att+',\''+r.dt+'\')">📥</button>':'-')+'</td></tr>'});
return h+'</tbody></table></div></div></div>';
}
// === ASSIGN TRAINING (ADMIN) ===
function renderAssign(){
var h='<div class="topbar"><h1>Assign Training</h1></div><div class="pc">';
// Assign form
h+='<div class="card"><div class="ch"><h3>Assign Training to Employees</h3></div><div class="cb">';
h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">';
h+='<div class="fg"><label>Assign To</label><select id="asgn-mode" onchange="var m=this.value;document.getElementById(\'asgn-emp-row\').className=\'fg\'+(m===\'individual\'?\'\':\' hide\');document.getElementById(\'asgn-site-row\').className=\'fg\'+(m===\'site\'?\'\':\' hide\');document.getElementById(\'asgn-dept-row\').className=\'fg\'+(m===\'dept\'?\'\':\' hide\')"><option value="individual">Individual Employee</option><option value="site">All at Site</option><option value="dept">All in Department</option></select></div>';
h+='<div class="fg"><label>Training Courses <span style="font-weight:400;color:#6B7280;font-size:.8rem">(select one or more)</span></label>';
h+='<div style="border:1px solid #d1d5db;border-radius:8px;max-height:180px;overflow-y:auto;padding:8px">';
sops.forEach(function(s){h+='<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:.9rem" onmouseover="this.style.background=\'#f3f4f6\'" onmouseout="this.style.background=\'transparent\'"><input type="checkbox" class="asgn-sop-cb" value="'+s.code+'" style="width:16px;height:16px;accent-color:#FBB227"><span style="font-weight:600;color:#FBB227;min-width:120px">'+s.code+'</span><span>'+s.title+'</span></label>'});
h+='</div><div style="margin-top:6px;display:flex;gap:8px"><button type="button" class="btn btn-p btn-sm" style="font-size:.75rem;padding:4px 10px" onclick="document.querySelectorAll(\'.asgn-sop-cb\').forEach(function(c){c.checked=true})">Select All</button><button type="button" class="btn btn-o btn-sm" style="font-size:.75rem;padding:4px 10px" onclick="document.querySelectorAll(\'.asgn-sop-cb\').forEach(function(c){c.checked=false})">Clear All</button></div></div></div>';
h+='<div id="asgn-emp-row" class="fg"><label>Employee</label>';
h+='<input id="asgn-emp-search" placeholder="Type name or employee number to search..." oninput="filterAsgnEmps()" style="margin-bottom:6px">';
h+='<select id="asgn-emp" size="6" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:4px"><option value="">Select...</option>';
emps.forEach(function(e){h+='<option value="'+e.id+'">'+e.id+' — '+e.name+' ('+e.site+')</option>'});
h+='</select></div>';
h+='<div id="asgn-site-row" class="fg hide"><label>Site</label><select id="asgn-site"><option value="">Select...</option>';
sites.forEach(function(s){h+='<option>'+s+'</option>'});
h+='</select></div>';
h+='<div id="asgn-dept-row" class="fg hide"><label>Department</label><input id="asgn-dept" placeholder="e.g. Processing"></div>';
h+='<div class="fg"><label>Order / Sequence (lower = first)</label><input id="asgn-order" type="number" value="'+(assigns.length+1)+'" min="1"></div>';
h+='<button class="btn btn-p" style="width:auto" onclick="doAssign()">Assign Training</button>';
h+='</div></div>';
// Current assignments
h+='<div class="card"><div class="ch"><h3>Current Assignments ('+assigns.length+')</h3></div><div class="cb">';
if(!assigns.length)h+='<p style="text-align:center;color:#6B7280;padding:20px">No assignments yet.</p>';
else{
h+='<div class="sf"><select id="asgn-filter-emp" onchange="render()"><option value="all">All Employees</option>';
emps.forEach(function(e){h+='<option value="'+e.id+'">'+e.id+' — '+e.name+'</option>'});
h+='</select><select id="asgn-filter-site" onchange="render()"><option value="all">All Sites</option>';
sites.forEach(function(s){h+='<option>'+s+'</option>'});
h+='</select></div>';
var fe=document.getElementById('asgn-filter-emp');var fs2=document.getElementById('asgn-filter-site');
var fEmp=fe?fe.value:'all';var fSite=fs2?fs2.value:'all';
var fa=assigns.filter(function(a){
var emp=emps.find(function(e){return e.id===a.eid});
return(fEmp==='all'||a.eid===fEmp)&&(fSite==='all'||(emp&&emp.site===fSite));
}).sort(function(a,b){return a.eid===b.eid?a.order-b.order:a.eid.localeCompare(b.eid)});
h+='<div class="tw"><table><thead><tr><th>Employee</th><th>Site</th><th>SOP Code</th><th>SOP Title</th><th>Order</th><th>Status</th><th>Assigned</th><th>Action</th></tr></thead><tbody>';
fa.forEach(function(a){var emp=emps.find(function(e){return e.id===a.eid});var sop=sops.find(function(s){return s.code===a.sc});
var st=getStatus(a.eid,a.sc);var stB=st==='passed'?bg('Completed','green'):st==='locked'?bg('Locked','red'):st==='progress'?bg('In Progress','gold'):bg('Not Started','gray');
h+='<tr><td style="font-weight:600">'+(emp?emp.name:a.eid)+'</td><td>'+(emp?emp.site:'')+'</td><td style="color:#FBB227;font-weight:700">'+a.sc+'</td><td>'+(sop?sop.title:'')+'</td><td>'+a.order+'</td><td>'+stB+'</td><td>'+fd(a.dt)+'</td><td><button class="btn btn-d btn-sm" onclick="removeAssign(\''+a.eid+'\',\''+a.sc+'\')">Remove</button></td></tr>';
});h+='</tbody></table></div>';}
h+='</div></div></div>';return h;
}

// === MANAGE SOPs (ADMIN) ===
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
h+='</select></div></div><div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-p" style="width:auto" onclick="addSop()">Save</button><button class="btn btn-o" style="width:auto" onclick="toggleAddSop()">Cancel</button></div></div></div>';
h+='<div class="card"><div class="tw"><table><thead><tr><th>Code</th><th>Title</th><th>Cat</th><th>Site</th><th>Doc</th><th>Video</th><th>Slides</th><th>Qs</th><th>Actions</th></tr></thead><tbody>';
sops.forEach(function(s){
h+='<tr><td style="font-weight:700;color:#FBB227">'+s.code+'</td><td>'+s.title+'</td><td>'+s.cat+'</td><td>'+s.site+'</td>';
h+='<td>'+(s.docName?bg(s.docName,'green'):bg('None','gray'))+'</td>';
h+='<td>'+(s.vidName?bg(s.vidName,'green'):bg('None','gray'))+'</td>';
h+='<td>'+(s.slidesName?bg(s.slidesName,'green'):bg('None','gray'))+'</td>';
h+='<td style="font-weight:700">'+s.qs.length+'</td>';
h+='<td><div style="display:flex;gap:5px;flex-wrap:wrap"><button class="btn btn-p btn-sm" onclick="uploadDoc(\''+s.id+'\')">📄 Doc</button><button class="btn btn-p btn-sm" onclick="uploadVid(\''+s.id+'\')">🎬 Video</button><button class="btn btn-p btn-sm" onclick="uploadSlides(\''+s.id+'\')">📊 Slides</button>'+(s.slidesName?'<button class="btn btn-o btn-sm" onclick="removeSlides(\''+s.id+'\')">✕ Slides</button>':'')+'<button class="btn btn-bl btn-sm" onclick="openQEditor(\''+s.id+'\',\'add\')">+ Q</button><button class="btn btn-s btn-sm" onclick="openQEditor(\''+s.id+'\',\'bulk\')">Bulk</button><button class="btn btn-o btn-sm" onclick="editSop(\''+s.id+'\')">Edit</button><button class="btn btn-o btn-sm" onclick="openSop(\''+s.id+'\')">View</button><button class="btn btn-d btn-sm" onclick="delSop(\''+s.id+'\')">Del</button></div></td></tr>'});
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
h+='<pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:.76rem;margin-bottom:12px">1. What is the pass mark?\nA. 60%\nB. 100%*\nC. 70%\nD. 90%</pre>';
h+='<p style="font-size:.8rem;color:#6B7280;margin-bottom:8px">Or upload a <b>.csv</b> (columns: Question, A, B, C, D, Answer) or a <b>.txt</b> in the format above.</p>';
h+='<div class="fg"><textarea id="qm-bulk" rows="10" placeholder="Paste questions, or use Upload below...">'+qmBulk+'</textarea></div>';
h+='<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-p" style="width:auto" onclick="importBulk()">Import Pasted</button><button class="btn btn-s" style="width:auto" onclick="uploadBulkQs()">📄 Upload .csv / .txt</button><button class="btn btn-o" style="width:auto" onclick="dlQTemplate()">📥 CSV Template</button></div>';}
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
h+=filterBar(emps,'meSites','meDepts','meSearch');
h+='<div class="card"><div class="tw"><table><thead><tr><th>Emp#</th><th>ID Number</th><th>Name</th><th>Gender</th><th>Dept</th><th>Site</th><th>PIN</th><th>Actions</th></tr></thead><tbody>';
filterEmps(emps,meSites,meDepts,meSearch).forEach(function(e){var i=emps.indexOf(e);h+='<tr><td style="font-weight:700;color:#FBB227">'+e.id+'</td><td style="font-size:.78rem">'+e.idn+'</td><td style="font-weight:600">'+e.name+'</td><td>'+bg(e.gender,e.gender==='Male'?'blue':'gold')+'</td><td>'+e.dept+'</td><td>'+e.site+'</td><td style="font-size:.78rem">'+e.pin+'</td><td><div style="display:flex;gap:5px"><button class="btn btn-o btn-sm" onclick="editEmp('+i+')">Edit</button><button class="btn btn-d btn-sm" onclick="deleteEmp(\''+e.id+'\')">Del</button></div></td></tr>'});
return h+'</tbody></table></div></div></div>';
}

// === EMPLOYEE RECORDS ===
function renderEmpRec(){
var h='<div class="topbar"><h1>Employee Records</h1></div><div class="pc">';
h+=filterBar(emps,'erSites','erDepts','erSearch');
h+='<div class="card"><div class="tw"><table><thead><tr><th>Emp#</th><th>ID</th><th>Name</th><th>Gender</th><th>Site</th><th>SOP</th><th>1st</th><th>2nd</th><th>3rd</th><th>Status</th><th>Proof</th></tr></thead><tbody>';
filterEmps(emps,erSites,erDepts,erSearch).forEach(function(emp){
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
var lk2=isLocked(emp.id,sc);
h+='<td style="white-space:nowrap">'+(ap?'<button class="btn btn-p btn-sm" onclick="dlProofEmp(\''+emp.id+'\',\''+sc+'\')">📥</button>':(lk2?'<button class="btn btn-o btn-sm" onclick="resetAttempts(\''+emp.id+'\',\''+sc+'\')" title="Reset attempts so employee can retry">🔄 Reset</button> ':'')+'<button class="btn btn-gn btn-sm" onclick="markAsPassed(\''+emp.id+'\',\''+sc+'\')" title="Manually mark as competent (certificate verified)">✓ Competent</button>')+'</td></tr>';
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
if(typeof renderComplianceReport==='function')h+=renderComplianceReport();
// Quick stats
// (legacy assessment-stat cards removed — the competence compliance report above is the single source)
h+='<div class="card"><div class="ch"><h3>Recent Results</h3></div><div class="cb"><div class="tw"><table><thead><tr><th>Employee</th><th>Site</th><th>SOP</th><th>Score</th><th>Result</th><th>Attempt</th><th>Date</th></tr></thead><tbody>';
res.slice().reverse().slice(0,15).forEach(function(r){var emp=emps.find(function(e){return e.id===r.eid});
h+='<tr><td>'+(emp?emp.name:r.eid)+'</td><td>'+(emp?emp.site:'')+'</td><td style="font-weight:600">'+r.sc+'</td><td style="font-weight:700">'+r.pct+'%</td><td>'+bg(r.pass?'Competent':'Not yet competent',r.pass?'green':'red')+'</td><td>'+r.att+'/3</td><td>'+fd(r.dt)+'</td></tr>'});
return h+'</tbody></table></div></div></div></div>';
}

function renderANot(){
var h='<div class="topbar"><h1>Notifications</h1>'+(notifs.length?'<button class="btn btn-o btn-sm" onclick="clearNotifs()">Clear All</button>':'')+'</div><div class="pc">';
if(!notifs.length)return h+'<div class="card"><div class="cb" style="text-align:center;color:#6B7280;padding:24px">No notifications.</div></div></div>';
notifs.forEach(function(n){h+='<div class="card" style="border-left:4px solid '+(n.type==='pass'?'#22C55E':'#EF4444')+'"><div class="cb" style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px"><div>'+bg(n.type==='pass'?'Competent':'Not yet competent',n.type==='pass'?'green':'red')+' <b>'+n.en+'</b> ('+n.es+') — <b>'+n.pct+'%</b> on <b>'+n.sc+'</b> — Attempt '+n.att+'/3</div><span style="font-size:.76rem;color:#6B7280">'+fd(n.dt)+'</span></div></div>'});
return h+'</div>';
}

function renderSMgmt(){
var h='<div class="topbar"><h1>Manage Sites</h1></div><div class="pc"><div class="card"><div class="ch"><h3>Operating Sites</h3></div><div class="cb">';
h+='<div style="display:flex;gap:10px;margin-bottom:20px"><input id="new-site" placeholder="New site..." style="flex:1;padding:10px 14px;border:2px solid #e2e5e9;border-radius:8px" onkeydown="if(event.key===\'Enter\')addSite()"><button class="btn btn-p" style="width:auto" onclick="addSite()">+ Add</button></div>';
h+='<div class="tw"><table><thead><tr><th>Site</th><th style="width:100px">Action</th></tr></thead><tbody>';
sites.forEach(function(s){h+='<tr><td style="font-weight:600">'+s+'</td><td><button class="btn btn-d btn-sm" onclick="removeSite(\''+s+'\')">Remove</button></td></tr>'});
return h+'</tbody></table></div></div></div></div>';
}
// === ACTION FUNCTIONS ===
function doLogin(){var mode=document.getElementById('login-mode').value;var pin=document.getElementById('login-pin').value;
if(mode==='admin'){if(pin===adminPass){user={id:'ADMIN',name:'Administrator',role:'admin'};page='dashboard';render();return}document.getElementById('login-err').textContent='Invalid credentials';return}
if(mode==='manager'){var un=document.getElementById('login-eid').value.trim();var mgr=getManager(un);
if(!mgr||mgr.password!==pin){document.getElementById('login-err').textContent='Invalid manager credentials';return}
user={id:mgr.id,name:mgr.name,role:(mgr.role==='training'?'training':'manager'),mgr:mgr};mgrEmp=null;render();return}
var eid=document.getElementById('login-eid').value;var emp=emps.find(function(e){return e.id.toUpperCase()===eid.toUpperCase()});
if(!emp){document.getElementById('login-err').textContent='Employee not found';return}
if(pin!==emp.pin){document.getElementById('login-err').textContent='Incorrect PIN';return}
user=emp;page='dashboard';render();}
function doLogout(){user=null;page='login';activeSop=null;render()}
function goPage(p){page=p;activeSop=null;assessStarted=false;assessDone=false;assessResult=null;assessAns={};assessQs=[];if(typeof compEmp!=='undefined'){compEmp=null;jpEdit=null;}if(typeof indActiveMod!=='undefined'){indActiveMod=null;indAdminEdit=null;indResult=null;indAns={};}render()}
function openSop(id){activeSop=sops.find(function(s){return s.id===id});assessStarted=false;assessDone=false;assessResult=null;assessAns={};assessQs=[];render()}
function closeSop(){activeSop=null;render()}
function setSopTab(t){var el=document.getElementById('sop-tab-val');if(el)el.value=t;render()}
async function markRead(){var k=user.id+'_'+activeSop.code;await reloadCritical();prog[k]=prog[k]||{};prog[k].sr=true;prog[k].srd=now();var ok=await save();if(!ok)alert('⚠️ Save may have failed — please check your internet and try again.');render()}
async function markVid(){var k=user.id+'_'+activeSop.code;await reloadCritical();prog[k]=prog[k]||{};prog[k].vw=true;prog[k].vwd=now();var ok=await save();if(!ok)alert('⚠️ Save may have failed — please check your internet and try again.');render()}
async function markSlides(){var k=user.id+'_'+activeSop.code;await reloadCritical();prog[k]=prog[k]||{};prog[k].sl=true;prog[k].sld=now();var ok=await save();if(!ok)alert('⚠️ Save may have failed — please check your internet and try again.');render()}
function startAssess(){assessStarted=true;assessAns={};var s=activeSop;var pool=s.qs.slice();for(var i=pool.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=pool[i];pool[i]=pool[j];pool[j]=tmp}assessQs=pool.slice(0,Math.min(15,pool.length));render()}
async function resetForRetry(){
var k=user.id+'_'+activeSop.code;await reloadCritical();prog[k]=prog[k]||{};prog[k].sr=false;prog[k].vw=false;prog[k].sl=false;
assessStarted=false;assessDone=false;assessResult=null;assessAns={};assessQs=[];await save();render();}
function pickAns(qid,oi){assessAns[qid]=oi;render()}
async function submitAssess(){var s=activeSop;var aq=assessQs.length?assessQs:s.qs;if(Object.keys(assessAns).length<aq.length){alert('Answer all questions first');return}
var score=0;aq.forEach(function(q){if(assessAns[q.id]===q.c)score++});
// Reload latest data from cloud BEFORE adding our result (prevents overwriting other employees)
await reloadCritical();
var att=getAtt(user.id,s.code);var attN=att.length+1;var pct=Math.round(score/aq.length*100);var pass=pct>=100;
var wrongs=[];if(pass&&pct<100){aq.forEach(function(q,qi){if(assessAns[q.id]!==q.c){wrongs.push({n:qi+1,t:q.t,yours:assessAns[q.id]!==undefined?String.fromCharCode(65+assessAns[q.id])+') '+q.o[assessAns[q.id]]:'No answer',correct:String.fromCharCode(65+q.c)+') '+q.o[q.c]})}});}
var r={id:gid(),eid:user.id,sc:s.code,score:score,total:aq.length,pct:pct,pass:pass,att:attN,dt:now(),wrongs:wrongs};
res.push(r);var emp=emps.find(function(e){return e.id===user.id});
notifs.unshift({id:gid(),type:pass?'pass':'fail',en:emp?emp.name:user.id,es:emp?emp.site:'',sc:s.code,pct:pct,att:attN,dt:now()});
// Show saving indicator
var el=document.getElementById('app');if(el){var overlay=document.createElement('div');overlay.id='save-overlay';overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999';overlay.innerHTML='<div style="background:#fff;padding:30px 50px;border-radius:12px;text-align:center"><div style="font-size:1.2rem;font-weight:700;color:#1E3A5F">Saving your result...</div><div style="margin-top:8px;color:#6B7280">Please do not close this page</div></div>';document.body.appendChild(overlay);}
var ok=await save();
// Remove overlay
var ov=document.getElementById('save-overlay');if(ov)ov.remove();
if(!ok){alert('⚠️ Your result may not have been saved. Please do NOT close this page. Check your internet connection and try clicking Submit again, or contact the Compliance Department.');return;}
assessResult=r;assessDone=true;render();}

// SOP management
function toggleAddSop(){var el=document.getElementById('add-sop-form');if(el){el.classList.toggle('hide');if(!el.classList.contains('hide')){document.getElementById('edit-sop-id').value='';document.getElementById('sop-form-title').textContent='New SOP';editSopId=null;document.getElementById('nsop-code').value='';document.getElementById('nsop-rev').value='Rev 1.0';document.getElementById('nsop-title').value='';document.getElementById('nsop-desc').value='';document.getElementById('nsop-cat').value='';}}}
function addSop(){var code=document.getElementById('nsop-code').value,title=document.getElementById('nsop-title').value;
if(!code||!title){alert('Code & title required');return}
var editId=document.getElementById('edit-sop-id').value;
if(editId){var sop=sops.find(function(s){return s.id===editId});if(sop){sop.code=code;sop.rev=document.getElementById('nsop-rev').value||'Rev 1.0';sop.title=title;sop.desc=document.getElementById('nsop-desc').value||'';sop.cat=document.getElementById('nsop-cat').value||'General';sop.site=document.getElementById('nsop-site').value||'All Sites';}document.getElementById('edit-sop-id').value='';editSopId=null;}
else{sops.push({id:gid(),code:code,rev:document.getElementById('nsop-rev').value||'Rev 1.0',title:title,desc:document.getElementById('nsop-desc').value||'',cat:document.getElementById('nsop-cat').value||'General',site:document.getElementById('nsop-site').value||'All Sites',html:'<h2>'+title+'</h2><p>Upload document.</p>',docUrl:null,docName:null,vidUrl:null,vidName:null,slidesUrl:null,slidesName:null,qs:[]});}
save();render();}
function delSop(id){sops=sops.filter(function(s){return s.id!==id});save();render()}
function uploadDoc(sid){var inp=document.createElement('input');inp.type='file';inp.accept='.pdf';inp.onchange=async function(e){var f=e.target.files[0];if(!f)return;var path='sop-docs/'+sid+'_'+Date.now()+'_'+f.name;var {data,error}=await sb.storage.from('lms-files').upload(path,f);if(error){alert('Upload failed: '+error.message);return}var {data:urlData}=sb.storage.from('lms-files').getPublicUrl(path);var sop=sops.find(function(s){return s.id===sid});sop.docUrl=urlData.publicUrl;sop.docName=f.name;save();render();alert('Document uploaded!')};inp.click()}
function uploadVid(sid){var inp=document.createElement('input');inp.type='file';inp.accept='video/*';inp.onchange=async function(e){var f=e.target.files[0];if(!f)return;if(f.size>100*1024*1024){alert('Max 100MB. For larger videos, upload to YouTube and paste the link.');return}var path='sop-vids/'+sid+'_'+Date.now()+'_'+f.name;var {data,error}=await sb.storage.from('lms-files').upload(path,f);if(error){alert('Upload failed: '+error.message);return}var {data:urlData}=sb.storage.from('lms-files').getPublicUrl(path);var sop=sops.find(function(s){return s.id===sid});sop.vidUrl=urlData.publicUrl;sop.vidName=f.name;save();render();alert('Video uploaded!')};inp.click()}
function uploadSlides(sid){var inp=document.createElement('input');inp.type='file';inp.accept='.pdf';inp.onchange=async function(e){var f=e.target.files[0];if(!f)return;if(f.size>50*1024*1024){alert('Max 50MB. Please compress or split the PDF.');return}var path='sop-slides/'+sid+'_'+Date.now()+'_'+f.name;var {data,error}=await sb.storage.from('lms-files').upload(path,f);if(error){alert('Upload failed: '+error.message);return}var {data:urlData}=sb.storage.from('lms-files').getPublicUrl(path);var sop=sops.find(function(s){return s.id===sid});sop.slidesUrl=urlData.publicUrl;sop.slidesName=f.name;save();render();alert('Slides (PDF) uploaded!')};inp.click()}
function removeSlides(sid){if(!confirm('Remove the slides PDF from this SOP? Employees will no longer be required to view slides for it.'))return;var sop=sops.find(function(s){return s.id===sid});sop.slidesUrl=null;sop.slidesName=null;save();render()}
function editSop(id){var s=sops.find(function(x){return x.id===id});if(!s)return;editSopId=id;render();setTimeout(function(){var form=document.getElementById('add-sop-form');if(form)form.classList.remove('hide');document.getElementById('sop-form-title').textContent='Edit SOP: '+s.code;document.getElementById('edit-sop-id').value=id;document.getElementById('nsop-code').value=s.code;document.getElementById('nsop-rev').value=s.rev;document.getElementById('nsop-title').value=s.title;document.getElementById('nsop-desc').value=s.desc;document.getElementById('nsop-cat').value=s.cat;document.getElementById('nsop-site').value=s.site;},50)}

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
function cancelQEdit(){qmEi=null;qmQt='';qmOpts=['','','',''];qmCor=0;render()}
function deleteQ(qid){var sop=sops.find(function(s){return s.id===qmSopId});sop.qs=sop.qs.filter(function(q){return q.id!==qid});save();render()}
function importBulk(){qmBulk=document.getElementById('qm-bulk')?document.getElementById('qm-bulk').value:'';
if(!qmBulk.trim()){alert('Paste first');return}var lines=qmBulk.trim().split('\n').filter(function(l){return l.trim()});var qs=[],cur=null;
function pushCur(){if(cur&&cur.o.length>=2)qs.push(cur);}
lines.forEach(function(line){var l=line.trim();
if(/^\d+[.)]/.test(l)){pushCur();cur={id:gid(),t:l.replace(/^\d+[.)]\s*/,'').trim(),o:[],c:0};return}
if(cur&&/^[A-Ha-h][.)]/.test(l)){var ot=l.replace(/^[A-Ha-h][.)]\s*/,'').trim();var ic=ot.endsWith('*');cur.o.push(ic?ot.slice(0,-1).trim():ot);if(ic)cur.c=cur.o.length-1;return}
if(cur&&/^(answer|correct|ans)[:=]\s*/i.test(l)){var a=l.replace(/^(answer|correct|ans)[:=]\s*/i,'').trim().toUpperCase();var idx='ABCDEFGH'.indexOf(a[0]);if(idx>=0)cur.c=idx;return}});
pushCur();
if(!qs.length){alert('Could not parse. Each question must start with a number (e.g. "1." or "1)") and have at least two option lines (A. , B. ...). Mark the correct one with * or add a line "Answer: B".');return}
var sop=sops.find(function(s){return s.id===qmSopId});sop.qs=sop.qs.concat(qs);qmBulk='';save();render();alert(qs.length+' imported');}
function dlQTemplate(){var csv='Question,A,B,C,D,Answer\n"What is the pass mark?","60%","100%","70%","90%",B\n"What PPE is mandatory underground?","Hard hat only","Full PPE set","Gloves only","None",B\n';var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='OneMining_Questions_Template.csv';a.click();}
function uploadBulkQs(){var inp=document.createElement('input');inp.type='file';inp.accept='.csv,.txt';inp.onchange=function(e){var f=e.target.files[0];if(!f)return;var reader=new FileReader();reader.onload=function(ev){var text=ev.target.result||'';
var isCsv=/\.csv$/i.test(f.name)||/(^|\n)\s*"?\s*question\s*"?\s*,/i.test(text);
if(isCsv){importBulkCSV(text);}else{qmBulk=text;render();setTimeout(function(){var ta=document.getElementById('qm-bulk');if(ta)ta.value=text;},30);alert('Loaded into the box — review, then click "Import Pasted".');}};reader.readAsText(f);};inp.click();}
function parseCSVrows(text){var rows=[],row=[],cur='',q=false;for(var i=0;i<text.length;i++){var ch=text[i];if(q){if(ch==='"'){if(text[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=ch;}else{if(ch==='"')q=true;else if(ch===','){row.push(cur);cur='';}else if(ch==='\n'){row.push(cur);rows.push(row);row=[];cur='';}else if(ch==='\r'){}else cur+=ch;}}if(cur!==''||row.length){row.push(cur);rows.push(row);}return rows.filter(function(r){return r.some(function(c){return (c||'').trim();});});}
function importBulkCSV(text){var rows=parseCSVrows(text);if(!rows.length){alert('Empty file');return;}var sop=sops.find(function(s){return s.id===qmSopId});if(!sop){alert('No SOP selected');return;}var start=0;if((rows[0].join(',')).toLowerCase().indexOf('question')>=0)start=1;var qs=[],skipped=0;for(var i=start;i<rows.length;i++){var r=rows[i];if(!r||r.length<6||!(r[0]||'').trim()){skipped++;continue;}var t=(r[0]||'').trim();var o=[(r[1]||'').trim(),(r[2]||'').trim(),(r[3]||'').trim(),(r[4]||'').trim()];var ans=(r[5]||'').trim();var c='ABCD'.indexOf((ans.toUpperCase()[0]||''));if(c<0){var idx=o.indexOf(ans);c=idx>=0?idx:0;}if(!t||o.some(function(x){return !x;})){skipped++;continue;}qs.push({id:gid(),t:t,o:o,c:c});}if(!qs.length){alert('Could not parse any questions. Check the columns: Question, A, B, C, D, Answer');return;}sop.qs=sop.qs.concat(qs);save();render();alert(qs.length+' question(s) imported'+(skipped?', '+skipped+' row(s) skipped':'')+'.');}

// Assignment
function filterAsgnEmps(){var q=(document.getElementById('asgn-emp-search').value||'').toLowerCase();var sel=document.getElementById('asgn-emp');if(!sel)return;var opts='<option value="">Select...</option>';emps.forEach(function(e){var txt=e.id+' — '+e.name+' ('+e.site+')';if(!q||e.id.toLowerCase().indexOf(q)>=0||e.name.toLowerCase().indexOf(q)>=0)opts+='<option value="'+e.id+'">'+txt+'</option>'});sel.innerHTML=opts;}
function doAssign(){var mode=document.getElementById('asgn-mode').value;var order=parseInt(document.getElementById('asgn-order').value)||1;
var selectedSops=[];document.querySelectorAll('.asgn-sop-cb:checked').forEach(function(cb){selectedSops.push(cb.value)});
if(!selectedSops.length){alert('Select at least one training course');return}
var targetEmps=[];
if(mode==='individual'){var eid=document.getElementById('asgn-emp').value;if(!eid){alert('Select an employee');return}targetEmps=[eid];}
else if(mode==='site'){var site=document.getElementById('asgn-site').value;if(!site){alert('Select a site');return}targetEmps=emps.filter(function(e){return e.site===site}).map(function(e){return e.id});}
else if(mode==='dept'){var dept=document.getElementById('asgn-dept').value;if(!dept){alert('Enter department');return}targetEmps=emps.filter(function(e){return e.dept.toLowerCase().indexOf(dept.toLowerCase())>=0}).map(function(e){return e.id});}
var added=0;targetEmps.forEach(function(eid){selectedSops.forEach(function(sc,si){
if(!assigns.some(function(a){return a.eid===eid&&a.sc===sc})){assigns.push({eid:eid,sc:sc,order:order+si,dt:now()});added++;}})});
save();render();alert(added+' assignment(s) created'+(selectedSops.length>1?' across '+selectedSops.length+' courses':'')+'.');}
var removedAssigns=[];var removedResKeys=[];
function removeAssign(eid,sc){assigns=assigns.filter(function(a){return!(a.eid===eid&&a.sc===sc)});removedAssigns.push(eid+'||'+sc);save();render()}

// Admin: Mark employee as passed (manually verified via certificate)
function markAsPassed(eid,sc){var emp=emps.find(function(e){return e.id===eid});
var sop=sops.find(function(s){return s.code===sc});
if(!emp||!sop){alert('Employee or SOP not found');return;}
if(hasPassed(eid,sc)){alert(emp.name+' already marked as passed for '+sc);return;}
var att=getAtt(eid,sc);var hasAttempts=att.length>0;
var ov=document.createElement('div');ov.id='mp-overlay';ov.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999';
var md='<div style="background:#fff;border-radius:16px;max-width:560px;width:90%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3)">';
md+='<div style="display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid #e5e7eb"><h2 style="color:#22C55E;font-size:1.1rem;margin:0">✓ Mark as Passed</h2><button onclick="document.getElementById(\'mp-overlay\').remove()" style="background:none;border:1px solid #d1d5db;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:.85rem">Close</button></div>';
md+='<div style="padding:20px 24px">';
md+='<div style="background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:16px;display:flex;justify-content:space-between"><div><div style="font-size:.7rem;color:#6B7280;text-transform:uppercase;font-weight:600">Employee</div><div style="font-weight:700;font-size:1rem">'+emp.name+'</div><div style="font-size:.82rem;color:#6B7280">'+emp.id+' · '+emp.site+'</div></div><div style="text-align:right"><div style="font-size:.7rem;color:#6B7280;text-transform:uppercase;font-weight:600">Training Module</div><div style="font-weight:700;color:#FBB227;font-size:1rem">'+sc+'</div><div style="font-size:.82rem;color:#6B7280">'+sop.title.toUpperCase()+'</div></div></div>';
if(!hasAttempts){md+='<div style="background:#FEF2F2;border-left:4px solid #EF4444;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px"><div style="font-weight:700;color:#EF4444;font-size:.85rem">No attempts recorded.</div><div style="font-size:.82rem;color:#6B7280;margin-top:4px">No assessment submitted for this SOP. Only continue if competence was verified another way (e.g. paper certificate).</div></div>';}
md+='<div style="background:#FFFBEB;border-left:4px solid #FBB227;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px"><div style="font-weight:700;color:#243034;font-size:.85rem">You are about to manually mark this employee as COMPETENT for '+sc+'.</div></div>';
md+='<div style="margin-bottom:20px"><label style="font-weight:700;font-size:.78rem;text-transform:uppercase;color:#6B7280;display:block;margin-bottom:6px">Reason for Manual Pass</label><textarea id="mp-reason" rows="3" style="width:100%;padding:12px;border:2px solid #d1d5db;border-radius:8px;font-size:.9rem;resize:vertical" placeholder="e.g. Employee completed training today — result not saved due to system issue"></textarea></div>';
md+='<div style="display:flex;gap:10px"><button onclick="confirmManualPass(\''+eid+'\',\''+sc+'\')" style="background:#22C55E;color:#fff;border:none;border-radius:8px;padding:12px 24px;font-weight:700;cursor:pointer;font-size:.9rem">✓ Confirm</button><button onclick="document.getElementById(\'mp-overlay\').remove()" style="background:#f3f4f6;color:#243034;border:1px solid #d1d5db;border-radius:8px;padding:12px 24px;font-weight:600;cursor:pointer;font-size:.9rem">Cancel</button></div>';
md+='</div></div>';
ov.innerHTML=md;document.body.appendChild(ov);}

async function confirmManualPass(eid,sc){
var reason=(document.getElementById('mp-reason').value||'').trim();
if(!reason){alert('Please enter a reason for this manual pass.');return;}
var ov=document.getElementById('mp-overlay');if(ov)ov.remove();
var emp=emps.find(function(e){return e.id===eid});var sop=sops.find(function(s){return s.code===sc});
await reloadCritical();
var k=eid+'_'+sc;prog[k]=prog[k]||{};prog[k].sr=true;prog[k].srd=prog[k].srd||now();prog[k].vw=true;prog[k].vwd=prog[k].vwd||now();
if(sop.slidesUrl){prog[k].sl=true;prog[k].sld=prog[k].sld||now();}
var qs=sop.qs||[];var total=qs.length||1;
var r={id:gid(),eid:eid,sc:sc,score:total,total:total,pct:100,pass:true,att:1,dt:now(),manual:true,manualReason:reason};
res.push(r);
notifs.unshift({id:gid(),type:'pass',en:emp.name,es:emp.site,sc:sc,pct:100,att:1,dt:now()});
var ok=await save();
if(!ok){alert('Save may have failed. Check your internet and try again.');return;}
render();alert(emp.name+' marked as PASSED for '+sc+'.');}

async function resetAttempts(eid,sc){var emp=emps.find(function(e){return e.id===eid});
var sop=sops.find(function(s){return s.code===sc});
if(!emp||!sop){alert('Employee or SOP not found');return;}
var att=getAtt(eid,sc);
if(!confirm('Reset all '+att.length+' failed attempts for '+emp.name+' on '+sop.title+' ('+sc+')?\n\nThis will remove their failed results and reset their progress so they can redo the full training module from scratch (read SOP, watch video, view slides, then assessment).\n\nOnly do this if you are satisfied the lock-out was due to a system issue.')){return;}
await reloadCritical();
removedResKeys.push(eid+'||'+sc);
res=res.filter(function(r){return!(r.eid===eid&&r.sc===sc)});
var k=eid+'_'+sc;prog[k]=prog[k]||{};prog[k].sr=false;prog[k].vw=false;prog[k].sl=false;
unlockLog.push({eid:eid,sc:sc,dt:now(),reason:'Admin reset attempts'});
var ok=await save();
if(!ok){alert('⚠️ Save may have failed — please check your internet and try again.');return;}
render();alert('✅ '+emp.name+' has been reset for '+sc+'. They can now redo the full training module from the beginning.');}

// Unlock
function showUnlock(eid){var emp=emps.find(function(e){return e.id===eid});
var lockedSops=sops.filter(function(s){return isLocked(eid,s.code)});
var reason=prompt('Unlock assessment for '+emp.name+'?\n\nLocked courses: '+lockedSops.map(function(s){return s.code}).join(', ')+'\n\nEnter reason for unlocking:');
if(reason===null)return;
lockedSops.forEach(function(s){
res=res.filter(function(r){return!(r.eid===eid&&r.sc===s.code)});
var k=eid+'_'+s.code;prog[k]=prog[k]||{};prog[k].sr=false;prog[k].vw=false;
unlockLog.push({eid:eid,sc:s.code,dt:now(),reason:reason||'No reason provided'});});
save();render();alert('Assessment unlocked for '+emp.name);}

// Sites
function addSite(){var v=document.getElementById('new-site').value.trim();if(!v)return;if(sites.indexOf(v)>=0){alert('Exists');return}
var reason=prompt('Reason for adding site "'+v+'" (REQUIRED — no note, no save):');if(reason===null)return;reason=(reason||'').trim();if(!reason){alert('A reason is required. Nothing was added.');return}
sites.push(v);if(typeof logAudit==='function')logAudit('ADD SITE',v,reason);save();if(typeof saveTNA==='function')saveTNA();render()}
function removeSite(s){var n=emps.filter(function(e){return e.site===s}).length;
if(!confirm('Remove site "'+s+'"?'+(n?'\n\n'+n+' employee(s) are currently at this site.':'')))return;
if(!confirm('ARE YOU SURE? This is recorded for audit. Click OK to confirm and enter a reason.'))return;
var reason=prompt('Reason for removing site "'+s+'" (REQUIRED — no note, no save):');if(reason===null)return;reason=(reason||'').trim();if(!reason){alert('A reason is required. Nothing was removed.');return}
sites=sites.filter(function(x){return x!==s});if(typeof logAudit==='function')logAudit('REMOVE SITE',s,reason);save();if(typeof saveTNA==='function')saveTNA();render()}
function clearNotifs(){notifs=[];save();render()}

// Employee management
function toggleAddEmp(){var el=document.getElementById('add-emp-form');if(el){el.classList.toggle('hide');if(!el.classList.contains('hide')){document.getElementById('edit-emp-id').value='';document.getElementById('emp-form-title').textContent='Add Employee';['nemp-id','nemp-idn','nemp-name','nemp-dept'].forEach(function(id){document.getElementById(id).value=''});document.getElementById('nemp-gender').value='';document.getElementById('nemp-site').value='';document.getElementById('nemp-pin').value='1234';}}
var bf=document.getElementById('bulk-emp-form');if(bf)bf.classList.add('hide');}
function toggleBulkEmp(){var el=document.getElementById('bulk-emp-form');if(el)el.classList.toggle('hide');var af=document.getElementById('add-emp-form');if(af)af.classList.add('hide');}
function saveEmp(){var eid=document.getElementById('nemp-id').value.trim();var idn=document.getElementById('nemp-idn').value.trim();
var name=document.getElementById('nemp-name').value.trim();var gender=document.getElementById('nemp-gender').value;
var dept=document.getElementById('nemp-dept').value.trim();var site=document.getElementById('nemp-site').value;var pin=document.getElementById('nemp-pin').value.trim()||'1234';
if(!eid||!name||!gender||!site){alert('Employee number, name, gender, site required');return}
var editId=document.getElementById('edit-emp-id').value;
if(editId){var idx=emps.findIndex(function(e){return e.id===editId});if(idx>=0)emps[idx]={id:eid,idn:idn,name:name,gender:gender,dept:dept,site:site,pin:pin};}
else{if(emps.some(function(e){return e.id.toUpperCase()===eid.toUpperCase()})){alert('Already exists');return}emps.push({id:eid,idn:idn,name:name,gender:gender,dept:dept,site:site,pin:pin});}
save();render();}
function editEmp(i){var e=emps[i];render();setTimeout(function(){var form=document.getElementById('add-emp-form');if(form)form.classList.remove('hide');
document.getElementById('edit-emp-id').value=e.id;document.getElementById('emp-form-title').textContent='Edit: '+e.name;
document.getElementById('nemp-id').value=e.id;document.getElementById('nemp-idn').value=e.idn;document.getElementById('nemp-name').value=e.name;
document.getElementById('nemp-gender').value=e.gender;document.getElementById('nemp-dept').value=e.dept;document.getElementById('nemp-site').value=e.site;document.getElementById('nemp-pin').value=e.pin;},50);}
function deleteEmp(eid){if(!confirm('Delete '+eid+'?'))return;emps=emps.filter(function(e){return e.id!==eid});save();render();}
function dlEmpTemplate(){var csv='EmployeeNumber,IDNumber,FullName,Gender,Department,Site,PIN\nOM006,9201015012083,John Smith,Male,Processing,Thutse Mining,1234\n';
var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='OneMining_Employee_Template.csv';a.click();}
function uploadEmpCSV(){var inp=document.createElement('input');inp.type='file';inp.accept='.csv';inp.onchange=function(e){var f=e.target.files[0];if(!f)return;var reader=new FileReader();reader.onload=function(ev){
var lines=ev.target.result.split('\n').filter(function(l){return l.trim()});var added=0,skipped=0;
lines.forEach(function(line,i){var cols=line.split(',').map(function(c){return c.trim().replace(/^"|"$/g,'')});
if(i===0&&cols[0].toLowerCase().indexOf('employee')>=0)return;if(cols.length<6)return;
var eid=cols[0];if(!eid||emps.some(function(e){return e.id.toUpperCase()===eid.toUpperCase()})){skipped++;return}
emps.push({id:eid,idn:cols[1]||'',name:cols[2],gender:cols[3],dept:cols[4],site:cols[5],pin:cols[6]||'1234'});added++;});
save();render();alert(added+' added, '+skipped+' skipped');};reader.readAsText(f)};inp.click();}
// === REPORT DOWNLOADS ===
function dlProofEmp(eid,sc){var pr=res.find(function(r){return r.eid===eid&&r.sc===sc&&r.pass});
if(!pr){alert('No passed assessment found.');return}dlProof(eid,sc,pr.score,pr.total,pr.pct,true,pr.att,pr.dt);}

function dlProof(eid,sc,score,total,pct,pass,att,dt,wrongs){
if(!wrongs){var pr=res.find(function(r){return r.eid===eid&&r.sc===sc&&r.pass&&r.wrongs});wrongs=pr&&pr.wrongs||[];}
var emp=emps.find(function(e){return e.id===eid});var sop=sops.find(function(s){return s.code===sc});if(!emp||!sop)return;
var w=window.open('','_blank');
w.document.write('<!DOCTYPE html><html><head><title>Assessment - '+emp.name+'</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;color:#243034;padding:40px;max-width:800px;margin:0 auto}.hdr{text-align:center;padding-bottom:24px;border-bottom:4px solid #FBB227;margin-bottom:30px}.hdr h1{font-size:1.8rem;font-weight:800}.gold{color:#FBB227}.hdr p{font-size:.85rem;color:#6B7280;margin-top:4px}.ttl{text-align:center;margin:24px 0;font-size:1.3rem;font-weight:700;text-transform:uppercase;letter-spacing:2px}.rb{text-align:center;margin:24px 0;padding:20px;border-radius:12px}.rb.ps{background:rgba(34,197,94,.1);border:2px solid #22C55E}.rb.fl{background:rgba(239,68,68,.1);border:2px solid #EF4444}.rb .s{font-size:2.5rem;font-weight:800}.rb.ps .s{color:#22C55E}.rb.fl .s{color:#EF4444}.rb .st{font-size:1.2rem;font-weight:700;text-transform:uppercase;margin-top:4px}table{width:100%;border-collapse:collapse;margin:20px 0}td{padding:10px 16px;border:1px solid #e5e7eb;font-size:.9rem}td:first-child{font-weight:700;background:#f8f9fa;width:200px;text-transform:uppercase;font-size:.78rem;color:#6B7280}.sig{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}.sbox{border-top:2px solid #243034;padding-top:8px;margin-top:40px}.sbox p{font-size:.8rem;color:#6B7280}.ftr{margin-top:40px;padding-top:16px;border-top:2px solid #FBB227;text-align:center;font-size:.75rem;color:#6B7280}.wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:6rem;font-weight:800;opacity:.04;pointer-events:none}</style></head><body>');
w.document.write('<div class="wm">ONE MINING</div><div class="hdr"><h1>One <span class="gold">Mining</span></h1><p>Training Management System</p></div>');
w.document.write('<div class="ttl">'+(pass?'Certificate of Competency':'Assessment Record')+'</div>');
w.document.write('<div class="rb '+(pass?'ps':'fl')+'"><div class="s">'+pct+'%</div><div class="st">'+(pass?'COMPETENT':'NOT YET COMPETENT')+'</div></div>');
w.document.write('<table><tr><td>Employee Name</td><td>'+emp.name+'</td></tr><tr><td>Employee Number</td><td>'+emp.id+'</td></tr><tr><td>ID Number</td><td>'+emp.idn+'</td></tr><tr><td>Gender</td><td>'+emp.gender+'</td></tr><tr><td>Site</td><td>'+emp.site+'</td></tr><tr><td>Department</td><td>'+emp.dept+'</td></tr></table>');
w.document.write('<table><tr><td>SOP Code</td><td>'+sop.code+'</td></tr><tr><td>SOP Title</td><td>'+sop.title+'</td></tr><tr><td>Revision</td><td>'+sop.rev+'</td></tr></table>');
w.document.write('<table><tr><td>Score</td><td>'+score+'/'+total+' ('+pct+'%)</td></tr><tr><td>Competency Mark</td><td>100% ('+total+'/'+total+')</td></tr><tr><td>Result</td><td style="font-weight:700;color:'+(pass?'#22C55E':'#EF4444')+'">'+(pass?'COMPETENT':'NOT YET COMPETENT')+'</td></tr><tr><td>Attempt</td><td>'+att+'/3</td></tr><tr><td>Date</td><td>'+fd(dt)+'</td></tr></table>');
if(pass&&wrongs&&wrongs.length){w.document.write('<div style="margin:24px 0;border-left:4px solid #FBB227;padding:16px 20px;background:#FFFBEB;border-radius:0 8px 8px 0;page-break-inside:avoid"><h3 style="font-size:1rem;font-weight:700;color:#243034;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">Review — Incorrect Answers</h3><p style="font-size:.82rem;color:#6B7280;margin-bottom:14px">You passed, but review the following questions to strengthen your understanding:</p>');wrongs.forEach(function(wr){w.document.write('<div style="padding:10px 0;border-bottom:1px solid #F0E6C8"><div style="font-weight:600;color:#243034;font-size:.88rem;margin-bottom:4px">Q'+wr.n+'. '+wr.t+'</div><div style="font-size:.82rem;color:#EF4444;margin-bottom:2px">✗ Your answer: '+wr.yours+'</div><div style="font-size:.82rem;color:#22C55E;font-weight:600">✓ Correct answer: '+wr.correct+'</div></div>')});w.document.write('</div>');}
w.document.write('<div class="sig"><div><div class="sbox"><p>Employee Signature</p></div><p style="margin-top:8px;font-size:.82rem">'+emp.name+'</p></div><div><div class="sbox"><p>Assessor Signature</p></div><p style="margin-top:8px;font-size:.82rem">Name: _________________________</p></div></div>');
w.document.write('<div class="sig"><div><div class="sbox"><p>Date</p></div></div><div><div class="sbox"><p>Training Manager</p></div></div></div>');
w.document.write('<div class="ftr"><p><b>One Mining (Pty) Ltd</b> — Training Management System</p><p>'+sop.code+' | '+sop.rev+' | Generated '+fd(now())+'</p><p style="margin-top:6px">Official proof of assessment. Retain for compliance.</p></div></body></html>');
w.document.close();setTimeout(function(){w.print()},500);}

function dashReport(){
var hasFilter=((adminSites&&adminSites.length)||(adminDepts&&adminDepts.length)||(adminSops&&adminSops.length)||adminEmpF);
if(hasFilter){ if(confirm('Compliance report:\n\nOK = FULL report (all employees & courses)\nCancel = ONLY your current on-screen selection')) dlReport('full'); else dlReport('dashfilter'); }
else dlReport('full');
}
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
w.document.write('<h2>Training Status</h2><table><thead><tr><th>#</th><th>SOP Code</th><th>Title</th><th>Status</th><th>Score</th><th>Competency Mark</th><th>Attempts</th><th>Date</th></tr></thead><tbody>');
ea.forEach(function(a,i){var sop=sops.find(function(s){return s.code===a.sc});var st=getStatus(emp.id,a.sc);var att=getAtt(emp.id,a.sc);var pr=att.find(function(r){return r.pass});
var stTxt=st==='passed'?'COMPETENT':st==='locked'?'LOCKED':st==='progress'?'IN PROGRESS':'OUTSTANDING';
var stCls=st==='passed'?'pass':st==='locked'?'fail':'';
w.document.write('<tr><td>'+(i+1)+'</td><td>'+a.sc+'</td><td>'+(sop?sop.title:'')+'</td><td class="'+stCls+'">'+stTxt+'</td><td>'+(pr?pr.pct+'%':att.length?att[att.length-1].pct+'%':'-')+'</td><td>100%</td><td>'+att.length+'/3</td><td>'+(pr?fd(pr.dt):'-')+'</td></tr>');});
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
w.document.write('<table><thead><tr><th>Emp#</th><th>Name</th><th>ID Number</th><th>Gender</th><th>Site</th><th>Status</th><th>Score</th><th>Competency Mark</th><th>Attempts</th><th>Date</th></tr></thead><tbody>');
sopAssigns.forEach(function(a){var emp=emps.find(function(e){return e.id===a.eid});var st=getStatus(a.eid,sop.code);var att=getAtt(a.eid,sop.code);var pr=att.find(function(r){return r.pass});
var stTxt=st==='passed'?'COMPETENT':st==='locked'?'LOCKED':st==='progress'?'IN PROGRESS':'OUTSTANDING';
w.document.write('<tr><td>'+(emp?emp.id:'')+'</td><td>'+(emp?emp.name:'')+'</td><td>'+(emp?emp.idn:'')+'</td><td>'+(emp?emp.gender:'')+'</td><td>'+(emp?emp.site:'')+'</td><td class="'+(st==='passed'?'pass':st==='locked'?'fail':'')+'">'+stTxt+'</td><td>'+(pr?pr.pct+'%':att.length?att[att.length-1].pct+'%':'-')+'</td><td>100%</td><td>'+att.length+'/3</td><td>'+(pr?fd(pr.dt):'-')+'</td></tr>');});
w.document.write('</tbody></table>');});}
else if(type==='dashfilter'){
var fe=emps.filter(function(e){ if(adminSites.length&&adminSites.indexOf(e.site)<0)return false; if(adminDepts.length&&adminDepts.indexOf(e.dept||'')<0)return false; if(adminEmpF){var q=adminEmpF.toLowerCase(); if((e.name+' '+e.id).toLowerCase().indexOf(q)<0)return false;} return true;});
var fcodes=(adminSops&&adminSops.length)?adminSops:null;
w.document.write('<h2>Compliance Report — Current Selection</h2>');
w.document.write('<p style="font-size:11px;margin-bottom:8px">Filter: '+(adminSites.length?'Sites: '+adminSites.join(', '):'All sites')+' | '+(adminDepts.length?'Depts: '+adminDepts.join(', '):'All departments')+' | '+(fcodes?'Courses: '+fcodes.join(', '):'All courses')+(adminEmpF?' | Search: '+adminEmpF:'')+' &middot; '+fe.length+' employees</p>');
w.document.write('<table><thead><tr><th>Emp#</th><th>Name</th><th>ID Number</th><th>Gender</th><th>Site</th><th>Dept</th><th>SOP</th><th>Status</th><th>Score</th><th>Competency Mark</th><th>Attempts</th><th>Date</th></tr></thead><tbody>');
fe.forEach(function(emp){var ea=getEmpAssigns(emp.id); if(fcodes)ea=ea.filter(function(a){return fcodes.indexOf(a.sc)>=0;});
if(!ea.length){w.document.write('<tr><td>'+emp.id+'</td><td>'+emp.name+'</td><td>'+emp.idn+'</td><td>'+emp.gender+'</td><td>'+emp.site+'</td><td>'+emp.dept+'</td><td colspan="6" style="color:#6B7280">No training in selection</td></tr>');return;}
ea.forEach(function(a,si){var st=getStatus(emp.id,a.sc);var att=getAtt(emp.id,a.sc);var pr=att.find(function(r){return r.pass});
var stTxt=st==='passed'?'COMPETENT':st==='locked'?'LOCKED':st==='progress'?'IN PROGRESS':'OUTSTANDING';
w.document.write('<tr>'+(si===0?'<td rowspan="'+ea.length+'">'+emp.id+'</td><td rowspan="'+ea.length+'">'+emp.name+'</td><td rowspan="'+ea.length+'">'+emp.idn+'</td><td rowspan="'+ea.length+'">'+emp.gender+'</td><td rowspan="'+ea.length+'">'+emp.site+'</td><td rowspan="'+ea.length+'">'+emp.dept+'</td>':'')+'<td>'+a.sc+'</td><td class="'+(st==='passed'?'pass':st==='locked'?'fail':'')+'">'+stTxt+'</td><td>'+(pr?pr.pct+'%':att.length?att[att.length-1].pct+'%':'-')+'</td><td>100%</td><td>'+att.length+'/3</td><td>'+(pr?fd(pr.dt):'-')+'</td></tr>');});});
w.document.write('</tbody></table>');}
else{// full
w.document.write('<h2>Full Compliance Report — All Employees</h2>');
w.document.write('<table><thead><tr><th>Emp#</th><th>Name</th><th>ID Number</th><th>Gender</th><th>Site</th><th>Dept</th><th>SOP</th><th>Status</th><th>Score</th><th>Competency Mark</th><th>Attempts</th><th>Date</th></tr></thead><tbody>');
emps.forEach(function(emp){var ea=getEmpAssigns(emp.id);
if(!ea.length){w.document.write('<tr><td>'+emp.id+'</td><td>'+emp.name+'</td><td>'+emp.idn+'</td><td>'+emp.gender+'</td><td>'+emp.site+'</td><td>'+emp.dept+'</td><td colspan="6" style="color:#6B7280">No training assigned</td></tr>');return;}
ea.forEach(function(a,si){var sop=sops.find(function(s){return s.code===a.sc});var st=getStatus(emp.id,a.sc);var att=getAtt(emp.id,a.sc);var pr=att.find(function(r){return r.pass});
var stTxt=st==='passed'?'COMPETENT':st==='locked'?'LOCKED':st==='progress'?'IN PROGRESS':'OUTSTANDING';
w.document.write('<tr>'+(si===0?'<td rowspan="'+ea.length+'">'+emp.id+'</td><td rowspan="'+ea.length+'">'+emp.name+'</td><td rowspan="'+ea.length+'">'+emp.idn+'</td><td rowspan="'+ea.length+'">'+emp.gender+'</td><td rowspan="'+ea.length+'">'+emp.site+'</td><td rowspan="'+ea.length+'">'+emp.dept+'</td>':'')+'<td>'+a.sc+'</td><td class="'+(st==='passed'?'pass':st==='locked'?'fail':'')+'">'+stTxt+'</td><td>'+(pr?pr.pct+'%':att.length?att[att.length-1].pct+'%':'-')+'</td><td>100%</td><td>'+att.length+'/3</td><td>'+(pr?fd(pr.dt):'-')+'</td></tr>');});});
w.document.write('</tbody></table>');}
w.document.write('<div class="ftr"><p><b>One Mining (Pty) Ltd</b> — Training Management System</p><p>Generated '+fd(now())+' | Confidential — For compliance use only</p></div></body></html>');
w.document.close();setTimeout(function(){w.print()},500);}

// One Mining Training Demo — TNA/Competence build
init();
