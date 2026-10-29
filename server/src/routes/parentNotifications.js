
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { HttpError } from "../utils/errors.js";
import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

import {
  subscribeParent,
  findConfirmedParentSubscription,
  isEmailAlreadySubscribed,
} from "../services/parentSubscription.js";

const r = Router();

r.use(requireAuth);

// Get the logged-in student's parent notification status.
// Automatically synchronize confirmed SNS subscriptions with MySQL.
r.get("/", async (req, res) => {
  const [[parent]] = await pool.query(
    `SELECT parent_email, verification_status
     FROM parent_notifications
     WHERE student_id = ?`,
    [req.user.id]
  );

  if (!parent) {
    return res.json({
      linked: false,
      status: "not_configured",
    });
  }

  let status = parent.verification_status;

  if (status === "pending") {
    try {
      const arn = await findConfirmedParentSubscription(
        req.user.id,
        parent.parent_email
      );

      if (arn) {
        const [result] = await pool.query(
          `UPDATE parent_notifications
           SET verification_status = 'confirmed',
               sns_subscription_arn = ?
           WHERE student_id = ?
             AND parent_email = ?
             AND verification_status = 'pending'`,
          [arn, req.user.id, parent.parent_email]
        );

        if (result.affectedRows === 1) {
          status = "confirmed";
        } else {
          // Another request may have updated the record.
          const [[latest]] = await pool.query(
            `SELECT verification_status
             FROM parent_notifications
             WHERE student_id = ?`,
            [req.user.id]
          );

          status = latest?.verification_status ?? status;
        }
      }
    } catch (error) {
      console.error(
        "Parent subscription synchronization failed:",
        error.message
      );
    }
  }

  res.json({
    linked: true,
    email: parent.parent_email,
    status,
  });
});

const parentEmailSchema = z.object({
  email: z.string().trim().email().max(254),
});

// Link a parent email and request SNS confirmation.
r.post("/link", validate(parentEmailSchema), async (req, res) => {
  const email = req.body.email.trim().toLowerCase();

  // Check whether this student already has a linked parent.
  const [[existing]] = await pool.query(
    `SELECT parent_email, verification_status
     FROM parent_notifications
     WHERE student_id = ?`,
    [req.user.id]
  );

  if (existing) {
    throw new HttpError(
      409,
      "PARENT_ALREADY_LINKED",
      "A parent email is already configured. Contact support to change it."
    );
  }

  // Check whether this email is linked to another student in MySQL.
  const [[emailInUse]] = await pool.query(
    `SELECT student_id
     FROM parent_notifications
     WHERE parent_email = ?`,
    [email]
  );

  if (emailInUse) {
    throw new HttpError(
      409,
      "PARENT_EMAIL_IN_USE",
      "This parent email is already linked to another student."
    );
  }

  // Check for an existing subscription directly in Amazon SNS.
  const alreadySubscribed = await isEmailAlreadySubscribed(email);

  if (alreadySubscribed) {
    throw new HttpError(
      409,
      "SNS_EMAIL_ALREADY_SUBSCRIBED",
      "This email already has an SNS subscription. Please use another parent email or contact support."
    );
  }

  // Request a student-specific SNS email subscription.
  const subscriptionArn = await subscribeParent(
    req.user.id,
    email
  );

  // Keep pending until the parent confirms through AWS SNS.
  try {
    await pool.query(
      `INSERT INTO parent_notifications
         (student_id, parent_email, sns_subscription_arn, verification_status)
       VALUES (?, ?, ?, 'pending')`,
      [req.user.id, email, subscriptionArn]
    );
  } catch (error) {
    console.error(
      "Failed to save parent notification record:",
      error.message
    );

    // Do not automatically unsubscribe:
    // the subscription may have existed before this request.
    throw new HttpError(
      500,
      "PARENT_LINK_FAILED",
      "Unable to save the parent email. Please contact support."
    );
  }

  res.status(201).json({
    linked: true,
    status: "pending",
    message:
      "A confirmation email has been requested. The parent must confirm the subscription before alerts are enabled.",
  });
});

export default r;
