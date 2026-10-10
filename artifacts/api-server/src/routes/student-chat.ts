import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { db, pool, chats, messages, students, type StudentRow } from "@workspace/db";
import { rateLimit } from "express-rate-limit";
import {
  CreateStudentChatResponse, ListStudentChatsResponse, ListStudentMessagesParams, ListStudentMessagesResponse,
  SendStudentMessageParams, SendStudentMessageBody, SendStudentMessageResponse,
} from "@workspace/api-zod";
import { currentStudent } from "../lib/profiles";
import { generateStudentReply, generateChatLabel, type StudentMode } from "../lib/student-ai";
import { scheduleInsights } from "../services/insights";

const router: IRouter = Router();
const limiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "لنأخذ استراحة قصيرة. حاول مرة أخرى بعد قليل." } });
const publicChat = (c: typeof chats.$inferSelect) => ({ id: c.id, title: c.title, icon: c.icon, createdAt: c.createdAt.toISOString() });
const publicMessage = (m: typeof messages.$inferSelect) => ({ ...m, createdAt: m.createdAt.toISOString() });
router.use(async (req, res, next): Promise<void> => {
  const student = await currentStudent(req.session.studentId);
  if (!student) { res.status(403).json({ error: "سجل دخولك أولاً لتتحدث مع لومي." }); return; }
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
  const [chat] = await db.insert(chats).values({ studentId: student.id, title: "محادثة جديدة", icon: null }).returning();
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
    let studentMessage: typeof messages.$inferSelect | undefined;
    const content = body.data.content.trim();
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
    savedId = studentMessage.id;
    const contextRows = await lockedDb.select({ role: messages.role, content: messages.content }).from(messages).where(eq(messages.chatId, chatId)).orderBy(desc(messages.id)).limit(20);
    const answer = await generateStudentReply(mode as StudentMode, contextRows.reverse(), current.interests);
    // A mode reassignment during generation must not return the old mode's reply.
    const [fresh] = await lockedDb.select().from(students).where(eq(students.id, student.id));
    if (!fresh || fresh.conditions[0] !== mode) { res.status(409).json({ error: "تم تحديث مساحة التعلم. افتحها من جديد ثم أعد المحاولة.", studentMessageId: savedId }); return; }
    const [reply] = await lockedDb.insert(messages).values({ chatId, role: "ai", content: answer }).returning();
    let labeledChat = chat;
    if (!chat.icon) {
      let label = { title: "نتعلم مع لومي", icon: "💬" };
      try { label = await generateChatLabel(content, answer); }
      catch { req.log.warn({ chatId }, "Chat labeling unavailable; used safe Arabic label"); }
      [labeledChat] = await lockedDb.update(chats).set(label).where(and(eq(chats.id, chatId), eq(chats.studentId, student.id))).returning() as [typeof chats.$inferSelect];
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
