import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { and, eq, asc, sql } from "drizzle-orm";
import { db, adults, students, chats, messages } from "@workspace/db";
import { GetAdultChatParams, GetAdultChatResponse } from "@workspace/api-zod";
import { CreateStudentBody, CreateStudentResponse, ListStudentsResponse, GetStudentParams, GetStudentResponse, UpdateStudentParams, UpdateStudentBody, UpdateStudentResponse } from "@workspace/api-zod";
import { publicStudent, studentProfile } from "../lib/profiles";

const router: IRouter = Router();
router.use(async (req, res, next): Promise<void> => {
  if (!req.session.adultId) { res.status(401).json({ error: "Please log in to your adult account." }); return; }
  next();
});
router.get("/", async (req, res): Promise<void> => {
  res.json(ListStudentsResponse.parse((await db.select().from(students).where(eq(students.adultId, req.session.adultId!))).map(publicStudent)));
});
router.post("/", async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.name.trim()) { res.status(400).json({ error: "Please check the name, username, 4-digit PIN and learning mode." }); return; }
  const [adult] = await db.select().from(adults).where(eq(adults.id, req.session.adultId!));
  if (!adult) { res.status(401).json({ error: "Please log in again." }); return; }
  if (adult.role === "parent" && parsed.data.assessmentConfirmed !== true) { res.status(400).json({ error: "Please confirm your child has an assessment from a specialist." }); return; }
  const data = parsed.data;
  const pinHash=await bcrypt.hash(data.pin,12);
  // Epoch 1 marks new enrollments as required, without starting their timer before first login.
  const [student]=await db.insert(students).values({ adultId: adult.id, name: data.name.trim(), username: data.username.toLowerCase(), pinHash, conditions: [data.mode], placementEpoch:1,language: data.language ?? "ar", interests: [...new Set((data.interests ?? []).map(s => s.trim()))], assessmentConfirmed: data.assessmentConfirmed ?? false }).onConflictDoNothing().returning();
  if (!student) { res.status(409).json({ error: "That username is already taken. Please choose another." }); return; }
  res.status(201).json(CreateStudentResponse.parse(publicStudent(student)));
});
router.get("/:id", async (req, res): Promise<void> => {
  const parsed = GetStudentParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid student." }); return; }
  const [student] = await db.select().from(students).where(and(eq(students.id, parsed.data.id), eq(students.adultId, req.session.adultId!)));
  if (!student) { res.status(403).json({ error: "This profile is not in your account." }); return; }
  res.json(GetStudentResponse.parse(await studentProfile(student)));
});
router.get("/:id/chats/:chatId", async (req, res): Promise<void> => {
  const parsed = GetAdultChatParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid chat." }); return; }
  const { id, chatId } = parsed.data;
  const [owned] = await db.select({ chat: chats }).from(chats).innerJoin(students, eq(students.id, chats.studentId))
    .where(and(eq(chats.id, chatId), eq(students.id, id), eq(students.adultId, req.session.adultId!)));
  if (!owned) { res.status(403).json({ error: "This chat is not in your account." }); return; }
  const history = await db.select().from(messages).where(eq(messages.chatId, chatId)).orderBy(asc(messages.id));
  res.json(GetAdultChatResponse.parse({
    chat: { ...owned.chat, createdAt: owned.chat.createdAt.toISOString() },
    messages: history.map(m => ({ ...m, audioUrl: null, createdAt: m.createdAt.toISOString() })),
  }));
});
router.patch("/:id", async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  const body = UpdateStudentBody.safeParse(req.body);
  if (!params.success || !body.success || (body.data.mode === undefined && body.data.interests === undefined && body.data.language === undefined)) { res.status(400).json({ error: "Please select a valid mode, language, or up to five interests." }); return; }
  const [student] = await db.update(students).set({
    ...(body.data.mode ? { conditions: [body.data.mode] } : {}),
    ...(body.data.mode ? { placementEpoch: sql`CASE WHEN ${students.conditions}[1] <> ${body.data.mode} THEN ${students.placementEpoch} + 1 ELSE ${students.placementEpoch} END` } : {}),
    ...(body.data.language ? { language: body.data.language } : {}),
    ...(body.data.interests !== undefined ? { interests: [...new Set(body.data.interests.map(s => s.trim()))] } : {}),
  }).where(and(eq(students.id, params.data.id), eq(students.adultId, req.session.adultId!))).returning();
  if (!student) { res.status(404).json({ error: "Profile not found." }); return; }
  res.json(UpdateStudentResponse.parse(publicStudent(student)));
});
export default router;
