import { pgTable, serial, text, integer, boolean, timestamp, json, varchar, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

export const adults = pgTable("adults", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["teacher", "parent"] }).notNull(),
  school: text("school"),
  language: text("language", { enum: ["ar", "en"] }).notNull().default("ar"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, () => [check("adult_role", sql`role IN ('teacher', 'parent')`)]);
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  adultId: integer("adult_id").references(() => adults.id).notNull(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  conditions: text("conditions").array().notNull(),
  interests: text("interests").array().notNull().default(sql`ARRAY[]::text[]`),
  language: text("language", { enum: ["ar", "en"] }).notNull().default("ar"),
  assessmentConfirmed: boolean("assessment_confirmed").notNull().default(false),
  insightsUpdatedAt: timestamp("insights_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, () => [check("single_valid_mode", sql`cardinality(conditions) = 1 AND conditions <@ ARRAY['dyslexia','learning','autism']::text[]`)]);
export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  title: text("title").notNull(),
  icon: text("icon"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").references(() => chats.id).notNull(),
  role: text("role", { enum: ["student", "ai"] }).notNull(),
  content: text("content").notNull(),
  audioUrl: text("audio_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, () => [check("message_role", sql`role IN ('student', 'ai')`)]);
export const profileInsights = pgTable("profile_insights", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  type: text("type", { enum: ["strength", "weakness", "need"] }).notNull(),
  text: text("text").notNull(),
  evidence: text("evidence"),
  textAr: text("text_ar"),
  textEn: text("text_en"),
  evidenceAr: text("evidence_ar"),
  evidenceEn: text("evidence_en"),
  sourceChatId: integer("source_chat_id").references(() => chats.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, () => [check("insight_type", sql`type IN ('strength','weakness','need')`)]);
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, table => [index("sessions_expire_idx").on(table.expire)]);
export const loginAttempts = pgTable("login_attempts", {
  key: text("key").primaryKey(),
  failures: integer("failures").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
});
export const insertAdultSchema = createInsertSchema(adults).omit({ id: true, createdAt: true });
export const insertStudentSchema = createInsertSchema(students).omit({ id: true, createdAt: true });
export const insertChatSchema = createInsertSchema(chats).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertInsightSchema = createInsertSchema(profileInsights).omit({ id: true, updatedAt: true });
export type AdultRow = typeof adults.$inferSelect;
export type StudentRow = typeof students.$inferSelect;
