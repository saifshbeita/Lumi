import bcrypt from "bcrypt";
import { db,pool,adults,students,placements,profileInsights } from "@workspace/db";
import { eq,sql,and } from "drizzle-orm";
import { fixture } from "../placement/fixtures";
import { scorePlacement } from "../placement/scoring";
import { placementInsights } from "../placement/insights";
import {DEMO_CHILDREN} from "../placement/demo";
import { itemsFor,testForMode } from "../placement/banks";
if(process.env.NODE_ENV==="production"||process.argv.includes("--production"))throw new Error("This command is development-only. Production seeding requires a separate explicitly approved rollout.");
const specs=DEMO_CHILDREN;
try {
 await db.transaction(async tx=>{
  await tx.execute(sql`SELECT pg_advisory_xact_lock(71940213)`);
  const [owner]=await tx.select().from(adults).where(eq(adults.email,"pitch-teacher@lumi.demo"));
  if(!owner||owner.name!=="Demo Teacher (fictional)"||owner.role!=="teacher"||owner.school!=="Fictional Demo School")throw new Error("Verified fictional demo teacher must already exist; no accounts/passwords were changed.");
  const pinHash=await bcrypt.hash("1234",12);
  for(const spec of specs){
    let [s]=await tx.select().from(students).where(eq(students.username,spec.username));
    if(s&&(s.adultId!==owner.id||s.name!==spec.name||s.conditions[0]!==spec.mode||!s.demoPlacement))throw new Error("Reserved placement demo collision; transaction aborted without overwriting data.");
    if(!s)[s]=await tx.insert(students).values({adultId:owner.id,name:spec.name,username:spec.username,pinHash,conditions:[spec.mode],language:"ar",assessmentConfirmed:true,demoPlacement:true}).returning();
    const existing=await tx.select({id:placements.id}).from(placements).where(eq(placements.studentId,s.id));
    if(existing.length){console.info(`Placement demo retained: ${spec.username}`);continue;}
    const test=testForMode(spec.mode),answers=fixture(test,"mixed"),completedAt=new Date(),result=scorePlacement(test,answers,{completedAt:completedAt.toISOString(),breaks:spec.mode==="autism"?1:0});
    await tx.insert(placements).values({studentId:s.id,test,epoch:s.placementEpoch,status:"done",currentIndex:itemsFor(test).length,answers:answers as unknown as Record<string,unknown>[],result:result as unknown as Record<string,unknown>,state:{stage:"done",events:[],orders:{},sound:false,taps:[]},completedAt});
    await tx.delete(profileInsights).where(and(eq(profileInsights.studentId,s.id),eq(profileInsights.source,"placement")));
    await tx.insert(profileInsights).values(placementInsights(result).map(i=>({...i,studentId:s.id})));
    await tx.update(students).set({interests:result.interests}).where(eq(students.id,s.id));
    console.info(`Fictional placement demo ready: ${spec.username}`);
  }
 });
}finally{await pool.end();}
