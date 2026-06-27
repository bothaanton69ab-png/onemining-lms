// THUTSE MINING — INDUCTION CONTENT — TIER 2 (HEALTH, WELLNESS & CONDUCT)
// Modules -> topics -> 5-question assessments. One acknowledgement per module. Mixed answers.
(function(){
 function q(t,o,c){ return {t:t,o:o,c:c}; }
 function tp(title,intro,qs){ return {title:title, content:'<p>'+intro+'</p>', qs:qs}; }
 var T2 = [

 {tier:2, module:"Alcohol & Drug Policy",
  intro:"<b>Our zero-tolerance approach to substances.</b>",
  ack:"I confirm that I have completed the Alcohol &amp; Drug Policy module and its assessments. I understand the <b>zero-tolerance rule</b>, the <b>testing process and consequences</b>, and my duty to <b>declare impairing medication</b>. I commit to comply.",
  topics:[
   tp("Our zero-tolerance rule and why","Why we have zero tolerance for substances.",[
    q("The company's stance on alcohol and drugs at work is:",["Zero tolerance","One drink is allowed","Allowed on weekends","No policy"],0),
    q("Impairment is dangerous because it:",["Improves focus","Slows reaction time and judgement","Has no effect","Helps you work"],1),
    q("Under the MHSA Regulations, a person under the influence may:",["Work normally","Not be at or enter the mine","Drive only","Supervise"],1),
    q("Arriving fit for duty means:",["Rested and sober","Tired but present","Having a licence only","Wearing PPE only"],0),
    q("Zero tolerance applies to:",["Only night shift","Everyone, all the time","Only operators","Only contractors"],1)
   ]),
   tp("Testing and the consequences of a positive result or refusal","Testing, confidentiality and consequences.",[
    q("Alcohol and drug testing may be done:",["Never","At any time, without prior notice","Only once a year","Only on request"],1),
    q("Test results are:",["Public","Kept confidential (POPIA)","Posted on a board","Shared widely"],1),
    q("A confirmed positive result leads to:",["Nothing","Removal from the workplace and disciplinary action","A bonus","Promotion"],1),
    q("Refusing a lawful test is:",["Acceptable","Treated as serious misconduct","Ignored","Rewarded"],1),
    q("Disciplinary action follows:",["No process","A fair process (LRA) with the right to be heard","A coin toss","Random rules"],1)
   ]),
   tp("Medication and fitness-for-duty disclosure","Declaring medication that may affect you.",[
    q("Some prescribed medicines can:",["Never affect work","Cause drowsiness and impair safe work","Improve reactions","Do nothing"],1),
    q("Medication that may affect you must be:",["Hidden","Declared before your shift","Shared","Ignored"],1),
    q("You declare it to:",["A colleague","Your supervisor or the clinic / occupational health","No one","The press"],1),
    q("Declaring medication is:",["A punishment","To assess fitness and keep you safe (confidential)","Public","Pointless"],1),
    q("If you feel unwell or unfit you should:",["Push through","Tell your supervisor — you will not be penalised (s83)","Hide it","Drive home"],1)
   ])
  ]},

 {tier:2, module:"Fatigue Management",
  intro:"<b>Recognise and manage fatigue.</b>",
  ack:"I confirm that I have completed the Fatigue Management module and its assessments. I understand the <b>causes and signs of fatigue</b>, my <b>shift and rest responsibilities</b> and the <b>overtime limits</b>, and my duty to <b>report when unfit</b>. I commit to comply.",
  topics:[
   tp("Causes and signs of fatigue","What fatigue is and how to spot it.",[
    q("Fatigue is dangerous because it:",["Improves focus","Slows reactions and causes mistakes","Has no effect","Speeds you up"],1),
    q("A sign of fatigue is:",["Feeling refreshed","Micro-sleeps and poor concentration","Sharp reactions","High energy"],1),
    q("Fatigue can be caused by:",["Good sleep","Too little sleep, long hours and night shifts","Rest days","Short shifts"],1),
    q("Fatigue is:",["Rare in mining","One of the leading causes of incidents","Harmless","A bonus"],1),
    q("You should watch for fatigue signs in:",["Only yourself","Yourself and your colleagues","No one","Only managers"],1)
   ]),
   tp("Shift, rest and working-hours responsibilities","Rest, rosters and overtime limits.",[
    q("Your responsibility is to:",["Work without sleep","Arrive rested and use your rest breaks","Skip rest days","Hide tiredness"],1),
    q("The maximum overtime allowed is:",["Unlimited","40 hours per calendar month (BCEA)","100 hours","None ever"],1),
    q("Overtime requires:",["Nothing","Written approval before the shift","A verbal nod after","No approval"],1),
    q("Shift rosters are planned to:",["Maximise hours","Keep fatigue risk as low as reasonably practicable","Ignore fatigue","Cut rest"],1),
    q("Fatigue is managed under:",["No plan","The Risk-based Fatigue Management Code of Practice","A supplier contract","Tax law"],1)
   ]),
   tp("Reporting when you are unfit for duty","Speaking up when you are too tired to work safely.",[
    q("If you are too fatigued to work safely you must:",["Carry on","Tell your supervisor","Hide it","Drive home immediately"],1),
    q("For raising fatigue honestly you will be:",["Disciplined","Not punished (s83)","Demoted","Fined"],1),
    q("Supervisors who see signs of fatigue may:",["Ignore them","Stand the person down and arrange support","Speed them up","Do nothing"],1),
    q("If a colleague is dangerously tired you should:",["Say nothing","Raise it","Laugh","Compete"],1),
    q("When fatigued you should never:",["Rest","Drive or operate machinery","Report it","Hydrate"],1)
   ])
  ]},

 {tier:2, module:"Occupational Health & Hygiene",
  intro:"<b>The health hazards of mining and how we protect you.</b>",
  ack:"I confirm that I have completed the Occupational Health &amp; Hygiene module and its assessments. I understand the hazards of <b>noise, dust, heat and vibration</b>, the controls that protect me, and the <b>medical-surveillance and fitness-certificate</b> requirements. I commit to comply.",
  topics:[
   tp("Noise and hearing conservation","Protecting your hearing.",[
    q("Noise-induced hearing loss is:",["Temporary","Permanent and gradual","Curable","Harmless"],1),
    q("Noise is controlled first by:",["PPE only","Reducing it at the source (engineering)","Ignoring it","Music"],1),
    q("Hearing protection is:",["The first control","The last line of defence, worn in marked zones","Decorative","Optional"],1),
    q("Your hearing is monitored through:",["Guesswork","Audiometry (hearing tests)","X-rays","Nothing"],1),
    q("Our goal is:",["More noise","No hearing deterioration from workplace noise","Louder machines","Nothing"],1)
   ]),
   tp("Dust, airborne pollutants and your lungs","Protecting your lungs over time.",[
    q("Fine dust can cause:",["Permanent lung disease","Better breathing","Nothing","Stronger lungs"],0),
    q("The silica exposure limit is:",["0.05 mg/m3","5 mg/m3","No limit","1 g/m3"],0),
    q("Dust is controlled by:",["Adding dust","Suppression, ventilation and, last, respirators","Ignoring it","Fans only"],1),
    q("Your lungs are monitored through:",["Audiometry","Spirometry (lung-function tests)","Eye tests","Nothing"],1),
    q("Exposure is measured by:",["No one","An Approved Inspection Authority","A colleague","The canteen"],1)
   ]),
   tp("Thermal stress and heat","Recognising and managing heat.",[
    q("Heat stress can be:",["Harmless","Serious or even fatal","Helpful","Ignored"],1),
    q("A sign of heat stress is:",["Feeling cold","Dizziness, cramps and nausea","More energy","Better focus"],1),
    q("Heat is managed by:",["Working faster","Acclimatisation, work-rest cycles and hydration","Removing water","Ignoring it"],1),
    q("You should drink water:",["Never","Regularly through the shift","Only at lunch","Only when sick"],1),
    q("If you or a colleague show heat-stress signs you should:",["Carry on","Stop, cool down and report it","Hide it","Speed up"],1)
   ]),
   tp("Vibration and ergonomics","Strain that builds up over time.",[
    q("Vibration can damage your:",["Hearing only","Hands, arms and spine","Eyes","Teeth"],1),
    q("Ergonomic strain comes from:",["Rest","Manual handling, awkward postures and repetition","Good technique","Aids"],1),
    q("These risks are controlled by:",["Lifting more","Better tools, aids, technique and rotation","Working faster","Ignoring pain"],1),
    q("You should not lift:",["Light items","Beyond your safe capacity","With aids","With help"],1),
    q("Aches and discomfort should be:",["Ignored","Reported early","Hidden","Endured"],1)
   ]),
   tp("Medical surveillance and fitness certificates","Monitoring your health and your certificate of fitness.",[
    q("Medical examinations are done:",["Never","At entry, periodically and on exit","Only once","Only if sick"],1),
    q("A valid certificate of fitness is:",["Optional","Required for your task","Public","Not needed"],1),
    q("Targeted surveillance (audiometry, spirometry) is based on:",["Your name","What you are exposed to","Your shift only","Nothing"],1),
    q("Your medical records are:",["Public","Confidential, and you may access your own","Sold","Shared widely"],1),
    q("You should attend scheduled medicals because they:",["Waste time","Catch any health effect early","Are optional","Cost you money"],1)
   ])
  ]},

 {tier:2, module:"HIV/AIDS & TB Awareness",
  intro:"<b>Prevention, support and non-discrimination.</b>",
  ack:"I confirm that I have completed the HIV/AIDS &amp; TB Awareness module and its assessments. I understand <b>prevention, testing and treatment</b>, the <b>support available</b>, and that <b>discrimination on the basis of HIV status is not allowed</b>. I commit to comply.",
  topics:[
   tp("Prevention, testing and treatment","Knowing your status and getting care.",[
    q("HIV and TB are:",["Untreatable","Serious but manageable with treatment","Not a concern","Only management's issue"],1),
    q("TB risk in mining is linked to:",["Wearing PPE","Dust exposure","Rest breaks","Drinking water"],1),
    q("HIV testing at work is:",["Forced","Voluntary and confidential","Public","A job requirement"],1),
    q("HIV treatment (ART):",["Does not work","Lets people live healthy lives","Is banned","Is optional only"],1),
    q("TB can be:",["Never cured","Fully cured with the complete course of treatment","Ignored","Caught only once"],1)
   ]),
   tp("Support available to you","You are not alone.",[
    q("If you are living with HIV or TB you:",["Are on your own","Can access confidential support","Must resign","Are reported"],1),
    q("Support includes:",["Nothing","Counselling, treatment and referral","Only dismissal","Public notices"],1),
    q("The Employee Assistance Programme is:",["Public","There to help with wider wellbeing","Only for managers","Not available"],1),
    q("Staying on treatment is important because it:",["Does nothing","Keeps you well (and cures TB)","Is optional","Wastes time"],1),
    q("You should reach out:",["Never","Early — to the clinic, wellness team or manager","Only when severe","Only in writing"],1)
   ]),
   tp("Dignity and non-discrimination","Your rights and the duty of respect.",[
    q("Under the Employment Equity Act, no person may be:",["Promoted","Unfairly discriminated against for their HIV status","Trained","Paid"],1),
    q("HIV testing may not be done:",["Voluntarily","Without consent / Labour Court authorisation","With consent","At a clinic"],1),
    q("Your health status is:",["Public","Confidential (POPIA)","Everyone's business","On a board"],1),
    q("Colleagues must be treated with:",["Suspicion","Dignity and respect","Hostility","Silence"],1),
    q("Stigma and gossip:",["Are encouraged","Have no place at the mine","Are required","Are helpful"],1)
   ])
  ]},

 {tier:2, module:"Environmental Awareness",
  intro:"<b>Protecting the environment around us.</b>",
  ack:"I confirm that I have completed the Environmental Awareness module and its assessments. I understand how to manage <b>waste and spills</b>, <b>protect water and limit dust</b>, and the <b>chance-find procedure</b> for heritage resources. I commit to comply.",
  topics:[
   tp("Waste and spills","Our shared duty of care.",[
    q("We share a duty of care for the environment under:",["No law","NEMA (section 28)","Tax law","Traffic law"],1),
    q("Waste must be disposed of:",["Anywhere","In the approved, labelled containers","In watercourses","By burning"],1),
    q("Spills are prevented with:",["Nothing","Drip trays, bunds and spill kits","More oil","A blanket"],1),
    q("If a spill occurs you should:",["Ignore it","Contain it if safe and report it immediately","Hide it","Wash it into a drain"],1),
    q("Hazardous waste must be:",["Mixed with general waste","Kept separate in the correct containers","Buried","Burned"],1)
   ]),
   tp("Water and dust control","Protecting water and limiting dust.",[
    q("Water is protected under:",["No law","The National Water Act and our Water Use Licence","Tax law","The lease"],1),
    q("You must keep out of watercourses:",["Clean water","Fuel, oil and chemicals","Nothing","Air"],1),
    q("Dust must be kept:",["As high as possible","As low as reasonably practicable","Ignored","Increased"],1),
    q("Dust affects:",["No one","Your health and neighbouring communities","Only machines","Only dust"],1),
    q("If you see pollution or excessive dust you should:",["Ignore it","Report it","Hide it","Cause more"],1)
   ]),
   tp("Protecting heritage and cultural resources","The chance-find procedure.",[
    q("Heritage resources are protected by:",["No law","The National Heritage Resources Act","Tax law","The lease"],1),
    q("Heritage finds include:",["Lunch boxes","Graves, artefacts and fossils","Tools in the store","PPE"],1),
    q("You should work:",["Anywhere","Only within the approved mining footprint","In no-go zones","Outside the boundary"],1),
    q("If you uncover a possible grave or artefact you must:",["Remove it","Stop, not disturb it, and report it (chance-find procedure)","Keep it","Carry on"],1),
    q("Work in that area resumes only:",["Immediately","After a specialist assessment and authorisation","Never","When you decide"],1)
   ])
  ]},

 {tier:2, module:"Behaviour-Based Safety / Visible Felt Leadership",
  intro:"<b>Safe behaviour and looking out for each other.</b>",
  ack:"I confirm that I have completed the Behaviour-Based Safety / Visible Felt Leadership module and its assessments. I understand the difference between <b>safe and at-risk behaviour</b>, how to make and act on <b>safety observations</b>, and my <b>right to a safe workplace</b>. I commit to comply.",
  topics:[
   tp("At-risk versus safe behaviour","The choices that keep us safe.",[
    q("Most incidents involve:",["Bad luck only","A human choice somewhere","The weather","Nothing"],1),
    q("At-risk behaviour includes:",["Following procedures","Shortcuts and bypassing guards","Wearing PPE","Stopping when unsure"],1),
    q("Safe behaviour includes:",["Rushing","Following the procedure and wearing PPE","Skipping checks","Removing guards"],1),
    q("Complacency is dangerous because:",["It speeds work","A risky thing done safely many times feels safe until it is not","It helps","It has no effect"],1),
    q("We focus on:",["Blaming the person","The behaviour, to correct the habit","Punishment first","Nothing"],1)
   ]),
   tp("Safety observations and how to intervene safely","Observing, intervening and recognising.",[
    q("A safety observation involves:",["Ignoring work","Noticing safe and at-risk behaviour and discussing it","Punishing people","Doing nothing"],1),
    q("Visible Felt Leadership means leaders:",["Stay in the office","Are present and act on what they hear","Ignore safety","Blame workers"],1),
    q("When you intervene you should:",["Be aggressive","Pause the work and speak respectfully","Embarrass them","Walk away"],1),
    q("If a colleague stops you, you should:",["Get angry","Thank them","Ignore them","Report them"],1),
    q("You should also:",["Only criticise","Recognise and thank safe behaviour","Stay silent","Compete"],1)
   ]),
   tp("Your right to a safe workplace","Your rights and everyone's role.",[
    q("A safe workplace is:",["A privilege","Your right (Constitution s24 and the MHSA)","Optional","Only for managers"],1),
    q("You have the right to:",["Be kept in danger","Leave a dangerous working place (s23)","Be punished","Work without training"],1),
    q("For raising a safety concern you may not be:",["Thanked","Victimised (s83)","Heard","Helped"],1),
    q("You can participate in safety through:",["No one","Health and safety reps and committees","Only managers","The canteen"],1),
    q("Everyone is a safety leader when they:",["Stay silent","Make safe choices and speak up","Take shortcuts","Ignore others"],1)
   ])
  ]},

 {tier:2, module:"My Brother's Keeper",
  intro:"<b>We look out for one another — your safety is my responsibility, and mine is yours.</b>",
  ack:"I confirm that I have completed the My Brother's Keeper module and its assessments. I understand that I am responsible for <b>my own safety and that of others</b>, that I must <b>speak up and stop unsafe acts</b>, and that I should <b>look out for the wellbeing of my colleagues</b>. I commit to do so.",
  topics:[
   tp("What \"My Brother's Keeper\" means","Looking out for one another.",[
    q("My Brother's Keeper means:",["Only watch yourself","We look out for one another's safety","Mind your own business","Compete with colleagues"],1),
    q("MHSA s22 requires you to take care of:",["Only yourself","Yourself and others affected by your work","Only managers","Only machines"],1),
    q("On our mine, no one truly:",["Works in a team","Works alone — we watch out for each other","Follows rules","Wears PPE"],1),
    q("A team that watches out for each other is:",["Slower","A safer team","Weaker","Less productive"],1),
    q("Looking out for colleagues is:",["Only the supervisor's job","Everyone's job, every shift","Optional","Not allowed"],1)
   ]),
   tp("Speak up and step in: the duty to intervene","The duty to stop unsafe acts.",[
    q("If you see a colleague about to act unsafely you should:",["Say nothing","Stop them respectfully and speak up","Laugh","Walk away"],1),
    q("Stepping in should be done with:",["Anger and blame","Respect and care","Silence","Force"],1),
    q("If a colleague stops you, you should:",["Be offended","Thank them — they may have saved you","Ignore them","Report them"],1),
    q("For raising a genuine concern in good faith you are:",["Punished","Protected (s83)","Demoted","Fined"],1),
    q("The only wrong choice is to:",["Speak up","Stay silent and walk past","Intervene","Report"],1)
   ]),
   tp("Look out for one another: caring for the whole person","Wellbeing as part of safety.",[
    q("Caring for the whole person means noticing:",["Only PPE","Fatigue, stress or illness in a colleague","Only output","Nothing"],1),
    q("Fatigue, stress and illness can:",["Improve safety","Affect a person's ability to work safely","Be ignored","Help"],1),
    q("If you are concerned about a colleague you should:",["Ignore it","Check in and raise it through the right channels","Gossip","Do nothing"],1),
    q("Caring about a colleague is:",["Interfering","Exactly what we expect of one another","Forbidden","A weakness"],1),
    q("When we look out for each other:",["Nothing changes","We all go home safe","It slows work","It causes problems"],1)
   ])
  ]}

 ];
 window.INDUCTION_CONTENT = (window.INDUCTION_CONTENT||[]).concat(T2);
})();
