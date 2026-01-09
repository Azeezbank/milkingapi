import { Router } from "express";
import {
  updateAttendance,
  getMyAttendances,
  deleteAttendance
} from "../controller/attendace.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

// All routes protected by auth
router.put("/", authMiddleware, updateAttendance);
router.get("/", authMiddleware, getMyAttendances);
router.delete("/:id", authMiddleware, deleteAttendance);

export default router;