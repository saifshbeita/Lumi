import { readFile,writeFile,unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { db,pool,adults,students,placements,profileInsights,chats,messages,sessions } from "@workspace/db";
import { eq,sql } from "drizzle-orm";
import { fixture } from "../placement/fixtures";
import { scorePlacement } from "../placement/scoring";
import { placementInsights } from "../placement/insights";
import { itemsFor,testForMode } from "../placement/banks";
import { objectStorageClient } from "../lib/objectStorage";
const path="/tmp/lumi-placement-browser-fixtures.json";
type Manifest={adults:{id:number;role:"teacher"|"parent";email:string;password:string}[];students:{id:number;mode:string;username:string;pin:string;kind:string;language:string}[]};
try{
 if(process.argv.includes("--cleanup")){
  const m:Manifest=JSON.parse(await readFile(path,"utf8"));
  for(const s of m.students){
   const rows=await db.select().from(chats).where(eq(chats.studentId,s.id));
   for(const c of rows){
    const audio=await db.select({audioUrl:messages.audioUrl}).from(messages).where(eq(messages.chatId,c.id));
    for(const m of audio)if(m.audioUrl){
      const root=process.env.PRIVATE_OBJECT_DIR?.replace(/\/$/,"");
      if(!root||!m.audioUrl.startsWith(`${root}/student-audio/${s.id}/`))throw new Error("Refusing to delete audio outside the temporary QA student directory.");
      const parts=m.audioUrl.replace(/^\//,"").split("/");
      await objectStorageClient.bucket(parts[0]).file(parts.slice(1).join("/")).delete({ignoreNotFound:true});
    }
    await db.delete(messages).where(eq(messages.chatId,c.id));await db.delete(chats).where(eq(chats.id,c.id));
   }
   await db.delete(profileInsights).where(eq(profileInsights.studentId,s.id));await db.delete(placements).where(eq(placements.studentId,s.id));
   await db.delete(sessions).where(sql`(${sessions.sess}->>'studentId')::integer=${s.id}`);await db.delete(students).where(eq(students.id,s.id));
  }
  for(const a of m.adults){await db.delete(sessions).where(sql`(${sessions.sess}->>'adultId')::integer=${a.id}`);await db.delete(adults).where(eq(adults.id,a.id));}
  await unlink(path);console.info("Temporary browser fixtures and login manifest removed.");
 }else{
  const m:Manifest={adults:[],students:[]},prefix=`pui_${Date.now().toString(36)}`;
  for(const role of ["teacher","parent"] as const){
   const password=randomUUID(),email=`${prefix}_${role}@example.invalid`;
   const [a]=await db.insert(adults).values({name:"Browser QA (fictional)",email,role,passwordHash:await bcrypt.hash(password,12)}).returning();
   m.adults.push({id:a.id,role,email,password});
  }
  for(const [i,mode] of (["dyslexia","learning","autism"] as const).entries())for(const kind of ["fresh","mixed"]){
   const owner=m.adults[mode==="learning"?1:0],pin="7241",language=mode==="learning"?"en":"ar";
   const [s]=await db.insert(students).values({adultId:owner.id,name:["عمر (اختبار تجريبي)","لين (اختبار تجريبي)","يزن (اختبار تجريبي)"][i],username:`${prefix}_${mode}_${kind}`,pinHash:await bcrypt.hash(pin,12),conditions:[mode],language,assessmentConfirmed:true}).returning();
   m.students.push({id:s.id,mode,username:s.username,pin,kind,language});
   if(kind==="mixed"){
    const test=testForMode(mode),answers=fixture(test,"mixed"),completedAt=new Date(),result=scorePlacement(test,answers,{completedAt:completedAt.toISOString()});
    await db.insert(placements).values({studentId:s.id,test,status:"done",currentIndex:itemsFor(test).length,answers:answers as unknown as Record<string,unknown>[],result:result as unknown as Record<string,unknown>,state:{stage:"done",orders:{},sound:false,taps:[]},completedAt});
    await db.insert(profileInsights).values(placementInsights(result).map(i=>({...i,studentId:s.id})));
   }
  }
  await writeFile(path,JSON.stringify(m),{mode:0o600});console.info("Temporary fictional browser fixtures are ready; credentials remain in the private temporary manifest.");
 }
}finally{await pool.end();}
