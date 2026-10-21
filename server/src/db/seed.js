// Seeds demo data. Safe to re-run: existing demo users and quiz content are left alone.
// Demo student:  starry_sam / Demo@1234     Demo admin:  admin / Admin@1234
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { pool } from "./pool.js";

const ACHIEVEMENTS = [
  ["first_deposit", "First Deposit", "Add coins to your wallet for the first time."],
  ["smart_saver", "Smart Saver", "Put coins into a savings goal."],
  ["budget_beginner", "Budget Beginner", "Plan your first monthly budget."],
  ["money_genius", "Money Genius", "Reach level 5 by learning and saving."],
  ["savings_champion", "Savings Champion", "Finish a savings goal."],
  ["quiz_master", "Quiz Master", "Complete 3 quizzes."],
];

// [category, title, [[prompt, [A, B, C, D], correctIndex, explanation], ...]]
const QUIZZES = [
  ["Understanding Money", "What Is Money?", [
    ["What do people use money for?", ["Only to collect", "To trade for things and services they need", "To decorate rooms", "Only to give away"], 1, "Money is a tool we trade for the things and services we need."],
    ["Where does most money come from for adults?", ["Finding it on the street", "Working at a job", "Wishing for it", "Trees"], 1, "Most adults earn money by doing work."],
    ["Which of these is a form of money?", ["Coins and notes", "Pebbles from a garden", "Leaves", "Clouds"], 0, "Coins and notes are made to be used as money."],
    ["Before money, people traded items directly. What is that called?", ["Bartering", "Banking", "Budgeting", "Borrowing"], 0, "Bartering means swapping one thing for another."],
    ["Why do we keep money in a bank?", ["To lose it", "To keep it safe and track it", "Because banks give toys", "To hide it from ourselves"], 1, "Banks keep money safe and keep a record of it."],
  ]],
  ["Saving vs Spending", "Save or Spend?", [
    ["You have 100 coins. You want a toy costing 150 coins. What should you do?", ["Spend all your coins immediately", "Save more coins until you can afford it", "Borrow money without planning", "Forget about saving"], 1, "Saving a little at a time helps you reach bigger goals."],
    ["What is saving?", ["Spending everything today", "Keeping money for later", "Giving money away", "Hiding money from friends"], 1, "Saving means keeping money to use later."],
    ["Which is a good reason to save?", ["To reach a big goal", "To have nothing left", "To impress people", "Because spending is bad"], 0, "Savings help you reach goals you care about."],
    ["You get 20 coins every week. Which habit helps most?", ["Spend it all on day one", "Save a small part each week", "Lose track of it", "Give it all away"], 1, "Small, regular savings add up fast."],
    ["An emergency fund is money for...", ["Surprise problems", "Candy", "Games only", "Nothing at all"], 0, "An emergency fund covers surprises, like a broken bike."],
    ["Your savings jar has 40 coins. You add 10 each week. How many weeks to reach 100?", ["3 weeks", "6 weeks", "10 weeks", "1 week"], 1, "You need 60 more coins, at 10 per week, which is 6 weeks."],
  ]],
  ["Needs vs Wants", "Needs and Wants", [
    ["Which of these is a need?", ["Healthy food", "A new video game", "Fancy stickers", "A toy robot"], 0, "Food is something you must have to stay healthy."],
    ["Which of these is a want?", ["Clean water", "A warm coat in winter", "A fourth pair of sneakers", "School books"], 2, "You can live without extra sneakers, so it is a want."],
    ["You have limited coins. What should you pay for first?", ["Wants", "Needs", "Whatever is shiny", "Nothing"], 1, "Needs come first, then wants."],
    ["A friend has a new gadget and you want one too. What is smart to do?", ["Buy it at once", "Think about whether you really need it", "Borrow coins in secret", "Get upset"], 1, "Pausing to think helps you avoid spending you regret."],
    ["A doctor visit when you are sick is a...", ["Want", "Need", "Treat", "Game"], 1, "Staying healthy is a need."],
  ]],
  ["Budgeting Basics", "Make a Budget", [
    ["What is a budget?", ["A plan for how to use your money", "A type of toy", "A bank loan", "A shopping bag"], 0, "A budget is a plan for your money."],
    ["You get 100 coins. Which budget is the smartest?", ["Spend 100 on games", "Save 30, spend 50 on needs and treats, give 20 to share", "Spend 150", "Save nothing"], 1, "Splitting money into save, spend and share keeps you balanced."],
    ["If you spend more than your budget, you have...", ["Overspent", "Saved extra", "Earned interest", "Won a prize"], 0, "Overspending means spending more than planned."],
    ["What should you do if your Games budget is almost gone?", ["Keep buying games", "Wait until next month or use a different plan", "Take coins from savings quietly", "Ignore it"], 1, "Stick to your plan, or change the plan on purpose."],
    ["Why track what you spend?", ["To see where your money goes", "To make it disappear", "Because it is a rule for pigs", "No reason"], 0, "Tracking shows if you are following your budget."],
    ["Which category belongs in a kid budget?", ["Food and snacks", "Rent for a castle", "Airplane fuel", "Taxes"], 0, "Snacks and treats are a normal part of a kid budget."],
  ]],
  ["Smart Shopping", "Shop Smart", [
    ["Two backpacks are the same quality. One costs 400 coins and the other 300. Which is smarter?", ["The 400 coin one", "The 300 coin one", "Neither, just spend", "Buy both"], 1, "Comparing prices helps you spend less for the same thing."],
    ["What is a good first step before buying something big?", ["Compare prices", "Buy it right away", "Ask nobody", "Close your eyes"], 0, "Comparing prices is a smart first step."],
    ["A sale says 50% off a 200 coin game. What is the new price?", ["50 coins", "100 coins", "150 coins", "200 coins"], 1, "Half of 200 is 100."],
    ["An ad says everyone needs this toy. What should you think?", ["I must buy it", "Ads want me to buy, so I should decide for myself", "Ads never exaggerate", "Ads are my budget"], 1, "Ads are made to sell, so check whether you really want it."],
    ["Why wait a day before an expensive purchase?", ["To be sure you still want it", "To forget it", "To make it cost more", "Shops require it"], 0, "A pause stops impulse buying."],
  ]],
  ["Banking Fundamentals", "Bank Basics", [
    ["What does a deposit do?", ["Puts money into your account", "Takes money out", "Burns money", "Hides money"], 0, "A deposit adds money to your account."],
    ["What does a withdrawal do?", ["Adds coins", "Takes money out of your account", "Changes your name", "Counts coins"], 1, "A withdrawal takes money out."],
    ["What is a balance?", ["How much money is in your account", "A kind of scale", "A bank rule", "A game score"], 0, "Your balance is the amount you have right now."],
    ["What is interest?", ["Extra money a bank may pay for keeping savings", "A boring talk", "A fee for waving", "A coupon"], 0, "Banks can pay interest to people who save with them."],
    ["Why should you keep your PIN or password secret?", ["So nobody else can use your account", "Because it is embarrassing", "So banks stay busy", "It does not matter"], 0, "Secrets keep your money safe."],
    ["A receipt is useful because it...", ["Proves and records what happened", "Is a bookmark", "Adds coins", "Is a ticket to play"], 0, "Receipts record deposits, withdrawals and purchases."],
  ]],
];

async function seedAchievements() {
  for (const [code, name, description] of ACHIEVEMENTS) {
    await pool.query("INSERT INTO achievements (code, name, description) VALUES (?,?,?) ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)", [code, name, description]);
  }
}

async function seedQuizzes() {
  const [[{ n }]] = await pool.query("SELECT COUNT(*) n FROM quizzes");
  if (n > 0) return;
  for (const [category, title, questions] of QUIZZES) {
    const [q] = await pool.query("INSERT INTO quizzes (category, title) VALUES (?,?)", [category, title]);
    for (const [prompt, options, correct, why] of questions) {
      await pool.query("INSERT INTO quiz_questions (quiz_id, prompt, options, correct_index, explanation) VALUES (?,?,?,?,?)", [q.insertId, prompt, JSON.stringify(options), correct, why]);
    }
  }
}

async function makeUser(nickname, password, role, balance, extra = {}) {
  const [[existing]] = await pool.query("SELECT id FROM users WHERE nickname = ?", [nickname]);
  if (existing) return null;
  const hash = await bcrypt.hash(password, 10);
  const [u] = await pool.query("INSERT INTO users (nickname, password_hash, role, xp, streak_days, last_active, avatar) VALUES (?,?,?,?,?,CURDATE(),?)", [nickname, hash, role, extra.xp ?? 0, extra.streak ?? 1, extra.avatar ?? "penny"]);
  const [a] = await pool.query("INSERT INTO accounts (user_id, balance) VALUES (?, ?)", [u.insertId, balance]);
  return { userId: u.insertId, accountId: a.insertId };
}

async function seedDemo() {
  const admin = await makeUser("admin", "Admin@1234", "admin", 0);
  if (admin) console.log("created admin");
  const demo = await makeUser("starry_sam", "Demo@1234", "student", 0, { xp: 140, streak: 4, avatar: "star" });
  if (!demo) return;
  const { userId, accountId } = demo;
  // [days ago, type, amount, category, description]. Balance is replayed so balance_after is always consistent.
  const history = [
    [40, "deposit", 300, "Allowance", "Monthly allowance"], [38, "withdraw", 40, "Food", "Lunch with friends"],
    [34, "withdraw", 80, "Games", "New puzzle game"], [30, "deposit", 50, "Chores", "Helped wash the car"],
    [26, "goal_contribution", 100, "Savings", "Saved for New Bicycle"], [20, "withdraw", 25, "Education", "Notebook and pens"],
    [15, "deposit", 300, "Allowance", "Monthly allowance"], [12, "withdraw", 60, "Shopping", "Sticker pack and cap"],
    [9, "goal_contribution", 60, "Savings", "Saved for Art Supplies"], [6, "withdraw", 30, "Food", "Ice cream trip"],
    [3, "deposit", 40, "Gift", "Birthday gift from Grandma"], [1, "withdraw", 20, "Games", "Arcade tokens"],
  ];
  let balance = 0;
  const contributions = [];
  for (const [ago, type, amount, category, description] of history) {
    balance += type === "deposit" ? amount : -amount;
    const [t] = await pool.query("INSERT INTO transactions (account_id, type, amount, category, description, balance_after, idempotency_key, created_at) VALUES (?,?,?,?,?,?,?, NOW() - INTERVAL ? DAY)", [accountId, type, amount, category, description, balance, randomUUID(), ago]);
    if (type === "goal_contribution") contributions.push([t.insertId, amount]);
  }
  await pool.query("UPDATE accounts SET balance = ? WHERE id = ?", [balance, accountId]);
  const goals = [["New Bicycle", "bike", 5000, 100], ["Gaming Headphones", "headphones", 2000, 0], ["Art Supplies", "palette", 800, 60], ["Dream Vacation", "plane", 10000, 0]];
  const ids = [];
  for (const [name, icon, target, saved] of goals) {
    const [g] = await pool.query("INSERT INTO savings_goals (user_id, name, icon, target, saved) VALUES (?,?,?,?,?)", [userId, name, icon, target, saved]);
    ids.push(g.insertId);
  }
  await pool.query("INSERT INTO savings_contributions (goal_id, transaction_id, amount) VALUES (?,?,?)", [ids[0], contributions[0][0], contributions[0][1]]);
  await pool.query("INSERT INTO savings_contributions (goal_id, transaction_id, amount) VALUES (?,?,?)", [ids[2], contributions[1][0], contributions[1][1]]);
  const [b] = await pool.query("INSERT INTO budgets (user_id, month, total) VALUES (?, DATE_FORMAT(CURDATE(), '%Y-%m'), 400)", [userId]);
  for (const [cat, amt] of [["Food", 100], ["Games", 80], ["Education", 60], ["Shopping", 60], ["Savings", 70], ["Other", 30]]) {
    await pool.query("INSERT INTO budget_categories (budget_id, category, allocated) VALUES (?,?,?)", [b.insertId, cat, amt]);
  }
  await pool.query("INSERT IGNORE INTO user_achievements (user_id, achievement_id) SELECT ?, id FROM achievements WHERE code IN ('first_deposit','smart_saver','budget_beginner')", [userId]);
  for (const [amount, reason] of [[5, "Added coins"], [10, "Saved coins"], [15, "Planned a budget"], [60, "Finished a quiz"], [50, "Finished a quiz"]]) {
    await pool.query("INSERT INTO xp_history (user_id, amount, reason) VALUES (?,?,?)", [userId, amount, reason]);
  }
  const [[quiz]] = await pool.query("SELECT id FROM quizzes ORDER BY id LIMIT 1");
  if (quiz) await pool.query("INSERT INTO quiz_attempts (user_id, quiz_id, score, total, xp_awarded, created_at) VALUES (?,?,4,5,40, NOW() - INTERVAL 2 DAY)", [userId, quiz.id]);
  console.log("created demo student starry_sam");
}

await seedAchievements();
await seedQuizzes();
await seedDemo();
const [[{ q }]] = await pool.query("SELECT COUNT(*) q FROM quiz_questions");
console.log(`seed complete: ${q} quiz questions`);
await pool.end();
