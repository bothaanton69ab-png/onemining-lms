// THUTSE MINING — INDUCTION CONTENT — GAP-CLOSING ADDITIONS
// 8 new modules slotted into Tier 1, Tier 2 and Tier 3 (each tagged by its `tier` field).
// Loaded AFTER t1/t2/t3 and BEFORE induction.js — purely additive, does not touch existing content.
// Source prompts/videos: NotebookLM_NEW_Modules_8_Videos.md
(function(){
 function q(t,o,c){ return {t:t,o:o,c:c}; }
 function tp(title,intro,qs){ return {title:title, content:'<p>'+intro+'</p>', qs:qs}; }
 var ADD = [

 // ===== TIER 1 — GENERAL INDUCTION =====
 {tier:1, module:"Return-to-Work Re-Induction",
  intro:"<b>Coming back after time away.</b> If you have been off the mine for an extended period, you must be re-inducted before returning to work — the mine may have changed.",
  ack:"I confirm that I have completed the Return-to-Work Re-Induction module and its assessment. I understand that after an extended absence (the site standard is <b>more than 14 days</b>) I must be <b>re-inducted before returning to work</b>, that I must <b>report to the training office or my supervisor first</b>, that I may need to confirm I am <b>medically fit</b>, and that my <b>permits, licences and competencies</b> must still be valid. I commit to come back safely.",
  topics:[
   tp("Coming back after time away","Why returning workers must be re-inducted, and what to do first.",[
    q("After how long away must you be re-inducted before returning to work (site standard)?",["More than 14 days","More than 6 months","Only after a year","Never"],0),
    q("Re-induction after time away is:",["A punishment","Because the mine may have changed while you were away","A waste of time","Only for new staff"],1),
    q("On your first day back you should:",["Go straight to your old job","Report to the training office or your supervisor first","Start any task","Skip the medical"],1),
    q("Before returning to work you may also need to:",["Nothing","Confirm you are medically fit","Buy your own PPE","Sign a new contract"],1),
    q("If something has changed in your area, you should:",["Assume it is the same","Ask before you start","Guess","Carry on regardless"],1)
   ])
  ]},

 {tier:1, module:"Critical Controls (Key Controls)",
  intro:"<b>The few controls that stop a fatal risk from becoming a fatality.</b> Know which apply to your task, check they are working, and stop if one is missing.",
  ack:"I confirm that I have completed the Critical Controls (Key Controls) module and its assessment. I understand that <b>fatal risks</b> have a small number of <b>critical controls</b> that must be in place and working, that I must <b>check them before I start</b>, and that if a critical control is <b>missing or not working I must stop the job and report it</b>. I commit to comply.",
  topics:[
   tp("Critical controls — the few that stop a fatality","What a critical control is and what to do if one is missing.",[
    q("A critical control (Key Control) is:",["Extra paperwork","The barrier that, if missing or failed, lets a risk become a death","A type of PPE","A bonus scheme"],1),
    q("Examples of critical controls include:",["A berm on a haul road, a slope-edge barrier, a lock and tag, an exclusion zone","Lunch breaks","Uniform colours","Parking bays"],0),
    q("Before starting a task you must:",["Hope for the best","Check the critical controls for that task are in place and working","Ignore them","Wait for an inspection"],1),
    q("If a critical control is missing or not working you must:",["Carry on and hope","Stop the job and report it","Work faster","Say nothing"],1),
    q("Reporting a missing critical control is:",["Causing trouble","Exactly what we want you to do","Not your job","Pointless"],1)
   ])
  ]},

 {tier:1, module:"Management of Change (MOC)",
  intro:"<b>When something is different from the plan, stop and think.</b> Many incidents happen when something changes — report the change before you carry on.",
  ack:"I confirm that I have completed the Management of Change (MOC) module and its assessment. I understand that a <b>change</b> (new machine, chemical, procedure, stand-in person, temporary fix, weather/ground) can bring <b>new hazards</b>, that I must <b>report a change</b> before carrying on, and that I must <b>never quietly work around a change or invent my own temporary fix</b>. I commit to comply.",
  topics:[
   tp("When something changes, stop and think","Recognising change and your duty to report it.",[
    q("Many incidents happen:",["During the normal, well-known job","When something changes from the plan","Only at night","Never"],1),
    q("A change can be:",["Only a new machine","A new machine, chemical, procedure, stand-in person, temporary fix or weather/ground change","Only a new chemical","Nothing important"],1),
    q("Management of Change means we:",["Carry on regardless","Pause, assess the change and control any new risk before continuing","Ignore changes","Work faster"],1),
    q("Your main duty when something changes is to:",["Manage it all yourself","Report the change to your supervisor before continuing","Hide it","Invent a fix"],1),
    q("You should:",["Quietly work around a change","Never work around a change or invent your own temporary fix","Always improvise","Skip the risk assessment"],1)
   ])
  ]},

 // ===== TIER 2 — HEALTH, WELLNESS & CONDUCT =====
 {tier:2, module:"PPE for Women in Mining",
  intro:"<b>PPE only protects you if it fits you.</b> Women have the right to PPE designed and sized for them, free of charge.",
  ack:"I confirm that I have completed the PPE for Women in Mining module and its assessment. I understand that <b>PPE must fit the person who wears it</b>, that women have the right to <b>properly sized PPE free of charge</b>, that <b>ill-fitting PPE is itself a hazard</b> and a respirator must <b>seal properly</b>, and that I should <b>report PPE that does not fit</b> rather than make do. I commit to comply.",
  topics:[
   tp("PPE that fits women properly","Why fit matters and your right to correctly sized PPE.",[
    q("PPE designed for an average man:",["Fits and protects a woman just as well","Does not fit or properly protect a woman","Is always better","Is the only option"],1),
    q("Women have the right to PPE that is:",["Second-hand","Designed and sized for them, free of charge","Bought by themselves","Optional"],1),
    q("A respirator only protects your lungs if it:",["Looks new","Forms a proper seal on your face","Is loose","Is shared"],1),
    q("Ill-fitting PPE is:",["Just uncomfortable","A hazard in itself — loose sleeves, oversized gloves and slipping harnesses cause injuries","Fine to use","Better than nothing"],1),
    q("If your PPE does not fit you should:",["Make do and carry on","Report it and ask for the correct size and type","Cut or alter it","Borrow someone else's"],1)
   ])
  ]},

 // ===== TIER 3 — MAJOR MINING RISKS =====
 {tier:3, module:"Lightning Awareness",
  intro:"<b>Lightning is a real killer on an opencast mine.</b> When the warning comes, stop work and get to a safe shelter.",
  ack:"I confirm that I have completed the Lightning Awareness module and its assessment. I understand that on an opencast mine lightning is a <b>fatal risk</b>, that when the <b>warning is given I must stop work and move to a safe shelter</b> (an enclosed building or a metal-roofed cab), that I must <b>get away from high points, pit edges, tall machines and metal</b>, and that I must <b>wait for the all-clear</b>. I commit to comply.",
  topics:[
   tp("Lightning — when the warning comes, get to shelter","Acting on the lightning warning and where it is safe.",[
    q("On an opencast mine, lightning is dangerous because:",["We work indoors","We work in the open on high, exposed ground","It never strikes mines","Machines attract rain"],1),
    q("When the lightning warning is given you should:",["Finish the task first","Stop work and move to a safe place straight away","Carry on","Wait and watch the sky"],1),
    q("A safe shelter from lightning is:",["Under a lone tree","A proper enclosed building or a vehicle/cab with a full metal roof and closed windows","On high ground","Beside a fence"],1),
    q("As you move to shelter you should:",["Head for high points and tall machines","Get away from high points, pit edges, tall machines, lone trees and metal","Stand near pipelines","Stay at the pit edge"],1),
    q("You may go back outside:",["The moment the rain stops","Only when the all-clear is given","Whenever you like","After five minutes"],1)
   ])
  ]},

 {tier:3, module:"Flooding & Water Hazards",
  intro:"<b>Water hides danger.</b> Heavy storms can flood an opencast pit fast — never gamble with standing or rising water.",
  ack:"I confirm that I have completed the Flooding & Water Hazards module and its assessment. I understand that <b>water hides danger</b> (depth, soft ground, what is beneath), that I must <b>never enter or drive through standing water of unknown depth</b>, that <b>water weakens slopes and benches</b>, that I must <b>obey barricades and signs and report rising water</b>, and that in heavy rain I must <b>follow instructions to move to higher ground or stop</b>. I commit to comply.",
  topics:[
   tp("Water in the pit — respect it, never gamble with it","Why water is dangerous and the rules around it.",[
    q("The main danger of standing water is that:",["It is always shallow","You cannot see its depth, the soft ground beneath, or what is under the surface","It is harmless","It is easy to judge"],1),
    q("You should drive a machine through standing water of unknown depth:",["Yes, quickly","Never","If it looks shallow","If you are in a hurry"],1),
    q("Water that soaks into a slope or bench:",["Makes it stronger","Weakens it, so it can fail without warning","Has no effect","Improves stability"],1),
    q("Barricades and signs around water:",["Can be ignored","Must be obeyed — they mark a known danger","Are decoration","Are optional"],1),
    q("If you see water rising fast or where it should not be, you should:",["Ignore it","Report it immediately","Wait and watch","Tamper with the pumps"],1)
   ])
  ]},

 {tier:3, module:"Collision Prevention Systems (PDS/CAS)",
  intro:"<b>A help, never a replacement for your own care.</b> PDS/CAS warn of machine and pedestrian collisions — but you still follow the traffic rules.",
  ack:"I confirm that I have completed the Collision Prevention Systems (PDS/CAS) module and its assessment. I understand that machines use <b>Proximity Detection / Collision Awareness Systems</b> that warn of, and help prevent, collisions, that I must <b>wear my tag/device correctly</b>, that operators must <b>respond to alerts</b>, that the system is a <b>backup that never replaces the traffic rules, exclusion zones, eye contact and positive communication</b>, and that I must <b>never bypass or tamper with it</b> and must report faults. I commit to comply.",
  topics:[
   tp("PDS and CAS — a help, never a replacement","What collision systems do and how to work with them.",[
    q("A Proximity Detection System (PDS) / Collision Awareness System (CAS):",["Replaces the traffic rules","Senses when a machine and a person or two machines get too close, and warns the operator","Is just decoration","Controls the radio"],1),
    q("If you are given a PDS tag or device you should:",["Leave it at home","Wear or carry it correctly and keep it on near machines","Share it","Switch it off"],1),
    q("When the system gives a warning, the operator must:",["Ignore it","Respond to it — never treat it as a nuisance beep","Speed up","Remove the device"],1),
    q("Collision systems are:",["A replacement for your own care","A backup — you still use traffic rules, exclusion zones, eye contact and positive communication","The only protection needed","Optional"],1),
    q("If a collision system is faulty you should:",["Bypass it","Report it — a machine with a failed safety system must be handled under the rules","Switch it off","Tamper with it"],1)
   ])
  ]},

 {tier:3, module:"Overhead Powerline Safety",
  intro:"<b>Look up before you lift or tip.</b> Electricity can jump to a machine that comes too close to an overhead powerline — you do not have to touch it.",
  ack:"I confirm that I have completed the Overhead Powerline Safety module and its assessment. I understand that overhead powerlines can kill <b>without being touched</b>, that the danger is greatest with <b>tall or raised machines</b>, that I must <b>look up and obey height barriers, goal-posts and clearance distances</b>, that I must <b>never raise a body or boom under a line</b>, and that if a machine contacts a line I must <b>stay in the cab and call for help</b> while others <b>stay well back</b>. I commit to comply.",
  topics:[
   tp("Overhead powerlines — look up before you lift or tip","The hidden danger of powerlines and the emergency rule.",[
    q("Overhead powerlines can kill:",["Only if touched","Without being touched — electricity can jump a gap to a machine that comes too close","Only in rain","Never"],1),
    q("The danger is greatest with:",["Small hand tools","Tall or raised machines — tipping bodies, crane jibs, drill masts, booms","Walking workers","Parked cars"],1),
    q("Before you lift, tip or raise anything you should:",["Look up and check for powerlines","Close your eyes","Raise it quickly","Ignore the lines"],0),
    q("Near powerlines you must:",["Drive any route","Obey the height barriers, goal-posts, signs and safe clearance distance","Remove the barriers","Guess the clearance"],1),
    q("If your machine touches or arcs to a powerline, the safest action is to:",["Jump out and run","Stay inside the cab and call for help, while others stay well back","Climb down slowly","Touch the machine to check"],1)
   ])
  ]}

 ];
 window.INDUCTION_CONTENT = (window.INDUCTION_CONTENT||[]).concat(ADD);
})();
