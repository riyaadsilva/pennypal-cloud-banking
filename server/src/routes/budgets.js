import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { reward } from "../services/gamification.js";
import { HttpError } from "../utils/errors.js";

const r = Router();
r.use(requireAuth);
const CATS = ["Food", "Games", "Education", "Shopping", "Savings", "Other"];
const money = z.coerce.number().min(0).max(1_000_000);
const body = z.object({ total: money, categories: z.record(z.enum(CATS), money) });

async function view(userId) {
  const [[b]] = await pool.query("SELECT * FROM budgets WHERE user_id = ? AND month = DATE_FORMAT(CURDATE(), '%Y-%m')", [userId]);
  if (!b) return null;
  const [cats] = await pool.query(
    `SELECT bc.category, bc.allocated,
       COALESCE((SELECT SUM(t.amount) FROM transactions t JOIN accounts a ON a.id = t.account_id
         WHERE a.user_id = ? AND t.category = bc.category AND t.type IN ('withdraw','goal_contribution')
         AND DATE_FORMAT(t.created_at, '%Y-%m') = ?), 0) AS spent
     FROM budget_categories bc WHERE bc.budget_id = ? ORDER BY FIELD(bc.category, 'Food','Games','Education','Shopping','Savings','Other')`, [userId, b.month, b.id]);
  return { id: b.id, month: b.month, total: b.total, categories: cats.map((c) => ({ ...c, remaining: (Number(c.allocated) - Number(c.spent)).toFixed(2) })) };
}
async function save(userId, id, input) {
  const sum = Object.values(input.categories).reduce((s, v) => s + Math.round(v * 100), 0);
  if (sum > Math.round(input.total * 100)) throw new HttpError(400, "OVER_ALLOCATED", "Your categories add up to more than your total. Lower a slider or raise the total.");
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (!id) {
      await conn.query("INSERT INTO budgets (user_id, month, total) VALUES (?, DATE_FORMAT(CURDATE(), '%Y-%m'), ?) ON DUPLICATE KEY UPDATE total = VALUES(total)", [userId, input.total]);
      [[{ id }]] = await conn.query("SELECT id FROM budgets WHERE user_id = ? AND month = DATE_FORMAT(CURDATE(), '%Y-%m')", [userId]);
    } else await conn.query("UPDATE budgets SET total = ? WHERE id = ?", [input.total, id]);
    for (const c of CATS) {
      await conn.query("INSERT INTO budget_categories (budget_id, category, allocated) VALUES (?,?,?) ON DUPLICATE KEY UPDATE allocated = VALUES(allocated)", [id, c, input.categories[c] ?? 0]);
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

r.get("/", async (req, res) => res.json({ budget: await view(req.user.id) }));
r.post("/", validate(body), async (req, res) => {
  await save(req.user.id, null, req.body);
  const rewards = await reward(req.user.id, { xp: 15, reason: "Planned a budget", codes: ["budget_beginner"] });
  res.status(201).json({ budget: await view(req.user.id), rewards });
});
r.patch("/:id", validate(body.partial()), async (req, res) => {
  const [[b]] = await pool.query("SELECT id FROM budgets WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
  if (!b) throw new HttpError(404, "NOT_FOUND", "Budget not found.");
  const current = await view(req.user.id);
  const categories = req.body.categories ?? Object.fromEntries(current.categories.map((c) => [c.category, Number(c.allocated)]));
  await save(req.user.id, b.id, { total: req.body.total ?? Number(current.total), categories });
  res.json({ budget: await view(req.user.id) });
});
export default r;
