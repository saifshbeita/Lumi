import { db, students, chats, profileInsights, type StudentRow, type AdultRow } from "@workspace/db";
import { eq } from "drizzle-orm";

export const publicAdult = (row: AdultRow) => ({ id: row.id, name: row.name, email: row.email, role: row.role, school: row.school });
export const publicStudent = (row: StudentRow) => ({ id: row.id, name: row.name, username: row.username, conditions: row.conditions, assessmentConfirmed: row.assessmentConfirmed });
export async function studentProfile(student: StudentRow) {
  const [insights, history] = await Promise.all([
    db.select({ id: profileInsights.id, type: profileInsights.type, text: profileInsights.text }).from(profileInsights).where(eq(profileInsights.studentId, student.id)),
    db.select().from(chats).where(eq(chats.studentId, student.id)),
  ]);
  return { student: publicStudent(student), insights, chats: history.map(c => ({ id: c.id, title: c.title, createdAt: c.createdAt.toISOString() })) };
}
export async function currentStudent(id?: number) {
  if (!id) return undefined;
  return (await db.select().from(students).where(eq(students.id, id)))[0];
}
