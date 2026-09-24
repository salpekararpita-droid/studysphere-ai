import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from backend/.env");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const MODEL = "gemini-3.6-flash";

async function askGemini(prompt) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt
  });

  return response.text || "";
}

function removeCodeFences(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export async function solveDoubt({ question, subject }) {
  const prompt = `
You are StudySphere AI, a friendly educational assistant.

Subject: ${subject || "General"}
Student question: ${question}

Explain the answer in simple language.
Use steps where appropriate.
Include an example when useful.
Do not help a student cheat in an active examination.
End with one short practice question.
`;

  return askGemini(prompt);
}

export async function generateQuiz({ topic, count, difficulty }) {
  const quizCount = Math.min(Math.max(Number(count) || 5, 1), 10);

  const prompt = `
Create exactly ${quizCount} multiple-choice questions about ${topic}.
Difficulty: ${difficulty || "medium"}.

Return ONLY valid JSON with this exact structure:
{
  "title": "Quiz title",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Short explanation"
    }
  ]
}

Rules:
- Return exactly ${quizCount} questions.
- Each question must have exactly four options.
- The answer must be an integer: 0, 1, 2, or 3.
- Do not use Markdown.
- Do not include text outside the JSON object.
`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          title: {
            type: "STRING"
          },
          questions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                question: {
                  type: "STRING"
                },
                options: {
                  type: "ARRAY",
                  items: {
                    type: "STRING"
                  }
                },
                answer: {
                  type: "INTEGER"
                },
                explanation: {
                  type: "STRING"
                }
              },
              required: [
                "question",
                "options",
                "answer",
                "explanation"
              ]
            }
          }
        },
        required: ["title", "questions"]
      }
    }
  });

  const quiz = JSON.parse(response.text);

  if (!quiz.title || !Array.isArray(quiz.questions)) {
    throw new Error("Gemini returned an invalid quiz object.");
  }

  if (quiz.questions.length !== quizCount) {
    throw new Error(
      `Expected ${quizCount} questions but received ${quiz.questions.length}.`
    );
  }

  for (const question of quiz.questions) {
    if (
      typeof question.question !== "string" ||
      !Array.isArray(question.options) ||
      question.options.length !== 4 ||
      !Number.isInteger(question.answer) ||
      question.answer < 0 ||
      question.answer > 3 ||
      typeof question.explanation !== "string"
    ) {
      throw new Error("Gemini returned an invalid question format.");
    }
  }

  return quiz;
}