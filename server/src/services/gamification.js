import { pool } from "../db/pool.js";

export const XP_PER_LEVEL = 100;
export const levelFor = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1;

/** Streak = consecutive active days. Single UPDATE; MySQL evaluates SET left to right so it sees the old last_active. */
export async function touchStreak(userId) {
  await pool.query(
    `UPDATE users SET streak_days = CASE WHEN last_active = CURDATE() THEN streak_days
       WHEN last_active = CURDATE() - INTERVAL 1 DAY THEN streak_days + 1 ELSE 1 END,
       last_active = CURDATE() WHERE id = ?`, [userId]);
}

async function grant(userId, code) {
  const [res] = await pool.query(
    "INSERT IGNORE INTO user_achievements (user_id, achievement_id) SELECT ?, id FROM achievements WHERE code = ?", [userId, code]);
  if (!res.affectedRows) return null;
  const [[a]] = await pool.query("SELECT code, name, description FROM achievements WHERE code = ?", [code]);
  return a;
}

/** XP is stored separately from money. Returns what to celebrate on the client. */
export async function reward(userId, { xp = 0, reason = "Activity", codes = [] } = {}) {
  await touchStreak(userId);
  const unlocked = [];
  for (const code of codes) { const a = await grant(userId, code); if (a) unlocked.push(a); }
  if (xp > 0) {
    await pool.query("UPDATE users SET xp = xp + ? WHERE id = ?", [xp, userId]);
    await pool.query("INSERT INTO xp_history (user_id, amount, reason) VALUES (?, ?, ?)", [userId, xp, reason]);
  }
  const [[u]] = await pool.query("SELECT xp FROM users WHERE id = ?", [userId]);
  if (levelFor(u.xp) >= 5) { const a = await grant(userId, "money_genius"); if (a) unlocked.push(a); }
  return { xp, unlocked, totalXp: u.xp, level: levelFor(u.xp) };
}
