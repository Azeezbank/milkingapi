import { Router } from "express";
import { generateSummary, createAiSummary, deleteAiSummary } from "../controller/reportSummary.controller.js"


const router = Router();

router.post("/", createAiSummary);
router.post("/:type", generateSummary);
router.delete("/:id", deleteAiSummary);


export default router;
