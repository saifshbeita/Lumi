import { db, placements, students, profileInsights, type StudentRow } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { banks, itemsFor, testForMode } from "./banks";
import type { Answer, Item, Result } from "./types";
import { WarmupEventBody } from "@workspace/api-zod";

type Row = typeof placements.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export class PlacementError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function activePlacement(student: StudentRow,reader:Pick<typeof db,"select">=db) {
  return (await reader.select().from(placements).where(and(eq(placements.studentId,student.id),eq(placements.test,testForMode(student.conditions[0])),eq(placements.epoch,student.placementEpoch),eq(placements.status,"done"))).orderBy(desc(placements.id)).limit(1))[0];
}
export async function lastCompletedPlacement(student: StudentRow) {
  return (await db.select().from(placements).where(and(eq(placements.studentId,student.id),eq(placements.test,testForMode(student.conditions[0])),eq(placements.status,"done"))).orderBy(desc(placements.id)).limit(1))[0];
}
export async function placementChatRequired(student:StudentRow,reader:Pick<typeof db,"select">=db){
  const active=await activePlacement(student,reader);
  if(active)return false;
  const [attempt]=await reader.select({id:placements.id}).from(placements).where(eq(placements.studentId,student.id)).limit(1);
  // Untouched legacy accounts may still use the old tutor, but enrollment/redo/mode changes cannot bypass a warm-up.
  return student.placementEpoch>0||!!attempt;
}
function shuffled(ids: string[]) {
  const out=[...ids]; for(let i=out.length-1;i>0;i--){const j=randomInt(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;
}
async function ensure(tx: Tx, s: StudentRow) {
  const test=testForMode(s.conditions[0]);
  const [existing]=await tx.select().from(placements).where(and(eq(placements.studentId,s.id),eq(placements.test,test),eq(placements.epoch,s.placementEpoch))).orderBy(desc(placements.id)).limit(1);
  if(existing) return existing;
  const [previous]=await tx.select().from(placements).where(and(eq(placements.studentId,s.id),eq(placements.test,test))).orderBy(desc(placements.id)).limit(1);
  const orders = test==="autism" && previous?.state.orders ? previous.state.orders : Object.fromEntries(itemsFor(test).map(i=>[i.id,i.type==="ordered_taps" ? i.options.map(o=>o.id) : shuffled(i.options.map(o=>o.id))]));
  const [row]=await tx.insert(placements).values({studentId:s.id,test,epoch:s.placementEpoch,state:{orders,stage:test==="autism"?"schedule":"question",sound:false,events:[],taps:[],replays:0,audioUsed:0}}).returning();
  return row!;
}
export async function lockedStudent<T>(id: number, run: (tx:Tx,s:StudentRow)=>Promise<T>) {
  return db.transaction(async tx=>{
    await tx.execute(sql`SELECT id FROM students WHERE id=${id} FOR UPDATE`);
    const [s]=await tx.select().from(students).where(eq(students.id,id));
    if(!s) throw new PlacementError(403,"افتح حسابك من جديد.");
    return run(tx,s);
  });
}
const stageFor=(item?:Item)=>item?.type==="sequence_memory"?"preview":"question";
export function childState(row:Row,mode:string) {
  const items=itemsFor(row.test),item=items[row.currentIndex],state=row.state;
  const stage=row.status==="done"?"done":String(state.stage ?? stageFor(item));
  const bank=banks[row.test],sectionIndex=item?bank.sections.findIndex(s=>s.id===item.section):bank.sections.length-1;
  let publicItem: Record<string,unknown>|null=null;
  if(item) {
    const order=(state.orders as Record<string,string[]>|undefined)?.[item.id]??item.options.map(o=>o.id);
    publicItem={ id:item.id,type:item.type,section:item.section,audio:item.audio,
      prompt_ar:item.type==="ordered_taps" && state.audioPlayed ? "" : item.prompt_ar,
      tts_ar:promptAudio(item),shown:item.shown,example:item.example,
      passage:item.hidden_passage?undefined:item.passage,passage_audio:item.passage_audio,
      options:order.map(id=>item.options.find(o=>o.id===id)!).map(({id,label_ar,emoji,size})=>({id,label_ar,emoji,size})),
      sequence:item.type==="sequence_memory" && stage==="preview"?item.sequence:undefined };
  }
  return { id:row.id,mode,required:row.status!=="done",currentIndex:row.currentIndex,stage,item:publicItem,
    sections:bank.sections.map(s=>({id:s.id,title_ar:s.title_ar,count:s.items.length})),sectionIndex,
    partItemIndex:item?bank.sections[sectionIndex].items.findIndex(i=>i.id===item.id):0,
    feedback:row.test==="autism"?"تمّ ✓":row.test==="dyslexia"?"شاطر! يلا التالي":"أحسنت! خلّينا نكمّل",
    selected:stage==="answered"?(row.answers.at(-1)?.picked??[]):[],
    sound:state.sound===true,audioPlayed:state.audioPlayed===true,replays:Number(state.replays??0),
    taps:state.taps??[],sequenceCount:item?.sequence?.length??0 };
}
export function promptAudio(item:Item) {
  // Passage audio is deliberately disjoint from question audio.
  const prefix=item.passage_audio?item.passage: item.audio==="optional"?item.shown:undefined;
  return [prefix,item.example,item.tts_ar??item.prompt_ar].filter(Boolean).join(" ");
}
export async function getWarmup(id:number,mode:string) {
  return lockedStudent(id,async(tx,s)=>{
    if(s.conditions[0]!==mode) throw new PlacementError(403,"افتح مساحة التعلم المخصصة لحسابك.");
    const row=await ensure(tx,s);
    return childState(row,mode);
  });
}
export async function redo(id:number) {
  return lockedStudent(id,async(tx,s)=>{
    const [next]=await tx.update(students).set({placementEpoch:s.placementEpoch+1}).where(eq(students.id,id)).returning();
    await ensure(tx,next!);
  });
}
export async function applyEvent(id:number,mode:string,input:unknown) {
  const parsed=WarmupEventBody.safeParse(input);
  if(!parsed.success) throw new PlacementError(400,"حاول مرة أخرى.");
  const event=parsed.data;
  return lockedStudent(id,async(tx,s)=>{
    if(s.conditions[0]!==mode) throw new PlacementError(403,"افتح مساحة التعلم المخصصة لحسابك.");
    const row=await ensure(tx,s),state={...row.state};
    if(row.id!==event.attemptId) throw new PlacementError(409,"تم تحديث النشاط. افتحه من جديد.");
    const events=(state.events as string[]|undefined)??[];
    if(events.includes(event.eventId)) return childState(row,mode);
    if(row.status==="done") return childState(row,mode);
    const items=itemsFor(row.test),item=items[row.currentIndex],stage=String(state.stage??stageFor(item));
    const picked=event.picked??[];
    if(["answer","tap","audio","preview_done","next"].includes(event.action) && item?.id!==event.itemId) throw new PlacementError(409,"افتح النشاط من جديد.");
    if(event.action==="break"){
      if(row.test!=="autism") throw new PlacementError(400,"خذ استراحة ثم عد للنشاط.");
      if(stage!=="paused"){state.beforePause=stage;state.stage="paused";state.breaks=Number(state.breaks??0)+1;}
    } else if(event.action==="resume"){
      if(stage!=="paused") throw new PlacementError(409,"النشاط مفتوح بالفعل.");
      state.stage=state.beforePause??stageFor(item);
    } else if(event.action==="sound"){
      if(row.test!=="autism") throw new PlacementError(400,"حاول مرة أخرى.");
      state.sound=event.sound===true;
    } else if(event.action==="schedule"){
      if(stage!=="schedule") throw new PlacementError(409,"افتح النشاط من جديد.");
      state.stage=stageFor(item);
    } else if(event.action==="preview_done"){
      if(stage!=="preview") throw new PlacementError(409,"افتح النشاط من جديد.");
      state.stage="question";
    } else if(event.action==="audio"){
      if(!["question","preview"].includes(stage)||!item) throw new PlacementError(409,"انتقل للسؤال التالي.");
      if(row.test==="autism" && state.sound!==true) throw new PlacementError(403,"شغّل الصوت أولاً.");
      const replay=state.audioPlayed===true;
      if(item.type==="ordered_taps" && replay && Number(state.replays??0)>=1) throw new PlacementError(409,"نكمّل الآن.");
      state.audioPlayed=true;
      state.audioUsed=Number(state.audioUsed??0)+1;
      if(replay) state.replays=Number(state.replays??0)+1;
    } else if(event.action==="tap"){
      if(stage!=="question" || !item?.sequence || !item.options.some(o=>o.id===picked[0])) throw new PlacementError(400,"اختار من الصور.");
      const taps=(state.taps as string[]|undefined)??[];
      if(taps.length>=item.sequence.length) throw new PlacementError(409,"اضغط التالي.");
      state.taps=[...taps,picked[0]];
    } else if(event.action==="answer"){
      if(stage==="answered") return childState(row,mode);
      if(stage!=="question" || !item) throw new PlacementError(409,"نكمّل السؤال أولاً.");
      const skipped=event.skipped===true;
      if(!skipped){
        if(item.type==="free_text_optional"){
          if(picked.length>1 || (picked[0]?.length??0)>500) throw new PlacementError(400,"اكتب جواباً قصيراً.");
        } else if(item.sequence){
          if(JSON.stringify(picked)!==JSON.stringify(state.taps??[])||picked.length!==item.sequence.length) throw new PlacementError(400,"اضغط الصور بالترتيب.");
        } else if(!picked.length || new Set(picked).size!==picked.length || picked.some(v=>!item.options.some(o=>o.id===v)) || picked.length>(item.type==="multi_pick"?3:1)) throw new PlacementError(400,"اختار من الخيارات.");
      }
      const correct=!skipped && !!item.domain && (item.sequence?JSON.stringify(picked)===JSON.stringify(item.sequence):item.options.find(o=>o.id===picked[0])?.correct===true);
      const supported=row.test==="learning_difficulties" && ((item.section==="C"&&Number(state.audioUsed??0)>0)||(item.section==="E"&&Number(state.replays??0)>0));
      const answer:Answer={item_id:item.id,picked:skipped?[]:picked,correct,points:correct?(supported?.5:1):0,supported,skipped,response_ms:event.responseMs??0,replays:Number(state.replays??0),audio_used:Number(state.audioUsed??0)};
      row.answers=[...row.answers,answer as unknown as Record<string,unknown>];state.stage="answered";
      if(item.save==="sound") state.sound=picked[0]==="on";
    } else if(event.action==="next"){
      if(stage!=="answered" || !item) throw new PlacementError(409,"اختار جواباً أولاً.");
      let next=row.currentIndex+1;
      const answered=row.answers as unknown as Answer[];
      const last=answered.slice(-2);
      if(item.stop_rule && last.length===2 && last.every(a=>items.find(i=>i.id===a.item_id)?.section===item.section&&!a.correct))
        while(next<items.length && items[next].section===item.section) next++;
      row.currentIndex=next;
      state.stage=row.test==="autism" && items[next]?.section!==item.section && items[next]?"schedule":stageFor(items[next]);
      state.taps=[];state.replays=0;state.audioUsed=0;state.audioPlayed=false;
      if(next>=items.length){
        // Completion and deterministic insight replacement share this transaction.
        const {scorePlacement}=await import("./scoring");
        const {placementInsights}=await import("./insights");
        const result=scorePlacement(row.test,answered,{completedAt:new Date().toISOString(),breaks:Number(state.breaks??0)});
        row.status="done";row.completedAt=new Date(result.completed_at);row.result=result as unknown as Record<string,unknown>;state.stage="done";
        await tx.delete(profileInsights).where(and(eq(profileInsights.studentId,s.id),eq(profileInsights.source,"placement")));
        await tx.insert(profileInsights).values(placementInsights(result).map(i=>({...i,studentId:s.id,source:"placement" as const})));
        await tx.update(students).set({interests:result.interests}).where(eq(students.id,s.id));
      }
    }
    state.events=[...events,event.eventId].slice(-200);row.state=state;
    await tx.update(placements).set({state,currentIndex:row.currentIndex,answers:row.answers,status:row.status,result:row.result,completedAt:row.completedAt}).where(eq(placements.id,row.id));
    return childState(row,mode);
  });
}
