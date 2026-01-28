
// import { Response } from "express";
// import { AuthRequest } from "../middleware/auth.middleware.js";
// import prisma from "../lib/prisma.js";
// import openai from "../lib/openai.js";
// import { v4 as uuidv4 } from "uuid";
// import { JwtPayload } from "jsonwebtoken";

// export const summarizeTodayReport = async (req: AuthRequest, res: Response) => {
//     try {
//         const userId = (req.user as JwtPayload)?.id;
//         if (!userId) {
//             return res.status(401).json({ message: "Unauthorized" });
//         }

//         const now = new Date();
//         const today = new Date(Date.UTC(
//             now.getUTCFullYear(),
//             now.getUTCMonth(),
//             now.getUTCDate()
//         ));

//         const report = await prisma.dailyWorkReport.findFirst({
//             where: { date: today },
//         });

//         if (!report) {
//             return res.status(404).json({ message: "No report for today" });
//         }

//         const reportText = `
// Title: ${report.title ?? "N/A"}

// Tasks Done:
// ${report.tasks}

// Challenges:
// ${report.challenges ?? "None"}

// Next Plan:
// ${report.nextPlan ?? "None"}
// `;

//         const completion = await openai.chat.completions.create({
//             model: "gpt-4o-mini",
//             messages: [
//                 {
//                     role: "system",
//                     content:
//                         "You are a professional HR assistant. Summarize the daily work report clearly and professionally.",
//                 },
//                 { role: "user", content: reportText },
//             ],
//             temperature: 0.4,
//         });

//         const summary = completion.choices[0].message.content;

//         const saved = await prisma.aiSummary.upsert({
//             where: {
//                 type_startDate_endDate: {
//                     type: "daily",
//                     startDate: today,
//                     endDate: today,
//                 },
//             },
//             update: {
//                 content: summary!,
//             },
//             create: {
//                 id: uuidv4(),
//                 type: "daily",
//                 startDate: today,
//                 endDate: today,
//                 content: summary!,
//             },
//         });

//         res.status(200).json({
//             message: "Summary generated",
//             summary: saved,
//         });
//     } catch (err) {
//         console.error("AI summary error:", err);
//         res.status(500).json({ message: "Failed to generate summary" });
//     }
// };


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
      createdAt: "desc",
    },
  });

  res.status(200).json(summaries);
};