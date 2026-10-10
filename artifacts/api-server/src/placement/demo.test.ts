import {test} from "node:test";
import assert from "node:assert/strict";
import {DEMO_CHILDREN,isReservedDemoStudent,isFictionalDemoOwner} from "./demo";
test("demo reset verifies exact fictional students and role-bound owners",()=>{
 for(const d of DEMO_CHILDREN){
  const s={...d,conditions:[d.mode],demoPlacement:true};
  assert(isReservedDemoStudent(s));
  assert(!isReservedDemoStudent({...s,name:"Repurposed profile"}));
  assert(!isReservedDemoStudent({...s,demoPlacement:false}));
  assert(!isReservedDemoStudent({...s,conditions:["different"]}));
 }
 const a={role:"teacher",email:"pitch-teacher@lumi.demo",name:"Demo Teacher (fictional)",school:"Fictional Demo School"};
 assert(isFictionalDemoOwner(a));
 assert(!isFictionalDemoOwner({...a,email:"pitch-parent@lumi.demo"}));
 assert(!isFictionalDemoOwner({...a,school:"Real school"}));
 assert(!isFictionalDemoOwner(undefined));
});
