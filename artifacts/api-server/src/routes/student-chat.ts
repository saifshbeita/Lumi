import { Router, type IRouter } from "express";
import { and, asc, desc, eq,sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { db, pool, chats, messages, students, profileInsights, type StudentRow } from "@workspace/db";
import { rateLimit } from "express-rate-limit";
import {
  CreateStudentChatResponse, ListStudentChatsResponse, ListStudentMessagesParams, ListStudentMessagesResponse,
  SendStudentMessageParams, SendStudentMessageBody, SendStudentMessageResponse,
} from "@workspace/api-zod";
import { currentStudent } from "../lib/profiles";
import { generateStudentReply, generatePersonalizedReply, generateChatLabel, type StudentMode } from "../lib/student-ai";
import { activePlacement,placementChatRequired } from "../placement/store";
import { evaluatePractice } from "../placement/practice";
import type { Result } from "../placement/types";
import { scheduleInsights } from "../services/insights";

const router: IRouter = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "لنأخذ استراحة قصيرة. حاول مرة أخرى بعد قليل." } });
const publicChat = (c: typeof chats.$inferSelect) => ({ id: c.id, title: c.title, icon: c.icon, createdAt: c.createdAt.toISOString() });
const publicMessage = (m: typeof messages.$inferSelect) => { const {practiceKey,...visible}=m;return { ...visible, createdAt: m.createdAt.toISOString() }; };
router.use(async (req, res, next): Promise<void> => {
  const student = await currentStudent(req.session.studentId);
  if (!student) { res.status(403).json({ error: "سجل دخولك أولاً لتتحدث مع لومي." }); return; }
  if(await placementChatRequired(student)){res.status(409).json({error:student.language==="en"?"Let’s finish our warm-up first.":"خلّينا نكمّل التعرّف أولاً.",warmupRequired:true});return;}
  res.locals.student = student;
  next();
});
router.get("/", async (_req, res): Promise<void> => {
  const student = res.locals.student as StudentRow;
  const owned = await db.select().from(chats).where(eq(chats.studentId, student.id)).orderBy(desc(chats.createdAt), desc(chats.id));
  res.json(ListStudentChatsResponse.parse(owned.map(publicChat)));
});
router.post("/", limiter, async (_req, res): Promise<void> => {
  const student = res.locals.student as StudentRow;
  const [chat] = await db.insert(chats).values({ studentId: student.id, title: student.language === "en" ? "New chat" : "محادثة جديدة", icon: null }).returning();
  res.status(201).json(CreateStudentChatResponse.parse(publicChat(chat!)));
});
router.get("/:id/messages", async (req, res): Promise<void> => {
  const params = ListStudentMessagesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "اختر محادثة من قائمتك." }); return; }
  const student = res.locals.student as StudentRow;
  const [chat] = await db.select().from(chats).where(and(eq(chats.id, params.data.id), eq(chats.studentId, student.id)));
  if (!chat) { res.status(403).json({ error: "هذه المحادثة ليست في حسابك." }); return; }
  const history = await db.select().from(messages).where(eq(messages.chatId, chat.id)).orderBy(asc(messages.id));
  res.json(ListStudentMessagesResponse.parse({ chat: publicChat(chat), messages: history.map(publicMessage) }));
});
router.post("/:id/messages", limiter, async (req, res): Promise<void> => {
  const params = SendStudentMessageParams.safeParse(req.params);
  const body = SendStudentMessageBody.safeParse(req.body);
  if (!params.success || !body.success || !body.data.content.trim()) { res.status(400).json({ error: "اكتب سؤالاً قصيراً ثم أرسله." }); return; }
  const student = res.locals.student as StudentRow;
  const chatId = params.data.id;
  const [owned] = await db.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.studentId, student.id)));
  if (!owned) { res.status(403).json({ error: "هذه المحادثة ليست في حسابك." }); return; }

  // A session-level advisory lock serializes exchanges across server instances.
  // Student messages commit before the AI call, so a failed generation can be retried.
  const client = await pool.connect();
  let locked = false;
  let savedId: number | undefined;
  try {
    const lock = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(71934, $1) AS locked", [chatId]);
    locked = lock.rows[0]?.locked === true;
    if (!locked) { res.status(409).json({ error: "لومي يكتب الآن. انتظر قليلاً ثم حاول مرة أخرى." }); return; }
    const lockedDb = drizzle(client);
    const [current] = await lockedDb.select().from(students).where(eq(students.id, student.id));
    const [chat] = await lockedDb.select().from(chats).where(and(eq(chats.id, chatId), eq(chats.studentId, student.id)));
    if (!chat || !current) { res.status(403).json({ error: "هذه المحادثة ليست في حسابك." }); return; }
    const mode = current.conditions[0];
    if (mode !== "dyslexia" && mode !== "learning" && mode !== "autism") { res.status(403).json({ error: "اطلب المساعدة من معلمك أو أحد والديك." }); return; }
    const history = await lockedDb.select().from(messages).where(eq(messages.chatId, chatId)).orderBy(desc(messages.id)).limit(20);
    if(await placementChatRequired(current,lockedDb)){res.status(409).json({error:current.language==="en"?"Let’s finish our warm-up first.":"خلّينا نكمّل التعرّف أولاً.",warmupRequired:true});return;}
    const placement=await activePlacement(current,lockedDb);
    let learnerState:Record<string,unknown>=chat.learnerState.placementId===placement?.id?{...chat.learnerState}:{placementId:placement?.id};
    let content = body.data.content.trim();
    if(body.data.practiceMessageId || body.data.practiceChoiceId){
      const practice=history.find(m=>m.id===body.data.practiceMessageId);
      const latestAi=history.find(m=>m.role==="ai");
      const choices=practice?.presentation?.choices as {id:string;label:string}[]|undefined;
      const choice=choices?.find(c=>c.id===body.data.practiceChoiceId);
      if(!practice||practice.role!=="ai"||latestAi?.id!==practice.id||!choice||practice.practiceKey?.placementId!==placement?.id||!practice.practiceKey?.choiceIds.includes(choice.id)){
        res.status(400).json({error:"اختار من النشاط الحالي."});return;
      }
      content=choice.label;
      if(learnerState.lastAnsweredAiId!==practice.id){
        const skill=practice.presentation?.kind==="numbers"?"numbers":practice.presentation?.kind==="lesson"?"lesson":"reading";
        learnerState=evaluatePractice(learnerState,choice.id===practice.practiceKey.correctId,skill);
        learnerState.respondedToPractice=true;
        learnerState.lastAnsweredAiId=practice.id;
        const kind=practice.presentation?.kind;
        if(kind==="letters")learnerState.pairTurns=Number(learnerState.pairTurns??0)+1;
        if(kind==="sound")learnerState.soundTurns=Number(learnerState.soundTurns??0)+1;
      }
    }
    let studentMessage: typeof messages.$inferSelect | undefined;
    if (body.data.retryMessageId) {
      const [original] = await lockedDb.select().from(messages).where(and(eq(messages.id, body.data.retryMessageId), eq(messages.chatId, chatId)));
      if (!original || original.role !== "student" || original.content !== content) { res.status(400).json({ error: "اختر السؤال المحفوظ لإعادة المحاولة." }); return; }
      // Return the immediately following stored reply if the response was lost.
      const following = await client.query<{ id: number }>("SELECT id FROM messages WHERE chat_id = $1 AND id > $2 ORDER BY id LIMIT 1", [chatId, original.id]);
      if (following.rows[0]) {
        const [reply] = await lockedDb.select().from(messages).where(and(eq(messages.id, following.rows[0].id), eq(messages.chatId, chatId)));
        if (reply?.role === "ai") {
          res.json(SendStudentMessageResponse.parse({ chat: publicChat(chat), studentMessage: publicMessage(original), reply: publicMessage(reply) })); return;
        }
      }
      if (history[0]?.id !== original.id) { res.status(409).json({ error: "هذا السؤال محفوظ بالفعل. افتح المحادثة من جديد." }); return; }
      studentMessage = original;
    } else if (history[0]?.role === "student") {
      if (history[0].content !== content) { res.status(409).json({ error: "أعد محاولة السؤال السابق أولاً.", studentMessageId: history[0].id }); return; }
      studentMessage = history[0];
    } else {
      [studentMessage] = await lockedDb.insert(messages).values({ chatId, role: "student", content }).returning();
    }
    if (!studentMessage) throw new Error("Student message was not saved");
    await lockedDb.update(chats).set({learnerState}).where(eq(chats.id,chatId));
    savedId = studentMessage.id;
    const contextRows = (await lockedDb.select({ role: messages.role, content: messages.content, spokenContent:messages.spokenContent }).from(messages).where(eq(messages.chatId, chatId)).orderBy(desc(messages.id)).limit(20)).map(m=>({role:m.role,content:m.role==="ai"?m.spokenContent??m.content:m.content}));
    const recent=await lockedDb.select().from(profileInsights).where(eq(profileInsights.studentId,student.id)).orderBy(desc(profileInsights.updatedAt),desc(profileInsights.id)).limit(5);
    const personalized=placement?.result?await generatePersonalizedReply(mode as StudentMode,contextRows.reverse(),current.language,placement.result as unknown as Result,recent.map(i=>current.language==="en"?i.textEn??i.text:i.textAr??i.text),learnerState):null;
    const answer = personalized?.content ?? await generateStudentReply(mode as StudentMode, contextRows.reverse(), current.interests, undefined, current.language,recent.map(i=>current.language==="en"?i.textEn??i.text:i.textAr??i.text));
    // Serialize the final check/save with adult mode/redo changes. Saved child text remains outside this transaction.
    const reply=await lockedDb.transaction(async tx=>{
      await tx.execute(sql`SELECT id FROM students WHERE id=${student.id} FOR UPDATE`);
      const [fresh]=await tx.select().from(students).where(eq(students.id,student.id));
      if(!fresh||fresh.conditions[0]!==mode||fresh.placementEpoch!==current.placementEpoch||fresh.language!==current.language||await placementChatRequired(fresh,tx))return null;
      const [saved]=await tx.insert(messages).values({chatId,role:"ai",content:answer,
        spokenContent:personalized?.spokenContent??null,presentation:personalized?.presentation?{...personalized.presentation,placementId:placement?.id}:null,practiceKey:personalized?.practiceKey?{...personalized.practiceKey,placementId:placement?.id}:null}).returning();
      const stepCount=Number(personalized?.presentation?.stepCount??0);
      const stepsSinceCheck=personalized?.presentation?.awaitNext?Number(learnerState.stepsSinceCheck??0)+stepCount:0;
      await tx.update(chats).set({learnerState:{...learnerState,...personalized?.learnerStatePatch,respondedToPractice:false,needsExample:false,activityChanged:false,stepsSinceCheck}}).where(eq(chats.id,chatId));
      return saved!;
    });
    if(!reply){res.status(409).json({error:"تم تحديث مساحة التعلم. افتحها من جديد ثم أعد المحاولة.",warmupRequired:true,studentMessageId:savedId});return;}
    // A descriptive title must never hold back the visible answer or speech.
    let labeledChat = chat;
    if (!chat.icon) {
      const label = { title: current.language === "en" ? "Learning with Lumi" : "نتعلم مع لومي", icon: "💬" };
      [labeledChat] = await lockedDb.update(chats).set(label).where(eq(chats.id, chatId)).returning() as [typeof chats.$inferSelect];
      void generateChatLabel(content, answer, current.language).then(async title => {
        await db.update(chats).set(title).where(and(eq(chats.id, chatId), eq(chats.studentId, student.id)));
      }).catch(() => req.log.warn({ chatId }, "Background chat labeling unavailable"));
    }
    res.json(SendStudentMessageResponse.parse({ chat: publicChat(labeledChat), studentMessage: publicMessage(studentMessage), reply: publicMessage(reply!) }));
    scheduleInsights(student.id, chatId);
  } catch {
    req.log.warn({ chatId, studentMessageId: savedId }, "Student AI exchange unavailable");
    res.status(503).json({ error: "تعذر على لومي الرد الآن. سؤالك محفوظ. حاول مرة أخرى.", studentMessageId: savedId });
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(71934, $1)", [chatId]).catch(() => {});
    client.release();
  }
});
export default router;
