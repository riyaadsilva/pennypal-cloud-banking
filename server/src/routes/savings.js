import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { contributeToGoal, deleteGoal, centsOf } from "../services/banking.js";
import { reward } from "../services/gamification.js";
import { HttpError } from "../utils/errors.js";

const r = Router();
r.use(requireAuth);
const ICONS = ["jar", "bike", "headphones", "palette", "plane", "gamepad", "book", "gift"];
const amount = z.coerce.number().positive("Enter an amount greater than zero.").max(1_000_000);
const goalBody = z.object({ name: z.string().trim().min(1, "Give your goal a name.").max(60), icon: z.enum(ICONS).default("jar"), target: amount });
const idParam = (req) => Number(req.params.id);

r.get("/", async (req, res) => {
  const [goals] = await pool.query("SELECT * FROM savings_goals WHERE user_id = ? ORDER BY completed_at IS NOT NULL, id DESC", [req.user.id]);
  res.json({ goals });
});
r.post("/", validate(goalBody), async (req, res) => {
  const { name, icon, target } = req.body;
  const [ins] = await pool.query("INSERT INTO savings_goals (user_id, name, icon, target) VALUES (?,?,?,?)", [req.user.id, name, icon, target]);
  const [[goal]] = await pool.query("SELECT * FROM savings_goals WHERE id = ?", [ins.insertId]);
  res.status(201).json({ goal });
});
r.patch("/:id", validate(goalBody.partial()), async (req, res) => {
  const [[g]] = await pool.query("SELECT * FROM savings_goals WHERE id = ? AND user_id = ?", [idParam(req), req.user.id]);
  if (!g) throw new HttpError(404, "NOT_FOUND", "Goal not found.");
  const { name = g.name, icon = g.icon, target = g.target } = req.body;
  if (centsOf(target) < centsOf(g.saved)) throw new HttpError(400, "TARGET_TOO_LOW", `You already saved ${g.saved} coins, so the target cannot be lower.`);
  await pool.query("UPDATE savings_goals SET name = ?, icon = ?, target = ?, completed_at = IF(saved >= ?, COALESCE(completed_at, NOW()), NULL) WHERE id = ?", [name, icon, target, target, g.id]);
  const [[goal]] = await pool.query("SELECT * FROM savings_goals WHERE id = ?", [g.id]);
  res.json({ goal });
});
r.post("/:id/contribute", validate(z.object({ amount: z.union([z.number(), z.string()]), idempotencyKey: z.string().uuid() })), async (req, res) => {
  const out = await contributeToGoal({ userId: req.user.id, goalId: idParam(req), amount: req.body.amount, idempotencyKey: req.body.idempotencyKey });
  let rewards = null;
  if (!out.duplicate) {
    rewards = await reward(req.user.id, { xp: out.justCompleted ? 60 : 10, reason: out.justCompleted ? "Goal completed" : "Saved coins", codes: out.justCompleted ? ["smart_saver", "savings_champion"] : ["smart_saver"] });
  }
  res.status(out.duplicate ? 200 : 201).json({ goal: out.goal, receipt: out.receipt, completed: out.justCompleted, duplicate: out.duplicate, rewards });
});
r.delete("/:id", async (req, res) => res.json(await deleteGoal({ userId: req.user.id, goalId: idParam(req) })));
export default r;
