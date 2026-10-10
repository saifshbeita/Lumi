import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { rateLimit } from "express-rate-limit";
import { eq } from "drizzle-orm";
import { db, adults } from "@workspace/db";
import { SignupAdultBody, LoginAdultBody, SignupAdultResponse, LoginAdultResponse, GetAdultSessionResponse } from "@workspace/api-zod";
import { regenerateSession, saveSession, destroySession } from "../lib/session";
import { publicAdult } from "../lib/profiles";
import { checkLogin } from "../lib/login-lock";

const router: IRouter = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many attempts. Please try again in 15 minutes." } });
router.get("/session", async (req, res): Promise<void> => {
  const adult = req.session.adultId ? (await db.select().from(adults).where(eq(adults.id, req.session.adultId)))[0] : undefined;
  res.json(GetAdultSessionResponse.parse({ adult: adult ? publicAdult(adult) : null }));
});
router.post("/signup", limiter, async (req, res): Promise<void> => {
  const parsed = SignupAdultBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Please provide a name, valid email and password of 8–72 characters." }); return; }
  const data = parsed.data;
  if (!data.name.trim() || (data.role === "teacher" && !data.school?.trim())) { res.status(400).json({ error: "Name and school are required for teachers." }); return; }
  const email = data.email.trim().toLowerCase();
  const [adult] = await db.insert(adults).values({ name: data.name.trim(), email, passwordHash: await bcrypt.hash(data.password, 12), role: data.role, school: data.role === "teacher" ? data.school!.trim() : null }).onConflictDoNothing().returning();
  if (!adult) { res.status(409).json({ error: "An account with this email already exists. Please log in." }); return; }
  await regenerateSession(req); req.session.adultId = adult.id; await saveSession(req);
  res.status(201).json(SignupAdultResponse.parse(publicAdult(adult)));
});
router.post("/login", limiter, async (req, res): Promise<void> => {
  const parsed = LoginAdultBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Please check your email and password." }); return; }
  const [adult] = await db.select().from(adults).where(eq(adults.email, parsed.data.email.trim().toLowerCase()));
  // Legacy development credentials are never valid on the public deployment.
  if (process.env.NODE_ENV === "production" && ["teacher@lumi.demo", "parent@lumi.demo"].includes(parsed.data.email.trim().toLowerCase())) { res.status(401).json({ error: "Use the production pitch demo account." }); return; }
  const result = await checkLogin(`adult:${parsed.data.email.trim().toLowerCase()}`, 10, async () => !!adult && adult.role === parsed.data.role && await bcrypt.compare(parsed.data.password, adult.passwordHash));
  if (result !== "ok" || !adult) { res.status(result === "locked" ? 429 : 401).json({ error: result === "locked" ? "For your safety, this account is paused. Please try again in 15 minutes." : "Email or password doesn't match this account type. Please try again." }); return; }
  await regenerateSession(req); req.session.adultId = adult.id; await saveSession(req);
  res.json(LoginAdultResponse.parse(publicAdult(adult)));
});
router.post("/logout", async (req, res): Promise<void> => {
  await destroySession(req); res.clearCookie("lumi.adult", { path: "/api" }); res.json({ success: true });
});
export default router;
