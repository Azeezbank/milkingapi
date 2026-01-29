import { Router } from "express";
import { generateSummary, createAiSummary } from "../controller/reportSummary.controller.js"


const router = Router();

router.post("/", createAiSummary);
router.post("/:type", generateSummary);


export default router;