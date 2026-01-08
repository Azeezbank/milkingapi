import Router from "express";
import { getAdminAttendance, getAttendanceById, updateAttendanceStatus } from "../controller/admin.attendance.controller.js";

const router = Router();

router.get("/attendance", getAdminAttendance);
router.get("/attendance/:id", getAttendanceById);
router.put("/attendance/:id", updateAttendanceStatus);

export default router;