export const DEMO_CHILDREN=[
 {name:"عمر",username:"warmup_omar_demo",mode:"dyslexia"},
 {name:"لين",username:"warmup_leen_demo",mode:"learning"},
 {name:"يزن",username:"warmup_yazan_demo",mode:"autism"},
] as const;
export function isReservedDemoStudent(s:{demoPlacement:boolean;name:string;username:string;conditions:string[]}){
 return s.demoPlacement&&DEMO_CHILDREN.some(d=>s.name===d.name&&s.username===d.username&&s.conditions.length===1&&s.conditions[0]===d.mode);
}
export function isFictionalDemoOwner(a:{role:string;name:string;email:string;school:string|null}|undefined){
 return !!a&&(a.role==="teacher"&&a.email==="pitch-teacher@lumi.demo"&&a.name==="Demo Teacher (fictional)"&&a.school==="Fictional Demo School"||
 a.role==="parent"&&a.email==="pitch-parent@lumi.demo"&&a.name==="Demo Parent (fictional)");
}
