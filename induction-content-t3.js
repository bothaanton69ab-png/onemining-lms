// THUTSE MINING — INDUCTION CONTENT — TIER 3 (RISK-SPECIFIC AWARENESS)
// Modules -> topics -> 5-question assessments. One acknowledgement per module. Mixed answers.
(function(){
 function q(t,o,c){ return {t:t,o:o,c:c}; }
 function tp(title,intro,qs){ return {title:title, content:'<p>'+intro+'</p>', qs:qs}; }
 var T3 = [

 {tier:3, module:"Trackless Mobile Machinery (TMM) & Pedestrian Interaction",
  intro:"<b>Stay safe around mobile machinery.</b>",
  ack:"I confirm that I have completed the TMM &amp; Pedestrian Interaction module and its assessments. I understand <b>exclusion zones and blind spots</b>, <b>positive communication with operators</b>, <b>parking and isolation</b>, and <b>pedestrian walkways</b>. I commit to comply.",
  topics:[
   tp("Exclusion zones and blind spots","Where machines cannot see you.",[
    q("Trackless mobile machinery has large:",["Mirrors","Blind spots where the operator cannot see you","Wheels only","No risks"],1),
    q("Around mobile machinery you must:",["Walk anywhere","Stay out of exclusion zones and blind spots","Run between machines","Assume you are seen"],1),
    q("A blind spot is:",["A safe area","An area the operator cannot see","A type of light","A night issue only"],1),
    q("Exclusion zones are:",["Optional","Strictly enforced","Decoration","For managers only"],1),
    q("If you must be near a machine you should:",["Surprise the operator","Stay visible and out of blind spots","Hide","Stand behind it"],1)
   ]),
   tp("Positive communication with operators","Make contact before you approach.",[
    q("Before approaching a machine you must:",["Touch it","Make positive eye contact with the operator","Shout once","Walk up quickly"],1),
    q("The rule is:",["No eye contact, no approach","Approach anytime","Run up","Wave and go"],0),
    q("You should approach only after:",["Guessing","The operator acknowledges you","The engine starts","Lunch"],1),
    q("If the operator cannot see you:",["Approach anyway","Do not approach","Touch the machine","Stand in front"],1),
    q("Positive communication keeps:",["The machine clean","People and machines safely apart","Production high only","Nothing"],1)
   ]),
   tp("Parking and isolation","Leaving a machine safe.",[
    q("A machine left unattended must be:",["Left running","Properly parked and isolated","Left in gear","Blocking the road"],1),
    q("Parking on a slope requires:",["Nothing","Park brake and wheel chocks / correct procedure","Speed","Lights only"],1),
    q("Before leaving a machine you should:",["Leave it running","Shut down and isolate it","Rev it","Leave it moving"],1),
    q("Buckets and blades should be:",["Raised high","Lowered to the ground","Left up","Removed"],1),
    q("Isolation prevents:",["Cleaning","Unexpected movement or start-up","Parking","Inspection"],1)
   ]),
   tp("Pedestrian walkways","Use the safe routes.",[
    q("Pedestrians should use:",["The roadway","Designated walkways","Any shortcut","Haul roads"],1),
    q("You may walk on active haul roads:",["Anytime","Only with authorisation","Whenever quick","Never needed"],1),
    q("You must obey:",["Nothing","No-go zones, barriers, signage and sirens","Only lights","Only the canteen"],1),
    q("High-visibility clothing helps:",["Fashion","Operators to see you","Nothing","Cooling"],1),
    q("Where vehicles and people mix, the rule is:",["Mix freely","Keep them apart","Race","Ignore it"],1)
   ])
  ]},

 {tier:3, module:"Working at Heights & Fall Protection",
  intro:"<b>The basics of preventing falls.</b>",
  ack:"I confirm that I have completed the Working at Heights &amp; Fall Protection module and its assessments. I understand <b>fall hazards and the 1.8 m rule</b>, the <b>fall-protection plan and authorisation</b>, <b>harness and anchor basics</b>, and the <b>rescue plan and inspection</b> requirements. I commit to comply.",
  topics:[
   tp("Fall hazards and the 1.8 metre rule","Why heights are so dangerous.",[
    q("A fall from as little as ... can be fatal:",["10 metres","1.8 metres","50 metres","No height"],1),
    q("Work at or above 1.8 m or near an unprotected edge requires:",["Nothing","Approved fall protection","Just care","Speed"],1),
    q("The best way to manage a fall risk is to:",["Work faster","Eliminate the need to work at height where possible","Ignore it","Use no PPE"],1),
    q("Fall prevention (edge protection) is:",["Worse than arrest","Preferred over fall arrest","The same","Not allowed"],1),
    q("Suspension trauma can occur when:",["Standing","A person hangs in a harness without rescue","Walking","Sitting"],1)
   ]),
   tp("Fall-protection plan and authorisation","Plan and authorise before you climb.",[
    q("Working at height requires:",["Nothing","A fall-protection plan and authorisation","Only gloves","Speed"],1),
    q("Before any elevated work you need:",["Just a ladder","A valid permit and completed HIRA","Nothing","A friend"],1),
    q("You may work at height:",["Anytime","Only when authorised and trained","If quick","Alone always"],1),
    q("If conditions change you should:",["Carry on","Stop and reassess","Ignore it","Rush"],1),
    q("Working at heights without authorisation is:",["Fine","Not allowed","Encouraged","Faster"],1)
   ]),
   tp("Harness and anchor basics","Using fall protection correctly.",[
    q("A safety harness must be:",["Worn loosely","Inspected before use and correctly anchored","Shared unchecked","Optional"],1),
    q("Anchor points must be:",["Any nearby pipe","Rated, certified and secure","Handrails","Decorative"],1),
    q("You should tie off to:",["Scaffold tubes","Certified anchor points only","Ladders","Brackets"],1),
    q("A full-body harness fits:",["Loosely","Snugly, with straps secure and the D-ring positioned","With gaps","Backwards"],1),
    q("Damaged fall-protection equipment must be:",["Used carefully","Not used and reported","Taped","Ignored"],1)
   ]),
   tp("Rescue plan and inspection","A rescue plan must be ready first.",[
    q("Before elevated work starts there must be:",["No plan","A documented rescue plan","Lunch","A spectator"],1),
    q("Fall-protection equipment is inspected:",["Yearly","Before every use","Never","Once"],1),
    q("Without a rescue plan a suspended person can suffer:",["Nothing","Suspension trauma, which can be fatal","Boredom","A cramp only"],1),
    q("Deformed or damaged kit is:",["Kept in service","Removed from service","Repaired with tape","Shared"],1),
    q("Edge protection (guardrails, barriers) should be used:",["Never","Wherever possible","Only at night","Rarely"],1)
   ])
  ]},

 {tier:3, module:"Electrical Safety & Isolation / Lock-Out–Tag-Out",
  intro:"<b>Respect electricity and stored energy.</b>",
  ack:"I confirm that I have completed the Electrical Safety &amp; Isolation / Lock-Out–Tag-Out module and its assessments. I understand that <b>only authorised persons do electrical work</b>, the <b>isolation principles</b>, the <b>lock-out / tag-out process</b>, and <b>stored-energy verification</b>. I commit to comply.",
  topics:[
   tp("No unauthorised electrical work","Electricity can kill instantly.",[
    q("Electrical work may be done by:",["Anyone","Only trained and authorised persons","Visitors","New staff"],1),
    q("Electricity can cause:",["No harm","Electric shock and arc flash","Cooling","Light only"],1),
    q("Damaged cables or plugs must be:",["Used carefully","Not used and reported","Taped","Ignored"],1),
    q("If you are not authorised you should:",["Try anyway","Never work on electrical equipment","Help quietly","Guess"],1),
    q("Arc flash is:",["Harmless","A dangerous electrical explosion / flash","A torch","A switch"],1)
   ]),
   tp("Isolation principles","Cutting off the energy supply.",[
    q("Before working on a machine you must:",["Just switch off","Isolate it from all energy sources","Start it","Ask later"],1),
    q("Isolation means:",["Leaving power on","Cutting off and securing the energy supply","Cleaning","Painting"],1),
    q("All energy sources must be:",["Some isolated","Identified and isolated","Left on","Ignored"],1),
    q("Isolation may be performed by:",["Anyone","Trained, competent and authorised persons","Visitors","New staff"],1),
    q("Isolation prevents:",["Cleaning","Unexpected start-up or energy release","Parking","Inspection"],1)
   ]),
   tp("The lock-out / tag-out (LOTO) process","One person, one lock.",[
    q("LOTO stands for:",["Lock-out / tag-out","Look-out / talk-out","Load-out / take-out","Lift-on / take-off"],0),
    q("Each person on the job applies:",["One shared lock","Their own personal lock and tag","No lock","A manager's lock"],1),
    q("'One person, one lock' means:",["Share locks","Everyone applies their own lock","No locks","One lock for all"],1),
    q("Your lock may be removed by:",["Anyone","Only you (or the documented override)","A colleague","Security"],1),
    q("A tag tells others:",["Nothing","The equipment is isolated — do not operate","To start it","To clean it"],1)
   ]),
   tp("Stored energy and verifying isolation","Release stored energy and test for zero.",[
    q("Stored energy includes:",["Only electricity","Hydraulic, pneumatic, pressure, gravity and springs","Sunlight","Sound"],1),
    q("Stored energy must be:",["Left in place","Released or restrained before work","Increased","Ignored"],1),
    q("After isolating you must:",["Assume it is safe","Test for zero energy yourself","Rely on others","Start work"],1),
    q("You should verify isolation:",["Never","Personally, before starting","Only once a year","By guessing"],1),
    q("You should never rely on:",["Your own check","Someone else's check alone","Procedures","Locks"],1)
   ])
  ]},

 {tier:3, module:"Hazardous Chemical Substances (HCS) & SDS",
  intro:"<b>Handle chemicals safely.</b>",
  ack:"I confirm that I have completed the Hazardous Chemical Substances &amp; SDS module and its assessments. I understand <b>labels and Safety Data Sheets</b>, <b>safe handling and storage</b>, and <b>spill response</b>. I commit to comply.",
  topics:[
   tp("Labels and Safety Data Sheets (SDS)","Know the dangers before you start.",[
    q("Before using a chemical you should read its:",["Price","Safety Data Sheet (SDS)","Delivery note","Nothing"],1),
    q("An SDS tells you:",["The price","The dangers, precautions and first aid","The supplier only","Nothing"],1),
    q("Chemical containers must be:",["Unlabelled","Correctly labelled","Hidden","Mixed"],1),
    q("If a label is missing you should:",["Use it anyway","Not use it and report it","Guess","Mix it"],1),
    q("Hazard symbols on labels warn of:",["Price","The type of danger","The brand","The weight"],1)
   ]),
   tp("Safe handling and storage","Storing and using chemicals correctly.",[
    q("Chemicals must be stored:",["Anywhere","In approved areas, in correct containers","In walkways","Near sparks"],1),
    q("Incompatible chemicals must be:",["Mixed","Kept apart","Stored together","Ignored"],1),
    q("When handling chemicals you wear:",["Nothing","The PPE the SDS specifies","Only a hat","Gloves optional"],1),
    q("Flammable chemicals must be kept away from:",["Water","Ignition sources","Labels","Shelves"],1),
    q("Eating near open chemicals is:",["Fine","Not allowed","Encouraged","Required"],1)
   ]),
   tp("Spill response","Contain, clean and report safely.",[
    q("If you spill a chemical you should:",["Ignore it","Follow the spill procedure and report it","Wash it to a drain","Leave it"],1),
    q("A spill kit is used to:",["Cause spills","Contain and clean a spill safely","Store food","Nothing"],1),
    q("Chemical spills must never go into:",["A spill kit","Drains or watercourses","A bund","A container"],1),
    q("Before cleaning a spill you check:",["Nothing","The SDS for the right method and PPE","The price","The brand"],1),
    q("After a spill you must:",["Hide it","Report it","Forget it","Blame someone"],1)
   ])
  ]},

 {tier:3, module:"Fall of Ground / Ground Control & Working Near Excavations/Water",
  intro:"<b>Ground and excavation hazards.</b>",
  ack:"I confirm that I have completed the Fall of Ground / Ground Control module and its assessments. I understand that <b>ground can fail without warning</b>, that I must <b>inspect and only work when the area is declared safe</b>, <b>report cracks and seepage</b>, and follow the rules for <b>excavations and water</b>. I commit to comply.",
  topics:[
   tp("Ground can fail without warning","Pit walls and benches can collapse.",[
    q("Pit walls, benches and faces can:",["Never fail","Fail with little or no warning","Only fail at night","Be ignored"],1),
    q("A fall of ground can:",["Be harmless","Bury people and equipment in seconds","Be slow always","Be ignored"],1),
    q("Ground control is governed by:",["No code","A site Code of Practice","Tax law","The lease"],1),
    q("Loose or unstable ground is:",["Safe","Dangerous — do not work under it","Fine with PPE","A shortcut"],1),
    q("Rain, blasting or movement can:",["Stabilise ground","Make ground less stable","Do nothing","Help"],1)
   ]),
   tp("Inspect and declare safe","Only work when it is declared safe.",[
    q("Before working you must:",["Start at once","Inspect the area first","Skip checks","Dig in"],1),
    q("Work may begin only when the area is:",["Busy","Declared safe by a competent person","Dark","Wet"],1),
    q("Bench heights and slope angles must stay within:",["Any value","The approved mine design parameters","No limits","Double"],1),
    q("If the area is not safe you:",["Work anyway","Make it safe first, or do not work","Speed up","Ignore it"],1),
    q("Inspections happen:",["Once a year","Before and during shifts, and after rain or blasting","Never","Only at night"],1)
   ]),
   tp("Report cracks, movement and seepage","Warning signs you must act on.",[
    q("If you see cracks or water seepage you should:",["Carry on","Report it and clear the area","Dig more","Ignore it"],1),
    q("Ground movement is:",["Normal, ignore it","A warning sign to report immediately","A good sign","Irrelevant"],1),
    q("You should clear the area:",["Slowly","Immediately when instability is seen","Never","After lunch"],1),
    q("Reporting ground changes helps:",["No one","Prevent a fall of ground","Production only","Nothing"],1),
    q("You must never work:",["With a permit","At the base of an unsafe highwall or slope","In PPE","In daylight"],1)
   ]),
   tp("Working near excavations and water","Edges, collapse and drowning risks.",[
    q("Working near excavations requires:",["Nothing","Following controls and exclusion zones","Speed","No barriers"],1),
    q("Unprotected excavation edges are:",["Safe","A fall and collapse hazard","Decoration","Fine"],1),
    q("Working near water adds the risk of:",["Nothing","Drowning and unstable ground","Cooling only","Fun"],1),
    q("Barricades around excavations must be:",["Removed","Obeyed and kept in place","Ignored","Optional"],1),
    q("Before entering an excavation you check it is:",["Deep","Safe, supported and authorised","Wet","Dark"],1)
   ])
  ]},

 {tier:3, module:"Confined Space Awareness",
  intro:"<b>Why confined spaces are dangerous.</b>",
  ack:"I confirm that I have completed the Confined Space Awareness module and its assessments. I understand <b>what makes a confined space dangerous</b>, the <b>permit and atmosphere-testing</b> requirements, and that I may <b>never enter without authorisation</b>. I commit to comply.",
  topics:[
   tp("What is a confined space","Restricted spaces with dangerous air.",[
    q("A confined space is dangerous mainly because of:",["Its colour","A hazardous or oxygen-deficient atmosphere","Its size only","Good air"],1),
    q("Examples include:",["An open field","Tanks, vessels, silos and sumps","An office","A car park"],1),
    q("The air in a confined space may be:",["Always safe","Toxic or lacking oxygen","Fresh always","Cool only"],1),
    q("Confined spaces have:",["Wide exits","Restricted entry and exit","Many doors","No risk"],1),
    q("You can tell a space is safe to enter by:",["Looking","Testing the atmosphere","Guessing","Smell only"],1)
   ]),
   tp("Permit and atmosphere testing","Test the air and control the entry.",[
    q("You may enter a confined space:",["Anytime","Only with a permit and authorisation","If quick","Without testing"],1),
    q("Before entry the atmosphere must be:",["Assumed safe","Tested and made safe","Ignored","Filled with fuel"],1),
    q("A confined-space entry needs:",["No one outside","A standby person and a rescue plan","No plan","A torch only"],1),
    q("Ventilation is used to:",["Heat the space","Make the air safe to breathe","Fill with gas","Nothing"],1),
    q("Gas testing is done by:",["Anyone","A trained, authorised person","A visitor","No one"],1)
   ]),
   tp("Never enter without authorisation","Do not become a casualty or a rescuer.",[
    q("If you are not trained and authorised you should:",["Enter to help","Never enter","Enter quickly","Enter alone"],1),
    q("If someone collapses inside you should:",["Rush in","Raise the alarm — do not enter unprotected","Enter alone","Ignore it"],1),
    q("Many confined-space deaths include:",["Only the worker","Would-be rescuers who entered unprotected","No one","Visitors only"],1),
    q("Entry without a permit is:",["Allowed","Strictly prohibited","Encouraged","Faster"],1),
    q("The standby person:",["Leaves","Stays outside and monitors / raises the alarm","Enters too","Sleeps"],1)
   ])
  ]},

 {tier:3, module:"Fire Prevention & Response",
  intro:"<b>Prevent fires and respond correctly.</b>",
  ack:"I confirm that I have completed the Fire Prevention &amp; Response module and its assessments. I understand the <b>fire triangle</b>, <b>hot-work permits</b>, <b>extinguisher use</b>, and how to <b>raise the alarm</b>. I commit to comply.",
  topics:[
   tp("The fire triangle (heat, fuel, oxygen)","Remove one element and the fire stops.",[
    q("The fire triangle consists of:",["Heat, fuel and oxygen","Water, sand and foam","Smoke, heat and light","Fuel, water and air"],0),
    q("Remove any one element and a fire:",["Grows","Cannot start or continue","Spreads","Gets hotter"],1),
    q("Combustible build-up provides:",["Safety","Fuel for a fire","Cooling","Nothing"],1),
    q("Good housekeeping reduces:",["PPE","Fire risk","Wages","Breaks"],1),
    q("Oxygen is removed by:",["Adding fuel","Smothering / covering the fire","Heating","Fanning"],1)
   ]),
   tp("Hot-work permits","Welding, cutting and grinding controls.",[
    q("Hot work (welding, grinding) requires a:",["Verbal go-ahead","Permit","Nothing","Manager present"],1),
    q("Hot work also needs a:",["Spectator","Fire watch","Radio only","Snack"],1),
    q("Before hot work you remove:",["PPE","Nearby flammables","The permit","Guards"],1),
    q("After hot work you check for:",["Lunch","Smouldering / hot spots","Nothing","Paint"],1),
    q("Hot work without a permit is:",["Fine","Not allowed","Faster","Encouraged"],1)
   ]),
   tp("Extinguisher type and use","Use the right extinguisher correctly.",[
    q("When using an extinguisher you aim at the:",["Top of the flames","Base of the fire","Smoke","Ceiling"],1),
    q("Electrical fires must NOT be fought with:",["CO2","Dry powder","Water","A fire blanket"],2),
    q("You should fight a fire only if:",["It is large","It is small and safe to do so","Always","Never check"],1),
    q("If a fire is too big you:",["Fight it","Raise the alarm and evacuate","Take photos","Hide"],1),
    q("You should know the location of:",["The canteen only","Extinguishers and hose reels","Nothing","The exit only"],1)
   ]),
   tp("Raising the alarm","Warn everyone, fast.",[
    q("On discovering a fire you first:",["Fight it alone","Raise the alarm","Collect belongings","Take a photo"],1),
    q("Then you:",["Stay","Evacuate to the assembly point if needed","Sleep","Hide"],1),
    q("Fire alarms must be:",["Ignored","Acted on immediately","Tested by you","Muted"],1),
    q("Fire equipment must be:",["Blocked","Never blocked and kept ready","Hidden","Removed"],1),
    q("Smoke or unexplained heating should be:",["Ignored","Reported immediately","Hidden","Fanned"],1)
   ])
  ]},

 {tier:3, module:"First Aid Awareness",
  intro:"<b>How to get help when someone is hurt.</b>",
  ack:"I confirm that I have completed the First Aid Awareness module and its assessments. I understand <b>how to summon first aid</b>, <b>where the first-aiders and first-aid boxes are</b>, and the <b>basic do's and don'ts</b>. I commit to comply.",
  topics:[
   tp("How to summon first aid","Get help quickly and safely.",[
    q("If someone is injured your first step is to:",["Move them","Check for danger, then raise the alarm / call for help","Take a photo","Walk away"],1),
    q("You call for help using:",["No one","The site emergency number / nearest first-aider","Social media","A whistle only"],1),
    q("Speed matters because:",["It does not","Early help saves lives","Of paperwork","Of cost"],1),
    q("Before helping you ensure:",["Nothing","The scene is safe for you","You have a camera","You are alone"],1),
    q("You should give clear information about:",["The weather","What happened and where","The menu","Your shift"],1)
   ]),
   tp("First-aider and first-aid box locations","Know where help is.",[
    q("First aid should be given by:",["Anyone","A trained first aider","No one","The patient"],1),
    q("You should know the location of:",["Only the canteen","First-aiders and first-aid boxes","Nothing","The car park"],1),
    q("First-aid boxes must be:",["Locked away","Stocked and accessible","Empty","Hidden"],1),
    q("If you are not trained you should:",["Treat them","Call for help and keep others back","Move them","Leave"],1),
    q("Knowing who the first-aiders are helps:",["No one","Get help quickly","Production only","Nothing"],1)
   ]),
   tp("Basic do and don't","Simple rules that protect the injured.",[
    q("A seriously injured person should:",["Always be moved","Not be moved unless in immediate danger","Walk it off","Be left"],1),
    q("You should:",["Crowd around","Reassure the person and keep them still","Argue","Leave"],1),
    q("You should not:",["Call for help","Give medication you are not trained to give","Keep them calm","Stay"],1),
    q("Keep the injured person:",["Cold and alone","Calm and comfortable until help arrives","Walking","Standing"],1),
    q("After an incident the scene should be:",["Cleaned up","Preserved for investigation","Ignored","Photographed for fun"],1)
   ])
  ]},

 {tier:3, module:"Explosives & Blasting Safety Awareness",
  intro:"<b>Stay safe around explosives and blasting.</b>",
  ack:"I confirm that I have completed the Explosives &amp; Blasting Safety Awareness module and its assessments. I understand that <b>only licensed persons handle explosives</b>, the <b>blast no-go zones and sirens</b>, my duty to <b>report missing explosives</b>, and that <b>misfires are dangerous</b>. I commit to comply.",
  topics:[
   tp("Only licensed persons handle explosives","The highest fatal risk on a mine.",[
    q("Explosives may be handled by:",["Anyone","Only trained, certified and licensed persons","Any operator","New staff"],1),
    q("Explosives represent:",["Low risk","The highest fatal risk where used","No risk","A minor risk"],1),
    q("Explosives handling complies with:",["No law","The Explosives Act and MHSA Chapter 4","Tax law","The lease"],1),
    q("If you are not licensed you must:",["Help carry","Never handle explosives","Store them","Move them"],1),
    q("The Blaster in Charge:",["Has no role","Holds a valid certificate and is responsible for the blast","Is a visitor","Is optional"],1)
   ]),
   tp("Blast no-go zones, sirens and clearance","Clear the area when the siren sounds.",[
    q("When the blasting siren sounds you must:",["Carry on","Clear the area and obey no-go zones","Move closer","Ignore it"],1),
    q("Blast exclusion (no-go) zones are:",["Optional","Strictly enforced for everyone","For blasters only","Suggestions"],1),
    q("Clearance procedures must be:",["Skipped","Followed without deviation","Ignored","Shortened"],1),
    q("You may return after a blast:",["Immediately","Only when the all-clear is given","When curious","Never"],1),
    q("Blasting times are:",["Secret","Communicated and controlled","Random","Ignored"],1)
   ]),
   tp("Report missing or unaccounted-for explosives","Count, reconcile and report.",[
    q("Missing or unaccounted-for explosives must be:",["Ignored","Reported immediately","Kept quiet","Found later"],1),
    q("Explosives are counted and reconciled:",["Never","At the start and end of every shift","Once a year","Randomly"],1),
    q("A missing detonator is:",["Minor","A serious safety and security incident","Normal","Ignored"],1),
    q("You report missing explosives to:",["No one","The supervisor, Blaster in Charge and Magazine Master","A friend","The press"],1),
    q("Explosives may never be left:",["Secured","Unattended or unaccounted for","Counted","Locked"],1)
   ]),
   tp("Misfires are dangerous","Keep clear and let the experts manage it.",[
    q("A misfire must be:",["Approached by anyone","Treated as dangerous and managed by authorised persons","Ignored","Hit with a tool"],1),
    q("Near a suspected misfire you must:",["Investigate","Keep clear and follow the misfire procedure","Dig","Touch it"],1),
    q("Only ... may deal with a misfire:",["Anyone","Trained, authorised blasting personnel","Visitors","New staff"],1),
    q("Misfire management plans must be:",["Ignored","Followed without deviation","Optional","Shortened"],1),
    q("If you find unexploded material you:",["Pick it up","Leave it, keep clear and report it","Hide it","Throw it"],1)
   ])
  ]},

 {tier:3, module:"Permit to Work",
  intro:"<b>High-risk work needs a valid permit before it starts.</b>",
  ack:"I confirm that I have completed the Permit to Work module and its assessments. I understand <b>what work needs a permit</b>, the <b>no permit, no work</b> rule, that <b>conditions and controls must be in place</b>, and that <b>only authorised persons may do permit work</b>. I commit to comply.",
  topics:[
   tp("What work needs a permit","High-risk activities require a permit.",[
    q("A permit to work is required for:",["All work","High-risk work (hot work, confined space, heights, isolation)","No work","Office work"],1),
    q("A permit exists to:",["Slow work","Ensure risks are assessed and controlled before work","Add cost","Nothing"],1),
    q("Examples of permit-required work include:",["Filing","Hot work and confined-space entry","Walking","Meetings"],1),
    q("A permit is issued:",["After work","Before work begins","Never","Mid-task"],1),
    q("Permit-required activities are among the:",["Safest","Leading causes of serious injury if uncontrolled","Easiest","Cheapest"],1)
   ]),
   tp("No permit, no work","The rule has no exceptions.",[
    q("The rule of no permit, no work means:",["Permits are optional","High-risk work cannot start without a valid permit","Work always starts","Permits come later"],1),
    q("Emergency breakdowns:",["Skip permits","Still require the proper permit","Need nothing","Are exempt"],1),
    q("Starting permit work without a permit is:",["Fine","A serious breach","Faster","Encouraged"],1),
    q("The permit must be:",["Hidden","Kept at the worksite and accessible","Filed away","Lost"],1),
    q("If there is no permit you:",["Start anyway","Do not start the work","Guess","Wait silently"],1)
   ]),
   tp("Conditions and controls must be in place","Verify everything before you start.",[
    q("A permit confirms that:",["The job is cheap","Risks are assessed and controls are in place","Anyone can do it","No checks are needed"],1),
    q("Every condition on the permit must be:",["Skipped","Verified and in place before work","Ignored","Optional"],1),
    q("When work is complete the permit is:",["Torn up","Formally closed out and returned","Kept secret","Reused"],1),
    q("A completed HIRA is:",["Optional","Required for permit work","A formality","Not needed"],1),
    q("Controls listed on the permit are:",["Suggestions","Mandatory","Decoration","Ignored"],1)
   ]),
   tp("Authorised persons and changes","Only authorised persons; reissue on change.",[
    q("Permit-required work may be done by:",["Anyone","Only trained, competent and authorised persons","Visitors","Untrained staff"],1),
    q("If the job, people or conditions change you must:",["Carry on","Stop, redo the HIRA and reissue the permit","Ignore it","Tear it up"],1),
    q("Only ... may issue a permit:",["Anyone","Authorised issuers","Visitors","New staff"],1),
    q("A permit is valid:",["Forever","For the stated job and duration","For any job","Indefinitely"],1),
    q("If you are unsure about a permit you:",["Guess","Ask before starting","Start anyway","Ignore it"],1)
   ])
  ]},

 {tier:3, module:"Lifting Operations & Suspended Loads",
  intro:"<b>Stay clear of suspended loads and lift safely.</b>",
  ack:"I confirm that I have completed the Lifting Operations &amp; Suspended Loads module and its assessments. I understand that I must <b>never work under a suspended load</b>, that <b>lifting gear must be inspected and certified</b>, that <b>only authorised riggers and operators may lift</b>, and that the <b>lifting zone must be barricaded</b>. I commit to comply.",
  topics:[
   tp("Never work under a suspended load","A falling load can be fatal.",[
    q("You must never:",["Use a crane","Walk or work under a suspended load","Wear PPE","Follow the plan"],1),
    q("A suspended load can:",["Be safe","Fall and cause fatal injury","Float","Be ignored"],1),
    q("The lifting zone should be:",["Open to all","Barricaded and kept clear","A walkway","Storage"],1),
    q("If you see someone under a load you should:",["Say nothing","Warn them and stop the lift","Join them","Ignore it"],1),
    q("Loads should be moved:",["Over people","Clear of people","Onto people","Anywhere"],1)
   ]),
   tp("Certified lifting equipment","Inspected, tested, certified and tagged.",[
    q("Lifting equipment must be:",["Used until it breaks","Inspected, tested, certified and tagged before use","Uninspected","Borrowed"],1),
    q("Colour-coding and tags show:",["The price","That the gear is inspected and safe to use","The brand","The weight only"],1),
    q("Damaged lifting gear must be:",["Used carefully","Removed from service","Taped","Ignored"],1),
    q("Before a lift you check the gear is:",["Old","Rated, certified and in good condition","Cheap","Borrowed"],1),
    q("Overloading lifting gear is:",["Fine","Dangerous and not allowed","Faster","Required"],1)
   ]),
   tp("Only authorised riggers and operators may lift","Competent people, clear signals.",[
    q("Lifting operations may be carried out by:",["Anyone","Certified, authorised riggers and operators","Untrained staff","Visitors"],1),
    q("A rigger is responsible for:",["Catering","Slinging and directing the lift safely","Parking","Cleaning"],1),
    q("Crane operators must be:",["Untrained","Certified and authorised","Visitors","New staff"],1),
    q("Communication during a lift uses:",["Guesswork","Agreed signals between rigger and operator","Shouting only","Nothing"],1),
    q("If you are not authorised you should:",["Operate anyway","Not perform lifting work","Help lift","Direct it"],1)
   ]),
   tp("Barricade and keep the lifting zone clear","Control access during the lift.",[
    q("The lifting area must be:",["Open","Barricaded and access controlled","A shortcut","Storage"],1),
    q("People not involved in the lift must:",["Watch from under it","Stay out of the lifting zone","Help","Stand under"],1),
    q("A lift plan is:",["Optional for big lifts","Required to plan the lift safely","Decoration","Ignored"],1),
    q("If a lift looks unsafe you should:",["Carry on","Stop and report it","Speed up","Ignore it"],1),
    q("Lifting near power lines requires:",["Nothing","Special precautions and clearance","Speed","No checks"],1)
   ])
  ]}

 ];
 window.INDUCTION_CONTENT = (window.INDUCTION_CONTENT||[]).concat(T3);
})();
