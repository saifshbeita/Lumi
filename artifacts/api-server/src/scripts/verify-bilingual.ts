import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { db, pool, adults, students, chats, messages, profileInsights } from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { generateStudentReply, generateChatLabel, replyMatchesLanguage, type StudentMode } from "../lib/student-ai";
import { objectStorageClient } from "../lib/objectStorage";

const qaEmail = "bilingual-qa@lumi.test";
async function setup() {
  if ((await db.select().from(adults).where(eq(adults.email, qaEmail))).length) throw new Error("QA fixtures already exist; refusing to overwrite");
  await db.transaction(async tx => {
    const [adult] = await tx.insert(adults).values({
      email: qaEmail, name: "Fictional Bilingual QA Teacher", role: "teacher", school: "Fictional QA School",
      passwordHash: await bcrypt.hash("BilingualQA2026!", 12),
    }).returning();
    const source = (await tx.select().from(students).where(eq(students.username, "pitch-noor")))[0]!;
    for (const lang of ["ar", "en"] as const) for (const mode of ["dyslexia", "learning", "autism"] as const) {
      const [child] = await tx.insert(students).values({
        adultId: adult!.id, name: lang === "ar" ? "متعلم تجريبي" : "Fictional English Learner",
        username: `bilingual-qa-${lang}-${mode}`, pinHash: await bcrypt.hash("2468", 12),
        conditions: [mode], language: lang, interests: ["cats", "drawing"], assessmentConfirmed: true,
      }).returning();
      // Copy only the existing fictional AR dyslexia fixture for profile/transcript screenshots.
      // It remains evidence-backed and does not copy private audio paths across children.
      if (lang === "ar" && mode === "dyslexia") {
        const map = new Map<number, number>();
        for (const old of await tx.select().from(chats).where(eq(chats.studentId, source.id))) {
          const [copy] = await tx.insert(chats).values({ studentId: child!.id, title: old.title, icon: old.icon }).returning();
          map.set(old.id, copy!.id);
          const turns = await tx.select().from(messages).where(eq(messages.chatId, old.id));
          if (turns.length) await tx.insert(messages).values(turns.map(m => ({ chatId: copy!.id, role: m.role, content: m.content, createdAt: m.createdAt })));
        }
        for (const old of await tx.select().from(profileInsights).where(eq(profileInsights.studentId, source.id))) {
          const { id: _id, studentId: _sid, sourceChatId, ...copy } = old;
          await tx.insert(profileInsights).values({ ...copy, studentId: child!.id, sourceChatId: sourceChatId ? map.get(sourceChatId) : null });
        }
      }
      console.info(`QA child ${child!.id}: ${child!.username}`);
    }
  });
}
async function cleanup() {
  const [adult] = await db.select().from(adults).where(eq(adults.email, qaEmail));
  if (!adult || adult.name !== "Fictional Bilingual QA Teacher") throw new Error("QA ownership mismatch");
  const owned = await db.select().from(students).where(eq(students.adultId, adult.id));
  if (owned.some(s => !s.username.startsWith("bilingual-qa-"))) throw new Error("Refusing cleanup of unrelated students");
  for (const child of owned) {
    const cached = await db.select({ message: messages }).from(messages).innerJoin(chats, eq(chats.id, messages.chatId)).where(eq(chats.studentId, child.id));
    for (const { message } of cached) {
      if (!message.audioUrl) continue;
      const root = process.env.PRIVATE_OBJECT_DIR?.replace(/\/$/, "");
      if (!root || message.audioUrl !== `${root}/student-audio/${child.id}/${message.id}.mp3`) throw new Error("Refusing cleanup of unrelated audio");
      const parts = message.audioUrl.replace(/^\//, "").split("/");
      await objectStorageClient.bucket(parts.shift()!).file(parts.join("/")).delete({ ignoreNotFound: true });
    }
  }
  await db.transaction(async tx => {
    for (const child of owned) {
      const history = await tx.select({ id: chats.id }).from(chats).where(eq(chats.studentId, child.id));
      await tx.delete(profileInsights).where(eq(profileInsights.studentId, child.id));
      if (history.length) await tx.delete(messages).where(inArray(messages.chatId, history.map(c => c.id)));
      await tx.delete(chats).where(eq(chats.studentId, child.id));
      await tx.delete(students).where(eq(students.id, child.id));
    }
    await tx.delete(adults).where(eq(adults.id, adult.id));
  });
}
async function checks() {
  assert(replyMatchesLanguage("Let's practise b and d.", "en"));
  assert(!replyMatchesLanguage("Let's practise ب.", "en"));
  assert(replyMatchesLanguage('{"steps":["لنبدأ بخطوة صغيرة.","ثم نتدرب."]}', "ar"));
  assert(!replyMatchesLanguage('{"steps":["Hello.","Try again."]}', "ar"));
  const original = openai.chat.completions.create;
  try {
    for (const lang of ["ar", "en"] as const) for (const mode of ["dyslexia", "learning", "autism"] as StudentMode[]) {
      const opposite = lang === "en" ? "ar" : "en";
      const payload = (l: "ar" | "en") => mode === "dyslexia" ? (l === "en" ? "Good effort. Let's practise b and d." : "حاولت جيداً. لنتدرب على الحروف.")
        : mode === "learning" ? JSON.stringify({ steps: l === "en" ? ["Count one.", "Count two."] : ["نعد واحداً.", "نعد اثنين."] })
        : JSON.stringify({ learn: l === "en" ? "We learn one thing." : "نتعلم شيئاً واحداً.", practice: l === "en" ? "What is your question?" : "ما سؤالك؟" });
      let calls = 0;
      // Test doubles ONLY for proving the wrong-language retry branch, not chat/voice demonstrations.
      openai.chat.completions.create = (async (args: any) => {
        calls++;
        const system = args.messages[0].content as string;
        if (mode === "dyslexia" && lang === "en") assert(system.includes("b/d and p/q"));
        return { choices: [{ message: { content: payload(calls === 1 ? opposite : lang) } }] };
      }) as typeof original;
      const result = await generateStudentReply(mode, [{ role: "student", content: "Count with me" }], [], undefined, lang);
      assert.equal(calls, 2, `${lang}/${mode}: exactly one regeneration`);
      assert(replyMatchesLanguage(result, lang));
    }
    let structuredCalls = 0;
    openai.chat.completions.create = (async () => {
      structuredCalls++;
      return { choices: [{ message: { content: JSON.stringify(structuredCalls === 1
        ? { learn: "نعد الأشياء.", practice: "كم شيء لدينا؟", interest_source: "قطط", interest_mention: "قطط" }
        : { learn: "٢ + ٣ = ٥. نعد خمس قطط.", practice: "كم قطة لدينا؟", interest_source: "cats", interest_mention: "قطط" }) } }] };
    }) as unknown as typeof original;
    const structured = await generateStudentReply("autism", [{ role: "student", content: "كم يساوي ٢ + ٣؟" }], ["cats"], undefined, "ar");
    assert.equal(structuredCalls, 2, "Invalid bilingual interest metadata gets exactly one regeneration");
    assert(structured.includes("٢ + ٣ = ٥") && structured.includes("قطط"));
    let calls = 0;
    openai.chat.completions.create = (async () => ({ choices: [{ message: { content: JSON.stringify({ title: ++calls === 1 ? "نتعلم الحساب" : "Counting together", icon: "📖" }) } }] })) as unknown as typeof original;
    assert.equal((await generateChatLabel("Count", "Let's count", "en")).title, "Counting together");
    assert.equal(calls, 2);
  } finally { openai.chat.completions.create = original; }
  const demoIds = (await db.select({ id: students.id }).from(students).where(inArray(students.username, ["pitch-noor", "pitch-alex", "pitch-sami", "pitch-reem"]))).map(s => s.id);
  const insights = await db.select().from(profileInsights).where(inArray(profileInsights.studentId, demoIds));
  assert(insights.length > 0);
  for (const item of insights) {
    assert(item.textAr && item.textEn && item.evidenceAr && item.evidenceEn);
    const arQuotes = [...item.evidenceAr.matchAll(/"([^"]+)"/g)].map(m => m[1]);
    const enQuotes = [...item.evidenceEn.matchAll(/"([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(arQuotes, enQuotes);
    const turns = await db.select().from(messages).where(and(eq(messages.chatId, item.sourceChatId!), eq(messages.role, "student")));
    assert(arQuotes.length && arQuotes.every(q => turns.some(m => m.content.includes(q!))));
  }
  console.info(`Bilingual checks passed: 6 mode/language regeneration branches, title regeneration, ${insights.length} bilingual demo insights with exact verified quotes.`);
}
const verification = process.env.NODE_ENV === "production"
  ? Promise.reject(new Error("Bilingual QA verification is development-only"))
  : process.argv.includes("--setup") ? setup() : process.argv.includes("--cleanup") ? cleanup() : checks();
verification
  .catch(e => { console.error(e instanceof Error ? e.message : "Verification failed"); process.exitCode = 1; }).finally(() => pool.end());
