
import {
  SNSClient,
  PublishCommand,
} from "@aws-sdk/client-sns";
import { pool } from "../db/pool.js";

const sns = new SNSClient({ region: "ap-south-1" });

const topicArn = process.env.SNS_TRANSACTION_TOPIC_ARN;

export async function notifyParentOfTransaction(userId, receipt) {
  if (!topicArn) {
    console.warn("SNS transaction topic is not configured.");
    return;
  }

  const [[parent]] = await pool.query(
    `SELECT pn.student_id, u.nickname
     FROM parent_notifications pn
     JOIN users u ON u.id = pn.student_id
     WHERE pn.student_id = ?
       AND pn.verification_status = 'confirmed'
       AND pn.sns_subscription_arn IS NOT NULL`,
    [userId]
  );

  if (!parent) return;

  const action = receipt.type === "deposit" ? "deposited" : "spent";

  const message = [
    "PennyPal - Transaction Alert",
    "",
    `Student: ${parent.nickname}`,
    `Action: ${action}`,
    `Amount: ${receipt.amount} coins`,
    `Category: ${receipt.category}`,
    `Remaining Balance: ${receipt.balance_after} coins`,
    "",
    "This is an automated notification from PennyPal.",
  ].join("\n");

  await sns.send(
    new PublishCommand({
      TopicArn: topicArn,
      Subject: "PennyPal - Child Transaction Alert",
      Message: message,
      MessageAttributes: {
        studentId: {
          DataType: "String",
          StringValue: String(userId),
        },
      },
    })
  );
}

