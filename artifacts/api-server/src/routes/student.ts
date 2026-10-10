import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { rateLimit } from "express-rate-limit";
import { eq } from "drizzle-orm";
import { db, students } from "@workspace/db";
import { LoginStudentBody, LoginStudentResponse, GetStudentSessionResponse, GetStudentModeParams, GetStudentModeResponse } from "@workspace/api-zod";
import { publicStudent, currentStudent, studentProfile } from "../lib/profiles";
import { regenerateSession, saveSession, destroySession } from "../lib/session";

const router: IRouter = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "محاولات كثيرة. حاول مرة أخرى بعد ١٥ دقيقة." } });
router.get("/session", async (req, res): Promise<void> => {
  const student = await currentStudent(req.session.studentId);
  res.json(GetStudentSessionResponse.parse({ student: student ? publicStudent(student) : null }));
});
router.post("/login", limiter, async (req, res): Promise<void> => {
  const parsed = LoginStudentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "اكتب اسم المستخدم والرمز المكون من أربعة أرقام." }); return; }
  const [student] = await db.select().from(students).where(eq(students.username, parsed.data.username.trim().toLowerCase()));
  if (!student || !(await bcrypt.compare(parsed.data.pin, student.pinHash))) { res.status(401).json({ error: "لنجرب مرة أخرى. تحقق من اسم المستخدم والرمز." }); return; }
  await regenerateSession(req); req.session.studentId = student.id; await saveSession(req);
  res.json(LoginStudentResponse.parse(publicStudent(student)));
});
router.post("/logout", async (req, res): Promise<void> => {
  await destroySession(req); res.clearCookie("lumi.student", { path: "/api" }); res.json({ success: true });
});
router.get("/modes/:mode", async (req, res): Promise<void> => {
  const parsed = GetStudentModeParams.safeParse(req.params);
  if (!parsed.success) { res.status(404).json({ error: "هذه الصفحة غير موجودة." }); return; }
  const student = await currentStudent(req.session.studentId);
  if (!student) { res.status(401).json({ error: "سجل دخولك أولاً." }); return; }
  if (student.conditions[0] !== parsed.data.mode) { res.status(403).json({ error: "هذه الصفحة ليست مخصصة لحسابك.", mode: student.conditions[0] }); return; }
  res.json(GetStudentModeResponse.parse(await studentProfile(student)));
});
export default router;
