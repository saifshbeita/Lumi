import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import type { Request } from "express";

declare module "express-session" {
  interface SessionData { adultId?: number; studentId?: number }
}

if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is required");
const PgStore = connectPgSimple(session);
const store = new PgStore({ pool, tableName: "sessions", createTableIfMissing: false });
const cookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: 1000 * 60 * 60 * 12, path: "/api" };
export const adultSession = session({ name: "lumi.adult", secret: process.env.SESSION_SECRET, store, resave: false, saveUninitialized: false, cookie });
export const studentSession = session({ name: "lumi.student", secret: process.env.SESSION_SECRET, store, resave: false, saveUninitialized: false, cookie });
export function saveSession(req: Request) {
  return new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
}
export function regenerateSession(req: Request) {
  return new Promise<void>((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
}
export function destroySession(req: Request) {
  return new Promise<void>((resolve, reject) => req.session.destroy(err => err ? reject(err) : resolve()));
}
