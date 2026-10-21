import { loadSsm } from "./config/ssm.js";
await loadSsm(); // must run before the DB pool reads env
const { app } = await import("./app.js");
const { pool } = await import("./db/pool.js");
const server = app.listen(process.env.PORT || 4000, () => console.log(JSON.stringify({ level: "info", msg: "PennyPal API listening", port: process.env.PORT || 4000 })));
// Graceful shutdown so EC2 / Auto Scaling can drain connections cleanly.
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => server.close(async () => { await pool.end(); process.exit(0); }));
