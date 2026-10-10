import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import { db, students, placements, adults } from "@workspace/db";
import { currentStudent } from "../lib/profiles";
import { getWarmup, applyEvent, redo, childState, promptAudio, lastCompletedPlacement, PlacementError } from "../placement/store";
import {isReservedDemoStudent,isFictionalDemoOwner} from "../placement/demo";
import { itemsFor } from "../placement/banks";
import { voiceOpenAI } from "../lib/voice-audio";
import { objectStorageClient } from "../lib/objectStorage";
import { GetWarmupResponse, WarmupEventResponse, GetStartingPointResponse, RedoWarmupBody } from "@workspace/api-zod";
const router:IRouter=Router();
const limit=rateLimit({windowMs:60000,limit:100,standardHeaders:"draft-8",legacyHeaders:false});
const audioLimit=rateLimit({windowMs:60000,limit:20,standardHeaders:"draft-8",legacyHeaders:false});
const audioJobs=new Map<string,Promise<Buffer>>();
const modeValid=(m:string)=>["dyslexia","learning","autism"].includes(m);
async function ownedStudent(studentId:number|undefined,mode:string){
  const s=await currentStudent(studentId);
  if(!s || !modeValid(mode) || s.conditions[0]!==mode) throw new PlacementError(403,"افتح مساحة التعلم المخصصة لحسابك.");
  return s;
}
router.get("/student/placement/:mode",async(req,res,next)=>{
  try {await ownedStudent(req.session.studentId,String(req.params.mode));res.json(GetWarmupResponse.parse(await getWarmup(req.session.studentId!,String(req.params.mode))));}catch(e){next(e);}
});
router.post("/student/placement/:mode",limit,async(req,res,next)=>{
  try {await ownedStudent(req.session.studentId,String(req.params.mode));res.json(WarmupEventResponse.parse(await applyEvent(req.session.studentId!,String(req.params.mode),req.body)));}catch(e){next(e);}
});
router.get("/student/placement/:mode/:attemptId/:itemId/audio",audioLimit,async(req,res,next)=>{
  try{
    const mode=String(req.params.mode),s=await ownedStudent(req.session.studentId,mode);
    const [row]=await db.select().from(placements).where(and(eq(placements.id,Number(req.params.attemptId)),eq(placements.studentId,s.id),eq(placements.epoch,s.placementEpoch)));
    if(!row||row.status!=="in_progress") throw new PlacementError(403,"هذا الصوت غير متاح.");
    const item=itemsFor(row.test)[row.currentIndex];
    if(!item||item.id!==req.params.itemId||!["question","preview"].includes(String(row.state.stage))||(mode==="autism" && row.state.sound!==true)) throw new PlacementError(403,"هذا الصوت غير متاح.");
    if(item.type==="ordered_taps"&&Number(row.state.replays??0)>=1) throw new PlacementError(409,"نكمّل الآن.");
    const input=promptAudio(item),key=createHash("sha256").update(`placement-v1-sage-ar-${input}`).digest("hex");
    let job=audioJobs.get(key);
    if(!job){
      job=(async()=>{
        const root=process.env.PRIVATE_OBJECT_DIR?.replace(/\/$/,""); if(!root) throw new Error("Private storage unavailable");
        const parts=`${root}/placement-audio/${key}.mp3`.replace(/^\//,"").split("/");
        const file=objectStorageClient.bucket(parts.shift()!).file(parts.join("/"));
        if((await file.exists())[0]) return (await file.download())[0];
        const speech=await voiceOpenAI.audio.speech.create({model:"gpt-4o-mini-tts",voice:"sage",speed:.9,response_format:"mp3",input,instructions:"Read exactly in clear, calm Arabic for a child. Pause at ellipses when separating sounds. Do not add words."});
        const buffer=Buffer.from(await speech.arrayBuffer());
        await file.save(buffer,{resumable:false,contentType:"audio/mpeg",metadata:{cacheControl:"private, no-store"}});
        return buffer;
      })().finally(()=>audioJobs.delete(key));
      audioJobs.set(key,job);
    }
    const audio=await job;
    const fresh=await ownedStudent(req.session.studentId,mode);
    if(fresh.placementEpoch!==row.epoch) throw new PlacementError(403,"تم تحديث النشاط.");
    res.set({"Content-Type":"audio/mpeg","Cache-Control":"private, no-store"}).send(audio);
  }catch(e){if(e instanceof PlacementError) next(e);else res.status(503).json({error:"تعذر تشغيل الصوت. يمكنك استخدام صوت المتصفح."});}
});
async function ownedAdult(adultId:number|undefined,id:number) {
  if(!adultId || !Number.isSafeInteger(id)) throw new PlacementError(403,"This profile is not in your account.");
  const [s]=await db.select().from(students).where(and(eq(students.id,id),eq(students.adultId,adultId)));
  if(!s) throw new PlacementError(403,"This profile is not in your account.");
  return s;
}
router.get("/adult/students/:id/placement",async(req,res,next)=>{
  try{
    const s=await ownedAdult(req.session.adultId,Number(req.params.id)),active=await lastCompletedPlacement(s);
    const [owner]=isReservedDemoStudent(s)?await db.select().from(adults).where(eq(adults.id,s.adultId)):[];
    res.json(GetStartingPointResponse.parse({result:active?.result??null,pending:!active||active.epoch!==s.placementEpoch,demo:isReservedDemoStudent(s)&&isFictionalDemoOwner(owner)}));
  }catch(e){next(e);}
});
router.post("/adult/students/:id/placement",async(req,res,next)=>{
  try{
    const s=await ownedAdult(req.session.adultId,Number(req.params.id)),body=RedoWarmupBody.parse(req.body);
    if(body.demoReset) {
      const [adult]=await db.select().from(adults).where(eq(adults.id,s.adultId));
      if(!isReservedDemoStudent(s)||!isFictionalDemoOwner(adult))
        throw new PlacementError(403,"Reset is only available for verified fictional demo records.");
    }
    await redo(s.id);res.json({success:true});
  }catch(e){next(e);}
});
router.use((error:unknown,_req:import("express").Request,res:import("express").Response,next:import("express").NextFunction)=>{
  if(error instanceof PlacementError) res.status(error.status).json({error:error.message});
  else next(error);
});
export default router;
