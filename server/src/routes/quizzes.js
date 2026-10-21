import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { scoreQuiz, quizXp } from "../services/quiz.js";
import { reward } from "../services/gamification.js";
import { HttpError } from "../utils/errors.js";

const r = Router();
r.use(requireAuth);
const questionsOf = async (quizId) => (await pool.query("SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY id", [quizId]))[0];

r.get("/", async (req, res) => {
  const [quizzes] = await pool.query(
    `SELECT q.id, q.category, q.title, (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) AS questions,
            (SELECT MAX(score) FROM quiz_attempts WHERE quiz_id = q.id AND user_id = ?) AS bestScore FROM quizzes q ORDER BY q.id`, [req.user.id]);
  res.json({ quizzes });
});
r.get("/history", async (req, res) => {
  const [attempts] = await pool.query(
    `SELECT qa.id, qa.quiz_id, q.title, qa.score, qa.total, qa.xp_awarded, qa.created_at
     FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id WHERE qa.user_id = ? ORDER BY qa.id DESC LIMIT 30`, [req.user.id]);
  res.json({ attempts });
});
r.get("/:id", async (req, res) => {
  const [[quiz]] = await pool.query("SELECT id, category, title FROM quizzes WHERE id = ?", [req.params.id]);
  if (!quiz) throw new HttpError(404, "NOT_FOUND", "Quiz not found.");
  const qs = (await questionsOf(quiz.id)).map(({ id, prompt, options }) => ({ id, prompt, options }));
  res.json({ quiz, questions: qs });
});
// Instant feedback for one question; XP is still decided only by /submit.
r.post("/:id/answer", validate(z.object({ questionId: z.number().int(), choice: z.number().int().min(0).max(3) })), async (req, res) => {
  const [[q]] = await pool.query("SELECT correct_index, explanation FROM quiz_questions WHERE id = ? AND quiz_id = ?", [req.body.questionId, req.params.id]);
  if (!q) throw new HttpError(404, "NOT_FOUND", "Question not found.");
  res.json({ correct: q.correct_index === req.body.choice, correctIndex: q.correct_index, explanation: q.explanation });
});
r.post("/:id/submit", validate(z.object({ answers: z.array(z.number().int().min(-1).max(3)).min(1).max(50) })), async (req, res) => {
  const questions = await questionsOf(req.params.id);
  if (!questions.length) throw new HttpError(404, "NOT_FOUND", "Quiz not found.");
  if (req.body.answers.length !== questions.length) throw new HttpError(400, "VALIDATION", "Please answer every question before finishing.");
  const { score, total, review } = scoreQuiz(questions, req.body.answers);
  const [[{ best }]] = await pool.query("SELECT COALESCE(MAX(score), 0) AS best FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?", [req.user.id, req.params.id]);
  const xp = quizXp({ score, total, previousBest: best });
  await pool.query("INSERT INTO quiz_attempts (user_id, quiz_id, score, total, xp_awarded) VALUES (?,?,?,?,?)", [req.user.id, req.params.id, score, total, xp]);
  const [[{ n }]] = await pool.query("SELECT COUNT(*) AS n FROM quiz_attempts WHERE user_id = ?", [req.user.id]);
  const rewards = await reward(req.user.id, { xp, reason: "Finished a quiz", codes: n >= 3 ? ["quiz_master"] : [] });
  res.json({ score, total, xpAwarded: xp, review, rewards });
});
export default r;
