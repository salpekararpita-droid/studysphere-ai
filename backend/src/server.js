import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "https://studysphere-ai-salpe.vercel.app",
  "https://studysphere-ai-salpe-git-main-salpekararpita-droid.vercel.app",
  "https://studysphere-ai-salpe-pa2ngxmgu-salpekararpita-droid.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

const geminiApiKey = process.env.GEMINI_API_KEY;

const ai = geminiApiKey
  ? new GoogleGenAI({ apiKey: geminiApiKey })
  : null;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "StudySphere backend is running"
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "StudySphere API is running",
    geminiConfigured: Boolean(geminiApiKey)
  });
});

app.get("/api/progress", (req, res) => {
  res.status(200).json({
    totalSessions: 0,
    quizCount: 0,
    doubtCount: 0,
    topics: [],
    recentSessions: []
  });
});

app.post("/api/ai/doubt", async (req, res) => {
  try {
    const { question, subject } = req.body;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        success: false,
        message: "Question is required"
      });
    }

    if (!ai) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing on Render"
      });
    }

    const input = `
You are StudySphere, a helpful study assistant.

Subject: ${subject || "General"}

Student question:
${question}

Answer clearly and accurately for a student.
Use simple language.
Give an example when useful.
`;

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input
    });

    const answer = interaction.output_text;

    if (!answer) {
      throw new Error("Gemini returned an empty answer");
    }

    return res.status(200).json({
      success: true,
      answer
    });
  } catch (error) {
    console.error("Gemini doubt error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate AI answer",
      details: error?.message || String(error)
    });
  }
});

app.post("/api/ai/quiz", async (req, res) => {
  try {
    const {
      topic,
      subject,
      difficulty = "medium",
      count = 5
    } = req.body;

    if (!ai) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing on Render"
      });
    }

    const quizTopic = topic || subject || "General Knowledge";
    const questionCount = Math.min(
      Math.max(Number(count) || 5, 1),
      20
    );

    const input = `
Create exactly ${questionCount} multiple-choice quiz questions.

Topic: ${quizTopic}
Difficulty: ${difficulty}

Return ONLY valid JSON. Do not include markdown fences.
Use exactly this structure:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "The exact correct option text",
      "explanation": "Short explanation"
    }
  ]
}
`;

    const interaction = await ai.interactions.create({
      model: "gemini-3.8-flash",
      input
    });

    const rawText = interaction.output_text;

    if (!rawText) {
      throw new Error("Gemini returned an empty quiz response");
    }

    const cleanedText = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleanedText);

    if (!Array.isArray(parsed.questions)) {
      throw new Error("Gemini returned invalid quiz JSON");
    }

    return res.status(200).json({
      success: true,
      topic: quizTopic,
      difficulty,
      questions: parsed.questions
    });
  } catch (error) {
    console.error("Gemini quiz error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate quiz",
      details: error?.message || String(error)
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (error.message?.startsWith("CORS blocked origin:")) {
    return res.status(403).json({
      success: false,
      message: error.message
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`StudySphere backend running on port ${PORT}`);
});