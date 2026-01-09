import { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

// GET /api/v1/admin/attendance
export const getAdminAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const filter = req.query.filter as string || "today";
    const customDate = req.query.date as string | undefined;

    let startDate: Date;
    let endDate: Date;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case "today":
        startDate = today;
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "yesterday":
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "custom":
        if (!customDate) return res.status(400).json({ message: "Custom date is required" });
        startDate = new Date(customDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = today;
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
    }

    const total = await prisma.attendance.count({
      where: {
        date: { gte: startDate, lte: endDate },
      },
    });

    const attendances = await prisma.attendance.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      include: { User: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.status(200).json({
      attendances,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// GET /api/v1/admin/attendance/:id
export const getAttendanceById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const record = await prisma.attendance.findFirst({ where: { userId },
    include: { User: true }
    });
    if (!record) {
      console.error("Record not found for userId:", userId);
      return res.status(404).json({ message: "Record not found" });
    }
    res.status(200).json({ record });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};

// PUT /api/v1/admin/attendance/:id
export const updateAttendanceStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.pid;
    console.log(id, 'user id')
    const { status } = req.body;

    const record = await prisma.attendance.update({
      where: { id },
      data: { status },
    });

    res.json({ message: "Attendance updated successfully", record });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
};