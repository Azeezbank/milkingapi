import { Router } from "express";
import { generateSummary } from "../controller/reportSummary.controller.js"


const router = Router();
router.post("/:type", generateSummary);


export default router;