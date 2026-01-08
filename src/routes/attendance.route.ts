import { Router } from "express";
import {
  createAttendance,
  getMyAttendances,
  deleteAttendance
} from "../controller/attendace.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

// All routes protected by auth
router.post("/", authMiddleware, createAttendance);
router.get("/", authMiddleware, getMyAttendances);
router.delete("/:id", authMiddleware, deleteAttendance);

export default router;