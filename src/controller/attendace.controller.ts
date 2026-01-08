import { Response } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';
import { startOfDay, endOfDay } from "date-fns";

// ---------------- CREATE ATTENDANCE ----------------
export const createAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const userId = (req.user as JwtPayload)?.id; // got from middleware

    if (!userId) {
      console.error('Unauthorized')
       return res.status(401).json({ message: "Unauthorized" });
    }
    if (!status) {
      console.error('All fields required')
      return res.status(400).json({ message: "All fields required" });
    }

    // Check if attendance already exists for today
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const existing = await prisma.attendance.findFirst({
      where: {
        userId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ message: "Attendance already marked for today" });
    }

    const attendance = await prisma.attendance.create({
      data: {
        id: uuidv4(),
        date: new Date(),
        status,
        userId
      }
    });

    res.status(201).json({ message: "Attendance created", attendance });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- GET MY ATTENDANCES ----------------
export const getMyAttendances = async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.user as JwtPayload)?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Read page & limit from query params, default values if missing
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Total records for user
    const total = await prisma.attendance.count({ where: { userId } });

    // Fetch paginated records
    const attendances = await prisma.attendance.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    });

    res.status(200).json({
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalRecords: total,
      attendances,
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- DELETE ATTENDANCE ----------------
export const deleteAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req.user as JwtPayload)?.id;
    if (!userId) {
        console.error('Unauthorized')
        return res.status(401).json({ message: "Unauthorized" });
    }

    // ensure user can only delete their own attendance
    await prisma.attendance.deleteMany({
      where: { id, userId }
    });

    res.status(200).json({ message: "Attendance deleted" });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};