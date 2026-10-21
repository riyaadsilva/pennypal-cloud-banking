import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../utils/errors.js";

const r = Router();
r.use(requireAuth, requireRole("admin")); // enforced on the server for every admin route

r.get("/stats", async (_req, res) => {
  const [[s]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM users WHERE role = 'student') students,
            (SELECT COUNT(*) FROM transactions) transactions,
            (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE type = 'deposit') deposited,
            (SELECT COALESCE(SUM(amount),0) FROM transactions WHERE type = 'withdraw') spent,
            (SELECT COUNT(*) FROM quiz_attempts) quizAttempts,
            (SELECT COALESCE(ROUND(AVG(score / total) * 100), 0) FROM quiz_attempts) avgQuizPercent,
            (SELECT COUNT(*) FROM savings_goals) goals,
            (SELECT COUNT(*) FROM savings_goals WHERE completed_at IS NOT NULL) goalsDone,
            (SELECT COUNT(*) FROM user_achievements) badgesEarned`);
  res.json({ stats: { ...s, goalCompletionPercent: s.goals ? Math.round((s.goalsDone / s.goals) * 100) : 0 } });
});
r.get("/users", async (_req, res) => {
  const [users] = await pool.query(
    `SELECT u.id, u.nickname, u.role, u.xp, u.streak_days, u.created_at, a.balance,
            (SELECT COUNT(*) FROM savings_goals g WHERE g.user_id = u.id) goals,
            (SELECT COUNT(*) FROM quiz_attempts q WHERE q.user_id = u.id) quizzes
     FROM users u LEFT JOIN accounts a ON a.user_id = u.id ORDER BY u.id DESC LIMIT 200`); // never selects password_hash
  res.json({ users });
});
r.get("/transactions", async (_req, res) => {
  const [byType] = await pool.query("SELECT type, COUNT(*) count, SUM(amount) total FROM transactions GROUP BY type");
  const [byDay] = await pool.query("SELECT DATE(created_at) day, COUNT(*) count, SUM(amount) total FROM transactions WHERE created_at >= CURDATE() - INTERVAL 13 DAY GROUP BY DATE(created_at) ORDER BY day");
  const [recent] = await pool.query("SELECT t.id, u.nickname, t.type, t.amount, t.category, t.created_at FROM transactions t JOIN accounts a ON a.id = t.account_id JOIN users u ON u.id = a.user_id ORDER BY t.id DESC LIMIT 15");
  const [attempts] = await pool.query("SELECT qa.id, u.nickname, q.title, qa.score, qa.total, qa.created_at FROM quiz_attempts qa JOIN users u ON u.id = qa.user_id JOIN quizzes q ON q.id = qa.quiz_id ORDER BY qa.id DESC LIMIT 10");
  res.json({ byType, byDay, recent, recentQuizzes: attempts });
});
r.get("/questions", async (_req, res) => {
  const [rows] = await pool.query("SELECT qq.id, qq.quiz_id, q.title quiz, qq.prompt, qq.options, qq.correct_index, qq.explanation FROM quiz_questions qq JOIN quizzes q ON q.id = qq.quiz_id ORDER BY qq.quiz_id, qq.id");
  res.json({ questions: rows });
});
r.post("/questions", validate(z.object({
  quizId: z.number().int(), prompt: z.string().trim().min(5).max(255),
  options: z.array(z.string().trim().min(1).max(100)).length(4), correctIndex: z.number().int().min(0).max(3), explanation: z.string().trim().max(255).optional(),
})), async (req, res) => {
  const b = req.body;
  const [ins] = await pool.query("INSERT INTO quiz_questions (quiz_id, prompt, options, correct_index, explanation) VALUES (?,?,?,?,?)", [b.quizId, b.prompt, JSON.stringify(b.options), b.correctIndex, b.explanation ?? null]);
  res.status(201).json({ id: ins.insertId });
});
r.delete("/questions/:id", async (req, res) => {
  const [res2] = await pool.query("DELETE FROM quiz_questions WHERE id = ?", [req.params.id]);
  if (!res2.affectedRows) throw new HttpError(404, "NOT_FOUND", "Question not found.");
  res.json({ ok: true });
});
export default r;
