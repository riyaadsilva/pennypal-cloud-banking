import "express-async-errors";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import reports from "./routes/reports.js";
import rateLimit from "express-rate-limit";
import { pool } from "./db/pool.js";
import auth from "./routes/auth.js";
import accounts from "./routes/accounts.js";
import transactions from "./routes/transactions.js";
import parentNotifications from "./routes/parentNotifications.js";
import savings from "./routes/savings.js";
import budgets from "./routes/budgets.js";
import quizzes from "./routes/quizzes.js";
import achievements from "./routes/achievements.js";
import admin from "./routes/admin.js";

export const app = express();
app.set("trust proxy", 1); // behind ALB / CloudFront
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(","), credentials: true }));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use("/api", rateLimit({ windowMs: 60_000, limit: Number(process.env.RATE_MAX || 300), standardHeaders: true, legacyHeaders: false }));
const authLimit = rateLimit({ windowMs: 15 * 60_000, limit: Number(process.env.RATE_AUTH_MAX || 40), standardHeaders: true, legacyHeaders: false, message: { error: { code: "RATE_LIMIT", message: "Too many tries. Take a short break and try again." } } });
app.use(["/api/auth/login", "/api/auth/register", "/api/auth/cognito"], authLimit);

// Liveness (ALB health check) vs readiness (database reachable).
app.get("/api/health", (_req, res) => res.json({ status: "ok", uptime: Math.round(process.uptime()) }));
app.get("/api/ready", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ status: "ready" }); }
  catch { res.status(503).json({ status: "database unavailable" }); }
});

app.use("/api/auth", auth);
app.use("/api/accounts", accounts);
app.use("/api/transactions", transactions);
app.use("/api/parent-notifications", parentNotifications);
app.use("/api/transactions", transactions);
app.use("/api/reports", reports);
app.use("/api/parent-notifications", parentNotifications);
app.use("/api/savings", savings);
app.use("/api/budgets", budgets);
app.use("/api/quizzes", quizzes);
app.use("/api/achievements", achievements);
app.use("/api/admin", admin);
app.use("/api", (_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "That page does not exist." } }));

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status === 500) console.error(JSON.stringify({ level: "error", msg: err.message, stack: err.stack })); // JSON logs for CloudWatch
  res.status(status).json({ error: { code: err.code || "SERVER_ERROR", message: status === 500 ? "Something went wrong on our side. Please try again." : err.message } });
});
