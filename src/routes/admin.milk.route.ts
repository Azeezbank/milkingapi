import { Router } from "express";
import { milkingAnimals, createMilkRecord } from "../controller/milking.animals.controller.js";


const router = Router();

router.post("/", milkingAnimals);
router.post("/record", createMilkRecord);


export default router;
