import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { COOKIE, cookieOptions, signToken, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../utils/errors.js";
import { levelFor, XP_PER_LEVEL, touchStreak } from "../services/gamification.js";
import { randomUUID } from "node:crypto";

const r = Router();
const nickname = z.string().trim().min(3, "Nicknames need at least 3 characters.").max(20).regex(/^[A-Za-z0-9_]+$/, "Use letters, numbers and underscores only.");
const password = z.string().min(8, "Passwords need at least 8 characters.").max(64)
  .regex(/[A-Za-z]/, "Add at least one letter.").regex(/\d/, "Add at least one number.");
const DUMMY = bcrypt.hashSync("not-a-real-password-1", 10);

export const publicUser = (u) => ({
  id: u.id, nickname: u.nickname, role: u.role, avatar: u.avatar, xp: u.xp, level: levelFor(u.xp),
  xpIntoLevel: u.xp % XP_PER_LEVEL, xpPerLevel: XP_PER_LEVEL, streak: u.streak_days, animationsOn: !!u.animations_on,
});
const sendSession = (res, u) => { res.cookie(COOKIE, signToken(u), cookieOptions()); res.json({ user: publicUser(u) }); };
const load = async (id) => (await pool.query("SELECT * FROM users WHERE id = ?", [id]))[0][0];

r.post("/register", validate(z.object({ nickname, password })), async (req, res) => {
  const { nickname: nick, password: pw } = req.body;
  const [[taken]] = await pool.query("SELECT id FROM users WHERE nickname = ?", [nick]);
  if (taken) throw new HttpError(409, "NICKNAME_TAKEN", "That nickname is taken. Try adding a number!");
  const hash = await bcrypt.hash(pw, 10);
  const conn = await pool.getConnection();
  let id;
  try {
    await conn.beginTransaction();
    [{ insertId: id }] = await conn.query("INSERT INTO users (nickname, password_hash) VALUES (?, ?)", [nick, hash]);
    const [acct] = await conn.query("INSERT INTO accounts (user_id, balance) VALUES (?, 100)", [id]);
    await conn.query("INSERT INTO transactions (account_id, type, amount, category, description, balance_after, idempotency_key) VALUES (?, \"deposit\", 100, \"Gift\", \"Welcome gift from Penny\", 100, ?)", [acct.insertId, randomUUID()]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  await touchStreak(id);
  sendSession(res, await load(id));
});

async function doLogin(res, nick, pw) {
  const [[u]] = await pool.query("SELECT * FROM users WHERE nickname = ?", [nick]);
  const ok = await bcrypt.compare(pw, u?.password_hash ?? DUMMY);
  if (!u || !ok) throw new HttpError(401, "BAD_LOGIN", "That nickname and password do not match. Check them and try again.");
  await touchStreak(u.id);
  sendSession(res, await load(u.id));
}
r.post("/login", validate(z.object({ nickname: z.string().max(40), password: z.string().max(64) })), (req, res) => doLogin(res, req.body.nickname, req.body.password));
r.post("/demo", (_req, res) => doLogin(res, "starry_sam", "Demo@1234"));
r.post("/logout", (_req, res) => { res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined }); res.json({ ok: true }); });

r.get("/me", requireAuth, async (req, res) => {
  const u = await load(req.user.id);
  if (!u) throw new HttpError(401, "AUTH_REQUIRED", "Please log in again.");
  res.json({ user: publicUser(u) });
});

const AVATARS = ["penny", "star", "rocket", "cat", "bear", "robot"];
r.patch("/me", requireAuth, validate(z.object({
  nickname: nickname.optional(), avatar: z.enum(AVATARS).optional(), animationsOn: z.boolean().optional(),
})), async (req, res) => {
  const { nickname: nick, avatar, animationsOn } = req.body;
  if (nick) {
    const [[t]] = await pool.query("SELECT id FROM users WHERE nickname = ? AND id <> ?", [nick, req.user.id]);
    if (t) throw new HttpError(409, "NICKNAME_TAKEN", "That nickname is taken. Try adding a number!");
  }
  await pool.query("UPDATE users SET nickname = COALESCE(?, nickname), avatar = COALESCE(?, avatar), animations_on = COALESCE(?, animations_on) WHERE id = ?",
    [nick ?? null, avatar ?? null, animationsOn === undefined ? null : +animationsOn, req.user.id]);
  res.json({ user: publicUser(await load(req.user.id)) });
});

r.post("/password", requireAuth, validate(z.object({ current: z.string().max(64), next: password })), async (req, res) => {
  const u = await load(req.user.id);
  if (!(await bcrypt.compare(req.body.current, u.password_hash))) throw new HttpError(400, "BAD_PASSWORD", "Your current password is not right.");
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(req.body.next, 10), u.id]);
  res.json({ ok: true });
});
export default r;
