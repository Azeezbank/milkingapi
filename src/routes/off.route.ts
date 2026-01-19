import { Router } from "express";
import { saveWorkOffDays, getUserWorkOffSummary, markWorkOffUsed, totalOff } from "../controller/off.controller.js";

const router = Router();

router.post('/', saveWorkOffDays);
router.get('/', getUserWorkOffSummary);
router.put('/', markWorkOffUsed)
router.get('/limit', totalOff)


export default router;