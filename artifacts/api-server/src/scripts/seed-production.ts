import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import { db, pool, adults, students, chats, messages, profileInsights } from "@workspace/db";
import { generateStudentReply, type StudentMode } from "../lib/student-ai";
import { refreshInsights } from "../services/insights";
import { voiceOpenAI } from "../lib/voice-audio";
import { objectStorageClient } from "../lib/objectStorage";
import { demoStudents, topics } from "./demo-content";
import { pathToFileURL } from "node:url";

// DML only. Schema changes are applied by Publish, never by this seed.
// Explicit command, advisory lock, exact ownership checks and per-chat
// transactions make interrupted/repeated runs safe without touching other data.
export async function seedProductionDemo(options: { forceInsights?: boolean; lockHeld?: boolean } = {}) {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 8 || password === "LumiDemo2026!") throw new Error("Set DEMO_PASSWORD to a unique password of at least 8 characters, different from the development password.");
  const client = await pool.connect();
  let locked = false;
  try {
    if (!options.lockHeld) {
      locked = !!(await client.query("SELECT pg_try_advisory_lock(71940, 1) AS locked")).rows[0]?.locked;
      if (!locked) throw new Error("Demo seed already running");
    }
    const owners: Record<string, number> = {};
    for (const role of ["teacher", "parent"] as const) {
      const email = `pitch-${role}@lumi.demo`;
      const name = role === "teacher" ? "Demo Teacher (fictional)" : "Demo Parent (fictional)";
      let [account] = await db.select().from(adults).where(eq(adults.email, email));
      if (account) {
        if (account.role !== role || account.name !== name) throw new Error(`Reserved demo email collision: ${email}; no account changed.`);
        if (!await bcrypt.compare(password, account.passwordHash)) throw new Error("Existing demo password differs from DEMO_PASSWORD. Seed will not overwrite it.");
      } else [account] = await db.insert(adults).values({ email, name, role, passwordHash: await bcrypt.hash(password, 12), school: role === "teacher" ? "Fictional Demo School" : null }).returning();
      owners[role] = account!.id;
    }
    for (const spec of demoStudents) {
      let [student] = await db.select().from(students).where(eq(students.username, spec.username));
      if (student && (student.adultId !== owners[spec.owner] || student.name !== spec.name || student.language !== spec.language || student.conditions[0] !== spec.mode)) throw new Error(`Reserved demo student collision: ${spec.username}; no student changed.`);
      if (!student) [student] = await db.insert(students).values({
        adultId: owners[spec.owner]!, name: spec.name, username: spec.username, pinHash: await bcrypt.hash(spec.pin, 12),
        conditions: [spec.mode], language: spec.language, interests: spec.interests, assessmentConfirmed: true,
      }).returning();
      if (!student) throw new Error("Student insert failed");
      for (const [index, topic] of topics[spec.language].entries()) {
        const title = `${topic.title} · demo ${index + 1}`;
        if ((await db.select({ id: chats.id }).from(chats).where(and(eq(chats.studentId, student.id), eq(chats.title, title)))).length) continue;
        const history: { role: "student" | "ai"; content: string }[] = [];
        for (const question of topic.questions) {
          history.push({ role: "student", content: question });
          history.push({ role: "ai", content: await generateStudentReply(spec.mode as StudentMode, history, spec.interests, undefined, spec.language) });
        }
        await db.transaction(async tx => {
          const [chat] = await tx.insert(chats).values({ studentId: student!.id, title, icon: ["📖", "🚗", "✏️", "⚽"][index] }).returning();
          await tx.insert(messages).values(history.map((m, i) => ({ ...m, chatId: chat!.id, createdAt: new Date(Date.now() - (4 - index) * 86400000 + i * 60000) })));
        });
      }
      if (spec.mode === "dyslexia") {
        const replies = await db.select({ message: messages }).from(messages).innerJoin(chats, eq(chats.id, messages.chatId)).where(and(eq(chats.studentId, student.id), eq(messages.role, "ai")));
        for (const { message } of replies) {
          if (message.audioUrl) continue;
          const root = process.env.PRIVATE_OBJECT_DIR?.replace(/\/$/, "");
          if (!root) throw new Error("Private audio storage missing");
          const path = `${root}/student-audio/${student.id}/${message.id}.mp3`;
          const parts = path.replace(/^\//, "").split("/");
          const file = objectStorageClient.bucket(parts.shift()!).file(parts.join("/"));
          if (!(await file.exists())[0]) {
            const speech = await voiceOpenAI.audio.speech.create({ model: "gpt-4o-mini-tts", voice: "sage", speed: .9, response_format: "mp3", input: message.content, instructions: "Read the supplied text exactly, calmly and clearly, in its original language for a child." });
            await file.save(Buffer.from(await speech.arrayBuffer()), { resumable: false, contentType: "audio/mpeg", metadata: { cacheControl: "private, no-store" } });
          }
          await db.update(messages).set({ audioUrl: path }).where(eq(messages.id, message.id));
        }
      }
      const existingInsights = await db.select().from(profileInsights).where(eq(profileInsights.studentId, student.id));
      if (options.forceInsights || !existingInsights.length || existingInsights.some(i => !i.textAr || !i.textEn || !i.evidenceAr || !i.evidenceEn)) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try { await refreshInsights(student.id); break; }
          catch (e) { if (attempt === 2) throw e; console.info(`Retrying validated insights for ${spec.username}`); }
        }
        if (!(await db.select({ id: profileInsights.id }).from(profileInsights).where(eq(profileInsights.studentId, student.id))).length) throw new Error(`No evidence-backed insights generated for ${spec.username}; rerun to retry.`);
      }
      console.info(`Demo ready: ${spec.username} (${spec.language}, ${spec.mode})`);
    }
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(71940, 1)");
    client.release();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedProductionDemo().catch(e => { console.error(e instanceof Error ? e.message : "Demo seed failed"); process.exitCode = 1; }).finally(() => pool.end());
}
