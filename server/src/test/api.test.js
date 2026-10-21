import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { toCents } from "../services/banking.js";
import { levelFor } from "../services/gamification.js";
import { scoreQuiz, quizXp } from "../services/quiz.js";
import { app } from "../app.js";
import { pool } from "../db/pool.js";

// ---------- Unit tests (no database) ----------
test("toCents accepts valid amounts", () => {
  assert.equal(toCents("12.50"), 1250);
  assert.equal(toCents(5), 500);
});
test("toCents rejects zero, negative, empty, NaN and sub-cent values", () => {
  for (const bad of [0, -5, "", "abc", 1.234, null]) assert.throws(() => toCents(bad), { code: "BAD_AMOUNT" });
});
test("level is 1 + XP / 100", () => {
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(99), 1);
  assert.equal(levelFor(100), 2);
  assert.equal(levelFor(400), 5);
});
test("scoreQuiz counts correct answers and returns a review", () => {
  const qs = [{ id: 1, correct_index: 1, explanation: "a" }, { id: 2, correct_index: 0, explanation: "b" }, { id: 3, correct_index: 3, explanation: "c" }];
  const out = scoreQuiz(qs, [1, 2, 3]);
  assert.equal(out.score, 2);
  assert.equal(out.total, 3);
  assert.deepEqual(out.review.map((r) => r.correct), [true, false, true]);
});
test("quizXp rewards improvement only, with a one-time perfect bonus", () => {
  assert.equal(quizXp({ score: 3, total: 5, previousBest: 0 }), 30);
  assert.equal(quizXp({ score: 3, total: 5, previousBest: 3 }), 0);
  assert.equal(quizXp({ score: 5, total: 5, previousBest: 3 }), 40);
  assert.equal(quizXp({ score: 5, total: 5, previousBest: 5 }), 0);
});

// ---------- API + database tests ----------
let dbUp = true;
try { await pool.query("SELECT 1"); } catch { dbUp = false; }
const opts = { skip: !dbUp && "database unavailable" };

let server, base;
before(() => new Promise((resolve) => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); }); }));
after(async () => { server.close(); await pool.end(); });

function client() {
  let cookie = "";
  const call = async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) }, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };
  return { get: (p) => call("GET", p), post: (p, b) => call("POST", p, b), patch: (p, b) => call("PATCH", p, b), del: (p) => call("DELETE", p) };
}
async function newUser() {
  const c = client();
  const nick = "t" + randomUUID().replace(/-/g, "").slice(0, 12);
  const res = await c.post("/api/auth/register", { nickname: nick, password: "Passw0rd1" });
  assert.equal(res.status, 200);
  return c; // new accounts start with a 100 coin welcome gift
}
const money = (c) => c.get("/api/accounts/me/balance").then((r) => Number(r.body.balance));
const tx = (c, type, amount, key = randomUUID()) => c.post(`/api/transactions/${type}`, { amount, category: "Other", idempotencyKey: key });

test("health and readiness endpoints respond", opts, async () => {
  const c = client();
  assert.equal((await c.get("/api/health")).status, 200);
  assert.equal((await c.get("/api/ready")).status, 200);
});

test("auth: weak password, duplicate nickname and wrong password are rejected with friendly errors", opts, async () => {
  const c = client();
  assert.equal((await c.post("/api/auth/register", { nickname: "abc_weak", password: "short" })).status, 400);
  const u = "d" + randomUUID().replace(/-/g, "").slice(0, 10);
  assert.equal((await c.post("/api/auth/register", { nickname: u, password: "Passw0rd1" })).status, 200);
  assert.equal((await client().post("/api/auth/register", { nickname: u, password: "Passw0rd1" })).status, 409);
  const bad = await client().post("/api/auth/login", { nickname: u, password: "WrongPass1" });
  assert.equal(bad.status, 401);
  assert.match(bad.body.error.message, /do not match/);
});

test("auth: protected routes need a login, admin routes need the admin role", opts, async () => {
  assert.equal((await client().get("/api/accounts/me")).status, 401);
  const kid = await newUser();
  assert.equal((await kid.get("/api/admin/stats")).status, 403);
  assert.equal((await kid.get("/api/admin/users")).status, 403);
});

test("admin users list never exposes password hashes", opts, async () => {
  const admin = client();
  assert.equal((await admin.post("/api/auth/login", { nickname: "admin", password: "Admin@1234" })).status, 200);
  const res = await admin.get("/api/admin/users");
  assert.equal(res.status, 200);
  assert.ok(!JSON.stringify(res.body).includes("password"));
});

test("deposit increases and withdraw decreases the balance", opts, async () => {
  const c = await newUser();
  assert.equal((await tx(c, "deposit", 50)).status, 201);
  assert.equal(await money(c), 150);
  const w = await tx(c, "withdraw", 30.5);
  assert.equal(w.status, 201);
  assert.equal(w.body.receipt.balance_after, "119.50");
});

test("invalid amounts are rejected (zero, negative, text)", opts, async () => {
  const c = await newUser();
  for (const bad of [0, -10, "abc", 1.005]) assert.equal((await tx(c, "deposit", bad)).status, 400);
  assert.equal(await money(c), 100);
});

test("withdrawing more than the balance fails and changes nothing", opts, async () => {
  const c = await newUser();
  const r = await tx(c, "withdraw", 500);
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, "INSUFFICIENT_FUNDS");
  assert.equal(await money(c), 100);
});

test("repeating a request with the same idempotency key does not duplicate it", opts, async () => {
  const c = await newUser();
  const key = randomUUID();
  assert.equal((await tx(c, "withdraw", 20, key)).status, 201);
  const again = await tx(c, "withdraw", 20, key);
  assert.equal(again.status, 200);
  assert.equal(again.body.duplicate, true);
  assert.equal(await money(c), 80);
});

test("concurrent withdrawals can never overspend", opts, async () => {
  const c = await newUser();
  await tx(c, "deposit", 100); // balance 200
  const results = await Promise.all(Array.from({ length: 8 }, () => tx(c, "withdraw", 60)));
  assert.equal(results.filter((r) => r.status === 201).length, 3); // 200 / 60 = 3 successes
  assert.equal(await money(c), 20);
});

test("a user cannot read another user's receipt", opts, async () => {
  const a = await newUser();
  const b = await newUser();
  const { body } = await tx(a, "deposit", 10);
  assert.equal((await b.get(`/api/transactions/${body.receipt.id}`)).status, 404);
  assert.equal((await a.get(`/api/transactions/${body.receipt.id}`)).status, 200);
});

test("savings: contributing moves coins from wallet to goal without creating money", opts, async () => {
  const c = await newUser();
  const { body } = await c.post("/api/savings", { name: "Bike", icon: "bike", target: 80 });
  const id = body.goal.id;
  const r = await c.post(`/api/savings/${id}/contribute`, { amount: 30, idempotencyKey: randomUUID() });
  assert.equal(r.status, 201);
  assert.equal(await money(c), 70);
  const goal = (await c.get("/api/savings")).body.goals.find((g) => g.id === id);
  assert.equal(Number(goal.saved), 30);
  assert.equal(Number(goal.saved) + (await money(c)), 100); // wallet + goal = original 100
  assert.equal((await c.post(`/api/savings/${id}/contribute`, { amount: 500, idempotencyKey: randomUUID() })).status, 400);
});

test("savings: completing a goal is reported, and deleting a goal refunds the wallet", opts, async () => {
  const c = await newUser();
  const g1 = (await c.post("/api/savings", { name: "Pens", icon: "palette", target: 40 })).body.goal;
  const done = await c.post(`/api/savings/${g1.id}/contribute`, { amount: 40, idempotencyKey: randomUUID() });
  assert.equal(done.body.completed, true);
  assert.ok(done.body.rewards.unlocked.some((a) => a.code === "savings_champion"));
  const g2 = (await c.post("/api/savings", { name: "Game", icon: "gamepad", target: 100 })).body.goal;
  await c.post(`/api/savings/${g2.id}/contribute`, { amount: 25, idempotencyKey: randomUUID() });
  assert.equal(await money(c), 35);
  const del = await c.del(`/api/savings/${g2.id}`);
  assert.equal(del.body.refunded, "25.00");
  assert.equal(await money(c), 60);
});

test("budgets: over-allocation is rejected, saving works and shows spending", opts, async () => {
  const c = await newUser();
  const bad = await c.post("/api/budgets", { total: 100, categories: { Food: 80, Games: 80 } });
  assert.equal(bad.status, 400);
  const ok = await c.post("/api/budgets", { total: 100, categories: { Food: 40, Games: 30, Savings: 30 } });
  assert.equal(ok.status, 201);
  await c.post("/api/transactions/withdraw", { amount: 15, category: "Food", idempotencyKey: randomUUID() });
  const food = (await c.get("/api/budgets")).body.budget.categories.find((x) => x.category === "Food");
  assert.equal(Number(food.spent), 15);
  assert.equal(Number(food.remaining), 25);
});

test("quizzes: the server scores answers, XP is separate from the balance and repeat attempts earn no extra XP", opts, async () => {
  const c = await newUser();
  const list = (await c.get("/api/quizzes")).body.quizzes;
  assert.ok(list.length >= 6);
  const { body } = await c.get(`/api/quizzes/${list[0].id}`);
  assert.ok(!JSON.stringify(body).includes("correct"));
  const answers = body.questions.map(() => 1);
  const first = await c.post(`/api/quizzes/${list[0].id}/submit`, { answers });
  assert.equal(first.status, 200);
  assert.equal(first.body.xpAwarded, first.body.score * 10 + (first.body.score === first.body.total ? 20 : 0));
  assert.equal(await money(c), 100); // XP never touches coins
  const second = await c.post(`/api/quizzes/${list[0].id}/submit`, { answers });
  assert.equal(second.body.xpAwarded, 0);
  assert.equal((await c.get("/api/quizzes/history")).body.attempts.length, 2);
  assert.equal((await c.post(`/api/quizzes/${list[0].id}/submit`, { answers: [1] })).status, 400);
});

test("database consistency: every balance equals the sum of its transactions", opts, async () => {
  const [rows] = await pool.query(
    `SELECT a.id, a.balance, COALESCE(SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE -t.amount END), 0) AS computed
     FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id GROUP BY a.id, a.balance HAVING a.balance <> computed`);
  assert.deepEqual(rows, []);
});
