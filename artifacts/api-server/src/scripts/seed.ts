import bcrypt from "bcrypt";
import { db, pool, adults, students } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

async function seed() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo seeding is development-only.");
  const passwordHash = await bcrypt.hash("LumiDemo2026!", 12);
  for (const account of [
    { name: "Nour Ahmad", email: "teacher@lumi.demo", role: "teacher" as const, school: "Al Noor School" },
    { name: "Sara Khalil", email: "parent@lumi.demo", role: "parent" as const, school: null },
  ]) {
    await db.insert(adults).values({ ...account, passwordHash }).onConflictDoNothing();
  }
  const [teacher] = await db.select().from(adults).where(eq(adults.email, "teacher@lumi.demo"));
  const [parent] = await db.select().from(adults).where(eq(adults.email, "parent@lumi.demo"));
  if (!teacher || !parent) throw new Error("Demo adult accounts are missing.");
  for (const student of [
    { name: "آدم", username: "adam", pin: "1234", mode: "dyslexia", adultId: teacher.id },
    { name: "ليان", username: "layan", pin: "2345", mode: "learning", adultId: teacher.id },
    { name: "عمر", username: "omar", pin: "3456", mode: "autism", adultId: parent.id },
  ]) {
    await db.insert(students).values({ name: student.name, username: student.username, pinHash: await bcrypt.hash(student.pin, 12), conditions: [student.mode], adultId: student.adultId, assessmentConfirmed: true }).onConflictDoNothing();
  }
  logger.info("Demo accounts seeded. See DEMO.md for development-only login details.");
}
seed().catch(err => { logger.error({ err }, "Seed failed"); process.exitCode = 1; }).finally(() => pool.end());
