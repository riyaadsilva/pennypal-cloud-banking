import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { applyTransaction } from "../services/banking.js";
import { notifyParentOfTransaction } from "../services/parentNotifications.js";
import { reward } from "../services/gamification.js";
import { HttpError } from "../utils/errors.js";

const r = Router();

r.use(requireAuth);

// Validate deposit and withdrawal requests
const body = z.object({
  amount: z.union([z.number(), z.string()]),
  category: z.string().trim().max(24).default("Other"),
  description: z.string().trim().max(120).optional().nullable(),
  idempotencyKey: z.string().uuid(
    "Missing request id. Please refresh and try again."
  ),
});

// Handle deposits and withdrawals
const make = (type) => async (req, res) => {
  const out = await applyTransaction({
    userId: req.user.id,
    type,
    ...req.body,
  });

  let rewards = null;

  if (!out.duplicate) {
    // Award XP for successful transactions
    rewards = await reward(
      req.user.id,
      type === "deposit"
        ? {
            xp: 5,
            reason: "Added coins",
            codes: ["first_deposit"],
          }
        : {
            xp: 2,
            reason: "Spent coins",
          }
    );

    // Notify the verified parent after the transaction commits.
    // Email failures must not affect the banking operation.
    try {
      await notifyParentOfTransaction(req.user.id, out.receipt);
    } catch (error) {
      console.error("Parent SNS notification failed:", {
        studentId: req.user.id,
        transactionId: out.receipt.id,
        message: error.message,
      });
    }
  }

  res.status(out.duplicate ? 200 : 201).json({
    receipt: out.receipt,
    duplicate: out.duplicate,
    rewards,
  });
};

// Deposit virtual coins
r.post("/deposit", validate(body), make("deposit"));

// Withdraw / spend virtual coins
r.post("/withdraw", validate(body), make("withdraw"));

// Validate transaction history filters
const query = z.object({
  q: z.string().max(60).optional(),
  type: z.enum([
    "deposit",
    "withdraw",
    "goal_contribution",
  ]).optional(),
  category: z.string().max(24).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

// Get authenticated student's transaction history
r.get("/", validate(query, "query"), async (req, res) => {
  const { q, type, category, limit } = req.query;

  const where = ["a.user_id = ?"];
  const args = [req.user.id];

  if (q) {
    where.push("(t.description LIKE ? OR t.category LIKE ?)");
    args.push(`%${q}%`, `%${q}%`);
  }

  if (type) {
    where.push("t.type = ?");
    args.push(type);
  }

  if (category) {
    where.push("t.category = ?");
    args.push(category);
  }

  const [rows] = await pool.query(
    `SELECT
       t.id,
       t.type,
       t.amount,
       t.category,
       t.description,
       t.balance_after,
       t.created_at
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     WHERE ${where.join(" AND ")}
     ORDER BY t.id DESC
     LIMIT ?`,
    [...args, limit]
  );

  res.json({ transactions: rows });
});

// Get a specific transaction receipt
r.get("/:id", async (req, res) => {
  const [[t]] = await pool.query(
    `SELECT
       t.id,
       t.type,
       t.amount,
       t.category,
       t.description,
       t.balance_after,
       t.created_at
     FROM transactions t
     JOIN accounts a ON a.id = t.account_id
     WHERE t.id = ?
       AND a.user_id = ?`,
    [req.params.id, req.user.id]
  );

  if (!t) {
    throw new HttpError(
      404,
      "NOT_FOUND",
      "We could not find that receipt."
    );
  }

  res.json({ receipt: t });
});

export default r;
