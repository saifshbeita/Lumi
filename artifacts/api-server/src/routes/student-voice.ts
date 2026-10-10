import { Router, type IRouter, type RequestHandler, type Request, type Response } from "express";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { toFile } from "openai";
import { and, eq } from "drizzle-orm";
import { db, pool, messages, chats, students } from "@workspace/db";
import { currentStudent } from "../lib/profiles";
import { objectStorageClient } from "../lib/objectStorage";
import { InvalidAudio, validatedWav, voiceOpenAI } from "../lib/voice-audio";

const router: IRouter = Router();
const authorize: RequestHandler = async (req, res, next) => {
  const student = await currentStudent(req.session.studentId);
  if (!student || student.conditions[0] !== "dyslexia") { res.status(403).json({ error: "الصوت غير متاح لهذا الحساب." }); return; }
  res.locals.voiceStudentId = student.id;
  next();
};
const limit = rateLimit({ windowMs: 60000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "انتظر قليلاً ثم حاول مرة أخرى." } });
// Explicit adult-demo scope only; student recording and playback guards are unchanged.
const authorizeTranscription: RequestHandler = (req, res, next) => {
  if (req.get("X-Lumi-Demo") === "1" && req.session.adultId) {
    res.locals.adultDemo = true;
    next();
    return;
  }
  return authorize(req, res, next);
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 2 },
  fileFilter: (_req, file, done) => {
    if (!["audio/webm", "audio/mp4"].includes(file.mimetype.split(";")[0]!)) return done(new InvalidAudio("استخدم تسجيلاً صوتياً بصيغة WebM أو MP4."));
    done(null, true);
  },
}).single("audio");
router.post("/voice/transcribe", authorizeTranscription, limit, (req, res) => {
  upload(req, res, async error => {
    if (error) {
      res.status(error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error instanceof InvalidAudio ? error.message : "التسجيل كبير أو غير صالح. الحد الأقصى ٥ ميغابايت." }); return;
    }
    if (!req.file) { res.status(400).json({ error: "لم يصل التسجيل. حاول مرة أخرى." }); return; }
    try {
      const audio = await validatedWav(req.file.buffer, req.file.mimetype.split(";")[0]!);
      const result = await voiceOpenAI.audio.transcriptions.create({
        model: "gpt-4o-mini-transcribe", language: res.locals.adultDemo ? "ar" : (await currentStudent(req.session.studentId))?.language ?? "ar", response_format: "json",
        file: await toFile(audio, "question.wav", { type: "audio/wav" }),
      });
      if (!res.locals.adultDemo) {
        const fresh = await currentStudent(req.session.studentId);
        if (fresh?.conditions[0] !== "dyslexia") { res.status(403).json({ error: "تم تحديث حسابك. افتح مساحة التعلم من جديد." }); return; }
      }
      const text = result.text.trim();
      if (!text || text.length > 2000) { res.status(422).json({ error: "لم أسمع سؤالاً واضحاً. حاول مرة أخرى أو اكتب سؤالك." }); return; }
      res.json({ text });
    } catch (e) {
      req.log.warn({ kind: e instanceof Error ? e.name : "unknown" }, "Voice transcription failed");
      res.status(e instanceof InvalidAudio ? 400 : 503).json({ error: e instanceof InvalidAudio ? e.message : "تعذر سماع التسجيل الآن. حاول مرة أخرى أو اكتب سؤالك." });
    } finally { if (req.file) req.file.buffer.fill(0); }
  });
});
router.get("/messages/:id/audio", authorize, limit, async (req, res): Promise<void> => {
  await serveMessageAudio(req, res, Number(req.params.id), res.locals.voiceStudentId as number, async () => {
    const fresh = await currentStudent(req.session.studentId);
    return fresh?.conditions[0] === "dyslexia";
  });
});

// Both audiences use exactly the same generation lock, private object and cache.
export async function serveMessageAudio(req: Request, res: Response, id: number, studentId: number, verifyAccess: () => Promise<boolean>): Promise<void> {
  if (!Number.isSafeInteger(id) || id <= 0) { res.status(403).json({ error: "هذا الصوت ليس في حسابك." }); return; }
  const owned = async () => {
    const [row] = await db.select({ message: messages }).from(messages)
      .innerJoin(chats, eq(chats.id, messages.chatId)).innerJoin(students, eq(students.id, chats.studentId))
      .where(and(eq(messages.id, id), eq(chats.studentId, studentId), eq(messages.role, "ai")));
    return row?.message;
  };
  if (!await owned()) { res.status(403).json({ error: "هذا الصوت ليس في حسابك." }); return; }
  const client = await pool.connect();
  let locked = false;
  let brokenConnection = false;
  try {
    const lock = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(71935, $1) AS locked", [id]);
    locked = !!lock.rows[0]?.locked;
    if (!locked) { res.status(409).json({ error: "لومي يجهز الصوت. اضغط الاستماع بعد قليل." }); return; }
    const message = await owned();
    if (!message) { res.status(403).json({ error: "هذا الصوت ليس في حسابك." }); return; }
    const root = process.env.PRIVATE_OBJECT_DIR?.replace(/\/$/, "");
    if (!root) throw new Error("Private storage unavailable");
    const expectedPath = `${root}/student-audio/${studentId}/${id}.mp3`;
    if (message.audioUrl && message.audioUrl !== expectedPath) throw new Error("Unexpected private audio path");
    const parts = expectedPath.replace(/^\//, "").split("/");
    const file = objectStorageClient.bucket(parts.shift()!).file(parts.join("/"));
    const [exists] = await file.exists();
    // A missing already-cached object is an error, never a reason to regenerate.
    if (message.audioUrl && !exists) throw new Error("Cached audio missing");
    let cache = "hit";
    if (!exists) {
      cache = "miss";
      req.log.info({ messageId: id }, "voice_tts_generate");
      const speech = await voiceOpenAI.audio.speech.create({
        model: "gpt-4o-mini-tts", voice: "sage", speed: 0.9, response_format: "mp3",
        input: message.content,
        instructions: "Read the supplied text exactly, in its own language (Arabic or English). Use a warm, calm, clear voice for a child. Do not add or change words.",
      });
      if (!await verifyAccess()) { res.status(403).json({ error: "Audio access changed." }); return; }
      if (!speech.body) throw new Error("Empty speech stream");
      res.set({ "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store", "X-Lumi-Audio-Cache": cache, "X-Accel-Buffering": "no" });
      res.flushHeaders();
      const chunks: Buffer[] = [];
      // Chrome progressively decodes MP3. Keep generating/cache even if the
      // listener pauses or disconnects, so replay never duplicates generation.
      for await (const chunk of speech.body) {
        const bytes = Buffer.from(chunk);
        chunks.push(bytes);
        if (!res.destroyed) res.write(bytes);
      }
      const audio = Buffer.concat(chunks);
      if (!audio.length) throw new Error("Empty speech");
      await file.save(audio, { resumable: false, contentType: "audio/mpeg", metadata: { cacheControl: "private, no-store" } });
      await db.update(messages).set({ audioUrl: expectedPath }).where(and(eq(messages.id, id), eq(messages.chatId, message.chatId)));
      if (!res.destroyed) res.end();
      return;
    }
    if (!message.audioUrl) await db.update(messages).set({ audioUrl: expectedPath }).where(and(eq(messages.id, id), eq(messages.chatId, message.chatId)));
    if (!await verifyAccess()) { res.status(403).json({ error: "الصوت غير متاح لهذا الحساب." }); return; }
    const [audio] = await file.download();
    res.set({ "Content-Type": "audio/mpeg", "Content-Length": String(audio.length), "Cache-Control": "private, no-store", "X-Lumi-Audio-Cache": cache });
    res.send(audio);
  } catch (e) {
    req.log.warn({ messageId: id, kind: e instanceof Error ? e.name : "unknown" }, "Voice playback unavailable");
    if (res.headersSent) res.destroy();
    else res.status(503).json({ error: "تعذر تشغيل الصوت. يمكنك قراءة الرد أو الضغط للاستماع مرة أخرى." });
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(71935, $1)", [id]).catch(() => { brokenConnection = true; });
    client.release(brokenConnection);
  }
}
export default router;
