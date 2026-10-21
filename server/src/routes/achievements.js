import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
const r = Router();
r.use(requireAuth);
r.get("/", async (_req, res) => res.json({ achievements: (await pool.query("SELECT code, name, description FROM achievements ORDER BY id"))[0] }));
r.get("/me", async (req, res) => {
  const [earned] = await pool.query("SELECT a.code, a.name, a.description, ua.earned_at FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id WHERE ua.user_id = ? ORDER BY ua.earned_at DESC", [req.user.id]);
  const [history] = await pool.query("SELECT amount, reason, created_at FROM xp_history WHERE user_id = ? ORDER BY id DESC LIMIT 15", [req.user.id]);
  res.json({ earned, history });
});
export default r;
