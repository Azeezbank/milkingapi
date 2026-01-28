// import openai from "../lib/openai.js";

// export const summarizeReport = async (reportText: string) => {
//   const completion = await openai.chat.completions.create({
//   model: "gpt-4o-mini",
//   messages: [
//     {
//       role: "system",
//       content:
//         "You are a professional HR assistant. Summarize the daily work report clearly and concisely.",
//     },
//     {
//       role: "user",
//       content: reportText,
//     },
//   ],
//   temperature: 0.4,
// });

// const summary = completion.choices[0].message.content;
// };
