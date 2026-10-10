import assert from "node:assert/strict";
import {db,pool,students,adults,chats,messages,placements,profileInsights,sessions} from "@workspace/db";
import {eq,sql} from "drizzle-orm";
if(process.env.NODE_ENV==="production"||process.argv.includes("--production"))throw new Error("Development cleanup only.");
const reference=Number(process.argv[2]);
assert(Number.isSafeInteger(reference));
try{
 const [ref]=await db.select().from(students).where(eq(students.id,reference));
 assert(ref&&ref.name==="Warm-up QA fictional"&&/^pl_[a-z0-9]+_/.test(ref.username));
 const prefix=ref.username.replace(/_(dyslexia|learning|autism|new)$/,"");
 const owners=(await db.select().from(adults)).filter(a=>a.name==="Lifecycle QA fictional"&&a.email.startsWith(prefix+"_")&&a.email.endsWith("@example.invalid"));
 assert.equal(owners.length,2);
 await db.transaction(async tx=>{
  for(const a of owners){
   const rows=await tx.select().from(students).where(eq(students.adultId,a.id));
   for(const s of rows){
    assert(["Warm-up QA fictional","New enrolment QA fictional"].includes(s.name)&&s.username.startsWith(prefix+"_"));
    for(const c of await tx.select().from(chats).where(eq(chats.studentId,s.id)))await tx.delete(messages).where(eq(messages.chatId,c.id));
    await tx.delete(chats).where(eq(chats.studentId,s.id));
    await tx.delete(profileInsights).where(eq(profileInsights.studentId,s.id));
    await tx.delete(placements).where(eq(placements.studentId,s.id));
    await tx.delete(sessions).where(sql`(${sessions.sess}->>'studentId')::integer=${s.id}`);
    await tx.delete(students).where(eq(students.id,s.id));
   }
   await tx.delete(sessions).where(sql`(${sessions.sess}->>'adultId')::integer=${a.id}`);
   await tx.delete(adults).where(eq(adults.id,a.id));
  }
 });
 console.log("Only verified fictional lifecycle fixtures and their test chats/sessions were removed.");
}finally{await pool.end();}
