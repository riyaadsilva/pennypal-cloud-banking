
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { generateTransactionReport } from "../services/s3Reports.js";

const r = Router();

// All report endpoints require authentication.
r.use(requireAuth);

// Generate and upload the logged-in student's report to S3.
r.post("/transactions", async (req, res, next) => {
  try {
    const report = await generateTransactionReport(req.user.id);

    res.status(201).json({
      message: "Transaction report uploaded successfully.",
      report: {
        key: report.key,
        transactionCount: report.transactionCount
      }
    });
  } catch (error) {
    console.error("S3 report generation failed:", {
      studentId: req.user.id,
      message: error.message
    });
    next(error);
  }
});

export default r;
