import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
const r = Router();
r.use(requireAuth);
r.get("/me", async (req, res) => {
  const [[a]] = await pool.query("SELECT id, balance FROM accounts WHERE user_id = ?", [req.user.id]);
  const [[s]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM transactions WHERE account_id = ?) txCount,
            (SELECT COUNT(*) FROM savings_goals WHERE user_id = ?) goalsTotal,
            (SELECT COUNT(*) FROM savings_goals WHERE user_id = ? AND completed_at IS NOT NULL) goalsDone,
            (SELECT COUNT(*) FROM quiz_attempts WHERE user_id = ?) quizAttempts,
            (SELECT COUNT(*) FROM user_achievements WHERE user_id = ?) badges`, [a.id, req.user.id, req.user.id, req.user.id, req.user.id]);
  res.json({ account: a, stats: s });
});
r.get("/me/balance", async (req, res) => {
  const [[a]] = await pool.query("SELECT balance FROM accounts WHERE user_id = ?", [req.user.id]);
  res.json({ balance: a.balance });
});
export default r;
