import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, students } from "@workspace/db";
import { RefreshStudentInsightsParams, RefreshStudentInsightsResponse, GetAdultMessageAudioParams } from "@workspace/api-zod";
import { rateLimit } from "express-rate-limit";
import { refreshInsights } from "../services/insights";
import { studentProfile } from "../lib/profiles";
import { serveMessageAudio } from "./student-voice";

const router: IRouter = Router();
router.use((req, res, next) => {
  if (!req.session.adultId) { res.status(403).json({ error: "Please log in to your adult account." }); return; }
  next();
});
const limit = rateLimit({ windowMs: 60000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });
const owned = async (id: number, adultId: number) => (await db.select().from(students).where(and(eq(students.id, id), eq(students.adultId, adultId))))[0];

router.post("/:id/insights/refresh", limit, async (req, res): Promise<void> => {
  const parsed = RefreshStudentInsightsParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "Invalid student." }); return; }
  const student = await owned(parsed.data.id, req.session.adultId!);
  if (!student) { res.status(403).json({ error: "This student is not in your account." }); return; }
  try {
    await refreshInsights(student.id);
    const fresh = await owned(student.id, req.session.adultId!);
    if (!fresh) { res.status(403).json({ error: "This student is not in your account." }); return; }
    res.json(RefreshStudentInsightsResponse.parse(await studentProfile(fresh)));
  } catch {
    res.status(503).json({ error: "Insights could not be refreshed. Previous insights are unchanged. Please try again." });
  }
});
router.get("/:id/messages/:messageId/audio", limit, async (req, res): Promise<void> => {
  const parsed = GetAdultMessageAudioParams.safeParse(req.params);
  if (!parsed.success) { res.status(403).json({ error: "This audio is not in your account." }); return; }
  const { id, messageId } = parsed.data;
  const verify = async () => (await owned(id, req.session.adultId!))?.conditions[0] === "dyslexia";
  if (!await verify()) { res.status(403).json({ error: "This audio is not in your account." }); return; }
  await serveMessageAudio(req, res, messageId, id, verify);
});
export default router;
