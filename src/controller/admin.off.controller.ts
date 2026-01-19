import { AuthRequest } from "../middleware/auth.middleware.js";
import { Response } from "express";
import prisma from "../lib/prisma.js";
import { v4 as uuidv4 } from "uuid";

export const setMonthlyLimit = async (req: AuthRequest, res: Response) => {
  const { month, year, maxDays } = req.body;

  if (!month || !year || !maxDays) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const setting = await prisma.workOffSettings.upsert({
    where: {
      month_year: { month, year },
    },
    update: { maxDays },
    create: {
      id: uuidv4(),
      month,
      year,
      maxDays,
    },
  });

  res.status(200).json({ message: "Monthly limit saved", setting });
};


export const getMonthlyOverview = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year, userId } = req.query;

    const where: any = {
      month: Number(month),
      year: Number(year),
    };

    if (userId) {
      where.userId = String(userId); // filter by selected user if provided
    }

    const records = await prisma.workOffDays.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    res.status(200).json({ records });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


export const updateWorkOffDate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { newDate } = req.body;

  await prisma.workOffDays.update({
    where: { id },
    data: {
      date: new Date(newDate),
      used: false,
      usedAt: null,
    },
  });

  res.status(200).json({ message: "Work-off date updated" });
};