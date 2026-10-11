import fs from 'node:fs';
import YAML from 'yaml';

// Direction: live hackathon pitch for judges and potential pilot partners.
// Keep the approved assertion-led story verbatim. Match Lumi's exact app tokens,
// Fraunces + Readex Pro fonts, flat surfaces, original mascot and no motion.
// Motifs: yellow metric fields and navy structural rules. Rhythm: mascot cover,
// hero statistic, three modes, demo pause, market, competition, pricing, traction,
// mascot closing. No stock imagery or unverified product screenshots.
const theme = {colors:{background:'#FAF9F4',foreground:'#2D4059',accent:'#F3D982',surface:'#E5EEF5',white:'#FFFFFF'},fonts:{display:'Fraunces',body:'Readex Pro'}};
const color = token => ({kind:'token',token});
const paint = token => ({kind:'solid',color:color(token)});
const frame = (x,y,width,height)=>({x,y,width,height});
const p = (text,sizePt=22,token='foreground',weight=400,font='body',gap=0)=>({runs:[{text}],defaultRunStyle:{font:{kind:'token',token:font},sizePt,weight,color:color(token)},lineHeight:sizePt>=36?1.1:1.25,spaceAfterPt:gap});
const text = (id,copy,x,y,w,h,size=22,token='foreground',weight=400,font='body')=>({id,type:'text',frame:frame(x,y,w,h),body:{paragraphs:[p(copy,size,token,weight,font)]}});
const box = (id,x,y,w,h,token,radius=0)=>({id,type:'shape',frame:frame(x,y,w,h),geometry:{kind:'preset',preset:radius?'roundRect':'rect',...(radius?{cornerRadius:radius}:{})},fill:paint(token)});
const image=(id,assetId,x,y,w,h)=>({id,type:'image',assetId,fit:'contain',frame:frame(x,y,w,h)});
const list=(id,lines,x,y,w,h,size=22,token='foreground')=>({id,type:'text',frame:frame(x,y,w,h),body:{paragraphs:lines.map(s=>p(s,size,token,400,'body',10))}});
const titles=[
"The lesson is the same. The learner isn't.",
"Reading should not block learning.",
"One companion. Three ways to learn.",
"See Lumi in action.",
"Start in Jordan. Expand with evidence.",
"A focused position in an active market.",
"Schools first. Families alongside.",
"Early interest. A measurable route to adoption.",
"Help us turn interest into evidence."
];
const copy=[
["Lumi — Every mind learns its own way.","An AI learning companion in Arabic and English.","For children who need a different way into learning."],
["11% pooled dyslexia prevalence among Arab primary-school children aged 6–13.","18 studies. 30,243 participants. Estimates vary across countries.","Children need accessible explanations; adults need visibility into learning.","Source: Aldakhil et al., 2024, systematic review and meta-analysis."],
["Dyslexia: voice-first support and spoken answers.","Learning difficulties: smaller steps and understanding checks.","Autism: calm, predictable interactions.","Adults choose the mode and language, then review learning observations.","Educational support — not diagnosis or a replacement for specialists."],
["60-second product demo.","Child experience → adapted support → adult insights.","Video to be supplied by the Lumi team."],
["4.56M primary pupils across Jordan and Saudi Arabia in 2024.","$30.1M illustrative annual opportunity: 4.56M × 11% × $60/year.","Jordan-only scenario: $7.4M/year, before access and purchasing constraints.","Initial target: 10 partners × 30 paid learners = $18K annual recurring revenue.","Scenarios, not forecasts. Primary enrollment is an age proxy; regional prevalence is not a country-specific estimate.","Sources: World Bank / UNESCO UIS, 2024 enrollment; Aldakhil et al., 2024. Price and adoption are assumptions."],
["Lexsee: guided reading, fluency support and teacher insights.","Faheem: live one-to-one tutoring and parent reports.","Khanmigo: broad AI tutoring with family oversight.","Lumi: Arabic/English support, three adult-selected learning modes, one shared learning record.","Compete on fit and usability; learning outcomes still need validation.","Sources: official competitor websites, accessed October 2026."],
["Schools and centers: proposed $5 per student/month, billed annually.","Families: proposed $10 per child/month.","School-led pilots → paid renewals → parent referrals.","Validate willingness to pay, retention and AI/voice cost per active learner."],
["37 waitlist signups in the first three hackathon hours.","10,000 Instagram views in 24 hours.","Feedback from 2 specialists and 3 teachers; 1 Amman school willing to trial.","@lumi.mena → parent/teacher demos → supervised pilots → paid conversion.","Track activation, weekly use, teacher-rated usefulness and renewal.","Founder-reported signals — not paid traction or proven learning impact."],
["Seeking pilot schools, special-education partners and parent communities.","Next milestone: a supervised pilot measuring usability, repeat use and learning support.","Hala Shbeita · Yousef Smreen · Saif Shbeita","instagram.com/lumi.mena","Lumi — Every mind learns its own way."]
];
const narration=[
"Imagine understanding a lesson, but struggling to access the explanation. Lumi is an Arabic and English learning companion designed around children who need a different approach.",
"A review covering over thirty thousand Arab primary-school children estimated dyslexia prevalence at eleven percent. Needs differ, but children need accessible explanations, and adults need visibility beyond the final answer.",
"Lumi offers three adult-selected modes: voice-first support for dyslexia, smaller steps for learning difficulties, and calm, predictable interactions for autism. Adults choose the language and review learning observations. This is educational support, not diagnosis.",
"[Play the 60-second demo. No additional narration.]",
"Jordan and Saudi Arabia have 4.56 million primary pupils. Applying the research estimate and proposed school price gives a thirty-million-dollar scenario, not a forecast. We start with supervised Jordanian pilots.",
"Alternatives already exist: Lexsee supports reading, Faheem connects families with tutors, and Khanmigo offers broad AI tutoring. Lumi focuses on bilingual, mode-specific support with adult oversight.",
"We propose five dollars per student monthly for schools, billed annually, and ten dollars for families. Pilots must validate pricing, repeat use, and voice costs.",
"Our team reports thirty-seven waitlist signups and ten thousand Instagram views, plus specialist feedback and one school willing to trial. Our route is Instagram demonstrations, supervised pilots, then paid conversion.",
"We are seeking pilot schools and specialist partners to measure usefulness and learning support. Together, we can test what works before expanding. Help Lumi make room for every mind."
];
const seconds=[12,16,18,60,16,14,14,18,12];
const elems=[];
const base=(n,dark=false)=>{
 const fg=dark?'background':'foreground';
 return [box('footer-rule',120,994,1680,2,dark?'accent':'surface'),text('folio',String(n).padStart(2,'0')+' / 09',1670,1010,140,42,14.4,fg),
 image('brand-head','head',1740,60,80,80),
 ...(n!==1&&n!==9?[text('headline',titles[n-1],120,135,1640,190,38,fg,600,'display')]:[])];
};
// 1 — Original mascot beside the problem, without cropping or retouching.
elems[0]=[box('mascot-field',1200,0,720,1080,'accent'),...base(1,true),
text('headline',titles[0],120,205,1060,360,56,'background',600,'display'),
list('intro',copy[0],120,620,1030,300,23,'background'),
image('mascot','full',1225,130,620,820)];
// 2 — A single, clearly qualified statistic.
elems[1]=[...base(2),box('stat-field',120,340,580,550,'accent',24),
text('stat','11%',165,410,500,240,104,'foreground',600,'display'),
text('stat-context',copy[1][0].slice(4),165,690,475,190,21),
list('need',copy[1].slice(1,3),800,415,960,390,25),
text('source',copy[1][3],120,925,1650,55,14.4)];
// 3 — Three mode cards, one adult-led workflow.
elems[2]=[...base(3)];
copy[2].slice(0,3).forEach((s,i)=>{const x=120+i*575;elems[2].push(box('mode-'+i,x,345,530,360,i===0?'accent':'surface',24),text('mode-copy-'+i,s,x+36,410,458,250,25));});
elems[2].push(text('adult',copy[2][3],120,770,1650,110,24),text('boundary',copy[2][4],120,920,1660,58,16));
// 4 — Deliberate full-screen video insertion area, not fabricated footage.
elems[3]=[...base(4,true),box('video-slot',300,340,1320,455,'surface',24),
text('duration',copy[3][0],430,445,1060,150,46,'foreground',600,'display'),
text('pending',copy[3][2],430,650,1100,80,22),
text('demo-flow',copy[3][1],300,865,1350,100,24,'background')];
// 5 — Market assumptions remain on-slide; geographic scenarios are not SAM.
elems[4]=[...base(5),box('opportunity-field',120,390,760,425,'accent',24),
text('enrollment',copy[4][0],120,305,1650,90,23),
text('market-number','$30.1M',160,435,680,190,80,'foreground',600,'display'),
text('market-context',copy[4][1].slice(7),160,650,670,145,22),
list('market-entry',copy[4].slice(2,4),970,445,820,360,23),
text('assumptions',copy[4][4],120,840,1660,85,16),
text('market-source',copy[4][5],120,933,1650,55,14.4)];
// 6 — Fair positioning; no unsupported competitor feature absences.
elems[5]=[...base(6)];
copy[5].slice(0,3).forEach((s,i)=>elems[5].push(text('competitor-'+i,s,120,345+i*145,1060,110,23),box('competitor-rule-'+i,120,464+i*145,1040,2,'surface')));
elems[5].push(box('lumi-position',1240,340,560,440,'accent',24),text('lumi-copy',copy[5][3],1280,395,480,350,24),
text('validation',copy[5][4],120,835,1650,95,22),text('source',copy[5][5],120,943,1650,50,14.4));
// 7 — Two transparent, unvalidated pricing hypotheses.
elems[6]=[...base(7),box('school-field',120,345,800,385,'accent',24),box('family-field',970,345,830,385,'surface',24),
text('school',copy[6][0],175,420,690,260,30),text('family',copy[6][1],1025,420,715,240,30),
text('sales-path',copy[6][2],120,795,1660,95,24),text('economics',copy[6][3],120,920,1660,65,19)];
// 8 — Founder-reported evidence separated from conversion goals.
elems[7]=[...base(8),box('waitlist-field',120,350,690,260,'accent',24),box('views-field',860,350,940,260,'surface',24),
text('waitlist',copy[7][0],160,400,610,185,26),text('views',copy[7][1],900,400,830,185,30),
text('feedback',copy[7][2],120,665,1650,110,23),text('gtm',copy[7][3],120,805,1650,95,22),
text('metrics',copy[7][4],120,915,1650,55,19),text('caveat',copy[7][5],120,1030,1500,40,14.4)];
// 9 — Clear pilot-oriented close; names preserved without invented roles.
elems[8]=[box('closing-field',1310,0,610,1080,'accent'),...base(9,true),
text('headline',titles[8],120,160,1150,270,54,'background',600,'display'),
list('ask',copy[8].slice(0,2),120,490,1080,300,24,'background'),
text('team',copy[8][2],120,825,1130,65,20,'background'),
text('instagram',copy[8][3],120,930,1100,65,22,'accent'),
image('closing-mascot','full',1320,120,585,735),
text('tagline',copy[8][4],1370,865,460,130,22)];
// Capacity pass: generous frames, not auto-shrinking, preserve exact copy.
const tune=(i,id,geometry,size)=>{
 const e=elems[i].find(e=>e.id===id);
 Object.assign(e.frame,geometry);
 if(size)e.body.paragraphs.forEach(p=>p.defaultRunStyle.sizePt=size);
};
tune(0,'headline',{y:155,height:410});
tune(0,'intro',{y:610,height:360},22);
tune(1,'stat',{height:265});
tune(1,'stat-context',{y:650,height:245});
tune(1,'need',{height:430});
for(let i=0;i<3;i++){
 tune(2,'mode-'+i,{height:385});
 tune(2,'mode-copy-'+i,{y:390,height:320},23);
}
tune(2,'adult',{y:775,height:140});
tune(3,'duration',{x:380,width:1200,height:230},42);
tune(4,'market-context',{y:625,height:180});
tune(4,'market-entry',{y:410,height:415},22);
tune(4,'market-source',{y:930,height:78});
for(let i=0;i<3;i++)tune(5,'competitor-'+i,{height:140});
tune(5,'lumi-copy',{y:380,height:365},22);
tune(6,'school',{y:390,height:315},28);
tune(7,'waitlist',{y:385,height:220});
tune(7,'feedback',{y:640,height:140});
tune(7,'gtm',{y:790,height:120});
tune(7,'metrics',{y:920,height:60});
tune(8,'headline',{y:140,height:375},50);
tune(8,'ask',{y:535,height:280},22);
tune(8,'team',{y:850,height:75});
fs.mkdirSync('src/data/slides',{recursive:true});
fs.mkdirSync('public/images',{recursive:true});
fs.mkdirSync('research',{recursive:true});
fs.copyFileSync('../../attached_assets/Lumi-Full-nbg_1791625827939.png','public/images/lumi-full.png');
fs.copyFileSync('../../attached_assets/Lumi-logo-nbg_1791625827939.png','public/images/lumi-head.png');
const manifest=titles.map((title,i)=>{
 const id=`slide${i+1}`;
 const doc={format:'replit.sdm',version:1,size:{width:1920,height:1080},background:paint([0,3,8].includes(i)?'foreground':'background'),theme,assets:{full:{src:'images/lumi-full.png'},head:{src:'images/lumi-head.png'}},elements:elems[i]};
 fs.writeFileSync(`src/data/slides/${id}.sdm.yaml`,YAML.stringify(doc));
 return {id,position:i+1,kind:'sdm',filepath:`src/data/slides/${id}.sdm.yaml`,title,description:copy[i].join(' '),speakerNotes:''};
});
fs.writeFileSync('src/data/slides-manifest.json',JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync('research/approved-copy.json',JSON.stringify(copy,null,2));
fs.writeFileSync('research/narration.json',JSON.stringify(narration.map((script,i)=>({slide:i+1,title:titles[i],seconds:seconds[i],script})),null,2));
const count=narration.filter((_,i)=>i!==3).join(' ').split(/\s+/).length;
console.log(`Built 9 slides; narration ${count} words; ${seconds.reduce((a,b)=>a+b,0)} seconds including demo.`);
