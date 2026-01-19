import Router from "express";
import { getAdminAttendance, getAttendanceById, updateAttendanceStatus, totalpresent } from "../controller/admin.attendance.controller.js";

const router = Router();

router.get("/attendance", getAdminAttendance);
router.get('/attendance/present', totalpresent)
router.get("/attendance/:id", getAttendanceById);
router.put("/attendance/:pid", updateAttendanceStatus);

export default router;