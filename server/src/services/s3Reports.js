
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { pool } from "../db/pool.js";

const s3 = new S3Client({ region: "ap-south-1" });

const BUCKET = "pennypal-10917";

function csvValue(value) {
  const text = String(value ?? "");
  const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function generateTransactionReport(userId) {
  const [transactions] = await pool.query(
    `SELECT
       t.created_at,
       t.type,
       t.amount,
       t.category,
       t.description,
       t.balance_after
     FROM transactions t
     JOIN accounts a ON t.account_id = a.id
     WHERE a.user_id = ?
     ORDER BY t.created_at DESC, t.id DESC`,
    [userId]
  );

  const headers = [
    "Date",
    "Type",
    "Amount",
    "Category",
    "Description",
    "Balance After"
  ];

  const rows = transactions.map((t) => [
    new Date(t.created_at).toISOString(),
    t.type,
    t.amount,
    t.category,
    t.description,
    t.balance_after
  ]);

  const csv = [
    headers.map(csvValue).join(","),
    ...rows.map((row) => row.map(csvValue).join(","))
  ].join("\r\n") + "\r\n";

  const key = `reports/student-${userId}/${randomUUID()}.csv`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: csv,
      ContentType: "text/csv; charset=utf-8",
      ServerSideEncryption: "AES256"
    })
  );

  return {
    bucket: BUCKET,
    key,
    transactionCount: transactions.length
  };
}
