import { randomUUID } from "node:crypto";
import { pool } from "../db/pool.js";
import { HttpError } from "../utils/errors.js";

const bad = (msg) => new HttpError(400, "BAD_AMOUNT", msg);
export const centsOf = (s) => Math.round(Number(s) * 100);

/** Validate a virtual-money amount and return integer cents. Rejects <=0, NaN, >2 decimals. */
export function toCents(value) {
  const n = Number(value);
  if (value === null || value === "" || !Number.isFinite(n) || n <= 0) throw bad("Enter an amount greater than zero.");
  const cents = Math.round(n * 100);
  if (Math.abs(cents - n * 100) > 1e-6) throw bad("Use at most two decimal places.");
  if (cents > 100_000_000) throw bad("That amount is too large.");
  return cents;
}

async function inTx(fn) {
  const conn = await pool.getConnection();
  try { await conn.beginTransaction(); const out = await fn(conn); await conn.commit(); return out; }
  catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}
const lockAccount = async (conn, userId) => {
  const [[acct]] = await conn.query("SELECT id FROM accounts WHERE user_id = ? FOR UPDATE", [userId]);
  if (!acct) throw new HttpError(404, "NO_ACCOUNT", "Account not found.");
  return acct;
};
const findDup = async (conn, accountId, key) =>
  (await conn.query("SELECT * FROM transactions WHERE account_id = ? AND idempotency_key = ?", [accountId, key]))[0][0];

/** Conditional UPDATE is the overspend guard; the row lock serializes concurrent requests. */
async function move(conn, accountId, deltaCents, { type, category, description, key }) {
  const delta = deltaCents / 100;
  const [res] = await conn.query("UPDATE accounts SET balance = balance + ? WHERE id = ? AND balance + ? >= 0", [delta, accountId, delta]);
  if (res.affectedRows === 0) throw new HttpError(400, "INSUFFICIENT_FUNDS", "You do not have enough coins for that. Try a smaller amount!");
  const [[{ balance }]] = await conn.query("SELECT balance FROM accounts WHERE id = ?", [accountId]);
  const [ins] = await conn.query(
    "INSERT INTO transactions (account_id, type, amount, category, description, balance_after, idempotency_key) VALUES (?,?,?,?,?,?,?)",
    [accountId, type, Math.abs(deltaCents) / 100, category, description, balance, key]);
  return { id: ins.insertId, type, amount: (Math.abs(deltaCents) / 100).toFixed(2), category, description, balance_after: balance };
}

/** Deposit or withdraw. Retrying with the same idempotency key returns the original receipt. */
export async function applyTransaction({ userId, type, amount, category = "Other", description = null, idempotencyKey }) {
  if (!["deposit", "withdraw"].includes(type)) throw new HttpError(400, "BAD_TYPE", "Unknown transaction type.");
  const cents = toCents(amount);
  return inTx(async (conn) => {
    const acct = await lockAccount(conn, userId);
    const dup = await findDup(conn, acct.id, idempotencyKey);
    if (dup) return { receipt: dup, duplicate: true };
    const receipt = await move(conn, acct.id, type === "deposit" ? cents : -cents, { type, category, description, key: idempotencyKey });
    return { receipt, duplicate: false };
  });
}

/** Move wallet money into a goal. Money is conserved: wallet debit + goal credit happen in one DB transaction. */
export async function contributeToGoal({ userId, goalId, amount, idempotencyKey }) {
  const cents = toCents(amount);
  return inTx(async (conn) => {
    const acct = await lockAccount(conn, userId);
    const dup = await findDup(conn, acct.id, idempotencyKey);
    const [[goal]] = await conn.query("SELECT * FROM savings_goals WHERE id = ? AND user_id = ? FOR UPDATE", [goalId, userId]);
    if (!goal) throw new HttpError(404, "NOT_FOUND", "Goal not found.");
    if (dup) return { receipt: dup, goal, duplicate: true, justCompleted: false };
    const room = centsOf(goal.target) - centsOf(goal.saved);
    if (cents > room) throw new HttpError(400, "GOAL_OVERFLOW", room > 0 ? `This goal only needs ${(room / 100).toFixed(2)} more coins.` : "This goal is already complete!");
    const receipt = await move(conn, acct.id, -cents, { type: "goal_contribution", category: "Savings", description: `Saved for ${goal.name}`, key: idempotencyKey });
    await conn.query("UPDATE savings_goals SET saved = saved + ?, completed_at = IF(saved >= target, COALESCE(completed_at, NOW()), NULL) WHERE id = ?", [cents / 100, goalId]);
    await conn.query("INSERT INTO savings_contributions (goal_id, transaction_id, amount) VALUES (?,?,?)", [goalId, receipt.id, cents / 100]);
    const [[fresh]] = await conn.query("SELECT * FROM savings_goals WHERE id = ?", [goalId]);
    return { receipt, goal: fresh, duplicate: false, justCompleted: centsOf(fresh.saved) >= centsOf(fresh.target) };
  });
}

/** Deleting a goal returns any saved coins to the wallet, so no money disappears. */
export async function deleteGoal({ userId, goalId }) {
  return inTx(async (conn) => {
    const acct = await lockAccount(conn, userId);
    const [[goal]] = await conn.query("SELECT * FROM savings_goals WHERE id = ? AND user_id = ? FOR UPDATE", [goalId, userId]);
    if (!goal) throw new HttpError(404, "NOT_FOUND", "Goal not found.");
    const saved = centsOf(goal.saved);
    if (saved > 0) await move(conn, acct.id, saved, { type: "deposit", category: "Savings", description: `Returned from ${goal.name}`, key: randomUUID() });
    await conn.query("DELETE FROM savings_goals WHERE id = ?", [goalId]);
    return { refunded: (saved / 100).toFixed(2) };
  });
}
