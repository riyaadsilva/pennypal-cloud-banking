import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../database/migrations");
const conn = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME, multipleStatements: true,
});
await conn.query("CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
const [done] = await conn.query("SELECT name FROM schema_migrations");
const applied = new Set(done.map((r) => r.name));
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (applied.has(file)) continue;
  await conn.query(fs.readFileSync(path.join(dir, file), "utf8"));
  await conn.query("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
  console.log("applied", file);
}
console.log("migrations up to date");
await conn.end();
