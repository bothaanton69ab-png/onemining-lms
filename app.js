// === SUPABASE DATA LAYER ===
function gid(){return Math.random().toString(36).substr(2,9)}
function now(){return new Date().toISOString()}
function fd(d){if(!d)return'-';return new Date(d).toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'})}
function bg(t,c){var m={gold:'b-gd',green:'b-gn',red:'b-rd',blue:'b-bl',gray:'b-gy'};return'<span class="b '+(m[c]||'b-gy')+'">'+t+'</span>'}
var onboarding=[], acks=[], activeOnb=null, libSearch='', libCat='', libProg='';
var asgnJobMode='individual', asgnJobEid='', asgnJobSite='', asgnJobDept='';
var contentEditId=null, contentSearch='';
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
        var { data, error } = await sb.from(TENANT_TABLE).select('value').eq('key', key).single();
        if (error || !data) return fallback;
        return data.value;
    } catch(e) { return fallback; }
}

// Save one key to Supabase
async function cloudSave(key, value) {
    try {
        var { error } = await sb.from(TENANT_TABLE).upsert({ key: key, value: value, updated_at: new Date().toISOString() });
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
        try{ acks = mergeById(await cloudLoad('acks', []), acks); }catch(e){}
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
        cloudSave('unlock', unlockLog),
        cloudSave('onboarding', onboarding),
        cloudSave('acks', acks)
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
        onboarding = await cloudLoad('onboarding', []);
        acks = await cloudLoad('acks', []);
        await tnaLoad();
        await indLoad();
        render();
    } catch(e) {
        console.error('Failed to load data:', e);
        document.getElementById('app').innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:Arial;background:#243034;color:#fff"><h1 style="font-size:1.6rem;font-weight:800;margin-bottom:8px">'+BRAND.name+'</h1><p style="color:#EF4444">Failed to connect to database. Please check your internet connection and try again.</p><button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:#FBB227;border:none;border-radius:8px;font-weight:600;cursor:pointer">Retry</button></div>';
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
var sb='<aside class="sb"><div class="sb-brand"><div class="sb-logo"><img src="'+BRAND.logo+'" alt=""></div><h2>'+BRAND.name+'</h2><p>'+BRAND.tagline+'</p></div><div class="sb-nav">';
sb+='<div class="ni'+(page==='dashboard'&&!activeSop?' a':'')+'" onclick="goPage(\'dashboard\')">📊 Dashboard</div>';
if(isA)sb+='<div class="ni'+(page==='library'||activeSop?' a':'')+'" onclick="goPage(\'library\')">📚 Training Library</div>';
if(!isA){
sb+='<div class="sb-sec">MY JOURNEY</div>';
var _onbOut=onbOutstanding(user.id);
sb+='<div class="ni'+(page==='onboard'?' a':'')+'" onclick="goPage(\'onboard\')">🤝 Onboarding'+(_onbOut?' '+bg(_onbOut,'gold'):'')+'</div>';
sb+='<div class="ni'+(page==='myind'?' a':'')+'" onclick="goPage(\'myind\')">⛑️ Mine Induction</div>';
sb+='<div class="ni'+((page==='library'||activeSop)?' a':'')+'" onclick="goPage(\'library\')">'+(indCompetent(user.id)?'🎯':'🔒')+' My Competency</div>';
sb+='<div class="sb-sec">MY RECORDS</div>';
sb+='<div class="ni'+(page==='myres'?' a':'')+'" onclick="goPage(\'myres\')">📋 Training Records</div>';
}
if(isA){
sb+='<div class="sb-sec">SET UP</div>';
sb+='<div class="ni'+(page==='mind'?' a':'')+'" onclick="goPage(\'mind\')">🎓 Manage Induction</div>';
sb+='<div class="ni'+(page==='monb'?' a':'')+'" onclick="goPage(\'monb\')">🤝 Manage Onboarding</div>';
sb+='<div class="ni'+(page==='tax'?' a':'')+'" onclick="goPage(\'tax\')">🗂️ Programmes & Categories</div>';
sb+='<div class="ni'+(page==='mint'?' a':'')+'" onclick="goPage(\'mint\')">🧩 Interventions</div>';
sb+='<div class="ni'+(page==='mjp'?' a':'')+'" onclick="goPage(\'mjp\')">🏷️ Job Profiles</div>';
sb+='<div class="ni'+(page==='msops'?' a':'')+'" onclick="goPage(\'msops\')">⚙️ Manage Training Content</div>';
sb+='<div class="ni'+(page==='smgmt'?' a':'')+'" onclick="goPage(\'smgmt\')">🏭 Manage Sites</div>';
sb+='<div class="sb-sec">ASSIGN</div>';
sb+='<div class="ni'+(page==='iassign'?' a':'')+'" onclick="goPage(\'iassign\')">➕ Bulk Assign</div>';
sb+='<div class="ni'+(page==='massign'?' a':'')+'" onclick="goPage(\'massign\')">🔗 Assign Courses</div>';
sb+='<div class="ni'+(page==='tnaimp'?' a':'')+'" onclick="goPage(\'tnaimp\')">⬆️ TNA Import</div>';
sb+='<div class="sb-sec">PEOPLE</div>';
sb+='<div class="ni'+(page==='memps'?' a':'')+'" onclick="goPage(\'memps\')">👤 Manage Employees</div>';
sb+='<div class="ni'+(page==='emprec'?' a':'')+'" onclick="goPage(\'emprec\')">👥 Training Records</div>';
sb+='<div class="ni'+(page==='mmgr'?' a':'')+'" onclick="goPage(\'mmgr\')">👔 Manager Accounts</div>';
sb+='<div class="sb-sec">MONITOR & COMPLIANCE</div>';
sb+='<div class="ni'+(page==='comp'?' a':'')+'" onclick="goPage(\'comp\')">🎯 Competence</div>';
sb+='<div class="ni'+(page==='expiry'?' a':'')+'" onclick="goPage(\'expiry\')">⏰ Expiry & Renewals</div>';
sb+='<div class="ni'+(page==='reports'?' a':'')+'" onclick="goPage(\'reports\')">📈 Reports</div>';
sb+='<div class="ni'+(page==='onbproof'?' a':'')+'" onclick="goPage(\'onbproof\')">🤝 Onboarding Proof</div>';
sb+='<div class="ni'+(page==='anot'?' a':'')+'" onclick="goPage(\'anot\')">🔔 Notifications'+(notifs.length?' '+bg(notifs.length,'gold'):'')+' </div>';
sb+='<div class="ni'+(page==='audit'?' a':'')+'" onclick="goPage(\'audit\')">📜 Audit Log</div>';
sb+='<div class="ni'+(page==='soparch'?' a':'')+'" onclick="goPage(\'soparch\')">🗄️ Training Archive</div>';}
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
else if(page==='onboard'&&!isA)mc+=(activeOnb?renderOnbItem():renderOnboarding());
else if(page==='monb'&&isA)mc+=renderMOnb();
else if(page==='onbproof'&&isA)mc+=renderOnbProof();
else if(page==='tax'&&isA)mc+=renderTax();
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
return'<div class="login-bg"><div class="login-card"><div class="login-logo"><img src="'+BRAND.logo+'" class="login-logo-img" alt=""><p>Training Management System</p></div>'+
'<div class="fg"><label>Login as</label><select id="login-mode" onchange="loginModeChange()" style="width:100%;padding:10px 12px;border:2px solid #e2e5e9;border-radius:8px"><option value="emp">Employee</option><option value="manager">Manager / Training Dept</option><option value="admin">Admin</option></select></div>'+
'<div id="emp-fields" class="fg"><label id="login-eid-lbl">Employee Number</label><input id="login-eid" placeholder="e.g. OM001"></div>'+
'<div class="fg"><label id="login-lbl">PIN</label><input type="password" id="login-pin" onkeydown="if(event.key===\'Enter\')doLogin()"></div>'+
'<div id="login-err" style="color:#EF4444;font-size:.82rem;margin-bottom:12px"></div>'+
'<button class="btn btn-p" onclick="doLogin()">Sign In</button>'+
'<p style="font-size:.74rem;color:#6B7280;margin-top:14px;text-align:center">Employee: ID + PIN · Manager: username + password</p></div></div>';
}

// === EMPLOYEE DASHBOARD ===
function renderEmpDash(){
var eid=user.id;
var onbItems=onboarding.filter(function(o){return onbVisible(o,eid);});
var onbDone=onbItems.filter(function(o){return onbAcked(eid,o.id);}).length;
var onbPct=onbItems.length?Math.round(onbDone/onbItems.length*100):100;
var ic=indCounts(eid);var indOk=indCompetent(eid);var indPct=ic.total?Math.round(ic.done/ic.total*100):(indOk?100:0);
var ea=getEmpAssigns(eid);var compDone=ea.filter(function(a){return hasPassed(eid,a.sc);}).length;
var compPct=ea.length?Math.round(compDone/ea.length*100):100;
var initials=user.name.split(' ').map(function(n){return n[0]}).join('');
var next=null;
if(onbItems.length&&onbDone<onbItems.length)next={t:'Continue Onboarding',p:'onboard'};
else if(!indOk)next={t:'Continue Mine Induction',p:'myind'};
else if(ea.length&&compDone<ea.length)next={t:'Continue My Competency',p:'library'};
var h='<div class="topbar"><h1>My Compliance Journey</h1></div><div class="pc">';
h+='<div class="card"><div class="cb"><div class="profile-card"><div class="profile-avatar">'+initials+'</div><div class="profile-info">';
h+='<h2 style="font-size:1.15rem;font-weight:700;margin-bottom:4px">'+user.name+'</h2>';
h+='<p style="font-size:.82rem;color:#6B7280"><b>#'+user.id+'</b> · '+user.dept+' · '+user.site+'</p></div>';
h+='<div style="margin-left:auto;text-align:center">'+(indOk?'<div style="background:#e7f7ec;color:#15803d;border:1px solid #86efac;border-radius:10px;padding:10px 16px;font-weight:700">✅ Cleared for site</div>':'<div style="background:#fef2f2;color:#b91c1c;border:1px solid #fca5a5;border-radius:10px;padding:9px 15px;font-weight:700">⛔ Not yet cleared<br><span style="font-weight:500;font-size:.74rem">Complete your Mine Induction</span></div>')+'</div>';
h+='</div></div></div>';
if(next)h+='<div class="card" style="border-left:4px solid #FBB227"><div class="cb" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><b>Your next step</b><p style="color:#6B7280;font-size:.85rem;margin-top:2px">Pick up where you left off.</p></div><button class="btn btn-p" style="width:auto;padding:11px 26px" onclick="goPage(\''+next.p+'\')">'+next.t+' →</button></div></div>';
else h+='<div class="card" style="border-left:4px solid #22C55E"><div class="cb"><b style="color:#15803d">🎉 You are fully up to date.</b><p style="color:#6B7280;font-size:.85rem;margin-top:2px">All onboarding, induction and job competency requirements are complete.</p></div></div>';
h+='<div class="sg" style="grid-template-columns:repeat(3,1fr)">';
h+=journeyCard('🤝 Onboarding','Company & HR policies',onbPct,onbDone,onbItems.length,'onboard',false);
h+=journeyCard('⛑️ Mine Induction','Cleared for site',indPct,ic.done,ic.total,'myind',false);
h+=journeyCard('🎯 My Competency','Job training',compPct,compDone,ea.length,'library',!indOk);
h+='</div></div>';return h;
}
function journeyCard(title,sub,pct,done,total,pg,locked){
var col=pct>=100?'gn':'gd';
var h='<div class="card" style="cursor:'+(locked?'default':'pointer')+'" '+(locked?'':'onclick="goPage(\''+pg+'\')"')+'><div class="cb">';
h+='<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:.95rem">'+title+'</b><span style="font-size:1.1rem">'+(locked?'🔒':(pct>=100?'✅':'▶'))+'</span></div>';
h+='<p style="font-size:.76rem;color:#6B7280;margin:2px 0 10px">'+sub+'</p>';
if(locked)h+='<p style="font-size:.8rem;color:#b45309">Unlocks after induction</p>';
else{h+='<div class="pb"><div class="pf '+col+'" style="width:'+pct+'%"></div></div>';
h+='<p style="font-size:.78rem;color:#6B7280;margin-top:6px">'+(total?done+' of '+total+' done · '+pct+'%':'Nothing assigned yet')+'</p>';}
h+='</div></div>';return h;
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
if(!isA && !indCompetent(user.id)) return '<div class="topbar"><h1>My Competency</h1></div><div class="pc"><div class="card"><div class="cb" style="text-align:center;padding:34px"><div style="font-size:2.2rem">🔒</div><h2 style="margin:8px 0">Complete your Mine Induction first</h2><p style="color:#6B7280;max-width:520px;margin:0 auto 16px">Your job-specific training unlocks once your Mine Induction is complete. This is a legal requirement — no person may perform work on the mine until induction is done.</p><button class="btn btn-p" style="width:auto;padding:11px 30px" onclick="goPage(\'myind\')">Go to Mine Induction</button></div></div></div>';
var h='<div class="topbar"><h1>'+(isA?'Training Library':'My Competency')+'</h1></div><div class="pc">';
var ea=isA?null:getEmpAssigns(user.id);
var baseSops=isA?sops:sops.filter(function(s){return ea.some(function(a){return a.sc===s.code})});
if(!isA&&!baseSops.length)return h+'<div class="card"><div class="cb"><p style="text-align:center;color:#6B7280;padding:24px">No training assigned yet. Contact your administrator.</p></div></div></div>';
var q=(typeof libSearch!=="undefined"?(libSearch||""):"");
function chip(active,label,onclick){ return '<span style="cursor:pointer;display:inline-flex;padding:6px 13px;border-radius:20px;font-size:.8rem;font-weight:600;margin:0 8px 8px 0;border:1.5px solid '+(active?'#FBB227':'#d7dbe0')+';background:'+(active?'#FBB227':'#fff')+';color:'+(active?'#243034':'#4b5563')+'" onclick="'+onclick+'">'+label+'</span>'; }
var progs=[]; baseSops.forEach(function(s){ if(s.programme&&progs.indexOf(s.programme)<0)progs.push(s.programme); });
if(typeof programmes==='function'){ var ord=programmes(); progs.sort(function(a,b){var ia=ord.indexOf(a),ib=ord.indexOf(b);return (ia<0?99:ia)-(ib<0?99:ib);}); }
var cats=[]; baseSops.forEach(function(s){ if(s.cat&&cats.indexOf(s.cat)<0)cats.push(s.cat); }); cats.sort();
h+='<div class="card"><div class="cb">';
h+='<input id="lib-search" placeholder="🔎 Search subject, code or title, then press Enter — e.g. waste, env, SOP" value="'+q.replace(/"/g,"&quot;")+'" onchange="libSearch=this.value;render()" onkeydown="if(event.key===\'Enter\'){libSearch=this.value;render()}" style="width:100%;padding:11px 14px;border:2px solid #e2e5e9;border-radius:8px;font-size:.95rem">';
if(progs.length){h+='<div style="margin-top:12px"><div style="font-size:.7rem;font-weight:700;letter-spacing:.05em;color:#9099a3;text-transform:uppercase;margin-bottom:6px">Programme</div>';
h+=chip(!libProg,'All','libProg=\'\';render()');
progs.forEach(function(pr){ h+=chip(libProg===pr,pr,'libPickProg(\''+encodeURIComponent(pr)+'\')'); });
h+='</div>';}
if(cats.length){h+='<div style="margin-top:10px"><div style="font-size:.7rem;font-weight:700;letter-spacing:.05em;color:#9099a3;text-transform:uppercase;margin-bottom:6px">Category</div>';
h+=chip(!libCat,'All','libCat=\'\';render()');
cats.forEach(function(c){ h+=chip(libCat===c,c,'libPick(\''+encodeURIComponent(c)+'\')'); });
h+='</div>';}
if(q||libCat||libProg)h+='<div style="margin-top:10px;font-size:.78rem;color:#6B7280">Filtered'+(libProg?' · <b>'+libProg+'</b>':'')+(libCat?' · <b>'+libCat+'</b>':'')+(q?' · "<b>'+q.replace(/</g,'&lt;')+'</b>"':'')+' <span style="color:#FBB227;cursor:pointer;font-weight:600" onclick="libSearch=\'\';libCat=\'\';libProg=\'\';render()">clear all</span></div>';
h+='</div></div>';
var showSops=baseSops.slice();
if(libProg) showSops=showSops.filter(function(s){return s.programme===libProg;});
if(libCat) showSops=showSops.filter(function(s){return s.cat===libCat;});
if(q){var lq=q.toLowerCase();showSops=showSops.filter(function(s){return ((s.code||"")+" "+(s.title||"")+" "+(s.programme||"")+" "+(s.cat||"")+" "+(s.desc||"")).toLowerCase().indexOf(lq)>=0;});}
if(!showSops.length)return h+'<div class="card"><div class="cb" style="text-align:center;color:#6B7280;padding:24px">Nothing matches. Try another word or clear the filter.</div></div></div>';
var groups={},order=[];
showSops.forEach(function(s){ var k=s.programme||s.cat||'Unclassified'; if(!groups[k]){groups[k]=[];order.push(k);} groups[k].push(s); });
if(typeof programmes==='function'){ var po=programmes(); order.sort(function(a,b){var ia=po.indexOf(a),ib=po.indexOf(b);if(ia<0&&ib<0)return a.localeCompare(b);return (ia<0?99:ia)-(ib<0?99:ib);}); } else order.sort();
order.forEach(function(k){
h+='<div style="display:flex;align-items:center;gap:10px;margin:20px 4px 10px"><h3 style="font-size:.95rem;color:#243034">'+k+'</h3><span class="b b-gy">'+groups[k].length+'</span><div style="flex:1;height:1px;background:#e5e7eb"></div></div>';
h+='<div class="spg">';
groups[k].forEach(function(s){
var ps=!isA&&hasPassed(user.id,s.code);var lk=!isA&&isLocked(user.id,s.code);
var att=!isA?getAtt(user.id,s.code):[];
var ca=isA||canAccess(user.id,s.code);
var locked=!isA&&!ca;
h+='<div class="spc'+(locked?' locked':'')+'" onclick="'+(locked?'alert(\'Complete the previous training first\')':'openSop(\''+s.id+'\')')+'"><div class="cd">'+(locked?'🔒 ':'')+s.code+' · '+s.rev+'</div><h4>'+s.title+'</h4><p>'+(s.desc||'')+'</p>';
h+='<div class="mt">'+(s.programme?bg(s.programme,'gold'):'')+bg(s.cat,'blue')+bg(s.qs.length+' Qs','gray')+bg(s.site,'gray');
if(!isA){if(ps)h+=bg('✓ Completed','green');else if(lk)h+=bg('Locked','red');else if(locked)h+=bg('🔒 Complete Previous','gray');else if(att.length)h+=bg(att.length+'/3','gold');}
h+='</div></div>';
});
h+='</div>';
});
return h+'</div>';
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
else h+='<div style="background:#000;border-radius:10px;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;margin-bottom:16px"><p style="color:#fff;text-align:center;font-weight:600">Training Video<br><span style="font-size:.78rem;opacity:.5">'+(isA?'Upload via Manage Training Content':'No video yet')+'</span></p></div>';
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
if(ps){ if(s.ackRequired&&!sopAcked(user.id,s.code)) return '<div class="card" style="border-left:4px solid #FBB227"><div class="ch"><h3>Final step — Acknowledgement</h3></div><div class="cb"><div style="text-align:center;margin-bottom:14px"><div class="ri ps">✓</div><h2 style="color:#22C55E">Assessment passed</h2><p style="color:#6B7280;margin-top:6px">One last step to complete this module.</p></div><label style="display:flex;gap:10px;align-items:flex-start;font-size:.92rem"><input type="checkbox" id="sop-ack" style="margin-top:3px;width:18px;height:18px"> <span>'+(s.ackText||SOP_ACK_DEFAULT)+'</span></label><div style="text-align:center;margin-top:14px"><button class="btn btn-p" style="width:auto;padding:12px 40px" onclick="acknowledgeSop(\''+s.code+'\')">Acknowledge &amp; Complete</button></div></div></div>'; var _ar=sopAckRec(user.id,s.code); return '<div class="card"><div class="cb" style="text-align:center;padding:40px"><div class="ri ps">✓</div><h2 style="color:#22C55E">Competent</h2><p style="color:#6B7280;margin-top:8px">Training module completed.'+(_ar?'<br>Acknowledged '+fd(_ar.at):'')+'</p><button class="btn btn-p" style="width:auto;margin-top:16px" onclick="dlProofEmp(\''+user.id+'\',\''+s.code+'\')">📥 Download Proof</button></div></div>'; }
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
var h='<div class="topbar"><h1>Assign Courses</h1></div><div class="pc">';

// ============ Card 1: Assign by Job Profile (one-click) ============
h+='<div class="card" style="border-left:4px solid #FBB227"><div class="ch"><h3>🎯 Assign by Job Profile</h3></div><div class="cb">';
h+='<p style="color:#6B7280;font-size:.85rem;margin-bottom:12px">Hand a person — or a whole site or department — every course their job requires, in one click. The required list comes from each person\'s job profile; this assigns the linked training modules they still need.</p>';
h+='<div class="fg" style="max-width:360px"><label>Assign for</label><select id="jb-mode" onchange="asgnJobMode=this.value;asgnJobEid=\'\';asgnJobSite=\'\';render()">';
[['individual','One employee'],['site','Everyone at a site'],['dept','Everyone in a department'],['all','Everyone']].forEach(function(o){ h+='<option value="'+o[0]+'"'+(asgnJobMode===o[0]?' selected':'')+'>'+o[1]+'</option>'; });
h+='</select></div>';
if(asgnJobMode==='individual'){
  h+='<div class="fg" style="max-width:520px"><label>Employee</label><input id="jb-search" placeholder="Search name or number..." oninput="filterJbEmps()" style="margin-bottom:6px"><select id="jb-emp" size="6" onchange="asgnJobEid=this.value;render()" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:4px"><option value="">Select...</option>';
  emps.forEach(function(e){ h+='<option value="'+e.id+'"'+(asgnJobEid===e.id?' selected':'')+'>'+e.id+' — '+e.name+' ('+e.site+')</option>'; });
  h+='</select></div>';
  if(asgnJobEid){ h+=jobPreviewIndividual(asgnJobEid); }
}else if(asgnJobMode==='site'){
  h+='<div class="fg" style="max-width:360px"><label>Site</label><select id="jb-site" onchange="asgnJobSite=this.value;render()"><option value="">Select...</option>';
  sites.forEach(function(s){ h+='<option'+(asgnJobSite===s?' selected':'')+'>'+s+'</option>'; });
  h+='</select></div>';
  if(asgnJobSite) h+=jobPreviewGroup();
}else if(asgnJobMode==='dept'){
  h+='<div class="fg" style="max-width:360px"><label>Department contains</label><input id="jb-dept" value="'+(asgnJobDept||'').replace(/"/g,'&quot;')+'" placeholder="e.g. Processing" onchange="asgnJobDept=this.value;render()"></div>';
  if(asgnJobDept) h+=jobPreviewGroup();
}else{ h+=jobPreviewGroup(); }
h+='</div></div>';

// ============ Card 2: Assign specific courses (manual) ============
h+='<div class="card"><div class="ch"><h3>➕ Assign specific courses (manual)</h3></div><div class="cb">';
h+='<p style="color:#6B7280;font-size:.82rem;margin-bottom:12px">For ad-hoc extras — pick any courses and assign them to a person, site or department.</p>';
h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">';
h+='<div class="fg"><label>Assign To</label><select id="asgn-mode" onchange="var m=this.value;document.getElementById(\'asgn-emp-row\').className=\'fg\'+(m===\'individual\'?\'\':\' hide\');document.getElementById(\'asgn-site-row\').className=\'fg\'+(m===\'site\'?\'\':\' hide\');document.getElementById(\'asgn-dept-row\').className=\'fg\'+(m===\'dept\'?\'\':\' hide\')"><option value="individual">Individual Employee</option><option value="site">All at Site</option><option value="dept">All in Department</option></select></div>';
h+='<div class="fg"><label>Training Courses <span style="font-weight:400;color:#6B7280;font-size:.8rem">(select one or more)</span></label><div style="border:1px solid #d1d5db;border-radius:8px;max-height:180px;overflow-y:auto;padding:8px">';
sops.forEach(function(s){ h+='<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:.9rem"><input type="checkbox" class="asgn-sop-cb" value="'+s.code+'" style="width:16px;height:16px;accent-color:#FBB227"><span style="font-weight:600;color:#FBB227;min-width:120px">'+s.code+'</span><span>'+s.title+'</span></label>'; });
h+='</div><div style="margin-top:6px;display:flex;gap:8px"><button type="button" class="btn btn-p btn-sm" style="font-size:.75rem;padding:4px 10px" onclick="document.querySelectorAll(\'.asgn-sop-cb\').forEach(function(c){c.checked=true})">Select All</button><button type="button" class="btn btn-o btn-sm" style="font-size:.75rem;padding:4px 10px" onclick="document.querySelectorAll(\'.asgn-sop-cb\').forEach(function(c){c.checked=false})">Clear All</button></div></div></div>';
h+='<div id="asgn-emp-row" class="fg"><label>Employee</label><input id="asgn-emp-search" placeholder="Type name or employee number to search..." oninput="filterAsgnEmps()" style="margin-bottom:6px"><select id="asgn-emp" size="6" style="width:100%;border:1px solid #d1d5db;border-radius:8px;padding:4px"><option value="">Select...</option>';
emps.forEach(function(e){ h+='<option value="'+e.id+'">'+e.id+' — '+e.name+' ('+e.site+')</option>'; });
h+='</select></div>';
h+='<div id="asgn-site-row" class="fg hide"><label>Site</label><select id="asgn-site"><option value="">Select...</option>';
sites.forEach(function(s){ h+='<option>'+s+'</option>'; });
h+='</select></div>';
h+='<div id="asgn-dept-row" class="fg hide"><label>Department</label><input id="asgn-dept" placeholder="e.g. Processing"></div>';
h+='<div class="fg"><label>Order / Sequence (lower = first)</label><input id="asgn-order" type="number" value="'+(assigns.length+1)+'" min="1"></div>';
h+='<button class="btn btn-p" style="width:auto" onclick="doAssign()">Assign selected courses</button>';
h+='</div></div>';

// ============ Current assignments ============
h+='<div class="card"><div class="ch"><h3>Current Assignments ('+assigns.length+')</h3></div><div class="cb">';
if(!assigns.length){ h+='<p style="text-align:center;color:#6B7280;padding:20px">No assignments yet.</p>'; }
else{
  h+='<div class="sf" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px"><select id="asgn-filter-emp" onchange="render()"><option value="all">All Employees</option>';
  emps.forEach(function(e){ h+='<option value="'+e.id+'">'+e.id+' — '+e.name+'</option>'; });
  h+='</select><select id="asgn-filter-site" onchange="render()"><option value="all">All Sites</option>';
  sites.forEach(function(s){ h+='<option>'+s+'</option>'; });
  h+='</select></div>';
  var fe=document.getElementById('asgn-filter-emp'), fs2=document.getElementById('asgn-filter-site');
  var fEmp=fe?fe.value:'all', fSite=fs2?fs2.value:'all';
  var fa=assigns.filter(function(a){ var emp=emps.find(function(e){return e.id===a.eid}); return (fEmp==='all'||a.eid===fEmp)&&(fSite==='all'||(emp&&emp.site===fSite)); }).sort(function(a,b){return a.eid===b.eid?a.order-b.order:a.eid.localeCompare(b.eid)});
  h+='<div class="tw"><table><thead><tr><th>Employee</th><th>Site</th><th>Course</th><th>Title</th><th>Status</th><th></th></tr></thead><tbody>';
  fa.forEach(function(a){ var emp=emps.find(function(e){return e.id===a.eid}); var sop=sops.find(function(s){return s.code===a.sc}); var st=getStatus(a.eid,a.sc);
    h+='<tr><td>'+(emp?emp.name:a.eid)+'<br><span style="font-size:.72rem;color:#6B7280">'+a.eid+'</span></td><td style="font-size:.8rem">'+(emp?emp.site:'')+'</td><td style="font-weight:700;color:#FBB227">'+a.sc+'</td><td>'+(sop?sop.title:'')+'</td><td>'+(st==='passed'?bg('Completed','green'):st==='locked'?bg('Locked','red'):st==='progress'?bg('In progress','gold'):bg('Not started','gray'))+'</td><td><button class="btn btn-d btn-sm" onclick="removeAssign(\''+a.eid+'\',\''+a.sc+'\')">Remove</button></td></tr>';
  });
  h+='</tbody></table></div>';
}
h+='</div></div>';
return h+'</div>';
}
function renderMSops(){
if(contentEditId) return renderContentEditor(contentEditId);
var h='<div class="topbar"><h1>Manage Training Content</h1></div><div class="pc">';
h+='<div class="card"><div class="ch"><h3>Add a training item</h3></div><div class="cb" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end"><div style="flex:1;min-width:160px"><label style="font-size:.76rem;font-weight:600">Code</label><input id="nc-code" placeholder="OM-SOP-XXX-001" style="width:100%;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px"></div><div style="flex:2;min-width:220px"><label style="font-size:.76rem;font-weight:600">Title</label><input id="nc-title" placeholder="Training title" style="width:100%;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px"></div><button class="btn btn-p" style="width:auto" onclick="createContent()">+ Create &amp; open</button></div></div>';
var q=(typeof contentSearch!=='undefined'?contentSearch:'')||'';
h+='<div class="card"><div class="cb"><input placeholder="🔎 Search code, title, programme or category..." value="'+q.replace(/"/g,'&quot;')+'" onchange="contentSearch=this.value;render()" style="width:100%;padding:10px 12px;border:2px solid #e2e5e9;border-radius:8px"></div></div>';
var list=sops.slice();
if(q){var lq=q.toLowerCase(); list=list.filter(function(s){return ((s.code||'')+' '+(s.title||'')+' '+(s.programme||'')+' '+(s.cat||'')).toLowerCase().indexOf(lq)>=0;});}
h+='<div class="card"><div class="tw"><table><thead><tr><th>Code</th><th>Title / tags</th><th>Content</th><th>Manage</th></tr></thead><tbody>';
if(!list.length)h+='<tr><td colspan="4" style="text-align:center;color:#6B7280;padding:20px">No items'+(q?' match your search':' yet')+'.</td></tr>';
list.forEach(function(s){
h+='<tr><td style="font-weight:700;color:#FBB227">'+s.code+'</td>';
h+='<td>'+s.title+'<br><span style="font-size:.72rem;color:#6B7280">'+(s.programme?s.programme+' · ':'')+(s.cat||'—')+' · '+s.site+'</span></td>';
h+='<td><div style="display:flex;gap:4px;flex-wrap:wrap">'+(s.docName?bg('📄 Doc','green'):bg('No doc','gray'))+(s.vidName?bg('🎬 Video','green'):bg('No video','gray'))+(s.slidesName?bg('📊 Slides','green'):'')+bg(s.qs.length+' Qs',s.qs.length?'blue':'gray')+(s.ackRequired?bg('✍ Ack','gold'):'')+'</div></td>';
h+='<td style="white-space:nowrap"><button class="btn btn-p btn-sm" onclick="manageContent(\''+s.id+'\')">⚙ Manage</button> <button class="btn btn-o btn-sm" onclick="openSop(\''+s.id+'\')">View</button> <button class="btn btn-d btn-sm" onclick="delSop(\''+s.id+'\')">Del</button></td></tr>';
});
h+='</tbody></table></div></div>';
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
h+='</select></div><div class="fg"><label>PIN</label><input id="nemp-pin" value="1234"></div>';
h+='<div class="fg"><label>Person Type</label><select id="nemp-type" onchange="document.getElementById(\'con-fields\').style.display=(this.value===\'contractor\'?\'contents\':\'none\')"><option value="employee">Employee</option><option value="contractor">Contractor</option></select></div>';
h+='<span id="con-fields" style="display:none">';
h+='<div class="fg"><label>Contractor Company</label><input id="nemp-co" list="co-list"><datalist id="co-list">'+distinctVals(emps.filter(function(e){return e.contractor;}),'coName').map(function(c){return '<option value="'+String(c).replace(/"/g,'&quot;')+'">';}).join('')+'</datalist></div>';
h+='<div class="fg"><label>Working Area</label><input id="nemp-area" list="area-list"><datalist id="area-list">'+distinctVals(emps.filter(function(e){return e.contractor;}),'area').map(function(c){return '<option value="'+String(c).replace(/"/g,'&quot;')+'">';}).join('')+'</datalist></div>';
h+='<div class="fg"><label>Responsible Manager</label><select id="nemp-mgr"><option value="">— none —</option>'+(typeof managers!=='undefined'?managers.map(function(m){return '<option value="'+m.id+'">'+String(m.name).replace(/</g,'&lt;')+'</option>';}).join(''):'')+'</select></div>';
h+='</span></div>';
h+='<div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-p" style="width:auto" onclick="saveEmp()">Save</button><button class="btn btn-o" style="width:auto" onclick="toggleAddEmp()">Cancel</button></div></div></div>';
h+='<div id="bulk-emp-form" class="card hide"><div class="ch"><h3>CSV Upload</h3></div><div class="cb">';
h+='<div style="background:#f3f4f6;padding:14px;border-radius:8px;margin-bottom:16px;font-size:.82rem;font-family:monospace"><b>EmployeeNumber, IDNumber, FullName, Gender, Department, Site, PIN</b><br>OM006, 9201015012083, Thabo Mokoena, Male, Processing, Thutse Mining, 1234</div>';
h+='<div style="display:flex;gap:10px"><button class="btn btn-p" style="width:auto" onclick="uploadEmpCSV()">📄 Choose File</button><button class="btn btn-o" style="width:auto" onclick="toggleBulkEmp()">Cancel</button></div></div></div>';
var males=emps.filter(function(e){return e.gender==='Male'}).length;
h+='<div class="sg"><div class="sc gd"><div class="l">Total</div><div class="v">'+emps.length+'</div></div><div class="sc bl"><div class="l">Male</div><div class="v">'+males+'</div></div><div class="sc rd"><div class="l">Female</div><div class="v">'+(emps.length-males)+'</div></div></div>';
h+=filterBar(emps,'meSites','meDepts','meSearch');
h+='<div style="margin:-4px 0 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span style="font-size:.78rem;color:#6B7280">Show:</span>'+['all','employee','contractor'].map(function(t){var lbl=t==='all'?'All':(t==='employee'?'Employees':'Contractors');var sel=meType===t;return '<span style="cursor:pointer;padding:5px 12px;border-radius:16px;font-size:.8rem;font-weight:600;border:1.5px solid '+(sel?'#FBB227':'#d7dbe0')+';background:'+(sel?'#FBB227':'#fff')+';color:'+(sel?'#243034':'#4b5563')+'" onclick="meType=\''+t+'\';render()">'+lbl+'</span>';}).join('')+'</div>';
h+='<div class="card"><div class="tw"><table><thead><tr><th>Emp#</th><th>ID Number</th><th>Name</th><th>Type</th><th>Gender</th><th>Dept</th><th>Site</th><th>PIN</th><th>Actions</th></tr></thead><tbody>';
var meList=filterEmps(emps,meSites,meDepts,meSearch); if(meType==='employee')meList=meList.filter(function(e){return !e.contractor;}); else if(meType==='contractor')meList=meList.filter(function(e){return e.contractor;});
meList.forEach(function(e){var i=emps.indexOf(e);var _mgr=(e.respMgr&&typeof getManagerById==='function')?getManagerById(e.respMgr):null;h+='<tr><td style="font-weight:700;color:#FBB227">'+e.id+'</td><td style="font-size:.78rem">'+e.idn+'</td><td style="font-weight:600">'+e.name+'</td><td>'+(e.contractor?bg('Contractor','gold')+(e.coName?'<br><span style="font-size:.7rem;color:#6B7280">'+e.coName+(e.area?' · '+e.area:'')+(_mgr?'<br>Mgr: '+_mgr.name:'')+'</span>':''):bg('Employee','blue'))+'</td><td>'+bg(e.gender,e.gender==='Male'?'blue':'gold')+'</td><td>'+e.dept+'</td><td>'+e.site+'</td><td style="font-size:.78rem">'+e.pin+'</td><td><div style="display:flex;gap:5px"><button class="btn btn-o btn-sm" onclick="editEmp('+i+')">Edit</button><button class="btn btn-d btn-sm" onclick="deleteEmp(\''+e.id+'\')">Del</button></div></td></tr>';});
return h+'</tbody></table></div></div></div>';
}

// === EMPLOYEE RECORDS ===
function renderEmpRec(){
var h='<div class="topbar"><h1>Training Records</h1></div><div class="pc">';
h+=filterBar(emps,'erSites','erDepts','erSearch');
h+='<div style="margin:-6px 0 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="font-size:.78rem;color:#6B7280">Show:</span>'+['all','employee','contractor'].map(function(t){var lbl=t==='all'?'All':(t==='employee'?'Employees':'Contractors');var sel=erType===t;return '<span style="cursor:pointer;padding:5px 12px;border-radius:16px;font-size:.8rem;font-weight:600;border:1.5px solid '+(sel?'#FBB227':'#d7dbe0')+';background:'+(sel?'#FBB227':'#fff')+';color:'+(sel?'#243034':'#4b5563')+'" onclick="erType=\''+t+'\';render()">'+lbl+'</span>';}).join('');
var _ercos=[]; emps.forEach(function(e){ if(e.contractor&&e.coName&&_ercos.indexOf(e.coName)<0)_ercos.push(e.coName); }); _ercos.sort();
if(_ercos.length){ h+='<span style="font-size:.78rem;color:#6B7280;margin-left:6px">Contractor:</span>'; _ercos.forEach(function(co){ var sel=erCo.indexOf(co)>=0; h+='<span style="cursor:pointer;padding:5px 12px;border-radius:16px;font-size:.8rem;font-weight:600;border:1.5px solid '+(sel?'#FBB227':'#d7dbe0')+';background:'+(sel?'#FBB227':'#fff')+';color:'+(sel?'#243034':'#4b5563')+'" onclick="erToggleCo(\''+encodeURIComponent(co)+'\')">'+co+'</span>'; }); }
h+='</div>';
h+='<div class="card"><div class="tw"><table><thead><tr><th>Emp#</th><th>ID</th><th>Name</th><th>Gender</th><th>Site</th><th>SOP</th><th>1st</th><th>2nd</th><th>3rd</th><th>Status</th><th>Proof</th></tr></thead><tbody>';
var erList=filterEmps(emps,erSites,erDepts,erSearch); if(erType==='employee')erList=erList.filter(function(e){return !e.contractor;}); else if(erType==='contractor')erList=erList.filter(function(e){return e.contractor;}); if(erCo.length)erList=erList.filter(function(e){return erCo.indexOf(e.coName||'')>=0;});
erList.forEach(function(emp){
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
function goPage(p){page=p;activeSop=null;activeOnb=null;contentEditId=null;qmSopId=null;assessStarted=false;assessDone=false;assessResult=null;assessAns={};assessQs=[];if(typeof compEmp!=='undefined'){compEmp=null;jpEdit=null;}if(typeof indActiveMod!=='undefined'){indActiveMod=null;indAdminEdit=null;indResult=null;indAns={};}render()}
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
if(editId){var sop=sops.find(function(s){return s.id===editId});if(sop){sop.code=code;sop.rev=document.getElementById('nsop-rev').value||'Rev 1.0';sop.title=title;sop.desc=document.getElementById('nsop-desc').value||'';sop.cat=document.getElementById('nsop-cat').value||'General';sop.programme=(document.getElementById('nsop-prog')||{}).value||sop.programme||'';sop.site=document.getElementById('nsop-site').value||'All Sites';}document.getElementById('edit-sop-id').value='';editSopId=null;}
else{sops.push({id:gid(),code:code,rev:document.getElementById('nsop-rev').value||'Rev 1.0',title:title,desc:document.getElementById('nsop-desc').value||'',cat:document.getElementById('nsop-cat').value||'General',programme:(document.getElementById('nsop-prog')||{}).value||'',site:document.getElementById('nsop-site').value||'All Sites',html:'<h2>'+title+'</h2><p>Upload document.</p>',docUrl:null,docName:null,vidUrl:null,vidName:null,slidesUrl:null,slidesName:null,qs:[]});}
save();render();}
function delSop(id){sops=sops.filter(function(s){return s.id!==id});save();render()}
function uploadDoc(sid){var inp=document.createElement('input');inp.type='file';inp.accept='.pdf';inp.onchange=async function(e){var f=e.target.files[0];if(!f)return;var path='sop-docs/'+sid+'_'+Date.now()+'_'+f.name;var {data,error}=await sb.storage.from('lms-files').upload(path,f);if(error){alert('Upload failed: '+error.message);return}var {data:urlData}=sb.storage.from('lms-files').getPublicUrl(path);var sop=sops.find(function(s){return s.id===sid});sop.docUrl=urlData.publicUrl;sop.docName=f.name;save();render();alert('Document uploaded!')};inp.click()}
function uploadVid(sid){var inp=document.createElement('input');inp.type='file';inp.accept='video/*';inp.onchange=async function(e){var f=e.target.files[0];if(!f)return;if(f.size>100*1024*1024){alert('Max 100MB. For larger videos, upload to YouTube and paste the link.');return}var path='sop-vids/'+sid+'_'+Date.now()+'_'+f.name;var {data,error}=await sb.storage.from('lms-files').upload(path,f);if(error){alert('Upload failed: '+error.message);return}var {data:urlData}=sb.storage.from('lms-files').getPublicUrl(path);var sop=sops.find(function(s){return s.id===sid});sop.vidUrl=urlData.publicUrl;sop.vidName=f.name;save();render();alert('Video uploaded!')};inp.click()}
function uploadSlides(sid){var inp=document.createElement('input');inp.type='file';inp.accept='.pdf';inp.onchange=async function(e){var f=e.target.files[0];if(!f)return;if(f.size>50*1024*1024){alert('Max 50MB. Please compress or split the PDF.');return}var path='sop-slides/'+sid+'_'+Date.now()+'_'+f.name;var {data,error}=await sb.storage.from('lms-files').upload(path,f);if(error){alert('Upload failed: '+error.message);return}var {data:urlData}=sb.storage.from('lms-files').getPublicUrl(path);var sop=sops.find(function(s){return s.id===sid});sop.slidesUrl=urlData.publicUrl;sop.slidesName=f.name;save();render();alert('Slides (PDF) uploaded!')};inp.click()}
function removeSlides(sid){if(!confirm('Remove the slides PDF from this SOP? Employees will no longer be required to view slides for it.'))return;var sop=sops.find(function(s){return s.id===sid});sop.slidesUrl=null;sop.slidesName=null;save();render()}
function editSop(id){var s=sops.find(function(x){return x.id===id});if(!s)return;editSopId=id;render();setTimeout(function(){var form=document.getElementById('add-sop-form');if(form)form.classList.remove('hide');document.getElementById('sop-form-title').textContent='Edit SOP: '+s.code;document.getElementById('edit-sop-id').value=id;document.getElementById('nsop-code').value=s.code;document.getElementById('nsop-rev').value=s.rev;document.getElementById('nsop-title').value=s.title;document.getElementById('nsop-desc').value=s.desc;document.getElementById('nsop-cat').value=s.cat;var _pp=document.getElementById('nsop-prog');if(_pp)_pp.value=s.programme||'';document.getElementById('nsop-site').value=s.site;},50)}

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
var dept=document.getElementById('nemp-dept').value.trim();var site=document.getElementById('nemp-site').value;var pin=document.getElementById('nemp-pin').value.trim()||'1234';var _pt=(document.getElementById('nemp-type')||{}).value||'employee';var _isCon=_pt==='contractor';var _co=_isCon?((document.getElementById('nemp-co')||{}).value||''):'';var _area=_isCon?((document.getElementById('nemp-area')||{}).value||''):'';var _mgr=_isCon?((document.getElementById('nemp-mgr')||{}).value||''):'';
if(!eid||!name||!gender||!site){alert('Employee number, name, gender, site required');return}
var editId=document.getElementById('edit-emp-id').value;
if(editId){var idx=emps.findIndex(function(e){return e.id===editId});if(idx>=0)emps[idx]={id:eid,idn:idn,name:name,gender:gender,dept:dept,site:site,pin:pin,contractor:_isCon,coName:_co,area:_area,respMgr:_mgr};}
else{if(emps.some(function(e){return e.id.toUpperCase()===eid.toUpperCase()})){alert('Already exists');return}emps.push({id:eid,idn:idn,name:name,gender:gender,dept:dept,site:site,pin:pin,contractor:_isCon,coName:_co,area:_area,respMgr:_mgr});}
save();render();}
function editEmp(i){var e=emps[i];render();setTimeout(function(){var form=document.getElementById('add-emp-form');if(form)form.classList.remove('hide');
document.getElementById('edit-emp-id').value=e.id;document.getElementById('emp-form-title').textContent='Edit: '+e.name;
document.getElementById('nemp-id').value=e.id;document.getElementById('nemp-idn').value=e.idn;document.getElementById('nemp-name').value=e.name;
document.getElementById('nemp-gender').value=e.gender;document.getElementById('nemp-dept').value=e.dept;document.getElementById('nemp-site').value=e.site;document.getElementById('nemp-pin').value=e.pin;var _t=document.getElementById('nemp-type');if(_t)_t.value=e.contractor?'contractor':'employee';var _cf=document.getElementById('con-fields');if(_cf)_cf.style.display=e.contractor?'contents':'none';var _c2=document.getElementById('nemp-co');if(_c2)_c2.value=e.coName||'';var _a2=document.getElementById('nemp-area');if(_a2)_a2.value=e.area||'';var _m2=document.getElementById('nemp-mgr');if(_m2)_m2.value=e.respMgr||'';},50);}
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
w.document.write('<div class="wm">'+BRAND.name.toUpperCase()+'</div><div class="hdr"><h1>'+BRAND.name+'</h1><p>Training Management System</p></div>');
w.document.write('<div class="ttl">'+(pass?'Certificate of Competency':'Assessment Record')+'</div>');
w.document.write('<div class="rb '+(pass?'ps':'fl')+'"><div class="s">'+pct+'%</div><div class="st">'+(pass?'COMPETENT':'NOT YET COMPETENT')+'</div></div>');
w.document.write('<table><tr><td>Employee Name</td><td>'+emp.name+'</td></tr><tr><td>Employee Number</td><td>'+emp.id+'</td></tr><tr><td>ID Number</td><td>'+emp.idn+'</td></tr><tr><td>Gender</td><td>'+emp.gender+'</td></tr><tr><td>Site</td><td>'+emp.site+'</td></tr><tr><td>Department</td><td>'+emp.dept+'</td></tr></table>');
w.document.write('<table><tr><td>SOP Code</td><td>'+sop.code+'</td></tr><tr><td>SOP Title</td><td>'+sop.title+'</td></tr><tr><td>Revision</td><td>'+sop.rev+'</td></tr></table>');
w.document.write('<table><tr><td>Score</td><td>'+score+'/'+total+' ('+pct+'%)</td></tr><tr><td>Competency Mark</td><td>100% ('+total+'/'+total+')</td></tr><tr><td>Result</td><td style="font-weight:700;color:'+(pass?'#22C55E':'#EF4444')+'">'+(pass?'COMPETENT':'NOT YET COMPETENT')+'</td></tr><tr><td>Attempt</td><td>'+att+'/3</td></tr><tr><td>Date</td><td>'+fd(dt)+'</td></tr></table>');
if(pass&&wrongs&&wrongs.length){w.document.write('<div style="margin:24px 0;border-left:4px solid #FBB227;padding:16px 20px;background:#FFFBEB;border-radius:0 8px 8px 0;page-break-inside:avoid"><h3 style="font-size:1rem;font-weight:700;color:#243034;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">Review — Incorrect Answers</h3><p style="font-size:.82rem;color:#6B7280;margin-bottom:14px">You passed, but review the following questions to strengthen your understanding:</p>');wrongs.forEach(function(wr){w.document.write('<div style="padding:10px 0;border-bottom:1px solid #F0E6C8"><div style="font-weight:600;color:#243034;font-size:.88rem;margin-bottom:4px">Q'+wr.n+'. '+wr.t+'</div><div style="font-size:.82rem;color:#EF4444;margin-bottom:2px">✗ Your answer: '+wr.yours+'</div><div style="font-size:.82rem;color:#22C55E;font-weight:600">✓ Correct answer: '+wr.correct+'</div></div>')});w.document.write('</div>');}
w.document.write('<div class="sig"><div><div class="sbox"><p>Employee Signature</p></div><p style="margin-top:8px;font-size:.82rem">'+emp.name+'</p></div><div><div class="sbox"><p>Assessor Signature</p></div><p style="margin-top:8px;font-size:.82rem">Name: _________________________</p></div></div>');
w.document.write('<div class="sig"><div><div class="sbox"><p>Date</p></div></div><div><div class="sbox"><p>Training Manager</p></div></div></div>');
w.document.write('<div class="ftr"><p><b>'+BRAND.legal+'</b> — Training Management System</p><p>'+sop.code+' | '+sop.rev+' | Generated '+fd(now())+'</p><p style="margin-top:6px">Official proof of assessment. Retain for compliance.</p></div></body></html>');
w.document.close();setTimeout(function(){w.print()},500);}

function dashReport(){
var hasFilter=((adminSites&&adminSites.length)||(adminDepts&&adminDepts.length)||(adminSops&&adminSops.length)||adminEmpF);
if(hasFilter){ if(confirm('Compliance report:\n\nOK = FULL report (all employees & courses)\nCancel = ONLY your current on-screen selection')) dlReport('full'); else dlReport('dashfilter'); }
else dlReport('full');
}
function dlReport(type,id){
var w=window.open('','_blank');
var css='*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;color:#243034;padding:30px;font-size:12px}.hdr{text-align:center;padding-bottom:16px;border-bottom:4px solid #FBB227;margin-bottom:24px}.hdr h1{font-size:1.5rem;font-weight:800}.gold{color:#FBB227}.hdr p{font-size:.8rem;color:#6B7280}h2{font-size:1rem;font-weight:700;margin:20px 0 10px;border-bottom:2px solid #FBB227;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px}th{background:#243034;color:#fff;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase}td{padding:8px 10px;border:1px solid #e5e7eb}.pass{color:#22C55E;font-weight:700}.fail{color:#EF4444;font-weight:700}.ftr{margin-top:30px;padding-top:12px;border-top:2px solid #FBB227;text-align:center;font-size:10px;color:#6B7280}@media print{body{padding:15px}}';
w.document.write('<!DOCTYPE html><html><head><title>'+BRAND.name+' Report</title><style>'+css+'</style></head><body>');
w.document.write('<div class="hdr"><h1>'+BRAND.name+'</h1><p>Training Management System — Compliance Report</p><p style="margin-top:4px">Generated: '+fd(now())+'</p></div>');

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
w.document.write('<div class="ftr"><p><b>'+BRAND.legal+'</b> — Training Management System</p><p>Generated '+fd(now())+' | Confidential — For compliance use only</p></div></body></html>');
w.document.close();setTimeout(function(){w.print()},500);}

// One Mining Training Demo — TNA/Competence build
init();

// =====================  ONBOARDING (employee journey + admin)  =====================
var ONB_ACK_TEXT='I confirm that I have been given the means to read this document, that I understand its contents, and that it is my responsibility to ensure I fully understand and comply with it. I understand I may raise any questions with HR or my line manager.';
var onbEditId=null;

function empGroup(eid){ var t=(typeof empJobTitle==='function')?empJobTitle(eid):''; var p=(t&&typeof getProfile==='function')?getProfile(t):null; return p?(p.group||''):''; }
function jobGroups(){ var g=[]; if(typeof jobprofiles!=='undefined'){ jobprofiles.forEach(function(p){ if(p.group&&g.indexOf(p.group)<0)g.push(p.group); }); } return g; }
function onbVisible(o,eid){ if(!o||o.active===false)return false; if(!o.audience||o.audience==='all')return true; if(o.audience==='groups'){ return (o.groups||[]).indexOf(empGroup(eid))>=0; } return true; }
function onbAcked(eid,oid){ return acks.some(function(a){return a.eid===eid&&a.oid===oid;}); }
function onbAckRec(eid,oid){ return acks.find(function(a){return a.eid===eid&&a.oid===oid;}); }
function onbOutstanding(eid){ return onboarding.filter(function(o){return onbVisible(o,eid)&&!onbAcked(eid,o.id);}).length; }
function openOnb(id){ activeOnb=onboarding.find(function(o){return o.id===id;}); render(); }
function closeOnb(){ activeOnb=null; render(); }

function renderOnboarding(){
var eid=user.id;
var items=onboarding.filter(function(o){return onbVisible(o,eid);}).sort(function(a,b){return (a.order||0)-(b.order||0);});
var done=items.filter(function(o){return onbAcked(eid,o.id);}).length;
var pct=items.length?Math.round(done/items.length*100):0;
var h='<div class="topbar"><h1>Onboarding</h1><span style="font-size:.78rem;color:#6B7280">'+done+' of '+items.length+' acknowledged</span></div><div class="pc">';
h+='<div class="card"><div class="cb"><b>Welcome to '+BRAND.name+'</b><p style="margin-top:6px;color:#374151;line-height:1.6">These are the company and HR policies that apply to you. Please open each one, read it, watch the short video where one is provided, and then sign the acknowledgement to confirm you have received and understood it. If anything is unclear, speak to <b>HR</b> or your <b>line manager</b>.</p>';
h+='<div class="pb" style="margin-top:10px"><div class="pf '+(pct>=100?'gn':'gd')+'" style="width:'+pct+'%"></div></div></div></div>';
if(!items.length)return h+'<div class="card"><div class="cb" style="text-align:center;color:#6B7280;padding:24px">No onboarding items for you yet. Your administrator will add these.</div></div></div>';
h+='<div class="card"><div class="tw"><table><thead><tr><th>#</th><th>Policy / Document</th><th>Status</th><th>Acknowledged</th><th>Action</th></tr></thead><tbody>';
items.forEach(function(o,i){
var ok=onbAcked(eid,o.id);var rec=onbAckRec(eid,o.id);
h+='<tr><td>'+(i+1)+'</td><td style="font-weight:600">'+o.title+(o.desc?'<br><span style="font-size:.76rem;color:#6B7280;font-weight:400">'+o.desc+'</span>':'')+'</td>';
h+='<td>'+(ok?bg('✓ Acknowledged','green'):bg('Outstanding','gold'))+'</td>';
h+='<td style="font-size:.8rem">'+(ok?fd(rec.at):'-')+'</td>';
h+='<td><button class="btn '+(ok?'btn-o':'btn-p')+' btn-sm" onclick="openOnb(\''+o.id+'\')">'+(ok?'Review':'Open')+'</button></td></tr>';
});
h+='</tbody></table></div></div></div>';return h;
}

function renderOnbItem(){
var o=activeOnb,eid=user.id,ok=onbAcked(eid,o.id),rec=onbAckRec(eid,o.id);
var h='<div class="topbar"><div style="display:flex;align-items:center;gap:14px"><button class="btn btn-o btn-sm" onclick="closeOnb()">← Back</button><div><h1>'+o.title+'</h1><span style="font-size:.76rem;color:#6B7280">Onboarding · Company &amp; HR</span></div></div></div><div class="pc">';
if(o.desc)h+='<div class="card"><div class="cb" style="color:#374151">'+o.desc+'</div></div>';
h+='<div class="card"><div class="ch"><h3>Document</h3></div><div class="cb">';
if(o.docUrl)h+='<iframe src="'+o.docUrl+'" style="width:100%;height:70vh;border:1px solid #e5e7eb;border-radius:10px"></iframe><p style="margin-top:8px;font-size:.8rem"><a href="'+o.docUrl+'" target="_blank" style="color:#FBB227;font-weight:600">Open in new tab</a></p>';
else h+='<p style="color:#6B7280;text-align:center;padding:20px">The document will be available here shortly.</p>';
h+='</div></div>';
if(o.vidUrl){h+='<div class="card"><div class="ch"><h3>Explainer video</h3></div><div class="cb"><div style="background:#000;border-radius:10px;overflow:hidden"><video controls playsinline style="width:100%;display:block" src="'+o.vidUrl+'"></video></div></div></div>';}
h+='<div class="card" style="border-left:4px solid #FBB227"><div class="ch"><h3>Acknowledgement</h3></div><div class="cb">';
if(ok){h+='<p style="color:#15803d;font-weight:600">✓ You acknowledged this on '+fd(rec.at)+'.</p><p style="color:#6B7280;font-size:.85rem;margin-top:6px">'+ONB_ACK_TEXT+'</p>';}
else{h+='<label style="display:flex;gap:10px;align-items:flex-start;font-size:.92rem"><input type="checkbox" id="onb-ack" style="margin-top:3px;width:18px;height:18px"> <span>'+ONB_ACK_TEXT+'</span></label>';
h+='<div style="margin-top:14px"><button class="btn btn-p" style="width:auto;padding:12px 40px" onclick="acknowledgeOnb(\''+o.id+'\')">Acknowledge &amp; Accept Responsibility</button></div>';
h+='<p style="margin-top:10px;font-size:.8rem;color:#6B7280">Questions? Contact <b>HR</b> or your <b>line manager</b>.</p>';}
h+='</div></div></div>';return h;
}

async function acknowledgeOnb(oid){
var cb=document.getElementById('onb-ack');if(!cb||!cb.checked){alert('Please tick the acknowledgement to confirm.');return;}
if(onbAcked(user.id,oid)){render();return;}
acks.push({id:gid(),eid:user.id,oid:oid,at:now()});
var ok=await save();if(!ok)alert('⚠️ Save may have failed — please check your connection and try again.');
if(typeof logAudit==='function')logAudit('ONBOARDING ACK',user.id,oid);
render();
}

// ---------- ADMIN: Manage Onboarding ----------
function onbAudienceLabel(o){ if(!o.audience||o.audience==='all')return bg('Everyone','blue'); var gs=o.groups||[]; return gs.length?gs.map(function(g){return bg(g,'gray');}).join(' '):bg('No group set','red'); }
function renderMOnb(){
var items=onboarding.slice().sort(function(a,b){return (a.order||0)-(b.order||0);});
var grps=jobGroups();
var h='<div class="topbar"><h1>Manage Onboarding</h1></div><div class="pc">';
h+='<div class="card"><div class="cb"><b>Company &amp; HR onboarding pack.</b><p style="color:#6B7280;font-size:.85rem;margin-top:4px">These policies appear in the Onboarding stage of every employee\'s journey. Add an item, upload its document (PDF) and optional video, choose who it applies to, then switch it on. Employees read each one and sign an acknowledgement — captured with a date as your proof.</p></div></div>';
h+='<div class="card"><div class="ch"><h3>Add a policy / document</h3></div><div class="cb" style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">';
h+='<div style="flex:2;min-width:220px"><label style="font-size:.78rem;font-weight:600">Title</label><input id="onb-title" placeholder="e.g. Disciplinary Code &amp; Procedure" style="width:100%;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px"></div>';
h+='<div style="flex:3;min-width:240px"><label style="font-size:.78rem;font-weight:600">Short description (optional)</label><input id="onb-desc" placeholder="One line explaining what this covers" style="width:100%;padding:9px 12px;border:2px solid #e2e5e9;border-radius:8px"></div>';
h+='<button class="btn btn-p" style="width:auto" onclick="addOnb()">+ Add</button></div></div>';
if(!items.length){h+='<div class="card"><div class="cb" style="text-align:center;color:#6B7280;padding:24px">No onboarding items yet. Add your first above.</div></div></div>';return h;}
h+='<div class="card"><div class="tw"><table><thead><tr><th>Order</th><th>Title</th><th>Applies to</th><th>Document</th><th>Video</th><th>Status</th><th>Manage</th></tr></thead><tbody>';
items.forEach(function(o,i){
if(onbEditId===o.id){
h+='<tr><td colspan="7" style="background:#fff8ec"><div style="padding:6px 2px"><b>Edit item</b><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;align-items:flex-start">';
h+='<div style="flex:2;min-width:200px"><label style="font-size:.74rem;font-weight:600">Title</label><input id="oe-title" value="'+(o.title||'').replace(/"/g,'&quot;')+'" style="width:100%;padding:8px 10px;border:2px solid #e2e5e9;border-radius:8px"></div>';
h+='<div style="flex:3;min-width:240px"><label style="font-size:.74rem;font-weight:600">Description</label><input id="oe-desc" value="'+(o.desc||'').replace(/"/g,'&quot;')+'" style="width:100%;padding:8px 10px;border:2px solid #e2e5e9;border-radius:8px"></div>';
h+='<div style="flex:2;min-width:220px"><label style="font-size:.74rem;font-weight:600">Applies to</label><div style="margin-top:4px"><label style="font-size:.85rem;font-weight:600"><input type="checkbox" id="oe-all" '+((!o.audience||o.audience==='all')?'checked':'')+'> Everyone</label><div style="margin-top:5px">';
if(!grps.length)h+='<span style="font-size:.75rem;color:#6B7280">Tick Everyone (no Job-Profile groups defined yet). Add groups under Job Profiles to target specific levels.</span>';
else{h+='<span style="font-size:.72rem;color:#6B7280">…or untick Everyone and choose groups:</span><br>';grps.forEach(function(g){h+='<label style="display:inline-flex;gap:5px;align-items:center;margin:3px 10px 3px 0;font-size:.82rem"><input type="checkbox" class="oe-grp" value="'+g.replace(/"/g,'&quot;')+'" '+((o.audience==='groups'&&(o.groups||[]).indexOf(g)>=0)?'checked':'')+'> '+g+'</label>';});}
h+='</div></div></div>';
h+='<div style="display:flex;gap:8px;align-items:flex-end;padding-top:16px"><button class="btn btn-p btn-sm" style="width:auto" onclick="saveOnbEdit(\''+o.id+'\')">Save</button><button class="btn btn-o btn-sm" style="width:auto" onclick="onbEditId=null;render()">Cancel</button></div>';
h+='</div></div></td></tr>';
}else{
h+='<tr><td style="white-space:nowrap"><button class="btn btn-o btn-sm" onclick="moveOnb(\''+o.id+'\',-1)">↑</button> <button class="btn btn-o btn-sm" onclick="moveOnb(\''+o.id+'\',1)">↓</button></td>';
h+='<td style="font-weight:600">'+o.title+(o.desc?'<br><span style="font-size:.76rem;color:#6B7280;font-weight:400">'+o.desc+'</span>':'')+'</td>';
h+='<td style="font-size:.76rem">'+onbAudienceLabel(o)+'</td>';
h+='<td>'+(o.docUrl?bg('✓ PDF','green'):bg('None','gray'))+'<br><button class="btn btn-o btn-sm" style="margin-top:4px" onclick="uploadOnbDoc(\''+o.id+'\')">Upload</button></td>';
h+='<td>'+(o.vidUrl?bg('✓ Video','green'):bg('None','gray'))+'<br><button class="btn btn-o btn-sm" style="margin-top:4px" onclick="uploadOnbVid(\''+o.id+'\')">Upload</button></td>';
h+='<td>'+(o.active!==false?bg('Active','green'):bg('Off','gray'))+'<br><button class="btn btn-o btn-sm" style="margin-top:4px" onclick="toggleOnb(\''+o.id+'\')">'+(o.active!==false?'Turn off':'Turn on')+'</button></td>';
h+='<td style="white-space:nowrap"><button class="btn btn-o btn-sm" onclick="onbEditId=\''+o.id+'\';render()">✎ Edit</button> <button class="btn btn-d btn-sm" onclick="delOnb(\''+o.id+'\')">Delete</button></td></tr>';
}
});
h+='</tbody></table></div></div></div>';return h;
}
function addOnb(){var t=document.getElementById('onb-title').value.trim();if(!t){alert('Please enter a title.');return;}var d=document.getElementById('onb-desc').value.trim();var maxO=onboarding.reduce(function(m,o){return Math.max(m,o.order||0);},0);onboarding.push({id:gid(),title:t,desc:d,docUrl:'',docName:'',vidUrl:'',vidName:'',order:maxO+1,active:true,audience:'all',groups:[],createdAt:now()});document.getElementById('onb-title').value='';document.getElementById('onb-desc').value='';save();render();}
function saveOnbEdit(id){var o=onboarding.find(function(x){return x.id===id;});if(!o)return;o.title=document.getElementById('oe-title').value.trim()||o.title;o.desc=document.getElementById('oe-desc').value.trim();var all=document.getElementById('oe-all');if(all&&!all.checked){var gs=[];document.querySelectorAll('.oe-grp').forEach(function(c){if(c.checked)gs.push(c.value);});o.audience='groups';o.groups=gs;}else{o.audience='all';o.groups=[];}onbEditId=null;save();render();}
function toggleOnb(id){var o=onboarding.find(function(x){return x.id===id;});if(!o)return;o.active=(o.active===false);save();render();}
function delOnb(id){if(!confirm('Delete this onboarding item? Employee acknowledgements already captured for it stay in the records.'))return;onboarding=onboarding.filter(function(x){return x.id!==id;});save();render();}
function moveOnb(id,dir){var items=onboarding.slice().sort(function(a,b){return (a.order||0)-(b.order||0);});var i=items.findIndex(function(x){return x.id===id;});var j=i+dir;if(j<0||j>=items.length)return;var a=items[i],b=items[j];var ao=(a.order||0),bo=(b.order||0);a.order=bo;b.order=ao;save();render();}
function uploadOnbDoc(id){var inp=document.createElement('input');inp.type='file';inp.accept='.pdf';inp.onchange=async function(e){var f=e.target.files[0];if(!f)return;if(f.size>50*1024*1024){alert('Max 50MB. Please compress or split the PDF.');return;}var path='onboarding/'+id+'_'+Date.now()+'_'+f.name;var r=await sb.storage.from('lms-files').upload(path,f);if(r.error){alert('Upload failed: '+r.error.message);return;}var u=sb.storage.from('lms-files').getPublicUrl(path);var o=onboarding.find(function(x){return x.id===id;});o.docUrl=u.data.publicUrl;o.docName=f.name;await save();render();alert('Document uploaded.');};inp.click();}
function uploadOnbVid(id){var inp=document.createElement('input');inp.type='file';inp.accept='video/*';inp.onchange=async function(e){var f=e.target.files[0];if(!f)return;if(f.size>100*1024*1024){alert('Max 100MB. For larger videos, upload to YouTube and paste the link.');return;}var path='onboarding-vid/'+id+'_'+Date.now()+'_'+f.name;var r=await sb.storage.from('lms-files').upload(path,f);if(r.error){alert('Upload failed: '+r.error.message);return;}var u=sb.storage.from('lms-files').getPublicUrl(path);var o=onboarding.find(function(x){return x.id===id;});o.vidUrl=u.data.publicUrl;o.vidName=f.name;await save();render();alert('Video uploaded.');};inp.click();}

// ---------- library category picker ----------
function libPick(v){ try{ libCat=decodeURIComponent(v); }catch(e){ libCat=v; } render(); }

// ---------- ADMIN: Onboarding acknowledgement proof ----------
var onbProofSel=null;
function renderOnbProof(){
var items=onboarding.slice().sort(function(a,b){return (a.order||0)-(b.order||0);});
var h='<div class="topbar"><h1>Onboarding Proof</h1></div><div class="pc">';
h+='<div class="card"><div class="cb"><b>Acknowledgement register.</b><p style="color:#6B7280;font-size:.85rem;margin-top:4px">Proof of who has received and acknowledged each company / HR policy, with the date. Click a policy to see the full list and print it as evidence.</p></div></div>';
if(!items.length)return h+'<div class="card"><div class="cb" style="text-align:center;color:#6B7280;padding:24px">No onboarding items yet.</div></div></div>';
h+=contractorFilterRow('opType','opCo');
h+='<div class="card"><div class="ch"><h3>Overview</h3></div><div class="tw"><table><thead><tr><th>Policy / Document</th><th>Applies to</th><th>Acknowledged</th><th>Outstanding</th><th>%</th><th></th></tr></thead><tbody>';
items.forEach(function(o){
var appl=contractorFilter(emps.filter(function(e){return onbVisible(o,e.id);}),'opType','opCo');
var ackd=appl.filter(function(e){return onbAcked(e.id,o.id);}).length;
var pct=appl.length?Math.round(ackd/appl.length*100):0;
h+='<tr><td style="font-weight:600">'+o.title+(o.active===false?' '+bg('Off','gray'):'')+'</td><td style="font-size:.78rem">'+onbAudienceLabel(o)+'</td><td style="font-weight:700">'+ackd+'</td><td>'+(appl.length-ackd)+'</td><td>'+bg(pct+'%',pct>=100?'green':pct>0?'gold':'gray')+'</td><td><button class="btn btn-o btn-sm" onclick="onbProofSel=\''+o.id+'\';render()">View</button></td></tr>';
});
h+='</tbody></table></div></div>';
if(onbProofSel){var o=onboarding.find(function(x){return x.id===onbProofSel;});
if(o){var appl=contractorFilter(emps.filter(function(e){return onbVisible(o,e.id);}),'opType','opCo');
appl.sort(function(a,b){return (onbAcked(b.id,o.id)?1:0)-(onbAcked(a.id,o.id)?1:0);});
h+='<div class="card"><div class="ch" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><h3>'+o.title+' — acknowledgement list</h3><div style="display:flex;gap:8px"><button class="btn btn-p btn-sm" onclick="printOnbProof(\''+o.id+'\')">🖨 Print / Save PDF</button><button class="btn btn-o btn-sm" onclick="onbProofSel=null;render()">Close</button></div></div><div class="tw"><table><thead><tr><th>Emp#</th><th>Name</th><th>Site</th><th>Dept</th><th>Status</th><th>Date acknowledged</th></tr></thead><tbody>';
appl.forEach(function(e){var ok=onbAcked(e.id,o.id);var rec=onbAckRec(e.id,o.id);
h+='<tr><td style="font-weight:700;color:#FBB227">'+e.id+'</td><td>'+e.name+'</td><td style="font-size:.8rem">'+e.site+'</td><td style="font-size:.8rem">'+(e.dept||'-')+'</td><td>'+(ok?bg('✓ Acknowledged','green'):bg('Outstanding','gold'))+'</td><td>'+(ok?fd(rec.at):'-')+'</td></tr>';
});
if(!appl.length)h+='<tr><td colspan="6" style="text-align:center;color:#6B7280;padding:18px">No employees fall under this item.</td></tr>';
h+='</tbody></table></div></div>';}}
return h+'</div>';
}
function printOnbProof(oid){
var o=onboarding.find(function(x){return x.id===oid;}); if(!o)return;
var appl=contractorFilter(emps.filter(function(e){return onbVisible(o,e.id);}),'opType','opCo');
appl.sort(function(a,b){return (onbAcked(b.id,o.id)?1:0)-(onbAcked(a.id,o.id)?1:0);});
var rows=appl.map(function(e){var ok=onbAcked(e.id,o.id);var rec=onbAckRec(e.id,o.id);return '<tr><td>'+e.id+'</td><td>'+e.name+'</td><td>'+e.site+'</td><td>'+(e.dept||'-')+'</td><td>'+(ok?'Acknowledged':'Outstanding')+'</td><td>'+(ok?fd(rec.at):'-')+'</td></tr>';}).join('');
var ackd=appl.filter(function(e){return onbAcked(e.id,o.id);}).length;
var w=window.open('','_blank'); if(!w)return;
w.document.write('<!DOCTYPE html><html><head><title>'+BRAND.name+' — Onboarding Proof</title><style>body{font-family:Arial;padding:26px;color:#243034}h1{font-size:18px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#243034;color:#fff}.ftr{margin-top:16px;font-size:11px;color:#666}</style></head><body>');
w.document.write('<h1>'+BRAND.name+' — Onboarding Acknowledgement Proof</h1>');
w.document.write('<p><b>Policy:</b> '+o.title+'<br><b>Acknowledged:</b> '+ackd+' of '+appl.length+'<br><b>Generated:</b> '+fd(now())+'</p>');
w.document.write('<table><thead><tr><th>Emp#</th><th>Name</th><th>Site</th><th>Dept</th><th>Status</th><th>Date</th></tr></thead><tbody>'+rows+'</tbody></table>');
w.document.write('<div class="ftr">'+o.title+' — official acknowledgement register. Retain for compliance.</div></body></html>');
w.document.close(); w.focus(); w.print();
}
function libPickProg(v){ try{ libProg=decodeURIComponent(v); }catch(e){ libProg=v; } render(); }

// ---------- Assign by Job Profile (one-click) ----------
function jobRequiredCourses(eid){
  var courses=[], seen={}, tracked=0;
  if(typeof empRequired!=='function') return {courses:courses,tracked:0,hasJob:false,title:''};
  var title=(typeof empJobTitle==='function')?empJobTitle(eid):'';
  var prof=(title&&typeof getProfile==='function')?getProfile(title):null;
  var req=empRequired(eid);
  req.forEach(function(r){ var it=getIntervention(r.code); if(!it)return;
    if(it.linkedSop){ var sop=sops.find(function(s){return s.code===it.linkedSop;});
      if(sop && !seen[sop.code]){ seen[sop.code]=1; courses.push({sc:sop.code,title:sop.title,itCode:it.code,critical:!!it.critical,assigned:assigns.some(function(a){return a.eid===eid&&a.sc===sop.code;})}); }
    } else { tracked++; }
  });
  return {courses:courses,tracked:tracked,hasJob:!!(title&&prof),title:title};
}
function targetEmpsForJob(){
  if(asgnJobMode==='individual') return asgnJobEid?[asgnJobEid]:[];
  if(asgnJobMode==='site') return asgnJobSite?emps.filter(function(e){return e.site===asgnJobSite;}).map(function(e){return e.id;}):[];
  if(asgnJobMode==='dept') return asgnJobDept?emps.filter(function(e){return (e.dept||'').toLowerCase().indexOf(asgnJobDept.toLowerCase())>=0;}).map(function(e){return e.id;}):[];
  return emps.map(function(e){return e.id;});
}
function jobPreviewIndividual(eid){
  var emp=emps.find(function(e){return e.id===eid;}); if(!emp)return '';
  var rc=jobRequiredCourses(eid);
  var h='<div style="background:#f7f8fa;border:1px solid #eceef1;border-radius:12px;padding:14px 16px;margin-top:6px">';
  if(!rc.hasJob){ return h+'<b>'+emp.name+'</b> has no job profile set. Set their job title under <b>Manage Employees</b> or <b>Job Profiles</b> first, and their required courses will appear here.</div>'; }
  var missing=rc.courses.filter(function(c){return !c.assigned;});
  h+='<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px"><div><b>'+emp.name+'</b> · Job profile: <b>'+rc.title+'</b><br><span style="font-size:.8rem;color:#6B7280">'+rc.courses.length+' required course'+(rc.courses.length===1?'':'s')+' · '+(rc.courses.length-missing.length)+' already assigned · '+missing.length+' to add'+(rc.tracked?' · '+rc.tracked+' tracked-only (no course)':'')+'</span></div>';
  h+='<button class="btn btn-p" style="width:auto'+(missing.length?'':';opacity:.5;pointer-events:none')+'" onclick="doAssignByJob()">Assign '+missing.length+' course'+(missing.length===1?'':'s')+'</button></div>';
  if(!rc.courses.length){ h+='<p style="color:#6B7280;font-size:.85rem">This job profile has no linked courses to assign'+(rc.tracked?' — its requirements are tracked-only':'')+'.</p>'; }
  else{ h+='<div class="tw"><table><thead><tr><th>Course</th><th>Title</th><th>Requirement</th><th>Status</th></tr></thead><tbody>';
    rc.courses.forEach(function(c){ h+='<tr><td style="font-weight:700;color:#FBB227">'+c.sc+'</td><td>'+c.title+(c.critical?' '+bg('Critical','red'):'')+'</td><td style="font-size:.76rem">'+c.itCode+'</td><td>'+(c.assigned?bg('✓ Assigned','green'):bg('To add','gold'))+'</td></tr>'; });
    h+='</tbody></table></div>'; }
  return h+'</div>';
}
function jobPreviewGroup(){
  var list=targetEmpsForJob();
  var withJob=0,toAdd=0,noJob=0;
  list.forEach(function(eid){ var rc=jobRequiredCourses(eid); if(rc.hasJob){ withJob++; toAdd+=rc.courses.filter(function(c){return !c.assigned;}).length; } else noJob++; });
  var h='<div style="background:#f7f8fa;border:1px solid #eceef1;border-radius:12px;padding:14px 16px;margin-top:6px">';
  h+='<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;align-items:center"><div><b>'+list.length+'</b> employee'+(list.length===1?'':'s')+' matched · <b>'+withJob+'</b> with a job profile · <b>'+toAdd+'</b> course assignment'+(toAdd===1?'':'s')+' to add'+(noJob?' · <span style="color:#b45309">'+noJob+' without a job profile</span>':'')+'</div>';
  h+='<button class="btn btn-p" style="width:auto'+(toAdd?'':';opacity:.5;pointer-events:none')+'" onclick="doAssignByJob()">Assign '+toAdd+' course'+(toAdd===1?'':'s')+'</button></div>';
  if(noJob)h+='<p style="font-size:.78rem;color:#6B7280;margin-top:8px">Employees without a job profile are skipped — set their job title first.</p>';
  return h+'</div>';
}
function doAssignByJob(){
  var list=targetEmpsForJob(); if(!list.length){alert('Select who to assign to first.');return;}
  var order=assigns.reduce(function(m,a){return Math.max(m,a.order||0);},0);
  var added=0, ppl={};
  list.forEach(function(eid){ var rc=jobRequiredCourses(eid); if(!rc.hasJob)return; rc.courses.forEach(function(c){ if(!c.assigned && !assigns.some(function(a){return a.eid===eid&&a.sc===c.sc;})){ order++; assigns.push({eid:eid,sc:c.sc,order:order,dt:now()}); added++; ppl[eid]=1; } }); });
  if(!added){alert('Nothing to add — those people already have all their job-required courses.');return;}
  save();render();alert('Assigned '+added+' course'+(added===1?'':'s')+' across '+Object.keys(ppl).length+' employee'+(Object.keys(ppl).length===1?'':'s')+'.');
}
function filterJbEmps(){ var q=(document.getElementById('jb-search').value||'').toLowerCase(); var sel=document.getElementById('jb-emp'); if(!sel)return; var opts='<option value="">Select...</option>'; emps.forEach(function(e){ if(!q||e.id.toLowerCase().indexOf(q)>=0||e.name.toLowerCase().indexOf(q)>=0)opts+='<option value="'+e.id+'"'+(asgnJobEid===e.id?' selected':'')+'>'+e.id+' — '+e.name+' ('+e.site+')</option>'; }); sel.innerHTML=opts; }

// =====================  UNIFIED TRAINING CONTENT EDITOR  =====================
var SOP_ACK_DEFAULT='I confirm that I have completed this training, that I understand its contents, and that it is my responsibility to apply it correctly in my work.';
function newContentReset(){ qmMode='list'; qmEi=null; qmQt=''; qmOpts=['','','','']; qmCor=0; qmBulk=''; }
function manageContent(id){ contentEditId=id; qmSopId=id; newContentReset(); render(); }
function closeContent(){ contentEditId=null; qmSopId=null; render(); }
function createContent(){ var code=document.getElementById('nc-code').value.trim(), title=document.getElementById('nc-title').value.trim(); if(!code||!title){alert('Enter a code and a title.');return;} if(sops.some(function(s){return s.code===code;})){alert('That code already exists.');return;} var s={id:gid(),code:code,rev:'Rev 1.0',title:title,desc:'',programme:'',cat:'General',site:'All Sites',html:'<h2>'+title+'</h2><p>Upload the document.</p>',docUrl:null,docName:null,vidUrl:null,vidName:null,slidesUrl:null,slidesName:null,qs:[],ackRequired:false,ackText:''}; sops.push(s); save(); manageContent(s.id); }
function saveContentDetails(id){ var s=sops.find(function(x){return x.id===id;}); if(!s)return; var nc=document.getElementById('ce-code').value.trim(); if(!nc){alert('Code is required.');return;} if(nc!==s.code&&sops.some(function(x){return x.code===nc;})){alert('Another item already uses that code.');return;} s.code=nc; s.rev=document.getElementById('ce-rev').value.trim()||'Rev 1.0'; s.title=document.getElementById('ce-title').value.trim()||s.title; s.desc=document.getElementById('ce-desc').value; s.programme=(document.getElementById('ce-prog')||{}).value||''; s.cat=document.getElementById('ce-cat').value||'General'; s.site=document.getElementById('ce-site').value||'All Sites'; save(); render(); alert('Details saved.'); }
function saveContentAck(id){ var s=sops.find(function(x){return x.id===id;}); if(!s)return; s.ackRequired=document.getElementById('ce-ackreq').checked; s.ackText=document.getElementById('ce-acktext').value.trim(); save(); render(); alert('Acknowledgement settings saved.'); }
function removeDoc(id){ if(!confirm('Remove the document from this item?'))return; var s=sops.find(function(x){return x.id===id;}); if(s){s.docUrl=null;s.docName=null;} save(); render(); }
function removeVid(id){ if(!confirm('Remove the video from this item?'))return; var s=sops.find(function(x){return x.id===id;}); if(s){s.vidUrl=null;s.vidName=null;} save(); render(); }

function renderContentEditor(id){
var s=sops.find(function(x){return x.id===id;}); if(!s){ contentEditId=null; return renderMSops(); }
var h='<div class="topbar"><div style="display:flex;align-items:center;gap:14px"><button class="btn btn-o btn-sm" onclick="closeContent()">← Back to list</button><div><h1>'+s.code+'</h1><span style="font-size:.76rem;color:#6B7280">'+s.title+'</span></div></div><button class="btn btn-o btn-sm" onclick="openSop(\''+s.id+'\')">👁 Preview as employee</button></div><div class="pc">';
// 1. Details
h+='<div class="card"><div class="ch"><h3>1. Details</h3></div><div class="cb"><div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">';
h+='<div class="fg"><label>Code</label><input id="ce-code" value="'+(s.code||'').replace(/"/g,'&quot;')+'"></div>';
h+='<div class="fg"><label>Revision</label><input id="ce-rev" value="'+(s.rev||'Rev 1.0').replace(/"/g,'&quot;')+'"></div>';
h+='<div class="fg" style="grid-column:span 2"><label>Title</label><input id="ce-title" value="'+(s.title||'').replace(/"/g,'&quot;')+'"></div>';
h+='<div class="fg" style="grid-column:span 2"><label>Description</label><textarea id="ce-desc">'+(s.desc||'')+'</textarea></div>';
h+='<div class="fg"><label>Programme</label>'+progSelect('ce-prog',s.programme||'')+'</div>';
h+='<div class="fg"><label>Category (subject)</label><input id="ce-cat" list="ce-cats" value="'+(s.cat||'').replace(/"/g,'&quot;')+'"><datalist id="ce-cats">'+catNames().map(function(c){return '<option value="'+c.replace(/"/g,'&quot;')+'">';}).join('')+'</datalist></div>';
h+='<div class="fg"><label>Site</label><select id="ce-site"><option>All Sites</option>'+sites.map(function(x){return '<option'+(s.site===x?' selected':'')+'>'+x+'</option>';}).join('')+'</select></div>';
h+='</div><button class="btn btn-p" style="width:auto;margin-top:12px" onclick="saveContentDetails(\''+id+'\')">Save details</button></div></div>';
// 2. Document
h+='<div class="card"><div class="ch"><h3>2. Document (PDF)</h3></div><div class="cb" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">'+(s.docName?bg(s.docName,'green'):bg('No document','gray'))+'<button class="btn btn-p btn-sm" onclick="uploadDoc(\''+id+'\')">Upload / Replace</button>'+(s.docName?'<button class="btn btn-o btn-sm" onclick="removeDoc(\''+id+'\')">Remove</button>':'')+'</div></div>';
// 3. Video
h+='<div class="card"><div class="ch"><h3>3. Video</h3></div><div class="cb" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">'+(s.vidName?bg(s.vidName,'green'):bg('No video','gray'))+'<button class="btn btn-p btn-sm" onclick="uploadVid(\''+id+'\')">Upload / Replace</button>'+(s.vidName?'<button class="btn btn-o btn-sm" onclick="removeVid(\''+id+'\')">Remove</button>':'')+'</div></div>';
// 4. Presentation
h+='<div class="card"><div class="ch"><h3>4. Presentation (slides PDF)</h3></div><div class="cb" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">'+(s.slidesName?bg(s.slidesName,'green'):bg('No slides','gray'))+'<button class="btn btn-p btn-sm" onclick="uploadSlides(\''+id+'\')">Upload / Replace</button>'+(s.slidesName?'<button class="btn btn-o btn-sm" onclick="removeSlides(\''+id+'\')">Remove</button>':'')+'</div></div>';
// 5. Questions
h+='<div class="card"><div class="ch"><h3>5. Questions ('+s.qs.length+')</h3></div><div class="cb">'+contentQPanel(s)+'</div></div>';
// 6. Acknowledgement
h+='<div class="card"><div class="ch"><h3>6. Acknowledgement (after the quiz)</h3></div><div class="cb">';
h+='<label style="display:flex;align-items:center;gap:8px;font-size:.9rem;margin-bottom:10px"><input type="checkbox" id="ce-ackreq" '+(s.ackRequired?'checked':'')+' style="width:16px;height:16px"> Require the employee to sign an acknowledgement after they pass the assessment</label>';
h+='<div class="fg"><label>Acknowledgement wording (leave blank to use the standard wording)</label><textarea id="ce-acktext" rows="3" placeholder="'+SOP_ACK_DEFAULT.replace(/"/g,'&quot;')+'">'+(s.ackText||'')+'</textarea></div>';
h+='<button class="btn btn-p" style="width:auto" onclick="saveContentAck(\''+id+'\')">Save acknowledgement</button></div></div>';
return h+'</div>';
}

function contentQPanel(sop){
var h='<div class="tabs"><div class="tab'+(qmMode==='add'?' a':'')+'" onclick="setQmMode(\'add\')">Add / Edit</div><div class="tab'+(qmMode==='bulk'?' a':'')+'" onclick="setQmMode(\'bulk\')">Bulk import</div><div class="tab'+(qmMode==='list'?' a':'')+'" onclick="setQmMode(\'list\')">All ('+sop.qs.length+')</div></div>';
if(qmMode==='add'){
h+='<div class="fg"><label>Question</label><textarea id="qm-qt" rows="3">'+qmQt+'</textarea></div>';
['A','B','C','D'].forEach(function(l,i){
h+='<div class="fg" style="display:flex;gap:10px;align-items:center"><label style="width:18px;margin:0">'+l+')</label><input id="qm-o'+i+'" value="'+qmOpts[i].replace(/"/g,'&quot;')+'" style="flex:1"><label style="display:flex;align-items:center;gap:4px;cursor:pointer;margin:0;font-size:.8rem"><input type="radio" name="qm-cor" '+(qmCor===i?'checked':'')+' onchange="qmCor='+i+'"> Correct</label></div>';});
if(qmEi!==null)h+='<div style="display:flex;gap:10px;margin-top:14px"><button class="btn btn-p" style="width:auto" onclick="updateQ()">Update</button><button class="btn btn-o" style="width:auto" onclick="cancelQEdit()">Cancel</button></div>';
else h+='<button class="btn btn-p" style="width:auto;margin-top:14px" onclick="addQ()">Add Question</button>';}
if(qmMode==='bulk'){
h+='<p style="font-size:.82rem;color:#6B7280;margin-bottom:12px">Number questions, A-D options. Mark correct with <b>*</b> or a line <b>Answer: B</b>.</p>';
h+='<pre style="background:#f3f4f6;padding:12px;border-radius:8px;font-size:.76rem;margin-bottom:12px">1. What is the pass mark?\nA. 60%\nB. 100%*\nC. 70%\nD. 90%</pre>';
h+='<div class="fg"><textarea id="qm-bulk" rows="10" placeholder="Paste questions, or use Upload below...">'+qmBulk+'</textarea></div>';
h+='<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-p" style="width:auto" onclick="importBulk()">Import Pasted</button><button class="btn btn-s" style="width:auto" onclick="uploadBulkQs()">📄 Upload .csv / .txt</button><button class="btn btn-o" style="width:auto" onclick="dlQTemplate()">📥 CSV Template</button></div>';}
if(qmMode==='list'){
if(!sop.qs.length)h+='<p style="color:#6B7280;text-align:center;padding:20px">No questions yet. Use Add / Edit or Bulk import.</p>';
else sop.qs.forEach(function(q,i){
h+='<div style="padding:10px 0;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;gap:12px"><div style="flex:1"><b style="color:#FBB227">Q'+(i+1)+'.</b> '+q.t+'<br><span style="font-size:.8rem;color:#22C55E">✓ '+String.fromCharCode(65+q.c)+') '+q.o[q.c]+'</span></div><div style="display:flex;gap:5px;flex-shrink:0"><button class="btn btn-o btn-sm" onclick="editQ('+i+')">Edit</button><button class="btn btn-d btn-sm" onclick="deleteQ(\''+q.id+'\')">Del</button></div></div>';});}
return h;
}

// ---------- employee: acknowledgement after passing ----------
function sopAcked(eid,sc){ return acks.some(function(a){return a.eid===eid&&a.oid==='SOP:'+sc;}); }
function sopAckRec(eid,sc){ return acks.find(function(a){return a.eid===eid&&a.oid==='SOP:'+sc;}); }
async function acknowledgeSop(sc){ var cb=document.getElementById('sop-ack'); if(!cb||!cb.checked){alert('Please tick the acknowledgement to complete the module.');return;} if(sopAcked(user.id,sc)){render();return;} acks.push({id:gid(),eid:user.id,oid:'SOP:'+sc,at:now()}); var ok=await save(); if(!ok)alert('⚠️ Save may have failed — please check your connection and try again.'); render(); }
function erToggleCo(v){ var c=decodeURIComponent(v); var i=erCo.indexOf(c); if(i>=0)erCo.splice(i,1); else erCo.push(c); render(); }
