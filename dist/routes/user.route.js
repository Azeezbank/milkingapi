import { Router } from "express";
import { getAllusers, getSingleUser, updateUser } from "../controller/user.controller.js";
import { getCurrentUser } from "../controller/user.controller.js";
const router = Router();
router.get('/', getAllusers);
router.get('/info', getCurrentUser);
router.get('/:id', getSingleUser);
router.put('/:id', updateUser);
export default router;
