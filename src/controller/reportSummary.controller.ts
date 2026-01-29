
import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import prisma from "../lib/prisma.js";
import openai from "../lib/openai.js";
import { v4 as uuidv4 } from "uuid";
import { JwtPayload } from "jsonwebtoken";

export const generateSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.user as JwtPayload)?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { type } = req.params as { type: "daily" | "weekly" | "monthly" };
    if (!["daily", "weekly", "monthly"].includes(type)) {
      console.log('Invalid summary type')
      return res.status(400).json({ message: "Invalid summary type" });
    }

    const now = new Date();
    let startDate: Date, endDate: Date;

    if (type === "daily") {
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      endDate = startDate;
    } else if (type === "weekly") {
      const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    } else {
      // monthly
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }

    // Fetch all reports in the range
    const reports = await prisma.dailyWorkReport.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { date: "asc" },
    });

    if (!reports.length) {
      console.log(`No reports found for ${type}`)
      return res.status(404).json({ message: `No reports found for ${type}` });
    }

    // Prepare text for AI
    const reportText = reports
      .map((r) => `
Date: ${r.date.toISOString().split("T")[0]}
Title: ${r.title ?? "N/A"}
Tasks Done:
${r.tasks}
Challenges:
${r.challenges ?? "None"}
Next Plan:
${r.nextPlan ?? "None"}
`)
      .join("\n-------------------------\n");

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional HR assistant. Summarize the work reports clearly and professionally.",
        },
        { role: "user", content: reportText },
      ],
      temperature: 0.4,
    });

    const summary = completion.choices[0].message.content;

    // Upsert summary
    const saved = await prisma.aiSummary.upsert({
      where: {
        type_startDate_endDate: {
          type,
          startDate,
          endDate,
        },
      },
      update: { content: summary! },
      create: {
        id: uuidv4(),
        type,
        startDate,
        endDate,
        content: summary!,
      },
    });

    res.status(200).json({
      message: `Summary generated for ${type}`,
      summary: saved,
    });
  } catch (err) {
    console.error("AI summary error:", err);
    res.status(500).json({ message: "Failed to generate summary" });
  }
};


export const getAiSummary = async (req: AuthRequest, res: Response) => {
  const { type } = req.query;

  if (!type) {
    return res.status(400).json({ message: "Type is required" });
  }

  const summaries = await prisma.aiSummary.findMany({
    where: {
      type: String(type), // daily | weekly | monthly
    },
    orderBy: {
      startDate: "desc",
    },
  });

  res.status(200).json(summaries);
};



//Manuall Al summary generation
  const getDateRange = (type: "Daily" | "Weekly" | "Monthly") => {
  const now = new Date();

  if (type === "Daily") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }

  if (type === "Weekly") {
    const currentDay = now.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);

    return { startDate: start, endDate: end };
  }

  // Monthly
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return { startDate: start, endDate: end };
};


type SummaryType = "Daily" | "Weekly" | "Monthly";

export const createAiSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.user as JwtPayload)?.id;

    const user = await prisma.user.findFirst({
      where: {id: userId},
      select: {superRole: true}
    });

    if (!user || user.superRole !== "Admin") {
      return res.status(404).json({message: "Not allow to generate report"})
    }

    const { type, content } = req.body as {
      type: SummaryType;
      content: string;
    };

    if (!type || !content) {
      return res.status(400).json({ message: "Type and content are required" });
    }

    const { startDate, endDate } = getDateRange(type);

    // prevent duplicate (extra safety beyond @@unique)
    const existing = await prisma.aiSummary.findFirst({
      where: {
        type,
        startDate: startDate,
    endDate: endDate,
      },
    });

    if (existing) {
      return res.status(409).json({
        message: `${type} summary already exists for this period`,
      });
    }

    const summary = await prisma.aiSummary.create({
      data: {
        id: uuidv4(),
        type,
        startDate,
        endDate,
        content,
      },
    });

    return res.status(201).json({
      message: "Summary created successfully",
      summary,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};



/**
 * DELETE AI SUMMARY
 * Works for Daily / Weekly / Monthly
 */
export const deleteAiSummary = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Summary ID is required" });
    }

    // Check if summary exists
    const existing = await prisma.aiSummary.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Summary not found" });
    }

    // Delete summary
    await prisma.aiSummary.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Summary deleted successfully",
    });
  } catch (error) {
    console.error("Delete summary error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
