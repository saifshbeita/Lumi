import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { rateLimit } from "express-rate-limit";
import { eq } from "drizzle-orm";
import { db, students } from "@workspace/db";
import { LoginStudentBody, LoginStudentResponse, GetStudentSessionResponse, GetStudentModeParams, GetStudentModeResponse } from "@workspace/api-zod";
import { publicStudent, currentStudent, studentProfile } from "../lib/profiles";
import { regenerateSession, saveSession, destroySession } from "../lib/session";
import { checkLogin } from "../lib/login-lock";
import { activePlacement } from "../placement/store";

const router: IRouter = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: "draft-8", legacyHeaders: false, skipSuccessfulRequests: true, message: (req: import("express").Request) => ({ error: req.body?.language === "en" ? "Too many tries from this connection. Please take a break and try again in 15 minutes." : "محاولات كثيرة من هذا الاتصال. خذ استراحة وحاول بعد ١٥ دقيقة." }) });
router.get("/session", async (req, res): Promise<void> => {
  const student = await currentStudent(req.session.studentId);
  res.json(GetStudentSessionResponse.parse({ student: student ? publicStudent(student) : null }));
});
router.post("/login", limiter, async (req, res): Promise<void> => {
  const parsed = LoginStudentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "اكتب اسم المستخدم والرمز المكون من أربعة أرقام." }); return; }
  const [student] = await db.select().from(students).where(eq(students.username, parsed.data.username.trim().toLowerCase()));
  const language = parsed.data.language ?? student?.language ?? "ar";
  const result = await checkLogin(`student:${parsed.data.username.trim().toLowerCase()}`, 5, async () => !!student && await bcrypt.compare(parsed.data.pin, student.pinHash));
  if (result !== "ok" || !student) {
    res.status(result === "locked" ? 429 : 401).json({ error: result === "locked"
      ? language === "en" ? "Let's take a short break. Try this username again in 15 minutes, or ask your teacher or parent for help." : "لنأخذ استراحة قصيرة. حاول بهذا الاسم بعد ١٥ دقيقة، أو اطلب مساعدة معلمك أو أحد والديك."
      : language === "en" ? "Let's try again. Check your username and PIN." : "لنجرب مرة أخرى. تحقق من اسم المستخدم والرمز." }); return;
  }
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
   const placement=await activePlacement(student);
   res.json(GetStudentModeResponse.parse({ ...await studentProfile(student), insights: [], tutorPreferences:placement?{...(placement.result?.preferences as object??{}),placementId:placement.id}:{} }));
});
export default router;
