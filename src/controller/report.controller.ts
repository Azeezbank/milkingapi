import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { JwtPayload } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { Response } from "express";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

// CREATE DAILY WORK REPORT
export const createDailyWorkReport = async (req: AuthRequest, res: Response) => {
    try {
        const userId = (req.user as JwtPayload).id;
        const { title, tasks, challenges, nextPlan, date } = req.body;

        if (!title || !tasks || !date) {
            return res.status(400).json({ message: "Title, tasks, and date are required" });
        }

        const chosenDate = startOfDay(new Date(date)); // normalize to start of day

        const report = await prisma.dailyWorkReport.upsert({
            where: { userId_date: { userId, date: chosenDate } },
            update: { title, tasks, challenges, nextPlan },
            create: {
                id: uuidv4(),
                userId,
                date: chosenDate,
                title,
                tasks,
                challenges,
                nextPlan,
            },
        });

        res.status(201).json(report);
    } catch (err) {
        console.error("Failed to create report:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const getReportById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const report = await prisma.dailyWorkReport.findUnique({
      where: { id },
      include: { user: { select: { name: true } } },
    });

    if (!report) return res.status(404).json({ message: "Report not found" });

    res.status(200).json({ report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};


// GET REPORTS SUMMARY
export const getReportsSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { range, date } = req.query;
    const selectedDate = date ? new Date(date as string) : new Date();

    type RangeType = "day" | "week" | "month";

    const ranges: Record<RangeType, { start: Date; end: Date }> = {
      day: { start: startOfDay(selectedDate), end: endOfDay(selectedDate) },
      week: { start: startOfWeek(selectedDate), end: endOfWeek(selectedDate) },
      month: { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) },
    };

    // Determine which ranges to fetch
    const rangesToFetch: RangeType[] =
      range && ["day", "week", "month"].includes(range as string)
        ? [range as RangeType]
        : ["day", "week", "month"];

    const results: Record<RangeType, any[]> = { day: [], week: [], month: [] };

    for (const r of rangesToFetch) {
      // For now, fetch all reports without date filtering
      const reports = await prisma.dailyWorkReport.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { date: "desc" },
      });

      results[r] = reports;
    }

    res.status(200).json({
      reports: results,
      counts: {
        daily: results.day.length,
        weekly: results.week.length,
        monthly: results.month.length,
      },
    });
  } catch (err) {
    console.error("Failed to fetch reports summary:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


// UPDATE REPORT
export const updateDailyWorkReport = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, tasks, challenges, nextPlan } = req.body;

    const updated = await prisma.dailyWorkReport.update({
      where: { id },
      data: { title, tasks, challenges, nextPlan },
    });

    res.status(200).json({ report: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update report" });
  }
};

// DELETE REPORT
export const deleteDailyWorkReport = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.dailyWorkReport.delete({
      where: { id },
    });

    res.status(200).json({ message: "Report deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete report" });
  }
};