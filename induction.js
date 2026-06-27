// ===================================================================
// THUTSE / ONE MINING TRAINING DEMO — MINE INDUCTION ENGINE (3-LEVEL)
// Structure: TIER  ->  MODULE  ->  TOPIC.
// Each TOPIC = one video + an ASSESSMENT (100% pass, 3 attempts, then LOCK).
// Each MODULE has ONE acknowledgement, shown after ALL its topics are
//   passed. The module is complete when every topic is passed AND the
//   module acknowledgement is signed. Induction is complete when all
//   modules are complete.
// Topic/module content is provided by induction-content-*.js as the global
//   INDUCTION_CONTENT array. Videos (MP4) upload to Supabase Storage bucket
//   'induction-videos'. Loaded before app.js. Globals used: sb, gid, now,
//   cloudLoad/Save, bg, logAudit, saveTNA, render, user, emps.
// ===================================================================

var IND_CONTENT_VER = 'topics-v2';
var inductionModules = [];   // {id,tier,title,intro,ack,active,topics:[{id,title,content,video,qs:[{id,t,o,c}]}]}
var inductionComp    = [];   // {id,eid,mid,tid,kind:'topic'|'moduleack',dt,pct}
var inductionAtt     = [];   // {eid,mid,tid,dt,pct,pass}
var inductionIntros  = {};   // {welcome,t1,t2,t3} -> video url
var indActiveMod = null, indActiveTopic = null, indAns = {}, indResult = null;
var indAssessing = false, indWatched = {};   // gating: must watch the topic video before assessment
var indAdminEdit = null, indAdminTopic = null, indAdminTab = 'modules', indEditQ = null;

async function indLoad(){
  inductionModules = await cloudLoad('induction_modules', []);
  inductionComp    = await cloudLoad('induction_comp', []);
  inductionAtt     = await cloudLoad('induction_att', []);
  inductionIntros  = await cloudLoad('induction_intros', {});
  var ver = await cloudLoad('induction_ver', '');
  var hasTopics = inductionModules.length && inductionModules[0] && inductionModules[0].topics;
  if(!inductionModules.length || ver!==IND_CONTENT_VER || !hasTopics){
    inductionModules = seedInductionModules();
    inductionComp = []; inductionAtt = [];
    await Promise.all([
      cloudSave('induction_modules', inductionModules),
      cloudSave('induction_comp', []),
      cloudSave('induction_att', []),
      cloudSave('induction_ver', IND_CONTENT_VER)
    ]);
  }
}

function seedInductionModules(){
  var src = (typeof INDUCTION_CONTENT!=='undefined' && INDUCTION_CONTENT) ? INDUCTION_CONTENT : [];
  return src.map(function(mod){
    return {
      id:gid(), tier:mod.tier, title:mod.module, intro:mod.intro||'', ack:mod.ack||'', active:true,
      topics:(mod.topics||[]).map(function(tp){
        return {
          id:gid(), title:tp.title,
          content:tp.content||('<p><b>'+tp.title+'</b></p>'),
          video:'',
          qs:(tp.qs||[]).map(function(q){ return {id:gid(), t:q.t, o:q.o.slice(), c:q.c}; })
        };
      })
    };
  });
}

async function indSave(){
  var r = await Promise.all([
    cloudSave('induction_modules', inductionModules),
    cloudSave('induction_comp', inductionComp),
    cloudSave('induction_att', inductionAtt),
    cloudSave('induction_intros', inductionIntros)
  ]); return r.every(function(x){return x});
}

// ---- lookups & status ----
function indActiveModules(){ return inductionModules.filter(function(m){return m.active!==false;}); }
function indModule(mid){ for(var i=0;i<inductionModules.length;i++) if(inductionModules[i].id===mid) return inductionModules[i]; return null; }
function indTopic(mid,tid){ var m=indModule(mid); if(!m)return null; for(var i=0;i<(m.topics||[]).length;i++) if(m.topics[i].id===tid) return m.topics[i]; return null; }
function topicPassed(eid,tid){ return inductionComp.some(function(c){return c.eid===eid&&c.tid===tid&&c.kind==='topic';}); }
function topicAttempts(eid,tid){ return inductionAtt.filter(function(a){return a.eid===eid&&a.tid===tid;}); }
function topicLocked(eid,tid){ var a=topicAttempts(eid,tid); return a.length>=3 && !topicPassed(eid,tid); }
function moduleAcked(eid,mid){ return inductionComp.some(function(c){return c.eid===eid&&c.mid===mid&&c.kind==='moduleack';}); }
function allTopicsPassed(eid,m){ var t=(m.topics||[]); return t.length>0 && t.every(function(tp){return topicPassed(eid,tp.id);}); }
function moduleDone(eid,m){ return allTopicsPassed(eid,m) && moduleAcked(eid,m.id); }
function moduleCounts(eid,m){ var t=(m.topics||[]); var done=0,locked=0; t.forEach(function(tp){ if(topicPassed(eid,tp.id))done++; else if(topicLocked(eid,tp.id))locked++; }); return {total:t.length,done:done,locked:locked}; }
function indCounts(eid){ var total=0,done=0,locked=0; indActiveModules().forEach(function(m){ var c=moduleCounts(eid,m); total+=c.total; done+=c.done; locked+=c.locked; }); return {total:total,done:done,locked:locked,outstanding:total-done}; }
function indCompetent(eid){ var mods=indActiveModules(); var any=false; for(var i=0;i<mods.length;i++){ if((mods[i].topics||[]).length){ any=true; if(!moduleDone(eid,mods[i])) return false; } } return any; }
function indModAckText(m){ return (m&&m.ack) ? m.ack : 'I confirm that I have completed all the topics and assessments in this module, that I understand the key points, and that I will comply with the requirements.'; }

// Branded SVG icon auto-picked from the topic title (matches the icon + title + one-line layout)
function indIcon(title){
  var t=(title||'').toLowerCase();
  var I={
   shield:'<svg viewBox="0 0 64 64" width="50" height="50"><path d="M32 6 L54 13 V31 C54 44 45 53 32 58 C19 53 10 44 10 31 V13 Z" fill="#FBB227"/><path d="M23 31 l6 7 13 -15" fill="none" stroke="#243034" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
   person:'<svg viewBox="0 0 64 64" width="50" height="50"><circle cx="32" cy="24" r="11" fill="#243034"/><path d="M20 22 a12 12 0 0 1 24 0 Z" fill="#FBB227"/><rect x="18" y="20" width="28" height="4" rx="2" fill="#FBB227"/><path d="M14 56 a18 18 0 0 1 36 0 Z" fill="#243034"/></svg>',
   stop:'<svg viewBox="0 0 64 64" width="50" height="50"><circle cx="32" cy="32" r="24" fill="#EF4444"/><text x="32" y="37" text-anchor="middle" font-size="12" fill="#ffffff" font-family="Arial" font-weight="bold">STOP</text></svg>',
   clip:'<svg viewBox="0 0 64 64" width="50" height="50"><rect x="16" y="12" width="32" height="40" rx="4" fill="#243034"/><rect x="26" y="8" width="12" height="8" rx="2" fill="#FBB227"/><rect x="22" y="24" width="20" height="3" rx="1.5" fill="#ffffff"/><rect x="22" y="31" width="20" height="3" rx="1.5" fill="#ffffff"/><circle cx="46" cy="45" r="9" fill="#22C55E"/><path d="M46 41 v8 M42 45 l4 -4 4 4" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
   people:'<svg viewBox="0 0 64 64" width="50" height="50"><g fill="#243034"><circle cx="18" cy="25" r="7"/><path d="M8 47 a10 10 0 0 1 20 0 Z"/></g><g fill="#6B7280"><circle cx="32" cy="21" r="8"/><path d="M20 49 a12 12 0 0 1 24 0 Z"/></g><g fill="#FBB227"><circle cx="46" cy="25" r="7"/><path d="M36 47 a10 10 0 0 1 20 0 Z"/></g></svg>',
   warn:'<svg viewBox="0 0 64 64" width="50" height="50"><path d="M32 8 L58 54 H6 Z" fill="#FBB227"/><rect x="29" y="24" width="6" height="16" rx="3" fill="#243034"/><circle cx="32" cy="47" r="3.2" fill="#243034"/></svg>',
   flame:'<svg viewBox="0 0 64 64" width="50" height="50"><path d="M34 6 C40 20 50 24 44 40 a13 13 0 1 1 -24 -2 C18 30 24 28 24 20 C29 26 31 22 34 6 Z" fill="#EF4444"/><path d="M33 32 c4 5 6 8 4 13 a7 7 0 1 1 -10 -3 c2 3 3 2 4 -2 c1 2 1 1 2 -8 Z" fill="#FBB227"/></svg>',
   drop:'<svg viewBox="0 0 64 64" width="50" height="50"><path d="M32 8 C44 26 50 34 50 42 a18 18 0 1 1 -36 0 C14 34 20 26 32 8 Z" fill="#243034"/><path d="M42 42 a10 10 0 0 1 -10 10" fill="none" stroke="#FBB227" stroke-width="3" stroke-linecap="round"/></svg>',
   truck:'<svg viewBox="0 0 64 64" width="50" height="50"><rect x="6" y="24" width="30" height="18" rx="2" fill="#FBB227"/><path d="M36 28 h11 l9 8 v6 H36 Z" fill="#243034"/><circle cx="18" cy="46" r="6" fill="#243034"/><circle cx="46" cy="46" r="6" fill="#243034"/></svg>',
   bolt:'<svg viewBox="0 0 64 64" width="50" height="50"><circle cx="32" cy="32" r="24" fill="#243034"/><path d="M35 14 L22 36 H31 L29 50 L43 28 H34 Z" fill="#FBB227"/></svg>',
   cross:'<svg viewBox="0 0 64 64" width="50" height="50"><rect x="10" y="10" width="44" height="44" rx="10" fill="#22C55E"/><rect x="28" y="18" width="8" height="28" rx="2" fill="#ffffff"/><rect x="18" y="28" width="28" height="8" rx="2" fill="#ffffff"/></svg>',
   box:'<svg viewBox="0 0 64 64" width="50" height="50"><path d="M32 8 L54 18 V40 L32 50 L10 40 V18 Z" fill="#FBB227"/><path d="M10 18 L32 28 L54 18 M32 28 V50" fill="none" stroke="#243034" stroke-width="3" stroke-linejoin="round"/></svg>',
   burst:'<svg viewBox="0 0 64 64" width="50" height="50"><path d="M32 6 l5 13 11 -7 -3 13 13 2 -10 8 9 10 -13 -1 -1 13 -9 -9 -9 9 -1 -13 -13 1 9 -10 -10 -8 13 -2 -3 -13 11 7 Z" fill="#FBB227"/><circle cx="32" cy="33" r="6" fill="#EF4444"/></svg>',
   badge:'<svg viewBox="0 0 64 64" width="50" height="50"><circle cx="32" cy="32" r="24" fill="#243034"/><path d="M22 32 l7 8 14 -16" fill="none" stroke="#FBB227" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  if(/refuse|right to|leave dangerous|stop|emergency|alarm|evacuat|assembly/.test(t)) return I.stop;
  if(/explosive|blast|misfire/.test(t)) return I.burst;
  if(/fire/.test(t)) return I.flame;
  if(/electric|isolation|lock-?out|loto|energy/.test(t)) return I.bolt;
  if(/tmm|mobile|traffic|pedestrian|lifting|suspended|vehicle/.test(t)) return I.truck;
  if(/report|incident|near-miss|raising the alarm/.test(t)) return I.clip;
  if(/rep|committee|leadership|observation|interven|brother|behaviour/.test(t)) return I.people;
  if(/hazard|hira|risk|ground|fall of ground|excavation|highwall|height|harness|fall protection/.test(t)) return I.warn;
  if(/confined/.test(t)) return I.box;
  if(/housekeep|storage|slip|trip|access|layout/.test(t)) return I.box;
  if(/chemical|hcs|sds|spill|water|dust|environment|waste|heritage|hygiene|noise/.test(t)) return I.drop;
  if(/first aid|medical|fitness|hiv|tb|fatigue|alcohol|drug|thermal|heat|health|vibration/.test(t)) return I.cross;
  if(/employer|policy|golden|consequence|permit|conduct|misconduct|grievance|ppe|protective/.test(t)) return I.shield;
  if(/employee/.test(t)) return I.person;
  return I.badge;
}

// =====================  EMPLOYEE: MY INDUCTION  =====================
function renderMyInduction(){
  var eid=user.id;
  if(indActiveMod && indActiveTopic) return renderTopicView(eid, indActiveMod, indActiveTopic);
  if(indActiveMod) return renderModuleView(eid, indActiveMod);
  var c=indCounts(eid); var pct=c.total?Math.round(c.done/c.total*100):0;
  var h='<div class="topbar"><h1>Mine Induction</h1><span style="font-size:.78rem;color:#6B7280">'+(indCompetent(eid)?'✓ Induction complete':c.done+' of '+c.total+' topics done')+'</span></div><div class="pc">';
  h+='<div class="card"><div class="cb"><b>Welcome to your Mine Induction</b><p style="margin-top:6px;color:#374151;line-height:1.6">Everyone who works on the mine — every employee and contractor — must complete this induction before doing any work. Each <b>module</b> is made up of several <b>topics</b>; every topic has a short <b>video</b> and a <b>short assessment</b> (pass mark <b>100%</b>, <b>3 attempts</b>). Once you have passed all the topics in a module, you sign <b>one acknowledgement</b> for that module. If you have any difficulty, contact your <b>Manager</b> or the <b>Training Department</b> immediately. <b>No person may perform work on the mine until their induction is complete.</b></p>'+(inductionIntros.welcome?'<video controls playsinline style="width:100%;border-radius:8px;background:#000;margin-top:10px" src="'+inductionIntros.welcome+'"></video>':'')+'</div></div>';
  h+='<div class="card"><div class="cb"><div style="display:flex;justify-content:space-between;margin-bottom:6px"><b>Progress</b><span>'+pct+'%</span></div><div class="pb"><div class="pf '+(pct===100?'gn':'gd')+'" style="width:'+pct+'%"></div></div>';
  if(indCompetent(eid)) h+='<p style="color:#22C55E;font-weight:600;margin-top:10px">🎉 You have completed your Mine Induction.</p>';
  h+='</div></div>';
  [[1,'Tier 1 — General Induction'],[2,'Tier 2 — Health, Wellness & Conduct'],[3,'Tier 3 — Major Mining Risks']].forEach(function(t){
    var mods=indActiveModules().filter(function(m){return m.tier===t[0];}); if(!mods.length)return;
    h+='<div class="card"><div class="ch"><h3>'+t[1]+'</h3></div><div class="cb">';
    var tiv=inductionIntros['t'+t[0]]; if(tiv) h+='<video controls playsinline style="width:100%;border-radius:8px;background:#000;margin-bottom:10px" src="'+tiv+'"></video>';
    mods.forEach(function(m){
      var mc=moduleCounts(eid,m); var md=moduleDone(eid,m); var ackPend=allTopicsPassed(eid,m)&&!moduleAcked(eid,m.id);
      var st=md?bg('Complete','green'):ackPend?bg('Acknowledge','gold'):bg(mc.done+'/'+mc.total+' topics','gold');
      h+='<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0"><div><b>'+m.title+'</b><br><span style="font-size:.78rem;color:#6B7280">'+mc.total+' topic'+(mc.total===1?'':'s')+'</span></div><div style="display:flex;gap:8px;align-items:center">'+st+'<button class="btn btn-p btn-sm" onclick="indActiveMod=\''+m.id+'\';indActiveTopic=null;render()">Open</button></div></div>';
    });
    h+='</div></div>';
  });
  return h+'</div>';
}

function renderModuleView(eid, mid){
  var m=indModule(mid); if(!m){ indActiveMod=null; return renderMyInduction(); }
  var h='<div class="topbar"><div style="display:flex;align-items:center;gap:12px"><button class="btn btn-o btn-sm" onclick="indActiveMod=null;indActiveTopic=null;render()">← Back</button><div><h1>'+m.title+'</h1><span style="font-size:.78rem;color:#6B7280">'+(m.topics||[]).length+' topics · pass each, then acknowledge the module</span></div></div></div><div class="pc">';
  if(m.intro) h+='<div class="card"><div class="cb">'+m.intro+'</div></div>';
  h+='<div class="card"><div class="cb">';
  (m.topics||[]).forEach(function(tp,i){
    var pass=topicPassed(eid,tp.id), lk=topicLocked(eid,tp.id);
    var st=pass?bg('Passed','green'):lk?bg('Locked','red'):bg('Outstanding','gray');
    var desc=(tp.content||'').replace(/<[^>]+>/g,'').trim();
    h+='<div style="display:flex;gap:14px;align-items:center;padding:14px 4px;border-bottom:1px solid #f0f0f0">'+
         '<div style="flex-shrink:0;width:54px;text-align:center">'+indIcon(tp.title)+'</div>'+
         '<div style="flex:1;min-width:0"><span style="color:#6B7280;font-size:.75rem">Topic '+(i+1)+'</span><br><b>'+tp.title+'</b> '+(tp.video?'<span title="video uploaded" style="color:#22C55E">📹</span>':'')+(desc?'<br><span style="color:#374151;font-size:.9rem">'+desc+'</span>':'')+'</div>'+
         '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0">'+st+'<button class="btn btn-d btn-sm" onclick="redoTopic(\''+eid+'\',\''+mid+'\',\''+tp.id+'\')">Redo</button><button class="btn '+(pass?'btn-o':'btn-p')+' btn-sm" onclick="indActiveTopic=\''+tp.id+'\';indAns={};indResult=null;indAssessing=false;render()">'+(pass?'Review':lk?'View':'Open')+'</button></div>'+
       '</div>';
  });
  if(!(m.topics||[]).length) h+='<div style="text-align:center;color:#6B7280;padding:16px">No topics added to this module yet.</div>';
  h+='</div></div>';
  // module acknowledgement
  if(moduleAcked(eid,mid)){
    h+='<div class="card"><div class="cb" style="text-align:center;padding:22px"><div class="ri ps">✓</div><h2 style="color:#22C55E">Module Complete</h2><p style="color:#6B7280;margin-top:6px">All topics passed and the module acknowledged.</p><button class="btn btn-d btn-sm" style="width:auto;margin-top:10px" onclick="redoModuleAck(\''+eid+'\',\''+mid+'\')">Undo acknowledgement (testing)</button></div></div>';
  } else if(allTopicsPassed(eid,m)){
    h+='<div class="card"><div class="ch"><h3>Module acknowledgement</h3></div><div class="cb"><p style="color:#6B7280;font-size:.85rem;margin-bottom:8px">You have passed every topic in this module. Please confirm your understanding to complete the module.</p><label style="display:flex;gap:10px;align-items:flex-start;font-size:.92rem"><input type="checkbox" id="ind-ack" style="margin-top:3px;width:18px;height:18px"> <span>'+indModAckText(m)+'</span></label><div style="text-align:center;margin-top:14px"><button class="btn btn-p" style="width:auto;padding:12px 40px" onclick="ackModule(\''+mid+'\')">Acknowledge & Complete Module</button></div></div></div>';
  } else {
    h+='<div class="card"><div class="cb" style="color:#6B7280;font-size:.85rem">Pass all topics above to unlock the module acknowledgement.</div></div>';
  }
  return h+'</div>';
}

function renderTopicView(eid, mid, tid){
  var m=indModule(mid), tp=indTopic(mid,tid);
  if(!tp){ indActiveTopic=null; return renderModuleView(eid,mid); }
  var idx=0, tot=(m&&m.topics)?m.topics.length:0; if(m&&m.topics){ for(var i=0;i<m.topics.length;i++){ if(m.topics[i].id===tid){ idx=i+1; break; } } }
  var pass=topicPassed(eid,tid), lk=topicLocked(eid,tid), att=topicAttempts(eid,tid);
  var watched = indWatched[tid] || !tp.video;   // if no video uploaded yet, nothing to gate on
  var vlabel = 'Video '+idx+' of '+tot;
  var h='<div class="topbar"><div style="display:flex;align-items:center;gap:12px"><button class="btn btn-o btn-sm" onclick="indActiveTopic=null;indAns={};indResult=null;indAssessing=false;render()">← Back</button><div><h1>'+tp.title+'</h1><span style="font-size:.78rem;color:#6B7280">'+(m?m.title:'')+' · '+vlabel+'</span></div></div></div><div class="pc">';
  if(tp.content) h+='<div class="card"><div class="cb">'+tp.content+'</div></div>';

  // PASSED — review (video available again)
  if(pass && !indResult){
    if(tp.video) h+='<div class="card"><div class="ch"><h3>'+vlabel+' — '+tp.title+'</h3></div><div class="cb"><video controls playsinline style="width:100%;border-radius:8px;background:#000" src="'+tp.video+'"></video></div></div>';
    h+='<div class="card"><div class="cb" style="text-align:center;padding:24px"><div class="ri ps">✓</div><h2 style="color:#22C55E">Topic Passed</h2><button class="btn btn-p" style="width:auto;margin-top:10px" onclick="indActiveTopic=null;indAssessing=false;render()">Back to module</button></div></div>';
    return h+'</div>';
  }
  // LOCKED
  if(lk){ h+='<div class="card"><div class="cb" style="text-align:center;padding:30px"><div class="ri fl">✕</div><h2 style="color:#EF4444">Locked</h2><p style="color:#6B7280;margin-top:8px">3 attempts used. Please contact your Manager or the Training Department.</p></div></div>'; return h+'</div>'; }
  // RESULT (video stays hidden)
  if(indResult){
    var r=indResult;
    h+='<div class="card"><div class="cb" style="text-align:center;padding:30px"><div class="ri '+(r.pass?'ps':'fl')+'">'+(r.pass?'✓':'✕')+'</div><h2 style="color:'+(r.pass?'#22C55E':'#EF4444')+'">'+(r.pass?'COMPETENT':'NOT YET COMPETENT')+'</h2><p style="font-size:1.4rem;font-weight:700">'+r.pct+'%</p><p style="color:#6B7280">'+r.score+'/'+r.total+' · 100% to pass · Attempt '+r.att+'/3</p>';
    if(r.pass) h+='<button class="btn btn-p" style="width:auto;margin-top:12px" onclick="indResult=null;indActiveTopic=null;indAssessing=false;render()">Continue</button>';
    if(!r.pass&&r.att<3) h+='<button class="btn btn-p" style="width:auto;margin-top:12px" onclick="indResult=null;indAns={};indAssessing=true;render()">Try again ('+(r.att+1)+'/3)</button>';
    if(!r.pass&&r.att>=3) h+='<p style="color:#EF4444;font-weight:600;margin-top:12px">All 3 attempts used. Please contact your Manager or the Training Department.</p>';
    h+='</div></div>';
    return h+'</div>';
  }
  // ASSESSMENT PHASE — video is hidden
  if(indAssessing){
    if(!tp.qs||!tp.qs.length){ h+='<div class="card"><div class="cb" style="text-align:center;color:#6B7280;padding:20px">No assessment is set for this topic yet.</div></div>'; return h+'</div>'; }
    h+='<div class="card"><div class="ch"><h3>Assessment — '+vlabel+' ('+tp.qs.length+' questions · 100% to pass · Attempt '+(att.length+1)+'/3)</h3></div><div class="cb">';
    h+='<p style="font-size:.82rem;color:#6B7280;margin:0 0 8px">The video is hidden during the assessment. You may re-watch it, but the assessment will then restart.</p>';
    tp.qs.forEach(function(q,qi){ h+='<div class="qc"><div class="qn">Question '+(qi+1)+'</div><div class="qt">'+q.t+'</div>';
      q.o.forEach(function(o,oi){ h+='<div class="op'+(indAns[q.id]===oi?' sel':'')+'" onclick="indAns[\''+q.id+'\']='+oi+';render()"><span class="lt">'+String.fromCharCode(65+oi)+'</span><span>'+o+'</span></div>'; });
      h+='</div>';
    });
    h+='<div style="display:flex;gap:10px;justify-content:center;align-items:center;padding:14px 0;flex-wrap:wrap"><button class="btn btn-p" style="width:auto;padding:12px 44px" onclick="submitTopic(\''+mid+'\',\''+tid+'\')">Submit</button><button class="btn btn-o btn-sm" style="width:auto" onclick="rewatchIndVideo(\''+tid+'\')">Re-watch video (restarts assessment)</button></div></div></div>';
    return h+'</div>';
  }
  // VIDEO PHASE — watch the video to unlock the assessment
  if(tp.video){
    h+='<div class="card"><div class="ch"><h3>'+vlabel+' — '+tp.title+'</h3></div><div class="cb"><video controls playsinline style="width:100%;border-radius:8px;background:#000" src="'+tp.video+'" onended="indMarkWatched(\''+tid+'\')"></video>';
    h+='<p style="font-size:.82rem;color:'+(watched?'#22C55E':'#6B7280')+';margin-top:8px">'+(watched?'✓ Video watched — you may start the assessment. You can replay it any time before you start.':'Please watch the full video to unlock the assessment. You may replay it as many times as you like.')+'</p></div></div>';
  } else {
    h+='<div class="card"><div class="cb" style="color:#6B7280;font-size:.85rem">📹 The video for this topic will appear here once uploaded. (Until then the assessment is open for testing.)</div></div>';
  }
  h+='<div class="card"><div class="cb" style="text-align:center"><button class="btn '+(watched?'btn-p':'btn-o')+'" style="width:auto;padding:12px 40px"'+(watched?'':' disabled')+' onclick="startIndAssessment(\''+mid+'\',\''+tid+'\')">Start assessment</button>'+(watched?'':'<p style="font-size:.78rem;color:#6B7280;margin-top:6px">Watch the full video first.</p>')+'</div></div>';
  return h+'</div>';
}
function indMarkWatched(tid){ indWatched[tid]=true; render(); }
function startIndAssessment(mid,tid){ var tp=indTopic(mid,tid); if(tp && tp.video && !indWatched[tid]){ alert('Please watch the full video before starting the assessment.'); return; } indAssessing=true; indAns={}; indResult=null; render(); }
function rewatchIndVideo(tid){ if(!confirm('Re-watch the video? Your current answers will be cleared and the assessment will restart.')) return; indAssessing=false; indAns={}; indWatched[tid]=false; render(); }

function submitTopic(mid,tid){
  var tp=indTopic(mid,tid); if(!tp) return;
  if(!tp.qs||!tp.qs.length){ alert('No assessment is set for this topic yet.'); return; }
  if(Object.keys(indAns).length<tp.qs.length){ alert('Please answer all questions.'); return; }
  var score=0; tp.qs.forEach(function(q){ if(indAns[q.id]===q.c) score++; });
  var pct=Math.round(score/tp.qs.length*100); var pass=pct>=100;
  var att=topicAttempts(user.id,tid).length+1;
  inductionAtt.push({eid:user.id,mid:mid,tid:tid,dt:now(),pct:pct,pass:pass});
  if(pass && !topicPassed(user.id,tid)){ inductionComp.push({id:gid(),eid:user.id,mid:mid,tid:tid,kind:'topic',dt:now(),pct:pct}); }
  if(typeof logAudit==='function') logAudit('INDUCTION ASSESSMENT', user.id+' · '+tp.title, (pass?'PASS ':'FAIL ')+pct+'% (attempt '+att+'/3)');
  indResult={pass:pass,pct:pct,score:score,total:tp.qs.length,att:att};
  indSave().then(function(){ if(typeof saveTNA==='function')saveTNA(); render(); });
}
function ackModule(mid){
  var m=indModule(mid); if(!m) return;
  if(!allTopicsPassed(user.id,m)){ alert('Please pass all topics first.'); return; }
  var cb=document.getElementById('ind-ack'); if(!cb||!cb.checked){ alert('Please tick the acknowledgement to complete the module.'); return; }
  if(!moduleAcked(user.id,mid)) inductionComp.push({id:gid(),eid:user.id,mid:mid,tid:null,kind:'moduleack',dt:now(),pct:null});
  if(typeof logAudit==='function') logAudit('INDUCTION MODULE ACK', user.id+' · '+m.title, 'all topics passed + module acknowledged');
  indSave().then(function(){ if(typeof saveTNA==='function')saveTNA(); render(); });
}
function redoTopic(eid,mid,tid){
  inductionComp=inductionComp.filter(function(c){return !(c.eid===eid&&c.tid===tid&&c.kind==='topic');});
  inductionAtt=inductionAtt.filter(function(a){return !(a.eid===eid&&a.tid===tid);});
  // a topic re-do invalidates the module acknowledgement
  inductionComp=inductionComp.filter(function(c){return !(c.eid===eid&&c.mid===mid&&c.kind==='moduleack');});
  indResult=null; indAns={};
  if(typeof logAudit==='function') logAudit('INDUCTION REDO', eid+' · '+((indTopic(mid,tid)||{}).title||''), 'redo topic (testing)');
  indSave().then(function(){ render(); });
}
function redoModuleAck(eid,mid){
  inductionComp=inductionComp.filter(function(c){return !(c.eid===eid&&c.mid===mid&&c.kind==='moduleack');});
  if(typeof logAudit==='function') logAudit('INDUCTION REDO', eid+' · '+((indModule(mid)||{}).title||''), 'undo module ack (testing)');
  indSave().then(function(){ render(); });
}

// =====================  ADMIN: MANAGE INDUCTION  =====================
function renderManageInduction(){
  if(indAdminEdit!==null) return renderIndModuleForm();
  var h='<div class="topbar"><h1>Manage Induction</h1><div style="display:flex;gap:8px"><button class="btn '+(indAdminTab==='modules'?'btn-p':'btn-o')+' btn-sm" onclick="indAdminTab=\'modules\';render()">Modules</button><button class="btn '+(indAdminTab==='progress'?'btn-p':'btn-o')+' btn-sm" onclick="indAdminTab=\'progress\';render()">Employee Progress</button><button class="btn '+(indAdminTab==='intros'?'btn-p':'btn-o')+' btn-sm" onclick="indAdminTab=\'intros\';render()">Intro Videos</button></div></div><div class="pc">';
  if(indAdminTab==='intros'){
    var rows=[['welcome','Welcome / Induction Introduction (induction landing page)'],['t1','Tier 1 — General Induction intro (top of Tier 1)'],['t2','Tier 2 — Health, Wellness & Conduct intro (top of Tier 2)'],['t3','Tier 3 — Major Mining Risks intro (top of Tier 3)']];
    h+='<div class="card"><div class="cb"><p style="color:#6B7280;font-size:.85rem;margin-bottom:6px">The Welcome video shows on the induction landing page; each tier intro shows at the top of that tier for employees.</p>';
    rows.forEach(function(r){ var key=r[0],lbl=r[1],url=inductionIntros[key];
      h+='<div style="padding:12px 0;border-bottom:1px solid #f0f0f0"><b>'+lbl+'</b><div style="margin-top:6px">';
      if(url) h+='<video controls playsinline style="width:100%;max-width:480px;border-radius:8px;background:#000" src="'+url+'"></video><div style="margin:6px 0"><button class="btn btn-d btn-sm" onclick="removeIndIntro(\''+key+'\')">Remove</button></div>';
      h+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="file" id="ii-file-'+key+'" accept="video/mp4,video/*"><button class="btn btn-o btn-sm" style="width:auto" onclick="uploadIndIntro(\''+key+'\')">Upload</button><span id="ii-status-'+key+'" style="font-size:.82rem;color:#6B7280"></span></div></div></div>';
    });
    return h+'</div></div></div>';
  }
  if(indAdminTab==='progress'){
    h+='<div class="card"><div class="tw"><table><thead><tr><th>Emp#</th><th>Name</th><th>Site</th><th>Topics done</th><th>Locked</th><th>Status</th><th>Reset</th></tr></thead><tbody>';
    emps.forEach(function(e){ var c=indCounts(e.id);
      h+='<tr><td style="font-weight:700;color:#FBB227">'+e.id+'</td><td>'+e.name+'</td><td style="font-size:.8rem">'+e.site+'</td><td>'+c.done+'/'+c.total+'</td><td>'+(c.locked?bg(c.locked,'red'):'-')+'</td><td>'+(indCompetent(e.id)?bg('Complete','green'):bg('In progress','gold'))+'</td><td>'+(c.locked||c.done?'<button class="btn btn-o btn-sm" onclick="resetEmpInduction(\''+e.id+'\')">Reset</button>':'-')+'</td></tr>';
    });
    return h+'</tbody></table></div></div></div>';
  }
  h+='<div style="margin-bottom:10px"><button class="btn btn-p btn-sm" onclick="indAdminEdit=\'new\';indAdminTopic=null;render()">+ Add Module</button></div>';
  [[1,'Tier 1 — General'],[2,'Tier 2 — Health, Wellness & Conduct'],[3,'Tier 3 — Major Mining Risks'],[4,'Tier 4 — Role/Site-specific']].forEach(function(t){
    var mods=inductionModules.filter(function(m){return m.tier===t[0];}); if(!mods.length) return;
    h+='<div class="card"><div class="ch"><h3>'+t[1]+' ('+mods.length+')</h3></div><div class="tw"><table><thead><tr><th>Module</th><th>Topics</th><th>Videos</th><th>Ack</th><th>Actions</th></tr></thead><tbody>';
    mods.forEach(function(m){ var tt=(m.topics||[]); var vids=tt.filter(function(x){return x.video;}).length;
      h+='<tr'+(m.active===false?' style="opacity:.5"':'')+'><td>'+m.title+'</td><td>'+tt.length+'</td><td>'+vids+'/'+tt.length+'</td><td>'+(m.ack?bg('✓','green'):bg('—','gray'))+'</td><td style="white-space:nowrap"><button class="btn btn-o btn-sm" onclick="indAdminEdit=\''+m.id+'\';indAdminTopic=null;render()">Edit</button> <button class="btn btn-d btn-sm" onclick="delIndModule(\''+m.id+'\')">Del</button></td></tr>'; });
    h+='</tbody></table></div></div>';
  });
  return h+'</div>';
}

function renderIndModuleForm(){
  if(indAdminTopic!==null) return renderIndTopicForm();
  var isNew=(indAdminEdit==='new');
  var m=isNew?{id:'',tier:1,title:'',intro:'',ack:'',topics:[],active:true}:indModule(indAdminEdit);
  if(!m){ indAdminEdit=null; return renderManageInduction(); }
  var h='<div class="topbar"><h1>'+(isNew?'New':'Edit')+' Module</h1><button class="btn btn-o btn-sm" onclick="indAdminEdit=null;render()">← Back</button></div><div class="pc"><div class="card"><div class="cb">';
  h+='<div style="display:grid;grid-template-columns:2fr 1fr;gap:14px">';
  h+='<div class="fg"><label>Module title</label><input id="im-title" value="'+(m.title||'').replace(/"/g,'&quot;')+'"></div>';
  h+='<div class="fg"><label>Tier</label><select id="im-tier"><option value="1"'+(m.tier===1?' selected':'')+'>Tier 1 General</option><option value="2"'+(m.tier===2?' selected':'')+'>Tier 2 Health/Wellness</option><option value="3"'+(m.tier===3?' selected':'')+'>Tier 3 Risk</option><option value="4"'+(m.tier===4?' selected':'')+'>Tier 4 Role/Site</option></select></div>';
  h+='</div>';
  h+='<div class="fg"><label>Module intro (HTML allowed — shown at the top of the module)</label><textarea id="im-intro" rows="3">'+(m.intro||'')+'</textarea></div>';
  h+='<div class="fg"><label>Module acknowledgement (HTML allowed — shown after all topics are passed; covers the whole module)</label><textarea id="im-ack" rows="3">'+(m.ack||'')+'</textarea></div>';
  h+='<div style="display:flex;gap:10px"><button class="btn btn-p" style="width:auto" onclick="saveIndModule(\''+(m.id||'new')+'\')">Save Module</button></div>';
  if(!isNew){
    h+='<div style="margin-top:18px"><h3 style="font-size:1rem">Topics ('+((m.topics&&m.topics.length)||0)+')</h3><p style="font-size:.82rem;color:#6B7280">Each topic has its own video and assessment. The module acknowledgement (above) covers all topics.</p>';
    h+='<div class="tw"><table><thead><tr><th>#</th><th>Topic</th><th>Video</th><th>Questions</th><th>Actions</th></tr></thead><tbody>';
    (m.topics||[]).forEach(function(tp,i){ h+='<tr><td>'+(i+1)+'</td><td>'+tp.title+'</td><td>'+(tp.video?bg('✓','green'):bg('—','gray'))+'</td><td>'+((tp.qs&&tp.qs.length)||0)+'</td><td style="white-space:nowrap"><button class="btn btn-o btn-sm" onclick="indAdminTopic=\''+tp.id+'\';render()">Edit</button> <button class="btn btn-d btn-sm" onclick="delIndTopic(\''+m.id+'\',\''+tp.id+'\')">Del</button></td></tr>'; });
    h+='</tbody></table></div>';
    h+='<button class="btn btn-p btn-sm" style="width:auto;margin-top:8px" onclick="indAdminTopic=\'new\';render()">+ Add Topic</button></div>';
  } else { h+='<p style="color:#6B7280;font-size:.82rem;margin-top:10px">Save the module first, then add its topics.</p>'; }
  return h+'</div></div></div>';
}

function renderIndTopicForm(){
  var m=indModule(indAdminEdit); if(!m){ indAdminEdit=null; indAdminTopic=null; return renderManageInduction(); }
  var isNew=(indAdminTopic==='new');
  var tp=isNew?{id:'',title:'',content:'',video:'',qs:[]}:indTopic(m.id,indAdminTopic);
  if(!tp){ indAdminTopic=null; return renderIndModuleForm(); }
  var h='<div class="topbar"><h1>'+(isNew?'New':'Edit')+' Topic</h1><button class="btn btn-o btn-sm" onclick="indEditQ=null;indAdminTopic=null;render()">← Back to module</button></div><div class="pc"><div class="card"><div class="cb">';
  h+='<p style="font-size:.82rem;color:#6B7280;margin:0 0 8px">Module: <b>'+m.title+'</b></p>';
  h+='<div class="fg"><label>Topic title</label><input id="it-title" value="'+(tp.title||'').replace(/"/g,'&quot;')+'"></div>';
  h+='<div class="fg"><label>Content (HTML allowed — shown above the video)</label><textarea id="it-content" rows="4">'+(tp.content||'')+'</textarea></div>';
  if(!isNew){
    h+='<div class="fg"><label>Topic video (MP4)</label>';
    if(tp.video){ h+='<video controls playsinline style="width:100%;max-width:520px;border-radius:8px;background:#000" src="'+tp.video+'"></video><div style="margin:6px 0"><button class="btn btn-d btn-sm" onclick="removeTopicVideo(\''+m.id+'\',\''+tp.id+'\')">Remove video</button></div>'; }
    h+='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><input type="file" id="it-video-file" accept="video/mp4,video/*"><button class="btn btn-o btn-sm" style="width:auto" onclick="uploadTopicVideo(\''+m.id+'\',\''+tp.id+'\')">Upload video</button><span id="it-video-status" style="font-size:.82rem;color:#6B7280"></span></div></div>';
  }
  h+='<div style="display:flex;gap:10px;margin-top:6px"><button class="btn btn-p" style="width:auto" onclick="saveIndTopic(\''+m.id+'\',\''+(tp.id||'new')+'\')">Save Topic</button></div>';
  if(!isNew){
    h+='<div style="margin-top:18px"><h3 style="font-size:1rem">Assessment questions ('+((tp.qs&&tp.qs.length)||0)+')</h3>';
    (tp.qs||[]).forEach(function(q,i){ h+='<div style="padding:8px 0;border-bottom:1px solid #f0f0f0'+(indEditQ===i?';background:#FFF8E1':'')+'"><b>Q'+(i+1)+'.</b> '+q.t+' <span style="color:#22C55E;font-size:.8rem">(✓ '+String.fromCharCode(65+q.c)+')</span> <button class="btn btn-d btn-sm" style="float:right" onclick="delIndQ(\''+m.id+'\',\''+tp.id+'\','+i+')">Del</button><button class="btn btn-o btn-sm" style="float:right;margin-right:6px" onclick="indEditQ='+i+';render()">Edit</button></div>'; });
    var eq=(indEditQ!==null&&tp.qs&&tp.qs[indEditQ])?tp.qs[indEditQ]:null; h+='<div class="card" style="margin-top:10px;background:#f8f9fa"><div class="cb"><div class="fg"><label>'+(eq?('Editing question '+(indEditQ+1)):'New question')+'</label><input id="iq-t" value="'+(eq?eq.t.replace(/"/g,'&quot;'):'')+'"></div>';
    ['A','B','C','D'].forEach(function(l,i){ h+='<div class="fg" style="display:flex;gap:8px;align-items:center"><label style="width:18px;margin:0">'+l+'</label><input id="iq-o'+i+'" style="flex:1" value="'+(eq?(eq.o[i]||'').replace(/"/g,'&quot;'):'')+'"><label style="display:flex;gap:4px;align-items:center;margin:0;font-size:.8rem"><input type="radio" name="iq-c" value="'+i+'"'+((eq?(eq.c===i):(i===0))?' checked':'')+'> correct</label></div>'; });
    if(eq){ h+='<button class="btn btn-p btn-sm" style="width:auto;margin-top:8px" onclick="saveIndQ(\''+m.id+'\',\''+tp.id+'\','+indEditQ+')">Save changes</button> <button class="btn btn-o btn-sm" style="width:auto;margin-top:8px;margin-left:6px" onclick="indEditQ=null;render()">Cancel</button></div></div>'; } else { h+='<button class="btn btn-p btn-sm" style="width:auto;margin-top:8px" onclick="addIndQ(\''+m.id+'\',\''+tp.id+'\')">+ Add Question</button></div></div>'; }
    h+='</div>';
  } else { h+='<p style="color:#6B7280;font-size:.82rem;margin-top:10px">Save the topic first, then upload its video and add the assessment questions.</p>'; }
  return h+'</div></div></div>';
}

// ---- admin saves ----
function saveIndModule(id){
  var title=document.getElementById('im-title').value.trim(); if(!title){alert('Module title required');return;}
  var tier=parseInt(document.getElementById('im-tier').value);
  var intro=document.getElementById('im-intro')?document.getElementById('im-intro').value:'';
  var ack=document.getElementById('im-ack')?document.getElementById('im-ack').value:'';
  if(id==='new'){ var nm={id:gid(),tier:tier,title:title,intro:intro,ack:ack,topics:[],active:true}; inductionModules.push(nm); indAdminEdit=nm.id; if(typeof logAudit==='function')logAudit('ADD INDUCTION MODULE',title,''); }
  else { var m=indModule(id); if(m){ m.title=title;m.tier=tier;m.intro=intro;m.ack=ack; if(typeof logAudit==='function')logAudit('EDIT INDUCTION MODULE',title,''); } }
  indSave().then(function(){ if(typeof saveTNA==='function')saveTNA(); render(); });
}
function delIndModule(id){ var m=indModule(id); if(!m)return; if(!confirm('Delete module "'+m.title+'" and all its topics?'))return; inductionModules=inductionModules.filter(function(x){return x.id!==id;}); if(typeof logAudit==='function')logAudit('DELETE INDUCTION MODULE',m.title,''); indSave().then(function(){render();}); }
function saveIndTopic(mid,tid){
  var m=indModule(mid); if(!m)return;
  var title=document.getElementById('it-title').value.trim(); if(!title){alert('Topic title required');return;}
  var content=document.getElementById('it-content').value;
  if(tid==='new'){ var nt={id:gid(),title:title,content:content,video:'',qs:[]}; m.topics=m.topics||[]; m.topics.push(nt); indAdminTopic=nt.id; if(typeof logAudit==='function')logAudit('ADD INDUCTION TOPIC',m.title+' · '+title,''); }
  else { var tp=indTopic(mid,tid); if(tp){ tp.title=title;tp.content=content; if(typeof logAudit==='function')logAudit('EDIT INDUCTION TOPIC',m.title+' · '+title,''); } }
  indSave().then(function(){ if(typeof saveTNA==='function')saveTNA(); render(); });
}
function delIndTopic(mid,tid){ var m=indModule(mid); if(!m)return; var tp=indTopic(mid,tid); if(!tp)return; if(!confirm('Delete topic "'+tp.title+'"?'))return; m.topics=m.topics.filter(function(x){return x.id!==tid;}); if(typeof logAudit==='function')logAudit('DELETE INDUCTION TOPIC',m.title+' · '+tp.title,''); indSave().then(function(){render();}); }
function addIndQ(mid,tid){ var tp=indTopic(mid,tid); if(!tp)return; var t=document.getElementById('iq-t').value.trim(); var o=[0,1,2,3].map(function(i){return (document.getElementById('iq-o'+i).value||'').trim();}); var c=parseInt((document.querySelector('input[name="iq-c"]:checked')||{}).value||0);
  if(!t||o.some(function(x){return !x;})){alert('Fill the question and all 4 options');return;}
  tp.qs=tp.qs||[]; tp.qs.push({id:gid(),t:t,o:o,c:c}); indSave().then(function(){render();}); }
function delIndQ(mid,tid,i){ var tp=indTopic(mid,tid); if(!tp)return; tp.qs.splice(i,1); indEditQ=null; indSave().then(function(){render();}); }
function saveIndQ(mid,tid,i){ var tp=indTopic(mid,tid); if(!tp||!tp.qs||!tp.qs[i])return; var t=document.getElementById('iq-t').value.trim(); var o=[0,1,2,3].map(function(k){return (document.getElementById('iq-o'+k).value||'').trim();}); var c=parseInt((document.querySelector('input[name="iq-c"]:checked')||{}).value||0); if(!t||o.some(function(x){return !x;})){alert('Fill the question and all 4 options');return;} tp.qs[i]={id:tp.qs[i].id,t:t,o:o,c:c}; indEditQ=null; indSave().then(function(){render();}); }
function resetEmpInduction(eid){ if(!confirm('Reset this employee\'s induction (clears completions and attempt locks so they can redo it)?'))return;
  inductionComp=inductionComp.filter(function(c){return c.eid!==eid;}); inductionAtt=inductionAtt.filter(function(a){return a.eid!==eid;});
  if(typeof logAudit==='function')logAudit('RESET INDUCTION',eid,''); indSave().then(function(){ if(typeof saveTNA==='function')saveTNA(); render(); }); }

// ---- video uploads (Supabase Storage) ----
async function uploadTopicVideo(mid,tid){
  var inp=document.getElementById('it-video-file');
  if(!inp||!inp.files||!inp.files[0]){ alert('Please choose a video file first.'); return; }
  var f=inp.files[0]; var status=document.getElementById('it-video-status');
  if(f.size>300*1024*1024){ alert('That file is very large ('+Math.round(f.size/1048576)+' MB). Please use a smaller / compressed MP4.'); return; }
  if(status){ status.textContent='Uploading... '+Math.round(f.size/1048576)+' MB'; }
  var path=mid+'/'+tid+'/'+Date.now()+'_'+f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  try{
    var up=await sb.storage.from('induction-videos').upload(path, f, {upsert:true, contentType:f.type||'video/mp4'});
    if(up.error){ if(status)status.textContent=''; alert('Upload failed: '+up.error.message); return; }
    var pub=sb.storage.from('induction-videos').getPublicUrl(path);
    var tp=indTopic(mid,tid); if(tp){ tp.video=(pub&&pub.data)?pub.data.publicUrl:''; }
    await indSave();
    if(typeof logAudit==='function') logAudit('INDUCTION VIDEO',(indTopic(mid,tid)||{}).title,'uploaded video');
    if(status){ status.textContent='Uploaded.'; }
    render();
  }catch(e){ if(status)status.textContent=''; alert('Upload error: '+(e&&e.message?e.message:e)); }
}
function removeTopicVideo(mid,tid){ var tp=indTopic(mid,tid); if(!tp)return; if(!confirm('Remove the video from "'+tp.title+'"?'))return; tp.video=''; if(typeof logAudit==='function')logAudit('INDUCTION VIDEO',tp.title,'removed video link'); indSave().then(function(){render();}); }

async function uploadIndIntro(key){
  var inp=document.getElementById('ii-file-'+key);
  if(!inp||!inp.files||!inp.files[0]){ alert('Please choose a video file first.'); return; }
  var f=inp.files[0]; var status=document.getElementById('ii-status-'+key);
  if(f.size>300*1024*1024){ alert('That file is very large ('+Math.round(f.size/1048576)+' MB). Please use a smaller / compressed MP4.'); return; }
  if(status){ status.textContent='Uploading... '+Math.round(f.size/1048576)+' MB'; }
  var path='intros/'+key+'_'+Date.now()+'_'+f.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  try{
    var up=await sb.storage.from('induction-videos').upload(path, f, {upsert:true, contentType:f.type||'video/mp4'});
    if(up.error){ if(status)status.textContent=''; alert('Upload failed: '+up.error.message); return; }
    var pub=sb.storage.from('induction-videos').getPublicUrl(path);
    inductionIntros[key]=(pub&&pub.data)?pub.data.publicUrl:'';
    await indSave();
    if(typeof logAudit==='function') logAudit('INDUCTION INTRO VIDEO',key,'uploaded');
    if(status){ status.textContent='Uploaded.'; }
    render();
  }catch(e){ if(status)status.textContent=''; alert('Upload error: '+(e&&e.message?e.message:e)); }
}
function removeIndIntro(key){ if(!confirm('Remove this intro video?'))return; inductionIntros[key]=''; if(typeof logAudit==='function')logAudit('INDUCTION INTRO VIDEO',key,'removed'); indSave().then(function(){render();}); }
