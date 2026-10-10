import { db, students, chats, messages, profileInsights, type StudentRow, type AdultRow } from "@workspace/db";
import { eq, desc, count, max } from "drizzle-orm";

export const publicAdult = (row: AdultRow) => ({ id: row.id, name: row.name, email: row.email, role: row.role, school: row.school, language: row.language });
export const publicStudent = (row: StudentRow) => ({ id: row.id, name: row.name, username: row.username, conditions: row.conditions, interests: row.interests, language: row.language, assessmentConfirmed: row.assessmentConfirmed });
export async function studentProfile(student: StudentRow) {
  const [insights, history] = await Promise.all([
    db.select({ id: profileInsights.id, source: profileInsights.source, type: profileInsights.type, text: profileInsights.text, evidence: profileInsights.evidence, textAr: profileInsights.textAr, textEn: profileInsights.textEn, evidenceAr: profileInsights.evidenceAr, evidenceEn: profileInsights.evidenceEn, sourceChatId: profileInsights.sourceChatId }).from(profileInsights).where(eq(profileInsights.studentId, student.id)),
    db.select({ id: chats.id, title: chats.title, icon: chats.icon, createdAt: chats.createdAt, messageCount: count(messages.id), lastActive: max(messages.createdAt) }).from(chats).leftJoin(messages, eq(messages.chatId, chats.id)).where(eq(chats.studentId, student.id)).groupBy(chats.id).orderBy(desc(chats.createdAt)),
  ]);
  const activity = history.map(c => c.lastActive && new Date(c.lastActive).getTime()).filter((v): v is number => typeof v === "number");
  return {
    student: publicStudent(student), insights,
    insightsUpdatedAt: student.insightsUpdatedAt?.toISOString() ?? null,
    stats: { sessions: history.length, messages: history.reduce((n, c) => n + c.messageCount, 0), lastActive: activity.length ? new Date(Math.max(...activity)).toISOString() : null },
    chats: history.map(c => ({ id: c.id, title: c.title, icon: c.icon, messageCount: c.messageCount, createdAt: c.createdAt.toISOString() })),
  };
}
export async function currentStudent(id?: number) {
  if (!id) return undefined;
  return (await db.select().from(students).where(eq(students.id, id)))[0];
}
