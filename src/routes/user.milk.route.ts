import { Router } from "express";
import { getMilkSummary, getAnimals } from "../controller/milking.animals.controller.js";

const router = Router();

router.get("/summary", getMilkSummary);
router.get("/animals", getAnimals);
export default router;