import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { db, pool, adults, students, placements, profileInsights, sessions } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { itemsFor } from "../placement/banks";
import type { WarmupState } from "@workspace/api-zod";
const base="http://localhost:80/api";
const prefix=`warmup_qa_${Date.now()}`;
let adultId:number|undefined;
const studentIds:number[]=[];
async function login(username:string){
  const res=await fetch(`${base}/student/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username,pin:"7241"})});
  assert.equal(res.status,200);
  return res.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
}
async function request(path:string,cookie:string,body?:unknown,expected=200){
  const res=await fetch(`${base}${path}`,{method:body?"POST":"GET",headers:{Cookie:cookie,"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
  const data=await res.json();assert.equal(res.status,expected,JSON.stringify(data));
  return data as Omit<WarmupState,"item"> & {item:NonNullable<WarmupState["item"]>};
}
try {
  const [a]=await db.insert(adults).values({name:"Placement QA fictional",email:`${prefix}@example.invalid`,role:"teacher",passwordHash:await bcrypt.hash(randomUUID(),12)}).returning();adultId=a.id;
  const pinHash=await bcrypt.hash("7241",12);
  for(const mode of ["dyslexia","learning","autism"] as const){
    const [s]=await db.insert(students).values({adultId:a.id,name:"Fictional QA",username:`${prefix}_${mode}`,pinHash,conditions:[mode]}).returning();studentIds.push(s.id);
    const cookie=await login(s.username),path=`/student/placement/${mode}`;
    let state=await request(path,cookie);
    const event=async(action:string,extra:Record<string,unknown>={})=>{
      state=await request(path,cookie,{attemptId:state.id,eventId:randomUUID(),itemId:state.item?.id,action,...extra});return state;
    };
    const raw=JSON.stringify(state);
    assert(!raw.includes('"correct"')&&!raw.includes('"points"')&&!raw.includes('"levels"')&&!raw.includes('"result"')&&!raw.includes('"tag"'));
    if(mode==="autism"){assert.equal(state.stage,"schedule");await event("schedule");}
    const body={attemptId:state.id,eventId:randomUUID(),itemId:state.item.id,action:"answer",picked:[state.item.options[0].id],responseMs:5000};
    state=await request(path,cookie,body);
    assert.equal(state.stage,"answered");
    assert.deepEqual(await request(path,cookie,body),state,"same event must be idempotent");
    assert.equal((await request(path,await login(s.username))).stage,"answered","login must preserve acknowledged stage");
    await event("next");assert.equal(state.currentIndex,1);
    if(mode==="autism"){
      await event("break");assert.equal(state.stage,"paused");
      assert.equal((await request(path,cookie)).stage,"paused");
      await event("resume");assert.equal(state.stage,"question");
    }else{
      // Two wrong answers end their section, without fabricating selected answers.
      const all=itemsFor(mode==="learning"?"learning_difficulties":mode);
      for(let i=0;i<2;i++){const item=all.find(i=>i.id===state.item.id)!;await event("answer",{picked:[item.options.find(o=>o.correct===false)!.id],responseMs:1000});await event("next");}
      assert.equal(state.item.section,"B");
    }
    await request(`/student/placement/${mode==="autism"?"dyslexia":"autism"}`,cookie,undefined,403);
    // Child-provided correctness and points are not accepted as authoritative.
    if(state.item.type==="choice"){
      const item=itemsFor(mode==="learning"?"learning_difficulties":mode).find(i=>i.id===state.item.id)!;
      await event("answer",{picked:[item.options.find(o=>o.correct===false)!.id],correct:true,points:999,responseMs:1000});
      const [row]=await db.select().from(placements).where(eq(placements.id,state.id));
      assert.equal(row.answers.at(-1)?.points,0);
    }
    console.log(`${mode}: ownership, resume, neutral DTO, idempotence and mode rules verified`);
  }
  assert.equal((await fetch(`${base}/student/placement/dyslexia`)).status,403);
  console.log("Placement request checks passed.");
} finally {
  for(const id of studentIds){
    await db.delete(profileInsights).where(eq(profileInsights.studentId,id));
    await db.delete(placements).where(eq(placements.studentId,id));
    await db.execute(sql`DELETE FROM sessions WHERE sess::jsonb->>'studentId'=${String(id)}`);
    await db.delete(students).where(eq(students.id,id));
  }
  if(adultId)await db.delete(adults).where(eq(adults.id,adultId));
  await pool.end();
}
