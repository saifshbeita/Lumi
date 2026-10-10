import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import {randomUUID} from "node:crypto";
import {db,pool,adults,students,chats,messages,sessions} from "@workspace/db";
import {eq,sql} from "drizzle-orm";
import {generateStudentReply,generatePersonalizedReply} from "../lib/student-ai";
import {scorePlacement} from "../placement/scoring";
import {fixture} from "../placement/fixtures";

if(process.env.NODE_ENV==="production")throw new Error("Development verification only.");
const prefix=`subject_${Date.now().toString(36)}`,ids:number[]=[];
let owner:number|undefined;
async function api(path:string,cookie="",method="GET",data?:unknown,status=200){
  const res=await fetch("http://localhost:80/api"+path,{method,headers:{"Content-Type":"application/json",Cookie:cookie},...(data?{body:JSON.stringify(data)}:{})});
  const body=await res.json() as Record<string,any>;assert.equal(res.status,status,JSON.stringify(body));
  return {body,cookie:res.headers.get("set-cookie")?.split(";")[0]??""};
}
try{
  const [adult]=await db.insert(adults).values({name:"Subject QA fictional",email:`${prefix}@example.invalid`,role:"parent",passwordHash:await bcrypt.hash(randomUUID(),10)}).returning();
  owner=adult.id;
  let previousChat:number|undefined;
  for(const mode of ["dyslexia","learning","autism"] as const){
    const username=`${prefix}_${mode}`;
    const [student]=await db.insert(students).values({adultId:owner,name:"Subject QA fictional",username,pinHash:await bcrypt.hash("7241",10),conditions:[mode]}).returning();
    ids.push(student.id);
    const {cookie}=await api("/student/login","","POST",{username,pin:"7241"});
    const {body:chat}=await api("/student/chats",cookie,"POST",{},201);
    assert.equal(chat.subject,"general");
    for(const subject of ["math","science","arabic","english","general"]){
      const {body:updated}=await api(`/student/chats/${chat.id}/subject`,cookie,"PATCH",{subject});
      assert.equal(updated.subject,subject);
      const {body:history}=await api(`/student/chats/${chat.id}/messages`,cookie);
      assert.equal(history.chat.subject,subject);
    }
    await api(`/student/chats/${chat.id}/subject`,cookie,"PATCH",{subject:"invalid"},400);
    if(previousChat)await api(`/student/chats/${previousChat}/subject`,cookie,"PATCH",{subject:"math"},403);
    previousChat=chat.id;
    const [stored]=await db.select().from(chats).where(eq(chats.id,chat.id));
    assert.deepEqual(stored.learnerState,{});
    console.log(`${mode}: default, all five persisted subjects, invalid-input/ownership checks; learner state unchanged.`);
  }
  const question=[{role:"student" as const,content:"علّمني شيئًا جديدًا."}];
  for(const subject of ["math","arabic"] as const){
    const legacy=await generateStudentReply("dyslexia",question,[],undefined,"ar",[],subject);
    const reply=await generatePersonalizedReply("learning",question,"ar",scorePlacement("learning_difficulties",fixture("learning_difficulties","mixed")),[],{},subject);
    console.log(`${subject} — standard: ${legacy}\n${subject} — personalized: ${reply.content}`);
  }
}finally{
  for(const id of ids){
    for(const chat of await db.select().from(chats).where(eq(chats.studentId,id)))await db.delete(messages).where(eq(messages.chatId,chat.id));
    await db.delete(chats).where(eq(chats.studentId,id));
    await db.delete(sessions).where(sql`(${sessions.sess}->>'studentId')::integer=${id}`);
    await db.delete(students).where(eq(students.id,id));
  }
  if(owner)await db.delete(adults).where(eq(adults.id,owner));
  await pool.end();
}
