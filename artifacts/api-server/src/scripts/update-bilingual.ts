import { db, pool, students, adults, chats, messages } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { demoStudents, topics } from "./demo-content";
import { generateStudentReply } from "../lib/student-ai";
import { seedProductionDemo } from "./seed-production";
import { backfillInsightTranslations, copyLegacyInsightLanguage } from "../services/insight-translations";
import bcrypt from "bcrypt";

async function updateBilingual() {
  // This explicit command performs DML only; Publish must add columns first.
  const connection = await pool.connect();
  let locked = false;
  try {
    locked = !!(await connection.query("SELECT pg_try_advisory_lock(71940, 1) AS locked")).rows[0]?.locked;
    if (!locked) throw new Error("Bilingual update already running");
    const password = process.env.DEMO_PASSWORD;
    if (!password || password.length < 8 || password === "LumiDemo2026!") throw new Error("Set the existing production DEMO_PASSWORD before running the update");
    // Validate both reserved owners before any demo transcripts are replaced.
    for (const role of ["teacher", "parent"] as const) {
      const [owner] = await db.select().from(adults).where(eq(adults.email, `pitch-${role}@lumi.demo`));
      if (owner && (owner.role !== role || owner.name !== (role === "teacher" ? "Demo Teacher (fictional)" : "Demo Parent (fictional)") || !await bcrypt.compare(password, owner.passwordHash))) {
        throw new Error("Reserved demo owner/password mismatch; no demo transcripts changed");
      }
    }
    await copyLegacyInsightLanguage();
    const spec = demoStudents.find(s => s.language === "en")!;
    const [child] = await db.select().from(students).where(eq(students.username, spec.username));
    if (child) {
      const [owner] = await db.select().from(adults).where(eq(adults.id, child.adultId));
      if (child.name !== spec.name || child.conditions[0] !== spec.mode || owner?.email !== "pitch-teacher@lumi.demo" || owner.name !== "Demo Teacher (fictional)" || owner.role !== "teacher") throw new Error("Reserved English demo student collision; no chat changed");
      await db.update(students).set({ language: "en" }).where(eq(students.id, child.id));
      const history = await db.select().from(chats).where(eq(chats.studentId, child.id));
      for (const [index, topic] of topics.en.entries()) {
        const suffix = ` · demo ${index + 1}`;
        const target = history.find(c => c.title === topic.title + suffix || c.title === topics.ar[index]!.title + suffix);
        if (!target) continue;
        const oldMessages = await db.select().from(messages).where(eq(messages.chatId, target.id));
        if (!oldMessages.some(m => /\p{Script=Arabic}/u.test(m.content))) continue;
        // ONLY explicitly fictional seeded chats can be replaced. Ordinary transcripts stay original.
        const turns: { role: "student" | "ai"; content: string }[] = [];
        for (const question of topic.questions) {
          turns.push({ role: "student", content: question });
          turns.push({ role: "ai", content: await generateStudentReply("learning", turns, spec.interests, undefined, "en") });
        }
        await db.transaction(async tx => {
          await tx.delete(messages).where(eq(messages.chatId, target.id));
          await tx.insert(messages).values(turns.map(m => ({ ...m, chatId: target.id })));
          await tx.update(chats).set({ title: topic.title + suffix }).where(and(eq(chats.id, target.id), eq(chats.studentId, child.id)));
        });
      }
    }
    // Creates missing fictional accounts safely, or reuses them; regenerates both insight languages.
    await seedProductionDemo({ forceInsights: true, lockHeld: true });
    // All other legacy observations are translated additively, not regenerated or deleted.
    await backfillInsightTranslations();
    const missing = await pool.query(`SELECT COUNT(*)::int AS count FROM profile_insights
      WHERE text_ar IS NULL OR text_en IS NULL OR (evidence IS NOT NULL AND (evidence_ar IS NULL OR evidence_en IS NULL))`);
    if (missing.rows[0]?.count) throw new Error("Some insight translations are incomplete; rerun safely");
    console.info("Bilingual update complete. All insights have both languages; ordinary transcripts were not translated.");
  } finally {
    if (locked) await connection.query("SELECT pg_advisory_unlock(71940, 1)");
    connection.release();
  }
}
updateBilingual().catch(e => { console.error(e instanceof Error ? e.message : "Bilingual update failed"); process.exitCode = 1; }).finally(() => pool.end());
