import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { CompareDemoModesBody, SpeakDemoReplyBody } from "@workspace/api-zod";
import { generateStudentReply, type StudentMode } from "../lib/student-ai";
import { voiceOpenAI } from "../lib/voice-audio";

const router: IRouter = Router();
router.use((req, res, next) => {
  if (!req.session.adultId) { res.status(403).json({ error: "Please log in to your adult account." }); return; }
  next();
});
const limit = rateLimit({ windowMs: 60000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });
router.post("/compare", limit, async (req, res): Promise<void> => {
  const parsed = CompareDemoModesBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.question.trim()) { res.status(400).json({ error: "Enter a question and at most five interests." }); return; }
  res.status(200).set({
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  const controller = new AbortController();
  const stop = () => controller.abort();
  res.on("close", stop);
  const interests = [...new Set((parsed.data.interests ?? []).map(s => s.trim()))];
  // No student/chat/insight/storage writes. Each mode can finish or fail independently.
  await Promise.all((["dyslexia", "learning", "autism"] as StudentMode[]).map(async mode => {
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(9000)]);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        generateStudentReply(mode, [{ role: "student", content: parsed.data.question.trim() }], interests, signal),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("Demo deadline")), 9200); }),
      ]);
      if (!res.destroyed) res.write(JSON.stringify({ mode, status: "success", content: result }) + "\n");
    } catch {
      req.log.warn({ mode }, "Demo mode unavailable");
      if (!res.destroyed) res.write(JSON.stringify({ mode, status: "error", error: "This mode could not answer in time. Please try again." }) + "\n");
    } finally { if (timeout) clearTimeout(timeout); }
  }));
  res.off("close", stop);
  if (!res.destroyed) res.end();
});

router.post("/audio", limit, async (req, res): Promise<void> => {
  const parsed = SpeakDemoReplyBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.text.trim()) { res.status(400).json({ error: "A short reply is required." }); return; }
  const controller = new AbortController();
  const stop = () => controller.abort();
  res.on("close", stop);
  try {
    const speech = await voiceOpenAI.audio.speech.create({
      model: "gpt-4o-mini-tts", voice: "sage", speed: 0.9, response_format: "mp3",
      input: parsed.data.text,
      instructions: "Read the supplied Arabic text exactly. Use a warm, calm, clear voice for a child, with gentle pauses. Do not add or change any words.",
    }, { signal: controller.signal });
    const audio = Buffer.from(await speech.arrayBuffer());
    if (!res.destroyed) res.set({ "Content-Type": "audio/mpeg", "Content-Length": String(audio.length), "Cache-Control": "no-store" }).send(audio);
  } catch {
    if (!res.destroyed) res.status(503).json({ error: "Audio could not play. The written reply is still available." });
  } finally { res.off("close", stop); }
});
export default router;
