import { Router } from "express";
import { setMonthlyLimit, getMonthlyOverview, updateWorkOffDate } from "../controller/admin.off.controller.js";


const router = Router();

router.post('/', setMonthlyLimit);
router.get('/', getMonthlyOverview);
router.put('/:id', updateWorkOffDate);

export default router;