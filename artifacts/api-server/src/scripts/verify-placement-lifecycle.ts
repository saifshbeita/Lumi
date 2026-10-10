import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { db,pool,adults,students,placements,profileInsights,sessions,chats,messages } from "@workspace/db";
import { eq,sql } from "drizzle-orm";
import { getWarmup,applyEvent,activePlacement,placementChatRequired } from "../placement/store";
import { WarmupEventBody,GetWarmupResponse } from "@workspace/api-zod";
import { fixture } from "../placement/fixtures";
import { testForMode } from "../placement/banks";
const base="http://localhost:80/api",prefix=`pl_${Date.now().toString(36)}`,ids:number[]=[],owners:number[]=[];
if(process.env.NODE_ENV==="production"||process.argv.includes("--production"))throw new Error("Development verification only.");
async function api(path:string,cookie:string,method="GET",data?:unknown,expected=200){
 const r=await fetch(base+path,{method,headers:{"Content-Type":"application/json",Cookie:cookie},...(data?{body:JSON.stringify(data)}:{})});
 const body=await r.json();assert.equal(r.status,expected,JSON.stringify(body));return body as Record<string,any>;
}
try{
 const cookies:string[]=[];
 for(const role of ["teacher","parent"] as const){
  const password=randomUUID(),email=`${prefix}_${role}@example.invalid`;
  const [a]=await db.insert(adults).values({name:"Lifecycle QA fictional",email,role,passwordHash:await bcrypt.hash(password,12)}).returning();owners.push(a.id);
  const r=await fetch(base+"/adult/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role,email,password})});assert.equal(r.status,200);cookies.push(r.headers.getSetCookie().map(c=>c.split(";")[0]).join("; "));
 }
 for(const [i,mode] of (["dyslexia","learning","autism"] as const).entries()){
  const ownerIndex=i===1?1:0;
  const [s]=await db.insert(students).values({adultId:owners[ownerIndex],name:"Warm-up QA fictional",username:`${prefix}_${mode}`,pinHash:await bcrypt.hash("7241",12),conditions:[mode],language:"en",assessmentConfirmed:true}).returning();ids.push(s.id);
  const login=await fetch(base+"/student/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:s.username,pin:"7241"})});assert.equal(login.status,200);
  const childCookie=login.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
  assert.equal(await placementChatRequired(s),false);
  const oldChat=await api("/student/chats",childCookie,"POST",undefined,201);
  const [evidence]=await db.insert(profileInsights).values({studentId:s.id,type:"strength",source:"session",text:"Session evidence retained.",textAr:"دليل محادثة محفوظ.",textEn:"Session evidence retained.",evidence:"Original quotation."}).returning();
  let st=GetWarmupResponse.parse(await getWarmup(s.id,mode)),lastEvent;
  await api("/student/chats",childCookie,"POST",undefined,409);
  await api(`/student/chats/${oldChat.id}/messages`,childCookie,"POST",{content:"Hello"},409);
  const event=async(action:string,picked?:string[])=>{
    const input=WarmupEventBody.parse({attemptId:st.id,eventId:randomUUID(),itemId:st.item?.id,action,picked,responseMs:9000});lastEvent=input;
    st=GetWarmupResponse.parse(await applyEvent(s.id,mode,input));
  };
  while(st.stage!=="done"){
    if(st.stage==="schedule"){await event("schedule");continue;}
    if(st.stage==="preview"){await event("preview_done");continue;}
    const a=fixture(testForMode(mode),"high").find(a=>a.item_id===st.item?.id)!;
    if(st.stage==="question"){
      if(st.item?.type==="sequence_memory"||st.item?.type==="ordered_taps")for(const id of a.picked)await event("tap",[id]);
      await event("answer",a.picked);
      assert.equal((await getWarmup(s.id,mode)).stage,"answered");
    }
    await event("next");
  }
  assert(!("result"in st));const [saved]=await db.select().from(placements).where(eq(placements.id,st.id));assert(saved.completedAt);assert.equal(saved.result?.band,"explorer");
  await api("/student/chats",childCookie,"POST",undefined,201);
  const observations=await db.select().from(profileInsights).where(eq(profileInsights.studentId,s.id));assert(observations.some(o=>o.id===evidence.id));assert(observations.filter(o=>o.source==="placement").every(o=>!o.evidence&&!o.sourceChatId));
  await applyEvent(s.id,mode,lastEvent!);
  assert.equal((await db.select().from(profileInsights).where(eq(profileInsights.studentId,s.id))).length,observations.length);
  const start=await api(`/adult/students/${s.id}/placement`,cookies[ownerIndex]);assert.equal(start.pending,false);assert.equal(start.result.band,"explorer");
  await api(`/adult/students/${s.id}/placement`,cookies[1-ownerIndex],"GET",undefined,403);
  await api(`/adult/students/${s.id}/placement`,cookies[ownerIndex],"POST",{demoReset:true},403);
  await api(`/adult/students/${s.id}/placement`,cookies[ownerIndex],"POST",{});
  const pending=await api(`/adult/students/${s.id}/placement`,cookies[ownerIndex]);assert.equal(pending.pending,true);assert.equal(pending.result.band,"explorer");
  await api(`/student/chats/${oldChat.id}/messages`,childCookie,"POST",{content:"Hello"},409);
  const [afterRedo]=await db.select().from(students).where(eq(students.id,s.id));assert.equal(await activePlacement(afterRedo),undefined);
  await assert.rejects(()=>applyEvent(s.id,mode,lastEvent!));
  const first=GetWarmupResponse.parse(await getWarmup(s.id,mode));assert(first.required);assert.notEqual(first.id,saved.id);
  const nextMode=mode==="autism"?"learning":"autism";
  await api(`/students/${s.id}`,cookies[ownerIndex],"PATCH",{mode:nextMode});
  const changed=GetWarmupResponse.parse(await getWarmup(s.id,nextMode));assert(changed.required);assert.equal(changed.currentIndex,0);
  await assert.rejects(()=>getWarmup(s.id,mode));
  await api(`/students/${s.id}`,cookies[ownerIndex],"PATCH",{mode});
  await api("/student/chats",childCookie,"POST",undefined,409);
  console.info(`${mode}: atomic completion, hidden child result, ${ownerIndex?"parent":"teacher"} ownership, session provenance, redo history and stale-mode rejection verified`);
 }
 const created=await api("/students",cookies[0],"POST",{name:"New enrolment QA fictional",username:`${prefix}_new`,pin:"7241",mode:"learning",language:"en",assessmentConfirmed:true},201);
 ids.push(created.id);
 const [enrolled]=await db.select().from(students).where(eq(students.id,created.id));
 assert(await placementChatRequired(enrolled));
 assert.equal((await db.select().from(placements).where(eq(placements.studentId,enrolled.id))).length,0);
 await getWarmup(enrolled.id,"learning");
 assert.equal((await db.select().from(placements).where(eq(placements.studentId,enrolled.id))).length,1);
 console.info("New enrollment atomically requires a warm-up; legacy compatibility and pending redo/mode-back chat gates verified.");
}finally{
 for(const id of ids){
  for(const c of await db.select({id:chats.id}).from(chats).where(eq(chats.studentId,id))){await db.delete(messages).where(eq(messages.chatId,c.id));}
  await db.delete(chats).where(eq(chats.studentId,id));
  await db.delete(sessions).where(sql`(${sessions.sess}->>'studentId')::integer=${id}`);
  await db.delete(profileInsights).where(eq(profileInsights.studentId,id));await db.delete(placements).where(eq(placements.studentId,id));await db.delete(students).where(eq(students.id,id));
 }
 for(const id of owners){await db.delete(sessions).where(sql`(${sessions.sess}->>'adultId')::integer=${id}`);await db.delete(adults).where(eq(adults.id,id));}
 await pool.end();
}
