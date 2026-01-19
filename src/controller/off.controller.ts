import { JwtPayload } from "jsonwebtoken";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { Response } from "express";
import prisma from "../lib/prisma.js";
import { v4 as uuidv4 } from "uuid";

export const saveWorkOffDays = async (req: AuthRequest, res: Response) => {
    const userId = (req.user as JwtPayload)?.id;
    const { dates } = req.body;
try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const limit = await prisma.workOffSettings.findFirst({
        where: {
            month, year
        },
        select: {
            maxDays: true
        }
    });

    if (!limit) {
        console.error('No limit found');
        return res.status(404).json({ message: 'No limit found' })
    }

    if (!Array.isArray(dates) || dates.length !== limit.maxDays) {
        console.error(`Only ${limit.maxDays} days allowed`)
        return res.status(400).json({ message: `Only ${limit.maxDays} days allowed` });
    }

    await prisma.workOffDays.createMany({
        data: dates.map(date => ({
            id: uuidv4(),
            userId,
            date: new Date(date),
            month,
            year
        })),
        skipDuplicates: true
    });

    res.status(200).json({ message: "Work-off days saved" });
} catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error, failed to save off days' })
}
};


export const getUserWorkOffSummary = async (req: AuthRequest, res: Response) => {
    const userId = (req.user as JwtPayload)?.id;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const records = await prisma.workOffDays.findMany({
        where: { userId, month, year },
        orderBy: {date: 'asc'}
    });

    const used = records.filter(r => r.used).length;
    const total = records.length;


    const limit = await prisma.workOffSettings.findFirst({
        where: {
            month, year
        },
        select: {
            maxDays: true
        }
    });

    if (!limit) {
        console.error('No limit found');
        return res.status(404).json({ message: 'No limit found' })
    }

    res.status(200).json({
        totalSelected: total,
        used,
        remaining: total - used,
        records
    });
};


export const markWorkOffUsed = async (req: AuthRequest, res: Response) => {
    const userId = (req.user as JwtPayload)?.id;
    const { date } = req.body; // make sure date comes as "YYYY-MM-DD"

    // Create start and end of the day
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    // Find the work-off record for that day
    const record = await prisma.workOffDays.findFirst({
        where: {
            userId,
            date: {
                gte: start,
                lte: end
            }
        }
    });

    if (!record) {
        console.error('Work-off not found for this date')
        return res.status(404).json({ message: "Work-off not found for this date" });
    }

    // Mark it as used
    await prisma.workOffDays.update({
        where: { id: record.id },
        data: { used: true, usedAt: new Date() }
    });

    res.status(200).json({ message: "Marked as used" });
};


export const totalOff = async (req: AuthRequest, res: Response) => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    try {
        const offLimit = await prisma.workOffSettings.findFirst({
            where: {
                month, year
            },
            select: {
                maxDays: true
            }
        });

        if (!offLimit) {
            console.error('No limit found');
            return res.status(404).json({ message: 'No limit found' })
        }
        return res.status(200).json(offLimit)
    } catch (err: any) {
        console.error('Error selecting total off limit', err);
        return res.status(500).json({ message: 'Error selecting total off limit' })
    }
}

export const autoMarkWorkOffUsed = async () => {
    try {
    // Create start and end of the day
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // Mark used off as used
    const record = await prisma.workOffDays.updateMany({
        where: {
            date: {
                gte: start,
                lte: end
            },
            used: false
        },
        data: {
            used: true,
            usedAt: new Date()
        }
    });

} catch (err: any) {
    console.error("Auto mark work-off failed:", err);
}
}