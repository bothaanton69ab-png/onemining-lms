// THUTSE MINING — INDUCTION CONTENT — TIER 1 (GENERAL)
// Provides modules -> topics -> 5+ question assessments. One acknowledgement per module.
// Correct-answer index (c) is mixed across A(0)/B(1)/C(2)/D(3).
(function(){
 function q(t,o,c){ return {t:t,o:o,c:c}; }
 function tp(title,intro,qs){ return {title:title, content:'<p>'+intro+'</p>', qs:qs}; }
 var T1 = [

 {tier:1, module:"MHSA Duties & Rights",
  intro:"<b>Your duties and rights under the Mine Health &amp; Safety Act.</b> Work through each topic, pass its short assessment, then acknowledge the module.",
  ack:"I confirm that I have completed the MHSA Duties &amp; Rights module and all its assessments. I understand the <b>employer's duties (MHSA s5)</b> and my <b>duties as an employee (s22)</b>; I know my <b>right to refuse or leave dangerous work (s23)</b> and my obligation to <b>report hazards, incidents and dangerous occurrences</b>; and I understand the role of <b>health &amp; safety representatives and committees</b>. I commit to comply with these duties and to work safely.",
  topics:[
   tp("Employer duties (MHSA s5)","What the company must do for your safety under section 5.",[
    q("Under section 5 of the MHSA, the main duty for your safety rests with:",["Each employee","The employer","The safety representative","The government"],1),
    q("As far as reasonably practicable, the employer must provide:",["Higher wages","Transport to work","A safe and healthy working environment","Longer shifts"],2),
    q("Plant, machinery and equipment must be:",["Properly maintained and safe to use","Used until they break","Operated by anyone","Left unguarded"],0),
    q("To help you work safely, the employer must provide:",["Only a contract","Information, instruction, training and supervision","Only a hard hat","Nothing extra"],1),
    q("If the tools, training or controls you need are missing, you should:",["Carry on regardless","Buy your own","Speak up — it is the employer's duty to provide them","Ignore it"],2)
   ]),
   tp("Employee duties (MHSA s22)","What is expected of you as an employee under section 22.",[
    q("Under section 22, your first duty is to take reasonable care of:",["Only the equipment","Your own health and safety and that of others","Only your supervisor","Only production"],1),
    q("You must follow:",["Only the rules you agree with","Lawful instructions, procedures and safety measures","No instructions","Your own method"],1),
    q("Your PPE must be:",["Used correctly, every time","Used only when inspected","Kept at home","Worn only on night shift"],0),
    q("If you see a hazard or unsafe act you must:",["Report it to your supervisor","Ignore it","Keep quiet","Wait for an inspection"],0),
    q("Co-operating with the company on safety means you:",["Work against the rules","Help everyone meet their safety duties","Only look after yourself","Do nothing"],1)
   ]),
   tp("Your right to refuse dangerous work (MHSA s23)","Your right to leave a working place that is dangerous.",[
    q("Section 23 of the MHSA gives you the right to:",["Leave a working place that is dangerous to your health or safety","Refuse any task you dislike","Skip medicals","Work without supervision"],0),
    q("To use this right you must have:",["A written request","A reasonable belief of serious danger","Manager approval first","A union card"],1),
    q("Before you may leave dangerous work you need:",["Permission from anyone","No permission — you may remove yourself","To finish the task","To pay a fee"],1),
    q("After stopping work you must:",["Go home quietly","Report it to your supervisor without delay and follow the procedure","Say nothing","Fix it yourself"],1),
    q("Section 83 means you may not be:",["Paid","Dismissed, disciplined or victimised for genuinely refusing unsafe work","Promoted","Trained"],1),
    q("Our simple rule is:",["If it is not safe, stop","Production first","Speed up","Hide the danger"],0)
   ]),
   tp("Reporting hazards, incidents & dangerous occurrences","What to report and why prompt reporting matters.",[
    q("You must report:",["Only injuries","Hazards, unsafe acts, near-misses, incidents and dangerous occurrences","Only fatalities","Nothing minor"],1),
    q("A near-miss is:",["Not worth reporting","A free warning that should be reported","Only reported if repeated","A type of injury"],1),
    q("Reports should be made:",["Next month","Promptly, through the correct channel","Only if asked","Never"],1),
    q("Giving the facts means stating:",["What happened, where and when","Only who to blame","Nothing specific","Only the time"],0),
    q("Serious incidents also carry:",["No duties","Legal reporting duties for the company","A bonus","A holiday"],1)
   ]),
   tp("Health & safety representatives & committees","Who represents you on safety, and how to use them.",[
    q("Health and safety representatives are:",["Managers only","Fellow workers who represent you on safety","Inspectors","Security guards"],1),
    q("A safety representative may:",["Take part in inspections and investigations","Set production targets","Discipline workers","Run the plant"],0),
    q("The health and safety committee:",["Reviews safety performance with management","Has no purpose","Only meets once","Replaces the union"],0),
    q("The important thing for you is to:",["Ignore your rep","Know who your safety rep is and how to reach them","Avoid the committee","Do nothing"],1),
    q("If you have a safety concern and are unsure how to raise it:",["Keep quiet","Your safety rep is there to help","Resign","Wait a year"],1)
   ])
  ]},

 {tier:1, module:"H&S Policy & Safety Expectations",
  intro:"<b>Our health &amp; safety policy, Golden Rules and your authority to stop unsafe work.</b>",
  ack:"I confirm that I have completed the H&amp;S Policy &amp; Safety Expectations module and its assessments. I understand our <b>Health &amp; Safety Policy</b>, the <b>Golden Rules</b>, my <b>Stop &amp; Fix</b> authority to stop unsafe work, and the consequence-management approach. I commit to comply.",
  topics:[
   tp("Our H&S Policy and what it means for you","The policy commitment and what the company promises.",[
    q("Our Health and Safety Policy places health and safety:",["After production","Before production and profit","Equal to bonuses","Last"],1),
    q("The policy is issued in line with:",["No law","The Mine Health and Safety Act","A supplier contract","The lease"],1),
    q("The company commits to:",["Ignore hazards","Identify hazards, assess risks and control them","Increase risk","Remove PPE"],1),
    q("PPE and training are provided:",["At your cost","At no cost to you","Only to managers","Never"],1),
    q("The policy is:",["Hidden","Displayed at the mine and reviewed regularly","Secret","Optional"],1)
   ]),
   tp("The 10 Golden Rules","The life-saving rules that apply to everyone.",[
    q("The Golden Rules apply to:",["Only operators","Every person on site, without exception","Only managers","Only contractors"],1),
    q("The Golden Rules cover:",["Catering","The activities that cause the most serious injuries and fatalities","Parking","Uniforms"],1),
    q("The principle above all rules is:",["No task is so urgent it cannot be done safely","Production first","Speed wins","Skip breaks"],0),
    q("Breaking a Golden Rule may lead to:",["A reward","Disciplinary action, up to dismissal","Nothing","Promotion"],1),
    q("Golden Rule examples include:",["Fitness for duty, PPE, isolation and working at heights","Lunch menus","Office hours","Dress code"],0)
   ]),
   tp("Stop & Fix — your authority to stop unsafe work","Your right and duty to stop unsafe work.",[
    q("Stop & Fix means you have the authority to:",["Stop unsafe work and report it","Ignore unsafe work","Carry on regardless","Punish others"],0),
    q("Stopping unsafe work is:",["Causing trouble","Your right and your duty","Not allowed","Only for managers"],1),
    q("This links to which law?",["MHSA section 23 (leave dangerous work)","Tax law","Traffic law","None"],0),
    q("For stopping unsafe work in good faith you will be:",["Punished","Protected (s83)","Demoted","Fined"],1),
    q("If it is not safe you should:",["Stop and fix it","Speed up","Look away","Wait"],0)
   ]),
   tp("Consequence management","How breaches are managed — fairly and consistently.",[
    q("Following the policy and Golden Rules is:",["Optional","A condition of employment and site access","Only for new staff","Not enforced"],1),
    q("Consequences are applied:",["Randomly","Fairly and consistently, on the facts","Only to juniors","Never"],1),
    q("Managers and supervisors are:",["Exempt","Held to the same standard","Above the rules","Not responsible"],1),
    q("Disciplinary action follows:",["No process","The Labour Relations Act and the disciplinary code","A coin toss","The supplier"],1),
    q("The purpose of consequence management is to:",["Punish people","Keep people safe and prevent injuries","Cut wages","Reduce staff"],1)
   ])
  ]},

 {tier:1, module:"Code of Conduct & Disciplinary Code",
  intro:"<b>Expected behaviour on site and the consequences of breaches.</b>",
  ack:"I confirm that I have completed the Code of Conduct &amp; Disciplinary Code module and its assessments. I understand the <b>conduct expected of me</b>, the categories of <b>misconduct and their consequences</b>, and how to <b>raise a grievance</b>. I commit to comply.",
  topics:[
   tp("Expected conduct on site","The standard of behaviour expected of everyone.",[
    q("You are expected to act with:",["Honesty and integrity","Dishonesty","Indifference","Aggression"],0),
    q("Every person must be treated with:",["Dignity and respect","Suspicion","Hostility","Silence"],0),
    q("Harassment and unfair discrimination are:",["Allowed sometimes","Not permitted (Employment Equity Act)","Encouraged","Minor"],1),
    q("You must follow:",["Only easy instructions","Lawful instructions and the safety rules (MHSA s22)","No rules","Your own way"],1),
    q("Good conduct is:",["Optional","A condition of employment and site access","Only for managers","Not checked"],1)
   ]),
   tp("Misconduct and its consequences","How misconduct is categorised and handled.",[
    q("Minor offences are normally handled by:",["Immediate dismissal","Progressive discipline (counselling, warnings)","No action","A fine"],1),
    q("Gross misconduct may lead to:",["A warning only","Dismissal, even for a first offence","Nothing","A bonus"],1),
    q("Examples of gross misconduct include:",["Theft, violence and being under the influence","Wearing PPE","Reporting hazards","Taking breaks"],0),
    q("Discipline must be:",["Unfair","Substantively and procedurally fair (LRA)","Secret","Random"],1),
    q("Your rights in a hearing include:",["No rights","To be heard, to representation and to appeal","Only to listen","To be ignored"],1)
   ]),
   tp("Grievance and reporting channels","How to raise a concern, and the protections you have.",[
    q("If something is unfair you may:",["Do nothing","Raise a grievance without fear of victimisation","Only resign","Take revenge"],1),
    q("The normal first step is to raise it with:",["The CEO","Your immediate supervisor","The media","No one"],1),
    q("Safety concerns are protected under:",["No law","MHSA section 83","Traffic law","Tax law"],1),
    q("Serious wrongdoing (fraud, corruption) is protected under:",["The Protected Disclosures Act","No law","The lease","A supplier contract"],0),
    q("Unresolved workplace disputes may be referred to:",["No one","The CCMA or bargaining council (LRA)","The press","A colleague"],1)
   ])
  ]},

 {tier:1, module:"Hazard Identification & Risk Assessment (HIRA)",
  intro:"<b>Recognise hazards and understand how risk is controlled.</b>",
  ack:"I confirm that I have completed the HIRA module and its assessments. I understand the <b>physical, chemical, ergonomic, fire/energy and mechanical hazards</b>, the <b>hierarchy of controls</b>, how risk is assessed (baseline, issue-based and continuous), and my duty to <b>report hazards (s22)</b> and to <b>stop unsafe work (s23)</b>. I commit to comply.",
  topics:[
   tp("Physical hazards — noise, heat, fall of ground and heights","Recognising the main physical hazards.",[
    q("A hazard is:",["Anything that can cause harm","A type of PPE","A safe area","A reward"],0),
    q("Section 11 of the MHSA requires the employer to:",["Ignore hazards","Identify hazards, assess risks and control them","Increase risk","Only train managers"],1),
    q("Excessive noise can cause:",["Better hearing","Permanent hearing loss","No effect","Stronger ears"],1),
    q("Heat and thermal stress are managed by:",["Working faster","Work-rest cycles, hydration and acclimatisation","Ignoring it","Removing water"],1),
    q("Fall of ground is controlled by:",["Working under loose rock","Inspecting and declaring the area safe first","Ignoring cracks","Digging deeper"],1),
    q("Work at or above 1.8 metres requires:",["Nothing","Approved fall protection and a rescue plan","Just care","Speed"],1)
   ]),
   tp("Chemical hazards — dust, fumes and hazardous substances","Protecting your lungs and handling chemicals.",[
    q("Fine dust breathed into the lungs can cause:",["Permanent lung disease","Better breathing","Nothing","Stronger lungs"],0),
    q("The legal exposure limit for respirable crystalline silica is:",["0.05 mg/m3","5 mg/m3","No limit","1 g/m3"],0),
    q("Before using a chemical you should read its:",["Price tag","Safety Data Sheet","Delivery note","Nothing"],1),
    q("Chemical hazards are controlled, in order, by:",["PPE first","Substitution and ventilation, then respiratory protection last","Ignoring them","Adding more dust"],1),
    q("Because the harm builds up over time, the company carries out:",["Nothing","Medical surveillance, including lung-function testing","Only first aid","Bonuses"],1),
    q("If a dust or fume control is not working you should:",["Carry on","Stop and report it","Ignore it","Speed up"],1)
   ]),
   tp("Ergonomic risks — manual handling and repetitive work","Strain injuries that build up over time.",[
    q("Ergonomic risk is:",["The strain work puts on your body","A chemical","A fire","A machine"],0),
    q("Manual handling injuries affect mainly your:",["Hair","Back, shoulders and joints","Hearing","Eyes"],1),
    q("Vibration from tools and machines can damage your:",["Hands, arms and spine","Teeth","Hearing only","Nothing"],0),
    q("Ergonomic risks are best controlled by:",["Lifting more","Mechanical aids, correct technique and job rotation","Working faster","Ignoring pain"],1),
    q("You should report aches and discomfort:",["Never","Early, before they become lasting injuries","Only after a year","Only if severe"],1)
   ]),
   tp("Fire and energy hazards — electrical and stored energy","Electricity, stored energy and fire.",[
    q("Electricity can kill through:",["Electric shock or arc flash","Good lighting","Fresh air","Cold water"],0),
    q("Electrical work may be done by:",["Anyone","Only trained and authorised persons","New staff","Visitors"],1),
    q("Stored energy includes:",["Hydraulic, pneumatic, pressure and spring energy","Only electricity","Sunlight","Sound"],0),
    q("A fire needs three things together:",["Fuel, heat and oxygen","Water, sand and foam","Smoke, light and heat","Fuel, water and air"],0),
    q("Before working on a machine you must:",["Just switch it off","Isolate, lock out, tag out and test for zero energy","Ask a friend","Start quickly"],1),
    q("Hot work such as welding requires:",["Nothing","A permit and a fire watch","A verbal nod","Speed"],1)
   ]),
   tp("Mechanical and mobile-equipment hazards — TMM and moving parts","Machines, blind spots and guarding.",[
    q("Trackless mobile machinery has:",["No blind spots","Large blind spots where the operator may not see you","Perfect vision","No risk"],1),
    q("People and machines must be:",["Mixed together","Kept apart, using walkways and no-go zones","Close","Ignored"],1),
    q("Before approaching a machine you must:",["Run up to it","Make eye contact with the operator and get a signal","Touch it","Stand behind it"],1),
    q("Machine guards must be:",["Removed while running","Always in place","Optional","Decorative"],1),
    q("Vehicles and machines may be operated by:",["Anyone","Only trained, fit and authorised persons","Visitors","Untrained staff"],1)
   ]),
   tp("Reporting hazards and the site baseline risk assessment","How risk is managed and your part in it.",[
    q("The baseline risk assessment identifies:",["Lunch options","The major hazards across the whole mine","Staff names","Wages"],1),
    q("Continuous risk assessment is what you do:",["Once a year","Every shift, checking your area before work","Never","Only when told"],1),
    q("For significant hazards the company keeps:",["Nothing","Mandatory Codes of Practice (s9)","Only posters","Secrets"],1),
    q("Section 22 places a duty on you to:",["Hide hazards","Report hazards, unsafe acts and near-misses","Increase risk","Do nothing"],1),
    q("If you reasonably believe a place is dangerous you may:",["Be forced to stay","Leave it (s23) without fear of victimisation","Be fined","Be dismissed"],1)
   ])
  ]},

 {tier:1, module:"PPE — Use & Care",
  intro:"<b>Select, wear, inspect and maintain personal protective equipment.</b>",
  ack:"I confirm that I have completed the PPE — Use &amp; Care module and its assessments. I understand how to <b>select</b> the correct PPE, <b>wear and fit</b> it correctly, <b>inspect</b> it before use, and <b>care for, store and replace</b> it, and that PPE is the <b>last line of defence</b>. I commit to comply.",
  topics:[
   tp("Choosing the right PPE for the task and area","Matching PPE to the hazard.",[
    q("PPE in the hierarchy of controls is:",["The first line of defence","The last line of defence","Not used","Optional"],1),
    q("The standard PPE for site includes:",["Hard hat, glasses, hearing protection, hi-vis, gloves and boots","Only gloves","Only a hat","Sandals"],0),
    q("Task-specific PPE is chosen to match:",["Your mood","The particular hazard (per the risk assessment)","The cheapest option","Fashion"],1),
    q("PPE is provided to you:",["At your cost","Free of charge by the employer","Only to managers","Never"],1),
    q("Only PPE that is ... may be issued or worn:",["The cheapest","SANS/SABS approved","Borrowed","Damaged"],1)
   ]),
   tp("Wearing and fitting your PPE correctly","Why correct fit matters.",[
    q("PPE only protects you if it is:",["Worn correctly","In your locker","Brand new only","Expensive"],0),
    q("A respirator must:",["Form a proper seal against your face","Be loose","Have gaps","Be shared"],0),
    q("A hard hat should:",["Sit level with the harness adjusted (and chin strap where required)","Be worn backwards and loose","Be carried","Be optional"],0),
    q("You must wear your PPE:",["Only sometimes","The whole time in the area or task — no grace period","Only when watched","Never"],1),
    q("You must never:",["Alter, cut or modify your PPE","Inspect your PPE","Clean your PPE","Report damage"],0)
   ]),
   tp("Inspecting your PPE before every use","Catching damage before it fails.",[
    q("PPE must be inspected:",["Once a year","Before every shift and task","Never","Only when broken"],1),
    q("Damaged or expired PPE must be:",["Used carefully","Never used; removed from service and reported","Taped up","Ignored"],1),
    q("Fall-protection equipment needs:",["No checks","Extra care — check webbing, stitching and buckles before every use","Less care","Sharing"],1),
    q("If you find a problem with your PPE you should:",["Use it anyway","Remove it from service and report it","Hide it","Swap labels"],1),
    q("Worn-out PPE offers:",["Full protection","Little or no protection","More protection","No change"],1)
   ]),
   tp("Caring for, storing and replacing your PPE","Looking after your PPE is part of the job.",[
    q("Caring for your PPE is:",["Optional","A duty under MHSA s22","Only for managers","Not needed"],1),
    q("PPE should be stored:",["In sunlight and chemicals","Clean and dry, away from sun, heat and chemicals","On the floor","In water"],1),
    q("Consumables like filters and earplugs must be:",["Used forever","Replaced at the correct intervals","Never replaced","Shared"],1),
    q("When PPE is damaged you should:",["Keep using it","Follow the replacement process — hand it in and draw a replacement","Throw it anywhere","Buy your own"],1),
    q("Replacement PPE is provided:",["At your cost","Free of charge","Only once","Never"],1)
   ])
  ]},

 {tier:1, module:"Emergency Preparedness & Response",
  intro:"<b>Know what to do in an emergency: alarms, evacuation and assembly.</b>",
  ack:"I confirm that I have completed the Emergency Preparedness &amp; Response module and its assessments. I understand the <b>alarms</b>, <b>evacuation routes</b>, <b>assembly points and roll-call</b>, how to <b>raise the alarm</b>, and my <b>first actions in an incident</b>. I commit to respond correctly.",
  topics:[
   tp("Alarms and what each signal means","Recognising and acting on alarms.",[
    q("In an emergency the alarm is:",["A distraction","Your first and most important warning","Optional","Background noise"],1),
    q("Different alarm signals:",["All mean the same","Mean different things you must learn","Are random","Do not matter"],1),
    q("The evacuation signal tells you to:",["Carry on","Stop, make safe if quick, and go to your assembly point","Hide","Sleep"],1),
    q("You may return to the area when:",["You feel like it","The all-clear is given or a responsible person says so","The alarm pauses","A colleague leaves"],1),
    q("The most important rule with an alarm is to:",["Ignore it","Act immediately and never assume it is only a test","Wait","Finish first"],1)
   ]),
   tp("Evacuation routes and procedures","Evacuating safely and calmly.",[
    q("When the evacuation signal sounds you should:",["Finish your task","Stop and make safe if you can do so quickly","Run blindly","Call home"],1),
    q("You should leave by:",["Any route","The marked evacuation routes and exits","A window","The longest way"],1),
    q("During evacuation you should:",["Run","Walk quickly but not run","Push others","Stop for photos"],1),
    q("Should you go back for belongings?",["Yes, always","No — nothing you own is worth your life","If quick","For your phone"],1),
    q("You should know:",["Only one route","Your primary route and at least one alternative","No routes","The car park only"],1)
   ]),
   tp("Assembly points and roll-call","Being accounted for keeps rescuers safe.",[
    q("When you evacuate you go:",["Anywhere","Straight to your designated assembly point","Home","To the canteen"],1),
    q("Roll-call is taken to:",["Waste time","Account for everyone and find anyone missing","Allocate work","Check uniforms"],1),
    q("At the assembly point you must:",["Wander off","Report in to the marshal and stay there","Leave","Hide"],1),
    q("If a colleague is missing you should:",["Say nothing","Tell the marshal immediately","Search alone","Go home"],1),
    q("You may leave the assembly point:",["Anytime","Only with permission, after the all-clear","When bored","Immediately"],1)
   ]),
   tp("Raising the alarm and emergency contacts","Raising the alarm quickly and clearly.",[
    q("If you discover an emergency you should first:",["Investigate alone","Raise the alarm immediately","Take photos","Finish your task"],1),
    q("When you call, you should give:",["Only your name","What happened, where, and whether anyone is injured or trapped","Nothing","The weather"],1),
    q("You should:",["Hang up first","Stay on the line until the controller has the information","Shout","Run"],1),
    q("Emergency numbers should be:",["Secret","Known before you need them","Memorised by managers only","Not needed"],1),
    q("The faster the alarm is raised:",["The worse it is","The faster help arrives","No difference","The more confusion"],1)
   ]),
   tp("Your first actions in an incident","Protect yourself, then help safely.",[
    q("Your first action when an incident happens is to:",["Rush in","Stay calm and protect yourself first","Take a photo","Panic"],1),
    q("Before approaching you must:",["Ignore danger","Check the scene for danger (electricity, machinery, fumes)","Run in","Touch everything"],1),
    q("Rushing in can make you:",["A hero","A second casualty","Faster","Safe"],1),
    q("First aid should be given by:",["Anyone","A trained first aider","No one","The injured person"],1),
    q("A seriously injured person should:",["Be moved at once","Not be moved unless in immediate danger","Be made to walk","Be left alone"],1),
    q("You should disturb the scene:",["As much as you like","As little as necessary, so it can be investigated","Completely","By cleaning it"],1)
   ])
  ]},

 {tier:1, module:"Incident, Injury & Near-Miss Reporting",
  intro:"<b>What to report, to whom and how quickly.</b>",
  ack:"I confirm that I have completed the Incident, Injury &amp; Near-Miss Reporting module and its assessments. I understand <b>what to report and to whom</b>, the <b>timelines and the reporting tool</b>, and our <b>no-blame culture</b>, and I commit to report promptly and honestly.",
  topics:[
   tp("What to report and who to report it to","Your legal duty to report.",[
    q("Reporting hazards and incidents is:",["Optional","A legal duty under MHSA s22","Only management's job","Only for injuries"],1),
    q("You must report injuries:",["Only serious ones","No matter how minor","Never","Only if asked"],1),
    q("A near-miss should be:",["Ignored","Reported, as it is a warning","Kept quiet","Reported only if repeated"],1),
    q("You report to:",["No one","Your supervisor or Safety Representative","The press","A friend"],1),
    q("Failing to report is:",["Fine","Itself a breach that can put others at risk","Encouraged","Rewarded"],1)
   ]),
   tp("Reporting timelines and how to report","Report immediately, then record it.",[
    q("The rule on timing is to report:",["Next month","Immediately, as soon as reasonably possible","Only at year-end","Never"],1),
    q("You report verbally first, then:",["Forget it","Record it in writing before shift-end","Tell no one","Wait a week"],1),
    q("A good report states:",["Only the time","What happened, where, when and who was involved","Only the blame","Nothing"],1),
    q("Serious incidents must be reported to:",["No one","The Chief Inspector of Mines within set timeframes","The canteen","A colleague"],1),
    q("Accurate information allows:",["Delay","The incident to be investigated and the cause fixed","Confusion","Nothing"],1)
   ]),
   tp("Our no-blame near-miss culture","Why you can report with confidence.",[
    q("Our reporting culture is:",["Blame-based","No-blame — you will not be punished for honest reporting","Punitive","Secretive"],1),
    q("Section 83 protects you from:",["Pay","Dismissal or victimisation for reporting in good faith","Training","Promotion"],1),
    q("Near-misses are valuable because they:",["Waste time","Show a weakness before anyone is hurt","Are funny","Mean nothing"],1),
    q("Lessons learned are:",["Hidden","Shared so the same thing does not happen again","Ignored","Sold"],1),
    q("The thing that puts people at risk is:",["Reporting","Staying silent","Honesty","Caution"],1)
   ])
  ]},

 {tier:1, module:"Housekeeping Standards",
  intro:"<b>Good housekeeping prevents incidents.</b>",
  ack:"I confirm that I have completed the Housekeeping Standards module and its assessments. I understand that good housekeeping prevents <b>slips, trips, fires and blocked-access</b> incidents, and I commit to keep my area clean, clear and safe.",
  topics:[
   tp("Preventing slips","Clean, dry, well-kept surfaces.",[
    q("Good housekeeping is:",["A waste of time","One of the simplest ways to prevent injuries","Only cosmetic","Optional"],1),
    q("A slip happens when a surface is:",["Dry and clean","Wet, oily or contaminated","Tidy","Marked"],1),
    q("The most important rule with a spill is to:",["Leave it","Clean it up immediately, or mark and barricade it","Step over it","Ignore it"],1),
    q("Under equipment that can leak you should use:",["Nothing","Drip trays and bunds","More oil","A blanket"],1),
    q("If something leaks at its source you should:",["Mop forever","Report it so the cause is fixed","Ignore it","Hide it"],1)
   ]),
   tp("Preventing trips","Clear floors and walkways.",[
    q("Trips are caused by:",["Clear floors","Loose tools, offcuts and trailing cables","Tidy areas","Good lighting"],1),
    q("Walkways and stairways must be:",["Used for storage","Kept clear at all times","Blocked when busy","Optional"],1),
    q("Cables and hoses should be:",["Run across walkways","Routed safely over or around walkways","Left tangled","Ignored"],1),
    q("'Clean as you go' means:",["Leave it all for later","Tidy up while you work","Never clean","Clean once a year"],1),
    q("A damaged grating or pothole should be:",["Walked past","Reported so it can be repaired","Covered with paper","Ignored"],1)
   ]),
   tp("Reducing fire risk through good housekeeping","Less clutter means less to burn.",[
    q("Many fires start with:",["Good housekeeping","Poor housekeeping and combustible build-up","Clean areas","Fresh air"],1),
    q("Oily rags should be placed in:",["Your pocket","The proper closed metal bins","Any bin","On the floor"],1),
    q("Flammable liquids must be:",["Near sparks","Stored in marked stores away from ignition sources","Left open","Mixed"],1),
    q("Fire extinguishers and electrical panels must:",["Be blocked","Never be blocked","Be hidden","Be moved daily"],1),
    q("A clean, well-kept area has:",["More to burn","Far less to burn","No difference","More risk"],1)
   ]),
   tp("Keeping access clear and materials stored safely","Clear access and safe storage.",[
    q("Access ways and emergency exits must be:",["Blocked","Kept clear at all times","Used for storage","Optional"],1),
    q("Emergency equipment must be:",["Stacked behind boxes","Reachable in an instant","Hidden","Removed"],1),
    q("Materials must be stored:",["In walkways","Only in designated storage / laydown areas","Anywhere","On exits"],1),
    q("Stacked materials must be:",["Unstable","Safe, stable and within height/weight limits","As high as possible","Loose"],1),
    q("When you finish a shift you should:",["Leave a mess","Leave your area clean and safe for the next person","Block access","Hide tools"],1)
   ])
  ]},

 {tier:1, module:"Site Layout, Access Control & Traffic Management",
  intro:"<b>Find your way safely and respect access rules.</b>",
  ack:"I confirm that I have completed the Site Layout, Access Control &amp; Traffic Management module and its assessments. I understand the <b>mine layout and restricted areas</b>, the <b>access-control and permit</b> rules, and the <b>pedestrian-vehicle</b> rules, and I commit to comply.",
  topics:[
   tp("The mine layout and restricted areas","Knowing the areas and their hazards.",[
    q("Each area of the mine has:",["The same hazards","Its own hazards and rules","No hazards","Only one rule"],1),
    q("Restricted / no-go areas are marked with:",["Nothing","Signage and barriers you must obey","Decorations","Optional notes"],1),
    q("You may enter an area:",["Anywhere you like","Only where you are authorised and required to be","Through shortcuts","Via no-go zones"],1),
    q("Examples of high-risk areas include:",["The office","Active blasting areas and pit-wall edges","The canteen","The car park"],1),
    q("If unsure where you may go you should:",["Guess","Ask your supervisor first","Take a shortcut","Enter anyway"],1)
   ]),
   tp("Access control and permits","Only fit, inducted, authorised people on site.",[
    q("Before entering the mine you must be:",["A visitor only","Inducted, fit, authorised and signed in","Carrying cash","Wearing no PPE"],1),
    q("High-risk tasks may need:",["Nothing","A valid permit before you begin","A verbal nod","Payment"],1),
    q("Visitors and non-inducted persons must be:",["Left alone","Escorted by an authorised person","Given keys","Ignored"],1),
    q("Should you let someone follow you through a gate without signing in?",["Yes","No — everyone must sign in themselves","If they ask","If they are in a hurry"],1),
    q("The access register tells the emergency team:",["Nothing","Exactly who is on site","The weather","The menu"],1)
   ]),
   tp("Pedestrian–vehicle rules and walkways","Keeping people and machines apart.",[
    q("Large machines have:",["No blind spots","Big blind spots — the operator may not see you","Perfect vision","No risk"],1),
    q("People and vehicles must be:",["Mixed","Kept apart, using marked walkways","Close","Ignored"],1),
    q("Before approaching a working machine you must:",["Run up","Make eye contact and get a signal — no eye contact, no approach","Touch it","Stand behind"],1),
    q("CPS and PDS systems:",["Replace your care","Support the rules but never replace your own care","Are decoration","Do nothing"],1),
    q("When driving on site you must:",["Speed if late","Obey the traffic plan and speed limits, and wear a seatbelt","Skip the belt","Ignore signs"],1)
   ])
  ]}

 ];
 window.INDUCTION_CONTENT = (window.INDUCTION_CONTENT||[]).concat(T1);
})();
