import { Router } from "express";
import { createDailyWorkReport, getReportsSummary, getReportById, updateDailyWorkReport, deleteDailyWorkReport } from "../controller/report.controller.js";
import { getAiSummary } from "../controller/reportSummary.controller.js";

const router = Router();

router.post('/', createDailyWorkReport);
router.get('/', getReportsSummary);
router.get("/summary", getAiSummary);
router.get("/:id", getReportById)
router.put("/:id", updateDailyWorkReport);      // Update report
router.delete("/:id", deleteDailyWorkReport);   // Delete report

export default router;