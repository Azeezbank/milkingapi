import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { JwtPayload } from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { v4 as uuidv4 } from 'uuid';


export const milkingAnimals = async (req: AuthRequest, res: Response) => {
  const { animalTag } = req.body;
  try {
    const isExist = await prisma.animals.findFirst({
      where: {
        animalTag
      }
    })

    if (isExist) {
      console.error('Animal is existing');
      return res.status(400).json({ message: 'Animal is existing in the list' })
    }

    await prisma.animals.create({
      data: {
        id: uuidv4(),
        animalTag
      }
    });

    res.status(201).json({ message: 'Animal created' })
  } catch (err: any) {
    console.log('FRailed to create animal', err);
    return res.status(500).json({ message: 'Internal server error' })
  }
};


export const getAnimals = async (req: AuthRequest, res: Response) => {
  try {
    const animals = await prisma.animals.findMany({
      orderBy: {
        animalTag: 'asc'
      }
    });
    res.status(200).json({ animals });
  } catch (err: any) {
    console.error('Failed to fetch animals:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};



export const createMilkRecord = async (req: AuthRequest, res: Response) => {
  const { animalId, animalTag, period, quantity, date } = req.body;
  const userId = (req.user as JwtPayload).id;

  if (!animalId || !animalTag || !period || !quantity) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {

    const recorder = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    if (!recorder) {
      console.error("Recorder not found for userId:", userId);
      return res.status(404).json({ message: "Recorder not found" });
    }


    const today = new Date(date);
    today.setHours(0, 0, 0, 0);

    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Upsert daily milk record
      const milkRecord = await tx.milkRecord.upsert({
        where: {
          animalId_date: {
            animalId,
            date: today,
          },
        },
        update: {},
        create: {
          id: uuidv4(),
          animalId,
          animalTag,
          date: today,
        },
      });

      // 2️⃣ Upsert milk session (morning / evening)
      const milkSession = await tx.milksessions.upsert({
        where: {
          recordId_period: {
            recordId: milkRecord.id,
            period,
          },
        },
        update: {
          quantity,
          time: new Date(),
          recorder: recorder?.name,
        },
        create: {
          id: uuidv4(),
          recordId: milkRecord.id,
          period,
          quantity,
          time: new Date(),
          recorder: recorder.name,
        },
      });

      return {
        milkRecord,
        milkSession
      };
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error(" Failed to create milk record:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};



const getDateRange = (range: string, date: Date) => {
  const start = new Date(date);
  const end = new Date(date);

  if (range === 'day') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  if (range === 'week') {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);

    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }

  if (range === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(start.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  }

  if (range === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

export const getMilkSummary = async (req: AuthRequest, res: Response) => {
  try {
    const {
      range = "day",
      date,
      animalTag,
      page = "1",
      limit = "10",
    } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const pageNumber = Number(page);
    const pageSize = Number(limit);
    const skip = (pageNumber - 1) * pageSize;

    const { start, end } = getDateRange(range as string, new Date(date as string));

    // Calculate previous period date
    const prevDate = new Date(date as string);
    if (range === "day") prevDate.setDate(prevDate.getDate() - 1);
    if (range === "week") prevDate.setDate(prevDate.getDate() - 7);
    if (range === "month") prevDate.setMonth(prevDate.getMonth() - 1);
    if (range === "year") prevDate.setFullYear(prevDate.getFullYear() - 1);


    let trendGroup: "single" | "day" | "week" | "month";

    if (range === "day") trendGroup = "single";
    else if (range === "week") trendGroup = "day";
    else if (range === "month") trendGroup = "week";
    else trendGroup = "month"; // year

    const { start: prevStart, end: prevEnd } = getDateRange(range as string, prevDate);

    /** WHERE CONDITION */
    const whereCondition: any = {
      record: {
        date: {
          gte: start,
          lte: end,
        },
      },
    };

    if (animalTag) {
      whereCondition.record.animalTag = {
        contains: Array.isArray(animalTag) ? String(animalTag[0]) : String(animalTag),
        mode: "insensitive",
      };
    }

    /** PAGINATED TRANSACTION */
    const [sessions, totalCount, totalMilk, previousTotalMilk] =
      await prisma.$transaction([
        prisma.milksessions.findMany({
          where: whereCondition,
          include: {
            record: {
              select: {
                date: true,
                animalTag: true,
              },
            },
          },
          orderBy: { time: "desc" },
          skip,
          take: pageSize,
        }),

        prisma.milksessions.count({
          where: whereCondition,
        }),

        prisma.milksessions.aggregate({
          where: whereCondition,
          _sum: { quantity: true },
        }),

        prisma.milksessions.aggregate({
          where: {
            record: {
              date: {
                gte: prevStart,
                lte: prevEnd,
              },
            },
          },
          _sum: { quantity: true },
        }),
      ]);

    /** FORMAT RECORDS */
    const records = sessions.map((s) => ({
      date: s.record.date,
      animalTag: s.record.animalTag,
      time: s.time,
      period: s.period,
      quantity: s.quantity,
      recorder: s.recorder,
    }));

    /** NEW FEATURE: Fetch all sessions for full avg calculation */
    const allSessions = await prisma.milksessions.findMany({
      where: {
        record: {
          date: {
            gte: start,
            lte: end,
          },
          ...(animalTag
            ? {
              animalTag: {
                contains: Array.isArray(animalTag) ? String(animalTag[0]) : String(animalTag),
                mode: "insensitive",
              },
            }
            : {}),
        },
      },
      include: {
        record: {
          select: {
            date: true,
            animalTag: true,
          },
        },
      },
    });

    const animalsMilked = new Set(
  allSessions.map((s) => s.record.animalTag)
).size;

const avgPerAnimal =
  animalsMilked > 0 ? (Number(totalMilk._sum.quantity) || 0) / animalsMilked : 0;


    const animalDaysMap: Record<string, Set<string>> = {};
    const animalMilkMap: Record<string, number> = {};

    allSessions.forEach((s) => {
      const animal = s.record.animalTag;
      const dayStr = new Date(s.record.date).toDateString();

      if (!animalDaysMap[animal]) animalDaysMap[animal] = new Set();
      animalDaysMap[animal].add(dayStr);

      if (!animalMilkMap[animal]) animalMilkMap[animal] = 0;
      animalMilkMap[animal] += Number(s.quantity);
    });

    const avgMilkingDays =
      Object.keys(animalDaysMap).length > 0
        ? Object.values(animalDaysMap).reduce((sum, days) => sum + days.size, 0) /
        Object.keys(animalDaysMap).length
        : 0;

    const trendMap: Record<string, number> = {};

    allSessions.forEach((s) => {
      const d = new Date(s.record.date);
      let label = "";

      if (trendGroup === "single") {
        label = "Today";
      }

      if (trendGroup === "day") {
        label = d.toLocaleDateString("en-US", { weekday: "short" });
      }

      if (trendGroup === "week") {
        const week = Math.min(4, Math.ceil(d.getDate() / 7));
        label = `Week ${week}`;
      }

      if (trendGroup === "month") {
        label = d.toLocaleDateString("en-US", { month: "short" });
      }

      trendMap[label] = (trendMap[label] || 0) + Number(s.quantity);
    });


    const trendData = Object.entries(trendMap).map(([label, total]) => ({
      label,
      total: Number(total.toFixed(1)), // ← round to 1 decimal
    }));

    const tag = animalTag ? (Array.isArray(animalTag) ? String(animalTag[0]) : String(animalTag)) : null;
    let filteredAnimalDays = 0;
    let filteredAnimalMilk = 0;
    if (tag && animalDaysMap[tag]) {
      filteredAnimalDays = animalDaysMap[tag].size;
      filteredAnimalMilk = animalMilkMap[tag];
    }
    

    res.status(200).json({
      range,
      period: { start, end },

      totalMilk: totalMilk._sum.quantity || 0,
      previousTotalMilk: previousTotalMilk._sum.quantity || 0,

      avgMilkingDays,
      filteredAnimal: tag
        ? {
          daysMilked: filteredAnimalDays,
          totalMilk: filteredAnimalMilk,
        }
        : null,

      pagination: {
        page: pageNumber,
        limit: pageSize,
        totalRecords: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },

      records,
      animalMilkMap,
      trendData,
      animalsMilked,
      avgPerAnimal
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};
